/**
 * Server-side data access for Project Workspace collaboration.
 * ------------------------------------------------------------
 * Reads/writes the `pw_comments` and `pw_verifications` tables added in
 * migration 043. Everything here persists in Postgres — there is no
 * localStorage fallback for collaboration data, so additions are never
 * lost when a colleague reloads or opens the workspace elsewhere.
 *
 * Targets are addressed by a (kind, id) pair so one comment thread /
 * verification widget works for every module without bespoke joins:
 *   indicator           → indicator id
 *   recommendation      → recommendation id
 *   member-state-cell   → `${countryCode}:${sectorId}`
 *   policy              → policy id
 *   module              → module id
 *   project             → project id
 */
import 'server-only';
import { getServerSupabase } from '@/lib/supabase-server';

export type WorkspaceTargetKind =
  | 'indicator'
  | 'recommendation'
  | 'member-state-cell'
  | 'policy'
  | 'module'
  | 'project';

export interface WorkspaceComment {
  id: string;
  projectId: string;
  targetKind: WorkspaceTargetKind;
  targetId: string;
  parentId: string | null;
  body: string;
  mentions: string[];
  resolved: boolean;
  createdBy: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceVerification {
  projectId: string;
  targetKind: WorkspaceTargetKind;
  targetId: string;
  userId: string;
  status: 'verified' | 'disputed';
  note: string;
  userName: string;
  updatedAt: string;
}

function mapComment(r: Record<string, unknown>): WorkspaceComment {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    targetKind: r.target_kind as WorkspaceTargetKind,
    targetId: r.target_id as string,
    parentId: (r.parent_id as string | null) ?? null,
    body: r.body as string,
    mentions: (r.mentions as string[] | null) ?? [],
    resolved: !!r.resolved,
    createdBy: (r.created_by as string | null) ?? null,
    authorName: (r.author_name as string) ?? '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapVerification(r: Record<string, unknown>): WorkspaceVerification {
  return {
    projectId: r.project_id as string,
    targetKind: r.target_kind as WorkspaceTargetKind,
    targetId: r.target_id as string,
    userId: r.user_id as string,
    status: r.status as 'verified' | 'disputed',
    note: (r.note as string) ?? '',
    userName: (r.user_name as string) ?? '',
    updatedAt: r.updated_at as string,
  };
}

/**
 * All comments for a project, optionally filtered to one target. Returned
 * flat (oldest first) — the client threads them by `parentId`.
 */
export async function listComments(
  projectId: string,
  target?: { kind: WorkspaceTargetKind; id: string }
): Promise<WorkspaceComment[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  let q = sb
    .from('pw_comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (target) q = q.eq('target_kind', target.kind).eq('target_id', target.id);
  const { data } = await q;
  return (data ?? []).map(mapComment);
}

/** All verification rows for a project, optionally filtered to one target. */
export async function listVerifications(
  projectId: string,
  target?: { kind: WorkspaceTargetKind; id: string }
): Promise<WorkspaceVerification[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  let q = sb.from('pw_verifications').select('*').eq('project_id', projectId);
  if (target) q = q.eq('target_kind', target.kind).eq('target_id', target.id);
  const { data } = await q;
  return (data ?? []).map(mapVerification);
}

/** Map of profile id → display name, for resolving @mentions and authors. */
export async function listProfiles(): Promise<{ id: string; name: string }[]> {
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('profiles')
    .select('id, display_name')
    .order('display_name', { ascending: true });
  return (data ?? []).map((p: { id: string; display_name: string | null }) => ({
    id: p.id,
    name: p.display_name || 'Anonymous',
  }));
}

export { mapComment, mapVerification };
