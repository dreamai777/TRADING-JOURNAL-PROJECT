"use client";
import { Sparkles, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { guessAssetClass } from "@/core/csv";
import { tradeXp } from "@/core/game";
import { parseQuick } from "@/core/quick";
import { computeTrade } from "@/core/stats";
import type { Emotion, Mistake, Side, Trade } from "@/core/types";
import { useJournal } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { Button, Input, Label, Modal, Money, Pill, Textarea, cn } from "./ui";

export const EMOTION_META: Record<Emotion, { icon: string; label: string }> = {
  calm: { icon: "😌", label: "Calm" },
  confident: { icon: "😎", label: "Confident" },
  focused: { icon: "🎯", label: "Focused" },
  fomo: { icon: "😱", label: "FOMO" },
  fearful: { icon: "😨", label: "Fearful" },
  greedy: { icon: "🤑", label: "Greedy" },
  revenge: { icon: "😤", label: "Revenge" },
  bored: { icon: "🥱", label: "Bored" },
  tired: { icon: "😴", label: "Tired" },
};

export const MISTAKE_LABEL: Record<Mistake, string> = {
  "moved-stop": "Moved stop",
  "no-stop": "No stop",
  oversized: "Oversized",
  "early-exit": "Early exit",
  "late-entry": "Late entry",
  chased: "Chased",
  "broke-rules": "Broke rules",
  overtraded: "Overtraded",
};

const RECENT = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "EURUSD", "XAUUSD", "NQ", "ES", "NVDA"];

export function QuickSnap({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <QuickSnapInner onClose={onClose} /> : null;
}

function QuickSnapInner({ onClose }: { onClose: () => void }) {
  const { setups } = useJournal();
  const addTrade = useStore((s) => s.addTrade);
  const [smart, setSmart] = useState("");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [side, setSide] = useState<Side>("long");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [qty, setQty] = useState("");
  const [stop, setStop] = useState("");
  const [fees] = useState("");
  const [setupId, setSetupId] = useState<string | undefined>(setups.find((s) => s.equipped)?.id);
  const [emotion, setEmotion] = useState<Emotion | undefined>();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [rules, setRules] = useState(true);
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<null | { xp: number; pnl: number }>(null);

  function applySmart(text: string) {
    setSmart(text);
    const p = parseQuick(text, setups);
    if (p.symbol) setSymbol(p.symbol);
    if (p.side) setSide(p.side);
    if (p.entry != null) setEntry(String(p.entry));
    if (p.exit != null) setExit(String(p.exit));
    if (p.qty != null) setQty(String(p.qty));
    if (p.stopLoss != null) setStop(String(p.stopLoss));
    if (p.emotion) setEmotion(p.emotion);
    if (p.setupHint) setSetupId(p.setupHint);
  }

  const draft = useMemo<Omit<Trade, "id" | "userId"> | null>(() => {
    const e = +entry, x = +exit, q = +qty;
    if (!symbol || !e || !x || !q) return null;
    const now = new Date();
    return {
      symbol: symbol.toUpperCase(), assetClass: guessAssetClass(symbol), side, entry: e, exit: x, qty: q, fees: +fees || 0,
      stopLoss: stop ? +stop : undefined, openedAt: new Date(now.getTime() - 30 * 60000).toISOString(), closedAt: now.toISOString(),
      setupId, tags: [], emotion, mistakes, rulesFollowed: rules, rating, notes, source: "manual",
    };
  }, [symbol, side, entry, exit, qty, fees, stop, setupId, emotion, mistakes, rules, rating, notes]);

  const preview = draft ? computeTrade({ ...draft, id: "preview", userId: "me" }) : null;
  const xp = preview ? tradeXp(preview) : 0;

  function save() {
    if (!draft || !preview) return;
    addTrade(draft, xp);
    setSaved({ xp, pnl: preview.pnl });
  }

  if (saved) {
    return (
      <Modal open onClose={onClose} title="Trade forged">
        <div className="py-6 text-center">
          <div className="text-5xl">{saved.pnl > 0 ? "🏆" : "🛡️"}</div>
          <div className="mt-3 font-display text-2xl font-bold">
            <Money usd={saved.pnl} sign />
          </div>
          <div className="mt-1 text-sm text-muted">{saved.pnl > 0 ? "Clean win. Banked." : "Loss logged. Every loss is tuition, if you review it."}</div>
          <div className="num mt-5 inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-1.5 text-sm font-bold text-gold">
            <Sparkles size={15} /> +{saved.xp} XP earned
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={onClose}>Done</Button>
            <Button onClick={() => { setSaved(null); setEntry(""); setExit(""); setNotes(""); setMistakes([]); setSmart(""); }}>Snap another</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title={<span className="flex items-center gap-2"><Sparkles size={16} className="text-accent" /> Snap a trade</span>}>
      <div className="space-y-5">
        <div>
          <Label hint="type it like you'd text it">One-line snap</Label>
          <Input autoFocus value={smart} onChange={(e) => applySmart(e.target.value)} placeholder="btc long 90100 → 91550 0.2 sl 89600 calm" className="h-11 border-accent/30 font-mono" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2">
            <Label>Symbol</Label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} list="recent-symbols" />
            <datalist id="recent-symbols">{RECENT.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div className="col-span-2">
            <Label>Side</Label>
            <div className="grid h-10 grid-cols-2 gap-1 rounded-lg border border-line bg-surface-2 p-1">
              {(["long", "short"] as Side[]).map((s) => (
                <button key={s} type="button" onClick={() => setSide(s)} className={cn("cursor-pointer rounded-md text-xs font-bold uppercase", side === s ? (s === "long" ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss") : "text-muted")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Field label="Entry" v={entry} set={setEntry} />
          <Field label="Exit" v={exit} set={setExit} />
          <Field label="Size" v={qty} set={setQty} />
          <Field label="Stop" v={stop} set={setStop} hint="for R" />
        </div>

        {setups.length > 0 && (
          <div>
            <Label>Weapon (setup)</Label>
            <div className="flex flex-wrap gap-1.5">
              {[...setups].sort((a, b) => Number(b.equipped) - Number(a.equipped)).map((s) => (
                <button key={s.id} type="button" onClick={() => setSetupId(setupId === s.id ? undefined : s.id)} className={cn("cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition", setupId === s.id ? "border-accent/60 bg-accent/10 text-accent" : "border-line bg-surface-2 text-muted hover:text-ink")}>
                  {s.icon} {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>How did you feel?</Label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(EMOTION_META) as Emotion[]).map((e) => (
              <button key={e} type="button" onClick={() => setEmotion(emotion === e ? undefined : e)} className={cn("cursor-pointer rounded-lg border px-2 py-1 text-xs font-medium transition", emotion === e ? "border-violet/60 bg-violet/15 text-ink" : "border-line bg-surface-2 text-muted hover:text-ink")}>
                {EMOTION_META[e].icon} {EMOTION_META[e].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Followed the plan?</Label>
            <div className="grid h-10 grid-cols-2 gap-1 rounded-lg border border-line bg-surface-2 p-1">
              <button type="button" onClick={() => setRules(true)} className={cn("cursor-pointer rounded-md text-xs font-bold", rules ? "bg-profit/20 text-profit" : "text-muted")}>✓ Yes</button>
              <button type="button" onClick={() => setRules(false)} className={cn("cursor-pointer rounded-md text-xs font-bold", !rules ? "bg-loss/20 text-loss" : "text-muted")}>✗ No</button>
            </div>
          </div>
          <div>
            <Label>Execution</Label>
            <div className="flex h-10 items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} className="cursor-pointer p-0.5" aria-label={`${n} stars`}>
                  <Star size={22} className={n <= rating ? "fill-gold text-gold" : "text-faint"} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {!rules && (
          <div>
            <Label>What went wrong?</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MISTAKE_LABEL) as Mistake[]).map((m) => (
                <button key={m} type="button" onClick={() => setMistakes(mistakes.includes(m) ? mistakes.filter((x) => x !== m) : [...mistakes, m])} className={cn("cursor-pointer rounded-lg border px-2 py-1 text-xs font-medium", mistakes.includes(m) ? "border-loss/50 bg-loss/15 text-loss" : "border-line bg-surface-2 text-muted")}>
                  {MISTAKE_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label hint="+5 XP for 20+ chars">Lesson / note</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did this trade teach you?" />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
          <div className="text-sm">
            {preview ? (
              <div className="flex flex-wrap items-center gap-2">
                <Money usd={preview.pnl} sign className="text-lg font-bold" />
                {preview.r != null && <Pill tone={preview.r >= 0 ? "profit" : "loss"}>{preview.r.toFixed(2)}R</Pill>}
                <Pill tone="gold">+{xp} XP</Pill>
              </div>
            ) : (
              <span className="text-muted">Fill entry, exit and size to preview P&L</span>
            )}
          </div>
          <Button onClick={save} disabled={!draft}>Forge it</Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, v, set, hint }: { label: string; v: string; set: (s: string) => void; hint?: string }) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      <Input inputMode="decimal" value={v} onChange={(e) => set(e.target.value)} className="num" />
    </div>
  );
}
