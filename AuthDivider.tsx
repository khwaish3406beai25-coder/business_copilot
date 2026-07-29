"use client";

/**
 * AuthDivider — horizontal separator with optional center label.
 * Usage: <AuthDivider label="or continue with" />
 */

interface AuthDividerProps {
  label?: string;
}

export function AuthDivider({ label = "or" }: AuthDividerProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "4px 0",
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background: "var(--glass-border)",
        }}
      />
      {label && (
        <span
          style={{
            fontSize: "0.8125rem",
            color: "var(--foreground-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
      <div
        style={{
          flex: 1,
          height: 1,
          background: "var(--glass-border)",
        }}
      />
    </div>
  );
}
