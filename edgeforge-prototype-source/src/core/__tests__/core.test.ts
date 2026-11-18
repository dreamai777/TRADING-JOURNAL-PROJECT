import { describe, expect, it } from "vitest";
import { computeTrade, computeAll, summarize, forgeScore } from "../stats";
import { demoTrades, demoSetups } from "../demo";
import { parseQuick } from "../quick";
import { mapCsvRows } from "../csv";
import { weaponStats, traderProgress } from "../game";
import { syntheticSeries, replayCandles } from "../market";
import { runBacktest } from "../backtest";
import { formatMoney } from "../currency";
import type { Trade } from "../types";

const base: Trade = { id: "t1", userId: "u", symbol: "BTCUSDT", assetClass: "crypto", side: "long", entry: 100, exit: 110, qty: 2, fees: 1, stopLoss: 95, openedAt: "2026-01-01T10:00:00Z", closedAt: "2026-01-01T11:00:00Z", tags: [], mistakes: [], source: "manual" };

describe("stats", () => {
  it("computes long and short pnl and R", () => {
    const l = computeTrade(base);
    expect(l.pnl).toBe(19);
    expect(l.r).toBeCloseTo(19 / 11);
    const s = computeTrade({ ...base, side: "short", stopLoss: 105 });
    expect(s.pnl).toBe(-21);
    expect(s.holdMinutes).toBe(60);
  });
  it("summarizes win rate, profit factor and drawdown", () => {
    const ts = computeAll([base, { ...base, id: "t2", exit: 95, closedAt: "2026-01-02T00:00:00Z" }, { ...base, id: "t3", exit: 120, closedAt: "2026-01-03T00:00:00Z" }]);
    const s = summarize(ts, 1000);
    expect(s.count).toBe(3);
    expect(s.winRate).toBeCloseTo(2 / 3);
    expect(s.profitFactor).toBeCloseTo((19 + 39) / 11);
    expect(s.maxDrawdown).toBe(11);
    expect(s.longestWinStreak).toBe(1);
  });
  it("demo data has positive but realistic edge", () => {
    const ts = computeAll(demoTrades());
    const s = summarize(ts);
    expect(ts.length).toBe(160);
    expect(ts.every((t) => Date.parse(t.closedAt) <= Date.now())).toBe(true);
    expect(s.profitFactor).toBeGreaterThan(1);
    expect(s.profitFactor).toBeLessThan(4);
    expect(forgeScore(s).score).toBeGreaterThan(0);
  });
});

describe("quick parse", () => {
  it("parses a one-line trade", () => {
    const p = parseQuick("btc long 90100 -> 91550 0.2 sl 89600 calm orb", [{ id: "s_orb", name: "Opening Range Breakout" }]);
    expect(p).toMatchObject({ symbol: "BTCUSDT", side: "long", entry: 90100, exit: 91550, qty: 0.2, stopLoss: 89600, emotion: "calm", setupHint: "s_orb" });
  });
  it("parses short with x qty and stop keyword", () => {
    const p = parseQuick("short NQ 20950 20890 x2 stop 20975");
    expect(p).toMatchObject({ symbol: "NQ", side: "short", entry: 20950, exit: 20890, qty: 2, stopLoss: 20975 });
  });
});

describe("csv", () => {
  it("maps common headers", () => {
    const { trades, errors } = mapCsvRows([{ Symbol: "ETHUSDT", Side: "SELL", "Entry Price": "3200", "Exit Price": "3150", Quantity: "1", Fee: "2" }], "u");
    expect(errors).toEqual([]);
    expect(trades[0]).toMatchObject({ side: "short", entry: 3200, exit: 3150, qty: 1, fees: 2, assetClass: "crypto" });
  });
  it("reports missing columns", () => {
    expect(mapCsvRows([{ foo: "1" }], "u").errors.length).toBeGreaterThan(0);
  });
});

describe("game + market + backtest", () => {
  it("levels weapons and traders", () => {
    const ts = computeAll(demoTrades());
    const w = weaponStats(demoSetups()[2], ts);
    expect(w.level).toBeGreaterThan(1);
    expect(traderProgress(ts).xp).toBeGreaterThan(1000);
  });
  it("replay candles hit entry and exit", () => {
    const t = computeTrade(base);
    const r = replayCandles(t);
    expect(r.candles[r.entryIndex].close).toBe(100);
    expect(r.candles[r.exitIndex].close).toBe(110);
  });
  it("backtest runs on all asset classes", () => {
    for (const a of ["crypto", "forex", "futures", "equities", "options"] as const) {
      const res = runBacktest(syntheticSeries(a), "breakout", { entryN: 40, exitN: 20, atrStop: 3 }, a);
      expect(res.equity.length).toBeGreaterThan(100);
      expect(Number.isFinite(res.netPct)).toBe(true);
    }
  });
  it("formats currencies", () => {
    expect(formatMoney(100, "USD", { sign: true })).toBe("+$100.00");
    expect(formatMoney(-10, "JPY")).toBe("-¥1,512");
  });
});
