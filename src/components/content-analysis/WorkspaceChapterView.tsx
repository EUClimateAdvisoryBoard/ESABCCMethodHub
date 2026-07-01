'use client';

// ---------------------------------------------------------------------------
// Chapter view — a literature list per report chapter.
//
// Where the Code view is scoped to one source tier at a time, the Chapter view
// reads ACROSS every tier: it groups the whole workspace corpus by the chapter
// (report-chapter / sector) tag each document carries, then splits each chapter
// into its policy, scientific and grey-literature sources. The result is a
// ready-made reading list per chapter — "everything we have lined up for the
// Industry chapter" — so the report can be structured around its chapters from
// the moment documents are tagged.
//
// Each document is more than a link: every row carries a NOTE button and a
// SUMMARY button so the team can see at a glance which papers already have an
// angle note or a summary. The Note button jots the paper's ANGLE — what it
// argues and how it comes into the chapter — and the Summary button reveals its
// whole-document summary (written on the Analyse tab, shown here read-only). The
// angle note is stored as the document's own-project summary lead text, so it
// is the same shared artefact the Analyse tab reads and writes; a note added
// here shows up there and vice-versa.
//
// Chapter tags are a document-level dimension stored in the shared overall-tags
// table (see lib/content-analysis/chapter-tags.ts); this view only reads them,
// the tagging happens in the Code view's document header.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import {
  CHAPTER_TAGS,
  resolveOverallTag,
  sourceTierOf,
  documentKindLabel,
  SOURCE_TIER_META,
  SOURCE_TIERS,
  type AnalysisDocument,
  type DocumentSummary,
  type SummaryBlock,
} from '@/lib/content-analysis/service';
import DocumentSummaryPanel from './DocumentSummaryPanel';

export interface WorkspaceChapterViewProps {
  /** Every document in the workspace corpus, across all source tiers. */
  documents: AnalysisDocument[];
  /** Chapter-tag ids applied to each document, keyed by document id. */
  chapterIdsByDoc: Record<string, string[]>;
  /** Every whole-document summary in the store — the angle note (lead text) and
   *  the rich slide deck. Filtered to the open document inside each row. */
  summaries: DocumentSummary[];
  /** The active workspace project id — its summary is the editable angle note;
   *  other projects' summaries are shown read-only for context. */
  activeProjectId: string;
  /** Maps a summary's projectId (null = master) to a human label. */
  projectNameById: Map<string | null, string>;
  /** Lazy-load a summary's rich slide deck (see DocumentSummaryPanel). */
  onLoadBlocks: (id: string) => Promise<SummaryBlock[]>;
  /** Save the paper's angle for a document — persisted as its own-project
   *  summary lead text, preserving any existing slide deck. */
  onSaveAngle: (doc: AnalysisDocument, text: string) => Promise<void> | void;
  /** Open a document in the Code view (switches to its source tier). */
  onOpenDocument: (doc: AnalysisDocument) => void;
}

export default function WorkspaceChapterView({
  documents,
  chapterIdsByDoc,
  summaries,
  activeProjectId,
  projectNameById,
  onLoadBlocks,
  onSaveAngle,
  onOpenDocument,
}: WorkspaceChapterViewProps) {
  // Summaries grouped by document id, resolved once for every row below.
  const summariesByDoc = useMemo(() => {
    const m = new Map<string, DocumentSummary[]>();
    for (const s of summaries) {
      const arr = m.get(s.documentId);
      if (arr) arr.push(s);
      else m.set(s.documentId, [s]);
    }
    return m;
  }, [summaries]);

  const { chapters, unassigned, assignedCount } = useMemo(() => {
    // Chapter order: the seeded ESABCC chapters first (report order), then any
    // custom chapters coined by hand, alphabetically.
    const order: string[] = [];
    const seen = new Set<string>();
    for (const c of CHAPTER_TAGS) {
      order.push(c.id);
      seen.add(c.id);
    }
    const custom: string[] = [];
    for (const ids of Object.values(chapterIdsByDoc)) {
      for (const id of ids) {
        if (!seen.has(id)) {
          seen.add(id);
          custom.push(id);
        }
      }
    }
    custom.sort((a, b) =>
      (resolveOverallTag(a)?.name ?? a).localeCompare(resolveOverallTag(b)?.name ?? b),
    );
    order.push(...custom);

    const byChapter = new Map<string, AnalysisDocument[]>();
    const noChapter: AnalysisDocument[] = [];
    let assigned = 0;
    for (const d of documents) {
      const chs = chapterIdsByDoc[d.id] ?? [];
      if (chs.length === 0) {
        noChapter.push(d);
        continue;
      }
      assigned += 1;
      for (const ch of chs) {
        const list = byChapter.get(ch);
        if (list) list.push(d);
        else byChapter.set(ch, [d]);
      }
    }

    const sortByTitle = (a: AnalysisDocument, b: AnalysisDocument) =>
      (a.shortTitle || a.title).localeCompare(b.shortTitle || b.title);

    const chapters = order
      .filter(id => byChapter.has(id))
      .map(id => ({
        id,
        code: resolveOverallTag(id),
        docs: (byChapter.get(id) ?? []).slice().sort(sortByTitle),
      }));

    return {
      chapters,
      unassigned: noChapter.slice().sort(sortByTitle),
      assignedCount: assigned,
    };
  }, [documents, chapterIdsByDoc]);

  if (documents.length === 0) {
    return (
      <div className="border border-grey-200 rounded-lg bg-white p-8 text-center">
        <p className="text-sm text-tertiary max-w-md mx-auto">
          No documents in this workspace yet. Add policy, scientific or
          grey-literature documents in the <strong>Code</strong> view and tag
          each with the report chapter it belongs to — they will collect here as
          a reading list per chapter.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-grey-50 border border-grey-200 rounded-lg p-3">
        <h3 className="text-[13px] font-semibold text-tertiary-dark">
          Literature by chapter
        </h3>
        <p className="text-[11px] text-tertiary-light mt-1">
          Every document you have tagged with a chapter, grouped by report
          chapter and split into policy, scientific and grey sources.{' '}
          <strong>{assignedCount}</strong> of {documents.length} document
          {documents.length === 1 ? '' : 's'} assigned to a chapter. Use each
          document’s <strong>Note</strong> button to jot its <strong>angle</strong>{' '}
          — how it comes into the chapter — and <strong>Summary</strong> to show
          its whole-document summary from the Analyse tab. Set a document’s
          chapter from its header in the <strong>Code</strong> view.
        </p>
      </div>

      {chapters.length === 0 && (
        <p className="text-[12px] text-tertiary px-1">
          No documents have a chapter yet. Open a document in the Code view and
          use “Set chapter” in its header.
        </p>
      )}

      {chapters.map(({ id, code, docs }) => {
        const color = code?.color ?? '#6667AB';
        const name = code?.name ?? 'Chapter';
        const tiers = SOURCE_TIERS.filter(t => docs.some(d => sourceTierOf(d) === t));
        return (
          <section key={id} className="border border-grey-200 rounded-lg bg-white overflow-hidden">
            <div
              className="px-3 py-2 flex items-center justify-between gap-2 border-b border-grey-200"
              style={{ backgroundColor: `${color}12` }}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-flex items-center text-[11px] font-semibold text-white rounded px-2 py-0.5"
                  style={{ backgroundColor: color }}
                >
                  {name}
                </span>
              </span>
              <span className="text-[10px] font-mono text-tertiary-light">
                {docs.length} document{docs.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="px-3 py-2 grid gap-3 sm:grid-cols-3">
              {tiers.map(tier => {
                const tierDocs = docs.filter(d => sourceTierOf(d) === tier);
                return (
                  <div key={tier} className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-1 flex items-center gap-1">
                      <span aria-hidden>{SOURCE_TIER_META[tier].icon}</span>
                      {SOURCE_TIER_META[tier].label}
                      <span className="font-mono text-tertiary-light">({tierDocs.length})</span>
                    </div>
                    <ul className="space-y-1">
                      {tierDocs.map(d => (
                        <ChapterDocRow
                          key={d.id}
                          doc={d}
                          summaries={summariesByDoc.get(d.id) ?? []}
                          activeProjectId={activeProjectId}
                          projectNameById={projectNameById}
                          onLoadBlocks={onLoadBlocks}
                          onSaveAngle={onSaveAngle}
                          onOpenDocument={onOpenDocument}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {unassigned.length > 0 && (
        <section className="border border-dashed border-grey-300 rounded-lg bg-white overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-grey-200 bg-grey-50">
            <span className="text-[11px] font-semibold text-tertiary">
              No chapter yet
            </span>
            <span className="text-[10px] font-mono text-tertiary-light">
              {unassigned.length} document{unassigned.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="px-3 pt-2 text-[10px] text-tertiary-light">
            These documents are in the workspace but not yet assigned to a
            chapter — open one and set its chapter to file it above.
          </p>
          <ul className="px-3 py-2 grid gap-1 sm:grid-cols-3">
            {unassigned.map(d => (
              <ChapterDocRow
                key={d.id}
                doc={d}
                summaries={summariesByDoc.get(d.id) ?? []}
                activeProjectId={activeProjectId}
                projectNameById={projectNameById}
                onLoadBlocks={onLoadBlocks}
                onSaveAngle={onSaveAngle}
                onOpenDocument={onOpenDocument}
                subtitle={`${SOURCE_TIER_META[sourceTierOf(d)].label} · ${documentKindLabel(d)}`}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── One document in the chapter list ───────────────────────────────────────
// Collapsed, it is the same compact title button as before. Expanded, it adds
// two things the team asked for on the chapter view: a note for the paper's
// ANGLE (how it comes into the chapter) and a "Show summary" toggle that
// reveals the whole-document summary from the Analyse tab, read-only.
function ChapterDocRow({
  doc,
  summaries,
  activeProjectId,
  projectNameById,
  onLoadBlocks,
  onSaveAngle,
  onOpenDocument,
  subtitle,
}: {
  doc: AnalysisDocument;
  summaries: DocumentSummary[];
  activeProjectId: string;
  projectNameById: Map<string | null, string>;
  onLoadBlocks: (id: string) => Promise<SummaryBlock[]>;
  onSaveAngle: (doc: AnalysisDocument, text: string) => Promise<void> | void;
  onOpenDocument: (doc: AnalysisDocument) => void;
  /** Extra line under the title (used in the "No chapter yet" list). */
  subtitle?: string;
}) {
  const own = summaries.find(s => s.projectId === activeProjectId) ?? null;
  const others = summaries.filter(s => s !== own);
  const angle = own?.text?.trim() ?? '';

  // Does any project have a whole-document summary to show here? (The angle note
  // is this project's summary lead text; a "summary" proper is a richer deck or
  // another project's take, surfaced read-only.)
  const summarySlideCount = summaries.reduce(
    (n, s) => n + (s.blockCount ?? s.blocks?.length ?? 0),
    0,
  );
  const hasSummary = summarySlideCount > 0 || others.some(s => (s.text ?? '').trim());

  const [expanded, setExpanded] = useState(false);
  const [editingAngle, setEditingAngle] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setDraft(own?.text ?? '');
    setEditingAngle(true);
    setExpanded(true);
  };

  // The inline "Note" button on the collapsed row: expand and jump straight into
  // the angle editor when there's nothing yet, otherwise reveal what's there.
  const openNote = () => {
    setExpanded(true);
    if (!angle) startEditing();
  };

  // The inline "Summary" button: expand with the summary deck already open.
  const openSummary = () => {
    setSummaryOpen(true);
    setExpanded(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSaveAngle(doc, draft);
      setEditingAngle(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded border border-transparent hover:border-grey-200">
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => setExpanded(o => !o)}
          className="flex-1 min-w-0 text-left px-2 py-1 rounded hover:bg-grey-50 text-[11px] text-tertiary-dark leading-snug"
          title={expanded ? 'Collapse' : 'Expand to add an angle note or show the summary'}
        >
          <span className="inline-flex items-start gap-1">
            <span aria-hidden className="text-tertiary-light mt-[1px]">{expanded ? '▾' : '▸'}</span>
            <span className="min-w-0">
              {doc.shortTitle || doc.title}
              {doc.referenceYear && (
                <span className="text-tertiary-light ml-1">({doc.referenceYear})</span>
              )}
              <span className="block text-[9px] uppercase tracking-wide text-tertiary-light mt-0.5">
                {subtitle ?? documentKindLabel(doc)}
              </span>
            </span>
          </span>
        </button>
        {/* Note + Summary shortcuts, visible on the collapsed row so the team
            can see at a glance which documents carry an angle note or a summary
            — and add a note without hunting for the expander. A filled style
            marks the ones that already have content. */}
        <div className="shrink-0 flex items-center gap-1 pt-1">
          <button
            type="button"
            onClick={openNote}
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold border transition ${
              angle
                ? 'border-secondary text-secondary bg-secondary/10 hover:bg-secondary hover:text-white'
                : 'border-grey-200 text-tertiary-light hover:border-secondary hover:text-secondary'
            }`}
            title={angle ? 'Edit this paper’s angle note' : 'Add a note on how this comes into the chapter'}
          >
            <span aria-hidden>✎</span>
            {angle ? 'Note' : '+ Note'}
          </button>
          <button
            type="button"
            onClick={openSummary}
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold border transition ${
              hasSummary
                ? 'border-secondary text-secondary bg-secondary/10 hover:bg-secondary hover:text-white'
                : 'border-grey-200 text-tertiary-light hover:border-secondary hover:text-secondary'
            }`}
            title={hasSummary ? 'Show the whole-document summary' : 'No summary yet — written on the Analyse tab'}
          >
            <span aria-hidden>▤</span>
            Summary
            {summarySlideCount > 0 && (
              <span className="font-mono">({summarySlideCount})</span>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-2 pb-2 pl-5 space-y-2">
          {/* Angle — what the paper argues and how it comes into the chapter. */}
          <div className="space-y-1">
            {editingAngle ? (
              <div className="space-y-1">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="What’s this paper’s angle — what does it argue, and how does it come into this chapter?"
                  className="w-full px-2 py-1.5 border border-grey-200 rounded text-[11px] leading-snug resize-y"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="px-2 py-0.5 rounded bg-primary text-white text-[10px] font-semibold hover:bg-primary-dark disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save angle'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAngle(false)}
                    className="text-[10px] text-tertiary-light hover:text-tertiary"
                  >
                    Cancel
                  </button>
                  <span className="text-[9px] text-tertiary-light ml-auto">Shared with the team</span>
                </div>
              </div>
            ) : angle ? (
              <div className="space-y-0.5">
                <p className="text-[9px] uppercase tracking-wide text-tertiary-light font-semibold">Angle in this chapter</p>
                <p className="text-[11px] text-tertiary-dark whitespace-pre-wrap leading-snug">{angle}</p>
                <button
                  type="button"
                  onClick={startEditing}
                  className="text-[10px] text-secondary hover:underline"
                >
                  Edit angle
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="text-[10px] text-secondary hover:underline"
              >
                + Add angle note
              </button>
            )}
          </div>

          {/* Summary — the whole-document summary written on the Analyse tab.
              The panel ships its own "Show summary" toggle and lazy-loads the
              slide deck only when opened, so it stays cheap until used. */}
          <div className="border border-grey-200 rounded overflow-hidden">
            <DocumentSummaryPanel
              key={summaryOpen ? 'summary-open' : 'summary-closed'}
              summary={own}
              otherSummaries={others}
              projectNameById={projectNameById}
              onSave={() => {}}
              onLoadBlocks={onLoadBlocks}
              readOnly
              initialOpen={summaryOpen}
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenDocument(doc)}
            className="text-[10px] text-secondary hover:underline"
            title={`Open “${doc.title}” in the Code view`}
          >
            Open in Code view ↗
          </button>
        </div>
      )}
    </li>
  );
}
