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
 *   GET ?projectId=<id>[&tier=policy|scientific|grey][&tag=<name|codeId>][&q=…]
 *     → { project, total, tiers, tags, items }
 *       `items` is a flat array (policy → scientific → grey, then year desc)
 *       where each row carries a citable reference id:
 *         - workspace policy documents resolve to the `policy-*` entries the
 *           reference list now serves (see `@/lib/references/policy-entries`),
 *         - reference documents (`ref-doc-<refId>`) resolve back to their
 *           reference-manager id.
 *       `tags` aggregates the overall tags across the (unfiltered) corpus so
 *       the add-in can populate its tag-filter dropdown; `tagsText` on each
 *       item is pre-joined for the VBA JSON parser.
 *
 * Output strings are VBA-sanitised like /api/references; CORS is open the
 * same way because Word's HTTP stack calls this cross-origin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { references as staticReferences } from '@/data/references';
import { ensureSeedLoaded, getStore } from '@/lib/references/custom-store';
import { findPolicyFlatRef, POLICY_REF_PREFIX } from '@/lib/references/policy-entries';
import { getCaCorpus, getCodes, listCaCorpusProjects } from '@/lib/content-analysis-store';
import { getMasterCode } from '@/lib/content-analysis/master-code-catalog';
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
}

/** Fallback display name for corpus project ids with no `pw_projects` row. */
function prettifyProjectId(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function loadProjectNames(): Promise<Map<string, string>> {
  try {
    const projects = await listProjects();
    return new Map(projects.map(p => [p.id, p.name]));
  } catch {
    return new Map();
  }
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

function buildItem(
  meta: CorpusDocMeta,
  documentId: string,
  refById: Map<string, FlatRefLike>,
  overallTags: Map<string, string[]>,
  resolveCodeName: (codeId: string) => string | null,
): WorkspaceItem {
  const tier = tierOf(meta);

  // Collect tag code-ids: manual overall tags, the AI baseline for policies,
  // and the AI codes snapshotted onto the corpus row when it was added.
  const codeIds = new Set<string>(overallTags.get(documentId) ?? []);
  if (tier === 'policy') {
    for (const a of POLICY_TAG_ASSIGNMENTS[documentId] ?? []) codeIds.add(a.codeId);
  }
  for (const id of meta.aiCodeIds ?? []) codeIds.add(id);
  const tags = [...codeIds]
    .map(resolveCodeName)
    .filter((n): n is string => !!n)
    .sort((a, b) => a.localeCompare(b));

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
  };
}

/** Every-token-must-match filter over the fields a user would search on. */
function matchesQuery(item: WorkspaceItem, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = normalize(
    [item.title, item.authors, item.year, item.kindLabel, item.tags.join(' ')].join(' '),
  );
  return tokens.every(t => haystack.includes(t));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const facet = params.get('facet') || '';
  const projectId = params.get('projectId') || '';
  const tierFilter = params.get('tier') || '';
  const tagFilter = params.get('tag') || '';
  const query = params.get('q') || '';
  const limit = Math.min(parseInt(params.get('limit') || '500') || 500, 2000);

  if (facet === 'projects') {
    const [corpusProjects, names] = await Promise.all([listCaCorpusProjects(), loadProjectNames()]);
    const projects = corpusProjects
      .map(p => ({
        id: p.projectId,
        name: sanitize(names.get(p.projectId) ?? prettifyProjectId(p.projectId)),
        count: p.count,
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
  const entries = (await getCaCorpus(projectId)).filter(e => e.meta);

  const refById = new Map<string, FlatRefLike>();
  for (const r of [...getStore(), ...staticReferences] as FlatRefLike[]) {
    if (!refById.has(r.id)) refById.set(r.id, r);
  }

  const [overallTags, resolveCodeName, names] = await Promise.all([
    loadOverallTags(entries.map(e => e.documentId)),
    buildCodeNameResolver(),
    loadProjectNames(),
  ]);

  const allItems = entries.map(e =>
    buildItem(e.meta as CorpusDocMeta, e.documentId, refById, overallTags, resolveCodeName),
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
      items: filtered.slice(0, limit),
    },
    { headers: CORS_HEADERS },
  );
}
