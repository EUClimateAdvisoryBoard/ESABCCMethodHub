/**
 * Project Workspace phases — collection endpoint.
 *
 *   GET  ?projectId=   → list phases (Gantt blocks) for a project
 *   POST               → create a phase
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { listPhases, mapPhase } from '@/lib/project-workspace/phases';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  return NextResponse.json({ phases: await listPhases(projectId) });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    color?: string;
    description?: string;
    sortOrder?: number;
  };
  if (!body.projectId || !body.title?.trim()) {
    return NextResponse.json({ error: 'projectId and title required' }, { status: 400 });
  }
  const start = body.startDate || new Date().toISOString().slice(0, 10);
  const end = body.endDate || start;

  const { data, error } = await sb
    .from('pw_project_phases')
    .insert({
      project_id: body.projectId,
      title: body.title.trim(),
      start_date: start,
      end_date: end,
      color: body.color || '#004B7F',
      description: (body.description ?? '').trim(),
      sort_order: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      created_by: u.user.id,
    })
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 400 });
  }
  return NextResponse.json({ phase: mapPhase(data) });
}
