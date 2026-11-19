// Claude provider. Fast tier: Claude Sonnet 5.5 (quick, cheap, great for chat). Deep tier: Claude Opus 5.5
// (slower, more careful, used for full trade reviews). Either can be overridden with ANTHROPIC_MODEL_FAST /
// ANTHROPIC_MODEL_DEEP. The key is read from ANTHROPIC_API_KEY on the server only.
import Anthropic from "@anthropic-ai/sdk";
import { ProviderError, type FinishReason, type GenerateRequest, type LlmProvider, type ModelTier, type TextStream, type Usage } from "./provider";

const DEFAULT_MODELS: Record<ModelTier, string> = { fast: "claude-sonnet-5-5", deep: "claude-opus-5-5" };

/** US dollars per million tokens: [input, output, cache read]. Cache writes bill at 1.25x input. */
const PRICES: Record<string, [number, number, number]> = {
  "claude-sonnet-5-5": [2, 10, 0.1],
  "claude-sonnet-5": [2, 10, 0.2],
  "claude-opus-5-5": [4, 20, 0.2],
  "claude-opus-5": [5, 25, 0.5],
  "claude-opus-4-8": [5, 25, 0.5],
  "claude-haiku-5-5": [0.1, 0.5, 0.01],
};

export function estimateCost(model: string, u: { input: number; output: number; cacheRead: number; cacheWrite: number }): number {
  const key = Object.keys(PRICES).find((k) => model === k || model.startsWith(`${k}-`)) ?? "claude-opus-5";
  const [inp, out, read] = PRICES[key];
  return (u.input * inp + u.cacheWrite * inp * 1.25 + u.cacheRead * read + u.output * out) / 1_000_000;
}

function toProviderError(err: unknown): ProviderError {
  if (err instanceof Anthropic.RateLimitError) return new ProviderError("rate_limited", "Claude is busy right now.", 429);
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return new ProviderError("auth", "The Claude API key is missing, invalid or out of credit.", err.status);
  if (err instanceof Anthropic.BadRequestError) return new ProviderError("bad_request", err.message, 400);
  if (err instanceof Anthropic.APIConnectionError) return new ProviderError("network", "Could not reach Claude.");
  if (err instanceof Anthropic.APIError) return new ProviderError("upstream", `Claude error ${err.status ?? ""}`.trim(), err.status);
  return new ProviderError("network", err instanceof Error ? err.message : "Unknown error");
}

export const anthropicProvider: LlmProvider = {
  id: "anthropic",
  label: "Claude",
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  modelFor: (tier) => (tier === "deep" ? process.env.ANTHROPIC_MODEL_DEEP : process.env.ANTHROPIC_MODEL_FAST) || DEFAULT_MODELS[tier],

  stream(req: GenerateRequest): TextStream {
    const model = this.modelFor(req.tier);
    const client = new Anthropic();
    const stream = client.beta.messages.stream({
      model,
      max_tokens: req.maxOutputTokens,
      // If a safety classifier declines, the API retries on a suitable fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: req.tier === "deep" ? "high" : "medium" },
      system: [
        // Stable persona first and cached, then the trader's own data, so repeat questions reuse the cache.
        { type: "text", text: req.instructions, cache_control: { type: "ephemeral" } },
        { type: "text", text: req.context, cache_control: { type: "ephemeral" } },
      ],
      messages: req.messages,
    });

    let resolveDone!: (v: { usage: Usage; finish: FinishReason }) => void;
    let rejectDone!: (e: unknown) => void;
    const done = new Promise<{ usage: Usage; finish: FinishReason }>((res, rej) => {
      resolveDone = res;
      rejectDone = rej;
    });
    // Callers that only read `text` and handle its errors shouldn't also get an unhandled rejection.
    done.catch(() => {});

    async function* text(): AsyncGenerator<string> {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
        }
        const final = await stream.finalMessage();
        const u = final.usage;
        const tokens = { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 };
        const servedBy = final.model || model;
        resolveDone({
          usage: { model: servedBy, inputTokens: tokens.input, outputTokens: tokens.output, cacheReadTokens: tokens.cacheRead, cacheWriteTokens: tokens.cacheWrite, costUsd: estimateCost(servedBy, tokens) },
          finish: final.stop_reason === "refusal" ? "refusal" : final.stop_reason === "max_tokens" ? "max_tokens" : "end",
        });
      } catch (err) {
        const e = toProviderError(err);
        rejectDone(e);
        throw e;
      }
    }
    return { text: text(), done };
  },
};
