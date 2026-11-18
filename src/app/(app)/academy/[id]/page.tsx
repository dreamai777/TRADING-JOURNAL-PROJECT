"use client";
import { ArrowLeft, ArrowRight, Check, Crown, Lock, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, cn } from "@/components/ui";
import { academyState, lessonXp } from "@/core/academy";
import { SKILLS } from "@/core/trader-test";
import { CONTENT, PREMIUM_OUTLINES } from "@/core/lesson-content";
import { useJournal } from "@/lib/hooks";
import { useStore } from "@/lib/store";

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  return <Lesson key={id} id={id} />;
}

function Lesson({ id }: { id: string }) {
  const { me, trades, setups } = useJournal();
  const complete = useStore((s) => s.completeLesson);
  const [picked, setPicked] = useState<number | null>(null);
  if (!me) return null;
  const st = academyState({ trades, setups, testTaken: !!me.traderProfile, lessonsDone: me.lessonsDone ?? [] }, me.plan === "guild");
  const idx = st.lessons.findIndex((l) => l.id === id);
  const l = st.lessons[idx];
  if (!l) return <div className="py-20 text-center text-muted">Lesson not found. <Link href="/academy" className="text-accent">Back to the Academy</Link></div>;
  const body = CONTENT[l.id];
  const next = st.lessons.slice(idx + 1).find((x) => x.unlocked && !x.completed);
  const xp = lessonXp(l);
  const premium = l.tier === "premium";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/academy" className="flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Academy</Link>
      <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-accent">{l.track} · {SKILLS[l.skill].name}</div>
      <h1 className="mt-1 font-display text-3xl font-bold leading-tight">{l.title}</h1>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
        <span>{l.minutes} min</span>
        {premium ? <span className="flex items-center gap-1 font-bold text-gold"><Crown size={12} /> Guild</span> : <span className="font-bold text-profit">Free</span>}
        <span className="num font-bold text-gold">+{xp} XP</span>
      </div>

      {!l.unlocked ? (
        <Card className="mt-6 p-6 text-center">
          <Lock className="mx-auto text-faint" />
          <div className="mt-2 font-display text-lg font-bold">{premium ? "Guild lesson" : "Locked"}</div>
          <p className="mt-1 text-sm text-muted">{premium ? "This lesson is part of the Guild premium plan." : <>Complete the quest <b className="text-ink">{l.quest?.title}</b> to unlock it.</>}</p>
          {premium && PREMIUM_OUTLINES[l.id] && <Outline items={PREMIUM_OUTLINES[l.id]} />}
          <Link href="/academy" className="mt-4 inline-block rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold">Back to the Academy</Link>
        </Card>
      ) : premium ? (
        <>
          <div className="mt-6 flex aspect-video items-center justify-center rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-violet/10">
            {body?.videoUrl ? <video src={body.videoUrl} controls className="h-full w-full rounded-2xl" /> : <div className="text-center"><PlayCircle size={48} className="mx-auto text-gold" /><div className="mt-2 text-sm text-muted">Recording drops with the Guild launch</div></div>}
          </div>
          {PREMIUM_OUTLINES[l.id] && <Card className="mt-4 p-5"><Outline items={PREMIUM_OUTLINES[l.id]} /></Card>}
          <Done done={l.completed} xp={xp} onDone={() => complete(l.id, xp)} next={next} />
        </>
      ) : body ? (
        <>
          <p className="mt-6 text-lg text-ink/90">{body.intro}</p>
          <div className="mt-6 space-y-3">
            {body.points.map((p, k) => (
              <Card key={p.h} className="p-5">
                <div className="flex items-center gap-2 font-display font-bold"><span className="num flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-xs text-accent">{k + 1}</span>{p.h}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink/80">{p.p}</p>
              </Card>
            ))}
          </div>
          {body.drill && <div className="mt-4 rounded-xl border border-cyan/30 bg-cyan/5 p-4 text-sm"><b className="text-cyan">Drill: </b>{body.drill}</div>}
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm"><b className="text-accent">Takeaway: </b>{body.takeaway}</div>

          {body.check && (
            <Card className="chrome mt-6 p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gold">Lesson check</div>
              <div className="mt-1 font-semibold">{body.check.q}</div>
              <div className="mt-3 grid gap-2">
                {body.check.options.map((o, k) => {
                  const right = picked != null && k === body.check!.answer, wrong = picked === k && k !== body.check!.answer;
                  return (
                    <button key={o} disabled={l.completed} onClick={() => { setPicked(k); if (k === body.check!.answer && !l.completed) complete(l.id, xp); }}
                      className={cn("rounded-lg border px-3 py-2.5 text-left text-sm transition", right ? "border-profit bg-profit/10" : wrong ? "border-loss bg-loss/10" : "border-line bg-surface-2 hover:border-line-strong")}>
                      {o}
                    </button>
                  );
                })}
              </div>
              {picked != null && picked !== body.check.answer && <div className="mt-3 text-sm text-loss">Not quite. Read point by point again and try once more.</div>}
              {(l.completed || picked === body.check.answer) && <div className="mt-3 text-sm text-profit">✓ {body.check.why}</div>}
            </Card>
          )}
          <Done done={l.completed || picked === body.check?.answer} xp={xp} onDone={() => complete(l.id, xp)} next={next} needsCheck={!!body.check} />
        </>
      ) : null}
    </div>
  );
}

function Outline({ items }: { items: string[] }) {
  return (
    <div className="mt-3 text-left">
      <div className="text-[11px] font-bold uppercase tracking-wider text-gold">What you&apos;ll learn</div>
      <ul className="mt-2 space-y-1.5 text-sm">{items.map((x) => <li key={x} className="flex gap-2"><span className="text-gold">◆</span>{x}</li>)}</ul>
    </div>
  );
}

function Done({ done, xp, onDone, next, needsCheck }: { done: boolean; xp: number; onDone: () => void; next?: { id: string; title: string }; needsCheck?: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
      {done ? <div className="flex items-center gap-2 font-semibold text-profit"><Check size={18} /> Lesson complete · +{xp} XP</div>
        : needsCheck ? <div className="text-sm text-muted">Answer the lesson check correctly to complete it.</div>
        : <button onClick={onDone} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink">Mark complete · +{xp} XP</button>}
      {next && <Link href={`/academy/${next.id}`} className="flex items-center gap-1 text-sm font-semibold text-accent">Next: {next.title.length > 42 ? next.title.slice(0, 40) + "…" : next.title} <ArrowRight size={14} /></Link>}
    </div>
  );
}
