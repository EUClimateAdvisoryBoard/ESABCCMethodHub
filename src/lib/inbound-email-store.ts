/**
 * Persistent store for inbound email items.
 *
 * Primary backend: Supabase table `public.inbound_emails` (see
 * `supabase/migrations/002_inbound_emails.sql`). Uses the SERVICE ROLE key
 * (via `getServerSupabase`) so the webhook can insert rows under the default
 * "reads are public, writes are service-role-only" RLS policy. This is the
 * durable basis for the Secretariat news feed and the monthly Brussels
 * Bulletin — items survive cold starts, redeployments, and ESABCC turnover.
 *
 * Fallback: module-scoped in-memory cache on `globalThis`. Used only when
 * the Supabase env vars are missing (e.g. local dev without `.env.local`).
 * The in-memory store is intentionally lossy — anything it holds vanishes on
 * cold start. Supabase is required for production.
 *
 * All public functions are async so callers don't need to know which backend
 * is active.
 */

import { memoryCache, withBackend, isPersistent } from './db/store-factory';

export { isPersistent };

export interface InboundEmailItem {
  id: string;
  title: string;
  summary: string;
  fullText: string;
  aiSummary?: string;
  detailedAnalysis?: string;
  isDailySpecial?: boolean;
  specialKind?: string;
  source: string;
  sourceLabel: string;
  from: string;
  url: string;
  publishedDate: string;
  receivedDate: string;
  tags: string[];
  isExternal: true;
  type: 'newsletter';
}

// ── In-memory fallback ──────────────────────────────────────────────────────

const cache = memoryCache<InboundEmailItem>('__inboundEmailItems');

const MAX_ITEMS = 2000;

// ── In-memory fallback operations (shared by the no-Supabase path and the
// Supabase-error fall-through) ──────────────────────────────────────────────

function addMemory(item: InboundEmailItem): void {
  const items = cache.get();
  const dupIdx = items.findIndex(i => i.title === item.title && i.from === item.from);
  if (dupIdx >= 0) items.splice(dupIdx, 1);
  items.unshift(item);
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
}

function updateMemory(id: string, patch: Partial<InboundEmailItem>): InboundEmailItem | null {
  const items = cache.get();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch };
  return items[idx];
}

function removeMemory(id: string): boolean {
  const items = cache.get();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  return true;
}

// ── Row ↔ item conversion ──────────────────────────────────────────────────

interface InboundEmailRow {
  id: string;
  title: string;
  summary: string | null;
  full_text: string | null;
  ai_summary: string | null;
  detailed_analysis: string | null;
  is_daily_special: boolean | null;
  special_kind: string | null;
  source: string | null;
  source_label: string | null;
  from_display: string | null;
  url: string | null;
  published_date: string | null;
  received_date: string | null;
  tags: string[] | null;
  is_external: boolean | null;
  type: string | null;
}

function rowToItem(r: InboundEmailRow): InboundEmailItem {
  return {
    id: r.id,
    title: r.title,
    summary: r.summary || '',
    fullText: r.full_text || '',
    aiSummary: r.ai_summary || undefined,
    detailedAnalysis: r.detailed_analysis || undefined,
    isDailySpecial: r.is_daily_special || undefined,
    specialKind: r.special_kind || undefined,
    source: r.source || 'other',
    sourceLabel: r.source_label || 'Email',
    from: r.from_display || '',
    url: r.url || '#',
    publishedDate: r.published_date || new Date().toISOString(),
    receivedDate: r.received_date || new Date().toISOString(),
    tags: r.tags || [],
    isExternal: true,
    type: 'newsletter',
  };
}

function itemToRow(i: InboundEmailItem): InboundEmailRow {
  return {
    id: i.id,
    title: i.title,
    summary: i.summary || null,
    full_text: i.fullText || null,
    ai_summary: i.aiSummary || null,
    detailed_analysis: i.detailedAnalysis || null,
    is_daily_special: !!i.isDailySpecial,
    special_kind: i.specialKind || null,
    source: i.source,
    source_label: i.sourceLabel,
    from_display: i.from || null,
    url: i.url || null,
    published_date: i.publishedDate,
    received_date: i.receivedDate,
    tags: i.tags,
    is_external: true,
    type: 'newsletter',
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getInboundItems(): Promise<InboundEmailItem[]> {
  return withBackend(
    async (sb) => {
      const { data, error } = await sb
        .from('inbound_emails')
        .select('*')
        .order('received_date', { ascending: false })
        .limit(MAX_ITEMS);
      if (error) {
        console.error('[inbound-email-store] Supabase getInboundItems failed:', error.message);
        return cache.get();
      }
      return (data as InboundEmailRow[]).map(rowToItem);
    },
    () => cache.get(),
  );
}

export async function addInboundItem(item: InboundEmailItem): Promise<void> {
  await withBackend<void>(
    async (sb) => {
      // Deduplicate on (title, from_display) by deleting any earlier row that
      // matches, then inserting this one. Upsert alone isn't enough because
      // the dedupe key isn't the primary key.
      try {
        await sb
          .from('inbound_emails')
          .delete()
          .eq('title', item.title)
          .eq('from_display', item.from || '');
      } catch (err) {
        console.warn('[inbound-email-store] Dedupe delete failed (non-fatal):', err);
      }

      const { error } = await sb
        .from('inbound_emails')
        .upsert(itemToRow(item), { onConflict: 'id' });
      if (!error) return;
      console.error('[inbound-email-store] Supabase addInboundItem failed:', error.message);
      // Fall through to also push into memory so the item isn't completely lost
      addMemory(item);
    },
    () => addMemory(item),
  );
}

export async function updateInboundItem(
  id: string,
  patch: Partial<InboundEmailItem>,
): Promise<InboundEmailItem | null> {
  return withBackend(
    async (sb) => {
      // Only patch the snake_case columns that changed
      const rowPatch: Partial<InboundEmailRow> = {};
      if (patch.title !== undefined) rowPatch.title = patch.title;
      if (patch.summary !== undefined) rowPatch.summary = patch.summary;
      if (patch.fullText !== undefined) rowPatch.full_text = patch.fullText;
      if (patch.aiSummary !== undefined) rowPatch.ai_summary = patch.aiSummary || null;
      if (patch.detailedAnalysis !== undefined) rowPatch.detailed_analysis = patch.detailedAnalysis || null;
      if (patch.isDailySpecial !== undefined) rowPatch.is_daily_special = patch.isDailySpecial;
      if (patch.specialKind !== undefined) rowPatch.special_kind = patch.specialKind || null;
      if (patch.tags !== undefined) rowPatch.tags = patch.tags;
      if (Object.keys(rowPatch).length === 0) {
        return await findInboundItem(id);
      }

      const { data, error } = await sb
        .from('inbound_emails')
        .update(rowPatch)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) {
        console.error('[inbound-email-store] Supabase updateInboundItem failed:', error.message);
        return null;
      }
      return data ? rowToItem(data as InboundEmailRow) : null;
    },
    () => updateMemory(id, patch),
  );
}

export async function findInboundItem(id: string): Promise<InboundEmailItem | null> {
  return withBackend(
    async (sb) => {
      const { data, error } = await sb
        .from('inbound_emails')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('[inbound-email-store] Supabase findInboundItem failed:', error.message);
        return null;
      }
      return data ? rowToItem(data as InboundEmailRow) : null;
    },
    () => cache.get().find(i => i.id === id) || null,
  );
}

export async function clearInboundItems(): Promise<void> {
  await withBackend<void>(
    async (sb) => {
      const { error } = await sb.from('inbound_emails').delete().neq('id', '');
      if (error) console.error('[inbound-email-store] Supabase clearInboundItems failed:', error.message);
    },
    () => {},
  );
  // Memory cache is always cleared regardless of which backend is active.
  cache.set([]);
}

export async function removeInboundItem(id: string): Promise<boolean> {
  return withBackend(
    async (sb) => {
      const { error } = await sb.from('inbound_emails').delete().eq('id', id);
      if (error) {
        console.error('[inbound-email-store] Supabase removeInboundItem failed:', error.message);
        return false;
      }
      // Also strip from in-memory cache if present
      removeMemory(id);
      return true;
    },
    () => removeMemory(id),
  );
}

export async function countInboundItems(): Promise<number> {
  return withBackend(
    async (sb) => {
      const { count, error } = await sb
        .from('inbound_emails')
        .select('*', { count: 'exact', head: true });
      if (!error && typeof count === 'number') return count;
      return cache.get().length;
    },
    () => cache.get().length,
  );
}
