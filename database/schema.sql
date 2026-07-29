-- ============================================================
-- BusinessPilot AI — Database Schema
-- Database: Supabase PostgreSQL
-- ============================================================
--
-- INSTRUCTIONS:
--   1. Open your Supabase project → SQL Editor
--   2. Paste this file and run it
--   3. Tables will be created in the `public` schema
--
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Products ─────────────────────────────────────────────────────────────────
-- One row per unique product per business.
-- The (business_id, sku) pair is unique so CSV upserts are idempotent.

create table if not exists public.products (
    id          uuid primary key default gen_random_uuid(),
    business_id uuid not null,          -- = auth.uid() of the owner
    name        text not null,
    sku         text not null,
    unit_cost   numeric(12, 4) not null default 0,
    created_at  timestamptz not null default now(),

    constraint products_business_sku_unique unique (business_id, sku)
);

-- ─── Sales ────────────────────────────────────────────────────────────────────
-- One row per line item sold.
-- revenue, cost, profit are generated columns so they're always consistent.
-- Extended in Phase 1 with optional business context fields.

create table if not exists public.sales (
    id          uuid primary key default gen_random_uuid(),
    business_id uuid not null,
    product_id  uuid not null references public.products(id) on delete cascade,
    sale_date   date not null,
    quantity    integer not null check (quantity >= 0),
    unit_price  numeric(12, 4) not null,
    unit_cost   numeric(12, 4) not null,

    -- Generated columns (always derived — never inserted directly)
    revenue     numeric(12, 4) generated always as (quantity * unit_price) stored,
    cost        numeric(12, 4) generated always as (quantity * unit_cost) stored,
    profit      numeric(12, 4) generated always as (quantity * (unit_price - unit_cost)) stored,

    -- Optional extended fields (Phase 1: backward compatible)
    -- These columns are optional — NULL values mean data wasn't provided in CSV
    category            text,                    -- Product category (e.g., "Electronics")
    discount            numeric(12, 4),          -- Discount amount or percentage
    supplier_cost       numeric(12, 4),          -- Supplier cost (may differ from unit_cost)
    returns             integer check (returns >= 0),  -- Units returned
    customer_rating     numeric(3, 2),           -- 1-5 star rating
    region              text,                    -- Geographic region
    inventory_level     integer check (inventory_level >= 0),  -- Stock after sale

    created_at  timestamptz not null default now()
);

create index if not exists sales_business_date_idx on public.sales (business_id, sale_date);
create index if not exists sales_product_date_idx  on public.sales (product_id, sale_date);

-- ─── Inventory Snapshots ──────────────────────────────────────────────────────
-- Point-in-time stock level per product.
-- Used to detect stockouts (quantity_on_hand drops to 0).

create table if not exists public.inventory_snapshots (
    id                uuid primary key default gen_random_uuid(),
    business_id       uuid not null,
    product_id        uuid not null references public.products(id) on delete cascade,
    snapshot_date     date not null,
    quantity_on_hand  integer not null check (quantity_on_hand >= 0),
    created_at        timestamptz not null default now(),

    constraint inventory_snapshots_product_date_unique unique (product_id, snapshot_date)
);

create index if not exists inventory_business_date_idx on public.inventory_snapshots (business_id, snapshot_date);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- All tables: RLS ON.
-- The FastAPI backend uses the SERVICE ROLE KEY which bypasses RLS automatically.
-- If you ever query directly with the anon key, these policies block all access.

alter table public.products             enable row level security;
alter table public.sales                enable row level security;
alter table public.inventory_snapshots  enable row level security;

-- Authenticated users can only see their own business data
create policy "products: owner access"
    on public.products
    for all
    using (business_id = auth.uid())
    with check (business_id = auth.uid());

create policy "sales: owner access"
    on public.sales
    for all
    using (business_id = auth.uid())
    with check (business_id = auth.uid());

create policy "inventory_snapshots: owner access"
    on public.inventory_snapshots
    for all
    using (business_id = auth.uid())
    with check (business_id = auth.uid());

-- ─── Verification Queries (run these to confirm setup) ────────────────────────
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public'
--   order by tablename;
--
-- Expected output:
--   inventory_snapshots | t
--   products            | t
--   sales               | t
