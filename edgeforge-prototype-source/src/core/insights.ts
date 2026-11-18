// Rule-based coach. Implements the same CoachProvider interface a Claude-backed coach will use,
// so swapping in the LLM later is a one-line change (see src/lib/coach.ts).
import { emotionImpact, groupBy, mistakeCost, summarize, tiltMeter, byWeekday, byHour } from "./stats";
import type { Setup, TradeComputed } from "./types";

export interface Insight {
  id: string;
  tone: "good" | "warn" | "bad" | "info";
  title: string;
  body: string;
  action?: string;
}

export interface CoachProvider {
  insights(trades: TradeComputed[], setups: Setup[]): Promise<Insight[]>;
}

export function ruleInsights(trades: TradeComputed[], setups: Setup[]): Insight[] {
  const out: Insight[] = [];
  if (trades.length < 5) {
    return [{ id: "start", tone: "info", title: "Journal 5 trades to unlock your coach", body: "The coach needs a handful of trades before patterns become meaningful." }];
  }
  const s = summarize(trades);
  const name = (id: string) => setups.find((x) => x.id === id)?.name ?? id;

  const bySetup = groupBy(trades, (t) => t.setupId).filter((g) => g.summary.count >= 5);
  const best = [...bySetup].sort((a, b) => b.summary.netPnl - a.summary.netPnl)[0];
  const worst = [...bySetup].sort((a, b) => a.summary.netPnl - b.summary.netPnl)[0];
  if (best && best.summary.netPnl > 0)
    out.push({ id: "best-setup", tone: "good", title: `${name(best.key)} is your sharpest weapon`, body: `Profit factor ${fmt(best.summary.profitFactor)} over ${best.summary.count} trades, ${pct(best.summary.winRate)} win rate.`, action: "Size up slightly on A+ versions of this setup." });
  if (worst && worst.summary.netPnl < 0)
    out.push({ id: "worst-setup", tone: "bad", title: `${name(worst.key)} is bleeding your account`, body: `Net ${money(worst.summary.netPnl)} over ${worst.summary.count} trades. Profit factor ${fmt(worst.summary.profitFactor)}.`, action: "Unequip it for 2 weeks or paper trade it until the rules are refined." });

  const mc = mistakeCost(trades)[0];
  if (mc && mc.cost < 0)
    out.push({ id: "mistake", tone: "bad", title: `"${mc.mistake.replace("-", " ")}" cost you ${money(mc.cost)}`, body: `It happened ${mc.count} times. This is your most expensive habit.`, action: "Add a pre-trade checklist item that blocks it." });

  const emo = emotionImpact(trades);
  const worstEmo = [...emo].sort((a, b) => a.pnl - b.pnl)[0];
  if (worstEmo && worstEmo.pnl < 0)
    out.push({ id: "emotion", tone: "warn", title: `Trading while ${worstEmo.emotion} is your leak`, body: `${worstEmo.count} trades in that state returned ${money(worstEmo.pnl)} at ${pct(worstEmo.winRate)} win rate.`, action: `When you notice "${worstEmo.emotion}", step away for 15 minutes.` });

  const ruled = trades.filter((t) => t.rulesFollowed);
  const broken = trades.filter((t) => t.rulesFollowed === false);
  if (ruled.length >= 5 && broken.length >= 5) {
    const a = summarize(ruled).expectancy;
    const b = summarize(broken).expectancy;
    out.push({ id: "discipline", tone: a > b ? "good" : "info", title: "Discipline pays, in numbers", body: `Rule-following trades average ${money(a)} vs ${money(b)} when you break rules.`, action: "Follow-the-plan streaks earn double XP." });
  }

  const wd = byWeekday(trades).filter((d) => d.count >= 4).sort((a, b) => a.pnl - b.pnl)[0];
  if (wd && wd.pnl < 0) out.push({ id: "weekday", tone: "warn", title: `${wd.day} is your weakest day`, body: `${wd.count} trades, net ${money(wd.pnl)}.`, action: `Try half size on ${wd.day}s.` });

  const hr = byHour(trades).filter((h) => h.count >= 4).sort((a, b) => b.pnl - a.pnl)[0];
  if (hr && hr.pnl > 0) out.push({ id: "hour", tone: "good", title: `Your golden hour is ${hr.hour} UTC`, body: `${hr.count} trades opened then netted ${money(hr.pnl)}.` });

  if (s.payoff < 1 && s.winRate < 0.55) out.push({ id: "payoff", tone: "warn", title: "Winners are too small for your win rate", body: `Payoff ratio ${fmt(s.payoff)} with ${pct(s.winRate)} wins.`, action: "Let winners reach at least 1.5R before managing." });

  const tilt = tiltMeter(trades);
  if (tilt >= 50) out.push({ id: "tilt", tone: "bad", title: "Tilt warning", body: `Your last 5 trades show a tilt score of ${tilt}/100.`, action: "Stop trading for the day. Review, then reset." });

  return out;
}

const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "∞");
const pct = (v: number) => `${Math.round(v * 100)}%`;
const money = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(0)}`;

export const localCoach: CoachProvider = {
  async insights(trades, setups) {
    return ruleInsights(trades, setups);
  },
};
