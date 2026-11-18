import { describe, expect, it } from "vitest";
import { GEAR_TIERS } from "../gear";
import { ITEMS, SLOTS, glowFor, itemStates, resolveLoadout } from "../items";
import type { Setup, TradeComputed } from "../types";

const setup = (id: string, weaponClass: Setup["weaponClass"]): Setup => ({ id, userId: "u", name: id, icon: "x", weaponClass, description: "", timeframe: "", markets: [], rules: [], entryTrigger: "", exitPlan: "", invalidation: "", equipped: false, createdAt: "" });
const trade = (i: number, win: boolean, setupId: string): TradeComputed => ({ id: `t${i}`, setupId, pnl: win ? 300 : -100, r: win ? 3 : -1, rulesFollowed: true, mistakes: [], closedAt: new Date(Date.UTC(2026, 0, 1 + (i % 300))).toISOString(), assetClass: "crypto", notes: "", stopLoss: 1 } as unknown as TradeComputed);

describe("item catalog", () => {
  it("has over 100 uniquely named items covering every slot", () => {
    expect(ITEMS.length).toBeGreaterThan(100);
    expect(new Set(ITEMS.map((i) => i.name)).size).toBe(ITEMS.length);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const s of SLOTS) expect(ITEMS.some((i) => i.slot === s.id)).toBe(true);
  });
  it("gives every class a weapon for every setup type", () => {
    for (const job of ["wizard", "warrior", "assassin", "archer", "defender", "sniper"])
      for (const wc of ["Breakout", "Reversal", "Trend", "Scalp", "Range", "News"])
        expect(ITEMS.some((i) => i.job === job && i.slot === "weapon" && i.affinity === wc)).toBe(true);
  });
});

describe("item progression", () => {
  const setups = [setup("b", "Breakout"), setup("r", "Reversal")];
  it("upgrades weapons from the win rate of their own setup type", () => {
    const trades = [...Array.from({ length: 200 }, (_, i) => trade(i, i % 10 < 6, "b")), ...Array.from({ length: 30 }, (_, i) => trade(500 + i, i % 10 < 3, "r"))];
    const st = itemStates(trades, setups);
    const breakout = st.find((s) => s.item.id === "gatecrasher-greatsword")!;
    const reversal = st.find((s) => s.item.id === "turnblade")!;
    expect(breakout.tier.id).toBe("legendary");
    expect(reversal.tierIndex).toBeLessThan(breakout.tierIndex);
    expect(breakout.glow).toBeGreaterThan(reversal.glow);
  });
  it("locks items until their unlock tier and auto-equips the best unlocked gear", () => {
    const st = itemStates([], setups);
    expect(st.filter((s) => s.unlocked).every((s) => s.unlockIndex === 0)).toBe(true);
    const lo = resolveLoadout(st, "warrior", { weapon: "oathbrand-of-the-first-charge" });
    expect(lo.weapon?.unlocked).toBe(true);
    expect(lo.weapon?.item.id).not.toBe("oathbrand-of-the-first-charge");
    expect(lo.armor?.item.id).toBe("padded-gambeson");
  });
  it("glow grows with tier and level", () => {
    expect(glowFor(0, 1)).toBe(0);
    expect(glowFor(3, 50)).toBe(4);
    expect(glowFor(GEAR_TIERS.length - 1, 1)).toBe(6);
  });
});
