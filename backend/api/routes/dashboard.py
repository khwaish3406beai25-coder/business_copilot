"""
GET /api/analytics/summary

Fetches sales data for the authenticated business from Supabase, runs the
analytics service, and returns:
  - Weekly product summaries (for the trend chart)
  - Best/worst sellers
  - Top-level KPIs: total revenue, profit, avg margin

Returns an empty-safe payload when no data exists (never crashes).
"""

import logging
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from models.schemas import (
    AnalyticsSummaryResponse,
    WeeklyProductSummarySchema,
    BestWorstSellersSchema,
    SellerEntry,
)
from services.analytics import compute_weekly_summary, get_best_worst_sellers
from api.deps import get_business_id

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    business_id: str = Depends(get_business_id),
):
    """
    Return weekly KPI summaries + best/worst sellers for the authenticated business.

    Empty dataset returns has_data=False with zero values — does NOT crash.
    """
    # ── Fetch sales from Supabase ─────────────────────────────────────────────
    try:
        from db.supabase_client import supabase

        result = (
            supabase.table("sales")
            .select(
                "sale_date, quantity, unit_price, unit_cost, revenue, cost, profit, "
                "products(name, sku)"
            )
            .eq("business_id", business_id)
            .order("sale_date")
            .execute()
        )
        rows = result.data or []
    except Exception as exc:
        logger.error("DB fetch error in summary: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")

    # ── Empty dataset — return safe zeros ─────────────────────────────────────
    if not rows:
        return AnalyticsSummaryResponse(
            weekly_summaries=[],
            best_worst=BestWorstSellersSchema(best=[], worst=[]),
            total_revenue=0.0,
            total_profit=0.0,
            avg_margin_pct=0.0,
            has_data=False,
        )

    # ── Build DataFrame ───────────────────────────────────────────────────────
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

    # ── Run analytics ─────────────────────────────────────────────────────────
    summaries     = compute_weekly_summary(df)
    best_worst    = get_best_worst_sellers(summaries)

    # ── Top-level KPIs (complete weeks only) ──────────────────────────────────
    complete = [s for s in summaries if s.is_complete_week] or summaries
    total_revenue = sum(s.total_revenue for s in complete)
    total_profit  = sum(s.total_profit  for s in complete)
    avg_margin    = (total_profit / total_revenue * 100) if total_revenue > 0 else 0.0

    # ── Serialise ─────────────────────────────────────────────────────────────
    weekly_out = [
        WeeklyProductSummarySchema(
            product_name=s.product_name,
            sku=s.sku,
            iso_year=s.iso_year,
            iso_week=s.iso_week,
            week_start=s.week_start,
            total_revenue=s.total_revenue,
            total_cost=s.total_cost,
            total_profit=s.total_profit,
            margin_pct=s.margin_pct,
            units_sold=s.units_sold,
            is_complete_week=s.is_complete_week,
        )
        for s in summaries
    ]

    best_out  = [SellerEntry(**b) for b in best_worst.best]
    worst_out = [SellerEntry(**w) for w in best_worst.worst]

    return AnalyticsSummaryResponse(
        weekly_summaries=weekly_out,
        best_worst=BestWorstSellersSchema(best=best_out, worst=worst_out),
        total_revenue=round(total_revenue, 2),
        total_profit=round(total_profit, 2),
        avg_margin_pct=round(avg_margin, 2),
        has_data=True,
    )
