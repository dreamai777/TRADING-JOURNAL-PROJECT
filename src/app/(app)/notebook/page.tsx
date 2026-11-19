"use client";
import { BookMarked, CalendarDays, Moon, Sparkles, Sun } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GradeBadge, MiniMarkdown } from "@/components/ai/report-view";
import { Card, CardHeader, Label, Money, PageHeader, Pill, Segmented, Textarea, cn, fmtDateTime } from "@/components/ui";
import { gradeOf } from "@/core/ai/review";
import { localDay, summarize } from "@/core/stats";
import { useAi, useCouncil, type NotebookEntry } from "@/lib/ai";

const MOODS = ["😫", "😕", "😐", "🙂", "🔥"];

export default function NotebookPage() {
  const { me, trades, council, now } = useCouncil();
  const notebook = useAi((s) => s.notebook);
  const saveNote = useAi((s) => s.saveNote);
  const today = localDay(new Date(now));
  const [date, setDate] = useState(today);

  const days = useMemo(() => {
    const set = new Map<string, number>();
    for (const t of trades) set.set(localDay(t.closedAt), (set.get(localDay(t.closedAt)) ?? 0) + t.pnl);
    const list = [...set.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 45);
    if (!set.has(today)) list.unshift([today, 0]);
    return list;
  }, [trades, today]);

  if (!me) return null;
  const entry: NotebookEntry = notebook.find((n) => n.userId === me.id && n.date === date) ?? { userId: me.id, date };
  const patch = (p: Partial<NotebookEntry>) => saveNote({ ...entry, ...p });
  const dayTrades = trades.filter((t) => localDay(t.closedAt) === date);
  const ds = summarize(dayTrades);
  const reviews = dayTrades.map((t) => council.reviews.get(t.id)!);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.score, 0) / reviews.length : 0;
  const habitList = [...new Set([...council.focus.rules, ...council.reports.habit.actions])].slice(0, 5);
  const written = notebook.filter((n) => n.userId === me.id && (n.plan || n.recap || n.lesson)).length;

  const recap = (() => {
    if (!dayTrades.length) return date === today ? "No trades yet today. A no-trade day that follows the plan is a win too." : "No trades this day.";
    const best = [...dayTrades].sort((a, b) => b.pnl - a.pnl)[0];
    const worst = [...dayTrades].sort((a, b) => a.pnl - b.pnl)[0];
    const issues = [...new Set(reviews.flatMap((r) => r.wrong))].slice(0, 2);
    const lines = [
      `**${dayTrades.length} trade${dayTrades.length > 1 ? "s" : ""}, ${ds.netPnl >= 0 ? "+" : "-"}$${Math.abs(ds.netPnl).toFixed(0)}, average process grade ${gradeOf(avg)}.**`,
      `Best decision: ${best.symbol} ${best.side} (${council.reviews.get(best.id)!.grade}). ${council.reviews.get(best.id)!.right[0] ?? ""}`,
      worst.id !== best.id ? `Weakest: ${worst.symbol} ${worst.side} (${council.reviews.get(worst.id)!.grade}). ${council.reviews.get(worst.id)!.wrong[0] ?? ""}` : "",
      issues.length ? `Watch tomorrow: ${issues.join(" ")}` : "Clean day. Repeat it.",
      entry.mood != null && entry.mood <= 2 && ds.netPnl < 0 ? "You started the day low on mood. That shows up in the results: next time, a low-mood morning means half size." : "",
    ];
    return lines.filter(Boolean).join("\n\n");
  })();

  return (
    <div>
      <PageHeader title="Notebook" subtitle="Plan before the bell, recap after it. Sensei turns each day into one lesson." right={<Pill tone="accent"><BookMarked size={12} /> {written} entries written</Pill>} />
      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        <Card className="max-h-[calc(100vh-180px)] overflow-y-auto p-2 lg:sticky lg:top-20">
          <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Trading days</div>
          {days.map(([d, pnl]) => {
            const has = notebook.some((n) => n.userId === me.id && n.date === d && (n.plan || n.recap || n.lesson));
            return (
              <button key={d} onClick={() => setDate(d)} className={cn("flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition", date === d ? "bg-surface-3" : "hover:bg-surface-2")}>
                <span className="flex items-center gap-2">{has ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : <span className="h-1.5 w-1.5 rounded-full bg-surface-3" />}{d === today ? "Today" : new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                {pnl !== 0 && <Money usd={pnl} sign compact className="text-xs" />}
              </button>
            );
          })}
        </Card>

        <div className="space-y-4">
          <div className="flex items-center gap-2 font-display text-lg font-semibold"><CalendarDays size={18} className="text-accent" /> {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Pre-market" icon={<Sun size={15} className="text-gold" />} subtitle="Two minutes. Check your state, set your intent." />
              <div className="space-y-4 px-5 pb-5">
                <div className="grid grid-cols-2 gap-4">
                  <Scale label="Sleep" value={entry.sleep} onChange={(v) => patch({ sleep: v })} icons={["1", "2", "3", "4", "5"]} />
                  <Scale label="Mood" value={entry.mood} onChange={(v) => patch({ mood: v })} icons={MOODS} />
                </div>
                {(entry.sleep != null && entry.sleep <= 2) || (entry.mood != null && entry.mood <= 2) ? <div className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">Sensei: low sleep or mood today. Half size, A+ setups only, stop after one loss.</div> : null}
                <div><Label>Bias</Label><Segmented value={entry.bias ?? "neutral"} onChange={(v) => patch({ bias: v })} options={[{ value: "bullish", label: "🐂 Bullish" }, { value: "neutral", label: "⚖️ Neutral" }, { value: "bearish", label: "🐻 Bearish" }]} /></div>
                <div><Label>Game plan</Label><Textarea key={`${date}p`} rows={3} defaultValue={entry.plan} onBlur={(e) => patch({ plan: e.target.value })} placeholder="The one setup I'm hunting today, and what would make me skip it." /></div>
                <div><Label>Key levels</Label><Textarea key={`${date}l`} rows={2} defaultValue={entry.levels} onBlur={(e) => patch({ levels: e.target.value })} placeholder="BTC 96.2k support, 99k resistance…" /></div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Habit check-in" icon={<span>⛓️</span>} subtitle="From Ironclad and this week's focus. Tick what you did." />
              <div className="space-y-2 px-5 pb-5">
                {habitList.map((h) => {
                  const on = !!entry.habits?.[h];
                  return (
                    <button key={h} onClick={() => patch({ habits: { ...(entry.habits ?? {}), [h]: !on } })} className={cn("flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition", on ? "border-profit/40 bg-profit/[.06]" : "border-line bg-surface-2 hover:border-line-strong")}>
                      <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]", on ? "border-profit bg-profit text-black" : "border-line-strong")}>{on && "✓"}</span>
                      <span className={on ? "text-ink" : "text-muted"}>{h}</span>
                    </button>
                  );
                })}
                <div className="pt-1 text-xs text-faint">{Object.values(entry.habits ?? {}).filter(Boolean).length}/{habitList.length} done · checked habits feed your discipline streak</div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Session" subtitle={dayTrades.length ? `${ds.count} trades · ${Math.round(ds.winRate * 100)}% wins` : "No trades closed this day"} right={dayTrades.length ? <Money usd={ds.netPnl} sign className="text-base font-bold" /> : undefined} />
            {dayTrades.length > 0 && (
              <div className="px-3 pb-3">
                {dayTrades.map((t) => {
                  const r = council.reviews.get(t.id)!;
                  return (
                    <Link key={t.id} href={`/journal/${t.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                      <GradeBadge grade={r.grade} size="sm" />
                      <span className="w-28 text-sm font-semibold">{t.symbol}</span>
                      <span className="text-xs uppercase text-muted">{t.side}</span>
                      <span className="hidden min-w-0 flex-1 truncate text-xs text-muted sm:block">{r.verdict} · {fmtDateTime(t.openedAt)}</span>
                      <Money usd={t.pnl} sign className="ml-auto text-sm font-semibold" />
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="border-accent/25">
              <CardHeader title="Sensei's recap" icon={<Sparkles size={15} className="text-accent" />} subtitle="Written from your trades and their grades" />
              <div className="space-y-2.5 px-5 pb-5 text-[13.5px] leading-relaxed text-ink/90">
                <MiniMarkdown text={recap} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Post-session" icon={<Moon size={15} className="text-violet" />} subtitle="Close the loop" />
              <div className="space-y-4 px-5 pb-5">
                <div><Label>How did it go?</Label><Textarea key={`${date}r`} rows={3} defaultValue={entry.recap} onBlur={(e) => patch({ recap: e.target.value })} placeholder="Did I follow the plan? Where did I hesitate or force it?" /></div>
                <div><Label>One lesson</Label><Textarea key={`${date}s`} rows={2} defaultValue={entry.lesson} onBlur={(e) => patch({ lesson: e.target.value })} placeholder="If I remember one thing tomorrow, it's…" /></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Scale({ label, value, onChange, icons }: { label: string; value?: number; onChange: (v: number) => void; icons: string[] }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-1">
        {icons.map((ic, i) => (
          <button key={i} onClick={() => onChange(i + 1)} className={cn("flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border text-sm transition", value === i + 1 ? "border-accent/60 bg-accent/12" : "border-line bg-surface-2 text-muted hover:border-line-strong")}>{ic}</button>
        ))}
      </div>
    </div>
  );
}
