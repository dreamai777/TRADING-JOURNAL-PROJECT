"use client";
import { ArrowLeft, Plus, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FindingCard, GradeBadge, ScoreRing } from "@/components/ai/report-view";
import { Button, Card, CardHeader, Input, Label, PageHeader, Select, Textarea, cn } from "@/components/ui";
import { AGENT_COLORS, AGENT_ICONS, AGENT_TEMPLATES, FOCUS_LABEL, RULE_META, TONE_META, customAgentReport, type AgentRule, type CoachTone, type CustomAgent, type Focus, type RuleKind } from "@/core/ai/custom";
import { useAi, useCouncil } from "@/lib/ai";

type Draft = Omit<CustomAgent, "id" | "userId" | "createdAt">;
const BLANK: Draft = { name: "", icon: "🤖", color: "#c8f53b", tone: "mentor", focus: ["discipline"], rules: [], instructions: "" };

export default function BuildAgentPage() {
  const params = useSearchParams();
  const editId = params.get("edit");
  const router = useRouter();
  const { me, trades, setups, account, customAgents } = useCouncil();
  const save = useAi((s) => s.saveCustomAgent);
  const existing = customAgents.find((a) => a.id === editId);
  const [d, setD] = useState<Draft>(() => (existing ? { ...existing } : BLANK));
  const [addKind, setAddKind] = useState<RuleKind>("max-trades-day");
  const preview = useMemo(() => customAgentReport({ ...d, id: "preview", userId: me?.id ?? "", createdAt: "" }, trades, setups, account), [d, me?.id, trades, setups, account]);
  if (!me) return null;

  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const setRule = (i: number, p: Partial<AgentRule>) => set({ rules: d.rules.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const toggleFocus = (f: Focus) => set({ focus: d.focus.includes(f) ? d.focus.filter((x) => x !== f) : [...d.focus, f] });

  function submit() {
    const id = save({ ...d, id: existing?.id, name: d.name.trim() || "My Agent", userId: me!.id });
    router.push(`/coach/${id}`);
  }

  return (
    <div>
      <Link href="/coach" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"><ArrowLeft size={13} /> AI Council</Link>
      <PageHeader title={existing ? `Edit ${existing.name}` : "Forge a custom agent"} subtitle="Your rules, your voice. It grades every trade against them and answers like the coach you want." />

      {!existing && (
        <div className="mb-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-muted">Start from a template</div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {AGENT_TEMPLATES.map((t) => (
              <button key={t.name} onClick={() => setD({ ...t, rules: t.rules.map((r) => ({ ...r })) })} className={cn("card flex cursor-pointer items-start gap-3 p-3 text-left transition hover:border-line-strong", d.name === t.name && "border-accent/50")}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl" style={{ background: `${t.color}18` }}>{t.icon}</span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{t.name}</span><span className="line-clamp-2 text-[11.5px] text-muted">{t.instructions}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div><Label>Name</Label><Input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Prop Firm Guardian" maxLength={40} /></div>
              <div>
                <Label>Color</Label>
                <div className="flex h-10 items-center gap-1.5">{AGENT_COLORS.map((c) => <button key={c} onClick={() => set({ color: c })} aria-label={`Color ${c}`} className={cn("h-7 w-7 cursor-pointer rounded-full transition", d.color === c && "ring-2 ring-white ring-offset-2 ring-offset-surface")} style={{ background: c }} />)}</div>
              </div>
            </div>
            <div className="mt-4"><Label>Icon</Label><div className="flex flex-wrap gap-1.5">{AGENT_ICONS.map((i) => <button key={i} onClick={() => set({ icon: i })} className={cn("flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border text-xl transition", d.icon === i ? "border-accent/60 bg-accent/10" : "border-line bg-surface-2 hover:border-line-strong")}>{i}</button>)}</div></div>
          </Card>

          <Card className="p-5">
            <Label>Voice</Label>
            <div className="grid gap-2 sm:grid-cols-4">
              {(Object.keys(TONE_META) as CoachTone[]).map((t) => (
                <button key={t} onClick={() => set({ tone: t })} className={cn("cursor-pointer rounded-lg border px-3 py-2.5 text-left transition", d.tone === t ? "border-accent/60 bg-accent/10" : "border-line bg-surface-2 hover:border-line-strong")}>
                  <div className="text-sm font-semibold">{TONE_META[t].label}</div><div className="text-[11px] text-muted">{TONE_META[t].blurb}</div>
                </button>
              ))}
            </div>
            <div className="mt-4"><Label hint="Pick in priority order">Focus</Label>
              <div className="flex flex-wrap gap-1.5">{(Object.keys(FOCUS_LABEL) as Focus[]).map((f) => <button key={f} onClick={() => toggleFocus(f)} className={cn("cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition", d.focus.includes(f) ? "border-violet/60 bg-violet/15 text-ink" : "border-line bg-surface-2 text-muted hover:text-ink")}>{d.focus.includes(f) && <span className="num mr-1 text-violet">{d.focus.indexOf(f) + 1}</span>}{FOCUS_LABEL[f]}</button>)}</div>
            </div>
            <div className="mt-4"><Label hint="Sent to Claude as-is">Instructions</Label><Textarea rows={3} value={d.instructions} onChange={(e) => set({ instructions: e.target.value })} maxLength={600} placeholder="e.g. I'm in a funded challenge. Warn me before I break the daily loss limit. Keep it short." /></div>
          </Card>

          <Card>
            <CardHeader title="Hard rules" subtitle="Checked against every trade. Breaking one costs score and shows what it cost you in dollars." />
            <div className="space-y-2 px-5 pb-5">
              {d.rules.map((r, i) => {
                const meta = RULE_META[r.kind];
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
                    <span className="min-w-0 flex-1 text-sm font-medium">{meta.label(r, setups)}</span>
                    {meta.editor === "number" && <Input type="number" step="any" min={0} value={r.value ?? ""} onChange={(e) => setRule(i, { value: +e.target.value })} className="h-8 w-20" aria-label="Value" />}
                    {meta.editor === "range" && <>
                      <Input type="number" min={0} max={23} value={r.value ?? 0} onChange={(e) => setRule(i, { value: +e.target.value })} className="h-8 w-16" aria-label="From hour" />
                      <span className="text-xs text-muted">to</span>
                      <Input type="number" min={0} max={23} value={r.value2 ?? 0} onChange={(e) => setRule(i, { value2: +e.target.value })} className="h-8 w-16" aria-label="To hour" />
                    </>}
                    {meta.editor === "setups" && (
                      <div className="flex w-full flex-wrap gap-1">{setups.map((s) => { const on = (r.setupIds ?? []).includes(s.id); return <button key={s.id} onClick={() => setRule(i, { setupIds: on ? r.setupIds!.filter((x) => x !== s.id) : [...(r.setupIds ?? []), s.id] })} className={cn("cursor-pointer rounded-md border px-2 py-1 text-[11px]", on ? "border-accent/60 bg-accent/10" : "border-line text-muted")}>{s.icon} {s.name}</button>; })}</div>
                    )}
                    <button onClick={() => set({ rules: d.rules.filter((_, j) => j !== i) })} className="cursor-pointer rounded p-1 text-faint hover:text-loss" aria-label="Remove rule"><X size={14} /></button>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-1">
                <Select value={addKind} onChange={(e) => setAddKind(e.target.value as RuleKind)}>
                  {(Object.keys(RULE_META) as RuleKind[]).map((k) => <option key={k} value={k}>{RULE_META[k].label({ kind: k, ...RULE_META[k].defaults }, setups)}</option>)}
                </Select>
                <Button variant="outline" onClick={() => set({ rules: [...d.rules, { kind: addKind, ...RULE_META[addKind].defaults } as AgentRule] })}><Plus size={14} /> Add</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-20 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line p-4" style={{ background: `linear-gradient(110deg, ${d.color}1c, transparent 70%)` }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: `${d.color}22` }}>{d.icon}</span>
              <div className="min-w-0 flex-1"><div className="font-display font-semibold">{d.name || "My Agent"}</div><div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: d.color }}>Live preview on your journal</div></div>
              <GradeBadge grade={preview.grade} />
              <ScoreRing score={preview.score} color={d.color} size={48} />
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto p-4">
              <div className="text-sm">{preview.headline}</div>
              {preview.findings.slice(0, 5).map((f) => <FindingCard key={f.id} f={f} />)}
            </div>
            <div className="border-t border-line p-4">
              <Button className="w-full" size="lg" onClick={submit}><Sparkles size={15} /> {existing ? "Save agent" : "Forge agent"}</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
