"use client";
import { Play } from "lucide-react";
import { useMemo, useState } from "react";
import { SimpleEquity } from "@/components/charts";
import { Button, Card, CardHeader, PageHeader, Pill, cn, fmtNum } from "@/components/ui";
import { STRATEGIES, runBacktest, type BacktestResult, type StrategyId } from "@/core/backtest";
import { syntheticSeries } from "@/core/market";
import type { AssetClass } from "@/core/types";

const ASSETS: { id: AssetClass; label: string; icon: string; example: string }[] = [
  { id: "equities", label: "US Equities", icon: "🏛️", example: "SPY-like" },
  { id: "options", label: "Equity Options", icon: "🎟️", example: "Underlying proxy" },
  { id: "futures", label: "CME Futures", icon: "🛢️", example: "ES-like" },
  { id: "crypto", label: "Crypto", icon: "🪙", example: "BTC-like" },
  { id: "forex", label: "Forex", icon: "💱", example: "EURUSD-like" },
];

export default function BacktestPage() {
  const [strategy, setStrategy] = useState<StrategyId>("breakout");
  const def = STRATEGIES.find((s) => s.id === strategy)!;
  const [params, setParams] = useState<Record<string, number>>(Object.fromEntries(def.params.map((p) => [p.key, p.default])));
  const [selected, setSelected] = useState<AssetClass[]>(ASSETS.map((a) => a.id));
  const [results, setResults] = useState<BacktestResult[] | null>(null);
  const [focus, setFocus] = useState<AssetClass>("crypto");
  const [seed, setSeed] = useState(1);

  function pickStrategy(id: StrategyId) {
    setStrategy(id);
    const d = STRATEGIES.find((s) => s.id === id)!;
    setParams(Object.fromEntries(d.params.map((p) => [p.key, p.default])));
    setResults(null);
  }
  function run() {
    const res = selected.map((a) => runBacktest(syntheticSeries(a, 900, seed), strategy, params, a));
    setResults(res);
    setFocus([...res].sort((x, y) => y.netPct - x.netPct)[0]?.asset ?? "crypto");
  }
  const focused = results?.find((r) => r.asset === focus);
  const robust = useMemo(() => (results ? results.filter((r) => r.profitFactor > 1.1).length : 0), [results]);

  return (
    <div>
      <PageHeader title="Backtest Lab" subtitle="Stress-test a strategy across US equities, options, CME futures, crypto and forex before risking a dollar." />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="self-start p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[.08em] text-muted">1 · Strategy</div>
          <div className="mt-2 space-y-2">
            {STRATEGIES.map((s) => (
              <button key={s.id} onClick={() => pickStrategy(s.id)} className={cn("w-full cursor-pointer rounded-lg border p-3 text-left transition", strategy === s.id ? "border-accent/50 bg-accent/5" : "border-line hover:border-line-strong")}>
                <div className="text-sm font-semibold">{s.icon} {s.name}</div>
                <div className="mt-0.5 text-[11px] text-muted">{s.description}</div>
              </button>
            ))}
          </div>
          <div className="mt-5 text-[11px] font-semibold uppercase tracking-[.08em] text-muted">2 · Parameters</div>
          <div className="mt-2 space-y-3">
            {def.params.map((p) => (
              <div key={p.key}>
                <div className="flex justify-between text-xs"><span>{p.label}</span><span className="num font-semibold text-accent">{params[p.key]}</span></div>
                <input type="range" min={p.min} max={p.max} step={p.step} value={params[p.key]} onChange={(e) => setParams({ ...params, [p.key]: +e.target.value })} className="w-full" aria-label={p.label} />
              </div>
            ))}
          </div>
          <div className="mt-5 text-[11px] font-semibold uppercase tracking-[.08em] text-muted">3 · Markets</div>
          <div className="mt-2 grid grid-cols-1 gap-1.5">
            {ASSETS.map((a) => (
              <label key={a.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm", selected.includes(a.id) ? "border-line-strong bg-surface-2" : "border-line text-muted")}>
                <input type="checkbox" checked={selected.includes(a.id)} onChange={() => setSelected(selected.includes(a.id) ? selected.filter((x) => x !== a.id) : [...selected, a.id])} className="accent-[#c8f53b]" />
                {a.icon} {a.label}
                <span className="ml-auto text-[10px] text-faint">{a.example}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>Data scenario</span>
            <div className="flex gap-1">{[1, 2, 3].map((n) => <button key={n} onClick={() => setSeed(n)} className={cn("num h-7 w-7 cursor-pointer rounded-md border text-xs", seed === n ? "border-accent/60 text-accent" : "border-line")}>{n}</button>)}</div>
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={run} disabled={!selected.length}><Play size={16} /> Run backtest</Button>
          <p className="mt-3 text-[11px] text-faint">Next-bar fills, 1% risk per trade, 5 bps fees + 3 bps slippage. Prototype runs on regime-switching synthetic data; live build plugs in Polygon/Databento + exchange history.</p>
        </Card>

        <div className="space-y-4">
          {!results ? (
            <Card className="flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
              <div className="text-5xl">🧪</div>
              <div className="mt-3 font-display text-xl font-semibold">Pick a strategy and hit Run</div>
              <p className="mt-1 max-w-md text-sm text-muted">A robust edge works across markets. If it only works on one, it might be curve-fit.</p>
            </Card>
          ) : (
            <>
              <Card className={cn("flex items-center gap-4 p-4", robust >= Math.ceil(results.length * 0.6) ? "border-profit/30" : "border-gold/30")}>
                <div className="text-3xl">{robust >= Math.ceil(results.length * 0.6) ? "🛡️" : "⚠️"}</div>
                <div>
                  <div className="font-semibold">Robustness: profitable (PF &gt; 1.1) in {robust} of {results.length} markets</div>
                  <div className="text-xs text-muted">{robust >= Math.ceil(results.length * 0.6) ? "The edge generalises. Worth forward-testing as a weapon." : "Edge is fragile. Tweak parameters or restrict to the markets where it works."}</div>
                </div>
              </Card>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead><tr className="border-b border-line text-left text-[10px] uppercase tracking-wider text-faint"><th className="px-4 py-3">Market</th><th className="text-right">Net</th><th className="text-right">CAGR</th><th className="text-right">Max DD</th><th className="text-right">Trades</th><th className="text-right">Win</th><th className="text-right">PF</th><th className="px-4 text-right">Avg R</th></tr></thead>
                    <tbody>
                      {results.map((r) => {
                        const a = ASSETS.find((x) => x.id === r.asset)!;
                        return (
                          <tr key={r.asset} onClick={() => setFocus(r.asset)} className={cn("cursor-pointer border-b border-line/60 last:border-0 hover:bg-surface-2", focus === r.asset && "bg-surface-2")}>
                            <td className="px-4 py-3 font-medium">{a.icon} {a.label}</td>
                            <td className={cn("num text-right font-semibold", r.netPct >= 0 ? "text-profit" : "text-loss")}>{r.netPct >= 0 ? "+" : ""}{r.netPct.toFixed(1)}%</td>
                            <td className="num text-right">{r.cagr.toFixed(1)}%</td>
                            <td className="num text-right text-loss">-{r.maxDdPct.toFixed(1)}%</td>
                            <td className="num text-right text-muted">{r.trades.length}</td>
                            <td className="num text-right">{Math.round(r.winRate * 100)}%</td>
                            <td className="num text-right">{r.profitFactor > 1.1 ? <Pill tone="profit">{fmtNum(r.profitFactor)}</Pill> : <Pill tone="loss">{fmtNum(r.profitFactor)}</Pill>}</td>
                            <td className="num px-4 text-right">{r.avgR.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              {focused && (
                <Card>
                  <CardHeader title={`Equity curve · ${ASSETS.find((a) => a.id === focused.asset)?.label}`} subtitle="$10,000 start · click a row above to switch market" />
                  <div className="px-2 pb-3"><SimpleEquity data={focused.equity} height={280} color={focused.netPct >= 0 ? "#2fe39a" : "#ff5470"} /></div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
