// Hero Shop economy: listings (strategies, setups, skills, items), Gold earned in-game, and pricing.
// Two currencies on purpose: Gold is earned by playing well (quests, badges, lessons, invites, sales)
// so free traders can buy real tools, and USD (card or crypto) is there for anyone who wants it now.
import type { Badge } from "./game";
import type { GearTierId } from "./gear";
import { TEMPLATES } from "./strategy-ai";
import type { Grade, StrategySpec } from "./strategy";
import type { AssetClass, Setup } from "./types";

export type ListingKind = "strategy" | "setup" | "skill" | "item";

export const KIND_META: Record<ListingKind, { label: string; plural: string; icon: string; blurb: string }> = {
  strategy: { label: "Lab Research", plural: "Lab Research", icon: "🧪", blurb: "Backtested rule sets. Run them in your Strategy Lab, grade them yourself." },
  setup: { label: "Weapon", plural: "Weapons (setups)", icon: "🗡️", blurb: "Playbook setups with checklists. Equip them in your Arsenal." },
  skill: { label: "Skill", plural: "Skills & techniques", icon: "📜", blurb: "Techniques and drills from proven traders: entries, risk, psychology." },
  item: { label: "Item", plural: "Items & cosmetics", icon: "💎", blurb: "Skins, auras, titles and boosts for your hero. Cosmetic only, never pay-to-win." },
};

export interface Listing {
  id: string;
  kind: ListingKind;
  title: string;
  icon: string;
  tagline: string;
  description: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  rarity: GearTierId;
  /** 0 = not sold for Gold. */
  priceGold: number;
  /** 0 = free (or Gold only). */
  priceUsd: number;
  tags: string[];
  markets: AssetClass[];
  rating: number;
  reviews: number;
  sales: number;
  createdAt: string;
  /** Proof attached to the listing. Backtest grade is re-computed by the buyer's own Lab. */
  verified?: { grade?: Grade; liveTrades?: number; liveWinRate?: number; livePf?: number };
  payload: { spec?: StrategySpec; setup?: Pick<Setup, "name" | "icon" | "weaponClass" | "description" | "timeframe" | "markets" | "rules" | "entryTrigger" | "exitPlan" | "invalidation">; skill?: { lessons: string[] }; item?: { effect: string } };
}

/** Creator keeps 85%. The platform fee covers payments, hosting and fraud checks. */
export const CREATOR_SHARE = 0.85;
/** 100 Gold = $1 when a creator cashes out Gold sales; Gold cannot be bought, only earned. */
export const GOLD_PER_USD = 100;

export const isFree = (l: Listing) => l.priceGold === 0 && l.priceUsd === 0;

export function creatorPayout(l: Listing, method: "gold" | "usd") {
  return method === "gold" ? Math.floor(l.priceGold * CREATOR_SHARE) : +(l.priceUsd * CREATOR_SHARE).toFixed(2);
}

// ---------- Gold ----------

export interface GoldSource { id: string; label: string; gold: number; hint: string }

/** Gold earned from playing, derived from the journal so it cannot drift from what the trader did. */
export function goldEarned(o: { xp: number; badges: Badge[]; lessonsDone: number; questDays: number; referralGold: number; salesGold: number; bonus: number }): GoldSource[] {
  return [
    { id: "xp", label: "Journal XP", gold: Math.floor(o.xp / 10), hint: "1 Gold per 10 XP from journaling trades" },
    { id: "quests", label: "Daily quests", gold: o.questDays * 25, hint: "25 Gold for each day you clear all daily quests" },
    { id: "badges", label: "Badges", gold: o.badges.filter((b) => b.unlocked).length * 150, hint: "150 Gold per badge" },
    { id: "lessons", label: "Academy", gold: o.lessonsDone * 60, hint: "60 Gold per lesson finished" },
    { id: "referrals", label: "Invites", gold: o.referralGold, hint: "Gold from friends you invited" },
    { id: "sales", label: "Shop sales", gold: o.salesGold, hint: "Your 85% of Gold sales" },
    { id: "bonus", label: "Perks", gold: o.bonus, hint: "Welcome perk and events" },
  ];
}

/** Days on which every daily quest would have been cleared: 3+ trades, all tagged, a note, no rule breaks. */
export function perfectQuestDays(trades: { closedAt: string; setupId?: string; notes?: string; rulesFollowed?: boolean }[]) {
  const byDay = new Map<string, typeof trades>();
  for (const t of trades) {
    const d = t.closedAt.slice(0, 10);
    byDay.set(d, [...(byDay.get(d) ?? []), t]);
  }
  let n = 0;
  for (const ts of byDay.values()) if (ts.length >= 3 && ts.every((t) => t.setupId && t.rulesFollowed) && ts.some((t) => (t.notes?.length ?? 0) > 20)) n++;
  return n;
}

// ---------- Seed catalog ----------

const SELLERS = [
  { id: "u_3", name: "Kai Moreno", avatar: "🐺" },
  { id: "u_4", name: "Aiko Tan", avatar: "🦉" },
  { id: "u_6", name: "Lena Brooks", avatar: "🦅" },
  { id: "u_admin", name: "EdgeForge Guild", avatar: "🛡️" },
];

function tmpl(id: string, patch: Partial<StrategySpec> = {}): StrategySpec {
  const t = TEMPLATES.find((x) => x.id === id)!;
  return { ...structuredClone(t.spec), id: `spec_${id}`, ...patch };
}

export function seedListings(now = Date.now()): Listing[] {
  const iso = (d: number) => new Date(now - d * 86400000).toISOString();
  const [kai, aiko, lena, guild] = SELLERS;
  const by = (s: (typeof SELLERS)[number]) => ({ sellerId: s.id, sellerName: s.name, sellerAvatar: s.avatar });
  return [
    // Lab Research (strategies)
    { id: "l_s1", kind: "strategy", title: "Regime Pullback v3", icon: "🏹", tagline: "Dip-buying only when the 200 SMA says bull.", description: "RSI(3) dips inside a 200-SMA uptrend with a 15-bar time stop. Survived every regime in 4 years of ES and BTC.", ...by(lena), rarity: "legendary", priceGold: 4500, priceUsd: 39, tags: ["trend", "swing", "mean-reversion"], markets: ["equities", "futures", "crypto"], rating: 4.9, reviews: 212, sales: 1840, createdAt: iso(40), verified: { grade: "S+", liveTrades: 186, liveWinRate: 0.63, livePf: 2.1 }, payload: { spec: tmpl("trend-pullback") } },
    { id: "l_s2", kind: "strategy", title: "Turtle Blade 20/10", icon: "🗡️", tagline: "The classic channel breakout, modernised.", description: "Donchian 20/10 with a 3 ATR stop. Low win rate, huge winners. For traders who can sit through chop.", ...by(kai), rarity: "rare", priceGold: 1800, priceUsd: 15, tags: ["breakout", "trend"], markets: ["crypto", "futures"], rating: 4.6, reviews: 98, sales: 760, createdAt: iso(22), verified: { grade: "A", liveTrades: 74, liveWinRate: 0.38, livePf: 1.7 }, payload: { spec: tmpl("donchian") } },
    { id: "l_s3", kind: "strategy", title: "Sniper Micro-Dip", icon: "🎯", tagline: "RSI(2) flushes above the 50 EMA. In and out in 5 bars.", description: "Built for scalpers: tiny risk, 1.5R target, hard time stop. Works best in liquid crypto perps.", ...by(aiko), rarity: "mythical", priceGold: 3000, priceUsd: 25, tags: ["scalp", "crypto"], markets: ["crypto", "futures"], rating: 4.7, reviews: 143, sales: 1120, createdAt: iso(9), verified: { grade: "S", liveTrades: 412, liveWinRate: 0.58, livePf: 1.6 }, payload: { spec: tmpl("scalp") } },
    { id: "l_s4", kind: "strategy", title: "EMA Cross Starter", icon: "🔱", tagline: "Free starter system to learn the Lab.", description: "21/55 EMA cross with a 3R target. Not an edge on its own: a teaching tool for the Strategy Lab.", ...by(guild), rarity: "common", priceGold: 0, priceUsd: 0, tags: ["starter", "free"], markets: ["crypto", "forex"], rating: 4.3, reviews: 501, sales: 9200, createdAt: iso(90), verified: { grade: "C" }, payload: { spec: tmpl("ema-cross") } },
    { id: "l_s5", kind: "strategy", title: "Breakdown Hunter", icon: "🦂", tagline: "Short new lows in confirmed downtrends.", description: "The bear-market half of a portfolio. Pairs with any long system to smooth the curve.", ...by(kai), rarity: "uncommon", priceGold: 1200, priceUsd: 9, tags: ["short", "breakout"], markets: ["crypto", "equities"], rating: 4.4, reviews: 51, sales: 310, createdAt: iso(5), verified: { grade: "B" }, payload: { spec: tmpl("short-breakdown") } },
    // Weapons (setups)
    { id: "l_w1", kind: "setup", title: "London Sweep Reversal", icon: "⚔️", tagline: "Fade the Asia-range sweep at the London open.", description: "A full playbook: context, trigger, invalidation, management. Includes a 9-point checklist.", ...by(lena), rarity: "legendary", priceGold: 3800, priceUsd: 29, tags: ["forex", "session", "reversal"], markets: ["forex"], rating: 4.8, reviews: 167, sales: 1310, createdAt: iso(30), verified: { liveTrades: 240, liveWinRate: 0.61, livePf: 2.4 }, payload: { setup: { name: "London Sweep Reversal", icon: "⚔️", weaponClass: "Reversal", description: "Fade the Asia-range sweep at the London open.", timeframe: "15m", markets: ["forex"], rules: ["Mark the Asia high/low", "Wait for a sweep in the first London hour", "Displacement candle back inside the range", "Enter on the retest of the displacement", "Stop beyond the sweep wick", "Target the opposite side of the Asia range"], entryTrigger: "Retest after displacement back into range", exitPlan: "Opposite Asia extreme, trail after 1.5R", invalidation: "Close beyond the sweep wick" } } },
    { id: "l_w2", kind: "setup", title: "Opening Range Breakout", icon: "🔥", tagline: "First 15 minutes define the day.", description: "Equities and index futures ORB with volume confirmation and a VWAP hold rule.", ...by(kai), rarity: "rare", priceGold: 1500, priceUsd: 12, tags: ["equities", "intraday"], markets: ["equities", "futures"], rating: 4.5, reviews: 88, sales: 640, createdAt: iso(14), verified: { liveTrades: 96, liveWinRate: 0.52, livePf: 1.6 }, payload: { setup: { name: "Opening Range Breakout", icon: "🔥", weaponClass: "Breakout", description: "First 15 minutes define the day.", timeframe: "5m", markets: ["equities", "futures"], rules: ["Mark the 15-minute opening range", "Relative volume above 1.5", "Break and close outside the range", "Price holds above VWAP for longs", "Stop at the range midpoint"], entryTrigger: "5m close outside the opening range", exitPlan: "2R, then trail under the 9 EMA", invalidation: "Back inside the range midpoint" } } },
    { id: "l_w3", kind: "setup", title: "Funding Flip Squeeze", icon: "🌪️", tagline: "Crypto perps: trade the crowded side's pain.", description: "Uses funding and open interest to catch squeezes on BTC and ETH perps.", ...by(aiko), rarity: "mythical", priceGold: 2600, priceUsd: 0, tags: ["crypto", "perps", "gold-only"], markets: ["crypto"], rating: 4.6, reviews: 74, sales: 520, createdAt: iso(3), payload: { setup: { name: "Funding Flip Squeeze", icon: "🌪️", weaponClass: "Reversal", description: "Trade against extreme funding.", timeframe: "1H", markets: ["crypto"], rules: ["Funding in the top 5% of its 30-day range", "Open interest rising into the move", "Price fails to make a new high/low", "Enter on the first lower high", "Stop above the failed high"], entryTrigger: "Lower high after funding extreme", exitPlan: "Scale out at 1R, 2R, trail rest", invalidation: "New high with OI still rising" } } },
    // Skills
    { id: "l_k1", kind: "skill", title: "Iron Discipline Drills", icon: "🧘", tagline: "21 days to stop revenge trading.", description: "Daily micro-drills with journal prompts. Unlocks a Mindset quest chain and the Stoic title.", ...by(guild), rarity: "rare", priceGold: 900, priceUsd: 7, tags: ["psychology", "mindset"], markets: [], rating: 4.8, reviews: 320, sales: 4100, createdAt: iso(60), payload: { skill: { lessons: ["The 2-loss rule", "Cooling-off timer", "Pre-market intent", "Post-loss journaling", "The weekly review ritual"] } } },
    { id: "l_k2", kind: "skill", title: "Position Sizing Mastery", icon: "⚖️", tagline: "Fixed fractional, volatility sizing and Kelly, explained.", description: "Hands-on sizing techniques with calculators wired to your own account size.", ...by(lena), rarity: "uncommon", priceGold: 600, priceUsd: 5, tags: ["risk"], markets: [], rating: 4.7, reviews: 210, sales: 2900, createdAt: iso(45), payload: { skill: { lessons: ["Risk per trade", "ATR-based sizing", "Correlation and heat", "Kelly and half-Kelly", "Drawdown recovery math"] } } },
    { id: "l_k3", kind: "skill", title: "Order Flow Reading", icon: "📊", tagline: "Read the tape like a market maker.", description: "Footprint charts, delta and absorption, with 40 annotated examples.", ...by(aiko), rarity: "legendary", priceGold: 0, priceUsd: 49, tags: ["advanced", "usd-only"], markets: ["futures", "crypto"], rating: 4.9, reviews: 96, sales: 480, createdAt: iso(12), payload: { skill: { lessons: ["Delta basics", "Absorption", "Exhaustion", "Stacked imbalances", "Putting it together"] } } },
    // Items
    { id: "l_i1", kind: "item", title: "Aurora Aura", icon: "🌌", tagline: "Northern-lights glow around your hero.", description: "Animated aura for your character card and share cards.", ...by(guild), rarity: "mythical", priceGold: 1200, priceUsd: 0, tags: ["cosmetic", "aura"], markets: [], rating: 4.9, reviews: 802, sales: 6100, createdAt: iso(20), payload: { item: { effect: "Hero aura" } } },
    { id: "l_i2", kind: "item", title: "Title: The Unshaken", icon: "🏷️", tagline: "A title shown under your name.", description: "Displayed on your profile, leaderboard and share cards.", ...by(guild), rarity: "rare", priceGold: 500, priceUsd: 0, tags: ["cosmetic", "title"], markets: [], rating: 4.6, reviews: 390, sales: 3400, createdAt: iso(70), payload: { item: { effect: "Profile title" } } },
    { id: "l_i3", kind: "item", title: "Phoenix Share-Card Frame", icon: "🐦‍🔥", tagline: "Golden fire frame for your trade share cards.", description: "Make your winners stand out on X, Instagram, TikTok and LinkedIn.", ...by(guild), rarity: "legendary", priceGold: 2000, priceUsd: 4.99, tags: ["cosmetic", "share"], markets: [], rating: 4.8, reviews: 512, sales: 2800, createdAt: iso(8), payload: { item: { effect: "Share card frame" } } },
    { id: "l_i4", kind: "item", title: "Double XP Scroll (24h)", icon: "📜", tagline: "Double journal XP for a day.", description: "XP boost only. It never changes stats, grades or verified badges.", ...by(guild), rarity: "uncommon", priceGold: 300, priceUsd: 0, tags: ["boost"], markets: [], rating: 4.5, reviews: 1200, sales: 15000, createdAt: iso(100), payload: { item: { effect: "2× XP for 24h" } } },
  ];
}
