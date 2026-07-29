"use client";

/**
 * Upload page — inside the dashboard layout so it is protected by auth.
 *
 * On successful upload the user is redirected to the dashboard so they can
 * immediately see their new data reflected in the KPI cards and charts.
 */

import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { UploadZone } from "@/components/upload/UploadZone";
import type { CSVUploadResponse } from "@/types/analytics";

export default function UploadPage() {
  const router = useRouter();

  async function handleUpload(file: File): Promise<CSVUploadResponse> {
    return api.uploadCSV(file);
  }

  function handleSuccess() {
    // Give the user a moment to read the success message, then redirect
    setTimeout(() => router.push("/dashboard"), 1800);
  }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: 0,
            color: "var(--foreground)",
          }}
        >
          Upload Sales Data
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--foreground-muted)",
            marginTop: 6,
            lineHeight: 1.6,
          }}
        >
          Upload a CSV file to populate your dashboard with revenue, profit, and
          margin analytics. The AI engine will automatically detect performance
          declines and generate explanations.
        </p>
      </div>

      {/* ── Upload zone ──────────────────────────────────────────────────── */}
      <UploadZone onUpload={handleUpload} onSuccess={handleSuccess} />

      {/* ── Format guide ─────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 28,
          background: "rgba(255 255 255 / 0.02)",
          border: "1px solid rgba(255 255 255 / 0.06)",
          borderRadius: 14,
          padding: "20px 22px",
        }}
      >
        <h2
          style={{
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>📋</span> CSV Format Guide
        </h2>

        <div
          style={{
            overflowX: "auto",
            fontSize: "0.8rem",
            borderRadius: 8,
            border: "1px solid rgba(255 255 255 / 0.06)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 480,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "rgba(255 255 255 / 0.04)",
                  borderBottom: "1px solid rgba(255 255 255 / 0.07)",
                }}
              >
                {["Column", "Type", "Example", "Notes"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "var(--foreground-muted)",
                      letterSpacing: "0.04em",
                      fontSize: "0.73rem",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["product_name", "text", "Blue Widget", "Full product name"],
                ["sku", "text", "BW-001", "Unique product code"],
                ["sale_date", "date", "2024-03-15", "YYYY-MM-DD format"],
                ["quantity", "integer", "12", "Units sold"],
                ["unit_price", "decimal", "29.99", "Sale price per unit"],
                ["unit_cost", "decimal", "14.50", "Cost per unit"],
              ].map(([col, type, ex, note], i) => (
                <tr
                  key={col}
                  style={{
                    borderBottom:
                      i < 5 ? "1px solid rgba(255 255 255 / 0.04)" : "none",
                  }}
                >
                  <td
                    style={{
                      padding: "9px 12px",
                      fontWeight: 600,
                      color: "hsl(255 82% 72%)",
                      fontFamily: "monospace",
                      fontSize: "0.82rem",
                    }}
                  >
                    {col}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: "var(--foreground-muted)",
                    }}
                  >
                    {type}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: "var(--foreground)",
                      fontFamily: "monospace",
                      fontSize: "0.82rem",
                    }}
                  >
                    {ex}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: "var(--foreground-muted)",
                    }}
                  >
                    {note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p
          style={{
            marginTop: 12,
            fontSize: "0.78rem",
            color: "var(--foreground-muted)",
            opacity: 0.8,
          }}
        >
          The first row must be a header row with these exact column names.
          Additional columns are ignored. Rows with missing required fields are
          skipped and reported in the upload summary.
        </p>
      </div>
    </div>
  );
}
