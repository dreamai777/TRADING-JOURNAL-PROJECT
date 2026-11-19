// Builds the compact, numbers-only context an agent sends to Claude, and the offline answer engine used
// when no API key is configured. Keeping the context small and factual keeps answers grounded and cheap.
import type { Setup, TradeComputed } from "../types";
import { byHour, byWeekday, groupBy, mistakeCost, summarize } from "../stats";
import type { AgentReport, Council, CoreAgentId } from "./agents";
import { PERSONAS, riskProfile } from "./agents";
import type { TradeReview } from "./review";

const r2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);

export function journalContext(trades: TradeComputed[], setups: Setup[], account: number) {
  const s = summarize(trades, account);
  const recent = summarize(trades.slice(-30), account);
  const setupName = (id: string) => setups.find((x) => x.id === id)?.name ?? id;
  return {
    account,
    allTime: { trades: s.count, winRate: r2(s.winRate), profitFactor: r2(s.profitFactor), expectancy: r2(s.expectancy), avgR: r2(s.avgR), netPnl: r2(s.netPnl), maxDrawdownPct: r2(s.maxDrawdownPct), disciplineRate: r2(s.disciplineRate) },
    last30Trades: { winRate: r2(recent.winRate), profitFactor: r2(recent.profitFactor), expectancy: r2(recent.expectancy), netPnl: r2(recent.netPnl) },
    setups: groupBy(trades, (t) => t.setupId).map((g) => ({ setup: setupName(g.key), trades: g.summary.count, winRate: r2(g.summary.winRate), pf: r2(g.summary.profitFactor), net: r2(g.summary.netPnl) })),
    weekdays: byWeekday(trades).map((d) => ({ day: d.day, trades: d.count, net: r2(d.pnl) })),
    bestHoursUtc: byHour(trades).sort((a, b) => b.pnl - a.pnl).slice(0, 3).map((h) => ({ hour: h.hour, net: r2(h.pnl) })),
    worstHoursUtc: byHour(trades).sort((a, b) => a.pnl - b.pnl).slice(0, 3).map((h) => ({ hour: h.hour, net: r2(h.pnl) })),
    mistakes: mistakeCost(trades).slice(0, 5).map((m) => ({ mistake: m.mistake, times: m.count, cost: r2(m.cost) })),
    lastTrades: trades.slice(-8).map((t) => ({ symbol: t.symbol, side: t.side, pnl: r2(t.pnl), r: t.r != null ? r2(t.r) : null, emotion: t.emotion ?? null, rulesFollowed: t.rulesFollowed ?? null, mistakes: t.mistakes, note: t.notes ?? null, closed: t.closedAt })),
    risk: (() => { const rp = riskProfile(trades, account); return { avgRiskPct: r2(rp.avgRisk * 100), maxRiskPct: r2(rp.maxRisk * 100), noStopShare: r2(rp.noStop), kelly: r2(rp.kelly), guardrails: rp.guardrails.map((g) => `${g.label}: ${g.value}`) }; })(),
  };
}

export function reportContext(r: AgentReport) {
  return { score: r.score, grade: r.grade, headline: r.headline, findings: r.findings.map((f) => `${f.title}. ${f.body}${f.action ? ` Action: ${f.action}` : ""}`), metrics: r.metrics.map((m) => `${m.label}: ${m.value}`) };
}

export function councilContext(c: Council) {
  return Object.fromEntries(Object.entries(c.reports).map(([k, r]) => [k, reportContext(r)]));
}

// ---------------------------------------------------------------------------------------------------
// Offline answers. Routes the question to the most relevant findings so the prototype is useful with
// no API key. The Claude provider replaces this with real reasoning over the same context.

const ROUTES: { re: RegExp; agent: CoreAgentId }[] = [
  { re: /risk|size|sizing|stop|leverage|drawdown|blow|ruin|kelly|loss limit/i, agent: "risk" },
  { re: /habit|overtrad|revenge|routine|streak|discipline|journal/i, agent: "habit" },
  { re: /emotion|feel|mood|fomo|fear|greed|tilt|sentiment|calm|notes/i, agent: "sentiment" },
  { re: /trade|grade|review|lucky|setup|entry|exit|a\+|pillar/i, agent: "analyst" },
];

export function localAnswer(question: string, agentId: CoreAgentId | "custom", council: Council, custom?: AgentReport, review?: TradeReview): string {
  if (review) {
    return [
      `**${review.verdict}, grade ${review.grade} (${review.score}/100).**`,
      review.right.length ? `What went right:\n${review.right.map((x) => `- ${x}`).join("\n")}` : "",
      review.wrong.length ? `What went wrong:\n${review.wrong.map((x) => `- ${x}`).join("\n")}` : "",
      `Next time:\n${review.tips.map((x) => `- ${x}`).join("\n")}`,
    ].filter(Boolean).join("\n\n");
  }
  const q = question.toLowerCase();
  let target: AgentReport;
  if (agentId === "custom" && custom) target = custom;
  else if (agentId === "coach") {
    const hit = ROUTES.find((r) => r.re.test(q));
    target = hit ? council.reports[hit.agent] : council.reports.coach;
    if (/focus|week|plan|priorit|improv|routine|pre-?market/i.test(q)) target = council.reports.coach;
  } else target = council.reports[agentId as CoreAgentId];

  const who = agentId === "custom" ? "" : agentId === "coach" && target.agentId !== "coach" ? `${PERSONAS[target.agentId as CoreAgentId].icon} ${PERSONAS[target.agentId as CoreAgentId].name} weighs in. ` : "";
  if (/pre-?market|routine/.test(q)) {
    return `${who}Here's a 10 minute pre-market routine built from your data:\n\n1. **Check state.** Rate sleep and mood 1 to 5 in the Notebook. Below 3 on either: half size today.\n2. **Read your red lines.** ${council.focus.rules.map((r) => r.replace(/\.$/, "")).join("; ")}.\n3. **Mark levels.** Write the 2 to 3 levels and the one setup you're hunting. Nothing else gets traded.\n4. **Set the guardrails.** ${council.reports.risk.actions.join(", ")}.\n5. **Intention.** One sentence: what does a good day look like, regardless of P&L?`;
  }
  if (/improv|progress|getting better/.test(q)) {
    const t = council.reports.coach.findings.find((f) => f.id === "trend");
    return `${t?.title ?? ""}. ${t?.body ?? ""}\n\nYour process grade is ${council.reports.analyst.grade} and readiness is ${council.readiness}/100. Keep the focus on: ${council.focus.title.toLowerCase()}`;
  }
  const top = target.findings.slice(0, 3);
  return `${who}${target.headline}\n\n${top.map((f) => `- **${f.title}.** ${f.body}${f.action ? ` → ${f.action}` : ""}`).join("\n")}${target.actions.length ? `\n\n**Do next:** ${target.actions[0]}` : ""}`;
}
