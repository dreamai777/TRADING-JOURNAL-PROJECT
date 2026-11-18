import { describe, expect, it } from "vitest";
import { characterState, recommendJob } from "../character";
import { calendarDays, computeAll, sliceRange } from "../stats";
import type { Trade } from "../types";

const NOW = Date.parse("2026-11-18T12:00:00Z");
const mk = (i: number, o: Partial<Trade> = {}): Trade => ({
  id: `t${i}`, userId: "u", symbol: "BTCUSDT", assetClass: "crypto", side: "long", entry: 100, exit: 110, qty: 1, fees: 0, stopLoss: 95,
  openedAt: new Date(NOW - (40 - i) * 3600000 - 1800000).toISOString(), closedAt: new Date(NOW - (40 - i) * 3600000).toISOString(),
  tags: [], mistakes: [], source: "manual", rulesFollowed: true, emotion: "calm", ...o,
});

describe("character", () => {
  it("is on fire after a disciplined win streak", () => {
    const ts = computeAll(Array.from({ length: 10 }, (_, i) => mk(i)));
    expect(characterState(ts, 1000, "warrior", NOW).condition).toBe("onfire");
  });
  it("burns out when overtrading in 24h", () => {
    const ts = computeAll(Array.from({ length: 12 }, (_, i) => mk(30 + i * 0.5 * 0 + i / 2, { id: `b${i}` })));
    expect(characterState(ts, 1000, "sniper", NOW).condition).toBe("burnout");
  });
  it("gets enraged after revenge losses", () => {
    const ts = computeAll(Array.from({ length: 6 }, (_, i) => mk(i, { exit: 92, emotion: "revenge", rulesFollowed: false })));
    const st = characterState(ts, 1000, "assassin", NOW);
    expect(["tilted", "burnout"]).toContain(st.condition);
    expect(st.energy).toBeLessThan(80);
  });
  it("rests when idle for a week", () => {
    const ts = computeAll([mk(0, { closedAt: "2026-11-01T00:00:00Z", openedAt: "2026-10-31T23:00:00Z" })]);
    expect(characterState(ts, 1000, "wizard", NOW).condition).toBe("resting");
  });
  it("recommends a class from setup mix", () => {
    const ts = computeAll(Array.from({ length: 5 }, (_, i) => mk(i, { setupId: "s" })));
    expect(recommendJob(ts, () => "Scalp")).toBe("sniper");
  });
});

describe("ranges + calendar", () => {
  it("slices by range and carries starting equity", () => {
    const ts = computeAll([mk(0, { closedAt: "2026-01-01T00:00:00Z", openedAt: "2025-12-31T00:00:00Z" }), mk(39)]);
    const r = sliceRange(ts, "1W", 1000, NOW);
    expect(r.trades.length).toBe(1);
    expect(r.startEquity).toBe(1010);
    expect(sliceRange(ts, "ALL", 1000, NOW).trades.length).toBe(2);
  });
  it("computes daily % against start-of-day equity", () => {
    const ts = computeAll([mk(39)]);
    const days = [...calendarDays(ts, 1000).values()];
    expect(days[0].pnl).toBe(10);
    expect(days[0].pct).toBeCloseTo(0.01);
  });
});
