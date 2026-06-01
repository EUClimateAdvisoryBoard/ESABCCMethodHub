/**
 * POST /api/project-workspace/admin/reseed?project=policy-gap-2-0
 *
 * Forces the ECNO indicator seed pass against the requested project and
 * reports the resulting row count. Used when the lazy on-page-render
 * seeder hasn't fired (cold project, no traffic yet) or when its first
 * pass silently failed and we want a deliberate retry whose error path
 * is visible in the response.
 *
 * The route uses the server-side Supabase client, which is configured
 * with the service-role key in deployment — RLS is bypassed, so the
 * insert succeeds regardless of the caller's session. To prevent random
 * traffic from triggering reseeds we still gate it behind the standard
 * `Authorization: Bearer <jwt>` header that every other workspace
 * endpoint expects.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { reseedFor } from '@/lib/project-workspace/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function POST(req: NextRequest) {
  if (!token(req)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  const project = req.nextUrl.searchParams.get('project') ?? 'policy-gap-2-0';

  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json(
      { error: 'Supabase is not configured on this deploy.' },
      { status: 500 }
    );
  }

  // Snapshot before/after so the caller can verify the reseed actually
  // inserted something.
  const before = await sb
    .from('pw_indicators')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project);

  try {
    await reseedFor(project);
  } catch (e) {
    return NextResponse.json(
      { error: 'reseed threw', message: (e as Error).message },
      { status: 500 }
    );
  }

  const after = await sb
    .from('pw_indicators')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project);

  return NextResponse.json({
    ok: true,
    project,
    before: before.count ?? null,
    after: after.count ?? null,
    delta: (after.count ?? 0) - (before.count ?? 0),
  });
}
