// "One snap" natural-language trade parser.
// e.g. "btc long 90100 -> 91550 0.2 sl 89600 orb calm"  |  "short NQ 20950 20890 x2 stop 20975"
import { guessAssetClass } from "./csv";
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
}

const SYMBOL_ALIASES: Record<string, string> = { btc: "BTCUSDT", eth: "ETHUSDT", sol: "SOLUSDT", gold: "XAUUSD", xau: "XAUUSD", eu: "EURUSD", gu: "GBPUSD" };
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
    else if (/^(sl|stop|stoploss)$/.test(tk) && tokens[i + 1] && !isNaN(+tokens[i + 1])) {
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
