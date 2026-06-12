/**
 * Policy coherence board — the beta four-step coherence model.
 * ------------------------------------------------------------
 * One board, five surfaces: a synthesis matrix (policies × the four steps,
 * worst-first) plus a dedicated view per step. Every grade follows from a
 * declared rule applied to citable evidence (see policy-coherence.ts):
 *
 *   ① Ex ante design vs world development — Assumption-Based Planning:
 *     falsifiable assumption + signpost + violation criterion → status.
 *   ② Coherence across policy goals — Nilsson et al. (2016) seven-point
 *     interaction scale with mechanism + legal basis per pair.
 *   ③ Goals vs means — derived from the objective–delivery checklist
 *     (reused, never re-assessed).
 *   ④ Policy evaluation — distance-to-target pace ratio computed in code
 *     (EEA Trends & Projections method) + derived MRV/review machinery.
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
  EVIDENCE_TIER_LABEL,
  EX_ANTE_ASSESSMENTS,
  INTERACTION_SCALE,
  PACE_THRESHOLDS,
  type AssumptionStatus,
  type CoherenceGrade,
  type CoherenceStepId,
  type EvidenceTier,
  type GoalInteraction,
  type PolicyCoherenceProfile,
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
          label="Assumptions violated"
          value={`${overview.violatedAssumptions}`}
          sub="step ① criterion met"
          tone={overview.violatedAssumptions > 0 ? '#DC2626' : '#16A34A'}
        />
        <ScoreCard
          label="Counteracting pairs"
          value={`${overview.counteracting}`}
          sub={`score ≤ −2 · +${overview.constraining} constraining · ${overview.positive} positive`}
          tone={overview.counteracting > 0 ? '#DC2626' : '#16A34A'}
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
          label="Outcomes off track"
          value={`${overview.outcomesOffTrack}`}
          sub="step ④ pace ratio < 0.5"
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

      {tab === 'overview' && <ProvenanceNote />}
      {tab === 'overview' && <SynthesisView profiles={overview.profiles} />}
      {tab === 'ex-ante' && <ExAnteView ids={activeIds} />}
      {tab === 'horizontal' && <InteractionsView interactions={overview.interactions} />}
      {tab === 'goals-means' && <MeansView profiles={overview.profiles} />}
      {tab === 'evaluation' && <EvaluationView profiles={overview.profiles} />}

      {tab !== 'overview' && (
        <p className="text-[10.5px] text-tertiary leading-relaxed max-w-3xl">
          {stepBlurb(tab)}
        </p>
      )}
    </div>
  );
}

function stepBlurb(id: CoherenceStepId): string {
  const s = COHERENCE_STEPS.find(x => x.id === id)!;
  return `Step ${s.ordinal} — ${s.question} Framework: ${s.framework}. ${s.method}`;
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
                  title={`Step ${s.ordinal}: ${s.name}\n${s.framework}\n${s.question}`}
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
        major acts; steps ③ and ④ derive from the objective–delivery checklist and cover every
        assessed policy.
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
                <p className="font-bold text-tertiary-dark text-[10px]">
                  ① Ex ante vs world{' '}
                  {p.exAnte && <TierChip tier={p.exAnte.tier} />}
                </p>
                {p.exAnte ? (
                  <>
                    <p className="mt-0.5">
                      <span className="font-semibold">Assumption ({p.exAnte.designYear}):</span>{' '}
                      {p.exAnte.assumption}
                    </p>
                    <p className="mt-0.5">
                      <span className="font-semibold">Criterion:</span>{' '}
                      {p.exAnte.violationCriterion}
                    </p>
                    <p className="mt-0.5">
                      <span className="font-semibold">Observed:</span> {p.exAnte.observation}{' '}
                      <span className="italic">({p.exAnte.source})</span>
                    </p>
                    {evidenceForExAnte(p.policyId).map(ev => (
                      <div key={ev.id} className="mt-1">
                        <ProvisionQuote ev={ev} />
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="italic">No assumption audit yet.</p>
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
                        <ScoreBadge score={i.score} /> with{' '}
                        <span className="font-semibold">
                          {titleOf(i.a === p.policyId ? i.b : i.a)}
                        </span>{' '}
                        ({i.mechanism}): {i.rationale}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic">No scored goal interactions touch this act yet.</p>
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
                {p.evaluation.measurement && (
                  <p className="mt-1">
                    <span className="font-semibold">
                      Measured ({p.evaluation.measurement.indicator}):
                    </span>{' '}
                    {paceSentence(p)}
                  </p>
                )}
                {evidenceForOutcome(p.policyId).map(ev => (
                  <div key={ev.id} className="mt-1">
                    <ProvisionQuote ev={ev} />
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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
      <span className="font-bold">Anchored in the acts’ own text:</span> the curated steps are
      pinned to {stats.total} provision anchors — {stats.verbatim} verbatim quotes from the
      policy-text library and {stats.glossed} flagged paraphrases where the library lacks the
      (consolidated) act. Each step view shows the passages inline, and the same passages are
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

// ── Step 1 · assumption audits (Assumption-Based Planning) ─────────────────

function ExAnteView({ ids }: { ids: string[] }) {
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

// ── Step 2 · goal interactions (Nilsson scale) ─────────────────────────────

type ScoreFilter = 'all' | 'counteracting' | 'constraining' | 'positive';

function InteractionsView({ interactions }: { interactions: GoalInteraction[] }) {
  const [filter, setFilter] = useState<ScoreFilter>('all');
  const matches = (i: GoalInteraction) =>
    filter === 'all'
      ? true
      : filter === 'counteracting'
        ? i.score <= -2
        : filter === 'constraining'
          ? i.score === -1
          : i.score >= 1;
  const shown = interactions.filter(matches).sort((a, b) => a.score - b.score);
  const counts = {
    all: interactions.length,
    counteracting: interactions.filter(i => i.score <= -2).length,
    constraining: interactions.filter(i => i.score === -1).length,
    positive: interactions.filter(i => i.score >= 1).length,
  };
  const FILTER_LABEL: Record<ScoreFilter, string> = {
    all: 'All',
    counteracting: '≤ −2 Counteracting',
    constraining: '−1 Constraining',
    positive: '≥ +1 Positive',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'counteracting', 'constraining', 'positive'] as const).map(k => (
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
            {FILTER_LABEL[k]} <span className="font-mono tabular-nums">({counts[k]})</span>
          </button>
        ))}
        <span className="ml-auto text-[10px] text-tertiary">
          Scale: Nilsson et al. (2016) — −3 cancelling … +3 indivisible
        </span>
      </div>
      {shown.length === 0 && (
        <p className="text-[12px] text-tertiary italic px-1 py-4">
          No goal interactions in this band have both endpoints in the current scope.
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
                <span className="font-semibold text-tertiary-dark">{titleOf(i.a)}:</span>{' '}
                {i.goalA}
              </p>
              <p>
                <span className="font-semibold text-tertiary-dark">{titleOf(i.b)}:</span>{' '}
                {i.goalB}
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

// ── Step 3 · goals vs means (derived) ──────────────────────────────────────

function MeansView({ profiles }: { profiles: PolicyCoherenceProfile[] }) {
  const rows = profiles
    .filter(p => p.means.score !== null)
    .sort((a, b) => (a.means.score ?? 0) - (b.means.score ?? 0));

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-tertiary bg-amber-50 border border-amber-200 rounded px-3 py-2 leading-relaxed">
        <span className="font-bold">Derived, not re-assessed:</span> this step rolls the five
        means-side criteria of the objective–delivery checklist — instruments, coverage,
        enforcement, financing, timeline — into one means-coherence score per policy (met = 1,
        partial = ½, not-met = 0; thresholds: ≥75% coherent, ≥45% partial). Confirm or revert
        the underlying verdicts in the Policy Navigator; this view follows automatically.
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
                      <span
                        key={e.codeId}
                        className="inline-block mx-px"
                        title={`${getMasterCode(e.codeId)?.name ?? e.codeId}: ${e.verdict}\n${e.rationale}`}
                      >
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

// ── Step 4 · evaluation: pace ratio + machinery ────────────────────────────

function EvaluationView({ profiles }: { profiles: PolicyCoherenceProfile[] }) {
  const measured = profiles
    .filter(p => p.evaluation.measurement)
    .sort(
      (a, b) =>
        (a.evaluation.measurement!.pace.ratio ?? Infinity) -
        (b.evaluation.measurement!.pace.ratio ?? Infinity),
    );
  const machineryOnly = profiles.filter(
    p => !p.evaluation.measurement && p.evaluation.machinery.entries.length > 0,
  );

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-tertiary bg-amber-50 border border-amber-200 rounded px-3 py-2 leading-relaxed">
        <span className="font-bold">Computed, not judged:</span> the reading is the pace ratio —
        observed recent pace (≈ last five years) ÷ pace the target requires from the latest data
        point — with declared thresholds: ≥ {PACE_THRESHOLDS.onTrack.toFixed(1)} on track, ≥{' '}
        {PACE_THRESHOLDS.lagging.toFixed(1)} lagging, below (or wrong direction) off track. This
        mirrors the distance-to-target method of the EEA Trends &amp; Projections reports.
        Measured readings override machinery verdicts.
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
                Baseline
              </th>
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
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums whitespace-nowrap text-tertiary">
                    {m.baseline.value}
                    <span className="text-[9px]"> ({m.baseline.year})</span>
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

      {/* Output side: policy change notes for the measured acts */}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {measured.map(p => {
          const m = p.evaluation.measurement!;
          return (
            <div
              key={p.policyId}
              className="border border-grey-100 rounded bg-white px-2.5 py-2 text-[10.5px] text-tertiary leading-relaxed"
            >
              <span className="font-bold text-tertiary-dark">{titleOf(p.policyId)} — policy change (output side): </span>
              {m.policyChange}
              {evidenceForOutcome(p.policyId).length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {evidenceForOutcome(p.policyId).map(ev => (
                    <ProvisionQuote key={ev.id} ev={ev} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {machineryOnly.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-tertiary-dark mb-1.5">
            Machinery only — no target-bearing measurement wired yet ({machineryOnly.length})
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
            verdicts from the checklist)? Acts without a quantified in-act target are not forced
            into the pace-ratio table — that absence is itself a finding.
          </p>
        </div>
      )}
    </div>
  );
}
