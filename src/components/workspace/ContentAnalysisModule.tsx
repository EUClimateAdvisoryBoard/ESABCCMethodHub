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
import { useContentAnalysis } from '@/lib/content-analysis/store';
import {
  useLiveReferences,
  isScientificLiterature,
} from '@/lib/content-analysis/useLiveReferences';
import { semanticColorFor, lightenedFromParent } from '@/lib/content-analysis/semantic-palette';
import type { AnalysisDocument, CodeNode } from '@/lib/content-analysis/types';
import CodeSystemTree from '@/components/content-analysis/CodeSystemTree';
import DocumentList from '@/components/content-analysis/DocumentList';
import AnnotatedDocumentView from '@/components/content-analysis/AnnotatedDocumentView';
import SegmentsList from '@/components/content-analysis/SegmentsList';
import TagDistributionPanel from '@/components/content-analysis/TagDistributionPanel';
import FloatingCodeToolbar, { type ToolbarSelection } from '@/components/content-analysis/FloatingCodeToolbar';
import CodeEditorModal, {
  type CodeEditorPayload,
  type CodeEditorResult,
} from '@/components/content-analysis/CodeEditorModal';
import { showToast } from '@/components/ui/ToastHost';

const PdfDocumentView = dynamic(
  () => import('@/components/content-analysis/PdfDocumentView'),
  { ssr: false, loading: () => <div className="p-4 text-[12px] text-[#8A95A3]">Loading PDF viewer…</div> },
);

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
    upsertDocument,
    applyIngestion,
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
    showToast({ tone: 'success', message: `Tagged as "${code?.name ?? 'tag'}"` });
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

  const handleUpload = async (doc: AnalysisDocument, file: File) => {
    upsertDocument(doc);
    setIngestState({ status: 'loading', message: `Uploading ${file.name}…` });
    try {
      const form = new FormData();
      form.append('file', file);
      const celex = doc.celexNumber
        ? encodeURIComponent(doc.celexNumber)
        : encodeURIComponent(doc.id.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 20) || 'UPLOAD');
      const resp = await fetch(`/api/content-analysis/ingest-upload?celex=${celex}`, { method: 'POST', body: form });
      const data = await resp.json();
      if (!resp.ok) { setIngestState({ status: 'error', message: data?.error ?? `HTTP ${resp.status}` }); return; }
      applyIngestion(doc.id, {
        pdfUrl: data.pdfUrl || '', pageCount: data.pageCount, blocks: data.blocks,
        text: data.text, ingestedAt: data.ingestedAt, archiveSource: 'manual-upload',
      });
      setIngestState({ status: 'ok', message: 'PDF uploaded' });
    } catch (err) {
      setIngestState({ status: 'error', message: String(err) });
    }
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
                onCreateSegment={handleCreateSegment}
                onSelectSegment={setHighlightedSegmentId}
                onDeleteSegment={deleteSegment}
                onSelectionWithoutCode={sel => setToolbarSel(sel)}
                onRemoveFromCorpus={() => removeFromCorpus(selectedDocument.id)}
                onLoadText={() => handleLoadText(selectedDocument)}
                onUpload={file => handleUpload(selectedDocument, file)}
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
  onCreateSegment,
  onSelectSegment,
  onDeleteSegment,
  onSelectionWithoutCode,
  onRemoveFromCorpus,
  onLoadText,
  onUpload,
}: {
  document: AnalysisDocument;
  segments: import('@/lib/content-analysis/types').CodedSegment[];
  codes: CodeNode[];
  activeCodeId: string | null;
  highlightedSegmentId: string | null;
  ingestState: { status: 'idle' | 'loading' | 'error' | 'ok'; message?: string };
  onCreateSegment: (input: { startChar: number; endChar: number; text: string; blockId?: string }) => void;
  onSelectSegment: (id: string) => void;
  onDeleteSegment: (id: string) => void;
  onSelectionWithoutCode: (sel: ToolbarSelection) => void;
  onRemoveFromCorpus: () => void;
  onLoadText: () => void;
  onUpload: (file: File) => void;
}) {
  const hasText = (doc.text ?? '').trim().length > 50;
  const isReference = (doc.sourceKind ?? 'policy') === 'reference';
  const hasPdfPane = Boolean(
    doc.celexNumber && (doc.ingestSource === 'eurlex-pdf' || doc.ingestSource === 'manual-upload'),
  );

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

      {!hasText ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
          <p className="text-sm text-tertiary max-w-sm">
            {isReference
              ? 'Upload the PDF for this reference to extract its text and start tagging.'
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
          <PdfDocumentView
            document={doc}
            pdfSrcUrl={`/api/content-analysis/pdf?celex=${encodeURIComponent(doc.celexNumber!)}`}
            segments={segments}
            codes={codes}
            highlightedBlockId={highlightedSegmentId}
            onSelectBlock={onSelectSegment}
          />
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
              onSelectionWithoutCode={sel => onSelectionWithoutCode({ ...sel })}
            />
          </div>
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
            onSelectionWithoutCode={sel => onSelectionWithoutCode({ ...sel })}
          />
        </div>
      )}
    </div>
  );
}
