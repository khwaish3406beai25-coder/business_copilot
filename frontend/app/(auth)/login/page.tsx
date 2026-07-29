"use client";

/**
 * Login page — demo credentials authentication.
 *
 * Credentials: zyx@gmail.com / xyz
 *
 * Flow:
 *   1. User submits email + password.
 *   2. useAuth().signIn() validates credentials via the active auth adapter.
 *   3. On success → session stored in localStorage → router.push("/dashboard").
 *   4. On failure → red "Invalid email or password." alert.
 *
 * This page has no direct dependency on Supabase or mockAuth — it only
 * calls useAuth().signIn(), so swapping the auth backend is transparent.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthAlert } from "@/components/auth/AuthAlert";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Already authenticated → go to dashboard
  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, sessionLoading, router]);

  // ─── Client-side field validation ────────────────────────────────────────
  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!email.trim()) errs.email = "Email is required.";
    if (!password) errs.password = "Password is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        setAuthError(error.message);
        return;
      }
      router.push("/dashboard");
    } catch {
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // While initial session is resolving, show the form anyway — the
  // useEffect above handles redirect if a valid session is found.


  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your BusinessPilot account"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {authError && <AuthAlert type="error" message={authError} />}

        <AuthInput
          id="login-email"
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          placeholder="zyx@gmail.com"
          autoComplete="email"
          disabled={isLoading}
        />

        <AuthInput
          id="login-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isLoading}
        />

        <AuthButton isLoading={isLoading} type="submit">
          Sign in
        </AuthButton>

        {/* Demo credentials hint */}
        <p
          style={{
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "var(--foreground-muted)",
            marginTop: -4,
            padding: "8px 12px",
            background: "rgba(255 255 255 / 0.03)",
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
          }}
        >
          Demo — use{" "}
          <span style={{ color: "var(--foreground)", fontWeight: 500 }}>
            zyx@gmail.com
          </span>{" "}
          /{" "}
          <span style={{ color: "var(--foreground)", fontWeight: 500 }}>
            xyz
          </span>
        </p>
      </form>
    </AuthCard>
  );
}
