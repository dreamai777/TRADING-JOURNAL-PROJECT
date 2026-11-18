"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, Money, PageHeader, Pill, Select, Stat, cn, fmtDate } from "@/components/ui";
import { traderProgress } from "@/core/game";
import { computeAll, summarize } from "@/core/stats";
import type { Role } from "@/core/types";
import { useMe, useStore } from "@/lib/store";

const FLAGS = [
  { id: "ai-coach-llm", label: "Claude-powered coach", note: "Swap rule engine for LLM insights", on: false },
  { id: "prop-firms", label: "Prop firm connectors", note: "Breakout and others (beta)", on: false },
  { id: "social-feed", label: "Community feed", note: "Public trade shares + leaderboards", on: false },
  { id: "courses", label: "Academy / courses", note: "Lessons unlocked by rank", on: false },
  { id: "backtest-real-data", label: "Backtest on real market data", note: "Polygon / Databento", on: true },
];

export default function AdminPage() {
  const me = useMe();
  const router = useRouter();
  const users = useStore((s) => s.users);
  const trades = useStore((s) => s.trades);
  const setRole = useStore((s) => s.adminSetRole);
  const setStatus = useStore((s) => s.adminSetStatus);
  const [flags, setFlags] = useState(FLAGS);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (me && me.role !== "admin") router.replace("/dashboard");
  }, [me, router]);

  const rows = useMemo(
    () =>
      users.map((u) => {
        const ts = computeAll(trades.filter((t) => t.userId === u.id));
        return { u, s: summarize(ts, u.accountSize), p: traderProgress(ts) };
      }),
    [users, trades],
  );
  if (!me || me.role !== "admin") return null;
  const weekAgo = now - 7 * 86400000;
  const active = new Set(trades.filter((t) => Date.parse(t.closedAt) > weekAgo).map((t) => t.userId)).size;

  return (
    <div>
      <PageHeader title="Admin console" subtitle="Users, roles, platform health and feature flags." right={<Pill tone="gold">Admin</Pill>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={users.length} sub={`${users.filter((u) => u.role === "admin").length} admins`} />
        <Stat label="Active (7d)" value={active} sub={`${Math.round((active / users.length) * 100)}% of users`} />
        <Stat label="Trades journaled" value={trades.length.toLocaleString()} sub="all users" />
        <Stat label="Suspended" value={users.filter((u) => u.status === "suspended").length} />
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Users" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead><tr className="border-y border-line text-left text-[10px] uppercase tracking-wider text-faint"><th className="px-5 py-3">Trader</th><th>Rank</th><th className="text-right">Trades</th><th className="text-right">Net P&L</th><th>Joined</th><th>Role</th><th className="px-5">Status</th></tr></thead>
            <tbody>
              {rows.map(({ u, s, p }) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="text-xl">{u.avatar}</span><div><div className="font-semibold">{u.name}</div><div className="text-[11px] text-muted">{u.email}</div></div></div></td>
                  <td><span className="text-xs font-semibold" style={{ color: p.rank.color }}>Lv {p.level} {p.rank.name}</span></td>
                  <td className="num text-right">{s.count}</td>
                  <td className="text-right"><Money usd={s.netPnl} sign compact /></td>
                  <td className="text-muted">{fmtDate(u.createdAt)}</td>
                  <td>
                    <Select value={u.role} disabled={u.id === me.id} onChange={(e) => setRole(u.id, e.target.value as Role)} className="h-8 w-28 text-xs">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </td>
                  <td className="px-5">
                    <button disabled={u.id === me.id} onClick={() => setStatus(u.id, u.status === "active" ? "suspended" : "active")} className={cn("cursor-pointer rounded-md px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40", u.status === "active" ? "bg-profit/12 text-profit" : "bg-loss/12 text-loss")}>
                      {u.status === "active" ? "Active" : "Suspended"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Feature flags" subtitle="Roll features out gradually" />
        <div className="divide-y divide-line px-5 pb-3">
          {flags.map((f) => (
            <label key={f.id} className="flex cursor-pointer items-center justify-between py-3">
              <div><div className="text-sm font-semibold">{f.label}</div><div className="text-xs text-muted">{f.note}</div></div>
              <button type="button" role="switch" aria-checked={f.on} onClick={() => setFlags(flags.map((x) => (x.id === f.id ? { ...x, on: !x.on } : x)))} className={cn("relative h-6 w-11 cursor-pointer rounded-full transition", f.on ? "bg-accent" : "bg-surface-3")}>
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", f.on ? "left-[22px]" : "left-0.5")} />
              </button>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
