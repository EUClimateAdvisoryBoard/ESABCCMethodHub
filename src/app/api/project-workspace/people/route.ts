/**
 * GET /api/project-workspace/people
 * Returns all user profiles (id + display name) for the @mention picker
 * and for resolving comment author / verifier names. Any authenticated
 * user may read it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { listProfiles } from '@/lib/project-workspace/collaboration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  return NextResponse.json({ people: await listProfiles() });
}
