// Referral program ("Recruit your party"). Double-sided: the friend gets 15% off, the inviter earns
// Gold right away and a share of what the friend pays. Rewards unlock only once the friend is real
// (journaled 10 trades), which keeps farmed sign-ups out.
import { hashString } from "./random";

/** Discount for the invited friend, on their first 3 months of Premium or Ultra (or a whole first year). */
export const FRIEND_DISCOUNT = 0.15;
export const FRIEND_DISCOUNT_MONTHS = 3;
/** Gold to the inviter when the friend becomes active. Friend also gets a welcome pack. */
export const ACTIVE_FRIEND_GOLD = 500;
export const FRIEND_WELCOME_GOLD = 250;
export const ACTIVATION_TRADES = 10;

export type ReferralStatus = "invited" | "joined" | "active" | "paid";

export interface Referral {
  id: string;
  referrerId: string;
  friendName: string;
  friendEmail: string;
  status: ReferralStatus;
  plan?: "premium" | "ultra";
  /** Monthly price the friend pays after discount, USD. */
  monthlyUsd?: number;
  /** Months the friend has paid so far. */
  monthsPaid?: number;
  at: string;
}

export interface ReferralRank {
  id: string;
  name: string;
  icon: string;
  minActive: number;
  /** Recurring share of friend payments, as Gold-equivalent credit. */
  revShare: number;
  perk: string;
}

export const REFERRAL_RANKS: ReferralRank[] = [
  { id: "scout", name: "Scout", icon: "🧭", minActive: 0, revShare: 0.1, perk: "10% of every friend's payments for 12 months" },
  { id: "recruiter", name: "Recruiter", icon: "📯", minActive: 1, revShare: 0.15, perk: "15% revenue share and the Recruiter title" },
  { id: "captain", name: "Squad Captain", icon: "⚔️", minActive: 3, revShare: 0.15, perk: "1 free month of Premium and the Captain's banner" },
  { id: "warlord", name: "Guild Warlord", icon: "👑", minActive: 10, revShare: 0.2, perk: "20% revenue share and the Warlord aura" },
  { id: "legend", name: "Legend of the Realm", icon: "🌟", minActive: 25, revShare: 0.25, perk: "Lifetime Premium and 25% revenue share" },
];

export function referralRank(activeFriends: number) {
  let rank = REFERRAL_RANKS[0];
  for (const r of REFERRAL_RANKS) if (activeFriends >= r.minActive) rank = r;
  const next = REFERRAL_RANKS.find((r) => r.minActive > activeFriends) ?? null;
  return { rank, next };
}

/** Short, readable, stable code: name + 4 chars of a hash. */
export function referralCode(user: { id: string; name: string }) {
  const name = user.name.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 6) || "HERO";
  const h = hashString(user.id).toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").padStart(4, "X").slice(-4);
  return `${name}-${h}`;
}

export function isValidCode(code: string) {
  return /^[A-Z]{1,6}-[A-Z0-9]{4}$/.test(code.trim().toUpperCase());
}

/** Price after the friend discount. Rounded to cents. */
export function discounted(priceUsd: number, hasReferral: boolean) {
  return hasReferral ? Math.round(priceUsd * (1 - FRIEND_DISCOUNT) * 100) / 100 : priceUsd;
}

/** What one month of a friend's plan is worth to the inviter, in Gold (100 Gold = $1). */
export function monthlyShareGold(monthlyUsd: number, rank: ReferralRank) {
  return Math.round(monthlyUsd * rank.revShare * 100);
}

export function referralTotals(refs: Referral[]) {
  const active = refs.filter((r) => r.status === "active" || r.status === "paid").length;
  const { rank, next } = referralRank(active);
  const signupGold = active * ACTIVE_FRIEND_GOLD;
  const shareGold = refs.filter((r) => r.status === "paid").reduce((a, r) => a + monthlyShareGold(r.monthlyUsd ?? 0, rank) * Math.min(12, r.monthsPaid ?? 0), 0);
  return { invited: refs.length, joined: refs.filter((r) => r.status !== "invited").length, active, paid: refs.filter((r) => r.status === "paid").length, rank, next, signupGold, shareGold, totalGold: signupGold + shareGold };
}

export function inviteLink(origin: string, code: string) {
  return `${origin}/invite?code=${encodeURIComponent(code)}`;
}

export function seedReferrals(referrerId: string, now = Date.now()): Referral[] {
  const iso = (d: number) => new Date(now - d * 86400000).toISOString();
  return [
    { id: "r1", referrerId, friendName: "Marco Diaz", friendEmail: "marco@example.com", status: "paid", plan: "premium", monthlyUsd: 16.15, monthsPaid: 4, at: iso(130) },
    { id: "r2", referrerId, friendName: "Yuna Park", friendEmail: "yuna@example.com", status: "paid", plan: "ultra", monthlyUsd: 41.65, monthsPaid: 2, at: iso(70) },
    { id: "r3", referrerId, friendName: "Tom Okafor", friendEmail: "tom@example.com", status: "active", at: iso(20) },
    { id: "r4", referrerId, friendName: "Sara Lind", friendEmail: "sara@example.com", status: "joined", at: iso(6) },
    { id: "r5", referrerId, friendName: "dev.raj@example.com", friendEmail: "dev.raj@example.com", status: "invited", at: iso(1) },
  ];
}
