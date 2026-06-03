// ---------------------------------------------------------------------------
// Shared custom reference store
//
// References added via VBA (Word) or the web Reference Manager are persisted
// in the `custom_references` Postgres table (see supabase migration
// 018_custom_references_store.sql). Reads use the anon key + RLS; writes go
// through the service-role client so the Word-VBA bridge can insert without
// a signed-in user session.
//
// Prior implementations kept the store in `public/data/custom-references.json`
// and PUT updates back to the GitHub Contents API with REFS_GITHUB_TOKEN.
// That made GitHub a de-facto runtime database for user-entered data —
// incompatible with hosting the app inside EEA infrastructure. The GitHub
// path has been retired; `REFS_GITHUB_TOKEN` is now a no-op.
// ---------------------------------------------------------------------------

import { createServerClient, createAdminClient } from '@/lib/supabase-server';
import type { FundingEntry } from './types';

export interface CustomRef {
  id: string;
  doi: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  type: string;
  volume: string;
  issue: string;
  pages: string;
  url: string;
  fullCitation: string;
  addedAt: string;
  source: string; // 'vba' | 'web'
  pdfUrl?: string;
  /** CrossRef-shaped funder list. Aggregating these powers the EU-funded share. */
  funding?: FundingEntry[];
  /**
   * Free tags + project tags ("project:<report>"). Carried through so the
   * Word add-in and `/api/references` can offer a live project filter — see
   * `src/lib/references/projects.ts`.
   */
  tags?: string[];
}

// Row shape as stored in Postgres (snake_case columns).
interface CustomRefRow {
  id: string;
  doi: string | null;
  title: string;
  authors: string | null;
  year: string | null;
  journal: string | null;
  type: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  url: string | null;
  full_citation: string | null;
  source: string;
  pdf_url: string | null;
  funding: FundingEntry[] | null;
  tags: string[] | null;
  added_at: string;
}

function rowToRef(row: CustomRefRow): CustomRef {
  return {
    id: row.id,
    doi: row.doi ?? '',
    title: row.title,
    authors: row.authors ?? '',
    year: row.year ?? '',
    journal: row.journal ?? '',
    type: row.type ?? '',
    volume: row.volume ?? '',
    issue: row.issue ?? '',
    pages: row.pages ?? '',
    url: row.url ?? '',
    fullCitation: row.full_citation ?? '',
    addedAt: row.added_at,
    source: row.source,
    pdfUrl: row.pdf_url ?? undefined,
    funding: row.funding ?? undefined,
    tags: row.tags ?? undefined,
  };
}

function refToRow(ref: CustomRef): Omit<CustomRefRow, 'added_at'> & { added_at?: string } {
  return {
    id: ref.id,
    doi: ref.doi || null,
    title: ref.title,
    authors: ref.authors || null,
    year: ref.year || null,
    journal: ref.journal || null,
    type: ref.type || null,
    volume: ref.volume || null,
    issue: ref.issue || null,
    pages: ref.pages || null,
    url: ref.url || null,
    full_citation: ref.fullCitation || null,
    source: ref.source || 'web',
    pdf_url: ref.pdfUrl ?? null,
    funding: ref.funding && ref.funding.length > 0 ? ref.funding : null,
    tags: ref.tags && ref.tags.length > 0 ? ref.tags : null,
    added_at: ref.addedAt || undefined,
  };
}

// Read-only view. Returns all custom references ordered by add date.
export async function listRefs(): Promise<CustomRef[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('custom_references')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) throw new Error(`list custom_references: ${error.message}`);
  return (data as CustomRefRow[]).map(rowToRef);
}

export interface PersistResult {
  ok: boolean;
  status?: number;
  error?: string;
  // Retained only to keep the legacy backfill route compiling; the GitHub
  // persistence path is disabled so this field is always undefined.
  commitSha?: string;
}

// Insert or update a single reference. Uses the service-role client so the
// VBA bridge (which has no user session) can write; for user-initiated web
// flows the RLS policy enforces `added_by = auth.uid()` separately.
export async function upsertRef(ref: CustomRef, addedBy?: string): Promise<PersistResult> {
  const supabase = createAdminClient();
  const row = { ...refToRow(ref), added_by: addedBy ?? null };
  let { error, status } = await supabase
    .from('custom_references')
    .upsert(row, { onConflict: 'id' });

  // Backward-compat: migration 053 adds the `tags` column. If it hasn't been
  // applied yet, PostgREST rejects the unknown column ("Could not find the
  // 'tags' column … in the schema cache"). Retry without `tags` so saving
  // still works — project tags just won't persist until the migration runs.
  if (error && /tags/i.test(error.message) && /(column|schema cache)/i.test(error.message)) {
    const { tags, ...rowWithoutTags } = row;
    void tags;
    ({ error, status } = await supabase
      .from('custom_references')
      .upsert(rowWithoutTags, { onConflict: 'id' }));
  }

  if (error) return { ok: false, status, error: error.message };
  return { ok: true, status };
}

export async function deleteRef(id: string): Promise<PersistResult> {
  const supabase = createAdminClient();
  const { error, status } = await supabase
    .from('custom_references')
    .delete()
    .eq('id', id);
  if (error) return { ok: false, status, error: error.message };
  return { ok: true, status };
}

// Back-compat shims — keep the old call-sites compiling while they migrate.
// New code should prefer listRefs / upsertRef / deleteRef.

export async function ensureSeedLoaded(): Promise<void> {
  // No-op: the database is the source of truth. Retained so existing
  // route handlers that `await ensureSeedLoaded()` keep working.
}

export function getStore(): CustomRef[] {
  // Deprecated synchronous accessor. Always returns empty; callers should
  // migrate to `await listRefs()`. Kept as a stub to avoid breaking
  // legacy imports in a single-file cutover.
  return [];
}

export async function reloadFromGitHub(): Promise<boolean> {
  // The GitHub-as-database path has been retired for EU-sovereignty
  // reasons. Always returns false so callers know there is nothing to
  // reload. Safe to delete once all references are gone.
  return false;
}

export async function persistToGitHub(_store: CustomRef[]): Promise<PersistResult> {
  return {
    ok: false,
    error:
      'persistToGitHub is disabled: custom references are stored in Postgres. Use upsertRef() instead.',
  };
}

export function hasGitHubToken(): boolean {
  return false;
}
