"use client";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { Ring } from "@/components/charts";
import { cn } from "@/components/ui";
import type { AgentPersona, AgentReport, Finding, Metric } from "@/core/ai/agents";
import { GRADE_COLOR, type Grade } from "@/core/ai/review";

export const TONE_BOX = { good: "border-profit/25 bg-profit/[.04]", bad: "border-loss/25 bg-loss/[.04]", warn: "border-gold/25 bg-gold/[.04]", info: "border-cyan/25 bg-cyan/[.04]" };
export const TONE_DOT = { good: "bg-profit", bad: "bg-loss", warn: "bg-gold", info: "bg-cyan" };

export function GradeBadge({ grade, size = "md" }: { grade: Grade; size?: "sm" | "md" | "lg" }) {
  const c = GRADE_COLOR[grade];
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-lg font-display font-black", size === "sm" && "h-6 w-6 text-xs", size === "md" && "h-9 w-9 text-lg", size === "lg" && "h-16 w-16 text-4xl")}
      style={{ color: c, background: `${c}1a`, boxShadow: `inset 0 0 0 1px ${c}55, 0 0 24px -6px ${c}88` }}
    >
      {grade}
    </span>
  );
}

export function ScoreRing({ score, color, size = 64 }: { score: number; color: string; size?: number }) {
  return (
    <Ring value={score / 100} size={size} stroke={size > 70 ? 7 : 5} color={color}>
      <span className="num font-bold" style={{ fontSize: size / 4 }}>{score}</span>
    </Ring>
  );
}

export function FindingCard({ f }: { f: Finding }) {
  return (
    <div className={cn("rounded-xl border p-4", TONE_BOX[f.tone])}>
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[f.tone])} />
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-snug">{f.title}</div>
          {f.body && <div className="mt-1 text-[13px] leading-relaxed text-muted">{f.body}</div>}
          {f.action && <div className="mt-2.5 rounded-lg bg-black/25 px-3 py-2 text-xs leading-relaxed"><span className="font-semibold text-accent">Do this → </span>{f.action}</div>}
        </div>
      </div>
    </div>
  );
}

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-surface px-4 py-3" title={m.hint}>
          <div className="text-[10px] font-semibold uppercase tracking-[.08em] text-faint">{m.label}</div>
          <div className={cn("num mt-1 text-[15px] font-semibold", m.tone === "profit" && "text-profit", m.tone === "loss" && "text-loss", m.tone === "gold" && "text-gold")}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ActionList({ actions, color = "#c8f53b" }: { actions: string[]; color?: string }) {
  return (
    <ol className="space-y-2">
      {actions.map((a, i) => (
        <li key={a} className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm">
          <span className="num flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-black" style={{ background: color }}>{i + 1}</span>
          <span className="leading-snug">{a}</span>
        </li>
      ))}
    </ol>
  );
}

/** Council member card used on the hub and dashboard. */
export function AgentCard({ persona, report, href, locked, compact }: { persona: Pick<AgentPersona, "name" | "title" | "icon" | "color" | "blurb">; report: AgentReport; href: string; locked?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group card relative flex flex-col overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-line-strong">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl transition group-hover:opacity-45" style={{ background: persona.color }} />
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: `${persona.color}18`, boxShadow: `inset 0 0 0 1px ${persona.color}44` }}>{persona.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-[15px] font-semibold">{persona.name}</span>
            {locked && <span className="inline-flex items-center gap-1 rounded bg-gold/12 px-1.5 py-px text-[10px] font-bold text-gold"><Lock size={9} /> {locked}</span>}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: persona.color }}>{persona.title}</div>
        </div>
        <ScoreRing score={report.score} color={persona.color} size={compact ? 44 : 52} />
      </div>
      <p className="mt-3 text-[13px] leading-snug text-ink/90">{report.headline}</p>
      {!compact && report.findings[0] && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-black/25 px-3 py-2 text-xs text-muted">
          <CheckCircle2 size={13} className="mt-0.5 shrink-0" style={{ color: persona.color }} />
          <span className="line-clamp-2">{report.actions[0] ?? report.findings[0].title}</span>
        </div>
      )}
      <div className="mt-auto flex items-center gap-1 pt-3 text-xs font-semibold text-muted transition group-hover:text-ink">
        Open {persona.name} <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

/** Minimal, safe markdown: paragraphs, bullets, numbered lists, **bold**, _italic_. */
export function MiniMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*[-*•] /.test(l))) return <ul key={i} className="list-disc space-y-1 pl-4">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*•] /, ""))}</li>)}</ul>;
        if (lines.length && lines.every((l) => /^\s*\d+[.)] /.test(l))) return <ol key={i} className="list-decimal space-y-1 pl-4">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)] /, ""))}</li>)}</ol>;
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l.replace(/^#+\s*/, ""))}</span>)}</p>;
      })}
    </div>
  );
}

function inline(s: string): React.ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong> : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? <em key={i} className="text-muted">{p.slice(1, -1)}</em> : p));
}
