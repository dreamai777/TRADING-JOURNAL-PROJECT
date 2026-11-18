"use client";
import { useId } from "react";
import type { GearTier } from "@/core/gear";

/** Item art for a gear tier: metal, gems, glow and wings grow with the tier. Vector, so it's sharp at any size. */
export function GearIcon({ tier, index, size = 96 }: { tier: GearTier; index: number; size?: number }) {
  const id = useId().replace(/:/g, "");
  const c = tier.color;
  const god = tier.id === "god";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={god ? "god-tier" : undefined} aria-label={`${tier.name} blade`}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor={index < 2 ? "#cbd2dc" : c} />
          <stop offset=".55" stopColor={index < 2 ? "#7c8696" : c} stopOpacity=".7" />
          <stop offset="1" stopColor="#2a3140" />
        </linearGradient>
        <radialGradient id={`g${id}`}>
          <stop offset="0" stopColor={c} stopOpacity={0.15 + index * 0.08} />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </radialGradient>
        <filter id={`f${id}`}><feGaussianBlur stdDeviation="1.4" /></filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#g${id})`} />
      {index >= 4 && (
        <g fill={c} opacity=".55">
          <path d="M44 66 C30 60 18 52 10 38 C22 44 32 48 44 56Z" />
          <path d="M56 66 C70 60 82 52 90 38 C78 44 68 48 56 56Z" />
        </g>
      )}
      {index >= 5 && <circle cx="50" cy="16" r="7" fill="none" stroke={c} strokeWidth="1.5" opacity=".8" />}
      {/* blade */}
      <path d="M50 6 L57 18 L56 64 L44 64 L43 18 Z" fill={`url(#b${id})`} stroke="#0b0f15" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M50 10 L50 62" stroke="#ffffff" strokeOpacity=".55" strokeWidth="1" />
      {index >= 3 && <path d="M50 14 L50 58" stroke={c} strokeWidth="2.5" filter={`url(#f${id})`} />}
      {/* guard */}
      <path d={index >= 2 ? "M30 64 Q40 58 50 66 Q60 58 70 64 L66 70 Q58 67 50 72 Q42 67 34 70 Z" : "M34 64 H66 V70 H34 Z"} fill={index >= 2 ? c : "#6b7280"} stroke="#0b0f15" strokeWidth="1.5" strokeLinejoin="round" />
      {/* grip + pommel */}
      <rect x="46" y="71" width="8" height="15" rx="2" fill="#3b2a1e" stroke="#0b0f15" strokeWidth="1.5" />
      <path d="M46 75 H54 M46 79 H54 M46 83 H54" stroke="#6b4a32" strokeWidth="1" />
      <circle cx="50" cy="90" r={index >= 3 ? 5 : 4} fill={index >= 1 ? c : "#6b7280"} stroke="#0b0f15" strokeWidth="1.5" />
      {index >= 1 && <circle cx="50" cy="68" r="2.6" fill="#ffffff" stroke={c} strokeWidth="1.2" />}
      {index >= 6 && (
        <g fill="#ffffff">
          {[[22, 22], [80, 26], [18, 70], [84, 74], [50, 2]].map(([x, y], k) => <path key={k} d={`M${x} ${y - 4} L${x + 1.2} ${y - 1.2} L${x + 4} ${y} L${x + 1.2} ${y + 1.2} L${x} ${y + 4} L${x - 1.2} ${y + 1.2} L${x - 4} ${y} L${x - 1.2} ${y - 1.2}Z`} />)}
        </g>
      )}
    </svg>
  );
}
