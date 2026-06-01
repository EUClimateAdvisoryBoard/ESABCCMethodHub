/**
 * Project Workspace meetings — item endpoint.
 *
 *   PATCH  /api/project-workspace/meetings/[id]   → update editable fields
 *   DELETE /api/project-workspace/meetings/[id]   → delete a meeting
 *
 * PATCH is used both by the meeting editor (title/type/date/location) and by
 * the collaborative autosave of the notes / summary / minutes bodies.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { mapMeeting, type MeetingType } from '@/lib/project-workspace/meetings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: MeetingType[] = [
  'team', 'subgroup', 'champion', 'publication', 'external', 'plenary', 'other',
];

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
  if (typeof body.type === 'string' && TYPES.includes(body.type as MeetingType)) {
    patch.meeting_type = body.type;
  }
  if (typeof body.occurredAt === 'string') patch.occurred_at = body.occurredAt;
  if (typeof body.location === 'string') patch.location = body.location;
  if (typeof body.attendees === 'string') patch.attendees = body.attendees;
  if (typeof body.notes === 'string') patch.notes = body.notes;
  if (typeof body.summary === 'string') patch.summary = body.summary;
  if (typeof body.minutes === 'string') patch.minutes = body.minutes;
  if (typeof body.audioUrl === 'string') patch.audio_url = body.audioUrl;
  if (Array.isArray(body.keyPoints)) {
    patch.key_points = (body.keyPoints as unknown[]).map(String).slice(0, 6);
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no editable fields supplied' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('pw_meetings')
    .update(patch)
    .eq('id', params.id)
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'update failed' }, { status: 400 });
  }
  return NextResponse.json({ meeting: mapMeeting(data) });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const { error } = await sb.from('pw_meetings').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
