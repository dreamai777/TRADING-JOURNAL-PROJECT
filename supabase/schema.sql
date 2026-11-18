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
