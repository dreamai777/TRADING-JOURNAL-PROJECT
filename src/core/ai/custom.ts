// Custom agents: the trader builds their own specialist. They pick a persona, a focus, a tone and a set
// of hard rules; the agent checks every trade against those rules offline, and the same config becomes
// the Claude system prompt so the agent answers in the voice and with the priorities they chose.
import type { Setup, TradeComputed } from "../types";
import { summarize } from "../stats";
import { gradeOf } from "./review";
import type { AgentReport, Finding } from "./agents";

export type RuleKind = "max-trades-day" | "stop-after-losses" | "max-risk-pct" | "min-r" | "no-trade-hours" | "only-setups" | "require-stop" | "max-leverage" | "require-notes";

export interface AgentRule {
  kind: RuleKind;
  value?: number;
  value2?: number;
  setupIds?: string[];
}

export type Focus = "risk" | "discipline" | "psychology" | "execution" | "setups" | "consistency";
export type CoachTone = "mentor" | "drill" | "analyst" | "hype";

export interface CustomAgent {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  tone: CoachTone;
  focus: Focus[];
  rules: AgentRule[];
  /** Free-text instructions the trader wants the agent to follow. Sent to Claude as-is. */
  instructions: string;
  createdAt: string;
}

export const RULE_META: Record<RuleKind, { label: (r: AgentRule, setups: Setup[]) => string; editor: "number" | "range" | "setups" | "none"; defaults: Partial<AgentRule>; unit?: string }> = {
  "max-trades-day": { label: (r) => `Max ${r.value} trades a day`, editor: "number", defaults: { value: 3 } },
  "stop-after-losses": { label: (r) => `Stop after ${r.value} losses in a row`, editor: "number", defaults: { value: 2 } },
  "max-risk-pct": { label: (r) => `Risk at most ${r.value}% per trade`, editor: "number", defaults: { value: 1 }, unit: "%" },
  "min-r": { label: (r) => `Winners must reach ${r.value}R`, editor: "number", defaults: { value: 1.5 }, unit: "R" },
  "no-trade-hours": { label: (r) => `No entries ${pad(r.value)}:00–${pad(r.value2)}:00 UTC`, editor: "range", defaults: { value: 22, value2: 4 } },
  "only-setups": { label: (r, setups) => `Only trade ${(r.setupIds ?? []).map((id) => setups.find((s) => s.id === id)?.name ?? "?").join(", ") || "selected setups"}`, editor: "setups", defaults: { setupIds: [] } },
  "require-stop": { label: () => "Every trade has a stop loss", editor: "none", defaults: {} },
  "max-leverage": { label: (r) => `Leverage at most ${r.value}x`, editor: "number", defaults: { value: 5 }, unit: "x" },
  "require-notes": { label: () => "Write a lesson on every trade", editor: "none", defaults: {} },
};

export const FOCUS_LABEL: Record<Focus, string> = { risk: "Risk", discipline: "Discipline", psychology: "Psychology", execution: "Execution", setups: "Setups & edge", consistency: "Consistency" };
export const TONE_META: Record<CoachTone, { label: string; blurb: string; prompt: string }> = {
  mentor: { label: "Mentor", blurb: "Warm, patient, explains why", prompt: "Speak like a patient, encouraging mentor who explains the why behind every point." },
  drill: { label: "Drill sergeant", blurb: "Blunt, no excuses", prompt: "Speak like a blunt drill sergeant: short sentences, zero excuses, high standards, but never insulting." },
  analyst: { label: "Quant", blurb: "Numbers first, no emotion", prompt: "Speak like a quant analyst: numbers first, statistical framing, minimal emotion." },
  hype: { label: "Hype coach", blurb: "Energy, wins, momentum", prompt: "Speak like an energetic hype coach who celebrates progress and frames fixes as the next level-up." },
};

export const AGENT_TEMPLATES: Omit<CustomAgent, "id" | "userId" | "createdAt">[] = [
  { name: "Prop Firm Guardian", icon: "🏦", color: "#38d9f5", tone: "drill", focus: ["risk", "discipline"], instructions: "I'm trading a funded challenge. Protect the account above all. Flag anything that could breach daily loss or max drawdown rules.", rules: [{ kind: "max-risk-pct", value: 0.5 }, { kind: "max-trades-day", value: 3 }, { kind: "stop-after-losses", value: 2 }, { kind: "require-stop" }] },
  { name: "Scalp Sniper", icon: "🎯", color: "#fb923c", tone: "analyst", focus: ["execution", "consistency"], instructions: "I scalp crypto perps. Watch fees, hold time and overtrading. I want precise, numeric feedback.", rules: [{ kind: "max-trades-day", value: 8 }, { kind: "max-leverage", value: 10 }, { kind: "require-stop" }] },
  { name: "Zen Master", icon: "🧘", color: "#a78bfa", tone: "mentor", focus: ["psychology", "discipline"], instructions: "Help me stay calm and patient. Call out revenge trades and FOMO gently but clearly.", rules: [{ kind: "stop-after-losses", value: 2 }, { kind: "no-trade-hours", value: 22, value2: 6 }, { kind: "require-notes" }] },
  { name: "Swing Commander", icon: "🦅", color: "#2fe39a", tone: "hype", focus: ["setups", "execution"], instructions: "I swing trade trends over days. Make me hold winners and only take A+ setups.", rules: [{ kind: "min-r", value: 2 }, { kind: "max-risk-pct", value: 1 }, { kind: "max-trades-day", value: 2 }] },
];

export const AGENT_ICONS = ["🤖", "🏦", "🎯", "🧘", "🦅", "🐉", "⚔️", "🦉", "🔥", "🧊", "🐺", "👁️"];
export const AGENT_COLORS = ["#c8f53b", "#2fe39a", "#38d9f5", "#a78bfa", "#fbbf24", "#fb923c", "#ff5470"];

const pad = (n?: number) => String(n ?? 0).padStart(2, "0");
const money = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export interface RuleCheck {
  rule: AgentRule;
  label: string;
  checked: number;
  breaches: TradeComputed[];
  /** P&L of the breaching trades: what breaking this rule has cost (or made). */
  cost: number;
}

/** Checks every trade against each rule. */
export function checkRules(agent: Pick<CustomAgent, "rules">, trades: TradeComputed[], setups: Setup[], account: number): RuleCheck[] {
  const byDay = new Map<string, TradeComputed[]>();
  for (const t of trades) byDay.set(t.openedAt.slice(0, 10), [...(byDay.get(t.openedAt.slice(0, 10)) ?? []), t]);
  let equity = account;
  const eqBefore = new Map<string, number>();
  for (const t of trades) { eqBefore.set(t.id, equity); equity += t.pnl; }

  return agent.rules.map((rule) => {
    let breaches: TradeComputed[] = [];
    let checked = trades.length;
    switch (rule.kind) {
      case "max-trades-day":
        breaches = [...byDay.values()].flatMap((d) => d.slice(rule.value ?? 3));
        break;
      case "stop-after-losses": {
        let streak = 0;
        for (const t of trades) {
          if (streak >= (rule.value ?? 2)) breaches.push(t);
          streak = t.win ? 0 : streak + 1;
        }
        break;
      }
      case "max-risk-pct":
        breaches = trades.filter((t) => t.risk != null && t.risk / (eqBefore.get(t.id) ?? account) > (rule.value ?? 1) / 100 + 1e-9);
        checked = trades.filter((t) => t.risk != null).length;
        break;
      case "min-r":
        checked = trades.filter((t) => t.win && t.r != null).length;
        breaches = trades.filter((t) => t.win && t.r != null && t.r < (rule.value ?? 1.5));
        break;
      case "no-trade-hours": {
        const a = rule.value ?? 22, b = rule.value2 ?? 4;
        breaches = trades.filter((t) => { const h = new Date(t.openedAt).getUTCHours(); return a <= b ? h >= a && h < b : h >= a || h < b; });
        break;
      }
      case "only-setups":
        breaches = trades.filter((t) => !t.setupId || !(rule.setupIds ?? []).includes(t.setupId));
        break;
      case "require-stop":
        breaches = trades.filter((t) => t.stopLoss == null);
        break;
      case "max-leverage":
        checked = trades.filter((t) => t.leverage).length;
        breaches = trades.filter((t) => (t.leverage ?? 0) > (rule.value ?? 5));
        break;
      case "require-notes":
        breaches = trades.filter((t) => (t.notes ?? "").trim().length < 10);
        break;
    }
    return { rule, label: RULE_META[rule.kind].label(rule, setups), checked, breaches, cost: breaches.reduce((a, t) => a + t.pnl, 0) };
  });
}

export function customAgentReport(agent: CustomAgent, trades: TradeComputed[], setups: Setup[], account: number): AgentReport {
  const recent = trades.slice(-60);
  const checks = checkRules(agent, recent, setups, account);
  const compliance = checks.length ? checks.reduce((a, c) => a + (c.checked ? 1 - c.breaches.length / c.checked : 1), 0) / checks.length : 1;
  const kept = recent.filter((t) => !checks.some((c) => c.breaches.includes(t)));
  const broke = recent.filter((t) => checks.some((c) => c.breaches.includes(t)));
  const ks = summarize(kept), bs = summarize(broke);
  const broken = checks.filter((c) => c.breaches.length);
  const worst = [...broken].sort((a, b) => a.cost - b.cost || b.breaches.length - a.breaches.length)[0];
  const findings: Finding[] = checks.map((c) => ({
    id: c.rule.kind,
    tone: c.breaches.length === 0 ? "good" : c.cost < 0 ? "bad" : "warn",
    title: c.breaches.length === 0 ? `✓ ${c.label}` : `✗ ${c.label}: broken ${c.breaches.length}×`,
    body: c.breaches.length === 0 ? `Clean across ${c.checked} trades.` : `${c.breaches.length} of ${c.checked} recent trades broke it. Those trades netted ${money(c.cost)}.`,
  }));
  if (kept.length >= 3 && broke.length >= 3)
    findings.unshift({ id: "split", tone: ks.expectancy > bs.expectancy ? "good" : "info", title: `Your rules are worth ${money(ks.expectancy - bs.expectancy)} per trade`, body: `Rule-abiding trades: ${money(ks.expectancy)} each (${ks.count}). Rule-breaking trades: ${money(bs.expectancy)} each (${bs.count}).` });
  const score = Math.round(compliance * 100);
  return {
    agentId: `custom:${agent.id}`,
    score,
    grade: gradeOf(score),
    headline: !agent.rules.length ? `${agent.name} is ready. Add rules so it can hold you to them.` : worst ? `${Math.round(compliance * 100)}% rule compliance. ${worst.cost < 0 ? "Most costly break" : "Most broken"}: ${worst.label.toLowerCase()}.` : `100% rule compliance in your last ${recent.length} trades.`,
    findings,
    metrics: [
      { label: "Compliance", value: `${score}%`, tone: score >= 85 ? "profit" : score >= 60 ? "gold" : "loss" },
      { label: "Rules", value: String(agent.rules.length) },
      { label: "Rule-break cost", value: money(checks.reduce((a, c) => a + Math.min(0, c.cost), 0)), tone: checks.some((c) => c.cost < 0) ? "loss" : undefined },
      { label: "Clean trades", value: `${kept.length}/${recent.length}` },
    ],
    actions: checks.filter((c) => c.breaches.length).sort((a, b) => a.cost - b.cost).slice(0, 3).map((c) => `Hold the line: ${c.label.toLowerCase()}`),
  };
}

export function customSystemPrompt(agent: CustomAgent, setups: Setup[]) {
  return `You are "${agent.name}", a custom AI trading agent the trader built inside EdgeForge.
${TONE_META[agent.tone].prompt}
Focus areas, in priority order: ${agent.focus.map((f) => FOCUS_LABEL[f]).join(", ") || "general performance"}.
The trader's hard rules (hold them to these, cite breaches with numbers):
${agent.rules.map((r) => `- ${RULE_META[r.kind].label(r, setups)}`).join("\n") || "- (none yet)"}
Trader's own instructions: ${agent.instructions || "(none)"}
Ground every claim in the JSON context. Never give financial advice or tell them to buy or sell a specific asset. Under 200 words unless asked.`;
}
