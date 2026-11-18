// Synthetic OHLC generation for trade replay + backtesting in the prototype.
// Production replaces this with real candles (exchange klines via CCXT, Polygon/Databento for US markets).
import { gaussian, hashString, mulberry32 } from "./random";
import type { AssetClass, TradeComputed } from "./types";

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Builds candles that pass through the trade's real entry and exit at the real timestamps,
 * so the replay matches what was journaled.
 */
export function replayCandles(t: TradeComputed, barsBefore = 40, barsAfter = 15) {
  const rand = mulberry32(hashString(t.id));
  const open = Math.floor(Date.parse(t.openedAt) / 1000);
  const close = Math.floor(Date.parse(t.closedAt) / 1000);
  const holdBars = 24;
  const step = Math.max(60, Math.round((close - open) / holdBars / 60) * 60);
  const vol = Math.abs(t.entry - (t.stopLoss ?? t.entry * 0.995)) / 4 || t.entry * 0.001;
  const candles: Candle[] = [];
  // walk backward from entry
  const pre: number[] = [];
  let p = t.entry;
  for (let i = 0; i < barsBefore; i++) {
    p -= gaussian(rand) * vol + (t.side === "long" ? vol * 0.05 : -vol * 0.05);
    pre.unshift(p);
  }
  // bridge from entry to exit (brownian bridge)
  const bridge: number[] = [];
  let b = t.entry;
  for (let i = 1; i <= holdBars; i++) {
    const remaining = holdBars - i + 1;
    const drift = (t.exit - b) / remaining;
    b += drift + gaussian(rand) * vol * (i === holdBars ? 0 : 0.8);
    bridge.push(i === holdBars ? t.exit : b);
  }
  const post: number[] = [];
  let q = t.exit;
  for (let i = 0; i < barsAfter; i++) {
    q += gaussian(rand) * vol;
    post.push(q);
  }
  const closes = [...pre, t.entry, ...bridge, ...post];
  const start = open - barsBefore * step;
  let prev = closes[0] - gaussian(rand) * vol;
  closes.forEach((c, i) => {
    const o = prev;
    const hi = Math.max(o, c) + Math.abs(gaussian(rand)) * vol * 0.6;
    const lo = Math.min(o, c) - Math.abs(gaussian(rand)) * vol * 0.6;
    candles.push({ time: start + i * step, open: o, high: hi, low: lo, close: c, volume: 100 + rand() * 900 });
    prev = c;
  });
  return { candles, entryIndex: barsBefore, exitIndex: barsBefore + holdBars, step };
}

const PROFILE: Record<AssetClass, { start: number; vol: number; drift: number }> = {
  crypto: { start: 60000, vol: 0.028, drift: 0.0012 },
  forex: { start: 1.1, vol: 0.005, drift: 0.00002 },
  futures: { start: 5000, vol: 0.011, drift: 0.0004 },
  equities: { start: 180, vol: 0.017, drift: 0.0006 },
  options: { start: 450, vol: 0.013, drift: 0.0005 },
};

/** Daily bars with regime switching (trend/chop) — gives strategies something real to fight. */
export function syntheticSeries(asset: AssetClass, bars = 750, seed = 1) {
  const rand = mulberry32(hashString(asset) + seed);
  const prof = PROFILE[asset];
  const out: Candle[] = [];
  let p = prof.start;
  let regime = 1;
  const t0 = Math.floor(Date.UTC(2023, 0, 2) / 1000);
  for (let i = 0; i < bars; i++) {
    if (rand() < 0.02) regime = rand() < 0.5 ? (rand() < 0.5 ? 1 : -1) : 0;
    const mu = regime * prof.vol * 0.12 + prof.drift;
    const r = mu + gaussian(rand) * prof.vol;
    const o = p;
    const c = p * Math.exp(r);
    const h = Math.max(o, c) * (1 + Math.abs(gaussian(rand)) * prof.vol * 0.4);
    const l = Math.min(o, c) * (1 - Math.abs(gaussian(rand)) * prof.vol * 0.4);
    out.push({ time: t0 + i * 86400, open: o, high: h, low: l, close: c, volume: 1000 + rand() * 5000 });
    p = c;
  }
  return out;
}
