import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client.
 *
 * Uses the SERVICE ROLE key when available so that serverless webhooks
 * (e.g. /api/inbound-email) can write to tables whose RLS policies only
 * allow authenticated reads. Falls back to the anon key, and finally
 * returns null when no env vars are configured.
 *
 * NEVER import this from client components — the service role key bypasses
 * every RLS policy and must not reach the browser. We belt-and-braces it
 * here by hard-failing if the key was accidentally exposed via a
 * NEXT_PUBLIC_-prefixed variable, and by refusing to run in any context
 * where `window` is defined.
 */

if (typeof window !== 'undefined') {
  throw new Error(
    'supabase-server.ts must never be imported from client code. ' +
      'It would expose the service-role key (which bypasses RLS) to the browser.',
  );
}

if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set. The service-role key ' +
      'must NEVER be exposed to the client. Remove the NEXT_PUBLIC_ prefix.',
  );
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;
let cachedAdmin: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (cached) return cached;
  if (!url) return null;
  const key = serviceKey || anonKey;
  if (!key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// Admin client — always uses the service-role key. Used by code paths that
// need to bypass RLS (e.g. the Word-VBA bridge inserting references without
// a signed-in user session). Callers must apply their own authorisation.
export function createAdminClient(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  if (!url || !serviceKey) {
    throw new Error(
      'createAdminClient() requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  cachedAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

// Per-request server client bound to the user's access token. Use this
// inside route handlers when you want RLS to apply as if the signed-in
// user had made the request directly.
export function createServerClient(accessToken?: string): SupabaseClient {
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  const key = accessToken ? anonKey : (serviceKey || anonKey);
  if (!key) throw new Error('No Supabase key available for createServerClient().');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

export function hasServiceRole(): boolean {
  return !!serviceKey;
}
