"use client";
import { CandlestickSeries, ColorType, createChart, createSeriesMarkers, LineSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { replayCandles } from "@/core/market";
import type { TradeComputed } from "@/core/types";
import { Button, Segmented, fmtPrice } from "./ui";

export function TradeReplay({ trade }: { trade: TradeComputed }) {
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const { candles, entryIndex, exitIndex } = useMemo(() => replayCandles(trade), [trade]);
  const [cursor, setCursor] = useState(entryIndex - 10);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<"1" | "2" | "4">("2");

  useEffect(() => {
    if (!box.current) return;
    const chart = createChart(box.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#8593a5", fontFamily: "var(--font-mono)" },
      grid: { vertLines: { color: "#141a22" }, horzLines: { color: "#141a22" } },
      rightPriceScale: { borderColor: "#1d2633" },
      timeScale: { borderColor: "#1d2633", timeVisible: true },
      crosshair: { mode: 0 },
    });
    const s = chart.addSeries(CandlestickSeries, { upColor: "#2fe39a", downColor: "#ff5470", borderVisible: false, wickUpColor: "#2fe39a", wickDownColor: "#ff5470" });
    if (trade.stopLoss != null) s.createPriceLine({ price: trade.stopLoss, color: "#ff5470", lineStyle: 2, lineWidth: 1, title: "SL" });
    if (trade.takeProfit != null) s.createPriceLine({ price: trade.takeProfit, color: "#2fe39a", lineStyle: 2, lineWidth: 1, title: "TP" });
    s.createPriceLine({ price: trade.entry, color: "#c8f53b", lineStyle: 0, lineWidth: 1, title: "Entry" });
    const line = chart.addSeries(LineSeries, { color: "rgba(167,139,250,.6)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    // 9-period moving average to give the replay context
    lineRef.current = line;
    chartRef.current = chart;
    seriesRef.current = s;
    return () => chart.remove();
  }, [candles, trade]);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    const visible = candles.slice(0, cursor + 1).map((c) => ({ ...c, time: c.time as UTCTimestamp }));
    s.setData(visible);
    // no look-ahead: the MA only exists up to the replay cursor
    lineRef.current?.setData(visible.map((c, i) => ({ time: c.time, value: visible.slice(Math.max(0, i - 8), i + 1).reduce((a, b) => a + b.close, 0) / Math.min(i + 1, 9) })));
    const markers = [];
    if (cursor >= entryIndex) markers.push({ time: candles[entryIndex].time as UTCTimestamp, position: trade.side === "long" ? ("belowBar" as const) : ("aboveBar" as const), color: "#c8f53b", shape: trade.side === "long" ? ("arrowUp" as const) : ("arrowDown" as const), text: `${trade.side.toUpperCase()} @ ${fmtPrice(trade.entry)}` });
    if (cursor >= exitIndex) markers.push({ time: candles[exitIndex].time as UTCTimestamp, position: "aboveBar" as const, color: trade.pnl >= 0 ? "#2fe39a" : "#ff5470", shape: "circle" as const, text: `EXIT @ ${fmtPrice(trade.exit)}` });
    createSeriesMarkers(s, markers);
    chartRef.current?.timeScale().fitContent();
  }, [cursor, candles, entryIndex, exitIndex, trade]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCursor((c) => {
        if (c >= candles.length - 1) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, 420 / +speed);
    return () => clearInterval(id);
  }, [playing, speed, candles.length]);

  const phase = cursor < entryIndex ? "Pre-entry: what did you see?" : cursor < exitIndex ? "In trade: manage the position" : "Post-exit: what happened next?";
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted">
          <span className="font-semibold text-ink">{phase}</span> · bar {cursor + 1}/{candles.length}
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={speed} onChange={setSpeed} options={[{ value: "1", label: "1×" }, { value: "2", label: "2×" }, { value: "4", label: "4×" }]} />
          <Button size="sm" variant="outline" onClick={() => { setCursor(entryIndex - 10); setPlaying(false); }} aria-label="Restart"><RotateCcw size={14} /></Button>
          <Button size="sm" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause" : "Play"}</Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(Math.min(candles.length - 1, cursor + 1))} aria-label="Step"><SkipForward size={14} /></Button>
        </div>
      </div>
      <div ref={box} className="h-[340px] w-full rounded-lg border border-line bg-bg" />
      <input type="range" min={0} max={candles.length - 1} value={cursor} onChange={(e) => setCursor(+e.target.value)} className="mt-3 w-full" aria-label="Replay position" />
      <p className="mt-2 text-[11px] text-faint">Prototype replay uses candles generated through your real entry/exit. Live builds pull real klines from the exchange.</p>
    </div>
  );
}
