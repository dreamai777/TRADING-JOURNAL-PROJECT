// Trader Class Test: finds a trader's style (6 types) and scores 6 skills from style questions,
// honest self-assessment and real knowledge checks. The result drives the job class, a study path,
// suggested setups and quests.

import { LESSONS, type Lesson } from "./academy";
import type { JobClass } from "./types";

export type TraderTypeId = "scalper" | "day" | "momentum" | "swing" | "position" | "investor";
export type SkillId = "discipline" | "risk" | "patience" | "emotion" | "analysis" | "knowledge";

export const SKILLS: Record<SkillId, { name: string; short: string; desc: string }> = {
  discipline: { name: "Discipline", short: "DIS", desc: "Following written rules, journaling and reviewing." },
  risk: { name: "Risk control", short: "RSK", desc: "Stops, position sizing and protecting the account." },
  patience: { name: "Patience", short: "PAT", desc: "Waiting for your setup and letting winners work." },
  emotion: { name: "Emotional control", short: "EMO", desc: "Staying calm after losses and wins." },
  analysis: { name: "Chart analysis", short: "ANA", desc: "Reading structure, levels and timing entries." },
  knowledge: { name: "Trading knowledge", short: "KNW", desc: "Expectancy, R-multiples, sizing math and costs." },
};

export interface TraderType {
  id: TraderTypeId;
  name: string;
  job: JobClass;
  icon: string;
  hold: string;
  timeframes: string;
  screenTime: string;
  summary: string;
  strengths: string[];
  watchOuts: string[];
  setups: string[];
}

export const TRADER_TYPES: Record<TraderTypeId, TraderType> = {
  scalper: {
    id: "scalper", name: "Scalper", job: "sniper", icon: "🎯", hold: "Seconds to minutes", timeframes: "Tick, 1m, 5m", screenTime: "3+ focused hours",
    summary: "You live for precision: many small, fast trades with tight risk. Fees, focus and discipline decide your results.",
    strengths: ["Fast decisions", "Tight risk per trade", "Many reps, so you learn quickly"],
    watchOuts: ["Fees and slippage eat thin edges", "Overtrading when bored", "Burnout from screen time"],
    setups: ["VWAP bounce and reclaim", "Order-book absorption scalp", "Range edge scalp with a 1:1.5 target"],
  },
  day: {
    id: "day", name: "Day trader", job: "assassin", icon: "🗡️", hold: "Minutes to hours, flat by close", timeframes: "5m, 15m, 1h", screenTime: "2–5 hours",
    summary: "You hunt the best intraday moves and go home flat. Session timing and liquidity are your weapons.",
    strengths: ["No overnight risk", "Clear session structure", "Quick feedback loop"],
    watchOuts: ["Forcing trades in dead sessions", "Revenge trades after a stop-out", "Ignoring the higher timeframe"],
    setups: ["Opening range breakout", "Liquidity sweep reversal", "VWAP reclaim continuation"],
  },
  momentum: {
    id: "momentum", name: "Momentum trader", job: "warrior", icon: "⚔️", hold: "Hours to a few days", timeframes: "15m, 1h, 4h", screenTime: "1–3 hours",
    summary: "You charge in when price breaks with volume and conviction, and you ride the strength while it lasts.",
    strengths: ["Catches explosive moves", "Clear entry triggers", "Big R when it works"],
    watchOuts: ["Chasing late entries (FOMO)", "Fake breakouts", "Holding after momentum fades"],
    setups: ["Breakout with volume confirmation", "Bull flag continuation", "News or catalyst gap-and-go"],
  },
  swing: {
    id: "swing", name: "Swing trader", job: "archer", icon: "🏹", hold: "Days to weeks", timeframes: "4h, Daily", screenTime: "30–60 minutes",
    summary: "You take the high-probability shot from a distance: pullbacks inside a trend, with time on your side.",
    strengths: ["Fits around a job", "Less noise, better R:R", "Calmer decisions"],
    watchOuts: ["Moving stops on overnight swings", "Over-sizing because trades are few", "Missing entries while waiting"],
    setups: ["Pullback to the 20/50 EMA in a trend", "Support/resistance flip retest", "Higher-low continuation"],
  },
  position: {
    id: "position", name: "Position & trend follower", job: "wizard", icon: "🔮", hold: "Weeks to months", timeframes: "Daily, Weekly", screenTime: "A few hours a week",
    summary: "You read the big picture like a spellbook, enter the major trend, and let a trailing stop do the work.",
    strengths: ["Captures the biggest moves", "Very low screen time", "Few, high-quality decisions"],
    watchOuts: ["Long flat or choppy periods", "Giving back open profit", "Doubting the system in drawdowns"],
    setups: ["Weekly range breakout", "50/200 trend filter with trailing stop", "Higher-timeframe pullback entries"],
  },
  investor: {
    id: "investor", name: "Investor", job: "defender", icon: "🛡️", hold: "Months to years", timeframes: "Weekly, Monthly", screenTime: "A few hours a month",
    summary: "You guard and grow capital over years. Valuation, allocation and patience beat timing for you.",
    strengths: ["Compounding over time", "Lowest stress and fees", "Hard to blow up"],
    watchOuts: ["No exit plan when the thesis breaks", "Concentration in one asset", "Panic selling in crashes"],
    setups: ["Accumulation zones with DCA", "Portfolio rebalancing bands", "Macro trend allocation"],
  },
};

type Score<K extends string> = Partial<Record<K, number>>;
export interface Option { label: string; t?: Score<TraderTypeId>; s?: Score<SkillId>; correct?: boolean }
export interface Question { id: string; section: "Style" | "Habits" | "Knowledge"; q: string; options: Option[] }

export const QUESTIONS: Question[] = [
  { id: "time", section: "Style", q: "How much time can you give the markets on a normal day?", options: [
    { label: "Under 30 minutes", t: { investor: 3, position: 2 } },
    { label: "About 1 hour", t: { swing: 3, position: 1 } },
    { label: "2 to 4 hours", t: { day: 2, momentum: 2, swing: 1 } },
    { label: "The whole session, eyes on screen", t: { scalper: 3, day: 2 } },
  ] },
  { id: "hold", section: "Style", q: "How long do you like to stay in a trade?", options: [
    { label: "Seconds to a few minutes", t: { scalper: 4 } },
    { label: "Minutes to hours, flat before I sleep", t: { day: 3, momentum: 1 } },
    { label: "A few days to a few weeks", t: { swing: 3, momentum: 1 } },
    { label: "Months or longer", t: { position: 2, investor: 3 } },
  ] },
  { id: "chart", section: "Style", q: "Which chart do you open first?", options: [
    { label: "1-minute or tick", t: { scalper: 3 } },
    { label: "15-minute or 1-hour", t: { day: 2, momentum: 2 } },
    { label: "4-hour or daily", t: { swing: 3, momentum: 1 } },
    { label: "Weekly or monthly", t: { position: 3, investor: 2 } },
  ] },
  { id: "pump", section: "Style", q: "A coin is up 20% today on huge volume. What's your move?", options: [
    { label: "Get in now, strength attracts strength", t: { momentum: 3 }, s: { patience: -1 } },
    { label: "Wait for the first pullback and a clean trigger", t: { swing: 2, day: 1 }, s: { patience: 2 } },
    { label: "Scalp the volatility both ways", t: { scalper: 2, day: 1 } },
    { label: "Ignore it and check if the long-term story changed", t: { investor: 2, position: 2 }, s: { patience: 1 } },
  ] },
  { id: "thrill", section: "Style", q: "Which win feels best?", options: [
    { label: "Ten small, clean wins in one morning", t: { scalper: 3, day: 1 } },
    { label: "Catching a breakout right as it starts", t: { momentum: 3 } },
    { label: "A 4R swing that played out exactly to plan", t: { swing: 3, position: 1 } },
    { label: "Seeing my portfolio compound year after year", t: { investor: 3, position: 1 } },
  ] },
  { id: "pick", section: "Style", q: "How do you choose what to trade?", options: [
    { label: "Order flow, volume and the most liquid pairs", t: { scalper: 3 } },
    { label: "Top movers, news and catalysts", t: { momentum: 3, day: 1 } },
    { label: "Clean chart patterns at key levels", t: { swing: 2, day: 1 }, s: { analysis: 1 } },
    { label: "Fundamentals, macro and long-term trends", t: { investor: 2, position: 2 } },
  ] },
  { id: "against", section: "Style", q: "Right after you enter, price moves against you. You…", options: [
    { label: "Cut it fast, the scalp is invalid", t: { scalper: 2, day: 1 }, s: { risk: 1 } },
    { label: "Let it work, my stop is where the idea is wrong", t: { swing: 2, momentum: 1, position: 1 }, s: { risk: 2, emotion: 1 } },
    { label: "Add more if my long-term thesis still holds", t: { investor: 2, position: 1 } },
    { label: "Move my stop further so it doesn't hit", s: { risk: -2, discipline: -1 } },
  ] },
  { id: "stop", section: "Habits", q: "Do you set a stop loss before you enter?", options: [
    { label: "Always, before I click buy", s: { risk: 3, discipline: 2 } },
    { label: "Usually", s: { risk: 2, discipline: 1 } },
    { label: "Sometimes, depends on the trade", s: { risk: 0 } },
    { label: "Rarely, I manage it in my head", s: { risk: -1, discipline: -1 } },
  ] },
  { id: "tilt", section: "Habits", q: "After two losses in a row, what usually happens?", options: [
    { label: "I stop for the day or take a break", s: { emotion: 3, discipline: 1 } },
    { label: "I keep going but cut my size", s: { emotion: 2, risk: 1 } },
    { label: "I keep trading the same way", s: { emotion: 1 } },
    { label: "I size up to win it back", s: { emotion: -2, risk: -2 } },
  ] },
  { id: "rules", section: "Habits", q: "Do you have written rules for your entries?", options: [
    { label: "Yes, a detailed playbook with a checklist", s: { discipline: 3, analysis: 2 } },
    { label: "A rough outline", s: { discipline: 2, analysis: 1 } },
    { label: "They're in my head", s: { discipline: 1 } },
    { label: "No, I trade what I see", s: { discipline: -1 } },
  ] },
  { id: "review", section: "Habits", q: "How often do you review your past trades?", options: [
    { label: "After every trade", s: { discipline: 3, knowledge: 1 } },
    { label: "Every week", s: { discipline: 2, knowledge: 1 } },
    { label: "Once in a while", s: { discipline: 1 } },
    { label: "Never", s: { discipline: -1 } },
  ] },
  { id: "wait", section: "Habits", q: "When there's no clear setup, you…", options: [
    { label: "Wait as long as it takes", s: { patience: 3, emotion: 1 } },
    { label: "Sometimes enter a bit early", s: { patience: 2 } },
    { label: "Often take a trade out of boredom", s: { patience: 0, emotion: -1 } },
    { label: "Trade whatever is moving", s: { patience: -1 } },
  ] },
  { id: "winners", section: "Habits", q: "When a trade is in profit, you usually…", options: [
    { label: "Follow my plan: partials at targets, trail the rest", s: { patience: 2, discipline: 2 } },
    { label: "Close early to lock it in", s: { patience: 0, emotion: 0 } },
    { label: "Hold and hope for more, then watch it come back", s: { discipline: -1, risk: -1 } },
  ] },
  { id: "k-size", section: "Knowledge", q: "$10,000 account, risking 1% per trade, stop 2% below entry. What's the position size?", options: [
    { label: "$100" }, { label: "$1,000" }, { label: "$5,000", correct: true, s: { knowledge: 3, risk: 2 } }, { label: "$10,000" },
  ] },
  { id: "k-exp", section: "Knowledge", q: "40% win rate, average win 3R, average loss 1R. Over many trades this strategy…", options: [
    { label: "Loses money, the win rate is under 50%" }, { label: "Breaks even" }, { label: "Makes about +0.6R per trade", correct: true, s: { knowledge: 3, analysis: 1 } },
  ] },
  { id: "k-pf", section: "Knowledge", q: "Your profit factor is 0.8. What does that mean?", options: [
    { label: "You win 80% of trades" }, { label: "You lose $1 for every $0.80 you make", correct: true, s: { knowledge: 3 } }, { label: "You risk 0.8% per trade" },
  ] },
  { id: "k-structure", section: "Knowledge", q: "In an uptrend, the safest place to look for a long is…", options: [
    { label: "After a big green candle at the high" }, { label: "On a pullback to support that holds, forming a higher low", correct: true, s: { analysis: 3, knowledge: 1 } }, { label: "When RSI is above 80" },
  ] },
];

export interface TestResult {
  takenAt: string;
  primary: TraderTypeId;
  secondary: TraderTypeId;
  typeMatch: Record<TraderTypeId, number>; // 0..1, sums to 1
  skills: Record<SkillId, number>; // 0..100
  strengths: SkillId[];
  weaknesses: SkillId[];
  knowledgeCorrect: number;
  knowledgeTotal: number;
}

const TYPE_IDS = Object.keys(TRADER_TYPES) as TraderTypeId[];
const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

/** Highest and lowest reachable score per skill, so every skill scales to 0..100 fairly. */
function skillRange() {
  const lo = Object.fromEntries(SKILL_IDS.map((k) => [k, 0])) as Record<SkillId, number>;
  const hi = { ...lo };
  for (const q of QUESTIONS) for (const k of SKILL_IDS) {
    const vals = q.options.map((o) => o.s?.[k] ?? 0);
    lo[k] += Math.min(...vals); hi[k] += Math.max(...vals);
  }
  return { lo, hi };
}

/** answers: question id → chosen option index. */
export function scoreTest(answers: Record<string, number>, now = new Date().toISOString()): TestResult {
  const t = Object.fromEntries(TYPE_IDS.map((k) => [k, 0.5])) as Record<TraderTypeId, number>;
  const s = Object.fromEntries(SKILL_IDS.map((k) => [k, 0])) as Record<SkillId, number>;
  let correct = 0, total = 0;
  for (const q of QUESTIONS) {
    if (q.section === "Knowledge") total++;
    const o = q.options[answers[q.id]];
    if (!o) continue;
    if (o.correct) correct++;
    for (const [k, v] of Object.entries(o.t ?? {})) t[k as TraderTypeId] += v;
    for (const [k, v] of Object.entries(o.s ?? {})) s[k as SkillId] += v;
  }
  const sum = TYPE_IDS.reduce((a, k) => a + t[k], 0);
  const typeMatch = Object.fromEntries(TYPE_IDS.map((k) => [k, t[k] / sum])) as Record<TraderTypeId, number>;
  const ranked = [...TYPE_IDS].sort((a, b) => t[b] - t[a]);
  const { lo, hi } = skillRange();
  const skills = Object.fromEntries(SKILL_IDS.map((k) => [k, Math.round(Math.max(0, Math.min(100, ((s[k] - lo[k]) / (hi[k] - lo[k] || 1)) * 100)))])) as Record<SkillId, number>;
  const bySkill = [...SKILL_IDS].sort((a, b) => skills[b] - skills[a]);
  return {
    takenAt: now, primary: ranked[0], secondary: ranked[1], typeMatch, skills,
    strengths: bySkill.slice(0, 2), weaknesses: bySkill.slice(-2).reverse(),
    knowledgeCorrect: correct, knowledgeTotal: total,
  };
}

export interface PathStep { lesson: Lesson; why: string }

/** Study path: fix the two weakest skills first, then master your style. Free lessons come first. */
export function studyPath(r: TestResult): PathStep[] {
  const out: PathStep[] = [];
  const seen = new Set<string>();
  const add = (l: Lesson, why: string) => { if (!seen.has(l.id)) { seen.add(l.id); out.push({ lesson: l, why }); } };
  const tierOrder = (a: Lesson, b: Lesson) => (a.tier === b.tier ? 0 : a.tier === "free" ? -1 : 1);
  for (const w of r.weaknesses) {
    LESSONS.filter((l) => l.skill === w && !l.types).sort(tierOrder).slice(0, 2).forEach((l) => add(l, `Builds your ${SKILLS[w].name.toLowerCase()}, your weakest area.`));
  }
  LESSONS.filter((l) => l.types?.includes(r.primary)).forEach((l) => add(l, `Core playbook for a ${TRADER_TYPES[r.primary].name.toLowerCase()}.`));
  if (r.knowledgeCorrect < r.knowledgeTotal) add(LESSONS.find((l) => l.id === "f-r-multiples")!, "You missed a knowledge check. This covers the math.");
  add(LESSONS.find((l) => l.id === "v-weekly")!, "Turns your journal into a weekly edge report.");
  return out;
}

/** Quests generated from the result, so the path shows up in the quest log. */
export function pathQuests(r: TestResult) {
  const w = r.weaknesses[0];
  const q: { id: string; title: string; xp: number }[] = [
    { id: `path-lesson-${w}`, title: `Finish 2 lessons on ${SKILLS[w].name.toLowerCase()}`, xp: 150 },
    { id: `path-setup-${r.primary}`, title: `Journal 5 trades using a ${TRADER_TYPES[r.primary].name.toLowerCase()} setup`, xp: 200 },
  ];
  if (w === "risk") q.push({ id: "path-stops", title: "Log 10 trades in a row with a stop loss", xp: 250 });
  if (w === "emotion") q.push({ id: "path-cooldown", title: "Take a 30-minute break after every loss for a week", xp: 250 });
  if (w === "discipline") q.push({ id: "path-checklist", title: "Use the pre-trade checklist on 10 trades", xp: 250 });
  if (w === "patience") q.push({ id: "path-a-plus", title: "Take only A+ setups for 5 trading days", xp: 250 });
  if (w === "analysis") q.push({ id: "path-markup", title: "Mark up key levels before 5 sessions", xp: 200 });
  if (w === "knowledge") q.push({ id: "path-review", title: "Complete your first weekly review", xp: 200 });
  return q;
}
