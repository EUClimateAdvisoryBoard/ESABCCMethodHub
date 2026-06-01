/**
 * Project Workspace meetings — collection endpoint.
 *
 *   GET  ?projectId=   → list meetings for a project (oldest first)
 *   POST               → create a meeting
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { listMeetings, mapMeeting, type MeetingType } from '@/lib/project-workspace/meetings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: MeetingType[] = [
  'team', 'subgroup', 'champion', 'publication', 'external', 'plenary', 'other',
];

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  return NextResponse.json({ meetings: await listMeetings(projectId) });
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
    type?: string;
    occurredAt?: string;
    location?: string;
    attendees?: string;
  };
  if (!body.projectId || !body.title?.trim()) {
    return NextResponse.json({ error: 'projectId and title required' }, { status: 400 });
  }
  const type = TYPES.includes(body.type as MeetingType) ? body.type : 'team';

  const { data, error } = await sb
    .from('pw_meetings')
    .insert({
      project_id: body.projectId,
      title: body.title.trim(),
      meeting_type: type,
      occurred_at: body.occurredAt || new Date().toISOString(),
      location: (body.location ?? '').trim(),
      attendees: (body.attendees ?? '').trim(),
      created_by: u.user.id,
    })
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 400 });
  }
  return NextResponse.json({ meeting: mapMeeting(data) });
}
