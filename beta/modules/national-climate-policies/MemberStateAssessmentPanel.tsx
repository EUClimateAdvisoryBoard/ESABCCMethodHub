'use client';

/**
 * Member-state policy assessment & best-practice identification panel —
 * National Level Climate Policies beta module.
 *
 * Renders the transparent, rule-based assessment computed live in
 * `src/lib/member-state-assessment.ts`:
 *
 *   1. Scope rationale — which member states are in focus and why (the ones
 *      with an independent national climate council, the ESABCC's peers),
 *      stated up front so the selection is auditable rather than hand-picked.
 *   2. Best-practice cards — one exemplar per assessment dimension, each
 *      linking to the specific instrument (or council) that earns it.
 *   3. Per-country scorecards — every focus country's score on every
 *      dimension, with the rule on hover and the evidence one click away.
 *   4. Method & caveats — what the scores do and do not mean, in the open.
 *
 * Nothing is hand-scored; everything traces to a catalogued instrument or a
 * catalogued council. Written methodology: `analysis/MEMBER-STATE-BEST-PRACTICES.md`.
 */

import { useMemo, useState } from 'react';
import type { ClimatePolicy } from '@/lib/climate-laws-types';
import {
  assessMemberStates,
  COUNTERPART_TIER_LABELS,
  type AssessmentResult,
  type BestPractice,
  type CountryAssessment,
  type DimensionScore,
  type Evidence,
} from '@/lib/member-state-assessment';

/** Score → colour band (shared by bars and best-practice accents). */
function scoreColor(score: number): string {
  if (score >= 75) return '#1B5E20';
  if (score >= 50) return '#43A047';
  if (score >= 25) return '#F9A825';
  return '#EF6C00';
}

export default function MemberStateAssessmentPanel({
  policies,
  onSelectCountry,
}: {
  policies: ClimatePolicy[];
  onSelectCountry: (code: string) => void;
}) {
  const result: AssessmentResult = useMemo(
    () => assessMemberStates(policies),
    [policies],
  );
  const [showScope, setShowScope] = useState(false);
  const [showMethod, setShowMethod] = useState(false);

  if (result.focus.length === 0) {
    return (
      <p className="text-sm text-tertiary p-4 bg-grey-50 rounded">
        No member state in the catalogue currently has an independent national
        climate council on record, so the focus set is empty.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Intro + scope rule */}
      <div className="text-[12px] text-tertiary max-w-3xl leading-snug space-y-2">
        <p>
          A focused look at <strong>Member State implementation</strong>:
          rather than scrutinise all 27, this assessment covers the{' '}
          <strong>{result.scope.counterpartCount} member states that have an
          independent national climate advisory council</strong> — the
          ESABCC&rsquo;s peer bodies ({result.scope.statutoryCount} of them
          anchored in statute). Each country is scored on{' '}
          {result.dimensions.length} documented dimensions of its national
          climate-policy architecture, and the strongest example of each is
          flagged as a <strong>best practice</strong>, with a direct link to
          the instrument that earns it.
        </p>
        <button
          onClick={() => setShowScope((v) => !v)}
          className="text-primary hover:underline text-[11px] font-medium"
        >
          {showScope ? '▾ Hide' : '▸ Show'} why these countries — and how the
          scope is drawn
        </button>
        {showScope && <ScopePanel result={result} onSelectCountry={onSelectCountry} />}
      </div>

      {/* Best practices */}
      <div>
        <h3 className="text-sm font-semibold text-tertiary-dark mb-2">
          Identified best practices
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {result.bestPractices.map((bp) => (
            <BestPracticeCard
              key={bp.dimensionKey}
              bp={bp}
              onSelectCountry={onSelectCountry}
            />
          ))}
        </div>
      </div>

      {/* Country scorecards */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-semibold text-tertiary-dark">
            Focus-set scorecards
          </h3>
          <span className="text-[11px] text-tertiary">
            Sorted by composite score · click a country to filter the catalogue
          </span>
        </div>
        <div className="space-y-1.5">
          {/* Dimension key/header */}
          <div className="hidden md:grid grid-cols-[180px_repeat(5,1fr)_56px] gap-1 px-2 text-[10px] uppercase tracking-wide text-tertiary">
            <span>Member state</span>
            {result.dimensions.map((d) => (
              <span key={d.key} title={d.description} className="cursor-help">
                {d.label}
              </span>
            ))}
            <span className="text-right">Comp.</span>
          </div>
          {result.focus.map((c) => (
            <ScorecardRow key={c.code} c={c} onSelectCountry={onSelectCountry} />
          ))}
        </div>
      </div>

      {/* Method & caveats */}
      <div className="border-t border-grey-100 pt-3">
        <button
          onClick={() => setShowMethod((v) => !v)}
          className="text-primary hover:underline text-[11px] font-medium"
        >
          {showMethod ? '▾ Hide' : '▸ Show'} method &amp; caveats — what these
          scores do and do not mean
        </button>
        {showMethod && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-tertiary">
            <div>
              <div className="font-semibold text-tertiary-dark mb-1">
                How each dimension is scored
              </div>
              <ul className="space-y-1.5">
                {result.dimensions.map((d) => (
                  <li key={d.key}>
                    <span className="font-medium text-tertiary-dark">{d.label}.</span>{' '}
                    {d.description}
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                The composite is the equal-weighted mean of these
                {' '}{result.dimensions.length} dimensions. Best practice per
                dimension = the focus country with the highest score; ties break
                by catalogue depth, then alphabetically.
              </p>
            </div>
            <div>
              <div className="font-semibold text-tertiary-dark mb-1">
                Caveats — read before citing
              </div>
              <ul className="space-y-1.5 list-disc pl-4">
                {result.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              <p className="mt-2">
                Full written methodology:{' '}
                <code className="bg-grey-100 px-1 rounded">
                  analysis/MEMBER-STATE-BEST-PRACTICES.md
                </code>
                .
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────────────

function EvidenceLink({ evidence }: { evidence?: Evidence }) {
  if (!evidence) return null;
  return (
    <a
      href={evidence.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
      title={evidence.title}
    >
      {evidence.label}
      {evidence.year ? ` (${evidence.year})` : ''} ↗
    </a>
  );
}

function BestPracticeCard({
  bp,
  onSelectCountry,
}: {
  bp: BestPractice;
  onSelectCountry: (code: string) => void;
}) {
  return (
    <div
      className="bg-white border border-grey-200 border-l-4 rounded p-2.5"
      style={{ borderLeftColor: scoreColor(bp.score) }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-tertiary">
          {bp.dimensionLabel}
        </span>
        <span
          className="text-[11px] font-bold shrink-0"
          style={{ color: scoreColor(bp.score) }}
        >
          {bp.score}
        </span>
      </div>
      <button
        onClick={() => onSelectCountry(bp.code)}
        className="text-sm font-semibold text-tertiary-dark hover:text-primary transition text-left"
        title={`Filter the catalogue to ${bp.country}`}
      >
        {bp.country}
      </button>
      <p className="text-[11px] text-tertiary leading-snug mt-1">{bp.rationale}</p>
      {bp.evidence && (
        <div className="text-[11px] mt-1.5">
          <EvidenceLink evidence={bp.evidence} />
        </div>
      )}
    </div>
  );
}

function ScorecardRow({
  c,
  onSelectCountry,
}: {
  c: CountryAssessment;
  onSelectCountry: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-grey-200 rounded">
      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[180px_repeat(5,1fr)_56px] gap-1 items-center px-2 py-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-left min-w-0"
          title="Show the rule and evidence behind each score"
        >
          <div className="text-sm font-semibold text-tertiary-dark truncate">
            {open ? '▾' : '▸'} {c.name}
          </div>
          <div className="text-[10px] text-tertiary truncate">
            {COUNTERPART_TIER_LABELS[c.counterpart.tier]}
          </div>
        </button>
        {/* Inline bars (md+) */}
        {c.dimensions.map((d) => (
          <div key={d.key} className="hidden md:block" title={`${d.label}: ${d.score} — ${d.detail}`}>
            <ScoreBar score={d.score} />
          </div>
        ))}
        <div className="hidden md:block text-right">
          <span
            className="text-sm font-bold"
            style={{ color: scoreColor(c.composite) }}
          >
            {Math.round(c.composite)}
          </span>
        </div>
        {/* Composite only (mobile) */}
        <div className="md:hidden text-right">
          <span className="text-sm font-bold" style={{ color: scoreColor(c.composite) }}>
            {Math.round(c.composite)}
          </span>
        </div>
      </div>

      {open && (
        <div className="border-t border-grey-100 px-3 py-2 space-y-1.5">
          {c.counterpart.bodyName && (
            <div className="text-[11px] text-tertiary">
              <span className="font-medium text-tertiary-dark">Council:</span>{' '}
              {c.counterpart.url ? (
                <a
                  href={c.counterpart.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {c.counterpart.bodyName} ↗
                </a>
              ) : (
                c.counterpart.bodyName
              )}
              {c.counterpart.established && ` · est. ${c.counterpart.established}`}
            </div>
          )}
          {c.dimensions.map((d) => (
            <DimensionDetail key={d.key} d={d} />
          ))}
          <div className="pt-1">
            <button
              onClick={() => onSelectCountry(c.code)}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Filter the catalogue to {c.name} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DimensionDetail({ d }: { d: DimensionScore }) {
  return (
    <div className="grid grid-cols-[140px_40px_1fr] gap-2 items-center text-[11px]">
      <span className="text-tertiary-dark font-medium">{d.label}</span>
      <span className="font-bold tabular-nums" style={{ color: scoreColor(d.score) }}>
        {d.score}
      </span>
      <span className="text-tertiary">
        {d.detail}
        {d.evidence && (
          <>
            {' · '}
            <EvidenceLink evidence={d.evidence} />
          </>
        )}
      </span>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-4 bg-grey-100 rounded-sm overflow-hidden" aria-label={`${score} / 100`}>
      <div
        className="h-full rounded-sm flex items-center justify-end pr-1"
        style={{ width: `${Math.max(score, 12)}%`, backgroundColor: scoreColor(score) }}
      >
        <span className="text-[9px] font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

function ScopePanel({
  result,
  onSelectCountry,
}: {
  result: AssessmentResult;
  onSelectCountry: (code: string) => void;
}) {
  return (
    <div className="bg-grey-50 border border-grey-200 rounded p-3 space-y-2 text-[11px] text-tertiary">
      <p>
        <span className="font-semibold text-tertiary-dark">Selection rule.</span>{' '}
        {result.scope.rule} This is derived programmatically from the EU Climate
        Councils dataset (the data behind the <em>EU Climate Councils</em>{' '}
        module), so the focus set is reproducible and updates automatically as
        that catalogue is curated — no country is hand-picked.
      </p>
      <div>
        <div className="font-semibold text-tertiary-dark mb-1">
          Counterpart classification (all 27 member states)
        </div>
        <div className="flex flex-wrap gap-1">
          {result.counterparts.map((c) => {
            const inFocus = c.isCounterpart;
            return (
              <button
                key={c.code}
                onClick={() => inFocus && onSelectCountry(c.code)}
                title={`${c.name}: ${COUNTERPART_TIER_LABELS[c.tier]}${
                  c.bodyName ? ` — ${c.bodyName}` : ''
                }`}
                className={`text-[10px] px-1.5 py-0.5 rounded-full border transition ${
                  inFocus
                    ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer'
                    : 'border-grey-200 text-tertiary/70 cursor-default'
                }`}
              >
                {c.code}
                <span className="ml-1 opacity-70">
                  {c.tier === 'statutory'
                    ? '★'
                    : c.tier === 'independent'
                    ? '●'
                    : c.tier === 'proxy'
                    ? '◐'
                    : c.tier === 'pending'
                    ? '○'
                    : '–'}
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-tertiary/70 mt-1.5">
          ★ statutory council · ● independent council · ◐ inter-ministerial /
          proxy · ○ legislated, not operational · – none. Filled chips are in
          the focus set.
        </div>
      </div>
      {result.scope.excluded.length > 0 && (
        <p>
          <span className="font-semibold text-tertiary-dark">Out of focus.</span>{' '}
          {result.scope.excluded.length} member states are excluded for now
          because they have no independent council on record (proxy bodies,
          not-yet-operational councils, or none). Their policies are still in
          the catalogue above — they are simply not part of this peer
          comparison. Exclusion is about institutions, not a verdict on policy.
        </p>
      )}
    </div>
  );
}
