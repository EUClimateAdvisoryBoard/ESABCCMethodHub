/**
 * Reference Manager — per-library CRUD (M·01).
 * --------------------------------------------
 * GET    /api/references/library?libraryId=…   List refs in a library.
 * POST   /api/references/library                Upsert a reference row.
 * DELETE /api/references/library?id=…           Delete a reference.
 *
 * Operates on the custom-references store (`src/lib/references/custom-store.ts`)
 * which is Postgres-backed in production and a GitHub-backed JSON
 * store during the prototype phase.
 *
 * The `listRefs`/`upsertRef`/`deleteRef` helpers apply RLS at the
 * store level, so this route has no extra authorisation code — RLS
 * refuses to return rows the caller cannot see and the empty array
 * propagates through.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  CustomRef,
  deleteRef,
  listRefs,
  upsertRef,
} from '@/lib/references/custom-store';
import { combineTags, splitTags } from '@/lib/references/projects';

// Force the route to run on the Node.js runtime (pg/supabase client) and
// always evaluate fresh (no edge caching of mutations).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PERSISTENCE = 'postgres';

const normalizeDoi = (d: string | undefined): string =>
  (d || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '')
    .trim();

// GET – return all custom references
export async function GET() {
  const references = await listRefs();
  return NextResponse.json({
    count: references.length,
    references,
    persistence: PERSISTENCE,
  });
}

// POST – add a new reference (with DOI-based dedup + merge)
export async function POST(request: NextRequest) {
  let body: Partial<CustomRef>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.title && !body.doi) {
    return NextResponse.json(
      { error: 'At least title or doi is required' },
      { status: 400 },
    );
  }

  const incomingDoi = normalizeDoi(body.doi);
  const id =
    body.id ||
    (incomingDoi ? 'doi-' + incomingDoi.replace(/\//g, '-') : 'custom-' + Date.now());

  // Dedup: look for an existing ref with the same id or same normalized DOI.
  const existing = (await listRefs()).find(
    (r) => r.id === id || (incomingDoi && normalizeDoi(r.doi) === incomingDoi),
  );

  if (existing) {
    const merged: CustomRef = {
      ...existing,
      doi:          existing.doi          || body.doi          || '',
      title:        existing.title        || body.title        || '',
      authors:      existing.authors      || body.authors      || '',
      year:         existing.year         || body.year         || '',
      journal:      existing.journal      || body.journal      || '',
      type:         existing.type         || body.type         || 'article-journal',
      volume:       existing.volume       || body.volume       || '',
      issue:        existing.issue        || body.issue        || '',
      pages:        existing.pages        || body.pages        || '',
      url:          existing.url          || body.url          || '',
      fullCitation: existing.fullCitation || body.fullCitation || '',
      pdfUrl:       existing.pdfUrl       || body.pdfUrl       || '',
      funding:      (body.funding && body.funding.length > 0) ? body.funding : existing.funding,
      // Tags are owned by the editing client (project assignment), so take the
      // incoming list when present rather than merging — lets a re-save clear
      // a project the user removed.
      tags:         (body.tags && body.tags.length > 0) ? body.tags : existing.tags,
      addedAt: new Date().toISOString(),
    };

    const result = await upsertRef(merged);
    return NextResponse.json(
      {
        message: 'Reference merged with existing entry (DOI match)',
        merged: true,
        id: merged.id,
        reference: merged,
        persisted: result.ok,
        persistError: result.error,
        persistence: PERSISTENCE,
      },
      { status: result.ok ? 200 : 500 },
    );
  }

  const ref: CustomRef = {
    id,
    doi: body.doi || '',
    title: body.title || '',
    authors: body.authors || '',
    year: body.year || '',
    journal: body.journal || '',
    type: body.type || 'article-journal',
    volume: body.volume || '',
    issue: body.issue || '',
    pages: body.pages || '',
    url: body.url || '',
    fullCitation: body.fullCitation || '',
    addedAt: new Date().toISOString(),
    source: body.source || 'web',
    pdfUrl: body.pdfUrl || '',
    funding: body.funding && body.funding.length > 0 ? body.funding : undefined,
    tags: body.tags && body.tags.length > 0 ? body.tags : undefined,
  };

  const result = await upsertRef(ref);
  return NextResponse.json(
    {
      message: 'Reference added',
      id,
      reference: ref,
      persisted: result.ok,
      persistError: result.error,
      persistence: PERSISTENCE,
    },
    { status: result.ok ? 201 : 500 },
  );
}

// PUT – update an existing reference (upsert: creates it if missing).
export async function PUT(request: NextRequest) {
  let body: Partial<CustomRef> & { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  if (!body.title && !body.doi) {
    return NextResponse.json(
      { error: 'At least title or doi is required' },
      { status: 400 },
    );
  }

  const previous = (await listRefs()).find((r) => r.id === body.id);
  const updated: CustomRef = {
    id: body.id,
    doi: body.doi ?? previous?.doi ?? '',
    title: body.title ?? previous?.title ?? '',
    authors: body.authors ?? previous?.authors ?? '',
    year: body.year ?? previous?.year ?? '',
    journal: body.journal ?? previous?.journal ?? '',
    type: body.type ?? previous?.type ?? 'article-journal',
    volume: body.volume ?? previous?.volume ?? '',
    issue: body.issue ?? previous?.issue ?? '',
    pages: body.pages ?? previous?.pages ?? '',
    url: body.url ?? previous?.url ?? '',
    fullCitation: body.fullCitation ?? previous?.fullCitation ?? '',
    addedAt: previous?.addedAt ?? new Date().toISOString(),
    source: body.source ?? previous?.source ?? 'web',
    pdfUrl: body.pdfUrl ?? previous?.pdfUrl ?? '',
    funding: body.funding ?? previous?.funding,
    tags: body.tags ?? previous?.tags,
  };

  const result = await upsertRef(updated);
  return NextResponse.json(
    {
      message: previous ? 'Reference updated' : 'Reference created',
      id: updated.id,
      reference: updated,
      persisted: result.ok,
      persistError: result.error,
      persistence: PERSISTENCE,
    },
    { status: result.ok ? (previous ? 200 : 201) : 500 },
  );
}

// PATCH – add and/or remove *project tags* on a reference, merging with its
// existing tags instead of replacing them. This is what files a paper under a
// report ("project:Policy Gap 2.0") when it's added to that project's Content
// Analysis corpus in the Project Workspace, so the same membership shows up in
// the Reference Manager's "Project view".
//
// Upserts: when the paper only exists in the bundled static library (no custom
// row yet), a custom-store row is created from the supplied `meta` so the
// project tag has somewhere durable to live. Plain tags and any other project
// tags already on the reference are preserved.
export async function PATCH(request: NextRequest) {
  let body: {
    id?: string;
    addProjects?: string[];
    removeProjects?: string[];
    meta?: Partial<CustomRef>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const add = (body.addProjects ?? []).map((s) => s.trim()).filter(Boolean);
  const remove = (body.removeProjects ?? []).map((s) => s.trim()).filter(Boolean);
  if (add.length === 0 && remove.length === 0) {
    return NextResponse.json(
      { error: 'addProjects or removeProjects is required' },
      { status: 400 },
    );
  }

  const previous = (await listRefs()).find((r) => r.id === body.id);
  const meta = body.meta ?? {};

  // No existing row and nothing to identify it by → can't create one.
  if (!previous && !meta.title && !meta.doi) {
    return NextResponse.json(
      { error: 'Reference not found and no metadata supplied to create it' },
      { status: 404 },
    );
  }

  const base: CustomRef = previous ?? {
    id: body.id,
    doi: meta.doi || '',
    title: meta.title || '',
    authors: meta.authors || '',
    year: meta.year || '',
    journal: meta.journal || '',
    type: meta.type || 'article-journal',
    volume: meta.volume || '',
    issue: meta.issue || '',
    pages: meta.pages || '',
    url: meta.url || '',
    fullCitation: meta.fullCitation || '',
    addedAt: new Date().toISOString(),
    source: meta.source || 'web',
    pdfUrl: meta.pdfUrl || '',
    funding: meta.funding,
    tags: meta.tags,
  };

  // Merge project membership into the existing tag set, case-insensitively,
  // leaving plain tags untouched.
  const { plain, projects } = splitTags(base.tags);
  const removeLc = new Set(remove.map((p) => p.toLowerCase()));
  const nextProjects = projects.filter((p) => !removeLc.has(p.toLowerCase()));
  for (const p of add) {
    if (!nextProjects.some((x) => x.toLowerCase() === p.toLowerCase())) {
      nextProjects.push(p);
    }
  }

  const updated: CustomRef = { ...base, tags: combineTags(plain, nextProjects) };
  const result = await upsertRef(updated);
  return NextResponse.json(
    {
      message: previous ? 'Reference tags updated' : 'Reference created with project tag',
      id: updated.id,
      reference: updated,
      persisted: result.ok,
      persistError: result.error,
      persistence: PERSISTENCE,
    },
    { status: result.ok ? 200 : 500 },
  );
}

// DELETE – remove a reference by id (?id=... or JSON body { id }).
export async function DELETE(request: NextRequest) {
  let id = request.nextUrl.searchParams.get('id') || '';
  if (!id) {
    try {
      const body = await request.json();
      id = body?.id || '';
    } catch {
      // ignore – will fall through to validation below
    }
  }
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const result = await deleteRef(id);
  return NextResponse.json(
    {
      message: 'Reference deleted',
      id,
      persisted: result.ok,
      persistError: result.error,
      persistence: PERSISTENCE,
    },
    { status: result.ok ? 200 : 500 },
  );
}
