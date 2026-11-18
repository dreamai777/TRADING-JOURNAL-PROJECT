"use client";
// Makes a character feel alive: the head and eyes follow the cursor, the body leans and tilts in 3D,
// hovering makes it notice you, clicking (or Enter/Space) plays an emote with a line, and it
// occasionally does something on its own when idle. Pointer work is done with CSS variables, so
// moving the mouse never re-renders the SVG.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Condition } from "@/core/character";
import type { JobClass } from "@/core/types";
import { CharacterSprite, type SpriteGear } from "./character-sprite";

type Emote = "cheer" | "flourish" | "spin" | "hop";
const EMOTES: Emote[] = ["cheer", "flourish", "spin", "hop"];

const LINES: Record<JobClass, string[]> = {
  wizard: ["The weekly chart has spoken.", "Patience is a spell too.", "Higher timeframe first. Always."],
  warrior: ["Volume confirms. We charge!", "One clean break is all I need.", "Stop is set. Let's go."],
  assassin: ["They swept the lows. Now we strike.", "In and out before the crowd wakes.", "Trapped breakouts are my favorite."],
  archer: ["Waiting for the pullback...", "Two and a half R or no shot.", "The trend is my wind."],
  defender: ["Risk first, reward second.", "Slow and steady holds the wall.", "Rebalance day. Shields up."],
  sniper: ["Spread's tight. Taking the shot.", "Max eight casts this session.", "In, out, logged."],
};

export function LivingCharacter({
  job, condition, size = 120, tier = 0, gear, lines, interactive = true, className,
}: { job: JobClass; condition: Condition; size?: number; tier?: 0 | 1 | 2; gear?: SpriteGear; lines?: string[]; interactive?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [emote, setEmote] = useState<{ kind: Emote; key: number } | null>(null);
  const [say, setSay] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const count = useRef(0);

  // Look at the cursor (rAF-throttled, no React state).
  useEffect(() => {
    const el = ref.current;
    if (!el || !interactive) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, px = 0, py = 0;
    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
      const dx = px - cx, dy = py - cy;
      const reach = Math.max(260, r.width * 2.5);
      const lx = Math.max(-1, Math.min(1, dx / reach)), ly = Math.max(-1, Math.min(1, dy / reach));
      el.style.setProperty("--lx", lx.toFixed(3));
      el.style.setProperty("--ly", ly.toFixed(3));
    };
    const onMove = (e: PointerEvent) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, [interactive]);

  const play = useCallback((kind?: Emote, line?: string) => {
    count.current += 1;
    const k = kind ?? EMOTES[count.current % EMOTES.length];
    setEmote({ kind: k, key: count.current });
    const pool = lines?.length ? lines : LINES[job];
    setSay(line ?? pool[count.current % pool.length]);
  }, [job, lines]);

  useEffect(() => {
    if (!emote) return;
    const id = setTimeout(() => setEmote(null), 1100);
    return () => clearTimeout(id);
  }, [emote]);
  useEffect(() => {
    if (!say) return;
    const id = setTimeout(() => setSay(null), 2600);
    return () => clearTimeout(id);
  }, [say]);

  // Idle life: every so often, do a small emote on its own.
  useEffect(() => {
    if (!interactive || condition === "resting" || condition === "burnout") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => { if (!document.hidden && Math.random() < 0.35) setEmote({ kind: Math.random() < 0.5 ? "hop" : "flourish", key: -Date.now() }); }, 7000 + Math.random() * 4000);
    return () => clearInterval(id);
  }, [interactive, condition]);

  return (
    <div
      ref={ref}
      className={`living ${interactive ? "cursor-pointer" : ""} ${notice ? "living-notice" : ""} ${className ?? ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${job} character. Activate to emote.` : undefined}
      onPointerEnter={interactive ? () => setNotice(true) : undefined}
      onPointerLeave={interactive ? () => setNotice(false) : undefined}
      onClick={interactive ? () => play() : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); } } : undefined}
    >
      {say && (
        <div key={say} className="char-bubble pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 w-max max-w-[200px] -translate-x-1/2 rounded-xl border border-white/15 bg-black/70 px-2.5 py-1.5 text-center text-[11px] font-semibold text-white shadow-lg backdrop-blur">
          {say}
        </div>
      )}
      {notice && !say && <div className="living-mark pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 text-lg font-black text-gold drop-shadow">!</div>}
      <div className="living-tilt">
        <div key={emote?.key ?? 0} className={emote ? `emote-${emote.kind}` : undefined}>
          <CharacterSprite job={job} condition={condition} size={size} tier={tier} gear={gear} />
        </div>
      </div>
      {emote && emote.key > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {[0, 1, 2, 3, 4, 5].map((i) => <span key={`${emote.key}-${i}`} className="emote-burst" style={{ ["--a" as string]: `${i * 60}deg`, background: gear?.weaponColor ?? "#fde047" }} />)}
        </div>
      )}
    </div>
  );
}
