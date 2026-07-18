import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { SEED_PROJECTS } from '@/data/project-workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEED_PROJECT_IDS = new Set(SEED_PROJECTS.map(p => p.id));

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

/** Rename a project / edit its description. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
  };
  const patch: Record<string, string> = {};
  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    patch.name = name;
  }
  if (typeof body.description === 'string') patch.description = body.description.trim();
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no fields' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('pw_projects')
    .update(patch)
    .eq('id', params.projectId)
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'update failed' }, { status: 400 });
  }
  return NextResponse.json({ project: data });
}

/** Delete a project. Child rows (modules, indicators, …) cascade via FKs. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  if (SEED_PROJECT_IDS.has(params.projectId)) {
    return NextResponse.json({ error: 'seed project cannot be deleted' }, { status: 400 });
  }

  const { error } = await sb.from('pw_projects').delete().eq('id', params.projectId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
