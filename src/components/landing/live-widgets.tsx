"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry32 } from "@/core/random";

/** Runs `fn` every `ms` while the element is on screen. */
function useTicker(ms: number, fn: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(fn);
  useEffect(() => { cb.current = fn; });
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(id);
      if (e.isIntersecting) id = setInterval(() => cb.current(), ms);
    });
    if (ref.current) io.observe(ref.current);
    return () => { clearInterval(id); io.disconnect(); };
  }, [ms]);
  return ref;
}

type C = { o: number; h: number; l: number; c: number };

function seedCandles(n: number, seed: number, start: number): C[] {
  const r = mulberry32(seed);
  const out: C[] = [];
  let p = start;
  for (let i = 0; i < n; i++) {
    const o = p, c = o * (1 + (r() - 0.44) * 0.012);
    out.push({ o, c, h: Math.max(o, c) * (1 + r() * 0.004), l: Math.min(o, c) * (1 - r() * 0.004) });
    p = c;
  }
  return out;
}

/** Live BTC chart: candles tick in real time, EMA follows, the long position shows its running P&L. */
export function LiveChart() {
  const [candles, setCandles] = useState(() => seedCandles(46, 3, 94200));
  const rng = useRef(mulberry32(99));
  const tick = useRef(0);
  const ref = useTicker(450, () => {
    const r = rng.current;
    tick.current++;
    setCandles((cs) => {
      const next = cs.slice();
      const last = { ...next[next.length - 1] };
      last.c = last.c * (1 + (r() - 0.46) * 0.0035);
      last.h = Math.max(last.h, last.c); last.l = Math.min(last.l, last.c);
      next[next.length - 1] = last;
      if (tick.current % 6 === 0) {
        next.push({ o: last.c, h: last.c, l: last.c, c: last.c });
        next.shift();
      }
      return next;
    });
  });

  const W = 600, H = 250, pad = 8;
  const lo = Math.min(...candles.map((c) => c.l)), hi = Math.max(...candles.map((c) => c.h));
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo || 1)) * (H - pad * 2);
  const bw = (W - 70) / candles.length;
  const ema: number[] = [];
  candles.forEach((c, i) => ema.push(i === 0 ? c.c : ema[i - 1] + (c.c - ema[i - 1]) * (2 / 11)));
  const entry = candles[Math.floor(candles.length * 0.45)].c;
  const last = candles[candles.length - 1].c;
  const pnl = ((last - entry) / entry) * 100 * 5;
  const up = last >= entry;

  return (
    <div ref={ref} className="relative">
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2"><span className="font-bold">BTC/USDT</span><span className="text-faint">15m · 5x long</span></div>
        <div className="num font-bold" style={{ color: up ? "#2fe39a" : "#ff5470" }}>{up ? "+" : ""}{pnl.toFixed(2)}%</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Live demo price chart">
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W - 64} y1={H * f} y2={H * f} stroke="rgba(255,255,255,.05)" />)}
        <line x1={0} x2={W - 64} y1={y(entry)} y2={y(entry)} stroke="#c8f53b" strokeDasharray="4 4" strokeOpacity=".7" />
        <text x={4} y={y(entry) - 5} fill="#c8f53b" fontSize="10" fontWeight="700">ENTRY</text>
        {candles.map((c, i) => {
          const x = i * bw + bw / 2, g = c.c >= c.o, col = g ? "#2fe39a" : "#ff5470";
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={1} />
              <rect x={x - bw * 0.32} width={bw * 0.64} y={y(Math.max(c.o, c.c))} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={col} rx={1} />
            </g>
          );
        })}
        <polyline points={ema.map((v, i) => `${i * bw + bw / 2},${y(v)}`).join(" ")} fill="none" stroke="#a78bfa" strokeWidth={1.6} />
        <line x1={0} x2={W - 64} y1={y(last)} y2={y(last)} stroke={up ? "#2fe39a" : "#ff5470"} strokeOpacity=".5" />
        <rect x={W - 62} y={y(last) - 9} width={62} height={18} rx={4} fill={up ? "#2fe39a" : "#ff5470"} />
        <text x={W - 31} y={y(last) + 4} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#06080c" className="num">{last.toFixed(0)}</text>
      </svg>
    </div>
  );
}

/** Portfolio tracker with an equity curve that keeps climbing and holdings that tick. */
export function LivePortfolio() {
  const [pts, setPts] = useState(() => {
    const r = mulberry32(11);
    const out = [25000];
    for (let i = 1; i < 60; i++) out.push(out[i - 1] * (1 + (r() - 0.4) * 0.012));
    return out;
  });
  const [hold, setHold] = useState([
    { s: "BTC", c: "#f7931a", w: 0.42, p: 3.1 },
    { s: "ETH", c: "#8c8cff", w: 0.24, p: 1.8 },
    { s: "SOL", c: "#2fe39a", w: 0.18, p: 6.4 },
    { s: "NQ", c: "#38d9f5", w: 0.16, p: -0.6 },
  ]);
  const rng = useRef(mulberry32(5));
  const ref = useTicker(900, () => {
    const r = rng.current;
    setPts((p) => [...p.slice(1), p[p.length - 1] * (1 + (r() - 0.4) * 0.01)]);
    setHold((hs) => hs.map((h) => ({ ...h, p: +(h.p + (r() - 0.45) * 0.3).toFixed(2) })));
  });
  const W = 400, H = 140;
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, 6 + (1 - (v - lo) / (hi - lo || 1)) * (H - 12)] as const);
  const line = xy.map(([x, yy]) => `${x},${yy}`).join(" ");
  const bal = pts[pts.length - 1], chg = (bal / pts[0] - 1) * 100;
  return (
    <div ref={ref}>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-faint">Portfolio value</div>
          <div className="num text-2xl font-bold">${bal.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="num rounded-md bg-profit/12 px-2 py-1 text-xs font-bold text-profit">{chg >= 0 ? "+" : ""}{chg.toFixed(2)}% · 60d</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" preserveAspectRatio="none" role="img" aria-label="Equity curve trending up">
        <defs>
          <linearGradient id="eqfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2fe39a" stopOpacity=".35" /><stop offset="1" stopColor="#2fe39a" stopOpacity="0" /></linearGradient>
        </defs>
        <polygon points={`0,${H} ${line} ${W},${H}`} fill="url(#eqfill)" />
        <polyline points={line} fill="none" stroke="#2fe39a" strokeWidth={2} />
        <circle cx={xy[xy.length - 1][0] - 3} cy={xy[xy.length - 1][1]} r={4} fill="#2fe39a" className="live-dot" />
      </svg>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full">
        {hold.map((h) => <div key={h.s} style={{ width: `${h.w * 100}%`, background: h.c }} />)}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {hold.map((h) => {
          return (
            <div key={h.s} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: h.c }} />{h.s} <span className="text-faint">{Math.round(h.w * 100)}%</span></span>
              <span className={`num font-semibold ${h.p >= 0 ? "text-profit" : "text-loss"}`}>{h.p >= 0 ? "+" : ""}{h.p.toFixed(2)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const COACH = [
  { q: "Why did last week feel so bad?", a: "3 of your 4 losses were taken within 20 minutes of a loss. That's revenge trading, and it cost you $1,840. A 30-minute cooldown after a red trade would have kept your week green." },
  { q: "Where is my real edge?", a: "Your London-open breakouts on BTC: 64% win rate, 2.7 profit factor over 41 trades. Everything after 3 PM is breakeven at best. Trade your golden hours, skip the rest." },
  { q: "Am I sizing right?", a: "Your losers average 1.6R while winners average 1.9R. Risk is creeping up after win streaks. Cap each trade at 1% and your max drawdown drops from 14% to about 8%." },
];

/** AI coach teaser: questions and answers type themselves out on a loop. */
export function CoachTeaser() {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const msg = COACH[i % COACH.length];
  const ref = useTicker(28, () => {
    setN((k) => {
      if (k > msg.a.length + 90) { setI((x) => x + 1); return 0; }
      return k + 1;
    });
  });
  const typed = msg.a.slice(0, n);
  const done = n >= msg.a.length;
  return (
    <div ref={ref} className="flex h-full flex-col gap-3 text-sm">
      <div className="self-end rounded-2xl rounded-br-sm bg-surface-3 px-3 py-2 text-ink">{msg.q}</div>
      <div className="flex gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-cyan text-xs font-black text-bg">AI</div>
        <div className="min-h-[96px] rounded-2xl rounded-tl-sm border border-violet/25 bg-violet/8 px-3 py-2 text-ink/90">
          {typed}
          {!done && <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-violet" />}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {COACH.map((c, k) => (
          <span key={c.q} className={`rounded-full border px-2.5 py-1 text-[11px] transition ${k === i % COACH.length ? "border-violet/60 text-ink" : "border-line text-faint"}`}>{c.q}</span>
        ))}
      </div>
    </div>
  );
}

/** A month of P&L days lighting up one by one. */
const NOTES = [
  ["BTCUSDT.P", "Long", "Opening Range Breakout", "Waited for the 5m close above the range. Clean."],
  ["SOLUSDT.P", "Short", "Liquidity Sweep Reversal", "Swept the Asia high, closed back inside. Textbook."],
  ["ETHUSDT", "Long", "Trend Pullback Shot", "Bought the 20 EMA pullback on spot, held to 2R."],
  ["RAYUSDT.P", "Long", "Volume Breakout Charge", "Moved too early on the first push. Sized down."],
  ["BTCUSDT.P", "Short", "Failed Breakout Trap", "Breakout on weak volume, faded it to the midpoint."],
  ["XRPUSDT", "Long", "S/R Flip Retest", "Old resistance held as support. Patient entry."],
] as const;

type Day = { date: number; pnl: number | null; pct: number; trades: number; note: (typeof NOTES)[number]; r: number };

/** A month of journaled trading days in the same layout as the app's P&L calendar, with sample amounts. */
export function LiveCalendar() {
  const { weeks, stats } = useMemo(() => {
    const r = mulberry32(2611);
    let bal = 25000;
    const days: (Day | null)[] = Array(6).fill(null); // Nov 1, 2026 is a Sunday; the grid starts on Monday
    for (let d = 1; d <= 30; d++) {
      const wd = (d + 5) % 7; // 0 = Mon … 6 = Sun
      const weekend = wd >= 5;
      const rest = weekend ? r() < 0.7 : r() < 0.1;
      if (rest || d > 19) { days.push({ date: d, pnl: null, pct: 0, trades: 0, note: NOTES[0], r: 0 }); continue; }
      const pnl = Math.round(((r() - 0.36) * (weekend ? 500 : 1500)) / 5) * 5;
      const pct = (pnl / bal) * 100;
      bal += pnl;
      days.push({ date: d, pnl, pct, trades: 1 + Math.floor(r() * (weekend ? 2 : 5)), note: NOTES[Math.floor(r() * NOTES.length)], r: +(pnl / 250).toFixed(1) });
    }
    while (days.length % 7) days.push(null);
    const weeks: (Day | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    const traded = days.filter((x): x is Day => !!x && x.pnl != null);
    const net = traded.reduce((a, x) => a + (x.pnl ?? 0), 0);
    return { weeks, stats: { net, pct: (net / 25000) * 100, win: traded.filter((x) => (x.pnl ?? 0) > 0).length, days: traded.length, best: Math.max(...traded.map((x) => x.pnl ?? 0)), worst: Math.min(...traded.map((x) => x.pnl ?? 0)) } };
  }, []);
  const flat = weeks.flat();
  const [shown, setShown] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const ref = useTicker(110, () => setShown((s) => (s >= flat.length + 40 ? 0 : s + 1)));
  const money = (v: number) => `${v >= 0 ? "+" : "−"}$${Math.abs(v).toLocaleString()}`;
  const pc = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%`;
  const lastShown = [...flat.slice(0, shown)].reverse().find((x) => x && x.pnl != null) ?? undefined;
  const focus = (pick != null ? flat[pick] : null) ?? lastShown;
  const tone = (v: number) => (v >= 0 ? `rgba(47,227,154,${0.12 + Math.min(1, v / 900) * 0.45})` : `rgba(255,84,112,${0.12 + Math.min(1, -v / 600) * 0.45})`);
  return (
    <div ref={ref}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="font-display text-lg font-bold">November 2026</div>
          <div className="text-[11px] text-muted">Sample account · $25,000 starting balance</div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-lg bg-surface-2 px-2 py-1">Net <b className={`num ${stats.net >= 0 ? "text-profit" : "text-loss"}`}>{money(stats.net)} ({pc(stats.pct)})</b></span>
          <span className="rounded-lg bg-surface-2 px-2 py-1">Green days <b className="num">{stats.win}/{stats.days}</b></span>
          <span className="rounded-lg bg-surface-2 px-2 py-1">Best <b className="num text-profit">{money(stats.best)}</b></span>
          <span className="rounded-lg bg-surface-2 px-2 py-1">Worst <b className="num text-loss">{money(stats.worst)}</b></span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.1fr)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-faint">{d}</div>)}
        <div className="hidden pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-faint sm:block">Week</div>
        {weeks.map((wk, wi) => {
          const traded = wk.filter((x): x is Day => !!x && x.pnl != null && flat.indexOf(x) < shown);
          const wsum = traded.reduce((a, x) => a + (x.pnl ?? 0), 0), wpct = traded.reduce((a, x) => a + x.pct, 0);
          return [
            ...wk.map((d, k) => {
              const idx = wi * 7 + k, on = idx < shown;
              if (!d) return <div key={idx} />;
              const today = d.date === 19;
              return (
                <button key={idx} type="button" onPointerEnter={() => setPick(idx)} onPointerLeave={() => setPick(null)} onClick={() => setPick(idx)}
                  className={`relative flex min-h-[54px] flex-col rounded-md border p-1 text-left transition-all duration-300 sm:min-h-[66px] sm:p-1.5 ${today ? "border-accent/70" : "border-white/5"} ${pick === idx ? "ring-1 ring-white/40" : ""}`}
                  style={{ background: on && d.pnl != null ? tone(d.pnl) : "rgba(255,255,255,.025)", opacity: on || d.date > 19 ? 1 : 0.35 }}>
                  <span className={`text-[10px] font-semibold ${today ? "text-accent" : "text-ink/60"}`}>{d.date}{today && <span className="ml-1 hidden text-[9px] sm:inline">today</span>}</span>
                  {on && d.pnl != null ? (
                    <>
                      <span className={`num mt-auto text-[9px] font-bold leading-tight sm:text-[11px] ${d.pnl >= 0 ? "text-profit" : "text-loss"}`}>{money(d.pnl)}</span>
                      <span className="num hidden text-[9.5px] leading-tight text-ink/70 sm:block">{pc(d.pct)} · {d.trades} trade{d.trades > 1 ? "s" : ""}</span>
                    </>
                  ) : d.date < 19 && on ? <span className="mt-auto text-[9px] text-faint">{(d.date + 5) % 7 >= 5 ? "Rest" : "No trade"}</span> : null}
                </button>
              );
            }),
            <div key={`w${wi}`} className="hidden flex-col justify-center rounded-md border border-white/5 bg-surface-2/70 px-1.5 text-right sm:flex">
              {traded.length ? <><span className={`num text-[11px] font-bold ${wsum >= 0 ? "text-profit" : "text-loss"}`}>{money(wsum)}</span><span className="num text-[9.5px] text-ink/60">{pc(wpct)} · W{wi + 1}</span></> : <span className="text-[10px] text-faint">W{wi + 1}</span>}
            </div>,
          ];
        })}
      </div>
      <div className="mt-3 min-h-[52px] rounded-xl border border-line bg-surface-2/70 px-3 py-2 text-xs">
        {focus && focus.pnl != null ? (
          <>
            <div className="flex flex-wrap items-center gap-x-2">
              <b>Nov {focus.date}</b>
              <span className={`num font-bold ${focus.pnl >= 0 ? "text-profit" : "text-loss"}`}>{money(focus.pnl)} ({pc(focus.pct)})</span>
              <span className="text-muted">· {focus.trades} trade{focus.trades > 1 ? "s" : ""} · {focus.note[0]} {focus.note[1]} · {focus.note[2]} · {focus.r >= 0 ? "+" : ""}{focus.r}R</span>
            </div>
            <div className="mt-0.5 italic text-ink/70">“{focus.note[3]}”</div>
          </>
        ) : <span className="text-muted">Hover a day to open its journal entry.</span>}
      </div>
    </div>
  );
}
