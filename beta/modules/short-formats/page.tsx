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
 * Two views:
 *
 *   • "Recommendations" — what the Board has said, drawn *only* from existing
 *     ESABCC recommendations (looked up by id from
 *     `src/data/esabcc-recommendations.ts`). Each card links back to the
 *     originating report. Nothing here is invented.
 *
 *   • "Political reality" — a Secretariat strategic lens on top of the same
 *     recommendations: for each one, is there a *live window* where the
 *     Board's existing advice can still land, an *open gap* to put on the
 *     agenda, or has the discussion *moved on* (effectively decided, often
 *     against the advice) so that restating it has little leverage? The
 *     classification is grounded in the legislative-tracking (uptake) events
 *     the dataset already records, and is dated as a snapshot. It is an
 *     editorial/strategic judgement by the Secretariat — explicitly NOT part
 *     of the report content — so the board can see where to speak and where
 *     the discussion has run too far ahead to bother.
 */

import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  ALL_ESABCC_RECOMMENDATIONS,
  type PastRecommendation,
} from '@/data/esabcc-recommendations';

/* ---------------------------------------------------------------- lookup */

const BY_ID = new Map<string, PastRecommendation>(
  ALL_ESABCC_RECOMMENDATIONS.map((r) => [r.id, r]),
);

/* ---------------------------------------------------------- political lens
 * Leverage = where the Board can still usefully speak. Grounded in the
 * legislative-tracking events the dataset records; snapshot June 2026.
 * ----------------------------------------------------------------------- */

type Leverage = 'live' | 'gap' | 'past';

const LEVERAGE: Record<
  Leverage,
  { short: string; long: string; order: number; chip: string; rail: string }
> = {
  live: {
    short: 'Live window',
    long: 'Live window — speak now',
    order: 0,
    chip: 'bg-secondary/10 text-secondary-dark border-secondary/40',
    rail: 'border-l-secondary',
  },
  gap: {
    short: 'Open gap',
    long: 'Open gap — put it on the agenda',
    order: 1,
    chip: 'bg-primary/10 text-primary border-primary/40',
    rail: 'border-l-primary',
  },
  past: {
    short: 'Moved on',
    long: 'Discussion has moved on — reframe, don’t restate',
    order: 2,
    chip: 'bg-accent-red/10 text-accent-red border-accent-red/40',
    rail: 'border-l-accent-red',
  },
};

/** Per-recommendation strategic note. `note` says where the discussion is. */
const POLITICS: Record<string, { leverage: Leverage; note: string }> = {
  // ── ETS ──────────────────────────────────────────────────────────────
  'kr7-ets-fit-for-net-zero': {
    leverage: 'live',
    note: 'ETS2’s start is delayed to 2028 and the 2026 ETS review is the next decision point — the cap-to-zero strategy and ETS1/ETS2 convergence are live on that table.',
  },
  'c1-ets-cap-to-zero': {
    leverage: 'live',
    note: 'The 2026 ETS review and the Art. 30(5) negative-emissions report (due 31 Jul 2026) are exactly the “cap heading to zero” discussion the Board called for.',
  },
  'c2-free-allocation-alternatives': {
    leverage: 'live',
    note: 'Free-allocation phase-out and CBAM scope are open in the 2026 ETS/CBAM review — alternatives to free allocation are being decided now.',
  },
  'i2-carbon-leakage-alternatives': {
    leverage: 'live',
    note: 'CBAM is phasing in and its scope is under review — the carbon-leakage question is genuinely open.',
  },
  'cdr-2025-ets-integration': {
    leverage: 'live',
    note: 'The strongest opening: integrating permanent removals is the explicit subject of the Art. 30(5) report due 31 Jul 2026 and the 2026 ETS revision.',
  },
  'c3-ets2-post-2030-reform': {
    leverage: 'gap',
    note: 'ETS2 was only just delayed to 2028; its post-2030 design is not yet on the agenda — an early window to shape before positions harden.',
  },
  'c6-expand-climate-revenue': {
    leverage: 'gap',
    note: 'Ending free allocation and ring-fencing CBAM revenue surfaces mainly in the MFF / own-resources debate, not yet a concrete ETS file.',
  },

  // ── LULUCF ───────────────────────────────────────────────────────────
  'l1-forests-wetlands-land': {
    leverage: 'live',
    note: 'The 2028–2034 CAP is being negotiated now; livestock support and biofuel reform are open (Nature Restoration already adopted).',
  },
  'l4-land-use-removal-incentives': {
    leverage: 'live',
    note: 'CRCF delegated acts and the CAP reform are live — incentives for land-based reductions and removals are being set.',
  },
  'cdr-2025-land-sink-lulucf': {
    leverage: 'live',
    note: 'The land sink has fallen ~a third in a decade; Soil Monitoring is now in force but the Forest Monitoring Law was just rejected — land-sink policy is actively contested.',
  },
  'l5-increase-adaptation': {
    leverage: 'live',
    note: 'The EU climate-resilience / adaptation framework is still forthcoming — adaptation effort is an open file.',
  },
  'l2-bioenergy-targeting': {
    leverage: 'gap',
    note: 'RED III already tightened bioenergy criteria and no near-term revision is scheduled — targeting is a slower-moving ask.',
  },
  'l3-lulucf-pricing-instrument': {
    leverage: 'gap',
    note: 'No LULUCF pricing instrument has been proposed; the Board re-stated it (CDR7, AgETS), so it stays a live agenda-setting ask — but there is no vehicle yet.',
  },
  'c4-agri-lulucf-pricing': {
    leverage: 'gap',
    note: 'No sectoral GHG pricing instrument for agriculture/LULUCF exists; the Board’s AgETS proposal keeps it on the table, but it is agenda-setting, not a live file.',
  },
  'cdr-2025-lulucf-pricing': {
    leverage: 'gap',
    note: 'Reinforces the unaddressed LULUCF-pricing ask; no proposal exists, so the value is in keeping it on the agenda.',
  },
  'l6-lulucf-sink-contingency': {
    leverage: 'gap',
    note: 'No sink-contingency strategy exists and none is planned — but the sink’s decline makes this a timely gap to raise.',
  },

  // ── Energy crisis ────────────────────────────────────────────────────
  'energy-crisis-2023-electrification': {
    leverage: 'live',
    note: 'Electrification and aligned price signals are live (electrification push, heat pumps) — and the Energy Taxation Directive is still blocked at ECOFIN, a genuinely open file.',
  },
  'energy-crisis-2023-biogas-hydrogen': {
    leverage: 'live',
    note: 'The hydrogen ramp-up and the decarbonised-gas package are still in flight.',
  },
  'energy-crisis-2023-vulnerable-consumers': {
    leverage: 'live',
    note: 'Affordability and the Social Climate Fund are firmly on the current agenda.',
  },
  'energy-crisis-2023-root-causes': {
    leverage: 'past',
    note: 'The crisis framing is over; the structural “rebalance supply and demand, don’t subsidise prices” message now lives in the affordability / competitiveness debate.',
  },
  'energy-crisis-2023-efficiency': {
    leverage: 'past',
    note: 'Legislated via the EED and EPBD recasts — now an implementation matter, not an open decision.',
  },
  'energy-crisis-2023-renewables': {
    leverage: 'past',
    note: 'Largely delivered via RED III and the electricity-market reform — attention has shifted to permitting and grids.',
  },
  'energy-crisis-2023-gas-diversification': {
    leverage: 'past',
    note: 'REPowerEU largely settled supply diversification; the residual live issue is upstream methane.',
  },
  'energy-crisis-2023-biomass': {
    leverage: 'past',
    note: 'Sustainability criteria were set in RED III — now an implementation and monitoring matter.',
  },
  'energy-crisis-2023-coal-oil': {
    leverage: 'past',
    note: 'No new coal/oil infrastructure is on the table; the lock-in risk has largely receded.',
  },

  // ── International flexibilities ───────────────────────────────────────
  'advice-2023-2040-target': {
    leverage: 'past',
    note: 'Decided: Reg (EU) 2026/667 adopted −90% with up to 5% international credits from 2036. The headline ask (strong domestic component, no credits) is settled.',
  },
  'climate-law-2025-2040-target': {
    leverage: 'past',
    note: 'The binding −90% 2040 target is adopted — this ask is closed.',
  },
  'climate-law-2025-international-action': {
    leverage: 'live',
    note: 'The “whether” is decided against the advice; the live debate is HOW — credit quality and Article-6 integrity. The Board’s own call for high-quality credits and genuine cooperation is the part that can still influence.',
  },
  'cdr-2025-governance-diplomacy': {
    leverage: 'live',
    note: 'Net-negative governance, carbon-leakage and climate diplomacy remain open — a forward-looking opening.',
  },
};

/* ---------------------------------------------------------------- topics */

type Topic = {
  id: string;
  num: string;
  title: string;
  /** Faithful one-line synthesis of the recommendations beneath it. */
  standfirst: string;
  /** Strategic read on where the topic sits in the live debate (political view). */
  politicalSummary: string;
  tint: string;
  bar: string;
  accentText: string;
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
    politicalSummary:
      'Mostly a live window. The 2026 ETS review and the Art. 30(5) negative-' +
      'emissions report (due 31 July 2026) put the cap-to-zero strategy, free-' +
      'allocation phase-out and removals integration squarely on the table — this ' +
      'is where the Board’s existing advice can land directly.',
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
    politicalSummary:
      'A mix. Forests, the CAP and the land sink are a live window (the 2028–2034 ' +
      'CAP negotiation, CRCF acts, the just-rejected Forest Monitoring Law). ' +
      'Land-sector GHG pricing remains an open gap with no vehicle — worth keeping ' +
      'on the agenda, not abandoning.',
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
    politicalSummary:
      'Largely moved on. The acute crisis has passed and most asks are legislated ' +
      '(RED III, EED/EPBD, the electricity-market reform). The debate has shifted to ' +
      'competitiveness and affordability (Clean Industrial Deal, Affordable Energy ' +
      'Action Plan). A few files stay live — electrification and the still-blocked ' +
      'Energy Taxation Directive, hydrogen, and consumer affordability.',
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
    politicalSummary:
      'Far from the current discussion. The “whether” is decided — Reg (EU) 2026/667 ' +
      'enshrines −90% by 2040 with up to 5% international credits from 2036, against ' +
      'the Board’s advice. Restating “a strong domestic component / no credits” has ' +
      'little traction. The live question is now the quality and Article-6 integrity ' +
      'of those credits and the post-neutrality role of removals — that is the one ' +
      'place the Board’s existing advice can still land.',
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

function ExternalIcon() {
  return (
    <svg className="ml-1 inline-block" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

type View = 'recommendations' | 'political';

/** A single recommendation card. In the political view it gains a leverage
 *  rail + chip and the "where the discussion is" note. */
function RecCard({
  rec,
  accentText,
  view,
}: {
  rec: PastRecommendation;
  accentText: string;
  view: View;
}) {
  const lawLinks = rec.uptakeEvents.filter((e) => e.sourceUrl);
  const pol = POLITICS[rec.id];
  const lev = view === 'political' && pol ? LEVERAGE[pol.leverage] : null;

  return (
    <article
      className={`rounded-lg border border-grey-200 bg-white p-4 sm:p-5 ${lev ? `border-l-4 ${lev.rail}` : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-[11px] font-mono font-bold uppercase tracking-wide ${accentText}`}>{rec.area}</span>
        {lev && (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${lev.chip}`}>
            {lev.short}
          </span>
        )}
      </div>
      <h3 className="text-[14px] sm:text-[15px] font-bold text-tertiary-dark leading-snug">{rec.title}</h3>
      <p className="mt-2 text-[12.5px] text-tertiary leading-relaxed">{rec.summary}</p>

      {/* Political-reality note. */}
      {lev && pol && (
        <div className="mt-3 rounded-md bg-grey-50 border border-grey-100 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.12em] text-tertiary/70 mb-0.5">
            Where the discussion is
          </div>
          <p className="text-[12px] text-tertiary-dark leading-relaxed">{pol.note}</p>
        </div>
      )}

      {/* Source report link. */}
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
  const [view, setView] = useState<View>('recommendations');
  const political = view === 'political';

  return (
    <>
      <SiteHeader />
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ---- intro ---- */}
        <section className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">
            Beta module · Short formats
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">Short Formats</h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl leading-relaxed">
            Compact, one-page briefs that re-package the Advisory Board’s published advice into four
            cross-cutting topics. The <strong className="text-tertiary-dark">Recommendations</strong> view
            states the advice itself (drawn only from existing ESABCC recommendations, each linked to its
            source report). The <strong className="text-tertiary-dark">Political reality</strong> view
            overlays where the live debate now sits — so the board can see where its advice can still land
            and where the discussion has run too far ahead to be worth restating.
          </p>
        </section>

        {/* ---- view toggle ---- */}
        <div className="mb-6 inline-flex rounded-lg border border-grey-200 bg-grey-50 p-1">
          {([
            ['recommendations', 'Recommendations'],
            ['political', 'Political reality'],
          ] as [View, string][]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3.5 py-1.5 text-[12.5px] font-semibold rounded-md transition-colors ${
                view === v ? 'bg-white text-tertiary-dark shadow-sm' : 'text-tertiary hover:text-tertiary-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ---- political-view legend ---- */}
        {political && (
          <div className="mb-8 rounded-lg border border-grey-200 bg-white px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-tertiary/70 mb-2">
              Leverage — where the Board can still usefully speak
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(['live', 'gap', 'past'] as Leverage[]).map((k) => (
                <div key={k} className={`flex items-start gap-2 rounded-md border-l-4 ${LEVERAGE[k].rail} bg-grey-50 px-3 py-2`}>
                  <div>
                    <div className="text-[12px] font-bold text-tertiary-dark">{LEVERAGE[k].long}</div>
                    <p className="text-[11px] text-tertiary leading-snug mt-0.5">
                      {k === 'live' && 'The decision is open now; existing advice lands directly.'}
                      {k === 'gap' && 'Not taken up and no live process — room to set the agenda.'}
                      {k === 'past' && 'Effectively decided or overtaken — restating has little leverage; reframe.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-tertiary/80 leading-relaxed">
              This lens is a Secretariat strategic assessment (snapshot June 2026), grounded in the
              legislative-tracking events recorded for each recommendation. It is{' '}
              <strong className="text-tertiary-dark">not part of the report content</strong> — the
              recommendations themselves are the Board’s own.
            </p>
          </div>
        )}

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
          let recs = t.recIds
            .map((id) => BY_ID.get(id))
            .filter((r): r is PastRecommendation => Boolean(r));

          // In the political view, surface the live openings first.
          if (political) {
            recs = [...recs].sort((a, b) => {
              const oa = POLITICS[a.id] ? LEVERAGE[POLITICS[a.id].leverage].order : 99;
              const ob = POLITICS[b.id] ? LEVERAGE[POLITICS[b.id].leverage].order : 99;
              return oa - ob;
            });
          }

          const reports = Array.from(
            new Map(
              recs.filter((r) => r.report).map((r) => [r.report!.id, r.report!]),
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
                      {political ? t.politicalSummary : t.standfirst}
                    </p>
                  </div>
                </div>

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
                    <RecCard key={rec.id} rec={rec} accentText={t.accentText} view={view} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* ---- provenance note ---- */}
        <section className="mb-4 rounded-lg border border-grey-200 bg-white px-4 py-3">
          <p className="text-[11.5px] text-tertiary leading-relaxed">
            <strong className="text-tertiary-dark">Provenance.</strong> The recommendations are generated
            from the shared ESABCC recommendation dataset and link to the originating reports — the
            operative asks, summaries and links are the Board’s own. The “Political reality” overlay is a
            separate Secretariat strategic assessment and is not part of the report content.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
