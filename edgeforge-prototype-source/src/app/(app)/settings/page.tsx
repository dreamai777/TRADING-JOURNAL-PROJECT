"use client";
import { Download } from "lucide-react";
import { Button, Card, CardHeader, Input, Label, PageHeader, Select } from "@/components/ui";
import { FX } from "@/core/currency";
import type { CurrencyCode } from "@/core/types";
import { useJournal } from "@/lib/hooks";
import { useStore } from "@/lib/store";

const AVATARS = ["🦊", "🐺", "🦉", "🐯", "🦅", "🐲", "🦈", "🐻", "🦁", "🐍"];

export default function SettingsPage() {
  const { me, trades } = useJournal();
  const updateMe = useStore((s) => s.updateMe);
  const setCurrency = useStore((s) => s.setCurrency);
  if (!me) return null;

  function exportCsv() {
    const cols = ["symbol", "side", "entry", "exit", "qty", "fees", "stopLoss", "openedAt", "closedAt", "pnl", "r", "emotion", "rulesFollowed", "notes"] as const;
    const esc = (v: unknown) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`);
    const body = [cols.join(","), ...trades.map((t) => cols.map((c) => esc(t[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = "edgeforge-journal.csv";
    a.click();
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader title="Profile" />
        <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
          <div><Label>Trader name</Label><Input defaultValue={me.name} onBlur={(e) => updateMe({ name: e.target.value || me.name })} /></div>
          <div><Label>Email</Label><Input value={me.email} disabled /></div>
          <div>
            <Label>Base currency</Label>
            <Select value={me.baseCurrency} onChange={(e) => { updateMe({ baseCurrency: e.target.value as CurrencyCode }); setCurrency(e.target.value as CurrencyCode); }}>
              {(Object.keys(FX) as CurrencyCode[]).map((c) => <option key={c} value={c}>{FX[c].flag} {c} · {FX[c].name}</option>)}
            </Select>
          </div>
          <div><Label hint="USD, used for % returns">Account size</Label><Input className="num" defaultValue={me.accountSize} onBlur={(e) => updateMe({ accountSize: +e.target.value || me.accountSize })} /></div>
          <div className="sm:col-span-2">
            <Label>Avatar</Label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => updateMe({ avatar: a })} className={`h-11 w-11 cursor-pointer rounded-xl border text-xl ${me.avatar === a ? "border-accent bg-accent/10" : "border-line bg-surface-2"}`}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>
      <Card className="mt-4">
        <CardHeader title="Data" subtitle="Your journal is yours. Export any time." />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          <Button variant="outline" onClick={exportCsv}><Download size={15} /> Export journal CSV</Button>
          <Button variant="outline" onClick={() => useStore.getState().loadDemoForMe()}>Load demo data into my account</Button>
          <Button variant="danger" onClick={() => { if (confirm("Reset the whole prototype to its seeded demo state?")) useStore.getState().resetAll(); }}>Reset prototype</Button>
        </div>
      </Card>
    </div>
  );
}
