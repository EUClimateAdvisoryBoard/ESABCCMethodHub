/**
 * Policy coherence board — the beta four-step coherence model.
 * ------------------------------------------------------------
 * One board, five surfaces: a synthesis matrix (policies × the four steps,
 * worst-first) plus a dedicated view per step:
 *
 *   ① Ex ante design vs world development   (curated assumption audits)
 *   ② Coherence across policy goals          (curated pairwise interactions)
 *   ③ Goals vs means of implementation       (derived from the objective–
 *                                             delivery checklist — reused,
 *                                             never re-assessed)
 *   ④ Policy evaluation: change + outcomes   (derived machinery + curated
 *                                             measured outcomes)
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
  COHERENCE_STEPS,
  EX_ANTE_ASSESSMENTS,
  GOAL_INTERACTIONS,
  type AssumptionStatus,
  type CoherenceGrade,
  type CoherenceStepId,
  type GoalInteraction,
  type InteractionKind,
  type PolicyCoherenceProfile,
} from '@/lib/content-analysis/policy-coherence';
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
  holds: { bg: '#16A34A', label: 'Holds' },
  drifting: { bg: '#F59E0B', label: 'Drifting' },
  broken: { bg: '#DC2626', label: 'Broken' },
};

const KIND_STYLE: Record<InteractionKind, { bg: string; border: string; label: string }> = {
  synergy: { bg: '#F0FDF4', border: '#16A34A', label: 'Synergy' },
  tension: { bg: '#FFFBEB', border: '#F59E0B', label: 'Tension' },
  conflict: { bg: '#FEF2F2', border: '#DC2626', label: 'Conflict' },
};

const CHECK_VERDICT_STYLE: Record<string, { bg: string; symbol: string }> = {
  met: { bg: '#16A34A', symbol: '✓' },
  partial: { bg: '#F59E0B', symbol: '◐' },
  'not-met': { bg: '#DC2626', symbol: '✗' },
  'not-applicable': { bg: '#D1D5DB', symbol: '—' },
};

type BoardTab = 'overview' | CoherenceStepId;

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
      {/* Headline scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <ScoreCard
          label="Policies assessed"
          value={`${overview.profiles.length}`}
          sub="with ≥1 coherence signal"
          tone="#3D5265"
        />
        <ScoreCard
          label="Broken assumptions"
          value={`${overview.brokenAssumptions}`}
          sub="step ① ex-ante vs world"
          tone={overview.brokenAssumptions > 0 ? '#DC2626' : '#16A34A'}
        />
        <ScoreCard
          label="Goal conflicts"
          value={`${overview.conflicts}`}
          sub={`+ ${overview.tensions} tensions · ${overview.synergies} synergies`}
          tone={overview.conflicts > 0 ? '#DC2626' : '#16A34A'}
        />
        <ScoreCard
          label="Means coherence"
          value={
            overview.meanMeansScore !== null
              ? `${Math.round(overview.meanMeansScore * 100)}%`
              : '—'
          }
          sub="step ③ mean, from checklist"
          tone="#0065A4"
        />
        <ScoreCard
          label="Outcomes off-track"
          value={`${overview.profiles.filter(p => p.evaluation.outcome?.reading === 'off-track').length}`}
          sub="step ④ measured outcomes"
          tone="#B83230"
        />
      </div>

      {/* Step navigation */}
      <div className="border-b border-grey-200 flex items-center gap-1 flex-wrap">
        <StepTabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Synthesis
        </StepTabButton>
        {COHERENCE_STEPS.map(s => (
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

      {tab === 'overview' && <SynthesisView profiles={overview.profiles} />}
      {tab === 'ex-ante' && <ExAnteView ids={activeIds} />}
      {tab === 'horizontal' && <InteractionsView interactions={overview.interactions} />}
      {tab === 'goals-means' && <MeansView profiles={overview.profiles} />}
      {tab === 'evaluation' && <EvaluationView profiles={overview.profiles} />}

      {tab !== 'overview' && (
        <p className="text-[10.5px] text-tertiary leading-relaxed max-w-3xl">
          {COHERENCE_STEP_BLURB(tab)}
        </p>
      )}
    </div>
  );
}

function COHERENCE_STEP_BLURB(id: CoherenceStepId): string {
  const s = COHERENCE_STEPS.find(x => x.id === id)!;
  return `Step ${s.ordinal} — ${s.question} Basis: ${s.basis}. ${s.method}`;
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

// ── Synthesis: policies × four steps ───────────────────────────────────────

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
              {COHERENCE_STEPS.map(s => (
                <th
                  key={s.id}
                  className="px-2 py-2 font-bold text-tertiary text-center whitespace-nowrap"
                  title={`Step ${s.ordinal}: ${s.name}\n${s.question}`}
                >
                  <span className="font-mono mr-1">{s.ordinal}</span>
                  {s.shortName}
                </th>
              ))}
              <th
                className="px-2 py-2 font-bold text-tertiary-dark text-center whitespace-nowrap"
                title="Worst assessed step — coherence is a weakest-link property"
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
                <td colSpan={6} className="px-3 py-6 text-center text-tertiary">
                  No policies match the search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-tertiary">
        Rows sort worst-first (overall = weakest assessed step). Click a row for the underlying
        evidence per step. Grey cells mean no signal yet — steps ① and ② are curated for the
        major acts only; steps ③ and ④ derive from the objective–delivery checklist and cover
        every assessed policy.
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
        {COHERENCE_STEPS.map(s => (
          <td key={s.id} className="px-2 py-1.5 text-center">
            <GradeChip
              grade={p.stepGrades[s.id]}
              title={`Step ${s.ordinal} (${s.shortName}): ${GRADE_STYLE[p.stepGrades[s.id]].label}`}
            />
          </td>
        ))}
        <td className="px-2 py-1.5 text-center">
          <GradeChip grade={p.overall} />
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-grey-200 bg-blue-50/30">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid gap-2 lg:grid-cols-2 text-[10.5px] text-tertiary leading-relaxed">
              <div className="bg-white border border-grey-100 rounded px-2.5 py-2">
                <p className="font-bold text-tertiary-dark text-[10px]">① Ex ante vs world</p>
                {p.exAnte ? (
                  <>
                    <p className="mt-0.5">
                      <span className="font-semibold">Assumed ({p.exAnte.designYear}):</span>{' '}
                      {p.exAnte.assumption}
                    </p>
                    <p className="mt-0.5">
                      <span className="font-semibold">Developed:</span> {p.exAnte.development}
                    </p>
                  </>
                ) : (
                  <p className="italic">No curated assumption audit yet.</p>
                )}
              </div>
              <div className="bg-white border border-grey-100 rounded px-2.5 py-2">
                <p className="font-bold text-tertiary-dark text-[10px]">
                  ② Goal interactions ({p.interactions.length})
                </p>
                {p.interactions.length > 0 ? (
                  <ul className="mt-0.5 space-y-1">
                    {p.interactions.map(i => (
                      <li key={i.id}>
                        <span
                          className="font-bold"
                          style={{ color: KIND_STYLE[i.kind].border }}
                        >
                          {KIND_STYLE[i.kind].label}
                        </span>{' '}
                        with {titleOf(i.a === p.policyId ? i.b : i.a)}: {i.rationale}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic">No curated goal interactions touch this act yet.</p>
                )}
              </div>
              <div className="bg-white border border-grey-100 rounded px-2.5 py-2">
                <p className="font-bold text-tertiary-dark text-[10px]">
                  ③ Goals ↔ means{' '}
                  {p.means.score !== null && (
                    <span className="font-mono">· {Math.round(p.means.score * 100)}%</span>
                  )}
                </p>
                <ul className="mt-0.5 space-y-1">
                  {p.means.entries.map(e => (
                    <li key={e.codeId} className="flex items-start gap-1.5">
                      <VerdictDot verdict={e.verdict} />
                      <span>
                        <span className="font-semibold">
                          {getMasterCode(e.codeId)?.name ?? e.codeId}:
                        </span>{' '}
                        {e.rationale}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 italic">Derived from the objective–delivery checklist.</p>
              </div>
              <div className="bg-white border border-grey-100 rounded px-2.5 py-2">
                <p className="font-bold text-tertiary-dark text-[10px]">④ Evaluation</p>
                <ul className="mt-0.5 space-y-1">
                  {p.evaluation.machinery.entries.map(e => (
                    <li key={e.codeId} className="flex items-start gap-1.5">
                      <VerdictDot verdict={e.verdict} />
                      <span>
                        <span className="font-semibold">
                          {getMasterCode(e.codeId)?.name ?? e.codeId}:
                        </span>{' '}
                        {e.rationale}
                      </span>
                    </li>
                  ))}
                </ul>
                {p.evaluation.outcome && (
                  <p className="mt-1">
                    <span className="font-semibold">
                      Measured ({p.evaluation.outcome.indicator}):
                    </span>{' '}
                    {p.evaluation.outcome.measuredOutcome}
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

// ── Step 1 · ex-ante audits ────────────────────────────────────────────────

function ExAnteView({ ids }: { ids: string[] }) {
  const inScope = new Set(ids);
  const entries = Object.values(EX_ANTE_ASSESSMENTS)
    .filter(e => inScope.has(e.policyId))
    .sort(
      (a, b) =>
        ['broken', 'drifting', 'holds'].indexOf(a.status) -
        ['broken', 'drifting', 'holds'].indexOf(b.status),
    );

  if (entries.length === 0) {
    return (
      <p className="text-[12px] text-tertiary italic px-1 py-4">
        No curated ex-ante audits in the current scope yet.
      </p>
    );
  }
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {entries.map(e => {
        const s = STATUS_STYLE[e.status];
        return (
          <div key={e.policyId} className="border border-grey-200 rounded-lg bg-white p-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center h-4.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: s.bg }}
              >
                {s.label}
              </span>
              <span className="text-[12px] font-bold text-tertiary-dark">
                {titleOf(e.policyId)}
              </span>
              <span className="ml-auto font-mono text-[9px] text-tertiary">
                design vintage {e.designYear}
              </span>
            </div>
            <div className="mt-2 grid sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
              <div className="bg-grey-50 rounded px-2.5 py-2">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-tertiary">
                  Ex ante assumption
                </p>
                <p className="mt-0.5 text-tertiary-dark">{e.assumption}</p>
              </div>
              <div className="bg-grey-50 rounded px-2.5 py-2">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-tertiary">
                  World development
                </p>
                <p className="mt-0.5 text-tertiary-dark">{e.development}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Step 2 · goal interactions ─────────────────────────────────────────────

function InteractionsView({ interactions }: { interactions: GoalInteraction[] }) {
  const [kindFilter, setKindFilter] = useState<InteractionKind | 'all'>('all');
  const shown =
    kindFilter === 'all' ? interactions : interactions.filter(i => i.kind === kindFilter);
  const counts = {
    all: interactions.length,
    conflict: interactions.filter(i => i.kind === 'conflict').length,
    tension: interactions.filter(i => i.kind === 'tension').length,
    synergy: interactions.filter(i => i.kind === 'synergy').length,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'conflict', 'tension', 'synergy'] as const).map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setKindFilter(k)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              kindFilter === k
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-tertiary border-grey-200 hover:text-tertiary-dark'
            }`}
          >
            {k === 'all' ? 'All' : KIND_STYLE[k].label + 's'}{' '}
            <span className="font-mono tabular-nums">({counts[k]})</span>
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="text-[12px] text-tertiary italic px-1 py-4">
          No goal interactions of this kind have both endpoints in the current scope.
        </p>
      )}
      <div className="space-y-2">
        {shown.map(i => {
          const k = KIND_STYLE[i.kind];
          return (
            <div
              key={i.id}
              className="rounded-lg border p-3"
              style={{ backgroundColor: k.bg, borderColor: `${k.border}55` }}
            >
              <div className="flex items-center gap-2 flex-wrap text-[11.5px]">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: k.border }}
                >
                  {k.label}
                </span>
                <span className="font-bold text-tertiary-dark">{titleOf(i.a)}</span>
                <span className="text-tertiary">×</span>
                <span className="font-bold text-tertiary-dark">{titleOf(i.b)}</span>
              </div>
              <div className="mt-1.5 grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[10.5px] text-tertiary">
                <p>
                  <span className="font-semibold text-tertiary-dark">{titleOf(i.a)}:</span>{' '}
                  {i.goalA}
                </p>
                <p>
                  <span className="font-semibold text-tertiary-dark">{titleOf(i.b)}:</span>{' '}
                  {i.goalB}
                </p>
              </div>
              <p className="mt-1.5 text-[11px] text-tertiary-dark leading-relaxed">
                {i.rationale}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 3 · goals vs means (derived) ──────────────────────────────────────

function MeansView({ profiles }: { profiles: PolicyCoherenceProfile[] }) {
  const rows = profiles
    .filter(p => p.means.score !== null)
    .sort((a, b) => (a.means.score ?? 0) - (b.means.score ?? 0));

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-tertiary bg-amber-50 border border-amber-200 rounded px-3 py-2 leading-relaxed">
        <span className="font-bold">Derived, not re-assessed:</span> this step rolls up the five
        means-side criteria of the objective–delivery checklist — instruments, coverage,
        enforcement, financing, timeline — into one means-coherence score per policy. Confirm or
        revert the underlying verdicts in the Policy Navigator; this view follows automatically.
      </p>
      <div className="overflow-x-auto border border-grey-200 rounded-lg bg-white">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-grey-50 border-b border-grey-200">
              <th className="text-left px-3 py-2 font-bold text-tertiary-dark min-w-[180px]">
                Policy
              </th>
              <th className="text-left px-3 py-2 font-bold text-tertiary-dark w-full">
                Means-coherence score
              </th>
              <th className="px-2 py-2 font-bold text-tertiary text-center whitespace-nowrap">
                Criteria
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const pct = Math.round((p.means.score ?? 0) * 100);
              const grade = GRADE_STYLE[p.means.grade];
              return (
                <tr key={p.policyId} className="border-b border-grey-100">
                  <td className="px-3 py-1.5 font-medium text-tertiary-dark">
                    {titleOf(p.policyId)}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 min-w-[120px] rounded-full bg-grey-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: grade.bg }}
                        />
                      </div>
                      <span className="font-mono tabular-nums font-bold text-tertiary-dark w-9 text-right">
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    {p.means.entries.map(e => (
                      <span key={e.codeId} className="inline-block mx-px" title={`${getMasterCode(e.codeId)?.name ?? e.codeId}: ${e.verdict}\n${e.rationale}`}>
                        <VerdictDot verdict={e.verdict} />
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Step 4 · evaluation: change + outcomes ─────────────────────────────────

function EvaluationView({ profiles }: { profiles: PolicyCoherenceProfile[] }) {
  const withOutcome = profiles.filter(p => p.evaluation.outcome);
  const machineryOnly = profiles.filter(
    p => !p.evaluation.outcome && p.evaluation.machinery.entries.length > 0,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {withOutcome.map(p => {
          const o = p.evaluation.outcome!;
          const grade = GRADE_STYLE[p.evaluation.grade];
          return (
            <div key={p.policyId} className="border border-grey-200 rounded-lg bg-white p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ backgroundColor: grade.bg, color: grade.fg }}
                >
                  {o.reading === 'delivering'
                    ? 'Delivering'
                    : o.reading === 'mixed'
                      ? 'Mixed'
                      : 'Off-track'}
                </span>
                <span className="text-[12px] font-bold text-tertiary-dark">
                  {titleOf(p.policyId)}
                </span>
                <span className="ml-auto font-mono text-[9px] text-tertiary">
                  {o.indicator} · as of {o.asOf}
                </span>
              </div>
              <div className="mt-2 grid sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
                <div className="bg-grey-50 rounded px-2.5 py-2">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-tertiary">
                    Policy change (output side)
                  </p>
                  <p className="mt-0.5 text-tertiary-dark">{o.policyChange}</p>
                </div>
                <div className="bg-grey-50 rounded px-2.5 py-2">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-tertiary">
                    Measured outcome (impact side)
                  </p>
                  <p className="mt-0.5 text-tertiary-dark">{o.measuredOutcome}</p>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-tertiary">
                <span className="font-semibold">Evaluation machinery (from checklist):</span>
                {p.evaluation.machinery.entries.map(e => (
                  <span
                    key={e.codeId}
                    className="inline-flex items-center gap-1"
                    title={e.rationale}
                  >
                    <VerdictDot verdict={e.verdict} />
                    {getMasterCode(e.codeId)?.name ?? e.codeId}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {machineryOnly.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-tertiary-dark mb-1.5">
            Machinery only — no curated outcome measurement yet ({machineryOnly.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {machineryOnly.map(p => {
              const grade = GRADE_STYLE[p.evaluation.machinery.grade];
              return (
                <span
                  key={p.policyId}
                  className="inline-flex items-center gap-1.5 border border-grey-200 rounded-full bg-white px-2.5 py-1 text-[10.5px] text-tertiary-dark"
                  title={p.evaluation.machinery.entries
                    .map(e => `${getMasterCode(e.codeId)?.name ?? e.codeId}: ${e.verdict}`)
                    .join('\n')}
                >
                  {titleOf(p.policyId)}
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: grade.bg }}
                  />
                </span>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-tertiary">
            Dot colour = can this act&apos;s change and outcomes be measured at all (MRV + review
            verdicts from the checklist)? Curated outcome audits above cover the major acts;
            the rest follow as indicator data is wired in.
          </p>
        </div>
      )}
    </div>
  );
}
