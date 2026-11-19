"use client";
// Agent-specific panels shown on each agent's page, under the shared report.
import Link from "next/link";
import { useMemo } from "react";
import { EMOTION_META } from "@/components/quick-snap";
import { Card, CardHeader, Money, cn, fmtDate } from "@/components/ui";
import { detectHabits, marketMood, moodBuckets, riskProfile, ruleStreak, tradeMood } from "@/core/ai/agents";
import type { TradeReview } from "@/core/ai/review";
import { emotionImpact } from "@/core/stats";
import type { TradeComputed } from "@/core/types";
import { GradeBadge } from "./report-view";

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

export function AnalystPanel({ trades, reviews }: { trades: TradeComputed[]; reviews: Map<string, TradeReview> }) {
  const recent = [...trades].reverse().slice(0, 12);
  const dist = useMemo(() => {
    const d: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const t of trades.slice(-60)) d[reviews.get(t.id)!.grade]++;
    return d;
  }, [trades, reviews]);
  const max = Math.max(...Object.values(dist), 1);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader title="Grade distribution" subtitle="Last 60 trades, by process grade" />
        <div className="flex h-44 items-end gap-3 px-5 pb-5">
          {Object.entries(dist).map(([g, n]) => (
            <div key={g} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="num text-[11px] text-muted">{n}</span>
              <div className="w-full rounded-t-md bg-gradient-to-t from-violet/30 to-violet transition-[height]" style={{ height: `${(n / max) * 100}px` }} />
              <GradeBadge grade={g as TradeReview["grade"]} size="sm" />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Recently graded" subtitle="Click any trade for the full breakdown" />
        <div className="px-3 pb-3">
          {recent.map((t) => {
            const r = reviews.get(t.id)!;
            return (
              <Link key={t.id} href={`/journal/${t.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                <GradeBadge grade={r.grade} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{t.symbol} <span className="text-xs font-normal text-muted">{t.side}</span></div>
                  <div className="truncate text-[11px] text-muted">{r.verdict} · {(r.wrong[0] ?? r.right[0] ?? "").replace(/\.$/, "")}</div>
                </div>
                <div className="text-right"><Money usd={t.pnl} sign className="text-sm font-semibold" /><div className="text-[10px] text-faint">{fmtDate(t.closedAt)}</div></div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function HabitPanel({ trades, now }: { trades: TradeComputed[]; now: number }) {
  const habits = useMemo(() => detectHabits(trades, now), [trades, now]);
  const streak = ruleStreak(trades);
  const days = useMemo(() => {
    // 35-day discipline heatmap: share of trades that followed the plan each day.
    const out: { date: string; rate: number | null; n: number }[] = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
      const xs = trades.filter((t) => t.openedAt.slice(0, 10) === d);
      out.push({ date: d, n: xs.length, rate: xs.length ? xs.filter((t) => t.rulesFollowed).length / xs.length : null });
    }
    return out;
  }, [trades, now]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader title="Habit tracker" subtitle="Last 30 days vs the 30 before" />
        <div className="space-y-1 px-5 pb-5">
          {habits.map((h) => {
            const better = h.kind === "good" ? h.rate >= h.prevRate : h.rate <= h.prevRate;
            const c = h.kind === "good" ? (h.rate >= 0.7 ? "#2fe39a" : "#fbbf24") : h.rate <= 0.05 ? "#2fe39a" : h.rate <= 0.15 ? "#fbbf24" : "#ff5470";
            return (
              <div key={h.id} className="grid grid-cols-[1fr_120px_56px_70px] items-center gap-3 border-b border-line/50 py-2 text-sm last:border-0">
                <div className="min-w-0"><div className="truncate font-medium">{h.kind === "good" ? "✅" : "⚠️"} {h.name}</div><div className="truncate text-[11px] text-faint">{h.detail}</div></div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${Math.min(100, h.rate * 100)}%`, background: c }} /></div>
                <div className="num text-right text-xs"><span style={{ color: c }}>{pct(h.rate)}</span> <span className={better ? "text-profit" : "text-loss"}>{better ? "▲" : "▼"}</span></div>
                <div className="text-right text-xs">{h.impact ? <Money usd={h.impact} sign compact /> : <span className="text-faint">—</span>}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <CardHeader title="Discipline chain" subtitle="Plan followed, day by day" right={<span className="num rounded-md bg-profit/12 px-2 py-0.5 text-xs font-bold text-profit">🔗 {streak} streak</span>} />
        <div className="grid grid-cols-7 gap-1.5 px-5 pb-3">
          {days.map((d) => (
            <div key={d.date} title={`${d.date}: ${d.n} trades${d.rate != null ? `, ${pct(d.rate)} on plan` : ""}`} className="aspect-square rounded-md" style={{ background: d.rate == null ? "#121821" : d.rate >= 0.99 ? "#2fe39a" : d.rate >= 0.6 ? "#2fe39a88" : d.rate >= 0.3 ? "#fbbf2488" : "#ff547099" }} />
          ))}
        </div>
        <div className="flex items-center justify-between px-5 pb-5 text-[10px] text-faint"><span>35 days ago</span><span className="flex items-center gap-1">Off plan <i className="h-2 w-2 rounded-sm bg-loss/60" /><i className="h-2 w-2 rounded-sm bg-gold/60" /><i className="h-2 w-2 rounded-sm bg-profit/60" /><i className="h-2 w-2 rounded-sm bg-profit" /> On plan</span><span>Today</span></div>
      </Card>
    </div>
  );
}

export function RiskPanel({ trades, account }: { trades: TradeComputed[]; account: number }) {
  const rp = useMemo(() => riskProfile(trades, account), [trades, account]);
  const buckets = useMemo(() => {
    const b = [{ l: "≤0.5%", n: 0 }, { l: "0.5–1%", n: 0 }, { l: "1–1.5%", n: 0 }, { l: "1.5–2%", n: 0 }, { l: "2–3%", n: 0 }, { l: ">3%", n: 0 }];
    for (const r of rp.riskPcts.slice(-100)) b[r <= 0.005 ? 0 : r <= 0.01 ? 1 : r <= 0.015 ? 2 : r <= 0.02 ? 3 : r <= 0.03 ? 4 : 5].n++;
    return b;
  }, [rp]);
  const max = Math.max(...buckets.map((b) => b.n), 1);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Your guardrails" subtitle="Recommended from your own win rate, payoff and drawdown" />
        <div className="space-y-2 px-5 pb-5">
          {rp.guardrails.map((g) => (
            <div key={g.label} className="flex items-start gap-3 rounded-lg border border-cyan/20 bg-cyan/[.04] px-3 py-2.5">
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{g.label}</div><div className="text-[11.5px] leading-snug text-muted">{g.why}</div></div>
              <div className="num shrink-0 rounded-md bg-cyan/12 px-2 py-1 text-sm font-bold text-cyan">{g.value}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Risk per trade" subtitle="Last 100 trades, % of equity at entry" />
        <div className="flex h-48 items-end gap-2 px-5 pb-2">
          {buckets.map((b, i) => (
            <div key={b.l} className="flex flex-1 flex-col items-center gap-1">
              <span className="num text-[11px] text-muted">{b.n}</span>
              <div className="w-full rounded-t-md" style={{ height: `${(b.n / max) * 130}px`, background: i <= 1 ? "#2fe39a" : i <= 3 ? "#fbbf24" : "#ff5470", opacity: 0.85 }} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-5 pb-5">{buckets.map((b) => <span key={b.l} className="num flex-1 text-center text-[10px] text-faint">{b.l}</span>)}</div>
      </Card>
    </div>
  );
}

export function SentimentPanel({ trades, now }: { trades: TradeComputed[]; now: number }) {
  const mm = useMemo(() => marketMood(now, 60), [now]);
  const buckets = useMemo(() => moodBuckets(trades, now), [trades, now]);
  const emo = useMemo(() => emotionImpact(trades), [trades]);
  const moodLine = useMemo(() => {
    const xs = trades.slice(-40);
    return xs.map((t, i) => ({ i, m: tradeMood(t), win: t.win }));
  }, [trades]);
  const maxAbs = Math.max(...emo.map((e) => Math.abs(e.pnl)), 1);
  const angle = -90 + (mm.index / 100) * 180;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader title="Market mood" subtitle="Fear & greed · demo feed" />
        <div className="flex flex-col items-center px-5 pb-5">
          <svg viewBox="0 0 200 112" className="w-full max-w-[240px]">
            <defs><linearGradient id="fg" x1="0" x2="1"><stop offset="0" stopColor="#ff5470" /><stop offset=".5" stopColor="#fbbf24" /><stop offset="1" stopColor="#2fe39a" /></linearGradient></defs>
            <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="url(#fg)" strokeWidth="14" strokeLinecap="round" />
            <g transform={`rotate(${angle} 100 100)`}><line x1="100" y1="100" x2="100" y2="28" stroke="#e8eef5" strokeWidth="3" strokeLinecap="round" /></g>
            <circle cx="100" cy="100" r="6" fill="#e8eef5" />
          </svg>
          <div className="num -mt-1 text-3xl font-bold">{mm.index}</div>
          <div className="text-sm font-semibold text-muted">{mm.label}</div>
          <div className="mt-3 grid w-full grid-cols-2 gap-2 text-center text-[11px]">
            <div className="rounded-lg bg-surface-2 py-2"><div className="text-faint">Funding</div><div className="font-semibold">{mm.fundingBias[0].toUpperCase() + mm.fundingBias.slice(1)}</div></div>
            <div className="rounded-lg bg-surface-2 py-2"><div className="text-faint">Long/short</div><div className="num font-semibold">{mm.longShort}</div></div>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="You vs market mood" subtitle="Expectancy per trade by mood on entry day" />
        <div className="space-y-2.5 px-5 pb-5">
          {buckets.map((b) => {
            const m = Math.max(...buckets.map((x) => Math.abs(x.expectancy)), 1);
            return (
              <div key={b.label} className="text-xs">
                <div className="mb-1 flex justify-between"><span className="text-muted">{b.label} <span className="text-faint">· {b.count}</span></span><Money usd={b.expectancy} sign /></div>
                <div className="relative h-2 rounded-full bg-surface-3"><div className="absolute top-0 h-2 rounded-full" style={{ left: b.expectancy >= 0 ? "50%" : `${50 - (Math.abs(b.expectancy) / m) * 50}%`, width: `${(Math.abs(b.expectancy) / m) * 50}%`, background: b.expectancy >= 0 ? "#2fe39a" : "#ff5470" }} /><div className="absolute left-1/2 top-[-2px] h-3 w-px bg-line-strong" /></div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <CardHeader title="Emotion P&L" subtitle="Net result by logged emotion" />
        <div className="space-y-2 px-5 pb-5">
          {emo.map((e) => (
            <div key={e.emotion} className="flex items-center gap-2 text-xs">
              <span className="w-24 truncate">{EMOTION_META[e.emotion].icon} {EMOTION_META[e.emotion].label}</span>
              <div className="relative h-2 flex-1 rounded-full bg-surface-3"><div className="absolute top-0 h-2 rounded-full" style={{ width: `${(Math.abs(e.pnl) / maxAbs) * 100}%`, background: e.pnl >= 0 ? "#2fe39a" : "#ff5470" }} /></div>
              <Money usd={e.pnl} sign compact className="w-16 text-right" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader title="Mood timeline" subtitle="Your last 40 trades: emotion + tone of your notes. Dots show win (green) or loss (red)." />
        <div className="px-5 pb-5">
          <svg viewBox={`0 0 ${Math.max(1, moodLine.length - 1) * 20} 100`} preserveAspectRatio="none" className="h-28 w-full">
            <line x1="0" x2={moodLine.length * 20} y1="50" y2="50" stroke="#1d2633" strokeDasharray="4 4" />
            <polyline fill="none" stroke="#fbbf24" strokeWidth="2" vectorEffect="non-scaling-stroke" points={moodLine.map((p) => `${p.i * 20},${50 - p.m * 42}`).join(" ")} />
            {moodLine.map((p) => <circle key={p.i} cx={p.i * 20} cy={50 - p.m * 42} r="3.5" fill={p.win ? "#2fe39a" : "#ff5470"} vectorEffect="non-scaling-stroke" />)}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-faint"><span>Older</span><span>Tilted ↓ · Locked in ↑</span><span>Latest</span></div>
        </div>
      </Card>
    </div>
  );
}

export function cnTone(score: number) {
  return cn(score >= 70 ? "text-profit" : score >= 50 ? "text-gold" : "text-loss");
}
