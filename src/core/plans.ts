// Plans: Free, Premium and Ultra. The split follows one rule: everything a trader needs to journal
// honestly and see their real numbers is free forever, so the habit forms. Premium sells time saved
// (real-time sync of every account and market type) and depth (advanced analytics, replay, AI coach,
// the premium Academy). Ultra is for full-time, prop-firm and coached traders who want everything
// unlimited, live sessions and a monthly 1:1 review.

export type PlanId = "free" | "premium" | "ultra";
/** "guild" was the earlier name of the paid plan; treat it as Premium. */
export type StoredPlan = PlanId | "guild";

export const normalizePlan = (p?: StoredPlan | null): PlanId => (p === "guild" ? "premium" : p ?? "free");
export const isPaid = (p?: StoredPlan | null) => normalizePlan(p) !== "free";

export interface Plan {
  id: PlanId;
  name: string;
  rank: string;
  monthly: number;
  /** Per-month price when billed yearly. */
  yearly: number;
  pitch: string;
  highlights: string[];
  cta: string;
  color: string;
}

export const PLANS: Plan[] = [
  {
    id: "free", name: "Free", rank: "Adventurer", monthly: 0, yearly: 0, color: "#38d9f5", cta: "Start free",
    pitch: "Everything you need to journal every trade and see your real numbers. Free forever.",
    highlights: ["Unlimited manual journal and one-snap entry", "CSV import from any exchange", "1 exchange account, synced daily", "Core stats, P&L calendar and mistake costs", "Character, quests, bosses and the Armory", "Free Academy lessons and the Class Test"],
  },
  {
    id: "premium", name: "Premium", rank: "Champion", monthly: 19, yearly: 15, color: "#c8f53b", cta: "Go Premium",
    pitch: "Sync every account in real time and find your edge faster with deep analytics and an AI coach.",
    highlights: ["5 exchange accounts, real-time auto-sync", "Every crypto market: spot, perpetuals, futures, margin, grid and DCA bots", "Advanced analytics by setup, session, symbol and emotion", "Unlimited trade replay and backtests", "AI Council: all 5 agents, 1 custom agent, 200 chats a month", "Premium Academy: video vault and premium channel"],
  },
  {
    id: "ultra", name: "Ultra", rank: "Legend", monthly: 49, yearly: 39, color: "#fbbf24", cta: "Go Ultra",
    pitch: "For full-time and prop-firm traders: everything unlimited, live sessions and a monthly 1:1 review.",
    highlights: ["Unlimited accounts and portfolios, including prop firms with rule tracking", "Unlimited AI Council chats, 10 custom agents, pre-trade check", "Tick-data backtests across crypto, stocks, futures and forex", "Live trading sessions and a monthly 1:1 journal review", "Mentor sharing and API export", "Priority support and early access"],
  },
];

type V = boolean | string;
export const FEATURE_MATRIX: { group: string; rows: [string, V, V, V][] }[] = [
  {
    group: "Journaling",
    rows: [
      ["Manual journal, one-snap entry, screenshots and notes", "Unlimited", "Unlimited", "Unlimited"],
      ["CSV import (Binance, OKX, Bitget, Bybit and more)", true, true, true],
      ["Auto-sync exchange accounts (read-only API keys)", "1 account, daily", "5 accounts, real-time", "Unlimited, real-time"],
      ["Crypto spot and perpetual futures", true, true, true],
      ["Dated futures, margin, grid bots, DCA bots, copy trading", false, true, true],
      ["Prop firm accounts with rule tracking", false, "1 account", "Unlimited"],
      ["Portfolios", "1", "3", "Unlimited"],
      ["Trade history kept", "12 months", "Unlimited", "Unlimited"],
    ],
  },
  {
    group: "Analytics",
    rows: [
      ["Win rate, profit factor, expectancy, drawdown, P&L calendar", true, true, true],
      ["Cost of each mistake in dollars, tilt meter", true, true, true],
      ["Advanced breakdowns: setup, session, symbol, market type, emotion", false, true, true],
      ["MAE/MFE, R-distribution, time-in-trade", false, true, true],
      ["Trade replay", "5 a month", "Unlimited", "Unlimited"],
      ["Backtest lab", "3 runs a month", "Unlimited", "Unlimited + tick data"],
    ],
  },
  {
    group: "Game and playbook",
    rows: [
      ["Character, classes, quests, bosses, Armory", true, true, true],
      ["Spellbook setups", "3", "Unlimited", "Unlimited"],
      ["Share cards", "With watermark", "Clean", "Clean + your branding"],
    ],
  },
  {
    group: "AI Council",
    rows: [
      ["Oracle trade analyst: grade, what went right and wrong, tips", "Every trade", "Every trade", "Every trade"],
      ["Sensei personal coach: weekly focus and daily briefing", true, true, true],
      ["Habit, Risk and Sentiment agents with leak alerts", "Preview", true, true],
      ["Chat with any agent (Claude)", "20 messages a month", "200 messages a month", "Unlimited"],
      ["Custom agents with your own rules and voice", false, "1 agent", "10 agents"],
      ["Pre-trade checklist check against your Spellbook", false, false, true],
    ],
  },
  {
    group: "Academy",
    rows: [
      ["Free lessons unlocked by quests, Class Test, study path", true, true, true],
      ["Premium video vault, A+ setup library, premium channel", false, true, true],
      ["Live trading sessions and monthly 1:1 journal review", false, false, true],
    ],
  },
  {
    group: "Support and data",
    rows: [
      ["Export everything as CSV, any time", true, true, true],
      ["Mentor read-only sharing and API export", false, false, true],
      ["Support", "Community", "Email", "Priority, within 24h"],
    ],
  },
];

/** Limits the app checks against. */
export const PLAN_LIMITS: Record<PlanId, { syncAccounts: number; setups: number; replaysPerMonth: number; advancedMarkets: boolean }> = {
  free: { syncAccounts: 1, setups: 3, replaysPerMonth: 5, advancedMarkets: false },
  premium: { syncAccounts: 5, setups: Infinity, replaysPerMonth: Infinity, advancedMarkets: true },
  ultra: { syncAccounts: Infinity, setups: Infinity, replaysPerMonth: Infinity, advancedMarkets: true },
};
