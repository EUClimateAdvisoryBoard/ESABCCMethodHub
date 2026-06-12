/**
 * Advanced version 8 — the burn-map renderer.
 *
 * One joined figure, three zones:
 *
 *   • THE TWIN HEAT MAPS — per sector band, map A (four progress lenses,
 *     curated readings) sits directly beside map B (the band's EU acts × the
 *     four coherence steps, computed live from `buildCoherenceProfile`). The
 *     two maps share the band row, so monitoring and policy analysis are
 *     physically joined per sector. Off-track / incoherent cells carry the
 *     🔥 burn mark. Clicking a sector label expands the band's evidence.
 *   • THE BURN LEDGER — every burn from both maps, assigned to a response
 *     front by the declared rule (land → front 1; remaining monitoring
 *     burns → front 2; remaining coherence burns → front 3).
 *   • THE RECOMMENDATION — one headline recommendation whose three fronts
 *     claim every burn, each backed by ESABCC recommendation chips with
 *     live uptake status.
 *
 * Progress cells with linked indicators open the shared data drawer; map B
 * deep-links into the beta Policy Coherence board.
 */
'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BIG_RECOMMENDATION,
  coherenceCellBasis,
  computeBurnLedger,
  frontRecChips,
  GRADE_META,
  PROGRESS_LENSES,
  policyTitle,
  READING_META,
  REC_STATUS_META,
  type Burn,
  type BurnMapBoard,
  type BurnSector,
  type ProgressCell,
  type RecommendationFront,
} from '@/data/burn-map-v8';
import {
  COHERENCE_STEPS,
  type PolicyCoherenceProfile,
} from '@/lib/content-analysis/policy-coherence';
import type { OpenIndicatorPayload } from './SectorFlow';
import { Tooltip } from '@/components/ui/Tooltip';

/** Shared column template so the header and every band stay aligned. */
const GRID =
  'minmax(118px,150px) repeat(4, minmax(52px,1fr)) 26px minmax(128px,170px) repeat(4, minmax(52px,1fr))';

const FRONT_COLOR: Record<RecommendationFront['key'], string> = {
  land: '#15803D',
  demand: '#7C3AED',
  ratchet: '#B45309',
};

interface Props {
  board: BurnMapBoard;
  profiles: Map<string, PolicyCoherenceProfile>;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}

export default function BurnMapFlow({ board, profiles, onOpenIndicator }: Props) {
  const ledger = useMemo(() => computeBurnLedger(board, profiles), [board, profiles]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="text-[11px]">
      {/* ── Zone 1 · the twin heat maps ──────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-grey-200 bg-white">
        <div className="min-w-[860px] p-3">
          <HeatMapHeader />
          <div className="mt-1 space-y-1.5">
            {board.sectors.map((s) => (
              <SectorBand
                key={s.key}
                sector={s}
                profiles={profiles}
                expanded={expanded.has(s.key)}
                onToggle={() => toggle(s.key)}
                onOpenIndicator={onOpenIndicator}
              />
            ))}
          </div>
          <p className="mt-2 text-[9.5px] text-tertiary-light">
            🔥 = a burn: <span className="font-semibold">off track</span> on the progress map,{' '}
            <span className="font-semibold">incoherent</span> on the coherence map. Hover any cell for
            its evidence; click a sector name to expand the band; click an act to open the full
            four-step assessment in the Policy Coherence board.
          </p>
        </div>
      </div>

      {/* ── Funnel ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 py-2 text-tertiary-light">
        <span className="text-[10px] uppercase tracking-wide">map A burns ↘</span>
        <span className="text-base" aria-hidden="true">
          ⇓
        </span>
        <span className="text-[10px] uppercase tracking-wide">↙ map B burns</span>
      </div>

      {/* ── Zone 2 · the burn ledger ─────────────────────────────────────── */}
      <div className="rounded-xl border border-red-200 bg-red-50/40 px-3 py-2.5">
        <div className="flex flex-wrap items-baseline gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-wide font-bold text-red-700">
            🔥 The burn ledger
          </span>
          <span className="text-[10px] text-tertiary">
            {ledger.burns.length} burning cells — {ledger.progressCount} on the progress map ·{' '}
            {ledger.coherenceCount} on the coherence map — each assigned to a front by the declared
            rule: land burns → front ①, remaining monitoring burns → front ②, remaining coherence
            burns → front ③.
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {BIG_RECOMMENDATION.fronts.map((f) => (
            <div key={f.key} className="rounded-lg border bg-white px-2 py-1.5" style={{ borderColor: `${FRONT_COLOR[f.key]}55` }}>
              <div className="text-[9.5px] font-bold uppercase tracking-wide mb-1" style={{ color: FRONT_COLOR[f.key] }}>
                → front {f.index} · {f.name} ({ledger.byFront[f.key].length})
              </div>
              <div className="flex flex-wrap gap-1">
                {ledger.byFront[f.key].map((b) => (
                  <BurnChip key={`${b.kind}-${b.label}`} burn={b} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center py-2 text-tertiary-light">
        <span className="text-base" aria-hidden="true">
          ⇓
        </span>
      </div>

      {/* ── Zone 3 · THE recommendation ──────────────────────────────────── */}
      <div className="rounded-xl border-2 border-tertiary-dark bg-gradient-to-b from-slate-50 to-white px-4 py-3.5">
        <div className="text-[10px] uppercase tracking-wide font-bold text-tertiary mb-1">
          {BIG_RECOMMENDATION.kicker}
        </div>
        <p className="text-[15px] font-bold text-tertiary-dark leading-snug max-w-4xl">
          {BIG_RECOMMENDATION.headline}
        </p>
        <p className="text-[11px] text-tertiary leading-snug mt-2 max-w-4xl">
          {BIG_RECOMMENDATION.rationale}
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 mt-3">
          {BIG_RECOMMENDATION.fronts.map((f) => (
            <FrontCard key={f.key} front={f} claimed={ledger.byFront[f.key].length} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Heat-map header ──────────────────────────────────────────────────────────

function HeatMapHeader() {
  return (
    <div>
      <div className="grid gap-x-1" style={{ gridTemplateColumns: GRID }}>
        <div />
        <div className="col-span-4 rounded-t-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: '#3D6E8C' }}>
          A · Progress — monitoring heat map
        </div>
        <div />
        <div className="col-span-5 rounded-t-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: '#B45309' }}>
          B · Policy coherence — four-step heat map
        </div>
      </div>
      <div className="grid gap-x-1 mt-0.5" style={{ gridTemplateColumns: GRID }}>
        <div />
        {PROGRESS_LENSES.map((l) => (
          <Tooltip key={l.id} content={l.question}>
            <div className="text-[9px] font-semibold text-tertiary text-center leading-tight px-0.5 cursor-help">
              {l.short}
            </div>
          </Tooltip>
        ))}
        <div />
        <div className="text-[9px] font-semibold text-tertiary-light px-1">act</div>
        {COHERENCE_STEPS.map((s) => (
          <Tooltip key={s.id} content={`Step ${s.ordinal} — ${s.name}: ${s.question}`}>
            <div className="text-[9px] font-semibold text-tertiary text-center leading-tight px-0.5 cursor-help">
              {s.shortName}
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

// ── Sector band: map A cells + map B act rows, joined ───────────────────────

function SectorBand({
  sector,
  profiles,
  expanded,
  onToggle,
  onOpenIndicator,
}: {
  sector: BurnSector;
  profiles: Map<string, PolicyCoherenceProfile>;
  expanded: boolean;
  onToggle: () => void;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  const rows = Math.max(1, sector.policyIds.length);
  const span = { gridRow: `span ${rows}` };
  return (
    <div className="rounded-lg border border-grey-100" style={{ background: `${sector.color}08` }}>
      <div className="grid gap-x-1 gap-y-1 items-stretch p-1" style={{ gridTemplateColumns: GRID }}>
        <button
          type="button"
          onClick={onToggle}
          className="text-left flex items-start gap-1.5 px-1 py-0.5 min-w-0"
          style={span}
          title={sector.blurb}
        >
          <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: sector.color }} />
          <span className="min-w-0">
            <span className="block font-bold leading-tight" style={{ color: sector.color }}>
              {sector.label}
            </span>
            <span className="text-[9px] text-tertiary-light">{expanded ? '▾ evidence' : '▸ evidence'}</span>
          </span>
        </button>
        {sector.cells.map((c) => (
          <ProgressCellEl key={c.lens} cell={c} style={span} onOpenIndicator={onOpenIndicator} />
        ))}
        <div className="flex items-center justify-center" style={span} aria-hidden="true">
          <span className="text-tertiary-light">⇢</span>
        </div>
        {sector.policyIds.length === 0 ? (
          <div className="col-span-5 text-[9.5px] italic text-tertiary-light self-center px-1">
            No assessed acts in this band.
          </div>
        ) : (
          sector.policyIds.map((pid) => {
            const profile = profiles.get(pid);
            return (
              <PolicyRow key={pid} policyId={pid} profile={profile} />
            );
          })
        )}
      </div>
      {expanded && <BandEvidence sector={sector} profiles={profiles} />}
    </div>
  );
}

function ProgressCellEl({
  cell,
  style,
  onOpenIndicator,
}: {
  cell: ProgressCell;
  style: React.CSSProperties;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  const meta = READING_META[cell.reading];
  const burn = cell.reading === 'off-track';
  const linked = cell.indicatorIds.length > 0;
  return (
    <Tooltip content={`${cell.indicator} — ${meta.label.toLowerCase()}: ${cell.basis} (${cell.source})`}>
      <button
        type="button"
        style={{ ...style, background: meta.color }}
        className={`relative rounded-md min-h-[34px] flex items-center justify-center text-white text-[10px] font-bold ${
          linked ? 'cursor-pointer hover:ring-2 hover:ring-offset-1' : 'cursor-help'
        }`}
        onClick={() =>
          linked &&
          onOpenIndicator({ title: cell.indicator, indicatorIds: cell.indicatorIds })
        }
      >
        {meta.label}
        {burn && (
          <span className="absolute -top-1.5 -right-1 text-[12px]" aria-label="burn">
            🔥
          </span>
        )}
      </button>
    </Tooltip>
  );
}

function PolicyRow({
  policyId,
  profile,
}: {
  policyId: string;
  profile: PolicyCoherenceProfile | undefined;
}) {
  return (
    <>
      <Link
        href="/beta/policy-coherence"
        className="flex items-center px-1 min-w-0 text-[10px] font-semibold text-amber-900 hover:underline"
        title={`${policyTitle(policyId)} — open the Policy Coherence board`}
      >
        <span className="truncate">§ {policyTitle(policyId)}</span>
      </Link>
      {COHERENCE_STEPS.map((s) => {
        const grade = profile?.stepGrades[s.id] ?? 'not-assessed';
        const meta = GRADE_META[grade];
        const burn = grade === 'incoherent';
        return (
          <Tooltip
            key={s.id}
            content={
              profile
                ? `${policyTitle(policyId)} · step ${s.ordinal} (${s.shortName}) — ${meta.label.toLowerCase()}: ${coherenceCellBasis(profile, s.id)}`
                : 'Not assessed in the coherence model.'
            }
          >
            <span
              className="relative rounded-md min-h-[26px] flex items-center justify-center text-[10px] font-bold cursor-help"
              style={{ background: meta.color, color: meta.fg }}
            >
              {grade === 'not-assessed' ? '—' : meta.label[0]}
              {burn && (
                <span className="absolute -top-1.5 -right-1 text-[12px]" aria-label="burn">
                  🔥
                </span>
              )}
            </span>
          </Tooltip>
        );
      })}
    </>
  );
}

/** Expanded band: the full evidence behind every cell of both maps. */
function BandEvidence({
  sector,
  profiles,
}: {
  sector: BurnSector;
  profiles: Map<string, PolicyCoherenceProfile>;
}) {
  return (
    <div className="border-t border-grey-100 px-2.5 py-2 bg-white/70 rounded-b-lg">
      <p className="text-[10px] text-tertiary leading-snug mb-2 max-w-4xl">{sector.blurb}</p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        <div>
          <div className="text-[9px] uppercase tracking-wide font-bold text-tertiary-light mb-1">
            A · the four readings
          </div>
          <div className="space-y-1">
            {sector.cells.map((c) => {
              const meta = READING_META[c.reading];
              const lens = PROGRESS_LENSES.find((l) => l.id === c.lens)!;
              return (
                <div key={c.lens} className="rounded border border-grey-200 bg-white px-1.5 py-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="shrink-0 rounded px-1 text-[8.5px] font-bold uppercase tracking-wide text-white"
                      style={{ background: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="font-semibold text-tertiary-dark text-[10px]">
                      {lens.name} — {c.indicator}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-tertiary leading-snug mt-0.5">{c.basis}</p>
                  <p className="text-[8.5px] text-tertiary-light mt-0.5">{c.source}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide font-bold text-tertiary-light mb-1">
            B · the four-step evidence per act
          </div>
          <div className="space-y-1">
            {sector.policyIds.map((pid) => {
              const profile = profiles.get(pid);
              if (!profile) return null;
              return (
                <div key={pid} className="rounded border border-grey-200 bg-white px-1.5 py-1">
                  <div className="font-semibold text-amber-900 text-[10px]">
                    § {policyTitle(pid)}
                  </div>
                  <ul className="mt-0.5 space-y-0.5">
                    {COHERENCE_STEPS.map((s) => {
                      const meta = GRADE_META[profile.stepGrades[s.id]];
                      return (
                        <li key={s.id} className="flex items-start gap-1.5 text-[9.5px] leading-snug">
                          <span
                            className="shrink-0 rounded px-1 text-[8px] font-bold uppercase tracking-wide text-white mt-px"
                            style={{ background: meta.color, color: meta.fg }}
                          >
                            {s.shortName}
                          </span>
                          <span className="text-tertiary">{coherenceCellBasis(profile, s.id)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Burn chips & recommendation fronts ──────────────────────────────────────

function BurnChip({ burn }: { burn: Burn }) {
  return (
    <Tooltip content={burn.basis}>
      <span
        className="inline-flex items-center gap-1 rounded border bg-white px-1.5 py-0.5 text-[9px] font-semibold cursor-help"
        style={{ borderColor: `${burn.color}66`, color: burn.color }}
      >
        🔥 {burn.label}
        <span className="text-[8px] font-bold uppercase tracking-wide text-tertiary-light">
          {burn.kind === 'progress' ? 'A' : 'B'}
        </span>
      </span>
    </Tooltip>
  );
}

function FrontCard({ front, claimed }: { front: RecommendationFront; claimed: number }) {
  const chips = frontRecChips(front);
  const color = FRONT_COLOR[front.key];
  return (
    <div className="rounded-lg border flex flex-col" style={{ borderColor: `${color}55` }}>
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-t-lg" style={{ background: `${color}12` }}>
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white font-bold text-[10px]"
          style={{ background: color }}
        >
          {front.index}
        </span>
        <span className="font-bold text-[11.5px]" style={{ color }}>
          {front.name}
        </span>
        <span className="ml-auto text-[9px] font-bold text-tertiary-light">
          🔥 {claimed} claimed
        </span>
      </div>
      <div className="p-2 flex-1 flex flex-col">
        <p className="text-[9px] text-tertiary-light leading-snug mb-1">claims {front.claims}</p>
        <p className="text-[10.5px] text-tertiary-dark leading-snug">{front.action}</p>
        <div className="mt-2 pt-1.5 border-t border-grey-100">
          <div className="text-[8.5px] uppercase tracking-wide font-bold text-tertiary-light mb-1">
            builds on ESABCC advice
          </div>
          <div className="flex flex-wrap gap-1">
            {chips.map((r) => {
              const meta = REC_STATUS_META[r.status];
              return (
                <Tooltip key={r.id} content={`${r.code} — ${r.title} · ${meta.label.toLowerCase()}`}>
                  <span
                    className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-mono font-bold cursor-help"
                    style={{ color: meta.color, background: `${meta.color}14` }}
                  >
                    {r.code}
                  </span>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
