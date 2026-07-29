-- ============================================================
-- Migration: Phase 1 - Add Optional Business Context Columns
-- ============================================================
--
-- This migration adds 7 optional columns to the sales table
-- to support extended business data from Phase 1.
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- 1. Open your Supabase project → SQL Editor
-- 2. Create a new query
-- 3. Paste the code below
-- 4. Click "Run"
-- 5. Verify success: Check the sales table schema
--
-- ============================================================

-- Add optional columns to sales table if they don't exist
-- Each column is nullable (optional) for backward compatibility

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS discount numeric(12, 4);

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS supplier_cost numeric(12, 4);

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS returns integer;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS customer_rating numeric(3, 2);

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS region text;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS inventory_level integer;

-- Add constraints if they don't exist
-- (PostgreSQL doesn't support ALTER TABLE ADD CONSTRAINT IF NOT EXISTS,
--  so we use a conditional approach)

-- Note: These constraints are defined in the schema.sql
-- If you get errors, they likely already exist (safe to ignore)

-- Verify the migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sales'
ORDER BY ordinal_position;

-- Expected output should include:
-- category, discount, supplier_cost, returns, customer_rating, region, inventory_level
-- All with is_nullable = YES
