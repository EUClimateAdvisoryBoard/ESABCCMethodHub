/**
 * Reading responsibility — add literature to a project workspace.
 * ---------------------------------------------------------------
 * One endpoint behind the "Add literature" panel of the Reading responsibility
 * view. It does the three things the industry team asked for, atomically and
 * durably (Postgres), so an added paper stays put:
 *
 *   1. Upserts the reference into the shared Reference Manager store
 *      (`custom_references`) with an `industry` tag and the project tag
 *      (`project:<name>`) — so it shows up in the reference library too.
 *   2. Adds it to the project workspace corpus (`content_analysis_corpus`)
 *      as `ref-doc-<id>`, with self-describing metadata, so it appears in the
 *      workbench for every collaborator.
 *   3. Optionally records the responsible reader (`content_analysis_reading`).
 *
 * Two input modes:
 *   - `{ doi }`            — resolve the DOI through Crossref, then do 1–3.
 *   - `{ reference: {…} }` — an existing reference picked from the manager
 *                            (used for reports / policy documents).
 *
 *   POST body:
 *     { projectId, projectName, reader?,
 *       doi?, reference?: { id?, title, authors?, year?, type?, url?, doi?, journal? } }
 *     → { documentId, meta, reader }
 */
import { NextRequest, NextResponse } from 'next/server';
import { CustomRef, listRefs, upsertRef } from '@/lib/references/custom-store';
import { combineTags, splitTags } from '@/lib/references/projects';
import { addToCaCorpus, setCaReading } from '@/lib/content-analysis-store';
import { actorRequired, resolveActor } from '@/lib/content-analysis/actor';
import type { CorpusDocMeta } from '@/lib/content-analysis/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INDUSTRY_TAG = 'industry';
const REF_DOC_PREFIX = 'ref-doc-';

const normalizeDoi = (d: string | undefined): string =>
  (d || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '')
    .trim();

function sanitize(str: string): string {
  return str
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[…]/g, '...')
    .replace(/[ ]/g, ' ');
}

/** Map a stored CSL / custom reference type onto the closed union the workspace
 *  tier split understands (mirrors `normaliseRefType` in the project-workspace
 *  reference endpoint). */
function normaliseRefType(t: string | undefined): NonNullable<CorpusDocMeta['referenceType']> {
  switch (t) {
    case 'article':
    case 'report':
    case 'web':
    case 'chapter':
    case 'legislation':
    case 'book':
      return t;
    case 'article-journal':
    case 'paper-conference':
      return 'article';
    case 'entry-encyclopedia':
      return 'chapter';
    case 'webpage':
    case 'article-newspaper':
    case 'article-magazine':
      return 'web';
    default:
      return 'report';
  }
}

interface RefFields {
  id: string;
  doi: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  type: string;
  url: string;
}

/** Resolve a DOI to the flat reference fields via Crossref. */
async function resolveDoi(rawDoi: string): Promise<RefFields | null> {
  const doi = normalizeDoi(rawDoi);
  if (!doi) return null;
  const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const item = data.message;
  const authors = (item.author || [])
    .map((a: { family?: string; given?: string }) =>
      a.family && a.given ? `${a.family}, ${a.given}` : a.family || a.given || '',
    )
    .filter(Boolean)
    .join('; ');
  const dateParts =
    item.published?.['date-parts']?.[0] ||
    item['published-print']?.['date-parts']?.[0] ||
    item.issued?.['date-parts']?.[0];
  const year = dateParts?.[0] ? String(dateParts[0]) : '';
  const typeMap: Record<string, string> = {
    'journal-article': 'article-journal',
    'book-chapter': 'chapter',
    'proceedings-article': 'paper-conference',
    book: 'book',
    report: 'report',
    monograph: 'book',
    'posted-content': 'article-journal',
    dataset: 'web',
  };
  return {
    id: 'doi-' + doi.replace(/\//g, '-'),
    doi,
    title: sanitize(item.title?.[0] || ''),
    authors: sanitize(authors),
    year,
    journal: sanitize(item['container-title']?.[0] || ''),
    type: typeMap[item.type] || 'article-journal',
    url: item.URL || (doi ? `https://doi.org/${doi}` : ''),
  };
}

function short(title: string): string {
  return title.length > 90 ? `${title.slice(0, 87)}…` : title;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveActor(request);
    if (!actor && actorRequired()) {
      return NextResponse.json({ error: 'Sign in to add literature' }, { status: 401 });
    }

    const body = await request.json();
    const projectId: string = body?.projectId;
    const projectName: string = body?.projectName;
    const reader: string =
      typeof body?.reader === 'string' ? body.reader.trim().slice(0, 200) : '';
    if (!projectId || !projectName) {
      return NextResponse.json({ error: 'projectId and projectName required' }, { status: 400 });
    }

    // Resolve the reference fields, from a DOI or a picked reference.
    let fields: RefFields | null = null;
    if (body?.doi) {
      fields = await resolveDoi(String(body.doi));
      if (!fields || !fields.title) {
        return NextResponse.json({ error: 'DOI not found' }, { status: 404 });
      }
    } else if (body?.reference && typeof body.reference === 'object') {
      const r = body.reference as Partial<RefFields>;
      const doi = normalizeDoi(r.doi);
      const id =
        r.id || (doi ? 'doi-' + doi.replace(/\//g, '-') : 'custom-' + Date.now());
      if (!r.title) {
        return NextResponse.json({ error: 'reference.title required' }, { status: 400 });
      }
      fields = {
        id,
        doi,
        title: sanitize(String(r.title)),
        authors: sanitize(String(r.authors || '')),
        year: String(r.year || ''),
        journal: sanitize(String(r.journal || '')),
        type: String(r.type || 'article-journal'),
        url: String(r.url || (doi ? `https://doi.org/${doi}` : '')),
      };
    } else {
      return NextResponse.json({ error: 'doi or reference required' }, { status: 400 });
    }

    // 1) Upsert into the reference library, merging the industry + project tags
    //    with anything the reference already carries.
    const existing = (await listRefs()).find(
      r => r.id === fields!.id || (fields!.doi && normalizeDoi(r.doi) === fields!.doi),
    );
    const { plain, projects } = splitTags(existing?.tags);
    if (!plain.some(t => t.toLowerCase() === INDUSTRY_TAG)) plain.push(INDUSTRY_TAG);
    if (!projects.some(p => p.toLowerCase() === projectName.toLowerCase())) {
      projects.push(projectName);
    }
    const ref: CustomRef = {
      id: existing?.id ?? fields.id,
      doi: fields.doi || existing?.doi || '',
      title: fields.title || existing?.title || '',
      authors: fields.authors || existing?.authors || '',
      year: fields.year || existing?.year || '',
      journal: fields.journal || existing?.journal || '',
      type: fields.type || existing?.type || 'article-journal',
      volume: existing?.volume || '',
      issue: existing?.issue || '',
      pages: existing?.pages || '',
      url: fields.url || existing?.url || '',
      fullCitation: existing?.fullCitation || '',
      addedAt: existing?.addedAt || new Date().toISOString(),
      source: existing?.source || 'web',
      pdfUrl: existing?.pdfUrl,
      funding: existing?.funding,
      tags: combineTags(plain, projects),
    };
    const persist = await upsertRef(ref, actor?.id);

    // 2) Add to the workspace corpus with self-describing metadata.
    const documentId = `${REF_DOC_PREFIX}${ref.id}`;
    const meta: CorpusDocMeta = {
      id: documentId,
      title: ref.title,
      shortTitle: short(ref.title),
      kind: 'report',
      sourceKind: 'reference',
      referenceType: normaliseRefType(ref.type),
      referenceAuthors: ref.authors || undefined,
      referenceYear: ref.year || undefined,
      referenceUrl: ref.url || undefined,
    };
    await addToCaCorpus(projectId, documentId, meta, actor ?? undefined);

    // 3) Record the responsible reader, when supplied.
    if (reader) {
      await setCaReading(projectId, documentId, reader, actor ?? undefined);
    }

    return NextResponse.json({
      documentId,
      meta,
      reader,
      referenceId: ref.id,
      persisted: persist.ok,
      persistError: persist.error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to add literature: ${message}` }, { status: 500 });
  }
}
