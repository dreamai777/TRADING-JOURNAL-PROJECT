import { POSITIVE_EMOTIONS, type Trade, type TradeComputed } from "./types";

export function computeTrade(t: Trade): TradeComputed {
  const dir = t.side === "long" ? 1 : -1;
  const pnl = (t.exit - t.entry) * t.qty * dir - t.fees - (t.funding ?? 0);
  const risk = t.stopLoss != null ? Math.abs(t.entry - t.stopLoss) * t.qty + t.fees : undefined;
  const r = risk && risk > 0 ? pnl / risk : undefined;
  const holdMinutes = Math.max(0, (Date.parse(t.closedAt) - Date.parse(t.openedAt)) / 60000);
  return { ...t, pnl, risk, r, holdMinutes, win: pnl > 0 };
}

export function computeAll(trades: Trade[]): TradeComputed[] {
  return trades.map(computeTrade).sort((a, b) => Date.parse(a.closedAt) - Date.parse(b.closedAt));
}

export interface Summary {
  count: number;
  wins: number;
  losses: number;
  winRate: number; // 0..1
  netPnl: number;
  grossProfit: number;
  grossLoss: number; // positive number
  profitFactor: number; // Infinity when no losses
  avgWin: number;
  avgLoss: number; // positive
  payoff: number; // avgWin / avgLoss
  expectancy: number; // per trade, money
  avgR: number;
  totalR: number;
  maxDrawdown: number; // positive money
  maxDrawdownPct: number; // vs peak equity (account + pnl)
  bestTrade: number;
  worstTrade: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: number; // + wins, - losses
  avgHoldMinutes: number;
  disciplineRate: number; // share of trades where rules were followed
  fees: number;
}

export function summarize(trades: TradeComputed[], accountSize = 10000): Summary {
  const count = trades.length;
  const winsArr = trades.filter((t) => t.pnl > 0);
  const lossArr = trades.filter((t) => t.pnl <= 0);
  const grossProfit = sum(winsArr.map((t) => t.pnl));
  const grossLoss = Math.abs(sum(lossArr.map((t) => t.pnl)));
  const netPnl = grossProfit - grossLoss;
  const avgWin = winsArr.length ? grossProfit / winsArr.length : 0;
  const avgLoss = lossArr.length ? grossLoss / lossArr.length : 0;
  const rs = trades.filter((t) => t.r != null).map((t) => t.r as number);

  let peak = accountSize;
  let equity = accountSize;
  let maxDd = 0;
  let maxDdPct = 0;
  let streak = 0;
  let bestW = 0;
  let bestL = 0;
  for (const t of trades) {
    equity += t.pnl;
    peak = Math.max(peak, equity);
    const dd = peak - equity;
    if (dd > maxDd) {
      maxDd = dd;
      maxDdPct = peak > 0 ? dd / peak : 0;
    }
    if (t.pnl > 0) streak = streak > 0 ? streak + 1 : 1;
    else streak = streak < 0 ? streak - 1 : -1;
    bestW = Math.max(bestW, streak);
    bestL = Math.max(bestL, -streak);
  }
  const ruled = trades.filter((t) => t.rulesFollowed != null);
  return {
    count,
    wins: winsArr.length,
    losses: lossArr.length,
    winRate: count ? winsArr.length / count : 0,
    netPnl,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss,
    avgWin,
    avgLoss,
    payoff: avgLoss === 0 ? (avgWin > 0 ? Infinity : 0) : avgWin / avgLoss,
    expectancy: count ? netPnl / count : 0,
    avgR: rs.length ? sum(rs) / rs.length : 0,
    totalR: sum(rs),
    maxDrawdown: maxDd,
    maxDrawdownPct: maxDdPct,
    bestTrade: count ? Math.max(...trades.map((t) => t.pnl)) : 0,
    worstTrade: count ? Math.min(...trades.map((t) => t.pnl)) : 0,
    longestWinStreak: bestW,
    longestLossStreak: bestL,
    currentStreak: streak,
    avgHoldMinutes: count ? sum(trades.map((t) => t.holdMinutes)) / count : 0,
    disciplineRate: ruled.length ? ruled.filter((t) => t.rulesFollowed).length / ruled.length : 0,
    fees: sum(trades.map((t) => t.fees)),
  };
}

export function equityCurve(trades: TradeComputed[], accountSize = 10000) {
  let eq = accountSize;
  let peak = accountSize;
  return trades.map((t, i) => {
    eq += t.pnl;
    peak = Math.max(peak, eq);
    return { i: i + 1, date: t.closedAt.slice(0, 10), equity: eq, drawdown: eq - peak, pnl: t.pnl };
  });
}

export function dailyPnl(trades: TradeComputed[]) {
  const map = new Map<string, { date: string; pnl: number; count: number }>();
  for (const t of trades) {
    const d = t.closedAt.slice(0, 10);
    const row = map.get(d) ?? { date: d, pnl: 0, count: 0 };
    row.pnl += t.pnl;
    row.count += 1;
    map.set(d, row);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function groupBy<K extends string>(trades: TradeComputed[], key: (t: TradeComputed) => K | undefined) {
  const map = new Map<K, TradeComputed[]>();
  for (const t of trades) {
    const k = key(t);
    if (k == null) continue;
    map.set(k, [...(map.get(k) ?? []), t]);
  }
  return [...map.entries()].map(([k, ts]) => ({ key: k, trades: ts, summary: summarize(ts) }));
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function byWeekday(trades: TradeComputed[]) {
  const rows = DOW.map((d) => ({ day: d, pnl: 0, count: 0, wins: 0 }));
  for (const t of trades) {
    const r = rows[new Date(t.openedAt).getUTCDay()];
    r.pnl += t.pnl;
    r.count++;
    if (t.win) r.wins++;
  }
  return rows.slice(1, 6).concat(rows[6], rows[0]).filter((r) => r.count > 0 || ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(r.day));
}

export function byHour(trades: TradeComputed[]) {
  const rows = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, "0")}:00`, pnl: 0, count: 0 }));
  for (const t of trades) {
    const r = rows[new Date(t.openedAt).getUTCHours()];
    r.pnl += t.pnl;
    r.count++;
  }
  return rows.filter((r) => r.count > 0);
}

export function rDistribution(trades: TradeComputed[]) {
  const buckets = ["<-2R", "-2R", "-1R", "0R", "+1R", "+2R", "+3R", ">3R"];
  const rows = buckets.map((b) => ({ bucket: b, count: 0 }));
  for (const t of trades) {
    if (t.r == null) continue;
    const r = t.r;
    const idx = r < -2.5 ? 0 : r < -1.5 ? 1 : r < -0.5 ? 2 : r < 0.5 ? 3 : r < 1.5 ? 4 : r < 2.5 ? 5 : r < 3.5 ? 6 : 7;
    rows[idx].count++;
  }
  return rows;
}

/** Composite 0..100 score across six axes. Original scoring model ("Forge Score"). */
export function forgeScore(s: Summary) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const axes = {
    "Win rate": clamp(((s.winRate - 0.3) / 0.35) * 100),
    "Profit factor": clamp(((Math.min(s.profitFactor, 4) - 0.8) / 2.2) * 100),
    "Payoff": clamp(((Math.min(s.payoff, 4) - 0.5) / 2.5) * 100),
    "Risk control": clamp(100 - s.maxDrawdownPct * 400),
    "Discipline": clamp(s.disciplineRate * 100),
    "Consistency": clamp(100 - s.longestLossStreak * 12),
  };
  const values = Object.values(axes);
  const score = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return { score, axes: Object.entries(axes).map(([axis, value]) => ({ axis, value: Math.round(value) })) };
}

export function emotionImpact(trades: TradeComputed[]) {
  return groupBy(trades, (t) => t.emotion)
    .map((g) => ({ emotion: g.key, pnl: g.summary.netPnl, winRate: g.summary.winRate, count: g.summary.count, positive: POSITIVE_EMOTIONS.includes(g.key) }))
    .sort((a, b) => b.pnl - a.pnl);
}

export function mistakeCost(trades: TradeComputed[]) {
  const map = new Map<string, { mistake: string; cost: number; count: number }>();
  for (const t of trades) {
    for (const m of t.mistakes) {
      const row = map.get(m) ?? { mistake: m, cost: 0, count: 0 };
      row.cost += t.pnl;
      row.count++;
      map.set(m, row);
    }
  }
  return [...map.values()].sort((a, b) => a.cost - b.cost);
}

/** Recent-trade tilt indicator 0..100 based on last 5 trades: losses, negative emotions, broken rules. */
export function tiltMeter(trades: TradeComputed[]) {
  const last = trades.slice(-5);
  if (!last.length) return 0;
  let score = 0;
  for (const t of last) {
    if (!t.win) score += 8;
    if (t.emotion && !POSITIVE_EMOTIONS.includes(t.emotion)) score += 7;
    if (t.rulesFollowed === false) score += 5;
  }
  return Math.min(100, score);
}

export function positionSize(opts: { account: number; riskPct: number; entry: number; stop: number }) {
  const riskAmount = opts.account * (opts.riskPct / 100);
  const perUnit = Math.abs(opts.entry - opts.stop);
  const qty = perUnit > 0 ? riskAmount / perUnit : 0;
  return { riskAmount, qty, notional: qty * opts.entry };
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}

export type RangeKey = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "2Y" | "ALL";
export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "1D", label: "24h", days: 1 },
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 91 },
  { key: "6M", label: "6M", days: 182 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "2Y", label: "2Y", days: 730 },
  { key: "ALL", label: "All", days: null },
];

/** Trades closed inside the range, plus the account equity at the start of the range (for % returns). */
export function sliceRange(trades: TradeComputed[], range: RangeKey, account: number, now: number) {
  const days = RANGES.find((r) => r.key === range)?.days ?? null;
  if (days == null) return { trades, startEquity: account };
  const cutoff = now - days * 86400000;
  let startEquity = account;
  const inRange: TradeComputed[] = [];
  for (const t of trades) {
    if (Date.parse(t.closedAt) < cutoff) startEquity += t.pnl;
    else inRange.push(t);
  }
  return { trades: inRange, startEquity };
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD in the viewer's local time zone
  pnl: number;
  pct: number; // pnl / equity at start of the day
  count: number;
  wins: number;
  losses: number;
}

/** Per-day results with % return measured against the equity at the start of each day. */
export function calendarDays(trades: TradeComputed[], account: number): Map<string, CalendarDay> {
  const map = new Map<string, CalendarDay>();
  let equity = account;
  for (const t of trades) {
    const d = localDay(t.closedAt);
    let row = map.get(d);
    if (!row) {
      row = { date: d, pnl: 0, pct: 0, count: 0, wins: 0, losses: 0 };
      (row as CalendarDay & { start: number }).start = equity;
      map.set(d, row);
    }
    row.pnl += t.pnl;
    row.count++;
    if (t.pnl > 0) row.wins++;
    else row.losses++;
    equity += t.pnl;
    const start = (row as CalendarDay & { start: number }).start;
    row.pct = start > 0 ? row.pnl / start : 0;
  }
  return map;
}

export function localDay(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
