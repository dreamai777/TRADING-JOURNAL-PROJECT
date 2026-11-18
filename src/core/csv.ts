// Broker-agnostic CSV mapping. Accepts common column names from exchanges/brokers.
import { uid } from "./random";
import type { AssetClass, Trade } from "./types";

const ALIASES: Record<string, string[]> = {
  symbol: ["symbol", "instrument", "pair", "ticker", "market", "contract"],
  side: ["side", "direction", "type", "position"],
  entry: ["entry", "entry price", "entry_price", "open price", "open_price", "avg entry", "avgentryprice", "buy price"],
  exit: ["exit", "exit price", "exit_price", "close price", "close_price", "avg exit", "avgexitprice", "sell price"],
  qty: ["qty", "quantity", "size", "amount", "volume", "contracts", "lots"],
  fees: ["fees", "fee", "commission", "commissions"],
  openedAt: ["opened", "open time", "open_time", "entry time", "entry_time", "opened at", "date", "time"],
  closedAt: ["closed", "close time", "close_time", "exit time", "exit_time", "closed at"],
  stopLoss: ["stop", "stop loss", "stop_loss", "sl"],
  notes: ["notes", "note", "comment"],
};

export function mapCsvRows(rows: Record<string, string>[], userId: string): { trades: Trade[]; errors: string[] } {
  const errors: string[] = [];
  const trades: Trade[] = [];
  if (!rows.length) return { trades, errors: ["File is empty"] };
  const headers = Object.keys(rows[0]);
  const col: Record<string, string | undefined> = {};
  for (const [field, names] of Object.entries(ALIASES)) {
    col[field] = headers.find((h) => names.includes(h.trim().toLowerCase()));
  }
  for (const req of ["symbol", "side", "entry", "exit", "qty"]) {
    if (!col[req]) errors.push(`Missing column for "${req}"`);
  }
  if (errors.length) return { trades, errors };
  rows.forEach((r, i) => {
    const get = (f: string) => (col[f] ? r[col[f] as string]?.trim() : undefined);
    const num = (f: string) => {
      const v = get(f);
      return v == null || v === "" ? undefined : Number(v.replace(/[^0-9.\-eE]/g, ""));
    };
    const sideRaw = (get("side") ?? "").toLowerCase();
    const side = /sell|short/.test(sideRaw) ? "short" : "long";
    const entry = num("entry");
    const exit = num("exit");
    const qty = num("qty");
    if (!entry || !exit || !qty || Number.isNaN(entry + exit + qty)) {
      errors.push(`Row ${i + 2}: invalid price/qty`);
      return;
    }
    const opened = parseDate(get("openedAt")) ?? new Date();
    const closed = parseDate(get("closedAt")) ?? opened;
    const symbol = (get("symbol") ?? "UNKNOWN").toUpperCase();
    trades.push({
      id: uid("t"),
      userId,
      symbol,
      assetClass: guessAssetClass(symbol),
      side,
      entry,
      exit,
      qty: Math.abs(qty),
      fees: Math.abs(num("fees") ?? 0),
      stopLoss: num("stopLoss"),
      openedAt: opened.toISOString(),
      closedAt: closed.toISOString(),
      tags: ["imported"],
      mistakes: [],
      notes: get("notes"),
      source: "csv",
    });
  });
  return { trades, errors };
}

function parseDate(v?: string) {
  if (!v) return undefined;
  const n = Number(v);
  const d = !Number.isNaN(n) && n > 1e9 ? new Date(n > 1e12 ? n : n * 1000) : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function guessAssetClass(symbol: string): AssetClass {
  const s = symbol.toUpperCase();
  if (/USDT|USDC|PERP|BTC|ETH|SOL/.test(s)) return "crypto";
  if (/^(EUR|GBP|AUD|NZD|USD|CAD|CHF|JPY|XAU|XAG)[A-Z]{3}$/.test(s)) return "forex";
  if (/^(ES|NQ|YM|RTY|CL|GC|MES|MNQ|ZB|ZN)([FGHJKMNQUVXZ]\d{1,2})?$/.test(s)) return "futures";
  if (/\d+(C|P)$|CALL|PUT/.test(s)) return "options";
  return "equities";
}

export const CSV_TEMPLATE = `symbol,side,entry_price,exit_price,quantity,fees,open_time,close_time,stop_loss,notes
BTCUSDT,long,90250,91480,0.05,3.6,2026-11-10T14:05:00Z,2026-11-10T16:40:00Z,89700,Breakout retest
EURUSD,short,1.0855,1.0821,20000,4,2026-11-11T08:30:00Z,2026-11-11T10:10:00Z,1.0875,London open fade
`;
