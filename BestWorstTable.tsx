"use client";

/**
 * BestWorstTable — Side-by-side best/worst sellers table.
 *
 * Handles empty arrays gracefully.
 */

import type { SellerEntry } from "@/types/analytics";

interface BestWorstTableProps {
  best: SellerEntry[];
  worst: SellerEntry[];
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

function SellerTable({
  title,
  entries,
  variant,
}: {
  title: string;
  entries: SellerEntry[];
  variant: "best" | "worst";
}) {
  const color  = variant === "best" ? "hsl(155 60% 60%)" : "hsl(0 80% 65%)";
  const icon   = variant === "best" ? "🏆" : "⚠️";

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h3
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{icon}</span> {title}
      </h3>

      {entries.length === 0 ? (
        <p style={{ color: "var(--foreground-muted)", fontSize: "0.8125rem" }}>
          No data yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((entry, idx) => (
            <div
              key={entry.sku}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(255 255 255 / 0.03)",
                border: "1px solid rgba(255 255 255 / 0.06)",
                borderRadius: 10,
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: `${color}22`,
                    border: `1px solid ${color}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--foreground)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entry.product_name}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                    {entry.units_sold.toLocaleString()} units
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color }}>
                  {formatCurrency(entry.total_profit)}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                  {formatCurrency(entry.total_revenue)} rev
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BestWorstTable({ best, worst }: BestWorstTableProps) {
  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <SellerTable title="Best Sellers" entries={best}  variant="best"  />
      <SellerTable title="Worst Sellers" entries={worst} variant="worst" />
    </div>
  );
}
