/**
 * Secretariat News — shared reading list (server-backed).
 * --------------------------------------------------------
 * GET    /api/news-feed/shared-list           → list with upvote counts
 * POST   /api/news-feed/shared-list           → add { title, ..., kind, priority }
 * PATCH  /api/news-feed/shared-list?id=<>     → update editable fields (notes, priority, …)
 * DELETE /api/news-feed/shared-list?id=<>     → remove (adder or admin via RLS)
 *
 * Upvotes (a separate hot path):
 * POST   /api/news-feed/shared-list { op:'upvote',   id }   → upsert vote for caller
 * POST   /api/news-feed/shared-list { op:'downvote', id }   → remove caller's vote
 *
 * Backed by `shared_reading_list_items` and `shared_reading_list_upvotes`
 * (migration 021). RLS gates writes; we additionally short-circuit on
 * a missing token for a clean 401.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_KINDS = new Set(['paper', 'report', 'book', 'article', 'news', 'other']);
const VALID_PRIORITIES = new Set(['must-read', 'important', 'nice-to-have']);

interface ItemRow {
  id: string;
  title: string;
  authors: string;
  url: string;
  doi: string;
  kind: string;
  priority: string;
  notes: string;
  source_type: string;
  reference_id: string;
  added_by: string | null;
  added_by_name: string;
  added_at: string;
}

interface UpvoteRow { item_id: string; user_id: string }

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

async function buildEnriched(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  userId: string,
) {
  const [itemsRes, votesRes] = await Promise.all([
    supabase
      .from('shared_reading_list_items')
      .select('*')
      .order('added_at', { ascending: false }),
    supabase.from('shared_reading_list_upvotes').select('item_id,user_id'),
  ]);
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (votesRes.error) throw new Error(votesRes.error.message);
  const items = (itemsRes.data ?? []) as ItemRow[];
  const votes = (votesRes.data ?? []) as UpvoteRow[];
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const v of votes) {
    counts.set(v.item_id, (counts.get(v.item_id) ?? 0) + 1);
    if (v.user_id === userId) mine.add(v.item_id);
  }
  return items.map(i => ({
    id: i.id,
    title: i.title,
    authors: i.authors,
    url: i.url,
    doi: i.doi || undefined,
    kind: i.kind,
    priority: i.priority,
    notes: i.notes,
    addedByName: i.added_by_name,
    addedById: i.added_by ?? '',
    addedDate: i.added_at.slice(0, 10),
    upvotes: counts.get(i.id) ?? 0,
    upvotedByMe: mine.has(i.id),
    sourceType: i.source_type || undefined,
    referenceId: i.reference_id || undefined,
  }));
}

export async function GET(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  try {
    const items = await buildEnriched(supabase, user.id);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
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

  // Upvote / downvote operations are a hot path served via the same POST
  // so the client only has to manage one URL.
  if (body.op === 'upvote' || body.op === 'downvote') {
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
    if (body.op === 'upvote') {
      const { error: insErr } = await supabase
        .from('shared_reading_list_upvotes')
        .upsert({ item_id: id, user_id: user.id }, { onConflict: 'item_id,user_id' });
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    } else {
      const { error: delErr } = await supabase
        .from('shared_reading_list_upvotes')
        .delete()
        .eq('item_id', id)
        .eq('user_id', user.id);
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    try {
      const items = await buildEnriched(supabase, user.id);
      return NextResponse.json({ items });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  // ── Add a new item ────────────────────────────────────────────────────────
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) return NextResponse.json({ error: 'title required.' }, { status: 400 });
  const kindRaw = typeof body.kind === 'string' ? body.kind : 'paper';
  const kind = VALID_KINDS.has(kindRaw) ? kindRaw : 'paper';
  const priorityRaw = typeof body.priority === 'string' ? body.priority : 'important';
  const priority = VALID_PRIORITIES.has(priorityRaw) ? priorityRaw : 'important';
  const addedByName = typeof body.addedByName === 'string' && body.addedByName.trim()
    ? body.addedByName.trim()
    : 'Anonymous';
  const insertRow = {
    title,
    authors: typeof body.authors === 'string' ? body.authors : '',
    url: typeof body.url === 'string' ? body.url : '',
    doi: typeof body.doi === 'string' ? body.doi : '',
    kind,
    priority,
    notes: typeof body.notes === 'string' ? body.notes : '',
    source_type: typeof body.sourceType === 'string' ? body.sourceType : '',
    reference_id: typeof body.referenceId === 'string' ? body.referenceId : '',
    added_by: user.id,
    added_by_name: addedByName,
  };
  const { error: insErr } = await supabase
    .from('shared_reading_list_items')
    .insert(insertRow);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  try {
    const items = await buildEnriched(supabase, user.id);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
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
  const updates: Record<string, unknown> = {};
  if (typeof body.notes === 'string') updates.notes = body.notes;
  if (typeof body.priority === 'string' && VALID_PRIORITIES.has(body.priority)) {
    updates.priority = body.priority;
  }
  if (typeof body.kind === 'string' && VALID_KINDS.has(body.kind)) updates.kind = body.kind;
  if (typeof body.referenceId === 'string') updates.reference_id = body.referenceId;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields supplied.' }, { status: 400 });
  }
  const { error: upErr } = await supabase
    .from('shared_reading_list_items')
    .update(updates)
    .eq('id', id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  try {
    const items = await buildEnriched(supabase, user.id);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required.' }, { status: 400 });
  const { error: delErr } = await supabase
    .from('shared_reading_list_items')
    .delete()
    .eq('id', id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  try {
    const items = await buildEnriched(supabase, user.id);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
