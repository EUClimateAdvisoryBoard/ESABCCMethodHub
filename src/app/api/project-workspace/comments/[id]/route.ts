/**
 * Project Workspace comments — item endpoint.
 *
 *   PATCH  → edit body and/or toggle the `resolved` flag
 *   DELETE → remove a comment (RLS restricts this to the author)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { mapComment } from '@/lib/project-workspace/collaboration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    body?: string;
    resolved?: boolean;
  };
  const patch: Record<string, unknown> = {};
  if (typeof body.body === 'string') patch.body = body.body.trim();
  if (typeof body.resolved === 'boolean') patch.resolved = body.resolved;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('pw_comments')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ comment: mapComment(data) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { error } = await sb.from('pw_comments').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
