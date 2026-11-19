// AI cost control, as pure functions so it is easy to test and reuse on mobile. The server keeps the
// counters (src/server/ai/quota-store.ts); this file only decides "is this call allowed, and what does
// the counter look like afterwards".
//
// Three layers, checked in order:
//   1. Burst: a few messages a minute per user, so a stuck button or a script can't drain the month.
//   2. Monthly credits per plan (the numbers the pricing page promises). A chat costs 1 credit, a deep
//      trade review on the stronger model costs 3.
//   3. Global daily budget in USD across every user. The hard safety net while there is no real auth.
import type { PlanId } from "../plans";

export type AiCallKind = "chat" | "deep";

export const AI_CREDIT_COST: Record<AiCallKind, number> = { chat: 1, deep: 3 };

/** Monthly credits and per-minute burst per plan. Ultra is "unlimited" on the pricing page; 2000 is the fair-use ceiling. */
export const AI_PLAN_LIMITS: Record<PlanId, { monthly: number; perMinute: number }> = {
  free: { monthly: 20, perMinute: 6 },
  premium: { monthly: 200, perMinute: 10 },
  ultra: { monthly: 2000, perMinute: 20 },
};

/** Any one network address can use at most this many free accounts' worth of credits a month. */
export const IP_MONTHLY_MULTIPLIER = 3;

export interface UsageCounter {
  /** "YYYY-MM" the monthly count belongs to. */
  month: string;
  used: number;
  /** Timestamps (ms) of calls in the last minute. */
  recent: number[];
}

export interface BudgetCounter {
  /** "YYYY-MM-DD" (UTC). */
  day: string;
  usd: number;
}

export const monthKey = (now: number) => new Date(now).toISOString().slice(0, 7);
export const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);

/** First moment of next month (UTC), when monthly credits reset. */
export function monthResetsAt(now: number): string {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

export const freshCounter = (now: number): UsageCounter => ({ month: monthKey(now), used: 0, recent: [] });

/** Rolls a stored counter into the current month and drops burst stamps older than a minute. */
export function normalizeCounter(c: UsageCounter | null | undefined, now: number): UsageCounter {
  if (!c || c.month !== monthKey(now)) return freshCounter(now);
  return { month: c.month, used: c.used, recent: (c.recent ?? []).filter((t) => now - t < 60_000) };
}

export type QuotaDenial = "burst" | "monthly" | "ip" | "budget";

export interface QuotaDecision {
  ok: boolean;
  reason?: QuotaDenial;
  /** Credits left this month after this call (or now, if denied). */
  remaining: number;
  limit: number;
  resetsAt: string;
  /** Updated counters to save when ok. */
  user: UsageCounter;
  ip: UsageCounter;
}

export function checkQuota(opts: {
  plan: PlanId;
  kind: AiCallKind;
  user: UsageCounter | null | undefined;
  ip: UsageCounter | null | undefined;
  budget: BudgetCounter | null | undefined;
  dailyBudgetUsd: number;
  /** Users on the unlimited list skip the burst, monthly and IP checks, but not the global budget. */
  unlimited?: boolean;
  now: number;
}): QuotaDecision {
  const { plan, kind, now } = opts;
  const limits = AI_PLAN_LIMITS[plan];
  const cost = AI_CREDIT_COST[kind];
  const user = normalizeCounter(opts.user, now);
  const ip = normalizeCounter(opts.ip, now);
  const resetsAt = monthResetsAt(now);
  const limit = opts.unlimited ? Infinity : limits.monthly;
  const deny = (reason: QuotaDenial): QuotaDecision => ({ ok: false, reason, remaining: Math.max(0, limit - user.used), limit, resetsAt, user, ip });

  const spent = opts.budget && opts.budget.day === dayKey(now) ? opts.budget.usd : 0;
  if (opts.dailyBudgetUsd > 0 && spent >= opts.dailyBudgetUsd) return deny("budget");
  if (!opts.unlimited) {
    if (user.recent.length >= limits.perMinute) return deny("burst");
    if (user.used + cost > limits.monthly) return deny("monthly");
    if (ip.used + cost > AI_PLAN_LIMITS.free.monthly * IP_MONTHLY_MULTIPLIER && plan === "free") return deny("ip");
  }
  const nextUser = { ...user, used: user.used + cost, recent: [...user.recent, now] };
  const nextIp = { ...ip, used: ip.used + cost, recent: [...ip.recent, now].slice(-30) };
  return { ok: true, remaining: Math.max(0, limit - nextUser.used), limit, resetsAt, user: nextUser, ip: nextIp };
}

export function addSpend(b: BudgetCounter | null | undefined, usd: number, now: number): BudgetCounter {
  const day = dayKey(now);
  return { day, usd: (b && b.day === day ? b.usd : 0) + Math.max(0, usd) };
}

/** Plain-English explanation shown in the chat when a call is refused. */
export function denialMessage(reason: QuotaDenial, plan: PlanId, resetsAt: string): string {
  const reset = new Date(resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  switch (reason) {
    case "burst":
      return "Easy, champion. That's a lot of questions in a minute. Give it a few seconds and ask again.";
    case "monthly":
      return plan === "ultra"
        ? `You've hit this month's fair-use ceiling for AI chats. It resets on ${reset}.`
        : `You've used all of this month's AI chats on the ${plan === "free" ? "Free" : "Premium"} plan. They reset on ${reset}, or upgrade for more. The offline Council reports above still update with every trade.`;
    case "ip":
      return `This network has used its free AI chats for the month. They reset on ${reset}.`;
    case "budget":
      return "The AI Council has reached today's usage cap for the whole app. It resets at midnight UTC. Your offline reports still work.";
  }
}
