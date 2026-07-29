"""
Products Routes — GET /api/products | GET /api/products/{sku}/performance

Returns aggregated product performance data computed from the sales analytics.
No separate products DB query needed — all derived from the weekly summaries.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import get_business_id

logger = logging.getLogger(__name__)
router = APIRouter()


class ProductEntry(BaseModel):
    product_name: str
    sku: str
    total_revenue: float
    total_profit: float
    total_cost: float
    units_sold: int
    margin_pct: float
    weeks_tracked: int
    trend: str           # "up" | "down" | "stable"


class ProductsListResponse(BaseModel):
    products: list[ProductEntry]
    has_data: bool
    total_revenue: float
    total_profit: float


class WeeklyPoint(BaseModel):
    week_label: str
    week_start: str
    revenue: float
    profit: float
    units: int


class ProductPerformanceResponse(BaseModel):
    product_name: str
    sku: str
    total_revenue: float
    total_profit: float
    margin_pct: float
    units_sold: int
    weekly_trend: list[WeeklyPoint]
    has_data: bool


@router.get("/", response_model=ProductsListResponse)
async def list_products(
    business_id: str = Depends(get_business_id),
):
    """List all products with aggregated revenue, profit, units, and trend."""
    try:
        import pandas as pd
        import numpy as np
        from db.supabase_client import supabase
        from services.analytics import compute_weekly_summary

        result = (
            supabase.table("sales")
            .select("sale_date, quantity, unit_price, unit_cost, products(name, sku)")
            .eq("business_id", business_id)
            .order("sale_date")
            .execute()
        )
        rows = result.data or []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")

    if not rows:
        return ProductsListResponse(products=[], has_data=False, total_revenue=0.0, total_profit=0.0)

    import pandas as pd
    import numpy as np

    records = []
    for row in rows:
        product = row.get("products") or {}
        records.append({
            "product_name": product.get("name", "Unknown"),
            "sku":          product.get("sku", "UNKNOWN"),
            "sale_date":    row["sale_date"],
            "quantity":     row["quantity"],
            "unit_price":   float(row["unit_price"]),
            "unit_cost":    float(row["unit_cost"]),
        })

    df = pd.DataFrame(records)
    summaries = compute_weekly_summary(df)
    complete = [s for s in summaries if s.is_complete_week]
    if not complete:
        complete = summaries

    # Aggregate per SKU
    by_sku: dict[str, dict] = {}
    for s in complete:
        key = s.sku
        if key not in by_sku:
            by_sku[key] = {
                "product_name": s.product_name, "sku": s.sku,
                "total_revenue": 0.0, "total_profit": 0.0, "total_cost": 0.0,
                "units_sold": 0, "weeks": [],
            }
        by_sku[key]["total_revenue"] += s.total_revenue
        by_sku[key]["total_profit"]  += s.total_profit
        by_sku[key]["total_cost"]    += s.total_cost
        by_sku[key]["units_sold"]    += s.units_sold
        by_sku[key]["weeks"].append(s.total_profit)

    products = []
    for data in sorted(by_sku.values(), key=lambda d: d["total_profit"], reverse=True):
        revenue = data["total_revenue"]
        profit  = data["total_profit"]
        margin  = (profit / revenue * 100) if revenue > 0 else 0.0

        # Trend via linear regression on weekly profits
        weeks_profits = data["weeks"]
        if len(weeks_profits) >= 2:
            x = np.arange(len(weeks_profits), dtype=float)
            slope, _ = np.polyfit(x, weeks_profits, 1)
            trend = "up" if slope > 1.0 else ("down" if slope < -1.0 else "stable")
        else:
            trend = "stable"

        products.append(ProductEntry(
            product_name=data["product_name"],
            sku=data["sku"],
            total_revenue=round(revenue, 2),
            total_profit=round(profit, 2),
            total_cost=round(data["total_cost"], 2),
            units_sold=data["units_sold"],
            margin_pct=round(margin, 2),
            weeks_tracked=len(weeks_profits),
            trend=trend,
        ))

    total_rev    = sum(p.total_revenue for p in products)
    total_profit = sum(p.total_profit  for p in products)

    return ProductsListResponse(
        products=products,
        has_data=True,
        total_revenue=round(total_rev, 2),
        total_profit=round(total_profit, 2),
    )


@router.get("/{sku}/performance", response_model=ProductPerformanceResponse)
async def product_performance(
    sku: str,
    business_id: str = Depends(get_business_id),
):
    """Return detailed weekly performance trend for a single product SKU."""
    try:
        import pandas as pd
        from db.supabase_client import supabase
        from services.analytics import compute_weekly_summary

        result = (
            supabase.table("sales")
            .select("sale_date, quantity, unit_price, unit_cost, products(name, sku)")
            .eq("business_id", business_id)
            .order("sale_date")
            .execute()
        )
        rows = result.data or []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")

    if not rows:
        raise HTTPException(status_code=404, detail="No data found.")

    import pandas as pd

    records = []
    for row in rows:
        product = row.get("products") or {}
        records.append({
            "product_name": product.get("name", "Unknown"),
            "sku":          product.get("sku", "UNKNOWN"),
            "sale_date":    row["sale_date"],
            "quantity":     row["quantity"],
            "unit_price":   float(row["unit_price"]),
            "unit_cost":    float(row["unit_cost"]),
        })

    df = pd.DataFrame(records)
    summaries = compute_weekly_summary(df)
    product_weeks = [s for s in summaries if s.sku == sku]

    if not product_weeks:
        raise HTTPException(status_code=404, detail=f"Product '{sku}' not found.")

    product_weeks.sort(key=lambda w: (w.iso_year, w.iso_week))
    product_name = product_weeks[0].product_name

    complete = [w for w in product_weeks if w.is_complete_week]
    total_rev    = sum(w.total_revenue for w in complete)
    total_profit = sum(w.total_profit  for w in complete)
    units_sold   = sum(w.units_sold    for w in complete)
    margin_pct   = (total_profit / total_rev * 100) if total_rev > 0 else 0.0

    weekly_trend = [
        WeeklyPoint(
            week_label=f"{w.iso_year}-W{w.iso_week:02d}",
            week_start=w.week_start,
            revenue=round(w.total_revenue, 2),
            profit=round(w.total_profit, 2),
            units=w.units_sold,
        )
        for w in product_weeks
    ]

    return ProductPerformanceResponse(
        product_name=product_name,
        sku=sku,
        total_revenue=round(total_rev, 2),
        total_profit=round(total_profit, 2),
        margin_pct=round(margin_pct, 2),
        units_sold=units_sold,
        weekly_trend=weekly_trend,
        has_data=True,
    )
