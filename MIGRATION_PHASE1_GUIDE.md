# Migration Guide: Phase 1 - Optional Business Columns

## Overview

This guide walks you through adding optional columns to support extended business data in the new CSV format.

**Current Status:**
- ✅ Backend code updated (Phase 1 complete)
- ✅ CSV parser updated (handles column mapping)
- ⏳ **Supabase database needs migration** (THIS STEP)

---

## Step 1: Run the Migration in Supabase

### Option A: Using the Migration SQL File (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project: "AI Business Co-Pilot"

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration**
   - Open: `E:\AI Business Co-Pilot\database\migration_phase1_add_optional_columns.sql`
   - Copy the entire SQL code
   - Paste into Supabase SQL Editor

4. **Run the Migration**
   - Click the blue "Run" button (or Ctrl+Enter)
   - Wait for completion (should be instant)

5. **Verify Success**
   - You should see output showing the columns in the sales table
   - All optional columns should have `is_nullable = YES`

### Option B: Manual SQL Commands

If you prefer to run commands individually, execute these in Supabase SQL Editor:

```sql
-- Add optional columns to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount numeric(12, 4);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS supplier_cost numeric(12, 4);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS returns integer;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_rating numeric(3, 2);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS inventory_level integer;
```

---

## Step 2: Verify the Migration

Run this query in Supabase SQL Editor to confirm all columns exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sales'
ORDER BY ordinal_position;
```

**Expected Columns** (in order):
1. id (uuid)
2. business_id (uuid)
3. product_id (uuid)
4. sale_date (date)
5. quantity (integer)
6. unit_price (numeric)
7. unit_cost (numeric)
8. revenue (numeric - **generated**)
9. cost (numeric - **generated**)
10. profit (numeric - **generated**)
11. **category (text)** ← NEW
12. **discount (numeric)** ← NEW
13. **supplier_cost (numeric)** ← NEW
14. **returns (integer)** ← NEW
15. **customer_rating (numeric)** ← NEW
16. **region (text)** ← NEW
17. **inventory_level (integer)** ← NEW
18. created_at (timestamptz)

All new columns should have `is_nullable = YES`.

---

## Step 3: Understand the Database Schema Changes

### Required Columns (Unchanged)
These columns were already in the database:
```sql
- id: Unique identifier (auto-generated UUID)
- business_id: Which business this sale belongs to
- product_id: Which product was sold
- sale_date: Date of the sale
- quantity: How many units sold
- unit_price: Sale price per unit
- unit_cost: Cost per unit
- revenue: Auto-calculated (quantity × unit_price)
- cost: Auto-calculated (quantity × unit_cost)
- profit: Auto-calculated (revenue - cost)
- created_at: Timestamp when record was created
```

### New Optional Columns (Added in Phase 1)
These columns are NEW and OPTIONAL:

```sql
category       TEXT          -- Product category (e.g., "Electronics", "Apparel")
discount       NUMERIC(12,4) -- Discount amount applied (e.g., 2.50 for $2.50 off)
supplier_cost  NUMERIC(12,4) -- Cost from supplier (may differ from unit_cost)
returns        INTEGER       -- Number of units returned by customer
customer_rating NUMERIC(3,2) -- Customer satisfaction (1.0-5.0 scale)
region         TEXT          -- Geographic region (e.g., "North America", "Europe")
inventory_level INTEGER      -- Stock on hand after this sale
```

**Why NULL is OK:**
- All new columns are nullable (`is_nullable = YES`)
- Old CSVs (6 columns) continue to work - missing fields are stored as NULL
- New CSVs can include these columns for richer analysis
- The backend gracefully handles missing data

---

## Step 4: CSV Column Mapping

The backend now supports **column name aliases** for flexibility:

### Supported Column Names

| Standard Name | Aliases | Example |
|---|---|---|
| product_name | (none) | "Blue Widget" |
| sku | (none) | "BW-001" |
| sale_date | (none) | "2024-01-15" |
| quantity | (none) | "10" |
| unit_price | selling_price, sale_price, price | "29.99" |
| unit_cost | cost_price, cost | "14.50" |
| category | (new) | "Electronics" |
| discount | (new) | "2.50" |
| supplier_cost | (new) | "12.00" |
| returns | (new) | "1" |
| customer_rating | (new) | "4.5" |
| region | (new) | "North America" |
| inventory_level | (new) | "85" |

### Examples

**Example 1: Using Aliases**
```csv
product_name,sku,sale_date,quantity,selling_price,cost_price,category,customer_rating
Blue Widget,BW-001,2024-01-15,10,29.99,14.50,Electronics,4.5
```
→ `selling_price` automatically mapped to `unit_price`
→ `cost_price` automatically mapped to `unit_cost`

**Example 2: Standard Names**
```csv
product_name,sku,sale_date,quantity,unit_price,unit_cost,category,customer_rating
Blue Widget,BW-001,2024-01-15,10,29.99,14.50,Electronics,4.5
```
→ Works exactly as is

**Example 3: Mixed Optional Columns**
```csv
product_name,sku,sale_date,quantity,unit_price,unit_cost,category,discount,region
Blue Widget,BW-001,2024-01-15,10,29.99,14.50,Electronics,2.50,North America
```
→ Include only the optional columns you need

**Example 4: Old Format (Still Works)**
```csv
product_name,sku,sale_date,quantity,unit_price,unit_cost
Blue Widget,BW-001,2024-01-15,10,29.99,14.50
```
→ Works perfectly, optional fields stored as NULL

---

## Step 5: Test the Upload

### Test Case 1: Old Format (Backward Compatibility)
Create `test_old.csv`:
```csv
product_name,sku,sale_date,quantity,unit_price,unit_cost
Blue Widget,BW-001,2024-01-15,10,29.99,14.50
Red Widget,RW-002,2024-01-15,15,19.99,9.75
```

Expected: ✅ Upload succeeds (backward compatible)

### Test Case 2: New Format with Optional Columns
Create `test_new.csv`:
```csv
product_name,sku,sale_date,quantity,unit_price,unit_cost,category,discount,supplier_cost,customer_rating,region
Blue Widget,BW-001,2024-01-15,10,29.99,14.50,Electronics,2.50,12.00,4.5,North America
Red Widget,RW-002,2024-01-15,15,19.99,9.75,Accessories,1.00,8.50,4.3,Europe
```

Expected: ✅ Upload succeeds (optional columns stored)

### Test Case 3: Aliases
Create `test_aliases.csv`:
```csv
product_name,sku,sale_date,quantity,selling_price,cost_price,category,customer_rating
Blue Widget,BW-001,2024-01-15,10,29.99,14.50,Electronics,4.5
Red Widget,RW-002,2024-01-15,15,19.99,9.75,Accessories,4.3
```

Expected: ✅ Upload succeeds (aliases auto-mapped)

### Test Case 4: Partial Optional Columns
Create `test_partial.csv`:
```csv
product_name,sku,sale_date,quantity,unit_price,unit_cost,category,region
Blue Widget,BW-001,2024-01-15,10,29.99,14.50,Electronics,North America
Red Widget,RW-002,2024-01-15,15,19.99,9.75,Accessories,Europe
```

Expected: ✅ Upload succeeds (only included columns stored)

---

## Step 6: Troubleshooting

### Error: "Could not find the 'category' column"

**Cause:** Migration hasn't been run yet

**Solution:**
1. Go to Supabase SQL Editor
2. Run the migration script
3. Verify with the verification query
4. Retry the upload

### Error: "Missing required columns: ..."

**Cause:** CSV doesn't have all 6 required columns

**Solution:**
Make sure your CSV has these columns (exact names):
- product_name
- sku
- sale_date
- quantity
- unit_price (or alias: selling_price, sale_price, price)
- unit_cost (or alias: cost_price, cost)

### Error: "Column 'X' must be numeric"

**Cause:** A numeric column has non-numeric data

**Solution:**
- Check that discount, supplier_cost, customer_rating, unit_price, unit_cost contain only numbers
- For customer_rating, use 1.0-5.0 scale (e.g., 4.5, not "4.5/5")
- For returns and inventory_level, use whole numbers (e.g., 2, not 2.5)

---

## Summary of Changes

### Database Changes
| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| category | text | YES | Product classification |
| discount | numeric(12,4) | YES | Promotional discount amount |
| supplier_cost | numeric(12,4) | YES | Supplier invoice cost |
| returns | integer | YES | Units returned by customer |
| customer_rating | numeric(3,2) | YES | Customer satisfaction (1-5) |
| region | text | YES | Geographic region |
| inventory_level | integer | YES | Stock on hand |

### Code Changes
- ✅ CSV parser updated (handles aliases, optional columns)
- ✅ Upload endpoint updated (better error messages)
- ✅ Backend analytics ready for Phase 2 (trend detection)
- ✅ Backward compatibility maintained (old CSVs work)

### No Breaking Changes
- ✅ Old CSVs continue to work
- ✅ Existing data in database unchanged
- ✅ All existing APIs unchanged
- ✅ Dashboard works the same
- ✅ All existing features preserved

---

## Next Steps

Once the migration is complete and uploads work:

1. **Test with sample data** - Use the CSV examples above
2. **Upload your actual CSV** - Use the new format with optional columns
3. **Verify in database** - Check that optional data is stored
4. **Proceed to Phase 3** - AI analysis of trends and recommendations

---

## Need Help?

If you encounter issues:

1. **Check Supabase Status**
   - Ensure your Supabase project is accessible
   - Check that the SQL query executed without errors

2. **Verify CSV Format**
   - Check column names match (case-insensitive)
   - Check data types are correct
   - Use the examples above as templates

3. **Check Backend Logs**
   - Look for error messages in backend console
   - Error message should indicate what's wrong

4. **Review Migration**
   - Re-run the verification query in Supabase SQL Editor
   - Ensure all columns appear in the output

---

**You're ready! Run the migration and test the upload.** ✨
