/**
 * useForecasting — fetches demand forecast data from FastAPI.
 * Implemented in Phase 5.
 */
import { useState } from "react";
import type { ForecastDataPoint } from "@/types";

export function useForecasting(forecastDays: number = 30) {
  const [forecasts, setForecasts] = useState<ForecastDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TODO (Phase 5): fetch /api/forecast/demand?days=...
  return { forecasts, isLoading, error };
}
