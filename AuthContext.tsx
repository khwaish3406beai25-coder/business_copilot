/**
 * AuthContext — single source of truth for the authenticated session.
 *
 * Wraps the entire app (see app/layout.tsx).
 * Any component can call `useAuth()` to read the current user/session
 * and to call `signIn()` / `signOut()`.
 *
 * Auth backend is injected via lib/authAdapter.ts — swapping providers
 * (e.g., mock → Supabase) requires no changes here.
 *
 * Session lifecycle:
 *   1. On mount: reads persisted session via authAdapter.getSession().
 *   2. Subscribes to authAdapter.onAuthStateChange() for state sync.
 *   3. signIn() / signOut() manually update state for adapters that don't
 *      emit real-time events (e.g., mock auth).
 *   4. Cleans up the subscription on unmount.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authAdapter } from "@/lib/authAdapter";
import type { AuthUser, AuthSession } from "@/lib/authAdapter";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** The authenticated user, or null if not signed in. */
  user: AuthUser | null;
  /** The active session (contains access_token), or null. */
  session: AuthSession | null;
  /**
   * True while the initial session is being read from storage.
   * Use this to prevent a "flash" of the login page on protected routes.
   */
  isLoading: boolean;
  /**
   * Attempt to sign in with email and password.
   * Returns { error } — error is null on success, { message } on failure.
   */
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: { message: string } | null }>;
  /** Signs the user out and clears the session from storage. */
  signOut: () => Promise<void>;
}

// ─── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Hydrate from persisted storage immediately.
    authAdapter.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 2. Subscribe to auth state changes.
    const {
      data: { subscription },
    } = authAdapter.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 3. Cleanup subscription on unmount.
    return () => subscription.unsubscribe();
  }, []);

  // ── signIn ────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await authAdapter.signInWithPassword({
        email,
        password,
      });
      if (!error && data.session && data.user) {
        // Manually sync state for adapters without real-time events (mock mode).
        setSession(data.session as AuthSession);
        setUser(data.user as AuthUser);
      }
      return { error: error as { message: string } | null };
    },
    []
  );

  // ── signOut ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await authAdapter.signOut();
    // Manually clear state (mock adapter doesn't emit events after signOut).
    setSession(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook to read the current auth state.
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return ctx;
}
