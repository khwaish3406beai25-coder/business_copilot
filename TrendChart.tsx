"use client";

/**
 * TrendChart — Recharts area chart showing weekly revenue + profit.
 *
 * Handles empty data gracefully (shows an empty-state message instead of crashing).
 * Aggregates per-product weekly summaries into per-week totals automatically.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { WeeklyProductSummary } from "@/types/analytics";
import { toChartData } from "@/types/analytics";

interface TrendChartProps {
  summaries: WeeklyProductSummary[];
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "rgba(13 13 20 / 0.92)",
        border: "1px solid rgba(255 255 255 / 0.10)",
        borderRadius: 10,
        padding: "10px 14px",
        backdropFilter: "blur(12px)",
        fontSize: "0.8125rem",
      }}
    >
      <p style={{ color: "var(--foreground-muted)", marginBottom: 6, fontWeight: 600 }}>
        {label}
      </p>
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (entry: any) => (
          <p key={entry.dataKey} style={{ color: entry.color, margin: "2px 0" }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        )
      )}
    </div>
  );
}

export function TrendChart({ summaries }: TrendChartProps) {
  const data = toChartData(summaries);

  if (data.length === 0) {
    return (
      <div
        style={{
          height: 240,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 8,
          color: "var(--foreground-muted)",
          fontSize: "0.875rem",
        }}
      >
        <span style={{ fontSize: "2rem", opacity: 0.4 }}>📈</span>
        <p>No trend data yet — upload a CSV to see your sales chart.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="hsl(255 82% 62%)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(255 82% 62%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="hsl(155 60% 55%)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(155 60% 55%)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255 255 255 / 0.05)"
          vertical={false}
        />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "hsl(0 0% 55%)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fontSize: 11, fill: "hsl(0 0% 55%)" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "0.8rem", color: "hsl(0 0% 60%)", paddingTop: 8 }}
        />

        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="hsl(255 82% 62%)"
          strokeWidth={2}
          fill="url(#colorRevenue)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="profit"
          name="Profit"
          stroke="hsl(155 60% 55%)"
          strokeWidth={2}
          fill="url(#colorProfit)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
