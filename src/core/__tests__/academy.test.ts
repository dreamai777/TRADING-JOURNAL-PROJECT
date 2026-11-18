import { describe, expect, it } from "vitest";
import { ACADEMY_QUESTS, LESSONS, academyState, academyXp } from "../academy";
import { CONTENT, PREMIUM_OUTLINES } from "../lesson-content";

const base = { trades: [], setups: [], testTaken: false, lessonsDone: [] as string[] };

describe("academy", () => {
  it("every free lesson has content with a check, every premium one an outline", () => {
    for (const l of LESSONS) {
      if (l.tier === "free") expect(CONTENT[l.id]?.check, l.id).toBeTruthy();
      else expect(PREMIUM_OUTLINES[l.id], l.id).toBeTruthy();
    }
  });
  it("every free lesson is unlocked by exactly one quest", () => {
    for (const l of LESSONS.filter((x) => x.tier === "free")) expect(ACADEMY_QUESTS.filter((q) => q.unlocks.includes(l.id)), l.id).toHaveLength(1);
  });
  it("unlocks lessons as quests complete, premium needs the Guild plan", () => {
    const fresh = academyState(base);
    expect(fresh.lessons.find((l) => l.id === "f-market-structure")!.unlocked).toBe(true);
    expect(fresh.lessons.find((l) => l.id === "s-swing")!.unlocked).toBe(false);
    expect(academyState({ ...base, testTaken: true }).lessons.find((l) => l.id === "s-swing")!.unlocked).toBe(true);
    expect(fresh.lessons.find((l) => l.id === "s-scalp")!.unlocked).toBe(false);
    expect(academyState(base, true).lessons.find((l) => l.id === "s-scalp")!.unlocked).toBe(true);
  });
  it("awards XP for lessons and quests", () => {
    expect(academyXp(base)).toBe(0);
    expect(academyXp({ ...base, testTaken: true, lessonsDone: ["f-market-structure"] })).toBe(100 + 120);
  });
});
