// "One snap" natural-language trade parser.
// e.g. "btc long 90100 -> 91550 0.2 sl 89600 orb calm"  |  "short NQ 20950 20890 x2 stop 20975"
import { guessAssetClass } from "./csv";
import { parseSymbol, type CryptoMarket } from "./markets";
import type { Emotion, Side } from "./types";

export interface QuickParse {
  symbol?: string;
  side?: Side;
  entry?: number;
  exit?: number;
  qty?: number;
  stopLoss?: number;
  emotion?: Emotion;
  setupHint?: string;
  /** Crypto market type, from words like "perp", "spot", "grid" or a symbol like "SOLUSDT.P". */
  market?: CryptoMarket;
  leverage?: number;
}

const SYMBOL_ALIASES: Record<string, string> = { btc: "BTCUSDT", eth: "ETHUSDT", sol: "SOLUSDT", ray: "RAYUSDT", bnb: "BNBUSDT", xrp: "XRPUSDT", doge: "DOGEUSDT", ada: "ADAUSDT", avax: "AVAXUSDT", link: "LINKUSDT", sui: "SUIUSDT", pepe: "PEPEUSDT", wif: "WIFUSDT", ton: "TONUSDT", gold: "XAUUSD", xau: "XAUUSD", eu: "EURUSD", gu: "GBPUSD" };
const MARKET_WORDS: Record<string, CryptoMarket> = { perp: "perp", perps: "perp", perpetual: "perp", swap: "perp", spot: "spot", futures: "futures", future: "futures", fut: "futures", margin: "margin", grid: "grid", dca: "dca", copy: "copy", options: "options", option: "options" };
const EMOTIONS: Emotion[] = ["calm", "confident", "focused", "fomo", "fearful", "greedy", "revenge", "bored", "tired"];

export function parseQuick(text: string, setupNames: { id: string; name: string }[] = []): QuickParse {
  const out: QuickParse = {};
  const lower = text.toLowerCase();
  const tokens = lower.replace(/->|→|@/g, " ").split(/[\s,]+/).filter((t) => t && t !== "to");
  const nums: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (/^(long|buy|bought|l)$/.test(tk)) out.side = "long";
    else if (/^(short|sell|sold|s)$/.test(tk)) out.side = "short";
    else if (MARKET_WORDS[tk]) out.market = MARKET_WORDS[tk];
    else if (/^\d{1,3}x$/.test(tk) && +tk.slice(0, -1) >= 1 && +tk.slice(0, -1) <= 200) out.leverage = +tk.slice(0, -1);
    else if (!out.symbol && /^[a-z0-9]{2,12}([./:_-][a-z0-9:_-]+)+$/.test(tk) && /[a-z]/.test(tk) && !/^\d+(\.\d+)?k$/.test(tk)) {
      // Exchange-style symbols: solusdt.p, sol-usdt-swap, sol/usdt, btcusdt_260327
      const raw = SYMBOL_ALIASES[tk.split(/[./:_-]/)[0]] && /\.p$/.test(tk) ? SYMBOL_ALIASES[tk.split(".")[0]] + ".P" : tk;
      const ps = parseSymbol(raw);
      out.symbol = `${ps.base}${ps.quote}`;
      if (ps.market !== "spot") out.market = ps.market;
    } else if (/^(sl|stop|stoploss)$/.test(tk) && tokens[i + 1] && !isNaN(+tokens[i + 1])) {
      out.stopLoss = +tokens[++i];
    } else if (/^x\d+(\.\d+)?$/.test(tk)) out.qty = +tk.slice(1);
    else if (/^(qty|size)$/.test(tk) && tokens[i + 1]) out.qty = +tokens[++i];
    else if (!isNaN(+tk.replace(/k$/, "")) && tk !== "") nums.push(tk.endsWith("k") ? +tk.slice(0, -1) * 1000 : +tk);
    else if (EMOTIONS.includes(tk as Emotion)) out.emotion = tk as Emotion;
    else if (!out.symbol && /^[a-z]{2,10}[0-9a-z]*$/.test(tk) && !["sl", "stop", "x"].includes(tk)) {
      const s = SYMBOL_ALIASES[tk] ?? tk.toUpperCase();
      // only accept as a symbol if it looks like one
      if (SYMBOL_ALIASES[tk] || guessAssetClass(s) !== "equities" || /^[a-z]{1,5}$/.test(tk)) {
        const isSetup = setupNames.find((n) => n.name.toLowerCase().includes(tk) || initials(n.name) === tk);
        if (isSetup && !SYMBOL_ALIASES[tk]) out.setupHint = isSetup.id;
        else out.symbol = s;
      }
    } else {
      const isSetup = setupNames.find((n) => n.name.toLowerCase().includes(tk) || initials(n.name) === tk);
      if (isSetup) out.setupHint = isSetup.id;
    }
  }
  if (nums[0] != null) out.entry = nums[0];
  if (nums[1] != null) out.exit = nums[1];
  if (nums[2] != null && out.qty == null) out.qty = nums[2];
  return out;
}

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toLowerCase();
}
