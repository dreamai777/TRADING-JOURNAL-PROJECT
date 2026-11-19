// Who is calling, which plan they are on, and whether they still have AI credits.
//
// The app has no server-side login yet (accounts live in the browser), so the user id and plan the
// browser sends cannot be fully trusted. Until Supabase auth lands, the protection is:
//   - quotas follow the plan the app shows (demo mode). Set AI_TRUST_CLIENT_PLAN=false to treat every
//     caller as Free except emails on AI_UNLIMITED_USERS,
//   - a per-network monthly cap so new demo accounts can't farm free credits,
//   - a hard global daily budget (AI_DAILY_BUDGET_USD, default $5) across all users.
// When real auth arrives, replace resolveCaller() with a session lookup. Nothing else needs to change.
import { createHash } from "node:crypto";
import { addSpend, checkQuota, dayKey, monthResetsAt, normalizeCounter, AI_PLAN_LIMITS, type AiCallKind, type BudgetCounter, type QuotaDecision, type UsageCounter } from "@/core/ai/quota";
import { normalizePlan, type PlanId, type StoredPlan } from "@/core/plans";
import { quotaStore, type KvStore } from "./quota-store";

export interface Caller {
  userKey: string;
  ipKey: string;
  plan: PlanId;
  unlimited: boolean;
}

export interface ClientIdentity {
  id?: string;
  email?: string;
  plan?: StoredPlan;
}

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 24);
const listEnv = (name: string) => (process.env[name] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export function dailyBudgetUsd(): number {
  const v = Number(process.env.AI_DAILY_BUDGET_USD);
  return Number.isFinite(v) && v >= 0 && process.env.AI_DAILY_BUDGET_USD ? v : 5;
}

export function resolveCaller(req: Request, who: ClientIdentity | undefined): Caller {
  const ip = (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "local").trim();
  const email = String(who?.email ?? "").trim().toLowerCase();
  const id = String(who?.id ?? "").slice(0, 80) || `anon:${ip}`;
  const unlimited = !!email && listEnv("AI_UNLIMITED_USERS").includes(email);
  const plan = unlimited ? "ultra" : process.env.AI_TRUST_CLIENT_PLAN === "false" ? "free" : normalizePlan(who?.plan);
  return { userKey: `u:${hash(`${id}|${email}`)}`, ipKey: `ip:${hash(ip)}`, plan, unlimited };
}

const BUDGET_KEY = "budget:global";

async function withStore<T>(fn: (s: KvStore) => Promise<T>): Promise<T> {
  return fn(quotaStore());
}

/** Checks and, if allowed, reserves credits for one call. */
export async function reserve(caller: Caller, kind: AiCallKind, now = Date.now()): Promise<QuotaDecision> {
  return withStore(async (s) => {
    const [user, ip, budget] = await Promise.all([s.get<UsageCounter>(caller.userKey), s.get<UsageCounter>(caller.ipKey), s.get<BudgetCounter>(BUDGET_KEY)]);
    const d = checkQuota({ plan: caller.plan, kind, user, ip, budget, dailyBudgetUsd: dailyBudgetUsd(), unlimited: caller.unlimited, now });
    if (d.ok) await Promise.all([s.set(caller.userKey, d.user), s.set(caller.ipKey, d.ip)]);
    return d;
  });
}

/** Records what a finished call actually cost against the global daily budget. */
export async function recordSpend(usd: number, now = Date.now()): Promise<void> {
  await withStore(async (s) => {
    const b = await s.get<BudgetCounter>(BUDGET_KEY);
    await s.set(BUDGET_KEY, addSpend(b, usd, now));
  });
}

/** Gives credits back when a call failed before producing an answer. */
export async function refund(caller: Caller, credits: number, now = Date.now()): Promise<void> {
  await withStore(async (s) => {
    const u = normalizeCounter(await s.get<UsageCounter>(caller.userKey), now);
    await s.set(caller.userKey, { ...u, used: Math.max(0, u.used - credits) });
  });
}

export async function usageSummary(caller: Caller, now = Date.now()) {
  return withStore(async (s) => {
    const [u, b] = await Promise.all([s.get<UsageCounter>(caller.userKey), s.get<BudgetCounter>(BUDGET_KEY)]);
    const used = normalizeCounter(u, now).used;
    const limit = caller.unlimited ? null : AI_PLAN_LIMITS[caller.plan].monthly;
    const spentToday = b && b.day === dayKey(now) ? b.usd : 0;
    return { plan: caller.plan, used, limit, remaining: limit == null ? null : Math.max(0, limit - used), resetsAt: monthResetsAt(now), budgetReached: dailyBudgetUsd() > 0 && spentToday >= dailyBudgetUsd() };
  });
}
