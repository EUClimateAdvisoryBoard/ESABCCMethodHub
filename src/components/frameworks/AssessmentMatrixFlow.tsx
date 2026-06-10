/**
 * Advanced version 7 — the structured-assessment-matrix renderer.
 *
 * Renders the five dimensions of the monitoring-report methodology as five
 * lettered blocks, each visually distinct because each *is* a different kind
 * of structure:
 *
 *   A  Mitigation pillar — one row per emission sector, read corridor →
 *      drivers → observed, with the steering main-policy tags on the row.
 *   B  Adaptation pillar — the climate-signal and governance strips, then one
 *      card per adaptation area read risk ↔ action; empty lanes render as
 *      stated monitoring gaps.
 *   C  Main policies — seven instrument-family cards, deep-linked into the
 *      Policy Navigator, each declaring what it steers and its adaptation
 *      reach (or lack of it).
 *   D  Crosscutting themes — one row per theme with a pillar badge and the
 *      overlaps stated per row.
 *   E  Societal objectives — six lens cards, each an assessment question with
 *      the proxy indicators that answer it.
 *
 * Indicator chips open the shared data drawer; policy chips deep-link into
 * the Policy Navigator.
 */
'use client';
import Link from 'next/link';
import type {
  AdaptationAreaRow,
  AssessmentMatrixBoard,
  CrosscuttingThemeRow,
  MainPolicyCard,
  MatrixBenchmarkChip,
  MatrixIndicatorChip,
  MatrixPolicyChip,
  MitigationSectorRow,
  SocietalObjectiveLens,
} from '@/data/assessment-matrix-v7';
import { getViewerPolicyId } from '@/data/sectoral-policies';
import type { OpenIndicatorPayload } from './SectorFlow';
import { Tooltip } from '@/components/ui/Tooltip';

const MIT_BG = '#9E4A46';
const ADAPT_BG = '#2E7D74';
const BOTH_BG = '#5B5BD6';

const trackAccent = (track: MatrixIndicatorChip['track']) =>
  track === 'mitigation' ? MIT_BG : track === 'adaptation' ? ADAPT_BG : BOTH_BG;

interface Props {
  board: AssessmentMatrixBoard;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}

export default function AssessmentMatrixFlow({ board, onOpenIndicator }: Props) {
  const policyLabel = new Map(board.policies.map((p) => [p.key, p.label]));
  return (
    <div className="text-[11px] space-y-5">
      <DimensionFrame
        letter="A"
        title="Mitigation pillar — by emission sector"
        accent={MIT_BG}
        blurb="Each sector is read corridor → drivers → observed: the benchmark trajectory it must travel, the levers that bend it, and the realised emissions it is judged on (protocol steps 3–4)."
      >
        <div className="space-y-2.5">
          {board.sectors.map((s) => (
            <SectorRow key={s.key} sector={s} policyLabel={policyLabel} onOpenIndicator={onOpenIndicator} />
          ))}
        </div>
      </DimensionFrame>

      <DimensionFrame
        letter="B"
        title="Adaptation pillar — by adaptation area"
        accent={ADAPT_BG}
        blurb="Thirteen areas (after the UK CCC framework), each read risk ↔ action: the climate-driven harm signal against the adaptation delivery responding to it. Empty lanes are stated monitoring gaps (protocol step 7)."
      >
        <ContextStrip
          label="Climate signal — the context every area operates in"
          chips={board.climateSignal}
          onOpenIndicator={onOpenIndicator}
        />
        <ContextStrip
          label="Adaptation governance — the pillar’s enabling machinery"
          chips={board.adaptationGovernance}
          onOpenIndicator={onOpenIndicator}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-2">
          {board.areas.map((a) => (
            <AreaCard key={a.key} area={a} policyLabel={policyLabel} onOpenIndicator={onOpenIndicator} />
          ))}
        </div>
      </DimensionFrame>

      <DimensionFrame
        letter="C"
        title="Main policies — the steering layer"
        accent="#B45309"
        blurb="The seven instrument families that aim both pillars, each with the next milestone that bites and an explicit note on its adaptation reach (protocol step 5: cells no main policy reaches are findings)."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {board.policies.map((p) => (
            <PolicyCard key={p.key} card={p} />
          ))}
        </div>
      </DimensionFrame>

      <DimensionFrame
        letter="D"
        title="Crosscutting themes"
        accent={BOTH_BG}
        blurb="Themes that cut across sectors and areas. Their overlaps with the pillars are stated on each row — counted once in the headline, read as often as they matter."
      >
        <div className="space-y-2">
          {board.themes.map((t) => (
            <ThemeRow key={t.key} theme={t} onOpenIndicator={onOpenIndicator} />
          ))}
        </div>
      </DimensionFrame>

      <DimensionFrame
        letter="E"
        title="Societal objectives — the assessment lenses"
        accent="#7A3E6B"
        blurb="The six objectives other than climate mitigation, applied as lenses to every chapter (protocol step 6): a sector can be on track for emissions and failing a lens at the same time — both verdicts are reported."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {board.objectives.map((o) => (
            <ObjectiveCard key={o.key} lens={o} onOpenIndicator={onOpenIndicator} />
          ))}
        </div>
      </DimensionFrame>
    </div>
  );
}

// ── Shared frames & chips ────────────────────────────────────────────────────

function DimensionFrame({
  letter,
  title,
  accent,
  blurb,
  children,
}: {
  letter: string;
  title: string;
  accent: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: `${accent}55` }}>
      <div className="flex items-start gap-2.5 px-3 py-2" style={{ background: `${accent}12` }}>
        <span
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-white font-bold text-[12px] mt-0.5"
          style={{ background: accent }}
        >
          {letter}
        </span>
        <div className="min-w-0">
          <div className="font-bold text-[12.5px] leading-tight" style={{ color: accent }}>
            {title}
          </div>
          <p className="text-[10.5px] text-tertiary leading-snug mt-0.5 max-w-4xl">{blurb}</p>
        </div>
      </div>
      <div className="p-2.5">{children}</div>
    </section>
  );
}

function IndicatorChipEl({
  item,
  onOpen,
}: {
  item: MatrixIndicatorChip;
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
        {item.code}
      </span>
      <span className="max-w-[150px] truncate">{item.label}</span>
      {item.policy && (
        <Tooltip content="Policy-process indicator — tracks the qualitative policy machinery (strategies, plans, coordination, mainstreaming) rather than a physical quantity.">
          <span className="shrink-0 inline-flex items-center rounded bg-amber-100 text-amber-800 px-1 text-[8px] font-bold uppercase tracking-wide">
            policy
          </span>
        </Tooltip>
      )}
      {!linked && <span className="italic">no data</span>}
    </span>
  );
}

function GapNote({ note }: { note: string }) {
  return (
    <p className="rounded border border-dashed border-teal-300 bg-teal-50/40 px-1.5 py-1 text-[9.5px] text-teal-800 leading-snug">
      <span className="font-bold uppercase tracking-wide">monitoring gap</span> — {note}
    </p>
  );
}

function PolicyTagList({ keys, policyLabel }: { keys: string[]; policyLabel: Map<string, string> }) {
  if (keys.length === 0) {
    return (
      <span className="inline-flex items-center rounded border border-dashed border-red-300 bg-red-50/40 px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-red-700">
        no main policy reaches this cell
      </span>
    );
  }
  return (
    <>
      {keys.map((k) => (
        <span
          key={k}
          className="inline-flex items-center rounded bg-amber-100 text-amber-800 px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wide"
        >
          § {policyLabel.get(k) ?? k}
        </span>
      ))}
    </>
  );
}

// ── Dimension A: mitigation sector row ───────────────────────────────────────

function CorridorChips({ chips }: { chips: MatrixBenchmarkChip[] }) {
  if (chips.length === 0)
    return <p className="text-[10px] text-tertiary-light italic">No benchmark series curated yet.</p>;
  return (
    <div className="space-y-1.5">
      {chips.map((chip) => (
        <div key={chip.code} className="rounded border border-indigo-200 bg-indigo-50/40 px-1.5 py-1">
          <div className="flex items-baseline gap-1 mb-0.5">
            <span className="font-mono font-semibold text-indigo-700 shrink-0">{chip.code}</span>
            <span className="text-[10px] text-tertiary-dark truncate" title={chip.title}>
              {chip.title}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {chip.targets.map((t) => (
              <Tooltip key={t.year} content={t.label}>
                <span className="inline-flex items-center gap-1 rounded bg-white border border-indigo-200 px-1 py-0.5 text-[9.5px] cursor-help">
                  <span className="font-bold text-indigo-700">{t.year}</span>
                  <span className="text-tertiary-dark font-mono">
                    {t.value.toLocaleString('en-GB')} {chip.unit}
                  </span>
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectorRow({
  sector,
  policyLabel,
  onOpenIndicator,
}: {
  sector: MitigationSectorRow;
  policyLabel: Map<string, string>;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${sector.color}55` }}>
      <div className="flex items-center gap-2 px-2.5 py-1.5" style={{ background: `${sector.color}14` }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sector.color }} />
        <span className="font-semibold text-[12px] text-tertiary-dark">{sector.label}</span>
        <span className="text-[10px] text-tertiary truncate flex-1">{sector.blurb}</span>
        <span className="hidden sm:flex flex-wrap gap-1 shrink-0">
          <PolicyTagList keys={sector.mainPolicyKeys} policyLabel={policyLabel} />
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-grey-100">
        <div className="p-2">
          <ColumnHeader label="① Corridor — the benchmark" color="#5B5BD6" />
          <CorridorChips chips={sector.corridor} />
        </div>
        <div className="p-2">
          <ColumnHeader label="② Drivers — the levers" color={MIT_BG} />
          <div className="flex flex-wrap gap-1">
            {sector.drivers.map((c) => (
              <IndicatorChipEl key={c.refId} item={c} onOpen={onOpenIndicator} />
            ))}
          </div>
        </div>
        <div className="p-2">
          <ColumnHeader label="③ Observed — the verdict basis" color="#9E4A46" />
          <div className="flex flex-wrap gap-1">
            {sector.observed.map((c) => (
              <IndicatorChipEl key={c.refId} item={c} onOpen={onOpenIndicator} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="text-[9.5px] font-bold uppercase tracking-wide mb-1.5" style={{ color }}>
      {label}
    </div>
  );
}

// ── Dimension B: adaptation areas ────────────────────────────────────────────

function ContextStrip({
  label,
  chips,
  onOpenIndicator,
}: {
  label: string;
  chips: MatrixIndicatorChip[];
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/30 px-2 py-1.5 mb-1.5">
      <div className="text-[9.5px] font-bold uppercase tracking-wide text-teal-800 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {chips.map((c) => (
          <IndicatorChipEl key={c.refId} item={c} onOpen={onOpenIndicator} />
        ))}
      </div>
    </div>
  );
}

function AreaLane({
  label,
  items,
  onOpenIndicator,
}: {
  label: string;
  items: MatrixIndicatorChip[];
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wide text-tertiary-light mb-0.5">{label}</div>
      {items.length === 0 ? (
        <p className="text-[9.5px] text-tertiary-light italic">No series curated yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((c) => (
            <IndicatorChipEl key={c.refId} item={c} onOpen={onOpenIndicator} />
          ))}
        </div>
      )}
    </div>
  );
}

function AreaCard({
  area,
  policyLabel,
  onOpenIndicator,
}: {
  area: AdaptationAreaRow;
  policyLabel: Map<string, string>;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-2 flex flex-col gap-1.5">
      <div>
        <div className="font-semibold text-[11.5px] text-tertiary-dark leading-tight">⛨ {area.label}</div>
        <p className="text-[9.5px] text-tertiary leading-snug mt-0.5">{area.blurb}</p>
      </div>
      <AreaLane label="Risk — harm signal" items={area.risk} onOpenIndicator={onOpenIndicator} />
      <AreaLane label="Action — adaptation delivery" items={area.action} onOpenIndicator={onOpenIndicator} />
      {area.gapNote && <GapNote note={area.gapNote} />}
      <div className="flex flex-wrap gap-1 mt-auto pt-0.5">
        <PolicyTagList keys={area.mainPolicyKeys} policyLabel={policyLabel} />
      </div>
    </div>
  );
}

// ── Dimension C: main policies ───────────────────────────────────────────────

const INSTRUMENT_LABEL: Record<MatrixPolicyChip['instrumentType'], string> = {
  'cap-and-trade': 'cap & trade',
  regulation: 'regulation',
  standard: 'standard',
  target: 'target',
  fund: 'fund',
  directive: 'directive',
  tax: 'tax',
  disclosure: 'disclosure',
};

function PolicyCard({ card }: { card: MainPolicyCard }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-2 flex flex-col gap-1.5">
      <div className="font-bold text-[12px] text-amber-900">§ {card.label}</div>
      <div className="space-y-1">
        {card.policies.map((p) => (
          <div key={p.id} className="rounded border border-amber-200 bg-white px-1.5 py-1">
            <Link
              href={`/policy-navigator/policy?id=${encodeURIComponent(getViewerPolicyId(p.id))}`}
              className="flex items-baseline gap-1 hover:underline"
              title={p.name}
            >
              <span className="font-semibold text-amber-800 shrink-0">{p.acronym ?? p.name}</span>
              {p.acronym && <span className="text-[9.5px] text-tertiary truncate">{p.name}</span>}
            </Link>
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              <span className="inline-flex items-center rounded bg-amber-100 text-amber-800 px-1 text-[8px] font-bold uppercase tracking-wide">
                {INSTRUMENT_LABEL[p.instrumentType]}
              </span>
              {p.nextMilestone && (
                <Tooltip content={p.nextMilestone.requirement}>
                  <span className="text-[9px] text-tertiary cursor-help">
                    next bites: <span className="font-bold">{p.nextMilestone.year}</span>
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[9.5px] text-tertiary leading-snug">
        <span className="font-semibold" style={{ color: MIT_BG }}>
          Steers:
        </span>{' '}
        {card.steersSectors.join(' · ')}
        {card.steersAreas.length > 0 && (
          <>
            {' '}
            <span className="font-semibold" style={{ color: ADAPT_BG }}>
              ⛨
            </span>{' '}
            {card.steersAreas.join(' · ')}
          </>
        )}
      </div>
      <p className="text-[9.5px] leading-snug rounded border border-teal-200 bg-teal-50/40 px-1.5 py-1 text-teal-900 mt-auto">
        <span className="font-bold uppercase tracking-wide text-teal-800">adaptation reach</span> —{' '}
        {card.adaptationNote}
      </p>
    </div>
  );
}

// ── Dimension D: crosscutting themes ─────────────────────────────────────────

function ThemeRow({
  theme,
  onOpenIndicator,
}: {
  theme: CrosscuttingThemeRow;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  const accent = trackAccent(theme.track);
  return (
    <div className="rounded-lg border border-grey-200 bg-white px-2 py-1.5">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="font-semibold text-[11.5px] text-tertiary-dark">{theme.label}</span>
        <span
          className="inline-flex items-center rounded px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-white"
          style={{ background: accent }}
        >
          {theme.track === 'both' ? 'both pillars' : theme.track}
        </span>
        <span className="text-[9.5px] text-tertiary flex-1 min-w-[12rem]">{theme.blurb}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {theme.chips.map((c) => (
          <IndicatorChipEl key={c.refId} item={c} onOpen={onOpenIndicator} />
        ))}
      </div>
      {theme.overlapNote && (
        <p className="mt-1 text-[9px] text-indigo-800 rounded border border-dashed border-indigo-200 bg-indigo-50/40 px-1.5 py-0.5 leading-snug">
          <span className="font-bold uppercase tracking-wide">overlap, stated</span> — {theme.overlapNote}
        </p>
      )}
      {theme.gapNote && <div className="mt-1"><GapNote note={theme.gapNote} /></div>}
    </div>
  );
}

// ── Dimension E: societal-objective lenses ───────────────────────────────────

function ObjectiveCard({
  lens,
  onOpenIndicator,
}: {
  lens: SocietalObjectiveLens;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-2 flex flex-col gap-1.5">
      <div className="font-semibold text-[11.5px] text-purple-900 leading-tight">◎ {lens.label}</div>
      <p className="text-[10px] text-tertiary-dark italic leading-snug">“{lens.question}”</p>
      <div className="flex flex-wrap gap-1">
        {lens.chips.map((c) => (
          <IndicatorChipEl key={c.refId} item={c} onOpen={onOpenIndicator} />
        ))}
      </div>
      {lens.gapNote && <div className="mt-auto"><GapNote note={lens.gapNote} /></div>}
    </div>
  );
}
