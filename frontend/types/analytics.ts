// TypeScript interfaces matching the backend response shapes

export interface WeeklyProductSummary {
  product_name: string;
  sku: string;
  iso_year: number;
  iso_week: number;
  week_start: string;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  margin_pct: number;
  units_sold: number;
  is_complete_week: boolean;
}

export interface SellerEntry {
  product_name: string;
  sku: string;
  total_profit: number;
  total_revenue: number;
  units_sold: number;
}

export interface BestWorstSellers {
  best: SellerEntry[];
  worst: SellerEntry[];
}

export interface AnalyticsSummaryResponse {
  weekly_summaries: WeeklyProductSummary[];
  best_worst: BestWorstSellers;
  total_revenue: number;
  total_profit: number;
  avg_margin_pct: number;
  has_data: boolean;
}

export interface DeclineSignal {
  product_name: string;
  sku: string;
  last_week_profit: number;
  baseline_profit: number;
  profit_change_pct: number;
  last_week_revenue: number;
  baseline_revenue: number;
  revenue_change_pct: number;
  last_week_units: number;
  baseline_units: number;
  last_week_label: string;
  last_week_unit_price_avg: number;
  baseline_unit_price_avg: number;
  possible_cause_hint: string;
}

export interface InsightResult {
  product_name: string;
  sku: string;
  what_changed: string;
  likely_causes: string[];
  next_actions: string[];
  is_fallback: boolean;
}

export interface DeclineWithInsight {
  signal: DeclineSignal;
  insight: InsightResult;
}

export interface DeclinesResponse {
  declines: DeclineWithInsight[];
  total_flagged: number;
  has_data: boolean;
}

export interface CSVUploadResponse {
  success: boolean;
  rows_inserted: number;
  products_upserted: number;
  errors: string[];
  message: string;
}

// ─── Chart Data ───────────────────────────────────────────────────────────────

export interface WeeklyChartPoint {
  week: string;        // "2024-W01"
  revenue: number;
  profit: number;
}

/** Aggregate weekly_summaries across all products into chart-friendly format */
export function toChartData(summaries: WeeklyProductSummary[]): WeeklyChartPoint[] {
  const byWeek = new Map<string, WeeklyChartPoint>();

  for (const s of summaries) {
    const key = `${s.iso_year}-W${String(s.iso_week).padStart(2, "0")}`;
    const existing = byWeek.get(key);
    if (existing) {
      existing.revenue += s.total_revenue;
      existing.profit  += s.total_profit;
    } else {
      byWeek.set(key, { week: key, revenue: s.total_revenue, profit: s.total_profit });
    }
  }

  return Array.from(byWeek.values())
    .sort((a, b) => a.week.localeCompare(b.week))
    .map(p => ({
      week:    p.week,
      revenue: Math.round(p.revenue * 100) / 100,
      profit:  Math.round(p.profit  * 100) / 100,
    }));
}
