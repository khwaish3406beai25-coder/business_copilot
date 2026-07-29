"""
apply_schema.py — applies database/schema.sql to Supabase.

Runs each SQL statement individually using the supabase-py client's
underlying httpx session to POST to the /rest/v1/rpc endpoint after
first creating a helper function, or uses the pg REST approach.
"""
import os, sys, httpx
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SCHEMA_PATH  = Path(__file__).parent / "database" / "schema.sql"

headers = {
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type":  "application/json",
}


def run_sql(sql: str) -> dict:
    """Execute SQL via Supabase's pg endpoint."""
    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/query",
        headers=headers,
        json={"query": sql},
        timeout=30,
    )
    return {"status": resp.status_code, "body": resp.text[:300]}


# ── Try the pg endpoint first ─────────────────────────────────────────────────
sql = SCHEMA_PATH.read_text()
result = run_sql(sql)
print("pg endpoint result:", result)

# ── Verify tables exist ───────────────────────────────────────────────────────
for table in ("products", "sales", "inventory_snapshots"):
    resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/{table}?limit=1",
        headers=headers,
        timeout=10,
    )
    if resp.status_code == 200:
        print(f"  ✅ {table} exists")
    else:
        print(f"  ❌ {table} missing: {resp.text[:100]}")
