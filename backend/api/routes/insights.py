"""
GET /api/analytics/declines

Fetches sales, detects profit decline signals, then calls the AI insight
layer for each flagged product in parallel (asyncio.gather).

AI failures per product are handled gracefully — a fallback insight is
returned for that product instead of crashing the whole request.
"""

import asyncio
import logging
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from models.schemas import (
    DeclinesResponse,
    DeclineWithInsight,
    DeclineSignalSchema,
    InsightResultSchema,
)
from services.analytics import compute_weekly_summary, detect_declines
from ai.insights import generate_decline_insight
from api.deps import get_business_id

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/declines", response_model=DeclinesResponse)
async def get_analytics_declines(
    business_id: str = Depends(get_business_id),
):
    """
    Detect profit declines and return AI explanations per flagged product.

    - Uses asyncio.gather to call the AI for all signals concurrently.
    - Each AI call degrades gracefully — a fallback insight is returned on failure.
    - Empty dataset returns has_data=False (never crashes).
    """
    # ── Fetch sales from Supabase ─────────────────────────────────────────────
    try:
        from db.supabase_client import supabase

        result = (
            supabase.table("sales")
            .select(
                "sale_date, quantity, unit_price, unit_cost, "
                "products(name, sku)"
            )
            .eq("business_id", business_id)
            .order("sale_date")
            .execute()
        )
        rows = result.data or []
    except Exception as exc:
        logger.error("DB fetch error in declines: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")

    # ── Empty dataset ─────────────────────────────────────────────────────────
    if not rows:
        return DeclinesResponse(declines=[], total_flagged=0, has_data=False)

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

    # ── Analytics pipeline ────────────────────────────────────────────────────
    summaries = compute_weekly_summary(df)
    signals   = detect_declines(summaries)

    if not signals:
        return DeclinesResponse(declines=[], total_flagged=0, has_data=True)

    # ── Generate AI insights concurrently ─────────────────────────────────────
    insights = await asyncio.gather(
        *[generate_decline_insight(s) for s in signals],
        return_exceptions=False,   # Each call already never raises
    )

    # ── Serialise ─────────────────────────────────────────────────────────────
    results = []
    for signal, insight in zip(signals, insights):
        results.append(
            DeclineWithInsight(
                signal=DeclineSignalSchema(
                    product_name=signal.product_name,
                    sku=signal.sku,
                    last_week_profit=signal.last_week_profit,
                    baseline_profit=signal.baseline_profit,
                    profit_change_pct=signal.profit_change_pct,
                    last_week_revenue=signal.last_week_revenue,
                    baseline_revenue=signal.baseline_revenue,
                    revenue_change_pct=signal.revenue_change_pct,
                    last_week_units=signal.last_week_units,
                    baseline_units=signal.baseline_units,
                    last_week_label=signal.last_week_label,
                    last_week_unit_price_avg=signal.last_week_unit_price_avg,
                    baseline_unit_price_avg=signal.baseline_unit_price_avg,
                    possible_cause_hint=signal.possible_cause_hint,
                ),
                insight=InsightResultSchema(
                    product_name=insight.product_name,
                    sku=insight.sku,
                    what_changed=insight.what_changed,
                    likely_causes=insight.likely_causes,
                    next_actions=insight.next_actions,
                    is_fallback=insight.is_fallback,
                ),
            )
        )

    return DeclinesResponse(
        declines=results,
        total_flagged=len(results),
        has_data=True,
    )
