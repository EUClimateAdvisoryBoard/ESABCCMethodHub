/**
 * Sector-frameworks flow-chart view, embedded inside the Indicator database
 * module of the Project Workspace.
 *
 * Shows the six ESABCC report assessment frameworks (Figs 12, 22, 33, 46, 55,
 * 64) as a connected, editable board of cards (goal → outcomes → mitigation
 * levers → enabling conditions). The white-box indicator chips link straight
 * into the project's own indicator database; clicking one opens the data, and
 * "Open in indicator list" hands the id back to the parent module so it shows
 * in the existing table/chart view.
 *
 * Edits (relabel / add / delete cards, link/unlink indicators, re-wire levers)
 * persist to localStorage per project; "Reset" restores the published report
 * frameworks.
 */
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import {
  defaultFrameworkBoard,
  FRAMEWORK_BOARD_VERSION,
  FRAMEWORK_INDICATOR_INDEX,
  type FrameworkBoard as Board,
  type SectorFramework,
} from '@/data/sector-frameworks';
import SectorFlow, { type OpenIndicatorPayload } from '@/components/frameworks/SectorFlow';
import IndicatorDetail from '@/components/frameworks/IndicatorDetail';

interface Props {
  /** The project's indicators — used both as the link targets in edit mode and
   *  as the source of truth for the data shown when a chip is opened. */
  allIndicators: Indicator[];
  /** Hand an indicator id back to the parent so it opens in the list view. */
  onOpenInList?: (id: string) => void;
  /** Distinct localStorage namespace (per project). */
  projectId: string;
}

export default function FrameworkBoard({ allIndicators, onOpenInList, projectId }: Props) {
  const storageKey = `esabcc-framework-board:${projectId}`;
  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState<Board>(() => defaultFrameworkBoard());
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<OpenIndicatorPayload | null>(null);

  // resolve chip ids against the project's live indicators first, then the
  // static report index (covers concept boxes not seeded into a project)
  const lookup = useMemo(() => {
    const m = new Map<string, Indicator>();
    for (const i of allIndicators) m.set(i.id, i);
    return m;
  }, [allIndicators]);
  const resolve = useCallback(
    (ids: string[]) => ids.map((id) => lookup.get(id) ?? FRAMEWORK_INDICATOR_INDEX[id]).filter(Boolean) as Indicator[],
    [lookup],
  );

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Board;
        if (parsed.version === FRAMEWORK_BOARD_VERSION && Array.isArray(parsed.sectors)) setBoard(parsed);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(board));
    } catch {
      /* quota / private mode */
    }
  }, [board, mounted, storageKey]);

  const updateSector = useCallback((next: SectorFramework) => {
    setBoard((b) => ({ ...b, sectors: b.sectors.map((s) => (s.id === next.id ? next : s)) }));
  }, []);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allExpanded = expanded.size === board.sectors.length;
  const expandAll = () => setExpanded(new Set(allExpanded ? [] : board.sectors.map((s) => s.id)));

  const resetBoard = () => {
    if (confirm('Reset all sector frameworks to the published report version? Your edits will be lost.'))
      setBoard(defaultFrameworkBoard());
  };

  const drawerIndicators = useMemo(() => (drawer ? resolve(drawer.indicatorIds) : []), [drawer, resolve]);

  const counts = (s: SectorFramework) => {
    const refs = [...s.goalIndicators, ...s.outcomes.flatMap((o) => o.indicators), ...s.levers.flatMap((l) => l.indicators)];
    return { levers: s.levers.length, indicators: refs.length, linked: refs.filter((r) => r.indicatorIds.length > 0).length };
  };

  return (
    <div>
      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        The ESABCC report assesses each sector with a framework that flows from the climate goal, through
        outcomes and mitigation levers, down to enabling conditions. The white boxes are the progress
        indicators in this database — click any chip to open the data behind it.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setEditing((e) => !e)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-md border ${
            editing ? 'bg-primary text-white border-primary' : 'border-grey-200 text-tertiary-dark hover:bg-grey-50'
          }`}
        >
          {editing ? '✓ Editing' : '✎ Edit board'}
        </button>
        <button
          onClick={expandAll}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-grey-200 text-tertiary-dark hover:bg-grey-50"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
        <div className="flex-1" />
        <button
          onClick={resetBoard}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-grey-200 text-red-600 hover:border-red-300"
        >
          Reset to report
        </button>
      </div>

      {editing && (
        <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Edit mode: rename cards, delete (×), add cards per layer, link/unlink indicators, and re-wire which
          outcome a lever feeds into. Changes are saved to this browser automatically.
        </div>
      )}

      <div className="space-y-3">
        {board.sectors.map((s) => {
          const isOpen = expanded.has(s.id);
          const c = counts(s);
          return (
            <section key={s.id} className="rounded-xl border border-grey-200 overflow-hidden bg-white">
              <button
                onClick={() => toggleExpand(s.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-grey-50"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="font-semibold text-tertiary-dark">{s.name}</span>
                <span className="text-[11px] text-tertiary-light">{s.figure}</span>
                <span className="hidden sm:block text-sm text-tertiary truncate flex-1">{s.goal}</span>
                <span className="text-[11px] text-tertiary-light shrink-0">
                  {c.levers} levers · {c.linked}/{c.indicators} indicators linked
                </span>
                <span className="text-tertiary-light shrink-0">{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-5 pt-1 border-t border-grey-100">
                  <SectorFlow
                    sector={s}
                    editing={editing}
                    allIndicators={allIndicators}
                    onChange={updateSector}
                    onOpenIndicator={setDrawer}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>

      {drawer && (
        <IndicatorDetail
          title={drawer.title}
          code={drawer.code}
          indicators={drawerIndicators}
          onClose={() => setDrawer(null)}
          onOpenInList={
            onOpenInList
              ? (id) => {
                  onOpenInList(id);
                  setDrawer(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
