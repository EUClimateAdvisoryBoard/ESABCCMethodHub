'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * General notes — lightweight comments tied to a passage, without applying a
 * tag. The analyst selects text in the document and hits "Comment" in the
 * floating toolbar; the selected passage is captured as the note's quote and
 * they type a remark against it. It's the "just leave a comment" path that
 * sits alongside full coding: no code has to be picked, but the note still
 * points at the exact passage it's about.
 *
 * A note can also be written with no passage attached (a free-form remark on
 * the whole document). Notes persist to localStorage keyed by (project,
 * document) — the same no-backend approach the workspace corpus uses — so they
 * survive reloads on this machine without a schema change.
 */
export interface GeneralNote {
  id: string;
  /** The comment text. */
  text: string;
  /** The passage the comment is about, when anchored to a selection. */
  quote?: string;
  /** Block the passage lives in, used to jump back to it in the document. */
  blockId?: string;
  startChar?: number;
  endChar?: number;
  author: string | null;
  createdAt: string;
}

/** A passage the parent has handed over to be commented on. */
export interface PendingNoteSelection {
  quote: string;
  blockId?: string;
  startChar?: number;
  endChar?: number;
}

interface Props {
  /** Stable key for this (project, document) pair — drives persistence. */
  storageKey: string;
  /** Name stamped on new notes, when the analyst is signed in. */
  authorName?: string | null;
  /** When set, the composer attaches the comment to this passage and focuses
   *  the input. Cleared via `onPendingConsumed` once picked up. */
  pendingSelection?: PendingNoteSelection | null;
  onPendingConsumed?: () => void;
  /** Jump back to a note's passage in the document (highlights its block). */
  onJumpToNote?: (note: GeneralNote) => void;
}

function loadNotes(key: string): GeneralNote[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GeneralNote[]) : [];
  } catch {
    return [];
  }
}

export default function GeneralNotesPanel({
  storageKey,
  authorName,
  pendingSelection,
  onPendingConsumed,
  onJumpToNote,
}: Props) {
  const [notes, setNotes] = useState<GeneralNote[]>([]);
  const [draft, setDraft] = useState('');
  // The passage the in-progress comment is attached to (if any).
  const [anchor, setAnchor] = useState<PendingNoteSelection | null>(null);
  const [loaded, setLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reload whenever the document (storageKey) changes.
  useEffect(() => {
    setNotes(loadNotes(storageKey));
    setDraft('');
    setAnchor(null);
    setLoaded(true);
  }, [storageKey]);

  // Persist on every change — but not before the initial load, or we'd
  // clobber a document's saved notes with an empty array on mount.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch {
      /* quota — ignore */
    }
  }, [notes, loaded, storageKey]);

  // Pick up a passage handed over from the selection toolbar: attach it and
  // focus the composer so the analyst can type straight away.
  useEffect(() => {
    if (!pendingSelection) return;
    setAnchor(pendingSelection);
    onPendingConsumed?.();
    // Focus on the next tick so the textarea is mounted.
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [pendingSelection, onPendingConsumed]);

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    const note: GeneralNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      quote: anchor?.quote?.replace(/\s+/g, ' ').trim() || undefined,
      blockId: anchor?.blockId,
      startChar: anchor?.startChar,
      endChar: anchor?.endChar,
      author: authorName ?? null,
      createdAt: new Date().toISOString(),
    };
    setNotes(prev => [note, ...prev]);
    setDraft('');
    setAnchor(null);
    textareaRef.current?.focus();
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes],
  );

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
              addNote();
            }
          }}
          placeholder={anchor?.quote ? 'Comment on this passage…' : 'Add a note on this document…'}
          className="w-full h-20 px-2 py-1.5 border border-grey-200 rounded text-[11.5px] text-tertiary-dark focus:outline-none focus:border-primary resize-y"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-[9px] text-tertiary-light">⌘↵ to add</span>
          <button
            type="button"
            onClick={addNote}
            disabled={!draft.trim()}
            className="text-[11px] font-semibold text-white bg-primary hover:bg-primary-dark rounded px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {anchor?.quote ? 'Add comment' : 'Add note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {sorted.length === 0 ? (
        <p className="px-3 py-4 text-[11px] italic text-tertiary-light">
          No notes yet. Highlight a passage and click <strong>Comment</strong>,
          or jot a free-form note above.
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-grey-200 max-h-[40vh]">
          {sorted.map(note => {
            const when = new Date(note.createdAt).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric',
            });
            const byline = [note.author, when].filter(Boolean).join(' · ');
            const canJump = !!note.quote && !!onJumpToNote;
            return (
              <li key={note.id} className="px-3 py-2 group">
                <div className="flex items-start gap-1.5">
                  <span aria-hidden className="text-primary text-[11px] leading-tight mt-px">💬</span>
                  <div className="flex-1 min-w-0">
                    {note.quote && (
                      <button
                        type="button"
                        onClick={() => canJump && onJumpToNote?.(note)}
                        title={canJump ? 'Jump to this passage' : undefined}
                        className={`block w-full text-left text-[11px] italic text-tertiary leading-snug line-clamp-2 border-l-2 border-primary/40 pl-1.5 mb-0.5 ${
                          canJump ? 'cursor-pointer hover:text-primary' : 'cursor-default'
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
                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    className="text-tertiary-light hover:text-red-700 text-[14px] leading-none opacity-0 group-hover:opacity-100"
                    aria-label="Delete note"
                    title="Delete note"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
