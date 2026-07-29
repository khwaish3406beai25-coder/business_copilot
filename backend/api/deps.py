"""
FastAPI Dependency Injection

This module defines reusable dependencies injected into routes via Depends().

get_business_id():
    - In Step 4 (MVP): extracts the Supabase JWT from the Authorization header
      and returns the user's `sub` (UUID) as the business_id.
    - Falls back to a fixed demo UUID when no token is present, so the API
      remains testable with curl without full auth setup.
    - Step 6 will tighten this to hard-require auth.

get_current_user():
    - Full JWT verification — used in Step 6 to lock down routes.
"""

import os
import logging
from fastapi import Header, HTTPException, status
from typing import Optional

logger = logging.getLogger(__name__)

# Fixed demo business_id used when no JWT is provided (dev/testing only)
DEMO_BUSINESS_ID = "00000000-0000-0000-0000-000000000001"


async def get_business_id(
    authorization: Optional[str] = Header(default=None),
) -> str:
    """
    Extract business_id (= user sub) from the Supabase JWT bearer token.

    In MVP mode (Step 4):
      - If a valid JWT is present → decode it and use the `sub` claim.
      - If no token is present → use DEMO_BUSINESS_ID for local testing.

    In Step 6 (Auth hardening):
      - This dependency will be replaced with one that hard-requires a valid token.
    """
    if not authorization:
        logger.debug("No Authorization header — using demo business_id")
        return DEMO_BUSINESS_ID

    # Strip "Bearer " prefix
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return DEMO_BUSINESS_ID

    try:
        from jose import jwt, JWTError

        jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
        if not jwt_secret or jwt_secret == "your-supabase-jwt-secret-here":
            # Can't verify — fall back to demo for dev
            logger.warning("SUPABASE_JWT_SECRET not configured — using demo business_id")
            return DEMO_BUSINESS_ID

        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing sub claim.",
            )
        return user_id

    except ImportError:
        logger.warning("python-jose not installed — using demo business_id")
        return DEMO_BUSINESS_ID
    except Exception as exc:
        logger.warning("JWT decode failed (%s) — using demo business_id", exc)
        return DEMO_BUSINESS_ID


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> dict:
    """
    Full JWT verification dependency (Step 6).
    Returns {"user_id": str, "email": str} or raises HTTP 401.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        from jose import jwt, JWTError

        jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return {
            "user_id": payload.get("sub", ""),
            "email": payload.get("email", ""),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )
