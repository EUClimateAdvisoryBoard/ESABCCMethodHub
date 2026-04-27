'use client';

import { useMemo, useState } from 'react';
import type { CodeNode } from '@/lib/content-analysis/types';
import { codesByParent } from '@/lib/content-analysis/store';

interface Props {
  codes: CodeNode[];
  /** Segment-count per code (direct hits only, not descendants). */
  counts: Record<string, number>;
  selectedCodeId: string | null;
  onSelect: (codeId: string) => void;
  onAddChild: (parentId: string | null) => void;
  onRename: (codeId: string) => void;
  onRecolor: (codeId: string) => void;
  onDelete: (codeId: string) => void;
  /** Reparent: drop or keyboard ⌘← / ⌘→ moves a code under a new parent. */
  onMove?: (codeId: string, newParentId: string | null) => void;
  /** Merge: Shift+drop merges the source subtree into the target code. */
  onMerge?: (sourceId: string, targetId: string) => void;
  /** Optional checkbox mode for project-scope selection. */
  selection?: Set<string>;
  onToggleSelect?: (codeId: string) => void;
  emptyLabel?: string;
  /** Optional rich empty-state actions (M·05 #9). When provided, the tree
      renders illustrated paths instead of the plain emptyLabel string. */
  onSeedFromTemplate?: () => void;
  onImportCodebook?: () => void;
  /** Visibility filter for the segments panel. When non-null, the colored
   *  square next to each code becomes a toggle: clicking it adds the code
   *  (and its descendants on a parent click) to / removes it from the
   *  active set. Empty set ⇒ no codes active ⇒ no segments shown. */
  activeFilter?: Set<string>;
  /** Toggle handler. Receives the clicked code id and a flag indicating
   *  whether the click should also cascade into the code's descendants. */
  onToggleActive?: (codeId: string, cascadeToDescendants: boolean) => void;
}

/**
 * Collapsible hierarchical code system, MAXQDA-style.
 * Click a row to select; ▸/▾ toggles children; action icons appear on hover.
 */
export default function CodeSystemTree({
  codes,
  counts,
  selectedCodeId,
  onSelect,
  onAddChild,
  onRename,
  onRecolor,
  onDelete,
  onMove,
  onMerge,
  selection,
  onToggleSelect,
  emptyLabel,
  onSeedFromTemplate,
  onImportCodebook,
  activeFilter,
  onToggleActive,
}: Props) {
  const [dragOverId, setDragOverId] = useState<string | 'root' | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'merge'>('move');
  const byParent = useMemo(() => codesByParent(codes), [codes]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Ids of every node that has at least one child — used by the
  // "Collapse all" / "Expand all" header controls.
  const collapsibleIds = useMemo(
    () => codes.filter(c => (byParent.get(c.id) ?? []).length > 0).map(c => c.id),
    [codes, byParent],
  );
  const allCollapsed = collapsibleIds.length > 0 && collapsibleIds.every(id => collapsed.has(id));
  const collapseAll = () => setCollapsed(new Set(collapsibleIds));
  const expandAll = () => setCollapsed(new Set());

  // Sticky breadcrumb (M·05 #10): when a code is selected, build the path
  // from root → leaf so the user keeps spatial context in deep trees.
  const breadcrumb = useMemo(() => {
    if (!selectedCodeId) return null;
    const byId = new Map<string, CodeNode>();
    codes.forEach(c => byId.set(c.id, c));
    const path: CodeNode[] = [];
    let cur: CodeNode | undefined = byId.get(selectedCodeId);
    let guard = 0;
    while (cur && guard++ < 16) {
      path.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return path.length > 1 ? path : null;
  }, [codes, selectedCodeId]);

  const roots = byParent.get(null) ?? [];
  if (roots.length === 0) {
    // Rich empty state (M·05 #9) when handlers are wired; falls back to
    // the legacy single-line label for callers that haven't migrated.
    if (onAddChild || onSeedFromTemplate || onImportCodebook) {
      return (
        <div className="px-3 py-6 flex flex-col gap-3 items-stretch">
          <p className="text-[12.5px] text-[#3D5265] font-medium">No code book yet — pick a starting point.</p>
          <button
            type="button"
            onClick={() => onAddChild?.(null)}
            className="mh-focus mh-motion-fast text-left px-3 py-2 rounded-md border border-[var(--mh-border)] bg-[var(--mh-card)] hover:border-[var(--mh-status-primary)]"
          >
            <div className="text-[12px] font-semibold text-[var(--mh-status-primary)]">Build from scratch</div>
            <div className="text-[11px] text-[var(--mh-muted)]">Start with a single root tag and grow as you code.</div>
          </button>
          {onSeedFromTemplate && (
            <button
              type="button"
              onClick={onSeedFromTemplate}
              className="mh-focus mh-motion-fast text-left px-3 py-2 rounded-md border border-[var(--mh-border)] bg-[var(--mh-card)] hover:border-[var(--mh-status-primary)]"
            >
              <div className="text-[12px] font-semibold text-[var(--mh-status-primary)]">Use a template</div>
              <div className="text-[11px] text-[var(--mh-muted)]">Seed ~30 IPCC AR6 / IPBES codes so the tree has shape immediately.</div>
            </button>
          )}
          {onImportCodebook && (
            <button
              type="button"
              onClick={onImportCodebook}
              className="mh-focus mh-motion-fast text-left px-3 py-2 rounded-md border border-[var(--mh-border)] bg-[var(--mh-card)] hover:border-[var(--mh-status-primary)]"
            >
              <div className="text-[12px] font-semibold text-[var(--mh-status-primary)]">Import a code book</div>
              <div className="text-[11px] text-[var(--mh-muted)]">CSV, QDPX or RIS — bring an existing scheme.</div>
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="text-[12px] italic text-[#8A95A3] px-3 py-4">
        {emptyLabel ?? 'No tags yet.'}
      </div>
    );
  }

  // Keyboard equivalent for drag (WCAG 2.5.7). When a row is focused:
  //   ⌘←   reparent up one level (move under grandparent)
  //   ⌘→   reparent under previous sibling
  //   ⌘↑   reorder up among current siblings (best-effort: re-parents)
  //   ⌘↓   reorder down (same)
  // Implemented as a "promote/demote" pair against the existing onMove
  // because the tree doesn't expose ordering APIs.
  const onRowKeyDown = (e: React.KeyboardEvent, node: CodeNode) => {
    if (!onMove) return;
    if (!(e.metaKey || e.ctrlKey)) return;
    const siblings = (byParent.get(node.parentId ?? null) ?? []) as CodeNode[];
    const idx = siblings.findIndex(s => s.id === node.id);
    if (e.key === 'ArrowLeft') {
      // Promote: move up one level (under grandparent).
      const parent = node.parentId ? codes.find(c => c.id === node.parentId) : null;
      const grand = parent?.parentId ?? null;
      if (parent || node.parentId !== null) {
        e.preventDefault();
        onMove(node.id, grand);
      }
    } else if (e.key === 'ArrowRight') {
      // Demote: become a child of the previous sibling.
      if (idx > 0) {
        e.preventDefault();
        onMove(node.id, siblings[idx - 1].id);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // No reorder API in store yet — feedback would lie. Fall through.
    }
  };

  const renderNode = (node: CodeNode, depth: number) => {
    const children = byParent.get(node.id) ?? [];
    const isCollapsed = collapsed.has(node.id);
    const isSelected = selectedCodeId === node.id;
    const count = counts[node.id] ?? 0;
    const checked = selection?.has(node.id);
    const isDragOver = dragOverId === node.id;

    return (
      <li key={node.id}>
        <div
          tabIndex={onMove ? 0 : -1}
          draggable={!!onMove || !!onMerge}
          onDragStart={e => {
            if (!onMove && !onMerge) return;
            e.dataTransfer.setData('mh/code', node.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={e => {
            const src = e.dataTransfer.getData('mh/code') || dragOverId === node.id ? node.id : null;
            if (!onMove && !onMerge) return;
            // Don't allow dropping a node on itself.
            e.preventDefault();
            setDragOverId(node.id);
            setDragMode(e.shiftKey ? 'merge' : 'move');
          }}
          onDragLeave={() => { if (dragOverId === node.id) setDragOverId(null); }}
          onDrop={e => {
            e.preventDefault();
            const sourceId = e.dataTransfer.getData('mh/code');
            setDragOverId(null);
            if (!sourceId || sourceId === node.id) return;
            if (e.shiftKey && onMerge) onMerge(sourceId, node.id);
            else if (onMove) onMove(sourceId, node.id);
          }}
          onKeyDown={e => onRowKeyDown(e, node)}
          className={`group relative flex items-center gap-1.5 pr-2 py-1 rounded-sm cursor-pointer mh-focus mh-motion-fast ${
            isSelected ? 'bg-[#00928F]/10' : 'hover:bg-[#F3F4F6]'
          } ${isDragOver ? (dragMode === 'merge' ? 'ring-2 ring-[var(--mh-status-warning)]' : 'ring-2 ring-[var(--mh-status-primary)]') : ''}`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {/* Vertical guide lines — one per ancestor level. Helps scan deep
              trees without losing the parent-child link visually. */}
          {Array.from({ length: depth }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="pointer-events-none absolute top-0 bottom-0 border-l border-[#E6E7E8]"
              style={{ left: `${i * 14 + 10}px` }}
            />
          ))}
          {children.length > 0 ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toggle(node.id); }}
              className="w-4 h-4 inline-flex items-center justify-center text-[10px] text-[#8A95A3] shrink-0"
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span className="w-4 h-4 inline-block shrink-0" />
          )}

          {onToggleSelect && (
            <input
              type="checkbox"
              checked={!!checked}
              onChange={e => { e.stopPropagation(); onToggleSelect(node.id); }}
              onClick={e => e.stopPropagation()}
              className="w-3 h-3 accent-[#00928F] shrink-0"
              aria-label={`Select ${node.name}`}
            />
          )}

          {onToggleActive ? (
            (() => {
              const isActive = !!activeFilter?.has(node.id);
              return (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    // Clicking on a parent cascades to descendants; on a leaf
                    // the cascade flag is harmless.
                    onToggleActive(node.id, children.length > 0);
                  }}
                  className="w-3 h-3 rounded-sm shrink-0 transition"
                  style={{
                    backgroundColor: isActive ? node.color : 'transparent',
                    border: isActive ? `1px solid ${node.color}` : `1px dashed ${node.color}`,
                    opacity: isActive ? 1 : 0.55,
                  }}
                  aria-pressed={isActive}
                  aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${node.name}`}
                  title={
                    isActive
                      ? `Active — click to hide segments tagged "${node.name}"`
                      : `Inactive — click to show segments tagged "${node.name}"${children.length > 0 ? ' and its sub-tags' : ''}`
                  }
                />
              );
            })()
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: node.color }}
              aria-hidden
            />
          )}

          <button
            type="button"
            onClick={() => onSelect(node.id)}
            className="flex-1 text-left text-[12.5px] leading-tight truncate text-[#3D5265]"
            title={node.description || node.name}
          >
            {node.name}
          </button>

          <span className="font-mono text-[10px] text-[#8A95A3] tabular-nums shrink-0">
            {count}
          </span>

          <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <ActionButton title="Add child tag" onClick={() => onAddChild(node.id)}>＋</ActionButton>
            <ActionButton title="Rename" onClick={() => onRename(node.id)}>✎</ActionButton>
            <ActionButton title="Colour" onClick={() => onRecolor(node.id)}>◐</ActionButton>
            {onMove && node.parentId && (
              <ActionButton title="Move to root level" onClick={() => onMove(node.id, null)}>↥</ActionButton>
            )}
            <ActionButton title="Delete" onClick={() => onDelete(node.id)} danger>×</ActionButton>
          </span>
        </div>
        {!isCollapsed && children.length > 0 && (
          <ul>{children.map(c => renderNode(c, depth + 1))}</ul>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Sticky breadcrumb (M·05 #10) — only renders when a code is selected
          and lives more than one level deep, so shallow trees don't gain
          chrome they don't need. */}
      {breadcrumb && (
        <div
          className="sticky top-0 z-10 bg-[var(--mh-card)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--mh-card)]/85 border-b border-[var(--mh-border)] px-3 py-1.5"
          style={{ fontSize: 'var(--mh-text-2xs)' }}
        >
          <ol className="flex items-center gap-1 flex-wrap text-[var(--mh-muted)]">
            {breadcrumb.map((c, i) => (
              <li key={c.id} className="inline-flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">›</span>}
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`mh-focus hover:underline ${i === breadcrumb.length - 1 ? 'text-[var(--mh-fg)] font-semibold' : ''}`}
                >
                  <span aria-hidden="true" className="inline-block w-2 h-2 rounded-sm align-middle mr-1" style={{ backgroundColor: c.color }} />
                  {c.name}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      {/* Sub-toolbar — only renders when there are collapsible nodes,
          so flat code books don't gain chrome they can't use. */}
      {collapsibleIds.length > 0 && (
        <div className="flex items-center justify-end gap-2 px-2 pt-1.5 pb-1 border-b border-[var(--mh-border)] bg-[#FBFBFA]">
          <button
            type="button"
            onClick={allCollapsed ? expandAll : collapseAll}
            className="text-[10.5px] font-medium text-[#3D5265] hover:text-[#00928F]"
            title={allCollapsed ? 'Expand every parent tag' : 'Collapse every parent tag to its root'}
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        </div>
      )}
      {/* Root drop zone — drop a tag here to promote it to a root tag.
          Only renders when reparenting is enabled, and only highlights when
          there's actually a code being dragged over it. */}
      {onMove && (
        <div
          onDragOver={e => {
            if (!e.dataTransfer.types.includes('mh/code')) return;
            e.preventDefault();
            setDragOverId('root');
          }}
          onDragLeave={() => { if (dragOverId === 'root') setDragOverId(null); }}
          onDrop={e => {
            e.preventDefault();
            const sourceId = e.dataTransfer.getData('mh/code');
            setDragOverId(null);
            if (!sourceId) return;
            onMove(sourceId, null);
          }}
          className={`mx-2 my-1 px-2 py-1 text-[10.5px] text-center rounded-sm border border-dashed transition ${
            dragOverId === 'root'
              ? 'border-[var(--mh-status-primary)] bg-[var(--mh-status-primary)]/10 text-[var(--mh-status-primary)]'
              : 'border-[#E6E7E8] text-[#B8BCC2]'
          }`}
        >
          Drop here to promote to root tag
        </div>
      )}
      <ul className="py-1">{roots.map(r => renderNode(r, 0))}</ul>
    </>
  );
}

function ActionButton({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`w-5 h-5 inline-flex items-center justify-center rounded-sm text-[11px] ${
        danger ? 'text-[#B83230] hover:bg-[#B83230]/10' : 'text-[#8A95A3] hover:bg-[#E6E7E8] hover:text-[#3D5265]'
      }`}
    >
      {children}
    </button>
  );
}
