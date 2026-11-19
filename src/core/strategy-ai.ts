// AI side of the Strategy Builder. Two providers share one interface:
//  - localStrategyAI: an offline rule-based drafter, so the prototype works with no API key.
//  - the Claude provider (src/app/api/strategy-ai/route.ts) returns the same StrategySpec shape,
//    grounded in the trader's own journal stats.
// The critic below is deterministic on purpose: its fixes are spec patches the user can apply in one click.
import { conditionLabel, sanitizeSpec, type Condition, type Robustness, type StrategySpec } from "./strategy";
import type { AssetClass, JobClass, WeaponClass } from "./types";

/** What the AI is told about the trader so drafts fit them, not a generic textbook. */
export interface TraderContext {
  jobClass?: JobClass;
  winRate?: number;
  profitFactor?: number;
  avgHoldMinutes?: number;
  bestSetup?: string;
  topMistake?: string;
  markets?: AssetClass[];
}

export interface DraftResult {
  spec: StrategySpec;
  notes: string[];
  source: "claude" | "local";
}

export interface StrategyAIProvider {
  draft(prompt: string, ctx: TraderContext): Promise<DraftResult>;
}

const c = (l: Condition["left"], op: Condition["op"], r: Condition["right"]): Condition => ({ left: l, op, right: r });
const P = { ind: "price" as const };

export const TEMPLATES: { id: string; label: string; prompt: string; spec: Omit<StrategySpec, "id"> }[] = [
  {
    id: "trend-pullback", label: "Trend pullback", prompt: "Buy pullbacks in an uptrend: price above the 200 SMA, enter when RSI(3) dips under 25, exit when RSI recovers above 65, 2.5 ATR stop.",
    spec: { name: "Trend Pullback", icon: "🏹", weaponClass: "Trend", description: "Buy short dips inside a long uptrend.", side: "long", timeframe: "1D", markets: ["equities", "futures", "crypto"], entry: [c(P, "above", { ind: "sma", len: 200 }), c({ ind: "rsi", len: 3 }, "below", { ind: "value", value: 25 })], exit: [c({ ind: "rsi", len: 3 }, "above", { ind: "value", value: 65 })], stop: { type: "atr", value: 2.5 }, targetR: 0, maxBars: 15, riskPct: 1 },
  },
  {
    id: "donchian", label: "Breakout", prompt: "Donchian breakout: buy when price breaks the 20-day high, exit on a 10-day low, 3 ATR stop.",
    spec: { name: "Donchian Breakout", icon: "🗡️", weaponClass: "Breakout", description: "Ride new highs, cut on new lows.", side: "long", timeframe: "1D", markets: ["crypto", "futures"], entry: [c(P, "crossAbove", { ind: "highest", len: 20 })], exit: [c(P, "crossBelow", { ind: "lowest", len: 10 })], stop: { type: "atr", value: 3 }, targetR: 0, maxBars: 0, riskPct: 1 },
  },
  {
    id: "ema-cross", label: "EMA cross", prompt: "Go long when the 21 EMA crosses above the 55 EMA, exit when it crosses back below. Target 3R.",
    spec: { name: "EMA Cross Rider", icon: "🔱", weaponClass: "Trend", description: "Classic momentum regime switch.", side: "long", timeframe: "4H", markets: ["crypto", "forex"], entry: [c({ ind: "ema", len: 21 }, "crossAbove", { ind: "ema", len: 55 })], exit: [c({ ind: "ema", len: 21 }, "crossBelow", { ind: "ema", len: 55 })], stop: { type: "atr", value: 2 }, targetR: 3, maxBars: 0, riskPct: 1 },
  },
  {
    id: "bb-fade", label: "Band fade", prompt: "Fade stretched moves: buy when price closes below the lower Bollinger band, exit back at the 20 SMA, 2R target, 10 bar time stop.",
    spec: { name: "Band Snapback", icon: "🪃", weaponClass: "Reversal", description: "Mean reversion from the lower band.", side: "long", timeframe: "1H", markets: ["forex", "equities"], entry: [c(P, "crossBelow", { ind: "bbLower", len: 20 })], exit: [c(P, "crossAbove", { ind: "sma", len: 20 })], stop: { type: "atr", value: 1.5 }, targetR: 2, maxBars: 10, riskPct: 0.75 },
  },
  {
    id: "short-breakdown", label: "Short breakdown", prompt: "Short breakdowns: sell short when price breaks the 20-bar low while below the 100 SMA, cover on a 10-bar high.",
    spec: { name: "Breakdown Hunter", icon: "🦂", weaponClass: "Breakout", description: "Short new lows in downtrends.", side: "short", timeframe: "1D", markets: ["crypto", "equities"], entry: [c(P, "crossBelow", { ind: "lowest", len: 20 }), c(P, "below", { ind: "sma", len: 100 })], exit: [c(P, "crossAbove", { ind: "highest", len: 10 })], stop: { type: "atr", value: 2.5 }, targetR: 0, maxBars: 0, riskPct: 1 },
  },
  {
    id: "scalp", label: "Scalp", prompt: "Quick scalp: buy when RSI(2) drops below 10 above the 50 EMA, 1.5R target, out within 5 bars.",
    spec: { name: "Sniper Scalp", icon: "🎯", weaponClass: "Scalp", description: "Fast in, fast out on deep micro-dips.", side: "long", timeframe: "5m", markets: ["crypto", "futures"], entry: [c(P, "above", { ind: "ema", len: 50 }), c({ ind: "rsi", len: 2 }, "below", { ind: "value", value: 10 })], exit: [c({ ind: "rsi", len: 2 }, "above", { ind: "value", value: 70 })], stop: { type: "atr", value: 1 }, targetR: 1.5, maxBars: 5, riskPct: 0.5 },
  },
];

/** Starting template by hero class, so a Sniper gets a scalp and a Defender gets a low-risk pullback. */
export const CLASS_TEMPLATE: Record<JobClass, string> = {
  wizard: "ema-cross", warrior: "donchian", assassin: "short-breakdown", archer: "trend-pullback", defender: "trend-pullback", sniper: "scalp",
};

const num = (s: string, re: RegExp) => {
  const m = s.match(re);
  return m ? Number(m[1]) : undefined;
};

/** Offline drafter: picks the closest template, then applies every number and keyword it can read. */
export function draftLocally(prompt: string, ctx: TraderContext = {}): DraftResult {
  const p = prompt.toLowerCase();
  const notes: string[] = [];
  let base = TEMPLATES.find((t) => t.id === (ctx.jobClass ? CLASS_TEMPLATE[ctx.jobClass] : "trend-pullback"))!;
  if (/scalp|quick|1m|5m/.test(p)) base = TEMPLATES.find((t) => t.id === "scalp")!;
  else if (/short|breakdown|bear/.test(p)) base = TEMPLATES.find((t) => t.id === "short-breakdown")!;
  else if (/bollinger|band|fade|mean.?revers|revert/.test(p)) base = TEMPLATES.find((t) => t.id === "bb-fade")!;
  else if (/ema|moving average|cross/.test(p)) base = TEMPLATES.find((t) => t.id === "ema-cross")!;
  else if (/breakout|donchian|new high|range high/.test(p)) base = TEMPLATES.find((t) => t.id === "donchian")!;
  else if (/pullback|dip|rsi/.test(p)) base = TEMPLATES.find((t) => t.id === "trend-pullback")!;
  const spec: StrategySpec = structuredClone({ ...base.spec, id: "draft" });
  notes.push(`Started from the ${base.label} blueprint${ctx.jobClass && base.id === CLASS_TEMPLATE[ctx.jobClass] ? `, the natural fit for your ${ctx.jobClass} class` : ""}.`);

  const rsiLen = num(p, /rsi\s*\(?(\d{1,2})\)?/);
  if (rsiLen) for (const cond of [...spec.entry, ...spec.exit]) if (cond.left.ind === "rsi") cond.left.len = rsiLen;
  const under = num(p, /(?:under|below|<)\s*(\d{1,2})/);
  if (under !== undefined) for (const cond of spec.entry) if (cond.left.ind === "rsi" && cond.right.ind === "value") cond.right.value = under;
  const over = num(p, /(?:above|over|>)\s*(\d{2})(?!\s*(?:sma|ema|ma|day|bar))/);
  if (over !== undefined && over <= 95) for (const cond of spec.exit) if (cond.left.ind === "rsi" && cond.right.ind === "value") cond.right.value = over;
  const hi = num(p, /(\d{1,3})[- ]?(?:day|bar|period)?\s*high/);
  if (hi) for (const cond of spec.entry) if (cond.right.ind === "highest") cond.right.len = hi;
  const lo = num(p, /(\d{1,3})[- ]?(?:day|bar|period)?\s*low/);
  if (lo) for (const cond of [...spec.entry, ...spec.exit]) if (cond.right.ind === "lowest") cond.right.len = lo;
  const emas = [...p.matchAll(/(\d{1,3})\s*ema/g)].map((m) => Number(m[1]));
  if (emas.length >= 2) for (const cond of [...spec.entry, ...spec.exit]) if (cond.left.ind === "ema" && cond.right.ind === "ema") { cond.left.len = Math.min(...emas); cond.right.len = Math.max(...emas); }
  const smaLen = num(p, /(\d{2,3})\s*(?:sma|ma\b|day ma)/);
  if (smaLen) for (const cond of spec.entry) if (cond.right.ind === "sma") cond.right.len = smaLen;
  const atrStop = num(p, /(\d+(?:\.\d+)?)\s*(?:x\s*)?atr/);
  if (atrStop) spec.stop = { type: "atr", value: atrStop };
  const pctStop = num(p, /(\d+(?:\.\d+)?)\s*%\s*stop/);
  if (pctStop) spec.stop = { type: "pct", value: pctStop };
  const target = num(p, /(\d+(?:\.\d+)?)\s*r\b/);
  if (target) spec.targetR = target;
  const risk = num(p, /risk\s*(\d+(?:\.\d+)?)\s*%/);
  if (risk) spec.riskPct = risk;
  const bars = num(p, /(?:within|after)\s*(\d{1,3})\s*bars?/);
  if (bars) spec.maxBars = bars;

  const markets: AssetClass[] = [];
  if (/crypto|btc|eth|sol|bitcoin/.test(p)) markets.push("crypto");
  if (/forex|fx|eur|usd|jpy/.test(p)) markets.push("forex");
  if (/futures|es\b|nq\b|cme/.test(p)) markets.push("futures");
  if (/stock|equit|spy|qqq/.test(p)) markets.push("equities");
  if (/option/.test(p)) markets.push("options");
  if (markets.length) spec.markets = markets;
  else if (ctx.markets?.length) spec.markets = ctx.markets.slice(0, 3);

  // Journal-aware guard rails.
  if (ctx.topMistake === "oversized" && spec.riskPct > 0.75) {
    spec.riskPct = 0.75;
    notes.push("Your journal's costliest mistake is oversizing, so risk is capped at 0.75% per trade.");
  }
  if (ctx.winRate !== undefined && ctx.winRate < 0.45 && spec.targetR === 0) {
    spec.targetR = 2.5;
    notes.push(`You win ${Math.round(ctx.winRate * 100)}% of the time, so a fixed 2.5R target keeps the payoff ratio on your side.`);
  }
  if (ctx.bestSetup) notes.push(`Your best live weapon is “${ctx.bestSetup}”. Compare this draft's grade against it before you trade it.`);
  return { spec: sanitizeSpec(spec, "draft"), notes, source: "local" };
}

export const localStrategyAI: StrategyAIProvider = {
  async draft(prompt, ctx) {
    return draftLocally(prompt, ctx);
  },
};

/** Calls the Claude route; falls back to the offline drafter when no key is configured or the call fails. */
export const remoteStrategyAI = (endpoint = "/api/strategy-ai"): StrategyAIProvider => ({
  async draft(prompt, ctx) {
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, ctx }) });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { spec: StrategySpec; notes: string[] };
      return { spec: sanitizeSpec(json.spec, "draft"), notes: json.notes ?? [], source: "claude" };
    } catch {
      return draftLocally(prompt, ctx);
    }
  },
});

// ---------- Critic ----------

export interface Suggestion {
  id: string;
  tone: "good" | "warn" | "bad";
  title: string;
  body: string;
  /** One-click fix. */
  patch?: Partial<StrategySpec>;
  fixLabel?: string;
}

export function critique(spec: StrategySpec, rob: Robustness): Suggestion[] {
  const out: Suggestion[] = [];
  const check = (id: string) => rob.checks.find((x) => x.id === id)!;
  const main = rob.perAsset.find((r) => r.asset === (spec.markets[0] ?? "crypto"))!;
  const hasTrendFilter = spec.entry.some((x) => (x.right.ind === "sma" || x.right.ind === "ema") && (x.right.len ?? 0) >= 100);

  if (!spec.entry.length) return [{ id: "empty", tone: "bad", title: "No entry rules", body: "Add at least one entry condition, or describe your idea and let the AI draft it." }];
  if (main.trades.length < 30) {
    const looser = structuredClone(spec);
    for (const x of looser.entry) {
      if (x.right.ind === "value" && x.left.ind === "rsi") x.right.value = Math.min(50, (x.right.value ?? 20) + 10);
      if (x.right.ind === "highest" || x.right.ind === "lowest") x.right.len = Math.max(5, Math.round((x.right.len ?? 20) * 0.6));
    }
    out.push({ id: "few", tone: "warn", title: "Too few trades to trust", body: `Only ${main.trades.length} trades. Loosen the trigger so the stats mean something.`, patch: { entry: looser.entry }, fixLabel: "Loosen entry" });
  }
  if (!check("oos").pass && !hasTrendFilter && spec.side === "long") {
    out.push({ id: "trend", tone: "bad", title: "Edge fades out of sample", body: "Most failing long systems are buying in downtrends. A 200 SMA regime filter usually rescues the out-of-sample half.", patch: { entry: [...spec.entry, { left: { ind: "price" }, op: "above", right: { ind: "sma", len: 200 } }] }, fixLabel: "Add 200 SMA filter" });
  }
  if (!check("mc").pass) {
    out.push({ id: "risk", tone: "bad", title: "Drawdown can get ugly", body: `The worst 5% of reshuffles drew down ${rob.mcDd95.toFixed(0)}%. Halving risk roughly halves that.`, patch: { riskPct: Math.max(0.25, +(spec.riskPct / 2).toFixed(2)) }, fixLabel: `Risk ${Math.max(0.25, +(spec.riskPct / 2).toFixed(2))}%` });
  }
  if (main.winRate < 0.4 && spec.targetR === 0) {
    out.push({ id: "target", tone: "warn", title: "Low win rate, no target", body: `Win rate is ${Math.round(main.winRate * 100)}%. A fixed 3R target locks in the big winners that pay for the losers.`, patch: { targetR: 3 }, fixLabel: "Add 3R target" });
  }
  if (main.winRate > 0.6 && main.avgR < 0.1) {
    out.push({ id: "payoff", tone: "warn", title: "Wins small, loses big", body: "High win rate but tiny expectancy. Your stop is too wide for the target. Tighten it.", patch: { stop: { ...spec.stop, value: +(spec.stop.value * 0.7).toFixed(2) } }, fixLabel: "Tighten stop 30%" });
  }
  if (!check("params").pass) {
    out.push({ id: "fragile", tone: "warn", title: "Fragile parameters", body: "Moving a lookback by 20% breaks the edge. Prefer round, widely used lengths (10, 20, 50, 100, 200)." });
  }
  if (!check("markets").pass) {
    const best = [...rob.perAsset].sort((a, b) => b.profitFactor - a.profitFactor)[0];
    out.push({ id: "market", tone: "warn", title: "Works in few markets", body: `Strongest on ${best.asset} (PF ${best.profitFactor.toFixed(2)}). Specialise there, or treat other markets as untested.`, patch: { markets: [best.asset] }, fixLabel: `Focus on ${best.asset}` });
  }
  if (spec.maxBars === 0 && main.trades.length && main.trades.reduce((a, t) => a + t.bars, 0) / main.trades.length > 40) {
    out.push({ id: "time", tone: "warn", title: "Capital sits idle", body: "Average trade lasts 40+ bars. A time stop frees capital for the next setup.", patch: { maxBars: 30 }, fixLabel: "30 bar time stop" });
  }
  if (rob.grade === "S++" || rob.grade === "S+" || rob.grade === "S") {
    out.unshift({ id: "elite", tone: "good", title: `${rob.grade} grade: publish-worthy`, body: "Passes sample, out-of-sample, Monte Carlo and stability checks. Forward-test it on paper for 30 trades, then list it in the Hero Shop with a verified badge." });
  } else if (!out.length) {
    out.push({ id: "ok", tone: "good", title: "Solid, nothing urgent", body: "No red flags. Push the grade higher by widening the sample or adding a regime filter." });
  }
  return out;
}

/** Maps a weapon class to the Arsenal so a strategy can be equipped as a setup. */
export function specToSetupRules(spec: StrategySpec) {
  return {
    rules: [...spec.entry.map((x) => `Entry: ${conditionLabel(x)}`), ...spec.exit.map((x) => `Exit: ${conditionLabel(x)}`), `Stop ${spec.stop.type === "atr" ? `${spec.stop.value}× ATR` : `${spec.stop.value}%`}`, `Risk ${spec.riskPct}% max`],
    weaponClass: spec.weaponClass as WeaponClass,
  };
}
