// Claude-backed strategy drafter. Turns a trader's plain-English idea into a StrategySpec the Lab can
// backtest and grade, grounded in the trader's journal stats. Without ANTHROPIC_API_KEY it answers 501
// and the client falls back to the offline drafter (src/core/strategy-ai.ts), so the prototype works
// with no key. The spec is re-sanitized here and again on the client before it ever runs.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { sanitizeSpec } from "@/core/strategy";
import type { TraderContext } from "@/core/strategy-ai";

const Operand = z.object({
  ind: z.enum(["price", "sma", "ema", "rsi", "atr", "highest", "lowest", "bbUpper", "bbLower", "value"]),
  len: z.number().describe("Lookback bars, 2-200. Omit for price and value.").optional(),
  value: z.number().describe("Constant, only when ind is value").optional(),
});
const Condition = z.object({ left: Operand, op: z.enum(["crossAbove", "crossBelow", "above", "below"]), right: Operand });
const Draft = z.object({
  spec: z.object({
    name: z.string(),
    icon: z.string().describe("One emoji"),
    weaponClass: z.enum(["Breakout", "Reversal", "Trend", "Scalp", "Range", "News"]),
    description: z.string().describe("One sentence"),
    side: z.enum(["long", "short"]),
    timeframe: z.string().describe("e.g. 5m, 1H, 4H, 1D"),
    markets: z.array(z.enum(["crypto", "forex", "futures", "equities", "options"])),
    entry: z.array(Condition).describe("All must be true to enter. 1 to 4 conditions."),
    exit: z.array(Condition).describe("Any one true exits. 0 to 3 conditions."),
    stop: z.object({ type: z.enum(["atr", "pct"]), value: z.number() }),
    targetR: z.number().describe("Take profit in R multiples, 0 for none"),
    maxBars: z.number().describe("Time stop in bars, 0 for none"),
    riskPct: z.number().describe("Percent of equity risked per trade, 0.1 to 2"),
  }),
  notes: z.array(z.string()).describe("2 to 4 short coaching notes for this trader about the draft"),
});

const SYSTEM = `You are the strategy architect inside a trading journal. Turn the trader's idea into a precise, testable rule set using only the indicator blocks in the schema.
- "highest"/"lowest" are the highest/lowest close of the prior N bars (excluding the current bar), so "price crossAbove highest(20)" is a 20-bar breakout.
- Prefer robust, widely used lookbacks (10, 20, 50, 100, 200) over oddly specific ones.
- Keep risk at or below 1% unless the trader explicitly asks for more, and never above 2%.
- Use the trader's journal context: respect their hero class style, protect against their costliest mistake, and fit their win rate (low win rate traders need larger R targets).
- Notes must be specific to this trader and draft. No guarantees of profit.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "not-configured" }, { status: 501 });
  let body: { prompt?: string; ctx?: TraderContext };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }
  const prompt = (body.prompt ?? "").slice(0, 2000).trim();
  if (!prompt) return Response.json({ error: "empty-prompt" }, { status: 400 });

  const client = new Anthropic();
  try {
    const msg = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(Draft) },
      // Server-side fallback: if a classifier declines, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: `Trader context (from their journal): ${JSON.stringify(body.ctx ?? {})}\n\nStrategy idea: ${prompt}` }],
    });
    if (msg.stop_reason === "refusal" || !msg.parsed_output) return Response.json({ error: "no-draft" }, { status: 502 });
    const { spec, notes } = msg.parsed_output;
    return Response.json({ spec: sanitizeSpec({ ...spec, id: "draft" }), notes });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return Response.json({ error: "rate-limited" }, { status: 429 });
    if (err instanceof Anthropic.APIError) return Response.json({ error: "upstream", status: err.status }, { status: 502 });
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
