"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney } from "@/core/currency";
import { calendarDays, localDay, type CalendarDay } from "@/core/stats";
import type { TradeComputed } from "@/core/types";
import { useStore } from "@/lib/store";
import { Card, Segmented, cn } from "./ui";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monthly trading calendar: green win days, red loss days, gray no-trade days, with money and % per day and week. */
export function MonthCalendar({ trades, account }: { trades: TradeComputed[]; account: number }) {
  const ccy = useStore((s) => s.currency);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [show, setShow] = useState<"money" | "pct">("money");
  const days = useMemo(() => calendarDays(trades, account), [trades, account]);
  const today = localDay(new Date());

  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const inMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (null | { key: string; day: number; d?: CalendarDay })[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let i = 1; i <= inMonth; i++) {
    const key = localDay(new Date(cursor.y, cursor.m, i));
    cells.push({ key, day: i, d: days.get(key) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const monthDays = cells.filter((c): c is NonNullable<typeof c> => !!c);
  const traded = monthDays.filter((c) => c.d);
  const winDays = traded.filter((c) => c.d!.pnl > 0).length;
  const lossDays = traded.filter((c) => c.d!.pnl <= 0).length;
  const pastDays = monthDays.filter((c) => c.key <= today).length;
  const noTrade = pastDays - traded.length;
  const monthPnl = traded.reduce((a, c) => a + c.d!.pnl, 0);
  // compound the daily % returns for the month
  const monthPct = traded.reduce((a, c) => a * (1 + c.d!.pct), 1) - 1;
  const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
  const label = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const move = (n: number) => setCursor(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  return (
    <Card>
      <div className="flex flex-col gap-3 px-5 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="cursor-pointer rounded-md border border-line p-1.5 text-muted hover:text-ink" aria-label="Previous month"><ChevronLeft size={15} /></button>
          <div className="min-w-[150px] text-center font-display text-base font-semibold">{label}</div>
          <button onClick={() => move(1)} className="cursor-pointer rounded-md border border-line p-1.5 text-muted hover:text-ink" aria-label="Next month"><ChevronRight size={15} /></button>
          <button onClick={() => { const d = new Date(); setCursor({ y: d.getFullYear(), m: d.getMonth() }); }} className="ml-1 cursor-pointer text-xs font-semibold text-accent">Today</button>
        </div>
        <Segmented value={show} onChange={setShow} options={[{ value: "money", label: ccy }, { value: "pct", label: "%" }]} />
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 pb-4 sm:grid-cols-5">
        <Summary label="Month P&L" value={formatMoney(monthPnl, ccy, { sign: true })} tone={monthPnl >= 0 ? "profit" : "loss"} />
        <Summary label="Return" value={fmtPct(monthPct)} tone={monthPct >= 0 ? "profit" : "loss"} />
        <Summary label="Win days" value={String(winDays)} tone="profit" dot="#2fe39a" />
        <Summary label="Loss days" value={String(lossDays)} tone="loss" dot="#ff5470" />
        <Summary label="No-trade days" value={String(Math.max(0, noTrade))} dot="#566275" />
      </div>

      <div className="overflow-x-auto px-3 pb-4 sm:px-5">
        <div className="grid min-w-[640px] grid-cols-[repeat(7,1fr)_1.1fr] gap-1.5">
          {WEEKDAYS.map((d) => <div key={d} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-faint">{d}</div>)}
          <div className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-faint">Week</div>
          {weeks.map((w, wi) => {
            const wd = w.filter((c) => c?.d).map((c) => c!.d!);
            const wPnl = wd.reduce((a, d) => a + d.pnl, 0);
            const wPct = wd.reduce((a, d) => a * (1 + d.pct), 1) - 1;
            return [
              ...w.map((c, ci) => {
                if (!c) return <div key={`e${wi}${ci}`} className="h-[76px] rounded-lg" />;
                const d = c.d;
                const future = c.key > today;
                const win = d && d.pnl > 0;
                return (
                  <div
                    key={c.key}
                    title={d ? `${d.count} trades · ${d.wins}W ${d.losses}L` : future ? "" : "No trades"}
                    className={cn(
                      "relative flex h-[76px] flex-col rounded-lg border p-1.5 text-[11px]",
                      d ? (win ? "border-profit/35 bg-profit/10" : "border-loss/35 bg-loss/10") : future ? "border-line/40 bg-transparent" : "border-line bg-surface-2/60",
                      c.key === today && "ring-1 ring-accent",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("font-semibold", future ? "text-faint" : "text-muted")}>{c.day}</span>
                      {d && <span className="num text-[9.5px] text-muted">{d.count}T</span>}
                    </div>
                    {d ? (
                      <div className="mt-auto text-right">
                        <div className={cn("num text-[12px] font-bold leading-tight", win ? "text-profit" : "text-loss")}>
                          {show === "money" ? formatMoney(d.pnl, ccy, { sign: true, compact: true }) : fmtPct(d.pct)}
                        </div>
                        <div className="num text-[9.5px] text-muted">{show === "money" ? fmtPct(d.pct) : `${d.wins}W · ${d.losses}L`}</div>
                      </div>
                    ) : (
                      !future && <div className="mt-auto text-right text-[9.5px] text-faint">No trades</div>
                    )}
                  </div>
                );
              }),
              <div key={`w${wi}`} className="flex h-[76px] flex-col justify-center rounded-lg border border-line bg-surface-3/50 px-2 text-right">
                {wd.length ? (
                  <>
                    <div className={cn("num text-[12px] font-bold", wPnl >= 0 ? "text-profit" : "text-loss")}>{formatMoney(wPnl, ccy, { sign: true, compact: true })}</div>
                    <div className={cn("num text-[10px]", wPct >= 0 ? "text-profit/80" : "text-loss/80")}>{fmtPct(wPct)}</div>
                    <div className="num text-[9.5px] text-faint">{wd.length} day{wd.length > 1 ? "s" : ""}</div>
                  </>
                ) : (
                  <div className="text-[10px] text-faint">—</div>
                )}
              </div>,
            ];
          })}
        </div>
      </div>
    </Card>
  );
}

function Summary({ label, value, tone, dot }: { label: string; value: string; tone?: "profit" | "loss"; dot?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
        {dot && <span className="h-2 w-2 rounded-sm" style={{ background: dot }} />}
        {label}
      </div>
      <div className={cn("num mt-0.5 text-[15px] font-bold", tone === "profit" && "text-profit", tone === "loss" && "text-loss")}>{value}</div>
    </div>
  );
}
