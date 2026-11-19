"use client";
// Original champion figures with adult human proportions, drawn as backlit silhouettes with rim light
// (the look of cinematic key art), so they sit inside the painted world instead of on top of it.
// Each class has an action: the wizard casts, the warrior draws and swings, the archer looses an arrow,
// the assassin lunges, the defender raises a shield ward and the sniper fires a bolt.
// Heads follow the cursor through the --lx/--ly CSS variables set by <ChampionParty>.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { JobClass } from "@/core/types";

export const CHAMPIONS: Record<JobClass, { name: string; title: string; color: string; action: string }> = {
  wizard: { name: "Lyrael", title: "Elven arcanist", color: "#8fb8ff", action: "casts a spell" },
  warrior: { name: "Corvin", title: "Vanguard knight", color: "#ffb35c", action: "draws and swings" },
  archer: { name: "Sable", title: "Ranger", color: "#b7e36b", action: "looses an arrow" },
  assassin: { name: "Nyx", title: "Shadowblade", color: "#e58cff", action: "strikes" },
  defender: { name: "Brakka", title: "Dwarven shieldwarden", color: "#7fd8ff", action: "raises a ward" },
  sniper: { name: "Vesk", title: "Crossbow marksman", color: "#ffcf5c", action: "fires a bolt" },
};

const ACT: Record<JobClass, string> = { wizard: "act-cast", warrior: "act-swing", archer: "act-shoot", assassin: "act-strike", defender: "act-guard", sniper: "act-fire" };

export function ChampionFigure({ job, size = 200, acting = 0, rim = "#ffd49a" }: { job: JobClass; size?: number; acting?: number; rim?: string }) {
  const uid = useId().replace(/:/g, "");
  const c = CHAMPIONS[job];
  const [act, setAct] = useState(false);
  useEffect(() => {
    if (!acting) return;
    const reset = setTimeout(() => setAct(false), 0);
    const on = setTimeout(() => setAct(true), 40);
    const off = setTimeout(() => setAct(false), 1700);
    return () => { clearTimeout(reset); clearTimeout(on); clearTimeout(off); };
  }, [acting]);
  const body = `url(#b${uid})`, cloth = `url(#c${uid})`;
  const dwarf = job === "defender";
  const limb = (d: string, wdt: number, fill = body) => <path d={d} stroke={fill} strokeWidth={wdt} strokeLinecap="round" strokeLinejoin="round" fill="none" />;

  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 160 220" className={`champ overflow-visible ${act ? ACT[job] : ""}`} aria-hidden style={{ ["--cc" as string]: c.color }}>
      <defs>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2f3d" /><stop offset=".55" stopColor="#141822" /><stop offset="1" stopColor="#07090e" />
        </linearGradient>
        <linearGradient id={`c${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.color} stopOpacity=".38" /><stop offset=".25" stopColor="#1a1d28" /><stop offset="1" stopColor="#090b10" />
        </linearGradient>
        <radialGradient id={`g${uid}`}><stop offset="0" stopColor="#fff" /><stop offset=".25" stopColor={c.color} /><stop offset="1" stopColor={c.color} stopOpacity="0" /></radialGradient>
        <linearGradient id={`t${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={c.color} stopOpacity="0" /><stop offset="1" stopColor="#fff" /></linearGradient>
        {/* backlight: warm rim on the sun side, cool rim on the other */}
        <filter id={`r${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feOffset in="SourceAlpha" dx="1.8" dy="1.4" result="o1" />
          <feComposite in="SourceAlpha" in2="o1" operator="out" result="e1" />
          <feFlood floodColor={rim} /><feComposite in2="e1" operator="in" result="r1" />
          <feGaussianBlur in="r1" stdDeviation=".9" result="rb1" />
          <feOffset in="SourceAlpha" dx="-1.4" dy="0" result="o2" />
          <feComposite in="SourceAlpha" in2="o2" operator="out" result="e2" />
          <feFlood floodColor="#7aa7ff" floodOpacity=".55" /><feComposite in2="e2" operator="in" result="r2" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="r2" /><feMergeNode in="rb1" /></feMerge>
        </filter>
      </defs>

      <ellipse cx="74" cy="212" rx={dwarf ? 38 : 30} ry="5" fill="#000" opacity=".55" />
      {/* ground ring for the ward */}
      {job === "defender" && <ellipse className="fx-ring" cx="74" cy="210" rx="60" ry="10" fill="none" stroke={c.color} strokeWidth="2" opacity="0" />}

      <g className="champ-body" style={{ transformOrigin: "74px 212px", transform: dwarf ? "scale(1.16, .8)" : undefined }}>
        <g className="champ-lunge" filter={`url(#r${uid})`}>
          <g className="champ-breathe">
            {/* cloak / hair behind the body */}
            {job === "warrior" && <path className="champ-cape" d="M60 54 Q50 110 40 196 Q62 188 82 198 Q80 120 84 56 Z" fill={cloth} />}
            {job === "archer" && <path className="champ-cape" d="M60 52 Q48 108 44 172 Q60 166 76 174 Q76 110 82 54 Z" fill={cloth} />}
            {job === "assassin" && <path className="champ-cape" d="M62 54 Q44 96 30 150 Q48 140 60 148 Q66 104 80 58 Z" fill={cloth} />}
            {job === "wizard" && <path className="champ-cape" d="M64 30 Q50 40 52 70 Q50 100 44 128 Q58 120 64 124 Q66 90 70 60 Z" fill="#c9783a" opacity=".85" />}
            {job === "archer" && <g><rect x="52" y="52" width="9" height="40" rx="3" fill={body} transform="rotate(-24 56 72)" />{[0, 1, 2].map((i) => <path key={i} d={`M${47 + i * 3} 52 l-2 -9 l4 0z`} fill="#d8dce6" transform="rotate(-24 56 72)" />)}</g>}
            {job === "sniper" && <path d="M58 96 L86 96 L96 168 L50 168 Z" fill={cloth} />}

            {/* back arm (and shield) */}
            <g className="arm-b" style={{ transformOrigin: "62px 58px" }}>
              {limb("M62 58 L55 83", 9)}
              <g className="fore-b" style={{ transformOrigin: "55px 83px" }}>
                {limb("M55 83 L53 106", 8)}
                <circle cx="53" cy="107" r="4.2" fill={body} />
                {job === "defender" && (
                  <g>
                    <circle cx="48" cy="98" r="24" fill={cloth} stroke="#3a4256" strokeWidth="3" />
                    <circle cx="48" cy="98" r="7" fill={c.color} opacity=".75" className="fx-glow" />
                  </g>
                )}
                {job === "assassin" && <path d="M53 107 L44 124 L47 125 Z" fill="#cfd6e2" />}
              </g>
            </g>

            {/* legs */}
            {job === "wizard" ? (
              <path d="M58 100 L86 100 Q92 150 102 208 L46 208 Q54 150 58 100Z" fill={cloth} />
            ) : job === "assassin" ? (
              <g fill={body}>
                <path d="M62 104 L74 106 L60 150 L74 182 L70 206 L58 208 L60 186 L46 152 Z" />
                <path d="M72 104 L84 102 L98 146 L108 200 L96 206 L88 152 Z" />
              </g>
            ) : (
              <g fill={body}>
                <path d="M61 104 L72 106 L68 158 L64 206 L52 208 L56 158 Z" />
                <path d="M72 104 L84 102 L88 156 L96 204 L84 208 L78 158 Z" />
                <path d="M50 206 L66 206 L68 212 L48 212Z M82 206 L98 204 L100 211 L82 212Z" />
              </g>
            )}

            {/* torso */}
            <path d="M58 52 Q71 47 84 52 L88 64 Q87 86 82 106 L60 106 Q55 86 54 64 Z" fill={job === "wizard" ? cloth : body} />
            <path d="M58 98 L84 98 L83 104 L59 104Z" fill={c.color} opacity=".35" />
            {(job === "warrior" || job === "defender") && <g fill={body}><ellipse cx="60" cy="56" rx="9" ry="6" /><ellipse cx="82" cy="56" rx="9" ry="6" /></g>}
            {job === "defender" && <path d="M62 40 Q72 76 84 40 Q82 62 72 70 Q62 62 62 40Z" fill="#8e9097" opacity=".9" />}

            {/* head */}
            <g className="champ-head">
              <path d="M66 44 L76 44 L77 52 L65 52Z" fill={body} />
              <ellipse cx="72" cy="34" rx="10" ry="11.5" fill={body} />
              {job === "warrior" && <g fill={body}><path d="M61 36 Q61 21 72 21 Q84 21 84 36 L84 42 L61 42Z" /><path d="M70 22 Q66 8 78 4 Q74 12 80 18 Z" fill={cloth} /><rect x="74" y="32" width="10" height="2.2" fill={c.color} opacity=".8" /></g>}
              {job === "wizard" && <g><path d="M62 30 Q64 20 74 21 Q84 22 83 32 Q78 26 70 27 Q64 28 62 34Z" fill="#c9783a" /><path d="M80 32 L90 25 L83 36Z" fill={body} /></g>}
              {job === "archer" && <path d="M60 40 Q58 20 72 20 Q86 21 84 36 Q82 28 74 27 Q66 28 64 42 Q60 50 56 52 Q60 46 60 40Z" fill={cloth} />}
              {job === "assassin" && <g fill={cloth}><path d="M60 42 Q58 20 72 20 Q86 20 85 40 Q80 28 72 28 Q64 28 62 44Z" /><path d="M64 42 L84 42 L82 50 L66 50Z" /><path className="champ-cape" d="M64 46 Q52 52 40 50 Q50 56 62 54Z" /></g>}
              {job === "defender" && <g fill={body}><path d="M61 34 Q61 21 72 21 Q84 21 84 34Z" /><path d="M62 28 Q52 22 54 12 Q58 22 64 25Z M82 28 Q92 22 90 12 Q86 22 80 25Z" fill="#d9d2c0" /></g>}
              {job === "sniper" && <g fill={body}><path d="M52 30 Q72 22 94 28 L92 31 Q72 27 54 33Z" /><path d="M62 29 Q63 17 72 17 Q82 17 82 28Z" /><rect x="74" y="31" width="9" height="3" rx="1.5" fill={c.color} opacity=".85" /></g>}
              <circle cx="79" cy="34" r="1.1" fill={c.color} opacity=".9" />
            </g>

            {/* front arm + weapon */}
            <g className="arm-f" style={{ transformOrigin: "81px 58px" }}>
              {limb("M81 58 L89 82", 9)}
              <g className="fore-f" style={{ transformOrigin: "89px 82px" }}>
                {limb("M89 82 L96 100", 8)}
                <circle cx="96.5" cy="101" r="4.2" fill={body} />
                {job === "warrior" && (
                  <g>
                    <path d="M95 104 L128 28 L131 30 L99 106Z" fill="#cfd6e2" />
                    <path d="M97 102 L128 30" stroke="#fff" strokeWidth=".7" opacity=".8" />
                    <path className="fx-blade" d="M97 102 L129 29" stroke={c.color} strokeWidth="3" opacity=".0" strokeLinecap="round" />
                    <path d="M88 98 L104 106" stroke={body} strokeWidth="4" strokeLinecap="round" />
                    <path d="M94 104 L91 112" stroke={body} strokeWidth="4" strokeLinecap="round" />
                  </g>
                )}
                {job === "wizard" && (
                  <g>
                    <path d="M93 190 L101 22" stroke="#3a2a1e" strokeWidth="3.2" strokeLinecap="round" />
                    <circle className="fx-glow" cx="101" cy="18" r="12" fill={`url(#g${uid})`} />
                    <circle cx="101" cy="18" r="4" fill="#fff" />
                  </g>
                )}
                {job === "archer" && (
                  <g className="pose-idle">
                    <path d="M92 64 Q114 104 92 146" stroke="#2c2118" strokeWidth="3.4" fill="none" strokeLinecap="round" />
                    <path d="M92 64 L92 146" stroke="#d9dde6" strokeWidth=".7" />
                  </g>
                )}
                {job === "assassin" && <path d="M96 101 L114 86 L115 89 Z" fill="#cfd6e2" />}
                {job === "defender" && (
                  <g>
                    <path d="M96 104 L104 50" stroke="#3a2a1e" strokeWidth="3.4" strokeLinecap="round" />
                    <path d="M102 50 Q122 44 124 62 Q114 60 104 66Z" fill="#cfd6e2" />
                    <path className="fx-blade" d="M104 52 Q120 48 122 60" stroke={c.color} strokeWidth="2" fill="none" opacity="0" />
                  </g>
                )}
                {job === "sniper" && (
                  <g className="pose-idle">
                    <path d="M90 108 L118 74" stroke="#2c2118" strokeWidth="5" strokeLinecap="round" />
                    <path d="M106 70 Q118 88 126 96" stroke="#9aa3b2" strokeWidth="2.4" fill="none" />
                  </g>
                )}
              </g>
            </g>

            {/* aiming poses (archer, sniper) swap in during the action */}
            {job === "archer" && (
              <g className="pose-aim" opacity="0">
                {limb("M81 58 L104 58 L122 58", 8)}
                <path d="M124 20 Q142 58 124 96" stroke="#2c2118" strokeWidth="3.4" fill="none" strokeLinecap="round" />
                <path d="M124 20 L82 54 L124 96" stroke="#d9dde6" strokeWidth=".8" fill="none" />
                <path className="fx-nock" d="M82 54 L134 54" stroke="#d9dde6" strokeWidth="1.6" />
                {limb("M64 58 L74 66 L82 55", 7)}
              </g>
            )}
            {job === "sniper" && (
              <g className="pose-aim" opacity="0">
                {limb("M81 58 L100 62 L112 58", 8)}
                <path d="M84 56 L138 56" stroke="#2c2118" strokeWidth="6" strokeLinecap="round" />
                <path d="M126 42 Q132 56 126 70" stroke="#9aa3b2" strokeWidth="2.6" fill="none" />
                <circle className="fx-glow" cx="142" cy="56" r="9" fill={`url(#g${uid})`} opacity="0" />
              </g>
            )}
          </g>
        </g>
        {/* lunge afterimages */}
        {job === "assassin" && [0, 1].map((k) => <ellipse key={k} className={`fx-ghost fx-ghost-${k}`} cx="72" cy="110" rx="18" ry="70" fill={c.color} opacity="0" />)}
      </g>

      {/* action effects (outside the rim filter so they glow cleanly) */}
      {job === "warrior" && <path className="fx-arc" d="M150 24 A86 86 0 0 1 108 176" stroke={`url(#t${uid})`} strokeWidth="7" fill="none" strokeLinecap="round" pathLength={100} />}
      {job === "wizard" && (
        <g>
          <g className="fx-circle" style={{ transformOrigin: "101px 18px" }} opacity="0">
            <circle cx="101" cy="18" r="26" fill="none" stroke={c.color} strokeWidth="1.4" strokeDasharray="5 4" />
            <circle cx="101" cy="18" r="18" fill="none" stroke={c.color} strokeWidth="1" />
            {[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M101 -10 l3 6 h-6z" fill={c.color} transform={`rotate(${a} 101 18)`} />)}
          </g>
          <g className="fx-bolt" opacity="0"><circle cx="101" cy="18" r="9" fill={`url(#g${uid})`} /><path d="M101 18 L70 30" stroke={c.color} strokeWidth="5" strokeLinecap="round" opacity=".6" /></g>
        </g>
      )}
      {job === "archer" && <g className="fx-arrow" opacity="0"><path d="M100 54 L150 54" stroke="#fff" strokeWidth="1.6" /><path d="M60 54 L104 54" stroke={c.color} strokeWidth="3" opacity=".5" strokeLinecap="round" /></g>}
      {job === "sniper" && <g className="fx-arrow" opacity="0"><path d="M120 56 L160 56" stroke="#fff" strokeWidth="2" /><path d="M80 56 L124 56" stroke={c.color} strokeWidth="3" opacity=".6" strokeLinecap="round" /></g>}
      {job === "assassin" && <g className="fx-slash" opacity="0"><path d="M120 50 L170 120" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /><path d="M170 50 L120 120" stroke={c.color} strokeWidth="2.6" strokeLinecap="round" /></g>}
      {job === "defender" && <path className="fx-dome" d="M8 210 A68 90 0 0 1 144 210" fill={c.color} fillOpacity=".08" stroke={c.color} strokeWidth="2" opacity="0" />}
    </svg>
  );
}

/** The hero party: heads follow the cursor, heroes take turns acting, click one to make it act now. */
export function ChampionParty({ jobs, sizes, rim }: { jobs: JobClass[]; sizes: number[]; rim?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [acting, setActing] = useState<number[]>(() => jobs.map(() => 0));
  const [hover, setHover] = useState(-1);
  const turn = useRef(0);
  const trigger = useCallback((i: number) => setActing((a) => a.map((v, k) => (k === i ? v + 1 : v))), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, px = 0, py = 0;
    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--lx", Math.max(-1, Math.min(1, (px - (r.left + r.width / 2)) / (r.width / 1.5))).toFixed(3));
      el.style.setProperty("--ly", Math.max(-1, Math.min(1, (py - (r.top + r.height * 0.3)) / 500)).toFixed(3));
    };
    const onMove = (e: PointerEvent) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(apply); };
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });
    let id: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(id);
      if (e.isIntersecting && !reduce) id = setInterval(() => { trigger(turn.current % jobs.length); turn.current += 1; }, 2300);
    });
    io.observe(el);
    return () => { window.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); clearInterval(id); io.disconnect(); };
  }, [jobs.length, trigger]);

  return (
    <div ref={ref} className="flex items-end justify-center gap-0 sm:gap-2" style={{ ["--lx" as string]: 0, ["--ly" as string]: 0 }}>
      {jobs.map((j, i) => (
        <button
          key={j}
          type="button"
          onClick={() => trigger(i)}
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover(-1)}
          className={`group relative cursor-pointer outline-none ${i === 0 || i === jobs.length - 1 ? "hidden sm:block" : ""}`}
          aria-label={`${CHAMPIONS[j].name}, ${CHAMPIONS[j].title}. Activate to see them ${CHAMPIONS[j].action}.`}
        >
          <span className={`pointer-events-none absolute -top-2 left-1/2 z-10 w-max -translate-x-1/2 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] text-white backdrop-blur transition ${hover === i ? "opacity-100" : "opacity-0 group-focus-visible:opacity-100"}`}>
            <b style={{ color: CHAMPIONS[j].color }}>{CHAMPIONS[j].name}</b> · {CHAMPIONS[j].title}
          </span>
          <ChampionFigure job={j} size={sizes[i]} acting={acting[i]} rim={rim} />
        </button>
      ))}
    </div>
  );
}

/** A single champion that acts when its card is hovered, focused or tapped. */
export function HoverChampion({ job, size = 150 }: { job: JobClass; size?: number }) {
  const [n, setN] = useState(0);
  const go = () => setN((v) => v + 1);
  return (
    <span className="inline-block" onPointerEnter={go} onClick={go} onFocus={go}>
      <ChampionFigure job={job} size={size} acting={n} />
    </span>
  );
}
