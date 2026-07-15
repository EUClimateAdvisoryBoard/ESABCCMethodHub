'use client';

/**
 * Overview Industry — Downstream.
 * -------------------------------
 * The demand side of industrial decarbonisation, in two parts:
 *
 *   1. LEAD-MARKET POLICIES — the EU instruments that create demand for
 *      low-carbon industrial products (public procurement rules, quotas,
 *      border price signals), each reviewed and assessed against the FIVE
 *      Better Regulation evaluation criteria (SWD(2021) 305 / Toolbox #47):
 *      effectiveness · efficiency · relevance · coherence · EU added value.
 *
 *   2. DOWNSTREAM STANDARDS — the definitions / labels / product-standard
 *      layer those lead markets depend on (what counts as low-carbon steel?).
 *
 * Everything on this page exports to ONE Excel handover workbook
 * (./export.ts) so the review can be handed over — assessment, data,
 * sources and a what-to-watch timeline included. Data: src/data/
 * downstream-lead-markets.ts (single source of truth for page + workbook).
 */

import { useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  DOWNSTREAM_META,
  BR_CRITERIA,
  BR_CRITERIA_META,
  SCORE_META,
  LEAD_MARKET_POLICIES,
  POLICY_CATEGORY_META,
  POLICY_STATUS_META,
  DOWNSTREAM_STANDARDS,
  STANDARD_TYPE_META,
  WATCH_TIMELINE,
  type LeadMarketPolicy,
  type ScoreLevel,
} from '@/data/downstream-lead-markets';
import { exportDownstreamWorkbook } from './export';

function ScoreChip({ score, compact }: { score: ScoreLevel; compact?: boolean }) {
  const m = SCORE_META[score];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${m.color}1A`, color: m.color }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
      {compact ? m.label.slice(0, 1) : m.label}
    </span>
  );
}

function PolicyCard({ p }: { p: LeadMarketPolicy }) {
  const [open, setOpen] = useState(false);
  const cat = POLICY_CATEGORY_META[p.category];
  const st = POLICY_STATUS_META[p.status];
  return (
    <article
      id={p.id}
      className="scroll-mt-24 rounded-xl border border-grey-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: `${cat.color}14`, color: cat.color }}
        >
          {cat.label}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: `${st.color}14`, color: st.color }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.color }} />
          {st.label}
        </span>
        <span className="ml-auto hidden text-[11px] uppercase tracking-wide text-grey-500 sm:inline">
          {p.sectors}
        </span>
      </div>

      <h3 className="mt-2 text-[16px] font-bold leading-snug text-grey-900">{p.name}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-grey-600">{p.description}</p>

      <div className="mt-3 rounded-md border-l-2 border-primary/50 bg-surface-blue px-3 py-2 text-[12.5px] leading-relaxed text-grey-700">
        <span className="font-semibold text-primary">Lead-market mechanism: </span>
        {p.leadMarketMechanism}
      </div>

      {/* five-criteria strip */}
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {BR_CRITERIA.map((c) => (
          <div key={c} className="rounded-lg border border-grey-200 bg-grey-50 px-2.5 py-2">
            <div
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: BR_CRITERIA_META[c].color }}
            >
              {BR_CRITERIA_META[c].label}
            </div>
            <div className="mt-1">
              <ScoreChip score={p.assessment[c].score} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-grey-700">
        <span className="font-semibold text-grey-900">Overall read: </span>
        {p.overallRead}
      </p>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 text-[12.5px] font-semibold text-primary hover:underline"
      >
        {open ? '▾ Hide rationale, data & sources' : '▸ Rationale, data & sources'}
      </button>

      {open && (
        <div className="mt-3 space-y-4 border-t border-grey-200 pt-3">
          <div className="text-[11px] uppercase tracking-wide text-grey-500">
            {p.reference} · {p.statusDetail}
          </div>

          <div className="space-y-2">
            {BR_CRITERIA.map((c) => (
              <div key={c} className="flex gap-3">
                <div className="w-28 shrink-0 pt-0.5">
                  <div
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: BR_CRITERIA_META[c].color }}
                  >
                    {BR_CRITERIA_META[c].label}
                  </div>
                  <ScoreChip score={p.assessment[c].score} />
                </div>
                <p className="text-[12.5px] leading-relaxed text-grey-700">
                  {p.assessment[c].rationale}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-grey-600">
              Key data
            </h4>
            <div className="mt-1.5 overflow-x-auto rounded-lg border border-grey-200">
              <table className="w-full min-w-[520px] border-collapse text-[12px]">
                <tbody>
                  {p.keyData.map((d) => (
                    <tr key={d.label} className="border-t border-grey-200 first:border-t-0">
                      <td className="w-56 px-3 py-1.5 font-semibold text-grey-700">{d.label}</td>
                      <td className="px-3 py-1.5 text-grey-700">{d.value}</td>
                      <td className="px-3 py-1.5 text-grey-500">{d.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-grey-600">Sources</h4>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {p.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-primary-light underline decoration-primary-lightest underline-offset-2 hover:text-primary"
                  >
                    {s.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border-l-2 border-accent-orange/70 bg-surface-orange px-3 py-2 text-[12.5px] leading-relaxed text-grey-700">
            <span className="font-semibold text-accent-orange">Handover — what to do / watch: </span>
            {p.handoverNotes}
          </div>
        </div>
      )}
    </article>
  );
}

export default function DownstreamPage() {
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportDownstreamWorkbook();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <SiteHeader />

      <main className="mx-auto max-w-content px-4 py-8">
        <nav className="mb-4 text-sm text-grey-500">
          <Link href="/beta/overview-industry" className="hover:underline">
            Overview Industry
          </Link>
          <span className="mx-1">/</span>
          <span className="text-grey-700">Downstream</span>
        </nav>

        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Beta
            </span>
            <span className="rounded border border-primary-lighter bg-surface-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Demand side · lead markets
            </span>
            <span className="rounded bg-grey-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
              Status {DOWNSTREAM_META.asOf}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-grey-900">
            Downstream — lead-market policies &amp; downstream standards
          </h1>
          <p className="mt-2 max-w-text text-grey-700">
            Supply-side support alone does not close the green premium — someone has to{' '}
            <span className="font-semibold">buy</span> the low-carbon steel, cement and fuels. This
            page reviews the EU&apos;s demand-side instruments in two layers:{' '}
            <span className="font-semibold">lead-market policies</span> (public procurement rules,
            quotas and border price signals that create protected demand) and the{' '}
            <span className="font-semibold">downstream standards</span> underneath them — the
            definitions, labels and product rules that decide what counts as
            &ldquo;low-carbon&rdquo; in the first place. Each policy is assessed with the five
            evaluation criteria of the Commission&apos;s{' '}
            <a
              href={DOWNSTREAM_META.frameworkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-primary-lightest underline-offset-2"
            >
              Better Regulation framework
            </a>
            . Everything exports to one Excel handover workbook.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={onExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60"
            >
              {exporting ? 'Building workbook…' : '⬇ Download handover workbook (.xlsx)'}
            </button>
            <span className="text-[12px] text-grey-500">
              5 sheets: read-me &amp; watch-list · assessment (5 criteria) · data · sources ·
              standards
            </span>
          </div>
        </header>

        {/* ── Method: the five criteria ─────────────────────────────────── */}
        <section className="mb-8 rounded-xl border border-grey-200 bg-white p-5 shadow-sm">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-grey-900">
            The assessment lens — five Better Regulation evaluation criteria
          </h2>
          <p className="mt-1 max-w-text text-[12.5px] text-grey-600">
            {DOWNSTREAM_META.frameworkNote}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {BR_CRITERIA.map((c) => (
              <div
                key={c}
                className="rounded-lg border border-grey-200 bg-grey-50 p-3"
                style={{ borderTopColor: BR_CRITERIA_META[c].color, borderTopWidth: 3 }}
              >
                <div
                  className="text-[12px] font-bold"
                  style={{ color: BR_CRITERIA_META[c].color }}
                >
                  {BR_CRITERIA_META[c].label}
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-grey-600">
                  {BR_CRITERIA_META[c].question}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-grey-600">
            <span className="font-semibold">Scores:</span>
            {(Object.keys(SCORE_META) as ScoreLevel[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <ScoreChip score={s} />
                {s === 'too-early' && (
                  <span className="text-grey-500">(instrument too new / still a proposal)</span>
                )}
              </span>
            ))}
          </div>
        </section>

        {/* ── Assessment matrix ─────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-[15px] font-bold text-grey-900">
            Assessment at a glance — {LEAD_MARKET_POLICIES.length} instruments × 5 criteria
          </h2>
          <p className="mb-3 mt-1 text-[12.5px] text-grey-600">
            Click a row to jump to the full review card with rationale, data and sources.
          </p>
          <div className="overflow-x-auto rounded-xl border border-grey-200 bg-white shadow-sm">
            <table className="w-full min-w-[780px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-grey-100">
                  <th className="px-3 py-2 text-left font-semibold text-grey-700">Instrument</th>
                  <th className="px-3 py-2 text-left font-semibold text-grey-700">Status</th>
                  {BR_CRITERIA.map((c) => (
                    <th key={c} className="px-2 py-2 text-center font-semibold">
                      <span style={{ color: BR_CRITERIA_META[c].color }}>
                        {BR_CRITERIA_META[c].label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LEAD_MARKET_POLICIES.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-t border-grey-200 transition hover:bg-surface-blue"
                    onClick={() =>
                      document
                        .getElementById(p.id)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  >
                    <td className="px-3 py-2 font-semibold text-grey-900">{p.shortName}</td>
                    <td className="px-3 py-2">
                      <span
                        className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          backgroundColor: `${POLICY_STATUS_META[p.status].color}14`,
                          color: POLICY_STATUS_META[p.status].color,
                        }}
                      >
                        {POLICY_STATUS_META[p.status].label}
                      </span>
                    </td>
                    {BR_CRITERIA.map((c) => (
                      <td key={c} className="px-2 py-2 text-center">
                        <ScoreChip score={p.assessment[c].score} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Policy review cards ───────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-3 text-[15px] font-bold text-grey-900">
            The review — instrument by instrument
          </h2>
          <div className="space-y-4">
            {LEAD_MARKET_POLICIES.map((p) => (
              <PolicyCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        {/* ── What to watch ─────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-grey-900">
            What to watch — the handover timeline
          </h2>
          <p className="mb-3 mt-1 text-[12.5px] text-grey-600">
            The decisions expected while this review sits with the cover — each one changes at least
            one score above. Also on the &ldquo;Read me&rdquo; sheet of the workbook.
          </p>
          <div className="rounded-xl border border-grey-200 bg-white p-5 shadow-sm">
            <ol className="space-y-3">
              {WATCH_TIMELINE.map((w) => {
                const p = LEAD_MARKET_POLICIES.find((x) => x.id === w.policyId);
                return (
                  <li key={`${w.when}-${w.policyId}`} className="flex gap-3">
                    <span className="w-36 shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                      {w.when}
                    </span>
                    <p className="text-[12.5px] leading-relaxed text-grey-700">
                      {w.what}{' '}
                      {p && (
                        <button
                          onClick={() =>
                            document
                              .getElementById(p.id)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                          className="font-semibold text-primary hover:underline"
                        >
                          [{p.shortName}]
                        </button>
                      )}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ── Downstream standards ──────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-[15px] font-bold text-grey-900">
            Downstream standards — the layer the lead markets stand on
          </h2>
          <p className="mb-3 mt-1 max-w-text text-[12.5px] text-grey-600">
            Every procurement preference and quota above needs an answer to &ldquo;what counts as
            low-carbon?&rdquo;. That answer lives here — and most of it is still being written. These
            are the definitions, labels and product standards to track.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {DOWNSTREAM_STANDARDS.map((st) => {
              const t = STANDARD_TYPE_META[st.type];
              return (
                <article
                  key={st.id}
                  className="rounded-xl border border-grey-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: `${t.color}14`, color: t.color }}
                    >
                      {t.label}
                    </span>
                    <span className="text-[11px] text-grey-500">{st.status}</span>
                  </div>
                  <h3 className="mt-2 text-[14.5px] font-bold leading-snug text-grey-900">
                    {st.name}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-grey-600">
                    {st.description}
                  </p>
                  <div className="mt-2 rounded-md border-l-2 border-secondary/60 bg-surface-teal px-3 py-2 text-[12px] leading-relaxed text-grey-700">
                    <span className="font-semibold text-secondary">Why it matters: </span>
                    {st.whyItMatters}
                  </div>
                  <div className="mt-2 text-[12px] leading-relaxed text-grey-600">
                    <span className="font-semibold text-grey-800">Watch: </span>
                    {st.watchPoints}
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {st.sources.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11.5px] text-primary-light underline decoration-primary-lightest underline-offset-2 hover:text-primary"
                        >
                          {s.label} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <p className="max-w-text text-[12px] leading-relaxed text-grey-500">
          Provenance: statuses, dates and data points were web-verified against the linked sources
          in {DOWNSTREAM_META.asOf}; the five-criteria scores and rationales are AI-compiled working
          judgements — evaluation-style and largely ex-ante, since most instruments are new or still
          proposals — pending verification by the industry lead. A prompt for judgement, not a Board
          position. Page and workbook are generated from the same data file
          (<span className="font-mono">src/data/downstream-lead-markets.ts</span>), so corrections
          there propagate to both.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
