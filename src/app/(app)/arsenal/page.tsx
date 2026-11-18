"use client";
import { Hammer, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, CardHeader, Input, Label, Modal, Money, PageHeader, Pill, Progress, Segmented, Select, Textarea, cn, fmtNum, fmtPct } from "@/components/ui";
import { RARITIES, badges, weaponStats } from "@/core/game";
import { GEAR_TIERS, tierRequirement } from "@/core/gear";
import { GearIcon } from "@/components/gear-icon";
import type { AssetClass, Setup, WeaponClass } from "@/core/types";
import { LESSONS } from "@/core/academy";
import { useJournal } from "@/lib/hooks";
import { useStore } from "@/lib/store";

const ICONS = ["🗡️", "🏹", "🔱", "⚡", "🛡️", "💣", "🪓", "🔫", "🎯", "🪃", "⚔️", "🐉", "🌊", "🔥", "❄️", "🧲"];
const CLASSES: WeaponClass[] = ["Breakout", "Reversal", "Trend", "Scalp", "Range", "News"];
const MARKETS: AssetClass[] = ["crypto", "forex", "futures", "equities", "options"];
const MAX_EQUIPPED = 4;

export default function ArsenalPage() {
  const { trades, setups, me } = useJournal();
  const saveSetup = useStore((s) => s.saveSetup);
  const [editing, setEditing] = useState<Setup | "new" | null>(null);
  const [filter, setFilter] = useState<"all" | "equipped">("all");
  const weapons = useMemo(
    () => setups.map((s) => ({ setup: s, w: weaponStats(s, trades) })).sort((a, b) => b.w.rarityIndex - a.w.rarityIndex || b.w.summary.netPnl - a.w.summary.netPnl),
    [setups, trades],
  );
  const shown = filter === "equipped" ? weapons.filter((x) => x.setup.equipped) : weapons;
  const equippedCount = setups.filter((s) => s.equipped).length;
  const trophies = badges(trades, setups, { testTaken: !!me?.traderProfile, lessonsDone: me?.lessonsDone?.length ?? 0, freeLessons: LESSONS.filter((l) => l.tier === "free").length });

  function toggleEquip(s: Setup) {
    if (!s.equipped && equippedCount >= MAX_EQUIPPED) return;
    saveSetup({ ...s, equipped: !s.equipped });
  }

  return (
    <div>
      <PageHeader
        title="Arsenal"
        subtitle="Your setups are weapons. Prove them with trades and they level up from Common to Legendary."
        right={
          <>
            <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: `All (${setups.length})` }, { value: "equipped", label: `Loadout ${equippedCount}/${MAX_EQUIPPED}` }]} />
            <Button onClick={() => setEditing("new")}><Hammer size={15} /> Forge weapon</Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        Rarity is earned, not chosen:
        {RARITIES.map((r, i) => (
          <span key={r.name} className="flex items-center gap-1.5" title={tierRequirement(GEAR_TIERS[i])}>
            <span className="h-2 w-2 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
            <span style={{ color: r.color }} className="font-semibold">{r.name}</span>
          </span>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map(({ setup, w }) => (
          <div key={setup.id} className="weapon-card card group flex flex-col p-5 transition hover:-translate-y-0.5" style={{ ["--glow" as string]: w.rarity.glow, borderColor: `${w.rarity.color}40` }}>
            <div className="relative flex items-start gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl" style={{ background: `linear-gradient(145deg, ${w.rarity.glow}, transparent)`, boxShadow: `inset 0 0 0 1px ${w.rarity.color}66, 0 0 24px -6px ${w.rarity.color}` }}>
                <GearIcon tier={w.tier} index={w.rarityIndex} size={58} />
                <span className="absolute -bottom-1 -right-1 rounded-md bg-surface-2 px-1 text-base leading-tight">{setup.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: w.rarity.color }}>{w.rarity.name} · {setup.weaponClass}</div>
                <div className="mt-0.5 font-display text-lg font-bold leading-tight">{setup.name}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                  <span className="num whitespace-nowrap font-bold text-ink">LV {w.level}</span>
                  <Progress value={(w.xp % 150) / 150} color={w.rarity.color} className="w-16 shrink-0" height={4} />
                  <span className="num whitespace-nowrap">{w.xp} XP</span>
                </div>
              </div>
              {setup.equipped && <span title="Equipped" className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_#c8f53b]" />}
            </div>

            <div className="relative mt-5 space-y-2">
              {([["Power", w.power, "Profit factor"], ["Accuracy", w.accuracy, "Win rate"], ["Control", w.control, "Drawdown control"], ["Handling", w.handling, "Rule discipline"]] as const).map(([k, v, tip]) => (
                <div key={k} className="flex items-center gap-3 text-[11px]" title={tip}>
                  <span className="w-16 font-semibold uppercase tracking-wider text-muted">{k}</span>
                  <div className="flex flex-1 gap-[3px]">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-2 flex-1 rounded-[2px]" style={{ background: i < Math.round(v / 10) ? w.rarity.color : "#18202b", opacity: i < Math.round(v / 10) ? 0.4 + (i / 10) * 0.6 : 1 }} />
                    ))}
                  </div>
                  <span className="num w-7 text-right text-muted">{v}</span>
                </div>
              ))}
            </div>

            <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
              <div><div className="text-[10px] uppercase tracking-wider text-faint">Net</div><Money usd={w.summary.netPnl} sign compact className="text-sm font-semibold" /></div>
              <div><div className="text-[10px] uppercase tracking-wider text-faint">PF</div><div className="num text-sm font-semibold">{fmtNum(w.summary.profitFactor)}</div></div>
              <div><div className="text-[10px] uppercase tracking-wider text-faint">Trades</div><div className="num text-sm font-semibold">{w.summary.count}</div></div>
            </div>

            <div className="relative mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(setup)}>Playbook</Button>
              <Button variant={setup.equipped ? "ghost" : "primary"} size="sm" className="flex-1" disabled={!setup.equipped && equippedCount >= MAX_EQUIPPED} onClick={() => toggleEquip(setup)}>
                {setup.equipped ? "Unequip" : equippedCount >= MAX_EQUIPPED ? "Loadout full" : "Equip"}
              </Button>
            </div>
          </div>
        ))}
        <button onClick={() => setEditing("new")} className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-line-strong text-muted transition hover:border-accent/50 hover:text-accent">
          <Plus size={32} />
          <div className="mt-2 font-display font-semibold">Forge a new weapon</div>
          <div className="mt-1 text-xs">Turn a setup into a repeatable playbook</div>
        </button>
      </div>

      <Card className="mt-6">
        <CardHeader title="Trophy room" subtitle={`${trophies.filter((b) => b.unlocked).length}/${trophies.length} badges unlocked`} />
        <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3 lg:grid-cols-5">
          {trophies.map((b) => (
            <div key={b.id} className={cn("rounded-xl border p-3 text-center", b.unlocked ? "border-gold/30 bg-gold/5" : "border-line opacity-45 grayscale")}>
              <div className="text-3xl">{b.icon}</div>
              <div className="mt-1.5 text-sm font-semibold">{b.name}</div>
              <div className="mt-0.5 text-[11px] text-muted">{b.description}</div>
            </div>
          ))}
        </div>
      </Card>

      {editing && <PlaybookEditor setup={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PlaybookEditor({ setup, onClose }: { setup: Setup | null; onClose: () => void }) {
  const { trades } = useJournal();
  const saveSetup = useStore((s) => s.saveSetup);
  const deleteSetup = useStore((s) => s.deleteSetup);
  const [d, setD] = useState<Omit<Setup, "userId" | "createdAt" | "id"> & { id?: string }>(
    setup ?? { name: "", icon: "🗡️", weaponClass: "Breakout", description: "", timeframe: "5m", markets: ["crypto"], rules: ["Higher timeframe bias aligned", "Clear invalidation level", "Risk ≤ 1% of account"], entryTrigger: "", exitPlan: "", invalidation: "", equipped: false },
  );
  const [newRule, setNewRule] = useState("");
  const w = setup ? weaponStats(setup, trades) : null;
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD({ ...d, [k]: v });

  return (
    <Modal open onClose={onClose} wide title={setup ? `${setup.icon} ${setup.name} · Playbook` : "Forge a new weapon"}>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div>
              <Label>Icon</Label>
              <Select value={d.icon} onChange={(e) => set("icon", e.target.value)} className="w-20 text-xl">{ICONS.map((i) => <option key={i}>{i}</option>)}</Select>
            </div>
            <div>
              <Label>Weapon name</Label>
              <Input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. London Open Sweep" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Class</Label>
              <Select value={d.weaponClass} onChange={(e) => set("weaponClass", e.target.value as WeaponClass)}>{CLASSES.map((c) => <option key={c}>{c}</option>)}</Select>
            </div>
            <div>
              <Label>Timeframe</Label>
              <Input value={d.timeframe} onChange={(e) => set("timeframe", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Markets</Label>
            <div className="flex flex-wrap gap-1.5">
              {MARKETS.map((m) => (
                <button key={m} type="button" onClick={() => set("markets", d.markets.includes(m) ? d.markets.filter((x) => x !== m) : [...d.markets, m])} className={cn("cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize", d.markets.includes(m) ? "border-accent/50 bg-accent/10 text-accent" : "border-line text-muted")}>{m}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Thesis</Label>
            <Textarea rows={2} value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="Why does this edge exist?" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label>Entry trigger</Label><Textarea rows={3} value={d.entryTrigger} onChange={(e) => set("entryTrigger", e.target.value)} /></div>
            <div><Label>Exit plan</Label><Textarea rows={3} value={d.exitPlan} onChange={(e) => set("exitPlan", e.target.value)} /></div>
            <div><Label>Invalidation</Label><Textarea rows={3} value={d.invalidation} onChange={(e) => set("invalidation", e.target.value)} /></div>
          </div>
          <div>
            <Label hint="checked on every trade">Pre-trade checklist</Label>
            <div className="space-y-1.5">
              {d.rules.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                  <span className="text-accent">✓</span>
                  <span className="flex-1">{r}</span>
                  <button onClick={() => set("rules", d.rules.filter((_, j) => j !== i))} className="cursor-pointer text-faint hover:text-loss" aria-label="Remove rule"><X size={14} /></button>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); if (newRule.trim()) { set("rules", [...d.rules, newRule.trim()]); setNewRule(""); } }} className="flex gap-2">
                <Input value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="Add a rule…" />
                <Button type="submit" variant="outline">Add</Button>
              </form>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {w ? (
            <Card className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: w.rarity.color }}>{w.rarity.name} · Level {w.level}</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-[10px] uppercase text-faint">Net P&L</div><Money usd={w.summary.netPnl} sign className="font-semibold" /></div>
                <div><div className="text-[10px] uppercase text-faint">Win rate</div><div className="num font-semibold">{fmtPct(w.summary.winRate, 0)}</div></div>
                <div><div className="text-[10px] uppercase text-faint">Profit factor</div><div className="num font-semibold">{fmtNum(w.summary.profitFactor)}</div></div>
                <div><div className="text-[10px] uppercase text-faint">Expectancy</div><Money usd={w.summary.expectancy} sign className="font-semibold" /></div>
                <div><div className="text-[10px] uppercase text-faint">Avg R</div><div className="num font-semibold">{w.summary.avgR.toFixed(2)}R</div></div>
                <div><div className="text-[10px] uppercase text-faint">Discipline</div><div className="num font-semibold">{fmtPct(w.summary.disciplineRate, 0)}</div></div>
              </div>
              <div className="mt-4 text-xs text-muted">
                {w.nextTier ? <>Next tier: <b style={{ color: w.nextTier.color }}>{w.nextTier.name}</b> needs {tierRequirement(w.nextTier)}.</> : "Maxed. This is a God-tier weapon."}
              </div>
            </Card>
          ) : (
            <Card className="p-5 text-sm text-muted">
              <div className="text-3xl">⚒️</div>
              <div className="mt-2 font-semibold text-ink">New weapons start Common.</div>
              Tag trades with this setup and it levels up as you prove the edge. Rarity is earned from real stats, so it can&apos;t be faked.
            </Card>
          )}
          <div className="flex gap-2">
            {setup && <Button variant="danger" onClick={() => { deleteSetup(setup.id); onClose(); }}><Trash2 size={14} /></Button>}
            <Button className="flex-1" disabled={!d.name.trim()} onClick={() => { saveSetup(d); onClose(); }}>{setup ? "Save playbook" : "Forge weapon"}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
