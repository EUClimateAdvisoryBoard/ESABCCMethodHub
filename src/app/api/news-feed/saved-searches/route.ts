/**
 * News saved searches — CRUD.
 * ---------------------------
 * GET    /api/news-feed/saved-searches            → list (own only, RLS)
 * POST   /api/news-feed/saved-searches            → create
 * PATCH  /api/news-feed/saved-searches?id=<>      → update
 * DELETE /api/news-feed/saved-searches?id=<>      → delete
 *
 * Backed by `news_saved_searches` (migration 022). Searches are
 * private — RLS gates by `user_id = auth.uid()`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SavedSearchRow {
  id: string;
  user_id: string;
  name: string;
  query: string;
  sources: string[];
  tags: string[];
  notify: boolean;
  last_seen_at: string;
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

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

export async function GET(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  const { data, error: dbErr } = await supabase
    .from('news_saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ searches: (data ?? []) as SavedSearchRow[] });
}

export async function POST(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  const insertRow = {
    user_id: user.id,
    name,
    query: typeof body.query === 'string' ? body.query : '',
    sources: asStringArray(body.sources),
    tags: asStringArray(body.tags),
    notify: typeof body.notify === 'boolean' ? body.notify : false,
  };
  const { data, error: dbErr } = await supabase
    .from('news_saved_searches')
    .insert(insertRow)
    .select('*')
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ search: data as SavedSearchRow });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required.' }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.query === 'string') updates.query = body.query;
  if (Array.isArray(body.sources)) updates.sources = asStringArray(body.sources);
  if (Array.isArray(body.tags)) updates.tags = asStringArray(body.tags);
  if (typeof body.notify === 'boolean') updates.notify = body.notify;
  // Allow advancing the bookmark — used by the "Run" action so subsequent
  // calls compute "new since" against the right cutoff.
  if (typeof body.last_seen_at === 'string') updates.last_seen_at = body.last_seen_at;
  const { data, error: dbErr } = await supabase
    .from('news_saved_searches')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ search: data as SavedSearchRow });
}

export async function DELETE(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required.' }, { status: 400 });
  const { error: dbErr } = await supabase
    .from('news_saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
