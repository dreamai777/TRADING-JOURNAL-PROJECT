// Lesson bodies. Free lessons are full self-study material with a one-question check to complete
// them. Premium lessons show an outline until the Guild plan is active; `videoUrl` is where the
// recorded session plugs in when it exists.

export interface LessonCheck { q: string; options: string[]; answer: number; why: string }
export interface LessonBody {
  intro: string;
  points: { h: string; p: string }[];
  drill?: string;
  takeaway: string;
  check?: LessonCheck;
  videoUrl?: string;
}

export const CONTENT: Record<string, LessonBody> = {
  "f-market-structure": {
    intro: "Before any indicator, read structure. Price is always doing one of two things: trending or ranging. Your setups only work in the right one.",
    points: [
      { h: "Uptrend", p: "Higher highs and higher lows. The trend is intact until price makes a lower low below the last higher low." },
      { h: "Downtrend", p: "Lower highs and lower lows. Shorts at lower highs, never longs because it 'looks cheap'." },
      { h: "Range", p: "Price bounces between a clear high and low. Buy near support, sell near resistance, and stop trading the middle." },
      { h: "Key levels", p: "Mark the previous day's high and low, the weekly open, and the last major swing points. Most good trades start at one of these." },
    ],
    drill: "Open BTC on the 4-hour chart. Label the last 4 swing points as HH, HL, LH or LL. Is it trending or ranging?",
    takeaway: "Trade with the structure. If you can't say whether it's trending or ranging in one sentence, don't trade.",
    check: { q: "Price makes a higher high, then a higher low. What is the structure?", options: ["Downtrend", "Uptrend", "Range"], answer: 1, why: "Higher highs and higher lows define an uptrend." },
  },
  "f-candles-volume": {
    intro: "Each candle is a fight between buyers and sellers. Volume tells you how many people showed up to that fight.",
    points: [
      { h: "Body vs wick", p: "A big body means one side won clearly. A long wick means price was rejected from that level." },
      { h: "Volume confirms", p: "A breakout on rising volume is real interest. A breakout on falling volume is often a trap." },
      { h: "Context first", p: "A hammer candle means nothing in the middle of a range. At support, after a sell-off, it means a lot." },
    ],
    takeaway: "Read candles at levels, and trust moves that come with volume.",
    check: { q: "Price breaks resistance but volume is the lowest of the day. What's most likely?", options: ["A strong breakout", "A possible fake-out", "Nothing changes"], answer: 1, why: "Breakouts without volume often fail and reverse." },
  },
  "f-orders": {
    intro: "Every trade has costs you don't see on the chart. Over hundreds of trades, they decide whether a small edge survives.",
    points: [
      { h: "Market vs limit", p: "Market orders fill now and pay the taker fee. Limit orders wait for your price and usually pay the lower maker fee." },
      { h: "Stop orders", p: "A stop-market guarantees an exit, not a price. In fast moves expect slippage beyond your stop." },
      { h: "Funding", p: "On perpetual futures you pay or receive funding every 8 hours. Holding a crowded long for days can cost more than the fees." },
    ],
    takeaway: "Know your all-in cost per trade. EdgeForge logs fees on every trade so you can see what they really take.",
    check: { q: "Which order type usually pays the lower fee?", options: ["Market order", "Limit order that rests on the book", "Stop-market order"], answer: 1, why: "Resting limit orders add liquidity and usually pay maker fees." },
  },
  "f-r-multiples": {
    intro: "Stop thinking in dollars. Think in R: the amount you risk on a trade. It makes every trade comparable and shows if your strategy truly works.",
    points: [
      { h: "1R", p: "If your stop loses $100, then 1R = $100. A $300 winner is +3R; a full stop-out is −1R." },
      { h: "Expectancy", p: "(win rate × average win) − (loss rate × average loss). 40% × 3R − 60% × 1R = +0.6R per trade." },
      { h: "Profit factor", p: "Gross profit ÷ gross loss. Above 1.0 makes money; 1.5+ is solid; 2.0+ is excellent over a big sample." },
    ],
    takeaway: "A low win rate can be very profitable, and a high one can lose money. Expectancy is the truth.",
    check: { q: "Win rate 50%, average win 1R, average loss 1.5R. Expectancy?", options: ["+0.25R", "−0.25R", "0R"], answer: 1, why: "0.5 × 1 − 0.5 × 1.5 = −0.25R per trade." },
  },
  "r-position-size": {
    intro: "Position sizing is the one skill that keeps you in the game long enough to get good. It's simple math.",
    points: [
      { h: "The formula", p: "Position size = (account × risk %) ÷ stop distance %. $10,000 × 1% ÷ 2% = $5,000 position." },
      { h: "Risk 0.5–1%", p: "At 1% risk, ten losses in a row costs about 10%. At 5% risk, it costs about 40%, and that's very hard to recover." },
      { h: "Leverage is not risk", p: "Leverage only changes margin. Your risk is set by size and stop distance, not by the leverage slider." },
    ],
    drill: "Use EdgeForge's position-size calculator on your next 3 trades before you enter.",
    takeaway: "Decide the stop first, then the size. Never the other way round.",
    check: { q: "$20,000 account, 1% risk, stop 4% away. Position size?", options: ["$2,000", "$5,000", "$20,000"], answer: 1, why: "$20,000 × 1% = $200 risk; $200 ÷ 4% = $5,000." },
  },
  "r-stops": {
    intro: "Your stop isn't where you can afford to lose. It's where your trade idea is proven wrong.",
    points: [
      { h: "Structure stops", p: "For a long, put the stop below the higher low or the level you bought. If that breaks, the reason for the trade is gone." },
      { h: "Too tight is a trap", p: "Stops inside normal noise get hit before the move. Use the recent ATR or swing to give the trade room, and size down." },
      { h: "Never widen", p: "Moving your stop further away turns a planned 1R loss into a 3R disaster. Move stops only in your favour." },
    ],
    takeaway: "Place the stop at invalidation, then size the position so that stop costs 1R.",
    check: { q: "Price nears your stop. What's the disciplined move?", options: ["Widen the stop", "Let the stop work", "Add to the position"], answer: 1, why: "The stop marks where the idea is wrong. Respect it." },
  },
  "r-leverage": {
    intro: "Liquidation is the market's way of closing a trade you didn't plan to close. Avoid it by design.",
    points: [
      { h: "Stop before liquidation", p: "Your stop must always be far inside your liquidation price. If they're close, your leverage is too high." },
      { h: "Isolated margin", p: "Use isolated margin per trade so one bad position can't drain the whole account." },
      { h: "Size from risk", p: "Pick size from your 1% rule, then use only as much leverage as that size needs." },
    ],
    takeaway: "Leverage is a tool for capital efficiency, never a way to risk more.",
    check: { q: "Your stop is beyond your liquidation price. What should you do?", options: ["Nothing", "Lower leverage or size until the stop is safely inside", "Remove the stop"], answer: 1, why: "The stop must trigger before liquidation can." },
  },
  "m-revenge": {
    intro: "Revenge trading is the most expensive habit in trading: jumping back in right after a loss to win it back.",
    points: [
      { h: "Spot it", p: "A trade taken within minutes of a loss, often bigger, without your usual setup. EdgeForge flags these automatically." },
      { h: "The cooldown rule", p: "After a loss, wait 30 minutes before the next trade. After 2 losses, you're done for the session." },
      { h: "Reframe the loss", p: "A stop-out on a good setup is a business expense, not a debt the market owes you." },
    ],
    takeaway: "The market doesn't know you lost. Trade the next setup like it's the first of the day.",
    check: { q: "You just took a full stop-out. What does the cooldown rule say?", options: ["Re-enter immediately with double size", "Wait 30 minutes before the next trade", "Switch to a new coin"], answer: 1, why: "A forced pause breaks the emotional loop." },
  },
  "m-fomo": {
    intro: "Fear of missing out makes you buy late, at the worst price, with the worst stop.",
    points: [
      { h: "Missed ≠ lost", p: "A move you didn't take costs $0. Chasing it can cost you 1R or more." },
      { h: "Wait for the retest", p: "Strong moves often pull back to the breakout level. That's your second chance with a cleaner stop." },
      { h: "Keep a watchlist", p: "Write tomorrow's levels before the session. If price runs without you, it wasn't your trade." },
    ],
    takeaway: "There's always another setup. Your job is taking yours, not every move.",
    check: { q: "A coin pumps 15% while you're away. Best response?", options: ["Buy now before it goes higher", "Wait for a pullback to a level with a clear stop", "Short it because it's too high"], answer: 1, why: "Late entries have poor risk-reward; wait for structure." },
  },
  "m-routine": {
    intro: "Consistent traders don't rely on mood. They rely on a routine that puts them in the right state before the first trade.",
    points: [
      { h: "Check in", p: "Rate your sleep, stress and focus 1–5. If two are below 3, trade half size or not at all." },
      { h: "Map the day", p: "Mark key levels, note news events, and write your one or two A+ setups for today." },
      { h: "Set limits", p: "Max trades and max daily loss. When you hit either, you stop." },
    ],
    takeaway: "Ten minutes of preparation prevents hours of regret.",
    check: { q: "You slept badly and feel stressed. What does the routine suggest?", options: ["Trade bigger to make it worth it", "Trade smaller or skip the session", "Ignore it"], answer: 1, why: "Your state affects execution. Reduce risk when it's poor." },
  },
  "e-rules": {
    intro: "A setup you can't write down is a feeling. Rules turn feelings into something you can test and improve.",
    points: [
      { h: "Entry", p: "Exact trigger: 'Long when the 15m candle closes back above VWAP after sweeping the session low.'" },
      { h: "Stop and target", p: "Stop at invalidation, first target at the next level, and the minimum R:R you accept (e.g. 2R)." },
      { h: "Invalidation", p: "When the setup is off: 'No trade if price is below the daily open' or 'No trade 15 minutes before news.'" },
    ],
    drill: "Write one setup in your Spellbook with all four parts. Tag your next 5 trades with it.",
    takeaway: "If two traders read your rule, they should take the same trade.",
    check: { q: "Which is a usable entry rule?", options: ["Buy when it looks strong", "Buy when the 1h closes above the prior day high with volume above average", "Buy dips"], answer: 1, why: "It's specific and testable." },
  },
  "e-patience": {
    intro: "Most losses come from trades that were 'almost' the setup. Patience is a skill you train, not a personality trait.",
    points: [
      { h: "Grade setups", p: "A+ meets every rule. B is missing one. C is a guess. Only A+ gets full size." },
      { h: "Set alerts", p: "Put price alerts at your levels and close the chart. Let the market come to you." },
      { h: "Count the skips", p: "Log setups you skipped. You'll see that waiting often paid better than forcing." },
    ],
    takeaway: "The best traders spend most of their time waiting.",
    check: { q: "Your setup meets 3 of 4 rules. What grade is it?", options: ["A+", "B", "Doesn't matter"], answer: 1, why: "Missing a rule makes it a B setup: smaller size or skip." },
  },
  "e-checklist": {
    intro: "Pilots use checklists because skill isn't enough under pressure. Neither is it for traders.",
    points: [
      { h: "Five questions", p: "Is this my setup? Where's my stop? Is risk 1% or less? Is R:R 2 or more? Am I calm?" },
      { h: "Any 'no' = no trade", p: "The checklist isn't a suggestion. One 'no' and you pass." },
      { h: "Use the Spellbook", p: "Each setup in your Spellbook has its own checklist that you tick before you log the trade." },
    ],
    takeaway: "Ten seconds of checking saves the trades you'd regret.",
    check: { q: "Four of five checklist answers are yes, but you're angry after a loss. Trade?", options: ["Yes, four is enough", "No, any 'no' means no trade"], answer: 1, why: "The checklist only works if every item must pass." },
  },
  "s-swing": {
    intro: "Swing trading catches the multi-day legs inside a trend. It fits around a job and rewards patience.",
    points: [
      { h: "Trend filter", p: "Only long when the daily is making higher highs and price is above the 50 EMA." },
      { h: "Pullback entry", p: "Wait for a pullback to the 20 EMA or a broken resistance turned support, then a bullish 4h close." },
      { h: "Management", p: "Stop below the pullback low. Take a partial at 2R, trail the rest under each new 4h higher low." },
    ],
    takeaway: "Enter on the pullback, not the breakout candle, and let the trend do the work.",
    check: { q: "Daily uptrend, price pulls back to a support that held before. Best trigger?", options: ["Buy immediately", "Wait for a bullish 4h close off the level", "Short the pullback"], answer: 1, why: "Confirmation reduces failed entries." },
  },
  "s-investor": {
    intro: "Investing isn't trading slowly. It's a different game: allocation, time and staying power.",
    points: [
      { h: "DCA", p: "Buy a fixed amount on a schedule. It removes timing stress and averages your entry." },
      { h: "Accumulation zones", p: "Add extra when price is deep below its long-term average, not after a parabolic run." },
      { h: "Rebalancing", p: "Set target weights. When an asset grows past its band, trim it back. You sell high by design." },
    ],
    takeaway: "Your edge is time and discipline. Write the plan when calm, follow it when the market isn't.",
    check: { q: "BTC grows from 40% to 60% of your portfolio. Your plan says 40% ± 10%. Action?", options: ["Buy more", "Trim back toward 40%", "Do nothing ever"], answer: 1, why: "Rebalancing keeps risk where you planned it." },
  },
  "v-journal": {
    intro: "A trade you don't journal is a lesson you pay for twice. The goal is fast and consistent, not long essays.",
    points: [
      { h: "One line", p: "Use quick-snap: 'btc long 94100 → 95550 0.2 sl 93600'. P&L, R and fees fill in automatically." },
      { h: "Tag it", p: "Add the setup, your emotion and whether you followed your rules. These three tags power all your stats." },
      { h: "One lesson", p: "Write one sentence: what would you repeat or change?" },
    ],
    takeaway: "30 seconds per trade. Every trade. That's how the data starts working for you.",
    check: { q: "Which three tags matter most for your stats?", options: ["Setup, emotion, rules followed", "Colour, time zone, chart theme"], answer: 0, why: "They let EdgeForge find your edge and your leaks." },
  },
  "v-weekly": {
    intro: "Once a week, let your journal tell you what's working. It takes 15 minutes and is the highest-value habit in trading.",
    points: [
      { h: "Numbers", p: "Check net R, win rate, profit factor and max drawdown for the week. Better or worse than last week?" },
      { h: "Best and worst", p: "Find your best setup and your costliest mistake. EdgeForge's Mindset page shows the dollar cost of each." },
      { h: "One change", p: "Pick one thing to do differently next week and make it a quest." },
    ],
    takeaway: "Small weekly adjustments compound into a real edge.",
    check: { q: "What's the output of a good weekly review?", options: ["A long list of regrets", "One concrete change for next week"], answer: 1, why: "One focused change is actionable; ten aren't." },
  },
};

/** Outlines shown on locked premium lessons. */
export const PREMIUM_OUTLINES: Record<string, string[]> = {
  "r-drawdown-plan": ["Daily, weekly and monthly loss limits that fit your class", "Recovery mode: half size until you're back to break-even R", "Case study: from −18% back to new highs"],
  "m-tilt-reset": ["The 10-minute reset protocol, step by step", "Breathing and journaling scripts used by funded traders", "Building a tilt trigger list from your own data"],
  "e-scaling": ["When to scale out vs. hold the full position", "Trailing by structure, ATR and moving averages", "Backtested comparison of 4 exit methods"],
  "s-scalp": ["VWAP and order-flow scalps, with recorded live examples", "Fee math: the minimum edge a scalp needs", "Session timing and when to stop"],
  "s-day": ["Opening range breakout rules with filters", "Liquidity sweep reversals at session highs and lows", "Real recorded trades annotated bar by bar"],
  "s-momentum": ["Finding momentum before it's on everyone's feed", "Breakout vs fake-out: volume and structure tells", "Managing runners without giving it all back"],
  "s-position": ["Weekly breakout system with trailing stops", "Surviving long flat periods", "Portfolio heat across multiple trend positions"],
  "v-edge": ["Slice your journal by time, setup and market to find your edge", "Cutting the trades that drain your P&L", "Building a personal A+ setup list"],
  "v-case-studies": ["20 annotated A+ trades from real accounts", "The 10 most common losing patterns", "Before/after: how traders fixed their biggest leak"],
};
