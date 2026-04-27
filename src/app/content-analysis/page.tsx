'use client';

/**
 * M · 05 — Content Analysis (production)
 * --------------------------------------
 * Route: `/content-analysis`
 *
 * MAXQDA-style qualitative coding, but in the browser and keyed to the
 * same corpus the rest of MethodHub works on (policy texts via M·04,
 * reference PDFs via M·01). The page composes three surfaces:
 *
 *   - `CodeSystemTree`        — hierarchical code taxonomy (drag/drop).
 *   - `DocumentList`          — corpus browser with filters.
 *   - `AnnotatedDocumentView` — plain-text viewer with inline codings.
 *   - `PdfDocumentView`       — lazy-loaded react-pdf viewer for PDFs.
 *
 * State + persistence live in `@/lib/content-analysis/*`, which talks to
 * `/api/content-analysis/**` and the `content_codes` / `annotations`
 * tables. Optional LLM-assisted pre-tagging is gated behind
 * `AUTO_LLM_SUMMARIZATION_ENABLED` (default off; see
 * `docs/infrastructure/data-gdpr.md`).
 *
 * `react-pdf` is heavy and only needed on the PDF tab, so it is
 * `dynamic`-imported below.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import OnboardingTour from '@/components/OnboardingTour';
import CodeSystemTree from '@/components/content-analysis/CodeSystemTree';
import DocumentList from '@/components/content-analysis/DocumentList';
import dynamic from 'next/dynamic';
import AnnotatedDocumentView from '@/components/content-analysis/AnnotatedDocumentView';

// react-pdf is heavy; only load it when the PDF tab is actually selected.
const PdfDocumentView = dynamic(
  () => import('@/components/content-analysis/PdfDocumentView'),
  {
    ssr: false,
    loading: () => <div className="p-4 text-[12px] text-[#8A95A3]">Loading PDF viewer…</div>,
  },
);
import SegmentsList from '@/components/content-analysis/SegmentsList';
import SegmentsTablePreview from '@/components/content-analysis/SegmentsTablePreview';
import TagDistributionPanel from '@/components/content-analysis/TagDistributionPanel';
import SnapshotsPanel from '@/components/content-analysis/SnapshotsPanel';
import NumericExtractionsPanel from '@/components/content-analysis/NumericExtractionsPanel';
import ProjectLockPill from '@/components/content-analysis/ProjectLockPill';
import { useProjectLock } from '@/lib/content-analysis/useProjectLock';
import { guessNumericExtraction } from '@/lib/content-analysis/numeric';
import CodeSuggestionsPanel from '@/components/content-analysis/CodeSuggestionsPanel';
import HorizontalCoherenceView from '@/components/content-analysis/HorizontalCoherenceView';
import { AnalysisPlaceholder } from '@/components/content-analysis/AnalysisPlaceholders';
import AiClassificationsList from '@/components/content-analysis/AiClassificationsList';
import CodeEditorModal, {
  type CodeEditorPayload,
  type CodeEditorResult,
} from '@/components/content-analysis/CodeEditorModal';
import FullTextSearch, { type SearchHit } from '@/components/content-analysis/FullTextSearch';
import ProjectLanding from '@/components/content-analysis/ProjectLanding';
import NewProjectWizard from '@/components/content-analysis/NewProjectWizard';
import VersionArchive from '@/components/content-analysis/VersionArchive';
import FloatingCodeToolbar, { type ToolbarSelection } from '@/components/content-analysis/FloatingCodeToolbar';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { showToast } from '@/components/ui/ToastHost';
import { semanticColorFor, lightenedFromParent } from '@/lib/content-analysis/semantic-palette';
import {
  segmentsForProject,
  useContentAnalysis,
} from '@/lib/content-analysis/store';
import { useLiveReferences, hasAttachedPdf } from '@/lib/content-analysis/useLiveReferences';
import { Tooltip } from '@/components/ui/Tooltip';
import type { AnalysisMode } from '@/lib/content-analysis/types';

const TAB_LABELS: Array<{ id: 'workbench' | AnalysisMode; label: string; kind: 'primary' | 'beta' }> = [
  { id: 'workbench',    label: 'Workbench',             kind: 'primary' },
  { id: 'horizontal',   label: 'Horizontal coherence',  kind: 'primary' },
  { id: 'vertical',     label: 'Vertical coherence',    kind: 'beta' },
  { id: 'longitudinal', label: 'Longitudinal',          kind: 'beta' },
  { id: 'outcomes',     label: 'Outcomes',              kind: 'beta' },
];

const DEFAULT_CODE_COLORS = [
  '#00928F', '#E87722', '#0065A4', '#7C3AED', '#D97706',
  '#65A30D', '#B83230', '#14B8A6', '#0EA5E9', '#A855F7',
];

export default function ContentAnalysisPage() {
  // useSearchParams must run inside a Suspense boundary so the page can
  // be statically prerendered.
  return (
    <Suspense fallback={null}>
      <ContentAnalysisPageInner />
    </Suspense>
  );
}

function ContentAnalysisPageInner() {
  const {
    snapshot,
    addCode,
    renameCode,
    recolorCode,
    deleteCode,
    mergeCode,
    moveCode,
    addSegment,
    deleteSegment,
    updateSegmentRange,
    updateSegmentNumeric,
    replaceDocumentSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    clearDocumentSuggestions,
    acceptAllSuggestions,
    upsertDocument,
    applyPolicyBodies,
    applyIngestion,
    applyClassifications,
    deleteDocumentVersion,
    splitBlock,
    addProject,
    updateProject,
    deleteProject,
    resetAll,
    restoreCodesAndSegments,
  } = useContentAnalysis();

  // Top-level navigation across the module:
  //   'landing'  — pick a project
  //   'new'      — project-creation wizard
  //   'workbench'— the three-panel coding workspace
  const [viewMode, setViewMode] = useState<'landing' | 'new' | 'workbench'>('landing');
  const [activeTab, setActiveTab] = useState<typeof TAB_LABELS[number]['id']>('workbench');
  const [activeProjectId, setActiveProjectId] = useState<string>('project-master');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null);
  const [ingestState, setIngestState] = useState<{
    status: 'idle' | 'loading' | 'error' | 'ok';
    message?: string;
  }>({ status: 'idle' });
  const [classifyState, setClassifyState] = useState<{
    status: 'idle' | 'loading' | 'error' | 'ok';
    message?: string;
  }>({ status: 'idle' });
  const [sourceFilter, setSourceFilter] = useState<'all' | 'policy' | 'reference'>('policy');
  /** When set, the viewer shows this archived version instead of the live doc. */
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
  const [pdfOnly, setPdfOnly] = useState(false);
  const [codeEditor, setCodeEditor] = useState<CodeEditorPayload | null>(null);

  const liveRefs = useLiveReferences();

  // Lazy-load the prefetched EUR-Lex policy bodies on first mount.
  // Lives as a static asset under public/ (≈15 MB, gzipped ≈3 MB) so
  // it stays out of the client bundle. Merges into documents via
  // `applyPolicyBodies`, which derives paragraph blocks on the fly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/content-analysis/policy-bodies.json', {
          cache: 'force-cache',
        });
        if (!resp.ok) return;
        const data = (await resp.json()) as Record<string, { text: string }>;
        if (cancelled) return;
        applyPolicyBodies(data);
      } catch {
        // Missing asset just means the prefetch workflow hasn't run
        // yet — docs fall back to their metadata-stub bodies.
      }
    })();
    return () => { cancelled = true; };
  }, [applyPolicyBodies]);

  // Merge snapshot (persisted policies + any pre-existing reference docs
  // from older snapshots) with the live reference stack so the workbench
  // always sees whatever the reference manager shows.
  const allDocuments = useMemo(() => {
    const seen = new Map<string, typeof snapshot.documents[number]>();
    for (const d of snapshot.documents) seen.set(d.id, d);
    for (const d of liveRefs.docs) if (!seen.has(d.id)) seen.set(d.id, d);
    return [...seen.values()];
  }, [snapshot.documents, liveRefs.docs]);
  /** When set, the viewer scrolls to this offset in the active doc's text. */
  const [pendingJump, setPendingJump] = useState<{ documentId: string; offset: number; query: string } | null>(null);
  /** Banner shown when the page is opened via a Policy Navigator deep link. */
  const [incomingContext, setIncomingContext] = useState<string | null>(null);
  const [toolbarSel, setToolbarSel] = useState<ToolbarSelection | null>(null);
  const [suggestState, setSuggestState] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'error';
    message?: string;
  }>({ status: 'idle' });
  // In-document Ctrl+F search — separate from the corpus-wide FullTextSearch
  // panel. Drives the highlight overlay inside AnnotatedDocumentView /
  // PdfDocumentView for the *current* document only.
  const [docSearchOpen, setDocSearchOpen] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docSearchHitIndex, setDocSearchHitIndex] = useState(0);
  const [docSearchTotal, setDocSearchTotal] = useState(0);
  const docSearchInputRef = useRef<HTMLInputElement | null>(null);
  // Active-code filter for the segments panel. When non-null, only segments
  // whose codeId is in the set are shown. Default: null (= "all active").
  // Toggling a colored square in CodeSystemTree mutates this set; the
  // "Activate all / None" buttons in the panel header reset it.
  const [activeCodeFilter, setActiveCodeFilter] = useState<Set<string> | null>(null);
  // Local toast state removed — migrated to the typed ToastHost via showToast().

  const activeProject = useMemo(
    () => snapshot.projects.find(p => p.id === activeProjectId) ?? snapshot.projects[0],
    [snapshot.projects, activeProjectId],
  );

  // Soft-locking: one editor at a time per project. The hook owns
  // acquire / heartbeat / release; we use `lockMode` further down to
  // disable mutating controls when we're a watcher.
  const projectLock = useProjectLock(
    activeProject && activeProject.id !== 'project-master' ? activeProject.id : null,
  );
  const lockMode = projectLock.mode;
  const canEdit = lockMode !== 'watcher'; // editor / idle (master) → editable

  /** Single chokepoint for "is the user allowed to mutate right now?".
   *  Returns true when editing is allowed; otherwise surfaces a toast and
   *  returns false. Every mutating handler short-circuits on a false. */
  const guardEdit = (): boolean => {
    if (canEdit) return true;
    showToast({
      tone: 'warning',
      message: 'Project is read-only',
      description: `${projectLock.lock?.holderName ?? 'Another editor'} is currently editing. Click "Request edit access" in the header to take over.`,
      timeoutMs: 6000,
    });
    return false;
  };

  const docsInProjectScope = useMemo(() => {
    if (!activeProject) return [];
    // Reuse the store's scoping rule but against `allDocuments` (snapshot
    // + live references). Inline the logic so we don't mutate the store.
    if (activeProject.documentAllowList.length > 0) {
      const allow = new Set(activeProject.documentAllowList);
      return allDocuments.filter(d => allow.has(d.id));
    }
    if (activeProject.masterCodeSelection.length === 0) return allDocuments;
    const expanded = new Set<string>();
    const walk = (rootId: string) => {
      expanded.add(rootId);
      for (const c of snapshot.codes) {
        if (c.parentId === rootId && !expanded.has(c.id)) walk(c.id);
      }
    };
    for (const root of activeProject.masterCodeSelection) walk(root);
    return allDocuments.filter(d => d.aiCodeIds.some(id => expanded.has(id)));
  }, [allDocuments, activeProject, snapshot.codes]);

  // Apply the source-library and PDF filters on top of the project scope.
  const docsInScope = useMemo(() => {
    let out = docsInProjectScope;
    if (sourceFilter !== 'all') {
      out = out.filter(d => (d.sourceKind ?? 'policy') === sourceFilter);
    }
    if (pdfOnly) {
      out = out.filter(d => d.celexNumber || hasAttachedPdf(d));
    }
    return out;
  }, [docsInProjectScope, sourceFilter, pdfOnly]);

  const projectSegments = useMemo(
    () => (activeProject ? segmentsForProject(snapshot, activeProject.id) : []),
    [snapshot, activeProject],
  );

  // The code tree shows master codes + any codes scoped to the active project.
  const visibleCodes = useMemo(
    () =>
      snapshot.codes.filter(
        c => c.scope === 'master' || (c.scope === 'project' && c.projectId === activeProjectId),
      ),
    [snapshot.codes, activeProjectId],
  );

  const selectedDocument = useMemo(
    () => docsInScope.find(d => d.id === selectedDocumentId) ?? docsInScope[0] ?? null,
    [docsInScope, selectedDocumentId],
  );

  // Auto-dismiss is now handled centrally by the typed ToastHost
  // (default 5s for info/success, 9s for danger).

  // Pomodoro fatigue nudge (M·05 #4). Watches for sustained coding activity
  // (segment additions / suggestion accepts) and offers a 5-minute break
  // after 25 minutes of continuous work; a gentler reminder at 50.
  // Optional, dismissible, sessionStorage-disablable. The literature on
  // qualitative-coding fatigue shows accuracy drops measurably after
  // ~30 minute sessions.
  const segmentCount = snapshot.segments.length;
  const fatigueRef = useRef<{ start: number; lastSegments: number; nudgedAt: number[] }>({
    start: Date.now(), lastSegments: segmentCount, nudgedAt: [],
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('mh:pomodoro-off') === '1') return;
    const id = setInterval(() => {
      const f = fatigueRef.current;
      const elapsedMin = (Date.now() - f.start) / 60000;
      // Reset the timer if no new segments were added in the last 3 minutes —
      // the user has stopped coding, so don't pretend they were working.
      if (snapshot.segments.length === f.lastSegments && elapsedMin > 3) {
        f.start = Date.now();
        f.lastSegments = snapshot.segments.length;
        f.nudgedAt = [];
        return;
      }
      f.lastSegments = snapshot.segments.length;
      // Threshold 1: 25 minutes — soft nudge.
      if (elapsedMin >= 25 && !f.nudgedAt.includes(25)) {
        f.nudgedAt.push(25);
        showToast({
          tone: 'info',
          message: 'Coding for 25 minutes — time for a 5-minute break?',
          description: 'Accuracy on qualitative coding drops after sustained sessions. Stretch and come back.',
          actionLabel: 'Hide for today',
          onAction: () => sessionStorage.setItem('mh:pomodoro-off', '1'),
          timeoutMs: 12000,
        });
      }
      // Threshold 2: 50 minutes — gentler reminder.
      if (elapsedMin >= 50 && !f.nudgedAt.includes(50)) {
        f.nudgedAt.push(50);
        showToast({
          tone: 'warning',
          message: 'Two pomodoros without a break',
          description: 'Consider stopping here — coverage stays intact, you can pick up later.',
          actionLabel: 'OK',
          onAction: () => {},
          timeoutMs: 12000,
        });
      }
    }, 30000);
    return () => clearInterval(id);
  }, [snapshot.segments.length]);

  // When a historical version is being previewed, swap in its frozen
  // blocks/text so the viewer renders the archived state. The rest of
  // the doc metadata (title, celex, codes) stays current.
  const viewerDocument = useMemo(() => {
    if (!selectedDocument || !viewingVersionId) return selectedDocument;
    const version = selectedDocument.versions?.find(v => v.id === viewingVersionId);
    if (!version) return selectedDocument;
    return {
      ...selectedDocument,
      blocks: version.blocks,
      text: version.text,
      pageCount: version.pageCount ?? selectedDocument.pageCount,
    };
  }, [selectedDocument, viewingVersionId]);
  const isPreviewingVersion = !!viewingVersionId && !!selectedDocument?.versions?.some(v => v.id === viewingVersionId);

  // Auto-reset selection when the scope changes and the current doc is gone.
  useEffect(() => {
    if (!selectedDocument && docsInScope.length > 0) {
      setSelectedDocumentId(docsInScope[0].id);
    } else if (selectedDocument && selectedDocument.id !== selectedDocumentId) {
      setSelectedDocumentId(selectedDocument.id);
    }
  }, [docsInScope, selectedDocument, selectedDocumentId]);

  // Deep-link handler: `?doc=<policyId>&highlight=<term>&context=<banner>`.
  // Used by the Policy Navigator's connection verification table and article
  // deep-links. We only fire once per param combo so the user can navigate
  // away without being yanked back on every re-render.
  const searchParams = useSearchParams();
  const incomingDoc = searchParams?.get('doc') ?? null;
  const incomingHighlight = searchParams?.get('highlight') ?? null;
  const incomingContextParam = searchParams?.get('context') ?? null;
  const [consumedDeepLink, setConsumedDeepLink] = useState<string | null>(null);

  useEffect(() => {
    if (!incomingDoc) return;
    const signature = `${incomingDoc}|${incomingHighlight ?? ''}|${incomingContextParam ?? ''}`;
    if (signature === consumedDeepLink) return;
    const match = allDocuments.find(d => d.id === incomingDoc);
    if (!match) return;
    setViewMode('workbench');
    setActiveTab('workbench');
    setSelectedDocumentId(match.id);
    if (incomingHighlight) {
      setPendingJump({ documentId: match.id, offset: 0, query: incomingHighlight });
    }
    setIncomingContext(incomingContextParam);
    setConsumedDeepLink(signature);
  }, [incomingDoc, incomingHighlight, incomingContextParam, allDocuments, consumedDeepLink]);

  const segmentsForDocument = useMemo(
    () => {
      if (!selectedDocument) return [];
      const all = projectSegments.filter(s => s.documentId === selectedDocument.id);
      // Apply the colored-square activation filter when the user has
      // touched it. `null` means "filter not initialised" → show everything.
      if (!activeCodeFilter) return all;
      return all.filter(s => activeCodeFilter.has(s.codeId));
    },
    [projectSegments, selectedDocument, activeCodeFilter],
  );

  // ── Landing / wizard derived state ────────────────────────────────
  const projectSegmentCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of snapshot.projects) out[p.id] = 0;
    for (const s of snapshot.segments) {
      const key = s.projectId ?? 'project-master';
      out[key] = (out[key] ?? 0) + 1;
    }
    return out;
  }, [snapshot.projects, snapshot.segments]);

  const projectDocCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of snapshot.projects) {
      if (p.documentAllowList.length > 0) {
        out[p.id] = p.documentAllowList.length;
        continue;
      }
      if (p.masterCodeSelection.length === 0) {
        out[p.id] = allDocuments.length;
        continue;
      }
      const expanded = new Set<string>();
      const walk = (id: string) => {
        expanded.add(id);
        for (const c of snapshot.codes) {
          if (c.parentId === id && !expanded.has(c.id)) walk(c.id);
        }
      };
      for (const rootId of p.masterCodeSelection) walk(rootId);
      out[p.id] = allDocuments.filter(d => d.aiCodeIds.some(id => expanded.has(id))).length;
    }
    return out;
  }, [snapshot.projects, snapshot.codes, allDocuments]);

  const masterRootCodes = useMemo(
    () => snapshot.codes.filter(c => c.scope === 'master' && c.parentId === null),
    [snapshot.codes],
  );

  const masterCodesByParent = useMemo(() => {
    const map = new Map<string | null, typeof snapshot.codes[number][]>();
    for (const c of snapshot.codes) {
      if (c.scope !== 'master') continue;
      const key = c.parentId;
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return map;
  }, [snapshot.codes]);

  const docCountsByCode = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of allDocuments) {
      const tags = new Set(d.aiCodeIds);
      // Walk up each tag's ancestors so the root count reflects every
      // descendant hit — a doc tagged only with `code-ets` still counts
      // toward its ancestor `root-mitigation`.
      const byId = new Map(snapshot.codes.map(c => [c.id, c]));
      const touched = new Set<string>();
      for (const tag of tags) {
        let cur: string | null = tag;
        while (cur && !touched.has(cur)) {
          touched.add(cur);
          cur = byId.get(cur)?.parentId ?? null;
        }
      }
      for (const id of touched) out[id] = (out[id] ?? 0) + 1;
    }
    return out;
  }, [allDocuments, snapshot.codes]);

  const codeCountsDirect = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of projectSegments) counts[s.codeId] = (counts[s.codeId] ?? 0) + 1;
    return counts;
  }, [projectSegments]);

  const docCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of projectSegments) counts[s.documentId] = (counts[s.documentId] ?? 0) + 1;
    return counts;
  }, [projectSegments]);

  // Per-document set of block IDs that have at least one segment — drives
  // the coverage-progress ring on each row in DocumentList (M·05 #7).
  const coveredBlocksByDoc = useMemo(() => {
    const out: Record<string, Set<string>> = {};
    for (const s of projectSegments) {
      if (!s.blockId) continue;
      const set = out[s.documentId] ?? (out[s.documentId] = new Set());
      set.add(s.blockId);
    }
    return out;
  }, [projectSegments]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleIngest = async (documentId: string) => {
    if (!guardEdit()) return;
    const doc = allDocuments.find(d => d.id === documentId);
    if (!doc?.celexNumber) return;
    // Promote live-reference docs into the snapshot before we mutate.
    upsertDocument(doc);
    setIngestState({ status: 'loading' });
    try {
      // POST so we can ship the shipped full_text as a fallback. When
      // EUR-Lex is reachable the server ignores the body; otherwise it
      // derives paragraph-blocks from the supplied text.
      const resp = await fetch(
        `/api/content-analysis/ingest?celex=${encodeURIComponent(doc.celexNumber)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fallbackText: doc.text ?? '' }),
          cache: 'no-store',
        },
      );
      const data = await resp.json();
      if (!resp.ok) {
        const attemptHint = Array.isArray(data?.attempts) && data.attempts.length
          ? ` (tried ${data.attempts.length} EUR-Lex URLs)`
          : '';
        setIngestState({
          status: 'error',
          message: `${data?.error ?? `HTTP ${resp.status}`}${attemptHint}`,
        });
        return;
      }
      applyIngestion(documentId, {
        pdfUrl: data.pdfUrl,
        pageCount: data.pageCount,
        blocks: data.blocks,
        text: data.text,
        ingestedAt: data.ingestedAt,
        archiveSource: data.source ?? 'eurlex-pdf',
      });
      setIngestState({
        status: 'ok',
        message: `${data.cached ? 'cached' : 'fresh'}${data.source === 'fallback-text' ? ' · from shipped text (EUR-Lex blocked)' : ''}`,
      });
    } catch (err) {
      setIngestState({ status: 'error', message: String(err) });
    }
  };

  const handleManualUpload = async (documentId: string, file: File) => {
    if (!guardEdit()) return;
    const doc = allDocuments.find(d => d.id === documentId);
    if (!doc) return;
    upsertDocument(doc);
    setIngestState({ status: 'loading', message: `Uploading ${file.name}…` });
    try {
      const form = new FormData();
      form.append('file', file);
      const celexParam = doc.celexNumber
        ? `?celex=${encodeURIComponent(doc.celexNumber)}`
        : `?celex=${encodeURIComponent(doc.id.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 20) || 'UPLOAD')}`;
      const resp = await fetch(`/api/content-analysis/ingest-upload${celexParam}`, {
        method: 'POST',
        body: form,
      });
      const data = await resp.json();
      if (!resp.ok) {
        setIngestState({ status: 'error', message: data?.error ?? `HTTP ${resp.status}` });
        return;
      }
      applyIngestion(documentId, {
        pdfUrl: data.pdfUrl || '',
        pageCount: data.pageCount,
        blocks: data.blocks,
        text: data.text,
        ingestedAt: data.ingestedAt,
        archiveSource: 'manual-upload',
      });
      setIngestState({
        status: 'ok',
        message: `manual upload`,
      });
    } catch (err) {
      setIngestState({ status: 'error', message: String(err) });
    }
  };

  const handleClassify = async (documentId: string) => {
    if (!guardEdit()) return;
    const doc = allDocuments.find(d => d.id === documentId);
    if (!doc) return;
    upsertDocument(doc);
    const masterCodes = snapshot.codes.filter(c => c.scope === 'master');
    if (masterCodes.length === 0) {
      setClassifyState({ status: 'error', message: 'No master tags defined' });
      return;
    }
    setClassifyState({ status: 'loading' });
    try {
      const resp = await fetch('/api/content-analysis/classify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          document: {
            id: doc.id,
            title: doc.title,
            shortTitle: doc.shortTitle,
            blocks: doc.blocks?.map(b => ({ id: b.id, page: b.page, kind: b.kind, text: b.text })),
            text: doc.blocks?.length ? undefined : doc.text,
          },
          codes: masterCodes.map(c => ({
            id: c.id,
            parentId: c.parentId,
            name: c.name,
            description: c.description,
          })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const reason = data?.finishReason ? ` [${data.finishReason}]` : '';
        const hint = data?.hint ? ` — ${data.hint}` : '';
        setClassifyState({
          status: 'error',
          message: `${data?.error ?? `HTTP ${resp.status}`}${reason}${hint}`,
        });
        return;
      }
      applyClassifications(documentId, data.classifications, { mergeIntoAiCodeIds: true });
      setClassifyState({
        status: 'ok',
        message: `${data.classifications.length} tags · ${data.model}`,
      });
    } catch (err) {
      setClassifyState({ status: 'error', message: String(err) });
    }
  };

  const handleSuggestCodes = async (documentId: string) => {
    if (!guardEdit()) return;
    const doc = allDocuments.find(d => d.id === documentId);
    if (!doc) return;
    if (!doc.text || doc.text.trim().length < 200) {
      setSuggestState({ status: 'error', message: 'Document has no text to review.' });
      return;
    }
    const masterCodes = snapshot.codes.filter(c => c.scope === 'master');
    if (masterCodes.length === 0) {
      setSuggestState({ status: 'error', message: 'No master tags defined' });
      return;
    }
    const existingCount = snapshot.suggestions.filter(s => s.documentId === documentId).length;
    if (existingCount > 0) {
      const ok = window.confirm(
        `Replace ${existingCount} pending suggestion${existingCount === 1 ? '' : 's'} for this document with a fresh AI batch?`,
      );
      if (!ok) return;
    }
    upsertDocument(doc);
    setSuggestState({ status: 'loading' });
    try {
      const resp = await fetch('/api/content-analysis/suggest-codes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          document: {
            id: doc.id,
            title: doc.title,
            shortTitle: doc.shortTitle,
            blocks: doc.blocks?.map(b => ({ id: b.id, page: b.page, kind: b.kind, text: b.text })),
            text: doc.blocks?.length ? undefined : doc.text,
          },
          codes: masterCodes.map(c => ({
            id: c.id,
            parentId: c.parentId,
            name: c.name,
            description: c.description,
          })),
          limit: 40,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const hint = data?.hint ? ` — ${data.hint}` : '';
        setSuggestState({
          status: 'error',
          message: `${data?.error ?? `HTTP ${resp.status}`}${hint}`,
        });
        return;
      }
      replaceDocumentSuggestions(
        documentId,
        (data.suggestions ?? []).map((s: {
          codeId: string;
          blockId?: string;
          startChar: number;
          endChar: number;
          quote: string;
          rationale: string;
          confidence: number;
        }) => ({
          codeId: s.codeId,
          blockId: s.blockId || undefined,
          startChar: s.startChar,
          endChar: s.endChar,
          quote: s.quote,
          rationale: s.rationale,
          confidence: s.confidence,
        })),
        data.model,
      );
      setSuggestState({
        status: 'ok',
        message: `${data.suggestions?.length ?? 0} suggestions · ${data.model}${
          data.totalProposed && data.totalProposed > (data.suggestions?.length ?? 0)
            ? ` · ${data.totalProposed - (data.suggestions?.length ?? 0)} dropped (couldn't anchor)`
            : ''
        }`,
      });
      showToast({
        tone: 'success',
        message: `AI proposed ${data.suggestions?.length ?? 0} tagged segments`,
        description: 'Review and accept below.',
      });
    } catch (err) {
      setSuggestState({ status: 'error', message: String(err) });
    }
  };

  const pendingSuggestions = useMemo(
    () => (selectedDocument ? snapshot.suggestions.filter(s => s.documentId === selectedDocument.id) : []),
    [snapshot.suggestions, selectedDocument],
  );

  const handleAcceptSuggestion = (suggestionId: string) => {
    if (!guardEdit()) return;
    const projectId = activeProject && activeProject.id !== 'project-master' ? activeProject.id : null;
    const seg = acceptSuggestion(suggestionId, projectId);
    if (seg) setHighlightedSegmentId(seg.id);
  };

  const handleAcceptAllSuggestions = () => {
    if (!guardEdit()) return;
    if (!selectedDocument) return;
    const count = pendingSuggestions.length;
    if (count === 0) return;
    if (count >= 5 && !window.confirm(`Accept all ${count} suggestions as tagged segments?`)) return;
    const projectId = activeProject && activeProject.id !== 'project-master' ? activeProject.id : null;
    const n = acceptAllSuggestions(selectedDocument.id, projectId);
    showToast({ tone: 'success', message: `Accepted ${n} suggestion${n === 1 ? '' : 's'}` });
  };

  const handleRejectAllSuggestions = () => {
    if (!guardEdit()) return;
    if (!selectedDocument) return;
    const count = pendingSuggestions.length;
    if (count === 0) return;
    if (!window.confirm(`Reject all ${count} pending suggestions?`)) return;
    clearDocumentSuggestions(selectedDocument.id);
  };

  const handleJumpToSuggestion = (suggestion: { blockId?: string; startChar: number; quote: string; documentId: string }) => {
    setPendingJump({
      documentId: suggestion.documentId,
      offset: suggestion.startChar,
      query: suggestion.quote.slice(0, 80),
    });
    if (suggestion.blockId) setHighlightedSegmentId(suggestion.blockId);
  };

  const handleCreateSegment = (input: { startChar: number; endChar: number; text: string; blockId?: string }) => {
    if (!guardEdit()) return;
    if (!selectedCodeId || !selectedDocument || !activeProject) return;
    upsertDocument(selectedDocument);
    const seg = addSegment({
      documentId: selectedDocument.id,
      codeId: selectedCodeId,
      startChar: input.startChar,
      endChar: input.endChar,
      text: input.text,
      blockId: input.blockId,
      projectId: activeProject.id === 'project-master' ? null : activeProject.id,
    });
    setHighlightedSegmentId(seg.id);
    const code = snapshot.codes.find(c => c.id === selectedCodeId);
    showToast({
      tone: 'success',
      message: `Tagged as "${code?.name ?? 'tag'}"`,
    });
  };

  const handleAddCode = (parentId: string | null) => {
    if (!guardEdit()) return;
    setCodeEditor({ mode: 'add', targetId: parentId });
  };

  const handleRename = (codeId: string) => {
    if (!guardEdit()) return;
    setCodeEditor({ mode: 'rename', targetId: codeId });
  };

  const handleRecolor = (codeId: string) => {
    if (!guardEdit()) return;
    setCodeEditor({ mode: 'recolor', targetId: codeId });
  };

  const handleCodeEditorSubmit = (result: CodeEditorResult) => {
    if (!codeEditor) return;
    if (codeEditor.mode === 'add') {
      const name = result.name?.trim();
      if (!name) { setCodeEditor(null); return; }
      const isProjectScope = activeProjectId !== 'project-master';
      // Semantic palette (M·05 #3): walk up to the root to get the family,
      // then pick a shade by depth. When the root doesn't classify into a
      // known family, fall back to lightening the immediate parent's
      // colour so sub-tags still read as part of the same family. Random
      // DEFAULT_CODE_COLORS only fires for root tags with no parent.
      let suggested: string | null = null;
      if (!result.color) {
        let depth = 0;
        let rootName = name;
        let curParent = codeEditor.targetId;
        while (curParent && depth < 8) {
          const p = snapshot.codes.find(c => c.id === curParent);
          if (!p) break;
          rootName = p.name;
          curParent = p.parentId ?? null;
          depth++;
        }
        suggested = semanticColorFor(rootName, depth);
        if (!suggested && codeEditor.targetId) {
          // Walk up one to the immediate parent, then lighten by depth.
          const directParent = snapshot.codes.find(c => c.id === codeEditor.targetId);
          // Recompute depth as distance from that parent (= 1 for direct child).
          if (directParent) {
            suggested = lightenedFromParent(directParent.color, 1);
          }
        }
      }
      const code = addCode({
        name,
        parentId: codeEditor.targetId,
        color: result.color ?? suggested ?? DEFAULT_CODE_COLORS[0],
        description: result.description,
        scope: isProjectScope ? 'project' : 'master',
        projectId: isProjectScope ? activeProjectId : undefined,
      });
      setSelectedCodeId(code.id);
      // "+ New tag from selection" path: also create the segment under
      // the brand-new code so the highlight that started this flow lands
      // tagged without a second click.
      const pending = codeEditor.pendingSegmentInput;
      if (pending && selectedDocument && activeProject) {
        upsertDocument(selectedDocument);
        const seg = addSegment({
          documentId: selectedDocument.id,
          codeId: code.id,
          startChar: pending.startChar,
          endChar: pending.endChar,
          text: pending.text,
          blockId: pending.blockId,
          projectId: activeProject.id === 'project-master' ? null : activeProject.id,
        });
        setHighlightedSegmentId(seg.id);
        showToast({ tone: 'success', message: `Tagged as new "${name}"` });
      }
    } else if (codeEditor.mode === 'rename' && codeEditor.targetId) {
      const name = result.name?.trim();
      const current = snapshot.codes.find(c => c.id === codeEditor.targetId);
      if (name && name !== current?.name) renameCode(codeEditor.targetId, name);
      // The rename modal also exposes the colour palette, so honour any
      // change the user made there rather than silently dropping it.
      if (result.color && current && result.color !== current.color) {
        recolorCode(codeEditor.targetId, result.color);
      }
    } else if (codeEditor.mode === 'recolor' && codeEditor.targetId) {
      if (result.color) recolorCode(codeEditor.targetId, result.color);
    }
    setCodeEditor(null);
  };

  const handleDeleteCode = (codeId: string) => {
    if (!guardEdit()) return;
    const current = snapshot.codes.find(c => c.id === codeId);
    if (!current) return;
    const ok = window.confirm(
      `Delete tag "${current.name}" and all its descendants + segments? This cannot be undone.`,
    );
    if (ok) {
      deleteCode(codeId);
      if (selectedCodeId === codeId) setSelectedCodeId(null);
    }
  };

  const openSegmentInDoc = (segmentId: string) => {
    const seg = projectSegments.find(s => s.id === segmentId);
    if (!seg) return;
    setSelectedDocumentId(seg.documentId);
    setHighlightedSegmentId(seg.id);
  };


  const handleDeleteProject = () => {
    // Deleting a project that's locked to someone else would yank work
    // out from under them; require the lock first.
    if (!guardEdit()) return;
    if (!activeProject || activeProject.id === 'project-master') return;
    if (!window.confirm(`Delete project "${activeProject.name}"? Project tags will be removed; master segments are preserved.`)) return;
    deleteProject(activeProject.id);
    setActiveProjectId('project-master');
  };

  const handleSearchJump = (hit: SearchHit) => {
    setSelectedDocumentId(hit.documentId);
    setPendingJump({ documentId: hit.documentId, offset: hit.offset, query: hit.query });
    setHighlightedSegmentId(null);
    setIngestState({ status: 'idle' });
    setClassifyState({ status: 'idle' });
  };

  // Resolve a code id to itself + all descendants, using the current code
  // tree. Used by the "activate code" toggle in CodeSystemTree so clicking
  // a parent's colored square cascades to its sub-tags.
  const codeWithDescendants = (rootId: string): string[] => {
    const out: string[] = [rootId];
    const stack = [rootId];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const c of snapshot.codes) {
        if (c.parentId === cur) {
          out.push(c.id);
          stack.push(c.id);
        }
      }
    }
    return out;
  };

  const handleToggleActiveCode = (codeId: string, cascade: boolean) => {
    setActiveCodeFilter(prev => {
      // Initialise from "everything" the first time the user toggles —
      // matches user mental model of starting with all-active and turning
      // some off. Use visibleCodes since master-tree only shows those.
      const baseline = prev ?? new Set(visibleCodes.map(c => c.id));
      const next = new Set(baseline);
      const ids = cascade ? codeWithDescendants(codeId) : [codeId];
      // If every target id is already active, deactivate them; otherwise
      // activate the missing ones. Symmetric, predictable.
      const allActive = ids.every(id => next.has(id));
      if (allActive) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  };

  // Ctrl+F / ⌘F → open the in-document search bar and focus the input.
  // Only swallows the browser's default Find when the user has the
  // workbench focused; otherwise the native Find still works.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isFind = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f';
      if (!isFind) return;
      if (activeTab !== 'workbench' || viewMode !== 'workbench') return;
      e.preventDefault();
      setDocSearchOpen(true);
      // Focus on next tick so the input has mounted.
      setTimeout(() => docSearchInputRef.current?.focus(), 0);
      // Pre-fill with the current text selection if there is one.
      const sel = window.getSelection?.()?.toString().trim();
      if (sel && sel.length >= 2 && sel.length < 80) {
        setDocSearchQuery(sel);
        setDocSearchHitIndex(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTab, viewMode]);

  // Reset hit index when the query or selected document changes so we
  // always start at the first match in the new context.
  useEffect(() => {
    setDocSearchHitIndex(0);
  }, [docSearchQuery, selectedDocumentId]);

  const toggleMasterCodeInProject = (codeId: string) => {
    if (!guardEdit()) return;
    if (!activeProject || activeProject.id === 'project-master') return;
    const set = new Set(activeProject.masterCodeSelection);
    if (set.has(codeId)) set.delete(codeId);
    else set.add(codeId);
    updateProject(activeProject.id, { masterCodeSelection: [...set] });
  };

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={80}>
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <OnboardingTour
        moduleKey="content-analysis"
        steps={[
          { title: 'Hierarchical code tree', body: 'Every code can have children. Drag-merge or move codes from the editor — it auto-rejects cycles.' },
          { title: 'AI pre-tagging', body: 'AI suggestions are flagged; accept or reject from the segment list.' },
          { title: 'Word-compatible export', body: 'Export coded segments as a styled table droppable into Word.' },
        ]}
      />
      <PageHero
        title="Content Analysis"
        subtitle={
          <>
            Qualitative tagging for EU policy texts and ESABCC references — hierarchical tag
            system, EUR-Lex PDF ingestion, AI pre-tagging and cross-document coherence.
          </>
        }
      >
        <div className="flex items-center gap-3 flex-wrap text-[11.5px] text-[#3D5265]/75">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset content analysis to seed data? Local tagged segments will be lost.')) resetAll();
            }}
            className="ml-auto text-[#8A95A3] hover:text-[#B83230]"
          >
            Reset to seed
          </button>
        </div>
      </PageHero>

      {viewMode === 'landing' && (
        <ProjectLanding
          projects={snapshot.projects}
          segmentCounts={projectSegmentCounts}
          documentCounts={projectDocCounts}
          onOpen={(id) => {
            setActiveProjectId(id);
            setViewMode('workbench');
            setActiveTab('workbench');
          }}
          onCreate={() => setViewMode('new')}
          onDelete={(id) => {
            if (id === 'project-master') return;
            if (window.confirm('Delete this project? Project-scoped tags will be removed; master segments are preserved.')) {
              deleteProject(id);
            }
          }}
        />
      )}

      {viewMode === 'new' && (
        <NewProjectWizard
          rootCodes={masterRootCodes}
          codesByParent={masterCodesByParent}
          docCountsByCode={docCountsByCode}
          documents={allDocuments}
          onCancel={() => setViewMode('landing')}
          onCreate={({ name, description, mode, masterCodeSelection, documentAllowList }) => {
            const proj = addProject({
              name,
              description,
              mode,
              masterCodeSelection,
              documentAllowList,
            });
            setActiveProjectId(proj.id);
            setViewMode('workbench');
            setActiveTab('workbench');
          }}
        />
      )}

      {viewMode === 'workbench' && (
        <>
      {/* ── Project + analysis-mode switcher ─────────────────────────────── */}
      <section className="border-b border-[#E6E7E8] bg-[#FBFBFA]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              // Clear per-workbench state so returning to a different
              // project doesn't flash the prior doc / archive / banner.
              setViewMode('landing');
              setSelectedDocumentId(null);
              setHighlightedSegmentId(null);
              setViewingVersionId(null);
              setPendingJump(null);
              setIngestState({ status: 'idle' });
              setClassifyState({ status: 'idle' });
            }}
            className="text-[11.5px] font-medium text-[#8A95A3] hover:text-[#3D5265] -ml-1 pl-1 pr-2 py-0.5"
            title="Back to project landing"
          >
            ← Projects
          </button>
          <span className="text-[#B8BCC2]">/</span>
          <label className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#8A95A3]">
            Project
          </label>
          <select
            value={activeProjectId}
            onChange={e => setActiveProjectId(e.target.value)}
            className="text-[12.5px] bg-white border border-[#E6E7E8] rounded-sm px-2 py-1 text-[#3D5265]"
          >
            {snapshot.projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setViewMode('new')}
            className="text-[11.5px] font-medium text-[#E87722] hover:text-[#c45f14]"
          >
            + New project
          </button>
          {activeProject && activeProject.id !== 'project-master' && (
            <button
              type="button"
              onClick={handleDeleteProject}
              className="text-[11.5px] font-medium text-[#B83230] hover:opacity-80"
            >
              Delete project
            </button>
          )}
          {activeProject && (
            <span className="text-[11.5px] text-[#3D5265]/75 italic max-w-md truncate">
              {activeProject.description || '—'}
            </span>
          )}

          {/* Soft-lock pill — only visible on real projects (the master
              library is a shared workspace, not a per-analyst lock). */}
          {activeProject && activeProject.id !== 'project-master' && (
            <ProjectLockPill
              mode={projectLock.mode}
              lock={projectLock.lock}
              onRequestEdit={projectLock.requestEdit}
              onHandOff={projectLock.handOff}
            />
          )}

          <div className="ml-auto flex items-center gap-1 flex-wrap">
            {TAB_LABELS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1 rounded-sm text-[11.5px] font-medium border transition ${
                  activeTab === t.id
                    ? 'bg-[#00928F] text-white border-[#00928F]'
                    : 'bg-white text-[#3D5265] border-[#E6E7E8] hover:border-[#3D5265]'
                }`}
              >
                {t.label}
                {t.kind === 'beta' && (
                  <span className={`ml-1 text-[9px] ${activeTab === t.id ? 'text-white/90' : 'text-[#E87722]'}`}>
                    β
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main workspace ───────────────────────────────────────────────── */}
      {/* Read-only banner — only when another editor holds the lock. The
          per-handler guards already block mutations; this banner is the
          visual cue so the user doesn't keep clicking dead buttons. */}
      {lockMode === 'watcher' && (
        <div className="bg-[#FEF3C7] border-b border-[#FCD34D] px-4 sm:px-6 py-1.5 text-[11.5px] text-[#92400E]">
          <strong>Read-only.</strong>{' '}
          {projectLock.lock?.holderName ?? 'Another editor'} is editing this project.
          Click <em>Request edit access</em> in the header to take over.
        </div>
      )}
      {activeTab === 'workbench' && (
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
            {/* LEFT: search + documents + code system */}
            <aside className="flex flex-col gap-4 min-h-0">
              <Panel title="Search all policy text">
                <FullTextSearch
                  documents={allDocuments}
                  onJump={handleSearchJump}
                />
              </Panel>

              <Panel title="Documents in scope" accent={`${docsInScope.length}`}>
                <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-[#E6E7E8] bg-white">
                  {([
                    { id: 'policy',    label: 'Policies' },
                    { id: 'reference', label: 'References' },
                    { id: 'all',       label: 'Both' },
                  ] as const).map(opt => {
                    const count = docsInProjectScope.filter(d =>
                      opt.id === 'all' ? true : (d.sourceKind ?? 'policy') === opt.id,
                    ).length;
                    const active = sourceFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSourceFilter(opt.id)}
                        className={`px-2 py-0.5 rounded-sm text-[10.5px] font-medium transition ${
                          active
                            ? 'bg-[#3D5265] text-white'
                            : 'text-[#3D5265] hover:bg-[#F3F4F6]'
                        }`}
                      >
                        {opt.label}
                        <span className={`ml-1 font-mono tabular-nums ${active ? 'text-white/80' : 'text-[#8A95A3]'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                  <label className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-[#3D5265] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pdfOnly}
                      onChange={e => setPdfOnly(e.target.checked)}
                      className="w-3 h-3 accent-[#00928F]"
                    />
                    PDF only
                  </label>
                </div>
                {liveRefs.loading && (
                  <div className="px-3 py-1.5 font-mono text-[10px] text-[#8A95A3] border-b border-[#E6E7E8] bg-[#FBFBFA]">
                    Loading live references…
                  </div>
                )}
                {liveRefs.error && (
                  <div className="px-3 py-1.5 font-mono text-[10px] text-[#B83230] border-b border-[#E6E7E8] bg-[#FBFBFA]">
                    References API unreachable — showing static library only.
                  </div>
                )}
                <div className="max-h-[42vh] overflow-y-auto">
                  <DocumentList
                    documents={docsInScope}
                    codes={snapshot.codes}
                    selectedDocumentId={selectedDocument?.id ?? null}
                    onSelect={id => {
                      setSelectedDocumentId(id);
                      setHighlightedSegmentId(null);
                      setIngestState({ status: 'idle' });
                      setClassifyState({ status: 'idle' });
                      setViewingVersionId(null);
                    }}
                    counts={docCounts}
                    coveredBlocks={coveredBlocksByDoc}
                  />
                </div>
              </Panel>

              <Panel
                title="Tag system"
                accent={`${visibleCodes.length}`}
                action={
                  <div className="flex items-center gap-2">
                    {activeCodeFilter && (
                      <span
                        className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#8A95A3]"
                        title="Number of active tags out of total"
                      >
                        {activeCodeFilter.size} / {visibleCodes.length} active
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveCodeFilter(new Set(visibleCodes.map(c => c.id)))}
                      className="text-[11px] font-medium text-[#3D5265] hover:text-[#00928F]"
                      title="Activate every tag — segments panel shows everything"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCodeFilter(new Set())}
                      className="text-[11px] font-medium text-[#3D5265] hover:text-[#00928F]"
                      title="Deactivate every tag — segments panel shows nothing"
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCode(null)}
                      className="text-[11px] font-medium text-[#E87722] hover:text-[#c45f14]"
                    >
                      + Root
                    </button>
                  </div>
                }
              >
                <div className="max-h-[45vh] overflow-y-auto overflow-x-auto">
                  <CodeSystemTree
                    codes={visibleCodes}
                    counts={codeCountsDirect}
                    selectedCodeId={selectedCodeId}
                    onSelect={(id) => {
                      // Toggle: clicking the already-selected tag deselects it,
                      // so highlighting text won't auto-tag any more.
                      setSelectedCodeId(prev => (prev === id ? null : id));
                    }}
                    onAddChild={handleAddCode}
                    onRename={handleRename}
                    onRecolor={handleRecolor}
                    onDelete={handleDeleteCode}
                    activeFilter={activeCodeFilter ?? undefined}
                    onToggleActive={handleToggleActiveCode}
                    onMove={(id, newParentId) => {
                      if (!guardEdit()) return;
                      if (!moveCode(id, newParentId)) {
                        showToast({
                          tone: 'danger',
                          message: 'Move rejected',
                          description: 'Target parent is inside the moved subtree.',
                        });
                      }
                    }}
                    onMerge={(sourceId, targetId) => {
                      if (!guardEdit()) return;
                      const result = mergeCode(sourceId, targetId);
                      if (result === null) {
                        showToast({
                          tone: 'danger',
                          message: 'Merge rejected',
                          description: 'Target tag is a descendant of the source.',
                        });
                        return;
                      }
                      if (selectedCodeId === sourceId) setSelectedCodeId(targetId);
                      const targetName = snapshot.codes.find(c => c.id === targetId)?.name ?? 'tag';
                      showToast({
                        tone: 'primary',
                        message: `Merged ${result.reassigned} segment${result.reassigned === 1 ? '' : 's'} into "${targetName}"`,
                        actionLabel: 'Undo',
                        onAction: () => { result.undo(); setSelectedCodeId(sourceId); },
                        timeoutMs: 15000,
                      });
                    }}
                  />
                </div>
              </Panel>
            </aside>

            {/* CENTER: annotated document */}
            <main className="flex flex-col min-h-0">
              <Panel
                title={selectedDocument ? selectedDocument.shortTitle : 'Document'}
                accent={selectedDocument?.kind.toUpperCase()}
                action={
                  selectedDocument ? (
                    <div className="flex items-center gap-3">
                      {selectedDocument.celexNumber && (
                        <Tooltip
                          content={
                            selectedDocument.ingestedAt
                              ? `Last ingested ${new Date(selectedDocument.ingestedAt).toLocaleString()}`
                              : 'Fetch the EUR-Lex PDF and extract structured blocks. Falls back to HTML or the shipped text if PDF is blocked.'
                          }
                        >
                          <button
                            type="button"
                            onClick={() => handleIngest(selectedDocument.id)}
                            disabled={ingestState.status === 'loading'}
                            className="text-[11px] font-medium text-[#00928F] hover:text-[#006F6C] disabled:text-[#B8BCC2] disabled:cursor-wait"
                          >
                            {ingestState.status === 'loading'
                              ? 'Ingesting…'
                              : selectedDocument.ingestedAt
                                ? 'Re-ingest PDF'
                                : 'Ingest EUR-Lex PDF'}
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip content="Upload a PDF by hand — useful when EUR-Lex auto-fetch fails, or for references without a CELEX.">
                        <label className="text-[11px] font-medium text-[#0065A4] hover:text-[#004B7F] cursor-pointer">
                          Upload PDF
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleManualUpload(selectedDocument.id, file);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                      </Tooltip>
                      <Tooltip
                        content={
                          selectedDocument.aiTaggedAt
                            ? `Last pre-tagged ${new Date(selectedDocument.aiTaggedAt).toLocaleString()}`
                            : 'Run Gemini to assign master tags with rationale + evidence block ids.'
                        }
                      >
                        <button
                          type="button"
                          onClick={() => handleClassify(selectedDocument.id)}
                          disabled={classifyState.status === 'loading'}
                          className="text-[11px] font-medium text-[#7C3AED] hover:text-[#6D28D9] disabled:text-[#B8BCC2] disabled:cursor-wait"
                        >
                          {classifyState.status === 'loading'
                            ? 'Pre-tagging…'
                            : selectedDocument.aiTaggedAt
                              ? 'Re-run AI tags'
                              : 'AI pre-tag'}
                        </button>
                      </Tooltip>
                      <Tooltip content="Ask Gemini to read the whole document and propose tagged segments against the master tag system. Suggestions appear as track-changes: accept or reject each one.">
                        <button
                          type="button"
                          onClick={() => handleSuggestCodes(selectedDocument.id)}
                          disabled={suggestState.status === 'loading'}
                          className="text-[11px] font-medium text-[#16A34A] hover:text-[#166534] disabled:text-[#B8BCC2] disabled:cursor-wait"
                        >
                          {suggestState.status === 'loading'
                            ? 'Suggesting…'
                            : 'AI suggest tags'}
                        </button>
                      </Tooltip>
                      {selectedDocument.eurlexUrl && (
                        <a
                          href={selectedDocument.pdfUrl ?? selectedDocument.eurlexUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-medium text-[#E87722] hover:text-[#c45f14]"
                        >
                          Open in EUR-Lex ↗
                        </a>
                      )}
                      <VersionArchive
                        document={selectedDocument}
                        viewingVersionId={viewingVersionId}
                        onPreview={setViewingVersionId}
                        onDelete={(versionId) => deleteDocumentVersion(selectedDocument.id, versionId)}
                      />
                    </div>
                  ) : null
                }
                bodyClassName="p-0"
              >
                {selectedDocument ? (
                  <>
                    <div className="px-4 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA] text-[11.5px] text-[#3D5265]/80 flex items-center gap-3 flex-wrap">
                      <span>
                        <strong>Active tag:</strong>{' '}
                        {selectedCodeId ? (
                          <ActiveCodeBadge codeId={selectedCodeId} codes={snapshot.codes} />
                        ) : (
                          <span className="italic text-[#8A95A3]">Pick a tag to start highlighting</span>
                        )}
                      </span>
                      <span className="text-[#B8BCC2]">·</span>
                      <span>
                        Select text with the mouse to tag under the active tag. Segments render as coloured brackets in the gutter.
                      </span>
                      {isPreviewingVersion && (
                        <>
                          <span className="text-[#B8BCC2]">·</span>
                          <span className="font-mono text-[10.5px] text-[#B45309]">archived</span>
                        </>
                      )}
                      {ingestState.status !== 'idle' && ingestState.message && (
                        <>
                          <span className="text-[#B8BCC2]">·</span>
                          <span
                            className={
                              ingestState.status === 'error'
                                ? 'font-mono text-[10.5px] text-[#B83230]'
                                : 'font-mono text-[10.5px] text-[#00928F]'
                            }
                          >
                            {ingestState.status === 'error' ? 'Ingest failed — ' : 'Ingested · '}
                            {ingestState.message}
                          </span>
                        </>
                      )}
                      {classifyState.status !== 'idle' && classifyState.message && (
                        <>
                          <span className="text-[#B8BCC2]">·</span>
                          <span
                            className={
                              classifyState.status === 'error'
                                ? 'font-mono text-[10.5px] text-[#B83230]'
                                : 'font-mono text-[10.5px] text-[#7C3AED]'
                            }
                          >
                            {classifyState.status === 'error' ? 'AI tag failed — ' : 'AI tags · '}
                            {classifyState.message}
                          </span>
                        </>
                      )}
                      {suggestState.status !== 'idle' && suggestState.message && (
                        <>
                          <span className="text-[#B8BCC2]">·</span>
                          <span
                            className={
                              suggestState.status === 'error'
                                ? 'font-mono text-[10.5px] text-[#B83230]'
                                : 'font-mono text-[10.5px] text-[#16A34A]'
                            }
                          >
                            {suggestState.status === 'error' ? 'Suggest failed — ' : 'Suggested · '}
                            {suggestState.message}
                          </span>
                        </>
                      )}
                    </div>
                    {(() => {
                      const hasCachedPdf =
                        !!viewerDocument?.celexNumber &&
                        (viewerDocument.ingestSource === 'eurlex-pdf' ||
                          viewerDocument.ingestSource === 'manual-upload');
                      const showPdf =
                        !!viewerDocument &&
                        !isPreviewingVersion &&
                        hasCachedPdf &&
                        !!viewerDocument.blocks &&
                        viewerDocument.blocks.length > 0;
                      return (
                        <>
                          {incomingContext && (
                            <div className="flex items-start justify-between gap-3 px-3 py-2 border-b border-[#C7E4E0] bg-[#E8F4F2]">
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase tracking-wider text-[#00928F] font-semibold">
                                  Opened from Policy Navigator
                                </p>
                                <p className="text-[11px] text-[#1F2937] mt-0.5 leading-snug">
                                  {incomingContext}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIncomingContext(null)}
                                className="shrink-0 text-[#00928F] hover:text-[#007B6C] p-0.5"
                                aria-label="Dismiss"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                          {viewerDocument && viewerDocument.blocks && viewerDocument.blocks.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#E6E7E8] bg-white">
                              <span className="font-mono text-[10px] text-[#8A95A3]">
                                {isPreviewingVersion
                                  ? 'Archived version · tagging disabled'
                                  : showPdf
                                    ? 'Original PDF with block overlays'
                                    : 'Flat-text view · ingest or upload a PDF to enable the PDF pane'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setDocSearchOpen(o => !o);
                                  if (!docSearchOpen) {
                                    setTimeout(() => docSearchInputRef.current?.focus(), 0);
                                  }
                                }}
                                className="ml-auto text-[11px] font-medium text-[#3D5265] hover:text-[#00928F]"
                                title="Search within this document · ⌘F"
                              >
                                {docSearchOpen ? 'Hide find' : 'Find in document · ⌘F'}
                              </button>
                            </div>
                          )}
                          {docSearchOpen && (
                            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#E6E7E8] bg-[#FBFBFA]">
                              <input
                                ref={docSearchInputRef}
                                type="search"
                                value={docSearchQuery}
                                onChange={e => setDocSearchQuery(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Escape') {
                                    setDocSearchOpen(false);
                                  } else if (e.key === 'Enter') {
                                    if (docSearchTotal === 0) return;
                                    setDocSearchHitIndex(i =>
                                      e.shiftKey
                                        ? (i - 1 + docSearchTotal) % docSearchTotal
                                        : (i + 1) % docSearchTotal,
                                    );
                                  }
                                }}
                                placeholder="Find in document…"
                                className="flex-1 max-w-[280px] border border-[#E6E7E8] rounded-sm px-2 py-1 text-[12px] focus:border-[#00928F] focus:outline-none"
                                aria-label="Find in document"
                              />
                              <span className="font-mono text-[10.5px] tabular-nums text-[#8A95A3] min-w-[60px]">
                                {docSearchTotal === 0
                                  ? (docSearchQuery.trim().length >= 2 ? '0 / 0' : '—')
                                  : `${docSearchHitIndex + 1} / ${docSearchTotal}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => docSearchTotal > 0 && setDocSearchHitIndex(i => (i - 1 + docSearchTotal) % docSearchTotal)}
                                disabled={docSearchTotal === 0}
                                className="px-1.5 py-0.5 text-[12px] text-[#3D5265] hover:bg-[#F3F4F6] disabled:text-[#B8BCC2] rounded-sm"
                                aria-label="Previous match"
                                title="Previous match · Shift+Enter"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => docSearchTotal > 0 && setDocSearchHitIndex(i => (i + 1) % docSearchTotal)}
                                disabled={docSearchTotal === 0}
                                className="px-1.5 py-0.5 text-[12px] text-[#3D5265] hover:bg-[#F3F4F6] disabled:text-[#B8BCC2] rounded-sm"
                                aria-label="Next match"
                                title="Next match · Enter"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => { setDocSearchOpen(false); setDocSearchQuery(''); }}
                                className="px-1.5 py-0.5 text-[12px] text-[#8A95A3] hover:text-[#3D5265]"
                                aria-label="Close search"
                                title="Close · Esc"
                              >
                                ×
                              </button>
                            </div>
                          )}
                          <div className="p-4 max-h-[68vh] overflow-y-auto">
                            {showPdf && viewerDocument ? (
                              <PdfDocumentView
                                document={viewerDocument}
                                pdfSrcUrl={`/api/content-analysis/pdf?celex=${encodeURIComponent(viewerDocument.celexNumber!)}`}
                                segments={segmentsForDocument}
                                codes={snapshot.codes}
                                highlightedBlockId={highlightedSegmentId?.startsWith('block-') ? highlightedSegmentId : null}
                                onSelectBlock={id => setHighlightedSegmentId(id)}
                              />
                            ) : (
                              <AnnotatedDocumentView
                                document={viewerDocument ?? selectedDocument}
                                segments={isPreviewingVersion ? [] : segmentsForDocument}
                                codes={snapshot.codes}
                                activeCodeId={isPreviewingVersion ? null : selectedCodeId}
                                onCreateSegment={isPreviewingVersion ? () => {} : handleCreateSegment}
                                onSelectSegment={id => setHighlightedSegmentId(id)}
                                highlightedSegmentId={highlightedSegmentId}
                                onSelectionWithoutCode={isPreviewingVersion ? undefined : (sel) => {
                                  if (!guardEdit()) return;
                                  setToolbarSel({
                                    startChar: sel.startChar,
                                    endChar: sel.endChar,
                                    text: sel.text,
                                    rect: sel.rect,
                                  });
                                }}
                                onDeleteSegment={isPreviewingVersion ? undefined : (id) => {
                                  if (!guardEdit()) return;
                                  if (window.confirm('Delete this tagged segment?')) {
                                    deleteSegment(id);
                                    if (highlightedSegmentId === id) setHighlightedSegmentId(null);
                                  }
                                }}
                                onUpdateSegmentRange={isPreviewingVersion ? undefined : (id, next) => {
                                  if (!guardEdit()) return;
                                  updateSegmentRange(id, next);
                                }}
                                searchQuery={docSearchOpen ? docSearchQuery : ''}
                                searchHitIndex={docSearchHitIndex}
                                onSearchMatchesChange={setDocSearchTotal}
                              />
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <div className="p-6 text-[12.5px] italic text-[#8A95A3]">
                    No document selected.
                  </div>
                )}
              </Panel>
            </main>

            {/* RIGHT: segments + project config */}
            <aside className="flex flex-col gap-4 min-h-0">
              {activeProject && activeProject.id !== 'project-master' && (
                <Panel title="Project scope" accent="master tags">
                  <div className="px-3 py-2 text-[11.5px] text-[#3D5265]/80 border-b border-[#E6E7E8]">
                    Tick master tags to include in this project&apos;s corpus. Empty ⇒ whole library.
                  </div>
                  <CodeSystemTree
                    codes={snapshot.codes.filter(c => c.scope === 'master')}
                    counts={codeCountsDirect}
                    selectedCodeId={null}
                    onSelect={() => {}}
                    onAddChild={() => {}}
                    onRename={() => {}}
                    onRecolor={() => {}}
                    onDelete={() => {}}
                    selection={new Set(activeProject.masterCodeSelection)}
                    onToggleSelect={toggleMasterCodeInProject}
                  />
                </Panel>
              )}

              {selectedDocument && (
                <Panel
                  title="AI tag suggestions"
                  accent={pendingSuggestions.length > 0 ? `${pendingSuggestions.length} pending` : 'track changes'}
                  bodyClassName="p-0"
                >
                  <CodeSuggestionsPanel
                    suggestions={pendingSuggestions}
                    codes={snapshot.codes}
                    onAccept={handleAcceptSuggestion}
                    onReject={rejectSuggestion}
                    onAcceptAll={handleAcceptAllSuggestions}
                    onRejectAll={handleRejectAllSuggestions}
                    onJump={(sugg) => handleJumpToSuggestion(sugg)}
                  />
                </Panel>
              )}

              {selectedDocument?.aiClassifications && selectedDocument.aiClassifications.length > 0 && (
                <Panel
                  title="AI master tags"
                  accent={`${selectedDocument.aiClassifications.length} · ${selectedDocument.shortTitle}`}
                  bodyClassName="p-0"
                  collapsible
                  defaultCollapsed
                >
                  <AiClassificationsList
                    classifications={selectedDocument.aiClassifications}
                    codes={snapshot.codes}
                    taggedAt={selectedDocument.aiTaggedAt}
                    onOpenBlock={(blockId) => {
                      // Find the matching segment or scroll hook — for now
                      // we just echo the block id into the highlight state.
                      setHighlightedSegmentId(blockId);
                    }}
                  />
                </Panel>
              )}

              <Panel title="Tagged segments" accent={`${segmentsForDocument.length}`} bodyClassName="p-0 flex flex-col min-h-0">
                <div className="max-h-[60vh] overflow-hidden flex">
                  <SegmentsList
                    segments={segmentsForDocument}
                    codes={snapshot.codes}
                    documents={snapshot.documents}
                    selectedSegmentId={highlightedSegmentId}
                    onOpenSegment={openSegmentInDoc}
                    onDelete={id => {
                      if (!guardEdit()) return;
                      if (window.confirm('Delete this tagged segment?')) {
                        deleteSegment(id);
                        if (highlightedSegmentId === id) setHighlightedSegmentId(null);
                      }
                    }}
                  />
                </div>
              </Panel>

              {/* Visual overview: bar / coverage strip / matrix breakdown
                  for the current document. Honours the active-code filter
                  (segmentsForDocument is already filtered upstream). */}
              <Panel
                title="Tag distribution"
                accent={selectedDocument ? selectedDocument.shortTitle : ''}
                bodyClassName="p-0"
                collapsible
                defaultCollapsed
              >
                <TagDistributionPanel
                  documents={selectedDocument ? [selectedDocument] : []}
                  codes={snapshot.codes}
                  segments={segmentsForDocument}
                  selectedCodeId={selectedCodeId}
                />
              </Panel>

              {/* Word-table preview (M·05 #8). Shows the user exactly what
                  the export will look like; click "Copy for Word" puts an
                  HTML table on the clipboard that pastes natively into
                  Word as a real table. */}
              <Panel title="Export to Word" accent="preview" bodyClassName="p-3">
                <SegmentsTablePreview
                  segments={segmentsForDocument}
                  codes={snapshot.codes}
                  documents={snapshot.documents}
                />
              </Panel>

              {/* Numeric extractions — mixed-methods workflow. Pulls in
                  every project segment that carries a `numeric` payload
                  (across the project's documents, not just the current
                  one) so analysts can build a single budget table from a
                  whole corpus pass. */}
              <Panel
                title="Numeric extractions"
                accent={`${projectSegments.filter(s => s.numeric).length}`}
                bodyClassName="p-0"
                collapsible
                defaultCollapsed
              >
                <NumericExtractionsPanel
                  segments={projectSegments}
                  codes={snapshot.codes}
                  documents={snapshot.documents}
                  onUpdate={(id, n) => { if (guardEdit()) updateSegmentNumeric(id, n); }}
                  onDelete={(id) => { if (guardEdit()) deleteSegment(id); }}
                  onJump={openSegmentInDoc}
                />
              </Panel>

              {/* Snapshot history — manual + every-5-min auto-save of the
                  code system and segments. Lives in localStorage, separate
                  from the main state, so reset-to-seed leaves it intact. */}
              <Panel
                title="Snapshots"
                accent="auto-save · 5 min"
                bodyClassName="p-0"
                collapsible
                defaultCollapsed
              >
                <SnapshotsPanel
                  codes={snapshot.codes}
                  segments={snapshot.segments}
                  onRestore={(codes, segments) => {
                    if (!guardEdit()) return;
                    restoreCodesAndSegments(codes, segments);
                    showToast({
                      tone: 'success',
                      message: `Restored ${codes.length} tag${codes.length === 1 ? '' : 's'} and ${segments.length} segment${segments.length === 1 ? '' : 's'}.`,
                    });
                  }}
                />
              </Panel>
            </aside>
          </div>
        </section>
      )}

      {activeTab === 'horizontal' && (
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <h2 className="text-[18px] font-bold text-[#3D5265]">Horizontal policy coherence</h2>
          <p className="mt-1 text-[12.5px] text-[#3D5265]/75 max-w-3xl leading-relaxed">
            Cross-document view across the current project scope. Each cell counts tagged segments under a top-level concept.
          </p>
          <div className="mt-4 border border-[#E6E7E8] rounded-sm bg-white p-3 sm:p-4">
            <HorizontalCoherenceView
              documents={docsInScope}
              codes={snapshot.codes}
              segments={projectSegments}
            />
          </div>
        </section>
      )}

      {activeTab === 'vertical' && (
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <AnalysisPlaceholder mode="vertical" />
        </section>
      )}
      {activeTab === 'longitudinal' && (
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <AnalysisPlaceholder mode="longitudinal" />
        </section>
      )}
      {activeTab === 'outcomes' && (
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <AnalysisPlaceholder mode="outcomes" />
        </section>
      )}

      <footer className="mt-6 border-t border-[#E6E7E8] bg-[#FBFBFA]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 text-[11.5px] text-[#8A95A3] leading-relaxed">
          <strong className="text-[#3D5265]">Roadmap.</strong> Ingest direct EUR-Lex PDFs (not just extracted plaintext) so successive versions render faithfully and line numbering is stable across exports. AI-assign master tags at ingestion so the whole corpus is pre-tagged before project scoping. Wire segments as an exportable dataset (CSV done; JSON + Excel planned). Add vertical, longitudinal and outcomes views once the required document kinds and indicator joins are in place.
        </div>
      </footer>
        </>
      )}

      {/* Inline toast removed — typed ToastHost in the root layout renders all toasts now. */}

      <FloatingCodeToolbar
        selection={toolbarSel}
        activeCode={snapshot.codes.find(c => c.id === selectedCodeId) ?? null}
        codes={snapshot.codes.filter(c => c.scope === 'master' || (c.scope === 'project' && c.projectId === activeProjectId))}
        onApply={() => {
          if (!toolbarSel) return;
          handleCreateSegment({
            blockId: toolbarSel.blockId,
            startChar: toolbarSel.startChar,
            endChar: toolbarSel.endChar,
            text: toolbarSel.text,
          });
          // Clear the native selection + the toolbar.
          window.getSelection()?.removeAllRanges();
          setToolbarSel(null);
        }}
        onSplit={() => {
          if (!guardEdit()) return;
          if (!toolbarSel || !selectedDocument) return;
          // Splitting is only meaningful in the structured-block (PDF)
          // view; in the flat-text view there's no block to split.
          if (toolbarSel.blockId) {
            splitBlock(selectedDocument.id, toolbarSel.blockId, toolbarSel.startChar);
          }
          window.getSelection()?.removeAllRanges();
          setToolbarSel(null);
        }}
        onCreateAndApply={(suggestedName) => {
          if (!guardEdit()) return;
          if (!toolbarSel) return;
          // Open the code editor pre-filled, and stash the selection so
          // submitting the modal also creates the segment under the new tag.
          setCodeEditor({
            mode: 'add',
            targetId: null,
            seedName: suggestedName,
            pendingSegmentInput: {
              blockId: toolbarSel.blockId,
              startChar: toolbarSel.startChar,
              endChar: toolbarSel.endChar,
              text: toolbarSel.text,
            },
          });
          window.getSelection()?.removeAllRanges();
          setToolbarSel(null);
        }}
        onPickCode={(codeId) => {
          setSelectedCodeId(codeId);
        }}
        onExtractNumber={() => {
          if (!guardEdit()) return;
          if (!toolbarSel || !selectedDocument || !activeProject) return;
          // The numeric extraction still needs a qualitative tag. Use the
          // current active code if any; otherwise prompt the user to pick.
          if (!selectedCodeId) {
            showToast({
              tone: 'warning',
              message: 'Pick a tag first',
              description: 'Numbers stay attached to a qualitative tag (e.g. "Adaptation budget"). Pick one from the toolbar, then extract again.',
            });
            return;
          }
          const numeric = guessNumericExtraction(toolbarSel.text);
          upsertDocument(selectedDocument);
          const seg = addSegment({
            documentId: selectedDocument.id,
            codeId: selectedCodeId,
            startChar: toolbarSel.startChar,
            endChar: toolbarSel.endChar,
            text: toolbarSel.text,
            blockId: toolbarSel.blockId,
            projectId: activeProject.id === 'project-master' ? null : activeProject.id,
            numeric,
          });
          setHighlightedSegmentId(seg.id);
          window.getSelection()?.removeAllRanges();
          setToolbarSel(null);
          const ok = Number.isFinite(numeric.value);
          showToast({
            tone: ok ? 'success' : 'warning',
            message: ok
              ? `Extracted ${numeric.value}${numeric.unit ? ' ' + numeric.unit : ''}`
              : 'Couldn’t parse a number — edit the value in the right panel.',
          });
        }}
        onClear={() => {
          window.getSelection()?.removeAllRanges();
          setToolbarSel(null);
        }}
      />

      <CodeEditorModal
        open={!!codeEditor}
        payload={codeEditor}
        codes={snapshot.codes}
        onCancel={() => setCodeEditor(null)}
        onSubmit={(result) => {
          if (!guardEdit()) return;
          handleCodeEditorSubmit(result);
        }}
        onMerge={(sourceId, targetId) => {
          if (!guardEdit()) return;
          const result = mergeCode(sourceId, targetId);
          if (result === null) {
            showToast({
              tone: 'danger',
              message: 'Merge rejected',
              description: 'Target tag is a descendant of the source.',
            });
            return;
          }
          if (selectedCodeId === sourceId) {
            setSelectedCodeId(targetId);
          }
          // Reversible merge UI (M·05 #5): 15-second undo window.
          const targetName = snapshot.codes.find(c => c.id === targetId)?.name ?? 'tag';
          showToast({
            tone: 'primary',
            message: `Merged ${result.reassigned} segment${result.reassigned === 1 ? '' : 's'} into "${targetName}"`,
            actionLabel: 'Undo',
            onAction: () => {
              result.undo();
              setSelectedCodeId(sourceId);
            },
            timeoutMs: 15000,
          });
        }}
        onMove={(id, newParentId) => {
          if (!guardEdit()) return;
          if (!moveCode(id, newParentId)) {
            window.alert('Cannot move: target parent is inside the moved subtree.');
          }
        }}
        segmentCount={
          codeEditor?.targetId
            ? snapshot.segments.filter(s => s.codeId === codeEditor.targetId).length
            : 0
        }
      />
    </div>
    </TooltipProvider>
  );
}

// ── Small internal UI helpers ──────────────────────────────────────────────
function Panel({
  title,
  accent,
  action,
  children,
  bodyClassName,
  collapsible,
  defaultCollapsed,
}: {
  title: string;
  accent?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  /** When true, renders a chevron toggle in the header that hides the body. */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);
  const toggle = () => setCollapsed(c => !c);
  return (
    <section className="border border-[#E6E7E8] rounded-sm bg-white flex flex-col min-h-0">
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA]">
        <div
          className={`flex items-baseline gap-2 min-w-0 ${collapsible ? 'cursor-pointer select-none' : ''}`}
          onClick={collapsible ? toggle : undefined}
          role={collapsible ? 'button' : undefined}
          aria-expanded={collapsible ? !collapsed : undefined}
        >
          {collapsible && (
            <span
              aria-hidden
              className={`text-[#8A95A3] text-[10px] transition-transform ${collapsed ? '' : 'rotate-90'}`}
            >
              ▶
            </span>
          )}
          <h3 className="text-[12.5px] font-bold text-[#3D5265] truncate">{title}</h3>
          {accent != null && (
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#8A95A3]">
              {accent}
            </span>
          )}
        </div>
        {action}
      </header>
      {!collapsed && <div className={bodyClassName ?? 'p-0'}>{children}</div>}
    </section>
  );
}

function ActiveCodeBadge({ codeId, codes }: { codeId: string; codes: import('@/lib/content-analysis/types').CodeNode[] }) {
  const code = codes.find(c => c.id === codeId);
  if (!code) return <span className="italic text-[#8A95A3]">Unknown</span>;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium text-white px-1.5 py-0.5 rounded-sm"
      style={{ backgroundColor: code.color }}
    >
      {code.name}
    </span>
  );
}
