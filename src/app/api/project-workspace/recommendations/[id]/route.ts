import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

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
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const k of ['title', 'summary', 'status', 'area']) {
    if (k in body) patch[k] = body[k];
  }
  // Sector tags (array column). Coerced to an array so a null clears them.
  if ('tags' in body) patch.tags = Array.isArray(body.tags) ? body.tags : [];
  // Report label fields (camelCase in the API → snake_case columns).
  const reportFields: Record<string, string> = {
    reportId: 'report_id',
    reportLabel: 'report_label',
    reportUrl: 'report_url',
  };
  for (const [key, col] of Object.entries(reportFields)) {
    if (key in body) patch[col] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no fields' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('pw_recommendations')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ recommendation: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { error } = await sb.from('pw_recommendations').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
