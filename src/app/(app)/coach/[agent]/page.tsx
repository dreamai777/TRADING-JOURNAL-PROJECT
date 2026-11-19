"use client";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AgentChat } from "@/components/ai/agent-chat";
import { AnalystPanel, HabitPanel, RiskPanel, SentimentPanel } from "@/components/ai/panels";
import { ActionList, FindingCard, GradeBadge, MetricStrip, ScoreRing } from "@/components/ai/report-view";
import { Button, Card, CardHeader, Empty, cn } from "@/components/ui";
import { CORE_AGENTS, PERSONAS, type CoreAgentId } from "@/core/ai/agents";
import { FOCUS_LABEL, TONE_META, checkRules } from "@/core/ai/custom";
import { useAi, useCouncil } from "@/lib/ai";

export default function AgentPage() {
  const { agent } = useParams<{ agent: string }>();
  const router = useRouter();
  const bundle = useCouncil();
  const { council, customAgents, customReports, trades, setups, account, now } = bundle;
  const del = useAi((s) => s.deleteCustomAgent);
  const isCore = (CORE_AGENTS as string[]).includes(agent);
  const custom = customAgents.find((a) => a.id === agent);
  if (!bundle.me) return null;
  if (!isCore && !custom) return <Empty icon="🤖" title="Agent not found" body="It may have been deleted." action={<Link href="/coach" className="text-sm font-semibold text-accent">Back to the Council</Link>} />;

  const persona = isCore ? PERSONAS[agent as CoreAgentId] : { name: custom!.name, title: "Custom agent", icon: custom!.icon, color: custom!.color, blurb: custom!.instructions || "Your own specialist.", starters: ["Did I follow my rules this week?", "Which rule costs me the most when I break it?", "Give me my scorecard"] };
  const report = isCore ? council.reports[agent as CoreAgentId] : customReports[custom!.id];
  const checks = custom ? checkRules(custom, trades.slice(-60), setups, account) : [];

  return (
    <div>
      <Link href="/coach" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"><ArrowLeft size={13} /> AI Council</Link>
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at top left, ${persona.color}22, transparent 60%)` }} />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-5xl" style={{ background: `${persona.color}18`, boxShadow: `inset 0 0 0 1px ${persona.color}55, 0 0 40px -10px ${persona.color}` }}>{persona.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[.12em]" style={{ color: persona.color }}>{persona.title}</div>
            <h1 className="font-display text-2xl font-semibold">{persona.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{persona.blurb}</p>
            {custom && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded bg-surface-3 px-1.5 py-0.5 font-semibold">{TONE_META[custom.tone].label} voice</span>
                {custom.focus.map((f) => <span key={f} className="rounded bg-surface-3 px-1.5 py-0.5 text-muted">{FOCUS_LABEL[f]}</span>)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <GradeBadge grade={report.grade} size="lg" />
            <ScoreRing score={report.score} color={persona.color} size={76} />
          </div>
        </div>
        <div className="relative border-t border-line px-5 py-3.5 sm:px-6"><span className="font-display text-[15px]">{report.headline}</span></div>
      </Card>

      <div className="mt-4"><MetricStrip metrics={report.metrics} /></div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {report.findings.map((f) => <FindingCard key={f.id} f={f} />)}
            {!report.findings.length && <Card className="p-6 text-sm text-muted md:col-span-2">Nothing to report yet. Journal a few more trades.</Card>}
          </div>
          {agent === "analyst" && <AnalystPanel trades={trades} reviews={council.reviews} />}
          {agent === "habit" && <HabitPanel trades={trades} now={now} />}
          {agent === "risk" && <RiskPanel trades={trades} account={account} />}
          {agent === "sentiment" && <SentimentPanel trades={trades} now={now} />}
          {agent === "coach" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["analyst", "habit", "risk", "sentiment"] as const).map((id) => (
                <Link key={id} href={`/coach/${id}`} className="card flex items-center gap-3 p-3 hover:border-line-strong">
                  <span className="text-2xl">{PERSONAS[id].icon}</span>
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{PERSONAS[id].name} <span className="text-xs font-normal text-muted">· {PERSONAS[id].title}</span></div><div className="truncate text-xs text-muted">{council.reports[id].headline}</div></div>
                  <GradeBadge grade={council.reports[id].grade} size="sm" />
                </Link>
              ))}
            </div>
          )}
          {custom && (
            <Card>
              <CardHeader title="Rule scorecard" subtitle="Last 60 trades checked against your rules" />
              <div className="px-5 pb-5">
                {checks.map((c) => {
                  const rate = c.checked ? 1 - c.breaches.length / c.checked : 1;
                  return (
                    <div key={c.label} className="grid grid-cols-[1fr_140px_60px] items-center gap-3 border-b border-line/50 py-2.5 text-sm last:border-0">
                      <span className="font-medium">{c.label}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${rate * 100}%`, background: rate >= 0.9 ? "#2fe39a" : rate >= 0.7 ? "#fbbf24" : "#ff5470" }} /></div>
                      <span className={cn("num text-right text-xs font-semibold", rate >= 0.9 ? "text-profit" : rate >= 0.7 ? "text-gold" : "text-loss")}>{Math.round(rate * 100)}%</span>
                    </div>
                  );
                })}
                {!checks.length && <div className="text-sm text-muted">No rules yet. Edit the agent to add some.</div>}
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          {report.actions.length > 0 && (
            <Card>
              <CardHeader title="Do this next" subtitle={`${persona.name}'s top three`} />
              <div className="px-5 pb-5"><ActionList actions={report.actions} color={persona.color} /></div>
            </Card>
          )}
          <AgentChat agent={isCore ? (agent as CoreAgentId) : "custom"} custom={custom} persona={persona} starters={persona.starters} height={520} />
          {custom && (
            <div className="flex gap-2">
              <Link href={`/coach/new?edit=${custom.id}`} className="flex-1"><Button variant="outline" className="w-full"><Pencil size={14} /> Edit agent</Button></Link>
              <Button variant="danger" onClick={() => { del(custom.id); router.push("/coach"); }}><Trash2 size={14} /> Delete</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
