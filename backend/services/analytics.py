"""
Analytics Service — Pure Computation (no AI calls)

All business logic for computing KPIs, detecting profit declines, and
ranking best/worst sellers lives here.

Key design decisions:
  - Uses ISO week numbers (Monday-Sunday) for all weekly aggregations.
  - The CURRENT (incomplete) week is ALWAYS excluded from baseline comparisons
    to avoid false-positive decline signals from partial data.
  - Decline detection compares a product's last COMPLETE week against its own
    4-week rolling baseline — not against other products.
  - Threshold: a product is flagged when profit drops > DECLINE_THRESHOLD_PCT
    below its baseline.
"""

import pandas as pd
import numpy as np
from datetime import date, timedelta
from dataclasses import dataclass, field
from typing import Optional

# ─── Configuration ────────────────────────────────────────────────────────────

DECLINE_THRESHOLD_PCT = 0.15   # Flag if profit drops more than 15% below baseline
BASELINE_WEEKS = 4             # Number of prior complete weeks used as baseline
MIN_BASELINE_WEEKS = 2         # Minimum weeks needed to even attempt comparison

# Required columns in any uploaded CSV
REQUIRED_CSV_COLUMNS = {
    "product_name", "sku", "sale_date", "quantity", "unit_price", "unit_cost"
}


# ─── Data Classes ─────────────────────────────────────────────────────────────

@dataclass
class WeeklyProductSummary:
    """Aggregated metrics for one product in one ISO week."""
    product_name: str
    sku: str
    iso_year: int
    iso_week: int
    week_start: str        # ISO date string (Monday of the week)
    total_revenue: float
    total_cost: float
    total_profit: float
    margin_pct: float      # (profit / revenue) * 100, or 0 if revenue == 0
    units_sold: int
    is_complete_week: bool # False if this week overlaps today


@dataclass
class DeclineSignal:
    """A flagged product that has suffered a significant profit decline."""
    product_name: str
    sku: str
    last_week_profit: float
    baseline_profit: float       # Average weekly profit over baseline window
    profit_change_pct: float     # Negative = decline
    last_week_revenue: float
    baseline_revenue: float
    revenue_change_pct: float
    last_week_units: int
    baseline_units: float        # Average units over baseline window
    last_week_label: str         # "2024-W03" style label
    last_week_unit_price_avg: float
    baseline_unit_price_avg: float
    possible_cause_hint: str     # "cost_increase" | "stockout" | "price_drop" | "volume_drop" | "unknown"


@dataclass
class BestWorstSellers:
    """Top and bottom performers by total profit."""
    best: list[dict]   # [{"product_name", "sku", "total_profit", "total_revenue", "units_sold"}]
    worst: list[dict]


# ─── Core Functions ───────────────────────────────────────────────────────────

def compute_weekly_summary(df: pd.DataFrame) -> list[WeeklyProductSummary]:
    """
    Given a sales DataFrame (already validated), compute weekly aggregates
    per product.

    Args:
        df: DataFrame with columns: product_name, sku, sale_date (date/str),
            quantity (int), unit_price (float), unit_cost (float)

    Returns:
        List of WeeklyProductSummary, sorted by (sku, iso_year, iso_week).
        The current incomplete week IS included here for display purposes;
        decline detection will filter it out separately.
    """
    if df.empty:
        return []

    df = df.copy()
    df["sale_date"] = pd.to_datetime(df["sale_date"]).dt.date

    # Derived columns
    df["revenue"] = df["quantity"] * df["unit_price"]
    df["cost"]    = df["quantity"] * df["unit_cost"]
    df["profit"]  = df["revenue"] - df["cost"]

    # ISO week info
    df["sale_date_dt"] = pd.to_datetime(df["sale_date"])
    df["iso_year"]     = df["sale_date_dt"].dt.isocalendar().year.astype(int)
    df["iso_week"]     = df["sale_date_dt"].dt.isocalendar().week.astype(int)
    df["week_start"]   = df["sale_date_dt"].apply(
        lambda d: (d - timedelta(days=d.weekday())).date()
    )

    today = date.today()
    current_iso = today.isocalendar()
    current_year, current_week = current_iso[0], current_iso[1]

    grouped = (
        df.groupby(["sku", "product_name", "iso_year", "iso_week", "week_start"])
        .agg(
            total_revenue=("revenue", "sum"),
            total_cost=("cost", "sum"),
            total_profit=("profit", "sum"),
            units_sold=("quantity", "sum"),
        )
        .reset_index()
    )

    summaries: list[WeeklyProductSummary] = []
    for _, row in grouped.iterrows():
        revenue = float(row["total_revenue"])
        profit  = float(row["total_profit"])
        margin  = (profit / revenue * 100) if revenue > 0 else 0.0
        is_complete = not (
            int(row["iso_year"]) == current_year and
            int(row["iso_week"]) == current_week
        )
        summaries.append(WeeklyProductSummary(
            product_name=str(row["product_name"]),
            sku=str(row["sku"]),
            iso_year=int(row["iso_year"]),
            iso_week=int(row["iso_week"]),
            week_start=str(row["week_start"]),
            total_revenue=revenue,
            total_cost=float(row["total_cost"]),
            total_profit=profit,
            margin_pct=round(margin, 2),
            units_sold=int(row["units_sold"]),
            is_complete_week=is_complete,
        ))

    summaries.sort(key=lambda s: (s.sku, s.iso_year, s.iso_week))
    return summaries


def detect_declines(
    summaries: list[WeeklyProductSummary],
    threshold_pct: float = DECLINE_THRESHOLD_PCT,
    baseline_weeks: int = BASELINE_WEEKS,
    min_baseline_weeks: int = MIN_BASELINE_WEEKS,
) -> list[DeclineSignal]:
    """
    Detect products whose last complete week profit declined significantly
    vs their own recent baseline.

    Only complete weeks are considered — the current (partial) week is NEVER
    used as either the "last week" or part of the baseline.

    Args:
        summaries:         Output of compute_weekly_summary().
        threshold_pct:     Fraction (0–1). Flag if decline > this.
        baseline_weeks:    How many prior complete weeks form the baseline.
        min_baseline_weeks: Skip products with fewer complete weeks than this.

    Returns:
        List of DeclineSignal, one per flagged product, sorted by
        profit_change_pct ascending (worst first).
    """
    if not summaries:
        return []

    # Group by sku
    by_sku: dict[str, list[WeeklyProductSummary]] = {}
    for s in summaries:
        by_sku.setdefault(s.sku, []).append(s)

    signals: list[DeclineSignal] = []

    # Find the latest ISO week across ALL products (to detect stockouts)
    all_complete = [s for s in summaries if s.is_complete_week]
    if not all_complete:
        return []
    global_last_year = max(s.iso_year for s in all_complete)
    global_last_week = max(
        s.iso_week for s in all_complete if s.iso_year == global_last_year
    )

    for sku, weeks in by_sku.items():
        # Keep only complete weeks, sorted chronologically
        complete = sorted(
            [w for w in weeks if w.is_complete_week],
            key=lambda w: (w.iso_year, w.iso_week),
        )

        # If this product has NO entry in the global last complete week,
        # inject a synthetic zero-profit week so the stockout is detected.
        product_last_year = max((w.iso_year for w in complete), default=0)
        product_last_week = max(
            (w.iso_week for w in complete if w.iso_year == product_last_year),
            default=0,
        )
        if complete and (
            product_last_year < global_last_year
            or (product_last_year == global_last_year and product_last_week < global_last_week)
        ):
            # Synthetic zero-profit entry for the missing week
            sample = complete[0]
            from datetime import timedelta
            # Compute the Monday of the global last week
            jan4 = date(global_last_year, 1, 4)
            week_start = jan4 + timedelta(weeks=global_last_week - 1) - timedelta(days=jan4.weekday())
            zero_week = WeeklyProductSummary(
                product_name=sample.product_name,
                sku=sample.sku,
                iso_year=global_last_year,
                iso_week=global_last_week,
                week_start=str(week_start),
                total_revenue=0.0,
                total_cost=0.0,
                total_profit=0.0,
                margin_pct=0.0,
                units_sold=0,
                is_complete_week=True,
            )
            complete.append(zero_week)

        # Need at least min_baseline_weeks + 1 (the last week) to compare
        if len(complete) < min_baseline_weeks + 1:
            continue

        last_week  = complete[-1]
        base_weeks = complete[-(baseline_weeks + 1):-1]  # Up to BASELINE_WEEKS prior

        if not base_weeks:
            continue

        baseline_profit  = float(np.mean([w.total_profit  for w in base_weeks]))
        baseline_revenue = float(np.mean([w.total_revenue for w in base_weeks]))
        baseline_units   = float(np.mean([w.units_sold    for w in base_weeks]))

        # Avoid division-by-zero; if baseline was 0 we can't compute % change
        if baseline_profit <= 0:
            continue

        profit_change_pct = (last_week.total_profit - baseline_profit) / abs(baseline_profit)

        if profit_change_pct >= -threshold_pct:
            continue  # Not a significant decline

        # Revenue change
        revenue_change_pct = (
            (last_week.total_revenue - baseline_revenue) / abs(baseline_revenue)
            if baseline_revenue > 0 else 0.0
        )

        # Average unit prices for cost/price analysis
        # Re-derive from totals: avg_price ≈ revenue / units
        last_price_avg = (
            last_week.total_revenue / last_week.units_sold
            if last_week.units_sold > 0 else 0.0
        )
        base_price_avg = (
            baseline_revenue / baseline_units
            if baseline_units > 0 else 0.0
        )
        # Implied cost per unit from totals
        last_cost_avg  = (
            last_week.total_cost / last_week.units_sold
            if last_week.units_sold > 0 else 0.0
        )
        base_cost_avg  = (
            float(np.mean([w.total_cost for w in base_weeks])) / baseline_units
            if baseline_units > 0 else 0.0
        )

        possible_cause = _classify_cause(
            last_week=last_week,
            baseline_units=baseline_units,
            baseline_revenue=baseline_revenue,
            last_cost_avg=last_cost_avg,
            base_cost_avg=base_cost_avg,
            last_price_avg=last_price_avg,
            base_price_avg=base_price_avg,
        )

        signals.append(DeclineSignal(
            product_name=last_week.product_name,
            sku=sku,
            last_week_profit=round(last_week.total_profit, 2),
            baseline_profit=round(baseline_profit, 2),
            profit_change_pct=round(profit_change_pct * 100, 1),
            last_week_revenue=round(last_week.total_revenue, 2),
            baseline_revenue=round(baseline_revenue, 2),
            revenue_change_pct=round(revenue_change_pct * 100, 1),
            last_week_units=last_week.units_sold,
            baseline_units=round(baseline_units, 1),
            last_week_label=f"{last_week.iso_year}-W{last_week.iso_week:02d}",
            last_week_unit_price_avg=round(last_price_avg, 2),
            baseline_unit_price_avg=round(base_price_avg, 2),
            possible_cause_hint=possible_cause,
        ))

    signals.sort(key=lambda s: s.profit_change_pct)
    return signals


def get_best_worst_sellers(
    summaries: list[WeeklyProductSummary],
    top_n: int = 3,
) -> BestWorstSellers:
    """
    Rank products by total profit across all complete weeks.

    Args:
        summaries: Output of compute_weekly_summary().
        top_n:     Number of best and worst sellers to return.

    Returns:
        BestWorstSellers with top_n best and top_n worst by total profit.
    """
    if not summaries:
        return BestWorstSellers(best=[], worst=[])

    # Only complete weeks to avoid skewing recent partial week
    complete = [s for s in summaries if s.is_complete_week]
    if not complete:
        complete = summaries  # Fallback: use all if somehow everything is partial

    # Aggregate totals per sku
    totals: dict[str, dict] = {}
    for s in complete:
        if s.sku not in totals:
            totals[s.sku] = {
                "product_name": s.product_name,
                "sku": s.sku,
                "total_profit": 0.0,
                "total_revenue": 0.0,
                "units_sold": 0,
            }
        totals[s.sku]["total_profit"]  += s.total_profit
        totals[s.sku]["total_revenue"] += s.total_revenue
        totals[s.sku]["units_sold"]    += s.units_sold

    ranked = sorted(totals.values(), key=lambda x: x["total_profit"], reverse=True)

    # Round for output cleanliness
    for r in ranked:
        r["total_profit"]  = round(r["total_profit"], 2)
        r["total_revenue"] = round(r["total_revenue"], 2)

    best = ranked[:top_n]
    # Worst = bottom top_n; when len <= top_n, worst == reversed best
    worst = list(reversed(ranked[-top_n:])) if len(ranked) >= top_n else list(reversed(ranked))
    # Remove overlap: don't repeat items that are in both best and worst
    best_skus = {b["sku"] for b in best}
    worst = [w for w in worst if w["sku"] not in best_skus] or list(reversed(ranked))

    return BestWorstSellers(best=best, worst=worst)


def df_from_csv_bytes(content: bytes) -> tuple[pd.DataFrame, list[str]]:
    """
    Parse and validate a CSV file (as raw bytes).

    Returns:
        (df, errors) — df is the validated DataFrame; errors is a list
        of validation error strings (empty if all good).
    """
    import io

    errors: list[str] = []

    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception as exc:
        return pd.DataFrame(), [f"Could not parse CSV: {exc}"]

    # Strip whitespace from column names
    df.columns = [c.strip().lower() for c in df.columns]

    missing = REQUIRED_CSV_COLUMNS - set(df.columns)
    if missing:
        errors.append(f"Missing required columns: {sorted(missing)}")
        return df, errors

    # Type coercions
    try:
        df["sale_date"] = pd.to_datetime(df["sale_date"]).dt.date
    except Exception:
        errors.append("Column 'sale_date' could not be parsed as dates (use YYYY-MM-DD).")

    for col in ("quantity", "unit_price", "unit_cost"):
        try:
            df[col] = pd.to_numeric(df[col])
        except Exception:
            errors.append(f"Column '{col}' must be numeric.")

    if not errors:
        bad_qty = df["quantity"] < 0
        if bad_qty.any():
            errors.append(f"{bad_qty.sum()} row(s) have negative quantity (quantity < 0). "
                          "Zero-quantity rows are allowed and represent days with no sales.")

        bad_price = df["unit_price"] < 0
        if bad_price.any():
            errors.append(f"{bad_price.sum()} row(s) have negative unit_price.")

    return df, errors


# ─── Internal Helpers ─────────────────────────────────────────────────────────

def _classify_cause(
    last_week: WeeklyProductSummary,
    baseline_units: float,
    baseline_revenue: float,
    last_cost_avg: float,
    base_cost_avg: float,
    last_price_avg: float,
    base_price_avg: float,
) -> str:
    """
    Heuristically classify the most likely cause of a profit decline.
    This is a hint for the AI prompt — not a definitive diagnosis.

    Priority order:
      1. stockout    — units dropped to near zero
      2. cost_increase — implied cost per unit rose significantly
      3. price_drop  — selling price fell significantly
      4. volume_drop — units dropped but not as extreme as a stockout
      5. unknown
    """
    units_drop_pct = (
        (last_week.units_sold - baseline_units) / baseline_units
        if baseline_units > 0 else 0.0
    )
    cost_rise_pct  = (
        (last_cost_avg - base_cost_avg) / base_cost_avg
        if base_cost_avg > 0 else 0.0
    )
    price_drop_pct = (
        (last_price_avg - base_price_avg) / base_price_avg
        if base_price_avg > 0 else 0.0
    )

    if last_week.units_sold == 0 or units_drop_pct < -0.80:
        return "stockout"
    if cost_rise_pct > 0.20:
        return "cost_increase"
    if price_drop_pct < -0.15:
        return "price_drop"
    if units_drop_pct < -0.20:
        return "volume_drop"
    return "unknown"
