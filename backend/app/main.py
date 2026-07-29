"""
BusinessPilot AI — FastAPI Application Entry Point

Run with:
    cd backend
    uvicorn app.main:app --reload --port 8000

Architecture:
    app/main.py         → App factory, CORS, router registration
    api/routes/         → HTTP endpoints (thin, no business logic)
    services/           → Business logic and DB queries
    ai/                 → LLM client and prompt templates
    forecasting/        → Statistical demand models
    db/                 → Supabase client configuration
    models/schemas.py   → Pydantic request/response models
    utils/              → Shared utilities (CSV parser, etc.)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load .env from the backend/ directory
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

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Router Registration ──────────────────────────────────────────────────────
# Routers are imported and registered here as each phase is built.
# Uncomment each router as its routes are implemented.

# from api.routes import auth, upload, dashboard, products, inventory
# from api.routes import insights, forecast, reports, chat

# app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
# app.include_router(upload.router,    prefix="/api/upload",    tags=["Upload"])
# app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
# app.include_router(products.router,  prefix="/api/products",  tags=["Products"])
# app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
# app.include_router(insights.router,  prefix="/api/insights",  tags=["AI Insights"])
# app.include_router(forecast.router,  prefix="/api/forecast",  tags=["Forecasting"])
# app.include_router(reports.router,   prefix="/api/reports",   tags=["Reports"])
# app.include_router(chat.router,      prefix="/api/chat",      tags=["Chat"])


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe — confirms the server is running correctly."""
    return {
        "status": "ok",
        "service": "BusinessPilot AI Backend",
        "version": "0.1.0",
    }
