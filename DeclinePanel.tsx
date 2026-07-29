"use client";

/**
 * DeclinePanel — expandable panel showing flagged products + AI explanations.
 *
 * Each card is collapsible. Handles empty state and AI fallback gracefully.
 */

import { useState } from "react";
import type { DeclineWithInsight } from "@/types/analytics";

interface DeclinePanelProps {
  declines: DeclineWithInsight[];
  isLoading?: boolean;
}

function CauseHintBadge({ hint }: { hint: string }) {
  const map: Record<string, { label: string; color: string }> = {
    cost_increase: { label: "Cost ↑",       color: "hsl(38 90% 60%)" },
    stockout:      { label: "Stockout",     color: "hsl(0 80% 65%)"  },
    price_drop:    { label: "Price ↓",     color: "hsl(210 80% 65%)" },
    volume_drop:   { label: "Volume ↓",    color: "hsl(280 70% 65%)" },
    unknown:       { label: "Unknown",     color: "hsl(0 0% 55%)"    },
  };
  const { label, color } = map[hint] ?? { label: hint, color: "hsl(0 0% 55%)" };

  return (
    <span
      style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        color,
        background: `${color}18`,
        border: `1px solid ${color}44`,
        borderRadius: 5,
        padding: "2px 7px",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function DeclineCard({ item }: { item: DeclineWithInsight }) {
  const [expanded, setExpanded] = useState(true);
  const { signal, insight } = item;

  const profitColor =
    signal.profit_change_pct < -30 ? "hsl(0 80% 65%)" : "hsl(38 90% 60%)";

  return (
    <div
      style={{
        background: "rgba(255 255 255 / 0.03)",
        border: "1px solid rgba(255 255 255 / 0.08)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Red indicator dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "hsl(0 80% 60%)",
            flexShrink: 0,
            boxShadow: "0 0 6px hsl(0 80% 60% / 0.6)",
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.9375rem",
                fontWeight: 700,
                color: "var(--foreground)",
              }}
            >
              {signal.product_name}
            </span>
            <CauseHintBadge hint={signal.possible_cause_hint} />
            {insight.is_fallback && (
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "hsl(38 70% 55%)",
                  background: "rgba(245 158 11 / 0.10)",
                  border: "1px solid rgba(245 158 11 / 0.25)",
                  borderRadius: 5,
                  padding: "2px 6px",
                }}
              >
                AI unavailable
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginTop: 3 }}>
            {signal.last_week_label} · Profit:{" "}
            <span style={{ color: profitColor, fontWeight: 600 }}>
              {signal.profit_change_pct > 0 ? "+" : ""}
              {signal.profit_change_pct.toFixed(1)}%
            </span>{" "}
            vs baseline ($
            {signal.baseline_profit.toLocaleString()} → $
            {signal.last_week_profit.toLocaleString()})
          </p>
        </div>

        {/* Chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            color: "var(--foreground-muted)",
            flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s ease",
          }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Expanded insight */}
      {expanded && (
        <div
          style={{
            padding: "0 18px 18px",
            borderTop: "1px solid rgba(255 255 255 / 0.06)",
            paddingTop: 16,
          }}
        >
          {/* What changed */}
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--foreground)",
              lineHeight: 1.6,
              marginBottom: 14,
            }}
          >
            {insight.what_changed}
          </p>

          {/* Causes */}
          <div style={{ marginBottom: 14 }}>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--foreground-muted)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Likely Causes
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {insight.likely_causes.map((cause, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    fontSize: "0.8125rem",
                    color: "var(--foreground-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      color: "hsl(38 90% 60%)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    •
                  </span>
                  {cause}
                </li>
              ))}
            </ul>
          </div>

          {/* Next actions */}
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--foreground-muted)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Recommended Actions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {insight.next_actions.map((action, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "10px 12px",
                    background: "rgba(139 92 246 / 0.08)",
                    border: "1px solid rgba(139 92 246 / 0.18)",
                    borderRadius: 9,
                    fontSize: "0.8125rem",
                    color: "var(--foreground)",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      color: "hsl(255 82% 70%)",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}.
                  </span>
                  {action}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeclinePanel({ declines, isLoading }: DeclinePanelProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "var(--foreground-muted)",
          fontSize: "0.875rem",
          padding: "24px 0",
        }}
      >
        <div className="spinner" />
        Analysing declines with AI…
      </div>
    );
  }

  if (declines.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "32px 0",
          color: "var(--foreground-muted)",
          fontSize: "0.875rem",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "2rem" }}>✅</span>
        <p style={{ fontWeight: 600, color: "var(--foreground)" }}>No declines detected</p>
        <p style={{ opacity: 0.7 }}>All products are performing within normal ranges.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {declines.map((item) => (
        <DeclineCard key={item.signal.sku} item={item} />
      ))}
    </div>
  );
}
