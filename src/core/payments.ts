// Payment rails for the Hero Shop and plans. The prototype simulates every rail; production wires:
//  - card / Apple Pay / Google Pay: Stripe Checkout + Stripe Connect Express payouts to creators
//    (env STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET)
//  - crypto: Coinbase Commerce or NOWPayments hosted invoices (env COINBASE_COMMERCE_API_KEY or
//    NOWPAYMENTS_API_KEY), confirmed by webhook before the item is delivered
//  - gold: server-side ledger in Postgres (see supabase/schema.sql: gold_ledger), never the client
// Every rail returns the same Receipt, so delivery code does not care how the buyer paid.

export type PayMethod = "gold" | "card" | "crypto";
export type CryptoAsset = "USDT" | "USDC" | "BTC" | "ETH" | "SOL";

export const CRYPTO_ASSETS: { id: CryptoAsset; name: string; networks: string[] }[] = [
  { id: "USDT", name: "Tether", networks: ["TRON", "Ethereum", "Solana", "BNB Chain"] },
  { id: "USDC", name: "USD Coin", networks: ["Ethereum", "Solana", "Base", "Arbitrum"] },
  { id: "BTC", name: "Bitcoin", networks: ["Bitcoin", "Lightning"] },
  { id: "ETH", name: "Ether", networks: ["Ethereum", "Base", "Arbitrum"] },
  { id: "SOL", name: "Solana", networks: ["Solana"] },
];

export const PAY_METHODS: { id: PayMethod; label: string; icon: string; sub: string }[] = [
  { id: "gold", label: "Gold", icon: "🪙", sub: "Earned from quests, badges and invites" },
  { id: "card", label: "Card", icon: "💳", sub: "Visa, Mastercard, Amex, Apple Pay, Google Pay" },
  { id: "crypto", label: "Crypto", icon: "₿", sub: "USDT, USDC, BTC, ETH, SOL" },
];

export interface CheckoutRequest {
  method: PayMethod;
  amountUsd: number;
  amountGold: number;
  crypto?: { asset: CryptoAsset; network: string };
  description: string;
}

export interface Receipt {
  ok: true;
  ref: string;
  method: PayMethod;
  amountUsd: number;
  amountGold: number;
  at: string;
  /** For crypto: the invoice address the buyer paid (simulated). */
  address?: string;
}

export interface PaymentProvider {
  checkout(req: CheckoutRequest, goldBalance: number): Promise<Receipt | { ok: false; error: string }>;
}

/** Prototype rails: instant success, realistic validation. */
export const demoPayments: PaymentProvider = {
  async checkout(req, goldBalance) {
    if (req.method === "gold") {
      if (req.amountGold <= 0) return { ok: false, error: "This item can't be bought with Gold." };
      if (goldBalance < req.amountGold) return { ok: false, error: `You need ${(req.amountGold - goldBalance).toLocaleString()} more Gold. Clear quests or invite a friend to earn it.` };
    } else if (req.amountUsd <= 0) return { ok: false, error: "This item is Gold only." };
    await new Promise((r) => setTimeout(r, 600));
    const ref = `${req.method.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return {
      ok: true, ref, method: req.method, amountUsd: req.method === "gold" ? 0 : req.amountUsd, amountGold: req.method === "gold" ? req.amountGold : 0, at: new Date().toISOString(),
      address: req.method === "crypto" ? demoAddress(req.crypto?.network ?? "Ethereum") : undefined,
    };
  },
};

function demoAddress(network: string) {
  const r = () => Math.random().toString(16).slice(2, 10);
  if (network === "Bitcoin" || network === "Lightning") return `bc1q${r()}${r()}${r()}`.slice(0, 42);
  if (network === "TRON") return `T${r()}${r()}${r()}${r()}`.slice(0, 34).toUpperCase();
  if (network === "Solana") return `${r()}${r()}${r()}${r()}${r()}`.slice(0, 44);
  return `0x${r()}${r()}${r()}${r()}${r()}`.slice(0, 42);
}
