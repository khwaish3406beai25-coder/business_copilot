"use client";

/**
 * Inventory page — shows current product list and unit cost information.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type { WeeklyProductSummary } from "@/types/analytics";

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
}

export default function InventoryPage() {
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

  // Aggregate latest cost per product (use most recent week data)
  const byProduct = new Map<string, { name: string; sku: string; totalUnits: number; totalCost: number; avgCostPerUnit: number; }>();
  for (const s of summaries) {
    const key = s.sku;
    const existing = byProduct.get(key);
    const costPerUnit = s.units_sold > 0 ? s.total_cost / s.units_sold : 0;
    if (existing) {
      existing.totalUnits += s.units_sold;
      existing.totalCost += s.total_cost;
      existing.avgCostPerUnit = existing.totalCost / existing.totalUnits;
    } else {
      byProduct.set(key, { name: s.product_name, sku: s.sku, totalUnits: s.units_sold, totalCost: s.total_cost, avgCostPerUnit: costPerUnit });
    }
  }
  const products = Array.from(byProduct.values()).sort((a, b) => b.totalUnits - a.totalUnits);

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Inventory</h1>
        <p style={{ color: "var(--foreground-muted)", marginTop: 6, fontSize: "0.875rem" }}>
          Product catalogue and cost overview from your uploaded sales data.
        </p>
      </div>

      {loading && (
        <div style={{ color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="spinner" /> Loading inventory data…
        </div>
      )}

      {error && <div className="auth-alert-error">Error: {error}</div>}

      {!loading && !error && products.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--foreground-muted)" }}>
          <p style={{ fontSize: "2rem", marginBottom: 12 }}>🗃️</p>
          <p style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>No inventory data yet</p>
          <p style={{ fontSize: "0.875rem" }}>Upload a CSV file to see your product inventory here.</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total SKUs", value: products.length.toString(), icon: "📦" },
              { label: "Total Units Tracked", value: products.reduce((a, p) => a + p.totalUnits, 0).toLocaleString(), icon: "🔢" },
              { label: "Total Cost", value: fmtCurrency(products.reduce((a, p) => a + p.totalCost, 0)), icon: "💵" },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: "rgba(255 255 255 / 0.04)", border: "1px solid rgba(255 255 255 / 0.08)", borderRadius: 14, padding: "18px 20px" }}>
                <span style={{ fontSize: "1.4rem" }}>{icon}</span>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", margin: "8px 0 2px" }}>{value}</p>
                <p style={{ fontSize: "0.8rem", color: "var(--foreground-muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: "rgba(255 255 255 / 0.025)", border: "1px solid rgba(255 255 255 / 0.07)", borderRadius: 16, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "12px 18px", background: "rgba(255 255 255 / 0.03)", borderBottom: "1px solid rgba(255 255 255 / 0.06)", fontSize: "0.72rem", fontWeight: 700, color: "var(--foreground-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              <span>Product / SKU</span>
              <span style={{ textAlign: "right" }}>Units Sold</span>
              <span style={{ textAlign: "right" }}>Avg Unit Cost</span>
              <span style={{ textAlign: "right" }}>Total Cost</span>
            </div>
            {products.map((p, i) => (
              <div key={p.sku} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "14px 18px", borderBottom: i < products.length - 1 ? "1px solid rgba(255 255 255 / 0.04)" : "none" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0, color: "var(--foreground)" }}>{p.name}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--foreground-muted)", fontFamily: "monospace", margin: 0 }}>{p.sku}</p>
                </div>
                <p style={{ textAlign: "right", color: "var(--foreground)", margin: 0 }}>{p.totalUnits.toLocaleString()}</p>
                <p style={{ textAlign: "right", color: "var(--foreground-muted)", margin: 0 }}>{fmtCurrency(p.avgCostPerUnit)}</p>
                <p style={{ textAlign: "right", fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{fmtCurrency(p.totalCost)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
