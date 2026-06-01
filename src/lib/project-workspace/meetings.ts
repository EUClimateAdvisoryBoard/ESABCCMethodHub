/**
 * Server-side data access for the Meetings module (M·19).
 * --------------------------------------------------------
 * Wraps reads against the `pw_meetings` and `pw_meeting_milestones` tables
 * from migration `044_pw_meetings.sql`. Writes go through the API routes
 * under src/app/api/project-workspace/meetings|milestones, which apply RLS
 * via the caller's access token.
 *
 * Meetings are project-scoped (like indicators / recommendations) so every
 * "Meetings" module within a project shares one store and all contributors
 * see the same state.
 */
import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-server';

/** The meeting categories the UI offers. Kept in sync with the picker. */
export type MeetingType =
  | 'team'
  | 'subgroup'
  | 'champion'
  | 'publication'
  | 'external'
  | 'plenary'
  | 'other';

export type MilestoneType =
  | 'publication'
  | 'subgroup'
  | 'champion'
  | 'review'
  | 'deadline'
  | 'other';

export type MilestoneStatus = 'planned' | 'in-progress' | 'done' | 'at-risk';

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  type: MeetingType;
  occurredAt: string;
  location: string;
  attendees: string;
  notes: string;
  summary: string;
  minutes: string;
  keyPoints: string[];
  audioUrl: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  meetingId: string | null;
  title: string;
  type: MilestoneType;
  targetDate: string;
  status: MilestoneStatus;
  description: string;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapMeeting(r: Record<string, unknown>): Meeting {
  const raw = r.key_points;
  const keyPoints = Array.isArray(raw)
    ? (raw as unknown[]).map(String)
    : typeof raw === 'string'
      ? safeParseArray(raw)
      : [];
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    title: (r.title as string) ?? '',
    type: ((r.meeting_type as string) ?? 'team') as MeetingType,
    occurredAt: r.occurred_at as string,
    location: (r.location as string) ?? '',
    attendees: (r.attendees as string) ?? '',
    notes: (r.notes as string) ?? '',
    summary: (r.summary as string) ?? '',
    minutes: (r.minutes as string) ?? '',
    keyPoints,
    audioUrl: (r.audio_url as string) ?? '',
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function safeParseArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function mapMilestone(r: Record<string, unknown>): Milestone {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    meetingId: (r.meeting_id as string | null) ?? null,
    title: (r.title as string) ?? '',
    type: ((r.milestone_type as string) ?? 'publication') as MilestoneType,
    targetDate: r.target_date as string,
    status: ((r.status as string) ?? 'planned') as MilestoneStatus,
    description: (r.description as string) ?? '',
    sortOrder: (r.sort_order as number) ?? 0,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export { mapMeeting };

/** Every meeting for a project, oldest first (timeline order). */
export async function listMeetings(projectId: string): Promise<Meeting[]> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('pw_meetings')
    .select('*')
    .eq('project_id', projectId)
    .order('occurred_at', { ascending: true });
  return (data ?? []).map(mapMeeting);
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return null;
  const { data } = await sb.from('pw_meetings').select('*').eq('id', id).maybeSingle();
  return data ? mapMeeting(data) : null;
}

/** Every milestone for a project, ordered for the timeline. */
export async function listMilestones(projectId: string): Promise<Milestone[]> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('pw_meeting_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('target_date', { ascending: true })
    .order('sort_order', { ascending: true });
  return (data ?? []).map(mapMilestone);
}
