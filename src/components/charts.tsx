"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/core/currency";
import { useStore } from "@/lib/store";
import { cn, fmtDate } from "./ui";

const AXIS = { stroke: "#566275", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = { stroke: "#1d2633", strokeDasharray: "0", vertical: false } as const;

function TipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line-strong bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">{children}</div>;
}

export function EquityChart({ data, height = 280 }: { data: { i: number; date: string; equity: number; drawdown: number }[]; height?: number }) {
  const ccy = useStore((s) => s.currency);
  const up = data.length > 1 && data[data.length - 1].equity >= data[0].equity;
  const color = up ? "#2fe39a" : "#ff5470";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="date" {...AXIS} tickFormatter={(d) => fmtDate(d)} minTickGap={40} />
        <YAxis {...AXIS} width={64} domain={["auto", "auto"]} tickFormatter={(v) => formatMoney(v, ccy, { compact: true })} />
        <Tooltip
          cursor={{ stroke: "#2a3647" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="text-muted">Trade #{payload[0].payload.i} · {fmtDate(payload[0].payload.date)}</div>
                <div className="num mt-0.5 font-semibold">{formatMoney(payload[0].payload.equity, ccy)}</div>
                {payload[0].payload.drawdown < 0 && <div className="num text-loss">DD {formatMoney(payload[0].payload.drawdown, ccy)}</div>}
              </TipBox>
            ) : null
          }
        />
        <Area type="monotone" dataKey="equity" stroke={color} strokeWidth={2} fill="url(#eq)" dot={false} activeDot={{ r: 4, stroke: "#0c1016", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DrawdownChart({ data, height = 120 }: { data: { i: number; date: string; drawdown: number }[]; height?: number }) {
  const ccy = useStore((s) => s.currency);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="date" hide />
        <YAxis {...AXIS} width={64} tickFormatter={(v) => formatMoney(v, ccy, { compact: true })} />
        <Tooltip content={({ active, payload }) => (active && payload?.length ? <TipBox><div className="num text-loss">{formatMoney(payload[0].payload.drawdown, ccy)}</div></TipBox> : null)} />
        <Area type="monotone" dataKey="drawdown" stroke="#ff5470" strokeWidth={1.5} fill="#ff5470" fillOpacity={0.12} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Diverging bars: profit above zero, loss below. Position + color both encode sign. */
export function PnlBars<T extends Record<string, unknown>>({ data, x, y = "pnl", height = 220, money = true, extra, allTicks }: { data: T[]; x: keyof T & string; y?: keyof T & string; height?: number; money?: boolean; extra?: (row: T) => React.ReactNode; allTicks?: boolean }) {
  const ccy = useStore((s) => s.currency);
  const fmt = (v: number) => (money ? formatMoney(v, ccy, { compact: true }) : v.toFixed(2));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={x as string} {...AXIS} interval={allTicks ? 0 : "preserveStartEnd"} fontSize={allTicks ? 10 : 11} />
        <YAxis {...AXIS} width={64} tickFormatter={fmt} />
        <ReferenceLine y={0} stroke="#2a3647" />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,.03)" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipBox>
                <div className="text-muted">{String(payload[0].payload[x])}</div>
                <div className={cn("num font-semibold", (payload[0].value as number) >= 0 ? "text-profit" : "text-loss")}>{money ? formatMoney(payload[0].value as number, ccy, { sign: true }) : fmt(payload[0].value as number)}</div>
                {extra?.(payload[0].payload as T)}
              </TipBox>
            ) : null
          }
        />
        <Bar dataKey={y as string} radius={[4, 4, 4, 4]} maxBarSize={36}>
          {data.map((d, i) => (
            <Cell key={i} fill={(d[y] as number) >= 0 ? "#2fe39a" : "#ff5470"} fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CountBars({ data, x, y, height = 200, color = "#a78bfa" }: { data: Record<string, unknown>[]; x: string; y: string; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={x} {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }} content={({ active, payload }) => (active && payload?.length ? <TipBox><div className="text-muted">{String(payload[0].payload[x])}</div><div className="num font-semibold">{String(payload[0].value)} trades</div></TipBox> : null)} />
        <Bar dataKey={y} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ScoreRadar({ data, height = 260 }: { data: { axis: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#1d2633" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "#8593a5", fontSize: 11 }} />
        <Tooltip content={({ active, payload }) => (active && payload?.length ? <TipBox><div className="text-muted">{String(payload[0].payload.axis)}</div><div className="num font-semibold">{String(payload[0].value)}/100</div></TipBox> : null)} />
        <Radar dataKey="value" stroke="#c8f53b" strokeWidth={2} fill="#c8f53b" fillOpacity={0.15} dot={{ r: 3, fill: "#c8f53b" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function SimpleEquity({ data, height = 220, color = "#c8f53b" }: { data: { time: number; equity: number }[]; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="time" {...AXIS} tickFormatter={(t) => new Date(t * 1000).toLocaleDateString("en-US", { month: "short", year: "2-digit" })} minTickGap={50} />
        <YAxis {...AXIS} width={56} domain={["auto", "auto"]} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
        <Tooltip content={({ active, payload }) => (active && payload?.length ? <TipBox><div className="text-muted">{new Date((payload[0].payload.time as number) * 1000).toLocaleDateString()}</div><div className="num font-semibold">${(payload[0].value as number).toFixed(0)}</div></TipBox> : null)} />
        <Area type="monotone" dataKey="equity" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.08} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** GitHub-style P&L calendar. Diverging: green profit, red loss, neutral gray for flat/no trades. */
export function PnlCalendar({ days, weeks = 12 }: { days: { date: string; pnl: number; count: number }[]; weeks?: number }) {
  const ccy = useStore((s) => s.currency);
  const map = new Map(days.map((d) => [d.date, d]));
  const max = Math.max(1, ...days.map((d) => Math.abs(d.pnl)));
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (weeks * 7 - 1) * 86400000);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const cols: { date: string; d?: { pnl: number; count: number } }[][] = [];
  for (let w = 0; w < weeks + 1; w++) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(start.getTime() + (w * 7 + i) * 86400000);
      if (dt > end) break;
      const key = dt.toISOString().slice(0, 10);
      col.push({ date: key, d: map.get(key) });
    }
    if (col.length) cols.push(col);
  }
  const color = (pnl: number) => {
    const a = 0.18 + 0.82 * Math.min(1, Math.abs(pnl) / max);
    return pnl >= 0 ? `rgba(47,227,154,${a})` : `rgba(255,84,112,${a})`;
  };
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        <div className="mr-1 flex flex-col gap-[3px] text-[9px] text-faint">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="flex h-[15px] items-center">{i % 2 ? d : ""}</div>
          ))}
        </div>
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((c) => (
              <div key={c.date} className="group relative h-[15px] w-[15px] rounded-[3px]" style={{ background: c.d ? color(c.d.pnl) : "#141a22" }}>
                <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-[11px] shadow-xl group-hover:block">
                  <div className="text-muted">{fmtDate(c.date + "T12:00:00Z")}</div>
                  {c.d ? <div className={cn("num font-semibold", c.d.pnl >= 0 ? "text-profit" : "text-loss")}>{formatMoney(c.d.pnl, ccy, { sign: true })} · {c.d.count} trades</div> : <div className="text-faint">No trades</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-faint">
        Loss
        {[1, 0.6, 0.3].map((a) => <span key={"l" + a} className="h-2.5 w-2.5 rounded-sm" style={{ background: `rgba(255,84,112,${a})` }} />)}
        <span className="h-2.5 w-2.5 rounded-sm bg-surface-2" />
        {[0.3, 0.6, 1].map((a) => <span key={"p" + a} className="h-2.5 w-2.5 rounded-sm" style={{ background: `rgba(47,227,154,${a})` }} />)}
        Profit
      </div>
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 6, color = "#c8f53b", children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#18202b" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} style={{ transition: "stroke-dashoffset .8s" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
