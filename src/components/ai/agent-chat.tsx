"use client";
import { Microscope, RotateCcw, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Input, cn } from "@/components/ui";
import type { CoreAgentId } from "@/core/ai/agents";
import type { CustomAgent } from "@/core/ai/custom";
import type { TradeReview } from "@/core/ai/review";
import { askAgent, refreshAiStatus, useAi, useCouncil } from "@/lib/ai";
import { MiniMarkdown } from "./report-view";

const EMPTY: never[] = [];

export function AgentChat({ agent, custom, persona, starters, review, className, height = 480 }: {
  agent: CoreAgentId | "custom";
  custom?: CustomAgent;
  persona: { name: string; icon: string; color: string };
  starters: string[];
  review?: TradeReview;
  className?: string;
  height?: number;
}) {
  const bundle = useCouncil();
  const key = `${bundle.me?.id}:${custom ? `custom:${custom.id}` : agent}${review ? `:trade:${review.tradeId}` : ""}`;
  const chat = useAi((s) => s.chats[key] ?? EMPTY);
  const mode = useAi((s) => s.aiMode);
  const status = useAi((s) => s.status);
  const clear = useAi((s) => s.clearChat);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const me = bundle.me;
  useEffect(() => {
    void refreshAiStatus(me);
  }, [me]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  async function send(text: string, deep = false) {
    if (!text.trim() || busy) return;
    setQ("");
    setBusy(true);
    await askAgent({ bundle, agent, custom, chatKey: key, question: text.trim(), review, deep });
    setBusy(false);
  }

  const usage = status?.usage;
  const credits = mode === "claude" && usage ? (usage.limit == null ? "Unlimited chats" : `${usage.remaining} of ${usage.limit} chats left this month`) : null;
  const deepCost = status?.costs?.deep ?? 3;

  return (
    <Card className={cn("flex flex-col", className)} style={{ height }}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-lg" style={{ background: `${persona.color}18` }}>{persona.icon}</span>
          <div>
            <div className="text-sm font-semibold">Ask {persona.name}</div>
            <div className="flex items-center gap-1 text-[10.5px] text-faint">
              <span className={cn("h-1.5 w-1.5 rounded-full", mode === "claude" ? "bg-profit" : mode === "offline" ? "bg-gold" : "bg-faint")} />
              {mode === "claude" ? `Claude · live${credits ? ` · ${credits}` : ""}` : mode === "offline" ? "Offline engine · add an API key for Claude" : "Grounded in your journal"}
            </div>
          </div>
        </div>
        {chat.length > 0 && (
          <button onClick={() => clear(key)} className="cursor-pointer rounded-md p-1.5 text-faint hover:bg-surface-3 hover:text-ink" title="New conversation" aria-label="New conversation"><RotateCcw size={14} /></button>
        )}
      </div>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {chat.length === 0 && (
          <div className="space-y-2">
            <div className="mb-3 flex items-center gap-1.5 text-xs text-muted"><Sparkles size={13} style={{ color: persona.color }} /> Try asking</div>
            {starters.map((s) => (
              <button key={s} onClick={() => send(s)} className="block w-full cursor-pointer rounded-lg border border-line bg-surface-2 px-3 py-2 text-left text-sm text-muted transition hover:border-line-strong hover:text-ink">{s}</button>
            ))}
          </div>
        )}
        {review && mode === "claude" && (
          <button onClick={() => send("Give me a deep review of this trade.", true)} disabled={busy} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-violet/40 bg-violet/[.07] px-3 py-2.5 text-left text-sm transition hover:border-violet/70 disabled:opacity-60">
            <Microscope size={16} className="shrink-0 text-violet" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Deep review with Claude</span>
              <span className="block text-xs text-muted">Full pillar-by-pillar debrief on the stronger model · uses {deepCost} chats</span>
            </span>
          </button>
        )}
        {chat.map((m, i) => (
          <div key={i} className={cn("max-w-[92%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed", m.role === "user" ? "ml-auto bg-accent text-accent-ink" : m.source === "notice" ? "border border-gold/35 bg-gold/[.07] text-ink/90" : "bg-surface-2 text-ink/90")}>
            {m.role === "assistant" ? (m.content ? <MiniMarkdown text={m.content} /> : <TypingDots />) : m.content}
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(q); }} className="flex gap-2 border-t border-line p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Message ${persona.name}…`} disabled={busy} />
        <Button type="submit" aria-label="Send" disabled={busy || !q.trim()}><Send size={15} /></Button>
      </form>
    </Card>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}
    </span>
  );
}
