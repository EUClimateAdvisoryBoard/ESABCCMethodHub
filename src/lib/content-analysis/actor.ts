/**
 * Acting-user resolution for content-analysis write routes.
 * ---------------------------------------------------------
 * The content-analysis store writes through the SERVICE ROLE (its tables only
 * carry public-read RLS), so Postgres never sees who made a change. These
 * helpers close that gap: each write route resolves the signed-in user from
 * the request's bearer token and the store stamps their id onto the row
 * (`author_id` / `added_by` / `updated_by`), which is what the activity-log
 * triggers (migration 068) read to attribute the change to a person.
 *
 * Writes REQUIRE a signed-in user — anonymous visitors can read the
 * workspace, but every change must be tied to an account.
 */
import 'server-only';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export interface Actor {
  id: string;
}

/**
 * The signed-in user behind a request, or null (no/invalid token, or Supabase
 * not configured — local dev still works, writes just go unattributed there).
 */
export async function resolveActor(req: NextRequest): Promise<Actor | null> {
  const h = req.headers.get('authorization');
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try {
    const { data } = await createServerClient(token).auth.getUser();
    return data?.user ? { id: data.user.id } : null;
  } catch {
    return null;
  }
}

/** True when writes must be rejected for anonymous callers — i.e. Supabase is
 *  configured (production). Without a database there are no accounts to check
 *  against, so local dev / preview stays usable. */
export function actorRequired(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL;
}
