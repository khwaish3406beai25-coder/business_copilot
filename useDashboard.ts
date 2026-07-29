/**
 * useDashboard — fetches KPIs and trend data from the FastAPI backend.
 * Implemented in Phase 3 (Dashboard & Analytics).
 */

import { useState, useEffect } from "react";
import type { KPIData, TrendDataPoint, Period } from "@/types";

interface UseDashboardReturn {
  kpis: KPIData | null;
  trends: TrendDataPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(period: Period = "30d"): UseDashboardReturn {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    // TODO (Phase 3): Call api.get("/dashboard/kpis?period=...") and api.get("/dashboard/trends?period=...")
  };

  useEffect(() => {
    refetch();
  }, [period]);

  return { kpis, trends, isLoading, error, refetch };
}
