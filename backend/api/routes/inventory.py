"""
Inventory Routes — GET /api/inventory | GET /api/inventory/alerts

Returns inventory overview derived from sales analytics data.
Shows total units sold per product as a proxy for inventory movement.
Alerts flag products with declining sales velocity (potential stockout risk).
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.deps import get_business_id

logger = logging.getLogger(__name__)
router = APIRouter()


class InventoryItem(BaseModel):
    product_name: str
    sku: str
    total_units_sold: int
    avg_weekly_velocity: float   # Average units per week (complete weeks)
    avg_unit_cost: float
    total_cost: float
    weeks_tracked: int
    last_week_units: int
    velocity_trend: str          # "increasing" | "decreasing" | "stable"


class InventoryResponse(BaseModel):
    inventory: list[InventoryItem]
    has_data: bool
    total_skus: int
    total_units_sold: int


class InventoryAlert(BaseModel):
    product_name: str
    sku: str
    alert_type: str        # "low_velocity" | "stopped" | "declining"
    severity: str          # "high" | "medium" | "low"
    message: str
    last_week_units: int
    avg_weekly_velocity: float


class InventoryAlertsResponse(BaseModel):
    alerts: list[InventoryAlert]
    total_alerts: int
    has_data: bool


@router.get("/", response_model=InventoryResponse)
async def list_inventory(
    business_id: str = Depends(get_business_id),
):
    """Return inventory overview — units sold, velocity, and cost per product."""
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
        return InventoryResponse(
            inventory=[], has_data=False, total_skus=0, total_units_sold=0
        )

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

    # Use all weeks (including current) for inventory view
    by_sku: dict[str, dict] = {}
    for s in summaries:
        key = s.sku
        if key not in by_sku:
            by_sku[key] = {
                "product_name": s.product_name, "sku": s.sku,
                "total_units": 0, "total_cost": 0.0, "weeks": [],
                "complete_units": [],
            }
        by_sku[key]["total_units"] += s.units_sold
        by_sku[key]["total_cost"]  += s.total_cost
        by_sku[key]["weeks"].append((s.iso_year, s.iso_week, s.units_sold, s.is_complete_week))

    items = []
    for data in sorted(by_sku.values(), key=lambda d: d["total_units"], reverse=True):
        weeks_sorted = sorted(data["weeks"], key=lambda w: (w[0], w[1]))
        complete_units = [w[2] for w in weeks_sorted if w[3]]
        last_week_units = weeks_sorted[-1][2] if weeks_sorted else 0
        weeks_tracked = len(weeks_sorted)

        avg_velocity = float(np.mean(complete_units)) if complete_units else 0.0
        avg_unit_cost = (data["total_cost"] / data["total_units"]) if data["total_units"] > 0 else 0.0

        # Velocity trend via simple slope
        if len(complete_units) >= 2:
            x = np.arange(len(complete_units), dtype=float)
            slope, _ = np.polyfit(x, complete_units, 1)
            velocity_trend = "increasing" if slope > 0.5 else ("decreasing" if slope < -0.5 else "stable")
        else:
            velocity_trend = "stable"

        items.append(InventoryItem(
            product_name=data["product_name"],
            sku=data["sku"],
            total_units_sold=data["total_units"],
            avg_weekly_velocity=round(avg_velocity, 1),
            avg_unit_cost=round(avg_unit_cost, 2),
            total_cost=round(data["total_cost"], 2),
            weeks_tracked=weeks_tracked,
            last_week_units=last_week_units,
            velocity_trend=velocity_trend,
        ))

    total_units = sum(item.total_units_sold for item in items)

    return InventoryResponse(
        inventory=items,
        has_data=True,
        total_skus=len(items),
        total_units_sold=total_units,
    )


@router.get("/alerts", response_model=InventoryAlertsResponse)
async def inventory_alerts(
    business_id: str = Depends(get_business_id),
):
    """Return inventory alerts — products with low/stopped/declining sales velocity."""
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
        return InventoryAlertsResponse(alerts=[], total_alerts=0, has_data=False)

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
        return InventoryAlertsResponse(alerts=[], total_alerts=0, has_data=True)

    # Latest global week
    global_last_year = max(s.iso_year for s in complete)
    global_last_week = max(s.iso_week for s in complete if s.iso_year == global_last_year)

    by_sku: dict[str, list] = {}
    for s in complete:
        by_sku.setdefault(s.sku, []).append(s)

    alerts = []
    for sku, weeks in by_sku.items():
        weeks_sorted = sorted(weeks, key=lambda w: (w.iso_year, w.iso_week))
        complete_units = [w.units_sold for w in weeks_sorted]
        avg_velocity = float(np.mean(complete_units)) if complete_units else 0.0

        # Check if product has stopped selling in the last global week
        product_years_weeks = {(w.iso_year, w.iso_week) for w in weeks_sorted}
        sold_last_week = (global_last_year, global_last_week) in product_years_weeks
        last_week_entry = next(
            (w for w in weeks_sorted
             if w.iso_year == global_last_year and w.iso_week == global_last_week),
            None
        )
        last_week_units = last_week_entry.units_sold if last_week_entry else 0

        alert = None

        if not sold_last_week or last_week_units == 0:
            # Product stopped selling
            alert = InventoryAlert(
                product_name=weeks_sorted[0].product_name,
                sku=sku,
                alert_type="stopped",
                severity="high",
                message=f"No sales recorded in the latest week. Possible stockout or discontinued product.",
                last_week_units=0,
                avg_weekly_velocity=round(avg_velocity, 1),
            )
        elif avg_velocity > 0 and last_week_units < avg_velocity * 0.4:
            # Velocity dropped by more than 60%
            alert = InventoryAlert(
                product_name=weeks_sorted[0].product_name,
                sku=sku,
                alert_type="low_velocity",
                severity="medium",
                message=f"Sales velocity dropped to {last_week_units} units (avg: {avg_velocity:.1f}/wk). Check stock levels.",
                last_week_units=last_week_units,
                avg_weekly_velocity=round(avg_velocity, 1),
            )
        elif len(complete_units) >= 3:
            # Check declining trend
            x = np.arange(len(complete_units), dtype=float)
            slope, _ = np.polyfit(x, complete_units, 1)
            if slope < -avg_velocity * 0.15:
                alert = InventoryAlert(
                    product_name=weeks_sorted[0].product_name,
                    sku=sku,
                    alert_type="declining",
                    severity="low",
                    message=f"Consistently declining sales trend. Consider restocking soon.",
                    last_week_units=last_week_units,
                    avg_weekly_velocity=round(avg_velocity, 1),
                )

        if alert:
            alerts.append(alert)

    # Sort by severity: high > medium > low
    severity_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda a: severity_order.get(a.severity, 3))

    return InventoryAlertsResponse(
        alerts=alerts,
        total_alerts=len(alerts),
        has_data=True,
    )
