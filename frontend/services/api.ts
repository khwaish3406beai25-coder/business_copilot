/**
 * API Service — fetch wrapper for all FastAPI calls
 *
 * All data fetching goes through this module, never directly to Supabase.
 * The Supabase JWT is automatically attached as the Authorization header.
 */

import { authAdapter } from "@/lib/authAdapter";
import type {
  AnalyticsSummaryResponse,
  DeclinesResponse,
  CSVUploadResponse,
} from "@/types/analytics";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Get the current Supabase access token to send with API requests.
 * Returns null if the user is not authenticated.
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await authAdapter.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Core fetch wrapper — attaches auth header and handles JSON.
 */
async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response;
}

/**
 * Typed API client — add methods here as endpoints are built.
 */
export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetchWithAuth(path);
    return res.json() as Promise<T>;
  },

  post: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetchWithAuth(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json() as Promise<T>;
  },

  postForm: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const error = await res
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  // ─── Typed API methods ────────────────────────────────────────────────────

  /** Upload a CSV file of sales data */
  uploadCSV: async (file: File): Promise<CSVUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return api.postForm<CSVUploadResponse>("/api/sales/upload", formData);
  },

  /** Get weekly analytics summary + best/worst sellers */
  getAnalyticsSummary: async (): Promise<AnalyticsSummaryResponse> => {
    return api.get<AnalyticsSummaryResponse>("/api/analytics/summary");
  },

  /** Get decline signals with AI explanations */
  getDeclines: async (): Promise<DeclinesResponse> => {
    return api.get<DeclinesResponse>("/api/analytics/declines");
  },
};
