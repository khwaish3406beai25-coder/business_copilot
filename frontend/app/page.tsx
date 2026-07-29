"use client";

/**
 * Root page (/) — smart redirect.
 *
 * - While session is loading → shows a centred spinner.
 * - Session found → redirects to /dashboard.
 * - No session → redirects to /login.
 *
 * This means `/` is never a "landing page" — it purely routes the user
 * to the right place based on auth state.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  // Show a centred branded spinner while resolving
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "var(--background)",
      }}
    >
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
        Loading BusinessPilot…
      </p>
    </div>
  );
}
