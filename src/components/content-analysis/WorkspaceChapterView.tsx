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
// Chapter tags are a document-level dimension stored in the shared overall-tags
// table (see lib/content-analysis/chapter-tags.ts); this view only reads them,
// the tagging happens in the Code view's document header.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import {
  CHAPTER_TAGS,
  resolveOverallTag,
  sourceTierOf,
  documentKindLabel,
  SOURCE_TIER_META,
  SOURCE_TIERS,
  type AnalysisDocument,
} from '@/lib/content-analysis/service';

export interface WorkspaceChapterViewProps {
  /** Every document in the workspace corpus, across all source tiers. */
  documents: AnalysisDocument[];
  /** Chapter-tag ids applied to each document, keyed by document id. */
  chapterIdsByDoc: Record<string, string[]>;
  /** Open a document in the Code view (switches to its source tier). */
  onOpenDocument: (doc: AnalysisDocument) => void;
}

export default function WorkspaceChapterView({
  documents,
  chapterIdsByDoc,
  onOpenDocument,
}: WorkspaceChapterViewProps) {
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
          {documents.length === 1 ? '' : 's'} assigned to a chapter. Set a
          document’s chapter from its header in the <strong>Code</strong> view.
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
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => onOpenDocument(d)}
                            className="w-full text-left px-2 py-1 rounded hover:bg-grey-50 text-[11px] text-tertiary-dark leading-snug"
                            title={`Open “${d.title}” in the Code view`}
                          >
                            {d.shortTitle || d.title}
                            {d.referenceYear && (
                              <span className="text-tertiary-light ml-1">({d.referenceYear})</span>
                            )}
                            <span className="block text-[9px] uppercase tracking-wide text-tertiary-light mt-0.5">
                              {documentKindLabel(d)}
                            </span>
                          </button>
                        </li>
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
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onOpenDocument(d)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-grey-50 text-[11px] text-tertiary-dark leading-snug"
                  title={`Open “${d.title}” in the Code view`}
                >
                  {d.shortTitle || d.title}
                  <span className="block text-[9px] uppercase tracking-wide text-tertiary-light mt-0.5">
                    {SOURCE_TIER_META[sourceTierOf(d)].label} · {documentKindLabel(d)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
