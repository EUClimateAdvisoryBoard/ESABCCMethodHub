'use client';
/**
 * Summarise lens (M·05 "outcomes" tab).
 * -------------------------------------
 * A read-across of every whole-document summary in the project corpus — the
 * narrative layer on top of the coded segments. Now that summaries are a
 * first-class, shared artefact (text + slide decks), this turns the old
 * placeholder into a real deck the team can skim: one card per document that
 * has a summary, the active project's take expanded inline, other projects'
 * takes available read-only.
 *
 * It reuses the shared `DocumentSummaryPanel` in read-only mode so the slide
 * rendering and lazy-loading behave exactly as they do in the coding view.
 */
import DocumentSummaryPanel from './DocumentSummaryPanel';
import type { AnalysisDocument, DocumentSummary, SummaryBlock } from '@/lib/content-analysis/types';

export default function ProjectSummariesView({
  documents,
  summaries,
  activeProjectId,
  projectNameById,
  onLoadBlocks,
  onOpenDocument,
}: {
  /** Documents in the current project scope. */
  documents: AnalysisDocument[];
  /** All summaries in the store (filtered to the corpus here). */
  summaries: DocumentSummary[];
  /** The active project's id, or null for the master library. */
  activeProjectId: string | null;
  projectNameById: Map<string | null, string>;
  onLoadBlocks: (id: string) => Promise<SummaryBlock[]>;
  /** Jump to the coding view with this document selected. */
  onOpenDocument: (documentId: string) => void;
}) {
  const byDoc = new Map<string, DocumentSummary[]>();
  for (const s of summaries) {
    const arr = byDoc.get(s.documentId);
    if (arr) arr.push(s);
    else byDoc.set(s.documentId, [s]);
  }

  const docsWithSummaries = documents
    .filter(d => byDoc.has(d.id))
    .sort((a, b) => (a.shortTitle || a.title).localeCompare(b.shortTitle || b.title));

  const total = docsWithSummaries.reduce((n, d) => n + (byDoc.get(d.id)?.length ?? 0), 0);

  if (docsWithSummaries.length === 0) {
    return (
      <div className="border border-dashed border-[#B8BCC2] rounded-sm bg-[#FBFBFA] p-5 sm:p-6 max-w-3xl">
        <h3 className="text-[18px] font-bold text-[#3D5265]">No summaries yet</h3>
        <p className="mt-2 text-[13px] text-[#3D5265]/80 leading-relaxed">
          Write a whole-document summary from the <strong>Code</strong> tab — open a document and use the
          <strong> Summary</strong> panel. Summaries you and other projects write appear here as a single
          narrative read-across of the corpus, with their slide decks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-[18px] font-bold text-[#3D5265]">Summaries across the corpus</h2>
      <p className="text-[12.5px] text-[#3D5265]/75 max-w-3xl leading-relaxed">
        {total} summar{total === 1 ? 'y' : 'ies'} across {docsWithSummaries.length} document
        {docsWithSummaries.length === 1 ? '' : 's'}. Each card shows this project&apos;s take expanded;
        other projects&apos; summaries are available read-only for context.
      </p>
      <div className="space-y-3">
        {docsWithSummaries.map(d => {
          const all = byDoc.get(d.id)!;
          const own = all.find(s => s.projectId === activeProjectId) ?? all[0];
          const others = all.filter(s => s !== own);
          return (
            <div key={d.id} className="border border-[#E6E7E8] rounded-sm bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA]">
                <h3 className="text-[12.5px] font-bold text-[#3D5265] truncate">{d.shortTitle || d.title}</h3>
                <button
                  type="button"
                  onClick={() => onOpenDocument(d.id)}
                  className="shrink-0 text-[11px] font-medium text-[#00928F] hover:text-[#006F6C]"
                  title="Open this document in the coding view"
                >
                  Open ↗
                </button>
              </div>
              <DocumentSummaryPanel
                summary={own}
                otherSummaries={others}
                projectNameById={projectNameById}
                onSave={() => {}}
                onLoadBlocks={onLoadBlocks}
                readOnly
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
