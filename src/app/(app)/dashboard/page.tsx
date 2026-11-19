"use client";
import { ArrowRight, Flame, Shield, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { EquityChart, Ring, ScoreRadar } from "@/components/charts";
import { CharacterCard } from "@/components/character";
import { MonthCalendar } from "@/components/month-calendar";
import { RangePicker } from "@/components/range-picker";
import { Card, CardHeader, Money, PageHeader, Pill, Progress, Stat, fmtDateTime, fmtNum, fmtPct } from "@/components/ui";
import { dailyQuests, journalStreak, weaponStats } from "@/core/game";
import { PERSONAS } from "@/core/ai/agents";
import { GradeBadge } from "@/components/ai/report-view";
import { useCouncil } from "@/lib/ai";
import { RANGES, equityCurve, forgeScore, summarize } from "@/core/stats";
import { useRangedJournal } from "@/lib/hooks";

export default function Dashboard() {
  const { me, all, trades, setups, startEquity, progress, range } = useRangedJournal();
  const account = startEquity;
  const s = useMemo(() => summarize(trades, account), [trades, account]);
  const curve = useMemo(() => equityCurve(trades, account), [trades, account]);
  const score = useMemo(() => forgeScore(s), [s]);
  const { council } = useCouncil();
  const streak = journalStreak(all);
  const quests = dailyQuests(all, new Date().toISOString().slice(0, 10));
  const loadout = setups.filter((x) => x.equipped).map((x) => ({ setup: x, w: weaponStats(x, all) }));
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (!me) return null;

  return (
    <div>
      <PageHeader
        title={`${greet}, ${me.name.split(" ")[0]}`}
        subtitle={`${progress.rank.name} · Level ${progress.level} · ${s.count} trades in ${range === "ALL" ? "all time" : `the last ${RANGES.find((r) => r.key === range)?.label}`}`}
        right={<RangePicker />}
      />

      {all.length === 0 && <FirstRun />}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Net P&L" value={<Money usd={s.netPnl} sign compact />} sub={<span>{fmtPct(s.netPnl / account)} of account</span>} icon={<TrendingUp size={14} />} />
        <Card className="flex items-center gap-3 p-4">
          <Ring value={s.winRate} color={s.winRate >= 0.5 ? "#2fe39a" : "#fbbf24"}>
            <span className="num text-sm font-bold">{Math.round(s.winRate * 100)}%</span>
          </Ring>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Win rate</div>
            <div className="num mt-1 text-xs text-muted">{s.wins}W · {s.losses}L</div>
          </div>
        </Card>
        <Stat label="Profit factor" value={fmtNum(s.profitFactor)} sub={s.profitFactor >= 1.5 ? "Strong edge" : s.profitFactor >= 1 ? "Marginal edge" : "Negative edge"} tone={s.profitFactor >= 1 ? "profit" : "loss"} icon={<Target size={14} />} />
        <Stat label="Expectancy" value={<Money usd={s.expectancy} sign />} sub={<span className="num">{s.avgR >= 0 ? "+" : ""}{s.avgR.toFixed(2)}R avg · {s.totalR.toFixed(1)}R total</span>} icon={<Zap size={14} />} />
        <Stat label="Max drawdown" value={<Money usd={-s.maxDrawdown} compact />} sub={`${fmtPct(s.maxDrawdownPct)} from peak`} icon={<Shield size={14} />} />
        <Card className="relative overflow-hidden p-4">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
          <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Forge score</div>
          <div className="num mt-2 text-2xl font-bold text-accent">{score.score}<span className="text-sm text-faint">/100</span></div>
          <div className="mt-1 text-xs text-muted">Composite of 6 skills</div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2"><CharacterCard /></div>
        <Card>
          <CardHeader title="Daily quests" icon={<Trophy size={15} className="text-gold" />} right={<Pill tone="gold"><Flame size={12} /> {streak}-day streak</Pill>} />
          <div className="space-y-3 px-5 pb-5">
            {quests.map((q) => {
              const done = q.progress >= q.goal;
              return (
                <div key={q.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={done ? "text-muted line-through" : ""}>{q.label}</span>
                    <span className="num text-xs font-bold text-gold">+{q.xp} XP</span>
                  </div>
                  <Progress value={q.progress / q.goal} color={done ? "#2fe39a" : "#fbbf24"} className="mt-1.5" height={4} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Equity curve" subtitle="Account balance after each closed trade" right={<Money usd={s.netPnl} sign className="text-sm font-semibold" />} />
          <div className="px-2 pb-3">{curve.length ? <EquityChart data={curve} /> : <div className="flex h-[280px] items-center justify-center text-sm text-muted">No trades in this range</div>}</div>
        </Card>
        <Card>
          <CardHeader title="Forge score" subtitle="Where your edge is strong and weak" />
          <ScoreRadar data={score.axes} />
        </Card>
      </div>

      <div className="mt-4"><MonthCalendar trades={all} account={me?.accountSize ?? 10000} /></div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Equipped loadout" subtitle="Your active weapons" right={<Link href="/arsenal" className="flex items-center gap-1 text-xs font-semibold text-accent">Arsenal <ArrowRight size={13} /></Link>} />
          <div className="space-y-2 px-3 pb-4">
            {loadout.map(({ setup, w }) => (
              <div key={setup.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ background: w.rarity.glow, boxShadow: `inset 0 0 0 1px ${w.rarity.color}55` }}>{setup.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{setup.name}</div>
                  <div className="text-[11px] font-semibold" style={{ color: w.rarity.color }}>{w.rarity.name} · Lv {w.level}</div>
                </div>
                <div className="text-right">
                  <Money usd={w.summary.netPnl} sign compact className="text-sm font-semibold" />
                  <div className="num text-[11px] text-muted">PF {fmtNum(w.summary.profitFactor)}</div>
                </div>
              </div>
            ))}
            {!loadout.length && <div className="px-2 py-6 text-center text-sm text-muted">No weapons equipped yet.</div>}
          </div>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
          <CardHeader title="AI Council" icon={<span>🥋</span>} subtitle="Sensei's briefing from your five agents" right={<Link href="/coach" className="flex items-center gap-1 text-xs font-semibold text-accent">Open <ArrowRight size={13} /></Link>} />
          <div className="px-5 pb-5">
            <p className="text-[13px] leading-snug">{council.briefing}</p>
            <div className="mt-3 space-y-1">
              {(["analyst", "habit", "risk", "sentiment"] as const).map((id) => (
                <Link key={id} href={`/coach/${id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                  <span className="text-base">{PERSONAS[id].icon}</span>
                  <span className="w-16 text-xs font-semibold">{PERSONAS[id].name}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted">{council.reports[id].headline}</span>
                  <GradeBadge grade={council.reports[id].grade} size="sm" />
                </Link>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent trades" right={<Link href="/journal" className="flex items-center gap-1 text-xs font-semibold text-accent">Journal <ArrowRight size={13} /></Link>} />
          <div className="px-3 pb-4">
            {[...all].reverse().slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                <Pill tone={t.side === "long" ? "profit" : "loss"} className="w-12 justify-center uppercase">{t.side}</Pill>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{t.symbol}</div>
                  <div className="text-[11px] text-muted">{fmtDateTime(t.closedAt)}</div>
                </div>
                <div className="text-right">
                  <Money usd={t.pnl} sign className="text-sm font-semibold" />
                  {t.r != null && <div className="num text-[11px] text-muted">{t.r >= 0 ? "+" : ""}{t.r.toFixed(2)}R</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function FirstRun() {
  return (
    <Card className="mb-4 flex flex-col items-start gap-4 border-accent/30 p-6 sm:flex-row sm:items-center">
      <div className="text-4xl">🎖️</div>
      <div className="flex-1">
        <div className="font-display text-lg font-semibold">Welcome, Recruit. Your journal is empty.</div>
        <p className="text-sm text-muted">Press <kbd className="rounded bg-surface-3 px-1.5 text-xs">N</kbd> to snap your first trade, connect an exchange, or load demo data to explore.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/connections" className="rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold">Connect exchange</Link>
        <Link href="/settings" className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink">Load demo data</Link>
      </div>
    </Card>
  );
}
