'use client';

/**
 * Ex-Post Policy Assessment — beta module page.
 *
 * A faithful, interactive rendering of the internal scoping note
 * "Ex-Post Policy Assessment — Methods Scoping Note" (working brief for
 * Policy Gap Report 2.0). The note's core argument is that ex-post method
 * selection is driven by *counterfactual availability*, not by the
 * mitigation/adaptation split — so the page is organised around a two-axis
 * design grid (domain × counterfactual) rather than by domain.
 *
 * Everything here — the grid, the per-instrument identification strategies,
 * the cleanliness ratings, the adaptation layers, the five design rules and
 * the method references — is taken from the scoping note. Where the note
 * gives a table, it is re-drawn so the content is searchable and on-brand.
 *
 * Nothing is invented: labels, ratings and one-line justifications are
 * quoted/condensed straight from the brief.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* --------------------------------------------------------------- content
 * All strings below are quoted/condensed straight from the scoping note.
 * ----------------------------------------------------------------------- */

type Domain = 'mitigation' | 'adaptation';
type Lead = 'quant' | 'qual' | 'mixed' | 'tooNew';

/* ---- the two-axis design grid (the spine of the note) ---------------- */

type GridCell = {
  domain: Domain;
  counterfactual: boolean;
  instruments: string[];
};

const GRID: GridCell[] = [
  {
    domain: 'mitigation',
    counterfactual: true,
    instruments: ['EU ETS (ETS1)', 'CO₂ car/van standards', 'F-gas', 'RED (scheme-design)'],
  },
  {
    domain: 'adaptation',
    counterfactual: true,
    instruments: ['Floods Directive (post-event)', 'EU Solidarity Fund'],
  },
  {
    domain: 'mitigation',
    counterfactual: false,
    instruments: ['ESR', 'LULUCF', 'EED', 'EPBD', 'RED headline target'],
  },
  {
    domain: 'adaptation',
    counterfactual: false,
    instruments: ['Adaptation Strategy', 'Climate-ADAPT', 'Mainstreaming', 'Adaptation Mission'],
  },
];

/* ---- mitigation: quant ex-post by instrument ------------------------- */

type Cleanliness = 'strong' | 'moderate' | 'weak-moderate' | 'weak' | 'na';

type MitRow = {
  instrument: string;
  quant: string;
  identification: string;
  cleanliness: Cleanliness;
  cleanNote: string;
  qual: string;
};

const MITIGATION: MitRow[] = [
  {
    instrument: 'EU ETS (ETS1)',
    quant: 'Installation emissions, abatement, investment, patents',
    identification: 'Matched DiD / RD around the ~20 MW threshold; regulated vs unregulated installations',
    cleanliness: 'strong',
    cleanNote: 'Strong (installation level)',
    qual: 'Leakage, general-equilibrium price effect, expectations, mechanism',
  },
  {
    instrument: 'CO₂ standards (cars/vans)',
    quant: 'Fleet-average CO₂, EV share',
    identification: 'Bunching at mass-based manufacturer targets; phase-in years; pooling variation',
    cleanliness: 'strong',
    cleanNote: 'Strong (bunching near-textbook)',
    qual: 'Real-world vs type-approval gap, supply strategy',
  },
  {
    instrument: 'F-gas / Methane Reg',
    quant: 'Sectoral emissions, quota phase-down',
    identification: 'Phase-down step timing; quota allocation',
    cleanliness: 'moderate',
    cleanNote: 'Moderate',
    qual: 'Enforcement heterogeneity',
  },
  {
    instrument: 'RED (III)',
    quant: 'RES shares, deployment, auction realisation',
    identification: 'Within-country scheme switches (FiT → auction → quota); auction-level data; cross-MS staggering',
    cleanliness: 'moderate',
    cleanNote: 'Moderate (headline target weak — all MS treated; scheme-design variation exploitable)',
    qual: 'Permitting, social acceptance',
  },
  {
    instrument: 'EED',
    quant: 'Measured energy savings',
    identification: 'Deemed-savings audits; quasi-experimental programme evaluation',
    cleanliness: 'weak-moderate',
    cleanNote: 'Weak–moderate (efficiency gap: engineering ≠ measured)',
    qual: 'Rebound, additionality, behavioural channel',
  },
  {
    instrument: 'EPBD',
    quant: 'Renovation rate, building consumption',
    identification: 'MEPS / mandate discontinuities; EPC-band RD',
    cleanliness: 'weak-moderate',
    cleanNote: 'Weak–moderate (contestable baselines)',
    qual: 'Split incentives, why renovations stall',
  },
  {
    instrument: 'ESR',
    quant: 'National non-ETS emissions vs trajectory',
    identification: '— every MS treated; synthetic-control donor pool starved',
    cleanliness: 'weak',
    cleanNote: 'Weak → contribution analysis',
    qual: 'Almost all causal claims',
  },
  {
    instrument: 'LULUCF',
    quant: 'Net sink vs reference level',
    identification: 'Accounting vs forest reference level (FRL)',
    cleanliness: 'weak',
    cleanNote: 'Weak (natural variability swamps policy)',
    qual: 'Management vs weather attribution',
  },
  {
    instrument: 'CBAM / ETS2 / SCF',
    quant: '—',
    identification: 'Too new — operational 2026+',
    cleanliness: 'na',
    cleanNote: 'n/a now',
    qual: 'Ex-ante / implementation readiness only',
  },
];

const CLEAN_STYLE: Record<Cleanliness, { label: string; cls: string; dot: string }> = {
  strong: { label: 'Strong', cls: 'bg-surface-green text-secondary-dark border-secondary-lighter', dot: 'bg-secondary' },
  moderate: { label: 'Moderate', cls: 'bg-surface-blue text-primary-dark border-primary-lighter', dot: 'bg-primary-light' },
  'weak-moderate': { label: 'Weak–mod.', cls: 'bg-surface-yellow text-tertiary-dark border-accent-orange', dot: 'bg-accent-orange' },
  weak: { label: 'Weak', cls: 'bg-surface-orange text-accent-red border-accent-orange', dot: 'bg-accent-red' },
  na: { label: 'n/a', cls: 'bg-grey-100 text-tertiary border-grey-300', dot: 'bg-grey-400' },
};

/* ---- adaptation: why quant ex-post breaks ---------------------------- */

const ADAPT_BREAKS: { head: string; body: string }[] = [
  {
    head: 'Non-stationary baseline',
    body: 'The outcome is avoided damage against a moving baseline — the climate being adapted to is itself shifting, so there is no stable "no-policy world" to difference against.',
  },
  {
    head: 'Hazard × exposure × vulnerability',
    body: 'Realised damage is a product of all three; a quiet-hazard year is indistinguishable from a real resilience gain.',
  },
  {
    head: 'Binding tests are rare extreme events',
    body: 'Absence of disaster ≠ success. A well-adapted system and an untested one look identical in the short run.',
  },
  {
    head: 'No tCO₂e, intensely local',
    body: 'Context-dependent by construction; available metrics (capacity indices, mainstreaming counts, plans adopted) measure process/output, not outcome.',
  },
  {
    head: 'Maladaptation and lock-in',
    body: 'These surface only on horizons where attribution is already hopeless.',
  },
];

/* ---- adaptation: construction by layer ------------------------------- */

const ADAPT_LAYERS: { n: string; title: string; body: string }[] = [
  {
    n: '1',
    title: 'Spine — theory-based contribution analysis',
    body: 'Reconstruct the adaptation theory of change (EU Strategy 2021 → national strategies/plans under Governance Reg Art. 4 → mainstreaming → decisions changed → capacity built → damage reduced). Test the upstream links now: did mainstreaming change investment/planning decisions, or just produce documents? Answerable today; "did damage fall" is not.',
  },
  {
    n: '2',
    title: 'Realist evaluation (CMO) leads here',
    body: 'More than for mitigation — the same instrument lands in radically different hazard/governance contexts. The question is never "did the Strategy work" but "what built resilience, for whom, under what hazard and institutional conditions." The differential pattern across contexts is the finding.',
  },
  {
    n: '3',
    title: 'Process tracing on concrete decisions',
    body: 'A handful of decisions where the instrument should have bitten — a Cohesion-funded infrastructure choice, a city plan, a CAP measure — to show the mechanism or its absence at decision level.',
  },
  {
    n: '4',
    title: 'Case selection on hazard–exposure variation',
    body: 'Select on variation, not representativeness, to capture both tested and untested systems.',
  },
];

/* ---- adaptation: instrument mapping ---------------------------------- */

type AdaptRow = { instrument: string; lead: string; notes: string; island?: boolean };

const ADAPTATION: AdaptRow[] = [
  {
    instrument: 'EU Adaptation Strategy (2021) + national strategies/plans',
    lead: 'Contribution analysis + realist',
    notes: 'Mainstreaming depth & capacity assessed now; outcome deferred.',
  },
  {
    instrument: 'Climate-ADAPT',
    lead: 'Process / utilisation evaluation',
    notes: 'Did the platform change decisions — usage ≠ impact.',
  },
  {
    instrument: 'Mainstreaming (CAP, Cohesion / ESIF)',
    lead: 'Process tracing + realist',
    notes: 'Trace whether climate-proofing changed actual project selection.',
  },
  {
    instrument: 'Adaptation Mission (Horizon)',
    lead: 'Theory-based, formative',
    notes: 'Too early for outcomes; assess pathway plausibility.',
  },
  {
    instrument: 'Floods Directive (2007/60)',
    lead: 'Mixed — quant island',
    notes: 'Defence CBA, return-period engineering, and post-event damage: protected vs unprotected reaches = the rare natural experiment.',
    island: true,
  },
  {
    instrument: 'EU Solidarity Fund',
    lead: 'Quant-tractable',
    notes: 'Disbursement, speed, damage data — but disaster response, adaptation only loosely.',
    island: true,
  },
];

/* ---- the five design rules (the deliverable's spine) ----------------- */

const RULES: { n: string; head: string; body: string }[] = [
  {
    n: '1',
    head: 'Lead quant only where exploitable treatment variation exists',
    body: 'Installation thresholds, manufacturer-target bunching, scheme-design switches. This clusters in mitigation but excludes ESR, LULUCF and the deemed-savings directives.',
  },
  {
    n: '2',
    head: 'Lead theory-based qual everywhere else',
    body: 'All of adaptation plus a meaningful chunk of mitigation.',
  },
  {
    n: '3',
    head: 'Pre-register the quant window you do have',
    body: 'In both domains — GE/leakage modelling for ETS, post-event damage comparison for adaptation — so the dominant method never becomes the only method.',
  },
  {
    n: '4',
    head: 'Always reconstruct the theory of change first',
    body: 'Then derive criterion-based questions (effectiveness, efficiency, relevance, coherence, EU added value), then map confirming/disconfirming evidence per causal link before collecting. The mapping step is the one people skip and regret — it is what stops interviews becoming a search for confirmation.',
  },
  {
    n: '5',
    head: 'Rigour = triangulation + explicit evidence→conclusion chain + active hunt for rival explanations',
    body: 'Seriously trying to falsify your own contribution story is the qualitative analogue of showing your regression.',
  },
];

/* ---- per-instrument one-line justification --------------------------- */

const JUSTIFY: { instrument: string; lead: Lead; line: string }[] = [
  { instrument: 'ETS1', lead: 'quant', line: 'DiD/RD on the regulation threshold is a real identification strategy; quant-led, qual closes leakage/GE/innovation.' },
  { instrument: 'CO₂ standards', lead: 'quant', line: 'Bunching at manufacturer targets is near-textbook quant; quant-led.' },
  { instrument: 'RED', lead: 'mixed', line: 'Headline RES target has no counterfactual (all MS treated); exploit scheme-design switches; mixed, quant-supporting.' },
  { instrument: 'EED / EPBD', lead: 'qual', line: 'Efficiency gap and deemed-savings make quant weak; qual-led with descriptive quant anchoring.' },
  { instrument: 'ESR / LULUCF', lead: 'qual', line: 'No clean counterfactual / natural variability dominates; contribution analysis, not identification.' },
  { instrument: 'CBAM / ETS2 / SCF', lead: 'tooNew', line: 'Too new for ex-post; ex-ante / readiness only.' },
  { instrument: 'Adaptation Strategy / Climate-ADAPT / mainstreaming / Mission', lead: 'qual', line: 'Qual-led (contribution + realist + process tracing); outcome deferred, event-triggered quant pre-committed.' },
  { instrument: 'Floods Directive / Solidarity Fund', lead: 'mixed', line: 'Quant islands; post-event damage comparison is genuine ex-post identification.' },
];

const LEAD_STYLE: Record<Lead, { label: string; cls: string }> = {
  quant: { label: 'Quant-led', cls: 'bg-surface-green text-secondary-dark border-secondary-lighter' },
  qual: { label: 'Qual-led', cls: 'bg-surface-orange text-accent-red border-accent-orange' },
  mixed: { label: 'Mixed', cls: 'bg-surface-blue text-primary-dark border-primary-lighter' },
  tooNew: { label: 'Too new', cls: 'bg-grey-100 text-tertiary border-grey-300' },
};

/* ---- key references by method ---------------------------------------- */

const REFERENCES: { method: string; refs: string }[] = [
  { method: 'Contribution analysis', refs: 'Mayne' },
  { method: 'Process tracing', refs: 'Beach & Pedersen; Bennett (hoop / smoking-gun / doubly-decisive)' },
  { method: 'Realist evaluation (CMO)', refs: 'Pawson & Tilley' },
  { method: 'QCA', refs: 'Set-theoretic, medium-N (member-state level); watch calibration' },
  { method: 'ETS evaluation lineage', refs: 'Colmer, Martin, Wagner; Bayer & Aklin' },
  { method: 'CO₂ standards bunching', refs: 'Reynaert' },
  { method: 'Efficiency gap', refs: 'Fowlie et al. (weatherization)' },
  { method: 'EU framework', refs: 'Better Regulation guidelines; five criteria; "evaluate first"' },
];

/* ---- open scoping decisions ------------------------------------------ */

const OPEN_DECISIONS = [
  'Which instruments are actually in scope for 2.0? (cut tables to these)',
  'For each in-scope instrument: is the identification real, or would it be dressing a judgement in regression clothing?',
  'How many cases can realistically be covered per instrument? (small N kills identification, suits process tracing)',
  'Where is post-period data genuinely available vs absent?',
  'Which event-triggered quant evaluations to pre-commit (and what triggers them)?',
];

/* --------------------------------------------------------------- helpers */

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">{children}</div>;
}

/* ------------------------------------------------------------------ page */

export default function ExPostAnalysisPage() {
  const [domain, setDomain] = useState<'all' | Domain>('all');

  return (
    <>
      <SiteHeader />
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ---- intro ---- */}
        <section className="mb-6">
          <SectionLabel>Beta module · Ex-post evaluation method</SectionLabel>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">Ex-Post Policy Assessment</h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            A working brief for <strong>Policy Gap Report 2.0</strong>: how to choose ex-post evaluation
            methods per EU climate instrument. The selection is driven by{' '}
            <strong>counterfactual availability</strong>, not by the mitigation/adaptation split — and
            this module keeps the M/A boundary and the quant/qual boundary as two different lines on
            purpose.
          </p>
        </section>

        {/* ---- core premise ---- */}
        <section className="mb-10">
          <div className="rounded-lg border border-primary-lighter bg-surface-blue p-5">
            <div className="text-[12px] font-bold uppercase tracking-wide text-primary-dark mb-2">Core premise</div>
            <p className="text-[13px] text-tertiary-dark leading-relaxed max-w-3xl">
              The instinctive split — <em>mitigation → quant, adaptation → qual</em> — is directionally
              right but misleading. The axis that actually determines method is{' '}
              <strong>whether an exploitable counterfactual exists.</strong>
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-secondary-lighter bg-white p-4">
                <div className="text-[12px] font-bold text-secondary-dark mb-1">Lead with quant identification</div>
                <p className="text-[12px] text-tertiary leading-relaxed">
                  Only where there is exploitable treatment variation (an untreated unit, a threshold, a
                  discontinuity, a staggered rollout) <strong>and</strong> a measurable, attributable
                  outcome <strong>and</strong> post-period data.
                </p>
              </div>
              <div className="rounded-lg border border-accent-orange bg-white p-4">
                <div className="text-[12px] font-bold text-accent-red mb-1">Lead with theory-based qual</div>
                <p className="text-[12px] text-tertiary leading-relaxed">
                  Contribution analysis, realist evaluation, process tracing — everywhere else. Method is
                  justified <strong>per instrument on its cell in the grid</strong>, never by domain
                  stereotype.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- the two-axis design grid ---- */}
        <section className="mb-12">
          <SectionLabel>The design grid · two axes, not one</SectionLabel>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-bold text-tertiary-dark">
              Counterfactual availability × domain
            </h2>
            <div className="flex gap-1 rounded-lg border border-grey-200 bg-grey-50 p-0.5 text-[12px]">
              {([
                ['all', 'Both'],
                ['mitigation', 'Mitigation'],
                ['adaptation', 'Adaptation'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDomain(key)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    domain === key ? 'bg-white text-tertiary-dark shadow-sm border border-grey-200' : 'text-tertiary hover:text-tertiary-dark'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-[120px_1fr_1fr] gap-2 min-w-[640px]">
              {/* header row */}
              <div />
              <div className="text-center text-[12px] font-bold uppercase tracking-wide text-primary-dark py-1">Mitigation</div>
              <div className="text-center text-[12px] font-bold uppercase tracking-wide text-accent-orange py-1">Adaptation</div>

              {/* row: counterfactual available */}
              <RowLabel top="Counterfactual" bottom="available" tone="green" />
              {(['mitigation', 'adaptation'] as Domain[]).map((d) => (
                <GridBox
                  key={`cf-${d}`}
                  cell={GRID.find((c) => c.domain === d && c.counterfactual)!}
                  dimmed={domain !== 'all' && domain !== d}
                  tone="green"
                />
              ))}

              {/* row: no clean counterfactual */}
              <RowLabel top="No clean" bottom="counterfactual" tone="orange" />
              {(['mitigation', 'adaptation'] as Domain[]).map((d) => (
                <GridBox
                  key={`nocf-${d}`}
                  cell={GRID.find((c) => c.domain === d && !c.counterfactual)!}
                  dimmed={domain !== 'all' && domain !== d}
                  tone="orange"
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-[12px] text-tertiary italic max-w-3xl">
            Counterfactual-available cases cluster in mitigation but <strong>exclude</strong> ESR, LULUCF
            and the deemed-savings directives. Adaptation is almost entirely qual-led but has its own
            quant islands (post-event damage comparison). The split pre-empts the reviewer objection that
            adaptation was defaulted to &ldquo;soft&rdquo; methods.
          </p>
        </section>

        {/* ---- mitigation table ---- */}
        <section className="mb-12">
          <SectionLabel>Mitigation · quant ex-post by instrument</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">What each &ldquo;clean&rdquo; case actually identifies</h2>
          <p className="text-[13px] text-tertiary mb-4 max-w-3xl">
            The quant number is necessary but not sufficient — it is <em>narrower</em> than the policy
            question. The qual column is what generalises the estimate to &ldquo;did the instrument cut EU
            emissions.&rdquo;
          </p>

          <div className="space-y-2">
            {MITIGATION.map((r) => {
              const c = CLEAN_STYLE[r.cleanliness];
              return (
                <div key={r.instrument} className="rounded-lg border border-grey-200 bg-white overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-2.5 bg-grey-50 border-b border-grey-200">
                    <span className="text-[13px] font-bold text-tertiary-dark flex-1">{r.instrument}</span>
                    <span className={`inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${c.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                      {c.label}
                    </span>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Quant outcome" value={r.quant} />
                    <Field label="Identification strategy" value={r.identification} />
                    <Field label="Cleanliness" value={r.cleanNote} />
                    <Field label="Qual still required for" value={r.qual} accent />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border-l-4 border-l-primary border border-grey-200 bg-surface-blue p-4">
            <div className="text-[12px] font-bold text-primary-dark mb-1">Discriminating point</div>
            <p className="text-[12px] text-tertiary-dark leading-relaxed">
              The ETS DiD gives the partial-equilibrium effect on regulated installations — silent on
              leakage, the induced price effect on unregulated emissions, and innovation.{' '}
              <strong>Pair every quant island with the modelling/qual that closes that gap.</strong>
            </p>
          </div>
        </section>

        {/* ---- adaptation: why quant breaks ---- */}
        <section className="mb-12">
          <SectionLabel>Adaptation · why quant ex-post breaks</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">Structural, not fixable with better data</h2>
          <p className="text-[13px] text-tertiary mb-4 max-w-3xl">
            Five reasons quantitative identification fails for adaptation outcomes — and the design move
            that follows.
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ADAPT_BREAKS.map((b) => (
              <div key={b.head} className="rounded-lg border border-grey-200 border-l-4 border-l-accent-orange bg-white p-4">
                <div className="text-[13px] font-bold text-tertiary-dark mb-1">{b.head}</div>
                <p className="text-[12px] text-tertiary leading-relaxed">{b.body}</p>
              </div>
            ))}
            <div className="rounded-lg border border-accent-orange bg-surface-orange p-4">
              <div className="text-[12px] font-bold uppercase tracking-wide text-accent-red mb-1">Design move</div>
              <p className="text-[12px] text-tertiary-dark leading-relaxed">
                <strong>Split the evaluand in time.</strong> Assess process and output now, qualitatively;
                defer outcome to a long horizon plus <em>event-triggered</em> quant evaluation.
              </p>
            </div>
          </div>
        </section>

        {/* ---- adaptation: construction by layer ---- */}
        <section className="mb-12">
          <SectionLabel>Adaptation · construction by layer</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-4">Four layers, built from the theory of change up</h2>
          <ol className="space-y-2">
            {ADAPT_LAYERS.map((l) => (
              <li key={l.n} className="flex gap-3 rounded-lg border border-grey-200 bg-white p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-white text-sm font-bold">
                  {l.n}
                </span>
                <div>
                  <div className="text-[13px] font-bold text-tertiary-dark">{l.title}</div>
                  <p className="mt-0.5 text-[12px] text-tertiary leading-relaxed">{l.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- adaptation: instrument mapping ---- */}
        <section className="mb-12">
          <SectionLabel>Adaptation · instrument mapping</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">Lead method per instrument</h2>
          <p className="text-[13px] text-tertiary mb-4 max-w-3xl">
            The asymmetry mirrors mitigation: adaptation has quant islands too. When a hazard strikes you
            get a natural experiment — realised damage across adapted vs unadapted units. The honest
            design <strong>pre-commits to event-triggered quant</strong> rather than abandoning
            quantification.
          </p>
          <div className="space-y-2">
            {ADAPTATION.map((r) => (
              <div
                key={r.instrument}
                className={`rounded-lg border p-4 ${
                  r.island ? 'border-secondary-lighter bg-surface-green' : 'border-grey-200 bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-tertiary-dark">{r.instrument}</div>
                    <p className="mt-0.5 text-[12px] text-tertiary leading-relaxed">{r.notes}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 self-start rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      r.island ? 'border-secondary text-secondary-dark bg-white' : 'border-accent-orange text-accent-red bg-surface-orange'
                    }`}
                  >
                    {r.lead}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- design rules ---- */}
        <section className="mb-12">
          <SectionLabel>Design rules · the deliverable&rsquo;s spine</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-4">Five rules that drive method selection</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {RULES.map((r) => (
              <div key={r.n} className="flex gap-3 rounded-lg border border-grey-200 bg-white p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  {r.n}
                </span>
                <div>
                  <div className="text-[13px] font-bold text-tertiary-dark leading-snug">{r.head}</div>
                  <p className="mt-1 text-[12px] text-tertiary leading-relaxed">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- per-instrument justification ---- */}
        <section className="mb-12">
          <SectionLabel>Per-instrument method justification</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-4">One line each, for the scoping table</h2>
          <div className="overflow-hidden rounded-lg border border-grey-200">
            <table className="w-full text-left">
              <tbody className="divide-y divide-grey-200">
                {JUSTIFY.map((j) => {
                  const s = LEAD_STYLE[j.lead];
                  return (
                    <tr key={j.instrument} className="bg-white">
                      <td className="align-top px-4 py-3 w-[34%]">
                        <div className="text-[13px] font-bold text-tertiary-dark">{j.instrument}</div>
                        <span className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="align-top px-4 py-3 text-[12px] text-tertiary leading-relaxed">{j.line}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- references + open decisions ---- */}
        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div>
            <SectionLabel>Key references by method</SectionLabel>
            <dl className="rounded-lg border border-grey-200 bg-white divide-y divide-grey-200">
              {REFERENCES.map((r) => (
                <div key={r.method} className="px-4 py-2.5">
                  <dt className="text-[12px] font-bold text-tertiary-dark">{r.method}</dt>
                  <dd className="text-[12px] text-tertiary">{r.refs}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <SectionLabel>Open scoping decisions · fill before drafting 2.0</SectionLabel>
            <ul className="rounded-lg border border-grey-200 bg-grey-50 p-4 space-y-2">
              {OPEN_DECISIONS.map((d) => (
                <li key={d} className="flex gap-2 text-[12px] text-tertiary-dark leading-relaxed">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-grey-400 text-[10px] text-grey-400">
                    ☐
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- source note ---- */}
        <section className="mb-4">
          <p className="text-[11px] text-tertiary border-t border-grey-200 pt-4 max-w-3xl">
            Faithful rendering of the internal scoping note{' '}
            <em>&ldquo;Ex-Post Policy Assessment — Methods Scoping Note&rdquo;</em> (working brief for
            Policy Gap Report 2.0). All instrument ratings, identification strategies and one-line
            justifications are taken from the note. Method references: Mayne (contribution analysis);
            Beach &amp; Pedersen and Bennett (process tracing); Pawson &amp; Tilley (realist evaluation);
            Colmer, Martin &amp; Wagner and Bayer &amp; Aklin (ETS); Reynaert (bunching); Fowlie et al.
            (efficiency gap); Better Regulation guidelines.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/* --------------------------------------------------------- sub-components */

function RowLabel({ top, bottom, tone }: { top: string; bottom: string; tone: 'green' | 'orange' }) {
  const cls = tone === 'green' ? 'bg-surface-green text-secondary-dark' : 'bg-surface-orange text-accent-red';
  return (
    <div className={`flex flex-col justify-center rounded-lg px-3 py-3 text-[12px] font-bold leading-tight ${cls}`}>
      <span>{top}</span>
      <span>{bottom}</span>
    </div>
  );
}

function GridBox({ cell, dimmed, tone }: { cell: GridCell; dimmed: boolean; tone: 'green' | 'orange' }) {
  const border = tone === 'green' ? 'border-secondary-lighter' : 'border-accent-orange';
  const chip =
    tone === 'green'
      ? 'border-secondary text-secondary-dark bg-surface-green'
      : 'border-accent-orange text-accent-red bg-surface-orange';
  return (
    <div className={`rounded-lg border ${border} bg-white p-3 transition-opacity ${dimmed ? 'opacity-30' : 'opacity-100'}`}>
      <ul className="flex flex-wrap gap-1.5">
        {cell.instruments.map((it) => (
          <li key={it} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${chip}`}>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${accent ? 'text-accent-orange' : 'text-tertiary-light'}`}>
        {label}
      </div>
      <div className={`text-[12px] leading-relaxed ${accent ? 'text-tertiary-dark' : 'text-tertiary'}`}>{value}</div>
    </div>
  );
}
