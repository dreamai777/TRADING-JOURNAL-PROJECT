// Academy catalog: lessons grouped into tracks. Free lessons unlock through quests; premium lessons
// belong to the Guild plan. Each lesson trains one skill and can target specific trader types,
// which is how the class test builds a personal study path.

import type { SkillId, TraderTypeId } from "./trader-test";
import type { Setup, TradeComputed } from "./types";

export type LessonTier = "free" | "premium";

export interface Lesson {
  id: string;
  track: string;
  title: string;
  skill: SkillId;
  types?: TraderTypeId[];
  tier: LessonTier;
  minutes: number;
  format: "read" | "video" | "drill";
}

export const TRACKS = ["Foundations", "Risk & Survival", "Mindset", "Execution", "Style Mastery", "Review & Edge"] as const;

export const LESSONS: Lesson[] = [
  // Foundations
  { id: "f-market-structure", track: "Foundations", title: "Market structure: trends, ranges and the levels that matter", skill: "analysis", tier: "free", minutes: 12, format: "read" },
  { id: "f-candles-volume", track: "Foundations", title: "Reading candles and volume without the noise", skill: "analysis", tier: "free", minutes: 10, format: "read" },
  { id: "f-orders", track: "Foundations", title: "Order types, fees and funding: what every trade really costs", skill: "knowledge", tier: "free", minutes: 8, format: "read" },
  { id: "f-r-multiples", track: "Foundations", title: "Think in R: win rate, expectancy and profit factor", skill: "knowledge", tier: "free", minutes: 10, format: "read" },
  // Risk
  { id: "r-position-size", track: "Risk & Survival", title: "The 1% rule and position sizing in 60 seconds", skill: "risk", tier: "free", minutes: 8, format: "drill" },
  { id: "r-stops", track: "Risk & Survival", title: "Where to put your stop (and why tight isn't safe)", skill: "risk", tier: "free", minutes: 10, format: "read" },
  { id: "r-leverage", track: "Risk & Survival", title: "Leverage without liquidation", skill: "risk", tier: "free", minutes: 9, format: "read" },
  { id: "r-drawdown-plan", track: "Risk & Survival", title: "Your drawdown plan: daily loss limits and recovery mode", skill: "risk", tier: "premium", minutes: 18, format: "video" },
  // Mindset
  { id: "m-revenge", track: "Mindset", title: "Breaking the revenge-trade loop", skill: "emotion", tier: "free", minutes: 9, format: "read" },
  { id: "m-fomo", track: "Mindset", title: "FOMO: why the trade you missed isn't a loss", skill: "emotion", tier: "free", minutes: 7, format: "read" },
  { id: "m-routine", track: "Mindset", title: "The pre-market routine of consistent traders", skill: "discipline", tier: "free", minutes: 8, format: "drill" },
  { id: "m-tilt-reset", track: "Mindset", title: "Tilt reset protocol: what to do in the 10 minutes after a big loss", skill: "emotion", tier: "premium", minutes: 15, format: "video" },
  // Execution
  { id: "e-rules", track: "Execution", title: "Write your first playbook rule (entry, stop, target, invalidation)", skill: "discipline", tier: "free", minutes: 10, format: "drill" },
  { id: "e-patience", track: "Execution", title: "Waiting for your trigger: A+ setups only", skill: "patience", tier: "free", minutes: 8, format: "read" },
  { id: "e-scaling", track: "Execution", title: "Scaling out and trailing stops", skill: "patience", tier: "premium", minutes: 16, format: "video" },
  { id: "e-checklist", track: "Execution", title: "The pre-trade checklist that kills impulse trades", skill: "discipline", tier: "free", minutes: 6, format: "drill" },
  // Style mastery
  { id: "s-scalp", track: "Style Mastery", title: "Scalping playbook: VWAP, order flow and fast exits", skill: "analysis", types: ["scalper"], tier: "premium", minutes: 24, format: "video" },
  { id: "s-day", track: "Style Mastery", title: "Day trading playbook: opening range, liquidity sweeps, VWAP reclaims", skill: "analysis", types: ["day"], tier: "premium", minutes: 26, format: "video" },
  { id: "s-momentum", track: "Style Mastery", title: "Momentum playbook: breakouts, volume and catalysts", skill: "analysis", types: ["momentum"], tier: "premium", minutes: 22, format: "video" },
  { id: "s-swing", track: "Style Mastery", title: "Swing playbook: pullbacks to the trend and S/R flips", skill: "analysis", types: ["swing"], tier: "free", minutes: 14, format: "read" },
  { id: "s-position", track: "Style Mastery", title: "Trend-following playbook: weekly breakouts and trailing stops", skill: "patience", types: ["position"], tier: "premium", minutes: 20, format: "video" },
  { id: "s-investor", track: "Style Mastery", title: "Investor playbook: accumulation zones, DCA and rebalancing", skill: "knowledge", types: ["investor"], tier: "free", minutes: 12, format: "read" },
  // Review
  { id: "v-journal", track: "Review & Edge", title: "How to journal a trade in 30 seconds (and why it matters)", skill: "discipline", tier: "free", minutes: 5, format: "drill" },
  { id: "v-weekly", track: "Review & Edge", title: "The weekly review: find your leaks with your own data", skill: "knowledge", tier: "free", minutes: 10, format: "drill" },
  { id: "v-edge", track: "Review & Edge", title: "Finding your edge: time of day, setup and market filters", skill: "analysis", tier: "premium", minutes: 20, format: "video" },
  { id: "v-case-studies", track: "Review & Edge", title: "A+ trade case studies: annotated wins and losses", skill: "analysis", tier: "premium", minutes: 30, format: "video" },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);

// ── Academy quest line ───────────────────────────────────────────────────────
// Free lessons unlock as quests are completed, so learning follows real journaling habits.


export interface AcademyCtx { trades: TradeComputed[]; setups: Setup[]; testTaken: boolean; lessonsDone: string[] }

export interface AcademyQuest {
  id: string;
  title: string;
  goal: number;
  xp: number;
  unlocks: string[];
  progress: (c: AcademyCtx) => number;
}

export const ACADEMY_QUESTS: AcademyQuest[] = [
  { id: "aq-enter", title: "Enter the Academy", goal: 1, xp: 0, unlocks: ["f-market-structure", "f-candles-volume", "v-journal"], progress: () => 1 },
  { id: "aq-class", title: "Take the Trader Class Test", goal: 1, xp: 100, unlocks: ["f-r-multiples", "s-swing", "s-investor"], progress: (c) => (c.testTaken ? 1 : 0) },
  { id: "aq-first", title: "Journal your first trade", goal: 1, xp: 50, unlocks: ["f-orders", "r-position-size"], progress: (c) => Math.min(1, c.trades.length) },
  { id: "aq-stops", title: "Log 5 trades with a stop loss", goal: 5, xp: 100, unlocks: ["r-stops", "r-leverage"], progress: (c) => Math.min(5, c.trades.filter((t) => t.stopLoss != null).length) },
  { id: "aq-mood", title: "Tag your emotion on 5 trades", goal: 5, xp: 80, unlocks: ["m-revenge", "m-fomo"], progress: (c) => Math.min(5, c.trades.filter((t) => t.emotion).length) },
  { id: "aq-spell", title: "Write a setup in your Spellbook", goal: 1, xp: 100, unlocks: ["e-rules", "e-checklist"], progress: (c) => Math.min(1, c.setups.length) },
  { id: "aq-study", title: "Finish 3 lessons", goal: 3, xp: 120, unlocks: ["m-routine", "e-patience"], progress: (c) => Math.min(3, c.lessonsDone.length) },
  { id: "aq-25", title: "Journal 25 trades", goal: 25, xp: 200, unlocks: ["v-weekly"], progress: (c) => Math.min(25, c.trades.length) },
];

export const lessonXp = (l: Lesson) => l.minutes * 10;

/** Which quest unlocks a free lesson (premium lessons are unlocked by the Guild plan instead). */
export const unlockQuestOf = (lessonId: string) => ACADEMY_QUESTS.find((q) => q.unlocks.includes(lessonId));

export function academyState(c: AcademyCtx, premium = false) {
  const quests = ACADEMY_QUESTS.map((q) => { const p = q.progress(c); return { ...q, value: p, done: p >= q.goal }; });
  const done = new Set(quests.filter((q) => q.done).flatMap((q) => q.unlocks));
  const lessons = LESSONS.map((l) => {
    const unlocked = l.tier === "premium" ? premium : done.has(l.id);
    return { ...l, unlocked, completed: c.lessonsDone.includes(l.id), quest: unlockQuestOf(l.id) };
  });
  const free = lessons.filter((l) => l.tier === "free");
  return { quests, lessons, freeDone: free.filter((l) => l.completed).length, freeTotal: free.length };
}

/** Bonus XP from the Academy: completed lessons plus finished academy quests. */
export function academyXp(c: AcademyCtx) {
  const lessons = LESSONS.filter((l) => c.lessonsDone.includes(l.id)).reduce((a, l) => a + lessonXp(l), 0);
  const quests = ACADEMY_QUESTS.filter((q) => q.progress(c) >= q.goal).reduce((a, q) => a + q.xp, 0);
  return lessons + quests;
}
