import { describe, expect, it } from "vitest";
import { addSpend, checkQuota, denialMessage, monthResetsAt, AI_PLAN_LIMITS, type UsageCounter } from "../ai/quota";

const NOW = Date.parse("2026-11-19T12:00:00Z");
const base = { user: null, ip: null, budget: null, dailyBudgetUsd: 5, now: NOW } as const;

describe("AI quota", () => {
  it("lets a new free user chat and counts the credit", () => {
    const d = checkQuota({ ...base, plan: "free", kind: "chat" });
    expect(d.ok).toBe(true);
    expect(d.user.used).toBe(1);
    expect(d.remaining).toBe(AI_PLAN_LIMITS.free.monthly - 1);
  });

  it("charges a deep review 3 credits", () => {
    const d = checkQuota({ ...base, plan: "premium", kind: "deep" });
    expect(d.user.used).toBe(3);
  });

  it("blocks when the monthly credits are used up, and resets next month", () => {
    const user: UsageCounter = { month: "2026-11", used: 20, recent: [] };
    const d = checkQuota({ ...base, plan: "free", kind: "chat", user });
    expect(d).toMatchObject({ ok: false, reason: "monthly", remaining: 0 });
    const next = checkQuota({ ...base, plan: "free", kind: "chat", user, now: Date.parse("2026-12-01T00:00:01Z") });
    expect(next.ok).toBe(true);
  });

  it("won't let a deep review overdraw the month", () => {
    const user: UsageCounter = { month: "2026-11", used: 199, recent: [] };
    expect(checkQuota({ ...base, plan: "premium", kind: "deep", user }).reason).toBe("monthly");
    expect(checkQuota({ ...base, plan: "premium", kind: "chat", user }).ok).toBe(true);
  });

  it("limits bursts per minute", () => {
    const user: UsageCounter = { month: "2026-11", used: 4, recent: [NOW - 7000, NOW - 6000, NOW - 5000, NOW - 4000, NOW - 3000, NOW - 2000] };
    expect(checkQuota({ ...base, plan: "free", kind: "chat", user }).reason).toBe("burst");
    expect(checkQuota({ ...base, plan: "free", kind: "chat", user, now: NOW + 61_000 }).ok).toBe(true);
  });

  it("caps free credits per network so new accounts can't farm them", () => {
    const ip: UsageCounter = { month: "2026-11", used: 60, recent: [] };
    expect(checkQuota({ ...base, plan: "free", kind: "chat", ip }).reason).toBe("ip");
    expect(checkQuota({ ...base, plan: "premium", kind: "chat", ip }).ok).toBe(true);
  });

  it("stops everyone, even unlimited users, at the global daily budget", () => {
    const budget = { day: "2026-11-19", usd: 5.01 };
    expect(checkQuota({ ...base, plan: "ultra", kind: "chat", budget, unlimited: true }).reason).toBe("budget");
    expect(checkQuota({ ...base, plan: "ultra", kind: "chat", budget: { day: "2026-11-18", usd: 99 } }).ok).toBe(true);
  });

  it("unlimited users skip the monthly limit", () => {
    const user: UsageCounter = { month: "2026-11", used: 5000, recent: [] };
    expect(checkQuota({ ...base, plan: "ultra", kind: "chat", user, unlimited: true }).ok).toBe(true);
  });

  it("adds spend per UTC day", () => {
    const b = addSpend({ day: "2026-11-19", usd: 1 }, 0.25, NOW);
    expect(b.usd).toBeCloseTo(1.25);
    expect(addSpend(b, 0.5, Date.parse("2026-11-20T00:00:00Z"))).toEqual({ day: "2026-11-20", usd: 0.5 });
  });

  it("explains denials in plain words", () => {
    expect(denialMessage("monthly", "free", monthResetsAt(NOW))).toMatch(/December 1/);
  });
});
