'use client';

// ---------------------------------------------------------------------------
// Overall-tag dropdown — a searchable, multi-select checklist of master codes.
//
// Used in two places in the Content Analysis workbench:
//   • on a scientific / grey-literature document, to curate that document's
//     overall (document-level) tags by hand, and
//   • in the "Add documents" panel, as a filter that narrows the library to
//     documents carrying a chosen overall tag.
//
// The pool of selectable tags is the shared master taxonomy — the same codes
// policy documents are tagged with — so overall tags stay comparable across
// every source tier.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CodeNode } from '@/lib/content-analysis/types';

interface Props {
  /** Selectable pool — the master taxonomy. */
  codes: CodeNode[];
  /** Currently-selected code ids. */
  selected: string[];
  /** Toggle a single code id on/off. */
  onToggle: (codeId: string) => void;
  /** Trigger label (e.g. "Overall tags", "Filter by tag"). */
  label: string;
  /** Align the dropdown panel to the left (default) or right of the trigger. */
  align?: 'left' | 'right';
  /** Render the selected tags as colour dots on the trigger. Off for the
   *  filter, where the count is enough. */
  showDots?: boolean;
}

/** Indentation depth of a code in the master hierarchy, for the checklist. */
function depthOf(code: CodeNode, byId: Map<string, CodeNode>): number {
  let depth = 0;
  let cur: string | null | undefined = code.parentId;
  while (cur && depth < 8) {
    const parent = byId.get(cur);
    if (!parent) break;
    cur = parent.parentId;
    depth++;
  }
  return depth;
}

export default function OverallTagPicker({
  codes,
  selected,
  onToggle,
  label,
  align = 'left',
  showDots = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Master codes in tree order (already the order they're declared), filtered
  // by the search box. When searching, drop the indentation so hits read flat.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return codes.map(c => ({ code: c, depth: depthOf(c, byId) }));
    return codes
      .filter(c => c.name.toLowerCase().includes(q))
      .map(c => ({ code: c, depth: 0 }));
  }, [codes, byId, query]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectedCodes = useMemo(
    () => selected.map(id => byId.get(id)).filter(Boolean) as CodeNode[],
    [selected, byId],
  );

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border border-grey-200 text-tertiary-dark hover:border-secondary transition"
        title="Choose the document-level tags that describe this source"
      >
        {showDots && selectedCodes.length > 0 && (
          <span className="flex items-center gap-0.5">
            {selectedCodes.slice(0, 4).map(c => (
              <span
                key={c.id}
                className="w-1.5 h-1.5 rounded-sm"
                style={{ backgroundColor: c.color }}
                aria-hidden
              />
            ))}
          </span>
        )}
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-tertiary-light">{selected.length}</span>
        <span className="text-tertiary-light" aria-hidden>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          className={`absolute z-30 mt-1 w-64 rounded-lg border border-grey-200 bg-white shadow-lg p-2 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tags…"
            autoFocus
            className="w-full px-2 py-1 border border-grey-200 rounded text-[12px] mb-2"
          />
          <ul className="max-h-[40vh] overflow-y-auto space-y-0.5">
            {visible.map(({ code, depth }) => {
              const on = selectedSet.has(code.id);
              return (
                <li key={code.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(code.id)}
                    className={`w-full flex items-center gap-1.5 text-left px-1.5 py-1 rounded text-[11px] transition ${
                      on ? 'bg-secondary/10 text-tertiary-dark' : 'hover:bg-grey-50 text-tertiary'
                    }`}
                    style={{ paddingLeft: `${6 + depth * 12}px` }}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                        on ? 'bg-secondary border-secondary text-white' : 'border-grey-300'
                      }`}
                      aria-hidden
                    >
                      {on && <span className="text-[9px] leading-none">✓</span>}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-sm shrink-0"
                      style={{ backgroundColor: code.color }}
                      aria-hidden
                    />
                    <span className="truncate">{code.name}</span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="text-[11px] text-tertiary-light px-2 py-1">No matching tags.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
