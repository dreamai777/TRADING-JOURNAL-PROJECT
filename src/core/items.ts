// Item catalog: 130 named pieces of equipment across 7 slots and 6 class styles.
// Every item upgrades through the 7 gear tiers (Basic → God) from real results:
//  - Weapons and trinkets are bound to a setup type (Breakout, Reversal, Trend, Scalp, Range, News)
//    and upgrade with the win rate, profit factor and discipline of trades tagged with that type.
//  - Armor, helms, cloaks, boots and off-hands upgrade with the trader's whole record.
// Each item also has an unlock tier: it drops (becomes equippable) once its stats reach that tier.
// Item level (1–50) grows with journaling XP on the same trades, and glow grows with tier and level.

import { GEAR_TIERS, gearTier, type GearTier, type GearTierId } from "./gear";
import { tradeXp } from "./game";
import { summarize, type Summary } from "./stats";
import type { SkillId } from "./trader-test";
import type { JobClass, Setup, TradeComputed, WeaponClass } from "./types";

export type Slot = "weapon" | "offhand" | "helm" | "armor" | "cloak" | "boots" | "trinket";
export type ItemArt =
  | "staff" | "wand" | "tome" | "orb" | "sword" | "greatsword" | "hammer" | "axe" | "dagger" | "bow" | "crossbow"
  | "quiver" | "shield" | "hood" | "hat" | "helm" | "circlet" | "robe" | "armor" | "cloak" | "boots" | "ring" | "amulet" | "charm";
export type Affinity = WeaponClass | "any";

export interface Item {
  id: string;
  name: string;
  slot: Slot;
  job: JobClass | "any";
  affinity: Affinity;
  art: ItemArt;
  /** Tier the item's stats must reach before it can be equipped. */
  unlock: GearTierId;
  /** Trading skill the item stands for (matches the Class Test skills). */
  bonus: SkillId;
  lore: string;
}

export const SLOTS: { id: Slot; name: string }[] = [
  { id: "weapon", name: "Weapon" },
  { id: "offhand", name: "Off-hand" },
  { id: "helm", name: "Head" },
  { id: "armor", name: "Armor" },
  { id: "cloak", name: "Cloak" },
  { id: "boots", name: "Boots" },
  { id: "trinket", name: "Trinket" },
];

const WC: WeaponClass[] = ["Breakout", "Reversal", "Trend", "Scalp", "Range", "News"];
const T: GearTierId[] = GEAR_TIERS.map((t) => t.id);
const SLOT_BONUS: Record<Slot, SkillId> = { weapon: "analysis", offhand: "discipline", helm: "knowledge", armor: "risk", cloak: "emotion", boots: "patience", trinket: "discipline" };

const WEAPON_LORE: Record<WeaponClass, string> = {
  Breakout: "Hits hardest when a range finally gives way on real volume.",
  Reversal: "Made for the moment the crowd is trapped on the wrong side.",
  Trend: "Built to stay in the fight while the trend does the work.",
  Scalp: "Light, fast and unforgiving of slippage.",
  Range: "Strikes at the edges and never in the middle.",
  News: "Forged for the candle after the headline, not the one before it.",
};

type Kit = {
  job: JobClass;
  weapons: [string, ItemArt][]; // one per WC, in WC order
  god: [string, ItemArt, string];
  offhand: [string, ItemArt][];
  helm: [string, ItemArt][];
  armor: [string, ItemArt][];
  cloak: string[];
  boots: string[];
};

const KITS: Kit[] = [
  {
    job: "wizard",
    weapons: [["Stormbreak Staff", "staff"], ["Wand of Second Thoughts", "wand"], ["Longwind Stave", "staff"], ["Flicker Wand", "wand"], ["Pendulum Rod", "staff"], ["Headline Codex", "tome"]],
    god: ["Astrolabe of the Long Game", "orb", "Shows where price will be in a year, if you are patient enough to wait for it."],
    offhand: [["Ledger Grimoire", "tome"], ["Moonwell Orb", "orb"]],
    helm: [["Apprentice's Hood", "hood"], ["Starweave Hat", "hat"], ["Circlet of Clear Sight", "circlet"]],
    armor: [["Novice Robe", "robe"], ["Robe of Measured Breath", "robe"], ["Aetherthread Vestments", "robe"]],
    cloak: ["Duskveil Mantle", "Cloak of Quiet Hours"],
    boots: ["Slippers of the Slow Hand", "Driftstep Boots"],
  },
  {
    job: "warrior",
    weapons: [["Gatecrasher Greatsword", "greatsword"], ["Turnblade", "sword"], ["Marchsteel Sword", "sword"], ["Quickedge Shortsword", "sword"], ["Wallbreaker Hammer", "hammer"], ["Herald's Warhammer", "hammer"]],
    god: ["Oathbrand of the First Charge", "greatsword", "Only answers to a trader who sized the position before the breakout, not during it."],
    offhand: [["Vanguard Buckler", "shield"], ["Bellringer Targe", "shield"]],
    helm: [["Recruit's Sallet", "helm"], ["Crested Greathelm", "helm"], ["Helm of Iron Resolve", "helm"]],
    armor: [["Padded Gambeson", "armor"], ["Chainmail of Small Losses", "armor"], ["Plate of the Unbroken Line", "armor"]],
    cloak: ["Crimson Warcloak", "Tabard of the Clean Entry"],
    boots: ["Marching Sabatons", "Greaves of Holding Ground"],
  },
  {
    job: "assassin",
    weapons: [["Fang of the False Break", "dagger"], ["Snapback Kris", "dagger"], ["Shadowtail Stiletto", "dagger"], ["Whisperpin", "dagger"], ["Edgewalker Twinblades", "dagger"], ["Rumorcutter", "dagger"]],
    god: ["Nightglass, Eater of Stops", "dagger", "Drinks the liquidity everyone else left resting below the lows."],
    offhand: [["Smoke Vial Bandolier", "charm"], ["Parrying Dirk", "dagger"]],
    helm: [["Cutpurse Cowl", "hood"], ["Mask of Still Water", "circlet"], ["Shroud of the Swept Level", "hood"]],
    armor: [["Leather Jerkin", "armor"], ["Silkshadow Vest", "armor"], ["Wraithleather Harness", "armor"]],
    cloak: ["Cloak of Unseen Orders", "Liquidity Veil"],
    boots: ["Softsole Wraps", "Boots of the Sudden Exit"],
  },
  {
    job: "archer",
    weapons: [["Skybreak Longbow", "bow"], ["Recurve of Returning", "bow"], ["Windrider Bow", "bow"], ["Sparrow Shortbow", "bow"], ["Retest Recurve", "bow"], ["Signalfire Bow", "bow"]],
    god: ["Horizon, the Bow That Waits", "bow", "Never fires at a target closer than two and a half R."],
    offhand: [["Quiver of Patient Arrows", "quiver"], ["Fletcher's Quiver", "quiver"]],
    helm: [["Ranger's Hood", "hood"], ["Hawkfeather Cap", "hat"], ["Circlet of the Far Ridge", "circlet"]],
    armor: [["Woodland Tunic", "armor"], ["Mossweave Brigandine", "armor"], ["Verdant Scale Coat", "armor"]],
    cloak: ["Leafshadow Cloak", "Mantle of the High Ground"],
    boots: ["Trailworn Boots", "Ridgerunner Boots"],
  },
  {
    job: "defender",
    weapons: [["Rampart Axe", "axe"], ["Bulwark Cleaver", "axe"], ["Stonecount Axe", "axe"], ["Hatchet of Small Gains", "axe"], ["Balance Hammer", "hammer"], ["Stormwall Maul", "hammer"]],
    god: ["Aegis of the Thousand Weeks", "shield", "Has never been broken, because it has never been overleveraged."],
    offhand: [["Kite Shield of Fixed Size", "shield"], ["Tower Shield of Ten Points", "shield"]],
    helm: [["Iron Pot Helm", "helm"], ["Runeforged Helm", "helm"], ["Warden's Faceguard", "helm"]],
    armor: [["Riveted Hauberk", "armor"], ["Deepforge Plate", "armor"], ["Mountainheart Cuirass", "armor"]],
    cloak: ["Bearfur Mantle", "Cloak of the Long Winter"],
    boots: ["Stonestride Boots", "Ironroot Boots"],
  },
  {
    job: "sniper",
    weapons: [["Tripwire Arbalest", "crossbow"], ["Ricochet Crossbow", "crossbow"], ["Long-Sight Arbalest", "crossbow"], ["Needle Repeater", "crossbow"], ["Bracket Crossbow", "crossbow"], ["Tick-Watch Repeater", "crossbow"]],
    god: ["Zero Spread, the Last Bolt", "crossbow", "Fires once per session, and that is always enough."],
    offhand: [["Bolt Case of Measured Shots", "quiver"], ["Rangefinder Lens", "orb"]],
    helm: [["Spotter's Cap", "hat"], ["Goggles of Tight Spreads", "circlet"], ["Owlglass Hood", "hood"]],
    armor: [["Ghillie Vest", "armor"], ["Quilted Marksman Coat", "armor"], ["Clockwork Brigandine", "armor"]],
    cloak: ["Camouflage Poncho", "Mantle of the Silent Book"],
    boots: ["Crawler's Boots", "Boots of the Fast Fill"],
  },
];

const ARMOR_LORE: Record<Exclude<Slot, "weapon" | "trinket">, string> = {
  offhand: "Holds the line your plan drew before the trade.",
  helm: "Keeps the lessons from your journal close at hand.",
  armor: "Absorbs the losses a stop was meant to absorb, and no more.",
  cloak: "Muffles the noise of the last trade so the next one is clean.",
  boots: "For traders who walk to the setup instead of running at it.",
};

const TRINKETS: [string, ItemArt, Affinity, GearTierId, SkillId, string][] = [
  ["Ring of the First Candle", "ring", "Breakout", "common", "analysis", "Glows when the opening range is set and stays dark before."],
  ["Volume Sigil", "amulet", "Breakout", "rare", "analysis", "Warm to the touch when volume confirms the break."],
  ["Amulet of the Wick", "amulet", "Reversal", "common", "patience", "Waits for the close back inside before it lets you act."],
  ["Charm of Trapped Bulls", "charm", "Reversal", "rare", "analysis", "A trophy from every failed breakout you faded."],
  ["Ring of Higher Lows", "ring", "Trend", "common", "patience", "Tightens a little with every new higher low."],
  ["Compass of the Weekly", "amulet", "Trend", "rare", "knowledge", "Always points at the higher timeframe."],
  ["Ticking Locket", "amulet", "Scalp", "common", "discipline", "Counts your trades and stops you at the session limit."],
  ["Ring of Thin Spreads", "ring", "Scalp", "rare", "risk", "Refuses to work when fees eat more than a tenth of the target."],
  ["Amulet of Both Edges", "amulet", "Range", "common", "discipline", "Only lights up at the top or the bottom of the range."],
  ["Midpoint Charm", "charm", "Range", "rare", "patience", "Reminds you that the middle of the range belongs to no one."],
  ["Ring of the Calendar", "ring", "News", "common", "knowledge", "Knows every scheduled release this week."],
  ["Herald's Medallion", "amulet", "News", "rare", "emotion", "Keeps your hand still for the first candle after the news."],
  ["Stoploss Signet", "ring", "any", "basic", "risk", "The first rule of every guild. Never leaves the finger."],
  ["Journal Keeper's Pendant", "amulet", "any", "uncommon", "discipline", "Grows heavier with every trade you log honestly."],
  ["Heartstone of Calm", "charm", "any", "mythical", "emotion", "Stays cool through a losing streak."],
  ["Phoenix Feather", "charm", "any", "god", "emotion", "Earned by those who came back from drawdown with their rules intact."],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function build(): Item[] {
  const out: Item[] = [];
  const push = (i: Omit<Item, "id">) => out.push({ id: slug(i.name), ...i });
  KITS.forEach((k, ci) => {
    k.weapons.forEach(([name, art], i) => push({ name, art, slot: "weapon", job: k.job, affinity: WC[i], unlock: T[(i + ci) % 6], bonus: SLOT_BONUS.weapon, lore: WEAPON_LORE[WC[i]] }));
    push({ name: k.god[0], art: k.god[1], slot: "weapon", job: k.job, affinity: "any", unlock: "god", bonus: "discipline", lore: k.god[2] });
    const rest: [Exclude<Slot, "weapon" | "trinket">, [string, ItemArt][], GearTierId[]][] = [
      ["offhand", k.offhand, ["common", "rare"]],
      ["helm", k.helm, ["basic", "uncommon", "mythical"]],
      ["armor", k.armor, ["basic", "rare", "legendary"]],
      ["cloak", k.cloak.map((n) => [n, "cloak"]), ["common", "mythical"]],
      ["boots", k.boots.map((n) => [n, "boots"]), ["basic", "uncommon"]],
    ];
    for (const [slot, list, unlocks] of rest) list.forEach(([name, art], i) => push({ name, art, slot, job: k.job, affinity: "any", unlock: unlocks[i], bonus: SLOT_BONUS[slot], lore: ARMOR_LORE[slot] }));
  });
  for (const [name, art, affinity, unlock, bonus, lore] of TRINKETS) push({ name, art, slot: "trinket", job: "any", affinity, unlock, bonus, lore });
  return out;
}

export const ITEMS: Item[] = build();
export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export interface AffinityStats { summary: Summary; tier: GearTier; tierIndex: number; xp: number; level: number }
export interface ItemState {
  item: Item;
  /** Current tier, from the stats of the item's affinity. */
  tier: GearTier;
  tierIndex: number;
  nextTier?: GearTier;
  unlockIndex: number;
  unlocked: boolean;
  level: number;
  /** 0..7: grows with tier, plus up to 1 more from item level. Drives the glow. */
  glow: number;
  stats: Summary;
}

export function itemLevel(xp: number) { return Math.min(50, 1 + Math.floor(xp / 150)); }
export function glowFor(tierIndex: number, level: number) { return tierIndex + Math.min(1, (level - 1) / 49); }

/** Stats per affinity: one pass per setup type plus the whole record. */
export function affinityStats(trades: TradeComputed[], setups: Setup[]): Record<Affinity, AffinityStats> {
  const wcOf = new Map(setups.map((s) => [s.id, s.weaponClass]));
  const groups: Record<Affinity, TradeComputed[]> = { any: trades, Breakout: [], Reversal: [], Trend: [], Scalp: [], Range: [], News: [] };
  for (const t of trades) { const wc = t.setupId ? wcOf.get(t.setupId) : undefined; if (wc) groups[wc].push(t); }
  const out = {} as Record<Affinity, AffinityStats>;
  for (const [k, ts] of Object.entries(groups) as [Affinity, TradeComputed[]][]) {
    const summary = summarize(ts);
    const tier = gearTier(summary);
    const xp = ts.reduce((a, t) => a + tradeXp(t), 0);
    out[k] = { summary, tier, tierIndex: GEAR_TIERS.indexOf(tier), xp, level: itemLevel(xp) };
  }
  return out;
}

export function itemStates(trades: TradeComputed[], setups: Setup[]): ItemState[] {
  const aff = affinityStats(trades, setups);
  return ITEMS.map((item) => {
    const a = aff[item.affinity];
    const unlockIndex = T.indexOf(item.unlock);
    return { item, tier: a.tier, tierIndex: a.tierIndex, nextTier: GEAR_TIERS[a.tierIndex + 1], unlockIndex, unlocked: a.tierIndex >= unlockIndex, level: a.level, glow: glowFor(a.tierIndex, a.level), stats: a.summary };
  });
}

export type Loadout = Partial<Record<Slot, string>>;

/** The equipped item per slot: the trader's pick if still unlocked, otherwise the best unlocked item for their class. */
export function resolveLoadout(states: ItemState[], job: JobClass, chosen: Loadout = {}): Partial<Record<Slot, ItemState>> {
  const out: Partial<Record<Slot, ItemState>> = {};
  for (const { id: slot } of SLOTS) {
    const pick = states.find((s) => s.item.id === chosen[slot] && s.item.slot === slot && s.unlocked);
    if (pick) { out[slot] = pick; continue; }
    const pool = states.filter((s) => s.item.slot === slot && s.unlocked && (s.item.job === job || s.item.job === "any"));
    pool.sort((a, b) => b.unlockIndex - a.unlockIndex || b.glow - a.glow);
    if (pool[0]) out[slot] = pool[0];
  }
  return out;
}

export function unlockHint(s: ItemState) {
  const t = GEAR_TIERS[s.unlockIndex];
  const where = s.item.affinity === "any" ? "your overall record" : `your ${s.item.affinity} setups`;
  return `Reach ${t.name} on ${where}`;
}
