"""
run_schema.py — applies database/schema.sql to Supabase directly.

Run this from the backend directory:
    .venv\Scripts\python.exe ..\run_schema.py

Uses supabase-py's postgrest client with the service role key,
which bypasses RLS and has DDL privileges.
"""

import os, sys
from pathlib import Path
from dotenv import load_dotenv

# Load env from backend/.env
ENV_PATH = Path(__file__).parent / "backend" / ".env"
load_dotenv(ENV_PATH)

URL = os.environ.get("SUPABASE_URL", "")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not URL or not KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in backend/.env")
    sys.exit(1)

# Split schema into individual statements
SCHEMA = Path(__file__).parent / "database" / "schema.sql"
raw_sql = SCHEMA.read_text()

# Filter out comment-only lines and split on semicolons
statements = []
for stmt in raw_sql.split(";"):
    cleaned = "\n".join(
        line for line in stmt.splitlines()
        if not line.strip().startswith("--")
    ).strip()
    if cleaned:
        statements.append(cleaned + ";")

print(f"Found {len(statements)} SQL statements to execute.\n")

# Use httpx to call Supabase's pg REST endpoint
import httpx

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

ok = 0
skipped = 0
failed = 0

for i, stmt in enumerate(statements, 1):
    first_line = stmt.splitlines()[0][:70]
    try:
        # Use the /rest/v1/rpc/pg_query endpoint — available on Supabase via the
        # postgres role. Falls back to reporting the SQL for manual execution.
        resp = httpx.post(
            f"{URL}/rest/v1/rpc/pg_query",
            headers=headers,
            json={"query": stmt},
            timeout=20,
        )
        if resp.status_code in (200, 201, 204):
            print(f"  [{i:02d}] OK   {first_line}")
            ok += 1
        elif "already exists" in resp.text or "duplicate" in resp.text.lower():
            print(f"  [{i:02d}] SKIP (already exists) {first_line}")
            skipped += 1
        else:
            print(f"  [{i:02d}] ??   HTTP {resp.status_code}: {resp.text[:120]}")
            print(f"         SQL: {first_line}")
            failed += 1
    except Exception as e:
        print(f"  [{i:02d}] ERR  Exception: {e}")
        failed += 1

print(f"\nDone: {ok} ok, {skipped} skipped, {failed} uncertain.")
print("\nVerifying tables exist...")

for table in ("products", "sales", "inventory_snapshots"):
    r = httpx.get(
        f"{URL}/rest/v1/{table}?limit=1",
        headers=headers,
        timeout=10,
    )
    status = "EXISTS" if r.status_code == 200 else f"MISSING (HTTP {r.status_code})"
    print(f"  {table}: {status}")
