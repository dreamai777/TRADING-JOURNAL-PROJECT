import { describe, expect, it } from "vitest";
import { mapPositions, mapSpotFills, parsePermissions, type OkxFillRow, type OkxInstrument, type OkxPositionRow } from "../okx";
import { computeTrade } from "../stats";
import type { Trade } from "../types";

const asTrade = (t: Omit<Trade, "id" | "userId">): Trade => ({ ...t, id: "x", userId: "u" });

describe("OKX key permissions", () => {
  it("accepts only read-only keys", () => {
    expect(parsePermissions("read_only").readOnly).toBe(true);
    expect(parsePermissions("read_only,trade").readOnly).toBe(false);
    expect(parsePermissions("read_only,withdraw").readOnly).toBe(false);
    expect(parsePermissions("").readOnly).toBe(false);
    expect(parsePermissions(undefined).readOnly).toBe(false);
  });
});

const inst = new Map<string, OkxInstrument>([
  ["SOL-USDT-SWAP", { instId: "SOL-USDT-SWAP", instType: "SWAP", ctVal: "1", ctMult: "1", ctType: "linear" }],
  ["BTC-USDT-SWAP", { instId: "BTC-USDT-SWAP", instType: "SWAP", ctVal: "0.01", ctMult: "1", ctType: "linear" }],
  ["BTC-USD-SWAP", { instId: "BTC-USD-SWAP", instType: "SWAP", ctVal: "100", ctMult: "1", ctType: "inverse" }],
]);
const pos = (p: Partial<OkxPositionRow>): OkxPositionRow => ({
  instType: "SWAP", instId: "SOL-USDT-SWAP", posId: "1", direction: "long", lever: "10", openAvgPx: "100", closeAvgPx: "110",
  closeTotalPos: "5", fee: "-0.5", fundingFee: "-0.2", cTime: "1763000000000", uTime: "1763003600000", type: "2", ...p,
});

describe("OKX positions → journal", () => {
  it("maps a USDT perp to SOLUSDT.P with contract size, fees and funding", () => {
    const { trades } = mapPositions([pos({})], inst);
    const t = trades[0];
    expect(t.symbol).toBe("SOLUSDT.P");
    expect(t.market).toBe("perp");
    expect(t.instrument).toBe("SOL-USDT-SWAP");
    expect(t.qty).toBe(5);
    expect(t.fees).toBeCloseTo(0.5);
    expect(t.funding).toBeCloseTo(0.2);
    expect(t.leverage).toBe(10);
    expect(computeTrade(asTrade(t)).pnl).toBeCloseTo(50 - 0.5 - 0.2);
  });

  it("turns contracts into coins (BTC 0.01 per contract) and handles shorts", () => {
    const { trades } = mapPositions([pos({ instId: "BTC-USDT-SWAP", direction: "short", openAvgPx: "90000", closeAvgPx: "89000", closeTotalPos: "3", fee: "-1", fundingFee: "0.4" })], inst);
    expect(trades[0].qty).toBeCloseTo(0.03);
    expect(trades[0].side).toBe("short");
    expect(trades[0].funding).toBeCloseTo(-0.4); // funding received
    expect(computeTrade(asTrade(trades[0])).pnl).toBeCloseTo(30 - 1 + 0.4);
  });

  it("tags liquidations and skips coin-margined contracts", () => {
    const { trades, skipped } = mapPositions([pos({ type: "3" }), pos({ instId: "BTC-USD-SWAP" })], inst);
    expect(trades).toHaveLength(1);
    expect(trades[0].tags).toContain("liquidated");
    expect(skipped[0].count).toBe(1);
  });

  it("gives every position a stable external id", () => {
    const a = mapPositions([pos({})], inst).trades[0].externalId;
    expect(a).toBe(mapPositions([pos({})], inst).trades[0].externalId);
    expect(a).not.toBe(mapPositions([pos({ uTime: "1763009999999" })], inst).trades[0].externalId);
  });
});

const fill = (f: Partial<OkxFillRow>): OkxFillRow => ({ instType: "SPOT", instId: "SOL-USDT", tradeId: Math.random().toString(), ordId: "o1", side: "buy", fillPx: "100", fillSz: "1", fee: "-0.001", feeCcy: "SOL", ts: "1763000000000", ...f });

describe("OKX spot fills → round trips (FIFO)", () => {
  it("pairs a buy with a later sell, merges partial fills and converts fees to USD", () => {
    const { trades, openLots } = mapSpotFills([
      fill({ ordId: "b1", fillSz: "1", ts: "1763000000000" }),
      fill({ ordId: "b1", fillSz: "1", ts: "1763000001000" }),
      fill({ ordId: "s1", side: "sell", fillPx: "120", fillSz: "2", fee: "-0.24", feeCcy: "USDT", ts: "1763100000000" }),
    ]);
    expect(trades).toHaveLength(1);
    const t = trades[0];
    expect(t.symbol).toBe("SOLUSDT");
    expect(t.market).toBe("spot");
    expect(t.qty).toBe(2);
    expect(t.entry).toBe(100);
    expect(t.exit).toBe(120);
    expect(t.fees).toBeCloseTo(0.2 + 0.24);
    expect(t.externalId).toBe("okx:SPOT:s1");
    expect(openLots).toBe(0);
  });

  it("averages several buys, keeps leftovers open, and skips sells with no buy", () => {
    const { trades, openLots, skipped } = mapSpotFills([
      fill({ instId: "ETH-USDT", ordId: "x", side: "sell", fillPx: "3000", feeCcy: "USDT", ts: "1762000000000" }),
      fill({ ordId: "b1", fillPx: "100", fillSz: "1", fee: "0", ts: "1763000000000" }),
      fill({ ordId: "b2", fillPx: "200", fillSz: "1", fee: "0", ts: "1763000100000" }),
      fill({ ordId: "b3", fillPx: "300", fillSz: "1", fee: "0", ts: "1763000200000" }),
      fill({ ordId: "s1", side: "sell", fillPx: "250", fillSz: "2", fee: "0", feeCcy: "USDT", ts: "1763100000000" }),
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0].entry).toBe(150);
    expect(trades[0].openedAt).toBe(new Date(1763000000000).toISOString());
    expect(openLots).toBe(1);
    expect(skipped.some((s) => s.reason.includes("no matching buy"))).toBe(true);
  });
});
