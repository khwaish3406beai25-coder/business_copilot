"""
Pydantic Schemas — Request and Response Models

All API request bodies and response shapes are defined here.
This ensures consistent data contracts between frontend and backend.

Naming convention:
    - Request bodies: <Entity>Create, <Entity>Update
    - Responses:      <Entity>Response, <Entity>ListResponse
"""

from pydantic import BaseModel
from typing import Optional


# ─── Health ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    service: str


# ─── Upload ───────────────────────────────────────────────────────────────────

class CSVUploadResponse(BaseModel):
    success: bool
    rows_inserted: int
    products_upserted: int
    errors: list[str]
    message: str


# ─── Analytics — Weekly Summary ───────────────────────────────────────────────

class WeeklyProductSummarySchema(BaseModel):
    product_name: str
    sku: str
    iso_year: int
    iso_week: int
    week_start: str        # "2024-01-01"
    total_revenue: float
    total_cost: float
    total_profit: float
    margin_pct: float
    units_sold: int
    is_complete_week: bool


class SellerEntry(BaseModel):
    product_name: str
    sku: str
    total_profit: float
    total_revenue: float
    units_sold: int


class BestWorstSellersSchema(BaseModel):
    best: list[SellerEntry]
    worst: list[SellerEntry]


class AnalyticsSummaryResponse(BaseModel):
    weekly_summaries: list[WeeklyProductSummarySchema]
    best_worst: BestWorstSellersSchema
    total_revenue: float
    total_profit: float
    avg_margin_pct: float
    has_data: bool


# ─── Analytics — Declines ─────────────────────────────────────────────────────

class DeclineSignalSchema(BaseModel):
    product_name: str
    sku: str
    last_week_profit: float
    baseline_profit: float
    profit_change_pct: float
    last_week_revenue: float
    baseline_revenue: float
    revenue_change_pct: float
    last_week_units: int
    baseline_units: float
    last_week_label: str
    last_week_unit_price_avg: float
    baseline_unit_price_avg: float
    possible_cause_hint: str


class InsightResultSchema(BaseModel):
    product_name: str
    sku: str
    what_changed: str
    likely_causes: list[str]
    next_actions: list[str]
    is_fallback: bool


class DeclineWithInsight(BaseModel):
    signal: DeclineSignalSchema
    insight: InsightResultSchema


class DeclinesResponse(BaseModel):
    declines: list[DeclineWithInsight]
    total_flagged: int
    has_data: bool
