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
      .select('id, citation_key, title, authors, year, container_title, csl_json')
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
