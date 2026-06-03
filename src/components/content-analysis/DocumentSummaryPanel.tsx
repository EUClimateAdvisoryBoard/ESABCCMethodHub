'use client';
/**
 * Per-document summary editor (M·05).
 *
 * A lightweight plain-text summary that lives next to the coded segments so
 * an analyst can capture the gist of a document — what it commits to, what
 * it leaves out — without leaving the workbench. It is keyed per (project,
 * document) in the shared store, so a teammate opening the same project sees
 * it too. Rich slide decks (`blocks`) are a separate, heavier surface; this
 * panel only edits the plain-text lead, which is what most passes need.
 */
import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Current saved summary text for this (project, document), or '' if none. */
  value: string;
  /** ISO timestamp of the last save, for the "updated" stamp. */
  updatedAt?: string;
  /** Persist the new text. Empty string clears the summary. */
  onSave: (text: string) => void;
  /** Disabled while another editor holds the project lock. */
  readOnly?: boolean;
}

export default function DocumentSummaryPanel({ value, updatedAt, onSave, readOnly }: Props) {
  const [draft, setDraft] = useState(value);
  const lastSaved = useRef(value);

  // Re-sync the draft when the selected document (and therefore `value`)
  // changes, unless the user has unsaved edits to the current one.
  useEffect(() => {
    if (draft === lastSaved.current) {
      setDraft(value);
      lastSaved.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const dirty = draft !== lastSaved.current;

  function save() {
    onSave(draft.trim());
    lastSaved.current = draft.trim();
    setDraft(draft.trim());
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        disabled={readOnly}
        rows={4}
        placeholder={readOnly
          ? 'Read-only — request edit access to write a summary.'
          : 'Summarise this document: what does it commit to, and what is missing?'}
        className="w-full text-[12.5px] leading-relaxed text-[#3D5265] border border-[#E6E7E8] rounded-sm px-2.5 py-2 resize-y focus:outline-none focus:border-[#00928F] disabled:bg-[#FBFBFA] disabled:text-[#8A95A3]"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#8A95A3] font-mono">
          {dirty
            ? 'Unsaved changes'
            : updatedAt
              ? `Saved ${new Date(updatedAt).toLocaleDateString()}`
              : 'No summary yet'}
        </span>
        <div className="flex items-center gap-2">
          {draft && !readOnly && (
            <button
              type="button"
              onClick={() => { setDraft(''); onSave(''); lastSaved.current = ''; }}
              className="text-[11px] text-[#8A95A3] hover:text-[#B83230]"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={readOnly || !dirty}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-sm bg-[#00928F] text-white hover:bg-[#006F6C] disabled:bg-[#D3D6DA] disabled:cursor-not-allowed"
          >
            Save summary
          </button>
        </div>
      </div>
    </div>
  );
}
