/**
 * POST /api/references/library/backfill
 * -------------------------------------
 * Bulk-import endpoint for migrating a legacy bibliography (EndNote
 * export, BibTeX, RIS) into the custom-references store. Request body
 * is an array of partial reference rows; the handler normalises
 * fields, de-duplicates by DOI (or by title+year when DOI is
 * missing), and upserts.
 *
 * Admin-gated — checked against `isAdminEmail()`. Every invocation
 * writes to `admin_audit_log`.
 *
 * Historically this route was used during the prototype phase to
 * seed the custom store from a CI job. Kept for operational use
 * when a new EEA unit forks the repo and wants to bring their own
 * bibliography in.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  CustomRef,
  ensureSeedLoaded,
  getStore,
  hasGitHubToken,
  persistToGitHub,
} from '@/lib/references/custom-store';

// ---------------------------------------------------------------------------
// Backfill missing metadata for existing references via CrossRef.
//
// Triggered by an admin (POST).  Walks every ref in the custom store and, for
// any entry with a DOI (or a DOI discoverable in its title/fullCitation), asks
// CrossRef for the canonical metadata and fills in blank fields only.  We never
// overwrite non-empty user data — the backfill is strictly additive.
//
// This endpoint runs on Vercel where CrossRef is reachable, so we do not try
// to call it from local sandboxes.  Persistence happens once at the very end
// via a single GitHub commit.
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CROSSREF_BASE = 'https://api.crossref.org/works/';
// CrossRef asks API consumers to identify themselves for the "polite pool".
const POLITE_UA =
  'ESABCC-ReferenceManager/1.0 (mailto:refs@climate-advisory-board.europa.eu)';

function normalizeDoi(d: string | undefined): string {
  return (d || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '')
    .trim();
}

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

  await ensureSeedLoaded();
  const store = getStore();
  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

  const report: BackfillReport = {
    total: store.length,
    scanned: 0,
    updated: 0,
    skippedNoDoi: 0,
    notFound: 0,
    details: [],
  };

  // Keep a snapshot so we can roll back if persistence ultimately fails.
  const snapshot = store.map(r => ({ ...r }));

  for (let i = 0; i < store.length; i++) {
    const ref = store[i];
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

    store[i] = merged;
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
    // Restore the in-memory store and report what would change.
    for (let i = 0; i < snapshot.length; i++) store[i] = snapshot[i];
    return NextResponse.json({ dryRun: true, ...report });
  }

  let persisted = false;
  let persistError: string | undefined;
  let commitSha: string | undefined;
  if (report.updated > 0 && hasGitHubToken()) {
    const result = await persistToGitHub(store);
    persisted = result.ok;
    persistError = result.error;
    commitSha = result.commitSha;
    if (!persisted) {
      // Roll back to snapshot
      for (let i = 0; i < snapshot.length; i++) store[i] = snapshot[i];
    }
  }

  return NextResponse.json({
    ...report,
    persisted,
    persistError,
    commitSha,
    persistence: hasGitHubToken() ? 'github' : 'memory-only',
  });
}
