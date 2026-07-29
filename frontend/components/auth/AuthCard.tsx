"use client";

/**
 * AuthCard — glassmorphism container used by all auth pages.
 *
 * Props:
 *   title    — Page heading (h1)
 *   subtitle — Muted sub-heading below the title
 *   children — Form content
 */

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div
      className="glass-card animate-fade-up w-full max-w-md p-8 md:p-10"
      style={{ width: "100%", maxWidth: "440px" }}
    >
      {/* Logo mark */}
      <div className="flex items-center gap-2.5 mb-8">
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background:
              "linear-gradient(135deg, hsl(255 82% 62%), hsl(280 70% 55%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {/* Minimal "B" mark */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 3h5a2.5 2.5 0 0 1 0 5H4V3zM4 8h5.5a2.5 2.5 0 0 1 0 5H4V8z"
              fill="white"
            />
          </svg>
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.9375rem",
            color: "var(--foreground)",
            letterSpacing: "-0.01em",
          }}
        >
          BusinessPilot
        </span>
      </div>

      {/* Headings */}
      <div className="mb-6">
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--foreground)",
            letterSpacing: "-0.02em",
            marginBottom: subtitle ? 6 : 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: "0.9rem", color: "var(--foreground-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}
