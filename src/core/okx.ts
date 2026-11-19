// Turns raw OKX v5 API rows into journal trades. Pure functions, no network, no secrets, so they
// run in tests and are shared with the future mobile app.
//
// - Perpetuals, dated futures and margin come from /api/v5/account/positions-history: OKX already
//   groups fills into closed positions there, with realized P&L, fees and funding.
// - Spot has no positions, so spot fills from /api/v5/trade/fills-history are matched first-in,
//   first-out: buys open lots, each sell order closes lots and becomes one journal trade.
import { displaySymbol, parseSymbol, type CryptoMarket } from "./markets";
import type { Trade } from "./types";

/** API permissions OKX reports for a key: "read_only", "trade", "withdraw" (comma separated). */
export function parsePermissions(perm: string | undefined): { readOnly: boolean; perms: string[] } {
  const perms = (perm ?? "").split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
  const readOnly = perms.length > 0 && perms.every((p) => p === "read_only" || p === "read");
  return { readOnly, perms };
}

export interface OkxInstrument {
  instId: string;
  instType: string;
  ctVal?: string;
  ctMult?: string;
  ctValCcy?: string;
  ctType?: string; // "linear" | "inverse"
  settleCcy?: string;
}

export interface OkxPositionRow {
  instType: string; // SWAP | FUTURES | MARGIN | OPTION
  instId: string;
  posId: string;
  direction: string; // long | short
  lever: string;
  openAvgPx: string;
  closeAvgPx: string;
  closeTotalPos: string; // contracts (SWAP/FUTURES) or base coin (MARGIN)
  realizedPnl?: string;
  pnl?: string;
  fee: string; // negative = paid
  fundingFee?: string; // negative = paid
  liqPenalty?: string;
  type?: string; // 1 partial close, 2 full close, 3 liquidation, 4 partial liquidation, 5 ADL
  cTime: string; // ms
  uTime: string; // ms
  ccy?: string;
}

export interface OkxFillRow {
  instType: string;
  instId: string;
  tradeId: string;
  ordId: string;
  billId?: string;
  side: "buy" | "sell";
  fillPx: string;
  fillSz: string;
  fee: string; // negative = paid
  feeCcy: string;
  ts: string; // ms
}

export type SyncedTrade = Omit<Trade, "id" | "userId">;

export interface MapResult {
  trades: SyncedTrade[];
  skipped: { reason: string; count: number }[];
}

const USD_QUOTES = new Set(["USDT", "USDC", "USD"]);
const n = (v: string | undefined) => (v === undefined || v === "" ? 0 : Number(v));
const iso = (ms: string | number) => new Date(Number(ms)).toISOString();
const round = (v: number, d = 8) => Math.round(v * 10 ** d) / 10 ** d;

function addSkip(skipped: MapResult["skipped"], reason: string) {
  const row = skipped.find((s) => s.reason === reason);
  if (row) row.count++; else skipped.push({ reason, count: 1 });
}

function marketFor(instType: string): CryptoMarket | null {
  switch (instType) {
    case "SWAP": return "perp";
    case "FUTURES": return "futures";
    case "MARGIN": return "margin";
    case "SPOT": return "spot";
    default: return null;
  }
}

/** Closed perpetual, futures and margin positions → journal trades. */
export function mapPositions(rows: OkxPositionRow[], instruments: Map<string, OkxInstrument>): MapResult {
  const trades: SyncedTrade[] = [];
  const skipped: MapResult["skipped"] = [];
  for (const r of rows) {
    const market = marketFor(r.instType);
    if (!market) { addSkip(skipped, `${r.instType.toLowerCase()} positions are not journaled yet`); continue; }
    const p = parseSymbol(r.instId, market);
    if (!USD_QUOTES.has(p.quote)) { addSkip(skipped, "coin-margined (inverse) positions are not supported yet"); continue; }
    let qty = n(r.closeTotalPos);
    if (market === "perp" || market === "futures") {
      const inst = instruments.get(r.instId);
      if (inst?.ctType === "inverse") { addSkip(skipped, "coin-margined (inverse) positions are not supported yet"); continue; }
      const ctVal = n(inst?.ctVal) * (n(inst?.ctMult) || 1);
      if (!ctVal) { addSkip(skipped, "contract size unknown"); continue; }
      qty *= ctVal;
    }
    const entry = n(r.openAvgPx);
    const exit = n(r.closeAvgPx);
    if (!qty || !entry || !exit) { addSkip(skipped, "position had no size or price"); continue; }
    const side = r.direction === "short" ? "short" : "long";
    const fees = round(-n(r.fee) + Math.abs(n(r.liqPenalty)), 6);
    const funding = market === "perp" ? round(-n(r.fundingFee), 6) : undefined;
    const tags = ["synced", market];
    if (r.type === "3" || r.type === "4") tags.push("liquidated");
    if (r.type === "5") tags.push("adl");
    const lever = n(r.lever);
    trades.push({
      symbol: displaySymbol(p.base, p.quote, market, p.expiry),
      assetClass: "crypto",
      side,
      entry,
      exit,
      qty: round(qty),
      fees,
      funding,
      openedAt: iso(r.cTime),
      closedAt: iso(r.uTime),
      tags,
      mistakes: [],
      source: "okx",
      exchange: "okx",
      market,
      instrument: r.instId,
      leverage: lever > 0 ? lever : undefined,
      externalId: `okx:${r.instType}:${r.posId}:${r.cTime}:${r.uTime}`,
    });
  }
  return { trades, skipped };
}

interface Lot { qty: number; px: number; feeUsd: number; ts: number }

/**
 * Spot fills → round-trip trades, first-in first-out per instrument. Partial fills of one order are
 * merged first. A sell with no earlier buy in the history window (bought before OKX's 3 month
 * limit, or deposited) is skipped rather than guessed. Coins still held stay open and are not journaled.
 */
export function mapSpotFills(fills: OkxFillRow[]): MapResult & { openLots: number } {
  const trades: SyncedTrade[] = [];
  const skipped: MapResult["skipped"] = [];

  // Merge partial fills into one row per order.
  const orders = new Map<string, { instId: string; side: "buy" | "sell"; qty: number; notional: number; feeUsd: number; ts: number; lastTs: number }>();
  for (const f of fills) {
    if (f.instType && f.instType !== "SPOT") continue;
    const p = parseSymbol(f.instId, "spot");
    const px = n(f.fillPx), sz = n(f.fillSz), ts = Number(f.ts);
    if (!px || !sz) continue;
    // OKX charges spot fees in the coin received: base on buys, quote on sells. Rebates come back positive.
    const fee = -n(f.fee);
    const feeUsd = f.feeCcy === p.base ? fee * px : USD_QUOTES.has(f.feeCcy) ? fee : 0;
    const key = `${f.instId}|${f.ordId}`;
    const o = orders.get(key);
    if (o) { o.qty += sz; o.notional += px * sz; o.feeUsd += feeUsd; o.ts = Math.min(o.ts, ts); o.lastTs = Math.max(o.lastTs, ts); }
    else orders.set(key, { instId: f.instId, side: f.side, qty: sz, notional: px * sz, feeUsd, ts, lastTs: ts });
  }

  const byInst = new Map<string, { ordId: string; o: NonNullable<ReturnType<typeof orders.get>> }[]>();
  for (const [key, o] of orders) {
    const ordId = key.split("|")[1];
    const list = byInst.get(o.instId) ?? [];
    list.push({ ordId, o });
    byInst.set(o.instId, list);
  }

  let openLots = 0;
  for (const [instId, list] of byInst) {
    const p = parseSymbol(instId, "spot");
    if (!USD_QUOTES.has(p.quote)) { for (let i = 0; i < list.length; i++) addSkip(skipped, `spot pairs not quoted in USD (e.g. ${instId}) are not supported yet`); continue; }
    list.sort((a, b) => a.o.ts - b.o.ts || (a.o.side === "buy" ? -1 : 1));
    const lots: Lot[] = [];
    for (const { ordId, o } of list) {
      const px = o.notional / o.qty;
      if (o.side === "buy") { lots.push({ qty: o.qty, px, feeUsd: o.feeUsd, ts: o.ts }); continue; }
      let need = o.qty, cost = 0, matched = 0, buyFees = 0, opened = Infinity;
      while (need > 1e-12 && lots.length) {
        const lot = lots[0];
        const take = Math.min(lot.qty, need);
        const share = take / lot.qty;
        cost += take * lot.px;
        buyFees += lot.feeUsd * share;
        lot.feeUsd -= lot.feeUsd * share;
        lot.qty -= take;
        matched += take;
        need -= take;
        opened = Math.min(opened, lot.ts);
        if (lot.qty <= 1e-12) lots.shift();
      }
      if (matched <= 1e-12) { addSkip(skipped, "spot sells with no matching buy in the last 3 months"); continue; }
      const sellFees = o.feeUsd * (matched / o.qty);
      trades.push({
        symbol: displaySymbol(p.base, p.quote, "spot"),
        assetClass: "crypto",
        side: "long",
        entry: round(cost / matched, 10),
        exit: round(px, 10),
        qty: round(matched),
        fees: round(buyFees + sellFees, 6),
        openedAt: iso(opened),
        closedAt: iso(o.lastTs),
        tags: ["synced", "spot"],
        mistakes: [],
        source: "okx",
        exchange: "okx",
        market: "spot",
        instrument: instId,
        externalId: `okx:SPOT:${ordId}`,
      });
      if (need > 1e-9 * o.qty) addSkip(skipped, "spot sells larger than the coins bought in the last 3 months (partly matched)");
    }
    openLots += lots.length;
  }
  trades.sort((a, b) => a.closedAt.localeCompare(b.closedAt));
  return { trades, skipped, openLots };
}
