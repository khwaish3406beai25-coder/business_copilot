"""
Reports Routes — GET /api/reports/weekly | GET /api/reports/monthly
Implemented in Phase 5 (Forecasting & Reports).
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/weekly")
async def get_weekly_report():
    """Return weekly report data. (Phase 5)"""
    return {"detail": "Not implemented yet — coming in Phase 5"}


@router.get("/monthly")
async def get_monthly_report():
    """Return monthly report data. (Phase 5)"""
    return {"detail": "Not implemented yet — coming in Phase 5"}
