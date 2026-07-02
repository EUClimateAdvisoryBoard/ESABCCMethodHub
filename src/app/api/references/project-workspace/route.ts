/**
 * "Cite from project workspace" — Word add-in endpoint.
 * -----------------------------------------------------
 * Serves the literature an analyst has added to a project workspace's
 * Content Analysis corpus, clustered by source tier and decorated with the
 * document-level "overall tags", so the Word add-in can browse, search and
 * filter a workspace's sources directly from the ribbon:
 *
 *   GET ?facet=projects
 *     → { projects: [{ id, name, count }] }
 *       Workspaces that have a corpus, with display names from `pw_projects`.
 *
 *   GET ?projectId=<id>[&tier=policy|scientific|grey][&tag=<name|codeId>]
 *          [&chapter=<name>][&q=…]
 *     → { project, total, tiers, tags, chapters, items }
 *       `items` is a flat array (policy → scientific → grey, then year desc)
 *       where each row carries a citable reference id:
 *         - workspace policy documents resolve to the `policy-*` entries the
 *           reference list now serves (see `@/lib/references/policy-entries`),
 *         - reference documents (`ref-doc-<refId>`) resolve back to their
 *           reference-manager id.
 *       `tags` aggregates the thematic overall tags across the (unfiltered)
 *       corpus, and `chapters` the report-chapter / sector classification, so
 *       the add-in can populate its tag- and chapter-filter dropdowns.
 *       `tagsText`, `chaptersText` and `summary` on each item are pre-joined /
 *       trimmed for the VBA JSON parser.
 *
 * Output strings are VBA-sanitised like /api/references; CORS is open the
 * same way because Word's HTTP stack calls this cross-origin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { references as staticReferences } from '@/data/references';
import { policies } from '@/data/policies';
import { SEED_PROJECTS } from '@/data/project-workspace';
import { ensureSeedLoaded, getStore } from '@/lib/references/custom-store';
import { findPolicyFlatRef, POLICY_REF_PREFIX } from '@/lib/references/policy-entries';
import { getCaCorpus, getCaDocuments, getCodes, listCaCorpusProjects } from '@/lib/content-analysis-store';
import { getMasterCode } from '@/lib/content-analysis/master-code-catalog';
import { isChapterTagId, parseChapterTag } from '@/lib/content-analysis/chapter-tags';
import { POLICY_TAG_ASSIGNMENTS } from '@/lib/content-analysis/policy-master-tags';
import { listProjects } from '@/lib/project-workspace/db';
import { getServerSupabase } from '@/lib/supabase-server';
import type { CorpusDocMeta } from '@/lib/content-analysis/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Cache-Control': 'no-store',
};

/** Prefix that marks a reference-library document promoted into the
 *  content-analysis world (see `useLiveReferences`). */
const REF_DOC_PREFIX = 'ref-doc-';

type Tier = 'policy' | 'scientific' | 'grey';

const TIER_ORDER: Tier[] = ['policy', 'scientific', 'grey'];

const TIER_LABELS: Record<Tier, string> = {
  policy: 'Policy documents',
  scientific: 'Scientific literature',
  grey: 'Grey literature & reports',
};

/** Same rule as `sourceTierOf` in `content-analysis/source-tier.ts`, applied
 *  to the corpus metadata snapshot. (That module pulls in a client hook, so
 *  the rule is restated here for the server.) */
function tierOf(meta: CorpusDocMeta): Tier {
  if (meta.sourceKind !== 'reference') return 'policy';
  const t = meta.referenceType;
  return t === 'article' || t === 'book' || t === 'chapter' ? 'scientific' : 'grey';
}

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  article: 'Journal article',
  book: 'Book',
  chapter: 'Book chapter',
  report: 'Report',
  web: 'Web',
  legislation: 'Legislation',
};

function kindLabelOf(meta: CorpusDocMeta): string {
  if (meta.sourceKind === 'reference' && meta.referenceType) {
    return REFERENCE_TYPE_LABELS[meta.referenceType] ?? meta.referenceType;
  }
  const kind = meta.kind || 'report';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

// Sanitize strings for the VBA add-in (mirrors /api/references).
function sanitize(str: string): string {
  return str
    .replace(/[\u2018\u2019\u201A]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"')    // smart double quotes
    .replace(/[\u2013\u2014]/g, '-')           // en-dash, em-dash
    .replace(/[\u2026]/g, '...')               // ellipsis
    .replace(/[\u00A0]/g, ' ');                // non-breaking space
}

// Lowercase + strip diacritics for fuzzy matching (mirrors /api/references).
function normalize(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

interface FlatRefLike {
  id: string;
  authors?: string;
  year?: string;
  title?: string;
  journal?: string | null;
  doi?: string | null;
  url?: string | null;
  type?: string;
  fullCitation?: string;
}

/** One citable row served to the add-in. */
interface WorkspaceItem {
  id: string;
  documentId: string;
  tier: Tier;
  tierLabel: string;
  kindLabel: string;
  authors: string;
  year: string;
  title: string;
  journal: string | null;
  doi: string | null;
  url: string | null;
  type: string;
  citation_key: string;
  fullCitation: string;
  tags: string[];
  tagsText: string;
  /** Chapter (report-chapter / sector) classification names, e.g. "Industry".
   *  A separate dimension from the thematic `tags` so the add-in can filter by
   *  chapter independently. */
  chapters: string[];
  chaptersText: string;
  /** Whole-document summary authored in the project workspace (trimmed). */
  summary: string;
}

/** Fallback display name for corpus project ids with no `pw_projects` row. */
function prettifyProjectId(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface WorkspaceProjectLite {
  id: string;
  name: string;
  hasContentAnalysis: boolean;
}

/** Project workspaces with names + whether they carry a Content Analysis
 *  module. Server list first; the bundled seed projects fill in when the
 *  database is unreachable (and any seed project missing from the DB). */
async function loadWorkspaceProjects(): Promise<WorkspaceProjectLite[]> {
  const out = new Map<string, WorkspaceProjectLite>();
  try {
    for (const p of await listProjects()) {
      out.set(p.id, {
        id: p.id,
        name: p.name,
        hasContentAnalysis: p.modules.some(m => m.kind === 'content-analysis'),
      });
    }
  } catch {
    // fall through to the seed list
  }
  for (const p of SEED_PROJECTS) {
    if (!out.has(p.id)) {
      out.set(p.id, {
        id: p.id,
        name: p.name,
        hasContentAnalysis: p.modules.some(m => m.kind === 'content-analysis'),
      });
    }
  }
  return [...out.values()];
}

/** Overall (document-level) tags for a set of documents, as codeId lists.
 *  Best-effort: no Supabase / no table → no manual tags. */
async function loadOverallTags(documentIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (documentIds.length === 0) return out;
  const sb = getServerSupabase();
  if (!sb) return out;
  try {
    const { data, error } = await sb
      .from('content_analysis_overall_tags')
      .select('document_id, code_id')
      .in('document_id', documentIds);
    if (error || !data) return out;
    for (const row of data as Array<{ document_id: string; code_id: string }>) {
      const list = out.get(row.document_id) ?? [];
      list.push(row.code_id);
      out.set(row.document_id, list);
    }
  } catch {
    // tags stay empty
  }
  return out;
}

/** Whole-document summaries for a set of documents, as documentId → text.
 *  Best-effort: no Supabase / no table → no summaries. When a document has
 *  been summarised under more than one project, the longest (most fleshed-out)
 *  summary wins. */
async function loadSummaries(documentIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (documentIds.length === 0) return out;
  const sb = getServerSupabase();
  if (!sb) return out;
  try {
    const { data, error } = await sb
      .from('content_analysis_summaries')
      .select('document_id, text')
      .in('document_id', documentIds);
    if (error || !data) return out;
    for (const row of data as Array<{ document_id: string; text: string }>) {
      const text = (row.text || '').trim();
      if (!text) continue;
      const prev = out.get(row.document_id);
      if (!prev || text.length > prev.length) out.set(row.document_id, text);
    }
  } catch {
    // summaries stay empty
  }
  return out;
}

/** Collapse whitespace and cap length so a summary stays compact in the VBA
 *  add-in's JSON payload and read-only preview box. */
function trimSummary(text: string, max = 600): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** codeId → display name across the master taxonomy and the shared custom
 *  code table. Unresolvable ids are dropped (better no chip than a raw id). */
async function buildCodeNameResolver(): Promise<(codeId: string) => string | null> {
  let custom = new Map<string, string>();
  try {
    custom = new Map((await getCodes()).map(c => [c.id, c.name]));
  } catch {
    // master taxonomy still resolves
  }
  return (codeId: string) => getMasterCode(codeId)?.name ?? custom.get(codeId) ?? null;
}

/** Map a reference's stored `type` (closed union or CSL item type) onto the
 *  closed union the tier split understands (mirrors `normaliseRefType` in
 *  `useLiveReferences`, which is client-only). */
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

const POLICY_KINDS = new Set(['regulation', 'directive', 'decision', 'communication', 'strategy']);

let policyByIdOrCelex: Map<string, (typeof policies)[number]> | null = null;
function lookupPolicy(idOrCelex: string): (typeof policies)[number] | undefined {
  if (!policyByIdOrCelex) {
    policyByIdOrCelex = new Map();
    for (const p of policies) {
      policyByIdOrCelex.set(p.id, p);
      if (p.celex_number) policyByIdOrCelex.set(p.celex_number, p);
    }
  }
  return policyByIdOrCelex.get(idOrCelex);
}

/** Rebuild display metadata for a legacy (meta-less) corpus row, the same way
 *  the web workspace resolves bare ids against its document universe. Returns
 *  null only when the id is unknown to every store. */
function synthesizeMeta(
  documentId: string,
  refById: Map<string, FlatRefLike>,
  caDocsById: Map<string, { title: string; celexNumber: string | null; pdfUrl: string; pageCount: number }>,
): CorpusDocMeta | null {
  const short = (title: string) => (title.length > 90 ? `${title.slice(0, 87)}…` : title);

  if (documentId.startsWith(REF_DOC_PREFIX)) {
    const ref = refById.get(documentId.slice(REF_DOC_PREFIX.length));
    if (!ref?.title) return null;
    return {
      id: documentId,
      title: ref.title,
      shortTitle: short(ref.title),
      kind: 'report',
      sourceKind: 'reference',
      referenceType: normaliseRefType(ref.type),
      referenceAuthors: ref.authors || undefined,
      referenceYear: ref.year || undefined,
      referenceUrl: ref.url ?? (ref.doi ? `https://doi.org/${ref.doi}` : undefined),
    };
  }

  const policy = lookupPolicy(documentId);
  if (policy) {
    return {
      id: documentId,
      title: policy.title,
      shortTitle: policy.short_title || short(policy.title),
      kind: (POLICY_KINDS.has(policy.document_type) ? policy.document_type : 'regulation') as CorpusDocMeta['kind'],
      sourceKind: 'policy',
      celexNumber: policy.celex_number,
    };
  }

  const shared = caDocsById.get(documentId);
  if (shared?.title) {
    return {
      id: documentId,
      title: shared.title,
      shortTitle: short(shared.title),
      kind: 'report',
      sourceKind: 'policy',
      celexNumber: shared.celexNumber,
      pdfUrl: shared.pdfUrl || undefined,
      pageCount: shared.pageCount,
    };
  }

  return null;
}

function buildItem(
  meta: CorpusDocMeta,
  documentId: string,
  refById: Map<string, FlatRefLike>,
  overallTags: Map<string, string[]>,
  resolveCodeName: (codeId: string) => string | null,
  summaries: Map<string, string>,
): WorkspaceItem {
  const tier = tierOf(meta);

  // Collect tag code-ids: manual overall tags, the AI baseline for policies,
  // and the AI codes snapshotted onto the corpus row when it was added.
  const codeIds = new Set<string>(overallTags.get(documentId) ?? []);
  if (tier === 'policy') {
    for (const a of POLICY_TAG_ASSIGNMENTS[documentId] ?? []) codeIds.add(a.codeId);
  }
  for (const id of meta.aiCodeIds ?? []) codeIds.add(id);

  // Chapter (report-chapter / sector) tags are a self-describing, separate
  // dimension (`chapter:<color>:<name>`) that the master/custom resolver does
  // not know about — so they were previously dropped. Split them out and
  // resolve their names directly, exposing them as their own facet.
  const chapterNames = new Set<string>();
  const thematicIds: string[] = [];
  for (const id of codeIds) {
    if (isChapterTagId(id)) {
      const c = parseChapterTag(id);
      if (c) chapterNames.add(c.name);
    } else {
      thematicIds.push(id);
    }
  }
  const tags = thematicIds
    .map(resolveCodeName)
    .filter((n): n is string => !!n)
    .sort((a, b) => a.localeCompare(b));
  const chapters = [...chapterNames].sort((a, b) => a.localeCompare(b));
  const summary = trimSummary(summaries.get(documentId) ?? '');

  let citeId: string;
  let authors = meta.referenceAuthors || '';
  let year = meta.referenceYear || '';
  let journal: string | null = null;
  let doi: string | null = null;
  let url: string | null = meta.referenceUrl || meta.pdfUrl || null;
  let type: string = meta.sourceKind === 'reference' ? meta.referenceType || 'report' : 'legislation';
  let fullCitation = '';

  if (meta.sourceKind === 'reference') {
    citeId = documentId.startsWith(REF_DOC_PREFIX) ? documentId.slice(REF_DOC_PREFIX.length) : documentId;
    const ref = refById.get(citeId);
    if (ref) {
      authors = ref.authors || authors;
      year = ref.year || year;
      journal = ref.journal ?? null;
      doi = ref.doi ?? null;
      url = ref.url ?? url;
      type = ref.type || type;
      fullCitation = ref.fullCitation || '';
    }
  } else {
    const policyRef = findPolicyFlatRef(documentId) ?? (meta.celexNumber ? findPolicyFlatRef(meta.celexNumber) : null);
    if (policyRef) {
      citeId = policyRef.id;
      authors = policyRef.authors;
      year = policyRef.year;
      url = policyRef.url ?? url;
      fullCitation = policyRef.fullCitation;
    } else {
      // Ingested act outside the tracked corpus: still citable — the insert
      // flow stores the full citation in the document, so nothing needs to
      // resolve this id server-side later.
      citeId = `${POLICY_REF_PREFIX}${documentId}`;
      authors = authors || 'European Union';
      const celexYear = (meta.celexNumber || '').match(/^[0-9C]?(\d{4})/);
      year = year || (celexYear ? celexYear[1] : '');
      if (!url && meta.celexNumber) {
        url = `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${meta.celexNumber}`;
      }
    }
  }

  if (!fullCitation) {
    fullCitation = `${authors}${year ? ` (${year})` : ''}. ${meta.title}.`;
    if (meta.celexNumber) fullCitation += ` CELEX ${meta.celexNumber}.`;
    if (url) fullCitation += ` ${url}`;
  }

  return {
    id: citeId,
    documentId,
    tier,
    tierLabel: TIER_LABELS[tier],
    kindLabel: kindLabelOf(meta),
    authors: sanitize(authors),
    year,
    title: sanitize(meta.title),
    journal: journal ? sanitize(journal) : null,
    doi,
    url,
    type,
    citation_key: citeId,
    fullCitation: sanitize(fullCitation),
    tags: tags.map(sanitize),
    tagsText: sanitize(tags.join('; ')),
    chapters: chapters.map(sanitize),
    chaptersText: sanitize(chapters.join('; ')),
    summary: sanitize(summary),
  };
}

/** Every-token-must-match filter over the fields a user would search on. */
function matchesQuery(item: WorkspaceItem, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = normalize(
    [item.title, item.authors, item.year, item.kindLabel, item.tags.join(' '), item.chapters.join(' '), item.summary].join(' '),
  );
  return tokens.every(t => haystack.includes(t));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const facet = params.get('facet') || '';
  const projectId = params.get('projectId') || '';
  const tierFilter = params.get('tier') || '';
  const tagFilter = params.get('tag') || '';
  const chapterFilter = params.get('chapter') || '';
  const query = params.get('q') || '';
  const limit = Math.min(parseInt(params.get('limit') || '500') || 500, 2000);

  if (facet === 'projects') {
    const [corpusProjects, wsProjects] = await Promise.all([listCaCorpusProjects(), loadWorkspaceProjects()]);
    const counts = new Map(corpusProjects.map(p => [p.projectId, p.count]));
    // Workspaces with a Content Analysis module are selectable even before
    // any of their corpus rows have synced server-side (documents added in a
    // browser before the shared corpus shipped migrate up on the next visit).
    for (const p of wsProjects) {
      if (p.hasContentAnalysis && !counts.has(p.id)) counts.set(p.id, 0);
    }
    const names = new Map(wsProjects.map(p => [p.id, p.name]));
    const projects = [...counts.entries()]
      .map(([id, count]) => ({
        id,
        name: sanitize(names.get(id) ?? prettifyProjectId(id)),
        count,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return NextResponse.json({ projects }, { headers: CORS_HEADERS });
  }

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId required (or facet=projects)' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  await ensureSeedLoaded();
  const rawEntries = await getCaCorpus(projectId);

  const refById = new Map<string, FlatRefLike>();
  for (const r of [...getStore(), ...staticReferences] as FlatRefLike[]) {
    if (!refById.has(r.id)) refById.set(r.id, r);
  }

  // Legacy corpus rows (added before metadata travelled with the membership)
  // have meta = null. The web workspace still renders them by resolving the
  // id against its local document universe — mirror that here so the add-in
  // shows the same list: reference library, tracked policy corpus, then the
  // shared ingested-documents store.
  const needsSynthesis = rawEntries.some(e => !e.meta);
  const caDocsById = new Map<string, { title: string; celexNumber: string | null; pdfUrl: string; pageCount: number }>();
  if (needsSynthesis) {
    try {
      for (const d of await getCaDocuments()) caDocsById.set(d.id, d);
    } catch {
      // shared documents unavailable — the other resolvers still apply
    }
  }
  const entries = rawEntries
    .map(e => ({ documentId: e.documentId, meta: e.meta ?? synthesizeMeta(e.documentId, refById, caDocsById) }))
    .filter((e): e is { documentId: string; meta: CorpusDocMeta } => !!e.meta);

  const [overallTags, summaries, resolveCodeName, wsProjects] = await Promise.all([
    loadOverallTags(entries.map(e => e.documentId)),
    loadSummaries(entries.map(e => e.documentId)),
    buildCodeNameResolver(),
    loadWorkspaceProjects(),
  ]);
  const names = new Map(wsProjects.map(p => [p.id, p.name]));

  const allItems = entries.map(e =>
    buildItem(e.meta, e.documentId, refById, overallTags, resolveCodeName, summaries),
  );
  allItems.sort(
    (a, b) =>
      TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
      (b.year || '').localeCompare(a.year || '') ||
      a.title.localeCompare(b.title),
  );

  // Facets are aggregated over the whole corpus (not the filtered slice) so
  // the add-in's dropdowns stay stable while the user narrows the list.
  const tagCounts = new Map<string, number>();
  for (const item of allItems) {
    for (const t of item.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const tagsFacet = [...tagCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const chapterCounts = new Map<string, number>();
  for (const item of allItems) {
    for (const c of item.chapters) chapterCounts.set(c, (chapterCounts.get(c) ?? 0) + 1);
  }
  const chaptersFacet = [...chapterCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const tiersFacet = TIER_ORDER.map(tier => ({
    id: tier,
    label: TIER_LABELS[tier],
    count: allItems.filter(i => i.tier === tier).length,
  }));

  let filtered = allItems;
  if (tierFilter && TIER_ORDER.includes(tierFilter as Tier)) {
    filtered = filtered.filter(i => i.tier === tierFilter);
  }
  if (tagFilter) {
    const wanted = normalize(tagFilter);
    filtered = filtered.filter(i => i.tags.some(t => normalize(t) === wanted));
  }
  if (chapterFilter) {
    const wanted = normalize(chapterFilter);
    filtered = filtered.filter(i => i.chapters.some(c => normalize(c) === wanted));
  }
  const tokens = normalize(query).split(/[\s,;:()\[\]"']+/).filter(t => t && /[a-z0-9]/.test(t));
  filtered = filtered.filter(i => matchesQuery(i, tokens));

  return NextResponse.json(
    {
      project: {
        id: projectId,
        name: sanitize(names.get(projectId) ?? prettifyProjectId(projectId)),
      },
      total: filtered.length,
      tiers: tiersFacet,
      tags: tagsFacet,
      chapters: chaptersFacet,
      items: filtered.slice(0, limit),
    },
    { headers: CORS_HEADERS },
  );
}
