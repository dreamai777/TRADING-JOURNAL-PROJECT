"use client";
import { Bars, CharacterArena, useCharacter } from "@/components/character";
import { CharacterSprite } from "@/components/character-sprite";
import { Card, CardHeader, Money, PageHeader, Progress, cn, fmtDateTime, fmtPct } from "@/components/ui";
import { CONDITIONS, JOBS, STAT_INFO, type StatKey } from "@/core/character";
import { RANKS, badges, journalStreak, xpBreakdown } from "@/core/game";
import type { JobClass } from "@/core/types";
import { useStore } from "@/lib/store";
import { LESSONS } from "@/core/academy";
import { TestResultView } from "@/components/class-test";
import Link from "next/link";

export default function ProfilePage() {
  const { me, trades, setups, job, recommended, c, summary } = useCharacter();
  const setJobClass = useStore((s) => s.setJobClass);
  if (!me) return null;
  const trophies = badges(trades, setups, { testTaken: !!me.traderProfile, lessonsDone: me.lessonsDone?.length ?? 0, freeLessons: LESSONS.filter((l) => l.tier === "free").length });
  const recent = [...trades].reverse().slice(0, 10);

  return (
    <div>
      <PageHeader title="Trader profile" subtitle="Your character grows with every journaled trade and reacts to how you're really trading." />

      <Card className="overflow-hidden p-4">
        <CharacterArena height={240} big />
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ background: `${c.def.color}22`, boxShadow: `inset 0 0 0 1px ${c.def.color}66` }}>{me.avatar}</div>
            <div>
              <div className="font-display text-2xl font-bold">{me.name}</div>
              <div className="text-sm" style={{ color: c.def.color }}>Lv {c.progress.level} {c.title} · {c.def.name}</div>
              <div className="mt-1 text-xs text-muted">Rank <b style={{ color: c.progress.rank.color }}>{c.progress.rank.name}</b> · {c.progress.xp.toLocaleString()} XP · {journalStreak(trades)}-day streak</div>
            </div>
          </div>
          <Bars hp={c.hp} energy={c.energy} />
          <div className="rounded-xl border p-3" style={{ borderColor: `${c.cond.color}55`, background: `${c.cond.color}10` }}>
            <div className="text-sm font-bold" style={{ color: c.cond.color }}>{c.cond.emoji} Condition: {c.cond.label}</div>
            <div className="mt-1 text-xs text-muted">{c.cond.desc}</div>
          </div>
        </div>
      </Card>

      <div className="mt-4">
        {me.traderProfile ? (
          <TestResultView r={me.traderProfile} compact />
        ) : (
          <Card className="chrome flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-left">
            <div className="text-3xl">🧭</div>
            <div className="flex-1">
              <div className="font-display font-bold">Take the Trader Class Test</div>
              <div className="text-sm text-muted">3 minutes. Find your trading style, see your strengths and weaknesses, and get a study path built for you.</div>
            </div>
            <Link href="/class-test" className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink">Start the test</Link>
          </Card>
        )}
        {me.traderProfile && <div className="mt-2 text-right text-xs"><Link href="/class-test" className="text-accent">Retake the class test</Link></div>}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader title="Attributes" subtitle="Earned from your real stats. ★ is your class's main attribute." />
          <div className="space-y-3 px-5 pb-5">
            {(Object.keys(c.stats) as StatKey[]).map((k) => (
              <div key={k}>
                <div className="flex items-center justify-between text-sm">
                  <span><b className={k === c.def.primary ? "text-gold" : ""}>{k}{k === c.def.primary && " ★"}</b> <span className="text-muted">{STAT_INFO[k].name}</span></span>
                  <span className="num font-bold">{c.stats[k]}</span>
                </div>
                <Progress value={c.stats[k] / 99} color={k === c.def.primary ? "#fbbf24" : c.def.color} className="mt-1" height={5} />
                <div className="mt-0.5 text-[11px] text-faint">From {STAT_INFO[k].from.toLowerCase()}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Job class" subtitle="Pick the class that matches how you trade. Your title evolves as you level up." />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3">
            {(Object.keys(JOBS) as JobClass[]).map((id) => {
              const d = JOBS[id];
              const active = job === id;
              return (
                <button key={id} onClick={() => setJobClass(id)} className={cn("relative cursor-pointer rounded-xl border p-3 text-left transition", active ? "bg-surface-2" : "border-line hover:border-line-strong")} style={active ? { borderColor: d.color, boxShadow: `0 0 0 1px ${d.color}55, 0 0 24px -10px ${d.color}` } : undefined}>
                  {id === recommended && <span className="absolute right-2 top-2 rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent">Fits you</span>}
                  <div className="flex h-[110px] items-end justify-center">
                    <CharacterSprite job={id} condition={active ? c.condition : "steady"} size={80} tier={active ? (c.tier as 0 | 1 | 2) : 0} />
                  </div>
                  <div className="mt-1 font-display font-bold" style={{ color: d.color }}>{d.name}</div>
                  <div className="text-[11px] font-semibold text-ink/80">{d.style}</div>
                  <div className="mt-1 text-[11px] text-muted">{d.blurb}</div>
                  <div className="mt-2 text-[10px] text-faint">{d.titles.join(" → ")}</div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={`${c.def.name} gear progression`} subtitle="Your gear upgrades as you level up: new gear at level 15, then legendary gold gear and a crown at level 30." />
        <div className="grid grid-cols-3 gap-3 px-5 pb-5">
          {c.def.titles.map((t, i) => {
            const unlocked = c.tier >= i;
            const lvl = [1, 15, 30][i];
            return (
              <div key={t} className={cn("relative flex flex-col items-center rounded-xl border p-4", unlocked ? "border-line-strong bg-surface-2" : "border-line opacity-60")} style={c.tier === i ? { borderColor: c.def.color, boxShadow: `0 0 24px -12px ${c.def.color}` } : undefined}>
                <div className={cn("flex h-[150px] items-end", !unlocked && "grayscale")}>
                  <CharacterSprite job={job} condition={unlocked ? "strong" : "steady"} size={110} tier={i as 0 | 1 | 2} />
                </div>
                <div className="mt-2 font-display font-bold" style={{ color: unlocked ? c.def.color : undefined }}>{t}</div>
                <div className="text-[11px] text-muted">{["Starter gear", job === "wizard" ? "Sage beard unlocked" : "Cape + pauldrons unlocked", "Legendary gear + crown"][i]}</div>
                <div className="num mt-1 text-[11px] text-faint">{unlocked ? (c.tier === i ? "Equipped" : "Unlocked") : `Unlocks at Lv ${lvl}`}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Activity log" subtitle="How your character earned XP. Process earns XP, not profit." />
          <div className="px-5 pb-4">
            {recent.map((t) => {
              const xp = xpBreakdown(t);
              const total = Math.max(0, xp.reduce((a, b) => a + b.xp, 0));
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/60 py-2.5 last:border-0">
                  <span className="w-28 text-xs text-muted">{fmtDateTime(t.closedAt)}</span>
                  <span className="w-20 text-sm font-semibold">{t.symbol}</span>
                  <Money usd={t.pnl} sign className="w-20 text-xs font-semibold" />
                  <div className="flex flex-1 flex-wrap gap-1">
                    {xp.map((x) => <span key={x.label} className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", x.xp < 0 ? "bg-loss/12 text-loss" : "bg-surface-3 text-muted")}>{x.label} {x.xp > 0 ? "+" : ""}{x.xp}</span>)}
                  </div>
                  <span className="num text-sm font-bold text-gold">+{total} XP</span>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Rank ladder" />
            <div className="space-y-1.5 px-5 pb-5">
              {RANKS.map((r) => {
                const reached = c.progress.xp >= r.min;
                const current = c.progress.rank.name === r.name;
                return (
                  <div key={r.name} className={cn("flex items-center justify-between rounded-lg px-3 py-1.5 text-sm", current ? "bg-surface-3" : "")}>
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: reached ? r.color : "#2a3647" }} /><span className={reached ? "font-semibold" : "text-faint"} style={current ? { color: r.color } : undefined}>{r.name}</span></span>
                    <span className="num text-xs text-muted">{r.min.toLocaleString()} XP</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <CardHeader title="Career" />
            <div className="grid grid-cols-2 gap-3 px-5 pb-5 text-sm">
              <div><div className="text-[10px] uppercase text-faint">Trades</div><div className="num font-semibold">{summary.count}</div></div>
              <div><div className="text-[10px] uppercase text-faint">Net P&L</div><Money usd={summary.netPnl} sign className="font-semibold" /></div>
              <div><div className="text-[10px] uppercase text-faint">Win rate</div><div className="num font-semibold">{fmtPct(summary.winRate, 0)}</div></div>
              <div><div className="text-[10px] uppercase text-faint">Badges</div><div className="num font-semibold">{trophies.filter((b) => b.unlocked).length}/{trophies.length}</div></div>
            </div>
            <div className="flex flex-wrap gap-1.5 px-5 pb-5 text-xl">{trophies.filter((b) => b.unlocked).map((b) => <span key={b.id} title={b.name}>{b.icon}</span>)}</div>
          </Card>
          <Card className="p-4 text-xs text-muted">
            <div className="mb-1 font-semibold text-ink">How your character feels</div>
            {Object.values(CONDITIONS).map((x) => <div key={x.label}>{x.emoji} <b style={{ color: x.color }}>{x.label}</b>: {x.desc}</div>)}
          </Card>
        </div>
      </div>
    </div>
  );
}
