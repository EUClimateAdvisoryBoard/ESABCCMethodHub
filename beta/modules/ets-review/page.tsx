'use client';

/**
 * ETS Review (beta module M·37) — hub.
 *
 * On 17 July 2026 the Commission published a single package with two halves: an
 * Electrification Action Plan and a review of the EU ETS (Phase 5, 2031–2040).
 * This module splits into three submodules:
 *
 *   1. Electrification — the interactive least-cost model (what a given 2040
 *      electrification rate costs on a price-only path vs with demand-side
 *      measures). Route: /beta/ets-review/electrification.
 *   2. ETS reform — an overview of the most important proposed changes, each
 *      linked to where it is stated in the Commission's own communication of the
 *      proposal, plus the underlying assumptions and an uncertainty register.
 *      Route: /beta/ets-review/reform.
 *   3. Advice conflicts — the package compared against the ESABCC's published
 *      advice across all of its reports, ranked by the severity of every
 *      conflict, with genuine alignments recorded alongside. Route:
 *      /beta/ets-review/conflicts.
 *
 * This page is the chooser between the three.
 */

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { rankedConflicts } from './conflicts/conflicts';
import { severityScore, severityTier } from './conflicts/types';

// Palette kept in sync with the three submodules (electrification/page.tsx,
// reform/page.tsx, conflicts/page.tsx) so a colour means the same thing
// everywhere in this module.
const C_TEAL = '#0D9488';   // electrification / flexibility
const C_NAVY = '#2E3E4C';   // the gap / synthesis
const C_RED = '#B83230';    // ambition & cap (price-only, the costly path) / conflicts
const C_BLUE = '#2F6FB0';   // investment & revenue
const C_PURPLE = '#8A4B9E'; // scope (removals)

// Computed, not hard-coded: number of ranked conflicts and how many are critical.
const RANKED_CONFLICTS = rankedConflicts();
const CRITICAL_CONFLICTS = RANKED_CONFLICTS.filter((f) => severityTier(severityScore(f.scores)) === 'critical').length;

function Card({ href, kicker, title, blurb, points, cta, accent }: {
  href: string; kicker: string; title: string; blurb: string; points: string[]; cta: string; accent: string;
}) {
  return (
    <a href={href} className="group flex flex-col rounded-xl border border-grey-200 bg-white p-5 transition hover:border-primary hover:shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: accent }}>{kicker}</span>
      <h2 className="mt-1 text-xl font-bold text-tertiary-dark group-hover:text-primary">{title}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-tertiary">{blurb}</p>
      <ul className="mt-3 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[12.5px] text-tertiary-dark">
            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />{p}
          </li>
        ))}
      </ul>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: accent }}>
        {cta}<span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </a>
  );
}

/* ------------------------------------------------------------ headline stats */
interface Stat { label: string; value: string; unit?: string; sub: string; color: string; href: string; }
const STATS: Stat[] = [
  { label: 'Electrification target, 2040', value: '46', unit: '%', sub: 'vs ~23% today', color: C_TEAL, href: '/beta/ets-review/electrification' },
  { label: 'Shadow value of demand-side policy', value: '€111', unit: '/t', sub: '€166 price-only vs €55 with measures', color: C_NAVY, href: '/beta/ets-review/electrification' },
  { label: 'Cap trajectory (LRF)', value: '3.7→1.7', unit: '%', sub: '2031–35 → 2036–40', color: C_RED, href: '/beta/ets-review/reform#numbers' },
  { label: 'Permanent removals', value: '250', unit: 'Mt', sub: '2031–40, on top of the cap', color: C_PURPLE, href: '/beta/ets-review/reform#flexibility' },
  { label: 'International credits', value: '≈260', unit: 'Mt', sub: '2036–40, contingent on 2033 review', color: C_TEAL, href: '/beta/ets-review/reform#flexibility' },
  { label: 'Industrial Decarbonisation Bank', value: '€100', unit: 'bn', sub: 'ETS-revenue funded', color: C_BLUE, href: '/beta/ets-review/reform#changes' },
  { label: 'Advice conflicts', value: String(RANKED_CONFLICTS.length), sub: `${CRITICAL_CONFLICTS} critical · ranked by severity`, color: C_RED, href: '/beta/ets-review/conflicts' },
];

function StatTile({ s }: { s: Stat }) {
  return (
    <a href={s.href} className="group rounded-lg border border-grey-200 bg-white p-3 transition hover:border-primary hover:shadow-sm">
      <p className="flex items-center gap-1.5 text-[10.5px] leading-tight text-tertiary">
        <span className="inline-block h-2 w-2 shrink-0 rounded-[2px]" style={{ background: s.color }} />{s.label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums" style={{ color: s.color }}>
        {s.value}<span className="text-[11px] font-normal text-tertiary"> {s.unit}</span>
      </p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{s.sub}</p>
    </a>
  );
}

/* --------------------------------------------------------------- milestones */
interface Milestone { year: string; label: string; color: string; }
const MILESTONES: Milestone[] = [
  { year: '2032', label: 'CORSIA review — can revert aviation scope to intra-EEA', color: C_PURPLE },
  { year: '2033', label: 'International-credits availability review — failure reverts the 2036–40 LRF to 2.7%', color: C_TEAL },
  { year: '2038', label: 'CBAM free-allocation phase-out ends', color: C_RED },
];

export default function EtsReviewHub() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-7">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · M · 37 · 17 July 2026 package
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">ETS Review &amp; Electrification</h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            On <strong>17 July 2026</strong> the Commission tabled a single package with two halves — an{' '}
            <strong>Electrification Action Plan</strong> (make Europe the &ldquo;first electro-powered continent&rdquo;, indicative
            46% electrification by 2040) and a <strong>review of the EU ETS</strong> for Phase 5 (2031–2040), aligned with the
            −90% 2040 target. This module splits into three matching submodules — what the package changes, what it costs, and
            where it does and does not align with the ESABCC&apos;s own advice.
          </p>
        </section>

        <section className="mb-7 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {STATS.map((s) => <StatTile key={s.label} s={s} />)}
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
            href="/beta/ets-review/electrification"
            accent={C_TEAL}
            kicker="Submodule 1 · Electrification"
            title="What does 46% electrification cost?"
            blurb="The interactive least-cost model behind the Electrification Action Plan: the carbon price needed to reach a 2040 electrification rate on a price-only path versus with a demand-side package — the gap is the shadow value of demand-side policy."
            points={[
              'Drive the assumptions with sliders (target, baseline, barriers, measures)',
              'Price-only ≈ €166/t vs with measures ≈ €55/t — the €111/t gap',
              'Supply curve, sector breakdown, physical outputs',
              'Liebreich’s “final-energy fallacy” — 46% in devices: ≈¾ heat pumps, ≈⅘ EVs',
            ]}
            cta="Open the model"
          />
          <Card
            href="/beta/ets-review/reform"
            accent={C_NAVY}
            kicker="Submodule 2 · ETS reform"
            title="The ETS reform — what's proposed"
            blurb="An overview of the most important proposed changes to the carbon market, each linked to where it is stated in the Commission's own communication of the proposal — plus the underlying technical assumptions and an uncertainty register."
            points={[
              'Every key change → its line in the press release, Q&A and COM(2026) 616',
              'Cap trajectory (LRF 3.7% → 1.7%), MSR, removals, free allocation, IDB',
              'Filterable register of the uncertainties and ambiguities',
            ]}
            cta="Open the overview"
          />
          <Card
            href="/beta/ets-review/conflicts"
            accent={C_RED}
            kicker="Submodule 3 — advice conflicts"
            title="Where the package doesn't align with the advice"
            blurb="The package compared, theme by theme, against the ESABCC's published advice across all of its reports — every contradiction, tension and ambition gap ranked by a transparent severity rubric, with genuine alignments recorded too."
            points={[
              `${RANKED_CONFLICTS.length} conflicts ranked by a four-axis severity score (0–10)`,
              `${CRITICAL_CONFLICTS} rated critical — explicit, binding divergence from headline advice`,
              'Full evidence trail: package quote + advice quote + reasoning chain per finding',
              'Alignments recorded alongside, so the read stays even-handed',
            ]}
            cta="Open the conflict ranking"
          />
        </section>

        <section className="mt-7">
          <h2 className="text-base font-bold text-tertiary-dark">How the two halves fit together</h2>
          <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-tertiary">
            The two submodules are one policy logic, not two separate topics. The <strong>ETS reform</strong> sets the
            carbon-price frame for 2031–2040 — cap trajectory, MSR, removals and credits — and with it the{' '}
            <strong>€45/t ETS2 price-stability trigger</strong> that releases extra allowances rather than let the price
            run. That trigger is exactly why carbon pricing alone cannot do all the work: the{' '}
            <strong>electrification model</strong> shows that reaching 46% by 2040 on price alone needs ≈€166/t, several
            times the trigger, while the Action Plan&apos;s <strong>demand-side package</strong> (electricity-price reform,
            boiler phase-out, vehicle standards, industrial CCfDs) brings the same target down to ≈€55/t. Submodule 2
            records what the reform proposes and how uncertain it still is; submodule 1 puts a price on why the
            demand-side half is not optional.
          </p>
          <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="flex-1 rounded-lg border border-l-[3px] border-grey-200 bg-white p-3" style={{ borderLeftColor: C_NAVY }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary">ETS reform</p>
              <p className="mt-0.5 text-[12.5px] font-bold text-tertiary-dark">Sets the price frame</p>
              <p className="mt-0.5 text-[11px] leading-snug text-tertiary">LRF, MSR, removals &amp; credits — and the €45/t trigger</p>
            </div>
            <span aria-hidden className="hidden text-tertiary sm:block">→</span>
            <span aria-hidden className="text-center text-tertiary sm:hidden">↓</span>
            <div className="flex-1 rounded-lg border border-l-[3px] border-grey-200 bg-white p-3" style={{ borderLeftColor: C_TEAL }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary">Demand-side package</p>
              <p className="mt-0.5 text-[12.5px] font-bold text-tertiary-dark">Closes the price gap</p>
              <p className="mt-0.5 text-[11px] leading-snug text-tertiary">Electricity-price reform, standards, CCfDs — €166/t → €55/t</p>
            </div>
            <span aria-hidden className="hidden text-tertiary sm:block">=</span>
            <span aria-hidden className="text-center text-tertiary sm:hidden">↓</span>
            <div className="flex-1 rounded-lg border border-l-[3px] border-grey-200 bg-white p-3" style={{ borderLeftColor: C_RED }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary">Outcome</p>
              <p className="mt-0.5 text-[12.5px] font-bold text-tertiary-dark">46% reachable at ~€55/t</p>
              <p className="mt-0.5 text-[11px] leading-snug text-tertiary">not ≈€166/t on price alone</p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-grey-200 bg-white px-4 py-2.5 text-[12px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-tertiary-dark">
              <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: C_RED }} />
              Status: tabled, not final — entering trialogue
            </span>
            <span className="hidden text-grey-200 sm:inline">|</span>
            {MILESTONES.map((m) => (
              <span key={m.year} className="inline-flex items-center gap-1.5 text-tertiary">
                <span className="font-mono font-bold" style={{ color: m.color }}>{m.year}</span>
                {m.label}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-md bg-surface-blue px-4 py-3 text-[12px] leading-relaxed text-tertiary">
            <strong className="text-tertiary-dark">Sources.</strong> Commission press release{' '}
            <a href="https://ec.europa.eu/commission/presscorner/detail/en/ip_26_1596" className="underline hover:text-primary">IP/26/1596</a>,
            the ETS Directive proposal <strong>COM(2026) 616</strong>, the impact assessment{' '}
            <a href="https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en" className="underline hover:text-primary">SWD(2026) 616</a>,
            and the Electrification Action Plan <strong>COM(2026) 595</strong> — all 17 July 2026.
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
