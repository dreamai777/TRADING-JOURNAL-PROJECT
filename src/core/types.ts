// Pure domain types. No React, no Next, no browser APIs.
import type { CryptoMarket, ExchangeId } from "./markets";
import type { TestResult } from "./trader-test";
// Everything in src/core is shared with the future Expo mobile app.

export type Role = "user" | "admin";
export type AssetClass = "crypto" | "forex" | "futures" | "equities" | "options";
export type Side = "long" | "short";
export type TradeSource = "manual" | "csv" | "okx" | "binance" | "bitget" | "bybit" | "demo";

export type Emotion =
  | "calm"
  | "confident"
  | "focused"
  | "fomo"
  | "fearful"
  | "greedy"
  | "revenge"
  | "bored"
  | "tired";

export const POSITIVE_EMOTIONS: Emotion[] = ["calm", "confident", "focused"];

export type Mistake =
  | "moved-stop"
  | "no-stop"
  | "oversized"
  | "early-exit"
  | "late-entry"
  | "chased"
  | "broke-rules"
  | "overtraded";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  baseCurrency: CurrencyCode;
  accountSize: number; // in USD
  createdAt: string;
  avatar: string; // emoji
  status: "active" | "suspended";
  jobClass?: JobClass;
  title?: string;
  /** Latest Trader Class Test result. */
  traderProfile?: TestResult;
  /** Academy lesson ids completed. */
  lessonsDone?: string[];
  plan?: "free" | "premium" | "ultra" | "guild";
  /** Equipped item id per slot (see core/items.ts). */
  loadout?: Partial<Record<"weapon" | "offhand" | "helm" | "armor" | "cloak" | "boots" | "trinket", string>>;
}

export type JobClass = "wizard" | "warrior" | "assassin" | "archer" | "defender" | "sniper";

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  side: Side;
  entry: number;
  exit: number;
  qty: number;
  fees: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: string; // ISO
  closedAt: string; // ISO
  setupId?: string;
  tags: string[];
  emotion?: Emotion;
  mistakes: Mistake[];
  rulesFollowed?: boolean;
  rating?: number; // 1..5 execution quality
  notes?: string;
  source: TradeSource;
  replaySaved?: boolean;
  /** Crypto only: spot, perpetual, dated futures, margin, grid/DCA bot, copy trading, options. */
  market?: CryptoMarket;
  exchange?: ExchangeId;
  /** The exchange's own instrument id, e.g. OKX "SOL-USDT-SWAP". `symbol` holds the unified name, e.g. "SOLUSDT.P". */
  instrument?: string;
  leverage?: number;
  /** Net funding paid (+) or received (−) in USD over the life of a perpetual position. */
  funding?: number;
  /** Stable id from the exchange (e.g. "okx:SWAP:<posId>:<open>:<close>") so a re-sync never duplicates a trade. */
  externalId?: string;
}

export type WeaponClass = "Breakout" | "Reversal" | "Trend" | "Scalp" | "Range" | "News";

export interface Setup {
  id: string;
  userId: string;
  name: string;
  icon: string; // emoji
  weaponClass: WeaponClass;
  description: string;
  timeframe: string;
  markets: AssetClass[];
  rules: string[]; // playbook checklist
  entryTrigger: string;
  exitPlan: string;
  invalidation: string;
  equipped: boolean; // currently in the loadout
  createdAt: string;
}

export type CurrencyCode =
  | "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "CNY" | "INR" | "PHP" | "SGD" | "KRW" | "AED" | "BRL";

export interface TradeComputed extends Trade {
  pnl: number;
  risk?: number; // money at risk
  r?: number; // R multiple
  holdMinutes: number;
  win: boolean;
}
