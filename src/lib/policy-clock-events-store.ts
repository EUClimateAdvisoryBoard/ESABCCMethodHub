/**
 * Persistent store for user-authored Policy Clock events.
 *
 * Lets any signed-in user drop a dated item onto any swim lane of the Policy
 * Clock (ENVI Committee, Council, Plenary, …) via the "Post New" tab on the
 * Secretariat News Feed. Rows are merged into /api/policy-clock alongside the
 * curated OJ deadlines and the live RSS feed items.
 *
 * Primary backend: Supabase table `public.policy_clock_events`
 * (see `supabase/migrations/007_policy_clock_events.sql`). Writes use the
 * SERVICE ROLE key so the /api route can insert under the default
 * "reads are public, writes are service-role-only" RLS policy.
 *
 * Fallback: module-scoped in-memory cache on `globalThis` for local dev
 * without Supabase env vars. Lossy on cold start.
 */

import { getServerSupabase } from './supabase-server';

export type PolicyClockCategory =
  | 'revision'
  | 'new_policy'
  | 'commission_workprogramme'
  | 'envi_committee'
  | 'council_meeting'
  | 'plenary'
  | 'consultation'
  | 'implementation';

export const POLICY_CLOCK_CATEGORIES: PolicyClockCategory[] = [
  'revision',
  'new_policy',
  'commission_workprogramme',
  'envi_committee',
  'council_meeting',
  'plenary',
  'consultation',
  'implementation',
];

export type PolicyClockImportance = 'high' | 'medium' | 'normal';

export interface PolicyClockUserEvent {
  id: string;
  date: string;                    // YYYY-MM-DD
  endDate?: string;                // YYYY-MM-DD
  time?: string;                   // HH:MM
  title: string;
  description: string;
  category: PolicyClockCategory;
  sourceLabel: string;
  sourceUrl?: string;
  location?: string;
  importance: PolicyClockImportance;
  tags: string[];
  /**
   * Universal policy id (matches `Policy.id` in `src/data/policies.ts`).
   * When set, the Policy Clock event becomes a first-class hop into the
   * Policy Navigator, Content Analysis, and Reference Manager modules.
   */
  policyId?: string | null;
  addedBy: string;
  authorId?: string;
  createdAt: string;
}

interface GlobalCache {
  __policyClockUserEvents?: PolicyClockUserEvent[];
}
const g = globalThis as unknown as GlobalCache;
if (!g.__policyClockUserEvents) g.__policyClockUserEvents = [];

const MAX_EVENTS = 5000;

interface Row {
  id: string;
  event_date: string;
  end_date: string | null;
  event_time: string | null;
  title: string;
  description: string | null;
  category: string;
  source_label: string | null;
  source_url: string | null;
  location: string | null;
  importance: string | null;
  tags: string[] | null;
  policy_id: string | null;
  added_by: string | null;
  author_id: string | null;
  created_at: string;
}

function rowToEvent(r: Row): PolicyClockUserEvent {
  const cat = (POLICY_CLOCK_CATEGORIES.includes(r.category as PolicyClockCategory)
    ? r.category
    : 'new_policy') as PolicyClockCategory;
  const imp = (r.importance === 'high' || r.importance === 'medium' || r.importance === 'normal'
    ? r.importance
    : 'normal') as PolicyClockImportance;
  return {
    id: r.id,
    date: r.event_date,
    endDate: r.end_date || undefined,
    time: r.event_time || undefined,
    title: r.title,
    description: r.description || '',
    category: cat,
    sourceLabel: r.source_label || 'User-added',
    sourceUrl: r.source_url || undefined,
    location: r.location || undefined,
    importance: imp,
    tags: r.tags || [],
    policyId: r.policy_id || null,
    addedBy: r.added_by || '',
    authorId: r.author_id || undefined,
    createdAt: r.created_at,
  };
}

function eventToRow(e: PolicyClockUserEvent): Omit<Row, 'created_at'> {
  return {
    id: e.id,
    event_date: e.date,
    end_date: e.endDate || null,
    event_time: e.time || null,
    title: e.title,
    description: e.description || null,
    category: e.category,
    source_label: e.sourceLabel,
    source_url: e.sourceUrl || null,
    location: e.location || null,
    importance: e.importance,
    tags: e.tags,
    policy_id: e.policyId || null,
    added_by: e.addedBy,
    author_id: e.authorId || null,
  };
}

export function isPersistent(): boolean {
  return getServerSupabase() !== null;
}

export async function getPolicyClockUserEvents(): Promise<PolicyClockUserEvent[]> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('policy_clock_events')
      .select('*')
      .order('event_date', { ascending: true })
      .limit(MAX_EVENTS);
    if (error) {
      console.error('[policy-clock-events-store] Supabase select failed:', error.message);
      return g.__policyClockUserEvents!;
    }
    return (data as Row[]).map(rowToEvent);
  }
  return g.__policyClockUserEvents!;
}

export async function addPolicyClockUserEvent(event: PolicyClockUserEvent): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('policy_clock_events')
      .upsert(eventToRow(event), { onConflict: 'id' });
    if (error) {
      console.error('[policy-clock-events-store] Supabase upsert failed:', error.message);
    } else {
      return;
    }
  }
  const list = g.__policyClockUserEvents!;
  const dup = list.findIndex(e => e.id === event.id);
  if (dup >= 0) list.splice(dup, 1);
  list.unshift(event);
  if (list.length > MAX_EVENTS) list.length = MAX_EVENTS;
}
