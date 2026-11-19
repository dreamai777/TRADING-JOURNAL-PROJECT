"use client";
import { ArrowLeft, ChevronLeft, ChevronRight, Film, Share2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AgentChat } from "@/components/ai/agent-chat";
import { GradeBadge } from "@/components/ai/report-view";
import { TradeReviewCard } from "@/components/ai/trade-review-card";
import { EMOTION_META, MISTAKE_LABEL } from "@/components/quick-snap";
import { TradeReplay } from "@/components/replay";
import { ShareTrade } from "@/components/share-card";
import { Button, Card, CardHeader, Empty, Label, Modal, Money, Pill, Select, Textarea, cn, fmtDateTime, fmtPrice } from "@/components/ui";
import { PERSONAS } from "@/core/ai/agents";
import { excursions } from "@/core/ai/review";
import { replayCandles } from "@/core/market";
import { EXCHANGE_BY_ID, MARKETS, MODE_LABEL, modeOf } from "@/core/markets";
import { useCouncil } from "@/lib/ai";
import { useStore } from "@/lib/store";

export default function TradePage() {
  const { id } = useParams<{ id: string }>();
  const { me, trades, setups, council } = useCouncil();
  const updateTrade = useStore((s) => s.updateTrade);
  const [share, setShare] = useState(false);
  const idx = trades.findIndex((t) => t.id === id);
  const t = trades[idx];
  const review = t ? council.reviews.get(t.id) : undefined;
  const exc = useMemo(() => {
    if (!t) return null;
    const { candles, entryIndex, exitIndex } = replayCandles(t);
    return excursions(t, candles, entryIndex, exitIndex);
  }, [t]);
  if (!me) return null;
  if (!t || !review) return <Empty icon="📓" title="Trade not found" body="It may have been deleted." action={<Link href="/journal" className="text-sm font-semibold text-accent">Back to journal</Link>} />;
  const setup = setups.find((s) => s.id === t.setupId);
  const prev = trades[idx - 1];
  const next = trades[idx + 1];

  const facts: [string, React.ReactNode][] = [
    ["Entry", fmtPrice(t.entry)], ["Exit", fmtPrice(t.exit)], ["Stop", t.stopLoss != null ? fmtPrice(t.stopLoss) : "—"], ["Target", t.takeProfit != null ? fmtPrice(t.takeProfit) : "—"],
    ["Size", String(+t.qty.toFixed(4))], ["Fees", `$${t.fees.toFixed(2)}`], ["Opened", fmtDateTime(t.openedAt)], ["Held", t.holdMinutes >= 60 ? `${(t.holdMinutes / 60).toFixed(1)}h` : `${Math.round(t.holdMinutes)}m`],
    ["Market", t.market ? `${MARKETS[t.market].name}${t.leverage ? ` · ${t.leverage}x` : ""}` : t.assetClass],
    ["Exchange", t.exchange ? EXCHANGE_BY_ID[t.exchange].name : "—"], ["Journaled", MODE_LABEL[modeOf(t.source)]],
    ["Funding", t.funding != null ? `${t.funding >= 0 ? "-" : "+"}$${Math.abs(t.funding).toFixed(2)}` : "—"],
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/journal" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"><ArrowLeft size={13} /> Journal</Link>
        <div className="flex gap-1">
          {prev ? <Link href={`/journal/${prev.id}`} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink"><ChevronLeft size={13} /> Older</Link> : null}
          {next ? <Link href={`/journal/${next.id}`} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink">Newer <ChevronRight size={13} /></Link> : null}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <GradeBadge grade={review.grade} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{t.symbol}</h1>
            <Pill tone={t.side === "long" ? "profit" : "loss"} className="uppercase">{t.side}</Pill>
            {setup && <Pill tone="violet">{setup.icon} {setup.name}</Pill>}
            {t.emotion && <Pill>{EMOTION_META[t.emotion].icon} {EMOTION_META[t.emotion].label}</Pill>}
          </div>
          <div className="mt-0.5 text-sm text-muted">{fmtDateTime(t.openedAt)} → {fmtDateTime(t.closedAt)} · {review.verdict}</div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right"><div className="text-[10px] font-semibold uppercase tracking-wider text-faint">Net P&L</div><Money usd={t.pnl} sign className="text-2xl font-bold" /></div>
          <div className="text-right"><div className="text-[10px] font-semibold uppercase tracking-wider text-faint">R</div><div className={cn("num text-2xl font-bold", (t.r ?? 0) >= 0 ? "text-profit" : "text-loss")}>{t.r != null ? `${t.r >= 0 ? "+" : ""}${t.r.toFixed(2)}` : "—"}</div></div>
          <Button variant="outline" onClick={() => setShare(true)}><Share2 size={14} /> Share</Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Replay" icon={<Film size={15} className="text-violet" />} subtitle="Step through the candles bar by bar" right={<Button size="sm" variant="ghost" onClick={() => updateTrade(t.id, { replaySaved: !t.replaySaved })}>{t.replaySaved ? "Saved ✓" : "Save replay"}</Button>} />
            <div className="px-4 pb-4"><TradeReplay trade={t} /></div>
          </Card>
          {exc && (
            <Card>
              <CardHeader title="Run-up & heat" subtitle="Best and worst the trade got while open (MFE / MAE)" />
              <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-4">
                <Box k="Max run-up" v={<Money usd={exc.mfe} sign />} s={exc.mfeR != null ? `${exc.mfeR.toFixed(2)}R available` : undefined} />
                <Box k="Max heat" v={<Money usd={-exc.mae} sign />} s={exc.maeR != null ? `${exc.maeR.toFixed(2)}R against you` : undefined} />
                <Box k="Move captured" v={<span className={exc.captured >= 0.6 ? "text-profit" : exc.captured >= 0.3 ? "text-gold" : "text-loss"}>{Math.round(exc.captured * 100)}%</span>} s="of the best available move" />
                <Box k="Left on table" v={<Money usd={Math.max(0, exc.mfe - Math.max(0, t.pnl + t.fees))} colored={false} />} s="vs exiting at the best price" />
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="Trade details" />
            <div className="grid grid-cols-2 gap-2 px-5 pb-5 sm:grid-cols-4">{facts.map(([k, v]) => <Box key={k} k={k} v={v} />)}</div>
          </Card>
          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Weapon</Label>
                <Select value={t.setupId ?? ""} onChange={(e) => updateTrade(t.id, { setupId: e.target.value || undefined })}>
                  <option value="">No setup</option>
                  {setups.map((x) => <option key={x.id} value={x.id}>{x.icon} {x.name}</option>)}
                </Select>
                {setup && <div className="mt-2 space-y-0.5">{setup.rules.map((r) => <div key={r} className="flex items-center gap-2 text-xs text-muted"><span className={t.rulesFollowed ? "text-profit" : "text-faint"}>{t.rulesFollowed ? "✓" : "○"}</span>{r}</div>)}</div>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button onClick={() => updateTrade(t.id, { rulesFollowed: !t.rulesFollowed })} className="cursor-pointer"><Pill tone={t.rulesFollowed ? "profit" : "loss"}>{t.rulesFollowed ? "Followed plan" : "Broke plan"}</Pill></button>
                  {t.mistakes.map((m) => <Pill key={m} tone="loss">{MISTAKE_LABEL[m]}</Pill>)}
                  {t.tags.map((x) => <Pill key={x}>#{x}</Pill>)}
                </div>
              </div>
              <div>
                <Label hint="Oracle reads this">Notes & lesson</Label>
                <Textarea key={t.id} rows={6} defaultValue={t.notes} onBlur={(e) => updateTrade(t.id, { notes: e.target.value })} placeholder="What did you see? What would you do differently?" />
              </div>
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <TradeReviewCard review={review} />
          <AgentChat agent="analyst" persona={PERSONAS.analyst} review={review} starters={["Explain this grade", "How would a pro have managed this trade?", "What should I add to my checklist?"]} height={440} />
        </div>
      </div>

      <Modal open={share} onClose={() => setShare(false)} wide title="Share this trade"><ShareTrade trade={t} setup={setup} /></Modal>
    </div>
  );
}

function Box({ k, v, s }: { k: string; v: React.ReactNode; s?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-faint">{k}</div>
      <div className="num mt-0.5 text-sm font-semibold capitalize">{v}</div>
      {s && <div className="text-[10.5px] text-faint">{s}</div>}
    </div>
  );
}
