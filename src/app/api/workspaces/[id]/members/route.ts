import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest) {
  const a = req.headers.get('authorization');
  return a?.startsWith('Bearer ') ? a.slice(7) : null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ members: [] });
  const sb = createServerClient(t);
  const { data: members } = await sb
    .from('workspace_members')
    .select('user_id, role, added_at')
    .eq('workspace_id', params.id)
    .order('added_at', { ascending: true });
  if (!members || members.length === 0) return NextResponse.json({ members: [] });
  const ids = members.map(m => m.user_id);
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, display_name')
    .in('id', ids);
  const map = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name]));
  return NextResponse.json({
    members: members.map(m => ({ ...m, display_name: map[m.user_id] || 'Anonymous' })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: 'editor' | 'viewer' };
  if (!body.email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  // Look up the user by email via profiles table; fail soft if not found.
  const { data: prof } = await sb.from('profiles').select('id').eq('email', body.email).maybeSingle();
  if (!prof) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  const { error } = await sb.from('workspace_members').upsert({
    workspace_id: params.id,
    user_id: prof.id,
    role: body.role || 'editor',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
