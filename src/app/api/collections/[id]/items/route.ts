import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest) {
  const a = req.headers.get('authorization');
  return a?.startsWith('Bearer ') ? a.slice(7) : null;
}

const KINDS = new Set(['reference', 'policy', 'news', 'segment']);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ items: [] });
  const sb = createServerClient(t);
  const { data } = await sb
    .from('collection_items')
    .select('*')
    .eq('collection_id', params.id)
    .order('added_at', { ascending: false });
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { kind?: string; ref_id?: string };
  if (!body.kind || !KINDS.has(body.kind) || !body.ref_id) {
    return NextResponse.json({ error: 'kind + ref_id required' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('collection_items')
    .upsert({
      collection_id: params.id,
      user_id: u.user.id,
      kind: body.kind,
      ref_id: body.ref_id,
    }, { onConflict: 'collection_id,kind,ref_id' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const itemId = req.nextUrl.searchParams.get('itemId');
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });
  await sb.from('collection_items').delete().eq('id', itemId).eq('collection_id', params.id);
  return NextResponse.json({ ok: true });
}
