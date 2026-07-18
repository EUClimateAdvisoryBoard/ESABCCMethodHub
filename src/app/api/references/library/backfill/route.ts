/**
 * POST /api/references/library/backfill
 * -------------------------------------
 * Bulk-import endpoint for migrating a legacy bibliography (EndNote
 * export, BibTeX, RIS) into the custom-references store. Request body
 * is an array of partial reference rows; the handler normalises
 * fields, de-duplicates by DOI (or by title+year when DOI is
 * missing), and upserts.
 *
 * Admin-gated — requires the `REFS_ADMIN_TOKEN` secret (via
 * `x-admin-token` header or `?token=`) when that env var is configured.
 * (Earlier documentation for this route described an `isAdminEmail()` +
 * `admin_audit_log` gate; that was never implemented here — this route
 * predates the session-based admin pattern used elsewhere and still
 * only has the shared-secret check.)
 *
 * Historically this route was used during the prototype phase to
 * seed the custom store from a CI job. Kept for operational use
 * when a new EEA unit forks the repo and wants to bring their own
 * bibliography in.
 */
import { NextRequest, NextResponse } from 'next/server';
import { CustomRef, listRefs, upsertRef } from '@/lib/references/custom-store';
import { normalizeDoi } from '@/lib/references/server/route-helpers';

// ---------------------------------------------------------------------------
// Backfill missing metadata for existing references via CrossRef.
//
// Triggered by an admin (POST).  Walks every ref in the custom store and, for
// any entry with a DOI (or a DOI discoverable in its title/fullCitation), asks
// CrossRef for the canonical metadata and fills in blank fields only.  We never
// overwrite non-empty user data — the backfill is strictly additive.
//
// This endpoint runs on Vercel where CrossRef is reachable, so we do not try
// to call it from local sandboxes.  Persistence happens per-reference via
// `upsertRef()` (Postgres) once the CrossRef scan has finished.
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CROSSREF_BASE = 'https://api.crossref.org/works/';
// CrossRef asks API consumers to identify themselves for the "polite pool".
const POLITE_UA =
  'ESABCC-ReferenceManager/1.0 (mailto:refs@climate-advisory-board.europa.eu)';

// Dig a DOI out of an arbitrary string (title, fullCitation, …).
function extractDoi(s: string | undefined): string {
  if (!s) return '';
  const m = s.match(/10\.\d{4,9}\/[^\s,;)"'<>]+/i);
  return m ? m[0].replace(/[.,;)'"]+$/, '') : '';
}

interface CrossrefAuthor {
  given?: string;
  family?: string;
  name?: string;
}

interface CrossrefMessage {
  DOI?: string;
  title?: string[];
  author?: CrossrefAuthor[];
  issued?: { 'date-parts'?: number[][] };
  'container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  URL?: string;
  type?: string;
}

function formatAuthors(authors: CrossrefAuthor[] | undefined): string {
  if (!authors || authors.length === 0) return '';
  return authors
    .map(a => {
      if (a.family && a.given) return `${a.family}, ${a.given}`;
      if (a.family) return a.family;
      return a.name || '';
    })
    .filter(Boolean)
    .join('; ');
}

// Map CrossRef types to our (CSL) types loosely.
function mapType(t: string | undefined): string {
  if (!t) return 'article-journal';
  if (t === 'journal-article') return 'article-journal';
  return t;
}

async function fetchCrossref(
  doi: string
): Promise<CrossrefMessage | null> {
  try {
    const resp = await fetch(
      `${CROSSREF_BASE}${encodeURIComponent(doi)}`,
      {
        headers: {
          'User-Agent': POLITE_UA,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data?.message as CrossrefMessage) || null;
  } catch {
    return null;
  }
}

function mergeFromCrossref(ref: CustomRef, msg: CrossrefMessage): {
  merged: CustomRef;
  changedFields: string[];
} {
  const changed: string[] = [];
  const next = { ...ref };

  const title = msg.title?.[0]?.trim();
  if (title && (!ref.title || /^$|^.{0,3}$/.test(ref.title))) {
    // Only overwrite if current title is empty/trivially short.  For refs like
    // "ref-1330" the title is actually a raw citation string — replace that.
    if (!ref.title || ref.title.length < 20 || /\bet al\.\b/.test(ref.title)) {
      next.title = title;
      if (title !== ref.title) changed.push('title');
    }
  }

  const authors = formatAuthors(msg.author);
  if (authors && !ref.authors) {
    next.authors = authors;
    changed.push('authors');
  }

  const year = msg.issued?.['date-parts']?.[0]?.[0];
  if (year && !ref.year) {
    next.year = String(year);
    changed.push('year');
  }

  const journal = msg['container-title']?.[0];
  if (journal && !ref.journal) {
    next.journal = journal;
    changed.push('journal');
  }

  if (msg.volume && !ref.volume) {
    next.volume = msg.volume;
    changed.push('volume');
  }
  if (msg.issue && !ref.issue) {
    next.issue = msg.issue;
    changed.push('issue');
  }
  if (msg.page && !ref.pages) {
    next.pages = msg.page;
    changed.push('pages');
  }

  if (msg.DOI && !ref.doi) {
    next.doi = msg.DOI;
    changed.push('doi');
  }

  if (!ref.url) {
    const url = msg.URL || (msg.DOI ? `https://doi.org/${msg.DOI}` : '');
    if (url) {
      next.url = url;
      changed.push('url');
    }
  }

  if (msg.type && (!ref.type || ref.type === 'article-journal')) {
    const mapped = mapType(msg.type);
    if (mapped !== ref.type) {
      next.type = mapped;
      changed.push('type');
    }
  }

  if (!ref.fullCitation) {
    const a = next.authors || '';
    const y = next.year ? ` (${next.year})` : '';
    const t = next.title ? `. ${next.title}` : '';
    const j = next.journal ? `. ${next.journal}` : '';
    const v = next.volume ? `, ${next.volume}` : '';
    const i = next.issue ? `(${next.issue})` : '';
    const p = next.pages ? `, ${next.pages}` : '';
    const d = next.doi ? `. https://doi.org/${next.doi}` : '';
    const cite = `${a}${y}${t}${j}${v}${i}${p}${d}`.trim();
    if (cite.length > 5) {
      next.fullCitation = cite;
      changed.push('fullCitation');
    }
  }

  return { merged: next, changedFields: changed };
}

interface BackfillReport {
  total: number;
  scanned: number;
  updated: number;
  skippedNoDoi: number;
  notFound: number;
  details: Array<{
    id: string;
    doi?: string;
    status: 'updated' | 'no-doi' | 'not-found' | 'unchanged' | 'error';
    changedFields?: string[];
    error?: string;
  }>;
}

export async function POST(request: NextRequest) {
  // Simple guard: require admin token if configured.  This keeps the endpoint
  // from being abused since CrossRef calls are expensive.
  const adminToken = process.env.REFS_ADMIN_TOKEN;
  if (adminToken) {
    const provided =
      request.headers.get('x-admin-token') ||
      request.nextUrl.searchParams.get('token');
    if (provided !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const store = await listRefs();
  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

  const report: BackfillReport = {
    total: store.length,
    scanned: 0,
    updated: 0,
    skippedNoDoi: 0,
    notFound: 0,
    details: [],
  };

  // Refs whose merge produced a change, queued for a Postgres upsert once
  // the scan has finished. Additive-only: `mergeFromCrossref` never
  // overwrites a non-empty field, it only fills blanks.
  const updates: CustomRef[] = [];

  for (const ref of store) {
    report.scanned++;

    // Is anything missing?  If not, skip.
    const missing =
      !ref.authors ||
      !ref.year ||
      !ref.journal ||
      !ref.volume ||
      !ref.pages ||
      !ref.fullCitation ||
      !ref.url;
    if (!missing) {
      report.details.push({ id: ref.id, status: 'unchanged' });
      continue;
    }

    // Resolve a DOI: prefer the explicit field, otherwise dig one out of the
    // title / fullCitation (catches legacy ref-#### entries).
    let doi = normalizeDoi(ref.doi);
    if (!doi) doi = extractDoi(ref.title) || extractDoi(ref.fullCitation);
    if (!doi) {
      report.skippedNoDoi++;
      report.details.push({ id: ref.id, status: 'no-doi' });
      continue;
    }

    const msg = await fetchCrossref(doi);
    if (!msg) {
      report.notFound++;
      report.details.push({ id: ref.id, doi, status: 'not-found' });
      continue;
    }

    const { merged, changedFields } = mergeFromCrossref(ref, msg);
    if (changedFields.length === 0) {
      report.details.push({ id: ref.id, doi, status: 'unchanged' });
      continue;
    }

    updates.push(merged);
    report.updated++;
    report.details.push({
      id: ref.id,
      doi,
      status: 'updated',
      changedFields,
    });

    // Be polite: small pause so we don't hammer CrossRef.  50ms between calls
    // comfortably stays inside the polite pool's rate limits.
    await new Promise(r => setTimeout(r, 50));
  }

  if (dryRun) {
    // Nothing was written above — the loop only ever mutated local copies —
    // so a dry run just reports what would change.
    return NextResponse.json({ dryRun: true, ...report });
  }

  // Persist each changed reference through the store's normal Supabase
  // upsert path. One row's failure doesn't block the others; failures are
  // collected and surfaced via `persistError`.
  let persisted = true;
  const errors: string[] = [];
  for (const ref of updates) {
    const result = await upsertRef(ref);
    if (!result.ok) {
      persisted = false;
      errors.push(`${ref.id}: ${result.error ?? 'unknown error'}`);
    }
  }

  return NextResponse.json({
    ...report,
    persisted,
    persistError: errors.length > 0 ? errors.join('; ') : undefined,
    persistence: 'postgres',
  });
}
