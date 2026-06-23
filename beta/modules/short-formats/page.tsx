'use client';

/**
 * Short Formats — beta module page.
 *
 * Compact, one-page "short format" briefs that re-package the European
 * Scientific Advisory Board on Climate Change's published advice on four
 * cross-cutting topics:
 *
 *   1. EU Emissions Trading Systems (ETS)
 *   2. Land use, land-use change and forestry (LULUCF)
 *   3. The energy crisis
 *   4. Flexibilities for international carbon mitigation
 *
 * IMPORTANT — provenance: nothing on this page is invented. Every brief is
 * assembled *only* from recommendations the Board has already published. The
 * cards below are looked up by id from the shared recommendation dataset
 * (`src/data/esabcc-recommendations.ts`), which records each recommendation's
 * operative ask, summary and — crucially — the source ESABCC report it comes
 * from, with a canonical link. Each card therefore carries a "Source" chip
 * that deep-links to the originating report, and any dated EU-law / process
 * links the dataset records for that recommendation are surfaced too.
 *
 * The short framing sentence at the head of each brief is a faithful synthesis
 * of the recommendations beneath it — it adds no new claims.
 */

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  ALL_ESABCC_RECOMMENDATIONS,
  type PastRecommendation,
  type RecommendationStatus,
} from '@/data/esabcc-recommendations';

/* ---------------------------------------------------------------- lookup
 * Build an id → recommendation map once so each brief can reference the
 * canonical data object (title, summary, source report, links) by id
 * instead of duplicating any text.
 * --------------------------------------------------------------------- */

const BY_ID = new Map<string, PastRecommendation>(
  ALL_ESABCC_RECOMMENDATIONS.map((r) => [r.id, r]),
);

/* ---------------------------------------------------------------- topics */

type Topic = {
  id: string;
  num: string;
  title: string;
  /** Faithful one-line synthesis of the recommendations beneath it. */
  standfirst: string;
  tint: string; // section background tint
  bar: string; // numbered badge background
  accentText: string;
  /** Recommendation ids, in display order. */
  recIds: string[];
};

const TOPICS: Topic[] = [
  {
    id: 'ets',
    num: '01',
    title: 'EU Emissions Trading Systems (ETS)',
    standfirst:
      'The Board’s advice on emissions trading centres on steering the ETS1 cap ' +
      'towards zero, stabilising ETS2 and considering linking the two systems, ' +
      'replacing free allocation with alternative carbon-leakage protection beyond ' +
      'CBAM, expanding climate revenue, and integrating permanent removals only ' +
      'gradually and under strict conditions.',
    tint: 'bg-surface-blue',
    bar: 'bg-primary',
    accentText: 'text-primary-dark',
    recIds: [
      'kr7-ets-fit-for-net-zero',
      'c1-ets-cap-to-zero',
      'c2-free-allocation-alternatives',
      'c3-ets2-post-2030-reform',
      'i2-carbon-leakage-alternatives',
      'c6-expand-climate-revenue',
      'cdr-2025-ets-integration',
    ],
  },
  {
    id: 'lulucf',
    num: '02',
    title: 'Land use, land-use change & forestry (LULUCF)',
    standfirst:
      'On the land sector the Board calls for halting and reversing the decline of ' +
      'the EU land sink — protecting and expanding forests and wetlands, reforming ' +
      'CAP livestock support and biofuels, targeting bioenergy at limited-' +
      'alternative uses, strengthening incentives for reductions and removals ' +
      'across all land uses, preparing a dedicated GHG pricing instrument for the ' +
      'sector, and developing a sink-contingency strategy.',
    tint: 'bg-surface-green',
    bar: 'bg-secondary',
    accentText: 'text-secondary-dark',
    recIds: [
      'l1-forests-wetlands-land',
      'l2-bioenergy-targeting',
      'l4-land-use-removal-incentives',
      'l3-lulucf-pricing-instrument',
      'c4-agri-lulucf-pricing',
      'cdr-2025-lulucf-pricing',
      'cdr-2025-land-sink-lulucf',
      'l6-lulucf-sink-contingency',
      'l5-increase-adaptation',
    ],
  },
  {
    id: 'energy-crisis',
    num: '03',
    title: 'Energy crisis',
    standfirst:
      'In response to the 2022–23 energy crisis the Board advised tackling the root ' +
      'causes by rebalancing supply and demand rather than subsidising prices: save ' +
      'energy through efficiency, at least double renewables deployment, electrify ' +
      'end uses, scale biogas and green hydrogen for hard-to-abate uses, give ' +
      'targeted support to vulnerable consumers, keep gas diversification compatible ' +
      'with climate neutrality, ensure sustainable biomass, and avoid new coal and ' +
      'oil lock-ins.',
    tint: 'bg-surface-orange',
    bar: 'bg-accent-orange',
    accentText: 'text-accent-orange',
    recIds: [
      'energy-crisis-2023-root-causes',
      'energy-crisis-2023-efficiency',
      'energy-crisis-2023-renewables',
      'energy-crisis-2023-electrification',
      'energy-crisis-2023-biogas-hydrogen',
      'energy-crisis-2023-vulnerable-consumers',
      'energy-crisis-2023-gas-diversification',
      'energy-crisis-2023-biomass',
      'energy-crisis-2023-coal-oil',
    ],
  },
  {
    id: 'international-flexibilities',
    num: '04',
    title: 'Flexibilities for international carbon mitigation',
    standfirst:
      'On the role of action outside the EU the Board advised a 2040 target met ' +
      'through a strong domestic component with limits on the role of removals, and ' +
      'that international credits must not count towards the EU’s 2040 or 2035 ' +
      'domestic targets — while genuinely expanding international cooperation through ' +
      'carbon-pricing alliances, climate finance, technology transfer and Article 6 ' +
      'mechanisms to reduce leakage and lift global ambition.',
    tint: 'bg-surface-teal',
    bar: 'bg-tertiary',
    accentText: 'text-tertiary-dark',
    recIds: [
      'advice-2023-2040-target',
      'climate-law-2025-2040-target',
      'climate-law-2025-international-action',
      'cdr-2025-governance-diplomacy',
    ],
  },
];

/* ---------------------------------------------------------------- helpers */

const STATUS_STYLE: Record<RecommendationStatus, { label: string; cls: string }> = {
  'not-addressed': { label: 'Not addressed', cls: 'bg-accent-red/10 text-accent-red border-accent-red/30' },
  'in-progress': { label: 'In progress', cls: 'bg-primary/10 text-primary border-primary/30' },
  partially: { label: 'Partially addressed', cls: 'bg-accent-orange/15 text-accent-orange border-accent-orange/40' },
  addressed: { label: 'Addressed', cls: 'bg-secondary/10 text-secondary-dark border-secondary/30' },
};

function StatusPill({ status }: { status: RecommendationStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}

function ExternalIcon() {
  return (
    <svg className="ml-1 inline-block" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/** A single recommendation card with its source-report link and any law links. */
function RecCard({ rec, accentText }: { rec: PastRecommendation; accentText: string }) {
  // Dated source / process links recorded against this recommendation.
  const lawLinks = rec.uptakeEvents.filter((e) => e.sourceUrl);
  return (
    <article className="rounded-lg border border-grey-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-[11px] font-mono font-bold uppercase tracking-wide ${accentText}`}>{rec.area}</span>
        <StatusPill status={rec.status} />
      </div>
      <h3 className="text-[14px] sm:text-[15px] font-bold text-tertiary-dark leading-snug">{rec.title}</h3>
      <p className="mt-2 text-[12.5px] text-tertiary leading-relaxed">{rec.summary}</p>

      {/* Source report — the link to which ESABCC report the recommendation comes from. */}
      {rec.report && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-grey-100 pt-3">
          <span className="text-[10px] uppercase tracking-[0.12em] text-tertiary/70">Source report</span>
          <a
            href={rec.report.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-grey-300 bg-grey-50 px-2.5 py-1 text-[11px] font-semibold text-tertiary-dark hover:border-secondary hover:text-secondary-dark transition-colors"
          >
            {rec.report.label}
            <ExternalIcon />
          </a>
        </div>
      )}

      {/* Dated EU-law / process links the dataset records for this recommendation. */}
      {lawLinks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {lawLinks.map((e) => (
            <a
              key={`${e.date}-${e.sourceUrl}`}
              href={e.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline"
            >
              {e.date} · linked instrument
              <ExternalIcon />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ page */

export default function ShortFormatsPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ---- intro ---- */}
        <section className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">
            Beta module · Short formats
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">Short Formats</h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl leading-relaxed">
            Compact, one-page briefs that re-package the Advisory Board’s published advice into four
            cross-cutting topics. Every point below is drawn{' '}
            <strong className="text-tertiary-dark">only from existing ESABCC recommendations</strong> —
            nothing is invented — and each carries a link back to the report it comes from.
          </p>
        </section>

        {/* ---- topic nav ---- */}
        <nav className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {TOPICS.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={`flex items-center gap-3 rounded-lg border border-grey-200 ${t.tint} px-3 py-2.5 hover:border-grey-400 transition-colors`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[12px] font-bold ${t.bar}`}>
                {t.num}
              </span>
              <span className="text-[12.5px] font-semibold text-tertiary-dark leading-tight">{t.title}</span>
            </a>
          ))}
        </nav>

        {/* ---- briefs ---- */}
        {TOPICS.map((t) => {
          const recs = t.recIds
            .map((id) => BY_ID.get(id))
            .filter((r): r is PastRecommendation => Boolean(r));

          // Distinct source reports feeding this brief (for the "Sourced from" strip).
          const reports = Array.from(
            new Map(
              recs
                .filter((r) => r.report)
                .map((r) => [r.report!.id, r.report!]),
            ).values(),
          );

          return (
            <section key={t.id} id={t.id} className="mb-12 scroll-mt-24">
              <div className={`rounded-t-lg border border-grey-200 ${t.tint} px-4 sm:px-5 py-4`}>
                <div className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold ${t.bar}`}>
                    {t.num}
                  </span>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-tertiary-dark leading-tight">{t.title}</h2>
                    <p className="mt-1.5 text-[12.5px] sm:text-[13px] text-tertiary leading-relaxed max-w-3xl">
                      {t.standfirst}
                    </p>
                  </div>
                </div>

                {/* Sourced-from strip: links to every report the brief draws on. */}
                {reports.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-grey-200/70 pt-3">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-tertiary/70">Sourced from</span>
                    {reports.map((rep) => (
                      <a
                        key={rep.id}
                        href={rep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border border-grey-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-tertiary-dark hover:border-secondary hover:text-secondary-dark transition-colors"
                      >
                        {rep.label}
                        <ExternalIcon />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-b-lg border border-t-0 border-grey-200 bg-grey-50 p-3 sm:p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {recs.map((rec) => (
                    <RecCard key={rec.id} rec={rec} accentText={t.accentText} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* ---- provenance note ---- */}
        <section className="mb-4 rounded-lg border border-grey-200 bg-white px-4 py-3">
          <p className="text-[11.5px] text-tertiary leading-relaxed">
            <strong className="text-tertiary-dark">Provenance.</strong> Each card is generated from the
            shared ESABCC recommendation dataset and links to the originating report. No content on this
            page is authored beyond a one-line synthesis per topic; the operative asks, summaries and
            links are the Board’s own.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
