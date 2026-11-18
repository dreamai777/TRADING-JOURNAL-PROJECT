"use client";
// Client data layer for the prototype: zustand + localStorage.
// The action surface mirrors what the Supabase repository will expose (see supabase/schema.sql),
// and zustand runs unchanged in React Native (swap storage for AsyncStorage/MMKV).
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEMO_ADMIN_ID, DEMO_TRADER_ID, demoSetups, demoTrades, demoUsers } from "@/core/demo";
import { uid } from "@/core/random";
import type { RangeKey } from "@/core/stats";
import type { CurrencyCode, JobClass, Role, Setup, Trade, User } from "@/core/types";

export interface Connection {
  userId: string;
  exchange: "binance" | "okx" | "bitget";
  label: string;
  connectedAt: string;
  lastSync: string;
}

interface State {
  users: User[];
  trades: Trade[];
  setups: Setup[];
  sessionUserId: string | null;
  currency: CurrencyCode;
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  setJobClass: (j: JobClass) => void;
  hydrated: boolean;
  lastXpGain: { amount: number; at: number } | null;
  connections: Connection[];
  connectExchange: (exchange: Connection["exchange"], label: string) => number;
  disconnectExchange: (exchange: Connection["exchange"]) => void;

  login: (email: string, password: string) => { ok: true; user: User } | { ok: false; error: string };
  signup: (name: string, email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  setCurrency: (c: CurrencyCode) => void;
  updateMe: (patch: Partial<User>) => void;

  addTrade: (t: Omit<Trade, "id" | "userId">, xp?: number) => Trade;
  updateTrade: (id: string, patch: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  importTrades: (ts: Trade[]) => void;

  saveSetup: (s: Omit<Setup, "userId" | "createdAt" | "id"> & { id?: string }) => void;
  deleteSetup: (id: string) => void;

  adminSetRole: (userId: string, role: Role) => void;
  adminSetStatus: (userId: string, status: User["status"]) => void;
  loadDemoForMe: () => void;
  resetAll: () => void;
}

function seed() {
  const now = Date.now();
  const users = demoUsers(now);
  const trades = [
    ...demoTrades(DEMO_TRADER_ID, 520, now, 7, 730),
    ...demoTrades(DEMO_ADMIN_ID, 30, now, 11),
    ...demoTrades("u_3", 45, now, 21),
    ...demoTrades("u_4", 60, now, 31),
    ...demoTrades("u_5", 12, now, 41),
    ...demoTrades("u_6", 8, now, 51),
  ].map((t) => (t.userId === DEMO_TRADER_ID ? t : { ...t, id: `${t.id}_${t.userId}`, setupId: t.setupId ? `${t.setupId}_${t.userId}` : undefined }));
  const setups = [
    ...demoSetups(DEMO_TRADER_ID),
    ...[DEMO_ADMIN_ID, "u_3", "u_4", "u_5", "u_6"].flatMap((u) => demoSetups(u).map((s) => ({ ...s, id: `${s.id}_${u}` }))),
  ];
  return { users, trades, setups };
}

const DEMO_PASSWORD = "demo1234";

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...seed(),
      sessionUserId: null,
      currency: "USD",
      range: "ALL",
      setRange: (range) => set({ range }),
      setJobClass: (jobClass) => set((s) => ({ users: s.users.map((u) => (u.id === s.sessionUserId ? { ...u, jobClass } : u)) })),
      hydrated: false,
      lastXpGain: null,
      connections: [],
      connectExchange(exchange, label) {
        // Prototype: simulates the first sync by pulling recent fills. Production: server-side CCXT
        // worker with encrypted read-only keys; the browser never holds the secret after submit.
        const me = get().sessionUserId!;
        const now = new Date().toISOString();
        const fresh = demoTrades(me, 12, Date.now(), Math.floor(Math.random() * 1e6))
          .filter((t) => t.assetClass === "crypto")
          .map((t) => ({ ...t, id: uid("t"), source: exchange, setupId: undefined, emotion: undefined, rulesFollowed: undefined, notes: undefined, mistakes: [], tags: ["synced"] }));
        set((s) => ({
          trades: [...s.trades, ...fresh],
          connections: [...s.connections.filter((c) => !(c.userId === me && c.exchange === exchange)), { userId: me, exchange, label, connectedAt: now, lastSync: now }],
        }));
        return fresh.length;
      },
      disconnectExchange: (exchange) => set((s) => ({ connections: s.connections.filter((c) => !(c.userId === s.sessionUserId && c.exchange === exchange)) })),

      login(email, password) {
        const user = get().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!user) return { ok: false, error: "No account with that email." };
        if (user.status === "suspended") return { ok: false, error: "This account is suspended. Contact support." };
        // Prototype auth: demo password for seeded users, any 8+ char password for local signups.
        if (password.length < 8) return { ok: false, error: "Wrong password." };
        if (user.id.startsWith("u_") && !user.id.startsWith("u_local") && password !== DEMO_PASSWORD) return { ok: false, error: "Wrong password. Demo accounts use demo1234." };
        set({ sessionUserId: user.id, currency: user.baseCurrency });
        return { ok: true, user };
      },
      signup(name, email, password) {
        if (get().users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return { ok: false, error: "Email already registered." };
        if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
        const user: User = { id: uid("u_local"), name, email, role: "user", baseCurrency: "USD", accountSize: 10000, createdAt: new Date().toISOString(), avatar: "🐲", status: "active" };
        set((s) => ({ users: [...s.users, user], sessionUserId: user.id }));
        return { ok: true };
      },
      logout: () => set({ sessionUserId: null }),
      setCurrency: (currency) => set({ currency }),
      updateMe: (patch) => set((s) => ({ users: s.users.map((u) => (u.id === s.sessionUserId ? { ...u, ...patch } : u)) })),

      addTrade(t, xp) {
        const trade: Trade = { ...t, id: uid("t"), userId: get().sessionUserId! };
        set((s) => ({ trades: [...s.trades, trade], lastXpGain: xp ? { amount: xp, at: Date.now() } : s.lastXpGain }));
        return trade;
      },
      updateTrade: (id, patch) => set((s) => ({ trades: s.trades.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTrade: (id) => set((s) => ({ trades: s.trades.filter((t) => t.id !== id) })),
      importTrades: (ts) => set((s) => ({ trades: [...s.trades, ...ts.map((t) => ({ ...t, userId: s.sessionUserId! }))] })),

      saveSetup(input) {
        const me = get().sessionUserId!;
        set((s) => {
          if (input.id && s.setups.some((x) => x.id === input.id)) {
            return { setups: s.setups.map((x) => (x.id === input.id ? { ...x, ...input, id: x.id } : x)) };
          }
          return { setups: [...s.setups, { ...input, id: uid("s"), userId: me, createdAt: new Date().toISOString() }] };
        });
      },
      deleteSetup: (id) => set((s) => ({ setups: s.setups.filter((x) => x.id !== id), trades: s.trades.map((t) => (t.setupId === id ? { ...t, setupId: undefined } : t)) })),

      adminSetRole: (userId, role) => set((s) => ({ users: s.users.map((u) => (u.id === userId ? { ...u, role } : u)) })),
      adminSetStatus: (userId, status) => set((s) => ({ users: s.users.map((u) => (u.id === userId ? { ...u, status } : u)) })),
      loadDemoForMe() {
        const me = get().sessionUserId!;
        const setups = demoSetups(me).map((x) => ({ ...x, id: `${x.id}_${me}` }));
        const trades = demoTrades(me, 120, Date.now(), 99).map((t) => ({ ...t, id: `${t.id}_${me}`, setupId: `${t.setupId}_${me}` }));
        set((s) => ({ setups: [...s.setups.filter((x) => x.userId !== me), ...setups], trades: [...s.trades.filter((t) => t.userId !== me), ...trades] }));
      },
      resetAll: () => set({ ...seed() }),
    }),
    {
      name: "edgeforge-v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ users: s.users, trades: s.trades, setups: s.setups, sessionUserId: s.sessionUserId, currency: s.currency, connections: s.connections, range: s.range }),
    },
  ),
);

export function useMe() {
  return useStore((s) => s.users.find((u) => u.id === s.sessionUserId) ?? null);
}
