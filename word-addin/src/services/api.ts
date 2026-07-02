// ============================================================================
// Word Add-in API Layer — Bridge/Supabase Communication
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BRIDGE_URL = 'http://127.0.0.1:8585';

// These should be set during build or via settings
const SUPABASE_URL = (window as any).__REFMANAGER_SUPABASE_URL__ || '';
const SUPABASE_KEY = (window as any).__REFMANAGER_SUPABASE_KEY__ || '';
// GDPR/security: matches BRIDGE_AUTH_TOKEN configured on the bridge.
// Required for every call except /api/status. The IT installer writes
// this onto window during the add-in bootstrap.
const BRIDGE_TOKEN: string = (window as any).__REFMANAGER_BRIDGE_TOKEN__ || '';

let useBridge = false;
let supabase: SupabaseClient | null = null;

function bridgeHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...(extra || {}) };
  if (BRIDGE_TOKEN) h['Authorization'] = `Bearer ${BRIDGE_TOKEN}`;
  return h;
}

export interface RefSearchResult {
  id: string;
  citation_key: string;
  title: string;
  authors: { family: string; given?: string }[] | null;
  year: number | null;
  container_title: string | null;
  csl_json: any;
  /** Reference-manager note field (references.notes). */
  notes?: string | null;
  /** Paper abstract, used as the fallback "summary" when the workspace has
   *  not authored a whole-document summary for this reference. */
  abstract?: string | null;
  /** Workspace whole-document summary (content_analysis_summaries.text),
   *  loaded lazily via getWorkspaceMeta(). */
  summary?: string | null;
  /** Chapter (report-chapter / sector) tag ids applied to this reference in
   *  the project workspace, loaded lazily via getWorkspaceMeta(). Each id is
   *  self-describing: `chapter:<color>:<name>` (see chapter-tags.ts). */
  chapters?: string[];
}

/** Workspace metadata for a batch of references — the whole-document summary
 *  and the chapter (report-chapter / sector) classification authored in the
 *  project workspace. Both live in the durable content-analysis tables and are
 *  publicly readable, keyed by the workbench document id `ref-doc-<refId>`. */
export interface WorkspaceMeta {
  /** refId → workspace summary text. */
  summaries: Record<string, string>;
  /** refId → chapter tag ids (`chapter:<color>:<name>`). */
  chapters: Record<string, string[]>;
  /** refId → reference-manager note (references.notes). Provided here too so
   *  notes are available in bridge mode, where the search endpoint does not
   *  carry them. */
  notes: Record<string, string>;
}

/** The workbench document id used by the content-analysis tables to key a
 *  reference. Mirrors the web app's `ref-doc-<referenceId>` convention. */
function refDocId(refId: string): string {
  return `ref-doc-${refId}`;
}

/** Parse a chapter-tag id (`chapter:<color>:<name>`) into its display parts.
 *  Returns null for ids that aren't chapter tags or are malformed. */
export function parseChapterTag(id: string): { name: string; color: string } | null {
  const PREFIX = 'chapter:';
  if (!id.startsWith(PREFIX)) return null;
  const rest = id.slice(PREFIX.length);
  const sep = rest.indexOf(':');
  if (sep === -1) return null;
  const color = rest.slice(0, sep);
  const name = rest.slice(sep + 1).trim();
  if (!name) return null;
  return { name, color };
}

export interface BibliographyResult {
  entries: string[];
  params?: any;
}

// ── Initialize Connection ──

export async function initConnection(): Promise<{ bridge: boolean; supabase: boolean }> {
  let bridgeOk = false;
  let supabaseOk = false;

  // Try bridge first
  try {
    const res = await fetch(`${BRIDGE_URL}/api/status`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      useBridge = true;
      bridgeOk = true;
    }
  } catch {
    useBridge = false;
  }

  // Initialize Supabase as fallback
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      supabaseOk = true;
    } catch {
      supabase = null;
    }
  }

  return { bridge: bridgeOk, supabase: supabaseOk };
}

// ── Search References ──

export async function searchReferences(query: string, libraryId: string): Promise<RefSearchResult[]> {
  if (useBridge) {
    const res = await fetch(
      `${BRIDGE_URL}/api/references/search?q=${encodeURIComponent(query)}&library_id=${encodeURIComponent(libraryId)}`,
      { headers: bridgeHeaders() },
    );
    if (!res.ok) throw new Error('Bridge search failed');
    return res.json();
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('references')
      .select('id, citation_key, title, authors, year, container_title, csl_json, notes, abstract')
      .eq('library_id', libraryId)
      .or(`title.ilike.%${query}%,citation_key.ilike.%${query}%,container_title.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  throw new Error('No connection available');
}

// ── Get References by IDs ──

export async function getReferencesByIds(ids: string[]): Promise<RefSearchResult[]> {
  if (useBridge) {
    const res = await fetch(`${BRIDGE_URL}/api/references/batch`, {
      method: 'POST',
      headers: bridgeHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error('Bridge batch fetch failed');
    return res.json();
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('references')
      .select('id, citation_key, title, authors, year, container_title, csl_json')
      .in('id', ids);

    if (error) throw error;
    return data || [];
  }

  throw new Error('No connection available');
}

// ── Workspace Metadata (summary + chapter classification + notes) ──
//
// The project workspace enriches every reference with a whole-document summary
// and a chapter (report-chapter / sector) classification. Those live in the
// durable content-analysis tables, keyed by the workbench document id
// `ref-doc-<referenceId>`, and are publicly readable. Loading them lets an
// author see, at the point of citing, WHY a paper is in the library and which
// chapter it was lined up for — and filter the results by chapter.

export async function getWorkspaceMeta(refIds: string[]): Promise<WorkspaceMeta> {
  const empty: WorkspaceMeta = { summaries: {}, chapters: {}, notes: {} };
  if (refIds.length === 0) return empty;

  if (useBridge) {
    try {
      const res = await fetch(`${BRIDGE_URL}/api/references/workspace-meta`, {
        method: 'POST',
        headers: bridgeHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ids: refIds }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          summaries: data.summaries || {},
          chapters: data.chapters || {},
          notes: data.notes || {},
        };
      }
    } catch {
      // Fall through to Supabase / empty. Missing workspace context must never
      // block the search results themselves.
    }
  }

  if (supabase) {
    try {
      return await fetchWorkspaceMetaFromSupabase(supabase, refIds);
    } catch {
      return empty;
    }
  }

  return empty;
}

/** Shared Supabase query for workspace metadata. Exported so the bridge can
 *  reuse the exact same shape server-side if desired. */
export async function fetchWorkspaceMetaFromSupabase(
  client: SupabaseClient,
  refIds: string[]
): Promise<WorkspaceMeta> {
  const meta: WorkspaceMeta = { summaries: {}, chapters: {}, notes: {} };

  // Map workbench document ids back to reference ids.
  const docIds = refIds.map(id => `ref-doc-${id}`);
  const docToRef = new Map(refIds.map(id => [`ref-doc-${id}`, id]));

  const [summRes, tagRes, refRes] = await Promise.all([
    client
      .from('content_analysis_summaries')
      .select('document_id, project_id, text')
      .in('document_id', docIds),
    client
      .from('content_analysis_overall_tags')
      .select('document_id, code_id')
      .in('document_id', docIds)
      .like('code_id', 'chapter:%'),
    client
      .from('references')
      .select('id, notes')
      .in('id', refIds),
  ]);

  for (const row of (summRes.data || []) as any[]) {
    const refId = docToRef.get(row.document_id);
    const text = (row.text || '').trim();
    if (!refId || !text) continue;
    // Prefer the longest non-empty summary across projects — that is the most
    // fleshed-out description of the paper.
    if (!meta.summaries[refId] || text.length > meta.summaries[refId].length) {
      meta.summaries[refId] = text;
    }
  }

  for (const row of (tagRes.data || []) as any[]) {
    const refId = docToRef.get(row.document_id);
    if (!refId || !row.code_id) continue;
    (meta.chapters[refId] ||= []).push(row.code_id);
  }

  for (const row of (refRes.data || []) as any[]) {
    const notes = (row.notes || '').trim();
    if (notes) meta.notes[row.id] = notes;
  }

  return meta;
}

// ── Format Bibliography ──

export async function formatBibliography(
  citationItems: any[],
  styleId: string
): Promise<BibliographyResult> {
  if (useBridge) {
    const res = await fetch(`${BRIDGE_URL}/api/cite/bibliography`, {
      method: 'POST',
      headers: bridgeHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        citation_items: citationItems,
        style_id: styleId,
        format: 'text',
      }),
    });
    if (!res.ok) throw new Error('Bridge bibliography generation failed');
    return res.json();
  }

  // Client-side fallback: simple APA-like formatting
  const entries = citationItems.map(item => {
    const authors = (item.author || [])
      .map((a: any) => `${a.family}${a.given ? ', ' + a.given.charAt(0) + '.' : ''}`)
      .join(', ');
    const year = item.issued?.['date-parts']?.[0]?.[0] || 'n.d.';
    const title = item.title || '';
    const journal = item['container-title'] || '';
    const vol = item.volume ? `, ${item.volume}` : '';
    const issue = item.issue ? `(${item.issue})` : '';
    const pages = item.page ? `, ${item.page}` : '';
    const doi = item.DOI ? ` https://doi.org/${item.DOI}` : '';

    return `${authors} (${year}). ${title}. ${journal}${vol}${issue}${pages}.${doi}`;
  });

  return { entries };
}

// ── Format Inline Citations ──

export async function formatInlineCitations(
  citationItems: any[],
  styleId: string
): Promise<string[]> {
  if (useBridge) {
    const res = await fetch(`${BRIDGE_URL}/api/cite/format`, {
      method: 'POST',
      headers: bridgeHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        citation_items: citationItems,
        style_id: styleId,
        format: 'text',
      }),
    });
    if (!res.ok) throw new Error('Bridge citation formatting failed');
    const data = await res.json();
    return data.citations;
  }

  // Client-side fallback
  return citationItems.map(item => {
    const authors = item.author || [];
    const year = item.issued?.['date-parts']?.[0]?.[0] || 'n.d.';

    if (authors.length === 0) return `(${year})`;
    if (authors.length === 1) return `(${authors[0].family}, ${year})`;
    if (authors.length === 2) return `(${authors[0].family} & ${authors[1].family}, ${year})`;
    return `(${authors[0].family} et al., ${year})`;
  });
}

// ── Get Libraries ──

export async function getLibraries(): Promise<{ id: string; name: string }[]> {
  if (useBridge) {
    const res = await fetch(`${BRIDGE_URL}/api/libraries`, { headers: bridgeHeaders() });
    if (!res.ok) throw new Error('Bridge libraries fetch failed');
    return res.json();
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('libraries')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  return [];
}

// ── Sync (bridge only) ──

export async function syncLibrary(libraryId: string): Promise<number> {
  if (!useBridge) return 0;

  const res = await fetch(`${BRIDGE_URL}/api/sync`, {
    method: 'POST',
    headers: bridgeHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ library_id: libraryId }),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.synced || 0;
}

export function isUsingBridge(): boolean {
  return useBridge;
}

// ── Record citation usage ──
//
// Fire-and-forget: every successful citation insertion logs a row to
// `citations_used` so we can later tally the EU-funded share of references
// in a given report. Failures are silent — the citation has already gone
// into the document, and dropping a usage log row is preferable to surfacing
// a save error to the author.
//
// The MethodHub API URL is injected on `window` during add-in bootstrap,
// alongside the bridge token (which the API endpoint accepts as bearer auth
// when present, falling back to Supabase RLS otherwise).
const METHODHUB_URL: string =
  (window as any).__REFMANAGER_METHODHUB_URL__ || 'https://methodhub.eu';

export interface CitationUsageRecord {
  reference_id: string;
  document_key: string;
  doi?: string | null;
  funding?: { name: string; doi?: string; awards?: string[] }[] | null;
}

export async function recordCitationUsage(record: CitationUsageRecord): Promise<void> {
  try {
    const url = `${METHODHUB_URL.replace(/\/+$/, '')}/api/citations/used`;
    await fetch(url, {
      method: 'POST',
      headers: bridgeHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(record),
      // Short timeout so a slow network never blocks the user's edit flow.
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Best effort. Citation insertion is the user-visible action; losing a
    // single analytics row is acceptable.
  }
}
