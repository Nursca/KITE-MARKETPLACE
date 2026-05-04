-- ─────────────────────────────────────────────────────────────────────────────
-- Kite Marketplace — Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database.
-- Dashboard → SQL Editor → New Query → paste & run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── reset (optional) ──────────────────────────────────────────────────────────
-- Uncomment the following lines if you want to completely drop and recreate the tables:
-- DROP TABLE IF EXISTS public.sales;
-- DROP TABLE IF EXISTS public.listings;

-- ── listings table ────────────────────────────────────────────────────────────
create table if not exists listings (
  id              text primary key,
  type            text not null check (type in ('api','file','article','dataset','code','shopify')),
  name            text not null,
  description     text not null default '',
  price_usdc      numeric(18,6) not null default 0,
  content         text not null default '',   -- secret, never returned to public
  preview         text not null default '',
  creator_address text not null default '0x0000000000000000000000000000000000000000',
  created_at      timestamptz not null default now(),
  sales_count     integer not null default 0,
  total_earned_usdc numeric(18,6) not null default 0
);

-- ── sales table ───────────────────────────────────────────────────────────────
create table if not exists sales (
  id              bigserial primary key,
  listing_id      text not null references listings(id) on delete cascade,
  buyer_address   text not null,
  tx_hash         text not null,
  timestamp       timestamptz not null default now()
);

-- ── indexes ───────────────────────────────────────────────────────────────────
create index if not exists listings_creator_idx  on listings (creator_address);
create index if not exists listings_type_idx     on listings (type);
create index if not exists listings_created_idx  on listings (created_at desc);
create index if not exists sales_listing_idx     on sales (listing_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Listings are public to read; only the service role can write.
alter table listings enable row level security;
alter table sales    enable row level security;

-- Anyone can read listings (public marketplace)
create policy "Public listings read"
  on listings for select
  using (true);

-- Only the service role key (used server-side) can insert/update/delete
create policy "Service role write listings"
  on listings for all
  using (auth.role() = 'service_role');

create policy "Service role write sales"
  on sales for all
  using (auth.role() = 'service_role');

-- ── Seed demo listings (safe to run multiple times) ───────────────────────────
insert into listings (id, type, name, description, price_usdc, content, preview, creator_address)
values
  (
    'lst_demo_1', 'api',
    'Kite Network Stats API',
    'Real-time gas prices and block times for Kite Testnet.',
    0.50,
    'ENDPOINT=https://stats.gokite.ai/v1/snapshot?key=KITE_HACKATHON_2026_SECRET',
    'Returns gasPrice, blockTime, activeAgents, and tps.',
    '0xb23c769dFc7ef020ec60A19567aB675C46a49910'
  ),
  (
    'lst_demo_2', 'dataset',
    'Agentic Commerce Trends 2026',
    'CSV dataset of 10,000 autonomous transactions on Kite.',
    1.00,
    'https://storage.gokite.ai/datasets/agent-trends-apr-2026.csv?sig=abc123xyz',
    '10,000 rows. Columns: timestamp, buyer_type, amount_usdc, category.',
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
  ),
  (
    'lst_demo_3', 'article',
    'How to Build Autonomous Sellers',
    'A deep dive into the agentic flywheel and x402 mechanics.',
    0.25,
    'The secret to agentic commerce is the Autonomous Seller pattern where agents generate value and list it directly on-chain...',
    'Master the x402 protocol and create self-sustaining agent economies.',
    '0xb23c769dFc7ef020ec60A19567aB675C46a49910'
  )
on conflict (id) do nothing;
