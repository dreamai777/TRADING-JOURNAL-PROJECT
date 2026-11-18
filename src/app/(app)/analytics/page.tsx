"use client";
import { useMemo } from "react";
import { CountBars, DrawdownChart, EquityChart, PnlBars } from "@/components/charts";
import { Card, CardHeader, Money, PageHeader, cn, fmtNum, fmtPct } from "@/components/ui";
import { byHour, byWeekday, equityCurve, groupBy, rDistribution } from "@/core/stats";
import { useRangedJournal } from "@/lib/hooks";
import { RangePicker } from "@/components/range-picker";

export default function AnalyticsPage() {
  const { trades, setups, summary: s, startEquity: account } = useRangedJournal();
  const curve = useMemo(() => equityCurve(trades, account), [trades, account]);
  const setupRows = useMemo(() => groupBy(trades, (t) => t.setupId).map((g) => ({ ...g, setup: setups.find((x) => x.id === g.key) })).sort((a, b) => b.summary.netPnl - a.summary.netPnl), [trades, setups]);
  const symbolRows = useMemo(() => groupBy(trades, (t) => t.symbol).sort((a, b) => b.summary.netPnl - a.summary.netPnl), [trades]);
  const sideRows = useMemo(() => groupBy(trades, (t) => t.side), [trades]);
  const assetRows = useMemo(() => groupBy(trades, (t) => t.assetClass).map((g) => ({ asset: g.key, pnl: g.summary.netPnl, count: g.summary.count })), [trades]);

  const metrics: [string, React.ReactNode][] = [
    ["Total trades", s.count], ["Win rate", fmtPct(s.winRate)], ["Profit factor", fmtNum(s.profitFactor)], ["Expectancy", <Money key="e" usd={s.expectancy} sign />],
    ["Avg win", <Money key="aw" usd={s.avgWin} />], ["Avg loss", <Money key="al" usd={-s.avgLoss} />], ["Payoff ratio", fmtNum(s.payoff)], ["Avg R", `${s.avgR.toFixed(2)}R`],
    ["Total R", `${s.totalR.toFixed(1)}R`], ["Best trade", <Money key="b" usd={s.bestTrade} sign />], ["Worst trade", <Money key="w" usd={s.worstTrade} sign />], ["Max drawdown", fmtPct(s.maxDrawdownPct)],
    ["Win streak", s.longestWinStreak], ["Loss streak", s.longestLossStreak], ["Avg hold", s.avgHoldMinutes >= 60 ? `${(s.avgHoldMinutes / 60).toFixed(1)}h` : `${Math.round(s.avgHoldMinutes)}m`], ["Fees paid", <Money key="f" usd={-s.fees} />],
    ["Gross profit", <Money key="gp" usd={s.grossProfit} />], ["Gross loss", <Money key="gl" usd={-s.grossLoss} />], ["Discipline", fmtPct(s.disciplineRate)], ["Return", fmtPct(s.netPnl / account)],
  ];

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Find where your edge lives, and where it leaks." right={<RangePicker />} />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-4 xl:grid-cols-10">
        {metrics.map(([k, v]) => (
          <div key={k} className="bg-surface px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[.08em] text-faint">{k}</div>
            <div className="num mt-1 text-[15px] font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Equity & drawdown" subtitle="Underwater curve shows distance from the last peak" />
          <div className="px-2"><EquityChart data={curve} height={220} /></div>
          <div className="px-2 pb-3"><DrawdownChart data={curve} /></div>
        </Card>
        <Card>
          <CardHeader title="Weapon performance" subtitle="Net P&L by setup" />
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-faint"><th className="py-2">Setup</th><th className="text-right">Trades</th><th className="text-right">Win</th><th className="text-right">PF</th><th className="text-right">Avg R</th><th className="text-right">Net</th></tr></thead>
              <tbody>
                {setupRows.map((r) => (
                  <tr key={r.key} className="border-t border-line/60">
                    <td className="py-2.5 font-medium">{r.setup ? `${r.setup.icon} ${r.setup.name}` : "Untagged"}</td>
                    <td className="num text-right text-muted">{r.summary.count}</td>
                    <td className="num text-right">{fmtPct(r.summary.winRate, 0)}</td>
                    <td className={cn("num text-right", r.summary.profitFactor >= 1 ? "text-profit" : "text-loss")}>{fmtNum(r.summary.profitFactor)}</td>
                    <td className="num text-right">{r.summary.avgR.toFixed(2)}</td>
                    <td className="text-right"><Money usd={r.summary.netPnl} sign compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {sideRows.map((r) => (
                <div key={r.key} className="rounded-lg border border-line bg-surface-2 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-faint">{r.key}s</div>
                  <Money usd={r.summary.netPnl} sign className="text-lg font-semibold" />
                  <div className="num text-xs text-muted">{r.summary.count} trades · {fmtPct(r.summary.winRate, 0)} win</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card><CardHeader title="By weekday" subtitle="Day the trade was opened" /><div className="px-2 pb-3"><PnlBars data={byWeekday(trades)} x="day" /></div></Card>
        <Card><CardHeader title="By hour (UTC)" subtitle="Hour the trade was opened" /><div className="px-2 pb-3"><PnlBars data={byHour(trades)} x="hour" /></div></Card>
        <Card><CardHeader title="R distribution" subtitle="How your outcomes cluster in risk units" /><div className="px-2 pb-3"><CountBars data={rDistribution(trades)} x="bucket" y="count" height={220} /></div></Card>
        <Card><CardHeader title="By market" subtitle="Net P&L per asset class" /><div className="px-2 pb-3"><PnlBars data={assetRows} x="asset" /></div></Card>
        <Card className="xl:col-span-2">
          <CardHeader title="By symbol" subtitle="Top and bottom instruments" />
          <div className="grid grid-cols-1 gap-x-8 px-5 pb-5 sm:grid-cols-2">
            {symbolRows.map((r) => {
              const max = Math.max(...symbolRows.map((x) => Math.abs(x.summary.netPnl)));
              return (
                <div key={r.key} className="flex items-center gap-3 border-b border-line/50 py-2 text-sm">
                  <span className="w-20 font-semibold">{r.key}</span>
                  <div className="relative h-2 flex-1 rounded-full bg-surface-3">
                    <div className="absolute top-0 h-2 rounded-full" style={{ width: `${(Math.abs(r.summary.netPnl) / max) * 100}%`, background: r.summary.netPnl >= 0 ? "#2fe39a" : "#ff5470" }} />
                  </div>
                  <span className="num w-10 text-right text-xs text-muted">{r.summary.count}</span>
                  <Money usd={r.summary.netPnl} sign compact className="w-20 text-right text-xs font-semibold" />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
