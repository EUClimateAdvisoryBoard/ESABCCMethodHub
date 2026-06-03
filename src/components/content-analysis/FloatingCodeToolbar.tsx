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

  return createPortal(
    <div
      role="toolbar"
      aria-label="Tag selection toolbar"
      style={style}
      className="z-[80] flex items-center gap-1.5 bg-[#3D5265] text-white rounded-md shadow-xl px-1.5 py-1 font-sans pointer-events-auto"
      // Clicks inside the toolbar shouldn't collapse the text selection.
      onMouseDown={e => e.preventDefault()}
    >
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
          onClick={() => onCreateAndApply(selection.text.replace(/\s+/g, ' ').trim().slice(0, 60))}
          className="text-[11.5px] text-white/85 hover:text-white px-1.5 py-1 transition"
          title="Create a new tag from the selected text and apply it"
        >
          + New tag
        </button>
      )}

      {onExtractNumber && selection && /\d/.test(selection.text) && (
        <button
          type="button"
          onClick={onExtractNumber}
          className="text-[11.5px] text-white/85 hover:text-white px-1.5 py-1 transition"
          title="Capture this number as a structured extraction (value · unit · year · label) for export"
        >
          # Extract number
        </button>
      )}

      <button
        type="button"
        onClick={onSplit}
        className="text-[11.5px] text-white/85 hover:text-white px-1.5 py-1 transition"
        title="Split this block at the selection start"
      >
        Split here
      </button>

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
    // Anchor above the selection; if that would clip the viewport, flip below.
    const TOOLBAR_HEIGHT = 40;
    const GAP = 8;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const preferredTop = rect.top + scrollY - TOOLBAR_HEIGHT - GAP;
    const centeredLeft = rect.left + scrollX + rect.width / 2;
    const position: React.CSSProperties = { position: 'absolute' };
    if (preferredTop < scrollY + 8) {
      position.top = rect.bottom + scrollY + GAP;
    } else {
      position.top = preferredTop;
    }
    position.left = centeredLeft;
    position.transform = 'translateX(-50%)';
    setPos(position);
  }, [rect]);
  return pos;
}
