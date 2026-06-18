'use client';

/**
 * Member-state policy-monitoring & best-practice panel — National Level
 * Climate Policies beta module. An update to the Policy Gap report's
 * Member State implementation monitoring.
 *
 * Renders the transparent, rule-based read computed live in
 * `src/lib/policy-monitoring.ts`:
 *
 *   1. Coverage rationale — all 27 are monitored; best practices come only
 *      from member states with a monitorable policy base, stated up front so
 *      the selection is auditable rather than hand-picked.
 *   2. Best-practice cards — one exemplar per monitored dimension, each
 *      linking to the specific instrument that earns it.
 *   3. Per-country monitor — every member state's score on every dimension,
 *      with a monitoring-confidence flag and the evidence one click away.
 *   4. Method & caveats — what the scores do and do not mean, in the open.
 *
 * Nothing is hand-scored; everything traces to a catalogued instrument.
 * Written methodology: `analysis/POLICY-MONITORING.md`.
 */

import { useMemo, useState } from 'react';
import type { ClimatePolicy } from '@/lib/climate-laws-types';
import {
  monitorMemberStates,
  MONITORING_CONFIDENCE_LABELS,
  type MonitoringResult,
  type BestPractice,
  type CountryMonitoring,
  type DimensionScore,
  type Evidence,
  type MonitoringConfidence,
} from '@/lib/policy-monitoring';

/** Score → colour band (shared by bars and best-practice accents). */
function scoreColor(score: number): string {
  if (score >= 75) return '#1B5E20';
  if (score >= 50) return '#43A047';
  if (score >= 25) return '#F9A825';
  return '#EF6C00';
}

const CONFIDENCE_COLORS: Record<MonitoringConfidence, string> = {
  high: '#1B5E20',
  medium: '#F9A825',
  low: '#9E9E9E',
};

export default function PolicyMonitoringPanel({
  policies,
  onSelectCountry,
}: {
  policies: ClimatePolicy[];
  onSelectCountry: (code: string) => void;
}) {
  const result: MonitoringResult = useMemo(
    () => monitorMemberStates(policies),
    [policies],
  );
  const [showScope, setShowScope] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const [onlyMonitorable, setOnlyMonitorable] = useState(false);

  if (result.monitoring.length === 0) {
    return (
      <p className="text-sm text-tertiary p-4 bg-grey-50 rounded">
        The catalogue is empty, so there is nothing to monitor yet.
      </p>
    );
  }

  const rows = onlyMonitorable
    ? result.monitoring.filter((c) => c.monitorable)
    : result.monitoring;

  return (
    <div className="space-y-5">
      {/* Intro + scope rule */}
      <div className="text-[12px] text-tertiary max-w-3xl leading-snug space-y-2">
        <p>
          An update to the <strong>Policy Gap report</strong>&rsquo;s
          monitoring of <strong>Member State implementation</strong>: a
          transparent, repeatable read of where each member state&rsquo;s
          national climate-policy architecture stands. All{' '}
          <strong>{result.scope.monitoredCount} member states</strong> are
          scored on {result.dimensions.length} documented dimensions; the
          strongest example of each — drawn only from the{' '}
          {result.scope.monitorableCount} states with a monitorable policy base
          — is flagged as a <strong>best practice</strong>, with a direct link
          to the instrument that earns it.
        </p>
        <button
          onClick={() => setShowScope((v) => !v)}
          className="text-primary hover:underline text-[11px] font-medium"
        >
          {showScope ? '▾ Hide' : '▸ Show'} how the monitor is scoped &amp;
          where to read it with care
        </button>
        {showScope && <ScopePanel result={result} />}
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

      {/* Country monitor */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-tertiary-dark">
            Member-state monitor
          </h3>
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-tertiary flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMonitorable}
                onChange={(e) => setOnlyMonitorable(e.target.checked)}
                className="accent-primary"
              />
              Monitorable only
            </label>
            <span className="text-[11px] text-tertiary">
              Sorted by composite · click a country to filter
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          {/* Dimension header */}
          <div className="hidden md:grid grid-cols-[180px_repeat(5,1fr)_56px] gap-1 px-2 text-[10px] uppercase tracking-wide text-tertiary">
            <span>Member state</span>
            {result.dimensions.map((d) => (
              <span key={d.key} title={d.description} className="cursor-help">
                {d.label}
              </span>
            ))}
            <span className="text-right">Comp.</span>
          </div>
          {rows.map((c) => (
            <MonitorRow key={c.code} c={c} onSelectCountry={onSelectCountry} />
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
                dimension = the monitorable member state with the highest score;
                ties break by catalogue depth, then alphabetically.
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
                  analysis/POLICY-MONITORING.md
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

function ConfidenceBadge({ confidence }: { confidence: MonitoringConfidence }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-tertiary"
      title={`Monitoring confidence: ${MONITORING_CONFIDENCE_LABELS[confidence]}`}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: CONFIDENCE_COLORS[confidence] }}
      />
      {MONITORING_CONFIDENCE_LABELS[confidence]}
    </span>
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

function MonitorRow({
  c,
  onSelectCountry,
}: {
  c: CountryMonitoring;
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
          <ConfidenceBadge confidence={c.confidence} />
        </button>
        {/* Inline bars (md+) */}
        {c.dimensions.map((d) => (
          <div key={d.key} className="hidden md:block" title={`${d.label}: ${d.score} — ${d.detail}`}>
            <ScoreBar score={d.score} />
          </div>
        ))}
        <div className="hidden md:block text-right">
          <span className="text-sm font-bold" style={{ color: scoreColor(c.composite) }}>
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

function ScopePanel({ result }: { result: MonitoringResult }) {
  const { confidence } = result.scope;
  return (
    <div className="bg-grey-50 border border-grey-200 rounded p-3 space-y-2 text-[11px] text-tertiary">
      <p>
        <span className="font-semibold text-tertiary-dark">Scope rule.</span>{' '}
        {result.scope.rule} No country is hand-picked: monitoring is
        comprehensive, and the best-practice threshold is the same
        &ldquo;substantial catalogue&rdquo; cut-off the module&rsquo;s deep
        insights already use.
      </p>
      <div>
        <span className="font-semibold text-tertiary-dark">
          Monitoring confidence.
        </span>{' '}
        How well-documented each portfolio is — about documentation depth, not
        policy quality:
        <div className="flex flex-wrap gap-3 mt-1">
          {(['high', 'medium', 'low'] as MonitoringConfidence[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: CONFIDENCE_COLORS[k] }}
              />
              {MONITORING_CONFIDENCE_LABELS[k]}: {confidence[k]}
            </span>
          ))}
        </div>
      </div>
      <p>
        Sparse portfolios are <em>monitored but not eligible</em> for a
        best-practice highlight — a low count usually means
        &ldquo;less documented&rdquo;, not &ldquo;less governed&rdquo;, so it
        would be unfair to rank on it.
      </p>
    </div>
  );
}
