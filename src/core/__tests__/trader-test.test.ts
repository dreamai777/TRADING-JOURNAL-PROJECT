import { describe, expect, it } from "vitest";
import { GEAR_TIERS, gearTier } from "../gear";
import { QUESTIONS, pathQuests, scoreTest, studyPath } from "../trader-test";

const answerAll = (pick: (qid: string, n: number) => number) => Object.fromEntries(QUESTIONS.map((q) => [q.id, pick(q.id, q.options.length)]));

describe("trader class test", () => {
  it("finds a scalper from scalper answers", () => {
    const r = scoreTest(answerAll((id) => ({ time: 3, hold: 0, chart: 0, pump: 2, thrill: 0, pick: 0, against: 0 } as Record<string, number>)[id] ?? 0));
    expect(r.primary).toBe("scalper");
    expect(Object.values(r.typeMatch).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("finds an investor from long-term answers", () => {
    const r = scoreTest(answerAll((id) => ({ time: 0, hold: 3, chart: 3, pump: 3, thrill: 3, pick: 3, against: 2 } as Record<string, number>)[id] ?? 0));
    expect(r.primary).toBe("investor");
  });
  it("scores skills 0..100, best habits and correct answers give top marks", () => {
    const best = scoreTest(answerAll((id) => (id.startsWith("k-") ? QUESTIONS.find((q) => q.id === id)!.options.findIndex((o) => o.correct) : id === "against" ? 1 : 0)));
    const worst = scoreTest(answerAll((id, n) => (id.startsWith("k-") ? 0 : n - 1)));
    for (const v of Object.values(best.skills)) expect(v).toBeGreaterThanOrEqual(0);
    expect(best.skills.risk).toBeGreaterThan(worst.skills.risk);
    expect(best.knowledgeCorrect).toBe(best.knowledgeTotal);
    expect(worst.knowledgeCorrect).toBe(0);
  });
  it("builds a study path that targets the weakest skills and the style", () => {
    const r = scoreTest(answerAll((id, n) => (id.startsWith("k-") ? 0 : n - 1)));
    const path = studyPath(r);
    expect(path.length).toBeGreaterThan(3);
    expect(path.some((p) => p.lesson.skill === r.weaknesses[0])).toBe(true);
    expect(path.some((p) => p.lesson.types?.includes(r.primary))).toBe(true);
    expect(pathQuests(r).length).toBeGreaterThanOrEqual(2);
  });
});

describe("gear tiers", () => {
  it("needs sample size, not just win rate", () => {
    expect(gearTier({ count: 8, winRate: 0.9, profitFactor: 5, disciplineRate: 1 }).id).toBe("basic");
    expect(gearTier({ count: 50, winRate: 0.52, profitFactor: 1.5, disciplineRate: 0.75 }).id).toBe("rare");
    expect(gearTier({ count: 400, winRate: 0.9, profitFactor: 0.9, disciplineRate: 1 }).id).toBe("common");
    expect(gearTier({ count: 400, winRate: 0.62, profitFactor: 2.8, disciplineRate: 0.95 }).id).toBe("god");
    expect(GEAR_TIERS).toHaveLength(7);
  });
});
