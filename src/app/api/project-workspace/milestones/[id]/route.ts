/**
 * Project Workspace milestones — item endpoint.
 *
 *   PATCH  /api/project-workspace/milestones/[id]   → update fields
 *   DELETE /api/project-workspace/milestones/[id]   → delete a milestone
 *
 * PATCH carries the drag-to-reschedule (targetDate) and drag-to-reorder
 * (sortOrder) updates from the timeline, as well as inline edits.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.type === 'string' && TYPES.includes(body.type as MilestoneType)) {
    patch.milestone_type = body.type;
  }
  if (typeof body.targetDate === 'string') patch.target_date = body.targetDate;
  if (typeof body.status === 'string' && STATUSES.includes(body.status as MilestoneStatus)) {
    patch.status = body.status;
  }
  if (typeof body.description === 'string') patch.description = body.description;
  if (typeof body.sortOrder === 'number') patch.sort_order = body.sortOrder;
  if ('meetingId' in body) patch.meeting_id = (body.meetingId as string | null) || null;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no editable fields supplied' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('pw_meeting_milestones')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'update failed' }, { status: 400 });
  }
  return NextResponse.json({ milestone: mapMilestone(data) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { error } = await sb.from('pw_meeting_milestones').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
