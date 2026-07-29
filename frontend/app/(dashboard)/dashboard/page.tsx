"use client";

/**
 * Main Dashboard Page — KPI cards + trend chart + best/worst sellers + decline panel.
 *
 * Data flow:
 *   1. On mount: call GET /api/analytics/summary  → KPIs, chart, best/worst
 *   2. On mount: call GET /api/analytics/declines → AI decline insights
 *   Both calls are made in parallel. Errors are caught and displayed inline.
 *   Empty datasets render graceful empty states — never crashes.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { KPICard } from "@/components/dashboard/KPICard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { BestWorstTable } from "@/components/dashboard/BestWorstTable";
import { DeclinePanel } from "@/components/dashboard/DeclinePanel";
import type {
  AnalyticsSummaryResponse,
  DeclinesResponse,
} from "@/types/analytics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "rgba(255 255 255 / 0.025)",
        border: "1px solid rgba(255 255 255 / 0.07)",
        borderRadius: 18,
        padding: "24px 26px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "var(--foreground)",
            margin: 0,
          }}
        >
          {title}
        </h2>
        {badge && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              background: "rgba(139 92 246 / 0.15)",
              border: "1px solid rgba(139 92 246 / 0.30)",
              color: "hsl(255 82% 72%)",
              borderRadius: 6,
              padding: "2px 8px",
              letterSpacing: "0.05em",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: "rgba(255 255 255 / 0.04)",
        border: "1px solid rgba(255 255 255 / 0.06)",
        borderRadius: 16,
        padding: "20px 22px",
        height: 120,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255 255 255 / 0.04) 50%, transparent 100%)",
          animation: "shimmer 1.5s infinite",
        }}
      />
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        background: "rgba(239 68 68 / 0.10)",
        border: "1px solid rgba(239 68 68 / 0.25)",
        borderRadius: 10,
        padding: "12px 16px",
        color: "hsl(0 80% 70%)",
        fontSize: "0.875rem",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <span style={{ flexShrink: 0 }}>⚠️</span>
      <span>
        <strong>Could not load data from backend:</strong> {message}
        <br />
        <span style={{ opacity: 0.8, fontSize: "0.8rem" }}>
          Make sure the FastAPI server is running on port 8000.
        </span>
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [declines, setDeclines] = useState<DeclinesResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [declinesLoading, setDeclinesLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [declinesError, setDeclinesError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await api.getAnalyticsSummary();
      setSummary(data);
    } catch (e: unknown) {
      setSummaryError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchDeclines = useCallback(async () => {
    setDeclinesLoading(true);
    setDeclinesError(null);
    try {
      const data = await api.getDeclines();
      setDeclines(data);
    } catch (e: unknown) {
      setDeclinesError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setDeclinesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchDeclines();
  }, [fetchSummary, fetchDeclines]);

  const hasData = summary?.has_data ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200 }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: 0,
              color: "var(--foreground)",
            }}
          >
            Business Overview
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--foreground-muted)", marginTop: 4 }}>
            {hasData
              ? "Live analytics from your uploaded sales data."
              : "Upload a CSV to populate this dashboard."}
          </p>
        </div>

        <a
          href="/upload"
          id="upload-csv-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            background: "linear-gradient(135deg, hsl(255 82% 62%), hsl(280 70% 55%))",
            borderRadius: 10,
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.875rem",
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(139 92 246 / 0.30)",
            transition: "opacity 0.15s ease, transform 0.12s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.88";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v9M4 7l4-4 4 4M2 13h12" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Upload CSV
        </a>
      </div>

      {/* ── Summary error ────────────────────────────────────────────────── */}
      {summaryError && <ErrorBanner message={summaryError} />}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        {summaryLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KPICard
              label="Total Revenue"
              value={fmtCurrency(summary?.total_revenue ?? 0)}
              icon="💰"
              colorClass="hsl(255 82% 62%)"
              description={hasData ? "All complete weeks" : "No data yet"}
            />
            <KPICard
              label="Total Profit"
              value={fmtCurrency(summary?.total_profit ?? 0)}
              icon="📈"
              colorClass="hsl(155 60% 55%)"
              description={hasData ? "Net of all costs" : "No data yet"}
            />
            <KPICard
              label="Avg Margin"
              value={fmtPct(summary?.avg_margin_pct ?? 0)}
              icon="🎯"
              colorClass="hsl(38 90% 60%)"
              description={hasData ? "Profit ÷ Revenue" : "No data yet"}
            />
          </>
        )}
      </div>

      {/* ── Trend Chart ──────────────────────────────────────────────────── */}
      <Section title="Revenue & Profit Trend" badge="Weekly">
        {summaryLoading ? (
          <div
            style={{
              height: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--foreground-muted)",
              fontSize: "0.875rem",
              gap: 10,
            }}
          >
            <div className="spinner" />
            Loading chart data…
          </div>
        ) : (
          <TrendChart summaries={summary?.weekly_summaries ?? []} />
        )}
      </Section>

      {/* ── Best / Worst Sellers ─────────────────────────────────────────── */}
      <Section title="Product Performance">
        {summaryLoading ? (
          <div style={{ display: "flex", gap: 24 }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <BestWorstTable
            best={summary?.best_worst.best ?? []}
            worst={summary?.best_worst.worst ?? []}
          />
        )}
      </Section>

      {/* ── Decline Panel ────────────────────────────────────────────────── */}
      <Section
        title="AI Decline Detection"
        badge={
          declines && declines.total_flagged > 0
            ? `${declines.total_flagged} flagged`
            : undefined
        }
      >
        {declinesError && !declinesLoading && (
          <ErrorBanner message={declinesError} />
        )}
        <DeclinePanel
          declines={declines?.declines ?? []}
          isLoading={declinesLoading}
        />
      </Section>

      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%);  }
        }
      `}</style>
    </div>
  );
}
