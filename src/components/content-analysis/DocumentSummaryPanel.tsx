'use client';
/**
 * Whole-document summary panel (shared).
 * --------------------------------------
 * A collapsible "comment for the entire paper" attached to the document as a
 * whole — distinct from the passage-level notes on coded segments. Shown for
 * every document kind (policy, scientific, grey).
 *
 * Beyond a plain-text lead, a summary is a little presentation: a deck of
 * slides mixing text, SmartArt-style flowcharts, screenshots and Mermaid
 * diagrams. Those slides are heavy, so they are **lazy-loaded** — the panel
 * ships closed and only fetches the deck (`onLoadBlocks`) when the user opens
 * "Show summary".
 *
 * This is the single summary editor used by BOTH the standalone
 * `/content-analysis` route and the in-workspace `ContentAnalysisModule`, so
 * the rich slide editing stays identical in both. The current project's
 * summary is editable; summaries authored under other projects are shown
 * read-only for context, so the whole team can see each project's take on the
 * same paper.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { DocumentSummary, SummaryBlock } from '@/lib/content-analysis/types';
import { SummaryDeckViewer, SummaryDeckEditor } from './SummaryDeck';

/** Turn plain-text URLs in a summary's lead text into clickable links, so a
 *  pasted reference (e.g. a SharePoint doc) shows as a tidy hyperlink rather
 *  than a long raw URL. */
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
function linkifyText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-secondary hover:underline break-all"
      >
        {linkLabel(url)}
      </a>,
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

/** A readable label for a URL: the document/file name when we can recover one
 *  (SharePoint's `?file=` param, or the last path segment), otherwise the host.
 *  Keeps long, query-heavy links from dominating the summary. */
function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    const fileParam = u.searchParams.get('file');
    if (fileParam) return decodeURIComponent(fileParam);
    const segments = u.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.includes('.') && !last.endsWith('.aspx')) {
      return decodeURIComponent(last);
    }
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function DocumentSummaryPanel({
  summary,
  otherSummaries = [],
  projectNameById,
  onSave,
  onLoadBlocks,
  readOnly = false,
  anchorClassName,
}: {
  /** This project's own summary for the selected document — the editable one. */
  summary: DocumentSummary | null;
  /** Summaries authored under other projects — shown read-only for context. */
  otherSummaries?: DocumentSummary[];
  /** Maps a summary's projectId (null = master) to a human label. */
  projectNameById?: Map<string | null, string>;
  onSave: (text: string, blocks: SummaryBlock[]) => void;
  onLoadBlocks: (id: string) => Promise<SummaryBlock[]>;
  /** When true, hides all editing affordances (e.g. another editor holds the
   *  project lock). */
  readOnly?: boolean;
  /** Extra class on the panel root — used to anchor the guided tour. */
  anchorClassName?: string;
}) {
  const leadText = summary?.text?.trim() ?? '';
  const slideCount = summary?.blockCount ?? summary?.blocks?.length ?? 0;
  const hasContent = Boolean(leadText) || slideCount > 0;

  // Closed by default — the deck (and its screenshots) is only fetched once the
  // user explicitly opens the summary, so the workbench stays snappy.
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [draftBlocks, setDraftBlocks] = useState<SummaryBlock[]>([]);

  // Re-sync when the selected document (and thus its summary) changes.
  const summaryKey = summary?.id ?? 'none';
  useEffect(() => {
    setOpen(false);
    setEditing(false);
  }, [summaryKey]);

  // Lazy-hydrate the deck the first time the panel is opened for viewing.
  useEffect(() => {
    if (!open || editing || !summary) return;
    if (summary.blocks === undefined && slideCount > 0) {
      setLoading(true);
      onLoadBlocks(summary.id).finally(() => setLoading(false));
    }
  }, [open, editing, summaryKey, summary?.blocks, slideCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEditing = async () => {
    setOpen(true);
    let blocks = summary?.blocks;
    if (summary && blocks === undefined) {
      setLoading(true);
      blocks = await onLoadBlocks(summary.id);
      setLoading(false);
    }
    setDraftText(summary?.text ?? '');
    setDraftBlocks(blocks ?? []);
    setEditing(true);
  };

  const save = () => {
    onSave(draftText, draftBlocks);
    setEditing(false);
    if (!draftText.trim() && draftBlocks.length === 0) setOpen(false);
  };

  const updatedLabel = summary?.updatedAt
    ? new Date(summary.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className={`border-b border-grey-200 bg-grey-50/60${anchorClassName ? ` ${anchorClassName}` : ''}`}>
      <div className="w-full px-3 py-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-left min-w-0"
        >
          <span className="text-[11px] font-semibold text-tertiary-dark flex items-center gap-1.5">
            <span aria-hidden>▤</span>
            Summary
            {hasContent && (
              <span className="text-[9px] font-normal text-white bg-secondary rounded-full px-1.5 py-0.5">
                {slideCount > 0 ? `${slideCount} slide${slideCount === 1 ? '' : 's'}` : '1'}
              </span>
            )}
            {otherSummaries.length > 0 && (
              <span className="text-[9px] font-normal text-tertiary-light">
                +{otherSummaries.length} other project{otherSummaries.length === 1 ? '' : 's'}
              </span>
            )}
          </span>
          <span className="text-[10px] text-secondary font-semibold">
            {open ? 'Hide ▴' : (hasContent ? 'Show summary ▾' : '▾')}
          </span>
        </button>
        {!editing && !readOnly && (
          <button
            type="button"
            onClick={startEditing}
            className="shrink-0 px-2 py-0.5 rounded border border-secondary text-secondary text-[11px] font-semibold hover:bg-secondary hover:text-white transition"
          >
            {hasContent ? 'Edit summary' : '+ Add summary'}
          </button>
        )}
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Summarise this document for the team — key findings, relevance, how to use it…"
                className="w-full px-2 py-1.5 border border-grey-200 rounded text-[12px] leading-snug resize-y"
              />
              <SummaryDeckEditor blocks={draftBlocks} onChange={setDraftBlocks} />
              <div className="flex items-center gap-2 pt-1 border-t border-grey-200">
                <button
                  type="button"
                  onClick={save}
                  className="px-3 py-1 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark"
                >
                  Save summary
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-[11px] text-tertiary-light hover:text-tertiary"
                >
                  Cancel
                </button>
                <span className="text-[10px] text-tertiary-light ml-auto">Shared with the team</span>
              </div>
            </div>
          ) : hasContent ? (
            <div className="space-y-2">
              {leadText && (
                <p className="text-[12px] text-tertiary-dark whitespace-pre-wrap leading-snug">{linkifyText(leadText)}</p>
              )}
              {loading && summary?.blocks === undefined ? (
                <p className="text-[11px] text-tertiary-light italic">Loading slides…</p>
              ) : (
                <SummaryDeckViewer blocks={summary?.blocks ?? []} />
              )}
              {!readOnly && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startEditing}
                    className="text-[11px] text-secondary hover:underline"
                  >
                    Edit
                  </button>
                  {updatedLabel && (
                    <span className="text-[10px] text-tertiary-light">Updated {updatedLabel}</span>
                  )}
                </div>
              )}
            </div>
          ) : !readOnly ? (
            <button
              type="button"
              onClick={startEditing}
              className="text-[11px] text-secondary hover:underline"
            >
              + Add summary
            </button>
          ) : (
            <p className="text-[11px] text-tertiary-light italic">No summary yet.</p>
          )}

          {otherSummaries.length > 0 && (
            <div className="pt-2 border-t border-grey-200 space-y-3">
              {otherSummaries.map(s => (
                <OtherProjectSummary
                  key={s.id}
                  summary={s}
                  projectName={projectNameById?.get(s.projectId) ?? 'Other project'}
                  onLoadBlocks={onLoadBlocks}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Read-only view of another project's summary of the same document. The slide
 *  deck is lazy: shown only when the reader clicks "Show N slides". */
function OtherProjectSummary({
  summary,
  projectName,
  onLoadBlocks,
}: {
  summary: DocumentSummary;
  projectName: string;
  onLoadBlocks: (id: string) => Promise<SummaryBlock[]>;
}) {
  const [shown, setShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const slideCount = summary.blockCount ?? summary.blocks?.length ?? 0;

  const show = async () => {
    setShown(true);
    if (summary.blocks === undefined && slideCount > 0) {
      setLoading(true);
      await onLoadBlocks(summary.id);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">{projectName}</p>
      {summary.text && (
        <p className="text-[12px] text-tertiary whitespace-pre-wrap leading-snug">{linkifyText(summary.text)}</p>
      )}
      {slideCount > 0 && !shown && (
        <button
          type="button"
          onClick={show}
          className="text-[11px] text-secondary hover:underline"
        >
          Show {slideCount} slide{slideCount === 1 ? '' : 's'}
        </button>
      )}
      {shown && loading && <p className="text-[11px] text-tertiary-light italic">Loading slides…</p>}
      {shown && summary.blocks && <SummaryDeckViewer blocks={summary.blocks} />}
    </div>
  );
}
