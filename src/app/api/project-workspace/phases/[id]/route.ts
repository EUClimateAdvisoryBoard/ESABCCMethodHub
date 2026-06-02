/**
 * Project Workspace phases — item endpoint.
 *
 *   PATCH  /api/project-workspace/phases/[id]   → update fields
 *   DELETE /api/project-workspace/phases/[id]   → delete a phase
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { mapPhase } from '@/lib/project-workspace/phases';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.startDate === 'string') patch.start_date = body.startDate;
  if (typeof body.endDate === 'string') patch.end_date = body.endDate;
  if (typeof body.color === 'string') patch.color = body.color;
  if (typeof body.description === 'string') patch.description = body.description;
  if (typeof body.sortOrder === 'number') patch.sort_order = body.sortOrder;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no editable fields supplied' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('pw_project_phases')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'update failed' }, { status: 400 });
  }
  return NextResponse.json({ phase: mapPhase(data) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { error } = await sb.from('pw_project_phases').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
