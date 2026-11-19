// Strategy Builder engine: a small rule language (indicator blocks + conditions), a bar-by-bar
// simulator that runs any rule set, and a robustness audit that grades a strategy S++ … F.
// Pure TS, shared with the future Expo app and with the server route that asks Claude for drafts.
import { mulberry32 } from "./random";
import type { Candle } from "./market";
import type { AssetClass, WeaponClass } from "./types";

export type Indicator = "price" | "sma" | "ema" | "rsi" | "atr" | "highest" | "lowest" | "bbUpper" | "bbLower" | "value";
export type Op = "crossAbove" | "crossBelow" | "above" | "below";

export interface Operand {
  ind: Indicator;
  /** Lookback for indicators. */
  len?: number;
  /** Constant when ind is "value". */
  value?: number;
}

export interface Condition {
  left: Operand;
  op: Op;
  right: Operand;
}

export interface StrategySpec {
  id: string;
  name: string;
  icon: string;
  weaponClass: WeaponClass;
  description: string;
  side: "long" | "short";
  timeframe: string;
  markets: AssetClass[];
  /** All must be true to enter. */
  entry: Condition[];
  /** Any one true exits. */
  exit: Condition[];
  stop: { type: "atr" | "pct"; value: number };
  /** Take profit at this many R. 0 = no fixed target. */
  targetR: number;
  /** Close after this many bars. 0 = no time stop. */
  maxBars: number;
  riskPct: number;
}

export const INDICATORS: { id: Indicator; label: string; hasLen: boolean; defaultLen?: number }[] = [
  { id: "price", label: "Price", hasLen: false },
  { id: "sma", label: "SMA", hasLen: true, defaultLen: 50 },
  { id: "ema", label: "EMA", hasLen: true, defaultLen: 21 },
  { id: "rsi", label: "RSI", hasLen: true, defaultLen: 14 },
  { id: "atr", label: "ATR", hasLen: true, defaultLen: 14 },
  { id: "highest", label: "Highest close", hasLen: true, defaultLen: 20 },
  { id: "lowest", label: "Lowest close", hasLen: true, defaultLen: 20 },
  { id: "bbUpper", label: "Bollinger upper", hasLen: true, defaultLen: 20 },
  { id: "bbLower", label: "Bollinger lower", hasLen: true, defaultLen: 20 },
  { id: "value", label: "Number", hasLen: false },
];

export const OPS: { id: Op; label: string }[] = [
  { id: "crossAbove", label: "crosses above" },
  { id: "crossBelow", label: "crosses below" },
  { id: "above", label: "is above" },
  { id: "below", label: "is below" },
];

export const ALL_MARKETS: AssetClass[] = ["crypto", "forex", "futures", "equities", "options"];

export function operandLabel(o: Operand) {
  if (o.ind === "value") return String(o.value ?? 0);
  if (o.ind === "price") return "Price";
  const name = INDICATORS.find((i) => i.id === o.ind)?.label ?? o.ind;
  return `${name}(${o.len ?? 14})`;
}

export function conditionLabel(c: Condition) {
  return `${operandLabel(c.left)} ${OPS.find((o) => o.id === c.op)?.label} ${operandLabel(c.right)}`;
}

/** Plain-English summary of the rules, shown under the builder and on shop listings. */
export function explainSpec(s: StrategySpec) {
  const dir = s.side === "long" ? "Buy" : "Sell short";
  const entry = s.entry.map(conditionLabel).join(" and ");
  const exit = s.exit.length ? `Exit when ${s.exit.map(conditionLabel).join(" or ")}` : "No signal exit";
  const stop = s.stop.type === "atr" ? `${s.stop.value}× ATR(14)` : `${s.stop.value}%`;
  const parts = [`${dir} when ${entry || "(no entry rules yet)"}.`, `${exit}.`, `Stop ${stop} away`];
  if (s.targetR > 0) parts[2] += `, take profit at ${s.targetR}R`;
  if (s.maxBars > 0) parts[2] += `, close after ${s.maxBars} bars`;
  parts[2] += `. Risk ${s.riskPct}% per trade.`;
  return parts.join(" ");
}

/** Clamps anything (a user edit, an AI draft) into a spec the engine can run safely. */
export function sanitizeSpec(raw: Partial<StrategySpec> & { entry?: Condition[]; exit?: Condition[] }, fallbackId = "strat"): StrategySpec {
  const clampLen = (n: unknown, d: number) => Math.round(Math.min(200, Math.max(2, Number.isFinite(Number(n)) ? Number(n) : d)));
  const ind = (x: unknown): Indicator => (INDICATORS.some((i) => i.id === x) ? (x as Indicator) : "price");
  const operand = (o: Partial<Operand> | undefined): Operand => {
    const i = ind(o?.ind);
    if (i === "value") return { ind: i, value: Number.isFinite(Number(o?.value)) ? Number(o?.value) : 50 };
    if (i === "price") return { ind: i };
    return { ind: i, len: clampLen(o?.len, INDICATORS.find((x) => x.id === i)?.defaultLen ?? 14) };
  };
  const cond = (c: Partial<Condition>): Condition => ({ left: operand(c.left), op: OPS.some((o) => o.id === c.op) ? (c.op as Op) : "above", right: operand(c.right) });
  const classes: WeaponClass[] = ["Breakout", "Reversal", "Trend", "Scalp", "Range", "News"];
  const markets = (raw.markets ?? []).filter((m) => ALL_MARKETS.includes(m));
  return {
    id: raw.id || fallbackId,
    name: (raw.name || "Untitled strategy").slice(0, 60),
    icon: raw.icon || "🧪",
    weaponClass: classes.includes(raw.weaponClass as WeaponClass) ? (raw.weaponClass as WeaponClass) : "Trend",
    description: (raw.description ?? "").slice(0, 400),
    side: raw.side === "short" ? "short" : "long",
    timeframe: raw.timeframe || "1D",
    markets: markets.length ? markets : ["crypto"],
    entry: (raw.entry ?? []).slice(0, 5).map(cond),
    exit: (raw.exit ?? []).slice(0, 5).map(cond),
    stop: { type: raw.stop?.type === "pct" ? "pct" : "atr", value: Math.min(20, Math.max(0.2, Number(raw.stop?.value) || 2)) },
    targetR: Math.min(20, Math.max(0, Number(raw.targetR) || 0)),
    maxBars: Math.round(Math.min(500, Math.max(0, Number(raw.maxBars) || 0))),
    riskPct: Math.min(5, Math.max(0.1, Number(raw.riskPct) || 1)),
  };
}

// ---------- Simulation ----------

export interface SimTrade { entryTime: number; exitTime: number; entry: number; exit: number; r: number; pnl: number; bars: number }
export interface SimResult {
  asset: AssetClass;
  equity: { time: number; equity: number }[];
  trades: SimTrade[];
  netPct: number;
  winRate: number;
  profitFactor: number;
  maxDdPct: number;
  avgR: number;
  expectancyR: number;
  exposurePct: number;
}

const START = 10000;

function seriesFor(o: Operand, candles: Candle[], cache: Map<string, number[]>): number[] {
  const key = `${o.ind}:${o.len ?? ""}:${o.value ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const closes = candles.map((c) => c.close);
  const n = o.len ?? 14;
  let out: number[];
  switch (o.ind) {
    case "price": out = closes; break;
    case "value": out = closes.map(() => o.value ?? 0); break;
    case "sma": out = sma(closes, n); break;
    case "ema": out = ema(closes, n); break;
    case "rsi": out = rsi(closes, n); break;
    case "atr": out = atr(candles, n); break;
    // Prior N bars, excluding the current one, so "price crosses above highest(20)" is a real breakout.
    case "highest": out = closes.map((_, i) => (i < n ? NaN : Math.max(...closes.slice(i - n, i)))); break;
    case "lowest": out = closes.map((_, i) => (i < n ? NaN : Math.min(...closes.slice(i - n, i)))); break;
    case "bbUpper":
    case "bbLower": {
      const m = sma(closes, n);
      const sd = stdev(closes, n);
      out = m.map((v, i) => v + (o.ind === "bbUpper" ? 2 : -2) * sd[i]);
      break;
    }
  }
  cache.set(key, out);
  return out;
}

function holds(c: Condition, i: number, candles: Candle[], cache: Map<string, number[]>) {
  const L = seriesFor(c.left, candles, cache);
  const R = seriesFor(c.right, candles, cache);
  const l = L[i], r = R[i], lp = L[i - 1], rp = R[i - 1];
  if ([l, r].some((v) => !Number.isFinite(v))) return false;
  switch (c.op) {
    case "above": return l > r;
    case "below": return l < r;
    case "crossAbove": return Number.isFinite(lp) && Number.isFinite(rp) && l > r && lp <= rp;
    case "crossBelow": return Number.isFinite(lp) && Number.isFinite(rp) && l < r && lp >= rp;
  }
}

/** Next-bar-open fills, fixed-fractional risk, 5 bps fees + 3 bps slippage per side. Long or short. */
export function simulate(candles: Candle[], spec: StrategySpec, asset: AssetClass, opts = { feeBps: 5, slipBps: 3 }): SimResult {
  const cache = new Map<string, number[]>();
  const atr14 = atr(candles, 14);
  const dir = spec.side === "long" ? 1 : -1;
  const cost = (opts.feeBps + opts.slipBps) / 10000;
  let equity = START;
  const curve: SimResult["equity"] = [];
  const trades: SimTrade[] = [];
  let pos: null | { entry: number; stop: number; target: number; qty: number; time: number; risk: number; bars: number } = null;
  let barsIn = 0;
  const warmup = Math.min(210, Math.floor(candles.length / 4));
  const canEnter = spec.entry.length > 0;

  for (let i = warmup; i < candles.length - 1; i++) {
    const next = candles[i + 1];
    if (pos) {
      barsIn++;
      pos.bars++;
      const stopHit = dir === 1 ? next.low <= pos.stop : next.high >= pos.stop;
      const targetHit = pos.target > 0 && (dir === 1 ? next.high >= pos.target : next.low <= pos.target);
      const signalExit = spec.exit.some((c) => holds(c, i, candles, cache));
      const timeExit = spec.maxBars > 0 && pos.bars >= spec.maxBars;
      if (stopHit || targetHit || signalExit || timeExit) {
        // Worst case first: if stop and target both fall in one bar, assume the stop.
        let px = next.open;
        if (stopHit) px = dir === 1 ? Math.min(pos.stop, next.open) : Math.max(pos.stop, next.open);
        else if (targetHit) px = pos.target;
        px *= 1 - dir * cost;
        const pnl = (px - pos.entry) * pos.qty * dir;
        equity += pnl;
        trades.push({ entryTime: pos.time, exitTime: next.time, entry: pos.entry, exit: px, pnl, r: pnl / pos.risk, bars: pos.bars });
        pos = null;
      }
    } else if (canEnter && spec.entry.every((c) => holds(c, i, candles, cache))) {
      const entry = next.open * (1 + dir * cost);
      const dist = spec.stop.type === "atr" ? atr14[i] * spec.stop.value : entry * (spec.stop.value / 100);
      const d = Math.max(dist, entry * 0.001);
      const risk = equity * (spec.riskPct / 100);
      pos = { entry, stop: entry - dir * d, target: spec.targetR > 0 ? entry + dir * d * spec.targetR : 0, qty: risk / d, time: next.time, risk, bars: 0 };
    }
    const mtm = pos ? equity + (next.close - pos.entry) * pos.qty * dir : equity;
    curve.push({ time: next.time, equity: mtm });
  }
  return summarizeSim(asset, curve, trades, barsIn);
}

function summarizeSim(asset: AssetClass, curve: SimResult["equity"], trades: SimTrade[], barsIn: number): SimResult {
  const wins = trades.filter((t) => t.pnl > 0);
  const gp = wins.reduce((a, t) => a + t.pnl, 0);
  const gl = Math.abs(trades.filter((t) => t.pnl <= 0).reduce((a, t) => a + t.pnl, 0));
  const final = curve.length ? curve[curve.length - 1].equity : START;
  const avgR = trades.length ? trades.reduce((a, t) => a + t.r, 0) / trades.length : 0;
  return {
    asset,
    equity: curve,
    trades,
    netPct: ((final - START) / START) * 100,
    winRate: trades.length ? wins.length / trades.length : 0,
    profitFactor: gl ? gp / gl : gp > 0 ? 99 : 0,
    maxDdPct: maxDrawdown(curve.map((p) => p.equity)) * 100,
    avgR,
    expectancyR: avgR,
    exposurePct: curve.length ? (barsIn / curve.length) * 100 : 0,
  };
}

function maxDrawdown(eq: number[]) {
  let peak = -Infinity;
  let mdd = 0;
  for (const v of eq) {
    peak = Math.max(peak, v);
    if (peak > 0) mdd = Math.max(mdd, (peak - v) / peak);
  }
  return mdd;
}

// ---------- Robustness audit ----------

export type Grade = "S++" | "S+" | "S" | "A" | "B" | "C" | "D" | "F";
export const GRADE_COLORS: Record<Grade, string> = { "S++": "#fde047", "S+": "#fb923c", S: "#c084fc", A: "#60a5fa", B: "#4ade80", C: "#e5e7eb", D: "#8b95a5", F: "#f87171" };

export interface RobustCheck { id: string; label: string; detail: string; score: number; max: number; pass: boolean }
export interface Robustness {
  grade: Grade;
  score: number;
  checks: RobustCheck[];
  perAsset: SimResult[];
  /** Monte Carlo: 95th percentile max drawdown from reshuffled trade order. */
  mcDd95: number;
  /** Share of reshuffles that hit a 30% drawdown. */
  ruinPct: number;
  inSample: { pf: number; expectancy: number; trades: number };
  outSample: { pf: number; expectancy: number; trades: number };
}

export function gradeOf(score: number): Grade {
  if (score >= 92) return "S++";
  if (score >= 85) return "S+";
  if (score >= 78) return "S";
  if (score >= 68) return "A";
  if (score >= 56) return "B";
  if (score >= 44) return "C";
  if (score >= 30) return "D";
  return "F";
}

const pfOf = (ts: SimTrade[]) => {
  const gp = ts.filter((t) => t.pnl > 0).reduce((a, t) => a + t.pnl, 0);
  const gl = Math.abs(ts.filter((t) => t.pnl <= 0).reduce((a, t) => a + t.pnl, 0));
  return gl ? gp / gl : gp > 0 ? 99 : 0;
};
const expOf = (ts: SimTrade[]) => (ts.length ? ts.reduce((a, t) => a + t.r, 0) / ts.length : 0);

/**
 * Five checks that separate a real edge from a curve-fit: sample size, edge size, out-of-sample
 * hold-up (walk-forward 70/30), Monte Carlo drawdown, parameter stability and cross-market robustness.
 */
export function auditStrategy(spec: StrategySpec, seriesOf: (a: AssetClass) => Candle[], focus: AssetClass = spec.markets[0] ?? "crypto"): Robustness {
  const perAsset = ALL_MARKETS.map((a) => simulate(seriesOf(a), spec, a));
  const main = perAsset.find((r) => r.asset === focus)!;
  const ts = main.trades;
  const checks: RobustCheck[] = [];

  // 1. Sample size
  const n = ts.length;
  checks.push({ id: "sample", label: "Sample size", detail: `${n} trades on ${focus}. 30+ is the minimum to trust a stat, 100+ is solid.`, score: Math.min(15, (n / 100) * 15), max: 15, pass: n >= 30 });

  // 2. Edge size
  const pf = main.profitFactor;
  checks.push({ id: "edge", label: "Edge size", detail: `Profit factor ${pf.toFixed(2)}, expectancy ${main.expectancyR.toFixed(2)}R per trade.`, score: Math.max(0, Math.min(20, (pf - 1) * 20)), max: 20, pass: pf >= 1.3 && main.expectancyR > 0 });

  // 3. Walk-forward
  const cut = Math.floor(ts.length * 0.7);
  const isT = ts.slice(0, cut);
  const osT = ts.slice(cut);
  const inSample = { pf: pfOf(isT), expectancy: expOf(isT), trades: isT.length };
  const outSample = { pf: pfOf(osT), expectancy: expOf(osT), trades: osT.length };
  const holdUp = inSample.expectancy > 0 ? Math.max(0, Math.min(1.2, outSample.expectancy / inSample.expectancy)) : 0;
  checks.push({ id: "oos", label: "Out-of-sample hold-up", detail: `Last 30% of trades keep ${Math.round(Math.min(holdUp, 1) * 100)}% of the in-sample edge (${outSample.expectancy.toFixed(2)}R vs ${inSample.expectancy.toFixed(2)}R).`, score: Math.min(20, holdUp * 20 * (outSample.trades >= 8 ? 1 : 0.5)), max: 20, pass: holdUp >= 0.6 && outSample.pf > 1 });

  // 4. Monte Carlo drawdown
  const rand = mulberry32(42);
  const dds: number[] = [];
  let ruin = 0;
  const runs = 300;
  for (let k = 0; k < runs && n > 0; k++) {
    const shuffled = [...ts];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const s = Math.floor(rand() * (j + 1));
      [shuffled[j], shuffled[s]] = [shuffled[s], shuffled[j]];
    }
    let eq = START;
    const path = [eq];
    for (const t of shuffled) {
      eq += eq * (spec.riskPct / 100) * t.r;
      path.push(eq);
    }
    const dd = maxDrawdown(path);
    dds.push(dd);
    if (dd >= 0.3) ruin++;
  }
  dds.sort((a, b) => a - b);
  const mcDd95 = dds.length ? dds[Math.floor(dds.length * 0.95)] * 100 : 0;
  const ruinPct = n ? (ruin / runs) * 100 : 0;
  checks.push({ id: "mc", label: "Monte Carlo drawdown", detail: `In 300 reshuffles, the worst 5% saw ${mcDd95.toFixed(1)}% drawdown. ${ruinPct.toFixed(0)}% of paths hit -30%.`, score: n ? Math.max(0, 15 - Math.max(0, mcDd95 - 10) * 0.6) : 0, max: 15, pass: mcDd95 < 25 && ruinPct < 5 });

  // 5. Parameter stability: nudge every lookback ±20% and see if the edge survives.
  const nudged = [0.8, 1.2].map((f) => simulate(seriesOf(focus), scaleLens(spec, f), focus));
  const stable = nudged.filter((r) => r.profitFactor > 1 && r.expectancyR > 0).length;
  checks.push({ id: "params", label: "Parameter stability", detail: `${stable} of 2 nudged versions (lookbacks ±20%) stay profitable. Edges that vanish when you move a number are curve-fits.`, score: (stable / 2) * 15, max: 15, pass: stable === 2 });

  // 6. Cross-market
  const robustMarkets = perAsset.filter((r) => r.profitFactor > 1.1 && r.trades.length >= 10).length;
  checks.push({ id: "markets", label: "Cross-market robustness", detail: `Profitable on ${robustMarkets} of 5 markets (crypto, forex, futures, equities, options).`, score: (robustMarkets / 5) * 15, max: 15, pass: robustMarkets >= 3 });

  const score = Math.round(checks.reduce((a, c) => a + c.score, 0));
  return { grade: gradeOf(score), score, checks, perAsset, mcDd95, ruinPct, inSample, outSample };
}

export function scaleLens(spec: StrategySpec, f: number): StrategySpec {
  const sc = (o: Operand): Operand => (o.len ? { ...o, len: Math.max(2, Math.round(o.len * f)) } : o);
  const c = (x: Condition): Condition => ({ ...x, left: sc(x.left), right: sc(x.right) });
  return { ...spec, entry: spec.entry.map(c), exit: spec.exit.map(c) };
}

// ---------- Indicators ----------

export function sma(xs: number[], n: number) {
  const out = new Array<number>(xs.length).fill(NaN);
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    s += xs[i];
    if (i >= n) s -= xs[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

export function ema(xs: number[], n: number) {
  const out = new Array<number>(xs.length).fill(NaN);
  const k = 2 / (n + 1);
  let prev = NaN;
  for (let i = 0; i < xs.length; i++) {
    if (i === n - 1) prev = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
    else if (i >= n) prev = xs[i] * k + prev * (1 - k);
    out[i] = i >= n - 1 ? prev : NaN;
  }
  return out;
}

function stdev(xs: number[], n: number) {
  const m = sma(xs, n);
  return xs.map((_, i) => {
    if (i < n - 1) return NaN;
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (xs[j] - m[i]) ** 2;
    return Math.sqrt(s / n);
  });
}

export function rsi(xs: number[], n: number) {
  const out = new Array<number>(xs.length).fill(NaN);
  let g = 0;
  let l = 0;
  for (let i = 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    const up = Math.max(d, 0);
    const dn = Math.max(-d, 0);
    if (i <= n) {
      g += up / n;
      l += dn / n;
    } else {
      g = (g * (n - 1) + up) / n;
      l = (l * (n - 1) + dn) / n;
    }
    if (i >= n) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}

function atr(c: Candle[], n: number) {
  const tr = c.map((b, i) => (i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - c[i - 1].close), Math.abs(b.low - c[i - 1].close))));
  return sma(tr, n).map((v, i) => (Number.isNaN(v) ? tr[i] : v));
}
