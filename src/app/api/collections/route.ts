import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest) {
  const a = req.headers.get('authorization');
  return a?.startsWith('Bearer ') ? a.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ collections: [] });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ collections: [] });
  const { data } = await sb
    .from('collections')
    .select('*')
    .eq('user_id', u.user.id)
    .order('sort_order', { ascending: true });
  return NextResponse.json({ collections: data || [] });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const { name, emoji } = (await req.json().catch(() => ({}))) as { name?: string; emoji?: string };
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const { data, error } = await sb
    .from('collections')
    .insert({ user_id: u.user.id, name: name.trim(), emoji: emoji?.trim() || '📁' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ collection: data });
}
