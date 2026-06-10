/**
 * One sector's assessment framework rendered as a connected, editable board of
 * cards — laid out like the report figures: a coloured level-label column on
 * the left (GHG emission reductions → Outcomes → Mitigation levers → Enabling
 * conditions), one row per level, level-coloured cards, and white indicator
 * boxes. Indicator chips open the data behind them. In edit mode every card,
 * chip, enabling bullet and its chapter reference can be relabelled, removed,
 * re-wired or added to.
 */
'use client';
import { useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import {
  ENABLING_KIND_LABEL,
  type EnablingItem,
  type EnablingKind,
  type FrameworkNode,
  type FrameworkTrack,
  type IndicatorRef,
  type PolicyRef,
  type RiskKind,
  type SectorFramework,
} from '@/data/sector-frameworks';
import { useConnectors, type Edge } from './useConnectors';
import { Tooltip } from '@/components/ui/Tooltip';

export interface OpenIndicatorPayload {
  title: string;
  code?: string;
  indicatorIds: string[];
}

interface Props {
  sector: SectorFramework;
  editing: boolean;
  allIndicators: Indicator[];
  onChange: (next: SectorFramework) => void;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  /**
   * 'report' is the plain mitigation layout. 'beta' and 'advanced' both
   * relabel the outcome/lever rows to show adaptation alongside mitigation and
   * let adaptation-tracked cards read as a first-class track.
   */
  variant?: 'report' | 'beta' | 'advanced';
}

// Uniform per-level palette mirroring the report figures.
const OUTCOME_BG = '#4E8595';
const LEVER_BG = '#9E4A46';

// Climate-risk row colours (EUCRA impact chain).
const RISK_KIND_BG: Record<RiskKind, string> = {
  risk: '#9D174D',    // rose/pink — major climate risks
  impact: '#C2410C',  // orange — direct/indirect impacts
  driver: '#B45309',  // amber — non-climatic risk drivers
  hazard: '#1E40AF',  // blue — climate hazards
};
const RISK_KIND_LABEL: Record<RiskKind, string> = {
  risk: 'Major climate risks',
  impact: 'Climate change impacts',
  driver: 'Non-climatic risk drivers',
  hazard: 'Climate hazards',
};
// Render order: closest to outcomes first, then drilling down to origin.
const RISK_KIND_ORDER: RiskKind[] = ['risk', 'impact', 'driver', 'hazard'];
// Adaptation-track cards use a distinct teal family in the beta board.
const ADAPT_OUTCOME_BG = '#2E7D74';
const ADAPT_LEVER_BG = '#3F8C7F';
const ENABLING_LABEL_BG = '#C9B83F';
const ENABLING_BAND_BG = '#FBF8DD';
const CONNECTOR = '#94a3b8';

/** Pick a card colour from its layer + adaptation track. */
function nodeBg(layer: 'outcome' | 'lever', track?: FrameworkTrack): string {
  if (track === 'adaptation') return layer === 'outcome' ? ADAPT_OUTCOME_BG : ADAPT_LEVER_BG;
  return layer === 'outcome' ? OUTCOME_BG : LEVER_BG;
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * An indicator belongs to the original ESABCC report's indicator database when
 * its effective group is `esabcc` (mirrors the grouping logic in
 * IndicatorModule). Everything else — advanced, beta, adaptation, additional
 * ECNO mappings and user-added series — is "new", i.e. not part of the original
 * report, and gets a small "new" badge on the flow-chart chips.
 */
function isOriginalReportIndicator(ind?: Indicator): boolean {
  if (!ind) return false;
  const group = ind.group ?? (ind.beta ? 'beta' : ind.id.startsWith('esabcc-') ? 'esabcc' : 'additional');
  return group === 'esabcc';
}

export default function SectorFlow({ sector, editing, allIndicators, onChange, onOpenIndicator, variant = 'report' }: Props) {
  // Both the beta and the advanced boards present adaptation as a first-class
  // track alongside mitigation, so the outcome/lever rows are relabelled.
  const showAdaptation = variant !== 'report';
  // The advanced board packs the most (and longest-named) indicators in. Let its
  // chip labels wrap onto multiple lines instead of truncating with an ellipsis,
  // which reads far better than "CO₂ capture & stora…".
  const wrapChips = variant === 'advanced';
  const edges = useMemo<Edge[]>(() => {
    const e: Edge[] = [];
    for (const o of sector.outcomes) e.push({ from: o.id, to: 'goal' });
    for (const l of sector.levers) for (const p of l.parents) e.push({ from: l.id, to: p });
    for (const r of (sector.risks ?? [])) for (const p of r.parents) e.push({ from: r.id, to: p });
    return e;
  }, [sector]);

  const { containerRef, register, lines, size } = useConnectors(edges, [sector, editing]);

  // ── immutable update helpers ───────────────────────────────────────────────
  const patch = (p: Partial<SectorFramework>) => onChange({ ...sector, ...p });

  const updateNode = (layer: 'outcome' | 'lever', id: string, fn: (n: FrameworkNode) => FrameworkNode) => {
    const key = layer === 'outcome' ? 'outcomes' : 'levers';
    patch({ [key]: sector[key].map((n) => (n.id === id ? fn(n) : n)) } as Partial<SectorFramework>);
  };
  const deleteNode = (layer: 'outcome' | 'lever', id: string) => {
    if (layer === 'outcome') {
      patch({
        outcomes: sector.outcomes.filter((n) => n.id !== id),
        // detach levers that pointed only at this outcome
        levers: sector.levers.map((l) => ({ ...l, parents: l.parents.filter((p) => p !== id) })),
      });
    } else {
      patch({ levers: sector.levers.filter((n) => n.id !== id) });
    }
  };
  const addNode = (layer: 'outcome' | 'lever') => {
    const node: FrameworkNode = {
      id: uid(layer),
      layer,
      label: layer === 'outcome' ? 'New outcome' : 'New lever',
      parents: layer === 'outcome' ? ['goal'] : sector.outcomes[0] ? [sector.outcomes[0].id] : [],
      indicators: [],
    };
    patch(layer === 'outcome' ? { outcomes: [...sector.outcomes, node] } : { levers: [...sector.levers, node] });
  };

  const addRefTo = (target: 'goal' | { layer: 'outcome' | 'lever'; id: string }, indicatorId: string) => {
    const ind = allIndicators.find((i) => i.id === indicatorId);
    if (!ind) return;
    const newRef: IndicatorRef = { refId: uid('ref'), code: ind.code ?? '•', label: ind.name, indicatorIds: [ind.id] };
    if (target === 'goal') patch({ goalIndicators: [...sector.goalIndicators, newRef] });
    else updateNode(target.layer, target.id, (n) => ({ ...n, indicators: [...n.indicators, newRef] }));
  };
  const removeRef = (target: 'goal' | { layer: 'outcome' | 'lever'; id: string }, refId: string) => {
    if (target === 'goal') patch({ goalIndicators: sector.goalIndicators.filter((r) => r.refId !== refId) });
    else updateNode(target.layer, target.id, (n) => ({ ...n, indicators: n.indicators.filter((r) => r.refId !== refId) }));
  };

  // enabling
  const updateEnabling = (id: string, fn: (e: EnablingItem) => EnablingItem) =>
    patch({ enabling: sector.enabling.map((e) => (e.id === id ? fn(e) : e)) });
  const addEnabling = (kind: EnablingKind) =>
    patch({ enabling: [...sector.enabling, { id: uid('en'), kind, label: 'New enabling condition' }] });
  const deleteEnabling = (id: string) => patch({ enabling: sector.enabling.filter((e) => e.id !== id) });

  return (
    <div ref={containerRef} className="relative text-[11px]">
      {/* connector overlay */}
      <svg
        className="absolute inset-0 pointer-events-none z-0"
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
        preserveAspectRatio="none"
      >
        {lines.map((l) => (
          <path key={l.id} d={l.d} fill="none" stroke={CONNECTOR} strokeWidth={1.2} opacity={0.8} />
        ))}
      </svg>

      <div className="relative z-10 space-y-8">
        {/* ── Goal ───────────────────────────────────────────────────────────── */}
        <Row label="GHG emission reductions" bg={sector.color} text="#fff">
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-2">
            <div
              ref={register('goal')}
              className="flex-1 min-w-0 rounded px-3 py-2 text-white shadow-sm flex items-center"
              style={{ background: sector.color }}
            >
              <EditableText
                value={sector.goal}
                editing={editing}
                className="font-semibold leading-snug text-[12px]"
                onChange={(goal) => patch({ goal })}
              />
            </div>
            <div className="flex flex-row sm:flex-col justify-start sm:justify-center gap-1 shrink-0">
              <ChipRow
                refs={sector.goalIndicators}
                editing={editing}
                allIndicators={allIndicators}
                wrap={wrapChips}
                onOpen={onOpenIndicator}
                onRemove={(refId) => removeRef('goal', refId)}
                onAdd={(indId) => addRefTo('goal', indId)}
              />
              {sector.goalPolicies && sector.goalPolicies.length > 0 && (
                <PolicyTags policies={sector.goalPolicies} />
              )}
            </div>
          </div>
        </Row>

        {/* ── Outcomes ───────────────────────────────────────────────────────── */}
        <Row label={showAdaptation ? 'Outcomes (mitigation & adaptation)' : 'Outcomes'} bg={OUTCOME_BG} text="#fff" onAdd={editing ? () => addNode('outcome') : undefined}>
          <div className="flex gap-2 items-stretch flex-wrap">
            {sector.outcomes.map((o) => (
              <NodeCard
                key={o.id}
                node={o}
                bg={nodeBg('outcome', o.track)}
                editing={editing}
                allIndicators={allIndicators}
                wrapChips={wrapChips}
                registerRef={register(o.id)}
                onOpen={onOpenIndicator}
                onLabel={(label) => updateNode('outcome', o.id, (n) => ({ ...n, label }))}
                onDelete={() => deleteNode('outcome', o.id)}
                onAddRef={(indId) => addRefTo({ layer: 'outcome', id: o.id }, indId)}
                onRemoveRef={(refId) => removeRef({ layer: 'outcome', id: o.id }, refId)}
              />
            ))}
          </div>
        </Row>

        {/* ── Climate risk rows (EUCRA impact chain) ─────────────────────────── */}
        {(sector.risks ?? []).length > 0 && RISK_KIND_ORDER.map((kind) => {
          const nodes = (sector.risks ?? []).filter((n) => (n.riskKind ?? 'risk') === kind);
          if (nodes.length === 0) return null;
          return (
            <Row key={kind} label={RISK_KIND_LABEL[kind]} bg={RISK_KIND_BG[kind]} text="#fff">
              <div className="flex gap-2 items-stretch flex-wrap">
                {nodes.map((r) => (
                  <div
                    key={r.id}
                    ref={register(r.id)}
                    className="relative rounded shadow-sm flex-1 min-w-[118px] p-2"
                    style={{ background: RISK_KIND_BG[kind] }}
                  >
                    <div className="text-[11px] font-semibold leading-tight text-white">{r.label}</div>
                  </div>
                ))}
              </div>
            </Row>
          );
        })}

        {/* ── Mitigation (+ adaptation) levers ───────────────────────────────── */}
        <Row label={showAdaptation ? 'Mitigation & adaptation levers' : 'Mitigation levers'} bg={LEVER_BG} text="#fff" onAdd={editing ? () => addNode('lever') : undefined}>
          <div
            className={
              // The advanced board fits all levers on one row by letting the
              // cards shrink to share the available width (see min-w-0 below),
              // so nothing is clipped and there's no horizontal scroll. Other
              // variants keep the report-faithful single scrolling row.
              wrapChips
                ? 'flex gap-2 items-stretch pb-1'
                : 'flex gap-2 items-stretch flex-wrap sm:flex-nowrap sm:overflow-x-auto pb-1'
            }
          >
            {sector.levers.map((l) => (
              <NodeCard
                key={l.id}
                node={l}
                bg={nodeBg('lever', l.track)}
                editing={editing}
                allIndicators={allIndicators}
                wrapChips={wrapChips}
                compactChips={wrapChips}
                registerRef={register(l.id)}
                onOpen={onOpenIndicator}
                onLabel={(label) => updateNode('lever', l.id, (n) => ({ ...n, label }))}
                onDelete={() => deleteNode('lever', l.id)}
                onAddRef={(indId) => addRefTo({ layer: 'lever', id: l.id }, indId)}
                onRemoveRef={(refId) => removeRef({ layer: 'lever', id: l.id }, refId)}
                parentPicker={
                  editing ? (
                    <ParentPicker
                      node={l}
                      outcomes={sector.outcomes}
                      onToggle={(pid) =>
                        updateNode('lever', l.id, (n) => ({
                          ...n,
                          parents: n.parents.includes(pid) ? n.parents.filter((x) => x !== pid) : [...n.parents, pid],
                        }))
                      }
                    />
                  ) : null
                }
              />
            ))}
          </div>
        </Row>

        {/* ── Enabling conditions ────────────────────────────────────────────── */}
        <Row label="Enabling conditions (non-exhaustive)" bg={ENABLING_LABEL_BG} text="#3a3413">
          <div className="rounded p-3 grid gap-4 sm:grid-cols-3" style={{ background: ENABLING_BAND_BG }}>
            {(['sector-specific', 'not-assessed', 'cross-cutting'] as EnablingKind[]).map((kind) => {
              const items = sector.enabling.filter((e) => e.kind === kind);
              if (items.length === 0 && !editing) return null;
              return (
                <div key={kind}>
                  <div className="text-[10px] font-semibold mb-1.5 text-[#5a5320]">{ENABLING_KIND_LABEL[kind]}</div>
                  <ul className="space-y-1">
                    {items.map((e) => (
                      <li key={e.id} className="text-[11px] flex items-start gap-1 group">
                        <span className="mt-1 w-1 h-1 rounded-full shrink-0 bg-[#8a7f2e]" />
                        <span className="flex-1 leading-snug">
                          {editing ? (
                            <span className="inline-flex flex-wrap items-center gap-1">
                              <input
                                value={e.label}
                                onChange={(ev) => updateEnabling(e.id, (x) => ({ ...x, label: ev.target.value }))}
                                className="bg-transparent border-b border-dashed border-[#b3a64a] focus:border-[#5a5320] outline-none min-w-[80px]"
                              />
                            </span>
                          ) : (
                            <>
                              {e.track === 'adaptation' && (
                                <span className="mr-1 inline-flex items-center rounded bg-teal-100 text-teal-800 px-1 text-[8px] font-bold uppercase">
                                  ⛨ adapt
                                </span>
                              )}
                              {e.label}
                              {e.indicatorIds && e.indicatorIds.length > 0 && (
                                <button
                                  onClick={() => onOpenIndicator({ title: e.label, indicatorIds: e.indicatorIds! })}
                                  className="ml-1 text-[10px] font-mono text-[#2f6e8c] hover:underline"
                                >
                                  data ↗
                                </button>
                              )}
                            </>
                          )}
                        </span>
                        {editing && (
                          <button
                            onClick={() => deleteEnabling(e.id)}
                            className="opacity-0 group-hover:opacity-100 text-[#8a7f2e] hover:text-red-600 leading-none"
                            aria-label="Remove enabling condition"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {editing && (
                    <button onClick={() => addEnabling(kind)} className="mt-1.5 text-[10px] text-[#8a7f2e] hover:text-[#5a5320]">
                      + add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Row>
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

/** A level band: coloured label cell on the left + content on the right. */
function Row({
  label,
  bg,
  text,
  children,
  onAdd,
}: {
  label: string;
  bg: string;
  text: string;
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[84px_minmax(0,1fr)] gap-1.5 sm:gap-2 items-stretch">
      <div
        className="rounded px-2 py-1.5 sm:py-1 text-[10px] font-semibold leading-tight flex flex-row sm:flex-col items-center sm:items-stretch justify-between sm:justify-center gap-2"
        style={{ background: bg, color: text }}
      >
        <span>{label}</span>
        {onAdd && (
          <button
            onClick={onAdd}
            className="shrink-0 text-[9px] font-normal underline opacity-90 hover:opacity-100 sm:mt-1 sm:text-left"
          >
            + add
          </button>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function NodeCard({
  node,
  bg,
  editing,
  allIndicators,
  wrapChips,
  compactChips,
  registerRef,
  onOpen,
  onLabel,
  onDelete,
  onAddRef,
  onRemoveRef,
  parentPicker,
}: {
  node: FrameworkNode;
  bg: string;
  editing: boolean;
  allIndicators: Indicator[];
  wrapChips?: boolean;
  compactChips?: boolean;
  registerRef: (el: HTMLElement | null) => void;
  onOpen: (p: OpenIndicatorPayload) => void;
  onLabel: (v: string) => void;
  onDelete: () => void;
  onAddRef: (indId: string) => void;
  onRemoveRef: (refId: string) => void;
  parentPicker?: React.ReactNode;
}) {
  return (
    <div
      ref={registerRef}
      className={`relative rounded shadow-sm group flex-1 flex flex-col ${
        // In the advanced board cards shrink (min-w-0) so the whole lever row
        // fits on one page; elsewhere they hold a comfortable minimum width.
        wrapChips ? 'min-w-0' : 'min-w-[118px]'
      }`}
      style={{ background: bg }}
    >
      <div className="p-2 flex flex-col gap-1.5 h-full">
        {node.track === 'adaptation' && (
          <span className="self-start inline-flex items-center gap-0.5 rounded bg-white/25 text-white px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide">
            ⛨ adapt
          </span>
        )}
        <div className="flex items-start gap-1">
          <EditableText value={node.label} editing={editing} className="text-[11px] font-semibold leading-tight text-white flex-1" onChange={onLabel} />
          {editing && (
            <button onClick={onDelete} className="text-white/60 hover:text-white text-base leading-none" aria-label="Delete card">
              ×
            </button>
          )}
        </div>
        {node.note && <p className="text-[9px] text-white/75 leading-tight">{node.note}</p>}
        {parentPicker}
        <ChipRow
          refs={node.indicators}
          editing={editing}
          allIndicators={allIndicators}
          wrap={wrapChips}
          compact={compactChips}
          onOpen={onOpen}
          onRemove={onRemoveRef}
          onAdd={onAddRef}
        />
        {node.policies && node.policies.length > 0 && (
          <PolicyTags policies={node.policies} />
        )}
      </div>
    </div>
  );
}

/**
 * A row of policy-instrument tags shown on nodes in the "Policy Gap Report 2.0"
 * version. Regular policies are shown as plain white tags; identified policy
 * gaps (ESABCC recommendations not addressed in EU law) are shown with an
 * orange tint and a "gap" badge. A tooltip reveals the full instrument name
 * and the relevant ESABCC recommendation code.
 */
function PolicyTags({ policies }: { policies: PolicyRef[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {policies.map((p) => (
        <Tooltip
          key={p.id}
          content={
            <span className="block max-w-[220px]">
              <span className="block font-semibold leading-snug">{p.fullName}</span>
              {p.recCode && (
                <span className="block text-[10px] opacity-80 mt-0.5">
                  ESABCC rec. {p.recCode}
                </span>
              )}
              {p.gap && (
                <span className="block text-[10px] text-orange-300 font-medium mt-0.5">
                  Policy gap — not addressed in EU law
                </span>
              )}
            </span>
          }
        >
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium cursor-help leading-none ${
              p.gap
                ? 'bg-orange-500/30 text-white border border-orange-400/60'
                : 'bg-white/15 text-white border border-white/25'
            }`}
          >
            {p.shortName}
            {p.gap && (
              <span className="ml-0.5 inline-flex items-center rounded bg-orange-400/40 px-0.5 text-[8px] font-bold uppercase tracking-wide">
                gap
              </span>
            )}
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

/** White indicator boxes that sit on the coloured cards (or beside the goal). */
function ChipRow({
  refs,
  editing,
  allIndicators,
  wrap,
  compact,
  onOpen,
  onRemove,
  onAdd,
}: {
  refs: IndicatorRef[];
  editing: boolean;
  allIndicators: Indicator[];
  wrap?: boolean;
  /**
   * In compact mode the chip shows only the indicator code (plus the NEW
   * badge); the full name is hidden inline and revealed on hover. Used for the
   * narrow lever cards in the advanced board so everything stays on one row
   * without the names overflowing.
   */
  compact?: boolean;
  onOpen: (p: OpenIndicatorPayload) => void;
  onRemove: (refId: string) => void;
  onAdd: (indId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 mt-auto">
      {refs.map((r) => {
        const linked = r.indicatorIds.length > 0;
        // "New": linked to data that is not part of the original ESABCC report's
        // indicator database (none of its linked series are `esabcc` indicators).
        const isNewRef =
          linked &&
          r.indicatorIds.every((id) => !isOriginalReportIndicator(allIndicators.find((i) => i.id === id)));
        const storyline = r.indicatorIds
          .map((id) => allIndicators.find((i) => i.id === id)?.storyline)
          .find((s): s is string => !!s);
        return (
          <span
            key={r.refId}
            className={`group/chip inline-flex gap-1 rounded px-1.5 py-0.5 text-[10px] ${
              // In wrap mode let the chip's own items (code, label, NEW badge)
              // wrap onto multiple lines and allow the chip to shrink (min-w-0),
              // so nothing — especially the NEW badge — spills out of a narrow
              // card and gets clipped by the board's overflow-hidden frame.
              wrap ? 'items-start flex-wrap min-w-0' : 'items-center'
            } ${
              linked
                ? 'bg-white text-gray-800 cursor-pointer hover:ring-1 hover:ring-white'
                : 'bg-white/20 text-white/80 border border-dashed border-white/50'
            }`}
            onClick={() => onOpen({ title: r.label, code: r.code, indicatorIds: r.indicatorIds })}
            title={r.label}
          >
            {compact ? (
              <Tooltip content={r.label}>
                <span className="font-mono font-semibold shrink-0 cursor-help">{r.code}</span>
              </Tooltip>
            ) : (
              <span className="font-mono font-semibold shrink-0">{r.code}</span>
            )}
            {!compact && (
              <span
                className={
                  wrap
                    ? 'max-w-[150px] leading-tight break-words [hyphens:auto]'
                    : 'max-w-[200px] sm:max-w-[120px] truncate'
                }
              >
                {r.label}
              </span>
            )}
            {isNewRef && (
              <Tooltip content="New indicator — not part of the original ESABCC report's indicator database.">
                <span
                  className="shrink-0 inline-flex items-center rounded bg-emerald-100 text-emerald-700 px-1 text-[8px] font-bold uppercase leading-[1.4] tracking-wide"
                  aria-label="New indicator, not in the original ESABCC report"
                >
                  <NewGlyph />
                  <span className="ml-0.5">new</span>
                </span>
              </Tooltip>
            )}
            {storyline && (
              <Tooltip
                content={
                  <span className="block">
                    <span className="block font-semibold mb-0.5">Why it matters — the storyline</span>
                    {storyline}
                  </span>
                }
              >
                <button
                  type="button"
                  onClick={(e) => {
                    // Let the tooltip do the talking on hover; on click fall
                    // through to opening the full data drawer.
                    e.stopPropagation();
                    onOpen({ title: r.label, code: r.code, indicatorIds: r.indicatorIds });
                  }}
                  className="text-indigo-600 hover:text-indigo-800 leading-none"
                  aria-label="Why this indicator matters"
                >
                  <InfoGlyph />
                </button>
              </Tooltip>
            )}
            {!linked && <span className="italic">no data</span>}
            {editing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(r.refId);
                }}
                className="text-gray-400 hover:text-red-600"
                aria-label="Unlink indicator"
              >
                ×
              </button>
            )}
          </span>
        );
      })}
      {editing && <AddIndicator allIndicators={allIndicators} onAdd={onAdd} />}
    </div>
  );
}

function AddIndicator({ allIndicators, onAdd }: { allIndicators: Indicator[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded border border-dashed border-white/70 text-white px-1.5 py-0.5 text-[10px] hover:bg-white/10"
      >
        + link data
      </button>
    );
  }
  return (
    <select
      autoFocus
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) onAdd(e.target.value);
        setOpen(false);
      }}
      onBlur={() => setOpen(false)}
      className="text-[10px] text-gray-800 border rounded px-1 py-0.5 max-w-[180px]"
    >
      <option value="" disabled>
        Pick an indicator…
      </option>
      {allIndicators.map((i) => (
        <option key={i.id} value={i.id}>
          {i.code ? `${i.code} — ` : ''}
          {i.name}
        </option>
      ))}
    </select>
  );
}

function ParentPicker({
  node,
  outcomes,
  onToggle,
}: {
  node: FrameworkNode;
  outcomes: FrameworkNode[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="border-t border-dashed border-white/30 pt-1">
      <div className="text-[9px] text-white/70 mb-0.5">feeds into:</div>
      <div className="flex flex-wrap gap-1">
        {outcomes.map((o) => (
          <label key={o.id} className="flex items-center gap-1 text-[9px] text-white cursor-pointer">
            <input type="checkbox" checked={node.parents.includes(o.id)} onChange={() => onToggle(o.id)} />
            <span className="max-w-[80px] truncate">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Small sparkle glyph marking a "new" indicator (not in the original report). */
function NewGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5" aria-hidden="true">
      <path d="M10 1.5l1.9 4.8 4.8 1.9-4.8 1.9L10 14.9 8.1 10.1 3.3 8.2l4.8-1.9L10 1.5zM4.5 13.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </svg>
  );
}

/** Small ⓘ glyph used on chips that carry a "storyline" motivation. */
function InfoGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EditableText({
  value,
  editing,
  onChange,
  className = '',
}: {
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  className?: string;
}) {
  if (!editing) return <div className={className}>{value}</div>;
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className={`w-full bg-white/15 rounded px-1 py-0.5 border border-white/40 focus:border-white outline-none resize-none ${className}`}
    />
  );
}
