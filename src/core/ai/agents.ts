// The AI Council: six specialist agents that read the journal and report back. Each agent is a pure
// function over the trader's data (runs offline, instantly, for free), plus a persona and system prompt
// that the Claude provider uses when the trader asks it a question. Same report shape for every agent,
// so the UI, the coach and the Claude prompt can treat them uniformly.
import { POSITIVE_EMOTIONS, type Emotion, type Setup, type TradeComputed } from "../types";
import { emotionImpact, mistakeCost, summarize, tiltMeter } from "../stats";
import { gradeOf, reviewAll, type Grade, type TradeReview } from "./review";

export type CoreAgentId = "analyst" | "habit" | "risk" | "sentiment" | "coach";
export type AgentId = CoreAgentId | `custom:${string}`;
export type Tone = "good" | "warn" | "bad" | "info";

export interface Finding {
  id: string;
  tone: Tone;
  title: string;
  body: string;
  action?: string;
}

export interface Metric {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "gold";
  hint?: string;
}

export interface AgentReport {
  agentId: AgentId;
  score: number; // 0..100, higher is healthier
  grade: Grade;
  headline: string;
  findings: Finding[];
  metrics: Metric[];
  /** The three things to do next, in order. */
  actions: string[];
}

export interface AgentPersona {
  id: CoreAgentId;
  name: string;
  title: string;
  icon: string;
  color: string;
  blurb: string;
  /** Lowest plan that unlocks the full agent (free users see a preview). */
  plan: "free" | "premium" | "ultra";
  starters: string[];
  system: string;
}

const BASE_RULES = `You are part of EdgeForge's AI Council, coaching a retail trader from their own journal data.
Ground every claim in the JSON context you are given; quote the numbers. If the data can't answer, say so.
Judge process over outcome. Never give financial advice or tell them to buy or sell a specific asset.
Be direct and warm, like a great trading mentor. Short paragraphs, bullet points for lists, no fluff. Under 220 words unless asked for more.`;

export const PERSONAS: Record<CoreAgentId, AgentPersona> = {
  analyst: {
    id: "analyst", name: "Oracle", title: "Trade Analyst", icon: "🔮", color: "#a78bfa", plan: "free",
    blurb: "Reads every trade and grades the process: what went right, what went wrong, what to do next time.",
    starters: ["Review my last trade", "Which trades were lucky wins?", "What do my A-grade trades have in common?"],
    system: `${BASE_RULES}\nYou are Oracle, the Trade Analyst. You grade trades on five pillars (Plan, Entry, Risk, Exit, Mindset) and separate good process from good outcome. Always end with one concrete tip for the next trade.`,
  },
  habit: {
    id: "habit", name: "Ironclad", title: "Habit Agent", icon: "⛓️", color: "#2fe39a", plan: "premium",
    blurb: "Tracks the routines that make or break you: revenge trades, overtrading, journaling, rule streaks.",
    starters: ["What's my worst habit right now?", "Am I overtrading?", "Build me a 2-week habit plan"],
    system: `${BASE_RULES}\nYou are Ironclad, the Habit Agent. You care about repeated behavior, not single trades. Name the habit, show the trend, cost it in dollars, and give one tiny, specific replacement routine.`,
  },
  risk: {
    id: "risk", name: "Bulwark", title: "Risk Manager", icon: "🛡️", color: "#38d9f5", plan: "premium",
    blurb: "Watches risk per trade, stop discipline, leverage, drawdown and risk of ruin. Sets your guardrails.",
    starters: ["What should my max risk per trade be?", "How close am I to blowing up?", "Set my daily loss limit"],
    system: `${BASE_RULES}\nYou are Bulwark, the Risk Manager. You think in R, risk of ruin, Kelly and drawdown. Recommend explicit numeric guardrails (max risk %, daily loss limit, max trades, max leverage) and explain them simply.`,
  },
  sentiment: {
    id: "sentiment", name: "Empath", title: "Sentiment Agent", icon: "🌗", color: "#fbbf24", plan: "premium",
    blurb: "Reads your mood, your notes and the market's mood, and shows how each one moves your P&L.",
    starters: ["Which emotion costs me the most?", "How do I trade when the market is fearful?", "What do my losing notes have in common?"],
    system: `${BASE_RULES}\nYou are Empath, the Sentiment Agent. You read the trader's logged emotions, the tone of their notes and the market mood feed. Connect feelings to results with numbers and offer one practical reset routine.`,
  },
  coach: {
    id: "coach", name: "Sensei", title: "Personal Trading Coach", icon: "🥋", color: "#c8f53b", plan: "free",
    blurb: "Your head coach. Combines every agent into one game plan, a weekly focus and answers to anything.",
    starters: ["What's my #1 focus this week?", "Give me a pre-market routine", "Am I improving?"],
    system: `${BASE_RULES}\nYou are Sensei, the trader's personal coach and head of the Council. You see every agent's report. Prioritize ruthlessly: one focus for the week, max three rules, and how to know it worked. Encourage like a coach who believes in them.`,
  },
};

export const CORE_AGENTS: CoreAgentId[] = ["coach", "analyst", "habit", "risk", "sentiment"];

// ---------------------------------------------------------------------------------------------------
// Shared helpers

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const money = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "∞");
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const day = (iso: string) => iso.slice(0, 10);
const DAY = 86400000;

function report(agentId: AgentId, score: number, headline: string, findings: Finding[], metrics: Metric[], actions: string[]): AgentReport {
  const s = clamp(score);
  return { agentId, score: s, grade: gradeOf(s), headline, findings, metrics, actions: actions.filter(Boolean).slice(0, 3) };
}

export interface CouncilInput {
  trades: TradeComputed[];
  setups: Setup[];
  account: number;
  now?: number;
}

// ---------------------------------------------------------------------------------------------------
// Oracle: trade analyst (aggregate of per-trade reviews)

export function analystAgent({ trades, setups, account }: CouncilInput, reviews = reviewAll(trades, setups, account)): AgentReport {
  if (trades.length < 3) return report("analyst", 50, "Log 3 trades and Oracle will start grading them.", [], [], ["Snap your next trade with N"]);
  const recent = trades.slice(-30);
  const rs = recent.map((t) => reviews.get(t.id)!).filter(Boolean);
  const avg = rs.reduce((a, r) => a + r.score, 0) / rs.length;
  const prev = trades.slice(-60, -30).map((t) => reviews.get(t.id)!).filter(Boolean);
  const prevAvg = prev.length ? prev.reduce((a, r) => a + r.score, 0) / prev.length : avg;
  const count = (v: TradeReview["verdict"]) => rs.filter((r) => r.verdict === v).length;
  const lucky = count("Lucky win");
  const goodLoss = count("Good loss");
  const pillarAvg = (["Plan", "Entry", "Risk", "Exit", "Mindset"] as const).map((p) => ({ p, v: rs.reduce((a, r) => a + r.pillars.find((x) => x.pillar === p)!.score, 0) / rs.length }));
  const weakest = [...pillarAvg].sort((a, b) => a.v - b.v)[0];
  const strongest = [...pillarAvg].sort((a, b) => b.v - a.v)[0];
  const highGrade = recent.filter((t) => ["S", "A"].includes(reviews.get(t.id)!.grade));
  const lowGrade = recent.filter((t) => ["D", "F"].includes(reviews.get(t.id)!.grade));
  const hi = summarize(highGrade);
  const lo = summarize(lowGrade);

  const findings: Finding[] = [];
  findings.push({ id: "weak-pillar", tone: weakest.v < 55 ? "bad" : "warn", title: `${weakest.p} is your weakest pillar (${Math.round(weakest.v)}/100)`, body: `Across your last ${rs.length} trades, ${weakest.p.toLowerCase()} decisions drag your process grade down the most. ${strongest.p} is your strongest at ${Math.round(strongest.v)}.`, action: PILLAR_FIX[weakest.p] });
  if (highGrade.length >= 3 && lowGrade.length >= 3)
    findings.push({ id: "grade-gap", tone: "info", title: `A-grade trades make ${money(hi.expectancy)} each, D/F trades ${money(lo.expectancy)}`, body: `${highGrade.length} high-grade vs ${lowGrade.length} low-grade trades recently. Process quality is your edge, in dollars.`, action: "Only take trades you'd grade A before you enter." });
  if (lucky >= 2) findings.push({ id: "lucky", tone: "warn", title: `${lucky} lucky wins in your last ${rs.length} trades`, body: "Profitable trades with a weak process. They feel great and train bad habits.", action: "Open each lucky win and write what you'd do differently." });
  if (goodLoss >= 2) findings.push({ id: "good-loss", tone: "good", title: `${goodLoss} good losses`, body: "Losses where you did everything right. That's what a real edge looks like over time.", action: "Stop judging these as mistakes." });
  const trend = avg - prevAvg;
  findings.push({ id: "trend", tone: trend >= 2 ? "good" : trend <= -2 ? "bad" : "info", title: `Process grade ${trend >= 0 ? "up" : "down"} ${Math.abs(trend).toFixed(1)} points`, body: `Last 30 trades average ${avg.toFixed(0)} vs ${prevAvg.toFixed(0)} for the 30 before.` });

  return report(
    "analyst", avg,
    `Your recent process grade is ${gradeOf(avg)} (${avg.toFixed(0)}/100). Biggest lever: ${weakest.p.toLowerCase()}.`,
    findings,
    [
      { label: "Avg grade", value: `${gradeOf(avg)} · ${avg.toFixed(0)}` },
      { label: "S/A trades", value: pct(highGrade.length / rs.length), tone: "profit" },
      { label: "Lucky wins", value: String(lucky), tone: lucky ? "gold" : undefined },
      { label: "Good losses", value: String(goodLoss) },
    ],
    [PILLAR_FIX[weakest.p], lucky ? "Re-review your lucky wins" : "Keep grading every trade", "Screenshot your best A trade into the playbook"],
  );
}

const PILLAR_FIX: Record<string, string> = {
  Plan: "Tag every trade to a setup and tick its checklist before entry.",
  Entry: "Write the trigger in advance and use limit orders. No chasing.",
  Risk: "Size every trade from the stop so it risks 1% or less.",
  Exit: "Partial at 1R, trail the rest. Let runners reach 2R.",
  Mindset: "Log your emotion on entry and pause 15 minutes after any loss.",
};

// ---------------------------------------------------------------------------------------------------
// Ironclad: habit agent

export interface Habit {
  id: string;
  name: string;
  kind: "good" | "bad";
  /** Share of recent opportunities where the habit showed up (0..1). */
  rate: number;
  prevRate: number;
  /** Money it made (+) or cost (−) recently. */
  impact: number;
  detail: string;
}

export function detectHabits(trades: TradeComputed[], now = Date.now()): Habit[] {
  const recent = trades.filter((t) => Date.parse(t.closedAt) >= now - 30 * DAY);
  const prior = trades.filter((t) => Date.parse(t.closedAt) < now - 30 * DAY && Date.parse(t.closedAt) >= now - 60 * DAY);
  const r = recent.length ? recent : trades.slice(-40);
  const p = prior.length ? prior : trades.slice(-80, -40);

  const revenge = (xs: TradeComputed[]) => {
    const hits: TradeComputed[] = [];
    for (let i = 1; i < xs.length; i++) {
      const prev = xs[i - 1];
      const gap = Date.parse(xs[i].openedAt) - Date.parse(prev.closedAt);
      if (!prev.win && gap >= 0 && gap < 30 * 60000) hits.push(xs[i]);
    }
    return hits;
  };
  const overtradeDays = (xs: TradeComputed[]) => {
    const byDay = new Map<string, TradeComputed[]>();
    for (const t of xs) byDay.set(day(t.openedAt), [...(byDay.get(day(t.openedAt)) ?? []), t]);
    const days = [...byDay.values()];
    const over = days.filter((d) => d.length >= 5);
    return { days: days.length, over, extra: over.flatMap((d) => d.slice(3)) };
  };
  const rate = (xs: TradeComputed[], f: (t: TradeComputed) => boolean) => (xs.length ? xs.filter(f).length / xs.length : 0);
  const sumPnl = (xs: TradeComputed[]) => xs.reduce((a, t) => a + t.pnl, 0);

  const rv = revenge(r), rvP = revenge(p);
  const od = overtradeDays(r), odP = overtradeDays(p);
  const noStop = r.filter((t) => t.stopLoss == null || t.mistakes.includes("no-stop"));
  const weekend = r.filter((t) => [0, 6].includes(new Date(t.openedAt).getUTCDay()));
  const late = r.filter((t) => { const h = new Date(t.openedAt).getUTCHours(); return h >= 22 || h < 4; });

  const habits: Habit[] = [
    { id: "rules", name: "Follows the plan", kind: "good", rate: rate(r, (t) => t.rulesFollowed === true), prevRate: rate(p, (t) => t.rulesFollowed === true), impact: sumPnl(r.filter((t) => t.rulesFollowed)), detail: "Trades where every playbook rule was respected." },
    { id: "journal", name: "Writes a lesson", kind: "good", rate: rate(r, (t) => (t.notes ?? "").length > 15), prevRate: rate(p, (t) => (t.notes ?? "").length > 15), impact: 0, detail: "Trades with a real note, not just numbers." },
    { id: "tagging", name: "Tags setup and mood", kind: "good", rate: rate(r, (t) => !!t.setupId && !!t.emotion), prevRate: rate(p, (t) => !!t.setupId && !!t.emotion), impact: 0, detail: "Trades with both a weapon and an emotion logged." },
    { id: "revenge", name: "Revenge trading", kind: "bad", rate: r.length ? rv.length / r.length : 0, prevRate: p.length ? rvP.length / p.length : 0, impact: sumPnl(rv), detail: "New entry within 30 minutes of a loss." },
    { id: "overtrading", name: "Overtrading", kind: "bad", rate: od.days ? od.over.length / od.days : 0, prevRate: odP.days ? odP.over.length / odP.days : 0, impact: sumPnl(od.extra), detail: "Days with 5+ trades. Impact counts trades #4 and later." },
    { id: "no-stop", name: "Trading without a stop", kind: "bad", rate: rate(r, (t) => noStop.includes(t)), prevRate: rate(p, (t) => t.stopLoss == null || t.mistakes.includes("no-stop")), impact: sumPnl(noStop), detail: "Entries with no hard stop loss." },
    { id: "late-night", name: "Late-night trading", kind: "bad", rate: rate(r, (t) => late.includes(t)), prevRate: rate(p, (t) => { const h = new Date(t.openedAt).getUTCHours(); return h >= 22 || h < 4; }), impact: sumPnl(late), detail: "Entries between 22:00 and 04:00 UTC." },
    { id: "weekend", name: "Weekend trading", kind: "bad", rate: rate(r, (t) => weekend.includes(t)), prevRate: rate(p, (t) => [0, 6].includes(new Date(t.openedAt).getUTCDay())), impact: sumPnl(weekend), detail: "Entries on Saturday or Sunday (thin liquidity)." },
  ];
  return habits;
}

/** Consecutive trades (most recent first) where rules were followed. */
export function ruleStreak(trades: TradeComputed[]) {
  let n = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].rulesFollowed === false) break;
    if (trades[i].rulesFollowed) n++;
  }
  return n;
}

export function habitAgent({ trades, now = Date.now() }: CouncilInput): AgentReport {
  if (trades.length < 5) return report("habit", 50, "Ironclad needs 5 trades to spot your habits.", [], [], ["Journal 5 trades"]);
  const habits = detectHabits(trades, now);
  const bad = habits.filter((h) => h.kind === "bad").sort((a, b) => a.impact - b.impact);
  const good = habits.filter((h) => h.kind === "good");
  const worst = bad[0];
  const streak = ruleStreak(trades);
  const score = 100 - bad.reduce((a, h) => a + h.rate * 60, 0) + good.reduce((a, h) => a + (h.rate - 0.6) * 25, 0);

  const findings: Finding[] = bad
    .filter((h) => h.rate > 0.02)
    .slice(0, 3)
    .map((h) => ({
      id: h.id, tone: h.impact < 0 ? "bad" : "warn",
      title: `${h.name}: ${pct(h.rate)} of the time${h.impact ? `, ${money(h.impact)}` : ""}`,
      body: `${h.detail} ${trendWord(h.rate, h.prevRate, true)}`,
      action: HABIT_FIX[h.id],
    }));
  for (const h of good) {
    findings.push({ id: h.id, tone: h.rate >= 0.7 ? "good" : "warn", title: `${h.name}: ${pct(h.rate)}`, body: `${h.detail} ${trendWord(h.rate, h.prevRate, false)}`, action: h.rate < 0.7 ? HABIT_FIX[h.id] : undefined });
  }

  return report(
    "habit", score,
    worst && worst.impact < 0 ? `${worst.name} is your costliest habit: ${money(worst.impact)} in the last 30 days.` : `Your habits are holding. Rule streak: ${streak} trades.`,
    findings,
    [
      { label: "Rule streak", value: `${streak} trades`, tone: streak >= 5 ? "profit" : undefined },
      { label: "Plan followed", value: pct(good[0].rate), tone: good[0].rate >= 0.7 ? "profit" : "gold" },
      { label: "Revenge rate", value: pct(bad.find((h) => h.id === "revenge")!.rate), tone: "loss" },
      { label: "Overtrade days", value: pct(bad.find((h) => h.id === "overtrading")!.rate) },
    ],
    [worst ? HABIT_FIX[worst.id] : "", HABIT_FIX.journal, "Check in on your habits in the Notebook every day"],
  );
}

const HABIT_FIX: Record<string, string> = {
  rules: "Read your setup's checklist out loud before every entry.",
  journal: "Write one sentence after every trade: what did I learn?",
  tagging: "Make setup and emotion required fields in your snap routine.",
  revenge: "After any loss: stand up, 15 minute timer, then re-read your plan.",
  overtrading: "Hard cap of 3 trades a day. Trade #4 needs a written reason.",
  "no-stop": "No stop, no trade. Place the stop in the same click as the entry.",
  "late-night": "Set a session end time and close the platform at it.",
  weekend: "Treat weekends as review days, not trading days.",
};

function trendWord(now: number, prev: number, badHabit: boolean) {
  const d = now - prev;
  if (Math.abs(d) < 0.03) return "Flat vs the month before.";
  const better = badHabit ? d < 0 : d > 0;
  return `${better ? "Improving" : "Getting worse"}: ${pct(prev)} → ${pct(now)} vs the month before.`;
}

// ---------------------------------------------------------------------------------------------------
// Bulwark: risk manager

export interface RiskProfile {
  riskPcts: number[]; // per trade, fraction of equity at the time
  avgRisk: number;
  maxRisk: number;
  overRisk: number; // share of trades risking > 2%
  noStop: number; // share without a stop
  beyondStop: number; // share of losses worse than -1.2R
  kelly: number; // full Kelly fraction (can be negative)
  riskOfRuin: number; // chance of a 50% drawdown at current avg risk
  avgLeverage: number;
  worstDay: { date: string; pnl: number; pct: number } | null;
  dailyBreaches: number; // days losing more than 3%
  guardrails: { label: string; value: string; why: string }[];
}

export function riskProfile(trades: TradeComputed[], account: number): RiskProfile {
  let equity = account;
  const riskPcts: number[] = [];
  const dayMap = new Map<string, { pnl: number; start: number }>();
  for (const t of trades) {
    if (t.risk != null && equity > 0) riskPcts.push(t.risk / equity);
    const d = day(t.closedAt);
    const row = dayMap.get(d) ?? { pnl: 0, start: equity };
    row.pnl += t.pnl;
    dayMap.set(d, row);
    equity += t.pnl;
  }
  const s = summarize(trades, account);
  const recentRisk = riskPcts.slice(-50);
  const avgRisk = recentRisk.length ? recentRisk.reduce((a, b) => a + b, 0) / recentRisk.length : 0;
  const maxRisk = recentRisk.length ? Math.max(...recentRisk) : 0;
  const payoff = Number.isFinite(s.payoff) ? s.payoff : 3;
  const kelly = payoff > 0 ? s.winRate - (1 - s.winRate) / payoff : 0;
  const days = [...dayMap.entries()].map(([date, r]) => ({ date, pnl: r.pnl, pct: r.start > 0 ? r.pnl / r.start : 0 }));
  const worstDay = days.length ? days.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
  const losses = trades.filter((t) => !t.win && t.r != null);
  const lev = trades.filter((t) => t.leverage);
  const edge = s.winRate * payoff - (1 - s.winRate);
  // Risk of ruin (50% drawdown) for a fixed-fractional bettor, standard approximation.
  const units = avgRisk > 0 ? Math.log(0.5) / Math.log(1 - avgRisk) : 999;
  const ror = edge <= 0 ? 1 : Math.min(1, Math.pow((1 - edge / (1 + payoff)) / (1 + edge / (1 + payoff)), units));
  const recommended = Math.max(0.0025, Math.min(0.01, kelly / 4));
  const avgTradesPerDay = days.length ? trades.length / days.length : 0;
  return {
    riskPcts, avgRisk, maxRisk,
    overRisk: recentRisk.length ? recentRisk.filter((r) => r > 0.02).length / recentRisk.length : 0,
    noStop: trades.length ? trades.filter((t) => t.stopLoss == null).length / trades.length : 0,
    beyondStop: losses.length ? losses.filter((t) => (t.r ?? 0) < -1.2).length / losses.length : 0,
    kelly, riskOfRuin: ror,
    avgLeverage: lev.length ? lev.reduce((a, t) => a + (t.leverage ?? 0), 0) / lev.length : 0,
    worstDay, dailyBreaches: days.filter((d) => d.pct < -0.03).length,
    guardrails: [
      { label: "Max risk per trade", value: pct(recommended, 2), why: kelly > 0 ? `Quarter-Kelly for your edge (full Kelly ${pct(kelly, 1)}), capped at 1%.` : "Your edge is not proven yet, so stay small." },
      { label: "Daily loss limit", value: pct(Math.min(0.03, recommended * 3), 1), why: "Three max losses and you're done for the day." },
      { label: "Max trades a day", value: String(Math.max(2, Math.min(5, Math.round(avgTradesPerDay + 1)))), why: `You average ${avgTradesPerDay.toFixed(1)} a day. Quality falls after that.` },
      { label: "Max leverage", value: lev.length ? `${Math.min(10, Math.max(3, Math.round((lev.reduce((a, t) => a + (t.leverage ?? 0), 0) / lev.length) * 0.7)))}x` : "5x", why: "Leverage sets the liquidation distance, not the risk. Keep it low so the stop, not the exchange, closes you." },
      { label: "Stop after", value: "2 losses in a row", why: "Your tilt meter jumps after back-to-back losses." },
    ],
  };
}

export function riskAgent({ trades, account }: CouncilInput): AgentReport {
  if (trades.length < 5) return report("risk", 50, "Bulwark needs 5 trades with stops to profile your risk.", [], [], ["Add a stop loss to every trade"]);
  const rp = riskProfile(trades, account);
  const s = summarize(trades, account);
  const score = 100 - rp.overRisk * 80 - rp.noStop * 120 - rp.beyondStop * 50 - Math.max(0, rp.avgRisk - 0.01) * 2000 - s.maxDrawdownPct * 150 - rp.riskOfRuin * 40;
  const findings: Finding[] = [];
  findings.push({ id: "avg-risk", tone: rp.avgRisk <= 0.011 ? "good" : rp.avgRisk <= 0.02 ? "warn" : "bad", title: `You risk ${pct(rp.avgRisk, 2)} per trade on average`, body: `Biggest single risk recently: ${pct(rp.maxRisk, 2)}. ${pct(rp.overRisk)} of recent trades risked more than 2%.`, action: `Cap risk at ${rp.guardrails[0].value} per trade.` });
  if (rp.noStop > 0) findings.push({ id: "no-stop", tone: "bad", title: `${pct(rp.noStop)} of trades had no stop`, body: "Unlimited downside on those trades. Your largest losses usually live here.", action: "No stop, no trade." });
  if (rp.beyondStop > 0.08) findings.push({ id: "beyond", tone: "warn", title: `${pct(rp.beyondStop)} of losses ran past -1.2R`, body: "Either the stop moved, or it wasn't a hard stop. Planned risk and real risk are drifting apart.", action: "Use exchange-side stop orders, never mental stops." });
  findings.push({ id: "ruin", tone: rp.riskOfRuin < 0.01 ? "good" : rp.riskOfRuin < 0.1 ? "warn" : "bad", title: `Risk of a 50% drawdown: ${rp.riskOfRuin < 0.001 ? "<0.1%" : pct(rp.riskOfRuin, 1)}`, body: `At your current win rate (${pct(s.winRate)}), payoff (${fmt(s.payoff)}) and average risk. Full Kelly says ${pct(Math.max(0, rp.kelly), 1)}; pros bet a quarter of that or less.` });
  findings.push({ id: "dd", tone: s.maxDrawdownPct < 0.1 ? "good" : s.maxDrawdownPct < 0.2 ? "warn" : "bad", title: `Max drawdown ${pct(s.maxDrawdownPct, 1)}`, body: rp.worstDay ? `Worst day: ${rp.worstDay.date}, ${money(rp.worstDay.pnl)} (${pct(rp.worstDay.pct, 1)}). ${rp.dailyBreaches} days lost more than 3%.` : "" , action: rp.dailyBreaches ? `Daily loss limit: ${rp.guardrails[1].value}. Hit it, close the platform.` : undefined });
  if (rp.avgLeverage >= 15) findings.push({ id: "lev", tone: "warn", title: `Average leverage ${rp.avgLeverage.toFixed(0)}x`, body: "High leverage puts liquidation close to your entry and invites oversizing.", action: `Max ${rp.guardrails[3].value}.` });
  return report(
    "risk", score,
    rp.noStop > 0.05 ? `Trades without stops are your biggest risk leak (${pct(rp.noStop)} of trades).` : rp.avgRisk > 0.015 ? `You're sizing too big: ${pct(rp.avgRisk, 2)} average risk per trade.` : `Risk is under control. Avg ${pct(rp.avgRisk, 2)} per trade, max DD ${pct(s.maxDrawdownPct, 1)}.`,
    findings,
    [
      { label: "Avg risk/trade", value: pct(rp.avgRisk, 2), tone: rp.avgRisk <= 0.011 ? "profit" : "loss" },
      { label: "Max drawdown", value: pct(s.maxDrawdownPct, 1), tone: s.maxDrawdownPct < 0.1 ? "profit" : "loss" },
      { label: "Kelly", value: pct(Math.max(0, rp.kelly), 1), hint: "Full Kelly fraction for your edge" },
      { label: "Ruin risk", value: rp.riskOfRuin < 0.001 ? "<0.1%" : pct(rp.riskOfRuin, 1), tone: rp.riskOfRuin < 0.01 ? "profit" : "gold" },
    ],
    [`Max risk ${rp.guardrails[0].value} per trade`, `Daily loss limit ${rp.guardrails[1].value}`, `Max ${rp.guardrails[2].value} trades a day`],
  );
}

// ---------------------------------------------------------------------------------------------------
// Empath: sentiment agent (your mood + your notes + market mood)

const POS_WORDS = ["patience", "patient", "clean", "plan", "followed", "calm", "confident", "great", "right", "respected", "waited", "disciplined", "a+", "good", "focused", "no regrets", "ran", "target"];
const NEG_WORDS = ["fomo", "chased", "chase", "moved", "revenge", "angry", "never again", "should have", "before confirmation", "mistake", "greedy", "scared", "fear", "tilt", "impatient", "stupid", "forced", "bored", "news", "hope"];

/** Lexicon score of a note, -1..1. Claude replaces this with real language understanding. */
export function noteSentiment(text?: string) {
  if (!text) return 0;
  const s = text.toLowerCase();
  const pos = POS_WORDS.filter((w) => s.includes(w)).length;
  const neg = NEG_WORDS.filter((w) => s.includes(w)).length;
  if (!pos && !neg) return 0;
  return (pos - neg) / (pos + neg);
}

export const EMOTION_VALENCE: Record<Emotion, number> = { calm: 0.8, confident: 0.7, focused: 0.9, fomo: -0.8, fearful: -0.6, greedy: -0.7, revenge: -1, bored: -0.4, tired: -0.5 };

/** Combined mood of one trade: logged emotion (70%) + tone of the note (30%). */
export function tradeMood(t: TradeComputed) {
  const e = t.emotion ? EMOTION_VALENCE[t.emotion] : 0;
  return t.emotion ? e * 0.7 + noteSentiment(t.notes) * 0.3 : noteSentiment(t.notes);
}

export interface MarketMood {
  index: number; // 0 extreme fear .. 100 extreme greed
  label: string;
  fundingBias: "longs pay" | "shorts pay" | "neutral";
  longShort: number;
  history: { date: string; index: number }[];
}

/**
 * Demo market-mood feed. Deterministic so screenshots are stable. Production swaps this for live data
 * (crypto fear and greed index, exchange funding and long/short ratios via the sync worker).
 */
export function marketMood(now = Date.now(), days = 60): MarketMood {
  const history: { date: string; index: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = now - i * DAY;
    const d = Math.floor(t / DAY);
    const v = 52 + 24 * Math.sin(d / 9) + 12 * Math.sin(d / 3.3 + 1) + 6 * Math.cos(d / 1.7);
    history.push({ date: new Date(t).toISOString().slice(0, 10), index: Math.max(4, Math.min(96, Math.round(v))) });
  }
  const index = history[history.length - 1].index;
  return { index, label: moodLabel(index), fundingBias: index > 60 ? "longs pay" : index < 40 ? "shorts pay" : "neutral", longShort: +(0.7 + index / 100).toFixed(2), history };
}

export function moodLabel(i: number) {
  return i < 25 ? "Extreme fear" : i < 45 ? "Fear" : i <= 55 ? "Neutral" : i < 75 ? "Greed" : "Extreme greed";
}

export function sentimentAgent({ trades, now = Date.now() }: CouncilInput): AgentReport {
  if (trades.length < 5) return report("sentiment", 50, "Empath needs 5 trades with an emotion logged.", [], [], ["Log your emotion on every trade"]);
  const emo = emotionImpact(trades);
  const worst = [...emo].sort((a, b) => a.pnl - b.pnl)[0];
  const best = [...emo].sort((a, b) => b.pnl - a.pnl)[0];
  const tagged = trades.filter((t) => t.emotion);
  const pos = summarize(tagged.filter((t) => POSITIVE_EMOTIONS.includes(t.emotion!)));
  const neg = summarize(tagged.filter((t) => !POSITIVE_EMOTIONS.includes(t.emotion!)));
  const recent = trades.slice(-20);
  const mood = recent.reduce((a, t) => a + tradeMood(t), 0) / recent.length;
  const lossNotes = trades.filter((t) => !t.win && t.notes).map((t) => t.notes!.toLowerCase());
  const themes = NEG_WORDS.map((w) => ({ w, n: lossNotes.filter((n) => n.includes(w)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  const mm = marketMood(now);
  const byMood = moodBuckets(trades, now);
  const fearBucket = byMood.find((b) => b.label === "Fear");
  const greedBucket = byMood.find((b) => b.label === "Greed");
  const tilt = tiltMeter(trades);

  const findings: Finding[] = [];
  if (worst && worst.pnl < 0) findings.push({ id: "worst-emo", tone: "bad", title: `Trading while ${worst.emotion} cost you ${money(worst.pnl)}`, body: `${worst.count} trades, ${pct(worst.winRate)} win rate.`, action: `Make "${worst.emotion}" a stop signal: notice it, name it, skip the trade.` });
  if (best && best.pnl > 0) findings.push({ id: "best-emo", tone: "good", title: `Your money state is "${best.emotion}"`, body: `${best.count} trades netted ${money(best.pnl)} at ${pct(best.winRate)} wins.`, action: "Build a 2 minute pre-session routine that gets you there." });
  if (pos.count >= 5 && neg.count >= 5) findings.push({ id: "gap", tone: "info", title: `Calm trades earn ${money(pos.expectancy)}, emotional ones ${money(neg.expectancy)}`, body: `Per trade, across ${pos.count + neg.count} tagged trades. That gap is the price of your emotions.` });
  if (themes.length) findings.push({ id: "themes", tone: "warn", title: `Your losing notes keep saying "${themes.map((t) => t.w).join('", "')}"`, body: `Recurring words in ${lossNotes.length} losing-trade notes. Your journal already knows the leak.`, action: "Turn the top theme into a checklist item that blocks it." });
  if (fearBucket && greedBucket && fearBucket.count >= 5 && greedBucket.count >= 5) findings.push({ id: "market", tone: fearBucket.pnl > greedBucket.pnl ? "info" : "warn", title: `You do best when the market feels ${fearBucket.expectancy > greedBucket.expectancy ? "fearful" : "greedy"}`, body: `Per trade: ${money(fearBucket.expectancy)} in fear vs ${money(greedBucket.expectancy)} in greed (demo mood feed).`, action: `Today's market mood is ${mm.label.toLowerCase()} (${mm.index}). ${mm.index > 70 ? "Expect chasing temptations. Be pickier." : mm.index < 30 ? "Panic creates your best entries. Stick to the plan." : "Normal conditions."}` });
  if (tilt >= 40) findings.push({ id: "tilt", tone: "bad", title: `Tilt meter at ${tilt}/100`, body: "Your last five trades show losses, negative emotions and broken rules stacking up.", action: "Stop for today. Come back tomorrow with half size." });

  return report(
    "sentiment", 60 + mood * 35 - tilt * 0.3,
    worst && worst.pnl < 0 ? `${cap(worst.emotion)} is your most expensive emotion. Recent mood: ${moodWord(mood)}.` : `Your mood is ${moodWord(mood)} and your emotions aren't costing you much.`,
    findings,
    [
      { label: "Your mood", value: moodWord(mood), tone: mood > 0.2 ? "profit" : mood < -0.2 ? "loss" : "gold" },
      { label: "Tilt meter", value: `${tilt}/100`, tone: tilt >= 40 ? "loss" : "profit" },
      { label: "Market mood", value: `${mm.index} · ${mm.label}`, hint: "Demo feed" },
      { label: "Calm-trade edge", value: pos.count && neg.count ? money(pos.expectancy - neg.expectancy) : "—" },
    ],
    [worst ? `Skip trades while ${worst.emotion}` : "Log emotions on every trade", "Do a 2 minute reset before each session", tilt >= 40 ? "Stop trading for today" : "Write one honest sentence after each trade"],
  );
}

export function moodBuckets(trades: TradeComputed[], now = Date.now()) {
  const mm = marketMood(now, 800);
  const map = new Map(mm.history.map((h) => [h.date, h.index]));
  const buckets = ["Extreme fear", "Fear", "Neutral", "Greed", "Extreme greed"].map((label) => ({ label, trades: [] as TradeComputed[] }));
  for (const t of trades) {
    const i = map.get(day(t.openedAt));
    if (i == null) continue;
    buckets.find((b) => b.label === moodLabel(i))!.trades.push(t);
  }
  return buckets.map((b) => { const s = summarize(b.trades); return { label: b.label, count: s.count, pnl: s.netPnl, expectancy: s.expectancy, winRate: s.winRate }; });
}

const moodWord = (m: number) => (m > 0.4 ? "Locked in" : m > 0.1 ? "Steady" : m > -0.1 ? "Mixed" : m > -0.4 ? "Shaky" : "On tilt");
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------------------------------
// Sensei: personal coach (combines everything)

export interface Council {
  reports: Record<CoreAgentId, AgentReport>;
  reviews: Map<string, TradeReview>;
  readiness: number;
  focus: { title: string; why: string; rules: string[]; measure: string; agent: CoreAgentId };
  briefing: string;
}

export function runCouncil(input: CouncilInput): Council {
  const reviews = reviewAll(input.trades, input.setups, input.account);
  const analyst = analystAgent(input, reviews);
  const habit = habitAgent(input);
  const risk = riskAgent(input);
  const sentiment = sentimentAgent(input);
  const specialists = { analyst, habit, risk, sentiment };
  const weakest = (Object.entries(specialists) as [CoreAgentId, AgentReport][]).sort((a, b) => a[1].score - b[1].score)[0];
  const [wid, wr] = weakest;
  const s = summarize(input.trades, input.account);
  const recent = summarize(input.trades.slice(-30), input.account);
  const older = summarize(input.trades.slice(-60, -30), input.account);
  const improving = recent.expectancy > older.expectancy;
  const tilt = tiltMeter(input.trades);
  const mc = mistakeCost(input.trades)[0];

  const focus = {
    title: wr.actions[0] ?? "Keep journaling every trade",
    why: wr.headline,
    rules: [...new Set([wr.actions[0], wr.actions[1], wid !== "risk" ? risk.actions[0] : habit.actions[0]].filter(Boolean))].slice(0, 3) as string[],
    measure: wid === "risk" ? "Every trade this week risks the cap or less." : wid === "habit" ? "Zero repeats of the habit for 5 trading days." : wid === "sentiment" ? "Every trade logged with an emotion, none taken on tilt." : "Average process grade B or better this week.",
    agent: wid,
  };
  const readiness = clamp((analyst.score + habit.score + risk.score + sentiment.score) / 4 - tilt * 0.25);
  const findings: Finding[] = [
    { id: "focus", tone: "info", title: `This week's focus: ${focus.title}`, body: `${PERSONAS[wid].name} (${PERSONAS[wid].title}) has your lowest score at ${wr.score}/100. ${wr.headline}`, action: focus.measure },
    { id: "trend", tone: improving ? "good" : "warn", title: improving ? "You're improving" : "Your edge slipped recently", body: `Last 30 trades: ${money(recent.expectancy)} per trade, ${pct(recent.winRate)} wins, PF ${fmt(recent.profitFactor)}. The 30 before: ${money(older.expectancy)} per trade.` },
  ];
  if (mc && mc.cost < 0) findings.push({ id: "mistake", tone: "bad", title: `"${mc.mistake.replace("-", " ")}" has cost you ${money(mc.cost)} all-time`, body: `${mc.count} times. Fix this one mistake and your P&L moves by that much.`, action: "Add it as a red line in your Spellbook." });
  if (tilt >= 40) findings.unshift({ id: "tilt", tone: "bad", title: "Sit out the rest of today", body: `Tilt meter at ${tilt}/100. Protecting capital is today's win.` });
  findings.push(...[analyst, habit, risk, sentiment].map((r) => ({ id: `from-${r.agentId}`, tone: (r.score >= 70 ? "good" : r.score >= 50 ? "warn" : "bad") as Tone, title: `${PERSONAS[r.agentId as CoreAgentId].icon} ${PERSONAS[r.agentId as CoreAgentId].name}: ${r.grade}`, body: r.headline })));

  const coach = report(
    "coach", readiness,
    tilt >= 40 ? "Today is a defense day. Close the charts and review." : `Readiness ${readiness}/100. Focus this week: ${focus.title.replace(/\.$/, "").toLowerCase()}.`,
    findings,
    [
      { label: "Readiness", value: `${readiness}/100`, tone: readiness >= 70 ? "profit" : readiness >= 50 ? "gold" : "loss" },
      { label: "Net P&L", value: money(s.netPnl), tone: s.netPnl >= 0 ? "profit" : "loss" },
      { label: "Edge trend", value: improving ? "Improving" : "Slipping", tone: improving ? "profit" : "loss" },
      { label: "Weakest area", value: PERSONAS[wid].title },
    ],
    focus.rules,
  );
  const briefing = tilt >= 40
    ? `Tilt meter is at ${tilt}. Today the best trade is no trade: review your last five and reset.`
    : `${improving ? "You're trending up" : "Your edge dipped"} over the last 30 trades (${money(recent.expectancy)} per trade). This week, ${PERSONAS[wid].name} wants one thing from you: ${focus.title.charAt(0).toLowerCase()}${focus.title.slice(1)}`;
  return { reports: { coach, analyst, habit, risk, sentiment }, reviews, readiness, focus, briefing };
}
