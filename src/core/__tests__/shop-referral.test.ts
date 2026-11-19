import { describe, expect, it } from "vitest";
import { demoPayments } from "../payments";
import { ACTIVE_FRIEND_GOLD, discounted, isValidCode, referralCode, referralRank, referralTotals, seedReferrals } from "../referral";
import { creatorPayout, goldEarned, perfectQuestDays, seedListings } from "../shop";

describe("referrals", () => {
  it("makes stable, valid codes", () => {
    const c = referralCode({ id: "u_trader", name: "Demo Trader" });
    expect(c).toBe(referralCode({ id: "u_trader", name: "Demo Trader" }));
    expect(isValidCode(c)).toBe(true);
    expect(isValidCode("nope")).toBe(false);
  });

  it("gives friends 15% off", () => {
    expect(discounted(19, true)).toBe(16.15);
    expect(discounted(49, true)).toBe(41.65);
    expect(discounted(19, false)).toBe(19);
  });

  it("ranks up with active friends and totals Gold", () => {
    expect(referralRank(0).rank.id).toBe("scout");
    expect(referralRank(3).rank.id).toBe("captain");
    expect(referralRank(25).next).toBeNull();
    const t = referralTotals(seedReferrals("u"));
    expect(t.active).toBe(3);
    expect(t.signupGold).toBe(3 * ACTIVE_FRIEND_GOLD);
    expect(t.shareGold).toBeGreaterThan(0);
  });
});

describe("shop", () => {
  it("seed catalog has every kind and unique ids", () => {
    const ls = seedListings(0);
    expect(new Set(ls.map((l) => l.id)).size).toBe(ls.length);
    for (const k of ["strategy", "setup", "skill", "item"]) expect(ls.some((l) => l.kind === k)).toBe(true);
    expect(ls.filter((l) => l.kind === "strategy").every((l) => l.payload.spec)).toBe(true);
  });

  it("creator keeps 85%", () => {
    const l = seedListings(0)[0];
    expect(creatorPayout(l, "usd")).toBeCloseTo(l.priceUsd * 0.85, 2);
    expect(creatorPayout(l, "gold")).toBe(Math.floor(l.priceGold * 0.85));
  });

  it("counts perfect quest days and gold sources", () => {
    const day = (d: string, ok: boolean) => ({ closedAt: `${d}T10:00:00Z`, setupId: "s", rulesFollowed: ok, notes: "a long enough lesson note here" });
    expect(perfectQuestDays([day("2026-01-01", true), day("2026-01-01", true), day("2026-01-01", true), day("2026-01-02", false), day("2026-01-02", true), day("2026-01-02", true)])).toBe(1);
    const g = goldEarned({ xp: 1000, badges: [{ id: "a", name: "", icon: "", description: "", unlocked: true }], lessonsDone: 2, questDays: 1, referralGold: 0, salesGold: 0, bonus: 0 });
    expect(g.reduce((a, s) => a + s.gold, 0)).toBe(100 + 25 + 150 + 120);
  });

  it("refuses a Gold purchase without enough Gold", async () => {
    const r = await demoPayments.checkout({ method: "gold", amountGold: 500, amountUsd: 0, description: "x" }, 100);
    expect(r.ok).toBe(false);
  });
});
