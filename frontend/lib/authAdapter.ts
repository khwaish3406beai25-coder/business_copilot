/**
 * Auth Adapter — the single file that controls which auth backend is active.
 *
 * ─── Currently: Mock Auth (MVP / prototype mode) ──────────────────────────
 * Credentials:  zyx@gmail.com / xyz
 * Session:      localStorage key "bp_mock_session"
 * No network calls. No Supabase dependency.
 *
 * ─── To switch back to Supabase Auth ─────────────────────────────────────
 * 1. Comment out the "Mock Auth" block below.
 * 2. Uncomment the "Supabase Auth" block.
 * 3. Restore app/(auth)/signup, app/(auth)/forgot-password, app/auth/callback.
 * 4. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 *
 * AuthContext, ProtectedRoute, services/api.ts, and all components need
 * NO changes when swapping — only this file.
 */

// ── Mock Auth (active) ─────────────────────────────────────────────────────
export { mockAuth as authAdapter } from "./mockAuth";
export type { MockUser as AuthUser, MockSession as AuthSession } from "./mockAuth";

// ── Supabase Auth (inactive — uncomment to re-enable) ─────────────────────
// import { supabase } from "./supabaseClient";
// export const authAdapter = supabase.auth;
// export type { User as AuthUser, Session as AuthSession } from "@supabase/supabase-js";
