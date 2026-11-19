"use client";
import Papa from "papaparse";
import { Download, FileUp, Film, Search, Share2, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { EMOTION_META, MISTAKE_LABEL } from "@/components/quick-snap";
import { TradeReplay } from "@/components/replay";
import { ShareTrade } from "@/components/share-card";
import { Button, Card, Empty, Input, Label, Modal, Money, PageHeader, Pill, Segmented, Select, Textarea, cn, fmtDateTime, fmtPrice } from "@/components/ui";
import { CSV_TEMPLATE, mapCsvRows } from "@/core/csv";
import { EXCHANGE_BY_ID, MARKETS, MARKET_IDS, MODE_LABEL, modeOf, type JournalMode } from "@/core/markets";
import { summarize } from "@/core/stats";
import type { Trade, TradeComputed } from "@/core/types";
import { useJournal, useRangedJournal } from "@/lib/hooks";
import { RangePicker } from "@/components/range-picker";
import { useStore } from "@/lib/store";

const PAGE = 25;

export default function JournalPage() {
  const { me, trades, setups } = useRangedJournal();
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState<"all" | "win" | "loss">("all");
  const [setupF, setSetupF] = useState("");
  const [assetF, setAssetF] = useState("");
  const [modeF, setModeF] = useState<JournalMode | "">("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    return [...trades]
      .reverse()
      .filter((t) => (q ? t.symbol.toLowerCase().includes(q.toLowerCase()) || (t.notes ?? "").toLowerCase().includes(q.toLowerCase()) : true))
      .filter((t) => (outcome === "all" ? true : outcome === "win" ? t.win : !t.win))
      .filter((t) => (setupF ? t.setupId === setupF : true))
      .filter((t) => (!assetF ? true : assetF.startsWith("m:") ? t.market === assetF.slice(2) : t.assetClass === assetF))
      .filter((t) => (modeF ? modeOf(t.source) === modeF : true));
  }, [trades, q, outcome, setupF, assetF, modeF]);
  const s = summarize(filtered);
  const open = trades.find((t) => t.id === openId);
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const setupOf = (id?: string) => setups.find((x) => x.id === id);

  if (!me) return null;
  return (
    <div>
      <PageHeader
        title="Journal"
        subtitle="Every trade, every lesson. Click a trade to review, replay or share it."
        right={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload size={15} /> Import CSV</Button>
            <Button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "n" }))}>+ Snap trade</Button>
          </>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search symbol or notes…" className="pl-9" />
          </div>
          <Select value={setupF} onChange={(e) => { setSetupF(e.target.value); setPage(0); }} className="md:w-52">
            <option value="">All weapons</option>
            {setups.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
          </Select>
          <Select value={assetF} onChange={(e) => { setAssetF(e.target.value); setPage(0); }} className="md:w-40">
            <option value="">All markets</option>
            <optgroup label="Asset class">
              {["crypto", "forex", "futures", "equities", "options"].map((a) => <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>)}
            </optgroup>
            <optgroup label="Crypto market">
              {MARKET_IDS.map((m) => <option key={m} value={`m:${m}`}>{MARKETS[m].name}</option>)}
            </optgroup>
          </Select>
          <Select value={modeF} onChange={(e) => { setModeF(e.target.value as JournalMode | ""); setPage(0); }} className="md:w-36">
            <option value="">Any source</option>
            {(Object.keys(MODE_LABEL) as JournalMode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </Select>
          <RangePicker />
          <Segmented value={outcome} onChange={(v) => { setOutcome(v); setPage(0); }} options={[{ value: "all", label: "All" }, { value: "win", label: "Wins" }, { value: "loss", label: "Losses" }]} />
        </div>
        <div className="num mt-3 flex flex-wrap gap-x-6 gap-y-1 px-1 text-xs text-muted">
          <span>{s.count} trades</span>
          <span>Net <Money usd={s.netPnl} sign /></span>
          <span>Win {Math.round(s.winRate * 100)}%</span>
          <span>PF {Number.isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : "∞"}</span>
          <span>Avg {s.avgR.toFixed(2)}R</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <Empty icon="📓" title="No trades match" body="Snap a trade with N, import a CSV, or connect an exchange." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-[.08em] text-faint">
                  <th className="px-4 py-3">Closed</th>
                  <th className="px-2 py-3">Symbol</th>
                  <th className="px-2 py-3">Side</th>
                  <th className="px-2 py-3">Weapon</th>
                  <th className="px-2 py-3 text-right">Entry → Exit</th>
                  <th className="px-2 py-3 text-right">P&L</th>
                  <th className="px-2 py-3 text-right">R</th>
                  <th className="px-2 py-3 text-center">Mood</th>
                  <th className="px-2 py-3 text-center">Plan</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const st = setupOf(t.setupId);
                  return (
                    <tr key={t.id} onClick={() => setOpenId(t.id)} className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2">
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted">{fmtDateTime(t.closedAt)}</td>
                      <td className="px-2 py-2.5 font-semibold">
                        <span className="whitespace-nowrap">{t.symbol}</span>
                        {t.replaySaved && <Film size={12} className="ml-1.5 inline text-violet" />}
                        {t.market && <MarketBadge market={t.market} leverage={t.leverage} />}
                      </td>
                      <td className="px-2 py-2.5"><Pill tone={t.side === "long" ? "profit" : "loss"} className="uppercase">{t.side}</Pill></td>
                      <td className="max-w-[180px] truncate px-2 py-2.5 text-muted">{st ? `${st.icon} ${st.name}` : "—"}</td>
                      <td className="num whitespace-nowrap px-2 py-2.5 text-right text-muted">{fmtPrice(t.entry)} → {fmtPrice(t.exit)}</td>
                      <td className="px-2 py-2.5 text-right font-semibold"><Money usd={t.pnl} sign /></td>
                      <td className={cn("num px-2 py-2.5 text-right", (t.r ?? 0) >= 0 ? "text-profit" : "text-loss")}>{t.r != null ? t.r.toFixed(2) : "—"}</td>
                      <td className="px-2 py-2.5 text-center" title={t.emotion}>{t.emotion ? EMOTION_META[t.emotion].icon : "—"}</td>
                      <td className="px-2 py-2.5 text-center">{t.rulesFollowed == null ? "—" : t.rulesFollowed ? <span className="text-profit">✓</span> : <span className="text-loss">✗</span>}</td>
                      <td className="whitespace-nowrap px-4 py-2.5"><SourceTag source={t.source} exchange={t.exchange} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > PAGE && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted">
            <span>{page * PAGE + 1}–{Math.min(filtered.length, (page + 1) * PAGE)} of {filtered.length}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {open && <TradeDetail trade={open} onClose={() => setOpenId(null)} />}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} userId={me.id} />
    </div>
  );
}

function TradeDetail({ trade, onClose }: { trade: TradeComputed; onClose: () => void }) {
  const { setups } = useJournal();
  const updateTrade = useStore((s) => s.updateTrade);
  const deleteTrade = useStore((s) => s.deleteTrade);
  const [tab, setTab] = useState<"review" | "replay" | "share">("review");
  const setup = setups.find((x) => x.id === trade.setupId);
  return (
    <Modal open onClose={onClose} wide title={<span className="flex items-center gap-2"><Pill tone={trade.side === "long" ? "profit" : "loss"} className="uppercase">{trade.side}</Pill> {trade.symbol} <Money usd={trade.pnl} sign className="ml-1" /></span>}>
      <Segmented value={tab} onChange={setTab} className="mb-5" options={[{ value: "review", label: "Review" }, { value: "replay", label: <span className="flex items-center gap-1.5"><Film size={13} /> Replay</span> }, { value: "share", label: <span className="flex items-center gap-1.5"><Share2 size={13} /> Share</span> }]} />
      {tab === "review" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid grid-cols-2 gap-3 self-start">
            {[
              ["Entry", fmtPrice(trade.entry)], ["Exit", fmtPrice(trade.exit)], ["Size", String(+trade.qty.toFixed(4))], ["Fees", `$${trade.fees.toFixed(2)}`],
              ["Stop", trade.stopLoss != null ? fmtPrice(trade.stopLoss) : "—"], ["R multiple", trade.r != null ? `${trade.r.toFixed(2)}R` : "—"],
              ["Opened", fmtDateTime(trade.openedAt)], ["Held", trade.holdMinutes >= 60 ? `${(trade.holdMinutes / 60).toFixed(1)}h` : `${Math.round(trade.holdMinutes)}m`],
              ["Asset class", trade.assetClass],
              ["Market", trade.market ? `${MARKETS[trade.market].name}${trade.leverage ? ` · ${trade.leverage}x` : ""}` : "—"],
              ["Exchange", trade.exchange ? EXCHANGE_BY_ID[trade.exchange].name : "—"],
              ["Journaled by", MODE_LABEL[modeOf(trade.source)]],
              ...(trade.instrument ? [["Exchange id", trade.instrument]] : []),
              ...(trade.funding != null ? [["Funding", `${trade.funding >= 0 ? "-" : "+"}$${Math.abs(trade.funding).toFixed(2)}`]] : []),
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-surface-2 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-faint">{k}</div>
                <div className="num mt-0.5 text-sm font-semibold capitalize">{v}</div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div>
              <Label>Weapon</Label>
              <Select value={trade.setupId ?? ""} onChange={(e) => updateTrade(trade.id, { setupId: e.target.value || undefined })}>
                <option value="">No setup</option>
                {setups.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
              </Select>
              {setup && (
                <div className="mt-2 rounded-lg border border-line bg-surface-2 p-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Playbook checklist</div>
                  {setup.rules.map((r) => <div key={r} className="flex items-center gap-2 py-0.5 text-xs text-muted"><span className={trade.rulesFollowed ? "text-profit" : "text-faint"}>{trade.rulesFollowed ? "✓" : "○"}</span>{r}</div>)}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {trade.emotion && <Pill tone="violet">{EMOTION_META[trade.emotion].icon} {EMOTION_META[trade.emotion].label}</Pill>}
              <Pill tone={trade.rulesFollowed ? "profit" : "loss"}>{trade.rulesFollowed ? "Followed plan" : "Broke plan"}</Pill>
              {trade.mistakes.map((m) => <Pill key={m} tone="loss">{MISTAKE_LABEL[m]}</Pill>)}
              {trade.tags.map((t) => <Pill key={t}>#{t}</Pill>)}
            </div>
            <div>
              <Label>Notes & lesson</Label>
              <Textarea rows={4} defaultValue={trade.notes} onBlur={(e) => updateTrade(trade.id, { notes: e.target.value })} />
            </div>
            <div className="flex justify-between">
              <Button variant="danger" size="sm" onClick={() => { deleteTrade(trade.id); onClose(); }}><Trash2 size={14} /> Delete</Button>
              <Button variant="outline" size="sm" onClick={() => updateTrade(trade.id, { replaySaved: !trade.replaySaved })}><Film size={14} /> {trade.replaySaved ? "Replay saved ✓" : "Save replay"}</Button>
            </div>
          </div>
        </div>
      )}
      {tab === "replay" && <TradeReplay trade={trade} />}
      {tab === "share" && <ShareTrade trade={trade} setup={setup} />}
    </Modal>
  );
}

function ImportModal({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const importTrades = useStore((s) => s.importTrades);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ trades: Trade[]; errors: string[] } | null>(null);
  const [drag, setDrag] = useState(false);

  function parse(file: File) {
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: (r) => setPreview(mapCsvRows(r.data, userId)) });
  }
  function template() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    a.download = "edgeforge-template.csv";
    a.click();
  }
  return (
    <Modal open={open} onClose={() => { setPreview(null); onClose(); }} title="Import trades from CSV">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) parse(f); }}
        onClick={() => fileRef.current?.click()}
        className={cn("flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition", drag ? "border-accent bg-accent/5" : "border-line-strong hover:border-accent/50")}
      >
        <FileUp size={28} className="text-accent" />
        <div className="mt-3 font-semibold">Drop a CSV here or click to browse</div>
        <div className="mt-1 text-xs text-muted">Works with Binance, OKX, Bitget, MT4/5, TradingView and most broker exports. Columns are auto-detected.</div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) parse(f); }} />
      </div>
      <button onClick={template} className="mt-3 flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-accent"><Download size={13} /> Download template</button>
      {preview && (
        <div className="mt-5">
          {preview.errors.length > 0 && <div className="mb-3 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">{preview.errors.slice(0, 5).map((e) => <div key={e}>{e}</div>)}</div>}
          <div className="text-sm">Ready to import <b>{preview.trades.length}</b> trades.</div>
          <Button className="mt-3 w-full" disabled={!preview.trades.length} onClick={() => { importTrades(preview.trades); setPreview(null); onClose(); }}>Import {preview.trades.length} trades</Button>
        </div>
      )}
    </Modal>
  );
}

function MarketBadge({ market, leverage }: { market: NonNullable<Trade["market"]>; leverage?: number }) {
  const m = MARKETS[market];
  return <span className="ml-1.5 inline-block whitespace-nowrap rounded px-1.5 py-0.5 align-middle text-[9px] font-bold" style={{ color: m.color, background: `${m.color}1c` }}>{m.short}{leverage ? ` ${leverage}x` : ""}</span>;
}

function SourceTag({ source, exchange }: { source: Trade["source"]; exchange?: Trade["exchange"] }) {
  const ex = EXCHANGE_BY_ID[(exchange ?? source) as keyof typeof EXCHANGE_BY_ID];
  const mode = modeOf(source);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {ex ? <span className="font-semibold" style={{ color: ex.color }}>{ex.name}</span> : <span className="text-muted">{source === "csv" ? "CSV" : source === "demo" ? "Demo" : "Manual"}</span>}
      <span className={cn("rounded px-1 py-px text-[9px] font-bold uppercase", mode === "auto" ? "bg-profit/15 text-profit" : mode === "import" ? "bg-cyan/15 text-cyan" : "bg-surface-3 text-muted")}>{mode === "auto" ? "Sync" : mode === "import" ? "CSV" : "Manual"}</span>
    </span>
  );
}
