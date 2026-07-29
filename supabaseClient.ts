/**
 * Supabase Browser Client
 *
 * Used ONLY for authentication on the frontend (login, signup, session management).
 * The frontend NEVER directly queries Supabase tables — all data goes through FastAPI.
 *
 * Architecture:
 *   Frontend → FastAPI → Supabase (data)
 *   Frontend ↔ Supabase Auth (session/JWT only)
 *
 * The Supabase anon key is safe to expose in the browser.
 * The service role key lives ONLY in the backend .env and is never sent here.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Copy frontend/.env.local.example to frontend/.env.local and fill in your credentials."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
