'use client';

import { useEffect, useRef, useState } from 'react';
import type { GeneralNote, NewNoteInput } from '@/lib/content-analysis/useGeneralNotes';

/**
 * General notes — lightweight comments tied to a passage, without applying a
 * tag. The analyst selects text in the document and hits "Comment" in the
 * floating toolbar; the selected passage is captured as the note's quote and
 * they type a remark against it. It's the "just leave a comment" path that
 * sits alongside full coding: no code has to be picked, but the note still
 * points at the exact passage it's about.
 *
 * A note can also be written with no passage attached (a free-form remark on
 * the whole document). The panel is presentational — notes are loaded, added
 * and removed by the parent via `useGeneralNotes`, which persists them to the
 * shared `content_analysis_notes` table so the whole team sees them.
 */

/** A passage the parent has handed over to be commented on. */
export interface PendingNoteSelection {
  quote: string;
  blockId?: string;
  startChar?: number;
  endChar?: number;
}

interface Props {
  notes: GeneralNote[];
  loading?: boolean;
  /** Whether the current user may delete a given note (their own only). */
  canDelete?: (note: GeneralNote) => boolean;
  onAddNote: (input: NewNoteInput) => void;
  onDeleteNote: (id: string) => void;
  /** When set, the composer attaches the comment to this passage and focuses
   *  the input. Cleared via `onPendingConsumed` once picked up. */
  pendingSelection?: PendingNoteSelection | null;
  onPendingConsumed?: () => void;
  /** Jump back to a note's passage in the document (highlights its block). */
  onJumpToNote?: (note: GeneralNote) => void;
}

export default function GeneralNotesPanel({
  notes,
  loading,
  canDelete,
  onAddNote,
  onDeleteNote,
  pendingSelection,
  onPendingConsumed,
  onJumpToNote,
}: Props) {
  const [draft, setDraft] = useState('');
  // The passage the in-progress comment is attached to (if any).
  const [anchor, setAnchor] = useState<PendingNoteSelection | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pick up a passage handed over from the selection toolbar: attach it and
  // focus the composer so the analyst can type straight away.
  useEffect(() => {
    if (!pendingSelection) return;
    setAnchor(pendingSelection);
    onPendingConsumed?.();
    // Focus on the next tick so the textarea is mounted.
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [pendingSelection, onPendingConsumed]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAddNote({
      text,
      quote: anchor?.quote?.replace(/\s+/g, ' ').trim() || undefined,
      blockId: anchor?.blockId,
      startChar: anchor?.startChar,
      endChar: anchor?.endChar,
    });
    setDraft('');
    setAnchor(null);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Composer */}
      <div className="px-3 py-2.5 border-b border-grey-200">
        {anchor?.quote ? (
          <div className="mb-1.5 flex items-start gap-1.5 rounded border border-primary/30 bg-primary/5 px-2 py-1">
            <span aria-hidden className="text-primary text-[11px] leading-tight mt-px">“</span>
            <p className="flex-1 min-w-0 text-[11px] italic text-tertiary leading-snug line-clamp-2">
              {anchor.quote.replace(/\s+/g, ' ').trim()}
            </p>
            <button
              type="button"
              onClick={() => setAnchor(null)}
              className="text-tertiary-light hover:text-red-700 text-[13px] leading-none"
              aria-label="Detach passage"
              title="Comment on the whole document instead"
            >
              ×
            </button>
          </div>
        ) : (
          <p className="mb-1.5 text-[10px] text-tertiary-light leading-snug">
            Select text in the document and choose <strong>💬 Comment</strong> to
            tie a note to that passage — no tag needed. Or just write a note on
            the whole document below.
          </p>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={anchor?.quote ? 'Comment on this passage…' : 'Add a note on this document…'}
          className="w-full h-20 px-2 py-1.5 border border-grey-200 rounded text-[11.5px] text-tertiary-dark focus:outline-none focus:border-primary resize-y"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-[9px] text-tertiary-light">⌘↵ to add · shared with the team</span>
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            className="text-[11px] font-semibold text-white bg-primary hover:bg-primary-dark rounded px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {anchor?.quote ? 'Add comment' : 'Add note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <p className="px-3 py-4 text-[11px] italic text-tertiary-light">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="px-3 py-4 text-[11px] italic text-tertiary-light">
          No notes yet. Highlight a passage and click <strong>Comment</strong>,
          or jot a free-form note above.
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-grey-200 max-h-[40vh]">
          {notes.map(note => {
            const when = new Date(note.createdAt).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric',
            });
            const byline = [note.author, when].filter(Boolean).join(' · ');
            const jumpable = !!note.quote && !!onJumpToNote;
            const deletable = canDelete ? canDelete(note) : true;
            return (
              <li key={note.id} className="px-3 py-2 group">
                <div className="flex items-start gap-1.5">
                  <span aria-hidden className="text-primary text-[11px] leading-tight mt-px">💬</span>
                  <div className="flex-1 min-w-0">
                    {note.quote && (
                      <button
                        type="button"
                        onClick={() => jumpable && onJumpToNote?.(note)}
                        title={jumpable ? 'Jump to this passage' : undefined}
                        className={`block w-full text-left text-[11px] italic text-tertiary leading-snug line-clamp-2 border-l-2 border-primary/40 pl-1.5 mb-0.5 ${
                          jumpable ? 'cursor-pointer hover:text-primary' : 'cursor-default'
                        }`}
                      >
                        “{note.quote}”
                      </button>
                    )}
                    <p className="text-[11.5px] text-tertiary-dark leading-snug whitespace-pre-wrap break-words">
                      {note.text}
                    </p>
                    {byline && (
                      <p className="mt-0.5 text-[10px] text-tertiary-light">— {byline}</p>
                    )}
                  </div>
                  {deletable && (
                    <button
                      type="button"
                      onClick={() => onDeleteNote(note.id)}
                      className="text-tertiary-light hover:text-red-700 text-[14px] leading-none opacity-0 group-hover:opacity-100"
                      aria-label="Delete note"
                      title="Delete note"
                    >
                      ×
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
