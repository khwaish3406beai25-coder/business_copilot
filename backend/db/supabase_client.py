"""
Supabase Client Configuration

This module creates a single, reusable Supabase client for the backend.

IMPORTANT:
- Uses SUPABASE_SERVICE_ROLE_KEY (not anon key) — gives the backend full DB access.
- This key must NEVER be exposed to the frontend.
- Import `supabase` from this module wherever DB access is needed.

Usage:
    from db.supabase_client import supabase

    result = supabase.table("sales").select("*").eq("business_id", biz_id).execute()
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY: str = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    or os.environ.get("SUPABASE_ANON_KEY", "")
)

if (
    not SUPABASE_URL
    or not SUPABASE_SERVICE_ROLE_KEY
    or SUPABASE_SERVICE_ROLE_KEY in ("your-service-role-key-here", "your-anon-key-here")
):
    raise EnvironmentError(
        "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. "
        "Copy backend/.env.example to backend/.env and fill in your Supabase credentials."
    )

# Single shared client instance (thread-safe for read operations)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

