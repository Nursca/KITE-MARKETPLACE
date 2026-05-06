-- Kite Marketplace — Supabase schema
-- Idempotent: safe to run multiple times. Tables, indexes, and the
-- record_sale RPC are created only if they do not already exist.
--
-- Apply with EITHER:
--   1) Supabase Dashboard → SQL Editor → paste this file → Run
--   2) `node scripts/apply-supabase-schema.mjs` (uses SUPABASE_URL +
--      SUPABASE_SERVICE_ROLE_KEY from your env)

-- ─────────────────────────────────────────────────────────────────────────────
-- listings: paywalled digital resources sold via the x402 protocol
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.listings (
  id                  text primary key,
  type                text not null,
  name                text not null,
  description         text,
  price_usdc          numeric(12,6) not null check (price_usdc >= 0),
  content             text,
  preview             text,
  creator_address     text not null,
  created_at          timestamptz not null default now(),
  sales_count         integer not null default 0,
  total_earned_usdc   numeric(14,6) not null default 0
);

create index if not exists listings_creator_idx on public.listings (creator_address);
create index if not exists listings_type_idx    on public.listings (type);
create index if not exists listings_created_idx on public.listings (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- sales: ledger of completed x402 purchases
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.sales (
  id                bigserial primary key,
  listing_id        text not null references public.listings(id) on delete cascade,
  buyer_address     text not null,
  tx_hash           text not null,
  timestamp         timestamptz not null default now()
);

create index if not exists sales_listing_idx   on public.sales (listing_id);
create index if not exists sales_timestamp_idx on public.sales (timestamp desc);
create unique index if not exists sales_tx_hash_uniq on public.sales (tx_hash);

-- ─────────────────────────────────────────────────────────────────────────────
-- record_sale RPC: atomic insert + listing counter update.
-- Prevents the race condition where two parallel buyers both read the
-- old sales_count and overwrite each other's increment.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.record_sale(
  p_listing_id    text,
  p_buyer_address text,
  p_tx_hash       text
) returns void
language plpgsql
security definer
as $$
declare
  v_price numeric;
begin
  select price_usdc into v_price from public.listings where id = p_listing_id;
  if v_price is null then
    raise exception 'Listing % not found', p_listing_id;
  end if;

  insert into public.sales (listing_id, buyer_address, tx_hash)
  values (p_listing_id, p_buyer_address, p_tx_hash)
  on conflict (tx_hash) do nothing;

  update public.listings
  set sales_count       = sales_count + 1,
      total_earned_usdc = total_earned_usdc + v_price
  where id = p_listing_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-level security: listings are publicly readable, sales are publicly
-- readable for the live transaction feed, writes only via service_role.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.listings enable row level security;
alter table public.sales    enable row level security;

drop policy if exists "listings public read" on public.listings;
create policy "listings public read"
  on public.listings for select
  using (true);

drop policy if exists "sales public read" on public.sales;
create policy "sales public read"
  on public.sales for select
  using (true);
-- (Inserts and updates require the service_role key, which bypasses RLS.)
