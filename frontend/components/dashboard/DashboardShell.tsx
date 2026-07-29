"use client";

/**
 * DashboardShell — the client-side portion of the dashboard layout.
 *
 * Kept in a separate file so that app/(dashboard)/layout.tsx itself can be
 * a Server Component (required for Next.js App Router to properly render
 * the page tree). All hooks (useAuth, useRouter, useState) live here.
 */

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/upload",    label: "Upload CSV", icon: "⬆️"  },
  { href: "/products",  label: "Products",   icon: "📦"  },
  { href: "/inventory", label: "Inventory",  icon: "🗃️"  },
  { href: "/forecast",  label: "Forecast",   icon: "📈"  },
  { href: "/reports",   label: "Reports",    icon: "📋"  },
  { href: "/chat",      label: "AI Chat",    icon: "🤖"  },
];

function Sidebar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    router.replace("/login");
  }

  return (
    <aside
      style={{
        width: 240,
        borderRight: "1px solid var(--glass-border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 12px",
        background: "rgba(255 255 255 / 0.02)",
        minHeight: "100dvh",
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingLeft: 10,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background:
              "linear-gradient(135deg, hsl(255 82% 62%), hsl(280 70% 55%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 3h5a2.5 2.5 0 0 1 0 5H4V3zM4 8h5.5a2.5 2.5 0 0 1 0 5H4V8z"
              fill="white"
            />
          </svg>
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.9rem",
            color: "var(--foreground)",
            letterSpacing: "-0.01em",
          }}
        >
          BusinessPilot
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <li key={href}>
                <a
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: "0.875rem",
                    color: isActive ? "var(--foreground)" : "var(--foreground-muted)",
                    textDecoration: "none",
                    background: isActive ? "rgba(139 92 246 / 0.12)" : "transparent",
                    border: isActive ? "1px solid rgba(139 92 246 / 0.20)" : "1px solid transparent",
                    transition: "background 0.12s ease, color 0.12s ease",
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255 255 255 / 0.06)";
                      e.currentTarget.style.color = "var(--foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--foreground-muted)";
                    }
                  }}
                >
                  <span style={{ fontSize: "1rem" }}>{icon}</span>
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div
        style={{
          borderTop: "1px solid var(--glass-border)",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {user?.email && (
          <div
            style={{
              padding: "6px 10px",
              fontSize: "0.75rem",
              color: "var(--foreground-muted)",
              wordBreak: "break-all",
            }}
          >
            {user.email}
          </div>
        )}

        <button
          id="logout-btn"
          onClick={handleSignOut}
          disabled={isSigningOut}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "var(--foreground-muted)",
            fontSize: "0.875rem",
            cursor: isSigningOut ? "not-allowed" : "pointer",
            opacity: isSigningOut ? 0.5 : 1,
            transition: "background 0.12s ease, color 0.12s ease",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            if (!isSigningOut) {
              e.currentTarget.style.background = "rgba(239 68 68 / 0.08)";
              e.currentTarget.style.color = "hsl(0 80% 70%)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--foreground-muted)";
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 10l3-3-3-3M13 7H6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div style={{ display: "flex", minHeight: "100dvh" }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
