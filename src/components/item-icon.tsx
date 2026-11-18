"use client";
// Vector item art for every item in the catalog. The tier sets the accent metal and gems,
// and `glow` (0..7, from tier + item level) sets how strongly the item shines and pulses.
import { useId } from "react";
import { GEAR_TIERS } from "@/core/gear";
import type { ItemArt } from "@/core/items";

const INK = "#0b0f15";

export function ItemIcon({ art, tierIndex, glow = tierIndex, size = 72, locked = false }: { art: ItemArt; tierIndex: number; glow?: number; size?: number; locked?: boolean }) {
  const id = useId().replace(/:/g, "");
  const tier = GEAR_TIERS[Math.max(0, Math.min(6, tierIndex))];
  const c = locked ? "#4b5563" : tier.color;
  const g = locked ? 0 : glow;
  const metal = `url(#m${id})`, accent = `url(#a${id})`;
  const S = { stroke: INK, strokeWidth: 2.2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const gem = (x: number, y: number, r = 4) => <circle cx={x} cy={y} r={r} fill={c} stroke={INK} strokeWidth="1.6" className={g >= 3 ? "item-gem" : undefined} />;

  const shape = (() => {
    switch (art) {
      case "staff": return <g><path d="M47 92 L53 92 L54 34 L46 34Z" fill="#6b4a2e" {...S} /><path d="M38 34 Q36 14 50 8 Q64 14 62 34 Q56 28 50 30 Q44 28 38 34Z" fill={metal} {...S} />{gem(50, 22, 7)}</g>;
      case "wand": return <g><path d="M30 82 L36 88 L70 30 L64 26Z" fill="#7c5a36" {...S} /><path d="M62 28 L70 18 L78 30 L70 34Z" fill={metal} {...S} />{gem(70, 26, 4.5)}</g>;
      case "tome": return <g><path d="M22 20 H72 Q78 20 78 26 V84 H28 Q22 84 22 78Z" fill={accent} {...S} /><path d="M28 84 V78 H78" fill="none" {...S} /><rect x="36" y="32" width="30" height="34" rx="3" fill="none" stroke={INK} strokeWidth="1.6" /><path d="M51 38 L58 49 L51 60 L44 49Z" fill={metal} stroke={INK} strokeWidth="1.4" />{gem(51, 49, 3)}</g>;
      case "orb": return <g><path d="M32 86 Q50 74 68 86 L64 92 H36Z" fill={metal} {...S} /><circle cx="50" cy="50" r="27" fill={accent} {...S} /><ellipse cx="41" cy="40" rx="9" ry="6" fill="#fff" opacity=".45" /><circle cx="50" cy="50" r="12" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" /></g>;
      case "sword": return <g><path d="M50 6 L57 18 L56 64 L44 64 L43 18Z" fill={metal} {...S} /><path d="M50 12 V60" stroke="#fff" strokeOpacity=".55" strokeWidth="1.2" /><path d="M32 64 H68 L64 71 H36Z" fill={accent} {...S} /><rect x="46" y="71" width="8" height="15" rx="2" fill="#3b2a1e" {...S} />{gem(50, 90, 4.5)}</g>;
      case "greatsword": return <g><path d="M50 2 L60 14 L59 62 L41 62 L40 14Z" fill={metal} {...S} /><path d="M50 8 V58" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" /><path d="M24 62 Q38 56 50 64 Q62 56 76 62 L70 70 Q60 66 50 72 Q40 66 30 70Z" fill={accent} {...S} /><rect x="46" y="72" width="8" height="16" rx="2" fill="#3b2a1e" {...S} />{gem(50, 92, 5)}</g>;
      case "hammer": return <g><path d="M47 94 H53 L54 40 H46Z" fill="#5b3b22" {...S} /><path d="M24 18 H76 Q80 18 80 22 V42 Q80 46 76 46 H24 Q20 46 20 42 V22 Q20 18 24 18Z" fill={metal} {...S} /><rect x="40" y="22" width="20" height="20" rx="3" fill={accent} stroke={INK} strokeWidth="1.6" />{gem(50, 32, 4)}</g>;
      case "axe": return <g><path d="M47 94 H53 L54 12 H46Z" fill="#5b3b22" {...S} /><path d="M54 16 Q86 14 88 44 Q72 38 54 42Z" fill={metal} {...S} /><path d="M46 20 Q24 22 22 40 Q34 36 46 38Z" fill={accent} {...S} /><path d="M60 22 Q78 22 82 38" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" /></g>;
      case "dagger": return <g><path d="M30 76 L64 18 L70 22 L40 82Z" fill={metal} {...S} /><path d="M24 70 L44 84 L40 88 L20 74Z" fill={accent} {...S} /><path d="M30 80 L20 92" stroke="#3b2a1e" strokeWidth="7" strokeLinecap="round" /><path d="M58 76 L76 52 L80 55 L64 80Z" fill={metal} {...S} opacity=".85" /></g>;
      case "bow": return <g><path d="M34 8 Q86 50 34 92" fill="none" stroke="#7a4f2a" strokeWidth="7" strokeLinecap="round" /><path d="M34 8 Q86 50 34 92" fill="none" stroke={INK} strokeWidth="1.4" /><path d="M34 8 V92" stroke="#e5e7eb" strokeWidth="1.4" /><path d="M20 50 H78" stroke="#c8b08a" strokeWidth="2.4" /><path d="M78 50 L70 45 V55Z" fill={metal} {...S} />{gem(60, 50, 4.5)}</g>;
      case "crossbow": return <g><path d="M46 30 H54 V92 H46Z" fill="#5b3b22" {...S} /><path d="M14 40 Q50 18 86 40" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M14 40 Q50 18 86 40" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" /><path d="M14 40 L50 52 L86 40" stroke="#e5e7eb" strokeWidth="1.4" fill="none" /><path d="M50 8 L56 22 H44Z" fill={metal} {...S} /><rect x="42" y="56" width="16" height="10" rx="2" fill={metal} {...S} /></g>;
      case "quiver": return <g>{[38, 50, 62].map((x, i) => <g key={x}><path d={`M${x} 30 V10`} stroke="#c8b08a" strokeWidth="2.2" /><path d={`M${x - 4} 12 L${x} 4 L${x + 4} 12Z`} fill={i === 1 ? c : "#e5e7eb"} stroke={INK} strokeWidth="1.2" /></g>)}<path d="M30 28 H70 L66 90 H34Z" fill="#6b4a2e" {...S} /><path d="M32 40 H68 M33 76 H67" stroke={c} strokeWidth="4" /></g>;
      case "shield": return <g><path d="M50 8 L84 20 V48 Q84 76 50 92 Q16 76 16 48 V20Z" fill={accent} {...S} /><path d="M50 18 L74 27 V48 Q74 68 50 81 Q26 68 26 48 V27Z" fill={metal} stroke={INK} strokeWidth="1.6" /><path d="M50 26 V74 M34 46 H66" stroke={c} strokeWidth="5" />{gem(50, 46, 5)}</g>;
      case "hood": return <g><path d="M50 10 Q82 14 82 54 L76 86 H24 L18 54 Q18 14 50 10Z" fill={accent} {...S} /><path d="M50 30 Q68 32 68 58 Q60 70 50 70 Q40 70 32 58 Q32 32 50 30Z" fill="#11151c" stroke={INK} strokeWidth="1.6" /><circle cx="43" cy="54" r="2.4" fill={c} /><circle cx="57" cy="54" r="2.4" fill={c} /></g>;
      case "hat": return <g><path d="M12 70 Q50 56 88 70 Q50 84 12 70Z" fill={accent} {...S} /><path d="M30 66 Q34 30 58 8 Q56 30 70 66 Q50 60 30 66Z" fill={accent} {...S} /><path d="M30 66 Q50 58 70 66 L70 60 Q50 54 30 60Z" fill={metal} stroke={INK} strokeWidth="1.4" />{gem(50, 60, 3.5)}</g>;
      case "helm": return <g><path d="M20 58 Q20 16 50 14 Q80 16 80 58 L80 80 Q66 86 50 86 Q34 86 20 80Z" fill={metal} {...S} /><path d="M28 50 H72 V58 H28Z" fill="#0b0f15" /><path d="M50 58 V84" stroke={INK} strokeWidth="2.2" /><path d="M50 14 Q44 2 58 0 Q54 8 62 12 Q56 12 50 14" fill={c} {...S} /><path d="M20 58 Q50 48 80 58" fill="none" stroke={c} strokeWidth="3" /></g>;
      case "circlet": return <g><ellipse cx="50" cy="56" rx="36" ry="16" fill="none" stroke={INK} strokeWidth="11" /><ellipse cx="50" cy="56" rx="36" ry="16" fill="none" stroke={metal} strokeWidth="7" /><path d="M38 44 L50 22 L62 44Z" fill={metal} {...S} />{gem(50, 40, 6)}{gem(24, 54, 3)}{gem(76, 54, 3)}</g>;
      case "robe": return <g><path d="M36 10 H64 L72 30 L84 88 H16 L28 30Z" fill={accent} {...S} /><path d="M50 12 V88" stroke={metal} strokeWidth="5" /><path d="M36 10 L50 30 L64 10" fill="none" {...S} /><path d="M24 66 H76" stroke={c} strokeWidth="3" opacity=".8" />{gem(50, 40, 4)}</g>;
      case "armor": return <g><path d="M30 12 L42 8 Q50 16 58 8 L70 12 L88 24 L80 44 L72 40 V88 H28 V40 L20 44 L12 24Z" fill={metal} {...S} /><path d="M38 30 H62 V62 Q50 70 38 62Z" fill={accent} stroke={INK} strokeWidth="1.6" /><path d="M28 74 H72" stroke={INK} strokeWidth="2.2" /><rect x="44" y="70" width="12" height="8" rx="1.5" fill={c} stroke={INK} strokeWidth="1.4" /></g>;
      case "cloak": return <g><path d="M34 12 Q50 20 66 12 L80 88 Q66 82 50 92 Q34 82 20 88Z" fill={accent} {...S} /><path d="M38 20 Q30 54 30 82 M62 20 Q70 54 70 82" stroke="#000" strokeOpacity=".25" strokeWidth="3" fill="none" /><path d="M34 12 Q50 24 66 12" fill="none" stroke={metal} strokeWidth="5" />{gem(50, 20, 5)}</g>;
      case "boots": return <g><path d="M22 14 H46 V64 L74 66 Q86 68 86 80 V88 H22Z" fill={accent} {...S} /><path d="M22 26 H46 M22 38 H46" stroke={metal} strokeWidth="4" /><path d="M22 80 H86 V88 H22Z" fill="#2a1d14" {...S} /><circle cx="34" cy="52" r="4" fill={c} stroke={INK} strokeWidth="1.4" /></g>;
      case "ring": return <g><circle cx="50" cy="60" r="24" fill="none" stroke={INK} strokeWidth="13" /><circle cx="50" cy="60" r="24" fill="none" stroke={metal} strokeWidth="9" /><path d="M38 34 L50 18 L62 34 L50 42Z" fill={c} {...S} /><path d="M44 30 L50 22 L56 30" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.4" /></g>;
      case "amulet": return <g><path d="M24 8 Q50 50 76 8" fill="none" stroke="#c9a24a" strokeWidth="2.4" strokeDasharray="3 2" /><path d="M50 40 L70 56 L62 84 H38 L30 56Z" fill={metal} {...S} />{gem(50, 62, 9)}<circle cx="47" cy="59" r="2.5" fill="#fff" opacity=".7" /></g>;
      case "charm": return <g><path d="M50 6 V22" stroke="#c9a24a" strokeWidth="2.4" /><path d="M50 22 C74 22 80 46 70 64 C62 78 56 86 50 94 C44 86 38 78 30 64 C20 46 26 22 50 22Z" fill={accent} {...S} /><path d="M50 36 L56 52 L50 70 L44 52Z" fill={metal} stroke={INK} strokeWidth="1.4" /></g>;
    }
  })();

  const pulse = Math.max(1.2, 3.4 - g * 0.3);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={tierIndex >= 6 && !locked ? "god-tier" : undefined} style={{ overflow: "visible", opacity: locked ? 0.55 : 1 }}>
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".4" stopColor={tierIndex < 2 || locked ? "#c4ccd8" : c} />
          <stop offset="1" stopColor="#2a3140" />
        </linearGradient>
        <linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} />
          <stop offset="1" stopColor={locked ? "#1f2937" : `${c}66`} />
        </linearGradient>
        <radialGradient id={`h${id}`}>
          <stop offset="0" stopColor={c} stopOpacity={Math.min(0.85, 0.12 + g * 0.1)} />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      {g > 0.3 && <circle cx="50" cy="50" r={34 + g * 3} fill={`url(#h${id})`} className={g >= 2 ? "item-halo" : undefined} style={{ ["--pulse" as string]: `${pulse}s` }} />}
      {g >= 4 && <circle cx="50" cy="50" r="44" fill="none" stroke={c} strokeWidth="1.2" strokeDasharray="2 6" opacity=".7" className="item-orbit" />}
      <g style={{ filter: g >= 1 ? `drop-shadow(0 0 ${(1 + g * 1.4).toFixed(1)}px ${c})` : undefined }}>{shape}</g>
      {g >= 5 && [[16, 18], [84, 24], [14, 80], [86, 78]].map(([x, y], k) => (
        <path key={k} className="item-spark" style={{ animationDelay: `${k * 0.4}s` }} d={`M${x} ${y - 5} L${x + 1.4} ${y - 1.4} L${x + 5} ${y} L${x + 1.4} ${y + 1.4} L${x} ${y + 5} L${x - 1.4} ${y + 1.4} L${x - 5} ${y} L${x - 1.4} ${y - 1.4}Z`} fill="#fff" />
      ))}
      {locked && <g><circle cx="78" cy="78" r="11" fill="#111827" stroke="#374151" strokeWidth="2" /><path d="M73 78 h10 v8 h-10z M75 78 v-3 a3 3 0 0 1 6 0 v3" fill="none" stroke="#9ca3af" strokeWidth="1.8" /></g>}
    </svg>
  );
}
