// RPG character engine: job classes, attributes, condition (mood) and emotes derived from the journal.
// Pure TS so the mobile app renders the same character from the same data.
import { traderProgress } from "./game";
import { POSITIVE_EMOTIONS, type JobClass, type TradeComputed, type WeaponClass } from "./types";
import { summarize, tiltMeter } from "./stats";

export interface JobDef {
  id: JobClass;
  name: string;
  style: string;
  blurb: string;
  color: string;
  primary: StatKey;
  titles: [string, string, string]; // tier titles by level: <15, <30, 30+
  fits: WeaponClass[];
}

export type StatKey = "STR" | "DEX" | "INT" | "VIT" | "WIS" | "FOC";

export const STAT_INFO: Record<StatKey, { name: string; from: string }> = {
  STR: { name: "Strength", from: "Profit factor" },
  DEX: { name: "Dexterity", from: "Win rate" },
  INT: { name: "Intellect", from: "Journal quality: notes and setups tagged" },
  VIT: { name: "Vitality", from: "Drawdown control" },
  WIS: { name: "Wisdom", from: "Rules followed" },
  FOC: { name: "Focus", from: "Calm, confident or focused entries" },
};

export const JOBS: Record<JobClass, JobDef> = {
  wizard: { id: "wizard", name: "Wizard", style: "Swing & trend analyst", blurb: "Reads the higher timeframe like a spellbook. Patient entries, big multi-R targets.", color: "#a78bfa", primary: "INT", titles: ["Apprentice", "Sorcerer", "Archmage"], fits: ["Trend"] },
  warrior: { id: "warrior", name: "Warrior", style: "Breakout & momentum", blurb: "Charges in when the range breaks. Thrives on volume and conviction.", color: "#fb7a45", primary: "STR", titles: ["Squire", "Knight", "Champion"], fits: ["Breakout", "News"] },
  assassin: { id: "assassin", name: "Assassin", style: "Reversals & liquidity hunts", blurb: "Strikes after the stop-hunt. Precise, quick, gone before the crowd reacts.", color: "#e879f9", primary: "DEX", titles: ["Cutpurse", "Shadowblade", "Phantom"], fits: ["Reversal"] },
  archer: { id: "archer", name: "Archer", style: "Range & mean reversion", blurb: "Fires from the edges of the range. Keeps distance, takes the high-probability shot.", color: "#4ade80", primary: "WIS", titles: ["Scout", "Ranger", "Skyranger"], fits: ["Range"] },
  defender: { id: "defender", name: "Defender", style: "Risk-first capital guardian", blurb: "Survival first. Small drawdowns, steady compounding, never blows up.", color: "#38bdf8", primary: "VIT", titles: ["Guardian", "Sentinel", "Bulwark"], fits: [] },
  sniper: { id: "sniper", name: "Sniper", style: "Scalper", blurb: "One breath, one shot. Tight stops, fast exits, dozens of precise trades.", color: "#fbbf24", primary: "FOC", titles: ["Marksman", "Deadeye", "Ghost"], fits: ["Scalp"] },
};

export type Condition = "onfire" | "strong" | "steady" | "weak" | "tilted" | "burnout" | "resting";

export const CONDITIONS: Record<Condition, { label: string; emoji: string; color: string; desc: string }> = {
  onfire: { label: "On fire", emoji: "🔥", color: "#fbbf24", desc: "Win streak with clean execution. Stay humble, keep the size." },
  strong: { label: "Strong", emoji: "💪", color: "#2fe39a", desc: "Edge is working and discipline is high." },
  steady: { label: "Steady", emoji: "🙂", color: "#c8f53b", desc: "Balanced. Keep executing the plan." },
  weak: { label: "Wounded", emoji: "🤕", color: "#fb923c", desc: "Recent losses are stacking up. Cut size and trade only A+ setups." },
  tilted: { label: "Enraged", emoji: "😡", color: "#ff5470", desc: "Revenge or FOMO trades detected. Step away before the next click." },
  burnout: { label: "Burned out", emoji: "🥵", color: "#ff5470", desc: "Overtrading and rule breaks. Energy is gone. Rest is the trade." },
  resting: { label: "Resting", emoji: "😴", color: "#8593a5", desc: "No trades this week. Recovering at camp." },
};

export function recommendJob(trades: TradeComputed[], setupClass: (id?: string) => WeaponClass | undefined): JobClass {
  const counts = new Map<JobClass, number>();
  for (const t of trades) {
    const wc = setupClass(t.setupId);
    const job = (Object.values(JOBS).find((j) => wc && j.fits.includes(wc))?.id ?? null) as JobClass | null;
    if (job) counts.set(job, (counts.get(job) ?? 0) + 1);
  }
  const s = summarize(trades);
  // Exceptionally tight risk control earns the Defender suggestion regardless of style.
  if (trades.length >= 20 && s.maxDrawdownPct < 0.03 && s.disciplineRate > 0.85) return "defender";
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "warrior";
}

export function characterState(trades: TradeComputed[], account: number, job: JobClass, now = Date.now(), bonusXp = 0) {
  const progress = traderProgress(trades, bonusXp);
  const def = JOBS[job];
  const tier = progress.level < 15 ? 0 : progress.level < 30 ? 1 : 2;
  const s = summarize(trades, account);
  const recent = trades.slice(-10);
  const rs = summarize(recent);
  const last5 = trades.slice(-5);
  const tilt = tiltMeter(trades);
  const day = 86400000;
  const last24 = trades.filter((t) => now - Date.parse(t.closedAt) < day).length;
  const lastTradeAge = trades.length ? now - Date.parse(trades[trades.length - 1].closedAt) : Infinity;

  // current drawdown from equity peak
  let eq = account;
  let peak = account;
  for (const t of trades) {
    eq += t.pnl;
    peak = Math.max(peak, eq);
  }
  const curDd = peak > 0 ? (peak - eq) / peak : 0;

  const clamp = (v: number) => Math.max(0, Math.min(99, Math.round(v)));
  const journaled = trades.length ? trades.filter((t) => (t.notes?.length ?? 0) > 20 && t.setupId).length / trades.length : 0;
  const posEmo = trades.filter((t) => t.emotion).length ? trades.filter((t) => t.emotion && POSITIVE_EMOTIONS.includes(t.emotion)).length / trades.filter((t) => t.emotion).length : 0;
  const stats: Record<StatKey, number> = {
    STR: clamp((Math.min(s.profitFactor, 3) / 3) * 99),
    DEX: clamp(s.winRate * 140),
    INT: clamp(journaled * 99),
    VIT: clamp(99 - s.maxDrawdownPct * 600),
    WIS: clamp(s.disciplineRate * 99),
    FOC: clamp(posEmo * 99),
  };

  const hp = Math.max(5, Math.round(100 - curDd * 1000)); // 10% drawdown from peak = near zero HP
  const energy = Math.max(5, Math.round(100 - tilt * 0.7 - Math.max(0, last24 - 5) * 10));

  const revenge = last5.some((t) => t.emotion === "revenge" || t.emotion === "fomo");
  const broken = last5.filter((t) => t.rulesFollowed === false).length;
  let condition: Condition = "steady";
  if (lastTradeAge > 7 * day) condition = "resting";
  else if (last24 >= 8 || (tilt >= 60 && broken >= 3)) condition = "burnout";
  else if (revenge && tilt >= 40) condition = "tilted";
  else if (recent.length >= 5 && (rs.winRate < 0.35 || (rs.netPnl < 0 && curDd > 0.04))) condition = "weak";
  else if (s.currentStreak >= 3 && rs.disciplineRate >= 0.8) condition = "onfire";
  else if (rs.netPnl > 0 && rs.disciplineRate >= 0.7) condition = "strong";

  return {
    def,
    title: `${def.titles[tier]}`,
    tier,
    progress,
    stats,
    hp,
    energy,
    condition,
    cond: CONDITIONS[condition],
    lines: emotes(condition, { streak: s.currentStreak, last24, dd: curDd, job: def.name }),
  };
}

function emotes(c: Condition, x: { streak: number; last24: number; dd: number; job: string }) {
  const pct = `${(x.dd * 100).toFixed(1)}%`;
  switch (c) {
    case "onfire":
      return [`${x.streak} wins in a row! Let's go!`, "Same size. Same plan. No hero trades.", "The edge is sharp today."];
    case "strong":
      return ["Feeling strong. Plan is working.", "Execution clean. Keep stacking R.", `A true ${x.job} waits for the setup.`];
    case "steady":
      return ["Steady hands. Waiting for my setup.", "No setup, no trade.", "Patience is a position too."];
    case "weak":
      return [`Down ${pct} from peak… need to heal.`, "Half size until I'm green again.", "Only A+ setups now."];
    case "tilted":
      return ["Grr… I want it back NOW.", "Revenge mode detected. Walk away.", "Close the charts. Breathe."];
    case "burnout":
      return [`${x.last24} trades in 24h… I'm exhausted.`, "Too many clicks. Not enough edge.", "Rest is the best trade right now."];
    case "resting":
      return ["Zzz… recovering at camp.", "Rested. Ready when the market is.", "Reviewing my playbook by the fire."];
  }
}
