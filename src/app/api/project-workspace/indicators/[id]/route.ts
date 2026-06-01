import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  recordIndicatorRevision,
  snapshotIndicator,
} from '@/lib/project-workspace/indicator-revisions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const allowed = [
    'name', 'category', 'unit', 'description', 'source',
    'direction', 'target_value', 'target_year',
  ];
  for (const k of allowed) if (k in body) patch[k] = body[k];
  if ('sourceUrl' in body) patch.source_url = body.sourceUrl;
  if ('targetValue' in body) patch.target_value = body.targetValue;
  if ('targetYear' in body) patch.target_year = body.targetYear;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no fields' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('pw_indicators')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await recordIndicatorRevision(sb, {
    indicatorId: params.id,
    action: 'metadata',
    summary: `Edited details (${Object.keys(patch).join(', ')})`,
    user: u.user,
  });

  return NextResponse.json({ indicator: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  // Refuse to delete seed indicators.
  const { data: row } = await sb
    .from('pw_indicators')
    .select('is_seed, project_id')
    .eq('id', params.id)
    .maybeSingle();
  if (row?.is_seed) {
    return NextResponse.json({ error: 'seed indicator cannot be deleted' }, { status: 400 });
  }

  // Snapshot the final state *before* the row is gone, so the archive keeps a
  // restore point for the deleted indicator (the revisions table has no FK to
  // pw_indicators, so the row survives the delete).
  const finalSnapshot = await snapshotIndicator(sb, params.id);

  const { error } = await sb.from('pw_indicators').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await recordIndicatorRevision(sb, {
    indicatorId: params.id,
    projectId: (row?.project_id as string | undefined) ?? undefined,
    action: 'delete',
    summary: finalSnapshot?.metadata?.name
      ? `Deleted “${finalSnapshot.metadata.name}”`
      : 'Deleted indicator',
    user: u.user,
    snapshot: finalSnapshot,
  });

  return NextResponse.json({ ok: true });
}
