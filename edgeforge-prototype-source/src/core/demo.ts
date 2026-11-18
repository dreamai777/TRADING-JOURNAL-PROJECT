// Seeded demo dataset so the app runs out of the box.
import { gaussian, mulberry32 } from "./random";
import type { AssetClass, Emotion, Mistake, Setup, Trade, TradeSource, User } from "./types";

export const DEMO_TRADER_ID = "u_trader";
export const DEMO_ADMIN_ID = "u_admin";

export function demoUsers(now = Date.now()): User[] {
  const iso = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();
  return [
    { id: DEMO_TRADER_ID, name: "Demo Trader", email: "trader@demo.gg", role: "user", baseCurrency: "USD", accountSize: 25000, createdAt: iso(120), avatar: "🦊", status: "active" },
    { id: DEMO_ADMIN_ID, name: "Admin", email: "admin@demo.gg", role: "admin", baseCurrency: "USD", accountSize: 25000, createdAt: iso(200), avatar: "🛡️", status: "active" },
    { id: "u_3", name: "Kai Moreno", email: "kai@example.com", role: "user", baseCurrency: "EUR", accountSize: 5000, createdAt: iso(60), avatar: "🐺", status: "active" },
    { id: "u_4", name: "Aiko Tan", email: "aiko@example.com", role: "user", baseCurrency: "JPY", accountSize: 15000, createdAt: iso(33), avatar: "🦉", status: "active" },
    { id: "u_5", name: "Ravi Shah", email: "ravi@example.com", role: "user", baseCurrency: "INR", accountSize: 3000, createdAt: iso(12), avatar: "🐯", status: "suspended" },
    { id: "u_6", name: "Lena Brooks", email: "lena@example.com", role: "user", baseCurrency: "GBP", accountSize: 50000, createdAt: iso(4), avatar: "🦅", status: "active" },
  ];
}

export function demoSetups(userId = DEMO_TRADER_ID): Setup[] {
  const base = { userId, createdAt: new Date(Date.now() - 100 * 86400000).toISOString() };
  return [
    {
      ...base, id: "s_orb", name: "Opening Range Breakout", icon: "🗡️", weaponClass: "Breakout", timeframe: "5m",
      markets: ["futures", "equities", "crypto"], equipped: true,
      description: "Trade the break of the first 15-minute range with volume confirmation.",
      rules: ["Range defined in first 15 min", "Break candle closes outside range", "Volume > 1.5x average", "Stop on opposite side of range mid", "No major news in next 30 min"],
      entryTrigger: "5m close beyond the range high/low", exitPlan: "Scale 50% at 2R, trail rest under 9 EMA", invalidation: "Price re-enters range and closes back inside",
    },
    {
      ...base, id: "s_vwap", name: "VWAP Reclaim", icon: "🏹", weaponClass: "Reversal", timeframe: "1m–5m",
      markets: ["crypto", "equities"], equipped: true,
      description: "Fade a flush that reclaims VWAP with a higher low.",
      rules: ["Prior flush below VWAP", "Higher low formed", "Reclaim candle closes above VWAP", "Stop below higher low"],
      entryTrigger: "Close above VWAP after higher low", exitPlan: "Target prior high of day, 1R partial", invalidation: "Lose VWAP on closing basis",
    },
    {
      ...base, id: "s_trend", name: "Trend Pullback", icon: "🔱", weaponClass: "Trend", timeframe: "1h",
      markets: ["crypto", "forex"], equipped: true,
      description: "Join an established trend on a pullback to the 21 EMA.",
      rules: ["Higher-timeframe trend aligned", "Pullback to 21 EMA zone", "Bullish/bearish engulfing at zone", "Risk max 1%"],
      entryTrigger: "Engulfing close at the EMA zone", exitPlan: "Hold to 3R or structure break", invalidation: "Close beyond 50 EMA",
    },
    {
      ...base, id: "s_scalp", name: "Liquidity Sweep Scalp", icon: "⚡", weaponClass: "Scalp", timeframe: "1m",
      markets: ["crypto", "futures"], equipped: false,
      description: "Scalp the reversal after a sweep of equal highs/lows.",
      rules: ["Clear equal highs/lows", "Sweep with wick rejection", "Market structure shift on 1m", "Tight stop beyond wick"],
      entryTrigger: "1m MSS after sweep", exitPlan: "Fixed 1.5R", invalidation: "New extreme beyond sweep wick",
    },
    {
      ...base, id: "s_range", name: "Range Edge Fade", icon: "🛡️", weaponClass: "Range", timeframe: "15m",
      markets: ["forex", "crypto"], equipped: true,
      description: "Fade the edges of a well-defined range in low-volatility sessions.",
      rules: ["3+ touches on each side", "Low ADX (< 20)", "Rejection candle at edge", "Target range mid first"],
      entryTrigger: "Rejection close at range edge", exitPlan: "50% at mid, rest at opposite edge", invalidation: "15m close outside range",
    },
    {
      ...base, id: "s_news", name: "News Momentum", icon: "💣", weaponClass: "News", timeframe: "1m",
      markets: ["forex", "futures", "options"], equipped: false,
      description: "Ride momentum after a high-impact data release once the first candle settles.",
      rules: ["Tier-1 release only", "Wait for first 1m candle to close", "Enter on break of first candle", "Hard stop, no averaging"],
      entryTrigger: "Break of first post-news candle", exitPlan: "Trail behind 1m swing", invalidation: "First candle fully retraced",
    },
  ];
}

const SYMBOLS: Record<AssetClass, { symbol: string; price: number; mult: number }[]> = {
  crypto: [
    { symbol: "BTCUSDT", price: 91000, mult: 1 },
    { symbol: "ETHUSDT", price: 3150, mult: 1 },
    { symbol: "SOLUSDT", price: 185, mult: 1 },
  ],
  forex: [
    { symbol: "EURUSD", price: 1.082, mult: 1 },
    { symbol: "GBPUSD", price: 1.268, mult: 1 },
    { symbol: "XAUUSD", price: 2640, mult: 1 },
  ],
  futures: [
    { symbol: "ES", price: 5950, mult: 50 },
    { symbol: "NQ", price: 20900, mult: 20 },
  ],
  equities: [
    { symbol: "NVDA", price: 142, mult: 1 },
    { symbol: "TSLA", price: 255, mult: 1 },
    { symbol: "AAPL", price: 229, mult: 1 },
  ],
  options: [{ symbol: "SPY 600C", price: 4.2, mult: 100 }],
};

// Hidden "true edge" per setup — the demo trader is great at trend pullbacks, bad at news.
const EDGE: Record<string, { p: number; winR: number }> = {
  s_orb: { p: 0.52, winR: 2.1 },
  s_vwap: { p: 0.58, winR: 1.6 },
  s_trend: { p: 0.5, winR: 2.9 },
  s_scalp: { p: 0.55, winR: 1.3 },
  s_range: { p: 0.62, winR: 1.2 },
  s_news: { p: 0.36, winR: 1.9 },
};

const NOTES_WIN = [
  "Waited for the close, entry was clean. Followed the plan exactly.",
  "Patience paid. Let it run to target instead of cutting early.",
  "A+ setup, all checklist items ticked. Size was right.",
  "Great read on the higher timeframe trend.",
];
const NOTES_LOSS = [
  "Entered before confirmation. Need to wait for the candle close.",
  "Valid setup, just didn't work. Stop respected, no regrets.",
  "Chased after missing the first entry. FOMO trade.",
  "Moved my stop and turned a 1R loss into more. Never again.",
  "Traded right before news. Should have checked the calendar.",
];

export function demoTrades(userId = DEMO_TRADER_ID, count = 160, now = Date.now(), seed = 7, days = 75): Trade[] {
  const rand = mulberry32(seed);
  const setups = demoSetups(userId);
  const trades: Trade[] = [];
  const sources: TradeSource[] = ["demo", "binance", "okx", "bitget", "manual"];
  for (let i = 0; i < count; i++) {
    // later trades slightly better: the trader is "levelling up"
    const progress = i / count;
    const setup = setups[Math.floor(rand() * setups.length)];
    const edge = EDGE[setup.id];
    const ac = setup.markets[Math.floor(rand() * setup.markets.length)];
    const pool = SYMBOLS[ac];
    const sym = pool[Math.floor(rand() * pool.length)];
    const price = sym.price * (1 + gaussian(rand) * 0.03);
    const side = rand() < 0.58 ? "long" : "short";
    const dir = side === "long" ? 1 : -1;
    const stopPct = 0.003 + rand() * 0.009;
    const stopDist = price * stopPct;
    const riskUsd = 45 + rand() * 40;
    const qty = riskUsd / (stopDist * sym.mult);

    const disciplined = rand() < 0.62 + progress * 0.25;
    const negEmo: Emotion[] = ["fomo", "fearful", "greedy", "revenge", "bored", "tired"];
    const posEmo: Emotion[] = ["calm", "confident", "focused"];
    const emotion = disciplined ? posEmo[Math.floor(rand() * 3)] : negEmo[Math.floor(rand() * negEmo.length)];
    const pWin = edge.p + (disciplined ? 0.06 : -0.12);
    const win = rand() < pWin;
    const mistakes: Mistake[] = [];
    let R: number;
    if (win) {
      R = edge.winR * (0.45 + rand() * 1.1);
      if (!disciplined && rand() < 0.5) {
        mistakes.push("early-exit");
        R *= 0.5;
      }
      if (rand() < 0.04) R = 5 + rand() * 3; // occasional runner
    } else {
      R = -(0.85 + rand() * 0.2);
      if (!disciplined) {
        const m: Mistake[] = ["moved-stop", "oversized", "chased", "late-entry", "broke-rules", "overtraded", "no-stop"];
        mistakes.push(m[Math.floor(rand() * m.length)]);
        if (mistakes[0] === "moved-stop" || mistakes[0] === "no-stop") R = -(1.4 + rand() * 0.8);
        if (mistakes[0] === "oversized") R = -(1.6 + rand() * 0.4);
      }
    }
    const exit = price + dir * R * stopDist;
    const dayOffset = days - Math.floor(progress * days) - (rand() < 0.3 ? 1 : 0);
    let open = new Date(now - dayOffset * 86400000);
    // shift weekend trades to Friday for non-crypto
    if (ac !== "crypto" && (open.getUTCDay() === 0 || open.getUTCDay() === 6)) open = new Date(open.getTime() - (open.getUTCDay() === 0 ? 2 : 1) * 86400000);
    open.setUTCHours(ac === "crypto" ? Math.floor(rand() * 24) : 13 + Math.floor(rand() * 7), Math.floor(rand() * 60), 0, 0);
    const holdMin = setup.weaponClass === "Scalp" ? 2 + rand() * 15 : setup.weaponClass === "Trend" ? 120 + rand() * 900 : 10 + rand() * 120;
    let close = new Date(open.getTime() + holdMin * 60000);
    if (close.getTime() > now) {
      // never journal the future: pull the trade back so it closed a few minutes ago
      const shift = close.getTime() - now + (5 + rand() * 120) * 60000;
      open = new Date(open.getTime() - shift);
      close = new Date(close.getTime() - shift);
    }
    const notional = price * qty * sym.mult;
    trades.push({
      id: `t_${i.toString().padStart(4, "0")}`,
      userId,
      symbol: sym.symbol,
      assetClass: ac,
      side,
      entry: round(price),
      exit: round(exit),
      qty: +(qty * sym.mult).toFixed(6),
      fees: +(notional * 0.0004).toFixed(2),
      stopLoss: round(price - dir * stopDist),
      takeProfit: round(price + dir * edge.winR * stopDist),
      openedAt: open.toISOString(),
      closedAt: close.toISOString(),
      setupId: setup.id,
      tags: [ac === "crypto" ? "perp" : "intraday", ...(rand() < 0.3 ? ["A+"] : [])],
      emotion,
      mistakes,
      rulesFollowed: disciplined,
      rating: disciplined ? 4 + (rand() < 0.4 ? 1 : 0) : 1 + Math.floor(rand() * 3),
      notes: (win ? NOTES_WIN : NOTES_LOSS)[Math.floor(rand() * (win ? NOTES_WIN.length : NOTES_LOSS.length))],
      source: ac === "crypto" ? sources[Math.floor(rand() * 4)] : rand() < 0.5 ? "csv" : "manual",
      replaySaved: rand() < 0.15,
    });
  }
  return trades;
}

function round(v: number) {
  if (v > 1000) return +v.toFixed(2);
  if (v > 10) return +v.toFixed(3);
  return +v.toFixed(5);
}
