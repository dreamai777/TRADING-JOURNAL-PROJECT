// Picks the AI provider. Today there is one (Claude). To add another vendor, implement LlmProvider in a
// new file, add it to PROVIDERS, and set AI_PROVIDER=<its id> in the environment.
import { anthropicProvider } from "./anthropic";
import type { LlmProvider } from "./provider";

const PROVIDERS: Record<string, LlmProvider> = {
  [anthropicProvider.id]: anthropicProvider,
};

export function getProvider(): LlmProvider {
  return PROVIDERS[process.env.AI_PROVIDER ?? ""] ?? anthropicProvider;
}

export type { LlmProvider, ModelTier, ChatTurn, Usage } from "./provider";
export { ProviderError } from "./provider";
