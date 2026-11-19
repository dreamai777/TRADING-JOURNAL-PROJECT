"use client";
import { useEffect, useRef } from "react";
import { mulberry32 } from "@/core/random";

/**
 * A fixed, full-screen fantasy world behind the welcome page that changes as you scroll:
 *   golden dawn → clear high-mountain day (a stone Titan rises behind the range)
 *   → blood storm (a winged demon lord looms, lightning) → aurora night.
 * Layered ridgelines with snow caps and atmospheric haze, god rays, clouds, a dragon, a castle,
 * weather particles, film grain and a crane-shot camera driven by scroll and the mouse.
 * Drawn live at the screen's pixel density, so it stays sharp on 4K and retina displays.
 *
 * To use real footage instead, set NEXT_PUBLIC_HERO_VIDEO_URL: the video plays over the hero.
 */

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

interface Palette { top: RGB; mid: RGB; hor: RGB; sun: RGB; fog: RGB; rock: RGB }
const K = (top: string, mid: string, hor: string, sun: string, fog: string, rock: string): Palette => ({ top: hex(top), mid: hex(mid), hor: hex(hor), sun: hex(sun), fog: hex(fog), rock: hex(rock) });
const SCENES: Palette[] = [
  K("#0e1733", "#4a3a68", "#f2a25c", "#ffd7a0", "#c4876a", "#1a1420"), // golden dawn
  K("#183a68", "#5384b4", "#dfe8ee", "#fff3dc", "#a3bacb", "#1a2430"), // high-mountain day
  K("#0d0609", "#3d1418", "#c4402a", "#ff8a4a", "#6b2622", "#120a0c"), // blood storm
  K("#02050d", "#0a1830", "#1c3b52", "#a8dcff", "#1b2e40", "#060a12"), // aurora night
];
const paletteAt = (p: number): Palette => {
  const s = clamp(p) * (SCENES.length - 1), i = Math.min(SCENES.length - 2, Math.floor(s)), t = smooth(0, 1, s - i);
  const a = SCENES[i], b = SCENES[i + 1];
  return { top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), hor: mix(a.hor, b.hor, t), sun: mix(a.sun, b.sun, t), fog: mix(a.fog, b.fog, t), rock: mix(a.rock, b.rock, t) };
};
const weight = (p: number, c: number) => clamp(1 - Math.abs(p - c) * 3);

const rid = (u: number) => Math.pow(1 - Math.abs(Math.sin(u)), 1.7);
const ridge = (x: number, s: number) => 0.52 * rid(x * 0.0021 + s) + 0.26 * rid(x * 0.0053 + s * 1.7) + 0.12 * rid(x * 0.013 + s * 2.9) + 0.06 * rid(x * 0.033 + s * 4.1) + 0.04 * rid(x * 0.081 + s * 6.3);

const LAYERS = [
  { base: 0.6, amp: 0.36, seed: 1.1, depth: 0.12, fog: 0.72, scale: 0.55, snow: 0.55 },
  { base: 0.7, amp: 0.3, seed: 3.7, depth: 0.32, fog: 0.5, scale: 0.8, snow: 0.6 },
  { base: 0.82, amp: 0.24, seed: 6.2, depth: 0.58, fog: 0.26, scale: 1.1, snow: 0.7 },
  { base: 0.95, amp: 0.2, seed: 9.4, depth: 1, fog: 0.06, scale: 1.6, snow: 2 },
];

const VIDEO = process.env.NEXT_PUBLIC_HERO_VIDEO_URL;

export function EpicWorld() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = mulberry32(11);
    const stars = Array.from({ length: 320 }, () => ({ x: rand(), y: rand() * 0.6, r: rand() * 1.2 + 0.2, ph: rand() * 6.28 }));
    const parts = Array.from({ length: 140 }, () => ({ x: rand(), y: rand(), z: 0.3 + rand() * 0.7, ph: rand() * 6.28 }));
    const clouds = Array.from({ length: 7 }, (_, i) => ({ x: rand(), y: 0.12 + rand() * 0.34, s: 0.6 + rand() * 0.9, v: 0.004 + rand() * 0.006, blobs: Array.from({ length: 7 }, () => ({ dx: (rand() - 0.5) * 1.6, dy: (rand() - 0.5) * 0.22, r: 0.22 + rand() * 0.32 })), i }));
    // film grain tile
    const grain = document.createElement("canvas"); grain.width = grain.height = 160;
    const gctx = grain.getContext("2d")!; const gd = gctx.createImageData(160, 160);
    for (let i = 0; i < gd.data.length; i += 4) { const v = rand() * 255; gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = v; gd.data[i + 3] = 18; }
    gctx.putImageData(gd, 0, 0);
    const grainPat = ctx.createPattern(grain, "repeat");

    let w = 0, h = 0, sunXg = 0, raf = 0, scrollP = 0, sp = 0, lightning = 0, nextBolt = 3, boltSeed = 1;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(0);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollP = max > 0 ? clamp(window.scrollY / max) : 0;
      if (reduce) { sp = scrollP; draw(0); }
    };
    const onMove = (e: PointerEvent) => { mouse.tx = e.clientX / w - 0.5; mouse.ty = e.clientY / h - 0.5; };

    const ridgeY = (L: (typeof LAYERS)[number], x: number, offX: number, camY: number) =>
      h * L.base + camY * L.depth - ridge((x + offX) / L.scale, L.seed) * h * L.amp * L.scale ** 0.25;

    const layer = (L: (typeof LAYERS)[number], pal: Palette, offX: number, camY: number) => {
      const col = mix(pal.rock, pal.fog, L.fog);
      const shade = mix(col, [0, 0, 0], 0.28 * (1 - L.fog));
      const lit = mix(col, pal.sun, 0.32 * (1 - L.fog * 0.7));
      const pts: number[] = [];
      for (let x = -8; x <= w + 8; x += 4) pts.push(x, ridgeY(L, x, offX, camY));
      const top = h * (L.base - L.amp) + camY * L.depth;
      const path = (dx: number, dy: number) => {
        ctx.beginPath(); ctx.moveTo(-8 + dx, h + 2);
        for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i] + dx, pts[i + 1] + dy);
        ctx.lineTo(w + 8 + dx, h + 2); ctx.closePath();
      };
      // sunlit faces: the ridge in light color, then the same ridge shifted away from the sun in shadow color
      path(0, 0);
      const lg = ctx.createLinearGradient(0, top, 0, h);
      lg.addColorStop(0, rgba(lit)); lg.addColorStop(1, rgba(mix(lit, pal.fog, 0.4)));
      ctx.fillStyle = lg; ctx.fill();
      ctx.save(); ctx.clip();
      const sh = 11 * Math.sqrt(L.scale);
      path(sh, sh * 0.45);
      const sg = ctx.createLinearGradient(0, top, 0, h);
      sg.addColorStop(0, rgba(shade)); sg.addColorStop(0.6, rgba(col)); sg.addColorStop(1, rgba(mix(col, pal.fog, 0.45)));
      ctx.fillStyle = sg; ctx.fill();
      // snow caps that follow each peak
      if (L.snow < 1.5) {
        const line = h * (L.base - L.amp * L.snow) + camY * L.depth;
        const snowC = mix(mix([238, 242, 248], pal.sun, 0.3), pal.fog, L.fog * 0.55);
        ctx.beginPath();
        for (let i = 0; i < pts.length; i += 2) { const y = pts[i + 1]; if (i) ctx.lineTo(pts[i], y); else ctx.moveTo(pts[i], y); }
        for (let i = pts.length - 2; i >= 0; i -= 2) { const y = pts[i + 1], depth = Math.max(0, line - y); ctx.lineTo(pts[i] - depth * 0.15, y + depth * 0.55); }
        ctx.closePath();
        const snowG = ctx.createLinearGradient(sunXg - w * 0.3, 0, sunXg + w * 0.6, 0);
        snowG.addColorStop(0, rgba(snowC, 0.95)); snowG.addColorStop(1, rgba(mix(snowC, shade, 0.35), 0.9));
        ctx.fillStyle = snowG; ctx.fill();
      }
      ctx.restore();
      // soft mist rising from the valley below this range
      const my = h * L.base + camY * L.depth;
      const hz = ctx.createLinearGradient(0, my - h * 0.16, 0, my + h * 0.06);
      hz.addColorStop(0, rgba(pal.fog, 0)); hz.addColorStop(0.7, rgba(pal.fog, 0.4 * (1 - L.depth * 0.5))); hz.addColorStop(1, rgba(pal.fog, 0));
      ctx.fillStyle = hz; ctx.fillRect(0, my - h * 0.16, w, h * 0.22);
    };

    /** Stone Titan: head and shoulders rising behind the range, rune-lit chest, ember eyes. */
    const titan = (cx: number, baseY: number, H: number, pal: Palette, t: number, show: number) => {
      if (show <= 0.001) return;
      const col = mix(pal.rock, pal.fog, 0.42);
      const y0 = baseY - H * show;
      const P = (u: number, v: number): [number, number] => [cx + u * H, y0 + v * H];
      const pts: [number, number][] = [
        [-0.075, 0.03], [-0.06, -0.035], [-0.04, 0.01], [-0.025, -0.06], [-0.005, 0.0], [0.015, -0.07], [0.035, 0.0], [0.055, -0.045], [0.075, 0.03],
        [0.085, 0.1], [0.075, 0.18], [0.062, 0.235], [0.17, 0.265], [0.29, 0.3], [0.36, 0.38], [0.4, 0.55], [0.44, 0.75], [0.45, 1.2],
        [-0.45, 1.2], [-0.44, 0.75], [-0.4, 0.55], [-0.36, 0.38], [-0.29, 0.3], [-0.17, 0.265], [-0.062, 0.235], [-0.075, 0.18], [-0.085, 0.1],
      ];
      ctx.beginPath(); pts.forEach(([u, v], i) => { const [x, y] = P(u, v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath();
      const g = ctx.createLinearGradient(cx - H * 0.4, 0, cx + H * 0.4, 0);
      g.addColorStop(0, rgba(mix(col, pal.sun, 0.22))); g.addColorStop(0.5, rgba(col)); g.addColorStop(1, rgba(mix(col, [0, 0, 0], 0.25)));
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(pal.sun, 0.35 * show); ctx.lineWidth = Math.max(1.5, H * 0.004); ctx.stroke();
      const pulse = 0.7 + Math.sin(t * 1.7) * 0.3;
      for (const s of [-1, 1]) {
        const [ex, ey] = P(s * 0.033, 0.115);
        const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, H * 0.05);
        eg.addColorStop(0, `rgba(255,190,90,${0.95 * pulse * show})`); eg.addColorStop(1, "rgba(255,120,40,0)");
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, H * 0.05, 0, 6.29); ctx.fill();
      }
      ctx.strokeStyle = `rgba(110,220,255,${0.4 * pulse * show})`; ctx.lineWidth = Math.max(1, H * 0.004);
      ctx.beginPath();
      const rune = [[-0.12, 0.42], [-0.06, 0.38], [0, 0.46], [0.06, 0.38], [0.12, 0.42]];
      rune.forEach(([u, v], i) => { const [x, y] = P(u, v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      const [a1, b1] = P(0, 0.46), [a2, b2] = P(0, 0.62); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2);
      ctx.stroke(); ctx.restore();
    };

    /** Winged demon lord: horns, spread wings that breathe, a molten chest and red eyes. */
    const demon = (cx: number, baseY: number, H: number, pal: Palette, t: number, show: number) => {
      if (show <= 0.001) return;
      const col = mix(pal.rock, pal.fog, 0.45);
      const y0 = baseY - H * show;
      const flex = 1 + Math.sin(t * 0.9) * 0.04;
      const P = (u: number, v: number): [number, number] => [cx + u * H, y0 + v * H];
      const poly = (pts: number[][], fill: string) => { ctx.beginPath(); pts.forEach(([u, v], i) => { const [x, y] = P(u, v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
      // wings (behind the body): finger bones with scalloped membrane between them
      for (const sd of [-1, 1]) {
        const k = sd * flex;
        const Q = (u: number, v: number) => P(u, v);
        const [sx, sy] = Q(0.12 * sd, 0.3), [wx, wy] = Q(0.5 * k, -0.1), [f1x, f1y] = Q(0.8 * k, -0.24), [f2x, f2y] = Q(0.86 * k, 0.06), [f3x, f3y] = Q(0.68 * k, 0.28), [hx, hy] = Q(0.2 * sd, 0.62);
        const [c0x, c0y] = Q(0.28 * k, -0.06), [c1x, c1y] = Q(0.74 * k, -0.04), [c2x, c2y] = Q(0.66 * k, 0.12), [c3x, c3y] = Q(0.42 * k, 0.32);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(c0x, c0y, wx, wy); ctx.lineTo(f1x, f1y);
        ctx.quadraticCurveTo(c1x, c1y, f2x, f2y); ctx.quadraticCurveTo(c2x, c2y, f3x, f3y); ctx.quadraticCurveTo(c3x, c3y, hx, hy); ctx.closePath();
        const wg = ctx.createLinearGradient(sx, sy, f1x, f1y);
        wg.addColorStop(0, rgba(col)); wg.addColorStop(1, rgba(mix(col, pal.fog, 0.35), 0.92));
        ctx.fillStyle = wg; ctx.fill();
        ctx.strokeStyle = rgba(mix(col, [0, 0, 0], 0.35)); ctx.lineWidth = Math.max(1.5, H * 0.008); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(c0x, c0y, wx, wy); ctx.lineTo(f1x, f1y); ctx.moveTo(wx, wy); ctx.lineTo(f2x, f2y); ctx.moveTo(wx, wy); ctx.lineTo(f3x, f3y); ctx.stroke();
        ctx.strokeStyle = rgba(pal.sun, 0.25 * show); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(f1x, f1y); ctx.stroke();
      }
      // body with horns
      poly([[-0.07, 0.06], [-0.16, -0.04], [-0.2, -0.16], [-0.14, -0.1], [-0.09, -0.02], [-0.05, -0.03], [0, 0.0], [0.05, -0.03], [0.09, -0.02], [0.14, -0.1], [0.2, -0.16], [0.16, -0.04], [0.07, 0.06],
        [0.075, 0.15], [0.06, 0.21], [0.2, 0.25], [0.3, 0.32], [0.34, 0.5], [0.38, 1.2], [-0.38, 1.2], [-0.34, 0.5], [-0.3, 0.32], [-0.2, 0.25], [-0.06, 0.21], [-0.075, 0.15]], rgba(col));
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const pulse = 0.75 + Math.sin(t * 2.3) * 0.25;
      for (const s of [-1, 1]) {
        const [ex, ey] = P(s * 0.03, 0.1);
        const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, H * 0.045);
        eg.addColorStop(0, `rgba(255,70,50,${pulse * show})`); eg.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, H * 0.045, 0, 6.29); ctx.fill();
      }
      const [mx, my] = P(0, 0.42);
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, H * 0.16);
      mg.addColorStop(0, `rgba(255,140,40,${0.55 * pulse * show})`); mg.addColorStop(1, "rgba(255,40,0,0)");
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, H * 0.16, 0, 6.29); ctx.fill();
      ctx.strokeStyle = `rgba(255,170,60,${0.7 * pulse * show})`; ctx.lineWidth = Math.max(1, H * 0.005);
      ctx.beginPath(); for (const [u, v] of [[-0.02, 0.3], [0.03, 0.38], [-0.03, 0.45], [0.02, 0.54], [-0.01, 0.62]]) { const [x, y] = P(u, v); ctx.lineTo(x, y); } ctx.stroke();
      ctx.restore();
    };

    const dragon = (x: number, y: number, s: number, t: number, color: RGB, dir: number) => {
      const flap = Math.sin(t * 5.2);
      ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
      ctx.fillStyle = rgba(color);
      // wings
      for (const back of [1, 0]) {
        const f = back ? flap * 0.8 : flap;
        ctx.globalAlpha = back ? 0.75 : 1;
        ctx.beginPath(); ctx.moveTo(-4, -2);
        ctx.quadraticCurveTo(-20, -30 * f - 6, -46, -48 * f - 4);
        ctx.lineTo(-38, -30 * f + 2); ctx.lineTo(-32, -34 * f + 6); ctx.lineTo(-24, -20 * f + 6); ctx.lineTo(-18, -22 * f + 8); ctx.lineTo(-10, -8 * f + 6);
        ctx.quadraticCurveTo(-6, 2, 6, 2); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // body, neck, head, tail
      ctx.beginPath(); ctx.moveTo(-34, 4); ctx.quadraticCurveTo(-50, 10, -62, 2 + Math.sin(t * 3) * 3); ctx.quadraticCurveTo(-48, 4, -32, 0);
      ctx.quadraticCurveTo(-10, -5, 10, -2); ctx.quadraticCurveTo(20, -6, 26, -12); ctx.lineTo(34, -12); ctx.lineTo(30, -8); ctx.lineTo(36, -6); ctx.lineTo(26, -4);
      ctx.quadraticCurveTo(16, 4, 6, 5); ctx.quadraticCurveTo(-16, 8, -34, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    };

    const castle = (x: number, y: number, s: number, color: RGB, glow: number) => {
      ctx.fillStyle = rgba(color);
      const tower = (tx: number, tw: number, th: number) => { ctx.fillRect(x + tx * s, y - th * s, tw * s, th * s); ctx.beginPath(); ctx.moveTo(x + (tx - 2) * s, y - th * s); ctx.lineTo(x + (tx + tw / 2) * s, y - (th + tw * 1.4) * s); ctx.lineTo(x + (tx + tw + 2) * s, y - th * s); ctx.fill(); };
      ctx.fillRect(x - 30 * s, y - 26 * s, 74 * s, 30 * s);
      tower(-34, 10, 48); tower(-10, 12, 70); tower(14, 9, 54); tower(36, 11, 40);
      if (glow > 0.02) {
        ctx.fillStyle = `rgba(255,190,110,${glow})`;
        for (const [wx, wy] of [[-30, 36], [-6, 58], [-4, 44], [17, 42], [40, 30], [0, 16], [22, 14]]) ctx.fillRect(x + wx * s, y - wy * s, 2.2 * s, 3.2 * s);
      }
    };

    const draw = (t: number) => {
      sp += (scrollP - sp) * (reduce ? 1 : 0.08);
      mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
      const p = sp, pal = paletteAt(p);
      const wDawn = weight(p, 0), wDay = weight(p, 1 / 3), wStorm = weight(p, 2 / 3), wNight = weight(p, 1);
      const camY = Math.sin(p * Math.PI) * h * 0.14 + mouse.y * h * 0.03;
      const camX = p * w * 0.5 + mouse.x * 40 + t * 3;

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.8);
      sky.addColorStop(0, rgba(pal.top)); sky.addColorStop(0.55, rgba(pal.mid)); sky.addColorStop(1, rgba(pal.hor));
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

      // stars + aurora at night (and faintly at dawn)
      const starA = clamp(wNight + wDawn * 0.35 + wStorm * 0.1);
      if (starA > 0.02) {
        for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${starA * (0.45 + Math.sin(t * 1.3 + s.ph) * 0.3)})`; ctx.fillRect(s.x * w, s.y * h - camY * 0.05, s.r, s.r); }
      }
      if (wNight > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 12) { const y = h * (0.16 + k * 0.06) + Math.sin(x * 0.004 + t * 0.25 + k) * h * 0.05 + Math.sin(x * 0.011 - t * 0.4) * h * 0.015; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
          ctx.lineTo(w, h * 0.5); ctx.lineTo(0, h * 0.5); ctx.closePath();
          const ag = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.5);
          ag.addColorStop(0, `rgba(${k === 1 ? "160,110,255" : "70,255,190"},${0.16 * wNight})`); ag.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = ag; ctx.fill();
        }
        ctx.restore();
      }

      // sun (sets as you scroll) / moon
      const sunX = w * (0.56 - mouse.x * 0.02); sunXg = sunX; const sunY = h * (0.5 - 0.3 * smooth(0, 0.33, p) + 0.28 * smooth(0.4, 0.75, p)) + camY * 0.1;
      const sunA = clamp(1 - wNight * 1.2);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const bloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.75);
      bloom.addColorStop(0, rgba(pal.sun, 0.55 * sunA)); bloom.addColorStop(0.12, rgba(pal.sun, 0.22 * sunA)); bloom.addColorStop(1, rgba(pal.sun, 0));
      ctx.fillStyle = bloom; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = rgba(mix(pal.sun, [255, 250, 240], 0.35 * (1 - wStorm)), sunA * 0.95); ctx.beginPath(); ctx.arc(sunX, sunY, h * 0.035, 0, 6.29); ctx.fill(); ctx.globalCompositeOperation = "lighter";
      // god rays
      const rayA = 0.06 * (wDawn + wDay * 0.8 + wStorm * 0.5);
      if (rayA > 0.005) {
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 + t * 0.015, spread = 0.05 + (k % 3) * 0.025;
          ctx.fillStyle = rgba(pal.sun, rayA * (0.6 + (k % 4) * 0.2));
          ctx.beginPath(); ctx.moveTo(sunX, sunY); ctx.lineTo(sunX + Math.cos(a - spread) * w * 1.4, sunY + Math.sin(a - spread) * w * 1.4); ctx.lineTo(sunX + Math.cos(a + spread) * w * 1.4, sunY + Math.sin(a + spread) * w * 1.4); ctx.fill();
        }
      }
      if (wNight > 0.05) {
        const mx = w * 0.82, my = h * 0.16;
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, h * 0.22);
        mg.addColorStop(0, `rgba(190,225,255,${0.35 * wNight})`); mg.addColorStop(1, "rgba(190,225,255,0)");
        ctx.fillStyle = mg; ctx.fillRect(mx - h * 0.25, my - h * 0.25, h * 0.5, h * 0.5);
        ctx.fillStyle = `rgba(235,244,255,${wNight})`; ctx.beginPath(); ctx.arc(mx, my, h * 0.03, 0, 6.29); ctx.fill();
      }
      ctx.restore();

      // clouds
      const cloudC = mix(pal.fog, pal.sun, 0.35);
      for (const c of clouds) {
        const cx = (((c.x + t * c.v * 0.1 - camX * 0.00008) % 1.4) + 1.4) % 1.4 * w - 0.2 * w, cy = c.y * h + camY * 0.15, R = h * 0.09 * c.s;
        for (const b of c.blobs) {
          const bx = cx + b.dx * R * 1.6, by = cy + b.dy * R * 2, br = R * b.r * 2;
          const cg = ctx.createRadialGradient(bx, by - br * 0.3, 0, bx, by, br);
          cg.addColorStop(0, rgba(mix(cloudC, [255, 255, 255], 0.25), 0.22 * (1 - wNight * 0.6))); cg.addColorStop(1, rgba(cloudC, 0));
          ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.29); ctx.fill();
        }
      }

      // far range, titan and demon behind the second range
      layer(LAYERS[0], pal, camX * 0.15, camY);
      const showTitan = smooth(0.08, 0.32, p) * (1 - smooth(0.5, 0.62, p));
      const showDemon = smooth(0.48, 0.66, p) * (1 - smooth(0.88, 0.98, p));
      titan(w * 0.3 - camX * 0.02, h * 0.92 + camY * 0.32, h * 0.62, pal, t, showTitan);
      demon(w * 0.7 - camX * 0.02, h * 0.92 + camY * 0.32, h * 0.62, pal, t, showDemon);

      // dragon crossing the sky
      const period = 26, ph = ((t + 6) % period) / period;
      if (ph < 0.6 && !reduce) {
        const q = ph / 0.6, dx = -0.15 * w + q * 1.3 * w, dy = h * (0.2 + Math.sin(q * 5) * 0.04) + camY * 0.2;
        dragon(dx, dy, Math.max(0.6, w / 1600) * (0.9 + q * 0.4), t, mix(pal.rock, pal.fog, 0.35), 1);
      }
      if (!reduce) dragon(w * (0.86 - ((t * 0.006) % 1) * 0.9), h * 0.12 + camY * 0.1, Math.max(0.25, w / 4800), t + 1.7, mix(pal.rock, pal.fog, 0.6), -1);

      layer(LAYERS[1], pal, camX * 0.3, camY);
      layer(LAYERS[2], pal, camX * 0.55, camY);
      castle(w * 0.86, ridgeY(LAYERS[2], w * 0.86, camX * 0.55, camY) + 6, Math.max(0.7, w / 1500), mix(pal.rock, pal.fog, 0.2), clamp(wStorm * 0.8 + wNight + wDawn * 0.4));
      layer(LAYERS[3], pal, camX, camY);

      // lightning
      if (wStorm > 0.3 && !reduce) {
        if (t > nextBolt) { lightning = 1; boltSeed = Math.floor(t * 100); nextBolt = t + 2.5 + ((boltSeed % 7) / 7) * 4; }
        if (lightning > 0.02) {
          ctx.fillStyle = `rgba(255,235,220,${lightning * 0.18 * wStorm})`; ctx.fillRect(0, 0, w, h);
          const r = mulberry32(boltSeed); let bx = w * (0.15 + r() * 0.7), by = 0;
          ctx.strokeStyle = `rgba(255,245,235,${lightning * wStorm})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by);
          while (by < h * 0.55) { bx += (r() - 0.5) * 50; by += 20 + r() * 30; ctx.lineTo(bx, by); }
          ctx.stroke(); lightning *= 0.86;
        }
      }

      // weather: gold dust at dawn, snow by day, embers in the storm, fireflies at night
      if (!reduce) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        for (const q of parts) {
          const fall = wDay * 0.08 * q.z, rise = (wStorm * 0.07 + wDawn * 0.015 + wNight * 0.01) * q.z;
          q.y += fall * 0.016 - rise * 0.016; q.x += Math.sin(t * 0.7 + q.ph) * 0.0004 + wStorm * 0.0006;
          if (q.y > 1.05) q.y = -0.05; if (q.y < -0.05) q.y = 1.05; if (q.x > 1.05) q.x = -0.05;
          const x = q.x * w, y = q.y * h, r = (0.8 + q.z * 1.8);
          if (wDay > 0.05) { ctx.fillStyle = `rgba(255,255,255,${0.55 * wDay * q.z})`; ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, 6.29); ctx.fill(); }
          if (wStorm > 0.05) { ctx.fillStyle = `rgba(255,${120 + q.z * 80},50,${0.8 * wStorm * q.z})`; ctx.fillRect(x, y, r, r); }
          if (wDawn > 0.05) { ctx.fillStyle = `rgba(255,220,160,${0.45 * wDawn * q.z})`; ctx.fillRect(x, y, r * 0.7, r * 0.7); }
          if (wNight > 0.05) { const a = 0.5 + Math.sin(t * 2 + q.ph * 3) * 0.5; ctx.fillStyle = `rgba(190,255,150,${0.6 * wNight * a * q.z})`; ctx.beginPath(); ctx.arc(x, h * 0.55 + q.y * h * 0.45, r, 0, 6.29); ctx.fill(); }
        }
        ctx.restore();
      }

      // vignette + film grain
      const vg = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.8);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      if (grainPat && !reduce) { ctx.save(); ctx.translate((t * 997) % 160, (t * 613) % 160); ctx.fillStyle = grainPat; ctx.fillRect(-160, -160, w + 320, h + 320); ctx.restore(); }
    };

    resize(); onScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    const t0 = performance.now();
    const frame = () => { raf = requestAnimationFrame(frame); if (!document.hidden) draw((performance.now() - t0) / 1000); };
    if (reduce) draw(0); else frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <canvas ref={ref} className="h-full w-full" />
      {VIDEO && <video className="absolute inset-0 h-full w-full object-cover opacity-90" src={VIDEO} autoPlay muted loop playsInline />}
    </div>
  );
}
