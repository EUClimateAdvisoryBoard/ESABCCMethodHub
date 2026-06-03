/**
 * Reference Manager — list / create endpoint.
 * --------------------------------------------
 * GET  /api/references                 List all references visible to caller.
 * POST /api/references                 Create a new reference from a payload.
 *
 * Combines the bundled `@/data/references` seed with the user-added
 * `custom-references` store so the Word add-in and the web UI see a
 * single flat list. `ensureSeedLoaded()` hydrates the custom store on
 * cold start (reads from Postgres in production, from GitHub JSON
 * during the prototype phase).
 *
 * The `runtime = 'nodejs'` pin is required because the Word-VBA add-in
 * path depends on Node's string APIs for ISO-8859-1 fallbacks; edge
 * runtime doesn't expose them. `dynamic = 'force-dynamic'` keeps the
 * response fresh per request — the custom store is mutable.
 *
 * Outputs are VBA-sanitised (smart quotes → straight quotes, en-dash
 * → hyphen, etc.) so Word's COM bridge doesn't choke on Unicode.
 */
import { NextRequest, NextResponse } from 'next/server';
import { references } from '@/data/references';
import { ensureSeedLoaded, getStore } from '@/lib/references/custom-store';
import { createAdminClient, hasServiceRole } from '@/lib/supabase-server';
import type { CSLName } from '@/lib/references/types';
import { aggregateProjects, referenceInProject } from '@/lib/references/projects';

// Flat shape the Word add-in / VBA consume.
interface FlatRef {
  id: string;
  authors: string;
  year: string;
  title: string;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  type: string;
  fullCitation: string;
  tags: string[];
}

// Render a CSL author array ("Family, G.; …") for the flat shape.
function authorsToString(authors: CSLName[] | null | undefined): string {
  if (!Array.isArray(authors)) return '';
  return authors
    .map(a => a.literal || [a.family, a.given].filter(Boolean).join(', '))
    .filter(Boolean)
    .join('; ');
}

// Pull rows from the Supabase `references` table (the web Reference Manager's
// store) so project tags assigned there flow live into the add-in's project
// filter. Best-effort: skipped silently when no service-role key is set.
async function getSupabaseReferences(): Promise<FlatRef[]> {
  if (!hasServiceRole()) return [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('references')
      .select('id, title, authors, year, doi, container_title, item_type, tags, csl_json');
    if (error || !data) return [];
    return data.map((r: any): FlatRef => ({
      id: r.id,
      authors: authorsToString(r.authors),
      year: r.year ? String(r.year) : '',
      title: r.title || '',
      journal: r.container_title ?? null,
      volume: r.csl_json?.volume ?? null,
      issue: r.csl_json?.issue ?? null,
      pages: r.csl_json?.page ?? null,
      doi: r.doi ?? null,
      url: r.csl_json?.URL ?? null,
      type: r.item_type || 'article-journal',
      fullCitation: '',
      tags: Array.isArray(r.tags) ? r.tags : [],
    }));
  } catch {
    return [];
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sanitize strings for VBA compatibility (replace smart quotes, en-dashes etc.)
function sanitize(str: string): string {
  return str
    .replace(/[\u2018\u2019\u201A]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"')    // smart double quotes
    .replace(/[\u2013\u2014]/g, '-')           // en-dash, em-dash
    .replace(/[\u2026]/g, '...')               // ellipsis
    .replace(/[\u00A0]/g, ' ');                // non-breaking space
}

// Normalize a string for fuzzy comparison: lowercase, decompose Unicode
// (so "é" becomes "e" + combining mark), strip combining marks, collapse
// whitespace.  This makes "Edenhofer" match "Édenhöfer" and "co2" match
// "CO₂" (after the subscript is normalized).
function normalize(s: string): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract DOI-like substring out of a query so that pasting a full
// "https://doi.org/10.1234/abcd" in the search box still finds the ref.
function extractDoi(q: string): string {
  const m = q.match(/10\.\d{4,9}\/[^\s,;]+/i);
  return m ? m[0].toLowerCase() : '';
}

// Tokenize a query: split on whitespace + punctuation, keep tokens with
// at least one alphanumeric, normalize each.  Empty array → no filter.
function tokenize(q: string): string[] {
  return normalize(q)
    .split(/[\s,;:()\[\]"']+/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && /[a-z0-9]/.test(t));
}

// Score a single reference against a list of normalized query tokens.
// All tokens MUST match somewhere; otherwise the score is 0 and the row
// is excluded.  Score weights field importance and exact / prefix hits
// so the most relevant rows float to the top.
function scoreReference(
  ref: {
    authors: string;
    title: string;
    journal?: string | null;
    doi?: string | null;
    year: string;
  },
  tokens: string[],
  doiQuery: string
): number {
  // DOI query short-circuit: an exact DOI match is the strongest signal.
  if (doiQuery && ref.doi && ref.doi.toLowerCase() === doiQuery) {
    return 10000;
  }

  if (tokens.length === 0) return 1; // empty query → keep all (caller filters)

  const fields: Array<{ value: string; weight: number }> = [
    { value: normalize(ref.title),         weight: 10 },
    { value: normalize(ref.authors),       weight: 8 },
    { value: normalize(ref.journal || ''), weight: 4 },
    { value: normalize(ref.year),          weight: 6 },
    { value: normalize(ref.doi || ''),     weight: 5 },
  ];

  let total = 0;
  for (const tok of tokens) {
    let bestForToken = 0;
    for (const f of fields) {
      if (!f.value) continue;
      // Exact word match (whole token surrounded by non-alphanum) is best.
      const wordRe = new RegExp(
        `(^|[^a-z0-9])${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`
      );
      if (wordRe.test(f.value)) {
        bestForToken = Math.max(bestForToken, f.weight * 2);
        continue;
      }
      // Prefix hit on any word
      if (f.value.startsWith(tok) || f.value.includes(' ' + tok)) {
        bestForToken = Math.max(bestForToken, f.weight * 1.5);
        continue;
      }
      // Plain substring hit
      if (f.value.includes(tok)) {
        bestForToken = Math.max(bestForToken, f.weight);
      }
    }
    if (bestForToken === 0) {
      // This token didn't match anywhere → reject the whole reference.
      return 0;
    }
    total += bestForToken;
  }
  return total;
}

// Custom refs are declared globally in library/route.ts

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('q') || '';
  const type = request.nextUrl.searchParams.get('type') || '';
  const project = request.nextUrl.searchParams.get('project') || '';
  const facet = request.nextUrl.searchParams.get('facet') || '';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

  // Ensure custom refs are loaded from GitHub / seed file on cold starts so
  // search sees VBA-synced references even on a fresh serverless instance.
  await ensureSeedLoaded();

  // Merge static references with custom references from library
  const customRefs = getStore().map(r => ({
    id: r.id,
    authors: r.authors || '',
    year: r.year || '',
    title: r.title || '',
    journal: r.journal || null,
    volume: r.volume || null,
    issue: r.issue || null,
    pages: r.pages || null,
    doi: r.doi || null,
    url: r.url || null,
    type: r.type || 'article-journal',
    fullCitation: r.fullCitation || '',
    tags: r.tags || [],
  }));

  // Live rows from the web Reference Manager's Supabase store (carries the
  // project tags users assign), best-effort and deduped by id.
  const supabaseRefs = await getSupabaseReferences();

  // Deduplicate by id, in priority order: custom store → Supabase → static.
  const seen = new Set<string>();
  const allRefs: Array<Record<string, any>> = [];
  for (const r of [...customRefs, ...supabaseRefs, ...references]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    allRefs.push(r);
  }

  // Facet mode: return just the distinct project list (name + count) so the
  // Word add-in can populate its "Project" dropdown without parsing the whole
  // library. Cheap, and avoids shipping thousands of rows for a combo box.
  if (facet === 'projects') {
    return NextResponse.json(
      { projects: aggregateProjects(allRefs as Array<{ tags?: string[] }>) },
      { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } },
    );
  }

  let filtered = allRefs;

  // Project view: scope the shared library to one report's references.
  if (project) {
    filtered = filtered.filter(r => referenceInProject(r as { tags?: string[] }, project));
  }

  if (type && type !== 'all') {
    filtered = filtered.filter(r => r.type === type);
  }

  if (search) {
    const tokens = tokenize(search);
    const doiQuery = extractDoi(search);

    // Score every candidate; keep only those with a positive score, then
    // sort by score descending so the best matches float to the top.
    const scored = filtered
      .map(r => ({ ref: r, score: scoreReference(r as any, tokens, doiQuery) }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    filtered = scored.map(s => s.ref);
  }

  return NextResponse.json({
    total: filtered.length,
    offset,
    limit,
    items: filtered.slice(offset, offset + limit).map(r => ({
      id: r.id,
      authors: sanitize(r.authors),
      year: r.year,
      title: sanitize(r.title),
      journal: r.journal ? sanitize(r.journal) : null,
      volume: r.volume,
      issue: r.issue,
      pages: r.pages,
      doi: r.doi,
      url: r.url,
      type: r.type,
      citation_key: r.id,
      fullCitation: sanitize(r.fullCitation || `${r.authors} (${r.year}). ${r.title}.${r.journal ? ' ' + r.journal : ''}${r.doi ? ' DOI: ' + r.doi : ''}`),
      tags: Array.isArray(r.tags) ? r.tags.map((t: string) => sanitize(String(t))) : [],
    })),
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
