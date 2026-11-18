"use client";
import { RANGES } from "@/core/stats";
import { useStore } from "@/lib/store";
import { cn } from "./ui";

export function RangePicker({ className }: { className?: string }) {
  const range = useStore((s) => s.range);
  const setRange = useStore((s) => s.setRange);
  return (
    <div className={cn("inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-surface-2 p-0.5", className)} role="tablist" aria-label="Time range">
      {RANGES.map((r) => (
        <button
          key={r.key}
          role="tab"
          aria-selected={range === r.key}
          onClick={() => setRange(r.key)}
          className={cn("shrink-0 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors", range === r.key ? "bg-surface-3 text-ink shadow-sm" : "text-muted hover:text-ink")}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
