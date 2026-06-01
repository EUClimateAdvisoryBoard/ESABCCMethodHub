/**
 * Project Workspace milestones — collection endpoint.
 *
 *   GET  ?projectId=   → list milestones for a project
 *   POST               → create a milestone (optionally tied to a meeting)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  listMilestones,
  mapMilestone,
  type MilestoneType,
  type MilestoneStatus,
} from '@/lib/project-workspace/meetings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: MilestoneType[] = [
  'publication', 'subgroup', 'champion', 'review', 'deadline', 'other',
];
const STATUSES: MilestoneStatus[] = ['planned', 'in-progress', 'done', 'at-risk'];

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  return NextResponse.json({ milestones: await listMilestones(projectId) });
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: string;
    meetingId?: string | null;
    title?: string;
    type?: string;
    targetDate?: string;
    status?: string;
    description?: string;
    sortOrder?: number;
  };
  if (!body.projectId || !body.title?.trim()) {
    return NextResponse.json({ error: 'projectId and title required' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('pw_meeting_milestones')
    .insert({
      project_id: body.projectId,
      meeting_id: body.meetingId || null,
      title: body.title.trim(),
      milestone_type: TYPES.includes(body.type as MilestoneType) ? body.type : 'publication',
      target_date: body.targetDate || new Date().toISOString().slice(0, 10),
      status: STATUSES.includes(body.status as MilestoneStatus) ? body.status : 'planned',
      description: (body.description ?? '').trim(),
      sort_order: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      created_by: u.user.id,
    })
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 400 });
  }
  return NextResponse.json({ milestone: mapMilestone(data) });
}
