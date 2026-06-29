'use client';

// ---------------------------------------------------------------------------
// FloatingCodeToolbar
//
// Renders a small action bar positioned above/below the current text
// selection inside a block. Modern highlight-based coding pattern
// (Medium / Notion / Hypothes.is) — the point of action is right next
// to the selection, not hunting around the block header.
//
// Controlled by the parent: when `selection` is non-null, the toolbar
// portals into document.body and positions itself at the selection's
// DOMRect. Clears when the selection is cleared or `onClear` fires.
// ---------------------------------------------------------------------------

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CodeNode, PdfAnchor } from '@/lib/content-analysis/types';

export interface ToolbarSelection {
  /** Block id when the selection is inside a structured PDF block. Absent
   *  for the flat-text viewer, in which case offsets are document-wide. */
  blockId?: string;
  /** Precise PDF selection anchor — set when the selection was made directly
   *  on a rendered PDF page, so the resulting segment highlights the exact
   *  selected text rather than the whole enclosing block. */
  pdfAnchor?: PdfAnchor;
  /** Captured figure (PNG data-URL) — set when the selection comes from the
   *  "Capture figure" tool rather than a text selection. The same tag actions
   *  apply; the resulting segment carries the screenshot. */
  screenshot?: string;
  startChar: number;
  endChar: number;
  text: string;
  /** Client rect of the selection — used to anchor the toolbar. */
  rect: DOMRect;
}

interface Props {
  selection: ToolbarSelection | null;
  activeCode: CodeNode | null;
  codes: CodeNode[];
  onApply: () => void;
  onSplit: () => void;
  onPickCode: (codeId: string) => void;
  onClear: () => void;
  /** "+ New tag from selection" — creates a fresh tag (open the editor
   *  pre-filled with the selection text) and applies it to the current
   *  selection. Optional so existing call sites don't break. */
  onCreateAndApply?: (suggestedName: string) => void;
  /** "Extract number" — fires when the user wants to record the highlighted
   *  text as a numeric extraction (mixed-methods). The handler typically
   *  creates a coded segment + attaches a numeric payload parsed from the
   *  text. Only rendered when supplied. */
  onExtractNumber?: () => void;
  /** "Comment" — attach a free-form note to the selected passage without
   *  applying a tag. Only rendered when supplied. */
  onComment?: () => void;
}

export default function FloatingCodeToolbar({
  selection,
  activeCode,
  codes,
  onApply,
  onSplit,
  onPickCode,
  onClear,
  onCreateAndApply,
  onExtractNumber,
  onComment,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the inline picker whenever the selection changes.
  useEffect(() => {
    setPickerOpen(false);
    setQuery('');
  }, [selection?.blockId, selection?.startChar, selection?.endChar]);

  // Cmd/Ctrl+Enter applies; Esc cancels.
  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (activeCode) onApply();
      } else if (e.key === 'Escape') {
        onClear();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, activeCode, onApply, onClear]);

  // Position — above the selection if there's room, otherwise below.
  const style = useToolbarPosition(selection?.rect ?? null);

  const filteredCodes = useMemo(() => {
    if (!pickerOpen || !query.trim()) return codes.slice(0, 12);
    const q = query.toLowerCase();
    return codes.filter(c => c.name.toLowerCase().includes(q)).slice(0, 40);
  }, [codes, query, pickerOpen]);

  if (!mounted || !selection) return null;

  // A figure capture (vs. a text selection): the "Split here" / "Extract
  // number" actions don't apply, and we show a thumbnail of what was grabbed.
  const isFigure = Boolean(selection.screenshot);

  return createPortal(
    <div
      role="toolbar"
      aria-label="Tag selection toolbar"
      style={style}
      className="z-[80] flex items-center gap-1.5 bg-[#3D5265] text-white rounded-md shadow-xl px-1.5 py-1 font-sans pointer-events-auto"
      // Clicks inside the toolbar shouldn't collapse the text selection.
      onMouseDown={e => e.preventDefault()}
    >
      {isFigure && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={selection.screenshot}
          alt="Captured figure"
          className="h-7 w-auto max-w-[80px] rounded-sm border border-white/30 object-cover"
        />
      )}
      {activeCode ? (
        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white rounded px-2 py-1 text-[12px] font-semibold transition"
          title="Apply active tag to the selection · ⌘+Enter"
        >
          <span
            className="w-2 h-2 rounded-sm"
            style={{ backgroundColor: activeCode.color }}
            aria-hidden
          />
          Apply
          <span className="text-white/80 font-normal truncate max-w-[140px]">
            {activeCode.name}
          </span>
          <kbd className="ml-1 hidden sm:inline text-[9px] uppercase tracking-[0.1em] opacity-60">⌘↵</kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(o => !o)}
          className="inline-flex items-center gap-1.5 bg-[#E87722] hover:bg-[#c45f14] text-white rounded px-2 py-1 text-[12px] font-semibold transition"
        >
          Pick a tag ▾
        </button>
      )}

      {onCreateAndApply && selection && (
        <button
          type="button"
          onClick={() => onCreateAndApply(selection.text.replace(/\s+/g, ' ').trim().slice(0, 60) || (isFigure ? 'Figure' : ''))}
          className="text-[11.5px] text-white/85 hover:text-white px-1.5 py-1 transition"
          title="Create a new tag from the selected text and apply it"
        >
          + New tag
        </button>
      )}

      {!isFigure && onComment && selection && (
        <button
          type="button"
          onClick={onComment}
          className="text-[11.5px] text-white/85 hover:text-white px-1.5 py-1 transition"
          title="Attach a comment to this passage — no tag needed"
        >
          💬 Comment
        </button>
      )}

      {!isFigure && onExtractNumber && selection && /\d/.test(selection.text) && (
        <button
          type="button"
          onClick={onExtractNumber}
          className="text-[11.5px] text-white/85 hover:text-white px-1.5 py-1 transition"
          title="Capture this number as a structured extraction (value · unit · year · label) for export"
        >
          # Extract number
        </button>
      )}

      {!isFigure && (
        <button
          type="button"
          onClick={onSplit}
          className="text-[11.5px] text-white/85 hover:text-white px-1.5 py-1 transition"
          title="Split this block at the selection start"
        >
          Split here
        </button>
      )}

      <span className="w-px h-4 bg-white/20" aria-hidden />

      <button
        type="button"
        onClick={onClear}
        className="text-white/60 hover:text-white text-[14px] leading-none px-1"
        title="Dismiss · Esc"
        aria-label="Dismiss toolbar"
      >
        ×
      </button>

      {pickerOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-[260px] bg-white border border-[#E6E7E8] rounded-md shadow-xl overflow-hidden"
          style={{ color: '#3D5265' }}
        >
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tags…"
            className="w-full px-2.5 py-1.5 border-b border-[#E6E7E8] text-[12.5px] focus:outline-none"
          />
          <ul className="max-h-[240px] overflow-y-auto">
            {onCreateAndApply && selection && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onCreateAndApply(query.trim() || selection.text.replace(/\s+/g, ' ').trim().slice(0, 60));
                    setPickerOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#F3F4F6] flex items-center gap-2 text-[12px] font-medium text-[#E87722]"
                >
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0 border border-dashed border-[#E87722]" aria-hidden />
                  <span>+ New tag from selection{query.trim() ? ` ("${query.trim()}")` : ''}</span>
                </button>
              </li>
            )}
            {filteredCodes.length === 0 ? (
              <li className="px-3 py-2 text-[11.5px] italic text-[#8A95A3]">
                No matches.
              </li>
            ) : (
              filteredCodes.map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { onPickCode(c.id); setPickerOpen(false); }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-[#F3F4F6] flex items-center gap-2 text-[12px]"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: c.color }}
                      aria-hidden
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <footer className="px-3 py-1.5 border-t border-[#E6E7E8] bg-[#FBFBFA] font-mono text-[10px] text-[#8A95A3]">
            {filteredCodes.length} / {codes.length} · Pick one to apply to the selection
          </footer>
        </div>
      )}
    </div>,
    document.body,
  );
}

function useToolbarPosition(rect: DOMRect | null): React.CSSProperties | undefined {
  const [pos, setPos] = useState<React.CSSProperties | undefined>(undefined);
  useLayoutEffect(() => {
    if (!rect) { setPos(undefined); return; }

    // Position relative to the viewport (`position: fixed`) so the toolbar
    // anchors correctly no matter which container scrolls. The coding surfaces
    // (PDF pane, extracted-text pane) live inside their own `overflow:auto`
    // boxes, so `window.scrollY` never changes when the analyst scrolls them —
    // an absolute, document-space position would leave the toolbar stranded
    // while the marked text scrolled away beneath it. With a fixed position we
    // re-read the live selection on every scroll/resize and the toolbar tracks
    // the passage down the page.
    const TOOLBAR_HEIGHT = 40;
    const GAP = 8;
    const place = (r: DOMRect) => {
      const preferredTop = r.top - TOOLBAR_HEIGHT - GAP;
      const top = preferredTop < 8 ? r.bottom + GAP : preferredTop;
      setPos({
        position: 'fixed',
        top,
        left: r.left + r.width / 2,
        transform: 'translateX(-50%)',
      });
    };

    place(rect);

    // Follow the selection as any ancestor scrolls (capture phase catches the
    // inner scroll containers, which don't bubble scroll to window). For a text
    // selection we read the live range rectangle so the toolbar stays glued to
    // the words; a figure capture has no live selection, so we keep its
    // original viewport anchor.
    const track = () => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        const live = sel.getRangeAt(0).getBoundingClientRect();
        if (live && (live.width > 0 || live.height > 0)) { place(live); return; }
      }
      place(rect);
    };
    window.addEventListener('scroll', track, true);
    window.addEventListener('resize', track);
    return () => {
      window.removeEventListener('scroll', track, true);
      window.removeEventListener('resize', track);
    };
  }, [rect]);
  return pos;
}
