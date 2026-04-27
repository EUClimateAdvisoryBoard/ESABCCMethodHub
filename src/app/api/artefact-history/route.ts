import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest) {
  const a = req.headers.get('authorization');
  return a?.startsWith('Bearer ') ? a.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind');
  const id = req.nextUrl.searchParams.get('id');
  if (!kind || !id) return NextResponse.json({ entries: [] });
  const t = token(req);
  if (!t) return NextResponse.json({ entries: [] });
  const sb = createServerClient(t);
  const { data } = await sb
    .from('artefact_history')
    .select('id, artefact_kind, artefact_id, user_id, reason, before, after, created_at')
    .eq('artefact_kind', kind)
    .eq('artefact_id', id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (!data) return NextResponse.json({ entries: [] });
  const userIds = Array.from(new Set(data.map(d => d.user_id).filter(Boolean) as string[]));
  let displayMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: profs } = await sb.from('profiles').select('id, display_name').in('id', userIds);
    displayMap = Object.fromEntries((profs || []).map(p => [p.id, p.display_name || 'Anonymous']));
  }
  return NextResponse.json({
    entries: data.map(e => ({ ...e, display_name: e.user_id ? (displayMap[e.user_id] || 'Anonymous') : 'System' })),
  });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    artefact_kind?: string;
    artefact_id?: string;
    reason?: string;
    before?: unknown;
    after?: unknown;
  };
  if (!body.artefact_kind || !body.artefact_id) return NextResponse.json({ error: 'artefact_kind + artefact_id required' }, { status: 400 });

  const { data, error } = await sb
    .from('artefact_history')
    .insert({
      artefact_kind: body.artefact_kind,
      artefact_id: body.artefact_id,
      user_id: u.user.id,
      reason: (body.reason || '').slice(0, 280),
      before: body.before ?? {},
      after: body.after ?? {},
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ entry: data });
}
