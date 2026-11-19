// Minimal signed OKX v5 REST client (server only). Only GET endpoints that read account data are
// used here: nothing in this file can place orders, move funds or withdraw.
import "server-only";
import { createHmac } from "node:crypto";
import type { OkxFillRow, OkxInstrument, OkxPositionRow } from "@/core/okx";
import type { ExchangeCredentials } from "./vault";

export type OkxRegion = "global" | "eea" | "us";
export const OKX_HOSTS: Record<OkxRegion, string> = {
  global: "https://www.okx.com",
  eea: "https://eea.okx.com",
  us: "https://us.okx.com",
};

export class OkxError extends Error {
  constructor(message: string, public code: string, public status = 400) { super(message); }
}

// Friendly text for the errors people actually hit when pasting a key.
const FRIENDLY: Record<string, string> = {
  "50101": "This API key belongs to a different OKX region. Pick the region you signed up in (Global, EEA or US) and try again.",
  "50102": "The server clock and OKX disagree on the time. Please try again in a minute.",
  "50103": "The API key is missing.",
  "50104": "The passphrase is missing.",
  "50105": "The passphrase is wrong. It is the one you typed when you created the API key, not your OKX login password.",
  "50111": "OKX does not recognise this API key. Check you copied all of it.",
  "50113": "The secret key does not match this API key. Copy the secret again.",
  "50114": "OKX rejected the key. Check the key, secret and passphrase.",
  "50110": "This key is locked to specific IP addresses. Edit the key in OKX and remove the IP restriction (read-only keys without an IP lock expire after 14 days of no use, which is fine).",
  "50119": "This API key does not exist. It may have been deleted in OKX.",
  "50120": "This API key has been frozen or expired in OKX. Create a new read-only key.",
  "50011": "OKX is rate limiting us. Wait a minute and press Sync again.",
  "50061": "OKX is rate limiting us. Wait a minute and press Sync again.",
};

// Local testing only: point at a fake OKX server. Ignored in production builds.
const baseUrl = (region: OkxRegion) => (process.env.NODE_ENV !== "production" && process.env.OKX_API_BASE_OVERRIDE) || OKX_HOSTS[region];

export async function okxGet<T>(creds: ExchangeCredentials, region: OkxRegion, pathAndQuery: string, opts: { signed?: boolean } = { signed: true }): Promise<T[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.signed !== false) {
    const ts = new Date().toISOString();
    const sign = createHmac("sha256", creds.secret).update(`${ts}GET${pathAndQuery}`).digest("base64");
    headers["OK-ACCESS-KEY"] = creds.apiKey;
    headers["OK-ACCESS-SIGN"] = sign;
    headers["OK-ACCESS-TIMESTAMP"] = ts;
    headers["OK-ACCESS-PASSPHRASE"] = creds.passphrase ?? "";
  }
  let res: Response;
  try {
    res = await fetch(baseUrl(region) + pathAndQuery, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
  } catch {
    throw new OkxError("Could not reach OKX. Please try again.", "network", 502);
  }
  let body: { code?: string; msg?: string; data?: T[] };
  try { body = await res.json(); } catch { throw new OkxError(`OKX answered with HTTP ${res.status}.`, String(res.status), 502); }
  if (body.code !== "0") {
    const code = String(body.code ?? res.status);
    throw new OkxError(FRIENDLY[code] ?? `OKX error ${code}: ${body.msg || "unknown error"}`, code, res.status === 429 ? 429 : 400);
  }
  return body.data ?? [];
}

export interface OkxAccountConfig { uid: string; mainUid?: string; perm?: string; label?: string; acctLv?: string; posMode?: string }

export async function getAccountConfig(creds: ExchangeCredentials, region: OkxRegion) {
  const [cfg] = await okxGet<OkxAccountConfig>(creds, region, "/api/v5/account/config");
  return cfg;
}

/** Contract sizes for the instruments we saw, so contracts can be turned into coins. Public endpoint. */
export async function getInstruments(region: OkxRegion, instType: "SWAP" | "FUTURES"): Promise<OkxInstrument[]> {
  return okxGet<OkxInstrument>({ apiKey: "", secret: "" }, region, `/api/v5/public/instruments?instType=${instType}`, { signed: false });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Stream = "SWAP" | "FUTURES" | "MARGIN" | "SPOT";
/** Cursor per stream: undefined = start from newest, "" = finished. */
export type Cursors = Partial<Record<Stream, string>>;

/**
 * Pulls history newest-first, page by page, until every stream is finished or the time budget is
 * used up (serverless functions have a short time limit). Returns cursors so the caller can ask
 * for the next batch. OKX keeps 3 months of this history.
 */
export async function fetchHistory(creds: ExchangeCredentials, region: OkxRegion, streams: Stream[], cursors: Cursors, budgetMs = 6000) {
  const started = Date.now();
  const positions: OkxPositionRow[] = [];
  const fills: OkxFillRow[] = [];
  const next: Cursors = { ...cursors };
  for (const stream of streams) {
    while (next[stream] !== "" && Date.now() - started < budgetMs) {
      const after = next[stream] ? `&after=${encodeURIComponent(next[stream]!)}` : "";
      if (stream === "SPOT") {
        const rows = await okxGet<OkxFillRow>(creds, region, `/api/v5/trade/fills-history?instType=SPOT&limit=100${after}`);
        fills.push(...rows);
        next.SPOT = rows.length === 100 ? rows[rows.length - 1].billId ?? "" : "";
      } else {
        const rows = await okxGet<OkxPositionRow>(creds, region, `/api/v5/account/positions-history?instType=${stream}&limit=100${after}`);
        positions.push(...rows);
        next[stream] = rows.length === 100 ? rows[rows.length - 1].uTime : "";
      }
      await sleep(250); // OKX allows 10 requests per 2 seconds on these endpoints
    }
  }
  const done = streams.every((s) => next[s] === "");
  return { positions, fills, cursors: next, done };
}
