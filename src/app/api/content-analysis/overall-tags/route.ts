/**
 * Overall (document-level) tags — list + add + remove.
 * ----------------------------------------------------
 * Overall tags are the coloured dots that describe a WHOLE document in the
 * Content Analysis workbench (as opposed to in-text tags pinned to passages).
 * Policy documents carry an AI baseline in code; scientific & grey literature
 * are tagged by hand. Those manual tags live in the global, shared
 * `content_analysis_overall_tags` table (migration 059) so every user sees the
 * same dots in the workbench AND the reference library.
 *
 *   GET  ?documentId=<id>          → overall tags for one document
 *   GET  (no params)               → every overall tag (used to build the map)
 *     → { tags: [{ documentId, codeId }] }
 *
 *   POST   { documentId, codeId }  → add an overall tag
 *   DELETE ?documentId=&codeId=    → remove an overall tag
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLE = 'content_analysis_overall_tags';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

interface TagRow {
  document_id: string;
  code_id: string;
}

function shape(rows: TagRow[]) {
  return rows.map(r => ({ documentId: r.document_id, codeId: r.code_id }));
}

export async function GET(req: NextRequest) {
  const documentId = new URL(req.url).searchParams.get('documentId');
  let sb;
  try {
    sb = createServerClient();
  } catch {
    // Supabase not configured (e.g. local dev without env) — no tags.
    return NextResponse.json({ tags: [] });
  }
  let q = sb.from(TABLE).select('document_id, code_id');
  if (documentId) q = q.eq('document_id', documentId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ tags: [] });
  return NextResponse.json({ tags: shape((data ?? []) as TagRow[]) });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    documentId?: string;
    codeId?: string;
  };
  if (!body.documentId || !body.codeId) {
    return NextResponse.json({ error: 'documentId, codeId required' }, { status: 400 });
  }

  const { data, error } = await sb
    .from(TABLE)
    .upsert(
      {
        document_id: body.documentId,
        code_id: body.codeId,
        created_by: u.user.id,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'document_id,code_id' },
    )
    .select('document_id, code_id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tag: shape([data as TagRow])[0] });
}

export async function DELETE(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const url = new URL(req.url);
  const documentId = url.searchParams.get('documentId');
  const codeId = url.searchParams.get('codeId');
  if (!documentId || !codeId) {
    return NextResponse.json({ error: 'documentId, codeId required' }, { status: 400 });
  }
  const { error } = await sb
    .from(TABLE)
    .delete()
    .eq('document_id', documentId)
    .eq('code_id', codeId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
