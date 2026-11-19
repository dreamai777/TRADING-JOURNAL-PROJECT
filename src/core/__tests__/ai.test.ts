import { describe, expect, it } from "vitest";
import { computeAll, computeTrade } from "../stats";
import { demoSetups, demoTrades } from "../demo";
import { reviewTrade, excursions, gradeOf } from "../ai/review";
import { detectHabits, marketMood, noteSentiment, riskProfile, runCouncil } from "../ai/agents";
import { checkRules, customAgentReport, customSystemPrompt, type CustomAgent } from "../ai/custom";
import { localAnswer } from "../ai/context";
import type { Trade } from "../types";

const base: Trade = { id: "t1", userId: "u", symbol: "BTCUSDT", assetClass: "crypto", side: "long", entry: 100, exit: 110, qty: 10, fees: 1, stopLoss: 95, openedAt: "2026-01-05T10:00:00Z", closedAt: "2026-01-05T11:00:00Z", tags: [], mistakes: [], source: "manual" };
const setups = demoSetups("u");
const NOW = Date.parse("2026-11-19T00:00:00Z");

describe("trade review", () => {
  it("grades a disciplined loss as a good loss", () => {
    const t = computeTrade({ ...base, exit: 95, setupId: setups[0].id, rulesFollowed: true, emotion: "calm", rating: 5, notes: "Valid setup, stop respected, no regrets." });
    const r = reviewTrade(t, { history: [t], setup: setups[0], account: 10000 });
    expect(r.verdict).toBe("Good loss");
    expect(r.score).toBeGreaterThanOrEqual(68);
    expect(r.right.join(" ")).toMatch(/professional loss/);
  });
  it("flags a no-stop revenge win as a lucky win", () => {
    const loss = computeTrade({ ...base, id: "l", exit: 90, openedAt: "2026-01-05T09:00:00Z", closedAt: "2026-01-05T09:50:00Z" });
    const t = computeTrade({ ...base, stopLoss: undefined, rulesFollowed: false, emotion: "revenge", mistakes: ["no-stop", "chased"], openedAt: "2026-01-05T10:00:00Z" });
    const r = reviewTrade(t, { history: computeAll([loss, t]), account: 10000 });
    expect(r.verdict).toBe("Lucky win");
    expect(["D", "F"]).toContain(r.grade);
    expect(r.wrong.join(" ")).toMatch(/revenge/);
    expect(r.tips.length).toBeGreaterThan(0);
  });
  it("maps scores to grades", () => {
    expect(gradeOf(95)).toBe("S");
    expect(gradeOf(70)).toBe("B");
    expect(gradeOf(10)).toBe("F");
  });
  it("measures run-up and heat", () => {
    const t = computeTrade(base);
    const e = excursions(t, [{ high: 101, low: 99 }, { high: 115, low: 97 }, { high: 112, low: 108 }], 0, 2)!;
    expect(e.mfe).toBeCloseTo(150);
    expect(e.mae).toBeCloseTo(30);
    expect(e.mfeR).toBeCloseTo(3);
    expect(e.captured).toBeCloseTo(10 / 15);
  });
});

describe("council", () => {
  const trades = computeAll(demoTrades("u", 300, NOW, 7, 365));
  const council = runCouncil({ trades, setups, account: 10000, now: NOW });
  it("produces a scored report for every agent", () => {
    for (const r of Object.values(council.reports)) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.headline.length).toBeGreaterThan(10);
      expect(r.metrics.length).toBe(4);
    }
    expect(council.reviews.size).toBe(trades.length);
    expect(council.focus.rules.length).toBeGreaterThan(0);
  });
  it("detects habits and risk guardrails", () => {
    const habits = detectHabits(trades, NOW);
    expect(habits.map((h) => h.id)).toContain("revenge");
    const rp = riskProfile(trades, 10000);
    expect(rp.avgRisk).toBeGreaterThan(0);
    expect(rp.guardrails[0].label).toBe("Max risk per trade");
  });
  it("scores note sentiment and a stable market mood", () => {
    expect(noteSentiment("Chased after missing the entry. FOMO trade.")).toBeLessThan(0);
    expect(noteSentiment("Waited for the close, followed the plan.")).toBeGreaterThan(0);
    expect(marketMood(NOW).index).toBe(marketMood(NOW).index);
  });
  it("answers offline from the right agent", () => {
    expect(localAnswer("How should I size my trades?", "coach", council)).toMatch(/Bulwark/);
    expect(localAnswer("Give me a pre-market routine", "coach", council)).toMatch(/pre-market routine/);
  });
});

describe("custom agents", () => {
  const agent: CustomAgent = { id: "a", userId: "u", name: "Guard", icon: "🏦", color: "#fff", tone: "drill", focus: ["risk"], instructions: "Protect the account.", createdAt: "", rules: [{ kind: "max-trades-day", value: 1 }, { kind: "require-stop" }, { kind: "stop-after-losses", value: 1 }] };
  const ts = computeAll([
    { ...base, id: "1", exit: 90 },
    { ...base, id: "2", openedAt: "2026-01-05T12:00:00Z", closedAt: "2026-01-05T13:00:00Z", stopLoss: undefined },
  ]);
  it("checks rules and costs the breaches", () => {
    const checks = checkRules(agent, ts, setups, 10000);
    expect(checks[0].breaches.map((t) => t.id)).toEqual(["2"]);
    expect(checks[1].breaches.map((t) => t.id)).toEqual(["2"]);
    expect(checks[2].breaches.map((t) => t.id)).toEqual(["2"]);
    const rep = customAgentReport(agent, ts, setups, 10000);
    expect(rep.score).toBe(50);
  });
  it("builds a system prompt with the trader's rules and voice", () => {
    const p = customSystemPrompt(agent, setups);
    expect(p).toMatch(/Max 1 trades a day/);
    expect(p).toMatch(/drill sergeant/);
  });
});
