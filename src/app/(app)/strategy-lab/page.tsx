"use client";
import { ArrowRight, BookmarkPlus, Check, FlaskConical, Plus, Sparkles, Store, Swords, Trash2, Wand2 } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { SimpleEquity } from "@/components/charts";
import { Button, Card, CardHeader, Input, Label, Modal, PageHeader, Pill, Segmented, Select, Textarea, cn, fmtNum } from "@/components/ui";
import { GoldChip, GradeBadge } from "@/components/shop/gold";
import { syntheticSeries } from "@/core/market";
import { KIND_META, creatorPayout } from "@/core/shop";
import { ALL_MARKETS, GRADE_COLORS, INDICATORS, OPS, auditStrategy, explainSpec, sanitizeSpec, type Condition, type Grade, type Operand, type StrategySpec } from "@/core/strategy";
import { CLASS_TEMPLATE, TEMPLATES, critique, remoteStrategyAI, specToSetupRules, type TraderContext } from "@/core/strategy-ai";
import type { GearTierId } from "@/core/gear";
import type { AssetClass, WeaponClass } from "@/core/types";
import { useJournal } from "@/lib/hooks";
import { useMarket } from "@/lib/market-store";
import { useStore } from "@/lib/store";

const MARKET_LABEL: Record<AssetClass, string> = { crypto: "🪙 Crypto", forex: "💱 Forex", futures: "🛢️ Futures", equities: "🏛️ Stocks", options: "🎟️ Options" };
const CLASSES: WeaponClass[] = ["Breakout", "Reversal", "Trend", "Scalp", "Range", "News"];
const ai = remoteStrategyAI();

const GRADE_RARITY: Record<Grade, GearTierId> = { "S++": "god", "S+": "legendary", S: "mythical", A: "rare", B: "uncommon", C: "common", D: "basic", F: "basic" };

export default function StrategyLabPage() {
  const { me, summary, setups, trades } = useJournal();
  const strategies = useMarket((s) => s.strategies);
  const mine = strategies.filter((s) => s.userId === me?.id);
  const starter = TEMPLATES.find((t) => t.id === (me?.jobClass ? CLASS_TEMPLATE[me.jobClass] : "trend-pullback"))!;
  const [spec, setSpec] = useState<StrategySpec>(() => ({ ...structuredClone(starter.spec), id: "draft" }));
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<{ source: string; lines: string[] } | null>(null);
  const [seed, setSeed] = useState(1);
  const [focus, setFocus] = useState<AssetClass | null>(null);
  const [toast, setToast] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);

  const ctx: TraderContext = useMemo(() => {
    const bySetup = setups.map((s) => ({ s, n: trades.filter((t) => t.setupId === s.id), pnl: trades.filter((t) => t.setupId === s.id).reduce((a, t) => a + t.pnl, 0) })).sort((a, b) => b.pnl - a.pnl);
    const mistakes = new Map<string, number>();
    for (const t of trades) for (const m of t.mistakes) mistakes.set(m, (mistakes.get(m) ?? 0) + Math.abs(Math.min(0, t.pnl)));
    const topMistake = [...mistakes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const markets = [...new Set(trades.map((t) => t.assetClass))];
    return { jobClass: me?.jobClass, winRate: summary.winRate, profitFactor: summary.profitFactor, bestSetup: bySetup[0]?.s.name, topMistake, markets };
  }, [me?.jobClass, setups, trades, summary.winRate, summary.profitFactor]);

  const deferred = useDeferredValue(spec);
  const focusMarket = focus ?? deferred.markets[0] ?? "crypto";
  const rob = useMemo(() => auditStrategy(deferred, (a) => syntheticSeries(a, 2000, seed), focusMarket), [deferred, seed, focusMarket]);
  const advice = useMemo(() => critique(deferred, rob), [deferred, rob]);
  const main = rob.perAsset.find((r) => r.asset === focusMarket)!;
  const stale = deferred !== spec;

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2600);
  };
  const patch = (p: Partial<StrategySpec>) => setSpec((s) => sanitizeSpec({ ...s, ...p }, s.id));

  async function draft(text = prompt) {
    if (!text.trim()) return;
    setBusy(true);
    const res = await ai.draft(text, ctx);
    setSpec({ ...res.spec, id: spec.id });
    setNotes({ source: res.source === "claude" ? "Claude" : "Offline AI", lines: res.notes });
    setFocus(null);
    setBusy(false);
  }

  function save() {
    const saved = useMarket.getState().saveStrategy({ ...spec, grade: rob.grade, score: rob.score });
    setSpec((s) => ({ ...s, id: saved.id }));
    flash("Saved to your Lab");
  }

  function equip() {
    const { rules, weaponClass } = specToSetupRules(spec);
    useStore.getState().saveSetup({ name: spec.name, icon: spec.icon, weaponClass, description: spec.description || explainSpec(spec), timeframe: spec.timeframe, markets: spec.markets, rules, entryTrigger: rules[0] ?? "", exitPlan: spec.targetR ? `${spec.targetR}R target` : "Signal exit", invalidation: `Stop ${spec.stop.value}${spec.stop.type === "atr" ? "× ATR" : "%"}`, equipped: true });
    flash("Equipped in your Arsenal as a new weapon");
  }

  return (
    <div>
      <PageHeader
        title="AI Strategy Lab"
        subtitle="Describe an idea, let the AI build the rules, then stress-test it until it earns an S++ grade."
        right={<><GoldChip className="sm:hidden" /><Pill tone="violet"><Sparkles size={12} /> Claude-ready</Pill></>}
      />

      {/* AI prompt */}
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_0%_0%,rgba(167,139,250,.12),transparent_70%)]" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-semibold"><Wand2 size={16} className="text-violet" /> Describe your strategy</div>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row">
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} placeholder="e.g. Buy BTC pullbacks when RSI(3) is under 20 above the 200 SMA, 2 ATR stop, 3R target" className="min-h-[64px] flex-1" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) draft(); }} />
            <Button size="lg" onClick={() => draft()} disabled={busy || !prompt.trim()} className="lg:h-auto lg:w-48">{busy ? "Forging…" : <><Sparkles size={16} /> Build with AI</>}</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => { setPrompt(t.prompt); setSpec({ ...structuredClone(t.spec), id: spec.id }); setNotes(null); setFocus(null); }} className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition", me?.jobClass && CLASS_TEMPLATE[me.jobClass] === t.id ? "border-gold/50 text-gold" : "border-line text-muted hover:border-line-strong hover:text-ink")}>
                {t.spec.icon} {t.label}{me?.jobClass && CLASS_TEMPLATE[me.jobClass] === t.id ? " · your class" : ""}
              </button>
            ))}
          </div>
          {notes && (
            <div className="mt-4 rounded-xl border border-violet/30 bg-violet/5 p-3">
              <div className="text-[11px] font-bold uppercase tracking-[.08em] text-violet">{notes.source} notes for you</div>
              <ul className="mt-1.5 space-y-1 text-sm text-muted">{notes.lines.map((l, i) => <li key={i}>• {l}</li>)}</ul>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Builder */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="grid grid-cols-[56px_1fr] gap-3">
              <div><Label>Icon</Label><Input value={spec.icon} onChange={(e) => patch({ icon: e.target.value.slice(0, 4) })} className="text-center text-lg" aria-label="Icon" /></div>
              <div><Label>Name</Label><Input value={spec.name} onChange={(e) => patch({ name: e.target.value })} /></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div><Label>Direction</Label><Segmented value={spec.side} onChange={(side) => patch({ side })} options={[{ value: "long", label: "Long" }, { value: "short", label: "Short" }]} className="w-full [&>button]:flex-1" /></div>
              <div><Label>Weapon class</Label><Select value={spec.weaponClass} onChange={(e) => patch({ weaponClass: e.target.value as WeaponClass })}>{CLASSES.map((c) => <option key={c}>{c}</option>)}</Select></div>
              <div className="col-span-2 sm:col-span-1"><Label>Timeframe</Label><Select value={spec.timeframe} onChange={(e) => patch({ timeframe: e.target.value })}>{["1m", "5m", "15m", "1H", "4H", "1D", "1W"].map((t) => <option key={t}>{t}</option>)}</Select></div>
            </div>
          </Card>

          <RuleBlock title="Entry" hint="All must be true" tone="profit" conds={spec.entry} onChange={(entry) => patch({ entry })} />
          <RuleBlock title="Exit" hint="Any one exits" tone="loss" conds={spec.exit} onChange={(exit) => patch({ exit })} />

          <Card className="p-5">
            <div className="text-[13px] font-semibold">Risk & management</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label>Stop</Label>
                <div className="flex gap-1.5">
                  <Input type="number" step="0.1" value={spec.stop.value} onChange={(e) => patch({ stop: { ...spec.stop, value: +e.target.value } })} aria-label="Stop distance" />
                  <Select value={spec.stop.type} onChange={(e) => patch({ stop: { ...spec.stop, type: e.target.value as "atr" | "pct" } })} className="!w-20 shrink-0 px-2" aria-label="Stop type"><option value="atr">ATR</option><option value="pct">%</option></Select>
                </div>
              </div>
              <div><Label>Target (R)</Label><Input type="number" step="0.5" value={spec.targetR} onChange={(e) => patch({ targetR: +e.target.value })} /></div>
              <div><Label>Time stop, bars</Label><Input type="number" value={spec.maxBars} onChange={(e) => patch({ maxBars: +e.target.value })} /></div>
              <div><Label>Risk %</Label><Input type="number" step="0.25" value={spec.riskPct} onChange={(e) => patch({ riskPct: +e.target.value })} /></div>
            </div>
            <p className="mt-2 text-[11px] text-faint">Set target or time stop to 0 to turn it off.</p>
            <div className="mt-3"><Label>Markets</Label></div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MARKETS.map((m) => {
                const on = spec.markets.includes(m);
                return <button key={m} onClick={() => patch({ markets: on ? spec.markets.filter((x) => x !== m) : [...spec.markets, m] })} className={cn("cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold", on ? "border-accent/50 bg-accent/10 text-ink" : "border-line text-muted")}>{MARKET_LABEL[m]}</button>;
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">In plain English</div>
            <p className="mt-1.5 text-sm leading-relaxed">{explainSpec(spec)}</p>
          </Card>
        </div>

        {/* Results */}
        <div className={cn("space-y-4 transition-opacity", stale && "opacity-60")}>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-5">
              <GradeBadge grade={rob.grade} score={rob.score} />
              <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                <Metric label="Net" value={`${main.netPct >= 0 ? "+" : ""}${main.netPct.toFixed(1)}%`} tone={main.netPct >= 0 ? "profit" : "loss"} />
                <Metric label="Win rate" value={`${Math.round(main.winRate * 100)}%`} />
                <Metric label="Profit factor" value={fmtNum(main.profitFactor)} tone={main.profitFactor >= 1 ? "profit" : "loss"} />
                <Metric label="Expectancy" value={`${main.expectancyR.toFixed(2)}R`} />
                <Metric label="Max DD" value={`${main.maxDdPct.toFixed(1)}%`} tone="loss" />
                <Metric label="Trades" value={String(main.trades.length)} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {rob.perAsset.map((r) => (
                  <button key={r.asset} onClick={() => setFocus(r.asset)} className={cn("cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold", r.asset === focusMarket ? "border-accent/60 bg-accent/10" : "border-line text-muted")}>
                    {MARKET_LABEL[r.asset]} <span className={cn("num", r.profitFactor >= 1.1 ? "text-profit" : "text-loss")}>{fmtNum(r.profitFactor, 1)}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted">Scenario {[1, 2, 3].map((n) => <button key={n} onClick={() => setSeed(n)} className={cn("num h-6 w-6 cursor-pointer rounded border", seed === n ? "border-accent/60 text-accent" : "border-line")}>{n}</button>)}</div>
            </div>
            <div className="mt-3"><SimpleEquity data={main.equity} height={200} color={GRADE_COLORS[rob.grade]} /></div>
          </Card>

          <Card>
            <CardHeader title="AI critic" icon={<Sparkles size={15} className="text-violet" />} subtitle="Fixes ranked by impact. One click applies them." />
            <div className="space-y-2 px-5 pb-5">
              {advice.map((s) => (
                <div key={s.id} className={cn("rounded-xl border p-3", s.tone === "good" ? "border-profit/30 bg-profit/5" : s.tone === "bad" ? "border-loss/30 bg-loss/5" : "border-gold/30 bg-gold/5")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{s.title}</div>
                      <div className="mt-0.5 text-xs text-muted">{s.body}</div>
                    </div>
                    {s.patch && <Button size="sm" variant="outline" className="shrink-0" onClick={() => patch(s.patch!)}><Wand2 size={13} /> {s.fixLabel}</Button>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Robustness audit" icon={<FlaskConical size={15} className="text-cyan" />} subtitle="Six checks that separate a real edge from a lucky curve" />
            <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
              {rob.checks.map((c) => (
                <div key={c.id} className="rounded-xl border border-line bg-surface-2 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-1.5">{c.pass ? <Check size={14} className="text-profit" /> : <span className="text-loss">✕</span>} {c.label}</span>
                    <span className="num text-xs text-muted">{Math.round(c.score)}/{c.max}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${(c.score / c.max) * 100}%`, background: c.pass ? "var(--profit)" : "#f59e0b" }} /></div>
                  <div className="mt-1.5 text-[11px] leading-snug text-muted">{c.detail}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap gap-2">
              <Button onClick={save}><BookmarkPlus size={15} /> Save to Lab</Button>
              <Button variant="outline" onClick={equip}><Swords size={15} /> Equip in Arsenal</Button>
              <Button variant="outline" onClick={() => setPublishOpen(true)} disabled={!spec.entry.length}><Store size={15} /> Publish to Hero Shop</Button>
            </div>
            <p className="mt-3 text-[11px] text-faint">Simulated on regime-switching data with next-bar fills, 5 bps fees and 3 bps slippage. Live build runs the same engine on real exchange and Databento history. Past performance never guarantees future results.</p>
          </Card>
        </div>
      </div>

      {/* Saved */}
      <Card className="mt-4">
        <CardHeader title="Your Lab" subtitle={`${mine.length} saved ${mine.length === 1 ? "strategy" : "strategies"}`} right={<Link href="/shop?tab=strategy" className="flex items-center gap-1 text-xs font-semibold text-accent">Browse Lab Research <ArrowRight size={13} /></Link>} />
        {mine.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-muted">Save a strategy to keep it here, or buy one from Lab Research in the Hero Shop.</div>
        ) : (
          <div className="grid gap-2 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((s) => (
              <div key={s.id} className={cn("flex items-center gap-3 rounded-xl border p-3", s.id === spec.id ? "border-accent/50" : "border-line")}>
                <div className="text-2xl">{s.icon}</div>
                <button onClick={() => { setSpec(sanitizeSpec(s, s.id)); setFocus(null); setNotes(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="min-w-0 flex-1 cursor-pointer text-left">
                  <div className="truncate text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted">{s.weaponClass} · {s.timeframe}{s.listingId ? " · listed" : ""}{s.fromListing ? " · bought" : ""}</div>
                </button>
                {s.grade && <span className="font-display text-sm font-black" style={{ color: GRADE_COLORS[s.grade] }}>{s.grade}</span>}
                <button onClick={() => useMarket.getState().deleteStrategy(s.id)} className="cursor-pointer rounded p-1 text-faint hover:text-loss" aria-label={`Delete ${s.name}`}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} spec={spec} grade={rob.grade} score={rob.score} onDone={(id) => { setSpec((s) => ({ ...s, id })); flash("Listed in the Hero Shop under Lab Research"); }} />

      {toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-accent/40 bg-surface px-4 py-2.5 text-sm font-semibold shadow-2xl lg:bottom-8">✨ {toast}</div>}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-muted">{label}</div>
      <div className={cn("num text-lg font-semibold", tone === "profit" && "text-profit", tone === "loss" && "text-loss")}>{value}</div>
    </div>
  );
}

function OperandEdit({ o, onChange, label }: { o: Operand; onChange: (o: Operand) => void; label: string }) {
  const def = INDICATORS.find((i) => i.id === o.ind)!;
  return (
    <div className="flex min-w-0 gap-1">
      <Select value={o.ind} onChange={(e) => { const ind = e.target.value as Operand["ind"]; const d = INDICATORS.find((i) => i.id === ind)!; onChange(ind === "value" ? { ind, value: 50 } : d.hasLen ? { ind, len: d.defaultLen } : { ind }); }} className="h-9 min-w-0 flex-1 px-2 text-xs" aria-label={label}>
        {INDICATORS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
      </Select>
      {def.hasLen && <Input type="number" value={o.len ?? ""} onChange={(e) => onChange({ ...o, len: +e.target.value })} className="h-9 !w-16 shrink-0 px-2 text-xs" aria-label={`${label} length`} />}
      {o.ind === "value" && <Input type="number" value={o.value ?? 0} onChange={(e) => onChange({ ...o, value: +e.target.value })} className="h-9 !w-16 shrink-0 px-2 text-xs" aria-label={`${label} value`} />}
    </div>
  );
}

function RuleBlock({ title, hint, tone, conds, onChange }: { title: string; hint: string; tone: "profit" | "loss"; conds: Condition[]; onChange: (c: Condition[]) => void }) {
  const set = (i: number, c: Condition) => onChange(conds.map((x, j) => (j === i ? c : x)));
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-semibold"><span className={tone === "profit" ? "text-profit" : "text-loss"}>●</span> {title} <span className="text-[11px] font-normal text-faint">{hint}</span></div>
        <Button size="sm" variant="ghost" onClick={() => onChange([...conds, { left: { ind: "price" }, op: "above", right: { ind: "sma", len: 50 } }])} disabled={conds.length >= 5}><Plus size={13} /> Add</Button>
      </div>
      <div className="mt-3 space-y-2">
        {conds.length === 0 && <div className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-faint">{title === "Exit" ? "No signal exit. The stop, target or time stop closes the trade." : "No rules yet."}</div>}
        {conds.map((c, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-line bg-surface-2 p-2">
            <OperandEdit o={c.left} onChange={(left) => set(i, { ...c, left })} label={`${title} ${i + 1} left`} />
            <Select value={c.op} onChange={(e) => set(i, { ...c, op: e.target.value as Condition["op"] })} className="h-9 px-2 text-xs" aria-label={`${title} ${i + 1} operator`}>
              {OPS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
            <button onClick={() => onChange(conds.filter((_, j) => j !== i))} className="row-span-2 cursor-pointer self-center rounded p-1.5 text-faint hover:text-loss" aria-label={`Remove ${title.toLowerCase()} rule ${i + 1}`}><Trash2 size={14} /></button>
            <div className="col-span-2"><OperandEdit o={c.right} onChange={(right) => set(i, { ...c, right })} label={`${title} ${i + 1} right`} /></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PublishModal({ open, onClose, spec, grade, score, onDone }: { open: boolean; onClose: () => void; spec: StrategySpec; grade: Grade; score: number; onDone: (strategyId: string) => void }) {
  const { me } = useJournal();
  const [tagline, setTagline] = useState("");
  const [gold, setGold] = useState(1500);
  const [usd, setUsd] = useState(12);
  const [mode, setMode] = useState<"both" | "gold" | "usd" | "free">("both");
  if (!me) return null;
  const priceGold = mode === "both" || mode === "gold" ? gold : 0;
  const priceUsd = mode === "both" || mode === "usd" ? usd : 0;

  function publish() {
    const saved = useMarket.getState().saveStrategy({ ...spec, grade, score });
    useMarket.getState().publish({
      kind: "strategy", title: spec.name, icon: spec.icon, tagline: tagline || spec.description || `${spec.weaponClass} system on ${spec.timeframe}`, description: explainSpec(spec),
      sellerId: me!.id, sellerName: me!.name, sellerAvatar: me!.avatar, rarity: GRADE_RARITY[grade], priceGold, priceUsd, tags: [spec.weaponClass.toLowerCase(), spec.side, spec.timeframe], markets: spec.markets,
      verified: { grade }, payload: { spec: { ...spec, id: saved.id } },
    }, saved.id);
    onDone(saved.id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={<span className="flex items-center gap-2"><Store size={16} /> Publish to Hero Shop</span>}>
      <div className="flex items-center gap-4">
        <GradeBadge grade={grade} score={score} size={72} />
        <div>
          <div className="font-display text-lg font-semibold">{spec.icon} {spec.name}</div>
          <div className="text-xs text-muted">{KIND_META.strategy.label} · lists with a verified {grade} backtest grade. Buyers can re-run it in their own Lab.</div>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div><Label>Tagline</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One line that sells it" /></div>
        <div><Label>Price</Label><Segmented value={mode} onChange={setMode} options={[{ value: "both", label: "Gold + USD" }, { value: "gold", label: "Gold only" }, { value: "usd", label: "USD only" }, { value: "free", label: "Free" }]} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label hint="earned in-game">Gold</Label><Input type="number" value={gold} disabled={mode === "usd" || mode === "free"} onChange={(e) => setGold(Math.max(0, +e.target.value))} /></div>
          <div><Label hint="card or crypto">USD</Label><Input type="number" value={usd} disabled={mode === "gold" || mode === "free"} onChange={(e) => setUsd(Math.max(0, +e.target.value))} /></div>
        </div>
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs text-muted">
          You keep <b className="text-ink">85%</b> of each sale: {priceGold ? <b className="text-gold">{creatorPayout({ priceGold, priceUsd } as never, "gold").toLocaleString()} Gold</b> : null}{priceGold && priceUsd ? " or " : ""}{priceUsd ? <b className="text-profit">${creatorPayout({ priceGold, priceUsd } as never, "usd")}</b> : null}{!priceGold && !priceUsd ? "free listings earn reputation and followers" : " per sale"}. USD payouts go to your bank or wallet every Friday (Stripe Connect or USDC).
        </div>
        <Button className="w-full" size="lg" onClick={publish}><Store size={16} /> List it</Button>
      </div>
    </Modal>
  );
}
