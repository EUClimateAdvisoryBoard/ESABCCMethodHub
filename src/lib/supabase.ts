/**
 * Browser-side Supabase client.
 * -----------------------------
 * One singleton per tab, initialised from the public env vars
 * `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 *
 * Returns `null` when the env vars are missing (SSR prerender, CI
 * build without a backing Supabase, or a self-hosted EEA Postgres
 * deployment where we do not use Supabase at all). Every caller
 * handles the `null` case by falling back to an in-memory / local
 * path, so the app still boots on a freshly-cloned developer
 * machine before any `.env.local` has been filled in.
 *
 * Server-side callers must use `supabase-server.ts` instead — it
 * honours the service-role key and bypasses RLS where appropriate.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create the client when env vars are set — avoids crash during build
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
