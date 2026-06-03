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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadFigure } from '@/lib/content-analysis/figure-storage';
import SummaryContent from '@/components/content-analysis/SummaryContent';
import dynamic from 'next/dynamic';
import { useContentAnalysis } from '@/lib/content-analysis/store';
import {
  useLiveReferences,
  isScientificLiterature,
  referencePdfCacheKey,
} from '@/lib/content-analysis/useLiveReferences';
import { semanticColorFor, lightenedFromParent } from '@/lib/content-analysis/semantic-palette';
import type { AnalysisDocument, CodeNode, DocumentSummary } from '@/lib/content-analysis/types';
import CodeSystemTree from '@/components/content-analysis/CodeSystemTree';
import DocumentList from '@/components/content-analysis/DocumentList';
import AnnotatedDocumentView from '@/components/content-analysis/AnnotatedDocumentView';
import SegmentsList from '@/components/content-analysis/SegmentsList';
import TagDistributionPanel from '@/components/content-analysis/TagDistributionPanel';
import FloatingCodeToolbar, { type ToolbarSelection } from '@/components/content-analysis/FloatingCodeToolbar';
import type { PdfTextSelection } from '@/components/content-analysis/PdfDocumentView';
import CodeEditorModal, {
  type CodeEditorPayload,
  type CodeEditorResult,
} from '@/components/content-analysis/CodeEditorModal';
import { showToast } from '@/components/ui/ToastHost';

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

// ── Source types ────────────────────────────────────────────────────────────
type SourceType = 'policy' | 'scientific' | 'grey';

const SOURCE_TYPES: Array<{
  id: SourceType;
  title: string;
  blurb: string;
  icon: string;
}> = [
  {
    id: 'policy',
    title: 'Policy analysis',
    blurb:
      'Deep-dive the relevant EU policies. Mark any passage in the legal text and attach tags & codes to the exact wording.',
    icon: '§',
  },
  {
    id: 'scientific',
    title: 'Scientific literature',
    blurb:
      'Peer-reviewed references from the reference manager (articles, books, chapters). Upload the paper PDF to code it line by line.',
    icon: '🎓',
  },
  {
    id: 'grey',
    title: 'Grey literature & reports',
    blurb:
      'Reports, working papers and other grey references from the reference manager. Upload the report PDF to start tagging.',
    icon: '📄',
  },
];

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
  } = useContentAnalysis();
  const liveRefs = useLiveReferences();

  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [view, setView] = useState<'code' | 'analyse'>('code');

  // The lens set — whose tags are visible. Always seeded with the master
  // library + this project so an analyst never starts from a blank canvas.
  const [lenses, setLenses] = useState<Set<string>>(() => new Set(['master', projectId]));
  const [wsProjects, setWsProjects] = useState<WorkspaceProjectLite[]>([]);

  // The per-workspace corpus (documents the analyst has added to this project).
  const [corpusIds, setCorpusIds] = useState<string[]>([]);
  const [corpusLoaded, setCorpusLoaded] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseQuery, setBrowseQuery] = useState('');

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
    (d: AnalysisDocument): boolean => {
      const isRef = (d.sourceKind ?? 'policy') === 'reference';
      if (sourceType === 'policy') return !isRef;
      if (sourceType === 'scientific') return isRef && isScientificLiterature(d);
      if (sourceType === 'grey') return isRef && !isScientificLiterature(d);
      return false;
    },
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
    return out.slice(0, 200);
  }, [candidateDocs, corpusIds, browseQuery]);

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

  const handleSaveSummary = (text: string) => {
    if (!selectedDocument) return;
    upsertDocument(selectedDocument);
    setDocumentSummary(selectedDocument.id, projectId, text);
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
  const addToCorpus = (id: string) => {
    setCorpusIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setSelectedDocumentId(id);
  };
  const removeFromCorpus = (id: string) => {
    setCorpusIds(prev => prev.filter(x => x !== id));
  };

  const createSegment = (input: { startChar: number; endChar: number; text: string; blockId?: string }, codeId: string) => {
    if (!selectedDocument) return;
    upsertDocument(selectedDocument);
    const seg = addSegment({
      documentId: selectedDocument.id,
      codeId,
      startChar: input.startChar,
      endChar: input.endChar,
      text: input.text,
      blockId: input.blockId,
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

  const handleCreateSegment = (input: { startChar: number; endChar: number; text: string; blockId?: string }) => {
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
    try {
      const celex = encodeURIComponent(doc.celexNumber ?? referencePdfCacheKey(doc.id));
      let url = `/api/content-analysis/ingest-upload?celex=${celex}`;
      const init: RequestInit = { method: 'POST' };
      if (opts.blob) {
        const form = new FormData();
        // The route reads the `file` field; a third arg gives it a filename so
        // it is treated as a File rather than a string.
        form.append('file', opts.blob, 'document.pdf');
        init.body = form;
      } else if (opts.sourceUrl) {
        url += `&url=${encodeURIComponent(opts.sourceUrl)}`;
      }
      const resp = await fetch(url, init);
      const data = await resp.json();
      if (!resp.ok) {
        const message = [data?.error, data?.detail].filter(Boolean).join(' — ') || `HTTP ${resp.status}`;
        setIngestState({ status: 'error', message });
        return;
      }
      applyIngestion(doc.id, {
        pdfUrl: data.pdfUrl || '', pageCount: data.pageCount, blocks: data.blocks,
        text: data.text, ingestedAt: data.ingestedAt, archiveSource: 'manual-upload',
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
      {/* Header + source switch + view toggle */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-tertiary-dark">Content analysis</h2>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">Source:</span>
            {SOURCE_TYPES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setSourceType(s.id); setSelectedDocumentId(null); }}
                className={`text-[11px] px-2 py-1 rounded border transition ${
                  sourceType === s.id
                    ? 'bg-primary text-white border-primary'
                    : 'border-grey-200 text-tertiary hover:border-tertiary'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
        <div className="flex rounded border border-grey-200 overflow-hidden text-[11px]">
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
      <div className="bg-grey-50 border border-grey-200 rounded-lg p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold" title="Whose tags are shown — toggle to compare what other projects are coding">
            Lens:
          </span>
          {lensChips.map(c => {
            const on = lenses.has(c.id);
            const count = snapshot.segments.filter(s => lensOf(s.projectId) === c.id).length;
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
          tagged. New tags you add here are attributed to <strong>{projectName}</strong>.
        </p>
      </div>

      {view === 'analyse' ? (
        <div className="space-y-3">
          <p className="text-xs text-tertiary">
            Clustering {analysisSegments.length} coded segment{analysisSegments.length === 1 ? '' : 's'} across{' '}
            {corpusDocs.length} {activeSourceMeta.title.toLowerCase()} document{corpusDocs.length === 1 ? '' : 's'},
            through the selected lens{lenses.size === 1 ? '' : 'es'}.
          </p>
          <TagDistributionPanel documents={corpusDocs} codes={visibleCodes} segments={analysisSegments} />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
          {/* LEFT: corpus + add documents */}
          <aside className="flex flex-col gap-3 min-h-0">
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

            <div className="border border-grey-200 rounded-lg bg-white">
              <div className="px-3 py-2 border-b border-grey-200 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-tertiary-dark">Tag system</span>
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
          <section className="border border-grey-200 rounded-lg bg-white min-h-[50vh] flex flex-col">
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
                summary={ownSummary}
                otherSummaries={otherSummaries}
                projectNameById={projectNameById}
                onSaveSummary={handleSaveSummary}
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
          <aside className="border border-grey-200 rounded-lg bg-white min-h-0">
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
                onUpdateNote={updateSegmentNote}
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
          createSegment({ startChar: toolbarSel.startChar, endChar: toolbarSel.endChar, text: toolbarSel.text, blockId: toolbarSel.blockId }, selectedCodeId);
          setToolbarSel(null);
        }}
        onSplit={() => setToolbarSel(null)}
        onPickCode={codeId => {
          if (!toolbarSel) return;
          setSelectedCodeId(codeId);
          createSegment({ startChar: toolbarSel.startChar, endChar: toolbarSel.endChar, text: toolbarSel.text, blockId: toolbarSel.blockId }, codeId);
          setToolbarSel(null);
        }}
        onClear={() => setToolbarSel(null)}
        onCreateAndApply={suggestedName => {
          if (!toolbarSel) return;
          setCodeEditor({
            mode: 'add',
            targetId: null,
            seedName: suggestedName,
            pendingSegmentInput: { startChar: toolbarSel.startChar, endChar: toolbarSel.endChar, text: toolbarSel.text, blockId: toolbarSel.blockId },
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
  summary,
  otherSummaries,
  projectNameById,
  onSaveSummary,
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
  summary: DocumentSummary | null;
  otherSummaries: DocumentSummary[];
  projectNameById: Map<string | null, string>;
  onSaveSummary: (text: string) => void;
  onCreateSegment: (input: { startChar: number; endChar: number; text: string; blockId?: string }) => void;
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
  const pdfSrcUrl = doc.celexNumber
    ? `/api/content-analysis/pdf?celex=${encodeURIComponent(doc.celexNumber)}`
    : refId
      ? `/api/references/pdf?id=${encodeURIComponent(refId)}`
      : '';
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
  const highlightedBlockId =
    highlightedSeg?.blockId ??
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

      {/* Whole-document summary — a "comment for the entire paper", available
          for every document kind (policy, grey or scientific literature). */}
      <DocumentSummaryPanel
        summary={summary}
        otherSummaries={otherSummaries}
        projectNameById={projectNameById}
        onSave={onSaveSummary}
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
            segments={segments}
            codes={codes}
            highlightedBlockId={highlightedBlockId}
            onSelectText={(sel: PdfTextSelection) => {
              const { startChar, endChar } = locateSelectionOffsets(doc, sel.blockId, sel.text);
              onSelectionWithoutCode({
                blockId: sel.blockId ?? undefined,
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

// ── Whole-document summary panel ─────────────────────────────────────────────
/**
 * A collapsible "comment for the entire paper" attached to the document as a
 * whole — distinct from the passage-level notes on coded segments. Shown for
 * every document kind. The current project's summary is editable; summaries
 * authored under other projects are shown read-only for context, so the whole
 * team can see each report's take on the same paper.
 */
function DocumentSummaryPanel({
  summary,
  otherSummaries,
  projectNameById,
  onSave,
}: {
  summary: DocumentSummary | null;
  otherSummaries: DocumentSummary[];
  projectNameById: Map<string | null, string>;
  onSave: (text: string) => void;
}) {
  const hasSummary = Boolean(summary?.text?.trim());
  // Open by default when there's already something to read, so it isn't missed.
  const [open, setOpen] = useState(hasSummary);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(summary?.text ?? '');

  // Re-sync local state when the selected document (and thus its summary)
  // changes underneath us.
  const summaryKey = summary?.id ?? 'none';
  useEffect(() => {
    setDraft(summary?.text ?? '');
    setEditing(false);
    setOpen(Boolean(summary?.text?.trim()));
  }, [summaryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    onSave(draft);
    setEditing(false);
    if (!draft.trim()) setOpen(false);
  };

  /** Open the panel and jump straight into the editor — the header CTA. */
  const startEditing = () => { setOpen(true); setEditing(true); };

  // ── Rich-text editing helpers (markdown under the hood) ──
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** Wrap the current selection (or a placeholder) with markdown markers. */
  const wrapSelection = (prefix: string, suffix = prefix, placeholder = 'text') => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? draft.length;
    const end = ta?.selectionEnd ?? draft.length;
    const sel = draft.slice(start, end) || placeholder;
    const next = draft.slice(0, start) + prefix + sel + suffix + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(start + prefix.length, start + prefix.length + sel.length);
    });
  };

  /** Prefix each selected line (for headings / list items). */
  const prefixLines = (prefix: string) => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? draft.length;
    const end = ta?.selectionEnd ?? start;
    const lineStart = draft.lastIndexOf('\n', start - 1) + 1;
    const before = draft.slice(0, lineStart);
    const block = draft.slice(lineStart, end) || '';
    const after = draft.slice(end);
    const prefixed = (block || prefix.trim()).split('\n').map(l => prefix + l).join('\n');
    const next = before + prefixed + after;
    setDraft(next);
    requestAnimationFrame(() => { ta?.focus(); });
  };

  /** Insert raw text at the caret. */
  const insertAtCaret = (snippet: string) => {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? draft.length;
    const end = ta?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + snippet + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      ta?.focus();
      const pos = start + snippet.length;
      ta?.setSelectionRange(pos, pos);
    });
  };

  /** Upload an image (file picker or pasted screenshot) and embed it. */
  const addFigure = async (file: Blob) => {
    setUploading(true);
    setUploadError(null);
    const res = await uploadFigure(file);
    setUploading(false);
    if (!res.ok || !res.publicUrl) {
      setUploadError(res.error || 'Could not upload the image.');
      return;
    }
    insertAtCaret(`\n![figure](${res.publicUrl})\n`);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of Array.from(items)) {
      if (it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) { e.preventDefault(); void addFigure(file); return; }
      }
    }
  };

  const toolbarBtn =
    'px-1.5 py-0.5 rounded border border-grey-200 bg-white text-[11px] text-tertiary-dark hover:bg-grey-100';
  const DIAGRAM_TEMPLATE =
    '\n```mermaid\nflowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do this]\n  B -->|No| D[Stop]\n```\n';

  const updatedLabel = summary?.updatedAt
    ? new Date(summary.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="border-b border-grey-200 bg-grey-50/60">
      <div className="w-full px-3 py-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-left min-w-0"
        >
          <span className="text-[11px] font-semibold text-tertiary-dark flex items-center gap-1.5">
            <span aria-hidden>▤</span>
            Summary
            {hasSummary && (
              <span className="text-[9px] font-normal text-white bg-secondary rounded-full px-1.5 py-0.5">
                1
              </span>
            )}
            {otherSummaries.length > 0 && (
              <span className="text-[9px] font-normal text-tertiary-light">
                +{otherSummaries.length} other project{otherSummaries.length === 1 ? '' : 's'}
              </span>
            )}
          </span>
          <span className="text-[10px] text-tertiary-light">{open ? '▴' : '▾'}</span>
        </button>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="shrink-0 px-2 py-0.5 rounded border border-secondary text-secondary text-[11px] font-semibold hover:bg-secondary hover:text-white transition"
          >
            {hasSummary ? 'Edit summary' : '+ Add summary'}
          </button>
        )}
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {editing ? (
            <div className="space-y-2">
              {/* Formatting toolbar — inserts lightweight markdown. */}
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" title="Bold" className={`${toolbarBtn} font-bold`} onClick={() => wrapSelection('**')}>B</button>
                <button type="button" title="Italic" className={`${toolbarBtn} italic`} onClick={() => wrapSelection('*')}>I</button>
                <button type="button" title="Heading" className={toolbarBtn} onClick={() => prefixLines('### ')}>H</button>
                <button type="button" title="Bulleted list" className={toolbarBtn} onClick={() => prefixLines('- ')}>• List</button>
                <button type="button" title="Numbered list" className={toolbarBtn} onClick={() => prefixLines('1. ')}>1. List</button>
                <button type="button" title="Link" className={toolbarBtn} onClick={() => wrapSelection('[', '](https://)', 'label')}>🔗</button>
                <button type="button" title="Insert a flow-chart / diagram (Mermaid)" className={toolbarBtn} onClick={() => insertAtCaret(DIAGRAM_TEMPLATE)}>⤳ Diagram</button>
                <label className={`${toolbarBtn} cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`} title="Insert a figure / screenshot">
                  {uploading ? 'Uploading…' : '🖼 Figure'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) void addFigure(f); e.currentTarget.value = ''; }}
                  />
                </label>
                <span className="text-[10px] text-tertiary-light ml-1">or paste a screenshot</span>
              </div>
              <textarea
                ref={taRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onPaste={onPaste}
                rows={6}
                autoFocus
                placeholder="Summarise this paper for the team — key findings, relevance, how to use it… Use the toolbar for headings, bullet lists and figures. Paste a screenshot to embed it."
                className="w-full px-2 py-1.5 border border-grey-200 rounded text-[12px] leading-snug resize-y font-mono"
              />
              {uploadError && <p className="text-[10px] text-red-600">{uploadError}</p>}
              {/* Live preview so figures / lists / diagrams are visible before saving. */}
              {draft.trim() && (
                <div className="rounded border border-grey-200 bg-white px-2 py-1.5">
                  <p className="text-[9px] uppercase tracking-wide text-tertiary-light font-semibold mb-1">Preview</p>
                  <SummaryContent markdown={draft} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  className="px-3 py-1 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark"
                >
                  Save summary
                </button>
                <button
                  type="button"
                  onClick={() => { setDraft(summary?.text ?? ''); setEditing(false); setUploadError(null); }}
                  className="text-[11px] text-tertiary-light hover:text-tertiary"
                >
                  Cancel
                </button>
                <span className="text-[10px] text-tertiary-light ml-auto">Shared with the team</span>
              </div>
            </div>
          ) : hasSummary ? (
            <div className="space-y-1">
              <SummaryContent markdown={summary!.text} />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[11px] text-secondary hover:underline"
                >
                  Edit
                </button>
                {updatedLabel && (
                  <span className="text-[10px] text-tertiary-light">Updated {updatedLabel}</span>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[11px] text-secondary hover:underline"
            >
              + Add summary
            </button>
          )}

          {otherSummaries.length > 0 && (
            <div className="pt-2 border-t border-grey-200 space-y-2">
              {otherSummaries.map(s => (
                <div key={s.id}>
                  <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
                    {projectNameById.get(s.projectId) ?? 'Other project'}
                  </p>
                  <SummaryContent markdown={s.text} className="text-[12px] text-tertiary leading-snug" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
