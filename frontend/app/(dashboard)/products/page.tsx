"use client";

/**
 * Products page — shows per-product performance from the analytics summary.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type { WeeklyProductSummary } from "@/types/analytics";

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function fmtPct(v: number) { return `${v.toFixed(1)}%`; }

function MarginBadge({ pct }: { pct: number }) {
  const color = pct >= 30 ? "hsl(155 60% 60%)" : pct >= 15 ? "hsl(38 90% 60%)" : "hsl(0 80% 65%)";
  const bg = pct >= 30 ? "rgba(16 185 129 / 0.12)" : pct >= 15 ? "rgba(245 158 11 / 0.12)" : "rgba(239 68 68 / 0.12)";
  return (
    <span style={{ fontSize: "0.75rem", fontWeight: 700, color, background: bg, borderRadius: 6, padding: "2px 8px" }}>
      {fmtPct(pct)}
    </span>
  );
}

export default function ProductsPage() {
  const [summaries, setSummaries] = useState<WeeklyProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnalyticsSummary();
      setSummaries(data.weekly_summaries);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Aggregate by product
  const byProduct = new Map<string, { name: string; sku: string; revenue: number; profit: number; units: number; weeks: number[]; }>();
  for (const s of summaries) {
    if (!s.is_complete_week) continue;
    const key = s.sku;
    const existing = byProduct.get(key);
    if (existing) {
      existing.revenue += s.total_revenue;
      existing.profit += s.total_profit;
      existing.units += s.units_sold;
      existing.weeks.push(s.total_profit);
    } else {
      byProduct.set(key, { name: s.product_name, sku: s.sku, revenue: s.total_revenue, profit: s.total_profit, units: s.units_sold, weeks: [s.total_profit] });
    }
  }
  const products = Array.from(byProduct.values()).sort((a, b) => b.profit - a.profit);

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Products</h1>
        <p style={{ color: "var(--foreground-muted)", marginTop: 6, fontSize: "0.875rem" }}>
          Aggregated performance by product across all complete weeks.
        </p>
      </div>

      {loading && (
        <div style={{ color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="spinner" /> Loading product data…
        </div>
      )}

      {error && (
        <div className="auth-alert-error">Backend error: {error} — is the FastAPI server running?</div>
      )}

      {!loading && !error && products.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--foreground-muted)" }}>
          <p style={{ fontSize: "2rem", marginBottom: 12 }}>📦</p>
          <p style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>No product data yet</p>
          <p style={{ fontSize: "0.875rem" }}>Upload a CSV from the sidebar to see product performance here.</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, padding: "8px 16px", fontSize: "0.72rem", fontWeight: 700, color: "var(--foreground-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            <span>Product</span><span style={{ textAlign: "right" }}>Revenue</span><span style={{ textAlign: "right" }}>Profit</span><span style={{ textAlign: "right" }}>Margin</span><span style={{ textAlign: "right" }}>Units</span>
          </div>
          {products.map((p, i) => {
            const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
            return (
              <div key={p.sku} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "14px 16px", background: "rgba(255 255 255 / 0.03)", border: "1px solid rgba(255 255 255 / 0.07)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(139 92 246 / 0.15)", border: "1px solid rgba(139 92 246 / 0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: "hsl(255 82% 72%)", flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--foreground)", margin: 0 }}>{p.name}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--foreground-muted)", margin: 0, fontFamily: "monospace" }}>{p.sku}</p>
                  </div>
                </div>
                <p style={{ textAlign: "right", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{fmtCurrency(p.revenue)}</p>
                <p style={{ textAlign: "right", fontWeight: 700, color: p.profit >= 0 ? "hsl(155 60% 60%)" : "hsl(0 80% 65%)", margin: 0 }}>{fmtCurrency(p.profit)}</p>
                <div style={{ textAlign: "right" }}><MarginBadge pct={margin} /></div>
                <p style={{ textAlign: "right", color: "var(--foreground-muted)", margin: 0 }}>{p.units.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
