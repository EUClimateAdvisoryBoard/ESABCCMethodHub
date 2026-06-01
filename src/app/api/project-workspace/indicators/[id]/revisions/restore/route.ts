/**
 * POST /api/project-workspace/indicators/[id]/revisions/restore
 *   body: { revisionId: number }
 *
 * Restores the indicator to a previously-archived version: writes that
 * revision's snapshot (metadata + plotted series + calc-grid layout) back onto
 * the live indicator, then records a new `restore` revision so the act of
 * reverting is itself logged (who / when).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  applySnapshot,
  getIndicatorRevision,
  recordIndicatorRevision,
} from '@/lib/project-workspace/indicator-revisions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const id = params.id;
  const { revisionId } = (await req.json().catch(() => ({}))) as { revisionId?: number };
  if (typeof revisionId !== 'number') {
    return NextResponse.json({ error: 'revisionId required' }, { status: 400 });
  }

  // Confirm the indicator still exists (RLS-scoped); restoring a deleted
  // indicator's snapshot would need a re-create, which is out of scope here.
  const { data: row } = await sb
    .from('pw_indicators')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json(
      { error: 'indicator no longer exists; cannot restore in place' },
      { status: 404 }
    );
  }

  const revision = await getIndicatorRevision(sb, id, revisionId);
  if (!revision) return NextResponse.json({ error: 'revision not found' }, { status: 404 });
  if (!revision.snapshot) {
    return NextResponse.json({ error: 'revision has no archived snapshot' }, { status: 400 });
  }

  const { error } = await applySnapshot(sb, id, revision.snapshot, u.user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });

  await recordIndicatorRevision(sb, {
    indicatorId: id,
    action: 'restore',
    summary: `Restored to the version from ${new Date(revision.changedAt).toISOString().slice(0, 16).replace('T', ' ')} (#${revision.id})`,
    user: u.user,
  });

  // Return the restored series so the client can re-render immediately.
  const { data: points } = await sb
    .from('pw_indicator_points')
    .select('year, value')
    .eq('indicator_id', id)
    .order('year', { ascending: true });

  return NextResponse.json({ ok: true, points: points ?? [] });
}
