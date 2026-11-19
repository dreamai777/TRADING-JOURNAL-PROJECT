"use client";
import Link from "next/link";
import { GEAR_TIERS, type GearTierId } from "@/core/gear";
import { GRADE_COLORS, type Grade } from "@/core/strategy";
import { useGold } from "@/lib/gold";
import { cn } from "../ui";

export function GoldChip({ className }: { className?: string }) {
  const { balance } = useGold();
  return (
    <Link href="/shop?tab=wallet" title="Your Gold. Earn it from quests, badges, lessons and invites." className={cn("flex h-9 items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 text-xs font-bold text-gold transition hover:bg-gold/20", className)}>
      <span aria-hidden>🪙</span>
      <span className="num">{balance.toLocaleString()}</span>
    </Link>
  );
}

export function GradeBadge({ grade, score, size = 96 }: { grade: Grade; score?: number; size?: number }) {
  const color = GRADE_COLORS[grade];
  return (
    <div className="relative flex shrink-0 flex-col items-center justify-center rounded-2xl border-2" style={{ width: size, height: size, borderColor: color, boxShadow: `0 0 28px -6px ${color}, inset 0 0 22px -10px ${color}`, background: `radial-gradient(circle at 50% 30%, ${color}22, transparent 70%)` }} aria-label={`Grade ${grade}`}>
      <div className="font-display font-black leading-none" style={{ color, fontSize: size * (grade.length > 2 ? 0.3 : 0.38) }}>{grade}</div>
      {score !== undefined && size >= 64 && <div className="num mt-1 text-[10px] font-semibold text-muted">{score}/100</div>}
    </div>
  );
}

export const tierOf = (id: GearTierId) => GEAR_TIERS.find((t) => t.id === id)!;

export function RarityPill({ id }: { id: GearTierId }) {
  const t = tierOf(id);
  return <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: t.color, background: `${t.color}1f` }}>{t.name}</span>;
}

export function PriceTag({ gold, usd, className }: { gold: number; usd: number; className?: string }) {
  if (!gold && !usd) return <span className={cn("text-sm font-bold text-profit", className)}>Free</span>;
  return (
    <span className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold", className)}>
      {gold > 0 && <span className="num text-gold">🪙 {gold.toLocaleString()}</span>}
      {gold > 0 && usd > 0 && <span className="text-[10px] font-semibold text-faint">or</span>}
      {usd > 0 && <span className="num">${usd.toFixed(usd % 1 ? 2 : 0)}</span>}
    </span>
  );
}
