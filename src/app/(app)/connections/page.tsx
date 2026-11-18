"use client";
import { CheckCircle2, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button, Card, CardHeader, Input, Label, Modal, PageHeader, Pill, fmtDateTime } from "@/components/ui";
import { useStore, type Connection } from "@/lib/store";

const EXCHANGES: { id: Connection["exchange"]; name: string; mark: string; color: string; passphrase: boolean; markets: string }[] = [
  { id: "binance", name: "Binance", mark: "B", color: "#f0b90b", passphrase: false, markets: "Spot · USDⓈ-M · COIN-M" },
  { id: "okx", name: "OKX", mark: "O", color: "#e8eef5", passphrase: true, markets: "Spot · Perps · Futures" },
  { id: "bitget", name: "Bitget", mark: "Bg", color: "#00f0ff", passphrase: true, markets: "Spot · USDT-M · Copy" },
];

const SOON = [
  { name: "Breakout (prop)", note: "Prop firm accounts", icon: "🏆" },
  { name: "Other prop firms", note: "Futures & forex evaluations", icon: "🎯" },
  { name: "Bybit", note: "Crypto exchange", icon: "🪙" },
  { name: "MetaTrader 4/5", note: "Forex & CFDs", icon: "📊" },
  { name: "Interactive Brokers", note: "Stocks, options, futures", icon: "🏛️" },
  { name: "TradingView", note: "Paper & broker fills", icon: "📈" },
  { name: "Hyperliquid & DEXs", note: "On-chain perps by wallet", icon: "⛓️" },
  { name: "Tradovate / Rithmic", note: "CME futures", icon: "🛢️" },
];

export default function ConnectionsPage() {
  const me = useStore((s) => s.sessionUserId);
  const connections = useStore((s) => s.connections).filter((c) => c.userId === me);
  const [open, setOpen] = useState<(typeof EXCHANGES)[number] | null>(null);
  const [syncMsg, setSyncMsg] = useState("");

  return (
    <div>
      <PageHeader title="Connections" subtitle="Sync trades automatically. Read-only keys, no withdrawal or trading permissions, ever." />
      {syncMsg && <div className="mb-4 flex items-center gap-2 rounded-lg border border-profit/30 bg-profit/10 px-4 py-2.5 text-sm text-profit"><CheckCircle2 size={16} /> {syncMsg}</div>}
      <div className="grid gap-4 md:grid-cols-3">
        {EXCHANGES.map((ex) => {
          const c = connections.find((x) => x.exchange === ex.id);
          return (
            <Card key={ex.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line-strong bg-surface-3 font-display text-lg font-bold" style={{ color: ex.color }}>{ex.mark}</div>
                  <div>
                    <div className="font-display text-lg font-semibold">{ex.name}</div>
                    <div className="text-[11px] text-muted">{ex.markets}</div>
                  </div>
                </div>
                {c ? <Pill tone="profit">● Live</Pill> : <Pill>Not connected</Pill>}
              </div>
              {c ? (
                <div className="mt-5 space-y-3">
                  <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
                    <div><span className="text-faint">Account:</span> {c.label}</div>
                    <div><span className="text-faint">Last sync:</span> {fmtDateTime(c.lastSync)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { const n = useStore.getState().connectExchange(ex.id, c.label); setSyncMsg(`${ex.name}: ${n} new trades synced.`); }}><RefreshCw size={13} /> Sync now</Button>
                    <Button variant="ghost" size="sm" onClick={() => useStore.getState().disconnectExchange(ex.id)}>Disconnect</Button>
                  </div>
                </div>
              ) : (
                <Button className="mt-5 w-full" onClick={() => setOpen(ex)}>Connect {ex.name}</Button>
              )}
            </Card>
          );
        })}
      </div>

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

      {open && <ConnectModal ex={open} onClose={() => setOpen(null)} onDone={(n) => { setSyncMsg(`${open.name} connected. ${n} trades imported. Tag them with setups to earn XP.`); setOpen(null); }} />}
    </div>
  );
}

function ConnectModal({ ex, onClose, onDone }: { ex: (typeof EXCHANGES)[number]; onClose: () => void; onDone: (n: number) => void }) {
  const [label, setLabel] = useState("Main account");
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = key.length >= 8 && secret.length >= 8 && (!ex.passphrase || pass.length > 0);
  return (
    <Modal open onClose={onClose} title={`Connect ${ex.name}`}>
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-profit/25 bg-profit/5 p-3 text-xs text-muted">
          <ShieldCheck size={18} className="shrink-0 text-profit" />
          <div>Create a <b className="text-ink">read-only</b> API key in {ex.name} → API Management. Leave trading and withdrawals <b className="text-ink">disabled</b>. Keys are encrypted at rest and only used server-side to fetch fills.</div>
        </div>
        <div><Label>Account label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
        <div><Label>API key</Label><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste API key" className="font-mono" /></div>
        <div><Label>API secret</Label><Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Paste secret" className="font-mono" /></div>
        {ex.passphrase && <div><Label>Passphrase</Label><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>}
        <Button className="w-full" disabled={!valid || busy} onClick={() => { setBusy(true); setTimeout(() => onDone(useStore.getState().connectExchange(ex.id, label)), 900); }}>
          {busy ? <><RefreshCw size={15} className="animate-spin" /> Syncing…</> : <><Lock size={15} /> Connect & sync</>}
        </Button>
        <p className="text-center text-[11px] text-faint">Prototype: keys are not sent anywhere; a simulated sync imports sample fills.</p>
      </div>
    </Modal>
  );
}
