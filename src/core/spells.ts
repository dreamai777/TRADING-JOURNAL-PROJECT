// Spell library: ready-made playbook setups, grouped by class "school". Learning a spell copies it
// into the trader's Arsenal as a setup they can tag trades with, track and upgrade.

import type { AssetClass, JobClass, Setup, WeaponClass } from "./types";

export interface Spell {
  id: string;
  school: JobClass;
  name: string;
  icon: string;
  weaponClass: WeaponClass;
  timeframe: string;
  markets: AssetClass[];
  /** Risk per cast, % of account. */
  mana: number;
  /** Max casts per day or week. */
  cooldown: string;
  conditions: string;
  description: string;
  entryTrigger: string;
  exitPlan: string;
  invalidation: string;
  rules: string[];
}

export const SPELLS: Spell[] = [
  {
    id: "vwap-snapback", school: "sniper", name: "VWAP Snapback", icon: "🎯", weaponClass: "Scalp", timeframe: "1m–5m", markets: ["crypto", "futures"], mana: 0.5, cooldown: "Max 8 casts per session",
    conditions: "Liquid pair, active session, price stretched 2+ ATR from VWAP.",
    description: "Fade an overextended move back toward VWAP once momentum stalls.",
    entryTrigger: "Price is 2+ ATR(14) from VWAP, prints a rejection wick, and the next 1m candle closes back inside the prior candle's range.",
    exitPlan: "Take 70% at the midpoint to VWAP, the rest at VWAP. Exit everything if not in profit within 10 bars.",
    invalidation: "No trade if a major news event is due in the next 15 minutes or the move is breaking a daily level.",
    rules: ["Spread and fees under 10% of target", "Stop beyond the rejection wick", "Target at least 1.5R", "Stop after 2 losses in a row"],
  },
  {
    id: "range-edge-scalp", school: "sniper", name: "Range Edge Scalp", icon: "⚡", weaponClass: "Scalp", timeframe: "1m–5m", markets: ["crypto", "forex"], mana: 0.5, cooldown: "Max 6 casts per session",
    conditions: "A clean intraday range with at least 2 touches on each side.",
    description: "Scalp bounces off a tested range edge with a tight stop just outside it.",
    entryTrigger: "Third touch of the range edge with a lower-volume push and a reversal candle.",
    exitPlan: "Take profit at the range midpoint. Move stop to break-even at 1R.",
    invalidation: "If a 5m candle closes outside the range, the range is broken. Stop casting.",
    rules: ["Range has 2+ touches each side", "Stop 0.1–0.2% outside the edge", "Never trade the middle", "Max 0.5% risk"],
  },
  {
    id: "liquidity-sweep", school: "assassin", name: "Liquidity Sweep Reversal", icon: "🗡️", weaponClass: "Reversal", timeframe: "5m–15m", markets: ["crypto", "futures", "forex"], mana: 1, cooldown: "Max 2 casts per day",
    conditions: "Obvious equal highs or lows, or a session high or low, near a higher-timeframe level.",
    description: "Strike after stops are hunted: price sweeps a level, traps breakout traders, then snaps back.",
    entryTrigger: "Price takes out the level, then a 5m candle closes back inside it. Enter on the close or the retest of the level.",
    exitPlan: "First target at the opposite side of the range (2R). Trail the rest under each new 5m swing.",
    invalidation: "If price accepts beyond the level (two closes outside), the sweep failed.",
    rules: ["Level is visible to everyone (equal highs/lows, session high/low)", "Stop beyond the sweep wick", "Minimum 2R to first target", "Higher timeframe not trending hard against you"],
  },
  {
    id: "failed-breakout", school: "assassin", name: "Failed Breakout Trap", icon: "🕸️", weaponClass: "Reversal", timeframe: "15m–1h", markets: ["crypto", "equities", "futures"], mana: 1, cooldown: "Max 2 casts per day",
    conditions: "A breakout on weak volume into a higher-timeframe level.",
    description: "Trade against a breakout that can't hold, when trapped buyers or sellers are forced out.",
    entryTrigger: "Breakout candle has below-average volume and the next candle closes back inside the range.",
    exitPlan: "Target the range midpoint, then the far side. Stop above or below the breakout high or low.",
    invalidation: "If volume expands in the breakout direction on the retest, stand aside.",
    rules: ["Breakout volume below 20-bar average", "Close back inside within 2 candles", "Stop beyond the breakout extreme", "At least 2R to the far side"],
  },
  {
    id: "orb", school: "warrior", name: "Opening Range Breakout", icon: "⚔️", weaponClass: "Breakout", timeframe: "5m–15m", markets: ["equities", "futures", "crypto"], mana: 1, cooldown: "1 cast per session",
    conditions: "Trending pre-market or a catalyst day; opening range narrower than average.",
    description: "Charge in when price breaks the first 15–30 minutes' range with volume.",
    entryTrigger: "A 5m candle closes beyond the opening range high or low with volume at least 1.5× average.",
    exitPlan: "Take a partial at 2R, trail the rest under the 9 EMA. Close all by end of session.",
    invalidation: "Price closes back inside the opening range. Exit, don't wait for the stop.",
    rules: ["Opening range defined before trading", "Volume confirms the break", "Stop at the opposite side or mid-range", "Only trade in the direction of the daily trend"],
  },
  {
    id: "volume-breakout", school: "warrior", name: "Volume Breakout Charge", icon: "🔥", weaponClass: "Breakout", timeframe: "1h–4h", markets: ["crypto", "equities"], mana: 1, cooldown: "Max 3 casts per week",
    conditions: "Multi-day consolidation under a clear resistance, tightening ranges.",
    description: "Buy the break of a well-defined base when volume shows real demand.",
    entryTrigger: "A 1h close above resistance on volume 2× average, or the first retest of the broken level that holds.",
    exitPlan: "Measured-move target (base height). Partial at 2R, trail below the 1h 20 EMA.",
    invalidation: "A 4h close back below the breakout level.",
    rules: ["Base is at least 3 days long", "Volume 2× average on the break", "Not more than 3% extended when entering", "Stop under the base or retest low"],
  },
  {
    id: "trend-pullback", school: "archer", name: "Trend Pullback Shot", icon: "🏹", weaponClass: "Trend", timeframe: "4h–Daily", markets: ["crypto", "equities", "forex"], mana: 1, cooldown: "Max 3 open at once",
    conditions: "Daily higher highs and higher lows, price above the 50 EMA.",
    description: "Take the high-probability shot on a pullback inside an established trend.",
    entryTrigger: "Price pulls back to the 20 or 50 EMA or prior resistance, then prints a bullish 4h close.",
    exitPlan: "Partial at 2R, trail the rest under each new 4h higher low.",
    invalidation: "A daily close below the last higher low.",
    rules: ["Daily trend is up (HH/HL)", "Entry within 1 ATR of the moving average", "Stop below the pullback low", "Minimum 2.5R potential"],
  },
  {
    id: "sr-flip", school: "archer", name: "S/R Flip Retest", icon: "🎯", weaponClass: "Range", timeframe: "1h–4h", markets: ["crypto", "forex", "futures"], mana: 1, cooldown: "Max 2 casts per day",
    conditions: "A level that held 2+ times breaks cleanly and is retested.",
    description: "Old resistance becomes new support (and vice versa). Enter on the retest from a distance.",
    entryTrigger: "First retest of the flipped level with a rejection candle on the 1h.",
    exitPlan: "Target the next major level. Move stop to break-even at 1.5R.",
    invalidation: "A 1h close back through the level.",
    rules: ["Level held 2+ times before breaking", "Clean break with momentum", "First retest only", "Stop on the other side of the level"],
  },
  {
    id: "weekly-breakout", school: "wizard", name: "Weekly Breakout Ritual", icon: "🔮", weaponClass: "Trend", timeframe: "Daily–Weekly", markets: ["crypto", "equities", "futures"], mana: 0.75, cooldown: "Max 5 open positions",
    conditions: "Price breaks a multi-month range on the weekly chart.",
    description: "Enter the start of a major trend and let a wide trailing stop carry you for months.",
    entryTrigger: "Weekly close above a 20-week high.",
    exitPlan: "Trail the stop at the 10-week low. No profit target. Let the trend end the trade.",
    invalidation: "Weekly close back inside the old range within 2 weeks.",
    rules: ["Weekly close confirms, never intraweek", "Risk sized on the trailing-stop distance", "Total portfolio heat under 5%", "No discretionary exits"],
  },
  {
    id: "htf-pullback", school: "wizard", name: "Higher-Timeframe Pullback", icon: "📜", weaponClass: "Trend", timeframe: "Daily", markets: ["crypto", "equities", "forex"], mana: 1, cooldown: "Max 2 casts per week",
    conditions: "Weekly uptrend; daily pulls back into weekly support or the weekly 20 EMA.",
    description: "Use the weekly map, enter on the daily, aim for multi-R swings.",
    entryTrigger: "Daily bullish engulfing or higher low at weekly support.",
    exitPlan: "Target the prior weekly high, then trail under daily swing lows.",
    invalidation: "Weekly close below the support zone.",
    rules: ["Weekly trend up", "Entry at a weekly level, not mid-air", "Minimum 3R to target", "Max 1% risk"],
  },
  {
    id: "dca-zones", school: "defender", name: "Accumulation Ward (DCA)", icon: "🛡️", weaponClass: "Trend", timeframe: "Weekly–Monthly", markets: ["crypto", "equities"], mana: 0, cooldown: "Weekly schedule",
    conditions: "Long-term thesis intact; price below its 200-week average adds extra.",
    description: "Build a position on a fixed schedule, adding more when price is deep in value.",
    entryTrigger: "Fixed buy every week. Double the buy when price is 30%+ below the 200-week average.",
    exitPlan: "Trim 10–20% when price is 2× the 200-week average or the asset exceeds its target weight.",
    invalidation: "The long-term thesis breaks (written down in advance).",
    rules: ["Buy amount set in advance", "No buying with money needed in 3 years", "Thesis written before the first buy", "Review quarterly, not daily"],
  },
  {
    id: "rebalance", school: "defender", name: "Rebalance Shield", icon: "⚖️", weaponClass: "Range", timeframe: "Monthly", markets: ["crypto", "equities"], mana: 0, cooldown: "Monthly check",
    conditions: "A portfolio with target weights per asset.",
    description: "Keep risk where you planned by trimming winners and topping up laggards.",
    entryTrigger: "An asset drifts more than 10 points from its target weight.",
    exitPlan: "Sell the excess back to target and buy the underweight assets.",
    invalidation: "Change targets only at a scheduled yearly review.",
    rules: ["Target weights written down", "10-point drift band", "Check once a month", "Account for fees and taxes"],
  },
];

export function spellToSetup(s: Spell): Omit<Setup, "userId" | "createdAt" | "id"> {
  return {
    name: s.name, icon: s.icon, weaponClass: s.weaponClass, timeframe: s.timeframe, markets: s.markets,
    description: `${s.description} Best when: ${s.conditions} Risk ${s.mana}% per trade. ${s.cooldown}.`,
    rules: s.rules, entryTrigger: s.entryTrigger, exitPlan: s.exitPlan, invalidation: s.invalidation, equipped: false,
  };
}
