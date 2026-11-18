// Minimal, honest bar-by-bar backtester: next-bar-open fills, fixed-fractional risk, fees + slippage.
import type { Candle } from "./market";
import type { AssetClass } from "./types";

export type StrategyId = "ma-cross" | "breakout" | "rsi-revert";

export const STRATEGIES: { id: StrategyId; name: string; icon: string; description: string; params: { key: string; label: string; min: number; max: number; step: number; default: number }[] }[] = [
  {
    id: "ma-cross", name: "MA Crossover", icon: "🔱", description: "Long when fast MA crosses above slow MA, exit on cross back. ATR stop.",
    params: [
      { key: "fast", label: "Fast MA", min: 5, max: 50, step: 1, default: 20 },
      { key: "slow", label: "Slow MA", min: 20, max: 200, step: 5, default: 50 },
      { key: "atrStop", label: "ATR stop ×", min: 1, max: 5, step: 0.5, default: 2.5 },
    ],
  },
  {
    id: "breakout", name: "Donchian Breakout", icon: "🗡️", description: "Long on N-bar high break, exit on M-bar low. Classic trend capture.",
    params: [
      { key: "entryN", label: "Entry lookback", min: 10, max: 100, step: 5, default: 20 },
      { key: "exitN", label: "Exit lookback", min: 5, max: 50, step: 5, default: 10 },
      { key: "atrStop", label: "ATR stop ×", min: 1, max: 5, step: 0.5, default: 3 },
    ],
  },
  {
    id: "rsi-revert", name: "RSI Mean Reversion", icon: "🏹", description: "Long when RSI is oversold above the 200 MA, exit when RSI recovers.",
    params: [
      { key: "rsiLen", label: "RSI length", min: 2, max: 21, step: 1, default: 4 },
      { key: "oversold", label: "Oversold", min: 5, max: 40, step: 1, default: 20 },
      { key: "exitAt", label: "Exit RSI", min: 50, max: 80, step: 1, default: 60 },
    ],
  },
];

export interface BacktestResult {
  asset: AssetClass;
  equity: { time: number; equity: number }[];
  trades: { entryTime: number; exitTime: number; entry: number; exit: number; r: number; pnl: number }[];
  netPct: number;
  winRate: number;
  profitFactor: number;
  maxDdPct: number;
  avgR: number;
  exposurePct: number;
  cagr: number;
}

export function runBacktest(candles: Candle[], strategy: StrategyId, params: Record<string, number>, asset: AssetClass, opts = { riskPct: 1, feeBps: 5, slipBps: 3 }): BacktestResult {
  const closes = candles.map((c) => c.close);
  const atr = atrSeries(candles, 14);
  let equity = 10000;
  const curve: { time: number; equity: number }[] = [];
  const trades: BacktestResult["trades"] = [];
  let pos: null | { entry: number; stop: number; qty: number; time: number; risk: number } = null;
  let barsIn = 0;
  const costPct = (opts.feeBps + opts.slipBps) / 10000;
  const fast = strategy === "ma-cross" ? sma(closes, params.fast) : [];
  const slow = strategy === "ma-cross" ? sma(closes, params.slow) : [];
  const rsiS = strategy === "rsi-revert" ? rsi(closes, params.rsiLen) : [];
  const ma200 = strategy === "rsi-revert" ? sma(closes, 200) : [];
  const warmup = 205;

  for (let i = warmup; i < candles.length - 1; i++) {
    const next = candles[i + 1];
    let enter = false;
    let exit = false;
    if (strategy === "ma-cross") {
      enter = fast[i] > slow[i] && fast[i - 1] <= slow[i - 1];
      exit = fast[i] < slow[i];
    } else if (strategy === "breakout") {
      enter = closes[i] > Math.max(...closes.slice(i - params.entryN, i));
      exit = closes[i] < Math.min(...closes.slice(i - params.exitN, i));
    } else {
      enter = rsiS[i] < params.oversold && closes[i] > ma200[i];
      exit = rsiS[i] > params.exitAt;
    }
    if (pos) {
      barsIn++;
      const stopHit = next.low <= pos.stop;
      if (stopHit || exit) {
        const px = (stopHit ? Math.min(pos.stop, next.open) : next.open) * (1 - costPct);
        const pnl = (px - pos.entry) * pos.qty;
        equity += pnl;
        trades.push({ entryTime: pos.time, exitTime: next.time, entry: pos.entry, exit: px, pnl, r: pnl / pos.risk });
        pos = null;
      }
    } else if (enter) {
      const entry = next.open * (1 + costPct);
      const stopMult = params.atrStop ?? 2;
      const stop = entry - atr[i] * stopMult;
      const risk = equity * (opts.riskPct / 100);
      const qty = risk / Math.max(entry - stop, entry * 0.001);
      pos = { entry, stop, qty, time: next.time, risk };
    }
    const mtm = pos ? equity + (candles[i + 1].close - pos.entry) * pos.qty : equity;
    curve.push({ time: next.time, equity: mtm });
  }
  const wins = trades.filter((t) => t.pnl > 0);
  const gp = wins.reduce((a, t) => a + t.pnl, 0);
  const gl = Math.abs(trades.filter((t) => t.pnl <= 0).reduce((a, t) => a + t.pnl, 0));
  let peak = 10000;
  let mdd = 0;
  for (const p of curve) {
    peak = Math.max(peak, p.equity);
    mdd = Math.max(mdd, (peak - p.equity) / peak);
  }
  const final = curve.length ? curve[curve.length - 1].equity : 10000;
  const years = curve.length / 365;
  return {
    asset,
    equity: curve,
    trades,
    netPct: (final - 10000) / 100,
    winRate: trades.length ? wins.length / trades.length : 0,
    profitFactor: gl ? gp / gl : gp > 0 ? Infinity : 0,
    maxDdPct: mdd * 100,
    avgR: trades.length ? trades.reduce((a, t) => a + t.r, 0) / trades.length : 0,
    exposurePct: curve.length ? (barsIn / curve.length) * 100 : 0,
    cagr: years > 0 ? (Math.pow(final / 10000, 1 / years) - 1) * 100 : 0,
  };
}

function sma(xs: number[], n: number) {
  const out: number[] = new Array(xs.length).fill(NaN);
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    s += xs[i];
    if (i >= n) s -= xs[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

function rsi(xs: number[], n: number) {
  const out: number[] = new Array(xs.length).fill(NaN);
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

function atrSeries(c: Candle[], n: number) {
  const tr = c.map((b, i) => (i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - c[i - 1].close), Math.abs(b.low - c[i - 1].close))));
  return sma(tr, n).map((v, i) => (Number.isNaN(v) ? tr[i] : v));
}
