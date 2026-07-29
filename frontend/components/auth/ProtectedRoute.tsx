"use client";

/**
 * ProtectedRoute — guards any subtree against unauthenticated access.
 *
 * Behaviour:
 *   1. While session is loading → renders a full-screen spinner (prevents
 *      the flash where the user briefly sees the login page on refresh).
 *   2. No session → router.replace("/login") and renders nothing.
 *   3. Session present → renders children normally.
 *
 * Usage (in dashboard layout):
 *   <ProtectedRoute>{children}</ProtectedRoute>
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // ── Loading state: centred spinner while session hydrates ───────────────
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
        }}
        aria-label="Checking authentication…"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Large brand spinner */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "3px solid rgba(139 92 246 / 0.2)",
              borderTopColor: "hsl(255 82% 62%)",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <p style={{ color: "var(--foreground-muted)", fontSize: "0.875rem" }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  // ── Not authed: render nothing (redirect fires in useEffect) ────────────
  if (!user) {
    return null;
  }

  // ── Authenticated ───────────────────────────────────────────────────────
  return <>{children}</>;
}
