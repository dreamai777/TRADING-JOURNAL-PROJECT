// AI Council endpoint.
//   GET  → is AI configured, which provider/models, and this user's remaining credits.
//   POST → streams an agent's answer grounded in the journal context the client sends.
//
// The system prompt is always built here from the agent id (or the custom agent's config), never taken
// from the client, so this route can't be used as a general-purpose LLM proxy. The API key stays on
// the server. With no key configured, POST answers 503 {offline:true} and the client falls back to the
// built-in agent engine, so the app works fully without a key.
import { PERSONAS, type CoreAgentId } from "@/core/ai/agents";
import { customSystemPrompt, type CustomAgent } from "@/core/ai/custom";
import { AI_CREDIT_COST, denialMessage, type AiCallKind } from "@/core/ai/quota";
import type { Setup } from "@/core/types";
import { refund, recordSpend, reserve, resolveCaller, usageSummary, type ClientIdentity } from "@/server/ai/guard";
import { getProvider, ProviderError, type ChatTurn } from "@/server/ai";

const MAX_CONTEXT_CHARS = 24_000;
const MAX_TURNS = 16;
const PLAN_RANK = { free: 0, premium: 1, ultra: 2 } as const;

const DEEP_REVIEW_BRIEF = `This is a DEEP REVIEW. Write a full debrief of the trade in "tradeReview" using the trader's own history in "journal":
1. Verdict in one line (was the process good, regardless of P&L?).
2. Each pillar (Plan, Entry, Risk, Exit, Mindset): what happened and what a disciplined pro would have done.
3. The one pattern from their history this trade repeats or breaks, with numbers.
4. Three concrete rules or checklist items to add, each testable on the next trade.
Use only numbers present in the data. Under 450 words.`;

interface Body {
  agent: CoreAgentId | "custom";
  custom?: CustomAgent;
  setupNames?: { id: string; name: string }[];
  context: unknown;
  messages: ChatTurn[];
  user?: ClientIdentity;
  /** Ask for a deep review on the stronger model. Costs more credits. */
  deep?: boolean;
}

/** GET carries the identity in headers (not the URL) so emails don't end up in access logs. */
function readIdentity(req: Request): ClientIdentity {
  const h = req.headers;
  return { id: h.get("x-ef-user") ?? undefined, email: h.get("x-ef-email") ?? undefined, plan: (h.get("x-ef-plan") as ClientIdentity["plan"]) ?? undefined };
}

export async function GET(req: Request) {
  const provider = getProvider();
  const caller = resolveCaller(req, readIdentity(req));
  let usage = null;
  try {
    usage = await usageSummary(caller);
  } catch {
    /* counters unavailable; still report configuration */
  }
  return Response.json(
    { configured: provider.isConfigured(), provider: provider.label, models: { fast: provider.modelFor("fast"), deep: provider.modelFor("deep") }, costs: AI_CREDIT_COST, usage },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const provider = getProvider();
  if (!provider.isConfigured()) return Response.json({ offline: true, error: "No AI key configured on the server" }, { status: 503 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const persona = body.agent === "custom" ? null : PERSONAS[body.agent];
  if (!persona && !(body.agent === "custom" && body.custom)) return Response.json({ error: "Unknown agent" }, { status: 400 });

  const caller = resolveCaller(req, body.user);
  const needed = persona ? persona.plan : "premium";
  if (PLAN_RANK[caller.plan] < PLAN_RANK[needed]) {
    return Response.json({ error: "plan", message: `${persona?.name ?? "Custom agents"} chat is part of the ${needed === "premium" ? "Premium" : "Ultra"} plan.` }, { status: 402 });
  }

  const instructions = persona
    ? persona.system
    : customSystemPrompt(body.custom!, (body.setupNames ?? []).map((s) => ({ id: String(s.id), name: String(s.name) })) as Setup[]);
  const context = `Trader's journal data (JSON):\n${JSON.stringify(body.context ?? {}).slice(0, MAX_CONTEXT_CHARS)}`;
  const turns = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  // The API requires the first message to be from the user.
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return Response.json({ error: "Last message must be from the user" }, { status: 400 });

  const hasReview = typeof body.context === "object" && body.context !== null && "tradeReview" in body.context;
  const kind: AiCallKind = body.deep && hasReview ? "deep" : "chat";
  if (kind === "deep") turns[turns.length - 1] = { role: "user", content: `${turns[turns.length - 1].content}\n\n${DEEP_REVIEW_BRIEF}` };

  let decision;
  try {
    decision = await reserve(caller, kind);
  } catch {
    return Response.json({ error: "quota-store", message: "Usage tracking is unavailable right now. Try again shortly." }, { status: 503 });
  }
  if (!decision.ok) {
    return Response.json({ error: "quota", reason: decision.reason, message: denialMessage(decision.reason!, caller.plan, decision.resetsAt), remaining: decision.remaining, limit: decision.limit, resetsAt: decision.resetsAt }, { status: 429 });
  }

  const tier = kind === "deep" ? "deep" : "fast";
  const result = provider.stream({ tier, instructions, context, messages: turns, maxOutputTokens: kind === "deep" ? 8000 : 4000 });
  const encoder = new TextEncoder();
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      let wrote = false;
      try {
        for await (const chunk of result.text) {
          wrote = true;
          controller.enqueue(encoder.encode(chunk));
        }
        const { usage, finish } = await result.done;
        if (finish === "refusal") controller.enqueue(encoder.encode("\n\n_I can't help with that one. Try asking about your own trading data._"));
        if (finish === "max_tokens") controller.enqueue(encoder.encode("\n\n_(cut short)_"));
        await recordSpend(usage.costUsd).catch(() => {});
      } catch (err) {
        const e = err instanceof ProviderError ? err : new ProviderError("network", "AI connection failed.");
        const msg = e.kind === "rate_limited" ? "The coach is busy. Try again in a moment." : e.kind === "auth" ? "The AI key is invalid or out of credit. Ask the admin to check ANTHROPIC_API_KEY." : e.message;
        if (!wrote) await refund(caller, AI_CREDIT_COST[kind]).catch(() => {});
        controller.enqueue(encoder.encode(`${wrote ? "\n\n" : ""}_${msg}_`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(out, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-AI-Model": provider.modelFor(tier),
      "X-AI-Remaining": decision.limit === Infinity ? "unlimited" : String(decision.remaining),
    },
  });
}
