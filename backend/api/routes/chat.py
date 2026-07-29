"""
AI Chat — POST /api/chat/

Accepts a plain-text business question and answers it using the AI client.
The endpoint fetches the user's analytics summary first (if available) and
injects it into the prompt as context so the AI can give data-driven answers.

Fails gracefully: if the AI is unavailable a helpful fallback message is
returned — the endpoint never returns a 500 to the frontend.
"""

import logging
from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel

from ai.ai_client import get_ai_response
from api.deps import get_business_id

logger = logging.getLogger(__name__)
router = APIRouter()

CHAT_SYSTEM_PROMPT = """You are BusinessPilot AI, an expert business analyst for small businesses.
You help small business owners understand their sales data, identify problems, and make better decisions.

Guidelines:
- Be concise and actionable (3-4 sentences max per answer unless detail is needed).
- Use bullet points for lists of actions or causes.
- If you have business data context, use it directly.
- If no data is available, give general small business advice.
- Always end with one concrete next action the owner can take today.
- Avoid jargon. Speak like a knowledgeable friend, not a consultant.
"""


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    is_fallback: bool = False


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest = Body(...),
    business_id: str = Depends(get_business_id),
):
    """
    Answer a business question using the AI with optional sales data context.

    The endpoint tries to fetch the user's analytics summary to give
    data-grounded answers. If analytics are unavailable, it answers generally.
    Falls back gracefully if the AI is down.
    """
    # ── Try to load analytics context ────────────────────────────────────────
    context = ""
    try:
        import pandas as pd
        from db.supabase_client import supabase
        from services.analytics import compute_weekly_summary, get_best_worst_sellers, detect_declines

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

        if rows:
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
            summaries  = compute_weekly_summary(df)
            best_worst = get_best_worst_sellers(summaries)
            declines   = detect_declines(summaries)

            complete = [s for s in summaries if s.is_complete_week]
            total_rev    = sum(s.total_revenue for s in complete)
            total_profit = sum(s.total_profit  for s in complete)
            avg_margin   = (total_profit / total_rev * 100) if total_rev > 0 else 0

            best_names  = ", ".join(b["product_name"] for b in best_worst.best[:3])
            worst_names = ", ".join(w["product_name"] for w in best_worst.worst[:3])
            decline_names = ", ".join(d.product_name for d in declines[:3]) if declines else "None"

            context = f"""
BUSINESS DATA CONTEXT (use this to answer the question):
- Total Revenue: ${total_rev:,.2f}
- Total Profit: ${total_profit:,.2f}
- Average Margin: {avg_margin:.1f}%
- Best Sellers: {best_names or 'N/A'}
- Worst Performers: {worst_names or 'N/A'}
- Products with profit declines: {decline_names}
- Total products tracked: {len(set(s.sku for s in summaries))}
- Weeks of data: {len(set(s.week_start for s in summaries))}
"""
    except Exception as exc:
        logger.warning("Could not load analytics context for chat: %s", exc)
        context = "\nNo business data is currently available. Provide general advice.\n"

    # ── Build prompt ──────────────────────────────────────────────────────────
    prompt = f"{context}\n\nBusiness owner's question: {request.message}"

    # ── Call AI ───────────────────────────────────────────────────────────────
    try:
        reply = await get_ai_response(
            prompt=prompt,
            system_prompt=CHAT_SYSTEM_PROMPT,
        )
        return ChatResponse(reply=reply, is_fallback=False)

    except RuntimeError as exc:
        logger.warning("AI unavailable for chat: %s", exc)
        fallback = (
            "I'm unable to reach the AI service right now. "
            "Please check that your ANTHROPIC_API_KEY is configured in backend/.env, "
            "or visit the Dashboard to see AI-generated decline analysis for your products."
        )
        return ChatResponse(reply=fallback, is_fallback=True)
