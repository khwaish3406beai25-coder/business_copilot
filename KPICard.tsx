"use client";

/**
 * KPICard — animated metric card with trend indicator.
 *
 * Shows a label, formatted value, optional trend arrow + % change,
 * and a subtle icon badge. Handles null/undefined values safely.
 */

import { ReactNode } from "react";

interface KPICardProps {
  label: string;
  value: string;
  trend?: number | null;     // positive = up, negative = down, null = no trend shown
  icon: ReactNode;
  colorClass?: string;       // CSS color for the icon badge bg
  description?: string;
}

function TrendBadge({ trend }: { trend: number }) {
  const isUp   = trend >= 0;
  const color  = isUp ? "hsl(155 60% 65%)" : "hsl(0 80% 70%)";
  const bg     = isUp ? "rgba(16 185 129 / 0.12)" : "rgba(239 68 68 / 0.12)";
  const border = isUp ? "rgba(16 185 129 / 0.30)" : "rgba(239 68 68 / 0.30)";
  const arrow  = isUp ? "▲" : "▼";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: "0.75rem",
        fontWeight: 600,
        color,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 6,
        padding: "2px 7px",
      }}
    >
      <span style={{ fontSize: "0.65rem" }}>{arrow}</span>
      {Math.abs(trend).toFixed(1)}%
    </span>
  );
}

export function KPICard({
  label,
  value,
  trend,
  icon,
  colorClass = "hsl(255 82% 62%)",
  description,
}: KPICardProps) {
  return (
    <div
      style={{
        background: "rgba(255 255 255 / 0.04)",
        border: "1px solid rgba(255 255 255 / 0.08)",
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        backdropFilter: "blur(12px)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          "0 8px 32px rgba(0 0 0 / 0.35), 0 0 0 1px rgba(255 255 255 / 0.07)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Top row: icon + trend badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${colorClass}33, ${colorClass}1a)`,
            border: `1px solid ${colorClass}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
          }}
        >
          {icon}
        </div>
        {trend != null && <TrendBadge trend={trend} />}
      </div>

      {/* Value */}
      <div>
        <div
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--foreground)",
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: "0.8125rem",
            color: "var(--foreground-muted)",
            marginTop: 4,
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--foreground-muted)",
              marginTop: 3,
              opacity: 0.7,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
