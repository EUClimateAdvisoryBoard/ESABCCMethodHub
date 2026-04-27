import { NextRequest, NextResponse } from 'next/server';
import {
  addPolicyClockUserEvent,
  getPolicyClockUserEvents,
  isPersistent,
  POLICY_CLOCK_CATEGORIES,
  PolicyClockCategory,
  PolicyClockImportance,
  PolicyClockUserEvent,
} from '@/lib/policy-clock-events-store';
import { getServerSupabase, hasServiceRole } from '@/lib/supabase-server';

/**
 * Policy Clock — user-authored events API.
 *
 *   GET   /api/policy-clock/events  → list all user-added events
 *   POST  /api/policy-clock/events  → add a new event to any swim lane
 *
 * When the caller sets `importance: "high"` (the "Mark as important" toggle
 * in the UI), every other registered user gets a notification so they are
 * alerted the next time they load the app — the NotificationBell polls the
 * `notifications` table every 30 s.
 */

const MAX_TITLE = 300;
const MAX_DESC = 4000;
const MAX_URL = 2000;
const MAX_LOCATION = 300;
const MAX_TAGS = 20;

const VALID_IMPORTANCE: PolicyClockImportance[] = ['high', 'medium', 'normal'];

function clampString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

function clampTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const t of v) {
    if (typeof t !== 'string') continue;
    const trimmed = t.trim().slice(0, 50);
    if (trimmed) out.push(trimmed);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function GET() {
  const events = await getPolicyClockUserEvents();
  return NextResponse.json({
    events,
    total: events.length,
    persistent: isPersistent(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = clampString(body.title, MAX_TITLE).trim();
    const category = body.category as PolicyClockCategory;
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!isIsoDate(body.date)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }
    if (!POLICY_CLOCK_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of ${POLICY_CLOCK_CATEGORIES.join(', ')}` },
        { status: 400 },
      );
    }

    const endDate = isIsoDate(body.endDate) ? body.endDate : undefined;
    const importance: PolicyClockImportance = VALID_IMPORTANCE.includes(body.importance)
      ? body.importance
      : 'normal';

    const id = `pce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const event: PolicyClockUserEvent = {
      id,
      date: body.date,
      endDate,
      time: clampString(body.time, 16) || undefined,
      title,
      description: clampString(body.description, MAX_DESC).trim(),
      category,
      sourceLabel: clampString(body.sourceLabel, 200) || 'User-added',
      sourceUrl: clampString(body.sourceUrl, MAX_URL) || undefined,
      location: clampString(body.location, MAX_LOCATION) || undefined,
      importance,
      tags: clampTags(body.tags),
      policyId: clampString(body.policyId, 200) || null,
      addedBy: clampString(body.addedBy, 200) || 'User',
      authorId: typeof body.authorId === 'string' ? body.authorId : undefined,
      createdAt: new Date().toISOString(),
    };

    await addPolicyClockUserEvent(event);

    // Fan out a notification to every other user when the author flagged the
    // event as important. Best-effort — failures are swallowed so the main
    // POST still succeeds.
    let notified = 0;
    if (event.importance === 'high') {
      notified = await notifyAllUsers(event);
    }

    return NextResponse.json({
      status: 'created',
      event,
      notified,
      persistent: isPersistent(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create event: ${message}` },
      { status: 500 },
    );
  }
}

async function notifyAllUsers(event: PolicyClockUserEvent): Promise<number> {
  const sb = getServerSupabase();
  if (!sb || !hasServiceRole()) return 0;

  try {
    const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      console.error('[policy-clock/events] listUsers failed:', error.message);
      return 0;
    }
    const recipients = (data?.users || [])
      .map(u => u.id)
      .filter(id => id && id !== event.authorId);
    if (recipients.length === 0) return 0;

    const title = `Important date added: ${event.title}`;
    const message = `${event.addedBy || 'A colleague'} flagged ${prettyDate(event.date)} (${categoryLabel(event.category)}) as an important event on the Policy Clock.`;

    const rows = recipients.map(user_id => ({
      user_id,
      type: 'system' as const,
      title: title.slice(0, 300),
      message: message.slice(0, 500),
      link: '/news-feed?view=policy-clock',
      read: false,
    }));

    const { error: insertError } = await sb.from('notifications').insert(rows);
    if (insertError) {
      console.error('[policy-clock/events] notification insert failed:', insertError.message);
      return 0;
    }
    return rows.length;
  } catch (err) {
    console.error('[policy-clock/events] notifyAllUsers error:', err);
    return 0;
  }
}

function prettyDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function categoryLabel(c: PolicyClockCategory): string {
  switch (c) {
    case 'envi_committee':           return 'ENVI Committee';
    case 'council_meeting':          return 'Council';
    case 'plenary':                  return 'EP Plenary';
    case 'commission_workprogramme': return 'Commission WP';
    case 'new_policy':               return 'New Policy';
    case 'revision':                 return 'Revision';
    case 'consultation':             return 'Consultation';
    case 'implementation':           return 'Implementation';
  }
}
