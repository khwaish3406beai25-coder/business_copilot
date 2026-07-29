/**
 * Forgot Password — disabled in MVP/prototype mode.
 * Redirected to /login. Restore this page when re-enabling Supabase Auth.
 */

import { redirect } from "next/navigation";

export default function ForgotPasswordPage() {
  redirect("/login");
}
