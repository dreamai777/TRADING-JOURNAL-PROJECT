"use client";
// Deep-dive report views for the Reports page: day x hour heatmap, sessions, duration, tags, mistakes,
// and a side-by-side Compare tool. All computed client-side from the journal.
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EMOTION_META, MISTAKE_LABEL } from "@/components/quick-snap";
import { Card, CardHeader, Money, Select, cn, fmtNum, fmtPct, useMoney } from "@/components/ui";
import type { TradeReview } from "@/core/ai/review";
import { groupBy, mistakeCost, summarize, type Summary } from "@/core/stats";
import type { Emotion, Mistake, Setup, TradeComputed } from "@/core/types";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dowOf = (iso: string) => (new Date(iso).getUTCDay() + 6) % 7;

export function DayHourHeatmap({ trades }: { trades: TradeComputed[] }) {
  const money = useMoney();
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ pnl: 0, n: 0, w: 0 })));
    for (const t of trades) {
      const c = g[dowOf(t.openedAt)][new Date(t.openedAt).getUTCHours()];
      c.pnl += t.pnl; c.n++; if (t.win) c.w++;
    }
    return g;
  }, [trades]);
  const max = Math.max(...grid.flat().map((c) => Math.abs(c.pnl)), 1);
  return (
    <Card>
      <CardHeader title="When you make money" subtitle="Net P&L by weekday and hour opened (UTC). Brighter means bigger." />
      <div className="overflow-x-auto px-5 pb-5">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[36px_repeat(24,1fr)] gap-[3px]">
            <div />
            {Array.from({ length: 24 }, (_, h) => <div key={h} className="num text-center text-[9px] text-faint">{h % 3 === 0 ? h : ""}</div>)}
            {grid.map((row, d) => (
              <Row key={d} label={DOW[d]}>
                {row.map((c, h) => {
                  const a = c.n ? 0.15 + (Math.abs(c.pnl) / max) * 0.85 : 0;
                  return <div key={h} title={c.n ? `${DOW[d]} ${String(h).padStart(2, "0")}:00 · ${c.n} trades · ${money(c.pnl, { sign: true })} · ${Math.round((c.w / c.n) * 100)}% win` : "No trades"} className="aspect-square rounded-[3px]" style={{ background: c.n ? (c.pnl >= 0 ? `rgba(47,227,154,${a})` : `rgba(255,84,112,${a})`) : "#121821" }} />;
                })}
              </Row>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <><div className="flex items-center text-[10px] font-semibold text-muted">{label}</div>{children}</>;
}

const SESSIONS = [
  { name: "Asia", from: 0, to: 7, icon: "🌏" },
  { name: "London", from: 7, to: 12, icon: "🇬🇧" },
  { name: "London–NY overlap", from: 12, to: 16, icon: "⚡" },
  { name: "New York", from: 16, to: 21, icon: "🗽" },
  { name: "Late / rollover", from: 21, to: 24, icon: "🌙" },
];
export const sessionOf = (iso: string) => { const h = new Date(iso).getUTCHours(); return SESSIONS.find((s) => h >= s.from && h < s.to)!.name; };

export function SessionTable({ trades }: { trades: TradeComputed[] }) {
  const rows = SESSIONS.map((s) => ({ ...s, s: summarize(trades.filter((t) => sessionOf(t.openedAt) === s.name)) }));
  return <BreakdownTable title="By session" subtitle="Market session the trade was opened in (UTC)" rows={rows.map((r) => ({ key: r.name, label: `${r.icon} ${r.name}`, s: r.s }))} />;
}

const HOLD = [
  { l: "Under 15m", max: 15 }, { l: "15m–1h", max: 60 }, { l: "1–4h", max: 240 }, { l: "4–24h", max: 1440 }, { l: "1–3 days", max: 4320 }, { l: "3+ days", max: Infinity },
];
export function DurationTable({ trades }: { trades: TradeComputed[] }) {
  const rows = HOLD.map((b, i) => ({ key: b.l, label: b.l, s: summarize(trades.filter((t) => t.holdMinutes < b.max && t.holdMinutes >= (HOLD[i - 1]?.max ?? 0))) }));
  const wins = trades.filter((t) => t.win), losses = trades.filter((t) => !t.win);
  const avg = (xs: TradeComputed[]) => (xs.length ? xs.reduce((a, t) => a + t.holdMinutes, 0) / xs.length : 0);
  const fmtH = (m: number) => (m >= 1440 ? `${(m / 1440).toFixed(1)}d` : m >= 60 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-faint">Avg winner held</div><div className="num mt-1 text-xl font-semibold text-profit">{fmtH(avg(wins))}</div></Card>
        <Card className="p-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-faint">Avg loser held</div><div className={cn("num mt-1 text-xl font-semibold", avg(losses) > avg(wins) ? "text-loss" : "text-ink")}>{fmtH(avg(losses))}</div>{avg(losses) > avg(wins) * 1.3 && <div className="mt-1 text-[11px] text-gold">You hold losers longer than winners. Classic hope trading.</div>}</Card>
      </div>
      <BreakdownTable title="By time in trade" subtitle="How long positions were held" rows={rows} />
    </div>
  );
}

export function BreakdownTable({ title, subtitle, rows }: { title: string; subtitle?: string; rows: { key: string; label: React.ReactNode; s: Summary }[] }) {
  const shown = rows.filter((r) => r.s.count > 0);
  const max = Math.max(...shown.map((r) => Math.abs(r.s.netPnl)), 1);
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="text-left text-[10px] uppercase tracking-wider text-faint"><th className="py-2">Group</th><th className="text-right">Trades</th><th className="text-right">Win</th><th className="text-right">PF</th><th className="text-right">Expect.</th><th className="w-[30%] pl-4">Net</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className="border-t border-line/60">
                <td className="py-2.5 font-medium">{r.label}</td>
                <td className="num text-right text-muted">{r.s.count}</td>
                <td className="num text-right">{fmtPct(r.s.winRate, 0)}</td>
                <td className={cn("num text-right", r.s.profitFactor >= 1 ? "text-profit" : "text-loss")}>{fmtNum(r.s.profitFactor)}</td>
                <td className="text-right"><Money usd={r.s.expectancy} sign /></td>
                <td className="pl-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 min-w-[40px] flex-1 rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${(Math.abs(r.s.netPnl) / max) * 100}%`, background: r.s.netPnl >= 0 ? "#2fe39a" : "#ff5470" }} /></div>
                    <Money usd={r.s.netPnl} sign compact className="shrink-0 whitespace-nowrap text-right text-xs font-semibold" />
                  </div>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="py-6 text-center text-muted">No trades in this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function TagsAndMistakes({ trades, reviews }: { trades: TradeComputed[]; reviews: Map<string, TradeReview> }) {
  const tagRows = useMemo(() => {
    const tags = [...new Set(trades.flatMap((t) => t.tags))];
    return tags.map((tag) => ({ key: tag, label: `#${tag}`, s: summarize(trades.filter((t) => t.tags.includes(tag))) })).sort((a, b) => b.s.netPnl - a.s.netPnl);
  }, [trades]);
  const mistakes = mistakeCost(trades);
  const clean = summarize(trades.filter((t) => !t.mistakes.length));
  const emoRows = groupBy(trades, (t) => t.emotion).map((g) => ({ key: g.key, label: `${EMOTION_META[g.key as Emotion].icon} ${EMOTION_META[g.key as Emotion].label}`, s: g.summary })).sort((a, b) => b.s.netPnl - a.s.netPnl);
  const gradeRows = (["S", "A", "B", "C", "D", "F"] as const).map((g) => ({ key: g, label: `Grade ${g}`, s: summarize(trades.filter((t) => reviews.get(t.id)?.grade === g)) }));
  const totalCost = mistakes.reduce((a, m) => a + Math.min(0, m.cost), 0);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Cost of mistakes" subtitle={`Mistake-tagged trades netted ${totalCost < 0 ? "-" : ""}$${Math.abs(totalCost).toFixed(0)} · clean trades average $${clean.expectancy.toFixed(0)} each`} />
        <div className="space-y-2 px-5 pb-5">
          {mistakes.map((m) => {
            const mx = Math.max(...mistakes.map((x) => Math.abs(x.cost)), 1);
            return (
              <div key={m.mistake} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate">{MISTAKE_LABEL[m.mistake as Mistake] ?? m.mistake}</span>
                <span className="num w-8 text-right text-xs text-faint">{m.count}×</span>
                <div className="h-2 flex-1 rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${(Math.abs(m.cost) / mx) * 100}%`, background: m.cost < 0 ? "#ff5470" : "#2fe39a" }} /></div>
                <Money usd={m.cost} sign compact className="w-16 text-right text-xs font-semibold" />
              </div>
            );
          })}
          {!mistakes.length && <div className="py-4 text-center text-sm text-muted">No mistakes tagged. Either you&apos;re perfect, or you&apos;re not tagging them.</div>}
        </div>
      </Card>
      <BreakdownTable title="By AI process grade" subtitle="Oracle's grade vs what the trade actually made" rows={gradeRows} />
      <BreakdownTable title="By emotion" subtitle="Logged state on entry" rows={emoRows} />
      <BreakdownTable title="By tag" subtitle="Your custom tags" rows={tagRows.slice(0, 12)} />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------
// Compare: two filtered slices side by side, with overlaid equity curves.

interface Filter { setup: string; side: string; session: string; emotion: string; plan: string; symbol: string }
const ANY: Filter = { setup: "", side: "", session: "", emotion: "", plan: "", symbol: "" };

function applyFilter(trades: TradeComputed[], f: Filter) {
  return trades.filter((t) =>
    (!f.setup || t.setupId === f.setup) && (!f.side || t.side === f.side) && (!f.session || sessionOf(t.openedAt) === f.session) &&
    (!f.emotion || t.emotion === f.emotion) && (!f.plan || (f.plan === "yes" ? t.rulesFollowed === true : t.rulesFollowed === false)) && (!f.symbol || t.symbol === f.symbol));
}

export function Compare({ trades, setups }: { trades: TradeComputed[]; setups: Setup[] }) {
  const [a, setA] = useState<Filter>({ ...ANY, plan: "yes" });
  const [b, setB] = useState<Filter>({ ...ANY, plan: "no" });
  const ta = useMemo(() => applyFilter(trades, a), [trades, a]);
  const tb = useMemo(() => applyFilter(trades, b), [trades, b]);
  const sa = summarize(ta), sb = summarize(tb);
  const symbols = useMemo(() => [...new Set(trades.map((t) => t.symbol))].sort(), [trades]);
  const curve = useMemo(() => {
    const n = Math.max(ta.length, tb.length);
    const out: { i: number; a: number | null; b: number | null }[] = [];
    for (let i = 0, ea = 0, eb = 0; i < n; i++) {
      if (ta[i]) ea += ta[i].pnl;
      if (tb[i]) eb += tb[i].pnl;
      out.push({ i: i + 1, a: ta[i] ? ea : null, b: tb[i] ? eb : null });
    }
    return out;
  }, [ta, tb]);
  const money = useMoney();
  const rows: [string, (s: Summary) => string, (x: Summary, y: Summary) => boolean][] = [
    ["Trades", (s) => String(s.count), () => false],
    ["Net P&L", (s) => money(s.netPnl, { sign: true }), (x, y) => x.netPnl > y.netPnl],
    ["Win rate", (s) => fmtPct(s.winRate), (x, y) => x.winRate > y.winRate],
    ["Profit factor", (s) => fmtNum(s.profitFactor), (x, y) => x.profitFactor > y.profitFactor],
    ["Expectancy", (s) => money(s.expectancy, { sign: true }), (x, y) => x.expectancy > y.expectancy],
    ["Avg R", (s) => `${s.avgR.toFixed(2)}R`, (x, y) => x.avgR > y.avgR],
    ["Avg win", (s) => money(s.avgWin), (x, y) => x.avgWin > y.avgWin],
    ["Avg loss", (s) => money(-s.avgLoss), (x, y) => x.avgLoss < y.avgLoss],
    ["Max drawdown", (s) => money(-s.maxDrawdown), (x, y) => x.maxDrawdown < y.maxDrawdown],
  ];
  const editor = (f: Filter, set: (f: Filter) => void, color: string, label: string) => (
    <Card className="p-4" style={{ boxShadow: `inset 3px 0 0 ${color}` }}>
      <div className="mb-3 text-sm font-semibold" style={{ color }}>{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={f.setup} onChange={(e) => set({ ...f, setup: e.target.value })}><option value="">Any setup</option>{setups.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</Select>
        <Select value={f.symbol} onChange={(e) => set({ ...f, symbol: e.target.value })}><option value="">Any symbol</option>{symbols.map((s) => <option key={s}>{s}</option>)}</Select>
        <Select value={f.side} onChange={(e) => set({ ...f, side: e.target.value })}><option value="">Long & short</option><option value="long">Long</option><option value="short">Short</option></Select>
        <Select value={f.session} onChange={(e) => set({ ...f, session: e.target.value })}><option value="">Any session</option>{SESSIONS.map((s) => <option key={s.name}>{s.name}</option>)}</Select>
        <Select value={f.emotion} onChange={(e) => set({ ...f, emotion: e.target.value })}><option value="">Any emotion</option>{(Object.keys(EMOTION_META) as Emotion[]).map((e) => <option key={e} value={e}>{EMOTION_META[e].label}</option>)}</Select>
        <Select value={f.plan} onChange={(e) => set({ ...f, plan: e.target.value })}><option value="">Plan: any</option><option value="yes">Followed plan</option><option value="no">Broke plan</option></Select>
      </div>
    </Card>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">{editor(a, setA, "#c8f53b", "Group A")}{editor(b, setB, "#a78bfa", "Group B")}</div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader title="Head to head" subtitle="Winner of each row is highlighted" />
          <div className="px-5 pb-5">
            <div className="grid grid-cols-[1fr_110px_110px] border-b border-line pb-2 text-[10px] font-semibold uppercase tracking-wider text-faint"><span>Metric</span><span className="text-right text-accent">A</span><span className="text-right text-violet">B</span></div>
            {rows.map(([k, f, better]) => (
              <div key={k} className="grid grid-cols-[1fr_110px_110px] border-b border-line/50 py-2 text-sm last:border-0">
                <span className="text-muted">{k}</span>
                <span className={cn("num text-right", better(sa, sb) && sa.count && sb.count ? "font-bold text-accent" : "")}>{sa.count ? f(sa) : "—"}</span>
                <span className={cn("num text-right", better(sb, sa) && sa.count && sb.count ? "font-bold text-violet" : "")}>{sb.count ? f(sb) : "—"}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Cumulative P&L" subtitle="Each group's trades in order" />
          <div className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={curve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1d2633" vertical={false} />
                <XAxis dataKey="i" stroke="#566275" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#566275" fontSize={11} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => money(v, { compact: true })} />
                <Tooltip contentStyle={{ background: "#121821", border: "1px solid #2a3647", borderRadius: 8, fontSize: 12 }} formatter={(v) => money(Number(v), { sign: true })} labelFormatter={(l) => `Trade #${l}`} />
                <Line dataKey="a" name="A" stroke="#c8f53b" strokeWidth={2} dot={false} connectNulls />
                <Line dataKey="b" name="B" stroke="#a78bfa" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

