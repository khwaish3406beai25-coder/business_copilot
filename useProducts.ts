/**
 * useProducts — fetches product performance data.
 * Implemented in Phase 3.
 */
import { useState } from "react";
import type { Product } from "@/types";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TODO (Phase 3): fetch /api/products
  return { products, isLoading, error };
}
