"use client";
import { ArrowLeft, Check, Lock, PlayCircle, BookOpen, Dumbbell, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { JOBS } from "@/core/character";
import { QUESTIONS, SKILLS, TRADER_TYPES, pathQuests, scoreTest, studyPath, type SkillId, type TestResult, type TraderTypeId } from "@/core/trader-test";
import { useStore } from "@/lib/store";
import { ScoreRadar } from "./charts";
import { CharacterSprite } from "./character-sprite";
import { cn } from "./ui";

/** The question flow. One question at a time, auto-advances, can go back. */
export function ClassTestFlow({ onDone }: { onDone: (r: TestResult) => void }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const q = QUESTIONS[i];
  const pick = (k: number) => {
    const next = { ...answers, [q.id]: k };
    setAnswers(next);
    if (i < QUESTIONS.length - 1) setTimeout(() => setI(i + 1), 160);
    else onDone(scoreTest(next));
  };
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between text-xs text-muted">
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="flex items-center gap-1 disabled:opacity-30"><ArrowLeft size={14} /> Back</button>
        <span><b className="text-ink">{q.section}</b> · {i + 1} / {QUESTIONS.length}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-cyan transition-all duration-300" style={{ width: `${((i + 1) / QUESTIONS.length) * 100}%` }} />
      </div>
      <h2 key={q.id} className="mt-8 font-display text-2xl font-bold leading-snug sm:text-3xl">{q.q}</h2>
      {q.section === "Knowledge" && <p className="mt-2 text-sm text-muted">Quick check. No pressure, it just helps us pick the right lessons.</p>}
      <div className="mt-6 grid gap-2.5">
        {q.options.map((o, k) => (
          <button key={o.label} onClick={() => pick(k)} className={cn("chrome rounded-xl border px-4 py-3.5 text-left text-[15px] transition", answers[q.id] === k ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-line-strong")}>
            <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-md bg-surface-3 text-xs font-bold text-muted">{"ABCD"[k]}</span>{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const FORMAT_ICON = { read: BookOpen, video: PlayCircle, drill: Dumbbell } as const;

/** Full result: class, type match, skill radar, strengths and weaknesses, study path, setups, quests. */
export function TestResultView({ r, compact = false, onRetake }: { r: TestResult; compact?: boolean; onRetake?: () => void }) {
  const me = useStore((s) => s.users.find((u) => u.id === s.sessionUserId));
  const setJobClass = useStore((s) => s.setJobClass);
  const t = TRADER_TYPES[r.primary];
  const job = JOBS[t.job];
  const ranked = (Object.keys(r.typeMatch) as TraderTypeId[]).sort((a, b) => r.typeMatch[b] - r.typeMatch[a]);
  const radar = (Object.keys(r.skills) as SkillId[]).map((k) => ({ axis: SKILLS[k].name, value: r.skills[k] }));
  const path = studyPath(r);
  const quests = pathQuests(r);
  const isClass = me?.jobClass === t.job;

  return (
    <div className="space-y-4">
      {/* Hero result */}
      <div className="chrome overflow-hidden rounded-2xl border border-line p-5 sm:p-6" style={{ background: `radial-gradient(90% 90% at 0% 0%, ${job.color}26, transparent 60%), var(--surface)` }}>
        <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
          <div className="flex justify-center"><CharacterSprite job={t.job} condition="onfire" size={compact ? 110 : 150} tier={2} /></div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.2em]" style={{ color: job.color }}>Your trader class</div>
            <div className="mt-1 font-display text-3xl font-bold">{t.icon} {t.name}</div>
            <div className="mt-1 text-sm text-ink/80">Plays as the <b style={{ color: job.color }}>{job.name}</b> · second style: {TRADER_TYPES[r.secondary].name}</div>
            <p className="mt-3 text-sm text-muted">{t.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-md bg-surface-3 px-2 py-1">⏱ {t.hold}</span>
              <span className="rounded-md bg-surface-3 px-2 py-1">📈 {t.timeframes}</span>
              <span className="rounded-md bg-surface-3 px-2 py-1">🖥 {t.screenTime}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {me ? (
                <button onClick={() => setJobClass(t.job)} disabled={isClass} className="chrome rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink disabled:opacity-60">{isClass ? `✓ You play as ${job.name}` : `Play as ${job.name}`}</button>
              ) : (
                <Link href="/login?next=/profile" className="chrome rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink">Save my result: create a free account</Link>
              )}
              {onRetake && <button onClick={onRetake} className="rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold">Retake test</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Skill radar */}
        <div className="chrome rounded-2xl border border-line bg-surface p-5">
          <div className="font-display font-bold">Strengths and weaknesses</div>
          <div className="text-xs text-muted">Six core trading skills, scored 0 to 100 from your answers.</div>
          <ScoreRadar data={radar} height={260} />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-profit/25 bg-profit/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-profit">Strengths</div>
              {r.strengths.map((k) => <div key={k} className="mt-1 flex justify-between"><span>{SKILLS[k].name}</span><b className="num">{r.skills[k]}</b></div>)}
            </div>
            <div className="rounded-xl border border-loss/25 bg-loss/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-loss">Work on</div>
              {r.weaknesses.map((k) => <div key={k} className="mt-1 flex justify-between"><span>{SKILLS[k].name}</span><b className="num">{r.skills[k]}</b></div>)}
            </div>
          </div>
          <div className="mt-3 text-xs text-muted">Knowledge checks: <b className="text-ink">{r.knowledgeCorrect}/{r.knowledgeTotal}</b> correct.</div>
        </div>

        {/* Type match */}
        <div className="chrome rounded-2xl border border-line bg-surface p-5">
          <div className="font-display font-bold">Style match</div>
          <div className="text-xs text-muted">How closely you fit each trading style.</div>
          <div className="mt-4 space-y-3">
            {ranked.map((id) => {
              const tt = TRADER_TYPES[id], c = JOBS[tt.job].color, pct = Math.round(r.typeMatch[id] * 100);
              return (
                <div key={id}>
                  <div className="flex justify-between text-sm"><span>{tt.icon} {tt.name}</span><span className="num font-bold" style={{ color: id === r.primary ? c : undefined }}>{pct}%</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(3, (r.typeMatch[id] / Math.max(...Object.values(r.typeMatch))) * 100)}%`, background: c, opacity: id === r.primary ? 1 : 0.5 }} /></div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div><div className="mb-1 font-bold text-profit">Natural strengths</div>{t.strengths.map((x) => <div key={x} className="text-muted">• {x}</div>)}</div>
            <div><div className="mb-1 font-bold text-gold">Watch out for</div>{t.watchOuts.map((x) => <div key={x} className="text-muted">• {x}</div>)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Study path */}
        <div className="chrome rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2 font-display font-bold"><Sparkles size={16} className="text-accent" /> Your study path</div>
          <div className="text-xs text-muted">Fix your weakest skills first, then master your style. In this order.</div>
          <ol className="mt-4 space-y-2">
            {path.map(({ lesson: l, why }, k) => {
              const Icon = FORMAT_ICON[l.format];
              return (
                <li key={l.id} className="flex gap-3 rounded-xl border border-line bg-surface-2 p-3">
                  <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-bold">{k + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{l.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{why}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-[10px]">
                    <span className="flex items-center gap-1 text-faint"><Icon size={12} /> {l.minutes}m</span>
                    {l.tier === "premium" ? <span className="flex items-center gap-1 font-bold text-gold"><Lock size={10} /> Guild</span> : <span className="font-bold text-profit">Free</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-4">
          <div className="chrome rounded-2xl border border-line bg-surface p-5">
            <div className="font-display font-bold">Setups that fit you</div>
            <div className="mt-3 space-y-2">
              {t.setups.map((s) => <div key={s} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm"><span style={{ color: job.color }}>◆</span>{s}</div>)}
            </div>
            <div className="mt-2 text-[11px] text-faint">Add them to your Arsenal to track which one really has an edge.</div>
          </div>
          <div className="chrome rounded-2xl border border-gold/30 bg-surface p-5">
            <div className="font-display font-bold text-gold">Path quests</div>
            <div className="mt-3 space-y-2">
              {quests.map((q) => <div key={q.id} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><Check size={14} className="text-faint" />{q.title}</span><span className="num shrink-0 text-xs font-bold text-gold">+{q.xp} XP</span></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
