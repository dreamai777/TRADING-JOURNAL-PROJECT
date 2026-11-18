"use client";
import { useEffect, useRef } from "react";
import { mulberry32 } from "@/core/random";

/**
 * "Another world" hero backdrop, rendered live on a canvas at the screen's real pixel density
 * (sharp on 4K displays): starfield, aurora, twin moons, layered mountains with mouse parallax,
 * floating crystal islands, a distant dragon (the Drawdown boss) and rising embers.
 *
 * To use a real 4K video instead, set NEXT_PUBLIC_HERO_VIDEO_URL (an .mp4/.webm URL).
 * The canvas stays underneath as the fallback while the video loads.
 */
const VIDEO = process.env.NEXT_PUBLIC_HERO_VIDEO_URL;

export function WorldScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = mulberry32(7);
    const stars = Array.from({ length: 260 }, () => ({ x: rand(), y: rand() * 0.7, r: rand() * 1.3 + 0.2, p: rand() * Math.PI * 2, s: 0.5 + rand() * 2 }));
    const embers = Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), v: 0.02 + rand() * 0.05, r: 0.6 + rand() * 1.8, w: rand() * Math.PI * 2, hue: rand() < 0.6 ? 74 : rand() < 0.5 ? 160 : 40 }));
    const islands = [
      { x: 0.14, y: 0.36, w: 0.13, c: "#a78bfa", p: 0 },
      { x: 0.84, y: 0.3, w: 0.16, c: "#38d9f5", p: 2 },
      { x: 0.66, y: 0.5, w: 0.07, c: "#c8f53b", p: 4 },
    ];
    let w = 0, h = 0, dpr = 1, raf = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onMove = (e: PointerEvent) => { mouse.tx = e.clientX / window.innerWidth - 0.5; mouse.ty = e.clientY / window.innerHeight - 0.5; };

    const ridge = (x: number, seed: number, amp: number) =>
      Math.sin(x * 0.006 + seed) * amp + Math.sin(x * 0.017 + seed * 2.3) * amp * 0.45 + Math.sin(x * 0.043 + seed * 5.1) * amp * 0.18;

    const mountains = (base: number, amp: number, seed: number, color: string, par: number, t: number) => {
      const off = mouse.x * par * 60 + t * par * 6;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w + 10; x += 8) ctx.lineTo(x, h * base - Math.abs(ridge(x + off, seed, amp)));
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    };

    const island = (cx: number, cy: number, iw: number, color: string, t: number) => {
      ctx.save(); ctx.translate(cx, cy);
      // rock underside
      const g = ctx.createLinearGradient(0, 0, 0, iw * 0.9);
      g.addColorStop(0, "#2a2140"); g.addColorStop(1, "rgba(10,8,20,0)");
      ctx.beginPath(); ctx.moveTo(-iw / 2, 0);
      ctx.quadraticCurveTo(-iw * 0.3, iw * 0.35, -iw * 0.08, iw * 0.85); ctx.lineTo(iw * 0.05, iw * 0.6);
      ctx.quadraticCurveTo(iw * 0.32, iw * 0.3, iw / 2, 0); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      // grass top
      ctx.beginPath(); ctx.ellipse(0, 0, iw / 2, iw * 0.07, 0, 0, Math.PI * 2); ctx.fillStyle = "#1b2a2a"; ctx.fill();
      // crystal with glow
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(0, -iw * 0.18, 0, 0, -iw * 0.18, iw * 0.6);
      glow.addColorStop(0, color + "66"); glow.addColorStop(1, color + "00");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -iw * 0.18, iw * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      const ch = iw * 0.32 * (1 + Math.sin(t * 1.4) * 0.03);
      ctx.beginPath(); ctx.moveTo(0, -ch); ctx.lineTo(iw * 0.06, -ch * 0.35); ctx.lineTo(0, 0); ctx.lineTo(-iw * 0.06, -ch * 0.35); ctx.closePath();
      const cg = ctx.createLinearGradient(-iw * 0.06, -ch, iw * 0.06, 0); cg.addColorStop(0, "#ffffff"); cg.addColorStop(0.4, color); cg.addColorStop(1, "#1a1030");
      ctx.fillStyle = cg; ctx.fill();
      ctx.restore();
    };

    const dragon = (t: number) => {
      const period = 38, ph = (t % period) / period;
      if (ph > 0.55) return;
      const x = -0.1 * w + ph / 0.55 * 1.2 * w, y = h * (0.22 + Math.sin(ph * 6) * 0.03);
      const flap = Math.sin(t * 5) * 0.9, s = Math.max(14, w * 0.018);
      ctx.save(); ctx.translate(x, y); ctx.fillStyle = "rgba(14,10,24,.85)";
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.4, s * 0.32, 0, 0, Math.PI * 2); ctx.fill(); // body
      ctx.beginPath(); ctx.moveTo(s * 1.2, -s * 0.1); ctx.lineTo(s * 2, -s * 0.35); ctx.lineTo(s * 1.9, s * 0.05); ctx.fill(); // head
      ctx.beginPath(); ctx.moveTo(-s * 1.3, 0); ctx.quadraticCurveTo(-s * 2.4, s * 0.4, -s * 3, -s * 0.1); ctx.lineTo(-s * 1.3, s * 0.15); ctx.fill(); // tail
      for (const dir of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(-s * 0.3, 0);
        ctx.quadraticCurveTo(s * 0.2 * dir, -s * 2 * flap * dir, s * 1.1, -s * 2.2 * flap * dir);
        ctx.quadraticCurveTo(s * 0.4, -s * 0.8 * flap * dir, s * 0.5, 0); ctx.fill();
      }
      ctx.restore();
    };

    const draw = (ms: number) => {
      const t = ms / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#07051a"); sky.addColorStop(0.45, "#160d36"); sky.addColorStop(0.75, "#0e1a2c"); sky.addColorStop(1, "#06080c");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      // stars
      for (const s of stars) {
        const a = 0.35 + Math.sin(t * s.s + s.p) * 0.35;
        ctx.fillStyle = `rgba(230,240,255,${a})`;
        ctx.beginPath(); ctx.arc(s.x * w + mouse.x * -8, s.y * h + mouse.y * -6, s.r, 0, Math.PI * 2); ctx.fill();
      }
      // aurora
      ctx.globalCompositeOperation = "lighter";
      const bands: [string, number, number][] = [["200,245,59", 0.16, 0], ["56,217,245", 0.22, 1.7], ["167,139,250", 0.28, 3.1]];
      for (const [rgb, yb, sd] of bands) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
          const y = h * yb + Math.sin(x * 0.004 + t * 0.35 + sd) * 30 + Math.sin(x * 0.011 - t * 0.2 + sd) * 14;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${rgb},.06)`; ctx.lineWidth = 70; ctx.stroke();
        ctx.strokeStyle = `rgba(${rgb},.07)`; ctx.lineWidth = 22; ctx.stroke();
      }
      // moons
      const mx = w * 0.72 + mouse.x * -14, my = h * 0.17 + mouse.y * -8, mr = Math.max(34, w * 0.045);
      const halo = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 4);
      halo.addColorStop(0, "rgba(220,230,255,.22)"); halo.addColorStop(1, "rgba(220,230,255,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, mr * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      mg.addColorStop(0, "#f4f1ff"); mg.addColorStop(1, "#a9a3d6");
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(120,110,170,.25)";
      for (const [dx, dy, r] of [[-0.3, -0.1, 0.18], [0.25, 0.25, 0.12], [0.1, -0.4, 0.08]]) { ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#5fe0d0"; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(w * 0.28 + mouse.x * -10, h * 0.1, mr * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;

      dragon(t);
      // far mountains
      mountains(0.68, h * 0.14, 1, "#1a1438", 0.15, t);
      for (const i of islands) island(i.x * w + mouse.x * -30, i.y * h + Math.sin(t * 0.8 + i.p) * 8 + mouse.y * -12, i.w * w, i.c, t + i.p);
      mountains(0.8, h * 0.1, 4, "#120f26", 0.4, t);
      // mist
      const mist = ctx.createLinearGradient(0, h * 0.6, 0, h);
      mist.addColorStop(0, "rgba(56,217,245,0)"); mist.addColorStop(0.5, "rgba(56,217,245,.05)"); mist.addColorStop(1, "rgba(6,8,12,0)");
      ctx.fillStyle = mist; ctx.fillRect(0, h * 0.6, w, h * 0.4);
      mountains(0.92, h * 0.07, 9, "#0a0b16", 0.9, t);
      // embers
      ctx.globalCompositeOperation = "lighter";
      for (const e of embers) {
        if (!reduce) { e.y -= e.v * 0.016; if (e.y < -0.02) { e.y = 1.02; } }
        const x = (e.x + Math.sin(t * 0.6 + e.w) * 0.01) * w, y = e.y * h;
        const a = Math.min(1, (1 - e.y) * 1.4) * 0.8;
        ctx.fillStyle = `hsla(${e.hue},95%,65%,${a * 0.25})`; ctx.beginPath(); ctx.arc(x, y, e.r * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(${e.hue},95%,75%,${a})`; ctx.beginPath(); ctx.arc(x, y, e.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    // pause when off-screen to save battery
    const io = new IntersectionObserver(([en]) => {
      cancelAnimationFrame(raf);
      if (en.isIntersecting) raf = requestAnimationFrame(draw);
    });
    io.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener("pointermove", onMove); };
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden>
      <canvas ref={ref} className="h-full w-full" />
      {VIDEO && <video className="absolute inset-0 h-full w-full object-cover opacity-80" src={VIDEO} autoPlay muted loop playsInline />}
    </div>
  );
}
