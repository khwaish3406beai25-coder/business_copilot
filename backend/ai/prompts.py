"""
LLM Prompt Templates

All prompt strings are defined here as constants or builder functions.
Keeping prompts in one place makes them easy to iterate and version.

Naming convention: PROMPT_<PURPOSE>
"""

# ─── System Prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT_BUSINESS_ANALYST = """
You are a business analyst AI assistant for small business owners.
You analyze sales data, inventory levels, and financial metrics to provide
clear, actionable insights in plain language. Be concise and specific.
Always ground your recommendations in the data provided.
""".strip()


# ─── Decline Analysis Prompt ──────────────────────────────────────────────────

PROMPT_DECLINE_ANALYSIS = """
A small business owner needs to understand why one of their products had a significant profit decline.

Here is the data for {product_name} (SKU: {sku}):

LAST COMPLETE WEEK ({last_week_label}):
  - Units sold: {last_week_units}
  - Revenue: ${last_week_revenue}
  - Profit: ${last_week_profit}
  - Average selling price: ${last_week_unit_price_avg}

BASELINE (average of prior {baseline_weeks} complete weeks):
  - Units sold: {baseline_units} per week
  - Revenue: ${baseline_revenue} per week
  - Profit: ${baseline_profit} per week
  - Average selling price: ${baseline_unit_price_avg}

CHANGES:
  - Profit change: {profit_change_pct}%
  - Revenue change: {revenue_change_pct}%
  - Units change: {units_change_pct}%
  - Price change: {price_change_pct}%
  - Most likely cause (system hint): {possible_cause_hint}

Based ONLY on the numbers above, respond in this EXACT JSON format (no markdown, no preamble):
{{
  "what_changed": "One sentence summarising the key metric that changed most.",
  "likely_causes": [
    "Cause 1 — grounded in the numbers above.",
    "Cause 2 — grounded in the numbers above."
  ],
  "next_actions": [
    "Concrete action 1 the owner can take this week.",
    "Concrete action 2 the owner can take this week."
  ]
}}
""".strip()


def build_decline_prompt(
    product_name: str,
    sku: str,
    last_week_label: str,
    last_week_units: int,
    last_week_revenue: float,
    last_week_profit: float,
    last_week_unit_price_avg: float,
    baseline_units: float,
    baseline_revenue: float,
    baseline_profit: float,
    baseline_unit_price_avg: float,
    profit_change_pct: float,
    revenue_change_pct: float,
    possible_cause_hint: str,
    baseline_weeks: int = 4,
) -> str:
    """
    Build the decline analysis prompt from a DeclineSignal.
    Returns the filled prompt string, ready to send to the AI.
    """
    units_change_pct = round(
        (last_week_units - baseline_units) / baseline_units * 100
        if baseline_units > 0 else 0.0,
        1,
    )
    price_change_pct = round(
        (last_week_unit_price_avg - baseline_unit_price_avg) / baseline_unit_price_avg * 100
        if baseline_unit_price_avg > 0 else 0.0,
        1,
    )

    return PROMPT_DECLINE_ANALYSIS.format(
        product_name=product_name,
        sku=sku,
        last_week_label=last_week_label,
        last_week_units=last_week_units,
        last_week_revenue=f"{last_week_revenue:,.2f}",
        last_week_profit=f"{last_week_profit:,.2f}",
        last_week_unit_price_avg=f"{last_week_unit_price_avg:,.2f}",
        baseline_units=f"{baseline_units:,.1f}",
        baseline_revenue=f"{baseline_revenue:,.2f}",
        baseline_profit=f"{baseline_profit:,.2f}",
        baseline_unit_price_avg=f"{baseline_unit_price_avg:,.2f}",
        profit_change_pct=f"{profit_change_pct:+.1f}",
        revenue_change_pct=f"{revenue_change_pct:+.1f}",
        units_change_pct=f"{units_change_pct:+.1f}",
        price_change_pct=f"{price_change_pct:+.1f}",
        possible_cause_hint=possible_cause_hint,
        baseline_weeks=baseline_weeks,
    )


# ─── Other Prompts (for future features) ──────────────────────────────────────

PROMPT_WEEKLY_SUMMARY = """
Based on the following business data for the past 7 days, write a brief,
friendly weekly summary for a small business owner. Highlight key wins,
concerns, and one clear action item.

Business Data:
{business_data}
""".strip()

PROMPT_SLOW_MOVERS = """
Identify slow-moving products from the following inventory and sales data.
For each slow mover, suggest one actionable recommendation (discount, bundle,
stop restocking, etc.).

Product Performance Data:
{product_data}
""".strip()

PROMPT_DEMAND_FORECAST = """
Based on the following historical sales data, predict demand for the next
{forecast_days} days per product. Return your answer as a structured list.

Historical Sales:
{historical_data}
""".strip()

PROMPT_CHAT = """
A small business owner is asking a question about their business.
Use the business context below to give a helpful, specific answer.

Business Context:
{business_context}

Owner's Question:
{question}
""".strip()
