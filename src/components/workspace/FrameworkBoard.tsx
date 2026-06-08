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
  defaultFrameworkBoardReport,
  defaultFrameworkBoardBeta,
  defaultFrameworkBoardAdvancedV1,
  FRAMEWORK_INDICATOR_INDEX,
  type FrameworkBoard as Board,
  type SectorFramework,
} from '@/data/sector-frameworks';
import {
  boardSchemaVersion,
  boardStorageKey,
  defaultBoardFor,
  type FlowChartVersion,
} from '@/lib/project-workspace/flowchart-versions';
import SectorFlow, { type OpenIndicatorPayload } from '@/components/frameworks/SectorFlow';
import OverviewFigure from '@/components/frameworks/OverviewFigure';
import IndicatorDetail from '@/components/frameworks/IndicatorDetail';

interface Props {
  /** The project's indicators — used both as the link targets in edit mode and
   *  as the source of truth for the data shown when a chip is opened. */
  allIndicators: Indicator[];
  /** Hand an indicator id back to the parent so it opens in the list view. */
  onOpenInList?: (id: string) => void;
  /** Distinct localStorage namespace (per project). */
  projectId: string;
  /**
   * The flow-chart version this board renders. Built-in versions are the
   * published report frameworks ('report') and the report + adaptation-layer
   * beta board ('beta'); custom versions are copies a user has started from one
   * of those (or from another custom version) and edited freely.
   */
  version: FlowChartVersion;
}

export default function FrameworkBoard({ allIndicators, onOpenInList, projectId, version }: Props) {
  const isBeta = version.variant === 'beta';
  const isAdvanced = version.variant === 'advanced';
  // Both the beta and advanced boards present adaptation as a first-class track.
  const hasAdaptation = isBeta || isAdvanced;
  const boardVersion = boardSchemaVersion(version);
  const storageKey = boardStorageKey(version, projectId);
  // Initial state is the version's published default so server and first client
  // render match (the saved board / custom-version content is loaded on mount,
  // mirroring how built-in boards already flash from default to saved edits).
  // The two 'report'-variant built-ins differ: 'report-faithful' is the board
  // 1:1 with the report figures, 'report' is the enhanced board.
  const pureDefault = useCallback(() => {
    if (isAdvanced) return defaultFrameworkBoardAdvancedV1();
    if (isBeta) return defaultFrameworkBoardBeta();
    if (version.id === 'report-faithful') return defaultFrameworkBoardReport();
    return defaultFrameworkBoard();
  }, [isAdvanced, isBeta, version.id]);
  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState<Board>(() => pureDefault());
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
        if (parsed.version === boardVersion && Array.isArray(parsed.sectors)) {
          setBoard(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    // No (valid) saved board yet. Custom versions start from their seed
    // snapshot; built-ins keep the published default already in state.
    if (!version.builtIn) setBoard(defaultBoardFor(version, projectId));
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

  // ── add / delete a whole flow chart (no coding needed) ───────────────────
  const addSector = () => {
    const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const outcomeId = uid('o');
    const s: SectorFramework = {
      id: uid('sector'),
      name: 'New flow chart',
      figure: 'Custom',
      color: '#3D6E8C',
      goal: 'Describe the goal of this flow chart',
      goalIndicators: [],
      outcomes: [{ id: outcomeId, layer: 'outcome', label: 'New outcome', parents: ['goal'], indicators: [] }],
      levers: [{ id: uid('l'), layer: 'lever', label: 'New lever', parents: [outcomeId], indicators: [] }],
      enabling: [],
    };
    setBoard((b) => ({ ...b, sectors: [...b.sectors, s] }));
    setEditing(true);
    setExpanded((prev) => new Set(prev).add(s.id));
    requestAnimationFrame(() =>
      document.getElementById(`sector-section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };
  const deleteSector = (id: string) => {
    if (confirm('Delete this entire flow chart? This cannot be undone.'))
      setBoard((b) => ({ ...b, sectors: b.sectors.filter((s) => s.id !== id) }));
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const expandAndScroll = (id: string) => {
    setExpanded((prev) => new Set(prev).add(id));
    requestAnimationFrame(() =>
      document.getElementById(`sector-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };
  const allExpanded = expanded.size === board.sectors.length;
  const expandAll = () => setExpanded(new Set(allExpanded ? [] : board.sectors.map((s) => s.id)));

  const resetBoard = () => {
    const msg = version.builtIn
      ? isBeta
        ? 'Reset the beta flow charts (report frameworks + adaptation layer)? Your edits will be lost.'
        : `Reset “${version.name}” to its published version? Your edits will be lost.`
      : `Reset “${version.name}” to the copy it started from${
          version.basedOnName ? ` (${version.basedOnName})` : ''
        }? Your edits to this version will be lost.`;
    if (confirm(msg)) setBoard(defaultBoardFor(version, projectId));
  };

  const drawerIndicators = useMemo(() => (drawer ? resolve(drawer.indicatorIds) : []), [drawer, resolve]);

  const counts = (s: SectorFramework) => {
    const refs = [...s.goalIndicators, ...s.outcomes.flatMap((o) => o.indicators), ...s.levers.flatMap((l) => l.indicators)];
    return { levers: s.levers.length, indicators: refs.length, linked: refs.filter((r) => r.indicatorIds.length > 0).length };
  };

  return (
    <div>
      {isAdvanced ? (
        <p className="text-sm text-tertiary mb-4 max-w-3xl">
          <span className="font-semibold text-indigo-700">Advanced version 1:</span> a deeper, higher-data-quality
          build of the six frameworks. Each mitigation outcome and lever is enriched with{' '}
          <span className="font-semibold">long, well-sourced indicator series</span> (e.g. the 2004– renewable
          share, the 2005– EU ETS series, the 2010– circular-material-use rate, EEA new-car CO₂, and the
          declining Nature-2025 forest carbon sink). Crucially,{' '}
          <span className="font-semibold">adaptation &amp; resilience is a first-class track of equal weight to
          mitigation</span>: every sector carries its own adaptation outcomes, levers and enabling conditions
          (marked{' '}
          <span className="align-middle inline-flex items-center rounded bg-teal-100 text-teal-800 px-1 text-[10px] font-semibold">
            ⛨ adapt
          </span>
          ), anchored in the EEA European Climate Risk Assessment (EUCRA 2024) and wired to high-quality
          resilience series from the EEA, Copernicus, JRC, EFFIS, ECDC and the Nature / Lancet literature
          (economic losses since 1980, sea-level rise since 1993, wildfire burnt area, heat mortality, West
          Nile cases, crop-loss severity, …). Click any chip to open the data behind it.
        </p>
      ) : isBeta ? (
        <p className="text-sm text-tertiary mb-4 max-w-3xl">
          <span className="font-semibold text-teal-700">Beta:</span> a copy of the six report flow charts
          with an added <span className="font-semibold">adaptation &amp; resilience</span> layer. Alongside
          the mitigation levers, each sector now carries adaptation outcomes, adaptation levers and
          adaptation enabling conditions (marked{' '}
          <span className="align-middle inline-flex items-center rounded bg-teal-100 text-teal-800 px-1 text-[10px] font-semibold">
            ⛨ adapt
          </span>
          ), wired to provisional <span className="font-semibold">beta adaptation indicators</span> from the
          EEA, JRC, Eurostat and the ECNO adaptation building block. Click any chip to open the data behind it.
        </p>
      ) : (
        <p className="text-sm text-tertiary mb-4 max-w-3xl">
          The ESABCC report assesses each sector with a framework that flows from the climate goal, through
          outcomes and mitigation levers, down to enabling conditions. The white boxes are the progress
          indicators in this database — click any chip to open the data behind it. Dashed{' '}
          <span className="text-tertiary-light">no&nbsp;data</span> boxes are concepts the report names but
          for which no time series is curated yet; link one to an indicator in edit mode.
          {version.id === 'report' ? (
            <>
              {' '}
              <span className="font-semibold">Enhanced:</span> this version goes beyond the report by also
              giving every mitigation lever and outcome an indicator — the levers the report drew without one
              are filled with a provisional <span className="font-semibold">beta</span> (β) or fitting
              existing series. The default <span className="font-semibold">ESABCC report</span> version leaves
              those levers blank, exactly as drawn.
            </>
          ) : (
            <>
              {' '}
              This is the default view — 1:1 with the report figures, so some mitigation levers carry no
              indicator. The <span className="font-semibold">Enhanced flow charts</span> version fills those
              gaps with provisional series.
            </>
          )}
        </p>
      )}

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
        <button
          onClick={addSector}
          className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary-dark"
        >
          + New flow chart
        </button>
        <div className="flex-1" />
        <button
          onClick={resetBoard}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-grey-200 text-red-600 hover:border-red-300"
          title={
            version.builtIn
              ? 'Restore this version to its published content'
              : 'Restore this version to the copy it was created from'
          }
        >
          {version.builtIn ? 'Reset to published' : 'Reset to original copy'}
        </button>
      </div>

      {editing && (
        <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Edit mode: rename cards, delete (×), add cards per layer, link/unlink indicators, and re-wire which
          outcome a lever feeds into. Changes are saved to this browser automatically.
        </div>
      )}

      {/* Simplified overview: all sectors + indicators connected to the goal. */}
      <div className="rounded-xl border border-grey-200 bg-white p-4 mb-5">
        <div className="text-[11px] uppercase tracking-wide text-tertiary-light font-semibold mb-3">
          Overview — all sector frameworks
        </div>
        <OverviewFigure sectors={board.sectors} onOpenIndicator={setDrawer} onExpand={expandAndScroll} />
      </div>

      <div className="space-y-3">
        {board.sectors.map((s) => {
          const isOpen = expanded.has(s.id);
          const c = counts(s);
          return (
            <section
              key={s.id}
              id={`sector-section-${s.id}`}
              className="rounded-xl border border-grey-200 overflow-hidden bg-white scroll-mt-4"
            >
              <button
                onClick={() => toggleExpand(s.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-grey-50"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="font-semibold text-tertiary-dark truncate min-w-0">{s.name}</span>
                <span className="text-[11px] text-tertiary-light shrink-0">{s.figure}</span>
                <span className="hidden sm:block text-sm text-tertiary truncate flex-1">{s.goal}</span>
                <span className="text-[11px] text-tertiary-light shrink-0 text-right">
                  {c.levers} levers · {c.linked}/{c.indicators} indicators linked
                </span>
                <span className="text-tertiary-light shrink-0">{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-5 pt-1 border-t border-grey-100">
                  {editing && (
                    <div className="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-md bg-grey-50 border border-grey-200">
                      <label className="text-[10px] text-tertiary-light">Name</label>
                      <input
                        value={s.name}
                        onChange={(e) => updateSector({ ...s, name: e.target.value })}
                        className="text-xs border border-grey-200 rounded px-2 py-1 w-40"
                      />
                      <label className="text-[10px] text-tertiary-light">Figure / tag</label>
                      <input
                        value={s.figure}
                        onChange={(e) => updateSector({ ...s, figure: e.target.value })}
                        className="text-xs border border-grey-200 rounded px-2 py-1 w-28"
                      />
                      <label className="text-[10px] text-tertiary-light">Colour</label>
                      <input
                        type="color"
                        value={s.color}
                        onChange={(e) => updateSector({ ...s, color: e.target.value })}
                        className="h-7 w-9 rounded border border-grey-200 cursor-pointer"
                      />
                      <div className="flex-1" />
                      <button
                        onClick={() => deleteSector(s.id)}
                        className="text-xs font-semibold px-2.5 py-1 rounded border border-grey-200 text-red-600 hover:border-red-300"
                      >
                        Delete flow chart
                      </button>
                    </div>
                  )}
                  <SectorFlow
                    sector={s}
                    editing={editing}
                    allIndicators={allIndicators}
                    onChange={updateSector}
                    onOpenIndicator={setDrawer}
                    // advanced-v2 is handled by an early return above and never
                    // reaches SectorFlow; the guard keeps the prop type narrow.
                    variant={version.variant === 'advanced-v2' ? 'advanced' : version.variant}
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
