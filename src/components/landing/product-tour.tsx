"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const SHOTS = [
  { id: "dashboard", label: "Command Center", path: "/dashboard", src: "/preview/dashboard.jpg", caption: "Your P&L, win rate, character and today's quests on one screen." },
  { id: "journal", label: "Journal", path: "/journal", src: "/preview/journal.jpg", caption: "Every trade with entry, exit, fees, R, setup, emotion and notes." },
  { id: "analytics", label: "Analytics", path: "/analytics", src: "/preview/analytics.jpg", caption: "Find the setups, hours and symbols where your edge really is." },
  { id: "armory", label: "Armory", path: "/armory", src: "/preview/armory.jpg", caption: "Gear that only upgrades when your numbers prove it." },
];

/** Real screenshots of the app in a browser frame, rotating while on screen. */
export function ProductTour() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(id);
      if (e.isIntersecting && !paused) id = setInterval(() => setI((v) => (v + 1) % SHOTS.length), 4500);
    });
    if (ref.current) io.observe(ref.current);
    return () => { clearInterval(id); io.disconnect(); };
  }, [paused]);
  const s = SHOTS[i];
  return (
    <div ref={ref} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {SHOTS.map((x, k) => (
          <button key={x.id} onClick={() => setI(k)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${k === i ? "border-transparent bg-accent text-accent-ink" : "border-white/15 bg-black/40 text-ink/80 backdrop-blur hover:text-ink"}`}>{x.label}</button>
        ))}
      </div>
      <div className="chrome overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f15] shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)]">
        <div className="flex items-center gap-2 border-b border-white/5 bg-[#0f141c] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <div className="mx-auto w-full max-w-sm truncate rounded-md bg-black/40 px-3 py-1 text-center text-[11px] text-faint">edgeforge.app{s.path}</div>
        </div>
        <div className="relative aspect-[16/10] w-full">
          {SHOTS.map((x, k) => (
            <Image key={x.id} src={x.src} alt={`${x.label} screen`} fill sizes="(max-width: 1200px) 100vw, 1100px" className="object-cover object-top transition-opacity duration-700" style={{ opacity: k === i ? 1 : 0 }} priority={k === 0} />
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-ink/75">{s.caption}</p>
    </div>
  );
}
