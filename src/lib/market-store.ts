"use client";
// Strategy Lab, Hero Shop and referral state. Kept in its own persisted store so it ships independently
// of the journal store; production moves it to the Supabase tables in supabase/schema.sql
// (strategies, listings, purchases, gold_ledger, referrals). Gold spends here are client-side only in
// the prototype; the real ledger is written by the server after a payment webhook.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uid } from "@/core/random";
import { FRIEND_WELCOME_GOLD, seedReferrals, type Referral } from "@/core/referral";
import { seedListings, type Listing } from "@/core/shop";
import type { Grade, StrategySpec } from "@/core/strategy";
import type { Receipt } from "@/core/payments";
import { useStore } from "./store";

export interface SavedStrategy extends StrategySpec {
  userId: string;
  createdAt: string;
  updatedAt: string;
  grade?: Grade;
  score?: number;
  /** Listing id if published. */
  listingId?: string;
  /** Listing id it was bought from. */
  fromListing?: string;
}

export interface Purchase {
  id: string;
  userId: string;
  listingId: string;
  receipt: Receipt;
}

export interface GoldEntry {
  id: string;
  userId: string;
  gold: number;
  reason: string;
  at: string;
}

interface MarketState {
  strategies: SavedStrategy[];
  listings: Listing[];
  purchases: Purchase[];
  ledger: GoldEntry[];
  referrals: Referral[];
  /** Referral code captured from an invite link, applied at signup and checkout. */
  pendingReferral: string | null;
  /** Referral code each user signed up with. */
  usedReferral: Record<string, string>;

  saveStrategy: (s: StrategySpec & { grade?: Grade; score?: number }) => SavedStrategy;
  deleteStrategy: (id: string) => void;
  publish: (l: Omit<Listing, "id" | "createdAt" | "rating" | "reviews" | "sales">, strategyId?: string) => Listing;
  unpublish: (listingId: string) => void;
  recordPurchase: (listingId: string, receipt: Receipt) => void;
  addGold: (gold: number, reason: string) => void;
  invite: (friendEmail: string) => void;
  captureReferral: (code: string) => void;
  claimReferral: (userId: string) => void;
}

const me = () => useStore.getState().sessionUserId ?? "anon";

export const useMarket = create<MarketState>()(
  persist(
    (set, get) => ({
      strategies: [],
      listings: seedListings(),
      purchases: [],
      ledger: [],
      referrals: seedReferrals("u_trader"),
      pendingReferral: null,
      usedReferral: {},

      saveStrategy(s) {
        const now = new Date().toISOString();
        const existing = get().strategies.find((x) => x.id === s.id && x.userId === me());
        const saved: SavedStrategy = existing ? { ...existing, ...s, updatedAt: now } : { ...s, id: s.id && s.id !== "draft" ? s.id : uid("st"), userId: me(), createdAt: now, updatedAt: now };
        set((st) => ({ strategies: existing ? st.strategies.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...st.strategies] }));
        return saved;
      },
      deleteStrategy: (id) => set((st) => ({ strategies: st.strategies.filter((x) => x.id !== id) })),
      publish(input, strategyId) {
        const listing: Listing = { ...input, id: uid("l"), createdAt: new Date().toISOString(), rating: 0, reviews: 0, sales: 0 };
        set((st) => ({ listings: [listing, ...st.listings], strategies: st.strategies.map((x) => (x.id === strategyId ? { ...x, listingId: listing.id } : x)) }));
        return listing;
      },
      unpublish: (listingId) => set((st) => ({ listings: st.listings.filter((l) => l.id !== listingId), strategies: st.strategies.map((x) => (x.listingId === listingId ? { ...x, listingId: undefined } : x)) })),
      recordPurchase(listingId, receipt) {
        const l = get().listings.find((x) => x.id === listingId);
        if (!l) return;
        const user = me();
        set((st) => ({
          purchases: [...st.purchases, { id: uid("p"), userId: user, listingId, receipt }],
          listings: st.listings.map((x) => (x.id === listingId ? { ...x, sales: x.sales + 1 } : x)),
          ledger: receipt.amountGold ? [...st.ledger, { id: uid("g"), userId: user, gold: -receipt.amountGold, reason: `Bought ${l.title}`, at: receipt.at }] : st.ledger,
        }));
        // Deliver: strategies land in the Lab, setups in the Arsenal. Skills and items show in the library.
        if (l.payload.spec) get().saveStrategy({ ...l.payload.spec, id: uid("st"), name: l.payload.spec.name });
        if (l.payload.setup) useStore.getState().saveSetup({ ...l.payload.setup, equipped: false });
      },
      addGold: (gold, reason) => set((st) => ({ ledger: [...st.ledger, { id: uid("g"), userId: me(), gold, reason, at: new Date().toISOString() }] })),
      invite: (friendEmail) => set((st) => ({ referrals: [{ id: uid("r"), referrerId: me(), friendName: friendEmail, friendEmail, status: "invited", at: new Date().toISOString() }, ...st.referrals] })),
      captureReferral: (code) => set({ pendingReferral: code.trim().toUpperCase() }),
      claimReferral(userId) {
        const code = get().pendingReferral;
        if (!code || get().usedReferral[userId]) return;
        set((st) => ({ usedReferral: { ...st.usedReferral, [userId]: code }, pendingReferral: null, ledger: [...st.ledger, { id: uid("g"), userId, gold: FRIEND_WELCOME_GOLD, reason: `Welcome pack from invite ${code}`, at: new Date().toISOString() }] }));
      },
    }),
    { name: "edgeforge-market-v1", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
