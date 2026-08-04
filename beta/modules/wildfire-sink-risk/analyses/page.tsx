'use client';

/**
 * M · 41 — Analyses overview: the synthesis page.
 *
 * One page that states what the seven sub-analyses (A1-A7) find, in their
 * own computed numbers — every figure on this page is imported from the
 * analysis models and recomputed at the module defaults, so the summary can
 * never drift from the pages it summarises.
 *
 * The second half maps the findings onto the ESABCC Policy Gap report's own
 * four-type taxonomy (policy / ambition / implementation gap, inconsistency —
 * see `src/data/policy-gaps.ts`), because that is the shape in which this
 * module's arithmetic can actually enter the report.
 */

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { fmt, ha, mt } from '../model';
import { ANALYSES, GAP_TYPE_COLORS, type AnalysisMeta } from './lib';
import { summary as a1 } from './member-states/model';
import { summary as a2 } from './disturbance-flexibility/model';
import { summary as a3 } from './prevention/model';
import { summary as a4 } from './hindcast/model';
import { summary as a5 } from './crcf-reversal/model';
import { summary as a6 } from './natura2000/model';
import { summary as a7 } from './fwi-scenarios/model';

/** One computed headline per analysis, kept in lock-step with the models. */
function findings() {
  const s1 = a1();
  const s2 = a2();
  const s3 = a3();
  const s4 = a4();
  const s5 = a5();
  const s6 = a6();
  const s7 = a7();
  const map: Record<string, { stat: string; statLabel: string; text: string }> = {
    'member-states': {
      stat: `${fmt(s1.worst.pctOfImprovement, 0)}%`,
      statLabel: `of ${s1.worst.name}'s required sink improvement, burnt (5%/yr, 2030)`,
      text: `Four countries carry ${fmt(s1.top4FireSharePct, 0)}% of EU fire but ${fmt(s1.top4SinkSharePct, 0)}% of the 310 Mt obligation. At the default scenario, fire consumes Spain's entire legally-required 2030 sink improvement — with plenty to spare — while Sweden holds ${fmt(s1.swedenSinkSharePct, 0)}% of the obligation and ${fmt(s1.swedenFireSharePct, 1)}% of the fire. The EU-wide net target quietly socialises a Mediterranean risk.`,
    },
    'disturbance-flexibility': {
      stat: mt(s2.compensableAt5, 0),
      statLabel: 'excludable from compliance 2026-30 (5%/yr) — none of it leaves the air',
      text: `The natural-disturbance machinery can relieve the accounts of the fire's emission terms, but the compounding foregone-removals term (${mt(s2.neverCompensableAt5, 1)} by 2030) has no exclusion route. And Article 13b's own conditions void the 178 Mt mechanism once the Union misses 310 Mt by more than the 20 Mt evidence valve — at ≈${s2.voidThreshold !== null ? fmt(s2.voidThreshold, 1) : '—'}%/yr on the reference path. Insurance that cancels itself in the scenarios it was written for.`,
    },
    prevention: {
      stat: `€${fmt(s3.marginalEurPerT, 0)}/t`,
      statLabel: `implied cost of prevention — ${fmt(s3.cheaperBy, 0)}× cheaper than engineered removals`,
      text: `One avoided hectare keeps ~${fmt(s3.lifecycleTco2, 0)} tCO₂ in the ground. At published treatment costs and deliberately conservative leverage, that prices fire prevention at ~€${fmt(s3.marginalEurPerT, 0)}/t against the €400/t removals the module otherwise books — and holding growth at 0% instead of 5% costs ~€${fmt(s3.programmeCostBn, 1)} bn/yr versus €${fmt(s3.programmeRemovalsBn, 0)} bn/yr for the same tonnes bought back. No EU instrument funds it as mitigation.`,
    },
    hindcast: {
      stat: `${fmt(s4.sharePct, 0)}–${fmt(s4.shareExcl2017Pct, 0)}%`,
      statLabel: `of the observed ${mt(s4.observedDecline, 0)} sink decline explained by fire`,
      text: `Run backwards over 2006-2024, the cohort model attributes only a small share of the sink's observed collapse to fire — harvest, ageing and drought did the damage. That honesty is load-bearing: the forward projections are additional to the sink's existing problems, not a relabelling of them. Meanwhile the 2025 fire drag (${mt(s4.drag2025, 0)}) is the largest in the record. The past validates the model; the endpoint arms it.`,
    },
    'crcf-reversal': {
      stat: `${fmt(s5.reversedShareAt5, 0)}%`,
      statLabel: 'of certified carbon-farming units reversed by fire alone (default scenario)',
      text: `A 5 Mha certified forest portfolio loses ${fmt(s5.reversedShareAt5, 0)}% of credited units to fire in expectation over 20 years at 5%/yr — most of a standard ${s5.typicalBuffer[0]}-${s5.typicalBuffer[1]}% registry buffer before any other reversal cause is counted, and beyond it entirely at the high presets. CRCF buffer pools sized on the 2010s fire regime under-insure the certificates now being written against the 2040s regime.`,
    },
    natura2000: {
      stat: `${fmt(s6.ratio2025, 1)}×`,
      statLabel: 'the burn rate inside Natura 2000 vs outside, 2025',
      text: `Protected land — ~19% of EU territory — carried 39% of the 2025 burnt area. At the default scenario, ${ha(s6.cumN2kBurnt2040At5Ha)} of Natura 2000 land burns cumulatively by 2040 (${fmt(s6.cumShareOfNetwork2040At5, 1)}% of the network), carrying ${mt(s6.lossOnN2k2040At5)} of the sink loss — while the Nature Restoration Regulation's obligations concentrate on the same hectares. No instrument requires restoration plans to be fire-resilient.`,
    },
    'fwi-scenarios': {
      stat: `${fmt(s7.loPctAt2C, 1)}–${fmt(s7.hiPctAt2C, 1)}%/yr`,
      statLabel: 'the climate-consistent dial range at 2 °C by 2050',
      text: `Mapped onto the module's dial (crediting warming already absorbed), the published climate-fire projections support ≈${fmt(s7.loPctAt2C, 1)}–${fmt(s7.hiPctAt2C, 1)}%/yr — making 2.5%/yr the climate-consistent central preset, the 5%/yr default a claim about fuel and abandonment amplifying the climate signal, and 0%/yr an assertion of management success, not a neutral case. The gap up to the observed ${fmt(s7.recentTrendPct, 0)}%/yr trend is the honest uncertainty, and it is a research gap with an owner missing.`,
    },
  };
  return map;
}

/** How each analysis enters the Policy Gap report, in the report's own terms. */
const REPORT_ROUTES: { title: string; body: string; analyses: string[] }[] = [
  {
    title: 'Candidate gap rows for the tracker',
    body:
      'A1, A2, A5 and A6 each state a falsifiable gap in the report\'s own four-type taxonomy: the sink targets carry no disturbance-risk margin (ambition gap); the disturbance flexibilities relieve accounts, not the atmosphere, and void themselves under stress (inconsistency); CRCF buffer sizing is backward-looking (policy gap); restoration and fire management are unreconciled on the same land (implementation gap). Each can be drafted as a candidate row in the summer-prep sector-gaps format — falsifiable test, status, sources.',
    analyses: ['member-states', 'disturbance-flexibility', 'crcf-reversal', 'natura2000'],
  },
  {
    title: 'A fire indicator for the Ch. 9 set',
    body:
      'The report\'s LULUCF progress indicators do not track fire, although fire moves the chapter\'s load-bearing variable. Annual EFFIS burnt area against the embedded ~550k ha baseline, CAMS wildfire CO₂, and the Natura 2000 burnt share (published as a series, not a one-off) are all open Copernicus data — the same feeds this module already consumes live.',
    analyses: ['hindcast', 'natura2000'],
  },
  {
    title: 'A "sink under disturbance risk" box for the LULUCF chapter',
    body:
      'The parent module\'s honest-denominator table (fire takes back ~44% of the planned sink improvement at 5%/yr) plus A7\'s calibration (which growth rates the climate literature supports) is a report-ready framing: a risk margin argument, not a projection. A4\'s hindcast supplies the credibility footnote — fire did not cause the sink\'s past decline, which is exactly why the forward risk is additional.',
    analyses: ['fwi-scenarios', 'hindcast'],
  },
  {
    title: 'A costed recommendation: fund prevention as mitigation',
    body:
      'A3 turns the module\'s arithmetic into the report\'s sharpest possible recommendation shape: an abatement cost. Prevention at ~€40/t versus removals at €400/t, with the legal hook already in place — Article 13b makes vulnerability reduction a precondition for disturbance flexibility while no EU instrument funds it. The leverage evidence gap (treated-to-avoided ratio) is itself a named research recommendation.',
    analyses: ['prevention', 'disturbance-flexibility'],
  },
];

function AnalysisCard({ a, f }: { a: AnalysisMeta; f: { stat: string; statLabel: string; text: string } }) {
  return (
    <Link
      href={`/beta/wildfire-sink-risk/analyses/${a.slug}`}
      className="group flex flex-col rounded-lg border border-grey-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <span className="rounded bg-accent-red px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{a.code}</span>
        <span
          className="rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em]"
          style={{ color: GAP_TYPE_COLORS[a.gapType], borderColor: GAP_TYPE_COLORS[a.gapType] }}
        >
          {a.gapType}
        </span>
      </div>
      <h3 className="mt-3 text-[16px] font-bold leading-snug text-tertiary-dark group-hover:text-primary">
        {a.title}
      </h3>
      <div className="mt-3 font-mono text-[24px] font-bold leading-none tabular-nums text-accent-red">{f.stat}</div>
      <div className="mt-1 text-[11px] font-semibold text-tertiary-dark">{f.statLabel}</div>
      <p className="mt-3 flex-1 text-[12px] leading-relaxed text-tertiary">{f.text}</p>
      <div className="mt-4 text-[11.5px] font-semibold text-primary">Open the analysis →</div>
    </Link>
  );
}

export default function AnalysesOverviewPage() {
  const F = findings();
  const s2 = a2();
  const s3 = a3();
  const s4 = a4();

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />

      <div className="border-b border-grey-200 bg-gradient-to-b from-[#FDF3F3] to-white">
        <div className="mx-auto max-w-content px-6 py-14">
          <nav className="mb-4 flex items-center gap-2 text-[11px] font-semibold text-tertiary">
            <Link href="/beta/wildfire-sink-risk" className="hover:text-primary hover:underline">
              M · 41 Wildfires &amp; the land sink
            </Link>
            <span aria-hidden>→</span>
            <span className="text-tertiary-dark">Analyses</span>
          </nav>
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded bg-accent-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              M · 41 — beta
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary">
              Seven analyses · one synthesis
            </span>
          </div>
          <h1 className="max-w-3xl text-[38px] font-bold leading-[1.12] text-tertiary-dark">
            The parent module prices the fire.{' '}
            <span className="text-accent-red">These seven pages ask who pays, who is insured, and what honesty
            costs.</span>
          </h1>
          <p className="mt-5 max-w-text text-[15px] leading-relaxed text-tertiary">
            Each analysis below runs the module&apos;s own cohort machinery into one policy question it could not
            answer as a single EU-wide pool: geography (A1), accounting law (A2), prevention economics (A3), the past
            (A4), certification (A5), protected land (A6) and calibration (A7). Every headline number on this page is
            computed live from the same models as the pages themselves, at the parent module&apos;s defaults, so this
            summary cannot drift from what it summarises.
          </p>
          <p className="mt-3 max-w-text text-[13px] leading-relaxed text-tertiary">
            Status inherits from the parent module: beta, illustrative arithmetic, not an ESABCC position, not
            suitable for citation as a quantitative finding. The point of the seven pages is to show which{' '}
            <em>questions</em> the arithmetic can carry into the next Policy Gap report — and to be checkable while
            doing it.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-content px-6">
        <section className="py-12">
          <div className="mb-6 max-w-text">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-orange">The findings</div>
            <h2 className="text-[24px] font-bold leading-tight text-tertiary-dark">Seven questions, seven computed answers</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ANALYSES.map((a) => (
              <AnalysisCard key={a.slug} a={a} f={F[a.slug]} />
            ))}
          </div>
        </section>

        <section className="border-t border-grey-200 py-12">
          <div className="mb-6 max-w-text">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-orange">The synthesis</div>
            <h2 className="text-[24px] font-bold leading-tight text-tertiary-dark">What the seven add up to</h2>
          </div>
          <div className="max-w-text space-y-4 text-[14px] leading-relaxed text-tertiary">
            <p>
              <strong className="text-tertiary-dark">The risk is real but mis-located.</strong> Fire has not caused
              the sink&apos;s decline to date (A4: {fmt(s4.sharePct, 0)}-{fmt(s4.shareExcl2017Pct, 0)}% of it) — but it
              is concentrated on exactly the assets the 2030-2050 architecture leans on hardest: the Mediterranean
              Member States whose Annex IIa improvements it consumes outright (A1), the certified removals meant to
              rebuild the sink (A5), and the protected sites carrying the restoration agenda (A6).
            </p>
            <p>
              <strong className="text-tertiary-dark">The legal machinery manages ledgers, not landscapes.</strong>{' '}
              The disturbance flexibilities can move {mt(s2.compensableAt5, 0)} off the compliance books in 2026-30
              while removing nothing from the atmosphere, have no route at all for the compounding foregone-removals
              term, and switch themselves off in the scenarios where fire breaks the Union target (A2). Meanwhile the
              one intervention that operates on the physical risk — fuel management at ~€{fmt(s3.marginalEurPerT, 0)}/t
              (A3) — is a legal precondition for those flexibilities and is funded by no EU climate instrument.
            </p>
            <p>
              <strong className="text-tertiary-dark">The uncertainty is honest and now bounded.</strong> The climate
              literature supports low single-digit growth in burnt area; the recent record suggests early double
              digits (A7). The module&apos;s spread of scenarios is not evasion — it is the calibrated statement that
              the difference between those two numbers (fuel, abandonment, ignition, variance) is unmeasured, and
              measuring it is itself a recommendation the report can make.
            </p>
          </div>
        </section>

        <section className="border-t border-grey-200 py-12">
          <div className="mb-6 max-w-text">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-orange">
              Into the Policy Gap report
            </div>
            <h2 className="text-[24px] font-bold leading-tight text-tertiary-dark">
              Four concrete routes, in the report&apos;s own taxonomy
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-tertiary">
              The 2024 report classifies every finding as a policy gap, ambition gap, implementation gap or
              inconsistency (<Link href="/beta/policy-gaps" className="font-semibold text-primary hover:underline">the
              tracker</Link> carries all of them). These are the shapes in which this module&apos;s arithmetic —
              hardened where the analyses above say it needs hardening — can enter Policy Gap Report 2.0.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {REPORT_ROUTES.map((r) => (
              <div key={r.title} className="rounded-lg border border-grey-200 bg-white p-5">
                <h3 className="text-[15px] font-bold text-tertiary-dark">{r.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-tertiary">{r.body}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.analyses.map((slug) => {
                    const a = ANALYSES.find((x) => x.slug === slug)!;
                    return (
                      <Link
                        key={slug}
                        href={`/beta/wildfire-sink-risk/analyses/${slug}`}
                        className="rounded bg-grey-100 px-2 py-0.5 font-mono text-[10px] font-bold text-tertiary-dark hover:bg-surface-blue hover:text-primary"
                      >
                        {a.code} {a.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="border-t border-grey-200 py-6 text-[11.5px] leading-relaxed text-tertiary">
          <strong className="text-tertiary-dark">Status.</strong> Beta analyses under M · 41, illustrative arithmetic
          only. Not an ESABCC position, not projections, not suitable for citation as quantitative findings. Data
          provenance (EFFIS API snapshots, Official Journal texts) is documented in{' '}
          <code className="text-[10.5px]">analyses/data.ts</code> and in each analysis&apos;s model file.
        </p>
      </div>

      <SiteFooter />
    </div>
  );
}
