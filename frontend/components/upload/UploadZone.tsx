"use client";

/**
 * UploadZone — drag-and-drop CSV upload component.
 *
 * Features:
 * - Drag-and-drop target with visual feedback
 * - Click-to-browse file picker fallback
 * - Shows required columns
 * - Upload progress state
 * - Success / error feedback with details
 */

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import type { CSVUploadResponse } from "@/types/analytics";

interface UploadZoneProps {
  onUpload: (file: File) => Promise<CSVUploadResponse>;
  onSuccess?: (result: CSVUploadResponse) => void;
}

const REQUIRED_COLUMNS = [
  "product_name",
  "sku",
  "sale_date",
  "quantity",
  "unit_price",
  "unit_cost",
];

export function UploadZone({ onUpload, onSuccess }: UploadZoneProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<CSVUploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only .csv files are accepted.");
      return;
    }

    setIsUploading(true);
    setResult(null);
    setUploadError(null);

    try {
      const res = await onUpload(file);
      setResult(res);
      if (res.success && onSuccess) onSuccess(res);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = "";
  }

  const borderColor = isDragging
    ? "hsl(255 82% 62%)"
    : "rgba(255 255 255 / 0.12)";
  const bgColor = isDragging
    ? "rgba(139 92 246 / 0.08)"
    : "rgba(255 255 255 / 0.02)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Drop Zone */}
      <div
        id="csv-upload-zone"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 16,
          background: bgColor,
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          cursor: isUploading ? "not-allowed" : "pointer",
          transition: "border-color 0.15s ease, background 0.15s ease",
          textAlign: "center",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={onInputChange}
        />

        {isUploading ? (
          <>
            <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            <p style={{ color: "var(--foreground-muted)", fontSize: "0.9rem" }}>
              Uploading…
            </p>
          </>
        ) : (
          <>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(139 92 246 / 0.15)",
                border: "1px solid rgba(139 92 246 / 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
              }}
            >
              📂
            </div>
            <div>
              <p
                style={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: "var(--foreground)",
                  marginBottom: 4,
                }}
              >
                {isDragging ? "Drop your CSV here" : "Drag & drop your CSV file"}
              </p>
              <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)" }}>
                or{" "}
                <span
                  style={{
                    color: "hsl(255 82% 70%)",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  click to browse
                </span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Required columns hint */}
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(255 255 255 / 0.025)",
          border: "1px solid rgba(255 255 255 / 0.07)",
          borderRadius: 10,
          fontSize: "0.8rem",
          color: "var(--foreground-muted)",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
          Required columns:{" "}
        </span>
        {REQUIRED_COLUMNS.join(", ")}
        <span style={{ marginLeft: 6, opacity: 0.7 }}>
          · Dates in YYYY-MM-DD format
        </span>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="auth-alert-error">
          <strong>Upload failed:</strong> {uploadError}
        </div>
      )}

      {/* Success result */}
      {result && (
        <div
          className={result.success ? "auth-alert-success" : "auth-alert-error"}
        >
          <p style={{ fontWeight: 600, marginBottom: 4 }}>
            {result.success ? "✅ Upload successful" : "⚠️ Upload failed"}
          </p>
          <p style={{ fontSize: "0.8125rem" }}>{result.message}</p>
          {result.errors.length > 0 && (
            <ul
              style={{
                marginTop: 8,
                paddingLeft: 16,
                fontSize: "0.8rem",
                opacity: 0.9,
              }}
            >
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
