"""
Forecasting Routes — GET /api/forecast/demand

Returns a 4-week linear regression demand forecast for each product.
Uses only in-memory analytics data (no DB schema changes needed).

Falls back gracefully if the user has insufficient historical data.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import get_business_id

logger = logging.getLogger(__name__)
router = APIRouter()


class ProductForecast(BaseModel):
    product_name: str
    sku: str
    forecast_weeks: list[dict]   # [{week_label, predicted_units, predicted_revenue, confidence}]
    trend: str                   # "up" | "down" | "stable"
    avg_weekly_units: float
    avg_weekly_revenue: float
    data_weeks: int


class ForecastResponse(BaseModel):
    forecasts: list[ProductForecast]
    has_data: bool
    message: str


@router.get("/demand", response_model=ForecastResponse)
async def get_demand_forecast(
    weeks_ahead: int = 4,
    business_id: str = Depends(get_business_id),
):
    """
    Return linear regression demand forecast for the next N weeks per product.

    Requires at least 3 complete weeks of data per product to generate a forecast.
    Products with insufficient data are excluded.
    """
    # ── Fetch sales from Supabase ─────────────────────────────────────────────
    try:
        import pandas as pd
        import numpy as np
        from db.supabase_client import supabase
        from services.analytics import compute_weekly_summary

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
        logger.error("DB fetch error in forecast: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")

    if not rows:
        return ForecastResponse(
            forecasts=[],
            has_data=False,
            message="Upload sales data to generate demand forecasts.",
        )

    # ── Build DataFrame ───────────────────────────────────────────────────────
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

    # Only use complete weeks for forecasting
    complete = [s for s in summaries if s.is_complete_week]
    if not complete:
        return ForecastResponse(
            forecasts=[],
            has_data=False,
            message="No complete weeks of data yet. Add more historical data.",
        )

    # ── Linear regression forecast per product ────────────────────────────────
    from datetime import date, timedelta

    # Group by SKU
    by_sku: dict[str, list] = {}
    for s in complete:
        by_sku.setdefault(s.sku, []).append(s)

    forecasts = []
    for sku, weeks in by_sku.items():
        weeks_sorted = sorted(weeks, key=lambda w: (w.iso_year, w.iso_week))

        if len(weeks_sorted) < 3:
            continue  # Need at least 3 points for meaningful trend

        # X = week index (0, 1, 2, ...), Y = units sold / revenue
        x = np.array(range(len(weeks_sorted)), dtype=float)
        y_units   = np.array([w.units_sold   for w in weeks_sorted], dtype=float)
        y_revenue = np.array([w.total_revenue for w in weeks_sorted], dtype=float)

        # Linear regression: y = mx + b
        m_units,   b_units   = np.polyfit(x, y_units, 1)
        m_revenue, b_revenue = np.polyfit(x, y_revenue, 1)

        # Coefficient of determination R² for confidence
        y_units_pred = m_units * x + b_units
        ss_res = np.sum((y_units - y_units_pred) ** 2)
        ss_tot = np.sum((y_units - np.mean(y_units)) ** 2)
        r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0
        confidence = max(0.0, min(1.0, r2))

        # Determine trend
        if m_units > 0.5:
            trend = "up"
        elif m_units < -0.5:
            trend = "down"
        else:
            trend = "stable"

        # Generate future weeks
        last_week = weeks_sorted[-1]
        # Parse the last week_start to get the actual date
        last_week_start = date.fromisoformat(last_week.week_start)

        forecast_weeks = []
        for i in range(1, weeks_ahead + 1):
            future_x = len(weeks_sorted) - 1 + i
            pred_units   = max(0.0, float(m_units   * future_x + b_units))
            pred_revenue = max(0.0, float(m_revenue * future_x + b_revenue))

            future_start = last_week_start + timedelta(weeks=i)
            iso = future_start.isocalendar()
            week_label = f"{iso[0]}-W{iso[1]:02d}"

            forecast_weeks.append({
                "week_label":        week_label,
                "week_start":        future_start.isoformat(),
                "predicted_units":   round(pred_units, 1),
                "predicted_revenue": round(pred_revenue, 2),
                "confidence":        round(confidence, 2),
            })

        avg_units   = float(np.mean(y_units))
        avg_revenue = float(np.mean(y_revenue))

        forecasts.append(ProductForecast(
            product_name=weeks_sorted[0].product_name,
            sku=sku,
            forecast_weeks=forecast_weeks,
            trend=trend,
            avg_weekly_units=round(avg_units, 1),
            avg_weekly_revenue=round(avg_revenue, 2),
            data_weeks=len(weeks_sorted),
        ))

    # Sort by avg_weekly_revenue descending
    forecasts.sort(key=lambda f: f.avg_weekly_revenue, reverse=True)

    return ForecastResponse(
        forecasts=forecasts,
        has_data=True,
        message=f"Forecasts generated for {len(forecasts)} product(s) using linear trend analysis.",
    )
