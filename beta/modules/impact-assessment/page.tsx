'use client';

/**
 * Impact Assessment — Modelling Results (beta module M·38).
 *
 * Reference library of the most important modelling results in the ETS review
 * impact assessment SWD(2026) 616 (17 July 2026, accompanying COM(2026) 616):
 * 80 findings mined from all five parts (958 pp) — carbon prices, mitigation
 * costs, scenario outcomes, technology scaling, industry projections, removals
 * and macro impacts — each with the verbatim key numbers, a supporting quote,
 * the exact part/page reference, and (for 49 of them) a rendered screenshot of
 * the source page. A curated slice of the supplementary techno-economic
 * assumptions (E3-Modelling/PRIMES investment costs) closes the page.
 *
 * The findings were AI-extracted (one Sonnet agent per PDF part) and are
 * flagged as pending human verification — the page-level screenshots exist
 * precisely so every number can be checked against the source in one click.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  IA_FINDINGS, IA_PARTS, IA_DOCS, IA_TECH_COSTS,
  type IaCategory, type IaFinding,
} from './data';

const SHOTS_BASE = '/data/impact-assessment/shots';

const CATEGORY_META: Record<IaCategory, { label: string; color: string }> = {
  'carbon-price':       { label: 'Carbon price',        color: '#B83230' },
  'mitigation-cost':    { label: 'Mitigation cost',     color: '#FF9933' },
  'scenarios':          { label: 'Scenarios & caps',    color: '#004B7F' },
  'technology-scaling': { label: 'Technology scaling',  color: '#00928F' },
  'industry':           { label: 'Industry',            color: '#6667AB' },
  'macro':              { label: 'Macro & revenues',    color: '#A530B8' },
  'removals':           { label: 'Removals (CDR)',      color: '#007B6C' },
  'other':              { label: 'Other',               color: '#808285' },
};

const CATEGORY_ORDER: IaCategory[] = [
  'carbon-price', 'mitigation-cost', 'scenarios', 'technology-scaling',
  'industry', 'macro', 'removals', 'other',
];

function CategoryBadge({ cat }: { cat: IaCategory }) {
  const m = CATEGORY_META[cat];
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
      style={{ background: m.color }}
    >
      {m.label}
    </span>
  );
}

function FindingCard({ f, onOpenShot }: { f: IaFinding; onOpenShot: (file: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const numbers = expanded ? f.keyNumbers : f.keyNumbers.slice(0, 4);
  return (
    <article className="flex flex-col rounded-xl border border-grey-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <CategoryBadge cat={f.category} />
        <span className="shrink-0 text-[10.5px] text-tertiary-light">
          {IA_PARTS[f.part]} · p. {f.pdfPages.join(', ')}
        </span>
      </div>
      <h3 className="mt-1.5 text-[14.5px] font-bold leading-snug text-tertiary-dark">{f.title}</h3>
      <div className="mt-0.5 text-[11px] text-tertiary-light">{f.figureOrTable}</div>

      <ul className="mt-2 space-y-1">
        {numbers.map((k) => (
          <li key={k} className="flex items-start gap-1.5 text-[12.5px] leading-snug text-tertiary-dark">
            <span
              className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: CATEGORY_META[f.category].color }}
            />
            {k}
          </li>
        ))}
      </ul>
      {f.keyNumbers.length > 4 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 self-start text-[11.5px] font-semibold text-primary underline-offset-2 hover:underline"
        >
          {expanded ? 'Show fewer numbers' : `Show all ${f.keyNumbers.length} numbers`}
        </button>
      )}

      <blockquote className="mt-2.5 border-l-2 border-grey-300 pl-2.5 text-[11.5px] italic leading-relaxed text-tertiary">
        &ldquo;{f.quote}&rdquo;
      </blockquote>
      <p className="mt-2 text-[11.5px] leading-relaxed text-tertiary">{f.whyImportant}</p>

      {f.shots.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {f.shots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onOpenShot(s)}
              className="group relative overflow-hidden rounded border border-grey-200 transition hover:border-primary"
              title="Open source-page screenshot"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${SHOTS_BASE}/${s}`}
                alt={`SWD(2026) 616 source page for: ${f.title}`}
                loading="lazy"
                className="h-24 w-[72px] object-cover object-top transition group-hover:opacity-90"
              />
              <span className="absolute inset-x-0 bottom-0 bg-tertiary-dark/70 px-1 py-0.5 text-center text-[9px] font-semibold text-white">
                source p. {s.split('-')[1].replace(/^0+/, '')}
              </span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export default function ImpactAssessmentModule() {
  const [activeCat, setActiveCat] = useState<IaCategory | 'all'>('all');
  const [activePart, setActivePart] = useState<number | 0>(0);
  const [openShot, setOpenShot] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of IA_FINDINGS) c[f.category] = (c[f.category] ?? 0) + 1;
    return c;
  }, []);

  const filtered = IA_FINDINGS.filter(
    (f) => (activeCat === 'all' || f.category === activeCat) && (activePart === 0 || f.part === activePart),
  );

  const shotCount = useMemo(
    () => new Set(IA_FINDINGS.flatMap((f) => f.shots)).size,
    [],
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* ── Header ──────────────────────────────────────────────── */}
        <section className="mb-6">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · M · 38 · SWD(2026) 616 · 17 July 2026
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Impact Assessment — Modelling Results
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-tertiary sm:text-[15px]">
            The most important modelling results in the Commission&rsquo;s ETS review impact assessment{' '}
            <a href={IA_DOCS[0].url} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-primary">
              SWD(2026) 616
            </a>{' '}
            (5 parts, 958 pages, accompanying the ETS Directive proposal COM(2026) 616), mined into a
            reference library: carbon prices, mitigation costs, scenario/cap outcomes, technology
            scaling, industry projections, removals and macro impacts. Every finding carries its
            verbatim key numbers, a supporting quote and the exact part + PDF page — and, for the
            figure/table pages, a rendered <strong>screenshot of the source page</strong> so the number
            can be checked in one click. Use it to pull reference values (e.g. abatement costs,
            CDR price paths, cap budgets, GEM-E3 macro ranges) into other analyses.
          </p>
          <div className="mt-3 max-w-4xl rounded-md border border-accent-orange/40 bg-surface-orange px-3.5 py-2.5 text-[12px] leading-relaxed text-tertiary-dark">
            <strong>AI-extracted — pending verification.</strong> The findings were extracted by AI
            agents (one per PDF part) and have not yet been human-verified. The source-page
            screenshots exist precisely so each number can be verified against the document before
            reuse in Board outputs.
          </div>
        </section>

        {/* ── Stats ───────────────────────────────────────────────── */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Document pages', value: '958' },
            { label: 'PDF parts', value: '5' },
            { label: 'Findings', value: String(IA_FINDINGS.length) },
            { label: 'Source screenshots', value: String(shotCount) },
            { label: 'Categories', value: String(CATEGORY_ORDER.length) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-grey-200 bg-grey-50 px-3 py-2.5">
              <div className="text-xl font-bold text-primary">{s.value}</div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-tertiary">{s.label}</div>
            </div>
          ))}
        </section>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <section className="mb-5 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCat('all')}
              className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                activeCat === 'all'
                  ? 'border-tertiary-dark bg-tertiary-dark text-white'
                  : 'border-grey-300 bg-white text-tertiary hover:border-tertiary'
              }`}
            >
              All ({IA_FINDINGS.length})
            </button>
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCat(activeCat === c ? 'all' : c)}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                  activeCat === c ? 'text-white' : 'bg-white text-tertiary hover:border-tertiary'
                }`}
                style={
                  activeCat === c
                    ? { background: CATEGORY_META[c].color, borderColor: CATEGORY_META[c].color }
                    : { borderColor: '#DCDDDE' }
                }
              >
                {CATEGORY_META[c].label} ({counts[c] ?? 0})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.08em] text-tertiary-light">Part:</span>
            {[0, 1, 2, 3, 4, 5].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setActivePart(activePart === p ? 0 : p)}
                className={`rounded border px-2 py-0.5 text-[11.5px] font-medium transition ${
                  activePart === p
                    ? 'border-primary bg-primary text-white'
                    : 'border-grey-300 bg-white text-tertiary hover:border-tertiary'
                }`}
                title={p === 0 ? 'All parts' : IA_PARTS[p]}
              >
                {p === 0 ? 'All' : `${p}`}
              </button>
            ))}
            {activePart !== 0 && (
              <span className="text-[11.5px] text-tertiary">{IA_PARTS[activePart]}</span>
            )}
          </div>
        </section>

        {/* ── Findings grid ───────────────────────────────────────── */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => (
            <FindingCard key={`${f.part}-${f.id}`} f={f} onOpenShot={setOpenShot} />
          ))}
        </section>
        {filtered.length === 0 && (
          <div className="rounded-md bg-grey-50 px-4 py-6 text-center text-sm text-tertiary">
            No findings match this filter combination.
          </div>
        )}

        {/* ── Techno-economic assumptions ─────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-tertiary-dark">
            Techno-economic assumptions (supplementary information)
          </h2>
          <p className="mt-1.5 max-w-4xl text-[13px] leading-relaxed text-tertiary">
            The Commission published the PRIMES techno-economic input assumptions alongside the
            impact assessment (© E3-Modelling, part of WSP). A curated slice of the investment-cost
            trajectories — the reference numbers for <em>scaling of technologies</em> — is shown
            below; the{' '}
            <a href={IA_DOCS[6].url} className="underline hover:text-primary" target="_blank" rel="noopener noreferrer">
              full workbook
            </a>{' '}
            covers residential appliances, renovation, industry, power &amp; heat and clean fuels.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-grey-200">
            <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-grey-100 text-left text-[11px] uppercase tracking-[0.06em] text-tertiary">
                  <th className="px-3 py-2 font-semibold">Group</th>
                  <th className="px-3 py-2 font-semibold">Technology</th>
                  <th className="px-3 py-2 font-semibold">Unit</th>
                  <th className="px-3 py-2 text-right font-semibold">Current</th>
                  <th className="px-3 py-2 text-right font-semibold">2030</th>
                  <th className="px-3 py-2 text-right font-semibold">2040</th>
                  <th className="px-3 py-2 text-right font-semibold">Ultimate</th>
                </tr>
              </thead>
              <tbody>
                {IA_TECH_COSTS.map((r) => (
                  <tr key={r.tech} className="border-t border-grey-200 text-tertiary-dark">
                    <td className="px-3 py-1.5 text-[11.5px] text-tertiary">{r.group}</td>
                    <td className="px-3 py-1.5" title={r.note}>{r.tech}{r.note ? ' *' : ''}</td>
                    <td className="px-3 py-1.5 text-[11.5px] text-tertiary">{r.unit}</td>
                    {[r.current, r.y2030, r.y2040, r.ultimate].map((v, i) => (
                      <td key={i} className="px-3 py-1.5 text-right tabular-nums">
                        {v === null ? '—' : v.toLocaleString('en-US')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-tertiary-light">
            * See note on hover. Values rounded; &ldquo;current&rdquo; is 2020 or the workbook&rsquo;s
            &ldquo;current&rdquo; column depending on the sheet.
          </p>
        </section>

        {/* ── Sources ─────────────────────────────────────────────── */}
        <section className="mt-8">
          <div className="rounded-md bg-surface-blue px-4 py-3 text-[12px] leading-relaxed text-tertiary">
            <strong className="text-tertiary-dark">Sources.</strong>{' '}
            {IA_DOCS.map((d, i) => (
              <span key={d.url}>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                  {d.label}
                </a>
                {i < IA_DOCS.length - 1 ? ' · ' : ''}
              </span>
            ))}
            <span className="mt-1 block">
              Related modules: <a href="/beta/ets-review" className="underline hover:text-primary">M·37 ETS Review &amp; Electrification</a>{' '}
              (the proposal itself) · <a href="/beta/ets-cdr-price" className="underline hover:text-primary">M·26 ETS Endgame &amp; CDR Safety Valve</a>.
            </span>
          </div>
        </section>
      </main>

      {/* ── Screenshot lightbox ───────────────────────────────────── */}
      {openShot && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tertiary-dark/80 p-4 sm:p-8"
          onClick={() => setOpenShot(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-[900px]">
            <button
              type="button"
              onClick={() => setOpenShot(null)}
              className="absolute -top-3 right-0 -translate-y-full rounded bg-white px-3 py-1 text-[13px] font-semibold text-tertiary-dark shadow"
            >
              Close ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${SHOTS_BASE}/${openShot}`}
              alt="SWD(2026) 616 source page"
              className="w-full rounded bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      <SiteFooter />
    </>
  );
}
