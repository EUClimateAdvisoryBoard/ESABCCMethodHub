/**
 * Edit / delete a single project-scoped policy code row.
 * ------------------------------------------------------
 * PATCH updates label/color/parent for custom codes. Master rows are
 * toggled via the `toggle-master` action on the parent route — calling
 * PATCH on them is allowed for label/color override but is currently
 * unused by the UI.
 *
 * DELETE hard-removes a row. Used for custom codes; for master codes the
 * UI prefers the soft `removed=true` toggle so the master tag can be
 * restored later.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if ('label' in body) patch.label = String(body.label ?? '');
  if ('color' in body) patch.color = String(body.color ?? '#94A3B8');
  if ('parentCodeId' in body) patch.parent_code_id = body.parentCodeId ?? null;
  if ('removed' in body) patch.removed = !!body.removed;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no fields' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('pw_policy_codes')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ code: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { error } = await sb.from('pw_policy_codes').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
