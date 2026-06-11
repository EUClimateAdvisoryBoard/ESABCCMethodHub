/**
 * Advanced version 8 — the steering-panorama renderer (the headline figure).
 *
 * Two coupled representations of the same board:
 *
 *   • THE PANORAMA — a CSS-3D stack of the three layers (① progress,
 *     ② policy, ③ recommendations), one column per sector, with the
 *     sector's thread running vertically through all three slabs. Hovering a
 *     sector lights its whole thread; clicking it opens the sector's chain
 *     below. A toggle flattens the stack to a print-friendly 2-D figure.
 *
 *   • THE SEVEN THREADS — one expandable chain per sector reading the figure
 *     as the argument it encodes: where the sector stands (pace verdict +
 *     corridor + observed + drivers) ⇒ what steers it (instruments, each
 *     scored for contribution) ⇒ what the Board therefore recommends
 *     (recommendations with live uptake status and the gap each responds to).
 *
 * Indicator chips open the shared data drawer; instrument chips deep-link
 * into the Policy Navigator; benchmark chips link to the Scenario Explorer.
 */
'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  HeadlineFigureBoard,
  PanoramaBenchmarkChip,
  PanoramaIndicatorChip,
  PanoramaPolicyChip,
  PanoramaRecommendationChip,
  PanoramaSector,
} from '@/data/headline-figure-v8';
import {
  CONTRIBUTION_META,
  PACE_META,
  PANORAMA_LAYERS,
  REC_STATUS_META,
} from '@/data/headline-figure-v8';
import { getViewerPolicyId } from '@/data/sectoral-policies';
import type { OpenIndicatorPayload } from './SectorFlow';
import { Tooltip } from '@/components/ui/Tooltip';

const MIT_BG = '#9E4A46';
const ADAPT_BG = '#2E7D74';

const trackAccent = (track: PanoramaIndicatorChip['track']) =>
  track === 'mitigation' ? MIT_BG : ADAPT_BG;

const INSTRUMENT_LABEL: Record<PanoramaPolicyChip['instrumentType'], string> = {
  'cap-and-trade': 'cap & trade',
  regulation: 'regulation',
  standard: 'standard',
  target: 'target',
  fund: 'fund',
  directive: 'directive',
  tax: 'tax',
  disclosure: 'disclosure',
};

interface Props {
  board: HeadlineFigureBoard;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}

export default function HeadlineFigureFlow({ board, onOpenIndicator }: Props) {
  const [stacked, setStacked] = useState(true);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([board.sectors[0]?.key].filter(Boolean) as string[]),
  );
  const chainRefs = useRef<Map<string, HTMLElement>>(new Map());

  const allExpanded = expanded.size === board.sectors.length;
  const toggleAll = () =>
    setExpanded(allExpanded ? new Set() : new Set(board.sectors.map((s) => s.key)));
  const toggleSector = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const openAndScrollTo = (key: string) => {
    setExpanded((prev) => new Set(prev).add(key));
    // Let the chain render before scrolling to it.
    requestAnimationFrame(() => {
      chainRefs.current.get(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="text-[11px]">
      {/* ── Figure toolbar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="inline-flex rounded-md border border-grey-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setStacked(true)}
            className={`px-2.5 py-1 text-[11px] font-semibold ${
              stacked ? 'bg-tertiary-dark text-white' : 'bg-white text-tertiary hover:bg-grey-50'
            }`}
          >
            ◇ 3-D stack
          </button>
          <button
            type="button"
            onClick={() => setStacked(false)}
            className={`px-2.5 py-1 text-[11px] font-semibold ${
              !stacked ? 'bg-tertiary-dark text-white' : 'bg-white text-tertiary hover:bg-grey-50'
            }`}
          >
            ▤ Flat figure
          </button>
        </div>
        <span className="text-[10px] text-tertiary-light">
          Hover a sector to light its thread through all three layers · click it to open the full chain below.
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="ml-auto px-2.5 py-1 rounded-md border border-grey-200 text-[11px] font-semibold text-tertiary-dark hover:bg-grey-50"
        >
          {allExpanded ? 'Collapse all chains' : 'Expand all chains'}
        </button>
      </div>

      {/* ── The panorama — three slabs, seven threads ────────────────────── */}
      <Panorama
        board={board}
        stacked={stacked}
        focusKey={focusKey}
        onFocus={setFocusKey}
        onPick={openAndScrollTo}
      />

      {/* ── The seven threads, expanded ──────────────────────────────────── */}
      <div className="mt-6 space-y-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-bold text-tertiary-dark">
            The {board.sectors.length} threads, read as arguments
          </h3>
          <span className="text-[10px] text-tertiary-light">
            gap (①) ⇒ instrument mix (②) ⇒ the Board&apos;s advice (③), with live uptake status
          </span>
        </div>
        {board.sectors.map((s) => (
          <SectorChain
            key={s.key}
            sector={s}
            open={expanded.has(s.key)}
            onToggle={() => toggleSector(s.key)}
            onOpenIndicator={onOpenIndicator}
            refCb={(el) => {
              if (el) chainRefs.current.set(s.key, el);
              else chainRefs.current.delete(s.key);
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── The panorama (hero figure) ───────────────────────────────────────────────

function Panorama({
  board,
  stacked,
  focusKey,
  onFocus,
  onPick,
}: {
  board: HeadlineFigureBoard;
  stacked: boolean;
  focusKey: string | null;
  onFocus: (k: string | null) => void;
  onPick: (k: string) => void;
}) {
  // Shared template so the slabs and the connector rows stay column-aligned:
  // one label rail + one column per sector.
  const gridTemplate = `132px repeat(${board.sectors.length}, minmax(118px, 1fr))`;
  const dimmed = (key: string) => (focusKey !== null && focusKey !== key ? 'opacity-40' : '');

  const [progress, policy, recs] = PANORAMA_LAYERS;

  return (
    <div className="overflow-x-auto rounded-xl border border-grey-200 bg-gradient-to-b from-slate-50 to-white">
      <div className="min-w-[980px] px-6 pt-5 pb-6" style={{ perspective: '1500px' }}>
        <div
          className="transition-transform duration-700 ease-out"
          style={{
            transform: stacked
              ? 'rotateX(24deg) rotateZ(-6deg) scale(0.96)'
              : 'none',
            transformStyle: 'preserve-3d',
            transformOrigin: '50% 40%',
          }}
          onMouseLeave={() => onFocus(null)}
        >
          {/* ① PROGRESS slab */}
          <Slab layer={progress} stacked={stacked} gridTemplate={gridTemplate}>
            {board.sectors.map((s) => (
              <SlabCell key={s.key} sector={s} dimmed={dimmed(s.key)} onFocus={onFocus} onPick={onPick}>
                <div className="font-bold leading-tight truncate" style={{ color: s.color }}>
                  {s.label}
                </div>
                <PaceBadge pace={s.progress.pace} gap={s.progress.gapStatement} />
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {s.progress.benchmarks.map((b) => (
                    <BenchmarkTag key={b.code} chip={b} />
                  ))}
                </div>
              </SlabCell>
            ))}
          </Slab>

          <ConnectorRow
            gridTemplate={gridTemplate}
            sectors={board.sectors}
            dimmed={dimmed}
            caption="the measured gap sets what the law must deliver"
          />

          {/* ② POLICY slab */}
          <Slab layer={policy} stacked={stacked} gridTemplate={gridTemplate}>
            {board.sectors.map((s) => (
              <SlabCell key={s.key} sector={s} dimmed={dimmed(s.key)} onFocus={onFocus} onPick={onPick}>
                <CoverageBadge coverage={s.policy.coverage} statement={s.policy.statement} />
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {s.policy.instruments.map((p) => (
                    <InstrumentTag key={p.id} chip={p} />
                  ))}
                </div>
              </SlabCell>
            ))}
          </Slab>

          <ConnectorRow
            gridTemplate={gridTemplate}
            sectors={board.sectors}
            dimmed={dimmed}
            caption="what lags is what the Board recommends on"
          />

          {/* ③ RECOMMENDATIONS slab */}
          <Slab layer={recs} stacked={stacked} gridTemplate={gridTemplate}>
            {board.sectors.map((s) => (
              <SlabCell key={s.key} sector={s} dimmed={dimmed(s.key)} onFocus={onFocus} onPick={onPick}>
                <div className="flex flex-wrap gap-0.5">
                  {s.recommendations.items.map((r) => (
                    <RecTag key={r.id} chip={r} />
                  ))}
                </div>
                <RecTally items={s.recommendations.items} />
              </SlabCell>
            ))}
          </Slab>
        </div>
      </div>
    </div>
  );
}

function Slab({
  layer,
  stacked,
  gridTemplate,
  children,
}: {
  layer: (typeof PANORAMA_LAYERS)[number];
  stacked: boolean;
  gridTemplate: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border bg-white/95 transition-shadow duration-700"
      style={{
        borderColor: `${layer.color}55`,
        boxShadow: stacked
          ? `0 22px 26px -20px ${layer.color}88, 0 2px 0 0 ${layer.color}33`
          : `0 1px 2px 0 ${layer.color}22`,
      }}
    >
      <div className="grid items-stretch" style={{ gridTemplateColumns: gridTemplate }}>
        {/* Label rail */}
        <div
          className="flex flex-col justify-center gap-0.5 px-2.5 py-2 rounded-l-lg"
          style={{ background: `${layer.color}12` }}
        >
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white font-bold text-[10px]"
            style={{ background: layer.color }}
          >
            {layer.index}
          </span>
          <span className="font-bold leading-tight text-[10.5px]" style={{ color: layer.color }}>
            {layer.name}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function SlabCell({
  sector,
  dimmed,
  onFocus,
  onPick,
  children,
}: {
  sector: PanoramaSector;
  dimmed: string;
  onFocus: (k: string | null) => void;
  onPick: (k: string) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => onFocus(sector.key)}
      onClick={() => onPick(sector.key)}
      className={`text-left border-l border-grey-100 px-1.5 py-2 transition-opacity hover:bg-grey-50/70 cursor-pointer ${dimmed}`}
      title={`${sector.label} — open the full chain`}
    >
      {children}
    </button>
  );
}

function ConnectorRow({
  gridTemplate,
  sectors,
  dimmed,
  caption,
}: {
  gridTemplate: string;
  sectors: PanoramaSector[];
  dimmed: (k: string) => string;
  caption: string;
}) {
  return (
    <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
      <div className="flex items-center justify-end pr-2">
        <span className="text-[8.5px] uppercase tracking-wide text-tertiary-light text-right leading-tight max-w-[120px]">
          {caption} ⇣
        </span>
      </div>
      {sectors.map((s) => (
        <div key={s.key} className={`flex flex-col items-center py-0.5 transition-opacity ${dimmed(s.key)}`}>
          <span className="w-[2px] h-3.5" style={{ background: s.color }} />
          <span
            className="w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-t-[5px] border-l-transparent border-r-transparent"
            style={{ borderTopColor: s.color }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Panorama tags (compact chips on the slabs) ───────────────────────────────

function PaceBadge({ pace, gap }: { pace: PanoramaSector['progress']['pace']; gap: string }) {
  const meta = PACE_META[pace];
  return (
    <Tooltip content={gap}>
      <span
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 mt-0.5 text-[9px] font-bold uppercase tracking-wide cursor-help"
        style={{ color: meta.color, background: `${meta.color}14` }}
      >
        <span aria-hidden="true">{meta.glyph}</span>
        {meta.label}
      </span>
    </Tooltip>
  );
}

function CoverageBadge({
  coverage,
  statement,
}: {
  coverage: PanoramaSector['policy']['coverage'];
  statement: string;
}) {
  const meta = CONTRIBUTION_META[coverage];
  return (
    <Tooltip content={statement}>
      <span
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide cursor-help"
        style={{ color: meta.color, background: `${meta.color}14` }}
      >
        § {meta.label}
      </span>
    </Tooltip>
  );
}

function BenchmarkTag({ chip }: { chip: PanoramaBenchmarkChip }) {
  const t2030 = chip.targets.find((t) => t.year === 2030);
  return (
    <Tooltip
      content={`${chip.title}${t2030 ? ` — 2030: ${t2030.value} ${chip.unit}` : ''}`}
    >
      <span className="inline-flex items-center rounded border border-indigo-200 bg-indigo-50/60 px-1 text-[8.5px] font-mono font-semibold text-indigo-700 cursor-help">
        ⌖ {chip.code}
      </span>
    </Tooltip>
  );
}

function InstrumentTag({ chip }: { chip: PanoramaPolicyChip }) {
  const meta = CONTRIBUTION_META[chip.contribution];
  return (
    <Tooltip content={`${chip.name} — ${meta.label.toLowerCase()}: ${chip.assessment}`}>
      <span
        className="inline-flex items-center rounded border bg-white px-1 text-[8.5px] font-semibold cursor-help"
        style={{ borderColor: `${meta.color}66`, color: meta.color }}
      >
        {chip.acronym ?? chip.name}
      </span>
    </Tooltip>
  );
}

function RecTag({ chip }: { chip: PanoramaRecommendationChip }) {
  const meta = REC_STATUS_META[chip.status];
  return (
    <Tooltip content={`${chip.code} — ${chip.title} · ${meta.label.toLowerCase()} · responds to ${chip.respondsTo}`}>
      <span
        className="inline-flex items-center rounded px-1 text-[8.5px] font-mono font-bold cursor-help"
        style={{ color: meta.color, background: `${meta.color}14` }}
      >
        {chip.code}
      </span>
    </Tooltip>
  );
}

function RecTally({ items }: { items: PanoramaRecommendationChip[] }) {
  const counts = useMemo(() => {
    const c = { addressed: 0, partially: 0, 'in-progress': 0, 'not-addressed': 0 };
    for (const r of items) c[r.status] += 1;
    return c;
  }, [items]);
  return (
    <div className="flex items-center gap-1 mt-1">
      {(Object.keys(counts) as (keyof typeof counts)[]).map((k) =>
        counts[k] > 0 ? (
          <Tooltip key={k} content={`${counts[k]} ${REC_STATUS_META[k].label.toLowerCase()}`}>
            <span
              className="inline-flex items-center gap-0.5 text-[8.5px] font-bold cursor-help"
              style={{ color: REC_STATUS_META[k].color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: REC_STATUS_META[k].color }} />
              {counts[k]}
            </span>
          </Tooltip>
        ) : null,
      )}
    </div>
  );
}

// ── The expanded sector chains ───────────────────────────────────────────────

function SectorChain({
  sector,
  open,
  onToggle,
  onOpenIndicator,
  refCb,
}: {
  sector: PanoramaSector;
  open: boolean;
  onToggle: () => void;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  refCb: (el: HTMLElement | null) => void;
}) {
  const mix = useMemo(() => {
    const c = { delivering: 0, partial: 0, lagging: 0 };
    for (const p of sector.policy.instruments) c[p.contribution] += 1;
    return c;
  }, [sector]);
  const pace = PACE_META[sector.progress.pace];

  return (
    <section
      ref={refCb}
      className="rounded-xl border bg-white overflow-hidden scroll-mt-4"
      style={{ borderColor: `${sector.color}55` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left"
        style={{ background: `${sector.color}10` }}
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sector.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold text-[12.5px]" style={{ color: sector.color }}>
              {sector.label}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-wide"
              style={{ color: pace.color }}
            >
              {pace.glyph} {pace.label}
            </span>
            <span className="text-[9.5px] text-tertiary-light">
              {sector.progress.benchmarks.length} benchmarks · {sector.policy.instruments.length}{' '}
              instruments ({mix.delivering} delivering · {mix.partial} partial · {mix.lagging} lagging)
              {' '}→ {sector.recommendations.items.length} recommendations
            </span>
          </div>
          {!open && (
            <p className="text-[10px] text-tertiary leading-snug mt-0.5 truncate">{sector.blurb}</p>
          )}
        </div>
        <span className="text-tertiary-light text-xs shrink-0">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="p-2.5">
          <p className="text-[10.5px] text-tertiary leading-snug mb-2 max-w-4xl">{sector.blurb}</p>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr,auto,1fr,auto,1fr] gap-2 items-stretch">
            <StageCard layer={PANORAMA_LAYERS[0]} title="Where the sector stands">
              <div
                className="rounded border px-1.5 py-1 text-[10px] leading-snug mb-1.5"
                style={{ borderColor: `${pace.color}55`, background: `${pace.color}0d`, color: pace.color }}
              >
                <span className="font-bold uppercase tracking-wide">
                  {pace.glyph} {pace.label}
                </span>{' '}
                <span className="text-tertiary-dark">— {sector.progress.gapStatement}</span>
              </div>
              <ChipGroup label="Corridor benchmarks">
                {sector.progress.benchmarks.map((b) => (
                  <BenchmarkRow key={b.code} chip={b} />
                ))}
              </ChipGroup>
              <ChipGroup label="Observed results">
                {sector.progress.observed.map((c) => (
                  <IndicatorChipEl key={c.refId} item={c} onOpen={onOpenIndicator} />
                ))}
              </ChipGroup>
              <ChipGroup label="Delivery drivers">
                {sector.progress.drivers.map((c) => (
                  <IndicatorChipEl key={c.refId} item={c} onOpen={onOpenIndicator} />
                ))}
              </ChipGroup>
              <p className="text-[9px] text-tertiary-light mt-1.5">
                Climate Law / Fit-for-55 MIX trajectories ·{' '}
                <Link href="/scenarios" className="text-indigo-600 hover:underline">
                  open Scenario Explorer →
                </Link>
              </p>
            </StageCard>

            <ChainArrow label="the gap" />

            <StageCard layer={PANORAMA_LAYERS[1]} title="What steers it">
              <p className="text-[10px] text-tertiary leading-snug mb-1.5">
                <span
                  className="font-bold uppercase tracking-wide mr-1"
                  style={{ color: CONTRIBUTION_META[sector.policy.coverage].color }}
                >
                  § {CONTRIBUTION_META[sector.policy.coverage].label}
                </span>
                {sector.policy.statement}
              </p>
              <div className="space-y-1">
                {sector.policy.instruments.map((p) => (
                  <InstrumentRow key={p.id} chip={p} />
                ))}
              </div>
            </StageCard>

            <ChainArrow label="the shortfall" />

            <StageCard layer={PANORAMA_LAYERS[2]} title="What the Board advises">
              <p className="text-[10px] text-tertiary leading-snug mb-1.5">
                {sector.recommendations.statement}
              </p>
              <div className="space-y-1">
                {sector.recommendations.items.map((r) => (
                  <RecommendationRow key={r.id} chip={r} />
                ))}
              </div>
            </StageCard>
          </div>
        </div>
      )}
    </section>
  );
}

function StageCard({
  layer,
  title,
  children,
}: {
  layer: (typeof PANORAMA_LAYERS)[number];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border flex flex-col" style={{ borderColor: `${layer.color}44` }}>
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-t-lg"
        style={{ background: `${layer.color}12` }}
      >
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white font-bold text-[9px]"
          style={{ background: layer.color }}
        >
          {layer.index}
        </span>
        <span className="font-bold text-[10.5px]" style={{ color: layer.color }}>
          {title}
        </span>
      </div>
      <div className="p-2 flex-1">{children}</div>
    </div>
  );
}

function ChainArrow({ label }: { label: string }) {
  return (
    <div className="hidden xl:flex flex-col items-center justify-center px-0.5">
      <span className="text-[8.5px] uppercase tracking-wide text-tertiary-light [writing-mode:vertical-rl] rotate-180 mb-1">
        {label}
      </span>
      <span className="text-tertiary-light text-base" aria-hidden="true">
        ⇒
      </span>
    </div>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5">
      <div className="text-[8.5px] uppercase tracking-wide font-semibold text-tertiary-light mb-0.5">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function BenchmarkRow({ chip }: { chip: PanoramaBenchmarkChip }) {
  return (
    <Tooltip
      content={chip.targets.map((t) => `${t.year}: ${t.value} ${chip.unit} — ${t.label}`).join(' · ')}
    >
      <span className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50/60 px-1.5 py-0.5 text-[10px] cursor-help">
        <span className="font-mono font-semibold text-indigo-700">⌖ {chip.code}</span>
        <span className="max-w-[170px] truncate text-gray-800">{chip.title}</span>
        {chip.targets.find((t) => t.year === 2030) && (
          <span className="text-[9px] text-indigo-700 font-semibold shrink-0">
            2030: {chip.targets.find((t) => t.year === 2030)!.value} {chip.unit}
          </span>
        )}
      </span>
    </Tooltip>
  );
}

function IndicatorChipEl({
  item,
  onOpen,
}: {
  item: PanoramaIndicatorChip;
  onOpen: (p: OpenIndicatorPayload) => void;
}) {
  const linked = item.indicatorIds.length > 0;
  const accent = trackAccent(item.track);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border ${
        linked
          ? 'bg-white text-gray-800 cursor-pointer hover:ring-1'
          : 'bg-grey-50 text-tertiary-light border-dashed'
      }`}
      style={{ borderColor: `${accent}66` }}
      onClick={() =>
        linked && onOpen({ title: item.label, code: item.code, indicatorIds: item.indicatorIds })
      }
      title={item.label}
    >
      <span className="font-mono font-semibold shrink-0" style={{ color: accent }}>
        {item.track === 'adaptation' ? '⛨ ' : ''}
        {item.code}
      </span>
      <span className="max-w-[160px] truncate">{item.label}</span>
      {!linked && <span className="italic">no data</span>}
    </span>
  );
}

function InstrumentRow({ chip }: { chip: PanoramaPolicyChip }) {
  const meta = CONTRIBUTION_META[chip.contribution];
  return (
    <div className="rounded border px-1.5 py-1" style={{ borderColor: `${meta.color}44` }}>
      <div className="flex items-baseline gap-1">
        <Link
          href={`/policy-navigator/policy?id=${encodeURIComponent(getViewerPolicyId(chip.id))}`}
          className="flex items-baseline gap-1 hover:underline flex-1 min-w-0"
          title={chip.name}
        >
          <span className="font-semibold text-amber-800 shrink-0">{chip.acronym ?? chip.name}</span>
          {chip.acronym && <span className="text-[9.5px] text-tertiary truncate">{chip.name}</span>}
        </Link>
        <span
          className="shrink-0 inline-flex items-center rounded px-1 text-[8px] font-bold uppercase tracking-wide"
          style={{ color: meta.color, background: `${meta.color}14` }}
        >
          {meta.label}
        </span>
      </div>
      <p className="text-[9.5px] text-tertiary leading-snug mt-0.5">{chip.assessment}</p>
      <div className="flex flex-wrap items-center gap-1 mt-0.5">
        <span className="inline-flex items-center rounded bg-amber-100 text-amber-800 px-1 text-[8px] font-bold uppercase tracking-wide">
          {INSTRUMENT_LABEL[chip.instrumentType]}
        </span>
        {chip.nextMilestone && (
          <Tooltip content={chip.nextMilestone.requirement}>
            <span className="text-[9px] text-tertiary cursor-help">
              next bites: <span className="font-bold">{chip.nextMilestone.year}</span>
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function RecommendationRow({ chip }: { chip: PanoramaRecommendationChip }) {
  const meta = REC_STATUS_META[chip.status];
  return (
    <div className="rounded border px-1.5 py-1" style={{ borderColor: `${meta.color}44` }}>
      <div className="flex items-start gap-1.5">
        <span
          className="shrink-0 inline-flex items-center rounded px-1 text-[9px] font-mono font-bold mt-0.5"
          style={{ color: meta.color, background: `${meta.color}14` }}
        >
          {chip.code}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] text-gray-800 leading-snug">{chip.title}</p>
          <p className="text-[9px] text-tertiary-light leading-snug mt-0.5">
            <span className="font-bold uppercase tracking-wide" style={{ color: meta.color }}>
              {meta.label}
            </span>{' '}
            · responds to {chip.respondsTo}
          </p>
        </div>
      </div>
    </div>
  );
}
