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
| Rule-based coach | Claude API behind the same `CoachProvider` interface (`src/lib/coach.ts`) |
| Static FX snapshot | Scheduled FX job writing `fx_rates` |
