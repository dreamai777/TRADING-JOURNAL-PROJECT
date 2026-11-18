// Coach provider switch. The prototype ships the offline rule engine; the production build swaps in a
// Claude-backed provider (server route that streams insights grounded in the user's journal stats).
// Both implement the same CoachProvider interface from src/core/insights.ts.
import { localCoach, type CoachProvider } from "@/core/insights";

export const coach: CoachProvider = localCoach;
