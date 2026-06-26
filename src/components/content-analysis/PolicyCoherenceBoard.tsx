/**
 * Policy coherence board — the ESABCC coherence method (Moure logic).
 * ------------------------------------------------------------------
 * One board, the worked method laid out as four lenses over the tracked
 * policy corpus. Every act is read against the two 2050 ambitions, then:
 *
 *   ① Overarching ambitions — does the act serve climate neutrality and a
 *     climate-resilient society by 2050, and do its design assumptions still
 *     hold? (Assumption-Based Planning: assumption + signpost + criterion.)
 *   ② Objectives & measures — the act decomposed into its policy objectives
 *     (visions/targets/objectives/goals) and policy measures (regulations/
 *     plans/information/taxes/organisational committees), each tagged to a
 *     climate dimension, with measures-side congruence from the checklist.
 *   ③ Coherence check — across mitigation / adaptation / mitigation–
 *     adaptation: are these aligned, or do they conflict? (Nilsson scale.)
 *   ④ Critical assessment — fit for purpose against the ambitions, plus the
 *     measured pace and the named enablers and barriers.
 *
 * Reused in two homes, mirroring ObjectiveChecklistMatrix: the standalone
 * beta module page (full corpus) and the workspace Content Analysis module
 * (scoped to the corpus, with a toggle out to the full library).
 */
'use client';

import { useMemo, useState } from 'react';
import {
  buildCoherenceOverview,
  coherenceAssessedIds,
  CLIMATE_DIMENSIONS,
  CLIMATE_DIMENSION_BY_ID,
  COHERENCE_LENSES,
  EVIDENCE_TIER_LABEL,
  EX_ANTE_ASSESSMENTS,
  FIT_VERDICT_LABEL,
  INTERACTION_SCALE,
  interactionDimension,
  MEASURE_KIND_LABEL,
  OBJECTIVE_KIND_LABEL,
  OVERARCHING_AMBITIONS,
  PACE_THRESHOLDS,
  type AssumptionStatus,
  type CheckVerdict,
  type ClimateDimension,
  type CoherenceGrade,
  type CoherenceLensId,
  type DimensionCheck,
  type EvidenceTier,
  type FitVerdict,
  type GoalInteraction,
  type PolicyCoherenceProfile,
  type PolicyDecomposition,
} from '@/lib/content-analysis/policy-coherence';
import {
  coherenceEvidenceStats,
  evidenceForExAnte,
  evidenceForInteraction,
  evidenceForOutcome,
  type PolicyTextEvidence,
} from '@/lib/content-analysis/policy-coherence-evidence';
import { getMasterCode } from '@/lib/content-analysis/master-code-catalog';
import { policies } from '@/data/policies';

const SHORT_TITLE_BY_ID = new Map(policies.map(p => [p.id, p.short_title] as const));
const titleOf = (id: string) => SHORT_TITLE_BY_ID.get(id) ?? id;

const GRADE_STYLE: Record<CoherenceGrade, { bg: string; fg: string; label: string }> = {
  coherent: { bg: '#16A34A', fg: '#fff', label: 'Coherent' },
  partial: { bg: '#F59E0B', fg: '#fff', label: 'Partial' },
  incoherent: { bg: '#DC2626', fg: '#fff', label: 'Incoherent' },
  'not-assessed': { bg: '#E5E7EB', fg: '#6B7280', label: 'Not assessed' },
};

const STATUS_STYLE: Record<AssumptionStatus, { bg: string; label: string }> = {
  valid: { bg: '#16A34A', label: 'Valid' },
  'under-pressure': { bg: '#F59E0B', label: 'Under pressure' },
  violated: { bg: '#DC2626', label: 'Violated' },
};

const FIT_STYLE: Record<FitVerdict, { bg: string }> = {
  fit: { bg: '#16A34A' },
  partial: { bg: '#F59E0B' },
  unfit: { bg: '#DC2626' },
  'not-assessed': { bg: '#9CA3AF' },
};

const CHECK_STYLE: Record<CheckVerdict, { bg: string; symbol: string; label: string }> = {
  aligned: { bg: '#16A34A', symbol: '✓', label: 'Aligned' },
  tension: { bg: '#F59E0B', symbol: '◐', label: 'In tension' },
  conflict: { bg: '#DC2626', symbol: '✗', label: 'Conflicting' },
  'not-assessed': { bg: '#D1D5DB', symbol: '—', label: 'Not assessed' },
};

/** Colour ramp for the Nilsson seven-point scale. */
const SCORE_COLOR: Record<number, string> = {
  3: '#15803D',
  2: '#16A34A',
  1: '#65A30D',
  0: '#6B7280',
  [-1]: '#F59E0B',
  [-2]: '#DC2626',
  [-3]: '#7F1D1D',
};

const CHECK_VERDICT_STYLE: Record<string, { bg: string; symbol: string }> = {
  met: { bg: '#16A34A', symbol: '✓' },
  partial: { bg: '#F59E0B', symbol: '◐' },
  'not-met': { bg: '#DC2626', symbol: '✗' },
  'not-applicable': { bg: '#D1D5DB', symbol: '—' },
};

const READING_STYLE: Record<string, { bg: string; label: string }> = {
  'on-track': { bg: '#16A34A', label: 'On track' },
  lagging: { bg: '#F59E0B', label: 'Lagging' },
  'off-track': { bg: '#DC2626', label: 'Off track' },
};

type BoardTab = 'overview' | CoherenceLensId;

interface Props {
  /** Restrict to these policy ids (e.g. a workspace corpus). Ids without any
   *  coherence signal are silently skipped. */
  scopeIds?: string[];
  /** Label for the scoped set in the scope toggle (e.g. "This workspace"). */
  scopeLabel?: string;
}

export default function PolicyCoherenceBoard({ scopeIds, scopeLabel }: Props) {
  const allIds = useMemo(() => coherenceAssessedIds(), []);
  const allSet = useMemo(() => new Set(allIds), [allIds]);
  const scopedIds = useMemo(
    () => (scopeIds ? scopeIds.filter(id => allSet.has(id)) : null),
    [scopeIds, allSet],
  );
  const scopeUsable = scopedIds !== null && scopedIds.length > 0;
  const [useScope, setUseScope] = useState(true);
  const activeIds = scopeUsable && useScope ? scopedIds : allIds;

  const [tab, setTab] = useState<BoardTab>('overview');
  const overview = useMemo(() => buildCoherenceOverview(activeIds), [activeIds]);

  return (
    <div className="space-y-4">
      {/* The anchor: the two overarching ambitions every act is read against */}
      <AmbitionsBanner />

      {/* Headline scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <ScoreCard
          label="Acts assessed"
          value={`${overview.profiles.length}`}
          sub={`${overview.decomposed} decomposed`}
          tone="#3D5265"
        />
        <ScoreCard
          label="Ambitions at risk"
          value={`${overview.violatedAssumptions}`}
          sub="lens ① assumption violated"
          tone={overview.violatedAssumptions > 0 ? '#DC2626' : '#16A34A'}
        />
        <ScoreCard
          label="Measures congruence"
          value={
            overview.meanMeansScore !== null
              ? `${Math.round(overview.meanMeansScore * 100)}%`
              : '—'
          }
          sub="lens ② mean, from checklist"
          tone="#0065A4"
        />
        <ScoreCard
          label="Conflicting pairs"
          value={`${overview.counteracting}`}
          sub={`lens ③ · +${overview.constraining} in tension`}
          tone={overview.counteracting > 0 ? '#DC2626' : '#16A34A'}
        />
        <ScoreCard
          label="Adaptation reach"
          value={`${overview.dimensionCoverage.adaptation + overview.dimensionCoverage['mitigation-adaptation']}`}
          sub={`acts touching adaptation`}
          tone="#0E7C7B"
        />
        <ScoreCard
          label="Not fit for purpose"
          value={`${overview.notFitForPurpose}`}
          sub="lens ④ critical assessment"
          tone={overview.notFitForPurpose > 0 ? '#B83230' : '#16A34A'}
        />
      </div>

      {/* Lens navigation */}
      <div className="border-b border-grey-200 flex items-center gap-1 flex-wrap">
        <StepTabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Synthesis
        </StepTabButton>
        {COHERENCE_LENSES.map(s => (
          <StepTabButton key={s.id} active={tab === s.id} onClick={() => setTab(s.id)}>
            <span className="font-mono mr-1">{s.ordinal}</span>
            {s.shortName}
          </StepTabButton>
        ))}
        {scopeUsable && (
          <div className="ml-auto mb-1 flex items-center rounded-full border border-grey-200 overflow-hidden text-[11px]">
            <button
              type="button"
              onClick={() => setUseScope(true)}
              className={`px-2.5 py-1 ${useScope ? 'bg-primary text-white' : 'bg-white text-tertiary'}`}
            >
              {scopeLabel ?? 'In scope'} ({scopedIds!.length})
            </button>
            <button
              type="button"
              onClick={() => setUseScope(false)}
              className={`px-2.5 py-1 ${!useScope ? 'bg-primary text-white' : 'bg-white text-tertiary'}`}
            >
              Full library ({allIds.length})
            </button>
          </div>
        )}
      </div>

      {tab === 'overview' && <ProvenanceNote />}
      {tab === 'overview' && <SynthesisView profiles={overview.profiles} />}
      {tab === 'ambitions' && <AmbitionsView ids={activeIds} />}
      {tab === 'decomposition' && <DecompositionView profiles={overview.profiles} />}
      {tab === 'coherence' && (
        <CoherenceCheckView profiles={overview.profiles} interactions={overview.interactions} />
      )}
      {tab === 'critical' && <CriticalView profiles={overview.profiles} />}

      {tab !== 'overview' && (
        <p className="text-[10.5px] text-tertiary leading-relaxed max-w-3xl">
          {lensBlurb(tab)}
        </p>
      )}
    </div>
  );
}

function lensBlurb(id: CoherenceLensId): string {
  const s = COHERENCE_LENSES.find(x => x.id === id)!;
  return `Lens ${s.ordinal} — ${s.question} Framework: ${s.framework}. ${s.method}`;
}

/** The two 2050 ambitions, pinned at the top: the anchor of the whole method. */
function AmbitionsBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-amber-700">
        Overarching ambitions — every act is read against these
      </p>
      <div className="mt-1.5 grid sm:grid-cols-2 gap-2">
        {OVERARCHING_AMBITIONS.map(a => {
          const dim = CLIMATE_DIMENSION_BY_ID[a.dimension];
          return (
            <div key={a.id} className="flex items-start gap-2">
              <span
                className="mt-0.5 inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: dim.color }}
              />
              <span className="text-[12px] leading-snug">
                <span className="font-bold text-tertiary-dark">{a.label}</span>
                <span className="text-tertiary"> — {a.basis}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px transition ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-tertiary hover:text-tertiary-dark'
      }`}
    >
      {children}
    </button>
  );
}

function ScoreCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="border border-grey-200 rounded-md bg-white px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-tertiary">{label}</p>
      <p className="text-[20px] font-bold leading-tight tabular-nums" style={{ color: tone }}>
        {value}
      </p>
      <p className="text-[10px] text-tertiary leading-tight">{sub}</p>
    </div>
  );
}

function GradeChip({ grade, title }: { grade: CoherenceGrade; title?: string }) {
  const s = GRADE_STYLE[grade];
  return (
    <span
      className="inline-flex items-center justify-center h-4 px-1.5 rounded-sm text-[9px] font-bold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.fg }}
      title={title ?? s.label}
    >
      {s.label}
    </span>
  );
}

function TierChip({ tier }: { tier: EvidenceTier }) {
  return (
    <span
      className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-grey-200 bg-white text-[9px] font-bold text-tertiary"
      title={`Evidence tier ${tier}: ${EVIDENCE_TIER_LABEL[tier]}`}
    >
      {tier}
    </span>
  );
}

/** A climate-dimension pill (mitigation / adaptation / mit–adapt). */
function DimensionChip({ dimension, small }: { dimension: ClimateDimension; small?: boolean }) {
  const d = CLIMATE_DIMENSION_BY_ID[dimension];
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold text-white ${small ? 'px-1.5 py-px text-[8px]' : 'px-2 py-0.5 text-[9px]'}`}
      style={{ backgroundColor: d.color }}
      title={d.description}
    >
      {small ? d.shortLabel : d.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const scale = INTERACTION_SCALE[score as keyof typeof INTERACTION_SCALE];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
      style={{ backgroundColor: SCORE_COLOR[score] }}
      title={scale.definition}
    >
      <span className="font-mono">{score > 0 ? `+${score}` : score}</span>
      {scale.name}
    </span>
  );
}

// ── Synthesis: policies × four lenses ──────────────────────────────────────

function SynthesisView({ profiles }: { profiles: PolicyCoherenceProfile[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? profiles.filter(p => titleOf(p.policyId).toLowerCase().includes(q)) : profiles;
  }, [profiles, query]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search policies…"
        className="px-2.5 py-1.5 border border-grey-200 rounded text-[12px] w-44"
      />
      <div className="overflow-x-auto border border-grey-200 rounded-lg bg-white">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-grey-50 border-b border-grey-200">
              <th className="text-left px-3 py-2 font-bold text-tertiary-dark sticky left-0 bg-grey-50 min-w-[180px]">
                Policy
              </th>
              <th className="px-2 py-2 font-bold text-tertiary text-center whitespace-nowrap" title="Climate dimensions the act acts on">
                Dimensions
              </th>
              {COHERENCE_LENSES.map(s => (
                <th
                  key={s.id}
                  className="px-2 py-2 font-bold text-tertiary text-center whitespace-nowrap"
                  title={`Lens ${s.ordinal}: ${s.name}\n${s.framework}\n${s.question}`}
                >
                  <span className="font-mono mr-1">{s.ordinal}</span>
                  {s.shortName}
                </th>
              ))}
              <th
                className="px-2 py-2 font-bold text-tertiary-dark text-center whitespace-nowrap"
                title="Worst assessed lens — coherence is a weakest-link property"
              >
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const expanded = expandedId === p.policyId;
              return (
                <SynthesisRow
                  key={p.policyId}
                  profile={p}
                  expanded={expanded}
                  onToggle={() => setExpandedId(expanded ? null : p.policyId)}
                />
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-tertiary">
                  No policies match the search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-tertiary">
        Rows sort worst-first (overall = weakest assessed lens). Click a row to open the worked
        method for that act — its objectives & measures, the coherence check across the three
        climate dimensions, and the critical assessment. Grey cells mean no signal yet.
      </p>
    </div>
  );
}

function SynthesisRow({
  profile: p,
  expanded,
  onToggle,
}: {
  profile: PolicyCoherenceProfile;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-grey-100 cursor-pointer ${expanded ? 'bg-blue-50/40' : 'hover:bg-grey-50'}`}
        onClick={onToggle}
      >
        <td className="px-3 py-1.5 sticky left-0 bg-inherit font-medium text-tertiary-dark">
          {titleOf(p.policyId)}
        </td>
        <td className="px-2 py-1.5 text-center whitespace-nowrap">
          {p.dimensionSet.map(d => (
            <span key={d} className="inline-block mx-px">
              <DimensionChip dimension={d} small />
            </span>
          ))}
        </td>
        {COHERENCE_LENSES.map(s => (
          <td key={s.id} className="px-2 py-1.5 text-center">
            <GradeChip
              grade={p.lensGrades[s.id]}
              title={`Lens ${s.ordinal} (${s.shortName}): ${GRADE_STYLE[p.lensGrades[s.id]].label}`}
            />
          </td>
        ))}
        <td className="px-2 py-1.5 text-center">
          <GradeChip grade={p.overall} />
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-grey-200 bg-blue-50/30">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid gap-2 lg:grid-cols-2 text-[10.5px] text-tertiary leading-relaxed">
              {/* ① Overarching ambitions */}
              <div className="bg-white border border-grey-100 rounded px-2.5 py-2">
                <p className="font-bold text-tertiary-dark text-[10px]">
                  ① Overarching ambitions{' '}
                  {p.exAnte && <TierChip tier={p.exAnte.tier} />}
                </p>
                <p className="mt-0.5">
                  <span className="font-semibold">Serves:</span>{' '}
                  {p.ambitions.length > 0
                    ? p.ambitions
                        .map(a => OVERARCHING_AMBITIONS.find(x => x.id === a)?.label ?? a)
                        .join(' · ')
                    : '—'}
                </p>
                {p.exAnte ? (
                  <>
                    <p className="mt-0.5">
                      <span className="font-semibold">Assumption ({p.exAnte.designYear}):</span>{' '}
                      {p.exAnte.assumption}
                    </p>
                    <p className="mt-0.5">
                      <span className="font-semibold">Observed:</span> {p.exAnte.observation}{' '}
                      <span className="italic">({p.exAnte.source})</span>
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 italic">No assumption audit yet.</p>
                )}
              </div>
              {/* ② Objectives & measures */}
              <div className="bg-white border border-grey-100 rounded px-2.5 py-2">
                <p className="font-bold text-tertiary-dark text-[10px]">
                  ② Objectives & measures{' '}
                  {p.means.score !== null && (
                    <span className="font-mono">· measures {Math.round(p.means.score * 100)}%</span>
                  )}
                </p>
                {p.decomposition ? (
                  <ObjectivesMeasures decomposition={p.decomposition} compact />
                ) : (
                  <p className="mt-0.5 italic">No decomposition authored yet.</p>
                )}
              </div>
              {/* ③ Coherence check */}
              <div className="bg-white border border-grey-100 rounded px-2.5 py-2">
                <p className="font-bold text-tertiary-dark text-[10px]">③ Coherence check</p>
                <CoherenceCheckPanel dimensions={p.dimensions} />
                {p.interactions.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {p.interactions.map(i => (
                      <li key={i.id}>
                        <ScoreBadge score={i.score} /> with{' '}
                        <span className="font-semibold">
                          {titleOf(i.a === p.policyId ? i.b : i.a)}
                        </span>{' '}
                        <DimensionChip dimension={interactionDimension(i)} small /> ({i.mechanism})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* ④ Critical assessment */}
              <div className="bg-white border border-grey-100 rounded px-2.5 py-2">
                <p className="font-bold text-tertiary-dark text-[10px]">
                  ④ Critical assessment{' '}
                  {p.critical && <FitChip fit={p.critical.fit} />}
                </p>
                {p.critical ? (
                  <>
                    <p className="mt-0.5">{p.critical.rationale}</p>
                    <EnablersBarriers enablers={p.critical.enablers} barriers={p.critical.barriers} />
                  </>
                ) : (
                  <p className="mt-0.5 italic">No critical reading authored yet.</p>
                )}
                {p.evaluation.measurement && (
                  <p className="mt-1">
                    <span className="font-semibold">
                      Measured ({p.evaluation.measurement.indicator}):
                    </span>{' '}
                    {paceSentence(p)}
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FitChip({ fit }: { fit: FitVerdict }) {
  return (
    <span
      className="inline-flex items-center px-1.5 h-4 rounded-sm text-[9px] font-bold text-white"
      style={{ backgroundColor: FIT_STYLE[fit].bg }}
    >
      {FIT_VERDICT_LABEL[fit]}
    </span>
  );
}

function EnablersBarriers({ enablers, barriers }: { enablers: string[]; barriers: string[] }) {
  if (enablers.length === 0 && barriers.length === 0) return null;
  return (
    <div className="mt-1 grid sm:grid-cols-2 gap-1.5">
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-emerald-700">Enablers</p>
        <ul className="mt-0.5 space-y-0.5">
          {enablers.map((e, i) => (
            <li key={i} className="flex gap-1">
              <span className="text-emerald-600">+</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-red-700">Barriers</p>
        <ul className="mt-0.5 space-y-0.5">
          {barriers.map((b, i) => (
            <li key={i} className="flex gap-1">
              <span className="text-red-600">−</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The orange coherence-check panel from the worked example: a verdict per
 *  climate dimension (aligned? in tension? conflict?). */
function CoherenceCheckPanel({ dimensions }: { dimensions: DimensionCheck[] }) {
  return (
    <div className="mt-1 rounded border border-amber-200 bg-amber-50/60 divide-y divide-amber-100">
      {dimensions.map(d => {
        const meta = CLIMATE_DIMENSION_BY_ID[d.dimension];
        const s = CHECK_STYLE[d.present ? d.verdict : 'not-assessed'];
        return (
          <div key={d.dimension} className="flex items-center gap-2 px-2 py-1">
            <span
              className="inline-flex items-center justify-center h-4 w-4 rounded-sm text-[9px] font-bold text-white shrink-0"
              style={{ backgroundColor: s.bg }}
              title={s.label}
            >
              {s.symbol}
            </span>
            <span className="text-[10px] font-bold" style={{ color: meta.color }}>
              {meta.label}
            </span>
            <span className="ml-auto text-[9px] text-tertiary">
              {d.present ? s.label : 'not in scope'}
              {d.interactions.length > 0 && ` · ${d.interactions.length} link${d.interactions.length > 1 ? 's' : ''}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The two boxes of the worked example: policy objectives and policy measures. */
function ObjectivesMeasures({
  decomposition,
  compact,
}: {
  decomposition: PolicyDecomposition;
  compact?: boolean;
}) {
  return (
    <div className={`grid ${compact ? '' : 'sm:grid-cols-2'} gap-2 mt-1`}>
      <div className="rounded border border-sky-200 bg-sky-50/50 px-2 py-1.5">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-sky-700">
          Policy objectives
        </p>
        <ul className="mt-1 space-y-1">
          {decomposition.objectives.map((o, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="font-mono text-[8px] text-sky-600 mt-px shrink-0 w-9">
                {OBJECTIVE_KIND_LABEL[o.kind]}
              </span>
              <span className="text-[10.5px] text-tertiary-dark flex-1">{o.text}</span>
              <DimensionChip dimension={o.dimension} small />
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded border border-violet-200 bg-violet-50/50 px-2 py-1.5">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-violet-700">
          Policy measures
        </p>
        <ul className="mt-1 space-y-1">
          {decomposition.measures.map((m, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="font-mono text-[8px] text-violet-600 mt-px shrink-0 w-9">
                {MEASURE_KIND_LABEL[m.kind].split(' ')[0]}
              </span>
              <span className="text-[10.5px] text-tertiary-dark flex-1">{m.text}</span>
              <DimensionChip dimension={m.dimension} small />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function paceSentence(p: PolicyCoherenceProfile): string {
  const m = p.evaluation.measurement!;
  const r = m.pace.ratio;
  return `${m.latest.value} ${m.unit} (${m.latest.year}) vs target ${m.target.value} (${m.target.year}); pace ratio ${r === null ? '—' : r.toFixed(2)} → ${READING_STYLE[m.pace.reading].label}.`;
}

/** Where-it-stems-from banner: the corpus-level provenance contract. */
function ProvenanceNote() {
  const stats = coherenceEvidenceStats();
  return (
    <p className="text-[11px] text-tertiary bg-violet-50 border border-violet-200 rounded px-3 py-2 leading-relaxed">
      <span className="font-bold">Anchored in the acts’ own text:</span> the curated lenses are
      pinned to {stats.total} provision anchors — {stats.verbatim} verbatim quotes from the
      policy-text library and {stats.glossed} flagged paraphrases where the library lacks the
      (consolidated) act. Each lens view shows the passages inline, and the same passages are
      tagged in the Content Analysis master library under the ①–④ coherence codes (project{' '}
      <span className="font-semibold">“Policy coherence — master library”</span>), so every grade
      can be walked back to the words it stems from.
    </p>
  );
}

/** One provision anchor: the verbatim passage (or flagged paraphrase) the
 *  assessment stems from, with the citation and the one-line reading. */
function ProvisionQuote({ ev, showPolicy }: { ev: PolicyTextEvidence; showPolicy?: boolean }) {
  return (
    <div
      className="rounded border-l-2 bg-grey-50 px-2.5 py-1.5"
      style={{ borderLeftColor: ev.quote !== null ? '#6D28D9' : '#9CA3AF' }}
    >
      <p className="flex items-center gap-1.5 flex-wrap font-mono text-[8.5px] uppercase tracking-[0.1em] text-tertiary">
        {showPolicy && <span className="font-bold">{titleOf(ev.policyId)}</span>}
        <span>{ev.provision}</span>
        {ev.quote !== null ? (
          <span className="px-1 rounded-sm bg-violet-100 text-violet-800 normal-case tracking-normal font-sans font-semibold">
            verbatim
          </span>
        ) : (
          <span
            className="px-1 rounded-sm bg-grey-200 text-tertiary-dark normal-case tracking-normal font-sans font-semibold"
            title={ev.textNote}
          >
            paraphrase — text not in library
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[10.5px] leading-relaxed text-tertiary-dark italic">
        “{ev.quote ?? ev.gloss}”
      </p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-tertiary">{ev.reading}</p>
      {ev.textNote && (
        <p className="mt-0.5 text-[9px] leading-relaxed text-amber-700">{ev.textNote}</p>
      )}
    </div>
  );
}

function VerdictDot({ verdict }: { verdict: string }) {
  const v = CHECK_VERDICT_STYLE[verdict] ?? CHECK_VERDICT_STYLE['not-applicable'];
  return (
    <span
      className="mt-px inline-flex items-center justify-center h-3.5 w-5 rounded-sm text-[8px] font-bold text-white shrink-0"
      style={{ backgroundColor: v.bg }}
    >
      {v.symbol}
    </span>
  );
}

// ── Lens 1 · Overarching ambitions (assumption audits) ─────────────────────

function AmbitionsView({ ids }: { ids: string[] }) {
  const inScope = new Set(ids);
  const order: AssumptionStatus[] = ['violated', 'under-pressure', 'valid'];
  const entries = Object.values(EX_ANTE_ASSESSMENTS)
    .filter(e => inScope.has(e.policyId))
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  if (entries.length === 0) {
    return (
      <p className="text-[12px] text-tertiary italic px-1 py-4">
        No assumption audits in the current scope yet.
      </p>
    );
  }
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {entries.map(e => {
        const s = STATUS_STYLE[e.status];
        return (
          <div key={e.policyId} className="border border-grey-200 rounded-lg bg-white p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: s.bg }}
              >
                {s.label}
              </span>
              <span className="text-[12px] font-bold text-tertiary-dark">
                {titleOf(e.policyId)}
              </span>
              <TierChip tier={e.tier} />
              <span className="ml-auto font-mono text-[9px] text-tertiary">
                design vintage {e.designYear}
              </span>
            </div>
            <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed">
              <div className="bg-grey-50 rounded px-2.5 py-2">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-tertiary">
                  Load-bearing assumption (falsifiable)
                </p>
                <p className="mt-0.5 text-tertiary-dark">{e.assumption}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-1.5">
                <div className="bg-grey-50 rounded px-2.5 py-2">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-tertiary">
                    Signpost indicator
                  </p>
                  <p className="mt-0.5 text-tertiary-dark">{e.signpost}</p>
                </div>
                <div className="bg-grey-50 rounded px-2.5 py-2">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-tertiary">
                    Violation criterion
                  </p>
                  <p className="mt-0.5 text-tertiary-dark">{e.violationCriterion}</p>
                </div>
              </div>
              <div className="bg-grey-50 rounded px-2.5 py-2">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-tertiary">
                  Observation → status
                </p>
                <p className="mt-0.5 text-tertiary-dark">
                  {e.observation} <span className="italic text-tertiary">({e.source})</span>
                </p>
              </div>
              {evidenceForExAnte(e.policyId).length > 0 && (
                <div className="space-y-1">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-tertiary px-0.5">
                    In the act — where the assumption stems from
                  </p>
                  {evidenceForExAnte(e.policyId).map(ev => (
                    <ProvisionQuote key={ev.id} ev={ev} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Lens 2 · Objectives & measures (the decomposition) ─────────────────────

function DecompositionView({ profiles }: { profiles: PolicyCoherenceProfile[] }) {
  const decomposed = profiles.filter(p => p.decomposition);
  const derivedOnly = profiles.filter(p => !p.decomposition && p.means.score !== null);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-tertiary bg-sky-50 border border-sky-200 rounded px-3 py-2 leading-relaxed">
        <span className="font-bold">The decomposition:</span> each act laid out as the worked
        method does — its <span className="text-sky-700 font-semibold">policy objectives</span>{' '}
        (visions / targets / objectives / goals) and its{' '}
        <span className="text-violet-700 font-semibold">policy measures</span> (regulations /
        plans / information / taxes / organisational committees), every item tagged to a climate
        dimension. The <span className="font-mono">measures&nbsp;%</span> is the goals/means
        congruence rolled from the objective–delivery checklist (instruments, coverage,
        enforcement, financing, timeline; ≥75% coherent, ≥45% partial).
      </p>
      <div className="space-y-2">
        {decomposed.map(p => (
          <div key={p.policyId} className="border border-grey-200 rounded-lg bg-white p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-bold text-tertiary-dark">{titleOf(p.policyId)}</span>
              {p.dimensionSet.map(d => (
                <DimensionChip key={d} dimension={d} small />
              ))}
              {p.means.score !== null && (
                <span className="ml-auto font-mono text-[10px] text-tertiary">
                  measures {Math.round(p.means.score * 100)}%
                </span>
              )}
            </div>
            <ObjectivesMeasures decomposition={p.decomposition!} />
          </div>
        ))}
      </div>
      {derivedOnly.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-tertiary-dark mb-1.5">
            Measures-congruence only — no objectives/measures decomposition authored yet (
            {derivedOnly.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {derivedOnly.map(p => (
              <span
                key={p.policyId}
                className="inline-flex items-center gap-1.5 border border-grey-200 rounded-full bg-white px-2.5 py-1 text-[10.5px] text-tertiary-dark"
                title={p.means.entries
                  .map(e => `${getMasterCode(e.codeId)?.name ?? e.codeId}: ${e.verdict}`)
                  .join('\n')}
              >
                {titleOf(p.policyId)}
                <span className="font-mono text-[9px] text-tertiary">
                  {p.means.score !== null ? `${Math.round(p.means.score * 100)}%` : '—'}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lens 3 · Coherence check (per climate dimension) ───────────────────────

type DimFilter = 'all' | ClimateDimension;

function CoherenceCheckView({
  profiles,
  interactions,
}: {
  profiles: PolicyCoherenceProfile[];
  interactions: GoalInteraction[];
}) {
  const [filter, setFilter] = useState<DimFilter>('all');
  const shown = interactions
    .filter(i => filter === 'all' || interactionDimension(i) === filter)
    .sort((a, b) => a.score - b.score);
  const counts: Record<DimFilter, number> = {
    all: interactions.length,
    mitigation: interactions.filter(i => interactionDimension(i) === 'mitigation').length,
    adaptation: interactions.filter(i => interactionDimension(i) === 'adaptation').length,
    'mitigation-adaptation': interactions.filter(
      i => interactionDimension(i) === 'mitigation-adaptation',
    ).length,
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-tertiary bg-amber-50 border border-amber-200 rounded px-3 py-2 leading-relaxed">
        <span className="font-bold">Are these aligned? Do they conflict?</span> The coherence
        check reads every act across the three climate dimensions, then scores the cross-policy
        conflicts on the seven-point Nilsson scale (−3 cancelling … +3 indivisible), each with its
        mechanism, dimension and the legal provisions that create it.
      </p>

      {/* Per-act coherence-check grid (the orange panel of the worked example) */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {profiles
          .filter(p => p.dimensions.some(d => d.present))
          .map(p => (
            <div key={p.policyId} className="border border-grey-200 rounded-lg bg-white p-2.5">
              <p className="text-[11px] font-bold text-tertiary-dark mb-1">{titleOf(p.policyId)}</p>
              <CoherenceCheckPanel dimensions={p.dimensions} />
            </div>
          ))}
      </div>

      {/* Dimension filter + the scored interactions */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {(['all', 'mitigation', 'adaptation', 'mitigation-adaptation'] as const).map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              filter === k
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-tertiary border-grey-200 hover:text-tertiary-dark'
            }`}
          >
            {k === 'all' ? 'All' : CLIMATE_DIMENSION_BY_ID[k].label}{' '}
            <span className="font-mono tabular-nums">({counts[k]})</span>
          </button>
        ))}
        <span className="ml-auto text-[10px] text-tertiary">
          Scale: Nilsson et al. (2016) — −3 cancelling … +3 indivisible
        </span>
      </div>
      {shown.length === 0 && (
        <p className="text-[12px] text-tertiary italic px-1 py-4">
          No scored interactions on this dimension with both endpoints in scope.
        </p>
      )}
      <div className="space-y-2">
        {shown.map(i => (
          <div
            key={i.id}
            className="rounded-lg border bg-white p-3"
            style={{ borderColor: `${SCORE_COLOR[i.score]}55` }}
          >
            <div className="flex items-center gap-2 flex-wrap text-[11.5px]">
              <ScoreBadge score={i.score} />
              <DimensionChip dimension={interactionDimension(i)} />
              <span className="font-bold text-tertiary-dark">{titleOf(i.a)}</span>
              <span className="text-tertiary">×</span>
              <span className="font-bold text-tertiary-dark">{titleOf(i.b)}</span>
              <span className="px-1.5 py-0.5 rounded-full border border-grey-200 text-[9px] text-tertiary">
                {i.mechanism}
              </span>
              <TierChip tier={i.tier} />
            </div>
            <div className="mt-1.5 grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[10.5px] text-tertiary">
              <p>
                <span className="font-semibold text-tertiary-dark">{titleOf(i.a)}:</span> {i.goalA}
              </p>
              <p>
                <span className="font-semibold text-tertiary-dark">{titleOf(i.b)}:</span> {i.goalB}
              </p>
            </div>
            <p className="mt-1.5 text-[11px] text-tertiary-dark leading-relaxed">{i.rationale}</p>
            <p className="mt-1 text-[9.5px] font-mono text-tertiary">Basis: {i.legalBasis}</p>
            {evidenceForInteraction(i.id).length > 0 && (
              <div className="mt-1.5 grid sm:grid-cols-2 gap-1.5">
                {evidenceForInteraction(i.id).map(ev => (
                  <ProvisionQuote key={ev.id} ev={ev} showPolicy />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Lens 4 · Critical assessment (fit, enablers, barriers, pace) ───────────

function CriticalView({ profiles }: { profiles: PolicyCoherenceProfile[] }) {
  const fitOrder: FitVerdict[] = ['unfit', 'partial', 'fit', 'not-assessed'];
  const assessed = profiles
    .filter(p => p.critical)
    .sort((a, b) => fitOrder.indexOf(a.critical!.fit) - fitOrder.indexOf(b.critical!.fit));
  const measured = profiles
    .filter(p => p.evaluation.measurement)
    .sort(
      (a, b) =>
        (a.evaluation.measurement!.pace.ratio ?? Infinity) -
        (b.evaluation.measurement!.pace.ratio ?? Infinity),
    );

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-tertiary bg-amber-50 border border-amber-200 rounded px-3 py-2 leading-relaxed">
        <span className="font-bold">Why? Are these ambitious enough — fit for purpose?</span> The
        critical assessment reads each act against the 2050 ambitions: the measured pace (observed
        recent pace ÷ required pace; ≥ {PACE_THRESHOLDS.onTrack.toFixed(1)} on track, ≥{' '}
        {PACE_THRESHOLDS.lagging.toFixed(1)} lagging, below off track — the EEA distance-to-target
        method) alongside the named enablers and barriers.
      </p>

      <div className="grid gap-2 lg:grid-cols-2">
        {assessed.map(p => (
          <div key={p.policyId} className="border border-grey-200 rounded-lg bg-white p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-bold text-tertiary-dark">{titleOf(p.policyId)}</span>
              <FitChip fit={p.critical!.fit} />
              {p.dimensionSet.map(d => (
                <DimensionChip key={d} dimension={d} small />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-tertiary-dark leading-relaxed">
              {p.critical!.rationale}
            </p>
            <div className="mt-1.5 text-[10.5px] text-tertiary">
              <EnablersBarriers
                enablers={p.critical!.enablers}
                barriers={p.critical!.barriers}
              />
            </div>
            {p.evaluation.measurement && (
              <p className="mt-1.5 text-[10.5px] text-tertiary">
                <span className="font-semibold text-tertiary-dark">
                  Measured ({p.evaluation.measurement.indicator}):
                </span>{' '}
                {paceSentence(p)}
              </p>
            )}
            {evidenceForOutcome(p.policyId).map(ev => (
              <div key={ev.id} className="mt-1.5">
                <ProvisionQuote ev={ev} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* The measured pace table */}
      <div>
        <p className="text-[11px] font-bold text-tertiary-dark mb-1.5">
          Measured pace (distance-to-target)
        </p>
        <div className="overflow-x-auto border border-grey-200 rounded-lg bg-white">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-grey-50 border-b border-grey-200">
                <th className="text-left px-3 py-2 font-bold text-tertiary-dark min-w-[160px]">
                  Policy
                </th>
                <th className="text-left px-3 py-2 font-bold text-tertiary-dark">Indicator</th>
                <th className="px-2 py-2 font-bold text-tertiary text-right whitespace-nowrap">
                  Latest
                </th>
                <th className="px-2 py-2 font-bold text-tertiary text-right whitespace-nowrap">
                  Target
                </th>
                <th
                  className="px-2 py-2 font-bold text-tertiary-dark text-right whitespace-nowrap"
                  title="Observed recent pace ÷ required pace"
                >
                  Pace ratio
                </th>
                <th className="px-2 py-2 font-bold text-tertiary-dark text-center">Reading</th>
              </tr>
            </thead>
            <tbody>
              {measured.map(p => {
                const m = p.evaluation.measurement!;
                const reading = READING_STYLE[m.pace.reading];
                return (
                  <tr key={p.policyId} className="border-b border-grey-100 align-top">
                    <td className="px-3 py-1.5 font-medium text-tertiary-dark">
                      {titleOf(p.policyId)}
                    </td>
                    <td className="px-3 py-1.5 text-tertiary">
                      {m.indicator}
                      <span className="block text-[9px] italic">
                        {m.source} <TierChip tier={m.tier} />
                        {m.notes ? ` · ${m.notes}` : ''}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums whitespace-nowrap text-tertiary-dark font-bold">
                      {m.latest.value}
                      <span className="text-[9px] font-normal"> ({m.latest.year})</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums whitespace-nowrap text-tertiary">
                      {m.target.value}
                      <span className="text-[9px]"> ({m.target.year})</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums font-bold text-tertiary-dark whitespace-nowrap">
                      {m.pace.ratio === null ? '—' : m.pace.ratio.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap"
                        style={{ backgroundColor: reading.bg }}
                      >
                        {reading.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
