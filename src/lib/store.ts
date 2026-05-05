/**
 * Annotation + custom-tag store (M·04 Policy Navigator data plane).
 * ------------------------------------------------------------------
 *
 * Two state families are kept here:
 *
 *   1. **Annotations** — per-user notes anchored to a specific
 *      `(celex, article, rect)` inside a policy text. Powers
 *      `FullTextViewer`'s margin notes and sticky comments.
 *   2. **Custom tags** — user-defined tag vocabularies layered on top
 *      of the canonical sector / domain / instrument taxonomies.
 *      Used to filter the network graph and the gap explorer.
 *
 * Two-tier persistence mirroring the content-analysis store:
 *
 *   - **Supabase** is authoritative when configured, keyed by the
 *     signed-in user's `auth.uid()` with RLS in the `policy_annots`
 *     and `custom_tags` tables.
 *   - **localStorage** is an offline-first mirror. Mutations write
 *     to localStorage first for instant UI, then flush to Supabase
 *     in the background; read paths prefer Supabase on mount and
 *     fall back to localStorage on network failure.
 *
 * localStorage keys are namespaced `eu-policy-*` (historic name;
 * kept to avoid invalidating existing user drafts during upgrades).
 */
import { Annotation, TagDef } from './types';
import { supabase } from './supabase';

const ANNOTATIONS_KEY = 'eu-policy-annotations';
const CUSTOM_TAGS_KEY = 'eu-policy-custom-tags';

function getSupabase() { return supabase; }

// ─── Default tags ────────────────────────────────────────────────────────────

export const DEFAULT_TAGS: TagDef[] = [
  { name: 'policy_gap', color: '#EF4444', description: 'Missing implementation detail or policy coverage' },
  { name: 'ambiguity', color: '#F59E0B', description: 'Unclear or ambiguous language in legislation' },
  { name: 'strong_commitment', color: '#10B981', description: 'Clear, binding commitment or obligation' },
  { name: 'weak_language', color: '#F97316', description: 'Non-binding or hedged phrasing (should/may)' },
  { name: 'cross_reference', color: '#3B82F6', description: 'Explicit reference to another policy instrument' },
  { name: 'quantitative_target', color: '#8B5CF6', description: 'Specific numeric target or threshold' },
  { name: 'implementation_mechanism', color: '#06B6D4', description: 'Describes how a provision will be implemented' },
  { name: 'review_clause', color: '#6366F1', description: 'Scheduled review or revision clause' },
  { name: 'sectoral_policy_link', color: '#0065A4', description: 'AI-generated — connection from Sectoral Policy Overview' },
];

// ─── Annotations ─────────────────────────────────────────────────────────────

// Fetch annotations — merges Supabase + localStorage to ensure fallback-saved annotations are visible
export async function fetchAnnotations(policyId?: string): Promise<(Annotation & { user_display_name?: string })[]> {
  const localAnns = getAnnotationsLocal(policyId);
  const sb = getSupabase();
  if (!sb) return localAnns;

  try {
    // Try with profiles join first, fall back to plain query if join fails
    let query = sb
      .from('annotations')
      .select('*')
      .order('created_at', { ascending: false });

    if (policyId) query = query.eq('policy_id', policyId);

    const { data, error } = await query;
    if (error || !data) {
      console.warn('Supabase annotations fetch failed:', error?.message);
      return localAnns;
    }

    // Try to fetch display names separately (best-effort)
    const userIds = [...new Set(data.map((r: Record<string, unknown>) => r.user_id as string))];
    let profileMap: Record<string, string> = {};
    try {
      const { data: profiles } = await sb.from('profiles').select('id, display_name').in('id', userIds);
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p: Record<string, unknown>) => [p.id as string, p.display_name as string]));
      }
    } catch { /* profiles lookup is best-effort */ }

    const remoteAnns = data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      policy_id: row.policy_id as string,
      tag: row.tag as string,
      text_excerpt: row.text_excerpt as string,
      char_start: row.char_start as number,
      char_end: row.char_end as number,
      note: (row.note as string) || '',
      created_at: row.created_at as string,
      user_id: row.user_id as string,
      user_display_name: profileMap[row.user_id as string] || undefined,
    }));

    // Merge: remote annotations + any local-only annotations (deduplicate by id)
    const remoteIds = new Set(remoteAnns.map(a => a.id));
    const localOnly = localAnns.filter(a => !remoteIds.has(a.id));
    return [...remoteAnns, ...localOnly];
  } catch {
    return localAnns;
  }
}

// Save annotation to Supabase (async, requires auth)
// Falls back to localStorage if Supabase is unavailable or fails
export async function saveAnnotationRemote(
  ann: Omit<Annotation, 'id' | 'created_at'>,
  userId: string
): Promise<Annotation | null> {
  const sb = getSupabase();
  if (!sb) return saveAnnotationLocal(ann, userId);

  try {
    const { data, error } = await sb
      .from('annotations')
      .insert({
        user_id: userId,
        policy_id: ann.policy_id,
        tag: ann.tag,
        text_excerpt: ann.text_excerpt,
        char_start: ann.char_start,
        char_end: ann.char_end,
        note: ann.note,
      })
      .select()
      .single();

    if (error || !data) {
      console.warn('Supabase annotation save failed, falling back to localStorage:', error?.message);
      return saveAnnotationLocal(ann, userId);
    }

    // Log activity
    try {
      const { logActivity } = await import('./comments');
      await logActivity(userId, 'annotation_created', ann.policy_id, data.id as string,
        `Added "${ann.tag.replace(/_/g, ' ')}" annotation`);
    } catch { /* activity logging is best-effort */ }

    return data as Annotation;
  } catch (err) {
    console.warn('Supabase annotation save error, falling back to localStorage:', err);
    return saveAnnotationLocal(ann, userId);
  }
}

// Delete annotation from Supabase (only own)
export async function deleteAnnotationRemote(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) { deleteAnnotationLocal(id); return true; }
  try {
    const { error } = await sb.from('annotations').delete().eq('id', id);
    if (error) {
      console.warn('Supabase annotation delete failed:', error.message);
      return false;
    }
    // Also remove any localStorage copy so fetchAnnotations doesn't resurface it
    deleteAnnotationLocal(id);
    return true;
  } catch (err) {
    console.warn('Supabase annotation delete error:', err);
    return false;
  }
}

// Update annotation in Supabase (only own)
export async function updateAnnotationRemote(
  id: string,
  updates: Partial<Pick<Annotation, 'tag' | 'note'>>
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) { updateAnnotationLocal(id, updates); return true; }
  try {
    const { error } = await sb.from('annotations').update(updates).eq('id', id);
    if (error) { updateAnnotationLocal(id, updates); return true; }
    return true;
  } catch { updateAnnotationLocal(id, updates); return true; }
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function fetchTags(): Promise<TagDef[]> {
  const sb = getSupabase();
  if (!sb) return getTagsLocal();

  try {
    const { data, error } = await sb.from('custom_tags').select('*');
    if (error || !data) return getTagsLocal();
    const custom: TagDef[] = data.map((row: Record<string, unknown>) => ({
      name: row.name as string,
      color: row.color as string,
      description: (row.description as string) || '',
    }));
    return [...DEFAULT_TAGS, ...custom];
  } catch { return getTagsLocal(); }
}

export async function addCustomTagRemote(tag: TagDef, userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) { addCustomTagLocal(tag); return true; }
  const { error } = await sb.from('custom_tags').insert({
    name: tag.name,
    color: tag.color,
    description: tag.description,
    created_by: userId,
  });
  return !error;
}

// ─── Annotation stats (works with both backends) ────────────────────────────

export async function fetchAnnotationStats() {
  const all = await fetchAnnotations();
  const byTag: Record<string, number> = {};
  const byPolicy: Record<string, number> = {};
  for (const a of all) {
    byTag[a.tag] = (byTag[a.tag] || 0) + 1;
    byPolicy[a.policy_id] = (byPolicy[a.policy_id] || 0) + 1;
  }
  return { total: all.length, byTag, byPolicy };
}

// ─── Tag color helper (sync, uses defaults) ──────────────────────────────────

export function getTagColor(tagName: string): string {
  return DEFAULT_TAGS.find(t => t.name === tagName)?.color || '#6B7280';
}

// ─── localStorage fallback (original implementation) ─────────────────────────

function getAnnotationsLocal(policyId?: string): Annotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ANNOTATIONS_KEY);
    const all: Annotation[] = raw ? JSON.parse(raw) : [];
    return policyId ? all.filter(a => a.policy_id === policyId) : all;
  } catch { return []; }
}

function saveAnnotationLocal(ann: Omit<Annotation, 'id' | 'created_at'>, userId?: string): Annotation {
  const all = getAnnotationsLocal();
  const newAnn: Annotation & { user_id?: string; user_display_name?: string } = {
    ...ann,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    user_id: userId,
    user_display_name: 'Guest',
  };
  all.push(newAnn);
  try {
    localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save annotation to localStorage:', err);
  }
  return newAnn;
}

function deleteAnnotationLocal(id: string): void {
  const all = getAnnotationsLocal().filter(a => a.id !== id);
  localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(all));
}

function updateAnnotationLocal(id: string, updates: Partial<Pick<Annotation, 'tag' | 'note'>>): void {
  const all = getAnnotationsLocal();
  const idx = all.findIndex(a => a.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(all));
  }
}

function getTagsLocal(): TagDef[] {
  if (typeof window === 'undefined') return DEFAULT_TAGS;
  try {
    const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
    const custom: TagDef[] = raw ? JSON.parse(raw) : [];
    return [...DEFAULT_TAGS, ...custom];
  } catch { return DEFAULT_TAGS; }
}

function addCustomTagLocal(tag: TagDef): void {
  const raw = localStorage.getItem(CUSTOM_TAGS_KEY);
  const custom: TagDef[] = raw ? JSON.parse(raw) : [];
  if (!custom.find(t => t.name === tag.name) && !DEFAULT_TAGS.find(t => t.name === tag.name)) {
    custom.push(tag);
    localStorage.setItem(CUSTOM_TAGS_KEY, JSON.stringify(custom));
  }
}

// ─── Sync exports for backward compatibility (used by components that haven't migrated) ─

export function getAnnotations(policyId?: string): Annotation[] {
  return getAnnotationsLocal(policyId);
}

export function getAnnotationStats() {
  const all = getAnnotationsLocal();
  const byTag: Record<string, number> = {};
  const byPolicy: Record<string, number> = {};
  for (const a of all) {
    byTag[a.tag] = (byTag[a.tag] || 0) + 1;
    byPolicy[a.policy_id] = (byPolicy[a.policy_id] || 0) + 1;
  }
  return { total: all.length, byTag, byPolicy };
}

export function getTags(): TagDef[] {
  return getTagsLocal();
}
