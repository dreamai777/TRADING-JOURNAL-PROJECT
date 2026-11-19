import { describe, expect, it } from "vitest";
import { syntheticSeries, type Candle } from "../market";
import { ALL_MARKETS, auditStrategy, ema, explainSpec, gradeOf, sanitizeSpec, simulate, sma, type StrategySpec } from "../strategy";
import { TEMPLATES, critique, draftLocally } from "../strategy-ai";

const spec = (id: string): StrategySpec => ({ ...structuredClone(TEMPLATES.find((t) => t.id === id)!.spec), id });
const series = (a: (typeof ALL_MARKETS)[number]) => syntheticSeries(a, 900, 1);

describe("indicators", () => {
  it("sma and ema agree on a flat series and lag correctly", () => {
    const xs = Array.from({ length: 30 }, () => 10);
    expect(sma(xs, 5)[4]).toBe(10);
    expect(ema(xs, 5)[29]).toBeCloseTo(10);
    expect(Number.isNaN(sma(xs, 5)[3])).toBe(true);
  });
});

describe("simulate", () => {
  it("runs every template on every market without NaN", () => {
    for (const t of TEMPLATES) for (const m of ALL_MARKETS) {
      const r = simulate(series(m), spec(t.id), m);
      expect(Number.isFinite(r.netPct)).toBe(true);
      expect(r.trades.every((x) => Number.isFinite(x.r))).toBe(true);
    }
  });

  it("caps losses near 1R (stop is respected) for a long system", () => {
    const r = simulate(series("crypto"), spec("donchian"), "crypto");
    expect(r.trades.length).toBeGreaterThan(5);
    // Gaps through the stop can exceed 1R a little, but never wildly.
    expect(Math.min(...r.trades.map((t) => t.r))).toBeGreaterThan(-3);
  });

  it("short side profits when price falls", () => {
    const down: Candle[] = Array.from({ length: 400 }, (_, i) => {
      const p = 1000 * Math.exp(-i * 0.004) * (1 + 0.01 * Math.sin(i / 3));
      return { time: i * 86400, open: p * 1.002, high: p * 1.01, low: p * 0.99, close: p, volume: 1 };
    });
    const s = sanitizeSpec({ ...spec("short-breakdown"), entry: [{ left: { ind: "price" }, op: "below", right: { ind: "sma", len: 20 } }], exit: [], targetR: 2, maxBars: 10 });
    const r = simulate(down, s, "crypto");
    expect(r.trades.length).toBeGreaterThan(3);
    expect(r.netPct).toBeGreaterThan(0);
  });

  it("does nothing with no entry rules", () => {
    expect(simulate(series("forex"), { ...spec("ema-cross"), entry: [] }, "forex").trades).toHaveLength(0);
  });
});

describe("audit", () => {
  it("grades on a 0-100 score with six checks across five markets", () => {
    const a = auditStrategy(spec("trend-pullback"), series);
    expect(a.checks).toHaveLength(6);
    expect(a.perAsset).toHaveLength(5);
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
    expect(a.grade).toBe(gradeOf(a.score));
  });

  it("maps scores to grades from S++ to F", () => {
    expect(gradeOf(95)).toBe("S++");
    expect(gradeOf(80)).toBe("S");
    expect(gradeOf(10)).toBe("F");
  });

  it("critic fixes are valid patches", () => {
    const s = spec("bb-fade");
    const a = auditStrategy(s, series);
    for (const sug of critique(s, a)) if (sug.patch) expect(() => simulate(series("forex"), sanitizeSpec({ ...s, ...sug.patch }), "forex")).not.toThrow();
  });
});

describe("sanitize and draft", () => {
  it("clamps hostile input", () => {
    const s = sanitizeSpec({ riskPct: 80, stop: { type: "atr", value: -4 }, entry: [{ left: { ind: "nope" as never }, op: "boom" as never, right: { ind: "sma", len: 9999 } }], markets: ["moon" as never] });
    expect(s.riskPct).toBe(5);
    expect(s.stop.value).toBeGreaterThan(0);
    expect(s.entry[0].left.ind).toBe("price");
    expect(s.entry[0].right.len).toBe(200);
    expect(s.markets).toEqual(["crypto"]);
  });

  it("reads numbers and keywords from a prompt", () => {
    const d = draftLocally("Buy BTC pullbacks when RSI(4) is under 15 above the 200 SMA, 2 ATR stop, 3R target, risk 0.5%");
    expect(d.spec.markets).toContain("crypto");
    expect(d.spec.stop).toEqual({ type: "atr", value: 2 });
    expect(d.spec.targetR).toBe(3);
    expect(d.spec.riskPct).toBe(0.5);
    const rsi = d.spec.entry.find((c) => c.left.ind === "rsi")!;
    expect(rsi.left.len).toBe(4);
    expect(rsi.right.value).toBe(15);
  });

  it("protects a trader whose top mistake is oversizing", () => {
    const d = draftLocally("donchian breakout risk 2%", { topMistake: "oversized" });
    expect(d.spec.riskPct).toBeLessThanOrEqual(0.75);
  });

  it("explains rules in plain English", () => {
    expect(explainSpec(spec("donchian"))).toMatch(/^Buy when Price crosses above Highest close\(20\)/);
  });
});
