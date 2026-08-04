import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

/** Remove a tool from a project. Refuses to delete seed tools. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; moduleId: string } }
) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { data: row } = await sb
    .from('pw_modules')
    .select('is_seed')
    .eq('project_id', params.projectId)
    .eq('id', params.moduleId)
    .maybeSingle();
  if (row?.is_seed) {
    return NextResponse.json({ error: 'seed tool cannot be removed' }, { status: 400 });
  }

  const { error } = await sb
    .from('pw_modules')
    .delete()
    .eq('project_id', params.projectId)
    .eq('id', params.moduleId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
