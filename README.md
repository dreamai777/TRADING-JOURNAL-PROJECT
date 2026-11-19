# TRADING-JOURNAL-PROJECT

BEST TRADING JOURNAL

# EdgeForge (working name)

A gamified trading journal: one-snap journaling, setups as levelling "weapons", pro analytics,
mindset and risk tooling, trade replay, social share cards, exchange sync and a multi-asset backtest lab.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # core engine unit tests
npm run build      # production build
```

Demo logins (password `demo1234`): `trader@demo.gg` (160 seeded trades) and `admin@demo.gg` (admin console).
Or sign up with any email. Prototype data lives in your browser (localStorage).

## AI Council

Five agents read the journal: Oracle (trade analyst: grade, what went right and wrong, tips), Ironclad (habits),
Bulwark (risk), Empath (sentiment) and Sensei (personal coach), plus custom agents traders build with their own
rules and voice. Agent reports are computed on-device in `src/core/ai/` and need no key.

Chat goes to Claude through `src/app/api/ai/route.ts`, which talks to a provider-agnostic interface in
`src/server/ai/` (`provider.ts` is the contract, `anthropic.ts` the Claude implementation). Everyday chat uses
Claude Sonnet 5.5; the "Deep review" button on a trade uses Claude Opus 5.5. The key never leaves the server.

Cost control (`src/core/ai/quota.ts`, counters in Netlify Blobs, in memory elsewhere):

| Plan | AI chats a month | Per minute |
|---|---|---|
| Free | 20 | 6 |
| Premium | 200 | 10 |
| Ultra | 2,000 (fair use) | 20 |

A chat costs 1 credit, a deep review 3. Free credits are also capped per network (3x the free limit), and a
global daily budget stops all AI calls once the day's estimated spend is reached.

Env vars on the host (Netlify or Vercel):

- `ANTHROPIC_API_KEY` (required for Claude; without it chat falls back to the offline engine)
- `AI_DAILY_BUDGET_USD` (optional, default `5`; `0` turns the cap off)
- `AI_UNLIMITED_USERS` (optional, comma-separated emails that skip monthly limits, e.g. the owner's)
- `AI_TRUST_CLIENT_PLAN` (optional; `false` treats every caller as Free until server-side auth lands)
- `ANTHROPIC_MODEL_FAST` / `ANTHROPIC_MODEL_DEEP` (optional overrides, default `claude-sonnet-5-5` / `claude-opus-5-5`)
- `AI_PROVIDER` (optional, default `anthropic`; for future providers)

Until Supabase auth is wired in, the plan and user id come from the browser, so the daily budget is the real
safety net. `resolveCaller()` in `src/server/ai/guard.ts` is the one place to switch to a session lookup.

## Architecture

```
src/core/      Pure TypeScript domain engine. No React, no browser APIs.
               stats, gamification (XP, ranks, weapon rarity, badges, quests), currency,
               CSV mapping, one-line trade parser, replay candles, backtester, coach insights.
               → Shared as-is with the future Expo (React Native) app.
src/lib/       Client data layer (zustand). Same actions the Supabase repository will expose.
src/components UI kit, charts (Recharts + TradingView Lightweight Charts), shell, quick snap.
src/app/       Next.js App Router pages.
supabase/      Production Postgres schema with row-level security.
```

## Going from prototype to production

| Prototype | Production |
|---|---|
| localStorage store | Supabase Postgres + RLS (`supabase/schema.sql`) |
| Demo auth with roles | Supabase Auth (email, Google, Apple, Discord) + `profiles.role` |
| Simulated exchange sync | Server-side CCXT worker (Binance, OKX, Bitget), keys in Supabase Vault |
| Generated replay candles | Exchange klines via CCXT; Polygon/Databento for US markets |
| Synthetic backtest data | Polygon (equities/options), Databento (CME), exchange history (crypto), FX feed |
| AI Council offline engine | Same agents + Claude chat via `/api/ai` once `ANTHROPIC_API_KEY` is set |
| Demo market-mood feed | Live fear and greed, funding and long/short ratios from the sync worker |
| Static FX snapshot | Scheduled FX job writing `fx_rates` |
