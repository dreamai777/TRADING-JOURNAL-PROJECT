"use client";
// Browser side of real OKX sync. The API key goes to our server once, on connect, and is never kept
// in the browser. Sync asks the server for batches of history and imports them into the journal.
import { mapSpotFills, type OkxFillRow, type SyncedTrade } from "@/core/okx";
import type { CryptoMarket } from "@/core/markets";
import { useStore, type Connection } from "./store";

/** Markets real OKX sync can journal today. */
export const OKX_REAL_MARKETS: CryptoMarket[] = ["spot", "perp", "futures", "margin"];

export type OkxRegion = "global" | "eea" | "us";

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `Request failed (${res.status})`), { code: body.code });
  return body as T;
}

export function connectOkx(input: { apiKey: string; secret: string; passphrase: string; label: string; region: OkxRegion }) {
  return call<{ connected: true; label: string; perms: string[] }>("/api/exchanges/okx", { method: "POST", body: JSON.stringify(input) });
}

export function disconnectOkx() {
  return call<{ connected: false }>("/api/exchanges/okx", { method: "DELETE" });
}

export function okxStatus() {
  return call<{ connected: boolean; label?: string; perms?: string[] }>("/api/exchanges/okx", { method: "GET" });
}

export interface SyncOutcome { trades: SyncedTrade[]; skipped: { reason: string; count: number }[]; openSpotLots: number }

/** Pulls the whole 3-month history in batches. Spot buys and sells are paired once all fills are in. */
export async function syncOkx(markets: CryptoMarket[], onProgress?: (batches: number) => void): Promise<SyncOutcome> {
  let cursors: Record<string, string> = {};
  const trades: SyncedTrade[] = [];
  const fills: OkxFillRow[] = [];
  const skipped = new Map<string, number>();
  for (let i = 0; i < 40; i++) {
    const r = await call<{ trades: SyncedTrade[]; spotFills: OkxFillRow[]; skipped: { reason: string; count: number }[]; cursors: Record<string, string>; done: boolean }>(
      "/api/exchanges/okx/sync", { method: "POST", body: JSON.stringify({ markets, cursors }) });
    trades.push(...r.trades);
    fills.push(...r.spotFills);
    for (const s of r.skipped) skipped.set(s.reason, (skipped.get(s.reason) ?? 0) + s.count);
    cursors = r.cursors;
    onProgress?.(i + 1);
    if (r.done) break;
  }
  let openSpotLots = 0;
  if (fills.length) {
    const spot = mapSpotFills(fills);
    trades.push(...spot.trades);
    for (const s of spot.skipped) skipped.set(s.reason, (skipped.get(s.reason) ?? 0) + s.count);
    openSpotLots = spot.openLots;
  }
  return { trades, skipped: [...skipped].map(([reason, count]) => ({ reason, count })), openSpotLots };
}

function summary(name: string, added: number, out: SyncOutcome) {
  const parts = [`${name}: ${added} new trade${added === 1 ? "" : "s"} imported${out.trades.length > added ? ` (${out.trades.length - added} already in your journal)` : ""}.`];
  if (out.openSpotLots) parts.push(`${out.openSpotLots} spot buy${out.openSpotLots === 1 ? " is" : "s are"} still open and will appear once sold.`);
  for (const s of out.skipped) parts.push(`Skipped ${s.count}: ${s.reason}.`);
  return parts.join(" ");
}

/** Syncs and merges into the journal. Returns a plain-English summary. */
export async function runOkxSync(c: Pick<Connection, "markets" | "label" | "mode">) {
  const out = await syncOkx((c.markets ?? ["spot", "perp"]).filter((m) => OKX_REAL_MARKETS.includes(m)));
  const added = useStore.getState().mergeSynced("okx", out.trades, { label: c.label, mode: c.mode, markets: c.markets });
  return summary("OKX", added, out);
}

let autoRunning = false;
/** Called when the app opens: re-syncs a live OKX connection set to Auto once it is due (daily on Free, every 15 min on paid plans). */
export async function autoSyncOkxIfDue(paid: boolean) {
  const s = useStore.getState();
  const c = s.connections.find((x) => x.userId === s.sessionUserId && x.exchange === "okx" && x.live && x.mode !== "manual");
  if (!c || autoRunning) return;
  const every = paid ? 15 * 60_000 : 24 * 3_600_000;
  if (Date.now() - new Date(c.lastSync).getTime() < every) return;
  autoRunning = true;
  try { await runOkxSync(c); } catch { /* a failed background sync waits for the next one or Sync now */ } finally { autoRunning = false; }
}
