import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const token = tokenFromRequest(req);
  if (!token) return NextResponse.json({ workspaces: [] });
  const sb = createServerClient(token);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ workspaces: [] });

  const { data: memberships } = await sb
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', u.user.id);

  const ids = (memberships || []).map(m => m.workspace_id);
  if (ids.length === 0) return NextResponse.json({ workspaces: [] });

  const { data: ws } = await sb
    .from('workspaces')
    .select('*')
    .in('id', ids)
    .order('updated_at', { ascending: false });

  const roles = Object.fromEntries((memberships || []).map(m => [m.workspace_id, m.role]));
  return NextResponse.json({
    workspaces: (ws || []).map(w => ({ ...w, role: roles[w.id] || 'editor' })),
  });
}

export async function POST(req: NextRequest) {
  const token = tokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(token);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { name, description } = (await req.json().catch(() => ({}))) as { name?: string; description?: string };
  if (!name || !name.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const { data: ws, error } = await sb
    .from('workspaces')
    .insert({ owner_id: u.user.id, name: name.trim(), description: (description || '').trim() })
    .select()
    .single();
  if (error || !ws) return NextResponse.json({ error: error?.message || 'create failed' }, { status: 400 });

  await sb.from('workspace_members').insert({ workspace_id: ws.id, user_id: u.user.id, role: 'owner' });
  return NextResponse.json({ workspace: { ...ws, role: 'owner' } });
}
