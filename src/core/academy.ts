// Academy catalog: lessons grouped into tracks. Free lessons unlock through quests; premium lessons
// belong to the Guild plan. Each lesson trains one skill and can target specific trader types,
// which is how the class test builds a personal study path.

import type { SkillId, TraderTypeId } from "./trader-test";

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
