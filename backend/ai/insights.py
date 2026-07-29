"""
AI Insight Layer

Converts a DeclineSignal (from the analytics service) into a structured
InsightResult by calling the Claude API.

Design:
  - generate_decline_insight() is the ONLY public function.
  - It wraps every AI call in a try/except so a failed API call NEVER crashes
    the HTTP request — callers always get an InsightResult, even if it's a fallback.
  - JSON parsing is also wrapped; if the AI returns malformed JSON we return a
    plain-text fallback rather than a 500 error.
"""

import json
import logging
from dataclasses import dataclass

from ai.ai_client import get_ai_response
from ai.prompts import SYSTEM_PROMPT_BUSINESS_ANALYST, build_decline_prompt
from services.analytics import DeclineSignal

logger = logging.getLogger(__name__)


# ─── Output Shape ─────────────────────────────────────────────────────────────

@dataclass
class InsightResult:
    product_name: str
    sku: str
    what_changed: str
    likely_causes: list[str]
    next_actions: list[str]
    is_fallback: bool = False   # True if AI failed and we returned canned text


# ─── Fallback Template ────────────────────────────────────────────────────────

def _make_fallback(signal: DeclineSignal, reason: str = "") -> InsightResult:
    """
    Return a safe, informative InsightResult when the AI is unavailable.
    Derived entirely from the structured signal data — never crashes.
    """
    cause_map = {
        "cost_increase":  "input costs rose significantly",
        "stockout":       "the product ran out of stock",
        "price_drop":     "the selling price was reduced",
        "volume_drop":    "sales volume dropped",
        "unknown":        "an unidentified factor",
    }
    cause_text = cause_map.get(signal.possible_cause_hint, "an unidentified factor")

    what_changed = (
        f"Profit for {signal.product_name} dropped {abs(signal.profit_change_pct):.1f}% "
        f"vs the recent baseline (${signal.baseline_profit:,.2f}/wk → ${signal.last_week_profit:,.2f})."
    )

    causes = [
        f"The most likely driver is {cause_text} — profit fell "
        f"{abs(signal.profit_change_pct):.1f}% in {signal.last_week_label}.",
        f"Revenue also changed by {signal.revenue_change_pct:+.1f}%, while "
        f"units sold went from {signal.baseline_units:.0f}/wk to {signal.last_week_units}.",
    ]

    actions = [
        f"Review your supplier invoices and selling price for {signal.product_name} "
        f"to confirm whether the margin squeeze is from costs or pricing.",
        f"Check stock levels and reorder if inventory is low — a stockout in "
        f"{signal.last_week_label} would explain the volume drop.",
    ]

    if reason:
        logger.warning("AI fallback for %s (%s): %s", signal.sku, signal.product_name, reason)

    return InsightResult(
        product_name=signal.product_name,
        sku=signal.sku,
        what_changed=what_changed,
        likely_causes=causes,
        next_actions=actions,
        is_fallback=True,
    )


# ─── Main Function ────────────────────────────────────────────────────────────

async def generate_decline_insight(signal: DeclineSignal) -> InsightResult:
    """
    Given a DeclineSignal, call the AI and return a structured InsightResult.

    Always returns an InsightResult — never raises. On any failure (API error,
    bad JSON, missing key) it returns a data-driven fallback instead.

    Args:
        signal: A DeclineSignal produced by services.analytics.detect_declines().

    Returns:
        InsightResult with what_changed, likely_causes (2 items), next_actions (2 items).
        is_fallback=True if the AI was unavailable.
    """
    prompt = build_decline_prompt(
        product_name=signal.product_name,
        sku=signal.sku,
        last_week_label=signal.last_week_label,
        last_week_units=signal.last_week_units,
        last_week_revenue=signal.last_week_revenue,
        last_week_profit=signal.last_week_profit,
        last_week_unit_price_avg=signal.last_week_unit_price_avg,
        baseline_units=signal.baseline_units,
        baseline_revenue=signal.baseline_revenue,
        baseline_profit=signal.baseline_profit,
        baseline_unit_price_avg=signal.baseline_unit_price_avg,
        profit_change_pct=signal.profit_change_pct,
        revenue_change_pct=signal.revenue_change_pct,
        possible_cause_hint=signal.possible_cause_hint,
    )

    # ── Call AI ───────────────────────────────────────────────────────────────
    try:
        raw_response = await get_ai_response(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT_BUSINESS_ANALYST,
        )
    except RuntimeError as exc:
        return _make_fallback(signal, reason=str(exc))
    except Exception as exc:
        return _make_fallback(signal, reason=f"Unexpected: {exc}")

    # ── Parse JSON ────────────────────────────────────────────────────────────
    try:
        # The model sometimes wraps JSON in a markdown code block — strip it
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            cleaned = "\n".join(
                line for line in lines
                if not line.startswith("```")
            )

        data = json.loads(cleaned)

        what_changed   = str(data.get("what_changed", "")).strip()
        likely_causes  = [str(c) for c in data.get("likely_causes", [])][:2]
        next_actions   = [str(a) for a in data.get("next_actions", [])][:2]

        if not what_changed or not likely_causes or not next_actions:
            raise ValueError("AI response missing required fields")

        return InsightResult(
            product_name=signal.product_name,
            sku=signal.sku,
            what_changed=what_changed,
            likely_causes=likely_causes,
            next_actions=next_actions,
            is_fallback=False,
        )

    except (json.JSONDecodeError, ValueError, KeyError, TypeError) as exc:
        logger.warning(
            "Could not parse AI response for %s: %s | raw=%r",
            signal.sku, exc, raw_response[:200],
        )
        return _make_fallback(signal, reason=f"JSON parse error: {exc}")
