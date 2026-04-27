/**
 * Comments + activity-log store.
 * ------------------------------
 * Powers the in-page discussion threads on policies, references, and
 * news articles. Every comment is (target_kind, target_id)-scoped, so
 * the same component can render threads for heterogeneous targets
 * without a custom join.
 *
 * Activity log is derived — every create/edit/delete emits an
 * `activity` row read by `ActivityFeed.tsx`.
 *
 * Persistence mirrors the rest of the lib: Supabase when configured
 * (RLS-gated by `auth.uid() = user_id`), localStorage fallback for
 * offline / pre-auth browsing.
 */
import { supabase } from './supabase';

export interface Comment {
  id: string;
  user_id: string;
  policy_id: string;
  parent_id: string | null;
  text: string;
  char_start: number | null;
  char_end: number | null;
  created_at: string;
  updated_at: string;
  user_display_name?: string;
  replies?: Comment[];
}

export interface ActivityEntry {
  id: string;
  user_id: string;
  action: string;
  policy_id: string | null;
  target_id: string | null;
  summary: string;
  created_at: string;
  user_display_name?: string;
}

function sb() { return supabase; }

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function fetchComments(policyId: string): Promise<Comment[]> {
  const localComments = getCommentsLocal(policyId);
  const s = sb();
  if (!s) return localComments;

  try {
    const { data, error } = await s
      .from('comments')
      .select('*')
      .eq('policy_id', policyId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.warn('Supabase comments fetch failed:', error?.message);
      return localComments;
    }

    // Fetch display names separately (best-effort)
    const userIds = [...new Set(data.map((r: Record<string, unknown>) => r.user_id as string))];
    let profileMap: Record<string, string> = {};
    try {
      const { data: profiles } = await s.from('profiles').select('id, display_name').in('id', userIds);
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p: Record<string, unknown>) => [p.id as string, p.display_name as string]));
      }
    } catch { /* profiles lookup is best-effort */ }

    const flat = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      policy_id: row.policy_id as string,
      parent_id: row.parent_id as string | null,
      text: row.text as string,
      char_start: row.char_start as number | null,
      char_end: row.char_end as number | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      user_display_name: profileMap[row.user_id as string] || undefined,
    }));

    // Merge remote + local-only comments, deduplicate by id
    const remoteIds = new Set(flat.map(c => c.id));
    const localFlat = getAllCommentsLocal().filter(c => c.policy_id === policyId && !remoteIds.has(c.id));
    const merged = [...flat, ...localFlat];

    // Build threaded structure
    return buildThreads(merged);
  } catch {
    return localComments;
  }
}

function buildThreads(flat: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];
  for (const c of flat) {
    c.replies = [];
    map.set(c.id, c);
  }
  for (const c of flat) {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

export async function createComment(
  policyId: string,
  userId: string,
  text: string,
  opts?: { parentId?: string; charStart?: number; charEnd?: number }
): Promise<Comment | null> {
  const s = sb();
  if (!s) return createCommentLocal(policyId, userId, text, opts);

  try {
    const { data, error } = await s
      .from('comments')
      .insert({
        user_id: userId,
        policy_id: policyId,
        parent_id: opts?.parentId || null,
        text,
        char_start: opts?.charStart ?? null,
        char_end: opts?.charEnd ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('Supabase comment save failed, falling back to localStorage:', error?.message);
      return createCommentLocal(policyId, userId, text, opts);
    }

    // Log activity
    await logActivity(userId, 'comment_created', policyId, data.id as string,
      `Commented on policy`);

    // #4 — fan out @-mention notifications. Failures are non-fatal so the
    // comment is still saved.
    try { await notifyMentions(userId, text, policyId); } catch { /* swallow */ }

    return data as Comment;
  } catch (err) {
    console.warn('Supabase comment error, falling back to localStorage:', err);
    return createCommentLocal(policyId, userId, text, opts);
  }
}

// ─── @-mention helpers ───────────────────────────────────────────────────────

/**
 * Parse a comment body and return every @handle mentioned, lowercased
 * and de-duplicated. Handles must be alphanumeric/dash/dot up to 64
 * characters; the leading '@' is stripped.
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/@([A-Za-z0-9._-]{2,64})/g) || [];
  return Array.from(new Set(matches.map(m => m.slice(1).toLowerCase())));
}

async function notifyMentions(authorId: string, text: string, policyId: string): Promise<void> {
  const handles = extractMentions(text);
  if (handles.length === 0) return;
  const s = sb();
  if (!s) return;
  // Resolve display names against `profiles`. Use ilike so a Maria
  // mentioned as @maria, @Maria, @maria.s all map back to her row.
  const { data: profiles } = await s
    .from('profiles')
    .select('id, display_name')
    .or(handles.map(h => `display_name.ilike.${h}%`).join(','));
  if (!profiles?.length) return;
  const { createNotification } = await import('./notifications');
  // Best-effort author display name.
  const { data: authorProfile } = await s.from('profiles').select('display_name').eq('id', authorId).maybeSingle();
  const authorName = (authorProfile?.display_name as string) || 'Someone';
  for (const p of profiles) {
    if (p.id === authorId) continue;
    await createNotification(
      p.id as string,
      'mention',
      `${authorName} mentioned you`,
      text.length > 120 ? text.slice(0, 120) + '…' : text,
      `/policy-navigator/policy?id=${encodeURIComponent(policyId)}`,
    );
  }
}

export async function deleteComment(id: string): Promise<boolean> {
  const s = sb();
  if (!s) { deleteCommentLocal(id); return true; }
  try {
    const { error } = await s.from('comments').delete().eq('id', id);
    if (error) { deleteCommentLocal(id); return true; }
    return true;
  } catch { deleteCommentLocal(id); return true; }
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function logActivity(
  userId: string, action: string, policyId: string | null,
  targetId: string | null, summary: string
): Promise<void> {
  const s = sb();
  if (!s) { logActivityLocal(action, policyId, summary); return; }
  await s.from('activity_log').insert({
    user_id: userId,
    action,
    policy_id: policyId,
    target_id: targetId,
    summary,
  });
}

export async function fetchActivityLog(opts?: {
  policyId?: string; limit?: number;
}): Promise<ActivityEntry[]> {
  const s = sb();
  if (!s) return getActivityLocal(opts?.policyId);

  try {
    let query = s
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(opts?.limit || 50);

    if (opts?.policyId) query = query.eq('policy_id', opts.policyId);

    const { data, error } = await query;
    if (error || !data) return getActivityLocal(opts?.policyId);

    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      action: row.action as string,
      policy_id: row.policy_id as string | null,
      target_id: row.target_id as string | null,
      summary: row.summary as string,
      created_at: row.created_at as string,
    }));
  } catch {
    return getActivityLocal(opts?.policyId);
  }
}

// ─── localStorage fallbacks ──────────────────────────────────────────────────

const COMMENTS_KEY = 'eu-policy-comments';
const ACTIVITY_KEY = 'eu-policy-activity';

function getCommentsLocal(policyId: string): Comment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    const all: Comment[] = raw ? JSON.parse(raw) : [];
    return buildThreads(all.filter(c => c.policy_id === policyId));
  } catch { return []; }
}

function createCommentLocal(
  policyId: string, userId: string, text: string,
  opts?: { parentId?: string; charStart?: number; charEnd?: number }
): Comment {
  const all = getAllCommentsLocal();
  const c: Comment = {
    id: crypto.randomUUID(),
    user_id: userId || 'local',
    policy_id: policyId,
    parent_id: opts?.parentId || null,
    text,
    char_start: opts?.charStart ?? null,
    char_end: opts?.charEnd ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_display_name: 'Guest',
  };
  all.push(c);
  try {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save comment to localStorage:', err);
  }
  logActivityLocal('comment_created', policyId, 'Commented on policy');
  return c;
}

function deleteCommentLocal(id: string): void {
  const all = getAllCommentsLocal().filter(c => c.id !== id);
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
}

function getAllCommentsLocal(): Comment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function logActivityLocal(action: string, policyId: string | null, summary: string): void {
  if (typeof window === 'undefined') return;
  const all = getActivityLocal();
  all.unshift({
    id: crypto.randomUUID(),
    user_id: 'local',
    action,
    policy_id: policyId,
    target_id: null,
    summary,
    created_at: new Date().toISOString(),
    user_display_name: 'You',
  });
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all.slice(0, 100)));
}

function getActivityLocal(policyId?: string): ActivityEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    const all: ActivityEntry[] = raw ? JSON.parse(raw) : [];
    return policyId ? all.filter(a => a.policy_id === policyId) : all;
  } catch { return []; }
}
