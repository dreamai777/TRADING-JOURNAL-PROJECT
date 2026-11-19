"use client";
import { BookOpen, Check, Crown, Dumbbell, Lock, PlayCircle, Radio, Route, Video } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, PageHeader, Progress, cn } from "@/components/ui";
import { TRACKS, academyState, lessonXp } from "@/core/academy";
import { TRADER_TYPES, studyPath } from "@/core/trader-test";
import { useJournal } from "@/lib/hooks";
import { isPaid } from "@/core/plans";
import { useStore } from "@/lib/store";

const FORMAT = { read: { icon: BookOpen, label: "Read" }, video: { icon: PlayCircle, label: "Video" }, drill: { icon: Dumbbell, label: "Drill" } } as const;

const GUILD = [
  { icon: Radio, title: "Premium channel", body: "Live trade breakdowns and market prep with mentors, plus a members-only chat." },
  { icon: Video, title: "Video vault", body: "Recorded sessions and the A+ setup library: real examples, annotated bar by bar." },
  { icon: Route, title: "Battle-ready paths", body: "30-day plans for each class that take you from setup to consistent execution, fast." },
];

export default function AcademyPage() {
  const { me, trades, setups } = useJournal();
  const setPlan = useStore((s) => s.setPlan);
  if (!me) return null;
  const guild = isPaid(me.plan);
  const st = academyState({ trades, setups, testTaken: !!me.traderProfile, lessonsDone: me.lessonsDone ?? [] }, guild);
  const byId = new Map(st.lessons.map((l) => [l.id, l]));
  const path = me.traderProfile ? studyPath(me.traderProfile).map((p) => byId.get(p.lesson.id)!).filter((l) => !l.completed).slice(0, 3) : [];

  return (
    <div>
      <PageHeader title="Academy" subtitle="Self-study that plugs into your journal. Lessons unlock as you complete quests." right={
        <div className="text-right">
          <div className="num text-sm font-bold">{st.freeDone}/{st.freeTotal} free lessons</div>
          <Progress value={st.freeDone / st.freeTotal} className="mt-1 w-40" />
        </div>
      } />

      <div className="grid items-start gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="chrome p-5">
          {me.traderProfile ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-accent">Your path · {TRADER_TYPES[me.traderProfile.primary].name}</div>
                  <div className="font-display text-lg font-bold">Up next for you</div>
                </div>
                <Link href="/class-test" className="text-xs text-muted hover:text-ink">Retake test</Link>
              </div>
              <div className="mt-3 space-y-2">
                {path.length === 0 && <div className="text-sm text-muted">You finished every lesson on your path. Legend.</div>}
                {path.map((l) => <LessonRow key={l.id} l={l} />)}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="text-4xl">🧭</div>
              <div className="flex-1">
                <div className="font-display text-lg font-bold">Get your personal study path</div>
                <div className="text-sm text-muted">Take the 3-minute Trader Class Test. It finds your style and weak spots and orders the lessons for you.</div>
              </div>
              <Link href="/class-test" className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink">Take the test</Link>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Academy quests" subtitle="Each quest unlocks new lessons and XP." />
          <div className="space-y-2.5 px-5 pb-5">
            {st.quests.filter((q) => q.id !== "aq-enter").map((q) => (
              <div key={q.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className={cn("flex items-center gap-2", q.done && "text-muted line-through decoration-faint")}>{q.done ? <Check size={14} className="text-profit" /> : <span className="h-3.5 w-3.5 rounded-full border border-line-strong" />}{q.title}</span>
                  <span className="num shrink-0 text-xs font-bold text-gold">+{q.xp} XP</span>
                </div>
                {!q.done && <div className="ml-6 mt-1 flex items-center gap-2"><Progress value={q.value / q.goal} height={4} className="flex-1" /><span className="num text-[10px] text-faint">{q.value}/{q.goal}</span></div>}
                <div className="ml-6 mt-0.5 text-[10px] text-faint">Unlocks {q.unlocks.length} lesson{q.unlocks.length > 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {TRACKS.map((track) => {
        const ls = st.lessons.filter((l) => l.track === track);
        return (
          <div key={track} className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">{track}</h2>
              <span className="num text-xs text-muted">{ls.filter((l) => l.completed).length}/{ls.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {ls.map((l) => <LessonCard key={l.id} l={l} />)}
            </div>
          </div>
        );
      })}

      <Card className="chrome mt-8 overflow-hidden p-6" style={{ background: "radial-gradient(100% 80% at 100% 0%, rgba(251,191,36,.14), transparent 60%), var(--surface)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-gold"><Crown size={16} /> Premium Academy</div>
            <div className="mt-1 font-display text-2xl font-bold">Speed up. Gear up. Battle-ready sooner.</div>
            <p className="mt-1 max-w-2xl text-sm text-muted">Everything in the free Academy, plus the material that shortens the learning curve the most.</p>
          </div>
          <button onClick={() => setPlan(guild ? "free" : "premium")} className="rounded-lg border border-gold/50 px-3 py-2 text-xs font-bold text-gold">{guild ? "Exit Premium preview" : "Preview Premium (demo)"}</button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {GUILD.map((g) => (
            <div key={g.title} className="rounded-xl border border-line bg-surface-2 p-4">
              <g.icon size={20} className="text-gold" />
              <div className="mt-2 font-semibold">{g.title}</div>
              <div className="mt-1 text-xs text-muted">{g.body}</div>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-faint">Premium and Ultra</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

type L = ReturnType<typeof academyState>["lessons"][number];

function LessonRow({ l }: { l: L }) {
  const F = FORMAT[l.format];
  return (
    <Link href={`/academy/${l.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 transition hover:border-line-strong">
      <F.icon size={18} className={l.tier === "premium" ? "text-gold" : "text-accent"} />
      <div className="min-w-0 flex-1 text-sm font-semibold">{l.title}</div>
      {!l.unlocked && <Lock size={14} className="text-faint" />}
      <span className="num text-[11px] text-muted">{l.minutes}m</span>
    </Link>
  );
}

function LessonCard({ l }: { l: L }) {
  const F = FORMAT[l.format];
  const premium = l.tier === "premium";
  return (
    <Link href={`/academy/${l.id}`} className={cn("chrome group flex flex-col rounded-xl border p-4 transition", l.completed ? "border-profit/30 bg-profit/5" : l.unlocked ? "border-line bg-surface hover:border-line-strong" : "border-line bg-surface/50")}>
      <div className="flex items-center justify-between text-[11px]">
        <span className={cn("flex items-center gap-1 font-semibold", premium ? "text-gold" : "text-muted")}><F.icon size={13} /> {F.label} · {l.minutes} min</span>
        {l.completed ? <span className="flex items-center gap-1 font-bold text-profit"><Check size={12} /> Done</span> : premium ? <span className="flex items-center gap-1 font-bold text-gold"><Crown size={11} /> Premium</span> : <span className="num font-bold text-gold">+{lessonXp(l)} XP</span>}
      </div>
      <div className={cn("mt-2 text-sm font-semibold leading-snug", !l.unlocked && "text-ink/60")}>{l.title}</div>
      {!l.unlocked && (
        <div className="mt-auto pt-3 text-[11px] text-faint">
          <Lock size={11} className="mr-1 inline" />
          {premium ? "Premium members" : `Quest: ${l.quest?.title ?? "—"}`}
        </div>
      )}
    </Link>
  );
}
