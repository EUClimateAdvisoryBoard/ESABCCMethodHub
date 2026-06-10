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
import { formatCustomTagId, isCustomTagId, parseCustomTag } from '@/lib/content-analysis/custom-overall-tags';

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
  /** Allow coining a custom tag that isn't in the master list. When on, the
   *  dropdown offers a "+ Create" action for whatever you type in the search
   *  box. Off for the library filter, which can only match existing tags. */
  allowCustom?: boolean;
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
  allowCustom = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // The master pool contains some codes that share a display name (e.g. the
  // root "Finance" and the domain-derived "Finance"). The checklist collapses
  // each name to a single row; this map records every id behind a name so the
  // row can reflect — and untoggle — whichever duplicate a document actually
  // carries. Nothing is deleted from the pool, so tags already applied under
  // a duplicate id keep resolving everywhere.
  const idsByName = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of codes) {
      const key = c.name.trim().toLowerCase();
      const ids = m.get(key);
      if (ids) ids.push(c.id);
      else m.set(key, [c.id]);
    }
    return m;
  }, [codes]);

  // Master codes in tree order (already the order they're declared), filtered
  // by the search box. When searching, drop the indentation so hits read flat.
  // Duplicate names collapse to their first (canonical) occurrence.
  const visible = useMemo(() => {
    const seen = new Set<string>();
    const pool = codes.filter(c => {
      const key = c.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const q = query.trim().toLowerCase();
    if (!q) return pool.map(c => ({ code: c, depth: depthOf(c, byId) }));
    return pool
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

  // Resolved selected tags, collapsed by name so a document carrying two
  // same-named ids (root + domain duplicates) counts as one tag.
  const selectedCodes = useMemo(() => {
    const out: CodeNode[] = [];
    const seen = new Set<string>();
    for (const id of selected) {
      const c = byId.get(id) ?? parseCustomTag(id);
      if (!c) continue;
      const key = c.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [selected, byId]);

  // Already-selected custom tags — they aren't in the master pool, so surface
  // them at the top of the checklist where they can be toggled back off.
  const selectedCustom = useMemo(
    () => selected.filter(isCustomTagId).map(parseCustomTag).filter(Boolean) as CodeNode[],
    [selected],
  );

  // Offer a "+ Create" row when the search box holds a name that isn't already
  // an exact (case-insensitive) match for a master code or a selected tag.
  const trimmedQuery = query.trim();
  const canCreate = useMemo(() => {
    if (!allowCustom || !trimmedQuery) return false;
    const lc = trimmedQuery.toLowerCase();
    const existsInPool = codes.some(c => c.name.toLowerCase() === lc);
    const existsSelected = selectedCustom.some(c => c.name.toLowerCase() === lc);
    return !existsInPool && !existsSelected;
  }, [allowCustom, trimmedQuery, codes, selectedCustom]);

  const createCustom = () => {
    onToggle(formatCustomTagId(trimmedQuery));
    setQuery('');
  };

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
        <span className="font-mono text-tertiary-light">{selectedCodes.length}</span>
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
            onKeyDown={e => {
              if (e.key === 'Enter' && canCreate) { e.preventDefault(); createCustom(); }
            }}
            placeholder={allowCustom ? 'Search or add a tag…' : 'Search tags…'}
            autoFocus
            className="w-full px-2 py-1 border border-grey-200 rounded text-[12px] mb-2"
          />
          <ul className="max-h-[40vh] overflow-y-auto space-y-0.5">
            {canCreate && (
              <li>
                <button
                  type="button"
                  onClick={createCustom}
                  className="w-full flex items-center gap-1.5 text-left px-1.5 py-1 rounded text-[11px] text-secondary hover:bg-secondary/10 transition"
                >
                  <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-[12px] leading-none">+</span>
                  <span className="truncate">Create “{trimmedQuery}”</span>
                </button>
              </li>
            )}
            {/* Selected custom tags — not in the master pool, shown so they can
                be removed. Hidden while searching for a non-matching name. */}
            {selectedCustom
              .filter(c => !trimmedQuery || c.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
              .map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(c.id)}
                    className="w-full flex items-center gap-1.5 text-left px-1.5 py-1 rounded text-[11px] bg-secondary/10 text-tertiary-dark transition"
                    style={{ paddingLeft: '6px' }}
                  >
                    <span className="w-3.5 h-3.5 rounded-sm border bg-secondary border-secondary text-white flex items-center justify-center shrink-0">
                      <span className="text-[9px] leading-none">✓</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} aria-hidden />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-[9px] text-tertiary-light uppercase tracking-wide">custom</span>
                  </button>
                </li>
              ))}
            {visible.map(({ code, depth }) => {
              // A row stands for every code sharing its name. It reads as
              // checked when any of them is applied; toggling off removes the
              // id the document actually carries, toggling on adds the
              // canonical (first-declared) one.
              const groupIds = idsByName.get(code.name.trim().toLowerCase()) ?? [code.id];
              const selectedId = groupIds.find(id => selectedSet.has(id));
              const on = selectedId !== undefined;
              return (
                <li key={code.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(selectedId ?? code.id)}
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
            {visible.length === 0 && !canCreate && selectedCustom.length === 0 && (
              <li className="text-[11px] text-tertiary-light px-2 py-1">No matching tags.</li>
            )}
          </ul>
          {allowCustom && !trimmedQuery && (
            <p className="text-[10px] text-tertiary-light px-1.5 pt-1.5 mt-1.5 border-t border-grey-100">
              + Type a new name above to create your own tag.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
