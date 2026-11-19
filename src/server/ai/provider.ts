// Provider-agnostic interface for the AI Council. Routes and agents talk only to LlmProvider, so adding
// another model vendor later means writing one more file like ./anthropic.ts and registering it in
// ./index.ts. Nothing else in the app changes.
//
// Server-only (import it from route handlers only): providers read API keys from environment variables, which must never reach the browser.

/** "fast" for everyday chat, "deep" for slower, more careful work such as a full trade review. */
export type ModelTier = "fast" | "deep";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  tier: ModelTier;
  /** Instructions that are the same for every user of this agent. Kept first so providers can cache them. */
  instructions: string;
  /** Per-user grounding data (journal numbers, the trade under review). */
  context: string;
  messages: ChatTurn[];
  maxOutputTokens: number;
}

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Estimated cost of this call in US dollars, from the provider's price list. */
  costUsd: number;
}

export type FinishReason = "end" | "max_tokens" | "refusal";

export interface TextStream {
  /** Text chunks as the model writes them. */
  text: AsyncIterable<string>;
  /** Resolves after the stream ends. */
  done: Promise<{ usage: Usage; finish: FinishReason }>;
}

export type ProviderErrorKind = "rate_limited" | "auth" | "bad_request" | "upstream" | "network";

export class ProviderError extends Error {
  constructor(public kind: ProviderErrorKind, message: string, public status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface LlmProvider {
  id: string;
  label: string;
  /** True when the provider's key is set on the server. */
  isConfigured(): boolean;
  modelFor(tier: ModelTier): string;
  stream(req: GenerateRequest): TextStream;
}
