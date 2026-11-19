-- EdgeForge production schema (Supabase Postgres). Mirrors src/core/types.ts.
-- Row Level Security: users only ever see their own rows; admins can see everything.

create type role as enum ('user', 'admin');
create type side as enum ('long', 'short');
create type asset_class as enum ('crypto', 'forex', 'futures', 'equities', 'options');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  role role not null default 'user',
  base_currency text not null default 'USD',
  account_size numeric not null default 10000,
  avatar text default '🦊',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  name text not null,
  icon text not null,
  weapon_class text not null,
  description text,
  timeframe text,
  markets asset_class[] not null default '{}',
  rules text[] not null default '{}',
  entry_trigger text, exit_plan text, invalidation text,
  equipped boolean not null default false,
  created_at timestamptz not null default now()
);

create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  setup_id uuid references setups on delete set null,
  symbol text not null,
  asset_class asset_class not null,
  side side not null,
  entry numeric not null, exit numeric not null, qty numeric not null,
  fees numeric not null default 0,
  stop_loss numeric, take_profit numeric,
  opened_at timestamptz not null, closed_at timestamptz not null,
  tags text[] not null default '{}',
  emotion text, mistakes text[] not null default '{}',
  rules_followed boolean, rating smallint check (rating between 1 and 5),
  notes text,
  source text not null default 'manual',
  external_id text,                       -- exchange fill/order id, for idempotent sync
  replay_saved boolean not null default false,
  screenshot_path text,                   -- Supabase Storage
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);
create index trades_user_closed on trades (user_id, closed_at desc);

-- Exchange keys are encrypted with Supabase Vault and only readable by the sync worker (service role).
create table exchange_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  exchange text not null check (exchange in ('binance', 'okx', 'bitget')),
  label text not null,
  api_key_secret_id uuid not null,        -- vault.secrets id
  last_sync_at timestamptz,
  cursor jsonb,                           -- per-market pagination cursor for incremental sync
  created_at timestamptz not null default now(),
  unique (user_id, exchange, label)
);

create table fx_rates (
  code text primary key,
  per_usd numeric not null,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table setups enable row level security;
alter table trades enable row level security;
alter table exchange_connections enable row level security;

create function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile" on profiles for update using (id = auth.uid()) with check (role = (select role from profiles where id = auth.uid()));
create policy "admin manages profiles" on profiles for update using (is_admin());

create policy "own setups" on setups for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own trades" on trades for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin reads trades" on trades for select using (is_admin());
create policy "own connections (metadata only)" on exchange_connections for select using (user_id = auth.uid());

-- ---------- AI Strategy Lab, Hero Shop, Gold and referrals ----------

create table strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  spec jsonb not null,                    -- StrategySpec (src/core/strategy.ts), sanitized server-side
  grade text,                             -- S++ … F from the robustness audit
  score int,
  from_listing uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('strategy','setup','skill','item')),
  title text not null,
  tagline text not null default '',
  description text not null default '',
  rarity text not null default 'common',
  price_gold int not null default 0 check (price_gold >= 0),
  price_usd numeric(10,2) not null default 0 check (price_usd >= 0),
  payload jsonb not null,                 -- full content; public reads select a preview, buyers get it via a security-definer RPC
  verified jsonb,                         -- computed by the server from synced trades, never client-sent
  status text not null default 'live' check (status in ('draft','live','removed')),
  sales int not null default 0,
  rating numeric(2,1) not null default 0,
  reviews int not null default 0,
  created_at timestamptz not null default now()
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id),
  method text not null check (method in ('gold','card','crypto')),
  amount_gold int not null default 0,
  amount_usd numeric(10,2) not null default 0,
  provider_ref text,                      -- Stripe payment_intent / Coinbase charge id
  status text not null default 'pending' check (status in ('pending','paid','refunded')),
  created_at timestamptz not null default now(),
  unique (buyer_id, listing_id)
);

-- Append-only Gold ledger. Balance = earned (derived) + sum(gold). Written only by server functions.
create table gold_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  gold int not null,
  reason text not null,
  ref uuid,
  created_at timestamptz not null default now()
);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid references profiles(id) on delete set null,
  friend_email text,
  code text not null,
  status text not null default 'invited' check (status in ('invited','joined','active','paid')),
  created_at timestamptz not null default now(),
  check (friend_id is null or friend_id <> referrer_id)
);
create unique index referrals_one_per_friend on referrals(friend_id) where friend_id is not null;

alter table strategies enable row level security;
alter table listings enable row level security;
alter table purchases enable row level security;
alter table gold_ledger enable row level security;
alter table referrals enable row level security;

create policy "own strategies" on strategies for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "anyone reads live listings" on listings for select using (status = 'live' or seller_id = auth.uid() or is_admin());
create policy "sellers manage own listings" on listings for insert with check (seller_id = auth.uid());
create policy "sellers edit own listings" on listings for update using (seller_id = auth.uid() or is_admin());
create policy "own purchases" on purchases for select using (buyer_id = auth.uid() or is_admin());
create policy "own gold" on gold_ledger for select using (user_id = auth.uid() or is_admin());
create policy "own referrals" on referrals for select using (referrer_id = auth.uid() or friend_id = auth.uid());
-- Purchases, gold_ledger and referral status changes are written only by service-role code
-- (payment webhooks and the gold spend RPC), so no insert/update policies exist for users.
