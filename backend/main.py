"""
BusinessPilot AI — FastAPI Application Entry Point

Architecture:
  main.py         → App setup, CORS, router registration
  api/routes/     → HTTP endpoints (thin layer, no business logic)
  services/       → Business logic & DB queries
  ai/             → LLM client & prompt management
  forecasting/    → Statistical demand models
  db/             → Supabase client configuration
  models/schemas.py → Pydantic request/response models

Run with:
  cd backend
  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# ─── Application Factory ──────────────────────────────────────────────────────

app = FastAPI(
    title="BusinessPilot AI",
    description="AI-powered business co-pilot for small businesses",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS Configuration ───────────────────────────────────────────────────────
# Allows the Next.js frontend (localhost:3000 in dev) to call the API.
# In production, replace with your deployed frontend URL.

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Router Registration ──────────────────────────────────────────────────────

from api.routes import upload, dashboard, insights, chat, forecast, products, inventory

app.include_router(upload.router,    prefix="/api/sales",     tags=["Upload"])
app.include_router(dashboard.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(insights.router,  prefix="/api/analytics", tags=["Analytics"])
app.include_router(products.router,  prefix="/api/products",  tags=["Products"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(forecast.router,  prefix="/api/forecast",  tags=["Forecasting"])
app.include_router(chat.router,      prefix="/api/chat",      tags=["AI Chat"])

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health_check():
    """Simple health check endpoint — confirms the server is running."""
    return {"status": "ok", "service": "BusinessPilot AI Backend", "version": "0.1.0"}


# ─── Dev Server ───────────────────────────────────────────────────────────────
# Run with: uvicorn main:app --reload --port 8000

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
