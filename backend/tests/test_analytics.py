"""
Unit tests for the analytics service.

Loads database/sample_sales.csv which contains 3 known loss scenarios:
  1. Widget A — cost_increase in week 5 (unit_cost jumps from 8.00 to 14.00)
  2. Widget B — stockout in week 5 (zero sales rows that week)
  3. Widget C — discount_creep from week 3 onward (unit_price falling steadily)

Run: cd backend && python -m pytest tests/test_analytics.py -v
"""

import sys
import os
from pathlib import Path

# Allow imports from backend/ root when running tests directly
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
import pytest

from services.analytics import (
    compute_weekly_summary,
    detect_declines,
    get_best_worst_sellers,
    df_from_csv_bytes,
    DECLINE_THRESHOLD_PCT,
)

# ─── Fixture ──────────────────────────────────────────────────────────────────

SAMPLE_CSV_PATH = Path(__file__).parent.parent.parent / "database" / "sample_sales.csv"


@pytest.fixture(scope="module")
def sample_df() -> pd.DataFrame:
    """Load the canonical sample CSV."""
    assert SAMPLE_CSV_PATH.exists(), f"Sample CSV not found at {SAMPLE_CSV_PATH}"
    content = SAMPLE_CSV_PATH.read_bytes()
    df, errors = df_from_csv_bytes(content)
    assert not errors, f"CSV validation errors: {errors}"
    return df


@pytest.fixture(scope="module")
def summaries(sample_df):
    return compute_weekly_summary(sample_df)


@pytest.fixture(scope="module")
def declines(summaries):
    return detect_declines(summaries)


# ─── CSV Parsing Tests ────────────────────────────────────────────────────────

def test_csv_loads_without_errors(sample_df):
    """CSV must parse cleanly with all required columns present."""
    assert not sample_df.empty
    required = {"product_name", "sku", "sale_date", "quantity", "unit_price", "unit_cost"}
    assert required.issubset(set(sample_df.columns))


def test_csv_has_three_products(sample_df):
    assert sample_df["sku"].nunique() == 3


def test_csv_validation_catches_missing_columns():
    bad_csv = b"product_name,quantity\nWidget A,10\n"
    _, errors = df_from_csv_bytes(bad_csv)
    assert errors, "Should have flagged missing columns"
    assert any("Missing" in e for e in errors)


def test_csv_validation_catches_bad_date():
    bad_csv = (
        b"product_name,sku,sale_date,quantity,unit_price,unit_cost\n"
        b"Widget A,WGT-A,not-a-date,10,25.00,8.00\n"
    )
    _, errors = df_from_csv_bytes(bad_csv)
    assert errors, "Should have flagged bad date"


def test_csv_allows_zero_quantity_stockout_rows():
    """
    quantity = 0 is a legitimate stockout day from a POS export.
    The validator must NOT reject it — only negative quantities are invalid.
    """
    csv = (
        b"product_name,sku,sale_date,quantity,unit_price,unit_cost\n"
        b"Widget A,WGT-A,2024-03-01,10,25.00,8.00\n"
        b"Widget A,WGT-A,2024-03-02,0,25.00,8.00\n"   # stockout day — must be allowed
    )
    df, errors = df_from_csv_bytes(csv)
    assert not errors, f"quantity=0 should be allowed but got errors: {errors}"
    assert len(df) == 2


def test_csv_rejects_negative_quantity():
    """
    quantity < 0 is nonsensical for a sales record and must be rejected.
    (Returns/credits should be tracked separately, not as negative sales.)
    """
    csv = (
        b"product_name,sku,sale_date,quantity,unit_price,unit_cost\n"
        b"Widget A,WGT-A,2024-03-01,-5,25.00,8.00\n"
    )
    _, errors = df_from_csv_bytes(csv)
    assert errors, "Negative quantity should be rejected"
    assert any("negative" in e.lower() or "< 0" in e for e in errors)


# ─── Weekly Summary Tests ─────────────────────────────────────────────────────

def test_compute_weekly_summary_not_empty(summaries):
    assert len(summaries) > 0


def test_weekly_summaries_cover_all_products(summaries):
    skus = {s.sku for s in summaries}
    assert "WGT-A" in skus
    assert "WGT-B" in skus
    assert "WGT-C" in skus


def test_weekly_summary_profit_equals_revenue_minus_cost(summaries):
    """Derived profit must always equal revenue - cost (to within floating-point rounding)."""
    for s in summaries:
        expected = round(s.total_revenue - s.total_cost, 4)
        assert abs(s.total_profit - expected) < 0.01, (
            f"{s.sku} week {s.iso_week}: profit={s.total_profit}, "
            f"rev={s.total_revenue}, cost={s.total_cost}"
        )


def test_current_week_marked_incomplete(summaries):
    """
    The current ISO week must be flagged as incomplete so it is never
    used in decline baselines.
    """
    from datetime import date
    today = date.today()
    ciso = today.isocalendar()
    current_year, current_week = ciso[0], ciso[1]
    current_entries = [
        s for s in summaries
        if s.iso_year == current_year and s.iso_week == current_week
    ]
    for s in current_entries:
        assert not s.is_complete_week, (
            f"{s.sku} current week should be marked incomplete"
        )


# ─── Decline Detection Tests ──────────────────────────────────────────────────

def test_declines_not_empty(declines):
    """Sample data has 3 engineered decline scenarios — at least one must fire."""
    assert len(declines) > 0, "Expected at least one decline signal from sample data"


def test_widget_a_cost_increase_detected(declines):
    """
    Widget A: unit_cost jumps from 8.00 → 14.00 in week 5.
    Profit drops from ~(25-8)*71 ≈ $1207/wk to ~(25-14)*71 ≈ $781/wk — a ~35% drop.
    """
    wgt_a = [d for d in declines if d.sku == "WGT-A"]
    assert wgt_a, "Widget A should be flagged for cost increase"
    signal = wgt_a[0]
    assert signal.profit_change_pct < -DECLINE_THRESHOLD_PCT * 100, (
        f"Widget A profit change should be < -{DECLINE_THRESHOLD_PCT*100}%, "
        f"got {signal.profit_change_pct}%"
    )
    assert signal.possible_cause_hint == "cost_increase", (
        f"Widget A cause should be 'cost_increase', got '{signal.possible_cause_hint}'"
    )


def test_widget_b_stockout_detected(declines):
    """
    Widget B: zero sales in week 5 (no CSV rows for that week).
    Profit drops from ~$700/wk to $0 — a 100% drop.
    """
    wgt_b = [d for d in declines if d.sku == "WGT-B"]
    assert wgt_b, "Widget B should be flagged for stockout"
    signal = wgt_b[0]
    assert signal.last_week_profit == 0.0, (
        f"Widget B last week profit should be 0, got {signal.last_week_profit}"
    )
    assert signal.possible_cause_hint == "stockout", (
        f"Widget B cause should be 'stockout', got '{signal.possible_cause_hint}'"
    )


def test_widget_c_discount_creep_detected(declines):
    """
    Widget C: unit_price creeps down from 50.00 → 21.00 over 5 weeks.
    By week 5, price is below cost (20.00), so profit goes negative.
    """
    wgt_c = [d for d in declines if d.sku == "WGT-C"]
    assert wgt_c, "Widget C should be flagged for discount/price drop"
    signal = wgt_c[0]
    assert signal.profit_change_pct < -DECLINE_THRESHOLD_PCT * 100, (
        f"Widget C profit change should be negative large, got {signal.profit_change_pct}%"
    )
    assert signal.possible_cause_hint in ("price_drop", "cost_increase"), (
        f"Widget C cause should be 'price_drop', got '{signal.possible_cause_hint}'"
    )


def test_decline_sorted_worst_first(declines):
    """Declines list must be sorted ascending by profit_change_pct (worst first)."""
    pcts = [d.profit_change_pct for d in declines]
    assert pcts == sorted(pcts), "Declines should be sorted worst-first"


# ─── Best / Worst Sellers Tests ───────────────────────────────────────────────

def test_best_worst_sellers_not_empty(summaries):
    result = get_best_worst_sellers(summaries)
    assert len(result.best) > 0
    assert len(result.worst) > 0


def test_best_sellers_sorted_by_profit(summaries):
    result = get_best_worst_sellers(summaries)
    profits = [b["total_profit"] for b in result.best]
    assert profits == sorted(profits, reverse=True)


def test_worst_sellers_sorted_by_profit_ascending(summaries):
    result = get_best_worst_sellers(summaries)
    profits = [w["total_profit"] for w in result.worst]
    assert profits == sorted(profits), "Worst sellers should be sorted ascending (lowest first)"


def test_best_worst_empty_input():
    result = get_best_worst_sellers([])
    assert result.best == []
    assert result.worst == []


def test_declines_empty_input():
    result = detect_declines([])
    assert result == []


def test_weekly_summary_empty_input():
    result = compute_weekly_summary(pd.DataFrame())
    assert result == []
