'use client';

// ---------------------------------------------------------------------------
// Reading responsibility view — who is reading what.
//
// A sibling to the Chapter view. Where the Chapter view groups the workspace
// corpus by report chapter, this view groups it by the PERSON responsible for
// reading each document, so the team keeps a live overview of who is reading
// what and which sources already have a summary. It also owns the "Add
// literature" panel, the one place to bring new reading in:
//
//   • by DOI  — resolves the DOI, files the paper in the Reference Manager with
//               an `industry` tag, adds it to this workspace, and (optionally)
//               assigns a reader. All persisted server-side.
//   • from the Reference Manager — pick an existing report / policy document and
//               add it to this workspace with a reader.
//
// Reader assignments live in the shared `content_analysis_reading` table (via
// useReadingAssignments in the host module); this view reads them and offers a
// picker to (re)assign.
// ---------------------------------------------------------------------------

import { useEffect, useId, useMemo, useState } from 'react';
import {
  sourceTierOf,
  documentKindLabel,
  SOURCE_TIER_META,
  type AnalysisDocument,
} from '@/lib/content-analysis/service';
import SourceTierFilter, {
  filterBySourceTier,
  type SourceTierFilterValue,
} from './SourceTierFilter';

/** A reference the user can pick from the Reference Manager to add here. */
export interface PickableReference {
  id: string;
  title: string;
  authors: string;
  year: string;
  type: string;
  url: string;
  doi: string;
  journal: string;
}

export interface WorkspaceReadingViewProps {
  /** Every document in the workspace corpus, across all source tiers. */
  documents: AnalysisDocument[];
  /** The responsible reader for a document ('' when none). */
  getReader: (docId: string) => string;
  /** Suggested reader names (team profiles + names already used here). */
  people: string[];
  /** Ids of documents that already carry a written summary. */
  summaryDocIds: Set<string>;
  /** Whether a document has been marked read (independent of its summary). */
  isRead: (docId: string) => boolean;
  /** Open a document in the Code view. */
  onOpenDocument: (doc: AnalysisDocument) => void;
  /** Mark a document read, or clear it with `false`. */
  onToggleRead: (docId: string, read: boolean) => void;
  /** Assign (or clear, with '') the responsible reader for a document. */
  onSetReader: (docId: string, reader: string) => void;
  /** Add a paper by DOI. Returns true on success. */
  onAddByDoi: (doi: string, reader: string) => Promise<boolean>;
  /** Add an existing reference-manager document. Returns true on success. */
  onAddReference: (ref: PickableReference, reader: string) => Promise<boolean>;
}

/** Non-journal reference types the "add from reference manager" picker offers —
 *  reports and policy/legislation, i.e. the grey-tier documents the industry
 *  team wants to pull in (journal articles come in by DOI instead). */
const PICKABLE_TYPES = new Set(['report', 'web', 'legislation']);

const UNASSIGNED = '__unassigned__';

/** A free-text reader field with team suggestions. */
function ReaderInput({
  value,
  people,
  placeholder,
  onCommit,
}: {
  value: string;
  people: string[];
  placeholder?: string;
  onCommit: (reader: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const listId = useId();
  return (
    <>
      <input
        list={listId}
        value={draft}
        placeholder={placeholder ?? 'Assign reader…'}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim() !== value.trim()) onCommit(draft.trim());
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-full px-2 py-1 border border-grey-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
      />
      <datalist id={listId}>
        {people.map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </>
  );
}

export default function WorkspaceReadingView({
  documents,
  getReader,
  people,
  summaryDocIds,
  isRead,
  onOpenDocument,
  onToggleRead,
  onSetReader,
  onAddByDoi,
  onAddReference,
}: WorkspaceReadingViewProps) {
  // Which source tier the list is narrowed to — the "differentiate by type of
  // source" control the team wanted here, so you can see just the policy,
  // scientific or grey reading without switching back to the Code view.
  const [tierFilter, setTierFilter] = useState<SourceTierFilterValue>('all');
  const visibleDocuments = useMemo(
    () => filterBySourceTier(documents, tierFilter),
    [documents, tierFilter],
  );

  const { groups, unassigned, assignedCount } = useMemo(() => {
    const byReader = new Map<string, AnalysisDocument[]>();
    const none: AnalysisDocument[] = [];
    let assigned = 0;
    for (const d of visibleDocuments) {
      const reader = getReader(d.id).trim();
      if (!reader) {
        none.push(d);
        continue;
      }
      assigned += 1;
      const list = byReader.get(reader);
      if (list) list.push(d);
      else byReader.set(reader, [d]);
    }
    const sortByTitle = (a: AnalysisDocument, b: AnalysisDocument) =>
      (a.shortTitle || a.title).localeCompare(b.shortTitle || b.title);
    const groups = [...byReader.entries()]
      .map(([reader, docs]) => ({ reader, docs: docs.slice().sort(sortByTitle) }))
      .sort((a, b) => b.docs.length - a.docs.length || a.reader.localeCompare(b.reader));
    return { groups, unassigned: none.slice().sort(sortByTitle), assignedCount: assigned };
  }, [visibleDocuments, getReader]);

  function DocRow({ d }: { d: AnalysisDocument }) {
    // Two independent signals per row:
    //   • `read`  — a manual flag the reader toggles on this row (the pill).
    //   • `done`  — derived from whether a summary has been written; the summary
    //               is the artefact that proves the work, so this stays derived
    //               rather than being a separate, forgeable flag.
    const read = isRead(d.id);
    const done = summaryDocIds.has(d.id);
    const url = d.referenceUrl || d.pdfUrl || '';
    return (
      <li className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-grey-50">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpenDocument(d)}
            className="text-left text-[11px] text-tertiary-dark leading-snug hover:text-primary"
            title={`Open “${d.title}” in the Code view`}
          >
            {d.shortTitle || d.title}
            {d.referenceYear && (
              <span className="text-tertiary-light ml-1">({d.referenceYear})</span>
            )}
          </button>
          <div className="text-[9px] uppercase tracking-wide text-tertiary-light mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>
              {SOURCE_TIER_META[sourceTierOf(d)].label} · {documentKindLabel(d)}
            </span>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="normal-case tracking-normal text-primary hover:underline"
                title="Open the source"
              >
                link ↗
              </a>
            )}
          </div>
        </div>
        {/* Read toggle — a manual flag, not navigation. Clicking flips the row
            between "To read" and "Read"; the title link (above) is what opens
            the document. */}
        <button
          type="button"
          onClick={() => onToggleRead(d.id, !read)}
          aria-pressed={read}
          className={`shrink-0 self-center inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold transition ${
            read
              ? 'bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20'
              : 'bg-white border-grey-200 text-tertiary-light hover:border-tertiary hover:text-tertiary'
          }`}
          title={
            read
              ? 'Marked read — click to mark it unread again.'
              : 'Click to mark this document read.'
          }
        >
          <span aria-hidden>{read ? '✓' : '○'}</span>
          {read ? 'Read' : 'To read'}
        </button>
        {/* Done marker — derived from the summary, shown alongside the read flag
            so a row can be read and, separately, summarised. Opens the document
            to review the summary. */}
        {done && (
          <button
            type="button"
            onClick={() => onOpenDocument(d)}
            className="shrink-0 self-center inline-flex items-center gap-1 px-2 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold transition hover:bg-primary/20"
            title="Done — a summary has been written. Open to view it."
          >
            <span aria-hidden>✓</span>
            Done
          </button>
        )}
        <div className="w-32 shrink-0">
          <ReaderInput
            value={getReader(d.id)}
            people={people}
            onCommit={reader => onSetReader(d.id, reader)}
          />
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AddLiteraturePanel people={people} onAddByDoi={onAddByDoi} onAddReference={onAddReference} />

      <div className="bg-grey-50 border border-grey-200 rounded-lg p-3">
        <h3 className="text-[13px] font-semibold text-tertiary-dark">Reading responsibility</h3>
        <p className="text-[11px] text-tertiary-light mt-1">
          {tierFilter === 'all' ? 'Every document' : `Every ${SOURCE_TIER_META[tierFilter].label.toLowerCase()} document`}{' '}
          in this workspace, grouped by who is responsible for reading it.{' '}
          <strong>{assignedCount}</strong> of {visibleDocuments.length}{' '}
          document{visibleDocuments.length === 1 ? '' : 's'} assigned. Filter by
          source below to see just one tier, or assign a reader in the field on
          the right of each row.
        </p>
        {documents.length > 0 && (
          <SourceTierFilter
            documents={documents}
            value={tierFilter}
            onChange={setTierFilter}
            className="mt-2"
          />
        )}
      </div>

      {documents.length === 0 && (
        <div className="border border-grey-200 rounded-lg bg-white p-8 text-center">
          <p className="text-sm text-tertiary max-w-md mx-auto">
            No literature in this workspace yet. Add a paper by DOI or pick a
            report from the Reference Manager above — it will appear here so you
            can assign who reads it.
          </p>
        </div>
      )}

      {documents.length > 0 && visibleDocuments.length === 0 && (
        <div className="border border-grey-200 rounded-lg bg-white p-6 text-center">
          <p className="text-[12px] text-tertiary max-w-md mx-auto">
            No {SOURCE_TIER_META[tierFilter === 'all' ? 'policy' : tierFilter].label.toLowerCase()}{' '}
            documents in this workspace. Pick another source above, or choose{' '}
            <strong>All sources</strong> to see everything.
          </p>
        </div>
      )}

      {groups.map(({ reader, docs }) => {
        const readCount = docs.reduce((n, d) => n + (isRead(d.id) ? 1 : 0), 0);
        const doneCount = docs.reduce((n, d) => n + (summaryDocIds.has(d.id) ? 1 : 0), 0);
        return (
        <section key={reader} className="border border-grey-200 rounded-lg bg-white overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-grey-200 bg-secondary/5">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-tertiary-dark">
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-bold"
                aria-hidden
              >
                {reader.slice(0, 1).toUpperCase()}
              </span>
              {reader}
            </span>
            <span className="inline-flex items-center gap-2 text-[10px] font-mono text-tertiary-light">
              <span
                className={readCount === docs.length ? 'text-secondary font-semibold' : ''}
                title="Documents marked read"
              >
                {readCount}/{docs.length} read
              </span>
              <span
                className={doneCount === docs.length ? 'text-primary font-semibold' : ''}
                title="Documents with a written summary"
              >
                {doneCount} done
              </span>
              <span>
                {docs.length} document{docs.length === 1 ? '' : 's'}
              </span>
            </span>
          </div>
          <ul className="px-1 py-1">
            {docs.map(d => (
              <DocRow key={d.id} d={d} />
            ))}
          </ul>
        </section>
        );
      })}

      {unassigned.length > 0 && (
        <section className="border border-dashed border-grey-300 rounded-lg bg-white overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-grey-200 bg-grey-50">
            <span className="text-[11px] font-semibold text-tertiary">
              Not assigned yet
            </span>
            <span className="text-[10px] font-mono text-tertiary-light">
              {unassigned.length} document{unassigned.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="px-1 py-1">
            {unassigned.map(d => (
              <DocRow key={d.id} d={d} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** The "Add literature" panel: DOI entry + Reference-Manager picker. */
function AddLiteraturePanel({
  people,
  onAddByDoi,
  onAddReference,
}: {
  people: string[];
  onAddByDoi: (doi: string, reader: string) => Promise<boolean>;
  onAddReference: (ref: PickableReference, reader: string) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<'doi' | 'library'>('doi');
  const [doi, setDoi] = useState('');
  const [reader, setReader] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Reference-Manager picker state.
  const [refs, setRefs] = useState<PickableReference[] | null>(null);
  const [refQuery, setRefQuery] = useState('');
  const [loadingRefs, setLoadingRefs] = useState(false);

  async function loadRefs() {
    setLoadingRefs(true);
    try {
      const res = await fetch('/api/references/library?includeManager=1');
      const json = (await res.json()) as { references?: Array<Record<string, unknown>> };
      const list: PickableReference[] = (json.references ?? [])
        .map(r => ({
          id: String(r.id ?? ''),
          title: String(r.title ?? ''),
          authors: String(r.authors ?? ''),
          year: String(r.year ?? ''),
          type: String(r.type ?? ''),
          url: String(r.url ?? ''),
          doi: String(r.doi ?? ''),
          journal: String(r.journal ?? ''),
        }))
        .filter(r => r.id && r.title && PICKABLE_TYPES.has(r.type));
      list.sort((a, b) => a.title.localeCompare(b.title));
      setRefs(list);
    } catch {
      setRefs([]);
    } finally {
      setLoadingRefs(false);
    }
  }

  useEffect(() => {
    if (mode === 'library' && refs === null && !loadingRefs) void loadRefs();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitDoi() {
    const clean = doi.trim();
    if (!clean) return;
    setBusy(true);
    setMessage(null);
    const ok = await onAddByDoi(clean, reader.trim());
    setBusy(false);
    if (ok) {
      setMessage({ kind: 'ok', text: 'Added to the workspace and tagged “industry”.' });
      setDoi('');
    } else {
      setMessage({ kind: 'err', text: 'Could not add that DOI — check it and try again.' });
    }
  }

  async function addRef(ref: PickableReference) {
    setBusy(true);
    setMessage(null);
    const ok = await onAddReference(ref, reader.trim());
    setBusy(false);
    if (ok) setMessage({ kind: 'ok', text: `Added “${ref.title.slice(0, 60)}”.` });
    else setMessage({ kind: 'err', text: 'Could not add that reference.' });
  }

  const filteredRefs = useMemo(() => {
    const q = refQuery.trim().toLowerCase();
    const list = refs ?? [];
    if (!q) return list.slice(0, 40);
    return list
      .filter(r =>
        `${r.title} ${r.authors} ${r.year} ${r.journal}`.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [refs, refQuery]);

  return (
    <div className="border border-grey-200 rounded-lg bg-white p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-[13px] font-semibold text-tertiary-dark">Add literature</h3>
        <div className="flex rounded border border-grey-200 overflow-hidden text-[11px]">
          <button
            type="button"
            onClick={() => { setMode('doi'); setMessage(null); }}
            className={`px-2.5 py-1 ${mode === 'doi' ? 'bg-primary text-white' : 'text-tertiary hover:bg-grey-50'}`}
          >
            By DOI
          </button>
          <button
            type="button"
            onClick={() => { setMode('library'); setMessage(null); }}
            className={`px-2.5 py-1 border-l border-grey-200 ${mode === 'library' ? 'bg-primary text-white' : 'text-tertiary hover:bg-grey-50'}`}
          >
            From reference manager
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <label className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">
          Reader
        </label>
        <div className="w-40">
          <ReaderInput
            value={reader}
            people={people}
            placeholder="Optional — who reads it"
            onCommit={setReader}
          />
        </div>
        <span className="text-[10px] text-tertiary-light">
          Applied to what you add below (you can change it per row afterwards).
        </span>
      </div>

      {mode === 'doi' ? (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <input
            value={doi}
            onChange={e => setDoi(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void submitDoi(); }}
            placeholder="10.1234/abcd  or  https://doi.org/10.1234/abcd"
            className="flex-1 min-w-[220px] px-2 py-1.5 border border-grey-200 rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
          />
          <button
            type="button"
            disabled={busy || !doi.trim()}
            onClick={() => void submitDoi()}
            className="px-3 py-1.5 rounded bg-primary text-white text-[12px] font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? 'Adding…' : 'Add'}
          </button>
          <p className="w-full text-[10px] text-tertiary-light">
            The paper is resolved via Crossref, filed in the Reference Manager
            with an <strong>industry</strong> tag, and added to this workspace —
            it stays here permanently.
          </p>
        </div>
      ) : (
        <div className="mt-2">
          <input
            value={refQuery}
            onChange={e => setRefQuery(e.target.value)}
            placeholder="Search reports & policy documents in the reference manager…"
            className="w-full px-2 py-1.5 border border-grey-200 rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary"
          />
          <div className="mt-2 max-h-56 overflow-y-auto border border-grey-100 rounded">
            {loadingRefs && <p className="p-3 text-[11px] text-tertiary-light">Loading…</p>}
            {!loadingRefs && filteredRefs.length === 0 && (
              <p className="p-3 text-[11px] text-tertiary-light">
                No reports or policy documents found. Journal articles are added
                by DOI instead.
              </p>
            )}
            <ul>
              {filteredRefs.map(r => (
                <li
                  key={r.id}
                  className="flex items-start gap-2 px-2 py-1.5 border-b border-grey-50 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-tertiary-dark leading-snug">{r.title}</p>
                    <p className="text-[9px] uppercase tracking-wide text-tertiary-light mt-0.5">
                      {r.type}
                      {r.year ? ` · ${r.year}` : ''}
                      {r.authors ? ` · ${r.authors.slice(0, 60)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void addRef(r)}
                    className="shrink-0 px-2 py-1 rounded border border-primary text-primary text-[11px] font-semibold hover:bg-primary hover:text-white disabled:opacity-50"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`mt-2 text-[11px] ${message.kind === 'ok' ? 'text-secondary' : 'text-red-700'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
