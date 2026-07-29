/**
 * Auth Callback — disabled in MVP/prototype mode.
 * Supabase uses this route for email confirmation and password-reset redirects.
 * Redirected to /login. Restore the full implementation when re-enabling Supabase Auth.
 */

import { redirect } from "next/navigation";

export default function AuthCallbackPage() {
  redirect("/login");
}
