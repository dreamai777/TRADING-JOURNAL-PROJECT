"use client";
import { ArrowRight, Plus, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { AgentChat } from "@/components/ai/agent-chat";
import { ActionList, AgentCard, GradeBadge, ScoreRing } from "@/components/ai/report-view";
import { TradeReviewCard } from "@/components/ai/trade-review-card";
import { Card, CardHeader, PageHeader, Pill } from "@/components/ui";
import { CORE_AGENTS, PERSONAS } from "@/core/ai/agents";
import { normalizePlan } from "@/core/plans";
import { useCouncil } from "@/lib/ai";

const PLAN_RANK = { free: 0, premium: 1, ultra: 2 } as const;

export default function CouncilPage() {
  const { me, trades, council, customAgents, customReports } = useCouncil();
  const plan = normalizePlan(me?.plan);
  const coach = council.reports.coach;
  const last = trades[trades.length - 1];
  const lastReview = last ? council.reviews.get(last.id) : undefined;
  if (!me) return null;

  return (
    <div>
      <PageHeader
        title="AI Council"
        subtitle="Five specialist agents and your own custom agents read every trade, then tell you exactly what to fix."
        right={<Pill tone="violet"><Sparkles size={12} /> Claude-powered · works offline</Pill>}
      />

      {/* Sensei briefing */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(200,245,59,.13),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(167,139,250,.12),transparent_50%)]" />
        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/12 text-4xl shadow-[inset_0_0_0_1px_rgba(200,245,59,.35)]">🥋</div>
            <ScoreRing score={council.readiness} color="#c8f53b" size={84} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-accent">Sensei · today&apos;s briefing</div>
            <p className="mt-1 font-display text-lg leading-snug sm:text-xl">{council.briefing}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {coach.metrics.map((m) => <span key={m.label} className="rounded-md border border-line bg-surface-2 px-2 py-1"><span className="text-faint">{m.label}</span> <b className={m.tone === "profit" ? "text-profit" : m.tone === "loss" ? "text-loss" : m.tone === "gold" ? "text-gold" : ""}>{m.value}</b></span>)}
            </div>
          </div>
          <Link href="/coach/coach" className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-accent px-4 text-sm font-bold text-accent-ink lg:self-center">Talk to Sensei <ArrowRight size={15} /></Link>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">The Council</h2>
            <span className="text-xs text-muted">Scores are 0 to 100, higher is healthier</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CORE_AGENTS.filter((id) => id !== "coach").map((id) => {
              const p = PERSONAS[id];
              return <AgentCard key={id} persona={p} report={council.reports[id]} href={`/coach/${id}`} locked={PLAN_RANK[plan] < PLAN_RANK[p.plan] ? (p.plan === "premium" ? "Premium" : "Ultra") : undefined} />;
            })}
          </div>

          <div className="mb-3 mt-6 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Your custom agents</h2>
            <Link href="/coach/new" className="flex items-center gap-1 text-xs font-semibold text-accent"><Plus size={13} /> Build an agent</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {customAgents.map((a) => (
              <AgentCard key={a.id} persona={{ name: a.name, title: "Custom agent", icon: a.icon, color: a.color, blurb: a.instructions }} report={customReports[a.id]} href={`/coach/${a.id}`} />
            ))}
            <Link href="/coach/new" className="group flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line-strong p-5 text-center transition hover:border-accent/50">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent transition group-hover:scale-110"><Plus size={22} /></div>
              <div className="font-semibold">Forge a custom agent</div>
              <div className="max-w-xs text-xs text-muted">Pick a persona, a voice and your own hard rules. It checks every trade against them and answers in your style.</div>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="This week's focus" icon={<Target size={15} className="text-accent" />} subtitle={`Set by Sensei from ${PERSONAS[council.focus.agent].name}'s report`} />
            <div className="px-5 pb-5">
              <div className="mb-3 font-display text-[15px] font-semibold leading-snug">{council.focus.title}</div>
              <ActionList actions={council.focus.rules} />
              <div className="mt-3 rounded-lg bg-black/25 px-3 py-2 text-xs text-muted"><span className="font-semibold text-ink">Win condition:</span> {council.focus.measure}</div>
            </div>
          </Card>
          {last && lastReview && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">Latest trade <GradeBadge grade={lastReview.grade} size="sm" /> {last.symbol}</span>
                <Link href={`/journal/${last.id}`} className="flex items-center gap-1 text-xs font-semibold text-accent">Full review <ArrowRight size={13} /></Link>
              </div>
              <TradeReviewCard review={lastReview} compact />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <AgentChat agent="coach" persona={PERSONAS.coach} starters={PERSONAS.coach.starters} height={460} />
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-violet">How the Council works</div>
          <div className="mt-3 space-y-3 text-sm text-muted">
            <p><b className="text-ink">Instant and private by default.</b> Every agent runs on your device over your own journal: grades, habits, risk math and sentiment, with no waiting and no data sent anywhere.</p>
            <p><b className="text-ink">Claude when you talk to it.</b> Questions go to Claude with a compact, numbers-only summary of your journal, so answers quote your real stats. No key configured? The offline engine answers instead.</p>
            <p><b className="text-ink">Process over outcome.</b> Oracle grades the decision, not the P&L, so a good loss scores high and a lucky win doesn&apos;t fool you.</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
            {[["Free", "Oracle + Sensei weekly brief", "#38d9f5"], ["Premium", "All 5 agents, 200 chats/mo, 1 custom", "#c8f53b"], ["Ultra", "Unlimited chats, 10 custom agents, pre-trade check", "#fbbf24"]].map(([n, d, c]) => (
              <div key={n} className="rounded-lg border border-line bg-surface-2 p-2.5"><div className="font-bold" style={{ color: c }}>{n}</div><div className="mt-0.5 leading-snug text-muted">{d}</div></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
