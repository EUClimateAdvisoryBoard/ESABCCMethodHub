'use client';

/**
 * Summer Prep · Note 3 — Policy gaps for TRANSPORT & INDUSTRY (extends the
 * Policy Gap Tracker sub-module, formerly M · 36).
 * ---------------------------------------------------------------------------
 * Three things the base Policy Gap Tracker does not do:
 *   1. Re-assess whether each transport/industry gap STILL EXISTS after the
 *      legislation adopted since the January-2024 report.
 *   2. Surface CANDIDATE additional gaps for the lead to accept or reject.
 *   3. Draw the gap LANDSCAPE per sector — subsector × gap type.
 *
 * Base facts (the report's own tag, quote and page) come from
 * src/data/policy-gaps.ts; the reassessment overlay and candidates come from
 * src/data/summer-prep-sector-gaps.ts and are provisional / pending review.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import {
  POLICY_GAPS,
  GAP_TYPE_META,
  GAP_STATUS_META,
  type GapType,
  type GapStatus,
  type PolicyGap,
} from '@/data/policy-gaps';
import {
  SECTOR_SUBSECTORS,
  GAP_REASSESSMENTS,
  CANDIDATE_GAPS,
  SECTOR_GAP_META,
} from '@/data/summer-prep-sector-gaps';

type Sector = 'Industry' | 'Transport';
const SECTORS: Sector[] = ['Transport', 'Industry'];
const TYPE_KEYS = Object.keys(GAP_TYPE_META) as GapType[];

interface EnrichedGap extends PolicyGap {
  subsector: string;
  reassessedStatus: GapStatus;
  reassessmentNote: string;
}

function TypeBadge({ type }: { type: GapType }) {
  const m = GAP_TYPE_META[type];
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${m.color}1A`, color: m.color }}
      title={m.description}
    >
      {m.label}
    </span>
  );
}

function StatusPill({ status }: { status: GapStatus }) {
  const m = GAP_STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: `${m.color}1A`, color: m.color }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
      {m.label}
    </span>
  );
}

function SectorGapsInner() {
  const [sector, setSector] = useState<Sector>('Transport');

  const enriched: EnrichedGap[] = useMemo(
    () =>
      POLICY_GAPS.filter((g) => g.sector === sector).map((g) => {
        const r = GAP_REASSESSMENTS[g.id];
        return {
          ...g,
          subsector: r?.subsector ?? 'Cross-cutting',
          reassessedStatus: r?.status ?? g.currentStatus,
          reassessmentNote: r?.note ?? '',
        };
      }),
    [sector],
  );

  const candidates = useMemo(
    () => CANDIDATE_GAPS.filter((c) => c.sector === sector),
    [sector],
  );

  const subsectors = SECTOR_SUBSECTORS[sector];

  // Landscape matrix: subsector × gap type → counts (existing + candidate).
  const matrix = useMemo(() => {
    const cell: Record<string, Record<GapType, { existing: number; candidate: number }>> = {};
    subsectors.forEach((sub) => {
      cell[sub] = {
        policy: { existing: 0, candidate: 0 },
        ambition: { existing: 0, candidate: 0 },
        implementation: { existing: 0, candidate: 0 },
        inconsistency: { existing: 0, candidate: 0 },
      };
    });
    enriched.forEach((g) => {
      if (cell[g.subsector]) cell[g.subsector][g.type].existing += 1;
    });
    candidates.forEach((c) => {
      if (cell[c.subsector]) cell[c.subsector][c.type].candidate += 1;
    });
    return cell;
  }, [enriched, candidates, subsectors]);

  // Status roll-up of the reassessment.
  const statusRoll = useMemo(() => {
    const roll: Record<GapStatus, number> = {
      open: 0,
      'partially-addressed': 0,
      addressed: 0,
      unknown: 0,
    };
    enriched.forEach((g) => (roll[g.reassessedStatus] += 1));
    return roll;
  }, [enriched]);

  const maxCell = useMemo(() => {
    let m = 1;
    subsectors.forEach((sub) =>
      TYPE_KEYS.forEach((t) => {
        const c = matrix[sub][t];
        m = Math.max(m, c.existing + c.candidate);
      }),
    );
    return m;
  }, [matrix, subsectors]);

  return (
    <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <PageHero
        title="Policy gaps — Transport & Industry"
        subtitle={
          <>
            The transport- and industry-tagged findings from{' '}
            <a
              href={SECTOR_GAP_META.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[#00928F] underline-offset-2"
            >
              the policy-gap report
            </a>
            , re-asked: do they still exist? Where are candidate new gaps? And what does the gap
            landscape look like per sector? <span className="italic">{SECTOR_GAP_META.reassessmentAsOf}.</span>
          </>
        }
      />

      <main className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Sector switch */}
        <div className="mb-6 inline-flex rounded-lg border border-[#E6E7E8] p-1 dark:border-[var(--mh-border)]">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition ${
                sector === s
                  ? 'bg-[#003399] text-white'
                  : 'text-[#3D5265] hover:bg-[#F3F5F7] dark:text-[var(--mh-fg)] dark:hover:bg-[var(--mh-card)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── Landscape matrix ─────────────────────────────────────────── */}
        <section className="mb-9">
          <h2 className="mb-1 text-[15px] font-bold">Gap landscape — {sector}</h2>
          <p className="mb-3 text-[12px] text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
            Subsector × gap type. Shading scales with the number of gaps; the small ＋ badge counts
            candidate (proposed) gaps on top of the report’s tagged gaps.
          </p>
          <div className="overflow-x-auto rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)]">
            <table className="w-full min-w-[640px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F3F5F7] dark:bg-[var(--mh-card)]">
                  <th className="px-3 py-2 text-left font-semibold">Subsector</th>
                  {TYPE_KEYS.map((t) => (
                    <th key={t} className="px-3 py-2 text-center font-semibold">
                      <span style={{ color: GAP_TYPE_META[t].color }}>
                        {GAP_TYPE_META[t].label.replace(' gap', '')}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {subsectors.map((sub) => {
                  const rowTotalExisting = TYPE_KEYS.reduce(
                    (n, t) => n + matrix[sub][t].existing,
                    0,
                  );
                  const rowTotalCand = TYPE_KEYS.reduce(
                    (n, t) => n + matrix[sub][t].candidate,
                    0,
                  );
                  return (
                    <tr
                      key={sub}
                      className="border-t border-[#E6E7E8] dark:border-[var(--mh-border)]"
                    >
                      <td className="px-3 py-2 font-medium">{sub}</td>
                      {TYPE_KEYS.map((t) => {
                        const c = matrix[sub][t];
                        const n = c.existing + c.candidate;
                        const alpha = n === 0 ? 0 : 0.12 + 0.66 * ((c.existing + c.candidate) / maxCell);
                        const color = GAP_TYPE_META[t].color;
                        return (
                          <td key={t} className="px-2 py-2 text-center">
                            <div
                              className="mx-auto flex h-9 w-11 items-center justify-center rounded-md"
                              style={{
                                backgroundColor: n === 0 ? 'transparent' : `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`,
                                border: n === 0 ? '1px dashed #E6E7E8' : `1px solid ${color}55`,
                              }}
                              title={`${c.existing} report gap(s), ${c.candidate} candidate(s)`}
                            >
                              {c.existing > 0 && (
                                <span className="text-[13px] font-bold" style={{ color }}>
                                  {c.existing}
                                </span>
                              )}
                              {c.candidate > 0 && (
                                <span
                                  className="ml-0.5 text-[10px] font-bold"
                                  style={{ color }}
                                  title={`${c.candidate} candidate gap(s)`}
                                >
                                  ＋{c.candidate}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-semibold">
                        {rowTotalExisting}
                        {rowTotalCand > 0 && (
                          <span className="text-[10px] font-bold text-[#FF9933]">
                            {' '}
                            ＋{rowTotalCand}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Status roll-up */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-[12px] font-semibold text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
              Still exists? (reassessed):
            </span>
            {(['open', 'partially-addressed', 'addressed'] as GapStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-[12px]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: GAP_STATUS_META[s].color }}
                />
                <span className="font-bold">{statusRoll[s]}</span>
                <span className="text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
                  {GAP_STATUS_META[s].label}
                </span>
              </span>
            ))}
          </div>
        </section>

        {/* ── Reassessed report gaps ───────────────────────────────────── */}
        <section className="mb-9">
          <h2 className="mb-1 text-[15px] font-bold">
            Report gaps, reassessed — do they still exist? ({enriched.length})
          </h2>
          <p className="mb-3 text-[12px] text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
            Baseline was <strong>open</strong> at the January-2024 report. The pill shows the
            provisional current read after legislation adopted since.
          </p>
          <div className="space-y-3">
            {enriched.map((g) => (
              <article
                key={g.id}
                className="rounded-xl border border-[#E6E7E8] bg-white p-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#F3F5F7] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#54728C] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]">
                    {g.subsector}
                  </span>
                  <TypeBadge type={g.type} />
                  <span className="ml-auto" />
                  <StatusPill status={g.reassessedStatus} />
                </div>
                <h3 className="mt-2 text-[14px] font-bold leading-snug">{g.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#3D5265]/80 dark:text-[var(--mh-muted)]">
                  {g.description}
                </p>
                {g.reassessmentNote && (
                  <div className="mt-2 rounded-md border-l-2 border-[#00928F]/60 bg-[#00928F]/5 px-3 py-2 text-[12px] leading-relaxed">
                    <span className="font-semibold text-[#007B6C]">Reassessment: </span>
                    <span className="text-[#3D5265]/85 dark:text-[var(--mh-muted)]">
                      {g.reassessmentNote}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
                  <span>
                    <span className="font-semibold">Instrument:</span> {g.instrument}
                  </span>
                  <span className="uppercase tracking-wide">{g.reference}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Candidate gaps ───────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="mb-1 text-[15px] font-bold">
            Candidate additional gaps ({candidates.length})
          </h2>
          <p className="mb-3 text-[12px] text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
            Proposed for the lead to accept or reject — issues that look like gaps but are not (yet)
            tagged as such in the report. Each carries a test that would confirm or refute it.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {candidates.map((c) => (
              <article
                key={c.id}
                className="rounded-xl border border-dashed border-[#FF9933]/70 bg-[#FF9933]/5 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#54728C] dark:bg-[var(--mh-card)]">
                    {c.subsector}
                  </span>
                  <TypeBadge type={c.type} />
                  <span className="ml-auto rounded-full bg-[#FF9933]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B26A00] dark:text-[#FF9933]">
                    Candidate
                  </span>
                </div>
                <h3 className="mt-2 text-[14px] font-bold leading-snug">{c.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#3D5265]/80 dark:text-[var(--mh-muted)]">
                  {c.rationale}
                </p>
                <div className="mt-2 text-[11px] leading-relaxed">
                  <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">
                    Test to confirm:{' '}
                  </span>
                  <span className="text-[#3D5265]/75 dark:text-[var(--mh-muted)]">
                    {c.testToConfirm}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
                  <span className="font-semibold">Instrument:</span> {c.instrument}
                </div>
              </article>
            ))}
          </div>
        </section>

        <p className="max-w-3xl text-[12px] leading-relaxed text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          Provenance: the base gap, its verbatim report quote and page are unchanged from the Policy
          Gap Tracker (<span className="font-mono">policy-gaps.ts</span>). The “still exists?”
          reassessment and every candidate gap are AI-compiled working judgements ({SECTOR_GAP_META.reassessmentAsOf})
          pending verification by the sector lead — a prompt for judgement, not a Board position.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function PolicyGapsSectorsPage() {
  return <SectorGapsInner />;
}
