"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { JOBS, STAT_INFO, characterState, recommendJob, type StatKey } from "@/core/character";
import { useJournal } from "@/lib/hooks";
import { CharacterSprite } from "./character-sprite";
import { Card, Progress, cn } from "./ui";

export function useCharacter() {
  const j = useJournal();
  const [now] = useState(() => Date.now());
  return useMemo(() => {
    const cls = (id?: string) => j.setups.find((s) => s.id === id)?.weaponClass;
    const recommended = recommendJob(j.trades, cls);
    const job = j.me?.jobClass ?? recommended;
    return { ...j, job, recommended, chosen: !!j.me?.jobClass, c: characterState(j.trades, j.account, job, now) };
  }, [j, now]);
}

const SPEED: Record<string, { dur: string; step: string }> = {
  onfire: { dur: "7s", step: ".32s" },
  strong: { dur: "9s", step: ".4s" },
  steady: { dur: "12s", step: ".5s" },
  weak: { dur: "20s", step: ".8s" },
  tilted: { dur: "6s", step: ".28s" },
  burnout: { dur: "1s", step: "1s" },
  resting: { dur: "1s", step: "1s" },
};

/** A small scene where the character patrols, emotes and reacts to recent trading. */
export function CharacterArena({ height = 210, big = false }: { height?: number; big?: boolean }) {
  const { job, c } = useCharacter();
  const [line, setLine] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLine((l) => l + 1), 4200);
    return () => clearInterval(id);
  }, []);
  const still = c.condition === "burnout" || c.condition === "resting";
  const sp = SPEED[c.condition];
  const color = c.def.color;
  const text = c.lines[line % c.lines.length];
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-line", still && "char-still")} style={{ height, background: `linear-gradient(180deg, ${color}26 0%, #0b0f15 70%)` }}>
      {/* parallax hills */}
      <div className="char-drift absolute bottom-[26px] left-0 flex w-[200%] opacity-60">
        {[0, 1].map((k) => (
          <svg key={k} viewBox="0 0 800 80" preserveAspectRatio="none" className="h-[70px] w-1/2">
            <path d="M0 80 L0 50 L60 30 L120 48 L200 18 L280 46 L340 34 L420 52 L500 22 L580 44 L660 28 L740 50 L800 40 L800 80Z" fill={`${color}22`} />
            <path d="M0 80 L0 62 L90 50 L170 64 L250 46 L330 62 L430 52 L520 66 L610 50 L700 62 L800 54 L800 80Z" fill={`${color}33`} />
          </svg>
        ))}
      </div>
      {/* ground */}
      <div className="absolute inset-x-0 bottom-0 h-[28px] border-t border-white/5" style={{ background: "repeating-linear-gradient(90deg, #141b24 0 18px, #111720 18px 36px)" }} />
      {/* stars */}
      {[12, 30, 55, 72, 88].map((x, i) => <span key={i} className="absolute h-[2px] w-[2px] rounded-full bg-white/50" style={{ left: `${x}%`, top: `${10 + (i % 3) * 12}%` }} />)}

      <div className="absolute bottom-[14px] left-[6%]" style={{ ["--dur" as string]: sp.dur, ["--step" as string]: sp.step, ["--dist" as string]: big ? "min(60vw, 820px)" : "min(40vw, 300px)" }}>
        <div className="char-patrol relative">
          <div key={line} className="char-bubble absolute bottom-full left-0 mb-1 w-max max-w-[220px] rounded-xl border border-line-strong bg-surface-2 px-2.5 py-1.5 text-[11px] font-semibold text-ink shadow-lg">
            <span className="mr-1">{c.cond.emoji}</span>
            {text}
            <span className="absolute -bottom-1 left-8 h-2 w-2 rotate-45 border-b border-r border-line-strong bg-surface-2" />
          </div>
          <div className="char-flip">
            <CharacterSprite job={job} condition={c.condition} size={big ? 120 : 92} tier={c.tier as 0 | 1 | 2} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Bars({ hp, energy }: { hp: number; energy: number }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider"><span className="text-loss">HP · Account health</span><span className="num text-muted">{hp}/100</span></div>
        <Progress value={hp / 100} color="#ff5470" height={7} className="mt-1" />
      </div>
      <div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider"><span className="text-cyan">Energy · Mental state</span><span className="num text-muted">{energy}/100</span></div>
        <Progress value={energy / 100} color="#38d9f5" height={7} className="mt-1" />
      </div>
    </div>
  );
}

export function StatGrid({ stats, primary, cols = 3 }: { stats: Record<StatKey, number>; primary: StatKey; cols?: 3 | 6 }) {
  return (
    <div className={cn("grid gap-2", cols === 6 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-3")}>
      {(Object.keys(stats) as StatKey[]).map((k) => (
        <div key={k} title={`${STAT_INFO[k].name}: ${STAT_INFO[k].from}`} className={cn("rounded-lg border px-2.5 py-1.5", k === primary ? "border-gold/40 bg-gold/5" : "border-line bg-surface-2")}>
          <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-muted">{k}{k === primary && <span className="text-gold">★</span>}</div>
          <div className="num text-base font-bold">{stats[k]}</div>
        </div>
      ))}
    </div>
  );
}

export function CharacterCard() {
  const { me, job, c } = useCharacter();
  if (!me) return null;
  return (
    <Card className="h-full p-4">
      <div className="grid h-full gap-4 md:grid-cols-[1.35fr_1fr]">
        <CharacterArena />
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: JOBS[job].color }}>{JOBS[job].name} · {JOBS[job].style}</div>
              <div className="font-display text-lg font-bold leading-tight">{me.name}</div>
              <div className="text-xs text-muted">Lv {c.progress.level} {c.title}</div>
            </div>
            <span className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold" style={{ background: `${c.cond.color}1f`, color: c.cond.color }}>{c.cond.emoji} {c.cond.label}</span>
          </div>
          <div className="mt-3"><Bars hp={c.hp} energy={c.energy} /></div>
          <div className="mt-3"><StatGrid stats={c.stats} primary={c.def.primary} /></div>
          <Link href="/profile" className="mt-3 flex items-center gap-1 self-end text-xs font-semibold text-accent">Trader profile <ArrowRight size={13} /></Link>
        </div>
      </div>
    </Card>
  );
}
