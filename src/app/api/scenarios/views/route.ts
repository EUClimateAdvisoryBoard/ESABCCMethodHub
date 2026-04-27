/**
 * Saved / shareable scenario views.
 * ---------------------------------
 * GET    /api/scenarios/views        → list (own + shared)
 * GET    /api/scenarios/views?id=<>  → single by id
 * POST   /api/scenarios/views        → create  { name, description?, state, is_shared? }
 * PATCH  /api/scenarios/views?id=<>  → update  { name?, description?, state?, is_shared? }
 * DELETE /api/scenarios/views?id=<>  → delete (owner only — RLS enforces)
 *
 * Auth: Bearer token from Supabase. RLS handles owner-vs-shared visibility;
 * we additionally short-circuit unauthenticated calls with a clean 401.
 *
 * State is stored as an opaque JSONB blob — schema is owned by the
 * client component so we can iterate the picker UI without a migration.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ViewRow {
  id: string;
  name: string;
  description: string;
  state: unknown;
  is_shared: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function requireUser(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) return { supabase: null, user: null, error: 'Supabase not configured.', status: 503 };
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { supabase, user: null, error: 'Unauthorized.', status: 401 };
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { supabase, user: null, error: 'Unauthorized.', status: 401 };
  return { supabase, user, error: null as string | null, status: 200 };
}

export async function GET(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const { data, error: dbErr } = await supabase
      .from('scenario_views')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ view: data as ViewRow });
  }
  const { data, error: dbErr } = await supabase
    .from('scenario_views')
    .select('*')
    .order('updated_at', { ascending: false });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ views: (data ?? []) as ViewRow[] });
}

export async function POST(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  let body: { name?: unknown; description?: unknown; state?: unknown; is_shared?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (body.state === undefined || body.state === null) {
    return NextResponse.json({ error: 'State is required.' }, { status: 400 });
  }
  const description = typeof body.description === 'string' ? body.description : '';
  const isShared = typeof body.is_shared === 'boolean' ? body.is_shared : true;
  const { data, error: dbErr } = await supabase
    .from('scenario_views')
    .insert({
      name,
      description,
      state: body.state,
      is_shared: isShared,
      created_by: user.id,
    })
    .select('*')
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ view: data as ViewRow });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required.' }, { status: 400 });
  let body: { name?: unknown; description?: unknown; state?: unknown; is_shared?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description;
  if (body.state !== undefined) updates.state = body.state;
  if (typeof body.is_shared === 'boolean') updates.is_shared = body.is_shared;
  const { data, error: dbErr } = await supabase
    .from('scenario_views')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found or not owner.' }, { status: 404 });
  return NextResponse.json({ view: data as ViewRow });
}

export async function DELETE(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required.' }, { status: 400 });
  const { error: dbErr } = await supabase
    .from('scenario_views')
    .delete()
    .eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
