"""
Auth Routes — POST /api/auth/verify
Implemented in Phase 2 (Authentication).
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/verify")
async def verify_token():
    """Verify Supabase JWT and return user info. (Phase 2)"""
    return {"detail": "Not implemented yet — coming in Phase 2"}
