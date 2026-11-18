// Gamification engine: trader XP/rank, weapon (setup) mastery and rarity, quests, badges.
import { GEAR_TIERS, gearTier } from "./gear";
import { summarize } from "./stats";
import type { Setup, TradeComputed } from "./types";

export const RANKS = [
  { name: "Recruit", min: 0, color: "#94a3b8" },
  { name: "Cadet", min: 500, color: "#60a5fa" },
  { name: "Operator", min: 1500, color: "#34d399" },
  { name: "Sharpshooter", min: 3500, color: "#a3e635" },
  { name: "Veteran", min: 7000, color: "#facc15" },
  { name: "Elite", min: 12000, color: "#fb923c" },
  { name: "Warlord", min: 20000, color: "#f472b6" },
  { name: "Legend", min: 32000, color: "#c084fc" },
] as const;

/** XP is earned for journaling behaviour, never for P&L. Process over outcome. */
export function xpBreakdown(t: TradeComputed): { label: string; xp: number }[] {
  const out = [{ label: "Journaled a trade", xp: 10 }];
  if (t.notes && t.notes.length > 20) out.push({ label: "Wrote a lesson", xp: 5 });
  if (t.setupId) out.push({ label: "Tagged a weapon", xp: 5 });
  if (t.stopLoss != null) out.push({ label: "Set a stop", xp: 5 });
  if (t.emotion) out.push({ label: "Logged emotion", xp: 3 });
  if (t.rulesFollowed) out.push({ label: "Followed the plan", xp: 10 });
  if (t.rating) out.push({ label: "Rated execution", xp: 2 });
  if (t.mistakes.length === 0 && t.rulesFollowed) out.push({ label: "Clean execution", xp: 5 });
  if (t.r != null && t.r <= -1.2) out.push({ label: "Loss ran past stop", xp: -5 });
  return out;
}

export function tradeXp(t: TradeComputed) {
  return Math.max(0, xpBreakdown(t).reduce((a, b) => a + b.xp, 0));
}

export function traderProgress(trades: TradeComputed[], bonusXp = 0) {
  const xp = trades.reduce((a, t) => a + tradeXp(t), 0) + journalStreak(trades) * 15 + bonusXp;
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) idx = i;
  const rank = RANKS[idx];
  const next = RANKS[idx + 1];
  const level = 1 + Math.floor(Math.sqrt(xp / 18));
  const progress = next ? (xp - rank.min) / (next.min - rank.min) : 1;
  return { xp, level, rank, next, progress };
}

/** Consecutive calendar days (ending at the latest trade day) with at least one journaled trade. */
export function journalStreak(trades: TradeComputed[]) {
  const days = new Set(trades.map((t) => t.closedAt.slice(0, 10)));
  if (!days.size) return 0;
  const sorted = [...days].sort();
  let d = new Date(sorted[sorted.length - 1] + "T00:00:00Z");
  let streak = 0;
  // weekends don't break a streak
  for (let guard = 0; guard < 400; guard++) {
    const key = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    if (days.has(key)) streak++;
    else if (dow !== 0 && dow !== 6) break;
    d = new Date(d.getTime() - 86400000);
  }
  return streak;
}

/** Weapon rarity uses the 7 gear tiers (Basic → God). */
export const RARITIES = GEAR_TIERS.map((t, i) => ({ id: t.id, name: t.name, color: t.color, glow: `${t.color}${["30", "30", "40", "4d", "59", "66", "73"][i]}` }));

export function weaponStats(setup: Setup, trades: TradeComputed[]) {
  const ts = trades.filter((t) => t.setupId === setup.id);
  const s = summarize(ts);
  const xp = ts.reduce((a, t) => a + tradeXp(t), 0);
  const level = Math.min(50, 1 + Math.floor(xp / 150));
  // Rarity = proven edge: sample size AND win rate AND profit factor AND discipline (see core/gear.ts).
  const rarity = GEAR_TIERS.indexOf(gearTier(s));
  // Weapon "stats" for the card, 0..100
  const power = Math.max(0, Math.min(100, Math.round(((Math.min(s.profitFactor, 4) || 0) / 4) * 100)));
  const accuracy = Math.round(s.winRate * 100);
  const control = Math.round(Math.max(0, 100 - s.maxDrawdownPct * 500));
  const handling = Math.round(s.disciplineRate * 100);
  return { trades: ts, summary: s, xp, level, rarity: RARITIES[rarity], rarityIndex: rarity, tier: GEAR_TIERS[rarity], nextTier: GEAR_TIERS[rarity + 1], power, accuracy, control, handling };
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export function badges(trades: TradeComputed[], setups: Setup[], extra: { testTaken?: boolean; lessonsDone?: number; freeLessons?: number } = {}): Badge[] {
  const s = summarize(trades);
  const streak = journalStreak(trades);
  const def = (id: string, name: string, icon: string, description: string, unlocked: boolean): Badge => ({ id, name, icon, description, unlocked });
  return [
    def("first-blood", "First Blood", "🩸", "Journal your first trade", trades.length >= 1),
    def("centurion", "Centurion", "🛡️", "Journal 100 trades", trades.length >= 100),
    def("streak-7", "Iron Habit", "🔥", "7-day journaling streak", streak >= 7),
    def("stoic", "Stoic", "🧘", "90%+ rules followed (20+ trades)", trades.length >= 20 && s.disciplineRate >= 0.9),
    def("sniper", "Sniper", "🎯", "Land a +5R trade", trades.some((t) => (t.r ?? 0) >= 5)),
    def("armory", "Armory", "⚔️", "Build 5 weapons in your arsenal", setups.length >= 5),
    def("edge-found", "Edge Found", "💎", "Profit factor above 2 over 30+ trades", trades.length >= 30 && s.profitFactor >= 2),
    def("survivor", "Survivor", "🪖", "Keep max drawdown under 10% over 50 trades", trades.length >= 50 && s.maxDrawdownPct < 0.1),
    def("multi-asset", "Polymath", "🌐", "Trade 3+ asset classes", new Set(trades.map((t) => t.assetClass)).size >= 3),
    def("legendary", "Legendary Smith", "👑", "Forge a Legendary weapon", setups.some((st) => weaponStats(st, trades).rarityIndex >= 5)),
    def("god-forged", "God-Forged", "⚜️", "Forge a God-tier weapon", setups.some((st) => weaponStats(st, trades).rarityIndex >= 6)),
    def("know-thyself", "Know Thyself", "🧭", "Take the Trader Class Test", !!extra.testTaken),
    def("scholar", "Scholar", "📜", "Finish 5 Academy lessons", (extra.lessonsDone ?? 0) >= 5),
    def("graduate", "Graduate", "🎓", "Finish every free Academy lesson", !!extra.freeLessons && (extra.lessonsDone ?? 0) >= extra.freeLessons),
  ];
}

export function dailyQuests(trades: TradeComputed[], todayIso: string) {
  const today = trades.filter((t) => t.closedAt.slice(0, 10) === todayIso);
  return [
    { id: "q1", label: "Journal 3 trades today", xp: 30, progress: Math.min(today.length, 3), goal: 3 },
    { id: "q2", label: "Tag a setup on every trade", xp: 20, progress: today.length && today.every((t) => t.setupId) ? 1 : 0, goal: 1 },
    { id: "q3", label: "Write a lesson note (20+ chars)", xp: 15, progress: today.some((t) => (t.notes?.length ?? 0) > 20) ? 1 : 0, goal: 1 },
    { id: "q4", label: "Zero rule breaks today", xp: 25, progress: today.length && today.every((t) => t.rulesFollowed) ? 1 : 0, goal: 1 },
  ];
}
