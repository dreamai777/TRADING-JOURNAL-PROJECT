// Where AI usage counters live. On Netlify this is Netlify Blobs (built in, free, nothing to set up), so
// counts survive between serverless calls. Anywhere else (local dev, tests) it falls back to memory.
// Read-then-write is not atomic, so two calls in the same instant can both pass. That's acceptable for
// cost control: the per-minute burst limit and the global daily budget bound the overshoot.
import { getStore } from "@netlify/blobs";

export interface KvStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

const memory = new Map<string, unknown>();
const memoryStore: KvStore = {
  async get<T>(key: string) {
    return (memory.get(key) as T) ?? null;
  },
  async set(key, value) {
    memory.set(key, value);
  },
};

let cached: KvStore | null = null;

export function quotaStore(): KvStore {
  if (cached) return cached;
  try {
    const blobs = getStore({ name: "ai-quota", consistency: "strong" });
    cached = {
      async get<T>(key: string) {
        return ((await blobs.get(key, { type: "json" })) as T | null) ?? null;
      },
      async set(key, value) {
        await blobs.setJSON(key, value);
      },
    };
  } catch {
    // Not running on Netlify (no Blobs environment). Counters reset when the server restarts.
    cached = memoryStore;
  }
  return cached;
}

/** For tests. */
export function resetToMemoryQuotaStore() {
  memory.clear();
  cached = memoryStore;
}
