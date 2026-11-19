"use client";
import { CheckCircle2, Hand, Lock, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, CardHeader, Input, Label, Modal, PageHeader, Pill, Segmented, fmtDateTime } from "@/components/ui";
import { EXCHANGES, MARKETS, displaySymbol, type CryptoMarket, type ExchangeInfo } from "@/core/markets";
import { PLAN_LIMITS, normalizePlan } from "@/core/plans";
import { useJournal } from "@/lib/hooks";
import { useStore, type Connection } from "@/lib/store";

const SOON = [
  { name: "Breakout (prop)", note: "Prop firm accounts", icon: "🏆" },
  { name: "Other prop firms", note: "Futures & forex evaluations", icon: "🎯" },
  { name: "MetaTrader 4/5", note: "Forex & CFDs", icon: "📊" },
  { name: "Interactive Brokers", note: "Stocks, options, futures", icon: "🏛️" },
  { name: "TradingView", note: "Paper & broker fills", icon: "📈" },
  { name: "Hyperliquid & DEXs", note: "On-chain perps by wallet", icon: "⛓️" },
  { name: "Coinbase & Kraken", note: "Crypto exchanges", icon: "🪙" },
  { name: "Tradovate / Rithmic", note: "CME futures", icon: "🛢️" },
];

const WAYS = [
  { icon: Hand, title: "Manual", body: "Type a trade in one line with Quick Snap, e.g. \"ray.p long 1.92 2.05 500 10x\". Works for any exchange, wallet or broker." },
  { icon: RefreshCw, title: "CSV import", body: "Drop the trade history export from Binance, OKX, Bitget or Bybit. Symbols like SOL-USDT-SWAP become SOLUSDT.P automatically." },
  { icon: Zap, title: "Auto-sync", body: "Connect a read-only API key and fills arrive by themselves, split into spot, perpetuals, futures, margin and bot trades." },
];

export default function ConnectionsPage() {
  const { me } = useJournal();
  const connections = useStore((s) => s.connections).filter((c) => c.userId === me?.id);
  const [open, setOpen] = useState<ExchangeInfo | null>(null);
  const [syncMsg, setSyncMsg] = useState("");
  const plan = normalizePlan(me?.plan);
  const limit = PLAN_LIMITS[plan].syncAccounts;
  const atLimit = connections.length >= limit;

  return (
    <div>
      <PageHeader title="Connections" subtitle="Journal by hand, import a CSV, or let your exchange sync for you. Read-only keys, no trading or withdrawal permissions, ever." />
      {syncMsg && <div className="mb-4 flex items-center gap-2 rounded-lg border border-profit/30 bg-profit/10 px-4 py-2.5 text-sm text-profit"><CheckCircle2 size={16} /> {syncMsg}</div>}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {WAYS.map((w) => (
          <div key={w.title} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2 font-display font-semibold"><w.icon size={16} className="text-accent" /> {w.title}</div>
            <p className="mt-1 text-xs text-muted">{w.body}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Synced accounts: <b className="text-ink">{connections.length}</b> of {Number.isFinite(limit) ? limit : "unlimited"} on your plan</span>
        {plan === "free" && <Link href="/pricing" className="font-semibold text-accent">Premium: 5 accounts, real-time sync, every market →</Link>}
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {EXCHANGES.map((ex) => {
          const c = connections.find((x) => x.exchange === ex.id);
          return (
            <Card key={ex.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line-strong bg-surface-3 font-display text-lg font-bold" style={{ color: ex.color }}>{ex.mark}</div>
                  <div>
                    <div className="font-display text-lg font-semibold">{ex.name}</div>
                    <div className="whitespace-nowrap text-[11px] text-muted">{ex.markets.length} market types</div>
                  </div>
                </div>
                {c ? <Pill tone="profit">● {c.mode === "manual" ? "Manual" : "Live"}</Pill> : <Pill>Not connected</Pill>}
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {ex.markets.map((m) => {
                  const on = c ? (c.markets ?? ["spot", "perp"]).includes(m) : MARKETS[m].free;
                  return <span key={m} className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ color: on ? MARKETS[m].color : "var(--faint)", background: on ? `${MARKETS[m].color}1c` : "transparent", border: `1px solid ${on ? "transparent" : "var(--line)"}` }}>{MARKETS[m].short}</span>;
                })}
              </div>
              {c ? (
                <div className="mt-4 flex flex-1 flex-col justify-end space-y-3">
                  <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
                    <div><span className="text-faint">Account:</span> {c.label}</div>
                    <div><span className="text-faint">Sync:</span> {c.mode === "manual" ? "when you press Sync now" : plan === "free" ? "automatic, daily" : "automatic, real-time"}</div>
                    <div><span className="text-faint">Last sync:</span> {fmtDateTime(c.lastSync)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { const n = useStore.getState().connectExchange(ex.id, c.label); setSyncMsg(`${ex.name}: ${n} new trades synced.`); }}><RefreshCw size={13} /> Sync now</Button>
                    <Button variant="ghost" size="sm" onClick={() => setOpen(ex)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => useStore.getState().disconnectExchange(ex.id)}>Disconnect</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-1 flex-col justify-end">
                  <Button className="w-full" disabled={atLimit} onClick={() => setOpen(ex)}>{atLimit ? <><Lock size={14} /> Plan limit reached</> : `Connect ${ex.name}`}</Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader title="How symbols look in your journal" subtitle="Every exchange names instruments differently. EdgeForge shows them all the same way and keeps the exchange's own id for matching fills." />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="py-2">Market</th><th>In your journal</th><th>OKX id</th><th>Binance id</th></tr></thead>
            <tbody>
              {(["spot", "perp", "futures", "margin", "grid", "dca", "copy"] as CryptoMarket[]).map((m) => (
                <tr key={m} className="border-t border-line/60">
                  <td className="py-2"><span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ color: MARKETS[m].color, background: `${MARKETS[m].color}1c` }}>{MARKETS[m].short}</span> <span className="ml-1 text-muted">{MARKETS[m].name}</span></td>
                  <td className="font-mono font-semibold">{displaySymbol(m === "futures" ? "BTC" : "SOL", "USDT", m, m === "futures" ? "2026-03-27" : undefined)}</td>
                  <td className="font-mono text-xs text-muted">{m === "perp" || m === "copy" ? "SOL-USDT-SWAP" : m === "futures" ? "BTC-USDT-260327" : "SOL-USDT"}</td>
                  <td className="font-mono text-xs text-muted">{m === "futures" ? "BTCUSDT_260327" : "SOLUSDT"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Coming next" subtitle="On the roadmap. Vote on the Roadmap page." />
        <div className="grid grid-cols-2 gap-3 px-5 pb-5 md:grid-cols-4">
          {SOON.map((s) => (
            <div key={s.name} className="rounded-xl border border-line bg-surface-2 p-3">
              <div className="text-2xl">{s.icon}</div>
              <div className="mt-1.5 text-sm font-semibold">{s.name}</div>
              <div className="text-[11px] text-muted">{s.note}</div>
            </div>
          ))}
        </div>
      </Card>

      {open && <ConnectModal ex={open} existing={connections.find((c) => c.exchange === open.id)} paid={plan !== "free"} onClose={() => setOpen(null)} onDone={(msg) => { setSyncMsg(msg); setOpen(null); }} />}
    </div>
  );
}

function ConnectModal({ ex, existing, paid, onClose, onDone }: { ex: ExchangeInfo; existing?: Connection; paid: boolean; onClose: () => void; onDone: (msg: string) => void }) {
  const [label, setLabel] = useState(existing?.label ?? "Main account");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState<"auto" | "manual">(existing?.mode ?? "auto");
  const [markets, setMarkets] = useState<CryptoMarket[]>(existing?.markets ?? ex.markets.filter((m) => MARKETS[m].free || paid));
  const [busy, setBusy] = useState(false);
  const valid = markets.length > 0 && (existing || (key.length >= 8 && secret.length >= 8 && (!ex.passphrase || pass.length > 0)));
  const toggle = (m: CryptoMarket) => setMarkets((v) => (v.includes(m) ? v.filter((x) => x !== m) : [...v, m]));
  const save = () => {
    if (existing) {
      useStore.getState().updateConnection(ex.id, { label, mode, markets });
      onDone(`${ex.name} settings saved.`);
      return;
    }
    setBusy(true);
    setTimeout(() => onDone(`${ex.name} connected. ${useStore.getState().connectExchange(ex.id, label, { mode, markets })} trades imported. Tag them with setups to earn XP.`), 900);
  };
  return (
    <Modal open onClose={onClose} title={existing ? `${ex.name} settings` : `Connect ${ex.name}`}>
      <div className="space-y-4">
        {!existing && (
          <div className="flex gap-3 rounded-lg border border-profit/25 bg-profit/5 p-3 text-xs text-muted">
            <ShieldCheck size={18} className="shrink-0 text-profit" />
            <div>Create a <b className="text-ink">read-only</b> API key in {ex.name} → API Management. Leave trading and withdrawals <b className="text-ink">disabled</b>. Keys are encrypted at rest and only used server-side to fetch fills.</div>
          </div>
        )}
        <div><Label>Account label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        {!existing && <>
          <div><Label>API key</Label><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste API key" className="font-mono" /></div>
          <div><Label>API secret</Label><Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Paste secret" className="font-mono" /></div>
          {ex.passphrase && <div><Label>Passphrase</Label><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>}
        </>}
        <div>
          <Label hint="What to journal from this account">Markets</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {ex.markets.map((m) => {
              const locked = !MARKETS[m].free && !paid;
              const on = markets.includes(m);
              return (
                <button key={m} type="button" disabled={locked} onClick={() => toggle(m)} title={MARKETS[m].desc} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition ${on ? "border-transparent bg-surface-3" : "border-line"} ${locked ? "opacity-50" : "hover:border-line-strong"}`}>
                  <span><span className="font-bold" style={{ color: MARKETS[m].color }}>{MARKETS[m].short}</span> <span className="text-muted">{MARKETS[m].name}</span></span>
                  {locked ? <Lock size={12} className="text-faint" /> : <span className={`h-3.5 w-3.5 rounded border ${on ? "border-accent bg-accent" : "border-line-strong"}`} />}
                </button>
              );
            })}
          </div>
          {!paid && <p className="mt-1.5 text-[11px] text-faint">Spot and perpetuals are free. <Link href="/pricing" className="text-accent">Premium</Link> adds dated futures, margin, grid and DCA bots, copy trading and options.</p>}
        </div>
        <div>
          <Label>Sync</Label>
          <Segmented value={mode} onChange={setMode} className="w-full" options={[{ value: "auto", label: paid ? "Auto (real-time)" : "Auto (daily)" }, { value: "manual", label: "Only when I press Sync" }]} />
        </div>
        <Button className="w-full" disabled={!valid || busy} onClick={save}>
          {busy ? <><RefreshCw size={15} className="animate-spin" /> Syncing…</> : existing ? "Save settings" : <><Lock size={15} /> Connect & sync</>}
        </Button>
        {!existing && <p className="text-center text-[11px] text-faint">Prototype: keys are not sent anywhere; a simulated sync imports sample fills.</p>}
      </div>
    </Modal>
  );
}
