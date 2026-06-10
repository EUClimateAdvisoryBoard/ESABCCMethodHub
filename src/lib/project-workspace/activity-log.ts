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
  const { data } = await q;
  return (data ?? []).map(mapActivityEntry);
}
