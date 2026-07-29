/**
 * useInventory — fetches inventory list and low-stock alerts.
 * Implemented in Phase 3 (Dashboard & Analytics).
 */

import { useState } from "react";
import type { InventoryItem } from "@/types";

interface UseInventoryReturn {
  inventory: InventoryItem[];
  alerts: InventoryItem[];
  isLoading: boolean;
  error: string | null;
}

export function useInventory(): UseInventoryReturn {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO (Phase 3): Implement fetch from /api/inventory and /api/inventory/alerts

  return { inventory, alerts, isLoading, error };
}
