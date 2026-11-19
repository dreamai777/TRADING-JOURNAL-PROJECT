import { describe, expect, it } from "vitest";
import { displaySymbol, exchangeSymbol, parseLeverage, parseSymbol } from "../markets";
import { parseQuick } from "../quick";
import { computeTrade } from "../stats";
import { demoTrades } from "../demo";

describe("crypto symbols", () => {
  it("reads perpetuals in every common format", () => {
    for (const raw of ["SOLUSDT.P", "SOL-USDT-SWAP", "SOLUSDT_UMCBL", "SOLUSDT_PERP", "SOL/USDT:USDT", "solusdt.p"]) {
      const p = parseSymbol(raw);
      expect(p, raw).toMatchObject({ base: "SOL", quote: "USDT", market: "perp", display: "SOLUSDT.P" });
    }
  });
  it("reads spot", () => {
    expect(parseSymbol("RAYUSDT")).toMatchObject({ base: "RAY", quote: "USDT", market: "spot", display: "RAYUSDT" });
    expect(parseSymbol("SOL-USDT").display).toBe("SOLUSDT");
    expect(parseSymbol("SOL/USDC").quote).toBe("USDC");
  });
  it("uses the account hint for a bare symbol", () => {
    expect(parseSymbol("RAYUSDT", "perp").display).toBe("RAYUSDT.P");
  });
  it("reads dated futures with the expiry", () => {
    const a = parseSymbol("BTCUSDT_260327");
    const b = parseSymbol("BTC-USDT-260327");
    expect(a).toMatchObject({ market: "futures", expiry: "2026-03-27", display: "BTCUSDT 27 Mar 26" });
    expect(b.display).toBe(a.display);
  });
  it("labels bots and margin", () => {
    expect(displaySymbol("SOL", "USDT", "grid")).toBe("SOLUSDT · Grid");
    expect(displaySymbol("SOL", "USDT", "dca")).toBe("SOLUSDT · DCA");
    expect(displaySymbol("ETH", "USDT", "margin")).toBe("ETHUSDT · Margin");
  });
  it("builds the exchange's own instrument id", () => {
    expect(exchangeSymbol("okx", "SOL", "USDT", "perp")).toBe("SOL-USDT-SWAP");
    expect(exchangeSymbol("okx", "SOL", "USDT", "spot")).toBe("SOL-USDT");
    expect(exchangeSymbol("binance", "BTC", "USDT", "futures", "2026-03-27")).toBe("BTCUSDT_260327");
    expect(exchangeSymbol("bybit", "SOL", "USDT", "perp")).toBe("SOLUSDT");
  });
  it("reads leverage but not quantity", () => {
    expect(parseLeverage("sol long 10x")).toBe(10);
    expect(parseLeverage("short nq x2")).toBeUndefined();
    expect(parseLeverage("500x")).toBeUndefined();
  });
});

describe("quick snap with crypto markets", () => {
  it("understands .P symbols and leverage", () => {
    const p = parseQuick("ray.p long 1.92 2.05 500 10x");
    expect(p).toMatchObject({ symbol: "RAYUSDT", market: "perp", leverage: 10, side: "long", entry: 1.92, exit: 2.05, qty: 500 });
  });
  it("understands market words", () => {
    expect(parseQuick("sol spot buy 140 150 2")).toMatchObject({ symbol: "SOLUSDT", market: "spot", side: "long" });
    expect(parseQuick("SOLUSDT.P short 150 140")).toMatchObject({ symbol: "SOLUSDT", market: "perp", side: "short" });
    expect(parseQuick("sol-usdt-swap long 140 150").market).toBe("perp");
  });
  it("keeps x2 as quantity", () => {
    expect(parseQuick("short NQ 20950 20890 x2").qty).toBe(2);
  });
});

describe("funding and demo markets", () => {
  it("subtracts funding from P&L", () => {
    const t = computeTrade({ side: "long", entry: 100, exit: 110, qty: 1, fees: 1, funding: 2 } as never);
    expect(t.pnl).toBeCloseTo(7);
  });
  it("gives demo crypto trades a market, exchange and display symbol", () => {
    const crypto = demoTrades().filter((t) => t.market);
    expect(crypto.length).toBeGreaterThan(10);
    for (const t of crypto) {
      if (t.market === "perp") expect(t.symbol.endsWith(".P")).toBe(true);
      if (t.market === "spot") expect(t.side).toBe("long");
      expect(t.exchange).toBeTruthy();
    }
  });
});

describe("display round trip", () => {
  it("parses our own display labels back to the pair", () => {
    expect(parseSymbol("SOLUSDT · Grid", "grid")).toMatchObject({ base: "SOL", quote: "USDT", market: "grid" });
    expect(parseSymbol("SOLUSDT.P · Copy", "copy")).toMatchObject({ base: "SOL", quote: "USDT", market: "perp" });
    expect(parseSymbol("BTCUSDT 27 Mar 26", "futures")).toMatchObject({ base: "BTC", quote: "USDT" });
  });
});

describe("CSV import of exchange symbols", () => {
  it("turns OKX and Bitget instrument ids into the journal style", async () => {
    const { mapCsvRows } = await import("../csv");
    const { trades, errors } = mapCsvRows([
      { symbol: "SOL-USDT-SWAP", side: "buy", entry: "140", exit: "150", qty: "2", exchange: "OKX", leverage: "10", "market type": "" },
      { symbol: "RAYUSDT", side: "buy", entry: "1.9", exit: "2.1", qty: "100", "market type": "spot" },
      { symbol: "RAYUSDT", side: "sell", entry: "2.1", exit: "1.9", qty: "100", "market type": "USDT-M futures" },
    ], "u1");
    expect(errors).toEqual([]);
    expect(trades.map((t) => t.symbol)).toEqual(["SOLUSDT.P", "RAYUSDT", "RAYUSDT.P"]);
    expect(trades[0]).toMatchObject({ market: "perp", exchange: "okx", instrument: "SOL-USDT-SWAP", leverage: 10 });
  });
});
