'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * General notes — a free-form scratchpad for a document, distinct from the
 * coded segments (which are pinned to specific passages) and the whole-document
 * summary (one shared write-up). Notes are quick, timestamped comments an
 * analyst jots while reading: questions, reminders, "follow up on X".
 *
 * Each note carries the author and the time it was written. They persist to
 * localStorage keyed by (project, document) — the same lightweight, no-backend
 * approach the workspace corpus uses — so they survive reloads on this machine
 * without a schema change.
 */
export interface GeneralNote {
  id: string;
  text: string;
  author: string | null;
  createdAt: string;
}

interface Props {
  /** Stable key for this (project, document) pair — drives persistence. */
  storageKey: string;
  /** Name stamped on new notes, when the analyst is signed in. */
  authorName?: string | null;
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

export default function GeneralNotesPanel({ storageKey, authorName }: Props) {
  const [notes, setNotes] = useState<GeneralNote[]>([]);
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reload whenever the document (storageKey) changes.
  useEffect(() => {
    setNotes(loadNotes(storageKey));
    setDraft('');
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

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    const note: GeneralNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      author: authorName ?? null,
      createdAt: new Date().toISOString(),
    };
    setNotes(prev => [note, ...prev]);
    setDraft('');
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
          placeholder="Jot a general note on this document — a question, a reminder, something to follow up…"
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
            Add note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {sorted.length === 0 ? (
        <p className="px-3 py-4 text-[11px] italic text-tertiary-light">
          No general notes yet. Use this space for free-form comments on the
          whole document — they&apos;re separate from the tagged segments.
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-grey-200 max-h-[40vh]">
          {sorted.map(note => {
            const when = new Date(note.createdAt).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric',
            });
            const byline = [note.author, when].filter(Boolean).join(' · ');
            return (
              <li key={note.id} className="px-3 py-2 group">
                <div className="flex items-start gap-1.5">
                  <span aria-hidden className="text-primary text-[11px] leading-tight mt-px">💬</span>
                  <div className="flex-1 min-w-0">
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
