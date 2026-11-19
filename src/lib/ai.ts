"use client";
// Client side of the AI Council: a small persisted store (custom agents, chats, notebook), a hook that
// runs every agent over the journal, and askAgent(), which streams from Claude when the server has a key
// and falls back to the offline engine when it doesn't.
import { useMemo, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { runCouncil, type CoreAgentId } from "@/core/ai/agents";
import { councilContext, journalContext, localAnswer, reportContext } from "@/core/ai/context";
import { customAgentReport, type CustomAgent } from "@/core/ai/custom";
import type { TradeReview } from "@/core/ai/review";
import { uid } from "@/core/random";
import { useJournal } from "./hooks";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  source?: "claude" | "offline" | "notice";
}

/** What the server says about AI: is a key set, and how many credits this user has left. */
export interface AiStatus {
  configured: boolean;
  provider?: string;
  models?: { fast: string; deep: string };
  costs?: { chat: number; deep: number };
  usage?: { plan: string; used: number; limit: number | null; remaining: number | null; resetsAt: string; budgetReached: boolean } | null;
}

export interface NotebookEntry {
  userId: string;
  date: string; // YYYY-MM-DD
  sleep?: number; // 1..5
  mood?: number; // 1..5
  bias?: "bullish" | "bearish" | "neutral";
  plan?: string;
  levels?: string;
  recap?: string;
  lesson?: string;
  habits?: Record<string, boolean>;
}

interface AiState {
  customAgents: CustomAgent[];
  chats: Record<string, ChatMsg[]>; // key: `${userId}:${agentId}`
  notebook: NotebookEntry[];
  aiMode: "unknown" | "claude" | "offline";
  status: AiStatus | null;
  saveCustomAgent: (a: Omit<CustomAgent, "id" | "createdAt"> & { id?: string }) => string;
  deleteCustomAgent: (id: string) => void;
  pushChat: (key: string, m: ChatMsg) => void;
  patchLastChat: (key: string, content: string, source?: ChatMsg["source"]) => void;
  clearChat: (key: string) => void;
  saveNote: (e: NotebookEntry) => void;
  setMode: (m: AiState["aiMode"]) => void;
  setStatus: (st: AiStatus | null) => void;
}

export const useAi = create<AiState>()(
  persist(
    (set) => ({
      customAgents: [],
      chats: {},
      notebook: [],
      aiMode: "unknown",
      status: null,
      saveCustomAgent(a) {
        const id = a.id ?? uid("ag");
        set((s) => ({
          customAgents: s.customAgents.some((x) => x.id === id)
            ? s.customAgents.map((x) => (x.id === id ? { ...x, ...a, id } : x))
            : [...s.customAgents, { ...a, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      deleteCustomAgent: (id) => set((s) => ({ customAgents: s.customAgents.filter((x) => x.id !== id) })),
      pushChat: (key, m) => set((s) => ({ chats: { ...s.chats, [key]: [...(s.chats[key] ?? []), m].slice(-60) } })),
      patchLastChat: (key, content, source) =>
        set((s) => {
          const list = [...(s.chats[key] ?? [])];
          if (!list.length) return s;
          list[list.length - 1] = { ...list[list.length - 1], content, source: source ?? list[list.length - 1].source };
          return { chats: { ...s.chats, [key]: list } };
        }),
      clearChat: (key) => set((s) => ({ chats: { ...s.chats, [key]: [] } })),
      saveNote: (e) => set((s) => ({ notebook: [...s.notebook.filter((x) => !(x.userId === e.userId && x.date === e.date)), e] })),
      setMode: (aiMode) => set({ aiMode }),
      setStatus: (status) => set((s) => ({ status, aiMode: status ? (status.configured ? "claude" : "offline") : s.aiMode })),
    }),
    { name: "edgeforge-ai-v1", storage: createJSONStorage(() => localStorage), skipHydration: true, partialize: (s) => ({ customAgents: s.customAgents, chats: s.chats, notebook: s.notebook }) },
  ),
);

/** Runs every agent over the trader's journal. Memoized on the journal. */
export function useCouncil() {
  const j = useJournal();
  const [now] = useState(() => Date.now());
  const customAll = useAi((s) => s.customAgents);
  const council = useMemo(() => runCouncil({ trades: j.trades, setups: j.setups, account: j.account, now }), [j.trades, j.setups, j.account, now]);
  const customAgents = useMemo(() => customAll.filter((a) => a.userId === j.me?.id), [customAll, j.me?.id]);
  const customReports = useMemo(() => Object.fromEntries(customAgents.map((a) => [a.id, customAgentReport(a, j.trades, j.setups, j.account)])), [customAgents, j.trades, j.setups, j.account]);
  return { ...j, council, customAgents, customReports, now };
}

type CouncilBundle = ReturnType<typeof useCouncil>;

type Me = CouncilBundle["me"];
const identity = (me: Me) => (me ? { id: me.id, email: me.email, plan: me.plan } : undefined);

/** Asks the server whether Claude is configured and how many credits are left. Safe to call often. */
export async function refreshAiStatus(me: Me) {
  try {
    const id = identity(me);
    const res = await fetch("/api/ai", { cache: "no-store", headers: id ? { "x-ef-user": id.id, "x-ef-email": id.email ?? "", "x-ef-plan": String(id.plan ?? "free") } : {} });
    if (!res.ok) return;
    useAi.getState().setStatus((await res.json()) as AiStatus);
  } catch {
    /* offline; keep the last known status */
  }
}

/**
 * Asks an agent a question. Streams Claude's answer into the chat when the server has a key; otherwise
 * writes the offline engine's answer. Returns where the answer came from.
 */
export async function askAgent(opts: { bundle: CouncilBundle; agent: CoreAgentId | "custom"; custom?: CustomAgent; chatKey: string; question: string; review?: TradeReview; deep?: boolean }) {
  const { bundle, agent, custom, chatKey, question, review, deep } = opts;
  const ai = useAi.getState();
  const history = (ai.chats[chatKey] ?? []).filter((m) => m.source !== "notice").map(({ role, content }) => ({ role, content }));
  ai.pushChat(chatKey, { role: "user", content: question });
  ai.pushChat(chatKey, { role: "assistant", content: "", source: "claude" });

  const customReport = custom ? bundle.customReports[custom.id] : undefined;
  const offline = () => {
    const text = localAnswer(question, agent === "custom" ? "custom" : agent, bundle.council, customReport, review);
    useAi.getState().patchLastChat(chatKey, text, "offline");
    useAi.getState().setMode("offline");
    return "offline" as const;
  };
  if (useAi.getState().aiMode === "offline") return offline();

  const context = {
    journal: journalContext(bundle.trades, bundle.setups, bundle.account),
    council: councilContext(bundle.council),
    ...(customReport ? { customAgent: reportContext(customReport) } : {}),
    ...(review ? { tradeReview: review } : {}),
  };
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, custom, deep, user: identity(bundle.me), setupNames: bundle.setups.map((s) => ({ id: s.id, name: s.name })), context, messages: [...history.filter((m) => m.content), { role: "user", content: question }] }),
    });
    if (res.status === 429 || res.status === 402) {
      // Out of credits or plan-locked: say so plainly instead of silently switching engines.
      const info = (await res.json().catch(() => ({}))) as { message?: string };
      useAi.getState().patchLastChat(chatKey, info.message ?? "You're out of AI chats for now.", "notice");
      void refreshAiStatus(bundle.me);
      return "notice" as const;
    }
    if (!res.ok || !res.body) return offline();
    useAi.getState().setMode("claude");
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      useAi.getState().patchLastChat(chatKey, text, "claude");
    }
    void refreshAiStatus(bundle.me);
    return "claude" as const;
  } catch {
    return offline();
  }
}
