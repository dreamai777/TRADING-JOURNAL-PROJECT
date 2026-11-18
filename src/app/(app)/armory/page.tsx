"use client";
import { Check, Lock, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useArmory } from "@/components/character";
import { ItemIcon } from "@/components/item-icon";
import { LivingCharacter } from "@/components/living-character";
import { PageHeader, Segmented, cn, fmtPct } from "@/components/ui";
import { JOBS } from "@/core/character";
import { GEAR_TIERS, tierRequirement } from "@/core/gear";
import { ITEMS, SLOTS, affinityStats, unlockHint, type Affinity, type ItemState, type Slot } from "@/core/items";
import { SKILLS } from "@/core/trader-test";
import { useStore } from "@/lib/store";

const AFFINITIES: Affinity[] = ["Breakout", "Reversal", "Trend", "Scalp", "Range", "News", "any"];

export default function ArmoryPage() {
  const { job, c, states, equipped, gear, trades, setups } = useArmory();
  const equip = useStore((s) => s.equipItem);
  const [slot, setSlot] = useState<Slot | "all">("all");
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [hideLocked, setHideLocked] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const aff = useMemo(() => affinityStats(trades, setups), [trades, setups]);

  const list = states.filter((s) => (slot === "all" || s.item.slot === slot) && (scope === "all" || s.item.job === job || s.item.job === "any") && (!hideLocked || s.unlocked));
  list.sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.tierIndex - a.tierIndex || a.unlockIndex - b.unlockIndex);
  const owned = states.filter((s) => s.unlocked).length;
  const sel = states.find((s) => s.item.id === selId) ?? equipped.weapon ?? list[0];
  const isEquipped = (s: ItemState) => equipped[s.item.slot]?.item.id === s.item.id;
  const color = JOBS[job].color;

  return (
    <div>
      <PageHeader
        title="Armory"
        subtitle={`${ITEMS.length} items. Each one upgrades from Basic to God as the setups it is bound to prove their win rate, profit factor and discipline.`}
        right={<div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs"><span className="font-display text-lg font-bold text-ink">{owned}</span><span className="text-muted"> / {ITEMS.length} unlocked</span></div>}
      />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* paper doll */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="chrome relative overflow-hidden rounded-2xl border border-line p-4" style={{ background: `radial-gradient(80% 60% at 50% 30%, ${gear.weaponColor}33, transparent 70%), linear-gradient(180deg, ${color}22, var(--surface) 70%)` }}>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.16em] text-muted">
              <span style={{ color }}>{JOBS[job].name} · Lv {c.progress.level}</span>
              <span>Click your hero</span>
            </div>
            <div className="flex justify-center pb-2 pt-8">
              <LivingCharacter job={job} condition={c.condition} size={150} tier={c.tier as 0 | 1 | 2} gear={gear} />
            </div>
            <div className="mx-auto -mt-3 h-3 w-2/3 rounded-[50%] blur-md" style={{ background: `${gear.weaponColor}55` }} />
          </div>
          <div className="card divide-y divide-line">
            {SLOTS.map(({ id, name }) => {
              const s = equipped[id];
              return (
                <button key={id} onClick={() => { setSlot(id); if (s) setSelId(s.item.id); }} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-surface-2", slot === id && "bg-surface-2")}>
                  {s ? <ItemIcon art={s.item.art} tierIndex={s.tierIndex} glow={s.glow} size={38} /> : <div className="h-[38px] w-[38px] rounded-lg border border-dashed border-line" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-faint">{name}</div>
                    <div className="truncate text-sm font-semibold" style={{ color: s?.tier.color }}>{s ? s.item.name : "Empty"}</div>
                  </div>
                  {s && <span className="text-[10px] text-muted">{s.tier.name} · Lv {s.level}</span>}
                </button>
              );
            })}
          </div>
          <div className="card p-3">
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-gold">Forge power by setup type</div>
            <p className="mt-0.5 text-xs text-muted">Weapons and trinkets take the tier of their setup type. Armor takes your overall record.</p>
            <div className="mt-2 space-y-1.5">
              {AFFINITIES.map((a) => {
                const s = aff[a];
                return (
                  <div key={a} className="flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 font-semibold">{a === "any" ? "Overall" : a}</span>
                    <div className="flex flex-1 gap-0.5">{GEAR_TIERS.map((t, i) => <span key={t.id} className="h-2 flex-1 rounded-sm" style={{ background: i <= s.tierIndex ? t.color : "var(--surface-3, #1c2430)" }} />)}</div>
                    <span className="w-24 shrink-0 text-right text-muted">{s.summary.count ? `${s.summary.count} · ${fmtPct(s.summary.winRate, 0)}` : "no trades"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {sel && <ItemDetail s={sel} equipped={isEquipped(sel)} onEquip={() => equip(sel.item.slot, sel.item.id)} onUnequip={() => equip(sel.item.slot, null)} />}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...SLOTS.map((s) => s.id)] as (Slot | "all")[]).map((k) => (
                <button key={k} onClick={() => setSlot(k)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", slot === k ? "border-transparent bg-accent text-accent-ink" : "border-line text-muted hover:text-ink")}>
                  {k === "all" ? "All slots" : SLOTS.find((s) => s.id === k)!.name}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Segmented value={scope} onChange={setScope} options={[{ value: "mine", label: `${JOBS[job].name} gear` }, { value: "all", label: "All classes" }]} />
              <button onClick={() => setHideLocked((v) => !v)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", hideLocked ? "border-accent text-accent" : "border-line text-muted")}>Unlocked only</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => (
              <button key={s.item.id} onClick={() => setSelId(s.item.id)} className={cn("chrome group flex items-center gap-3 rounded-xl border p-3 text-left transition", sel?.item.id === s.item.id ? "border-accent/60" : "border-line hover:border-line-strong")} style={{ background: s.unlocked ? `radial-gradient(80% 90% at 0% 50%, ${s.tier.color}${s.tierIndex >= 3 ? "26" : "14"}, transparent 70%), var(--surface)` : "var(--surface)" }}>
                <ItemIcon art={s.item.art} tierIndex={s.tierIndex} glow={s.glow} size={58} locked={!s.unlocked} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold leading-tight" style={{ color: s.unlocked ? s.tier.color : undefined }}>{s.item.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted">{SLOTS.find((x) => x.id === s.item.slot)!.name} · {s.item.job === "any" ? "Any class" : JOBS[s.item.job].name} · {s.item.affinity === "any" ? "Overall" : s.item.affinity}</div>
                  <div className="mt-1 text-[11px]">
                    {s.unlocked ? (
                      isEquipped(s) ? <span className="inline-flex items-center gap-1 font-bold text-profit"><Check size={12} /> Equipped · Lv {s.level}</span> : <span className="text-muted">{s.tier.name} · Lv {s.level}</span>
                    ) : <span className="inline-flex items-center gap-1 text-faint"><Lock size={11} /> {unlockHint(s)}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemDetail({ s, equipped, onEquip, onUnequip }: { s: ItemState; equipped: boolean; onEquip: () => void; onUnequip: () => void }) {
  const st = s.stats;
  return (
    <div className="chrome rounded-2xl border p-5" style={{ borderColor: `${s.tier.color}55`, background: `radial-gradient(70% 90% at 0% 0%, ${s.tier.color}2a, transparent 65%), var(--surface)` }}>
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex shrink-0 justify-center sm:w-40"><ItemIcon art={s.item.art} tierIndex={s.tierIndex} glow={s.glow} size={140} locked={!s.unlocked} /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: s.tier.color }}>{s.tier.name} · {SLOTS.find((x) => x.id === s.item.slot)!.name} · Lv {s.level}</div>
          <div className="font-display text-2xl font-bold leading-tight">{s.item.name}</div>
          <p className="mt-1 text-sm italic text-muted">{s.item.lore}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Mini label="Bound to" value={s.item.affinity === "any" ? "All trades" : `${s.item.affinity} setups`} />
            <Mini label="Trades" value={String(st.count)} />
            <Mini label="Win rate" value={st.count ? fmtPct(st.winRate, 0) : "–"} />
            <Mini label="Profit factor" value={st.count ? (Number.isFinite(st.profitFactor) ? st.profitFactor.toFixed(2) : "∞") : "–"} />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Sparkles size={13} className="text-gold" /> +{SKILLS[s.item.bonus].name}. {SKILLS[s.item.bonus].desc}</div>
        </div>
      </div>
      {/* tier ladder */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {GEAR_TIERS.map((t, i) => (
          <div key={t.id} className={cn("rounded-lg border px-1 py-1.5 text-center", i === s.tierIndex ? "border-transparent" : "border-line")} style={i === s.tierIndex ? { background: `${t.color}30`, boxShadow: `0 0 18px ${t.color}55, inset 0 0 0 1px ${t.color}` } : undefined}>
            <div className="text-[9px] font-bold uppercase tracking-wider sm:text-[10px]" style={{ color: i <= s.tierIndex ? t.color : undefined, opacity: i <= s.tierIndex ? 1 : 0.4 }}>{t.name}</div>
            {i === s.unlockIndex && <div className="mt-0.5 text-[9px] text-faint">drops</div>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-muted">
          {!s.unlocked ? <><Lock size={11} className="mr-1 inline" />{unlockHint(s)}: {tierRequirement(GEAR_TIERS[s.unlockIndex])}.</>
            : s.nextTier ? <>Next: <b style={{ color: s.nextTier.color }}>{s.nextTier.name}</b> at {tierRequirement(s.nextTier)}. The glow grows with every tier and level.</>
            : "God tier. This is as bright as gear gets."}
        </span>
        {s.unlocked && (equipped
          ? <button onClick={onUnequip} className="rounded-lg border border-line px-3 py-1.5 font-bold text-muted hover:text-ink">Reset to best</button>
          : <button onClick={onEquip} className="rounded-lg bg-accent px-4 py-1.5 font-bold text-accent-ink">Equip</button>)}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-faint">{label}</div>
      <div className="truncate text-xs font-semibold">{value}</div>
    </div>
  );
}
