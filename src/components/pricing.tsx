"use client";
import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FEATURE_MATRIX, PLANS } from "@/core/plans";

export function PricingCards() {
  const [yearly, setYearly] = useState(true);
  return (
    <div>
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-xl border border-line bg-surface/80 p-1 text-sm backdrop-blur">
          {[false, true].map((y) => (
            <button key={String(y)} onClick={() => setYearly(y)} className={`rounded-lg px-4 py-1.5 font-semibold transition ${yearly === y ? "bg-surface-3 text-ink" : "text-muted hover:text-ink"}`}>
              {y ? <>Yearly <span className="ml-1 rounded bg-profit/15 px-1.5 py-0.5 text-[10px] font-bold text-profit">2 months free</span></> : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const price = yearly ? p.yearly : p.monthly;
          const best = p.id === "premium";
          return (
            <div key={p.id} className={`chrome relative flex flex-col rounded-2xl border p-6 ${best ? "lg:-my-3 lg:py-9" : ""}`} style={{ borderColor: `${p.color}${best ? "80" : "40"}`, background: `radial-gradient(110% 70% at 50% 0%, ${p.color}${best ? "26" : "16"}, transparent 60%), var(--surface)` }}>
              {best && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-ink">Most popular</span>}
              <div className="text-[11px] font-bold uppercase tracking-[.2em]" style={{ color: p.color }}>{p.rank}</div>
              <div className="mt-1 font-display text-2xl font-bold">{p.name}</div>
              <div className="mt-3 flex items-end gap-1">
                <span className="font-display text-4xl font-bold">${price}</span>
                <span className="pb-1 text-sm text-muted">{p.monthly ? "/ month" : "forever"}</span>
              </div>
              <div className="h-4 text-[11px] text-faint">{p.monthly && yearly ? `$${p.yearly * 12} billed yearly` : p.monthly ? "Billed monthly, cancel any time" : ""}</div>
              <p className="mt-3 text-sm text-muted">{p.pitch}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {p.highlights.map((h) => <li key={h} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0" style={{ color: p.color }} />{h}</li>)}
              </ul>
              <Link href="/login" className={`chrome mt-6 rounded-xl py-3 text-center font-bold ${best ? "bg-accent text-accent-ink" : "border border-line-strong text-ink"}`} style={p.id === "ultra" ? { background: "linear-gradient(90deg,#fbbf24,#fb923c)", color: "#0b0f15", border: 0 } : undefined}>{p.cta}</Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FeatureTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="p-4 font-semibold text-muted">Feature</th>
            {PLANS.map((p) => <th key={p.id} className="w-[19%] p-4 text-center font-display font-bold" style={{ color: p.color }}>{p.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {FEATURE_MATRIX.map((g) => [
            <tr key={g.group}><td colSpan={4} className="bg-surface-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[.16em] text-faint">{g.group}</td></tr>,
            ...g.rows.map(([label, ...vals]) => (
              <tr key={label} className="border-t border-line/60">
                <td className="p-3 pl-4 text-ink/85">{label}</td>
                {vals.map((v, i) => (
                  <td key={i} className="p-3 text-center text-xs">
                    {v === true ? <Check size={16} className="mx-auto text-profit" /> : v === false ? <Minus size={16} className="mx-auto text-faint" /> : <span className="font-semibold">{v}</span>}
                  </td>
                ))}
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
}
