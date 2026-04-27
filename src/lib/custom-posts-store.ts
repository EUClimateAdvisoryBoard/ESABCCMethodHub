/**
 * Persistent store for user-authored custom (internal) posts on the
 * Secretariat News Feed.
 *
 * Primary backend: Supabase table `public.custom_posts` (see
 * `supabase/migrations/006_custom_posts.sql`). Uses the SERVICE ROLE key
 * (via `getServerSupabase`) so the `/api/custom-posts` route can insert and
 * update rows under the default "reads are public, writes are service-role-
 * only" RLS policy. This is the durable basis for internal posts — items
 * survive cold starts, redeployments, and browser changes, and are visible
 * to the whole Secretariat.
 *
 * Fallback: module-scoped in-memory cache on `globalThis`. Used only when
 * the Supabase env vars are missing (e.g. local dev without `.env.local`).
 * The in-memory store is intentionally lossy — anything it holds vanishes
 * on cold start. Supabase is required for production.
 *
 * All public functions are async so callers don't need to know which
 * backend is active.
 */

import { getServerSupabase } from './supabase-server';

export interface CustomPostItem {
  id: string;
  title: string;
  summary: string;
  aiSummary?: string;
  source: string;
  sourceLabel: string;
  url: string;
  publishedDate: string; // YYYY-MM-DD
  addedDate: string;     // YYYY-MM-DD
  addedBy: string;
  authorId?: string;
  type: 'article' | 'paper' | 'press_release' | 'report' | 'internal_note';
  tags: string[];
  isExternal: boolean;
}

// ── In-memory fallback ──────────────────────────────────────────────────────

interface GlobalCache {
  __customPostItems?: CustomPostItem[];
}
const g = globalThis as unknown as GlobalCache;
if (!g.__customPostItems) g.__customPostItems = [];

const MAX_ITEMS = 2000;

// ── Row ↔ item conversion ──────────────────────────────────────────────────

interface CustomPostRow {
  id: string;
  title: string;
  summary: string | null;
  ai_summary: string | null;
  source: string | null;
  source_label: string | null;
  url: string | null;
  published_date: string | null;
  added_date: string | null;
  added_by: string | null;
  author_id: string | null;
  type: string | null;
  tags: string[] | null;
  is_external: boolean | null;
}

function rowToItem(r: CustomPostRow): CustomPostItem {
  const validTypes: CustomPostItem['type'][] = [
    'article', 'paper', 'press_release', 'report', 'internal_note',
  ];
  const type = (validTypes.includes(r.type as CustomPostItem['type'])
    ? r.type
    : 'internal_note') as CustomPostItem['type'];
  return {
    id: r.id,
    title: r.title,
    summary: r.summary || '',
    aiSummary: r.ai_summary || undefined,
    source: r.source || 'internal',
    sourceLabel: r.source_label || 'ESABCC Secretariat',
    url: r.url || '',
    publishedDate: r.published_date || new Date().toISOString().split('T')[0],
    addedDate: r.added_date || new Date().toISOString().split('T')[0],
    addedBy: r.added_by || '',
    authorId: r.author_id || undefined,
    type,
    tags: r.tags || [],
    isExternal: !!r.is_external,
  };
}

function itemToRow(i: CustomPostItem): CustomPostRow {
  return {
    id: i.id,
    title: i.title,
    summary: i.summary || null,
    ai_summary: i.aiSummary || null,
    source: i.source,
    source_label: i.sourceLabel,
    url: i.url || '',
    published_date: i.publishedDate,
    added_date: i.addedDate,
    added_by: i.addedBy || '',
    author_id: i.authorId || null,
    type: i.type,
    tags: i.tags,
    is_external: !!i.isExternal,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export function isPersistent(): boolean {
  return getServerSupabase() !== null;
}

export async function getCustomPosts(): Promise<CustomPostItem[]> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('custom_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS);
    if (error) {
      console.error('[custom-posts-store] Supabase getCustomPosts failed:', error.message);
      return g.__customPostItems!;
    }
    return (data as CustomPostRow[]).map(rowToItem);
  }
  return g.__customPostItems!;
}

export async function addCustomPost(item: CustomPostItem): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('custom_posts')
      .upsert(itemToRow(item), { onConflict: 'id' });
    if (error) {
      console.error('[custom-posts-store] Supabase addCustomPost failed:', error.message);
      // Fall through to in-memory so the item isn't completely lost
    } else {
      return;
    }
  }

  const items = g.__customPostItems!;
  const dupIdx = items.findIndex(i => i.id === item.id);
  if (dupIdx >= 0) items.splice(dupIdx, 1);
  items.unshift(item);
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
}

export async function updateCustomPost(
  id: string,
  patch: Partial<CustomPostItem>,
): Promise<CustomPostItem | null> {
  const sb = getServerSupabase();
  if (sb) {
    const rowPatch: Partial<CustomPostRow> & { updated_at?: string } = {};
    if (patch.title !== undefined) rowPatch.title = patch.title;
    if (patch.summary !== undefined) rowPatch.summary = patch.summary;
    if (patch.aiSummary !== undefined) rowPatch.ai_summary = patch.aiSummary || null;
    if (patch.url !== undefined) rowPatch.url = patch.url;
    if (patch.tags !== undefined) rowPatch.tags = patch.tags;
    if (patch.type !== undefined) rowPatch.type = patch.type;
    if (Object.keys(rowPatch).length === 0) {
      return await findCustomPost(id);
    }
    rowPatch.updated_at = new Date().toISOString();

    const { data, error } = await sb
      .from('custom_posts')
      .update(rowPatch)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      console.error('[custom-posts-store] Supabase updateCustomPost failed:', error.message);
      return null;
    }
    return data ? rowToItem(data as CustomPostRow) : null;
  }

  const items = g.__customPostItems!;
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch };
  return items[idx];
}

export async function findCustomPost(id: string): Promise<CustomPostItem | null> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('custom_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[custom-posts-store] Supabase findCustomPost failed:', error.message);
      return null;
    }
    return data ? rowToItem(data as CustomPostRow) : null;
  }
  return g.__customPostItems!.find(i => i.id === id) || null;
}

export async function deleteCustomPost(id: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb.from('custom_posts').delete().eq('id', id);
    if (error) {
      console.error('[custom-posts-store] Supabase deleteCustomPost failed:', error.message);
      return false;
    }
    return true;
  }
  const items = g.__customPostItems!;
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  return true;
}
