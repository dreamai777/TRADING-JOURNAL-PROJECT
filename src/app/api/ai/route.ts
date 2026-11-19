// AI Council endpoint. Streams a Claude answer grounded in the journal context the client sends.
// No ANTHROPIC_API_KEY configured → 503 with {offline:true}, and the client falls back to the
// built-in agent engine, so the app works fully without a key.
//
// The system prompt is always built here from the agent id (or the custom agent's config), never taken
// from the client, so this route can't be used as a general-purpose LLM proxy.
// Production TODO: check the Supabase session and the user's plan + monthly message quota here.
import Anthropic from "@anthropic-ai/sdk";
import { PERSONAS, type CoreAgentId } from "@/core/ai/agents";
import { customSystemPrompt, type CustomAgent } from "@/core/ai/custom";
import type { Setup } from "@/core/types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const MAX_CONTEXT_CHARS = 24_000;
const MAX_TURNS = 16;

interface Body {
  agent: CoreAgentId | "custom";
  custom?: CustomAgent;
  setupNames?: { id: string; name: string }[];
  context: unknown;
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ offline: true, error: "No ANTHROPIC_API_KEY configured" }, { status: 503 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const persona = body.agent === "custom" ? null : PERSONAS[body.agent];
  if (!persona && !(body.agent === "custom" && body.custom)) return Response.json({ error: "Unknown agent" }, { status: 400 });

  const system = persona
    ? persona.system
    : customSystemPrompt(body.custom!, (body.setupNames ?? []).map((s) => ({ id: String(s.id), name: String(s.name) })) as Setup[]);
  const context = JSON.stringify(body.context ?? {}).slice(0, MAX_CONTEXT_CHARS);
  const turns = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!turns.length || turns[turns.length - 1].role !== "user") return Response.json({ error: "Last message must be from the user" }, { status: 400 });
  // The API requires the first message to be from the user.
  while (turns.length && turns[0].role !== "user") turns.shift();

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: [
      { type: "text", text: system },
      // Journal data sits after the stable persona prompt so the persona prefix stays cacheable.
      { type: "text", text: `Trader's journal data (JSON):\n${context}`, cache_control: { type: "ephemeral" } },
    ],
    messages: turns,
  });

  const encoder = new TextEncoder();
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") controller.enqueue(encoder.encode(event.delta.text));
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n_I can't help with that one. Try asking about your own trading data._"));
        if (final.stop_reason === "max_tokens") controller.enqueue(encoder.encode("\n\n_(cut short)_"));
      } catch (err) {
        const msg = err instanceof Anthropic.RateLimitError ? "The coach is busy. Try again in a moment." : err instanceof Anthropic.AuthenticationError ? "The AI key is invalid. Ask the admin to check ANTHROPIC_API_KEY." : err instanceof Anthropic.APIError ? `AI error ${err.status}.` : "AI connection failed.";
        controller.enqueue(encoder.encode(`\n\n_${msg}_`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-AI-Model": MODEL } });
}
