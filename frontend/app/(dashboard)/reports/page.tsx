"use client";

/**
 * Reports page — downloadable CSV export of analytics summary + decline signals.
 */

import { useState, useCallback } from "react";
import { api } from "@/services/api";
import type { AnalyticsSummaryResponse, DeclinesResponse } from "@/types/analytics";

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [lastDeclines, setLastDeclines] = useState<DeclinesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportSummary = useCallback(async () => {
    setLoading("summary");
    setError(null);
    try {
      const data = await api.getAnalyticsSummary();
      setLastSummary(data);
      const rows = [
        ["Product", "SKU", "Week", "Revenue", "Cost", "Profit", "Margin %", "Units", "Complete Week"],
        ...data.weekly_summaries.map(s => [
          s.product_name, s.sku, s.week_start,
          s.total_revenue.toFixed(2), s.total_cost.toFixed(2), s.total_profit.toFixed(2),
          s.margin_pct.toFixed(2), s.units_sold, s.is_complete_week ? "Yes" : "No",
        ]),
      ];
      const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
      downloadCSV(csv, `businesspilot-summary-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to export");
    } finally {
      setLoading(null);
    }
  }, []);

  const exportDeclines = useCallback(async () => {
    setLoading("declines");
    setError(null);
    try {
      const data = await api.getDeclines();
      setLastDeclines(data);
      const rows = [
        ["Product", "SKU", "Profit Change %", "Last Week Profit", "Baseline Profit", "Cause Hint", "What Changed", "Suggested Actions"],
        ...data.declines.map(d => [
          d.signal.product_name, d.signal.sku,
          d.signal.profit_change_pct.toFixed(1),
          d.signal.last_week_profit.toFixed(2),
          d.signal.baseline_profit.toFixed(2),
          d.signal.possible_cause_hint,
          d.insight.what_changed,
          d.insight.next_actions.join(" | "),
        ]),
      ];
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      downloadCSV(csv, `businesspilot-declines-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to export");
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>Reports</h1>
        <p style={{ color: "var(--foreground-muted)", marginTop: 6, fontSize: "0.875rem" }}>
          Export your analytics data as CSV reports for offline analysis or sharing.
        </p>
      </div>

      {error && <div className="auth-alert-error" style={{ marginBottom: 20 }}>Export failed: {error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          {
            id: "summary",
            icon: "📊",
            title: "Weekly Analytics Summary",
            desc: "All products × week data including revenue, cost, profit, margin, and units sold. Partial weeks are flagged.",
            action: exportSummary,
            meta: lastSummary ? `${lastSummary.weekly_summaries.length} rows · Last export: just now` : null,
          },
          {
            id: "declines",
            icon: "🔍",
            title: "Decline Signals + AI Insights",
            desc: "Flagged products with profit declines, the detected cause, AI explanation, and recommended actions.",
            action: exportDeclines,
            meta: lastDeclines ? `${lastDeclines.declines.length} declines · Last export: just now` : null,
          },
        ].map(({ id, icon, title, desc, action, meta }) => (
          <div key={id} style={{ background: "rgba(255 255 255 / 0.03)", border: "1px solid rgba(255 255 255 / 0.08)", borderRadius: 16, padding: "22px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 200 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(139 92 246 / 0.12)", border: "1px solid rgba(139 92 246 / 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>
                {icon}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", marginBottom: 4 }}>{title}</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", lineHeight: 1.5, marginBottom: meta ? 6 : 0 }}>{desc}</p>
                {meta && <p style={{ fontSize: "0.75rem", color: "hsl(155 60% 55%)" }}>{meta}</p>}
              </div>
            </div>
            <button
              id={`export-${id}-btn`}
              onClick={action}
              disabled={loading !== null}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 18px",
                background: loading === id ? "rgba(139 92 246 / 0.2)" : "linear-gradient(135deg, hsl(255 82% 62%), hsl(280 70% 55%))",
                border: "none", borderRadius: 9, color: "#fff", fontWeight: 600, fontSize: "0.875rem",
                cursor: loading !== null ? "not-allowed" : "pointer",
                opacity: loading !== null && loading !== id ? 0.5 : 1,
                transition: "opacity 0.15s",
                flexShrink: 0,
              }}
            >
              {loading === id ? (
                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Exporting…</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M4 11l4 4 4-4M2 15h12" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> Export CSV</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Summary stats at bottom if loaded */}
      {lastSummary && (
        <div style={{ marginTop: 28, padding: "18px 22px", background: "rgba(16 185 129 / 0.06)", border: "1px solid rgba(16 185 129 / 0.15)", borderRadius: 14 }}>
          <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "hsl(155 60% 60%)", marginBottom: 10 }}>✅ Last Summary Export</p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--foreground-muted)" }}>
            <span>Revenue: <strong style={{ color: "var(--foreground)" }}>{fmtCurrency(lastSummary.total_revenue)}</strong></span>
            <span>Profit: <strong style={{ color: "var(--foreground)" }}>{fmtCurrency(lastSummary.total_profit)}</strong></span>
            <span>Avg Margin: <strong style={{ color: "var(--foreground)" }}>{lastSummary.avg_margin_pct.toFixed(1)}%</strong></span>
            <span>Weeks: <strong style={{ color: "var(--foreground)" }}>{new Set(lastSummary.weekly_summaries.map(s => s.week_start)).size}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
