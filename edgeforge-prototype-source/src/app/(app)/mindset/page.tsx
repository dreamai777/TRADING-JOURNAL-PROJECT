"use client";
import { useMemo, useState } from "react";
import { PnlBars, Ring } from "@/components/charts";
import { EMOTION_META, MISTAKE_LABEL } from "@/components/quick-snap";
import { Card, CardHeader, Input, Label, Money, PageHeader, Pill, Progress, fmtPct } from "@/components/ui";
import { emotionImpact, mistakeCost, positionSize, summarize, tiltMeter } from "@/core/stats";
import type { Emotion, Mistake } from "@/core/types";
import { useRangedJournal } from "@/lib/hooks";
import { RangePicker } from "@/components/range-picker";

export default function MindsetPage() {
  const { trades, all, account } = useRangedJournal();
  const tilt = tiltMeter(all);
  const emo = useMemo(() => emotionImpact(trades).map((e) => ({ ...e, label: `${EMOTION_META[e.emotion as Emotion].icon} ${EMOTION_META[e.emotion as Emotion].label}` })), [trades]);
  const mistakes = useMemo(() => mistakeCost(trades), [trades]);
  const ruled = summarize(trades.filter((t) => t.rulesFollowed));
  const broken = summarize(trades.filter((t) => t.rulesFollowed === false));
  const totalMistakeCost = mistakes.reduce((a, m) => a + Math.min(0, m.cost), 0);

  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("91000");
  const [stop, setStop] = useState("90200");
  const [acct, setAcct] = useState(String(account));
  const ps = positionSize({ account: +acct || 0, riskPct: +riskPct || 0, entry: +entry || 0, stop: +stop || 0 });

  const today = new Date().toISOString().slice(0, 10);
  const todayPnl = all.filter((t) => t.closedAt.startsWith(today)).reduce((a, t) => a + t.pnl, 0);
  const dailyLimit = account * 0.03;
  const tiltColor = tilt >= 60 ? "#ff5470" : tilt >= 35 ? "#fbbf24" : "#2fe39a";

  return (
    <div>
      <PageHeader title="Mindset & Risk" subtitle="Your psychology has a P&L. Here it is." right={<RangePicker />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Tilt meter</div>
          <div className="mt-4 flex items-center gap-5">
            <Ring value={tilt / 100} size={110} stroke={10} color={tiltColor}>
              <div className="text-center"><div className="num text-2xl font-bold">{tilt}</div><div className="text-[10px] text-faint">/ 100</div></div>
            </Ring>
            <div>
              <div className="font-display text-lg font-semibold" style={{ color: tiltColor }}>{tilt >= 60 ? "Tilted. Stop now." : tilt >= 35 ? "Warming up. Be careful." : "Cool and focused"}</div>
              <p className="mt-1 text-xs text-muted">Based on losses, emotional state and rule breaks across your last 5 trades.</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Cost of breaking rules</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-profit/25 bg-profit/5 p-3">
              <div className="text-[10px] font-semibold uppercase text-profit">Followed plan</div>
              <Money usd={ruled.expectancy} sign className="text-xl font-bold" />
              <div className="num text-[11px] text-muted">per trade · {fmtPct(ruled.winRate, 0)} win · {ruled.count}</div>
            </div>
            <div className="rounded-lg border border-loss/25 bg-loss/5 p-3">
              <div className="text-[10px] font-semibold uppercase text-loss">Broke plan</div>
              <Money usd={broken.expectancy} sign className="text-xl font-bold" />
              <div className="num text-[11px] text-muted">per trade · {fmtPct(broken.winRate, 0)} win · {broken.count}</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted">Mistakes have cost you <Money usd={totalMistakeCost} className="font-semibold" /> in total.</div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Today&apos;s guardrails</div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs"><span>Daily loss limit (3%)</span><Money usd={Math.min(0, todayPnl)} /></div>
              <Progress value={Math.max(0, -todayPnl) / dailyLimit} color={-todayPnl > dailyLimit * 0.7 ? "#ff5470" : "#2fe39a"} className="mt-1.5" />
              <div className="num mt-1 text-[11px] text-faint">Limit <Money usd={-dailyLimit} colored={false} /></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone="profit">Max 1% risk / trade</Pill>
              <Pill tone="profit">Max 5 trades / day</Pill>
              <Pill tone="gold">Stop after 2 losses in a row</Pill>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Emotion vs P&L" subtitle="Net result by how you felt when entering" />
          <div className="px-2 pb-3">
            <PnlBars data={emo} x="label" height={260} allTicks extra={(r) => <div className="num text-muted">{r.count} trades · {Math.round((r.winRate as number) * 100)}% win</div>} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Most expensive mistakes" subtitle="Total P&L of trades tagged with each mistake" />
          <div className="space-y-3 px-5 pb-5">
            {mistakes.length === 0 && <div className="py-8 text-center text-sm text-muted">No mistakes logged. Either you&apos;re perfect or not tagging them 😉</div>}
            {mistakes.map((m) => {
              const max = Math.max(...mistakes.map((x) => Math.abs(x.cost)));
              return (
                <div key={m.mistake}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{MISTAKE_LABEL[m.mistake as Mistake]}</span>
                    <span className="flex items-center gap-3"><span className="num text-xs text-muted">{m.count}×</span><Money usd={m.cost} sign className="font-semibold" /></span>
                  </div>
                  <Progress value={Math.abs(m.cost) / max} color={m.cost < 0 ? "#ff5470" : "#2fe39a"} className="mt-1.5" height={5} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Position size calculator" subtitle="Size every trade from risk, never from conviction" />
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-[1fr_1fr_1fr_1fr_1.4fr]">
          <div><Label>Account</Label><Input className="num" value={acct} onChange={(e) => setAcct(e.target.value)} /></div>
          <div><Label>Risk %</Label><Input className="num" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} /></div>
          <div><Label>Entry</Label><Input className="num" value={entry} onChange={(e) => setEntry(e.target.value)} /></div>
          <div><Label>Stop</Label><Input className="num" value={stop} onChange={(e) => setStop(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
            <div><div className="text-[10px] uppercase text-faint">Risk</div><Money usd={ps.riskAmount} colored={false} className="text-sm font-bold" /></div>
            <div><div className="text-[10px] uppercase text-faint">Size</div><div className="num text-sm font-bold text-accent">{ps.qty ? +ps.qty.toFixed(4) : 0}</div></div>
            <div><div className="text-[10px] uppercase text-faint">Notional</div><Money usd={ps.notional} colored={false} compact className="text-sm font-bold" /></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
