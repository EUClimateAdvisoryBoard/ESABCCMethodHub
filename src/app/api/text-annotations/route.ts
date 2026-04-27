import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest) {
  const a = req.headers.get('authorization');
  return a?.startsWith('Bearer ') ? a.slice(7) : null;
}

const KINDS = new Set(['news', 'policy_article', 'reference_abstract']);

export async function GET(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ items: [] });
  const sb = createServerClient(t);
  const hostKind = req.nextUrl.searchParams.get('host_kind');
  const hostId = req.nextUrl.searchParams.get('host_id');
  if (!hostKind || !hostId) return NextResponse.json({ items: [] });
  const { data } = await sb
    .from('text_annotations')
    .select('*')
    .eq('host_kind', hostKind)
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    host_kind?: string;
    host_id?: string;
    selected?: string;
    note?: string;
    offset_hint?: number;
    workspace_id?: string;
  };
  if (!body.host_kind || !KINDS.has(body.host_kind) || !body.host_id || !body.selected) {
    return NextResponse.json({ error: 'host_kind, host_id, selected required' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('text_annotations')
    .insert({
      user_id: u.user.id,
      host_kind: body.host_kind,
      host_id: body.host_id,
      selected: body.selected.slice(0, 600),
      offset_hint: body.offset_hint ?? 0,
      note: (body.note || '').slice(0, 2000),
      workspace_id: body.workspace_id || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await sb.from('text_annotations').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
