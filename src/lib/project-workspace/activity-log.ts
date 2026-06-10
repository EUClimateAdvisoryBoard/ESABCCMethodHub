/**
 * Server-side data access for the Project Workspace activity log.
 * ---------------------------------------------------------------
 * Backed by the append-only `pw_activity_log` table (migration 067), which is
 * populated by database triggers on every pw_* table — so every change made
 * anywhere in the workspace shows up here without the API routes having to
 * log explicitly. Read by GET /api/project-workspace/projects/[id]/activity
 * and exported nightly by scripts/backup-content-analysis.mjs.
 */
import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-server';

export interface ActivityEntry {
  id: number;
  projectId: string;
  tableName: string;
  op: 'insert' | 'update' | 'delete';
  entityKind: string;
  entityId: string;
  entityLabel: string;
  summary: string;
  actorId: string | null;
  actorName: string;
  createdAt: string;
}

export function mapActivityEntry(r: Record<string, unknown>): ActivityEntry {
  return {
    id: Number(r.id),
    projectId: r.project_id as string,
    tableName: r.table_name as string,
    op: r.op as ActivityEntry['op'],
    entityKind: (r.entity_kind as string) ?? '',
    entityId: (r.entity_id as string) ?? '',
    entityLabel: (r.entity_label as string) ?? '',
    summary: (r.summary as string) ?? '',
    actorId: (r.actor_id as string | null) ?? null,
    actorName: (r.actor_name as string) ?? '',
    createdAt: r.created_at as string,
  };
}

/**
 * One page of a project's activity, newest first. Pass `before` (an entry id
 * from a previous page) to keep paging backwards through history.
 */
export async function listActivity(
  projectId: string,
  opts?: { before?: number; limit?: number }
): Promise<ActivityEntry[]> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return [];
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
  let q = sb
    .from('pw_activity_log')
    .select('*')
    .eq('project_id', projectId)
    .order('id', { ascending: false })
    .limit(limit);
  if (opts?.before) q = q.lt('id', opts.before);
  const { data, error } = await q;
  if (error) {
    console.error('[pw activity] list failed:', error.message);
    return [];
  }
  return (data ?? []).map(mapActivityEntry);
}

/**
 * Health of the change-tracking installation, per watched table:
 * 'ok' (trigger installed), 'no-trigger' (table exists but migration 067/068
 * hasn't attached the trigger — changes there are NOT being recorded), or
 * 'table-missing' (that feature's own migration isn't applied; harmless).
 * Shown in the Activity log dialog so an empty log explains itself.
 */
export interface ActivityLogStatus {
  /** False = the pw_activity_log table itself is absent (migration 067 not run). */
  installed: boolean;
  /** Total entries across all projects (null when unknown). */
  entryCount: number | null;
  tables: Record<string, 'ok' | 'no-trigger' | 'table-missing'> | null;
  /**
   * Result of the end-to-end probe (migration 069): a real write is made,
   * checked against the log and cleaned up. 'ok' = the pipeline demonstrably
   * works; anything else is the exact failure. Null = not run (e.g. the
   * caller wasn't signed in, or entries already prove the log works).
   */
  selftest:
    | 'ok'
    | 'log-table-missing'
    | 'project-not-in-db'
    | 'trigger-did-not-fire'
    | 'probe-write-failed'
    | 'selftest-missing'
    | null;
}

export async function getActivityLogStatus(): Promise<ActivityLogStatus> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return { installed: false, entryCount: null, tables: null, selftest: null };
  const { data, error } = await sb.rpc('pw_activity_log_status');
  if (!error && data && typeof data === 'object') {
    const d = data as { tables?: ActivityLogStatus['tables']; entryCount?: number };
    return {
      installed: true,
      entryCount: typeof d.entryCount === 'number' ? d.entryCount : null,
      tables: d.tables ?? null,
      selftest: null,
    };
  }
  // The status function is part of migration 068 — if it's absent, probe the
  // log table directly so we can at least distinguish "067 applied" from
  // "nothing applied".
  const { error: tblErr } = await sb.from('pw_activity_log').select('id').limit(1);
  return { installed: !tblErr, entryCount: null, tables: null, selftest: null };
}

/**
 * End-to-end probe: makes a real (self-cleaning) change in the project and
 * verifies the trigger logged it. Definitive — if this returns 'ok', the
 * activity log demonstrably works and an empty log just means nothing has
 * happened since installation.
 */
export async function runActivitySelftest(
  projectId: string
): Promise<NonNullable<ActivityLogStatus['selftest']>> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return 'probe-write-failed';
  const { data, error } = await sb.rpc('pw_activity_log_selftest', { p_project: projectId });
  if (error) return 'selftest-missing';
  const d = (data ?? {}) as { ok?: boolean; reason?: string };
  if (d.ok) return 'ok';
  switch (d.reason) {
    case 'log-table-missing':
    case 'project-not-in-db':
    case 'trigger-did-not-fire':
    case 'probe-write-failed':
      return d.reason;
    default:
      return 'trigger-did-not-fire';
  }
}
