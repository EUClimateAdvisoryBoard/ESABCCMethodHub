/**
 * Sector Frameworks explorer — the top-level shell for the MethodHub view that
 * turns the report's assessment-framework figures into an interactive board.
 *
 * Two views:
 *   • Flow charts — every sector framework as a connected, editable board of
 *     cards (goal → outcomes → levers → enabling conditions). Sectors can be
 *     expanded individually; indicator chips open the data behind them.
 *   • Indicators  — the underlying indicator database as a searchable list.
 *
 * Edits to the board (relabel / add / remove / re-wire cards and indicator
 * links) persist to localStorage, so the board is a living artefact rather than
 * a static screenshot. "Reset" restores the published report frameworks.
 */
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ESABCC_REPORT_INDICATORS } from '@/data/esabcc-indicators';
import {
  defaultFrameworkBoard,
  FRAMEWORK_BOARD_VERSION,
  resolveIndicators,
  type FrameworkBoard,
  type SectorFramework,
} from '@/data/sector-frameworks';
import SectorFlow, { type OpenIndicatorPayload } from './SectorFlow';
import IndicatorDetail from './IndicatorDetail';
import IndicatorListView from './IndicatorListView';

const STORAGE_KEY = 'esabcc-framework-board';

type Tab = 'flowcharts' | 'indicators';

export default function FrameworkExplorer() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('flowcharts');
  const [board, setBoard] = useState<FrameworkBoard>(() => defaultFrameworkBoard());
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<OpenIndicatorPayload | null>(null);
  const [listFocus, setListFocus] = useState<string | null>(null);

  const allIndicators = ESABCC_REPORT_INDICATORS;

  // ── load persisted edits ────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FrameworkBoard;
        if (parsed.version === FRAMEWORK_BOARD_VERSION && Array.isArray(parsed.sectors)) {
          setBoard(parsed);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  // ── persist on change (after mount) ──────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    } catch {
      /* quota / private mode — non-fatal */
    }
  }, [board, mounted]);

  const updateSector = useCallback((next: SectorFramework) => {
    setBoard((b) => ({ ...b, sectors: b.sectors.map((s) => (s.id === next.id ? next : s)) }));
  }, []);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allExpanded = expanded.size === board.sectors.length;
  const expandAll = () => setExpanded(new Set(allExpanded ? [] : board.sectors.map((s) => s.id)));

  const resetBoard = () => {
    if (confirm('Reset all sector frameworks to the published report version? Your edits will be lost.')) {
      setBoard(defaultFrameworkBoard());
    }
  };

  const exportBoard = () => {
    const blob = new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esabcc-sector-frameworks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const drawerIndicators = useMemo(
    () => (drawer ? resolveIndicators(drawer.indicatorIds) : []),
    [drawer],
  );

  const openInList = (id: string) => {
    setListFocus(id);
    setTab('indicators');
    setDrawer(null);
  };

  // counts for the overview summary
  const counts = (s: SectorFramework) => {
    const refs = [
      ...s.goalIndicators,
      ...s.outcomes.flatMap((o) => o.indicators),
      ...s.levers.flatMap((l) => l.indicators),
    ];
    const linked = refs.filter((r) => r.indicatorIds.length > 0).length;
    return { levers: s.levers.length, indicators: refs.length, linked };
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
      {/* header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Sector frameworks</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">
          The ESABCC report assesses each sector with a framework that flows from the climate goal,
          through outcomes and mitigation levers, down to enabling conditions. The white boxes are the
          progress indicators. Here those figures are a connected, editable board — click any indicator
          chip to open the data behind it.
        </p>
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-[#E6E7E8] dark:border-[var(--mh-border,#333)] mb-5">
        <TabButton active={tab === 'flowcharts'} onClick={() => setTab('flowcharts')}>
          Flow charts
        </TabButton>
        <TabButton active={tab === 'indicators'} onClick={() => setTab('indicators')}>
          Indicators
        </TabButton>
      </div>

      {tab === 'flowcharts' && (
        <>
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button
              onClick={() => setEditing((e) => !e)}
              className={`text-sm px-3 py-1.5 rounded-lg border font-medium ${
                editing
                  ? 'bg-[#3D6E8C] text-white border-[#3D6E8C]'
                  : 'border-[#E6E7E8] dark:border-[var(--mh-border,#333)] hover:border-[#3D6E8C]'
              }`}
            >
              {editing ? '✓ Editing' : '✎ Edit board'}
            </button>
            <button
              onClick={expandAll}
              className="text-sm px-3 py-1.5 rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border,#333)] hover:border-[#3D6E8C]"
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
            <div className="flex-1" />
            <button onClick={exportBoard} className="text-sm px-3 py-1.5 rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border,#333)] hover:border-[#3D6E8C]">
              Export JSON
            </button>
            <button onClick={resetBoard} className="text-sm px-3 py-1.5 rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border,#333)] text-red-600 hover:border-red-400">
              Reset to report
            </button>
          </div>

          {editing && (
            <div className="mb-5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Edit mode: rename cards, delete (×), add cards per layer, link/unlink indicators, and re-wire which
              outcome a lever feeds into. Changes are saved to this browser automatically.
            </div>
          )}

          {/* sector panels */}
          <div className="space-y-4">
            {board.sectors.map((s) => {
              const isOpen = expanded.has(s.id);
              const c = counts(s);
              return (
                <section
                  key={s.id}
                  className="rounded-xl border border-[#E6E7E8] dark:border-[var(--mh-border,#333)] overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAFAF7] dark:hover:bg-white/5"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-[11px] text-gray-400">{s.figure}</span>
                    <span className="hidden sm:block text-sm text-gray-500 truncate flex-1">{s.goal}</span>
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {c.levers} levers · {c.linked}/{c.indicators} indicators linked
                    </span>
                    <span className="text-gray-400 shrink-0">{isOpen ? '▾' : '▸'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 pt-1 border-t border-[#F0F0EE] dark:border-white/5">
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
        </>
      )}

      {tab === 'indicators' && <IndicatorListView indicators={allIndicators} focusId={listFocus} />}

      {drawer && (
        <IndicatorDetail
          title={drawer.title}
          code={drawer.code}
          indicators={drawerIndicators}
          onClose={() => setDrawer(null)}
          onOpenInList={openInList}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
        active ? 'border-[#3D6E8C] text-[#3D6E8C]' : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}
