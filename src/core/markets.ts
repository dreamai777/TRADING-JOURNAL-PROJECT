// Crypto market types and exchange symbol formats.
// One trade journal shows every exchange's instruments in one consistent style (the TradingView
// convention): spot "SOLUSDT", perpetual "SOLUSDT.P", dated futures "BTCUSDT 27 Mar 26", while keeping
// the exchange's own instrument id (e.g. OKX "SOL-USDT-SWAP") for syncing and matching fills.

export type ExchangeId = "binance" | "okx" | "bitget" | "bybit";
export type CryptoMarket = "spot" | "perp" | "futures" | "margin" | "grid" | "dca" | "copy" | "options";
export type JournalMode = "manual" | "import" | "auto";

export interface MarketInfo {
  id: CryptoMarket;
  name: string;
  short: string;
  color: string;
  desc: string;
  leverage: boolean;
  funding: boolean;
  /** Available on the Free plan. Others need Premium or Ultra. */
  free: boolean;
}

export const MARKETS: Record<CryptoMarket, MarketInfo> = {
  spot: { id: "spot", name: "Spot", short: "SPOT", color: "#38d9f5", desc: "Buy and hold the coin itself. No leverage, no funding.", leverage: false, funding: false, free: true },
  perp: { id: "perp", name: "Perpetual futures", short: "PERP", color: "#c8f53b", desc: "Futures with no expiry, shown with a .P suffix. Leverage and funding payments.", leverage: true, funding: true, free: true },
  futures: { id: "futures", name: "Dated futures", short: "FUT", color: "#fb923c", desc: "Quarterly or monthly delivery futures with an expiry date.", leverage: true, funding: false, free: false },
  margin: { id: "margin", name: "Margin", short: "MARGIN", color: "#a78bfa", desc: "Spot traded with borrowed funds, cross or isolated. Pays borrow interest.", leverage: true, funding: false, free: false },
  grid: { id: "grid", name: "Grid bot", short: "GRID", color: "#2fe39a", desc: "A bot that buys low and sells high inside a price range. Journaled per bot run.", leverage: false, funding: false, free: false },
  dca: { id: "dca", name: "DCA bot", short: "DCA", color: "#60a5fa", desc: "Recurring or smart DCA buys, journaled as one position per cycle.", leverage: false, funding: false, free: false },
  copy: { id: "copy", name: "Copy trading", short: "COPY", color: "#e879f9", desc: "Trades opened by a lead trader you follow. Tracked separately from your own.", leverage: true, funding: true, free: false },
  options: { id: "options", name: "Options", short: "OPT", color: "#fbbf24", desc: "Crypto calls and puts with strike and expiry.", leverage: false, funding: false, free: false },
};
export const MARKET_IDS = Object.keys(MARKETS) as CryptoMarket[];

export interface ExchangeInfo {
  id: ExchangeId;
  name: string;
  mark: string;
  color: string;
  passphrase: boolean;
  markets: CryptoMarket[];
  /** The exchange's own instrument id for SOL/USDT in each market, as an example. */
  examples: Partial<Record<CryptoMarket, string>>;
}

export const EXCHANGES: ExchangeInfo[] = [
  { id: "binance", name: "Binance", mark: "B", color: "#f0b90b", passphrase: false, markets: ["spot", "perp", "futures", "margin", "grid", "dca", "copy", "options"], examples: { spot: "SOLUSDT", perp: "SOLUSDT (USDⓈ-M)", futures: "BTCUSDT_260327", margin: "SOLUSDT (cross)" } },
  { id: "okx", name: "OKX", mark: "O", color: "#e8eef5", passphrase: true, markets: ["spot", "perp", "futures", "margin", "grid", "dca", "copy", "options"], examples: { spot: "SOL-USDT", perp: "SOL-USDT-SWAP", futures: "BTC-USDT-260327", options: "BTC-USD-260327-100000-C" } },
  { id: "bitget", name: "Bitget", mark: "Bg", color: "#00f0ff", passphrase: true, markets: ["spot", "perp", "futures", "margin", "grid", "dca", "copy"], examples: { spot: "SOLUSDT", perp: "SOLUSDT (USDT-M)" } },
  { id: "bybit", name: "Bybit", mark: "By", color: "#f7a600", passphrase: false, markets: ["spot", "perp", "futures", "margin", "grid", "dca", "copy", "options"], examples: { spot: "SOLUSDT", perp: "SOLUSDT (linear)" } },
];
export const EXCHANGE_BY_ID = Object.fromEntries(EXCHANGES.map((e) => [e.id, e])) as Record<ExchangeId, ExchangeInfo>;

const QUOTES = ["USDT", "USDC", "FDUSD", "BUSD", "USD", "BTC", "ETH", "EUR"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export interface ParsedSymbol {
  base: string;
  quote: string;
  market: CryptoMarket;
  /** YYYY-MM-DD for dated futures and options. */
  expiry?: string;
  display: string;
}

function splitPair(s: string): { base: string; quote: string } {
  const q = QUOTES.find((x) => s.endsWith(x) && s.length > x.length);
  return q ? { base: s.slice(0, -q.length), quote: q } : { base: s, quote: "USDT" };
}

const yymmdd = (v: string) => `20${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 6)}`;

/** Unified display: spot SOLUSDT, perp SOLUSDT.P, futures BTCUSDT 27 Mar 26, bots "SOLUSDT · Grid". */
export function displaySymbol(base: string, quote: string, market: CryptoMarket, expiry?: string): string {
  const pair = `${base}${quote}`;
  switch (market) {
    case "perp": return `${pair}.P`;
    case "futures": case "options": {
      if (!expiry) return pair;
      const [y, m, d] = expiry.split("-");
      return `${pair} ${+d} ${MONTHS[+m - 1][0]}${MONTHS[+m - 1].slice(1).toLowerCase()} ${y.slice(2)}`;
    }
    case "grid": return `${pair} · Grid`;
    case "dca": return `${pair} · DCA`;
    case "copy": return `${pair}.P · Copy`;
    case "margin": return `${pair} · Margin`;
    default: return pair;
  }
}

/**
 * Reads any common symbol format and works out the market:
 * "SOLUSDT.P", "SOL-USDT-SWAP", "SOLUSDT_PERP", "SOLUSD_PERP", "SOLUSDT_UMCBL", "BTCUSDT_260327",
 * "BTC-USDT-260327", "SOL-USDT", "SOL/USDT", "SOL/USDT:USDT" (CCXT swap), "SOLUSDT".
 * A bare "SOLUSDT" is spot unless `hint` says otherwise (e.g. it came from a futures account).
 */
export function parseSymbol(raw: string, hint?: CryptoMarket): ParsedSymbol {
  // Drop our own display suffixes ("SOLUSDT · Grid") and spaced expiries ("BTCUSDT 27 Mar 26").
  let s = raw.trim().toUpperCase().replace(/\s*·.*$/, "").replace(/\s+\d{1,2}\s+[A-Z]{3}\s+\d{2}$/, "").replace(/\s+/g, "");
  let market: CryptoMarket | undefined;
  let expiry: string | undefined;
  if (/\.P$/.test(s)) { market = "perp"; s = s.slice(0, -2); }
  else if (/-SWAP$/.test(s)) { market = "perp"; s = s.replace(/-SWAP$/, ""); }
  else if (/_(PERP|UMCBL|DMCBL|CMCBL)$/.test(s)) { market = "perp"; s = s.replace(/_(PERP|UMCBL|DMCBL|CMCBL)$/, ""); }
  else if (/:[A-Z]+$/.test(s)) { // CCXT: SOL/USDT:USDT (swap) or BTC/USDT:USDT-260327 (future)
    const m = s.match(/:([A-Z]+)(?:-(\d{6}))?$/)!;
    market = m[2] ? "futures" : "perp"; if (m[2]) expiry = yymmdd(m[2]);
    s = s.replace(/:[A-Z]+(-\d{6})?$/, "");
  } else {
    const fut = s.match(/[-_](\d{6})$/);
    if (fut) { market = "futures"; expiry = yymmdd(fut[1]); s = s.replace(/[-_]\d{6}$/, ""); }
  }
  const parts = s.split(/[-/]/);
  const { base, quote } = parts.length >= 2 ? { base: parts[0], quote: parts[1] } : splitPair(s);
  const mk = market ?? hint ?? "spot";
  return { base, quote, market: mk, expiry, display: displaySymbol(base, quote, mk, expiry) };
}

/** The exchange's own instrument id for a market, used when talking to its API. */
export function exchangeSymbol(ex: ExchangeId, base: string, quote: string, market: CryptoMarket, expiry?: string): string {
  const e6 = expiry ? expiry.slice(2).replace(/-/g, "") : "";
  if (ex === "okx") {
    if (market === "perp" || market === "copy") return `${base}-${quote}-SWAP`;
    if (market === "futures") return `${base}-${quote}-${e6}`;
    return `${base}-${quote}`;
  }
  if (market === "futures" && e6) return `${base}${quote}_${e6}`;
  return `${base}${quote}`;
}

/** Leverage like "10x" or "x10" in free text. */
export function parseLeverage(text: string): number | undefined {
  const m = text.toLowerCase().match(/(?:^|\s)(\d{1,3})x(?:\s|$)/);
  const v = m ? +m[1] : NaN;
  return v >= 1 && v <= 200 ? v : undefined;
}

export const modeOf = (source: string): JournalMode => (source === "manual" ? "manual" : source === "csv" ? "import" : source === "demo" ? "manual" : "auto");
export const MODE_LABEL: Record<JournalMode, string> = { manual: "Manual", import: "CSV import", auto: "Auto-sync" };
