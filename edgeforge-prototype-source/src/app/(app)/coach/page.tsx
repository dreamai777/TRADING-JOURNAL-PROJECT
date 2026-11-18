"use client";
import { Bot, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, CardHeader, Input, PageHeader, Pill, cn } from "@/components/ui";
import { ruleInsights } from "@/core/insights";
import { useJournal } from "@/lib/hooks";

const TONE = { good: "border-profit/30 bg-profit/5", bad: "border-loss/30 bg-loss/5", warn: "border-gold/30 bg-gold/5", info: "border-cyan/30 bg-cyan/5" };
const DOT = { good: "text-profit", bad: "text-loss", warn: "text-gold", info: "text-cyan" };

export default function CoachPage() {
  const { trades, setups, summary } = useJournal();
  const insights = useMemo(() => ruleInsights(trades, setups), [trades, setups]);
  const [q, setQ] = useState("");
  const [chat, setChat] = useState<{ role: "you" | "coach"; text: string }[]>([]);

  function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    // Offline answer from local stats. The Claude-backed coach replaces this with a streamed answer
    // grounded in the same journal data (see src/lib/coach.ts).
    const lower = q.toLowerCase();
    let a = `Across ${summary.count} trades you win ${Math.round(summary.winRate * 100)}% with a profit factor of ${summary.profitFactor.toFixed(2)}. `;
    if (/size|risk/.test(lower)) a += `Your average loss is $${summary.avgLoss.toFixed(0)}. Keep risk at or below 1% and size from the stop distance (Mindset & Risk has a calculator).`;
    else if (/best|setup|weapon/.test(lower)) a += insights.find((i) => i.id === "best-setup")?.body ?? "Tag more trades with setups so I can rank them.";
    else if (/worst|leak|lose|losing/.test(lower)) a += insights.filter((i) => i.tone === "bad").map((i) => i.title).join(". ") || "No major leaks found right now.";
    else a += insights[0]?.action ?? "Keep journaling and I'll surface patterns.";
    setChat([...chat, { role: "you", text: q }, { role: "coach", text: a }]);
    setQ("");
  }

  return (
    <div>
      <PageHeader title="AI Coach" subtitle="Patterns, leaks and next actions, mined from your journal." right={<Pill tone="violet"><Sparkles size={12} /> Claude-ready</Pill>} />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((i) => (
            <Card key={i.id} className={cn("p-4", TONE[i.tone])}>
              <div className="flex items-start gap-2.5">
                <span className={cn("mt-0.5", DOT[i.tone])}>●</span>
                <div>
                  <div className="font-semibold">{i.title}</div>
                  <div className="mt-1 text-sm text-muted">{i.body}</div>
                  {i.action && <div className="mt-3 rounded-lg bg-black/25 px-3 py-2 text-xs"><span className="font-semibold text-accent">Do this → </span>{i.action}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="flex min-h-[460px] flex-col">
          <CardHeader title="Ask your coach" icon={<Bot size={15} className="text-violet" />} subtitle="Answers from your own stats" />
          <div className="flex-1 space-y-3 overflow-y-auto px-5">
            {chat.length === 0 && (
              <div className="space-y-2">
                {["What's my best setup?", "Where am I leaking money?", "How should I size my trades?"].map((s) => (
                  <button key={s} onClick={() => setQ(s)} className="block w-full cursor-pointer rounded-lg border border-line bg-surface-2 px-3 py-2 text-left text-sm text-muted hover:text-ink">{s}</button>
                ))}
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} className={cn("max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm", m.role === "you" ? "ml-auto bg-accent text-accent-ink" : "bg-surface-2")}>{m.text}</div>
            ))}
          </div>
          <form onSubmit={ask} className="flex gap-2 p-4">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your trading…" />
            <Button type="submit" aria-label="Send"><Send size={15} /></Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
