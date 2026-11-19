"use client";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { Card, cn } from "@/components/ui";
import { GRADE_COLOR, type TradeReview } from "@/core/ai/review";
import { GradeBadge } from "./report-view";

const VERDICT_TONE: Record<TradeReview["verdict"], string> = {
  "Textbook win": "text-gold", "Solid trade": "text-profit", "Good loss": "text-cyan", "Lucky win": "text-gold", "Messy trade": "text-[#fb923c]", "Earned loss": "text-loss",
};

export function TradeReviewCard({ review, compact }: { review: TradeReview; compact?: boolean }) {
  const color = GRADE_COLOR[review.grade];
  return (
    <Card className="overflow-hidden">
      <div className="relative flex items-center gap-4 border-b border-line px-5 py-4" style={{ background: `linear-gradient(100deg, ${color}14, transparent 60%)` }}>
        <GradeBadge grade={review.grade} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[.1em] text-faint">🔮 Oracle · process grade</div>
          <div className={cn("font-display text-xl font-semibold", VERDICT_TONE[review.verdict])}>{review.verdict}</div>
          <div className="text-xs text-muted">Scored on decisions, not P&L: <span className="num font-semibold text-ink">{review.score}/100</span></div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 border-b border-line px-5 py-4">
        {review.pillars.map((p) => {
          const c = p.score >= 80 ? "#2fe39a" : p.score >= 60 ? "#c8f53b" : p.score >= 45 ? "#fbbf24" : "#ff5470";
          return (
            <div key={p.pillar} className="text-center" title={p.note}>
              <div className="mx-auto flex h-16 w-3 items-end overflow-hidden rounded-full bg-surface-3">
                <div className="w-full rounded-full transition-[height] duration-700" style={{ height: `${p.score}%`, background: c, boxShadow: `0 0 10px ${c}` }} />
              </div>
              <div className="mt-1.5 text-[11px] font-semibold">{p.pillar}</div>
              <div className="num text-[10px] text-faint">{p.score}</div>
            </div>
          );
        })}
      </div>
      <div className={cn("grid gap-4 p-5", !compact && "md:grid-cols-2")}>
        <List icon={<CheckCircle2 size={14} className="text-profit" />} title="What went right" items={review.right} empty="Nothing stood out. Log your setup, stop and emotion so Oracle can see more." />
        <List icon={<XCircle size={14} className="text-loss" />} title="What went wrong" items={review.wrong} empty="Clean trade. No process errors found." />
      </div>
      <div className="mx-5 mb-5 rounded-xl border border-accent/25 bg-accent/[.05] p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent"><Lightbulb size={13} /> Next time</div>
        <ul className="space-y-1.5 text-sm">{review.tips.map((t) => <li key={t} className="flex gap-2"><span className="text-accent">→</span>{t}</li>)}</ul>
      </div>
    </Card>
  );
}

function List({ icon, title, items, empty }: { icon: React.ReactNode; title: string; items: string[]; empty: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{icon} {title}</div>
      {items.length ? (
        <ul className="space-y-1.5">{items.map((x) => <li key={x} className="text-[13px] leading-snug text-ink/90">{x}</li>)}</ul>
      ) : (
        <div className="text-[13px] text-faint">{empty}</div>
      )}
    </div>
  );
}
