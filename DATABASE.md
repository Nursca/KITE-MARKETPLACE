# Database Schema (Supabase / PostgreSQL)

Run the following SQL in your Supabase SQL Editor to set up the tables for the Kite Marketplace.

## 1. Listings Table
Stores digital assets (APIs, datasets, articles, etc.)

```sql
create table public.listings (
  id text primary key,
  type text not null, -- 'api', 'file', 'article', 'dataset', 'code', 'shopify'
  name text not null,
  description text,
  price_usdc numeric not null default 0,
  content text not null, -- The secret content hidden by x402
  preview text, -- Public teaser
  creator_address text not null,
  sales_count integer not null default 0,
  total_earned_usdc numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.listings enable row level security;

-- Policies (Public Read)
create policy "Listings are viewable by everyone" 
  on public.listings for select 
  using (true);

-- Policies (Service Role / Auth Write)
create policy "Allow all for service role" 
  on public.listings for all 
  using (true) 
  with check (true);
```

## 2. Sales Table
Records transactions.

```sql
create table public.sales (
  id uuid default gen_random_uuid() primary key,
  listing_id text references public.listings(id),
  buyer_address text not null,
  tx_hash text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.sales enable row level security;

-- Policies (Public Read)
create policy "Sales are viewable by everyone" 
  on public.sales for select 
  using (true);

-- Policies (Service Role / Auth Write)
create policy "Allow all for service role" 
  on public.sales for all 
  using (true) 
  with check (true);
```

## Environment Variables
Add these to your `.env` file:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
