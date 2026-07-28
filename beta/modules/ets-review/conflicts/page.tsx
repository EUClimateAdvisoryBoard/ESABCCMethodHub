'use client';

/**
 * Advice conflicts — the package vs the Board's advice (beta module M·37,
 * third submodule under ETS Review).
 *
 * Compares the Commission's 17 July 2026 package — the ETS review (COM(2026)
 * 616 + impact assessment SWD(2026) 616, 5 parts) and the Electrification
 * Action Plan (COM(2026) 595) — against the ESABCC's published advice across
 * all of its reports, and ranks every place they do not align by a
 * transparent four-axis severity rubric. Genuine alignments are recorded too,
 * so the read stays even-handed (see work-packages/WP0-overview.md).
 *
 * Pure client component: every number, quote and score on this page is read
 * from ./conflicts, ./advice-core, ./advice-wider, ./package-positions and
 * ./types — nothing here is hard-coded. The rubric section in particular
 * renders directly from the types.ts exports (SEVERITY_AXES, SEVERITY_
 * WEIGHTS, CONFLICT_KIND_META, and the tier thresholds derived by probing
 * severityTier() itself) so the UI can never drift from the data model.
 *
 * Everything on this page is AI-assembled (Sonnet agents, WP1–WP3) and
 * pending Secretariat verification — flagged in the hero caveat box below.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { RECOMMENDATION_REPORTS } from '@/data/esabcc-recommendations';
import { alignments, CONFLICTS, rankedConflicts } from './conflicts';
import { ADVICE_CORE } from './advice-core';
import { ADVICE_WIDER } from './advice-wider';
import { PACKAGE_POSITIONS } from './package-positions';
import {
  ADVICE_REPORT_FILES,
  CONFLICT_KIND_META,
  PACKAGE_DOCS,
  SEVERITY_AXES,
  SEVERITY_TIER_META,
  SEVERITY_WEIGHTS,
  severityScore,
  severityTier,
  THEME_LABELS,
  type AdviceReportId,
  type AdvicePosition,
  type ConflictFinding,
  type ConflictKind,
  type ConflictTheme,
  type PackageDocId,
  type PackagePosition,
  type SeverityScores,
  type SeverityTier,
} from './types';

/* --------------------------------------------------------------- palette */
// Kept in sync with the hub and the two sibling submodules — a colour means
// the same thing everywhere in module M·37.
const C_TEAL = '#0D9488';
const C_NAVY = '#2E3E4C';
const C_RED = '#B83230';
const C_BLUE = '#2F6FB0';
const C_PURPLE = '#8A4B9E';

/* ---------------------------------------------------------------- lookups */
const ALL_ADVICE: AdvicePosition[] = [...ADVICE_CORE, ...ADVICE_WIDER];

/* -------------------------------------------------------------- fragments */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-grey-200 bg-white p-4 ${className}`}>{children}</div>;
}

function KindChip({ kind }: { kind: ConflictKind }) {
  const m = CONFLICT_KIND_META[kind];
  return (
    <span
      title={m.definition}
      className="inline-flex cursor-help items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: m.color, borderColor: `${m.color}66`, background: `${m.color}14` }}
    >
      {m.name}
    </span>
  );
}

function TierChip({ tier }: { tier: SeverityTier }) {
  const m = SEVERITY_TIER_META[tier];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
      style={{ color: m.color, background: `${m.color}14`, border: `1px solid ${m.color}55` }}
    >
      {m.label}
    </span>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="mt-1.5 h-1.5 w-full max-w-[220px] rounded-full bg-grey-100">
      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(score, 10) * 10}%`, background: color }} />
    </div>
  );
}

function AxisMiniBar({ axis, value, rationale, color }: { axis: keyof SeverityScores; value: number; rationale: string; color: string }) {
  const a = SEVERITY_AXES[axis];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-tertiary-dark">{a.label}</span>
        <span className="font-mono text-[10.5px] font-bold tabular-nums" style={{ color }}>{value} / 3</span>
      </div>
      <div className="mt-0.5 flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < value ? color : '#E6E7E8' }} />
        ))}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-tertiary">{rationale}</p>
    </div>
  );
}

function DocChip({ docId }: { docId: PackageDocId }) {
  const d = PACKAGE_DOCS[docId];
  return (
    <a
      href={d.url}
      target="_blank"
      rel="noopener noreferrer"
      title={d.label}
      className="inline-flex items-center gap-1 rounded border border-grey-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-tertiary hover:border-primary hover:text-primary"
    >
      {d.short}<span aria-hidden>↗</span>
    </a>
  );
}

function ReportChip({ reportId }: { reportId: AdviceReportId }) {
  const r = RECOMMENDATION_REPORTS[reportId];
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      title={r.label}
      className="inline-flex items-center gap-1 rounded border border-grey-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-tertiary hover:border-primary hover:text-primary"
    >
      {r.label}<span aria-hidden>↗</span>
    </a>
  );
}

function RecTag({ id }: { id: string }) {
  return <span className="rounded bg-grey-100 px-1 py-px font-mono text-[9px] text-tertiary">{id}</span>;
}

function PackageEvidence({ p }: { p: PackagePosition }) {
  return (
    <div className="rounded-md border border-grey-200 bg-grey-50 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <DocChip docId={p.docId} />
        <span className="font-mono text-[10px] text-tertiary">{p.sourceRef}</span>
      </div>
      <p className="mt-1 text-[11.5px] font-semibold leading-snug text-tertiary-dark">{p.title}</p>
      <p className="mt-1 border-l-2 border-grey-200 pl-2 text-[11px] italic leading-snug text-tertiary">&ldquo;{p.quote}&rdquo;</p>
    </div>
  );
}

function AdviceEvidence({ a }: { a: AdvicePosition }) {
  return (
    <div className="rounded-md border border-grey-200 bg-grey-50 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ReportChip reportId={a.reportId} />
        <span className="font-mono text-[10px] text-tertiary">p.{a.pages.join(', ')}</span>
      </div>
      <p className="mt-1 text-[11.5px] font-semibold leading-snug text-tertiary-dark">{a.title}</p>
      <p className="mt-1 border-l-2 border-grey-200 pl-2 text-[11px] italic leading-snug text-tertiary">&ldquo;{a.quote}&rdquo;</p>
      {a.recIds.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {a.recIds.map((id) => <RecTag key={id} id={id} />)}
        </div>
      )}
    </div>
  );
}

function ReasoningChain({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-1 space-y-1">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-tertiary">
          <span className="mt-0.5 shrink-0 font-mono text-[10px] tabular-nums text-tertiary-light">{i + 1}.</span>
          <span className={i === steps.length - 1 ? 'font-semibold text-tertiary-dark' : undefined}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------- FindingCard */
function FindingCard({
  f, rank, adviceById, packageById,
}: {
  f: ConflictFinding;
  rank?: number;
  adviceById: Map<string, AdvicePosition>;
  packageById: Map<string, PackagePosition>;
}) {
  const score = severityScore(f.scores);
  const tier = severityTier(score);
  const tierColor = SEVERITY_TIER_META[tier].color;
  const kindMeta = CONFLICT_KIND_META[f.kind];
  const axes = Object.keys(SEVERITY_AXES) as (keyof SeverityScores)[];
  const packagePositions = f.packageIds.map((id) => packageById.get(id)).filter((p): p is PackagePosition => !!p);
  const advicePositions = f.adviceIds.map((id) => adviceById.get(id)).filter((a): a is AdvicePosition => !!a);

  return (
    <div className="flex flex-col rounded-xl border border-l-[3px] border-grey-200 bg-white p-4" style={{ borderLeftColor: kindMeta.color }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {rank !== undefined && <span className="font-mono text-[12px] font-bold text-tertiary">#{rank}</span>}
          <KindChip kind={f.kind} />
          <span className="text-[11px] font-semibold text-tertiary">{THEME_LABELS[f.theme]}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color: tierColor }}>
              {score.toFixed(1)}<span className="text-[10px] font-normal text-tertiary"> / 10</span>
            </span>
            <TierChip tier={tier} />
          </div>
          <ScoreBar score={score} color={tierColor} />
        </div>
      </div>

      <p className="mt-2.5 text-[13.5px] font-bold leading-snug text-tertiary-dark">{f.title}</p>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-surface-blue px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">The Board asks</p>
          <p className="mt-0.5 text-[12px] leading-snug text-tertiary-dark">{f.esabccAsk}</p>
        </div>
        <div className="rounded-md px-2.5 py-2" style={{ background: `${kindMeta.color}0F` }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">The package does</p>
          <p className="mt-0.5 text-[12px] leading-snug text-tertiary-dark">{f.packageDoes}</p>
        </div>
      </div>

      <details className="mt-2.5">
        <summary className="cursor-pointer text-[11px] font-semibold text-tertiary hover:text-primary">
          Evidence — {packagePositions.length} package position{packagePositions.length === 1 ? '' : 's'} · {advicePositions.length} advice position{advicePositions.length === 1 ? '' : 's'}
        </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">The package (side B)</p>
            <div className="space-y-1.5">
              {packagePositions.map((p) => <PackageEvidence key={p.id} p={p} />)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">ESABCC advice (side A)</p>
            <div className="space-y-1.5">
              {advicePositions.map((a) => <AdviceEvidence key={a.id} a={a} />)}
            </div>
          </div>
        </div>
      </details>

      <div className="mt-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">Reasoning</p>
        <ReasoningChain steps={f.reasoning} />
      </div>

      <details className="mt-2.5">
        <summary className="cursor-pointer text-[11px] font-semibold text-tertiary hover:text-primary">Score breakdown ({score.toFixed(1)} / 10)</summary>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
          {axes.map((axis) => (
            <AxisMiniBar key={axis} axis={axis} value={f.scores[axis]} rationale={f.scoreRationale[axis]} color={tierColor} />
          ))}
        </div>
      </details>
    </div>
  );
}

/* --------------------------------------------------------------- StatTile */
interface Stat { label: string; value: string; sub: string; color: string; href: string; }
function StatTile({ s }: { s: Stat }) {
  return (
    <a href={s.href} className="group rounded-lg border border-grey-200 bg-white p-3 transition hover:border-primary hover:shadow-sm">
      <p className="flex items-center gap-1.5 text-[10.5px] leading-tight text-tertiary">
        <span className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: s.color }} />{s.label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{s.sub}</p>
    </a>
  );
}

/* ======================================================================== page */
export default function AdviceConflictsPage() {
  const ranked = useMemo(() => rankedConflicts(), []);
  const aligned = useMemo(() => alignments(), []);

  const adviceById = useMemo(() => new Map(ALL_ADVICE.map((a) => [a.id, a])), []);
  const packageById = useMemo(() => new Map(PACKAGE_POSITIONS.map((p) => [p.id, p])), []);
  const rankById = useMemo(() => new Map(ranked.map((f, i) => [f.id, i + 1])), [ranked]);

  // tiers, derived once per finding (not stored on the data — computed from the rubric)
  const withTier = useMemo(
    () => ranked.map((f) => ({ f, score: severityScore(f.scores), tier: severityTier(severityScore(f.scores)) })),
    [ranked],
  );

  const tierCounts = useMemo(() => {
    const c: Record<SeverityTier, number> = { critical: 0, major: 0, moderate: 0, minor: 0 };
    for (const { tier } of withTier) c[tier] += 1;
    return c;
  }, [withTier]);

  // reports the whole record (conflicts + alignments) actually draws on, via adviceIds -> reportId
  const citedReportIds = useMemo(() => {
    const s = new Set<AdviceReportId>();
    for (const f of CONFLICTS) {
      for (const id of f.adviceIds) {
        const a = adviceById.get(id);
        if (a) s.add(a.reportId);
      }
    }
    return [...s].sort((x, y) => RECOMMENDATION_REPORTS[x].label.localeCompare(RECOMMENDATION_REPORTS[y].label));
  }, [adviceById]);

  /* -------------------------------------------------------------- filters */
  const [kindFilter, setKindFilter] = useState<ConflictKind | null>(null);
  const [tierFilter, setTierFilter] = useState<SeverityTier | null>(null);
  const [themeFilter, setThemeFilter] = useState<ConflictTheme | ''>('');
  const [reportFilter, setReportFilter] = useState<AdviceReportId | ''>('');

  const kindsPresent = useMemo(() => [...new Set(ranked.map((f) => f.kind))], [ranked]);
  const themesPresent = useMemo(
    () => [...new Set(ranked.map((f) => f.theme))].sort((a, b) => THEME_LABELS[a].localeCompare(THEME_LABELS[b])),
    [ranked],
  );
  const reportsPresent = useMemo(() => {
    const s = new Set<AdviceReportId>();
    for (const f of ranked) for (const id of f.adviceIds) { const a = adviceById.get(id); if (a) s.add(a.reportId); }
    return [...s].sort((x, y) => RECOMMENDATION_REPORTS[x].label.localeCompare(RECOMMENDATION_REPORTS[y].label));
  }, [ranked, adviceById]);

  const filteredConflicts = useMemo(() => withTier.filter(({ f, tier }) => {
    if (kindFilter && f.kind !== kindFilter) return false;
    if (tierFilter && tier !== tierFilter) return false;
    if (themeFilter && f.theme !== themeFilter) return false;
    if (reportFilter && !f.adviceIds.some((id) => adviceById.get(id)?.reportId === reportFilter)) return false;
    return true;
  }), [withTier, kindFilter, tierFilter, themeFilter, reportFilter, adviceById]);

  const anyFilterActive = kindFilter !== null || tierFilter !== null || themeFilter !== '' || reportFilter !== '';
  function clearFilters() { setKindFilter(null); setTierFilter(null); setThemeFilter(''); setReportFilter(''); }

  /* -------------------------------------------------------- rubric render */
  const axes = Object.keys(SEVERITY_AXES) as (keyof SeverityScores)[];
  const formulaTerms = axes.map((a) => `${SEVERITY_AXES[a].label} × ${SEVERITY_WEIGHTS[a]}`).join(' + ');

  // derive the tier score thresholds by probing severityTier() itself, rather than
  // hard-coding a second copy of the boundaries defined in types.ts
  const tierThresholds = useMemo(() => {
    const result = {} as Record<SeverityTier, number>;
    for (let i = 0; i <= 100; i++) {
      const score = i / 10;
      const t = severityTier(score);
      if (!(t in result)) result[t] = score;
    }
    return result;
  }, []);
  const tierOrder: SeverityTier[] = ['critical', 'major', 'moderate', 'minor'];
  const kindOrderForMethod = (Object.keys(CONFLICT_KIND_META) as ConflictKind[]);

  const stats: Stat[] = [
    { label: 'Conflicts found', value: String(ranked.length), sub: 'contradiction · tension · ambition gap', color: C_RED, href: '#conflicts' },
    { label: 'Critical', value: String(tierCounts.critical), sub: `score ≥ ${tierThresholds.critical.toFixed(1)} / 10`, color: SEVERITY_TIER_META.critical.color, href: '#conflicts' },
    { label: 'Major', value: String(tierCounts.major), sub: `score ≥ ${tierThresholds.major.toFixed(1)} / 10`, color: SEVERITY_TIER_META.major.color, href: '#conflicts' },
    { label: 'Moderate', value: String(tierCounts.moderate), sub: `score ≥ ${tierThresholds.moderate.toFixed(1)} / 10`, color: SEVERITY_TIER_META.moderate.color, href: '#conflicts' },
    { label: 'Minor', value: String(tierCounts.minor), sub: `score < ${tierThresholds.moderate.toFixed(1)} / 10`, color: SEVERITY_TIER_META.minor.color, href: '#conflicts' },
    { label: 'Alignments', value: String(aligned.length), sub: 'delivers on the advice', color: C_TEAL, href: '#alignments' },
    { label: 'Reports drawn on', value: String(citedReportIds.length), sub: `of ${Object.keys(RECOMMENDATION_REPORTS).length} ESABCC reports`, color: C_BLUE, href: '#sources' },
  ];

  const nav = [
    { id: 'method', label: 'How the ranking works' },
    { id: 'conflicts', label: 'Ranked conflicts' },
    { id: 'alignments', label: 'Alignments' },
    { id: 'sources', label: 'Sources' },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* ============================================================ HERO */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · M · 37 · <a href="/beta/ets-review" className="underline hover:text-primary">ETS Review</a> · advice-conflicts submodule
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">Advice conflicts — the package vs the Board&apos;s advice</h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            Every place the Commission&apos;s <strong>17 July 2026 package</strong> — the ETS review (COM(2026) 616 and its impact
            assessment SWD(2026) 616) and the <strong>Electrification Action Plan</strong> (COM(2026) 595) — does not align with what
            the <strong>ESABCC has actually advised</strong>, drawn from across the Board&apos;s published reports and ranked by the
            severity of the conflict itself. Genuine alignments are recorded alongside the conflicts, so the assessment stays
            even-handed.
          </p>
          <div className="mt-3 max-w-3xl rounded-md border border-accent-orange/40 bg-surface-orange px-3.5 py-2.5 text-[12px] leading-relaxed text-tertiary-dark">
            <strong>AI-assembled — pending Secretariat verification.</strong> Every finding below was produced by Sonnet agents
            reading the Board&apos;s report texts against the package&apos;s own communication and impact assessment (see{' '}
            <span className="font-mono text-[11px]">work-packages/</span>), not by a human analyst. Classifications, scores and
            reasoning chains are a working draft — verify each quote and score against the source before reuse in Board outputs.
          </div>
          <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {stats.map((s) => <StatTile key={s.label} s={s} />)}
          </section>
        </section>

        {/* nav */}
        <nav className="sticky top-0 z-10 -mx-4 mb-6 border-y border-grey-200 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            {nav.map((n) => <a key={n.id} href={`#${n.id}`} className="font-semibold text-tertiary hover:text-primary">{n.label}</a>)}
            <a href="/beta/ets-review/reform" className="font-semibold text-tertiary hover:text-primary">↔ ETS reform</a>
            <a href="/beta/ets-review/electrification" className="font-semibold text-tertiary hover:text-primary">↔ Electrification model</a>
            <span className="ml-auto text-tertiary">{ranked.length} conflicts · {aligned.length} alignments</span>
          </div>
        </nav>

        {/* ============================================================ METHOD */}
        <section id="method" className="mb-10 scroll-mt-16">
          <h2 className="text-lg font-bold text-tertiary-dark">How the ranking works</h2>
          <p className="mb-3 max-w-3xl text-[13px] text-tertiary">
            Every finding below is classified into one of four kinds, then scored on a four-axis rubric. The axes, weights,
            formula and tier thresholds shown here are read directly from <span className="font-mono text-[11.5px]">types.ts</span>{' '}
            — this section cannot drift from the data model that actually ranks the register below.
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            {axes.map((axis) => {
              const a = SEVERITY_AXES[axis];
              return (
                <Card key={axis}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-bold text-tertiary-dark">{a.label}</p>
                    <span className="font-mono text-[11px] font-semibold text-tertiary">weight {SEVERITY_WEIGHTS[axis]}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] italic text-tertiary">{a.question}</p>
                  <ul className="mt-2 space-y-1">
                    {a.anchors.map((anchor) => (
                      <li key={anchor} className="text-[11.5px] leading-snug text-tertiary-dark">{anchor}</li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>

          <Card className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Formula</p>
            <p className="mt-1 break-words font-mono text-[11.5px] leading-relaxed text-tertiary-dark">
              score = (({formulaTerms}) / 3), rounded to one decimal — a 0–10 scale.
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-tertiary">Severity tiers</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              {tierOrder.map((t, i) => (
                <span key={t} className="inline-flex items-center gap-1.5 text-[11.5px] text-tertiary-dark">
                  <TierChip tier={t} />
                  <span className="font-mono text-[11px] tabular-nums text-tertiary">
                    {i === tierOrder.length - 1 ? `< ${tierThresholds[tierOrder[i - 1]].toFixed(1)}` : `≥ ${tierThresholds[t].toFixed(1)}`}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-tertiary">Kinds</p>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
              {kindOrderForMethod.map((k) => (
                <div key={k} className="flex items-start gap-2">
                  <KindChip kind={k} />
                  <p className="text-[11.5px] leading-snug text-tertiary">{CONFLICT_KIND_META[k].definition}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ============================================================ CONFLICTS */}
        <section id="conflicts" className="mb-10 scroll-mt-16">
          <h2 className="text-lg font-bold text-tertiary-dark">The ranked conflict register</h2>
          <p className="mb-3 max-w-3xl text-[13px] text-tertiary">
            Every contradiction, tension and ambition gap the analysis found, ranked by severity score, highest first.
            Expand a card for its evidence on both sides and its full score breakdown.
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-tertiary">Kind</span>
            <button
              type="button" onClick={() => setKindFilter(null)}
              className={`rounded px-2 py-0.5 text-[11px] font-semibold ${kindFilter === null ? 'bg-tertiary-dark text-white' : 'text-tertiary hover:text-primary'}`}
            >All</button>
            {kindsPresent.map((k) => (
              <button
                key={k} type="button" onClick={() => setKindFilter(kindFilter === k ? null : k)}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                style={{
                  borderColor: CONFLICT_KIND_META[k].color, color: CONFLICT_KIND_META[k].color,
                  background: kindFilter === k ? `${CONFLICT_KIND_META[k].color}14` : 'transparent',
                  opacity: kindFilter === null || kindFilter === k ? 1 : 0.4,
                }}
              >{CONFLICT_KIND_META[k].name}</button>
            ))}
            <span className="mx-1 text-grey-200" aria-hidden>|</span>
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-tertiary">Tier</span>
            {tierOrder.filter((t) => tierCounts[t] > 0).map((t) => (
              <button
                key={t} type="button" onClick={() => setTierFilter(tierFilter === t ? null : t)}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                style={{
                  borderColor: SEVERITY_TIER_META[t].color, color: SEVERITY_TIER_META[t].color,
                  background: tierFilter === t ? `${SEVERITY_TIER_META[t].color}14` : 'transparent',
                  opacity: tierFilter === null || tierFilter === t ? 1 : 0.4,
                }}
              >{SEVERITY_TIER_META[t].label}</button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value as ConflictTheme | '')}
              aria-label="Filter by theme"
              className="rounded-md border border-grey-200 px-2 py-1 text-[11.5px] text-tertiary-dark focus:border-primary focus:outline-none"
            >
              <option value="">All themes</option>
              {themesPresent.map((t) => <option key={t} value={t}>{THEME_LABELS[t]}</option>)}
            </select>
            <select
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value as AdviceReportId | '')}
              aria-label="Filter by ESABCC report"
              className="rounded-md border border-grey-200 px-2 py-1 text-[11.5px] text-tertiary-dark focus:border-primary focus:outline-none"
            >
              <option value="">All reports</option>
              {reportsPresent.map((r) => <option key={r} value={r}>{RECOMMENDATION_REPORTS[r].label}</option>)}
            </select>
            {anyFilterActive && (
              <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-accent-orange hover:underline">↺ clear filters</button>
            )}
            <span className="ml-auto text-[11px] text-tertiary">{filteredConflicts.length} of {ranked.length}</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {filteredConflicts.map(({ f }) => (
              <FindingCard key={f.id} f={f} rank={rankById.get(f.id)} adviceById={adviceById} packageById={packageById} />
            ))}
          </div>
          {filteredConflicts.length === 0 && <p className="py-6 text-center text-[13px] text-tertiary">No conflicts match this filter.</p>}
        </section>

        {/* ============================================================ ALIGNMENTS */}
        <section id="alignments" className="mb-10 scroll-mt-16">
          <h2 className="text-lg font-bold text-tertiary-dark">Alignments — where the package delivers on the advice</h2>
          <p className="mb-3 max-w-3xl text-[13px] text-tertiary">
            The conflict ranking above is not the whole story: these are the places the package actively does what the Board
            asked for. Recorded with the same evidence standard, excluded from the conflict ranking, and shown here so the
            assessment stays even-handed.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {aligned.map((f) => (
              <FindingCard key={f.id} f={f} adviceById={adviceById} packageById={packageById} />
            ))}
          </div>
        </section>

        {/* ============================================================ SOURCES */}
        <section id="sources" className="mb-8 scroll-mt-16">
          <h2 className="text-lg font-bold text-tertiary-dark">Sources</h2>
          <p className="mb-3 max-w-3xl text-[13px] text-tertiary">
            Side B (the package) is quoted from the documents below; side A (the advice) is quoted from the ESABCC reports
            actually cited by the findings above.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <p className="mb-2 text-[12px] font-bold text-tertiary-dark">The package — documents cited (side B)</p>
              <ul className="space-y-1.5">
                {(Object.keys(PACKAGE_DOCS) as PackageDocId[]).map((id) => (
                  <li key={id}>
                    <a href={PACKAGE_DOCS[id].url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-tertiary-dark underline hover:text-primary">
                      {PACKAGE_DOCS[id].label}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <p className="mb-2 text-[12px] font-bold text-tertiary-dark">ESABCC reports actually cited (side A)</p>
              <ul className="space-y-1.5">
                {citedReportIds.map((id) => (
                  <li key={id}>
                    <a href={RECOMMENDATION_REPORTS[id].url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-tertiary-dark underline hover:text-primary">
                      {RECOMMENDATION_REPORTS[id].label}
                    </a>
                    <span className="ml-1.5 font-mono text-[10px] text-tertiary">{ADVICE_REPORT_FILES[id]}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <p className="mt-3 rounded-md bg-surface-blue px-3 py-2 text-[11.5px] leading-relaxed text-tertiary">
            <strong className="text-tertiary-dark">Method.</strong> The full brief for this submodule — its mission, source
            inventory, conventions and QA bar — is recorded in{' '}
            <span className="font-mono text-[11px]">work-packages/</span>; the severity rubric rendered above is defined once,
            canonically, in <span className="font-mono text-[11px]">types.ts</span> and used unmodified by every other file in
            this submodule.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
