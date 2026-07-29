"use client";

/**
 * Forecast page — AI-powered demand forecasting using linear regression.
 * Fetches real forecast data from GET /api/forecast/demand.
 * Falls back to historical trend chart if no forecast data is available.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { TrendChart } from "@/components/dashboard/TrendChart";
import type { WeeklyProductSummary } from "@/types/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForecastWeek {
  week_label: string;
  week_start: string;
  predicted_units: number;
  predicted_revenue: number;
  confidence: number;
}

interface ProductForecast {
  product_name: string;
  sku: string;
  forecast_weeks: ForecastWeek[];
  trend: "up" | "down" | "stable";
  avg_weekly_units: number;
  avg_weekly_revenue: number;
  data_weeks: number;
}

interface ForecastResponse {
  forecasts: ProductForecast[];
  has_data: boolean;
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function TrendBadge({ trend }: { trend: string }) {
  const config = {
    up:     { label: "↑ Trending Up",   color: "hsl(155 60% 60%)", bg: "rgba(16 185 129 / 0.12)" },
    down:   { label: "↓ Declining",     color: "hsl(0 80% 65%)",   bg: "rgba(239 68 68 / 0.12)" },
    stable: { label: "→ Stable",        color: "hsl(38 90% 60%)",  bg: "rgba(245 158 11 / 0.12)" },
  }[trend] ?? { label: trend, color: "var(--foreground-muted)", bg: "transparent" };

  return (
    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: config.color, background: config.bg, borderRadius: 6, padding: "2px 8px" }}>
      {config.label}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 70 ? "hsl(155 60% 55%)" : pct >= 40 ? "hsl(38 90% 55%)" : "hsl(0 80% 60%)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "rgba(255 255 255 / 0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.3s ease" }} />
      </div>
      <span style={{ fontSize: "0.72rem", color, fontWeight: 600, flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [summaries, setSummaries] = useState<WeeklyProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [forecastData, summaryData] = await Promise.allSettled([
        api.get<ForecastResponse>("/api/forecast/demand"),
        api.getAnalyticsSummary(),
      ]);

      if (forecastData.status === "fulfilled") {
        setForecast(forecastData.value);
      } else {
        setError(forecastData.reason instanceof Error ? forecastData.reason.message : "Failed to load forecast");
      }

      if (summaryData.status === "fulfilled") {
        setSummaries(summaryData.value.weekly_summaries);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Demand Forecast</h1>
        <p style={{ color: "var(--foreground-muted)", marginTop: 6, fontSize: "0.875rem" }}>
          Statistical demand predictions using linear trend analysis on your historical sales data.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div className="spinner" /> Generating forecasts…
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ background: "rgba(239 68 68 / 0.10)", border: "1px solid rgba(239 68 68 / 0.25)", borderRadius: 10, padding: "12px 16px", color: "hsl(0 80% 70%)", fontSize: "0.875rem", marginBottom: 20 }}>
          ⚠️ {error} — Is the FastAPI backend running?
        </div>
      )}

      {/* Historical trend chart */}
      {!loading && (
        <div style={{ background: "rgba(255 255 255 / 0.025)", border: "1px solid rgba(255 255 255 / 0.07)", borderRadius: 18, padding: "24px 26px", marginBottom: 20 }}>
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: "0 0 20px" }}>Historical Revenue & Profit</h2>
          <TrendChart summaries={summaries} />
        </div>
      )}

      {/* Forecast results */}
      {!loading && forecast?.has_data && forecast.forecasts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0 }}>
              4-Week Product Forecasts
            </h2>
            <span style={{ fontSize: "0.78rem", color: "var(--foreground-muted)" }}>
              {forecast.forecasts.length} product{forecast.forecasts.length !== 1 ? "s" : ""} · Linear regression
            </span>
          </div>

          {forecast.forecasts.map((pf) => (
            <div
              key={pf.sku}
              style={{
                background: "rgba(255 255 255 / 0.025)",
                border: "1px solid rgba(255 255 255 / 0.07)",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              {/* Product header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  cursor: "pointer",
                  flexWrap: "wrap",
                  gap: 12,
                }}
                onClick={() => setExpandedSku(expandedSku === pf.sku ? null : pf.sku)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)" }}>
                    {pf.product_name}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--foreground-muted)", fontFamily: "monospace" }}>
                    {pf.sku}
                  </span>
                  <TrendBadge trend={pf.trend} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "0.72rem", color: "var(--foreground-muted)", margin: 0 }}>Avg/wk</p>
                    <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                      {fmtCurrency(pf.avg_weekly_revenue)}
                    </p>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                    {expandedSku === pf.sku ? "▲" : "▼"}
                  </div>
                </div>
              </div>

              {/* Expanded forecast weeks */}
              {expandedSku === pf.sku && (
                <div style={{ borderTop: "1px solid rgba(255 255 255 / 0.06)", padding: "16px 20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
                    {pf.forecast_weeks.map((fw) => (
                      <div
                        key={fw.week_label}
                        style={{
                          background: "rgba(139 92 246 / 0.06)",
                          border: "1px solid rgba(139 92 246 / 0.15)",
                          borderRadius: 12,
                          padding: "14px 16px",
                        }}
                      >
                        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(255 82% 72%)", margin: "0 0 8px" }}>
                          {fw.week_label}
                        </p>
                        <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--foreground)", margin: "0 0 2px" }}>
                          {fmtCurrency(fw.predicted_revenue)}
                        </p>
                        <p style={{ fontSize: "0.78rem", color: "var(--foreground-muted)", margin: "0 0 10px" }}>
                          ~{Math.round(fw.predicted_units)} units
                        </p>
                        <p style={{ fontSize: "0.7rem", color: "var(--foreground-muted)", margin: "0 0 4px" }}>
                          Model confidence
                        </p>
                        <ConfidenceBar confidence={fw.confidence} />
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", opacity: 0.7, margin: 0 }}>
                    Based on {pf.data_weeks} complete weeks of data · Linear regression · Confidence = R²
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No data / upload prompt */}
      {!loading && !forecast?.has_data && (
        <div style={{ background: "rgba(139 92 246 / 0.06)", border: "1px solid rgba(139 92 246 / 0.18)", borderRadius: 18, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔮</div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>
            Not Enough Data Yet
          </h2>
          <p style={{ color: "var(--foreground-muted)", fontSize: "0.875rem", lineHeight: 1.6, maxWidth: 400, margin: "0 auto 20px" }}>
            Upload at least 3 weeks of sales history to generate demand forecasts with linear trend analysis.
          </p>
          <a
            href="/upload"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px",
              background: "linear-gradient(135deg, hsl(255 82% 62%), hsl(280 70% 55%))",
              borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            Upload CSV
          </a>
        </div>
      )}
    </div>
  );
}
