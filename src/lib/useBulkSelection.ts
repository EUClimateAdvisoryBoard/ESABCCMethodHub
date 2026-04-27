'use client';
/**
 * useBulkSelection — list-agnostic multi-select hook (#8).
 *
 * Usage:
 *   const sel = useBulkSelection<Reference>('id');
 *   <li onClick={(e) => sel.handleClick(e, item)} aria-selected={sel.isSelected(item)}>…
 *   <BulkActionBar selection={sel.selected} onClear={sel.clear}>
 *     <button onClick={() => sel.selected.forEach(...)} >Export</button>
 *   </BulkActionBar>
 *
 * Supports plain click (toggle), shift-click (range from anchor), and
 * cmd/ctrl-click (toggle without clearing).
 */
import { useState, useCallback, useRef } from 'react';

export interface BulkSelection<T> {
  selected: T[];
  isSelected: (item: T) => boolean;
  toggle: (item: T) => void;
  selectRange: (items: T[], start: T, end: T) => void;
  selectAll: (items: T[]) => void;
  clear: () => void;
  handleClick: (e: React.MouseEvent, item: T, allItems: T[]) => void;
  count: number;
}

export function useBulkSelection<T extends Record<string, unknown>>(idKey: keyof T): BulkSelection<T> {
  const [selected, setSelected] = useState<T[]>([]);
  const anchorRef = useRef<T | null>(null);

  const isSelected = useCallback((item: T) => selected.some(s => s[idKey] === item[idKey]), [selected, idKey]);

  const toggle = useCallback((item: T) => {
    setSelected(prev => prev.some(s => s[idKey] === item[idKey])
      ? prev.filter(s => s[idKey] !== item[idKey])
      : [...prev, item]);
  }, [idKey]);

  const selectRange = useCallback((items: T[], start: T, end: T) => {
    const i1 = items.findIndex(x => x[idKey] === start[idKey]);
    const i2 = items.findIndex(x => x[idKey] === end[idKey]);
    if (i1 < 0 || i2 < 0) return;
    const lo = Math.min(i1, i2), hi = Math.max(i1, i2);
    const range = items.slice(lo, hi + 1);
    setSelected(prev => {
      const map = new Map(prev.map(p => [p[idKey], p]));
      for (const r of range) map.set(r[idKey], r);
      return Array.from(map.values());
    });
  }, [idKey]);

  const selectAll = useCallback((items: T[]) => setSelected([...items]), []);
  const clear = useCallback(() => { setSelected([]); anchorRef.current = null; }, []);

  const handleClick = useCallback((e: React.MouseEvent, item: T, allItems: T[]) => {
    if (e.shiftKey && anchorRef.current) {
      e.preventDefault();
      selectRange(allItems, anchorRef.current, item);
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      toggle(item);
      anchorRef.current = item;
      return;
    }
    // Plain click — replace selection unless this card already has a checkbox.
    setSelected([item]);
    anchorRef.current = item;
  }, [selectRange, toggle]);

  return {
    selected, isSelected, toggle, selectRange, selectAll, clear, handleClick,
    count: selected.length,
  };
}
