/**
 * One sector's assessment framework rendered as a connected, editable board of
 * cards — mirroring the report figures (goal → outcomes → mitigation levers →
 * enabling conditions). Indicator chips are the white boxes; clicking one opens
 * the data behind it. In edit mode every card and chip can be relabelled,
 * removed, re-wired or added to.
 */
'use client';
import { useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import {
  ENABLING_KIND_LABEL,
  type EnablingItem,
  type EnablingKind,
  type FrameworkNode,
  type IndicatorRef,
  type SectorFramework,
} from '@/data/sector-frameworks';
import { useConnectors, type Edge } from './useConnectors';

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
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export default function SectorFlow({ sector, editing, allIndicators, onChange, onOpenIndicator }: Props) {
  const edges = useMemo<Edge[]>(() => {
    const e: Edge[] = [];
    for (const o of sector.outcomes) e.push({ from: o.id, to: 'goal' });
    for (const l of sector.levers) for (const p of l.parents) e.push({ from: l.id, to: p });
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
    <div ref={containerRef} className="relative">
      {/* connector overlay */}
      <svg
        className="absolute inset-0 pointer-events-none z-0"
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
        preserveAspectRatio="none"
      >
        {lines.map((l) => (
          <path key={l.id} d={l.d} fill="none" stroke={sector.color} strokeWidth={1.5} opacity={0.55} />
        ))}
      </svg>

      <div className="relative z-10 space-y-6">
        {/* ── Goal ───────────────────────────────────────────────────────────── */}
        <div className="flex items-stretch gap-3 flex-wrap">
          <div
            ref={register('goal')}
            className="flex-1 min-w-[260px] rounded-lg px-5 py-4 text-white shadow-sm"
            style={{ background: sector.color }}
          >
            <div className="text-[10px] uppercase tracking-wide opacity-80 mb-1">GHG emission reductions</div>
            <EditableText
              value={sector.goal}
              editing={editing}
              className="font-semibold leading-snug"
              onChange={(goal) => patch({ goal })}
            />
          </div>
          <div className="flex flex-col justify-center gap-1.5">
            <ChipRow
              refs={sector.goalIndicators}
              editing={editing}
              allIndicators={allIndicators}
              onOpen={onOpenIndicator}
              onRemove={(refId) => removeRef('goal', refId)}
              onAdd={(indId) => addRefTo('goal', indId)}
            />
          </div>
        </div>

        {/* ── Outcomes ───────────────────────────────────────────────────────── */}
        <LayerLabel text="Outcomes" editing={editing} onAdd={() => addNode('outcome')} addLabel="outcome" />
        <div className="grid gap-3 sm:grid-cols-2">
          {sector.outcomes.map((o) => (
            <NodeCard
              key={o.id}
              node={o}
              accent={sector.color}
              editing={editing}
              allIndicators={allIndicators}
              registerRef={register(o.id)}
              onOpen={onOpenIndicator}
              onLabel={(label) => updateNode('outcome', o.id, (n) => ({ ...n, label }))}
              onDelete={() => deleteNode('outcome', o.id)}
              onAddRef={(indId) => addRefTo({ layer: 'outcome', id: o.id }, indId)}
              onRemoveRef={(refId) => removeRef({ layer: 'outcome', id: o.id }, refId)}
            />
          ))}
        </div>

        {/* ── Mitigation levers ──────────────────────────────────────────────── */}
        <LayerLabel text="Mitigation levers" editing={editing} onAdd={() => addNode('lever')} addLabel="lever" />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {sector.levers.map((l) => (
            <NodeCard
              key={l.id}
              node={l}
              accent={sector.color}
              editing={editing}
              allIndicators={allIndicators}
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

        {/* ── Enabling conditions ────────────────────────────────────────────── */}
        <div className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border,#333)] bg-[#FBFBF7] dark:bg-white/5 p-4">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-3">
            Enabling conditions <span className="normal-case">(non-exhaustive)</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {(['sector-specific', 'not-assessed', 'cross-cutting'] as EnablingKind[]).map((kind) => {
              const items = sector.enabling.filter((e) => e.kind === kind);
              if (items.length === 0 && !editing) return null;
              return (
                <div key={kind}>
                  <div className="text-xs font-semibold mb-1.5" style={{ color: sector.color }}>
                    {ENABLING_KIND_LABEL[kind]}
                  </div>
                  <ul className="space-y-1">
                    {items.map((e) => (
                      <li key={e.id} className="text-xs flex items-start gap-1.5 group">
                        <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ background: sector.color }} />
                        <span className="flex-1">
                          <EditableText
                            value={e.label}
                            editing={editing}
                            inline
                            onChange={(label) => updateEnabling(e.id, (x) => ({ ...x, label }))}
                          />
                          {e.chapter && <span className="text-gray-400"> ({e.chapter})</span>}
                          {e.indicatorIds && e.indicatorIds.length > 0 && (
                            <button
                              onClick={() =>
                                onOpenIndicator({ title: e.label, indicatorIds: e.indicatorIds! })
                              }
                              className="ml-1 text-[10px] font-mono text-[#3D6E8C] hover:underline"
                            >
                              data ↗
                            </button>
                          )}
                        </span>
                        {editing && (
                          <button
                            onClick={() => deleteEnabling(e.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {editing && (
                    <button
                      onClick={() => addEnabling(kind)}
                      className="mt-1.5 text-[11px] text-gray-400 hover:text-gray-700"
                    >
                      + add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function LayerLabel({
  text,
  editing,
  onAdd,
  addLabel,
}: {
  text: string;
  editing: boolean;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">{text}</span>
      <span className="flex-1 border-t border-dashed border-gray-200 dark:border-white/10" />
      {editing && (
        <button onClick={onAdd} className="text-[11px] text-[#3D6E8C] hover:underline">
          + add {addLabel}
        </button>
      )}
    </div>
  );
}

function NodeCard({
  node,
  accent,
  editing,
  allIndicators,
  registerRef,
  onOpen,
  onLabel,
  onDelete,
  onAddRef,
  onRemoveRef,
  parentPicker,
}: {
  node: FrameworkNode;
  accent: string;
  editing: boolean;
  allIndicators: Indicator[];
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
      className="relative rounded-lg border bg-white dark:bg-white/5 shadow-sm group"
      style={{ borderColor: accent + '55' }}
    >
      <div className="h-1 rounded-t-lg" style={{ background: accent }} />
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          <EditableText value={node.label} editing={editing} className="text-sm font-medium leading-snug flex-1" onChange={onLabel} />
          {editing && (
            <button onClick={onDelete} className="text-gray-300 hover:text-red-600 text-lg leading-none" aria-label="Delete card">
              ×
            </button>
          )}
        </div>
        {node.note && <p className="text-[11px] text-gray-400 mt-1">{node.note}</p>}
        {parentPicker}
        <div className="mt-2">
          <ChipRow
            refs={node.indicators}
            editing={editing}
            allIndicators={allIndicators}
            onOpen={onOpen}
            onRemove={onRemoveRef}
            onAdd={onAddRef}
          />
        </div>
      </div>
    </div>
  );
}

function ChipRow({
  refs,
  editing,
  allIndicators,
  onOpen,
  onRemove,
  onAdd,
}: {
  refs: IndicatorRef[];
  editing: boolean;
  allIndicators: Indicator[];
  onOpen: (p: OpenIndicatorPayload) => void;
  onRemove: (refId: string) => void;
  onAdd: (indId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {refs.map((r) => {
        const linked = r.indicatorIds.length > 0;
        return (
          <span
            key={r.refId}
            className={`group/chip inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] ${
              linked
                ? 'bg-white dark:bg-white/10 border-gray-300 cursor-pointer hover:border-[#3D6E8C]'
                : 'bg-gray-50 dark:bg-white/5 border-dashed border-gray-300 text-gray-400'
            }`}
            onClick={() => onOpen({ title: r.label, code: r.code, indicatorIds: r.indicatorIds })}
            title={r.label}
          >
            <span className="font-mono font-semibold">{r.code}</span>
            <span className="max-w-[140px] truncate">{r.label}</span>
            {!linked && <span className="italic">no data</span>}
            {editing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(r.refId);
                }}
                className="text-gray-400 hover:text-red-600"
                aria-label="Unlink"
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
        className="inline-flex items-center rounded border border-dashed border-[#3D6E8C] text-[#3D6E8C] px-1.5 py-0.5 text-[11px] hover:bg-[#3D6E8C]/10"
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
      className="text-[11px] border rounded px-1 py-0.5 max-w-[200px]"
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
    <div className="mt-2 border-t border-dashed pt-1.5">
      <div className="text-[10px] text-gray-400 mb-1">feeds into:</div>
      <div className="flex flex-wrap gap-1">
        {outcomes.map((o) => (
          <label key={o.id} className="flex items-center gap-1 text-[10px] cursor-pointer">
            <input type="checkbox" checked={node.parents.includes(o.id)} onChange={() => onToggle(o.id)} />
            <span className="max-w-[90px] truncate">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function EditableText({
  value,
  editing,
  onChange,
  className = '',
  inline = false,
}: {
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  className?: string;
  inline?: boolean;
}) {
  if (!editing) return inline ? <span className={className}>{value}</span> : <div className={className}>{value}</div>;
  if (inline) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-transparent border-b border-dashed border-gray-300 focus:border-[#3D6E8C] outline-none ${className}`}
      />
    );
  }
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className={`w-full bg-white/10 rounded px-1 py-0.5 border border-white/30 focus:border-white outline-none resize-none ${className}`}
    />
  );
}
