/**
 * Shared TypeScript Types
 *
 * All shared interfaces and types used across the frontend are defined here.
 * Import from "@/types" throughout the app.
 *
 * Types are added here as features are built in subsequent phases.
 *
 * Naming convention:
 *   - Entities (DB rows):    Product, Sale, InventoryItem, Business
 *   - API responses:         KPIData, TrendData, InsightData, ForecastData
 *   - UI state:              LoadingState, ErrorState
 */

// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
}

export interface Business {
  id: string;
  userId: string;
  name: string;
  currency: string;
  createdAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface KPIData {
  totalRevenue: number;
  totalProfit: number;
  totalUnitsSold: number;
  profitMargin: number;
  revenueChange: number; // % vs previous period
  profitChange: number;
}

export interface TrendDataPoint {
  date: string;
  revenue: number;
  profit: number;
  unitsSold: number;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  name: string;
  category?: string;
  revenue: number;
  profit: number;
  unitsSold: number;
  profitMargin: number;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  productName: string;
  category?: string;
  stockQuantity: number;
  reorderLevel: number;
  unitCost?: number;
  isLowStock: boolean;
  updatedAt: string;
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

export interface InsightData {
  type: "weekly_summary" | "decline_reason" | "slow_movers" | "recommendations";
  content: string;
  generatedAt: string;
}

// ─── Forecasting ──────────────────────────────────────────────────────────────

export interface ForecastDataPoint {
  date: string;
  predictedQuantity: number;
  productName: string;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface CSVUpload {
  id: string;
  filename: string;
  rowCount: number;
  status: "pending" | "processing" | "done" | "error";
  errorMsg?: string;
  uploadedAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export type Period = "7d" | "30d" | "90d" | "1y";

export interface ApiError {
  detail: string;
}
