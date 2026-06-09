/**
 * General notes — list + add + remove.
 * ------------------------------------
 * General notes are lightweight, passage-anchored comments an analyst leaves
 * on a document WITHOUT applying a tag (see migration 060). They are shared
 * across the team via the `content_analysis_notes` table, scoped by
 * `(document_id, project_id)` so each project keeps its own notes on the same
 * paper.
 *
 *   GET  ?documentId=<id>&projectId=<id|->   → notes for one (document, project)
 *     → { notes: [{ id, text, quote, blockId, startChar, endChar, author, createdAt }] }
 *
 *   POST   { id, documentId, projectId, text, quote?, blockId?, startChar?, endChar? }
 *     → add a note (authored as the signed-in user)
 *   DELETE ?id=<id>                          → remove a note (author only, via RLS)
 *
 * Mirrors /api/content-analysis/overall-tags: public read, writes go through
 * the caller's bearer token so RLS attributes + authorises them.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLE = 'content_analysis_notes';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

interface NoteRow {
  id: string;
  document_id: string;
  project_id: string | null;
  text: string;
  quote: string | null;
  block_id: string | null;
  start_char: number | null;
  end_char: number | null;
  author: string | null;
  author_id: string | null;
  created_at: string;
}

const COLS =
  'id, document_id, project_id, text, quote, block_id, start_char, end_char, author, author_id, created_at';

/** Shape rows for the client. `author_id` is never exposed — instead we resolve
 *  it to a `mine` flag against the requesting user (when known) so the UI can
 *  show a delete control only on the caller's own notes. */
function shape(rows: NoteRow[], myUid?: string | null) {
  return rows.map(r => ({
    id: r.id,
    documentId: r.document_id,
    projectId: r.project_id,
    text: r.text,
    quote: r.quote ?? undefined,
    blockId: r.block_id ?? undefined,
    startChar: r.start_char ?? undefined,
    endChar: r.end_char ?? undefined,
    author: r.author,
    mine: myUid ? r.author_id === myUid : undefined,
    createdAt: r.created_at,
  }));
}

/** Normalise the project filter — the client sends '-' for the master library
 *  (null project), since a query param can't carry SQL NULL. */
function projectFilter(raw: string | null): string | null {
  return raw && raw !== '-' ? raw : null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const documentId = url.searchParams.get('documentId');
  if (!documentId) {
    return NextResponse.json({ error: 'documentId required' }, { status: 400 });
  }
  const projectId = projectFilter(url.searchParams.get('projectId'));
  let sb;
  try {
    sb = createServerClient();
  } catch {
    // Supabase not configured (e.g. local dev without env) — no notes.
    return NextResponse.json({ notes: [] });
  }
  // Resolve the requesting user (if a token was sent) so we can flag their own
  // notes as deletable, without ever exposing author ids to other readers.
  let myUid: string | null = null;
  const t = token(req);
  if (t) {
    const { data: u } = await createServerClient(t).auth.getUser();
    myUid = u?.user?.id ?? null;
  }

  let q = sb.from(TABLE).select(COLS).eq('document_id', documentId);
  q = projectId === null ? q.is('project_id', null) : q.eq('project_id', projectId);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ notes: [] });
  return NextResponse.json({ notes: shape((data ?? []) as NoteRow[], myUid) });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    documentId?: string;
    projectId?: string | null;
    text?: string;
    quote?: string;
    blockId?: string;
    startChar?: number;
    endChar?: number;
    author?: string;
  };
  if (!body.id || !body.documentId || !body.text?.trim()) {
    return NextResponse.json({ error: 'id, documentId, text required' }, { status: 400 });
  }

  const { data, error } = await sb
    .from(TABLE)
    .insert({
      id: body.id,
      document_id: body.documentId,
      project_id: body.projectId ?? null,
      text: body.text.trim(),
      quote: body.quote ?? null,
      block_id: body.blockId ?? null,
      start_char: body.startChar ?? null,
      end_char: body.endChar ?? null,
      author: body.author ?? null,
      author_id: u.user.id,
    })
    .select(COLS)
    .single();
  if (error) {
    // Idempotent retry: the client retries failed posts through its durable
    // outbox, and the first attempt may have landed even though its response
    // was lost. A duplicate id means the note is already saved — confirm it
    // instead of erroring, so the retry settles instead of dead-lettering.
    if (error.code === '23505') {
      const { data: existing } = await sb.from(TABLE).select(COLS).eq('id', body.id).single();
      if (existing) {
        return NextResponse.json({ note: shape([existing as NoteRow], u.user.id)[0] });
      }
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ note: shape([data as NoteRow], u.user.id)[0] });
}

export async function DELETE(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  // RLS restricts the delete to the author's own notes.
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
