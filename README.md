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

Chat goes to Claude through `src/app/api/ai/route.ts`. Set these env vars on the host (Netlify or Vercel):

- `ANTHROPIC_API_KEY` (required for Claude; without it chat falls back to the offline engine)
- `ANTHROPIC_MODEL` (optional, defaults to `claude-opus-5-5`)

## Real OKX sync

Connections → OKX imports real closed trades from the last 3 months (the most OKX keeps): perpetuals
as `SOLUSDT.P`, spot as `SOLUSDT`, plus dated futures and margin on paid plans. The other exchanges
still use the simulated demo sync.

- Only **read-only** keys are accepted. The server asks OKX for the key's permissions
  (`/api/v5/account/config`) and refuses keys that can trade or withdraw.
- The key, secret and passphrase go to the server once and are encrypted with AES-256-GCM
  (`src/server/vault.ts`), stored in Netlify Blobs (no setup needed on Netlify; `.data/` locally).
  The browser only keeps a random httpOnly cookie that points at the stored key.
- Perps, futures and margin come from OKX positions history (P&L, fees and funding as OKX reports
  them). Spot fills are paired buy→sell first-in first-out (`src/core/okx.ts`). Re-syncing never
  duplicates a trade.

Env vars on the host:

- `EXCHANGE_ENCRYPTION_KEY` (required): any long random text, 32+ characters. Changing it later
  makes stored keys unreadable, so users would need to reconnect.
- `OKX_API_BASE_OVERRIDE` (local testing only, ignored in production): point at a fake OKX server.

## Architecture

```
src/core/      Pure TypeScript domain engine. No React, no browser APIs.
               stats, gamification (XP, ranks, weapon rarity, badges, quests), currency,
               CSV mapping, one-line trade parser, replay candles, backtester, coach insights.
               → Shared as-is with the future Expo (React Native) app.
src/lib/       Client data layer (zustand). Same actions the Supabase repository will expose.
src/components UI kit, charts (Recharts + TradingView Lightweight Charts), shell, quick snap.
src/app/       Next.js App Router pages. src/app/api/ = server routes (AI, exchange sync).
src/server/    Server-only code: exchange key vault, signed OKX client.
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
