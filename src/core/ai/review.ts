// Trade Analyst: reads one closed trade in the context of the trader's own history and says what went
// right, what went wrong, and what to do next time. Pure TS, deterministic, runs offline. The Claude
// provider (src/lib/ai-client.ts) sends the same facts to the model for a written debrief.
import { POSITIVE_EMOTIONS, type Setup, type TradeComputed } from "../types";
import { summarize } from "../stats";

const EMO_PHRASE: Record<string, string> = { fomo: "with FOMO", fearful: "while fearful", greedy: "while greedy", revenge: "in revenge mode", bored: "out of boredom", tired: "while tired" };

export type Grade = "S" | "A" | "B" | "C" | "D" | "F";
export type Pillar = "Plan" | "Entry" | "Risk" | "Exit" | "Mindset";

export interface TradeReview {
  tradeId: string;
  /** Process score 0..100. Judges the decisions, not the P&L. */
  score: number;
  grade: Grade;
  /** "Good loss" and "lucky win" are the two outcomes traders misread most. */
  verdict: "Textbook win" | "Good loss" | "Lucky win" | "Earned loss" | "Solid trade" | "Messy trade";
  pillars: { pillar: Pillar; score: number; note: string }[];
  right: string[];
  wrong: string[];
  tips: string[];
  /** Facts the review was built from. Sent to Claude as grounding. */
  facts: Record<string, string | number | boolean | null>;
}

export interface ReviewContext {
  history: TradeComputed[]; // all of the trader's trades, sorted by close time
  setup?: Setup;
  account: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const pct = (v: number) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
const money = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export function gradeOf(score: number): Grade {
  return score >= 92 ? "S" : score >= 80 ? "A" : score >= 68 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
}

export const GRADE_COLOR: Record<Grade, string> = { S: "#fbbf24", A: "#2fe39a", B: "#c8f53b", C: "#38d9f5", D: "#fb923c", F: "#ff5470" };

export function reviewTrade(t: TradeComputed, ctx: ReviewContext): TradeReview {
  const right: string[] = [];
  const wrong: string[] = [];
  const tips: string[] = [];
  const idx = ctx.history.findIndex((x) => x.id === t.id);
  const before = idx >= 0 ? ctx.history.slice(0, idx) : ctx.history.filter((x) => Date.parse(x.closedAt) < Date.parse(t.closedAt));
  const equity = ctx.account + before.reduce((a, x) => a + x.pnl, 0);
  const riskPct = t.risk != null && equity > 0 ? t.risk / equity : undefined;
  const has = (m: TradeComputed["mistakes"][number]) => t.mistakes.includes(m);

  // ---- Plan: was this a playbook trade?
  let plan = 55;
  if (ctx.setup) {
    plan += 15;
    right.push(`Tagged to a playbook setup (${ctx.setup.icon} ${ctx.setup.name}), so it feeds your edge stats.`);
    const setupHist = summarize(before.filter((x) => x.setupId === t.setupId));
    if (setupHist.count >= 8) {
      if (setupHist.profitFactor >= 1.3) {
        plan += 10;
        right.push(`${ctx.setup.name} is a proven weapon for you: PF ${fmt(setupHist.profitFactor)} over ${setupHist.count} prior trades.`);
      } else if (setupHist.profitFactor < 1) {
        plan -= 10;
        wrong.push(`${ctx.setup.name} has a negative edge in your history (PF ${fmt(setupHist.profitFactor)} over ${setupHist.count} trades).`);
        tips.push(`Paper trade ${ctx.setup.name} or tighten its rules before risking real size on it again.`);
      }
    }
  } else {
    plan -= 20;
    wrong.push("No setup tagged. Untagged trades can't tell you which playbook is working.");
    tips.push("Tag every trade with a weapon from your Arsenal, even if it's \"discretionary\".");
  }
  if (t.rulesFollowed === true) { plan += 20; right.push("You followed your plan."); }
  if (t.rulesFollowed === false || has("broke-rules")) { plan -= 25; wrong.push("You broke your own rules on this trade."); }

  // ---- Entry
  let entry = 70;
  if (has("chased")) { entry -= 30; wrong.push("Chased the move instead of waiting for your level."); tips.push("If you miss the entry, set an alert at the next pullback level and walk away."); }
  if (has("late-entry")) { entry -= 20; wrong.push("Late entry made the stop wider and the R:R worse."); tips.push("Write the trigger in advance and place a limit order at it."); }
  if (t.rating != null) entry += (t.rating - 3) * 8;
  const hourRow = hourStats(before, new Date(t.openedAt).getUTCHours());
  if (hourRow && hourRow.count >= 8) {
    if (hourRow.pnl > 0 && hourRow.winRate >= 0.5) { entry += 6; right.push(`Opened in one of your stronger hours (${pct(hourRow.winRate)} win rate at ${hh(t.openedAt)} UTC).`); }
    else if (hourRow.pnl < 0) { entry -= 6; wrong.push(`${hh(t.openedAt)} UTC is a losing hour for you (${money(hourRow.pnl)} over ${hourRow.count} trades).`); tips.push(`Consider a no-trade window around ${hh(t.openedAt)} UTC, or half size there.`); }
  }

  // ---- Risk
  let risk = 70;
  if (t.stopLoss == null || has("no-stop")) { risk = 15; wrong.push("No stop loss. One bad print can erase a week of wins."); tips.push("Never enter without a hard stop. Size from the stop, not from conviction."); }
  else if (riskPct != null) {
    if (riskPct <= 0.0105) { risk = 95; right.push(`Risk was controlled at ${pct(riskPct)} of the account.`); }
    else if (riskPct <= 0.02) { risk = 72; tips.push(`Risk was ${pct(riskPct)} of the account. Most funded traders cap it at 1%.`); }
    else { risk = 30; wrong.push(`Risked ${pct(riskPct)} of the account on one idea. That's oversized.`); tips.push("Use the position size calculator: account × 1% ÷ stop distance."); }
  }
  if (has("oversized")) { risk -= 20; if (!wrong.some((w) => w.includes("oversized"))) wrong.push("Position was oversized for the setup."); }
  if (has("moved-stop")) { risk -= 30; wrong.push("Moved the stop. The plan said exit, you hoped instead."); tips.push("Once placed, a stop only moves toward profit. Make it a hard rule in your Spellbook."); }
  if (t.leverage && t.leverage >= 25) { risk -= 10; wrong.push(`${t.leverage}x leverage leaves almost no room for noise before liquidation.`); }
  if (t.r != null && t.r < -1.15 && !has("moved-stop")) { risk -= 10; wrong.push(`The loss ran to ${t.r.toFixed(2)}R, past your planned stop (slippage or a late exit).`); }

  // ---- Exit
  let exit = 65;
  if (t.r != null) {
    if (t.r >= 2) { exit = 95; right.push(`Let the winner run to ${t.r.toFixed(2)}R.`); }
    else if (t.r >= 1) { exit = 80; right.push(`Banked ${t.r.toFixed(2)}R.`); }
    else if (t.r > 0) { exit = 55; tips.push(`Winner closed at only ${t.r.toFixed(2)}R. Let runners reach at least 1.5R before managing.`); }
    else if (t.r >= -1.05) { exit = 80; right.push("Took the loss at the stop. That is a professional loss."); }
    else exit = 35;
  }
  if (has("early-exit")) { exit -= 25; wrong.push("Exited early out of fear, leaving R on the table."); tips.push("Use a partial at 1R and a trailing stop on the rest instead of closing everything."); }
  if (t.takeProfit != null) {
    const hit = t.side === "long" ? t.exit >= t.takeProfit : t.exit <= t.takeProfit;
    if (hit) { exit += 5; right.push("Hit your planned target."); }
  }
  const winners = before.filter((x) => x.win);
  const avgWinHold = winners.length ? winners.reduce((a, x) => a + x.holdMinutes, 0) / winners.length : 0;
  if (!t.win && avgWinHold > 0 && t.holdMinutes > avgWinHold * 3) { exit -= 8; wrong.push(`Held this loser ${(t.holdMinutes / avgWinHold).toFixed(1)}× longer than your average winner.`); tips.push("Add a time stop: if it hasn't worked in your usual window, cut it."); }

  // ---- Mindset
  let mind = 70;
  if (t.emotion) {
    if (POSITIVE_EMOTIONS.includes(t.emotion)) { mind = 92; right.push(`Traded from a ${t.emotion} state.`); }
    else { mind = 35; wrong.push(`Entered ${EMO_PHRASE[t.emotion] ?? `feeling ${t.emotion}`}. That state usually costs you money.`); tips.push(t.emotion === "revenge" ? "After a loss, take a 15 minute break before the next entry." : t.emotion === "tired" ? "Set a hard stop time for your session. Tired trades are optional trades." : `When you notice "${t.emotion}", cut size in half or skip the trade.`); }
  } else {
    tips.push("Log your emotion on entry. The Sentiment agent needs it to find your tilt triggers.");
  }
  const prev = before[before.length - 1];
  if (prev && !prev.win && Date.parse(t.openedAt) - Date.parse(prev.closedAt) < 20 * 60000 && Date.parse(t.openedAt) >= Date.parse(prev.closedAt)) {
    mind -= 20;
    wrong.push("Opened within 20 minutes of a loss. Classic revenge window.");
    if (prev.qty * prev.entry < t.qty * t.entry * 0.8) wrong.push("And sized up after the loss.");
  }
  const sameDay = before.filter((x) => x.openedAt.slice(0, 10) === t.openedAt.slice(0, 10)).length;
  if (sameDay >= 5 || has("overtraded")) { mind -= 15; wrong.push(`Trade #${sameDay + 1} of the day. Quality drops fast after your first few.`); tips.push("Set a daily max of 3 to 4 trades. Stop after 2 losses in a row."); }
  if (t.notes && t.notes.length > 20) { mind += 5; right.push("Wrote a real note. Future you will thank you."); }

  const pillars: TradeReview["pillars"] = [
    { pillar: "Plan", score: clamp(plan), note: ctx.setup ? ctx.setup.name : "No setup" },
    { pillar: "Entry", score: clamp(entry), note: t.rating != null ? `Self-rated ${t.rating}/5` : "Not rated" },
    { pillar: "Risk", score: clamp(risk), note: riskPct != null ? `${pct(riskPct)} of account` : "No stop" },
    { pillar: "Exit", score: clamp(exit), note: t.r != null ? `${t.r >= 0 ? "+" : ""}${t.r.toFixed(2)}R` : "No R" },
    { pillar: "Mindset", score: clamp(mind), note: t.emotion ?? "Not logged" },
  ];
  const weights = [0.22, 0.18, 0.26, 0.18, 0.16];
  const score = Math.round(pillars.reduce((a, p, i) => a + p.score * weights[i], 0));
  const grade = gradeOf(score);
  const good = score >= 68;
  const verdict: TradeReview["verdict"] = t.win
    ? good ? (score >= 85 ? "Textbook win" : "Solid trade") : "Lucky win"
    : good ? "Good loss" : score >= 50 ? "Messy trade" : "Earned loss";

  if (verdict === "Good loss") right.unshift("Process was right. This loss is the cost of doing business, not a mistake.");
  if (verdict === "Lucky win") wrong.unshift("You made money, but the process was weak. Don't let the market reward a bad habit.");
  if (!tips.length) tips.push("Repeat exactly this. Screenshot it into your playbook as an A+ example.");

  return {
    tradeId: t.id,
    score,
    grade,
    verdict,
    pillars,
    right: dedupe(right).slice(0, 6),
    wrong: dedupe(wrong).slice(0, 6),
    tips: dedupe(tips).slice(0, 4),
    facts: {
      symbol: t.symbol, side: t.side, market: t.market ?? t.assetClass, leverage: t.leverage ?? null,
      pnl: Math.round(t.pnl * 100) / 100, r: t.r != null ? +t.r.toFixed(2) : null,
      riskPctOfAccount: riskPct != null ? +(riskPct * 100).toFixed(2) : null,
      holdMinutes: Math.round(t.holdMinutes), setup: ctx.setup?.name ?? null,
      setupRules: ctx.setup?.rules.join(" | ") ?? null, rulesFollowed: t.rulesFollowed ?? null,
      emotion: t.emotion ?? null, mistakes: t.mistakes.join(", ") || null, selfRating: t.rating ?? null,
      notes: t.notes ?? null, tradesEarlierThatDay: sameDay,
    },
  };
}

function hourStats(trades: TradeComputed[], hour: number) {
  const xs = trades.filter((x) => new Date(x.openedAt).getUTCHours() === hour);
  if (!xs.length) return null;
  return { count: xs.length, pnl: xs.reduce((a, x) => a + x.pnl, 0), winRate: xs.filter((x) => x.win).length / xs.length };
}
const hh = (iso: string) => `${String(new Date(iso).getUTCHours()).padStart(2, "0")}:00`;
const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "∞");
const dedupe = (xs: string[]) => [...new Set(xs)];

/** Reviews many trades at once (used for grade columns and averages). */
export function reviewAll(trades: TradeComputed[], setups: Setup[], account: number) {
  const map = new Map<string, TradeReview>();
  for (const t of trades) map.set(t.id, reviewTrade(t, { history: trades, setup: setups.find((s) => s.id === t.setupId), account }));
  return map;
}

/**
 * Run-up and drawdown while the trade was open (MFE / MAE), in price, money and R, from the candles
 * between entry and exit. Shows how much the trade offered and how much heat it took.
 */
export function excursions(t: TradeComputed, candles: { high: number; low: number }[], entryIndex: number, exitIndex: number) {
  const inTrade = candles.slice(entryIndex, exitIndex + 1);
  if (!inTrade.length) return null;
  const hi = Math.max(...inTrade.map((c) => c.high));
  const lo = Math.min(...inTrade.map((c) => c.low));
  const dir = t.side === "long" ? 1 : -1;
  const mfePx = Math.max(0, dir === 1 ? hi - t.entry : t.entry - lo);
  const maePx = Math.max(0, dir === 1 ? t.entry - lo : hi - t.entry);
  const riskPx = t.stopLoss != null ? Math.abs(t.entry - t.stopLoss) : undefined;
  const capturedPx = (t.exit - t.entry) * dir;
  return {
    mfe: mfePx * t.qty,
    mae: maePx * t.qty,
    mfeR: riskPx ? mfePx / riskPx : undefined,
    maeR: riskPx ? maePx / riskPx : undefined,
    /** Share of the best available move that the exit captured. */
    captured: mfePx > 0 ? Math.max(-1, Math.min(1, capturedPx / mfePx)) : 0,
  };
}
