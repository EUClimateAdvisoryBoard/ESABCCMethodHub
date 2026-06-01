/**
 * GET  /api/project-workspace/custom-module-content?projectId=…&moduleId=…
 * PUT  /api/project-workspace/custom-module-content
 *
 * Backs the "Custom" module kind: a free-form notes / scratchpad textarea
 * whose content is persisted per (project, module) pair in
 * `pw_custom_module_content`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const moduleId = url.searchParams.get('moduleId');
  if (!projectId || !moduleId) {
    return NextResponse.json({ error: 'projectId, moduleId required' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('pw_custom_module_content')
    .select('content, updated_at')
    .eq('project_id', projectId)
    .eq('module_id', moduleId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    content: data?.content ?? '',
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    moduleId?: string;
    content?: string;
  };
  if (!body.projectId || !body.moduleId || typeof body.content !== 'string') {
    return NextResponse.json(
      { error: 'projectId, moduleId, content required' },
      { status: 400 }
    );
  }
  const { error } = await sb
    .from('pw_custom_module_content')
    .upsert(
      {
        project_id: body.projectId,
        module_id: body.moduleId,
        content: body.content,
      },
      { onConflict: 'project_id,module_id' }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
