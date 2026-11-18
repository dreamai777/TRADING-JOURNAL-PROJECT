"use client";
import { toPng } from "html-to-image";
import { Download, Link2, Share2 } from "lucide-react";
import { useRef, useState } from "react";
import { formatMoney } from "@/core/currency";
import type { Setup, TradeComputed } from "@/core/types";
import { useStore } from "@/lib/store";
import { Logo } from "./logo";
import { Button, Segmented, fmtDate, fmtPrice } from "./ui";

type Show = "money" | "r" | "pct";

const NETWORKS = [
  { id: "x", label: "X", color: "#e7e9ea", url: (t: string, u: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { id: "facebook", label: "Facebook", color: "#1877f2", url: (_: string, u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: "linkedin", label: "LinkedIn", color: "#0a66c2", url: (_: string, u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { id: "telegram", label: "Telegram", color: "#29a9eb", url: (t: string, u: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { id: "whatsapp", label: "WhatsApp", color: "#25d366", url: (t: string, u: string) => `https://wa.me/?text=${encodeURIComponent(t + " " + u)}` },
  { id: "reddit", label: "Reddit", color: "#ff4500", url: (t: string, u: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}` },
];

export function ShareTrade({ trade, setup }: { trade: TradeComputed; setup?: Setup }) {
  const card = useRef<HTMLDivElement>(null);
  const ccy = useStore((s) => s.currency);
  const [show, setShow] = useState<Show>("r");
  const [format, setFormat] = useState<"square" | "story">("square");
  const [msg, setMsg] = useState("");
  const pct = ((trade.exit - trade.entry) / trade.entry) * (trade.side === "long" ? 1 : -1) * 100;
  const headline = show === "money" ? formatMoney(trade.pnl, ccy, { sign: true }) : show === "r" && trade.r != null ? `${trade.r >= 0 ? "+" : ""}${trade.r.toFixed(2)}R` : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
  const text = `${trade.side.toUpperCase()} ${trade.symbol} ${headline}${setup ? ` with my ${setup.name} setup` : ""}. Journaled on EdgeForge.`;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/` : "https://edgeforge.app";

  async function png() {
    if (!card.current) return null;
    return toPng(card.current, { pixelRatio: 2, cacheBust: true });
  }
  async function download() {
    const data = await png();
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = `edgeforge-${trade.symbol}-${trade.closedAt.slice(0, 10)}.png`;
    a.click();
    setMsg("Image saved. Post it to Instagram, TikTok or YouTube Shorts.");
  }
  async function nativeShare() {
    const data = await png();
    if (!data) return;
    const blob = await (await fetch(data)).blob();
    const file = new File([blob], "trade.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
    } else {
      download();
    }
  }

  const win = trade.pnl > 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div className="flex justify-center">
        <div ref={card} className="relative overflow-hidden rounded-2xl border border-line-strong p-7" style={{ width: 360, height: format === "square" ? 360 : 640, background: `radial-gradient(90% 60% at 80% 0%, ${win ? "rgba(47,227,154,.22)" : "rgba(255,84,112,.2)"}, transparent 60%), radial-gradient(70% 50% at 0% 100%, rgba(200,245,59,.10), transparent 60%), #080b10` }}>
          <div className="grid-bg absolute inset-0 opacity-60" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between">
              <Logo size={24} />
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted">{fmtDate(trade.closedAt)}</span>
            </div>
            <div className="mt-auto">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${trade.side === "long" ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"}`}>{trade.side}</span>
                <span className="font-display text-xl font-bold">{trade.symbol}</span>
              </div>
              <div className={`num mt-2 font-display text-[54px] font-bold leading-none ${win ? "text-profit" : "text-loss"}`}>{headline}</div>
              <div className="num mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><div className="text-faint">Entry</div><div className="font-semibold">{fmtPrice(trade.entry)}</div></div>
                <div><div className="text-faint">Exit</div><div className="font-semibold">{fmtPrice(trade.exit)}</div></div>
              </div>
              {setup && <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold">{setup.icon} {setup.name}</div>}
            </div>
            {format === "story" && <div className="mt-auto pt-8 text-center text-xs text-muted">Every trade is XP. Forge your edge.</div>}
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-[10px] text-faint">
              <span>edgeforge.app</span>
              <span>Verified journal entry</span>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Show result as</div>
          <Segmented value={show} onChange={setShow} options={[{ value: "r", label: "R multiple" }, { value: "pct", label: "% move" }, { value: "money", label: "Amount" }]} />
          <p className="mt-2 text-[11px] text-faint">Tip: sharing R or % keeps your account size private.</p>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Format</div>
          <Segmented value={format} onChange={setFormat} options={[{ value: "square", label: "Square (feed)" }, { value: "story", label: "Story (IG / TikTok / Shorts)" }]} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={download}><Download size={15} /> Download image</Button>
          <Button variant="outline" onClick={nativeShare}><Share2 size={15} /> Share…</Button>
          <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(`${text} ${shareUrl}`); setMsg("Caption copied."); }}><Link2 size={15} /> Copy caption</Button>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Post to</div>
          <div className="grid grid-cols-3 gap-2">
            {NETWORKS.map((n) => (
              <a key={n.id} href={n.url(text, shareUrl)} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 text-xs font-semibold hover:border-line-strong">
                <span className="h-2 w-2 rounded-full" style={{ background: n.color }} /> {n.label}
              </a>
            ))}
            {["Instagram", "TikTok", "YouTube"].map((n) => (
              <button key={n} onClick={download} className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 text-xs font-semibold hover:border-line-strong">
                <Download size={12} /> {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-faint">Instagram, TikTok and YouTube don&apos;t accept web share links, so we save a ready-to-post image (use Story format).</p>
        </div>
        {msg && <div className="rounded-lg border border-profit/30 bg-profit/10 px-3 py-2 text-sm text-profit">{msg}</div>}
      </div>
    </div>
  );
}
