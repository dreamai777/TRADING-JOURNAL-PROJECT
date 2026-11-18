"use client";
import { Check, Clock, Droplet, Hourglass, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GearIcon } from "@/components/gear-icon";
import { PageHeader, Segmented, cn, fmtPct } from "@/components/ui";
import { JOBS } from "@/core/character";
import { tierRequirement } from "@/core/gear";
import { weaponStats } from "@/core/game";
import { SPELLS, spellToSetup, type Spell } from "@/core/spells";
import type { JobClass, Setup } from "@/core/types";
import { useCharacter } from "@/components/character";
import { useStore } from "@/lib/store";

export default function SpellbookPage() {
  const { setups, trades, job } = useCharacter();
  const saveSetup = useStore((s) => s.saveSetup);
  const [tab, setTab] = useState<"mine" | "library">(setups.length ? "mine" : "library");
  const [school, setSchool] = useState<JobClass | "all">(job);
  const learned = new Set(setups.map((s) => s.name));
  const lib = SPELLS.filter((s) => school === "all" || s.school === school);

  return (
    <div>
      <PageHeader title="Spellbook" subtitle="Your playbook. Every spell is a setup with exact rules you cast before you trade." right={
        <Segmented value={tab} onChange={setTab} options={[{ value: "mine", label: `My spells (${setups.length})` }, { value: "library", label: "Spell library" }]} />
      } />

      {tab === "mine" ? (
        setups.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-4xl">📖</div>
            <div className="mt-2 font-display text-lg font-bold">Your spellbook is empty</div>
            <p className="mt-1 text-sm text-muted">Learn a spell from the library, or write your own setup in the Arsenal.</p>
            <button onClick={() => setTab("library")} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-ink">Open the spell library</button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {setups.map((s) => <MySpell key={s.id} s={s} w={weaponStats(s, trades)} />)}
          </div>
        )
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["all", ...Object.keys(JOBS)] as (JobClass | "all")[]).map((k) => (
              <button key={k} onClick={() => setSchool(k)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", school === k ? "border-transparent text-bg" : "border-line text-muted hover:text-ink")} style={school === k ? { background: k === "all" ? "#c8f53b" : JOBS[k].color } : undefined}>
                {k === "all" ? "All schools" : `${JOBS[k].name} school`}{k === job && " ★"}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {lib.map((sp) => <LibrarySpell key={sp.id} sp={sp} learned={learned.has(sp.name)} onLearn={() => saveSetup(spellToSetup(sp))} />)}
          </div>
        </>
      )}
    </div>
  );
}

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color }}>{label}</div>
      <div className="mt-0.5 text-sm text-ink/85">{children}</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-faint"><Icon size={11} />{label}</div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}

function LibrarySpell({ sp, learned, onLearn }: { sp: Spell; learned: boolean; onLearn: () => void }) {
  const c = JOBS[sp.school].color;
  return (
    <div className="chrome flex flex-col rounded-2xl border border-line p-5" style={{ background: `radial-gradient(90% 60% at 0% 0%, ${c}1c, transparent 60%), var(--surface)` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: `${c}22`, boxShadow: `inset 0 0 0 1px ${c}55` }}>{sp.icon}</div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: c }}>{JOBS[sp.school].name} school · {sp.weaponClass}</div>
            <div className="font-display text-lg font-bold leading-tight">{sp.name}</div>
          </div>
        </div>
        {learned ? <span className="flex shrink-0 items-center gap-1 rounded-lg bg-profit/10 px-2.5 py-1.5 text-xs font-bold text-profit"><Check size={13} /> Learned</span>
          : <button onClick={onLearn} className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink"><Plus size={13} /> Learn spell</button>}
      </div>
      <p className="mt-3 text-sm text-muted">{sp.description}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat icon={Droplet} label="Mana" value={sp.mana ? `${sp.mana}% risk` : "No stop · DCA"} />
        <Stat icon={Clock} label="Cast time" value={sp.timeframe} />
        <Stat icon={Hourglass} label="Cooldown" value={sp.cooldown} />
      </div>
      <div className="mt-4 space-y-3">
        <Section label="When to cast" color="#38d9f5">{sp.conditions}</Section>
        <Section label="Incantation · entry" color="#c8f53b">{sp.entryTrigger}</Section>
        <Section label="Exit" color="#2fe39a">{sp.exitPlan}</Section>
        <Section label="Counterspell · invalidation" color="#ff5470">{sp.invalidation}</Section>
      </div>
      <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-gold">Pre-cast checklist</div>
        <ul className="mt-1.5 space-y-1 text-sm">{sp.rules.map((r) => <li key={r} className="flex gap-2"><span className="text-faint">☐</span>{r}</li>)}</ul>
      </div>
    </div>
  );
}

function MySpell({ s, w }: { s: Setup; w: ReturnType<typeof weaponStats> }) {
  return (
    <div className="chrome flex flex-col rounded-2xl border p-5" style={{ borderColor: `${w.rarity.color}40`, background: `radial-gradient(90% 60% at 0% 0%, ${w.rarity.glow}, transparent 60%), var(--surface)` }}>
      <div className="flex items-start gap-3">
        <GearIcon tier={w.tier} index={w.rarityIndex} size={64} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: w.rarity.color }}>{w.rarity.name} · {s.weaponClass} · Lv {w.level}</div>
          <div className="font-display text-lg font-bold leading-tight">{s.icon} {s.name}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
            <span>{w.trades.length} casts</span><span>Win {fmtPct(w.summary.winRate, 0)}</span><span>PF {Number.isFinite(w.summary.profitFactor) ? w.summary.profitFactor.toFixed(2) : "∞"}</span><span>Rules {fmtPct(w.summary.disciplineRate, 0)}</span>
          </div>
        </div>
      </div>
      {s.description && <p className="mt-3 text-sm text-muted">{s.description}</p>}
      <div className="mt-4 space-y-3">
        {s.entryTrigger && <Section label="Incantation · entry" color="#c8f53b">{s.entryTrigger}</Section>}
        {s.exitPlan && <Section label="Exit" color="#2fe39a">{s.exitPlan}</Section>}
        {s.invalidation && <Section label="Counterspell · invalidation" color="#ff5470">{s.invalidation}</Section>}
      </div>
      {s.rules.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-gold">Pre-cast checklist</div>
          <ul className="mt-1.5 space-y-1 text-sm">{s.rules.map((r) => <li key={r} className="flex gap-2"><span className="text-faint">☐</span>{r}</li>)}</ul>
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
        <span className="text-muted">{w.nextTier ? <>Next: <b style={{ color: w.nextTier.color }}>{w.nextTier.name}</b> · {tierRequirement(w.nextTier)}</> : "God tier reached"}</span>
        <Link href="/arsenal" className="shrink-0 font-semibold text-accent">Edit in Arsenal</Link>
      </div>
    </div>
  );
}
