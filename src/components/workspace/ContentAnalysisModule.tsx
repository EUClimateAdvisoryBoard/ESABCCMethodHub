/**
 * Content Analysis module for the Project Workspace.
 * --------------------------------------------------
 * Replaces the legacy "Policy analysis" tab with the same MAXQDA-style
 * qualitative-coding workbench that powers the standalone /content-analysis
 * route — but scoped to a single workspace project.
 *
 * Flow
 * ----
 *   1. The analyst first picks a *source type* (what they want to code):
 *        • Policy analysis        — the EU policy corpus (mark text + tag).
 *        • Scientific literature  — peer-reviewed references (article / book
 *                                   / chapter) pulled live from the reference
 *                                   manager; tag the PDF once uploaded.
 *        • Grey literature & reports — reports / web / legislation references,
 *                                   plus uploaded report PDFs.
 *      All three are backed by the shared reference manager: anything added
 *      there (or in a project workspace) is automatically part of the wider
 *      library here.
 *
 *   2. Coding happens on documents the analyst has *added to this workspace*
 *      (the per-project corpus). Every coded segment is stamped with this
 *      workspace's project id so it is attributable to the project.
 *
 *   3. A "lens" selector decides whose tags are shown — and is shared by the
 *      coding view and the analysis/clustering view:
 *        • Master library   — the shared substrate every project starts from
 *                             (segments with no project), so we never start
 *                             from scratch.
 *        • This project     — segments tagged inside this workspace.
 *        • Other projects   — what e.g. the Industry Project or Policy Gap 2.0
 *                             have been tagging, so analysts can compare.
 *
 * Live collaboration
 * ------------------
 * Coded segments persist straight through the content-analysis store to
 * `content_analysis_segments` (Supabase) keyed by project id, so a tag added
 * here saves immediately and shows up — under the right lens — for everyone
 * else on their next sync, even when it was added from a different project.
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';
import { useContentAnalysis } from '@/lib/content-analysis/store';
import {
  useLiveReferences,
  referencePdfCacheKey,
} from '@/lib/content-analysis/useLiveReferences';
import { semanticColorFor, lightenedFromParent } from '@/lib/content-analysis/semantic-palette';
import { useOverallTags } from '@/lib/content-analysis/useOverallTags';
import type { AnalysisDocument, CodeNode, DocumentSummary, SummaryBlock } from '@/lib/content-analysis/types';
import {
  sourceTierOf,
  SOURCE_TIER_META,
  SOURCE_TIERS,
  type SourceTier,
} from '@/lib/content-analysis/source-tier';
import DocumentSummaryPanel from '@/components/content-analysis/DocumentSummaryPanel';
import GuidedSession from '@/components/content-analysis/GuidedSession';
import CodeSystemTree from '@/components/content-analysis/CodeSystemTree';
import DocumentList from '@/components/content-analysis/DocumentList';
import OverallTagPicker from '@/components/content-analysis/OverallTagPicker';
import AnnotatedDocumentView from '@/components/content-analysis/AnnotatedDocumentView';
import SegmentsList from '@/components/content-analysis/SegmentsList';
import WorkspaceAnalysis, { type AnalysisTab } from '@/components/content-analysis/WorkspaceAnalysis';
import FloatingCodeToolbar, { type ToolbarSelection } from '@/components/content-analysis/FloatingCodeToolbar';
import type { PdfTextSelection } from '@/components/content-analysis/PdfDocumentView';
import CodeEditorModal, {
  type CodeEditorPayload,
  type CodeEditorResult,
} from '@/components/content-analysis/CodeEditorModal';
import { showToast } from '@/components/ui/ToastHost';
import { uploadPdf } from '@/lib/references/pdf-storage';

const PdfDocumentView = dynamic(
  () => import('@/components/content-analysis/PdfDocumentView'),
  { ssr: false, loading: () => <div className="p-4 text-[12px] text-[#8A95A3]">Loading PDF viewer…</div> },
);

// Locate a passage selected on a PDF page within the document's flat text so a
// coded segment can anchor to real character offsets. PDF text-layer
// selections often differ from `doc.text` only in whitespace, so we match on a
// whitespace-normalised copy and map the hit back to original offsets.
function findNormalized(
  haystack: string,
  needle: string,
  fromIndex = 0,
): { startChar: number; endChar: number } | null {
  const nNeedle = needle.replace(/\s+/g, ' ').trim().toLowerCase();
  if (nNeedle.length < 2) return null;
  let norm = '';
  const map: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < haystack.length; i++) {
    const ch = haystack[i];
    if (/\s/.test(ch)) {
      if (prevSpace) continue;
      norm += ' '; map.push(i); prevSpace = true;
    } else {
      norm += ch.toLowerCase(); map.push(i); prevSpace = false;
    }
  }
  let searchFrom = 0;
  for (;;) {
    const at = norm.indexOf(nNeedle, searchFrom);
    if (at < 0) return null;
    const startOrig = map[at];
    if (startOrig >= fromIndex) {
      const endNorm = Math.min(at + nNeedle.length - 1, map.length - 1);
      return { startChar: startOrig, endChar: map[endNorm] + 1 };
    }
    searchFrom = at + 1;
  }
}

function locateSelectionOffsets(
  doc: AnalysisDocument,
  blockId: string | null,
  text: string,
): { startChar: number; endChar: number } {
  const full = doc.text ?? '';
  let base = 0;
  const block = blockId ? doc.blocks?.find(b => b.id === blockId) : undefined;
  if (block?.text) {
    const bi = full.indexOf(block.text);
    if (bi >= 0) base = bi;
  }
  return (
    findNormalized(full, text, base) ||
    findNormalized(full, text, 0) ||
    { startChar: base, endChar: base + (block?.text?.length ?? text.length) }
  );
}

const DEFAULT_CODE_COLORS = [
  '#00928F', '#E87722', '#0065A4', '#7C3AED', '#D97706',
  '#65A30D', '#B83230', '#14B8A6', '#0EA5E9', '#A855F7',
];

// Map the workbench's closed reference-type union onto the CSL item types the
// Reference Manager store uses, so a paper filed into a project's corpus is
// created with the right type if it doesn't yet have a custom-store row.
const REF_TYPE_TO_CSL: Record<string, string> = {
  article: 'article-journal',
  report: 'report',
  web: 'webpage',
  chapter: 'chapter',
  legislation: 'legislation',
  book: 'book',
};

// ── Source types ────────────────────────────────────────────────────────────
// The three source tiers (policy / scientific / grey) and their labels come
// from the shared `source-tier` module, so this in-workspace surface and the
// standalone /content-analysis route never drift apart.
type SourceType = SourceTier;

const SOURCE_TYPES: Array<{ id: SourceType; title: string; blurb: string; icon: string }> =
  SOURCE_TIERS.map(id => ({
    id,
    title: SOURCE_TIER_META[id].title,
    blurb: SOURCE_TIER_META[id].chooserBlurb,
    icon: SOURCE_TIER_META[id].icon,
  }));

interface WorkspaceProjectLite {
  id: string;
  name: string;
}

interface Props {
  projectId: string;
  projectName: string;
  /** When the project is the Industry Project, default the policy corpus
   *  filter to industry-relevant documents on first entry. */
  industryFocus?: boolean;
}

/** localStorage key holding the per-workspace corpus (document allow-list). */
function corpusKey(projectId: string): string {
  return `ca:ws-corpus:${projectId}`;
}

/**
 * Promote a freshly-ingested reference PDF into the shared reference library
 * (`custom_references`) so the durable proxy `/api/references/pdf?id=…` can
 * serve it on later visits and from any serverless instance — not only from
 * this instance's ephemeral content-analysis ingest cache.
 *
 * Bundled static-library references (and browser-local ones) have no row in
 * the shared store, so without this their workspace PDF would 404 on a fresh
 * instance even after a successful upload. For an uploaded file we first push
 * the bytes to durable Supabase storage; a library "Load PDF" already has a
 * durable URL we reuse. Best-effort: failures are swallowed because the ingest
 * cache still serves the PDF for the current session.
 */
async function persistReferenceToLibrary(
  doc: AnalysisDocument,
  opts: { blob?: Blob; sourceUrl?: string },
): Promise<void> {
  const refId = doc.id.replace(/^ref-doc-/, '');
  if (!refId || !doc.title) return;
  try {
    // Resolve a durable, allow-listed (Supabase-hosted) PDF URL the proxy can
    // stream from. An uploaded file is pushed to storage here; a "Load PDF"
    // already carries one in `sourceUrl`.
    let pdfUrl = opts.sourceUrl ?? doc.pdfUrl ?? '';
    if (opts.blob) {
      const up = await uploadPdf(refId, opts.blob);
      if (!up.ok || !up.publicUrl) return;
      pdfUrl = up.publicUrl;
    }
    if (!pdfUrl) return;

    // Only send fields we actually have; omitting the rest lets the PUT
    // handler keep any richer metadata already on an existing row.
    const body: Record<string, string> = { id: refId, title: doc.title, pdfUrl, source: 'web' };
    if (doc.referenceAuthors) body.authors = doc.referenceAuthors;
    if (doc.referenceYear) body.year = doc.referenceYear;
    if (doc.referenceType) body.type = doc.referenceType;
    if (doc.referenceUrl) body.url = doc.referenceUrl;

    await fetch('/api/references/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    /* best-effort — the ingest cache still serves the PDF this session */
  }
}

/**
 * Persist a document's extracted substrate (text + block boxes) to the shared
 * server store so every user sees it without re-uploading the PDF. Best-effort:
 * the ingesting user already has it locally; this only benefits teammates.
 */
async function shareIngestedDocument(
  doc: AnalysisDocument,
  ingest: { text: string; blocks: import('@/lib/content-analysis/types').Block[]; pageCount: number; pdfUrl: string; ingestedAt: string },
): Promise<void> {
  if (!ingest.text.trim()) return;
  try {
    await fetch('/api/content-analysis/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: doc.id,
        title: doc.title,
        celexNumber: doc.celexNumber ?? null,
        pageCount: ingest.pageCount,
        ingestSource: 'manual-upload',
        pdfUrl: ingest.pdfUrl,
        ingestedAt: ingest.ingestedAt,
        text: ingest.text,
        blocks: ingest.blocks,
      }),
    });
  } catch {
    /* best-effort — local state already has the document this session */
  }
}

export default function ContentAnalysisModule({ projectId, projectName }: Props) {
  const {
    snapshot,
    addCode,
    renameCode,
    recolorCode,
    deleteCode,
    moveCode,
    mergeCode,
    addSegment,
    deleteSegment,
    updateSegmentNote,
    upsertDocument,
    applyIngestion,
    setDocumentSummary,
    loadSummaryBlocks,
  } = useContentAnalysis();
  const liveRefs = useLiveReferences();
  const overallTags = useOverallTags();
  const { user, displayName } = useAuth();

  /** Stamp a saved tag comment with the signed-in author so the segments
   *  list can show "who said it". */
  const handleUpdateNote = useCallback(
    (id: string, note: string) =>
      updateSegmentNote(id, note, { name: displayName ?? undefined, id: user?.id }),
    [updateSegmentNote, displayName, user?.id],
  );

  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [view, setView] = useState<'code' | 'analyse'>('code');
  /** Bumped by the "Guided tour" button to replay the Code-view walkthrough. */
  const [tourReplay, setTourReplay] = useState(0);
  /** Bumped to replay the Analyse-view walkthrough. */
  const [analysisTourReplay, setAnalysisTourReplay] = useState(0);
  /** Active Analyse-view lens — lifted so the analysis tour can drive it. */
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('outline');

  // The lens set — whose tags are visible. Always seeded with the master
  // library + this project so an analyst never starts from a blank canvas.
  const [lenses, setLenses] = useState<Set<string>>(() => new Set(['master', projectId]));
  const [wsProjects, setWsProjects] = useState<WorkspaceProjectLite[]>([]);

  // The per-workspace corpus (documents the analyst has added to this project).
  const [corpusIds, setCorpusIds] = useState<string[]>([]);
  const [corpusLoaded, setCorpusLoaded] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseQuery, setBrowseQuery] = useState('');
  // Overall-tag filter for the "Add documents" browser — narrows the library
  // to documents carrying at least one of the chosen document-level tags.
  const [browseTagFilter, setBrowseTagFilter] = useState<string[]>([]);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null);
  // When set, the segments panel opens an inline comment editor for this
  // segment — used by the "Add comment" toast action straight after tagging.
  const [commentForSegmentId, setCommentForSegmentId] = useState<string | null>(null);
  const [toolbarSel, setToolbarSel] = useState<ToolbarSelection | null>(null);
  const [codeEditor, setCodeEditor] = useState<CodeEditorPayload | null>(null);
  const [ingestState, setIngestState] = useState<{ status: 'idle' | 'loading' | 'error' | 'ok'; message?: string }>({ status: 'idle' });

  // ── Load / persist the workspace corpus ───────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(corpusKey(projectId));
      if (raw) setCorpusIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore corrupt storage */
    }
    setCorpusLoaded(true);
  }, [projectId]);

  useEffect(() => {
    if (!corpusLoaded) return;
    try {
      localStorage.setItem(corpusKey(projectId), JSON.stringify(corpusIds));
    } catch {
      /* quota — ignore */
    }
  }, [corpusIds, corpusLoaded, projectId]);

  // ── Discover sibling workspace projects for the lens chips ────────────────
  useEffect(() => {
    let cancelled = false;
    fetch('/api/project-workspace/projects')
      .then(r => (r.ok ? r.json() : { projects: [] }))
      .then((j: { projects?: WorkspaceProjectLite[] }) => {
        if (cancelled) return;
        setWsProjects((j.projects ?? []).map(p => ({ id: p.id, name: p.name })));
      })
      .catch(() => { /* lens chips just won't list siblings */ });
    return () => { cancelled = true; };
  }, []);

  // ── Document universe for the active source type ──────────────────────────
  const allDocuments = useMemo(() => {
    const seen = new Map<string, AnalysisDocument>();
    for (const d of snapshot.documents) seen.set(d.id, d);
    for (const d of liveRefs.docs) if (!seen.has(d.id)) seen.set(d.id, d);
    return [...seen.values()];
  }, [snapshot.documents, liveRefs.docs]);

  const matchesSource = useCallback(
    (d: AnalysisDocument): boolean => sourceType != null && sourceTierOf(d) === sourceType,
    [sourceType],
  );

  /** Candidate documents the analyst can add to this workspace. */
  const candidateDocs = useMemo(
    () => allDocuments.filter(matchesSource),
    [allDocuments, matchesSource],
  );

  /** The workspace corpus for the active source type. */
  const corpusDocs = useMemo(() => {
    const inCorpus = new Set(corpusIds);
    return candidateDocs.filter(d => inCorpus.has(d.id));
  }, [candidateDocs, corpusIds]);

  const filteredBrowse = useMemo(() => {
    const q = browseQuery.trim().toLowerCase();
    const inCorpus = new Set(corpusIds);
    let out = candidateDocs.filter(d => !inCorpus.has(d.id));
    if (q) {
      out = out.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.referenceAuthors ?? '').toLowerCase().includes(q),
      );
    }
    if (browseTagFilter.length > 0) {
      const wanted = new Set(browseTagFilter);
      const editable = sourceType !== 'policy';
      out = out.filter(d => {
        const tags = editable ? overallTags.getTags(d.id) : d.aiCodeIds;
        return tags.some(t => wanted.has(t));
      });
    }
    return out.slice(0, 200);
  }, [candidateDocs, corpusIds, browseQuery, browseTagFilter, sourceType, overallTags.getTags]);

  // ── Overall (document-level) tags ─────────────────────────────────────────
  // The shared master taxonomy is the pool of selectable overall tags — the
  // same codes policy documents are tagged with — so the dots stay comparable
  // across every source tier.
  const masterCodes = useMemo(
    () => snapshot.codes.filter(c => c.scope === 'master'),
    [snapshot.codes],
  );

  /** Whether the active source tier supports manual overall tagging. Policy
   *  documents carry an AI-curated baseline managed elsewhere; scientific &
   *  grey literature are tagged by hand here. */
  const canEditOverallTags = sourceType !== 'policy';

  /** Resolved overall tags for every corpus document, for the list dots.
   *  Editable tiers show the analyst-curated set (shared via the server);
   *  the policy corpus shows its AI baseline. */
  const overallTagsByDoc = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const d of corpusDocs) {
      m[d.id] = canEditOverallTags ? overallTags.getTags(d.id) : d.aiCodeIds;
    }
    return m;
  }, [corpusDocs, canEditOverallTags, overallTags.getTags]);

  // ── Codes visible in this workspace (master + this project's own) ─────────
  const visibleCodes = useMemo(
    () =>
      snapshot.codes.filter(
        c => c.scope === 'master' || (c.scope === 'project' && c.projectId === projectId),
      ),
    [snapshot.codes, projectId],
  );

  // ── Lens filtering ────────────────────────────────────────────────────────
  /** Bucket a segment's projectId into a lens id ('master' for null). */
  const lensOf = (segProjectId: string | null): string => segProjectId ?? 'master';

  const lensSegments = useMemo(
    () => snapshot.segments.filter(s => lenses.has(lensOf(s.projectId))),
    [snapshot.segments, lenses],
  );

  const corpusIdSet = useMemo(() => new Set(corpusDocs.map(d => d.id)), [corpusDocs]);

  /** Lens segments restricted to documents in the active corpus — what the
   *  analysis/clustering view operates on. */
  const analysisSegments = useMemo(
    () => lensSegments.filter(s => corpusIdSet.has(s.documentId)),
    [lensSegments, corpusIdSet],
  );

  const selectedDocument = useMemo(
    () => corpusDocs.find(d => d.id === selectedDocumentId) ?? corpusDocs[0] ?? null,
    [corpusDocs, selectedDocumentId],
  );

  // Keep the selection valid as the corpus changes.
  useEffect(() => {
    if (selectedDocument && selectedDocument.id !== selectedDocumentId) {
      setSelectedDocumentId(selectedDocument.id);
    } else if (!selectedDocument) {
      setSelectedDocumentId(null);
    }
  }, [selectedDocument, selectedDocumentId]);

  // Hydrate from the shared store: when a selected document has no local text
  // yet, pull the extracted text/blocks another user already ingested so it
  // opens fully coded without re-uploading the PDF. No-op when nothing is
  // stored (the empty state then offers Load/Upload as before).
  const selDocId = selectedDocument?.id ?? null;
  const selHasText = (selectedDocument?.text ?? '').trim().length > 50;
  useEffect(() => {
    if (!selDocId || selHasText) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `/api/content-analysis/documents?id=${encodeURIComponent(selDocId)}`,
          { cache: 'no-store' },
        );
        if (!r.ok) return;
        const j = await r.json();
        const item = j.item as import('@/lib/content-analysis/types').SharedIngestedDocument | undefined;
        if (cancelled || !item || !(item.text ?? '').trim()) return;
        const doc = corpusDocs.find(d => d.id === selDocId);
        if (doc) upsertDocument(doc);
        applyIngestion(selDocId, {
          pdfUrl: item.pdfUrl || '', pageCount: item.pageCount, blocks: item.blocks,
          text: item.text, ingestedAt: item.ingestedAt,
          archiveSource: item.ingestSource ?? 'manual-upload',
        });
      } catch {
        /* best-effort — fall back to the Load/Upload empty state */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selDocId, selHasText]);

  const docSegments = useMemo(
    () => (selectedDocument ? lensSegments.filter(s => s.documentId === selectedDocument.id) : []),
    [lensSegments, selectedDocument],
  );

  // ── Document-level summaries ("comment for the entire paper") ─────────────
  const projectNameById = useMemo(() => {
    const m = new Map<string | null, string>();
    m.set(null, 'Master library');
    m.set(projectId, projectName);
    for (const p of wsProjects) m.set(p.id, p.name);
    return m;
  }, [projectId, projectName, wsProjects]);

  const docSummaries = useMemo(
    () => (selectedDocument ? snapshot.summaries.filter(s => s.documentId === selectedDocument.id) : []),
    [snapshot.summaries, selectedDocument],
  );
  /** This project's own summary for the selected document — the editable one. */
  const ownSummary = useMemo(
    () => docSummaries.find(s => s.projectId === projectId) ?? null,
    [docSummaries, projectId],
  );
  /** Summaries authored under other projects — shown read-only for context. */
  const otherSummaries = useMemo(
    () => docSummaries.filter(s => s.projectId !== projectId),
    [docSummaries, projectId],
  );

  const handleSaveSummary = (text: string, blocks: SummaryBlock[]) => {
    if (!selectedDocument) return;
    upsertDocument(selectedDocument);
    setDocumentSummary(selectedDocument.id, projectId, text, blocks);
  };

  // ── Counts (within the active lens) ──────────────────────────────────────
  const codeCountsDirect = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of lensSegments) m[s.codeId] = (m[s.codeId] ?? 0) + 1;
    return m;
  }, [lensSegments]);

  const docCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of lensSegments) m[s.documentId] = (m[s.documentId] ?? 0) + 1;
    return m;
  }, [lensSegments]);

  // ── Mutating handlers ─────────────────────────────────────────────────────
  // Keep the shared Reference Manager's "Project view" in sync with this
  // project's corpus: filing a paper here files it under the project (a
  // `project:<name>` tag — see lib/references/projects), and removing it
  // un-files it. Only references have a row in the library; policy documents
  // don't, so they are skipped. Best-effort: a failed sync never blocks the
  // local corpus change, and the tag merges with — or is removed from — any
  // other tags the reference already carries.
  const syncReferenceProject = useCallback(
    (doc: AnalysisDocument, action: 'add' | 'remove') => {
      if ((doc.sourceKind ?? 'policy') !== 'reference') return;
      const refId = doc.id.replace(/^ref-doc-/, '');
      void fetch('/api/references/library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'add'
            ? {
                id: refId,
                addProjects: [projectName],
                // Supplied so a paper that only lives in the bundled static
                // library can be created as an editable row to carry the tag.
                meta: {
                  title: doc.title,
                  authors: doc.referenceAuthors ?? '',
                  year: doc.referenceYear ?? '',
                  url: doc.referenceUrl ?? '',
                  type: REF_TYPE_TO_CSL[doc.referenceType ?? ''] ?? 'article-journal',
                },
              }
            // No `meta` on removal: there's nothing to create — if the paper has
            // no library row there's no tag to drop, and the endpoint no-ops.
            : { id: refId, removeProjects: [projectName] },
        ),
      }).catch(() => { /* best effort — corpus membership is the source of truth */ });
    },
    [projectName],
  );

  const addToCorpus = (id: string) => {
    setCorpusIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setSelectedDocumentId(id);
    const doc = allDocuments.find(d => d.id === id);
    if (doc) syncReferenceProject(doc, 'add');
  };
  const removeFromCorpus = (id: string) => {
    setCorpusIds(prev => prev.filter(x => x !== id));
    const doc = allDocuments.find(d => d.id === id);
    if (doc) syncReferenceProject(doc, 'remove');
  };

  /** Remove a document from this workspace's corpus, with a confirm — the
   *  discoverable "delete document I added" control on each list row. Coded
   *  segments are intentionally kept (they stay attributable to the project
   *  and visible under its lens). */
  const confirmRemoveFromCorpus = (id: string) => {
    const doc = corpusDocs.find(d => d.id === id);
    const label = doc?.shortTitle || doc?.title || 'this document';
    if (
      window.confirm(
        `Remove “${label}” from this workspace?\n\nAny tags & comments you’ve already made on it are kept — you can add it back anytime.`,
      )
    ) {
      removeFromCorpus(id);
    }
  };

  const createSegment = (input: { startChar: number; endChar: number; text: string; blockId?: string; pdfAnchor?: import('@/lib/content-analysis/types').PdfAnchor }, codeId: string) => {
    if (!selectedDocument) return;
    upsertDocument(selectedDocument);
    const seg = addSegment({
      documentId: selectedDocument.id,
      codeId,
      startChar: input.startChar,
      endChar: input.endChar,
      text: input.text,
      blockId: input.blockId,
      pdfAnchor: input.pdfAnchor,
      // Stamp with this workspace's project id so the tag is attributable
      // to the project — this is what powers the lens comparison.
      projectId,
    });
    setHighlightedSegmentId(seg.id);
    const code = snapshot.codes.find(c => c.id === codeId);
    showToast({
      tone: 'success',
      message: `Tagged as "${code?.name ?? 'tag'}"`,
      description: 'Add a comment so the team knows why.',
      actionLabel: 'Add comment',
      onAction: () => {
        setView('code');
        setHighlightedSegmentId(seg.id);
        setCommentForSegmentId(seg.id);
      },
      timeoutMs: 8000,
    });
  };

  const handleCreateSegment = (input: { startChar: number; endChar: number; text: string; blockId?: string; pdfAnchor?: import('@/lib/content-analysis/types').PdfAnchor }) => {
    if (!selectedCodeId || !selectedDocument) return;
    createSegment(input, selectedCodeId);
  };

  // ── Code-tree handlers (reuses the CodeEditorModal) ──────────────────────
  const handleAddCode = (parentId: string | null) => setCodeEditor({ mode: 'add', targetId: parentId });
  const handleRename = (codeId: string) => setCodeEditor({ mode: 'rename', targetId: codeId });
  const handleRecolor = (codeId: string) => setCodeEditor({ mode: 'recolor', targetId: codeId });

  const suggestColor = (name: string, parentId: string | null): string => {
    let depth = 0;
    let rootName = name;
    let cur = parentId;
    while (cur && depth < 8) {
      const p = snapshot.codes.find(c => c.id === cur);
      if (!p) break;
      rootName = p.name;
      cur = p.parentId ?? null;
      depth++;
    }
    const semantic = semanticColorFor(rootName, depth);
    if (semantic) return semantic;
    if (parentId) {
      const direct = snapshot.codes.find(c => c.id === parentId);
      if (direct) return lightenedFromParent(direct.color, 1) ?? DEFAULT_CODE_COLORS[0];
    }
    return DEFAULT_CODE_COLORS[0];
  };

  const handleCodeEditorSubmit = (result: CodeEditorResult) => {
    if (!codeEditor) return;
    if (codeEditor.mode === 'add') {
      const name = result.name?.trim();
      if (!name) { setCodeEditor(null); return; }
      const code = addCode({
        name,
        parentId: codeEditor.targetId,
        color: result.color ?? suggestColor(name, codeEditor.targetId),
        description: result.description,
        // New tags are scoped to this workspace project — they extend the
        // master library without polluting it.
        scope: 'project',
        projectId,
      });
      setSelectedCodeId(code.id);
      const pending = codeEditor.pendingSegmentInput;
      if (pending && selectedDocument) {
        createSegment(pending, code.id);
      }
    } else if (codeEditor.mode === 'rename' && codeEditor.targetId) {
      const name = result.name?.trim();
      const current = snapshot.codes.find(c => c.id === codeEditor.targetId);
      if (name && name !== current?.name) renameCode(codeEditor.targetId, name);
      if (result.color && current && result.color !== current.color) recolorCode(codeEditor.targetId, result.color);
    } else if (codeEditor.mode === 'recolor' && codeEditor.targetId) {
      if (result.color) recolorCode(codeEditor.targetId, result.color);
    }
    setCodeEditor(null);
  };

  const handleDeleteCode = (codeId: string) => {
    const current = snapshot.codes.find(c => c.id === codeId);
    if (!current) return;
    if (current.scope === 'master') {
      showToast({ tone: 'warning', message: 'Master tags can only be edited in the master library', description: 'Create a project tag instead.' });
      return;
    }
    if (window.confirm(`Delete tag "${current.name}" and its segments? This cannot be undone.`)) {
      deleteCode(codeId);
      if (selectedCodeId === codeId) setSelectedCodeId(null);
    }
  };

  // ── Load full text for coding ─────────────────────────────────────────────
  const handleLoadText = async (doc: AnalysisDocument) => {
    if (!doc.celexNumber) return;
    upsertDocument(doc);
    setIngestState({ status: 'loading' });
    try {
      const resp = await fetch(`/api/content-analysis/ingest?celex=${encodeURIComponent(doc.celexNumber)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fallbackText: doc.text ?? '' }),
        cache: 'no-store',
      });
      const data = await resp.json();
      if (!resp.ok) { setIngestState({ status: 'error', message: data?.error ?? `HTTP ${resp.status}` }); return; }
      applyIngestion(doc.id, {
        pdfUrl: data.pdfUrl, pageCount: data.pageCount, blocks: data.blocks,
        text: data.text, ingestedAt: data.ingestedAt, archiveSource: data.source ?? 'eurlex-pdf',
      });
      setIngestState({ status: 'ok', message: 'full text loaded' });
    } catch (err) {
      setIngestState({ status: 'error', message: String(err) });
    }
  };

  // Shared PDF ingestion path. The ingest-upload route extracts text + block
  // boxes and caches the PDF server-side under a stable key (the real CELEX
  // for policies, or a synthetic key derived from the document id for
  // references). The cached PDF then lights up the PDF annotation pane via
  // /api/content-analysis/pdf.
  //
  // Bytes are supplied either as an uploaded `blob` (the file picker) or via
  // `sourceUrl`, in which case the server fetches them itself — used for
  // reference PDFs already stored in the library, so they don't have to make
  // a fragile cross-origin round-trip through the browser.
  const ingestPdf = async (
    doc: AnalysisDocument,
    opts: { blob?: Blob; sourceUrl?: string; label: string },
  ) => {
    upsertDocument(doc);
    setIngestState({ status: 'loading', message: `Loading ${opts.label}…` });
    const isRef = (doc.sourceKind ?? 'policy') === 'reference';
    const refId = doc.id.replace(/^ref-doc-/, '');
    const celexKey = doc.celexNumber ?? referencePdfCacheKey(doc.id);
    try {
      // ── Preferred path: extract the PDF in the *browser*. Server-side
      //    extraction of a large report (16 MB / hundreds of pages) overruns
      //    the serverless time/memory budget and the request dies before it can
      //    respond. The browser has no such limit. The bytes go to durable
      //    Supabase storage and are viewed back through the reference proxy, and
      //    the (small) extracted text/blocks are shared so teammates don't have
      //    to re-upload. References only — policy PDFs keep the server path,
      //    which their CELEX-keyed PDF route depends on.
      if (isRef) {
        let viewUrl = opts.sourceUrl;
        let bytes: ArrayBuffer | null = null;
        if (opts.blob) {
          setIngestState({ status: 'loading', message: `Uploading ${opts.label}…` });
          const up = await uploadPdf(refId, opts.blob);
          if (up.ok && up.publicUrl) {
            viewUrl = up.publicUrl;
            bytes = await opts.blob.arrayBuffer();
          }
        } else if (opts.sourceUrl) {
          // Pull the bytes into the browser so we can extract here. Try the
          // same-origin reference proxy first (CORS-safe), then the storage URL
          // directly — the proxy-by-id can 404 when the reference has no library
          // row yet, but the durable storage URL still serves the file.
          for (const u of [`/api/references/pdf?id=${encodeURIComponent(refId)}`, opts.sourceUrl]) {
            try {
              const r = await fetch(u, { cache: 'no-store' });
              if (!r.ok) continue;
              const b = await r.arrayBuffer();
              if (b.byteLength > 100) { bytes = b; break; }
            } catch {
              /* try the next source */
            }
          }
        }
        if (bytes && viewUrl) {
          try {
            setIngestState({ status: 'loading', message: `Reading ${opts.label}…` });
            const { extractPdfClient } = await import('@/lib/content-analysis/extract-pdf-client');
            const extracted = await extractPdfClient(bytes, celexKey);
            const ingestedAt = new Date().toISOString();
            // Register the reference in the shared library *first* so the PDF
            // proxy can serve the bytes the instant the pane renders (otherwise
            // the first load races the row write and 404s).
            await persistReferenceToLibrary(doc, { sourceUrl: viewUrl });
            applyIngestion(doc.id, {
              pdfUrl: viewUrl, pageCount: extracted.pageCount, blocks: extracted.blocks,
              text: extracted.text, ingestedAt, archiveSource: 'manual-upload',
            });
            // Share the extracted substrate so other users don't re-upload.
            void shareIngestedDocument(doc, { ...extracted, pdfUrl: viewUrl, ingestedAt });
            setIngestState({ status: 'ok', message: 'PDF loaded' });
            return;
          } catch {
            // Browser extraction failed (e.g. an unusual/corrupt PDF) — fall
            // through to the server path as a safety net.
          }
        }
        // Couldn't get bytes / a view URL (e.g. Supabase not configured) — fall
        // through to the server path below.
      }

      // ── Fallback path: server-side ingestion. Small policy PDFs, and the
      //    safety net when the browser path is unavailable. Keeps prior
      //    behaviour, including the multipart upload for small files.
      const celex = encodeURIComponent(celexKey);
      let url = `/api/content-analysis/ingest-upload?celex=${celex}`;
      const init: RequestInit = { method: 'POST' };
      let resolvedSourceUrl = opts.sourceUrl;
      if (opts.blob) {
        const up = await uploadPdf(isRef ? refId : celexKey, opts.blob);
        if (up.ok && up.publicUrl) {
          resolvedSourceUrl = up.publicUrl;
          url += `&url=${encodeURIComponent(up.publicUrl)}`;
        } else {
          const form = new FormData();
          form.append('file', opts.blob, 'document.pdf');
          init.body = form;
        }
      } else if (opts.sourceUrl) {
        url += `&url=${encodeURIComponent(opts.sourceUrl)}`;
      }
      const resp = await fetch(url, init);
      // The function can die (timeout/OOM) on a big PDF and return an empty
      // body — guard the JSON parse so we surface a clear error, not a raw
      // "Unexpected end of JSON input".
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data) {
        const message =
          (data && [data.error, data.detail].filter(Boolean).join(' — ')) ||
          `The server couldn’t process this PDF (HTTP ${resp.status}). It may be too large — try a smaller file.`;
        setIngestState({ status: 'error', message });
        return;
      }
      applyIngestion(doc.id, {
        pdfUrl: data.pdfUrl || '', pageCount: data.pageCount, blocks: data.blocks,
        text: data.text, ingestedAt: data.ingestedAt, archiveSource: 'manual-upload',
      });
      if (isRef) void persistReferenceToLibrary(doc, { sourceUrl: resolvedSourceUrl });
      void shareIngestedDocument(doc, {
        text: data.text, blocks: data.blocks, pageCount: data.pageCount,
        pdfUrl: data.pdfUrl || resolvedSourceUrl || '', ingestedAt: data.ingestedAt,
      });
      setIngestState({ status: 'ok', message: 'PDF loaded' });
    } catch (err) {
      setIngestState({ status: 'error', message: String(err) });
    }
  };

  const handleUpload = (doc: AnalysisDocument, file: File) =>
    ingestPdf(doc, { blob: file, label: file.name });

  // Ingest the PDF a user already uploaded in the reference manager (stored in
  // the public `reference-pdfs` bucket) so grey/scientific literature can be
  // annotated without re-uploading the same file.
  const handleLoadReferencePdf = (doc: AnalysisDocument) => {
    if (!doc.pdfUrl) return;
    return ingestPdf(doc, { sourceUrl: doc.pdfUrl, label: 'reference PDF' });
  };

  // ── Lens chips data ───────────────────────────────────────────────────────
  const lensChips = useMemo(() => {
    const chips: Array<{ id: string; label: string }> = [
      { id: 'master', label: 'Master library' },
      { id: projectId, label: `This project · ${projectName}` },
    ];
    for (const p of wsProjects) {
      if (p.id === projectId) continue;
      chips.push({ id: p.id, label: p.name });
    }
    return chips;
  }, [projectId, projectName, wsProjects]);

  const toggleLens = (id: string) => {
    setLenses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Never allow an empty lens — fall back to master.
      if (next.size === 0) next.add('master');
      return next;
    });
  };

  // ── Render: source-type chooser ───────────────────────────────────────────
  if (!sourceType) {
    return (
      <div className="space-y-4">
        <header>
          <h2 className="text-lg font-bold text-tertiary-dark">Content analysis</h2>
          <p className="text-sm text-tertiary mt-1 max-w-3xl">
            A MAXQDA-style coding workbench for this project. Choose what you want
            to analyse — the policy corpus, scientific literature or grey
            literature & reports. Mark passages and attach tags &amp; codes; every
            tag saves live and is shared back across projects through the master
            library.
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {SOURCE_TYPES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSourceType(s.id)}
              className="text-left bg-white border border-grey-200 rounded-xl p-4 hover:border-primary hover:shadow-sm transition"
            >
              <div className="text-2xl mb-2" aria-hidden>{s.icon}</div>
              <p className="text-sm font-bold text-tertiary-dark">{s.title}</p>
              <p className="text-xs text-tertiary mt-1 leading-snug">{s.blurb}</p>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-tertiary-light max-w-3xl">
          Scientific &amp; grey literature are drawn live from the reference
          manager — anything you add there (or in any project workspace) is
          automatically part of the wider library available here.
        </p>
      </div>
    );
  }

  const activeSourceMeta = SOURCE_TYPES.find(s => s.id === sourceType)!;

  // ── Render: workbench ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Guided session — same walkthrough as the standalone /content-analysis
          route, adapted to this in-workspace layout. Auto-opens the first time
          an analyst reaches the workbench (i.e. once they've picked a source)
          and is replayable from the "Guided tour" button. */}
      <GuidedSession
        moduleKey="content-analysis-workspace"
        active={sourceType != null}
        replayToken={tourReplay}
        steps={[
          {
            title: 'Your source tier',
            anchor: '.ca-ws-tour-source',
            body: (
              <>
                You&apos;re coding <strong>{SOURCE_TIER_META[sourceType].label.toLowerCase()}</strong> sources.
                {' '}{SOURCE_TIER_META[sourceType].blurb} Switch tiers here anytime.
              </>
            ),
          },
          {
            title: '1 · Add codes',
            anchor: '.ca-ws-tour-codes',
            body: (
              <>
                Add documents to this workspace, then build your code system: <strong>+ Root</strong> for a
                theme, the <strong>+</strong> on any code to nest a child. Codes you add here belong to this
                project and extend the shared master library.
              </>
            ),
          },
          {
            title: '2 · Select a code & tag text',
            anchor: '.ca-ws-tour-doc',
            body: (
              <>
                Click a code to make it active, then highlight a passage to tag it. No code active?
                Highlighting pops a toolbar to <strong>create a code and apply it</strong> at once.
              </>
            ),
          },
          {
            title: '3 · Write a summary',
            anchor: '.ca-ws-tour-summary',
            body: (
              <>
                Capture the gist of each document — plain text plus optional <strong>slides</strong>
                {' '}(flowcharts, screenshots, diagrams). Summaries are shared, so other projects&apos; takes
                show here read-only too.
              </>
            ),
          },
          {
            title: '4 · Change lenses',
            anchor: '.ca-ws-tour-lens',
            body: (
              <>
                A <strong>lens</strong> decides whose tags you see. Keep the master library on, then toggle
                this or sibling projects to compare what each has coded.
              </>
            ),
          },
          {
            title: '5 · Analyse the results',
            anchor: '.ca-ws-tour-views',
            body: (
              <>
                Switch to <strong>Analyse</strong> to cluster and chart every coded segment in your corpus,
                through the lenses you&apos;ve turned on.
              </>
            ),
          },
        ]}
      />
      {/* Analyse-view walkthrough — the "how to use the analysis" intro. Auto-
          opens the first time an analyst switches to the Analyse view, and
          drives the analysis sub-tabs as it goes so each lens is explained on
          its own surface. Replayable from the "Guided tour" button while the
          Analyse view is showing (bumps `analysisTourReplay`). */}
      <GuidedSession
        moduleKey="content-analysis-workspace-analysis"
        active={sourceType != null && view === 'analyse'}
        replayToken={analysisTourReplay}
        steps={[
          {
            title: 'From coding to analysis',
            anchor: '.ca-ws-tour-views',
            body: (
              <>
                <strong>Code</strong> is where you tag; <strong>Analyse</strong> turns those tags into a
                literature-review write-up — without changing anything. Everything here reflects the lenses
                you&apos;ve turned on above.
              </>
            ),
          },
          {
            title: 'Readiness at a glance',
            anchor: '.ca-ws-an-scorecard',
            body: (
              <>
                A quick &ldquo;can we start drafting?&rdquo; check: how many <strong>sources</strong> you&apos;ve coded,
                how many <strong>quotes</strong> you have, which themes carry evidence, and which are
                {' '}<strong>triangulated</strong> (≥3 sources). <strong>Evidence gaps</strong> flags themes with nothing yet.
              </>
            ),
          },
          {
            title: 'Four analysis lenses',
            anchor: '.ca-ws-an-tabs',
            body: (
              <>
                The same coded segments, four ways. Switch between them up here — we&apos;ll walk through each
                next.
              </>
            ),
          },
          {
            title: 'Report outline',
            anchor: '.ca-ws-an-panel',
            onEnter: () => setAnalysisTab('outline'),
            body: (
              <>
                The bridge to your draft: map report <strong>sections</strong> to tags and see which documents
                belong where — and where the gaps are.
              </>
            ),
          },
          {
            title: 'Synthesis matrix',
            anchor: '.ca-ws-an-panel',
            onEnter: () => setAnalysisTab('matrix'),
            body: (
              <>
                The classic themes × sources grid. Each cell shows the tagged segments, so you can see at a
                glance which themes are well-evidenced and where a theme is <strong>triangulated</strong> across
                enough sources.
              </>
            ),
          },
          {
            title: 'Evidence base',
            anchor: '.ca-ws-an-panel',
            onEnter: () => setAnalysisTab('evidence'),
            body: (
              <>
                A citation-ready <strong>quote bank</strong> grouped by theme — the passages you tagged, with
                their sources, ready to <strong>export to Word</strong> for the write-up.
              </>
            ),
          },
          {
            title: 'Tag distribution',
            anchor: '.ca-ws-an-panel',
            onEnter: () => setAnalysisTab('distribution'),
            body: (
              <>
                See how coding effort is spread across <strong>tags</strong> and <strong>documents</strong> — handy
                for spotting over- or under-coded themes before you draft.
              </>
            ),
          },
        ]}
      />
      {/* Header + source switch + view toggle */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-tertiary-dark">Content analysis</h2>
          <div className="ca-ws-tour-source flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">Source:</span>
            {SOURCE_TYPES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSourceType(s.id); setSelectedDocumentId(null); }}
                title={SOURCE_TIER_META[s.id].hint}
                className={`text-[11px] px-2 py-1 rounded border transition ${
                  sourceType === s.id
                    ? 'bg-primary text-white border-primary'
                    : 'border-grey-200 text-tertiary hover:border-tertiary'
                }`}
              >
                {s.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                view === 'analyse'
                  ? setAnalysisTourReplay(t => t + 1)
                  : setTourReplay(t => t + 1)
              }
              className="ml-1 text-[11px] px-2 py-1 rounded border border-grey-200 text-secondary hover:border-secondary inline-flex items-center gap-1"
              title={view === 'analyse' ? 'Replay the analysis walkthrough' : 'Replay the guided walkthrough'}
            >
              <span aria-hidden>🧭</span> {view === 'analyse' ? 'How to analyse' : 'Guided tour'}
            </button>
          </div>
        </div>
        <div className="ca-ws-tour-views flex rounded border border-grey-200 overflow-hidden text-[11px]">
          <button
            type="button"
            onClick={() => setView('code')}
            className={`px-3 py-1 ${view === 'code' ? 'bg-primary text-white' : 'text-tertiary hover:bg-grey-50'}`}
          >
            Code
          </button>
          <button
            type="button"
            onClick={() => setView('analyse')}
            className={`px-3 py-1 border-l border-grey-200 ${view === 'analyse' ? 'bg-primary text-white' : 'text-tertiary hover:bg-grey-50'}`}
          >
            Analyse
          </button>
        </div>
      </header>

      {/* Lens selector — shared by Code + Analyse views */}
      <div className="ca-ws-tour-lens bg-grey-50 border border-grey-200 rounded-lg p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold" title="Whose tags are shown — toggle to compare what other projects are coding">
            Lens:
          </span>
          {lensChips.map(c => {
            const on = lenses.has(c.id);
            // Count only the annotations actually reachable here — segments on
            // documents added to this workspace for the active source type
            // (`corpusIdSet` is already source-type scoped). This keeps the
            // badge honest: it matches what the Code/Analyse views can show,
            // instead of a project's global total. A global count could read
            // e.g. "4" while every panel shows nothing, because those segments
            // live on documents from another source type or that haven't been
            // added to this corpus.
            const count = snapshot.segments.filter(
              s => lensOf(s.projectId) === c.id && corpusIdSet.has(s.documentId),
            ).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleLens(c.id)}
                className={`text-[11px] px-2 py-1 rounded-full border transition ${
                  on
                    ? 'bg-secondary text-white border-secondary'
                    : 'border-grey-200 text-tertiary hover:border-secondary'
                }`}
                title={on ? 'Showing — click to hide' : 'Hidden — click to show'}
              >
                {on ? '✓ ' : ''}{c.label}
                <span className={`ml-1 font-mono ${on ? 'text-white/80' : 'text-tertiary-light'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-tertiary-light mt-1.5">
          Master library tags are the shared starting point, so you never code
          from scratch. Toggle a project to see — and cluster — what it has
          tagged. Counts reflect annotations on the documents you’ve added to
          this workspace for the current source, so a project may read 0 here
          even when it has coded other documents. New tags you add here are
          attributed to <strong>{projectName}</strong>.
        </p>
      </div>

      {view === 'analyse' ? (
        <WorkspaceAnalysis
          projectId={projectId}
          projectName={projectName}
          documents={corpusDocs}
          codes={visibleCodes}
          segments={analysisSegments}
          sourceLabel={activeSourceMeta.title}
          tab={analysisTab}
          onTabChange={setAnalysisTab}
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
          {/* LEFT: corpus + add documents */}
          <aside className="flex flex-col gap-3 min-h-0 min-w-0">
            <div className="border border-grey-200 rounded-lg bg-white">
              <div className="px-3 py-2 border-b border-grey-200 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-tertiary-dark">In this workspace</span>
                <span className="text-[10px] font-mono text-tertiary-light">{corpusDocs.length}</span>
              </div>
              {corpusDocs.length === 0 ? (
                <p className="px-3 py-3 text-[11px] text-tertiary">
                  No {activeSourceMeta.title.toLowerCase()} documents added yet. Use
                  “Add documents” below to bring them into this project.
                </p>
              ) : (
                <div className="max-h-[40vh] overflow-y-auto">
                  <DocumentList
                    documents={corpusDocs}
                    codes={visibleCodes}
                    selectedDocumentId={selectedDocument?.id ?? null}
                    onSelect={id => { setSelectedDocumentId(id); setHighlightedSegmentId(null); setIngestState({ status: 'idle' }); }}
                    counts={docCounts}
                    onRemove={confirmRemoveFromCorpus}
                    overallTagsByDoc={overallTagsByDoc}
                  />
                </div>
              )}
            </div>

            <div className="border border-grey-200 rounded-lg bg-white">
              <button
                type="button"
                onClick={() => setBrowseOpen(o => !o)}
                className="w-full px-3 py-2 flex items-center justify-between text-left"
              >
                <span className="text-[11px] font-semibold text-secondary">+ Add documents</span>
                <span className="text-[10px] text-tertiary-light">{browseOpen ? '▴' : '▾'}</span>
              </button>
              {browseOpen && (
                <div className="px-3 pb-3 border-t border-grey-200 pt-2">
                  {liveRefs.loading && sourceType !== 'policy' && (
                    <p className="text-[10px] text-tertiary-light mb-1">Loading references…</p>
                  )}
                  <input
                    value={browseQuery}
                    onChange={e => setBrowseQuery(e.target.value)}
                    placeholder={`Search ${activeSourceMeta.title.toLowerCase()}…`}
                    className="w-full px-2 py-1 border border-grey-200 rounded text-[12px] mb-2"
                  />
                  {/* Filter the library by overall (document-level) tag. */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <OverallTagPicker
                      codes={masterCodes}
                      selected={browseTagFilter}
                      onToggle={codeId =>
                        setBrowseTagFilter(prev =>
                          prev.includes(codeId) ? prev.filter(c => c !== codeId) : [...prev, codeId],
                        )
                      }
                      label="Filter by tag"
                    />
                    {browseTagFilter.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBrowseTagFilter([])}
                        className="text-[10px] text-tertiary-light hover:text-secondary"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <ul className="max-h-[34vh] overflow-y-auto space-y-1">
                    {filteredBrowse.map(d => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => addToCorpus(d.id)}
                          className="w-full text-left px-2 py-1 rounded hover:bg-grey-50 text-[11px] text-tertiary-dark"
                          title="Add to this workspace"
                        >
                          <span className="text-secondary mr-1">+</span>
                          {d.shortTitle || d.title}
                          {d.referenceYear && <span className="text-tertiary-light ml-1">({d.referenceYear})</span>}
                        </button>
                      </li>
                    ))}
                    {filteredBrowse.length === 0 && (
                      <li className="text-[11px] text-tertiary-light px-2 py-1">No matching documents.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="ca-ws-tour-codes border border-grey-200 rounded-lg bg-white">
              <div className="px-3 py-2 border-b border-grey-200 flex items-center justify-between">
                <span
                  className="text-[11px] font-semibold text-tertiary-dark"
                  title="Tags you pin to passages inside a document — distinct from a document's overall tags"
                >
                  In-text tags
                </span>
                <button
                  type="button"
                  onClick={() => handleAddCode(null)}
                  className="text-[11px] font-medium text-secondary hover:opacity-80"
                >
                  + Root
                </button>
              </div>
              <div className="max-h-[40vh] overflow-y-auto overflow-x-auto">
                <CodeSystemTree
                  codes={visibleCodes}
                  counts={codeCountsDirect}
                  selectedCodeId={selectedCodeId}
                  onSelect={id => setSelectedCodeId(prev => (prev === id ? null : id))}
                  onAddChild={handleAddCode}
                  onRename={handleRename}
                  onRecolor={handleRecolor}
                  onDelete={handleDeleteCode}
                  onMove={(id, newParentId) => {
                    if (!moveCode(id, newParentId)) {
                      showToast({ tone: 'danger', message: 'Move rejected', description: 'Target parent is inside the moved subtree.' });
                    }
                  }}
                  onMerge={(sourceId, targetId) => {
                    const res = mergeCode(sourceId, targetId);
                    if (res === null) showToast({ tone: 'danger', message: 'Merge rejected' });
                    else showToast({ tone: 'success', message: `Merged — ${res.reassigned} segment(s) reassigned`, actionLabel: 'Undo', onAction: res.undo });
                  }}
                />
              </div>
            </div>
          </aside>

          {/* CENTRE: document viewer */}
          <section className="ca-ws-tour-doc border border-grey-200 rounded-lg bg-white min-h-[50vh] flex flex-col min-w-0">
            {!selectedDocument ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <p className="text-sm text-tertiary max-w-sm">
                  Add a document to this workspace and select it to start marking
                  text and attaching tags &amp; codes.
                </p>
              </div>
            ) : (
              <DocumentViewer
                document={selectedDocument}
                segments={docSegments}
                codes={visibleCodes}
                activeCodeId={selectedCodeId}
                highlightedSegmentId={highlightedSegmentId}
                ingestState={ingestState}
                showOverallTags={canEditOverallTags}
                overallTagCodes={masterCodes}
                overallTagSelected={overallTags.getTags(selectedDocument.id)}
                onToggleOverallTag={codeId => { void overallTags.toggleTag(selectedDocument.id, codeId); }}
                summary={ownSummary}
                otherSummaries={otherSummaries}
                projectNameById={projectNameById}
                onSaveSummary={handleSaveSummary}
                onLoadSummaryBlocks={loadSummaryBlocks}
                onCreateSegment={handleCreateSegment}
                onSelectSegment={setHighlightedSegmentId}
                onDeleteSegment={deleteSegment}
                onCommentSegment={id => { setHighlightedSegmentId(id); setCommentForSegmentId(id); }}
                onSelectionWithoutCode={sel => setToolbarSel(sel)}
                onRemoveFromCorpus={() => removeFromCorpus(selectedDocument.id)}
                onLoadText={() => handleLoadText(selectedDocument)}
                onUpload={file => handleUpload(selectedDocument, file)}
                onLoadReferencePdf={() => handleLoadReferencePdf(selectedDocument)}
              />
            )}
          </section>

          {/* RIGHT: coded segments */}
          <aside className="border border-grey-200 rounded-lg bg-white min-h-0 min-w-0">
            <div className="px-3 py-2 border-b border-grey-200 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-tertiary-dark">Coded segments</span>
              <span className="text-[10px] font-mono text-tertiary-light">{docSegments.length}</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <SegmentsList
                segments={docSegments}
                codes={visibleCodes}
                documents={corpusDocs}
                selectedSegmentId={highlightedSegmentId}
                onOpenSegment={setHighlightedSegmentId}
                onDelete={deleteSegment}
                onUpdateNote={handleUpdateNote}
                requestCommentForId={commentForSegmentId}
                onCommentRequestConsumed={() => setCommentForSegmentId(null)}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Floating toolbar — pick / create a tag for a selection made without
          an active code. */}
      <FloatingCodeToolbar
        selection={toolbarSel}
        activeCode={selectedCodeId ? visibleCodes.find(c => c.id === selectedCodeId) ?? null : null}
        codes={visibleCodes}
        onApply={() => {
          if (!toolbarSel || !selectedCodeId) return;
          createSegment({ startChar: toolbarSel.startChar, endChar: toolbarSel.endChar, text: toolbarSel.text, blockId: toolbarSel.blockId, pdfAnchor: toolbarSel.pdfAnchor }, selectedCodeId);
          setToolbarSel(null);
        }}
        onSplit={() => setToolbarSel(null)}
        onPickCode={codeId => {
          if (!toolbarSel) return;
          setSelectedCodeId(codeId);
          createSegment({ startChar: toolbarSel.startChar, endChar: toolbarSel.endChar, text: toolbarSel.text, blockId: toolbarSel.blockId, pdfAnchor: toolbarSel.pdfAnchor }, codeId);
          setToolbarSel(null);
        }}
        onClear={() => setToolbarSel(null)}
        onCreateAndApply={suggestedName => {
          if (!toolbarSel) return;
          setCodeEditor({
            mode: 'add',
            targetId: null,
            seedName: suggestedName,
            pendingSegmentInput: { startChar: toolbarSel.startChar, endChar: toolbarSel.endChar, text: toolbarSel.text, blockId: toolbarSel.blockId, pdfAnchor: toolbarSel.pdfAnchor },
          });
          setToolbarSel(null);
        }}
      />

      <CodeEditorModal
        open={!!codeEditor}
        payload={codeEditor}
        codes={visibleCodes}
        onSubmit={handleCodeEditorSubmit}
        onCancel={() => setCodeEditor(null)}
      />
    </div>
  );
}

// ── Centre-panel viewer ──────────────────────────────────────────────────────
function DocumentViewer({
  document: doc,
  segments,
  codes,
  activeCodeId,
  highlightedSegmentId,
  ingestState,
  showOverallTags,
  overallTagCodes,
  overallTagSelected,
  onToggleOverallTag,
  summary,
  otherSummaries,
  projectNameById,
  onSaveSummary,
  onLoadSummaryBlocks,
  onCreateSegment,
  onSelectSegment,
  onDeleteSegment,
  onCommentSegment,
  onSelectionWithoutCode,
  onRemoveFromCorpus,
  onLoadText,
  onUpload,
  onLoadReferencePdf,
}: {
  document: AnalysisDocument;
  segments: import('@/lib/content-analysis/types').CodedSegment[];
  codes: CodeNode[];
  activeCodeId: string | null;
  highlightedSegmentId: string | null;
  ingestState: { status: 'idle' | 'loading' | 'error' | 'ok'; message?: string };
  showOverallTags: boolean;
  overallTagCodes: CodeNode[];
  overallTagSelected: string[];
  onToggleOverallTag: (codeId: string) => void;
  summary: DocumentSummary | null;
  otherSummaries: DocumentSummary[];
  projectNameById: Map<string | null, string>;
  onSaveSummary: (text: string, blocks: SummaryBlock[]) => void;
  onLoadSummaryBlocks: (id: string) => Promise<SummaryBlock[]>;
  onCreateSegment: (input: { startChar: number; endChar: number; text: string; blockId?: string; pdfAnchor?: import('@/lib/content-analysis/types').PdfAnchor }) => void;
  onSelectSegment: (id: string) => void;
  onDeleteSegment: (id: string) => void;
  onCommentSegment: (id: string) => void;
  onSelectionWithoutCode: (sel: ToolbarSelection) => void;
  onRemoveFromCorpus: () => void;
  onLoadText: () => void;
  onUpload: (file: File) => void;
  onLoadReferencePdf: () => void;
}) {
  const hasText = (doc.text ?? '').trim().length > 50;
  const isReference = (doc.sourceKind ?? 'policy') === 'reference';
  // PDF source for the annotation pane. EUR-Lex policies stream from the
  // ingest cache by CELEX. References render the *original* PDF straight from
  // the reference library via the durable Supabase-backed proxy (keyed by the
  // reference id) — the ephemeral ingest cache can 404 on a different
  // serverless instance, and we already have the file in storage.
  const refId = isReference ? doc.id.replace(/^ref-doc-/, '') : null;
  // When a reference's PDF lives in the public Supabase `reference-pdfs` bucket
  // (every browser-ingested upload does), load it *directly* from that durable
  // URL. It's the exact object we just stored, so it sidesteps the library
  // proxy / row lookup that can 404 right after an upload. A DOI / landing-page
  // `pdfUrl` is not a PDF, so only trust Supabase-hosted ones here.
  const directPdfUrl =
    isReference && doc.pdfUrl && /supabase\.(co|in)/.test(doc.pdfUrl) ? doc.pdfUrl : null;
  const pdfSrcUrl = doc.celexNumber
    ? `/api/content-analysis/pdf?celex=${encodeURIComponent(doc.celexNumber)}`
    : directPdfUrl
      ? directPdfUrl
      : refId
        ? `/api/references/pdf?id=${encodeURIComponent(refId)}`
        : '';
  // One fallback (react-pdf retries the primary once): if we loaded the direct
  // storage URL, fall back to the library proxy; otherwise fall back to the
  // content-analysis ingest cache (keyed by document id) for older uploads and
  // static-library references the proxy doesn't know.
  const pdfFallbackUrl = refId
    ? directPdfUrl
      ? `/api/references/pdf?id=${encodeURIComponent(refId)}`
      : `/api/content-analysis/pdf?celex=${encodeURIComponent(referencePdfCacheKey(doc.id))}`
    : undefined;
  const hasPdfPane = Boolean(
    pdfSrcUrl && (doc.ingestSource === 'eurlex-pdf' || doc.ingestSource === 'manual-upload'),
  );
  // A reference PDF is already on file in the reference manager, ready to load
  // without a re-upload.
  const hasLibraryPdf = isReference && Boolean(doc.pdfUrl);

  // Map the selected segment to the block it lives in, so clicking a coded
  // segment in the sidebar scrolls the PDF to that passage and highlights it.
  // PDF-made segments carry a blockId directly; text-panel segments are
  // resolved by which block's character range covers their start offset.
  const blockRanges = useMemo(() => {
    const full = doc.text ?? '';
    const ranges: { id: string; start: number; end: number }[] = [];
    let cursor = 0;
    for (const b of doc.blocks ?? []) {
      if (!b.text) continue;
      const idx = full.indexOf(b.text, cursor);
      if (idx >= 0) { ranges.push({ id: b.id, start: idx, end: idx + b.text.length }); cursor = idx + b.text.length; }
    }
    return ranges;
  }, [doc.blocks, doc.text]);
  const highlightedSeg = segments.find(s => s.id === highlightedSegmentId) ?? null;
  // Segments with a precise PDF anchor are emphasised by their own highlight,
  // so don't also tint the whole enclosing block — that's the imprecise
  // behaviour we're moving away from. Only fall back to a block highlight for
  // legacy / flat-text segments.
  const highlightedBlockId = highlightedSeg?.pdfAnchor
    ? null
    : highlightedSeg?.blockId ??
      (highlightedSeg
        ? blockRanges.find(r => highlightedSeg.startChar >= r.start && highlightedSeg.startChar < r.end)?.id ?? null
        : null);

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-grey-200 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-tertiary-dark truncate">{doc.title}</p>
          <p className="text-[10px] text-tertiary-light">
            {isReference
              ? [doc.referenceAuthors, doc.referenceYear].filter(Boolean).join(' · ') || 'Reference'
              : doc.celexNumber
                ? `CELEX ${doc.celexNumber}`
                : doc.kind}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ingestState.status !== 'idle' && (
            <span className={`text-[10px] ${ingestState.status === 'error' ? 'text-red-700' : 'text-tertiary-light'}`}>
              {ingestState.status === 'loading' ? 'Loading…' : ingestState.message}
            </span>
          )}
          {/* Re-ingest controls — always available, not just in the empty
              state. This is the escape hatch when a PDF pane fails to load
              (e.g. an older upload whose bytes were lost from the ephemeral
              server cache): re-uploading re-extracts the document and stores
              the PDF durably so it renders on every later visit. */}
          {hasLibraryPdf && (
            <button
              type="button"
              onClick={onLoadReferencePdf}
              disabled={ingestState.status === 'loading'}
              className="text-[10px] text-tertiary-light hover:text-secondary disabled:opacity-50"
              title="Re-fetch the PDF attached to this reference in the library"
            >
              Reload PDF
            </button>
          )}
          {(isReference || doc.celexNumber) && (
            <label
              className="text-[10px] text-tertiary-light hover:text-secondary cursor-pointer"
              title="Re-ingest / replace the PDF for this document"
            >
              Replace PDF
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ''; }}
              />
            </label>
          )}
          <button
            type="button"
            onClick={onRemoveFromCorpus}
            className="text-[10px] text-tertiary-light hover:text-red-700"
            title="Remove from this workspace (does not delete coded segments)"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Overall (document-level) tags — the coloured dots that describe the
          whole source, distinct from the in-text tags pinned to passages.
          Editable by hand for scientific & grey literature via a dropdown. */}
      {showOverallTags && (
        <div className="px-3 py-2 border-b border-grey-200 flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold"
            title="Document-level tags that describe this whole source — separate from the in-text tags you pin to passages"
          >
            Overall tags
          </span>
          {overallTagSelected.length > 0 ? (
            overallTagSelected.map(id => {
              const c = overallTagCodes.find(x => x.id === id);
              if (!c) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 text-[10px] text-tertiary-dark bg-grey-50 border border-grey-200 rounded-full px-1.5 py-0.5"
                >
                  <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: c.color }} aria-hidden />
                  {c.name}
                </span>
              );
            })
          ) : (
            <span className="text-[10px] text-tertiary-light italic">None yet</span>
          )}
          <OverallTagPicker
            codes={overallTagCodes}
            selected={overallTagSelected}
            onToggle={onToggleOverallTag}
            label="Edit"
            align="right"
          />
        </div>
      )}

      {/* Whole-document summary — a "comment for the entire paper", available
          for every document kind (policy, grey or scientific literature). */}
      <DocumentSummaryPanel
        summary={summary}
        otherSummaries={otherSummaries}
        projectNameById={projectNameById}
        onSave={onSaveSummary}
        onLoadBlocks={onLoadSummaryBlocks}
        anchorClassName="ca-ws-tour-summary"
      />

      {!hasText ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
          <p className="text-sm text-tertiary max-w-sm">
            {isReference
              ? hasLibraryPdf
                ? 'A PDF is attached to this reference in the reference library. Load it here to view the original pages and tag them inline.'
                : 'Upload the PDF for this reference to extract its text and start tagging.'
              : 'Load the full legal text from EUR-Lex (or upload the PDF) to start tagging.'}
          </p>
          <div className="flex items-center gap-2">
            {doc.celexNumber && (
              <button
                type="button"
                onClick={onLoadText}
                disabled={ingestState.status === 'loading'}
                className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark disabled:opacity-50"
              >
                Load full text
              </button>
            )}
            {hasLibraryPdf && (
              <button
                type="button"
                onClick={onLoadReferencePdf}
                disabled={ingestState.status === 'loading'}
                className="px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark disabled:opacity-50"
              >
                Load PDF
              </button>
            )}
            <label className="px-3 py-1.5 rounded-md border border-grey-200 text-[11px] font-semibold text-tertiary-dark hover:bg-grey-50 cursor-pointer">
              Upload PDF
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ''; }}
              />
            </label>
          </div>
          {/* Surface ingest progress / failure prominently. Previously the
              only feedback was 10px text in the header, so a failed "Load PDF"
              looked like nothing happened at all. */}
          {ingestState.status === 'loading' && (
            <p className="text-[12px] text-tertiary-light">{ingestState.message ?? 'Loading…'}</p>
          )}
          {ingestState.status === 'error' && (
            <p className="text-[12px] text-red-700 max-w-sm break-words">
              Couldn’t load the PDF: {ingestState.message}.{' '}
              {hasLibraryPdf && 'Try “Upload PDF” to send the file from your computer instead.'}
            </p>
          )}
          {doc.referenceUrl && (
            <a href={doc.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-secondary hover:underline">
              Open source ↗
            </a>
          )}
        </div>
      ) : hasPdfPane ? (
        <div className="flex-1 overflow-auto p-2">
          {/* Original PDF — the primary surface. Coded passages show as
              colour tints over the page; click a block to highlight it. */}
          <PdfDocumentView
            document={doc}
            pdfSrcUrl={pdfSrcUrl}
            fallbackSrcUrl={pdfFallbackUrl}
            segments={segments}
            codes={codes}
            highlightedBlockId={highlightedBlockId}
            highlightedSegmentId={highlightedSegmentId}
            onSelectText={(sel: PdfTextSelection) => {
              const { startChar, endChar } = locateSelectionOffsets(doc, sel.blockId, sel.text);
              onSelectionWithoutCode({
                blockId: sel.blockId ?? undefined,
                // The exact selection rectangles — what makes the highlight
                // stick to the text the analyst marked, and click-to-jump land
                // on it precisely.
                pdfAnchor: sel.rects.length ? { page: sel.page, rects: sel.rects } : undefined,
                startChar,
                endChar,
                text: sel.text,
                rect: sel.rect,
              });
            }}
          />
          {/* Extracted text — collapsed by default so the PDF stays the
              focus. Expand it to select a passage and attach a tag (the raw
              text is where passage selection currently happens). */}
          <details className="mt-3 border-t border-grey-200 pt-2 group">
            <summary className="cursor-pointer text-[11px] font-semibold text-secondary hover:opacity-80 select-none list-none">
              ▸ Extracted text — select a passage here to tag it
            </summary>
            <div className="mt-2">
              <AnnotatedDocumentView
                document={doc}
                segments={segments}
                codes={codes}
                activeCodeId={activeCodeId}
                onCreateSegment={onCreateSegment}
                onSelectSegment={onSelectSegment}
                highlightedSegmentId={highlightedSegmentId}
                onDeleteSegment={onDeleteSegment}
                onCommentSegment={onCommentSegment}
                onSelectionWithoutCode={sel => onSelectionWithoutCode({ ...sel })}
              />
            </div>
          </details>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-3">
          <AnnotatedDocumentView
            document={doc}
            segments={segments}
            codes={codes}
            activeCodeId={activeCodeId}
            onCreateSegment={onCreateSegment}
            onSelectSegment={onSelectSegment}
            highlightedSegmentId={highlightedSegmentId}
            onDeleteSegment={onDeleteSegment}
            onCommentSegment={onCommentSegment}
            onSelectionWithoutCode={sel => onSelectionWithoutCode({ ...sel })}
          />
        </div>
      )}
    </div>
  );
}
