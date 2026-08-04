import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    kind?: string;
    name?: string;
    description?: string;
  };
  const allowed = ['indicators', 'recommendations', 'member-states', 'policy-analysis', 'content-analysis', 'meetings', 'literature-watch', 'custom'];
  const kind = (body.kind ?? '').trim();
  const name = (body.name ?? '').trim();
  if (!name || !allowed.includes(kind)) {
    return NextResponse.json({ error: 'invalid kind or name' }, { status: 400 });
  }

  const id = (body.id ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const { count } = await sb
    .from('pw_modules')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', params.projectId);

  const { data, error } = await sb
    .from('pw_modules')
    .insert({
      id,
      project_id: params.projectId,
      kind,
      name,
      description: (body.description ?? '').trim(),
      position: count ?? 0,
      is_seed: false,
    })
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 400 });
  }
  return NextResponse.json({ module: data });
}

/** Reorder a project's tools: body { moduleIds: string[] } is the new tab order. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { moduleIds?: string[] };
  const moduleIds = Array.isArray(body.moduleIds) ? body.moduleIds : [];
  if (moduleIds.length === 0) {
    return NextResponse.json({ error: 'moduleIds required' }, { status: 400 });
  }

  // Per-row updates keep this simple (module counts per project are small,
  // typically under ten) rather than a single transactional statement.
  for (let i = 0; i < moduleIds.length; i++) {
    const { error } = await sb
      .from('pw_modules')
      .update({ position: i })
      .eq('project_id', params.projectId)
      .eq('id', moduleIds[i]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
