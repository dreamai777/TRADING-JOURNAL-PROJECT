"use client";
import { useEffect } from "react";

/**
 * Drives the chrome glow on every `.chrome` element: the edge lights up where the cursor is,
 * and a click or key press sends a chrome flash across it.
 */
export function GlowTracker() {
  useEffect(() => {
    let raf = 0;
    let px = -9999, py = -9999;
    const paint = () => {
      raf = 0;
      document.querySelectorAll<HTMLElement>(".chrome").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -300 || r.top > window.innerHeight + 300) return;
        el.style.setProperty("--mx", `${px - r.left}px`);
        el.style.setProperty("--my", `${py - r.top}px`);
      });
    };
    const move = (e: PointerEvent) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint); };
    const flash = (target: EventTarget | null) => {
      const el = (target as HTMLElement | null)?.closest?.(".chrome") as HTMLElement | null;
      if (!el) return;
      el.classList.remove("chrome-flash");
      void el.offsetWidth; // restart the animation
      el.classList.add("chrome-flash");
    };
    const down = (e: PointerEvent) => flash(e.target);
    const key = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") flash(e.target); };
    window.addEventListener("pointermove", move, { passive: true });
    const scroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, []);
  return null;
}
