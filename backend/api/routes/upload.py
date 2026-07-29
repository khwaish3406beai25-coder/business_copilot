"""
POST /api/sales/upload

Accepts a multipart CSV file, validates it, upserts products, and inserts
sales rows into Supabase. Uses the service role key (bypasses RLS).

The business_id is taken from the JWT bearer token (user's Supabase uid).
For development without auth, it falls back to a fixed demo UUID.
"""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from models.schemas import CSVUploadResponse
from services.analytics import df_from_csv_bytes
from api.deps import get_business_id

logger = logging.getLogger(__name__)
router = APIRouter()

DEMO_BUSINESS_ID = "00000000-0000-0000-0000-000000000001"


@router.post("/upload", response_model=CSVUploadResponse)
async def upload_sales_csv(
    file: UploadFile = File(...),
    business_id: str = Depends(get_business_id),
):
    """
    Upload a CSV file of sales data.

    Required CSV columns: product_name, sku, sale_date, quantity, unit_price, unit_cost

    Returns the number of rows inserted and any validation errors.
    """
    # ── Read file ─────────────────────────────────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # ── Parse & validate ──────────────────────────────────────────────────────
    df, errors = df_from_csv_bytes(content)
    if errors:
        return CSVUploadResponse(
            success=False,
            rows_inserted=0,
            products_upserted=0,
            errors=errors,
            message="Validation failed. No data was inserted.",
        )

    # ── Upsert products ───────────────────────────────────────────────────────
    try:
        from db.supabase_client import supabase

        unique_products = (
            df[["product_name", "sku"]]
            .drop_duplicates(subset=["sku"])
            .to_dict(orient="records")
        )

        product_records = [
            {
                "business_id": business_id,
                "name": row["product_name"],
                "sku": row["sku"],
                "unit_cost": float(df[df["sku"] == row["sku"]]["unit_cost"].mean()),
            }
            for row in unique_products
        ]

        upsert_result = (
            supabase.table("products")
            .upsert(product_records, on_conflict="business_id,sku")
            .execute()
        )

        # Build sku → product_id map
        products_in_db = (
            supabase.table("products")
            .select("id, sku")
            .eq("business_id", business_id)
            .execute()
        )
        sku_to_id = {p["sku"]: p["id"] for p in products_in_db.data}

        # ── Insert sales rows ─────────────────────────────────────────────────
        sales_records = []
        skipped = 0
        for _, row in df.iterrows():
            product_id = sku_to_id.get(row["sku"])
            if not product_id:
                skipped += 1
                continue
            sales_records.append({
                "business_id": business_id,
                "product_id": product_id,
                "sale_date": str(row["sale_date"]),
                "quantity": int(row["quantity"]),
                "unit_price": float(row["unit_price"]),
                "unit_cost": float(row["unit_cost"]),
            })

        if sales_records:
            # Insert in batches of 500 to avoid request size limits
            batch_size = 500
            for i in range(0, len(sales_records), batch_size):
                batch = sales_records[i : i + batch_size]
                supabase.table("sales").insert(batch).execute()

        return CSVUploadResponse(
            success=True,
            rows_inserted=len(sales_records),
            products_upserted=len(product_records),
            errors=[],
            message=(
                f"Successfully inserted {len(sales_records)} sales rows "
                f"across {len(product_records)} product(s)."
            ),
        )

    except Exception as exc:
        logger.error("Upload error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Database error during upload: {str(exc)}",
        )
