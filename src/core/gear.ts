// Gear tiers: equipment upgrades from Basic to God as the trader's stats prove the edge.
// A tier needs a minimum sample size, a win rate AND a profit factor, so neither luck over a few
// trades nor a high win rate with oversized losers can unlock it. Tiers are re-checked on every
// trade, so gear can lose its tier if performance drops.

export type GearTierId = "basic" | "common" | "uncommon" | "rare" | "mythical" | "legendary" | "god";

export interface GearTier {
  id: GearTierId;
  name: string;
  color: string;
  /** Minimum closed trades on the gear's setup. */
  minTrades: number;
  minWinRate: number;
  minProfitFactor: number;
  /** Share of trades where the playbook rules were followed. */
  minDiscipline: number;
  perk: string;
}

export const GEAR_TIERS: GearTier[] = [
  { id: "basic", name: "Basic", color: "#8b95a5", minTrades: 0, minWinRate: 0, minProfitFactor: 0, minDiscipline: 0, perk: "Starter gear. Every journey starts here." },
  { id: "common", name: "Common", color: "#e5e7eb", minTrades: 10, minWinRate: 0, minProfitFactor: 0, minDiscipline: 0.5, perk: "You showed up 10 times and logged it." },
  { id: "uncommon", name: "Uncommon", color: "#4ade80", minTrades: 20, minWinRate: 0.45, minProfitFactor: 1.1, minDiscipline: 0.6, perk: "A real edge is starting to show." },
  { id: "rare", name: "Rare", color: "#60a5fa", minTrades: 40, minWinRate: 0.5, minProfitFactor: 1.4, minDiscipline: 0.7, perk: "Consistent and profitable over a real sample." },
  { id: "mythical", name: "Mythical", color: "#c084fc", minTrades: 75, minWinRate: 0.55, minProfitFactor: 1.8, minDiscipline: 0.8, perk: "Top-tier execution. Rules followed 8 times in 10." },
  { id: "legendary", name: "Legendary", color: "#fb923c", minTrades: 150, minWinRate: 0.58, minProfitFactor: 2.2, minDiscipline: 0.85, perk: "Elite edge, proven over 150+ trades." },
  { id: "god", name: "God", color: "#fde047", minTrades: 300, minWinRate: 0.6, minProfitFactor: 2.5, minDiscipline: 0.9, perk: "Mastery. Fewer than 1 in 100 traders forge this." },
];

export function gearTier(s: { count: number; winRate: number; profitFactor: number; disciplineRate: number }): GearTier {
  let best = GEAR_TIERS[0];
  for (const t of GEAR_TIERS) {
    if (s.count >= t.minTrades && s.winRate >= t.minWinRate && s.profitFactor >= t.minProfitFactor && s.disciplineRate >= t.minDiscipline) best = t;
  }
  return best;
}
