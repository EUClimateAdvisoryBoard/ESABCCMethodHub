'use client';

/**
 * Ex-Post Policy Assessment — beta module page.
 *
 * Implements the internal "Ex-Post Policy Assessment — Methods Scoping Note"
 * (working brief for Policy Gap Report 2.0) AND carries out the analysis it
 * scopes:
 *
 *  - MITIGATION → a quantitative ATTRIBUTION analysis. For each instrument
 *    with an exploitable counterfactual, the published causal estimate
 *    (matched DiD / RD at the 20 MW threshold / bunching / generalised
 *    synthetic control) is applied to the relevant emission baseline to
 *    compute attributed Mt CO2e, under a Conservative / Central / High band
 *    drawn from the studies' confidence ranges. The DiD specification is
 *    shown. Instruments without a clean counterfactual (ESR, LULUCF, RED
 *    headline target, EPBD) are handled by contribution analysis, not
 *    identification — and are deliberately NOT summed into the attributable
 *    total.
 *
 *  - ADAPTATION → an intervention-logic / theory-of-change assessment.
 *    The adaptation ToC is reconstructed link by link; each causal link
 *    carries a contribution claim, a process-tracing evidence test
 *    (hoop / smoking-gun / doubly-decisive, after Beach & Pedersen and
 *    Bennett) and a flag for whether it is answerable now or deferred.
 *    Realist CMO configurations show the same instrument landing in
 *    different hazard/governance contexts. The quant islands (Floods
 *    Directive avoided-damage BCRs from JRC PESETA IV; EU Solidarity Fund
 *    disbursements) carry real numbers.
 *
 * Every quantitative figure traces to a cited source (Bayer & Aklin 2020;
 * Dechezleprêtre, Nachtigall & Venmans 2023; Colmer, Martin, Muuls & Wagner
 * 2025; Reynaert 2021; Fowlie, Greenstone & Wolfram 2018; EEA inventories;
 * Eurostat; JRC PESETA IV). Effect sizes and baselines are stated so the
 * attribution arithmetic is fully transparent and reproducible. This is a
 * reduced-form attribution synthesis of the published causal literature, not
 * a re-estimation on microdata.
 */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* ===================================================================== *
 *  SHARED TYPES + HELPERS
 * ===================================================================== */

type Domain = 'mitigation' | 'adaptation';
type Scenario = 'conservative' | 'central' | 'high';
type Confidence = 'strong' | 'moderate' | 'weak';

const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: 'conservative', label: 'Conservative' },
  { key: 'central', label: 'Central' },
  { key: 'high', label: 'High' },
];

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">{children}</div>;
}

const CONF_STYLE: Record<Confidence, { label: string; cls: string; dot: string }> = {
  strong: { label: 'Strong ID', cls: 'bg-surface-green text-secondary-dark border-secondary-lighter', dot: 'bg-secondary' },
  moderate: { label: 'Moderate ID', cls: 'bg-surface-blue text-primary-dark border-primary-lighter', dot: 'bg-primary-light' },
  weak: { label: 'Weak ID', cls: 'bg-surface-orange text-accent-red border-accent-orange', dot: 'bg-accent-red' },
};

/* ===================================================================== *
 *  DESIGN GRID  (the spine of the scoping note)
 * ===================================================================== */

type GridCell = { domain: Domain; counterfactual: boolean; instruments: string[] };

const GRID: GridCell[] = [
  { domain: 'mitigation', counterfactual: true, instruments: ['EU ETS (ETS1)', 'CO₂ car/van standards', 'F-gas', 'RED (scheme-design)'] },
  { domain: 'adaptation', counterfactual: true, instruments: ['Floods Directive (post-event)', 'EU Solidarity Fund'] },
  { domain: 'mitigation', counterfactual: false, instruments: ['ESR', 'LULUCF', 'EED', 'EPBD', 'RED headline target'] },
  { domain: 'adaptation', counterfactual: false, instruments: ['Adaptation Strategy', 'Climate-ADAPT', 'Mainstreaming', 'Adaptation Mission'] },
];

/* ===================================================================== *
 *  MITIGATION — ATTRIBUTION MODEL
 *
 *  effect = causal % reduction the policy caused on its `baselineMt`,
 *  relative to the no-policy counterfactual. attributed Mt = baseline ×
 *  effect. Bands come from the studies' ranges (see `source`).
 *  `tier`: A = identified, summed into the headline attributable total;
 *          B = partial / haircut attribution, shown but NOT summed
 *              (intensity-only or large realisation gap);
 *          C = no clean counterfactual → contribution analysis only.
 * ===================================================================== */

type AttribRow = {
  id: string;
  name: string;
  tier: 'A' | 'B' | 'C';
  design: string;
  designTag: string;
  effect: Record<Scenario, number>; // fraction of baseline
  effectLabel: string;
  baselineMt: number;
  baselineLabel: string;
  confidence: Confidence;
  source: string;
  caveat: string;
};

const ATTRIB: AttribRow[] = [
  {
    id: 'ets',
    name: 'EU ETS (ETS1)',
    tier: 'A',
    designTag: 'Matched DiD + RD (20 MW) · synthetic control',
    design:
      'Matched difference-in-differences and regression discontinuity around the 20 MW rated-thermal-input coverage threshold (regulated vs unregulated installations); generalised synthetic control for the EU-wide aggregate.',
    effect: { conservative: 0.08, central: 0.10, high: 0.15 },
    effectLabel: '−8% to −15% on regulated emissions (central −10%)',
    baselineMt: 1350,
    baselineLabel: '≈1,350 Mt CO₂e ETS-covered (stationary) emissions, mid-2010s',
    confidence: 'strong',
    source:
      'Dechezleprêtre, Nachtigall & Venmans (2023, JEEM): −10% on regulated installations, 2005–2012, no adverse economic effect. Colmer, Martin, Muûls & Wagner (2025, REStud): −14 to −16% in French manufacturing, no leakage. Bayer & Aklin (2020, PNAS): ≈1.2 Gt cumulative 2008–2016 (≈3.8% of EU emissions) via synthetic control.',
    caveat:
      'Partial-equilibrium effect on regulated installations only — silent on the induced price effect on uncovered emissions and on innovation. Verde (2020) survey: no significant leakage. +10% low-carbon patents (Calel & Dechezleprêtre 2016).',
  },
  {
    id: 'fgas',
    name: 'F-gas Regulation (517/2014)',
    tier: 'A',
    designTag: 'Interrupted time series · quota phase-down steps',
    design:
      'Interrupted time-series on the binding HFC quota phase-down steps (2015 → 2018 → 2021 …). The quota is a hard supply cap, so the post-2014 break is largely policy-attributable.',
    effect: { conservative: 0.18, central: 0.25, high: 0.30 },
    effectLabel: '−25% on F-gas emissions, 2014–2022 (EEA)',
    baselineMt: 110,
    baselineLabel: '≈110 Mt CO₂e F-gas emissions at the 2014 peak',
    confidence: 'moderate',
    source:
      'EEA: F-gas emissions peaked in 2014, fell ≈25% (≈100 Mt CO₂e) by 2022 and ≈38% by 2023; HFC supply placed on market −52% in CO₂e (2015–2022). Quota schedule: Reg. (EU) 517/2014 Annex V (2030 = 21% of baseline).',
    caveat:
      'Conservative band reflects the enforcement gap: illegal HFC imports estimated at ≈20–30% of the legal market c. 2018–19 (EIA), which erode the realised atmospheric reduction below the quota implication.',
  },
  {
    id: 'co2cars',
    name: 'CO₂ car/van standards',
    tier: 'B',
    designTag: 'Structural model · bunching · trend break',
    design:
      'Structural demand/supply model around the mass-based target (Reynaert 2021); identifies the causal effect on type-approval CO₂ intensity. The slope-based (linear-in-mass) EU design does not create the notch-bunching seen in Japan/China.',
    effect: { conservative: 0.05, central: 0.09, high: 0.14 },
    effectLabel: 'real-world ≈−5% vs type-approval ≈−14% (the gaming gap)',
    baselineMt: 460,
    baselineLabel: '≈460 Mt CO₂e EU passenger-car tailpipe emissions (illustrative fleet base)',
    confidence: 'moderate',
    source:
      'Reynaert (2021, REStud 88(1)): rated CO₂ fell ≈14% post-announcement but real-world only ≈5% — most of the headline came from test gaming, not abatement; the standard missed its target and was not welfare-improving without stricter enforcement. Fleet g/km: 158 (2007, NEDC) → 95 target (2021); EV share 3% (2019) → ≈22% (2022).',
    caveat:
      'Intensity-identified, not a clean fleet-level Mt estimate: real-world abatement is roughly half the type-approval figure, and absolute attribution needs a fleet-turnover model. Shown, NOT summed into the headline. Pooling (e.g. the Tesla pool) further muddies firm-level attribution.',
  },
  {
    id: 'eed',
    name: 'EED (Art. 7 savings)',
    tier: 'B',
    designTag: 'Deemed-vs-metered realisation haircut',
    design:
      'Deemed engineering savings discounted by an empirical realisation ratio. Best ex-post anchor is the weatherisation RCT: realised savings ≈⅓ of engineering projections.',
    effect: { conservative: 0.35, central: 0.50, high: 0.60 },
    effectLabel: 'realisation ratio ≈0.35–0.60 of deemed savings',
    baselineMt: 60,
    baselineLabel: '≈60 Mt CO₂e of claimed/deemed Art. 7 savings (illustrative)',
    confidence: 'weak',
    source:
      'Fowlie, Greenstone & Wolfram (2018, QJE): RCT, ~30k households — engineering models overstated savings ≈3× (realised ≈⅓), implied ≈$329/tCO₂, negative ROI. EU 2020 efficiency target met (FEC ≈6.9% below target) but largely COVID-driven; 2030 targets ≈18–22% off in 2024.',
    caveat:
      'The realisation ratio is the object being applied — engineering ≠ measured. Rebound (direct residential <30%, space heating mean ≈20%; Sorrell et al. 2009) erodes it further. No clean EU-specific deemed-vs-metered ratio is published — the US RCT is the proxy. Shown, NOT summed.',
  },
  {
    id: 'red',
    name: 'RED (headline RES target)',
    tier: 'C',
    designTag: 'No counterfactual — all MS treated',
    design:
      'The headline RES target has no untreated control (every member state is bound). The exploitable variation is in scheme design (FiT → auction switches), which identifies support-cost efficiency, not the emission counterfactual.',
    effect: { conservative: 0, central: 0, high: 0 },
    effectLabel: 'emission attribution: contribution analysis only',
    baselineMt: 0,
    baselineLabel: 'n/a — quant island is on auction cost, not emissions',
    confidence: 'weak',
    source:
      'RES share: 20% target → 22.1% actual (2020), 24.5% (2023), 42.5% by 2030 (RED III). Scheme-design quant island: German PV auction bids ≈€92/MWh (2015) → ≈€50/MWh (2018–19); offshore zero-subsidy bids 2017 (AURES II). Counterfactual deployment (what would have been built anyway) is unidentified.',
    caveat:
      'Auction price falls combine technology cost decline + competition + aggressive bidding — not attributable to the mechanism alone. Realisation rates vary (German solar ≈90%+, post-2017 onshore wind problematic).',
  },
  {
    id: 'epbd',
    name: 'EPBD (renovation)',
    tier: 'C',
    designTag: 'EPC-band RD · contestable baselines',
    design:
      'EPC-band regression discontinuity identifies a price signal, not an emission effect; renovation-rate baselines are contestable. Treated as contribution analysis for emissions.',
    effect: { conservative: 0, central: 0, high: 0 },
    effectLabel: 'emission attribution: contribution analysis only',
    baselineMt: 0,
    baselineLabel: 'n/a — renovation rate far below the policy ambition',
    confidence: 'weak',
    source:
      'Renovation rate ≈1%/yr overall, deep renovation ≈0.2%/yr — vs the ≈3%/yr (≈15×) implied by climate neutrality. EPC-band RD: +0.8–2.5% sale price for a higher band (England); null in Norway. Renovation Wave aims to double the rate.',
    caveat: 'Split incentives and why renovations stall are the binding questions; absolute emission attribution is not credibly identified.',
  },
  {
    id: 'esr',
    name: 'ESR (Effort Sharing)',
    tier: 'C',
    designTag: 'No untreated control — confounded',
    design:
      'Every member state is treated with a binding trajectory; there is no control group. The 2020 over-achievement coincides with the 2008–09 crisis and the 2020 COVID shock. Contribution analysis against modelled WEM/WAM baselines, not identification.',
    effect: { conservative: 0, central: 0, high: 0 },
    effectLabel: 'emission attribution: contribution analysis only',
    baselineMt: 0,
    baselineLabel: 'n/a — synthetic-control donor pool starved',
    confidence: 'weak',
    source:
      'ESD 2020: non-ETS emissions −16.3% vs 2005 (target −10%) — over-achieved ≈6pp, all MS met annual obligations. ESR 2030 (−40% vs 2005): WAM projections reach ≈−38% (≈46 Mt / 2pp gap); off-track MS include Ireland (gap >16pp), Germany, Austria, Estonia, Malta, Sweden (EEA 2024).',
    caveat: 'Recession/COVID confounding makes clean attribution of the reduction to the ESD specifically impossible.',
  },
  {
    id: 'lulucf',
    name: 'LULUCF (net sink)',
    tier: 'C',
    designTag: 'Natural variability swamps the signal',
    design:
      'The annual sink swings with weather, fire and insect outbreaks; this interannual variability swamps the policy signal, so ex-post attribution of management policy is unreliable. Accounting vs forest reference level, not identification.',
    effect: { conservative: 0, central: 0, high: 0 },
    effectLabel: 'emission attribution: contribution analysis only',
    baselineMt: 0,
    baselineLabel: 'n/a — management vs weather inseparable ex post',
    confidence: 'weak',
    source:
      'EU net sink fell ≈322 Mt CO₂e (2013) → 249 (2019) → 230 (2022) → 198 (2023) — ≈30% decline, vs the −310 Mt 2030 target (gap >110 Mt, widening). Drivers: increased harvest, ageing forests, drought / bark-beetle / wildfire disturbances.',
    caveat: 'Declining sink is driven by factors largely outside annual policy control; the policy signal is not separable from natural variability.',
  },
];

/* ===================================================================== *
 *  ADAPTATION — INTERVENTION LOGIC / THEORY OF CHANGE
 * ===================================================================== */

type EvidenceTest = 'hoop' | 'smoking-gun' | 'doubly-decisive' | 'straw';

const TEST_STYLE: Record<EvidenceTest, { label: string; cls: string; tip: string }> = {
  hoop: { label: 'Hoop', cls: 'bg-surface-blue text-primary-dark border-primary-lighter', tip: 'Necessary, not sufficient — failing it kills the claim; passing gives only weak support.' },
  'smoking-gun': { label: 'Smoking-gun', cls: 'bg-surface-green text-secondary-dark border-secondary-lighter', tip: 'Sufficient, not necessary — passing strongly confirms; failing does not kill the claim.' },
  'doubly-decisive': { label: 'Doubly-decisive', cls: 'bg-surface-teal text-secondary-dark border-secondary', tip: 'Both necessary and sufficient — rare; passing confirms and disconfirms rivals at once.' },
  straw: { label: 'Straw-in-the-wind', cls: 'bg-grey-100 text-tertiary border-grey-300', tip: 'Weak either way — slightly adjusts confidence; neither confirms nor kills.' },
};

type ToCLink = {
  stage: string;
  from: string;
  to: string;
  claim: string;
  test: EvidenceTest;
  testWhat: string;
  now: boolean; // answerable now vs deferred
};

const TOC_LINKS: ToCLink[] = [
  {
    stage: 'Inputs → Activities',
    from: 'EU Adaptation Strategy (2021), LIFE / Horizon Mission / Cohesion funding, Climate-ADAPT knowledge base',
    to: 'National adaptation strategies & plans adopted under Governance Reg. Art. 4; mainstreaming requirements written into CAP & Cohesion',
    claim: 'The EU framework caused member states to adopt plans and write climate-proofing requirements into spending programmes.',
    test: 'hoop',
    testWhat: 'Did a national strategy/plan and a climate-proofing requirement actually exist and post-date the EU instrument? (If not, the chain breaks here.)',
    now: true,
  },
  {
    stage: 'Activities → Outputs',
    from: 'Plans adopted; climate-proofing checks mandated; Climate-ADAPT published',
    to: 'Checks applied to real projects; platform used by decision-makers; capacity built in administrations',
    claim: 'The requirements were operationalised — checks were run on actual projects, not just published as guidance.',
    test: 'hoop',
    testWhat: 'Usage/application evidence: were checks demonstrably applied and the platform demonstrably consulted? Usage ≠ impact, but absence kills the next link.',
    now: true,
  },
  {
    stage: 'Outputs → Outcomes',
    from: 'Climate-proofing checks applied; risk information available',
    to: 'Investment & planning decisions actually changed (a project re-sited, re-designed, or rejected on climate-risk grounds)',
    claim: 'Mainstreaming changed concrete decisions — the mechanism bit at the point of choice.',
    test: 'smoking-gun',
    testWhat: 'A documented decision that was re-designed or rejected citing the climate-risk assessment (a Cohesion-funded infrastructure choice, a city plan, a CAP measure). Finding one strongly confirms the mechanism.',
    now: true,
  },
  {
    stage: 'Outcomes → Impacts',
    from: 'Decisions changed; risk-informed infrastructure & capacity in place',
    to: 'Reduced vulnerability and, ultimately, reduced realised damage when a hazard strikes',
    claim: 'The changed decisions reduced realised damage relative to the no-adaptation world.',
    test: 'doubly-decisive',
    testWhat: 'Event-triggered: when a hazard hits, compare realised damage in adapted vs unadapted units (the natural experiment). Deferred — cannot be answered until a binding event occurs.',
    now: false,
  },
];

/* ---- realist CMO configurations -------------------------------------- */

const CMO: { context: string; mechanism: string; outcome: string; tone: 'green' | 'orange' }[] = [
  {
    context: 'High-hazard coastal member state, strong institutions, ring-fenced funding',
    mechanism: 'Mainstreaming requirement triggers a risk-informed investment appraisal that planners act on',
    outcome: 'Defences built / infrastructure re-sited — decisions demonstrably changed',
    tone: 'green',
  },
  {
    context: 'Lower-capacity inland region, quiet recent hazard record, weak enforcement',
    mechanism: 'Plan adopted to satisfy the reporting obligation; no appraisal capacity to act on it',
    outcome: 'Documents produced, decisions unchanged — output without outcome',
    tone: 'orange',
  },
];

/* ---- adaptation quant islands (real numbers) ------------------------- */

const ADAPT_QUANT: { name: string; method: string; figures: string[]; source: string }[] = [
  {
    name: 'Floods Directive (2007/60) — avoided-damage CBA',
    method: 'Counterfactual avoided-damage modelling + post-event protected-vs-unprotected comparison (the rare natural experiment).',
    figures: [
      'Coastal dyke elevation: European mean benefit–cost ratio 8.3–14.9 (country range 1.6–34.3); ≥83% of coastal flood damage avoidable (JRC PESETA IV / Vousdoukas et al. 2020).',
      'River flood detention: ≈€4 of damage avoided per €1 invested (PESETA IV, 3 °C scenario).',
      'Expected annual river-flood damage ≈€7.8 bn/yr now → ≈€44 bn/yr at 3 °C without adaptation; coastal ≈€1.4 bn/yr → up to ≈€239 bn/yr by 2100.',
    ],
    source: 'JRC PESETA IV (Dottori et al.; Vousdoukas et al., Nature Communications 2020).',
  },
  {
    name: 'EU Solidarity Fund — disbursement data',
    method: 'Disbursement, speed and damage data — disaster response (ex-post relief), only loosely an adaptation instrument.',
    figures: [
      '>€8.2 bn mobilised across 127 events / 24 member states since 2002.',
      'Largest single mobilisation: 2021 floods €718.5 m (Germany €612.6 m); L’Aquila 2009 €493.8 m.',
      'Payout slow: ≈4 months minimum, ≈1 year typical between disaster and payment (ECA criticism).',
    ],
    source: 'European Parliament Fact Sheet; EC Regional Policy; Consilium 2022.',
  },
  {
    name: 'Context — EU losses from weather/climate extremes',
    method: 'Frames the stakes the avoided-damage estimates sit against (EEA).',
    figures: [
      '≈€738 bn cumulative economic losses, EU-27, 1980–2023 (2023 prices).',
      'Less than ≈20% of losses insured (the insurance protection gap), <2% in several eastern MS.',
    ],
    source: 'EEA, Economic losses from weather- and climate-related extremes (2024).',
  },
];

/* ===================================================================== *
 *  DESIGN RULES / JUSTIFICATIONS / REFERENCES
 * ===================================================================== */

const RULES: { n: string; head: string; body: string }[] = [
  { n: '1', head: 'Lead quant only where exploitable treatment variation exists', body: 'Installation thresholds, manufacturer-target bunching, scheme-design switches — clusters in mitigation but excludes ESR, LULUCF and the deemed-savings directives.' },
  { n: '2', head: 'Lead theory-based qual everywhere else', body: 'All of adaptation plus a meaningful chunk of mitigation (the Tier-C instruments above).' },
  { n: '3', head: 'Pre-register the quant window you do have', body: 'GE/leakage modelling for ETS, event-triggered post-event damage comparison for adaptation — so the dominant method never becomes the only method.' },
  { n: '4', head: 'Reconstruct the theory of change first', body: 'Then derive criterion-based questions (effectiveness, efficiency, relevance, coherence, EU added value), then map confirming/disconfirming evidence per causal link before collecting. The mapping step is the one people skip and regret.' },
  { n: '5', head: 'Rigour = triangulation + explicit evidence→conclusion chain + active hunt for rival explanations', body: 'Seriously trying to falsify your own contribution story is the qualitative analogue of showing your regression.' },
];

const REFERENCES: { method: string; refs: string }[] = [
  { method: 'Contribution analysis', refs: 'Mayne' },
  { method: 'Process tracing', refs: 'Beach & Pedersen; Bennett (hoop / smoking-gun / doubly-decisive)' },
  { method: 'Realist evaluation (CMO)', refs: 'Pawson & Tilley' },
  { method: 'QCA', refs: 'Set-theoretic, medium-N (member-state level); watch calibration' },
  { method: 'ETS evaluation lineage', refs: 'Bayer & Aklin (2020); Dechezleprêtre, Nachtigall & Venmans (2023); Colmer, Martin, Muûls & Wagner (2025); Verde (2020)' },
  { method: 'CO₂ standards', refs: 'Reynaert (2021, REStud)' },
  { method: 'Efficiency gap', refs: 'Fowlie, Greenstone & Wolfram (2018, QJE)' },
  { method: 'Flood avoided-damage', refs: 'JRC PESETA IV; Vousdoukas et al. (2020)' },
  { method: 'EU framework', refs: 'Better Regulation guidelines; five criteria; “evaluate first”' },
];

const OPEN_DECISIONS = [
  'Which instruments are actually in scope for 2.0? (cut tables to these)',
  'For each in-scope instrument: is the identification real, or would it be dressing a judgement in regression clothing?',
  'How many cases can realistically be covered per instrument? (small N kills identification, suits process tracing)',
  'Where is post-period data genuinely available vs absent?',
  'Which event-triggered quant evaluations to pre-commit (and what triggers them)?',
];

/* ===================================================================== *
 *  PAGE
 * ===================================================================== */

export default function ExPostAnalysisPage() {
  const [domain, setDomain] = useState<'all' | Domain>('all');
  const [scenario, setScenario] = useState<Scenario>('central');

  const tierA = ATTRIB.filter((r) => r.tier === 'A');
  const tierB = ATTRIB.filter((r) => r.tier === 'B');
  const tierC = ATTRIB.filter((r) => r.tier === 'C');

  const attributableTotal = useMemo(
    () => tierA.reduce((s, r) => s + r.baselineMt * r.effect[scenario], 0),
    [scenario, tierA],
  );
  const partialTotal = useMemo(
    () => tierB.reduce((s, r) => s + r.baselineMt * r.effect[scenario], 0),
    [scenario, tierB],
  );

  return (
    <>
      <SiteHeader />
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ---- intro ---- */}
        <section className="mb-6">
          <SectionLabel>Beta module · Ex-post evaluation & attribution</SectionLabel>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">Ex-Post Policy Assessment</h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            A working analysis for <strong>Policy Gap Report 2.0</strong>. It does two things: for{' '}
            <strong>mitigation</strong> it runs a quantitative <strong>attribution analysis</strong> —
            translating the published causal estimates (DiD, RD at the coverage threshold, bunching,
            synthetic control) into attributed Mt CO₂e; for <strong>adaptation</strong>, where a clean
            counterfactual is structurally unavailable, it works through an{' '}
            <strong>intervention-logic / theory-of-change</strong> with explicit process-tracing evidence
            tests. Method is chosen per instrument by <strong>counterfactual availability</strong>, not by
            the mitigation/adaptation stereotype.
          </p>
        </section>

        {/* ---- design grid ---- */}
        <section className="mb-12">
          <SectionLabel>The design grid · counterfactual availability × domain</SectionLabel>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-bold text-tertiary-dark">Where identification is possible at all</h2>
            <div className="flex gap-1 rounded-lg border border-grey-200 bg-grey-50 p-0.5 text-[12px]">
              {([['all', 'Both'], ['mitigation', 'Mitigation'], ['adaptation', 'Adaptation']] as const).map(([key, label]) => (
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
              <div />
              <div className="text-center text-[12px] font-bold uppercase tracking-wide text-primary-dark py-1">Mitigation</div>
              <div className="text-center text-[12px] font-bold uppercase tracking-wide text-accent-orange py-1">Adaptation</div>
              <RowLabel top="Counterfactual" bottom="available" tone="green" />
              {(['mitigation', 'adaptation'] as Domain[]).map((d) => (
                <GridBox key={`cf-${d}`} cell={GRID.find((c) => c.domain === d && c.counterfactual)!} dimmed={domain !== 'all' && domain !== d} tone="green" />
              ))}
              <RowLabel top="No clean" bottom="counterfactual" tone="orange" />
              {(['mitigation', 'adaptation'] as Domain[]).map((d) => (
                <GridBox key={`nocf-${d}`} cell={GRID.find((c) => c.domain === d && !c.counterfactual)!} dimmed={domain !== 'all' && domain !== d} tone="orange" />
              ))}
            </div>
          </div>
        </section>

        {/* ================= MITIGATION: ATTRIBUTION ================= */}
        <section className="mb-6">
          <SectionLabel>Mitigation · quantitative attribution analysis</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">Attributing emission reductions to policy</h2>
          <p className="text-[13px] text-tertiary max-w-3xl">
            For each instrument with an exploitable counterfactual, the published causal estimate is
            applied to the relevant emission baseline to compute attributed Mt CO₂e. Effect sizes and
            baselines are shown so the arithmetic is reproducible. The band below is set from the studies'
            confidence ranges.
          </p>

          {/* DiD spec + scenario toggle */}
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] items-stretch">
            <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
              <div className="text-[11px] uppercase tracking-wide text-tertiary mb-2">The identification, in one line</div>
              <code className="block text-[13px] text-tertiary-dark font-mono leading-relaxed">
                ln(E<sub>it</sub>) = β·(Regulated<sub>i</sub> × Post<sub>t</sub>) + α<sub>i</sub> + δ<sub>t</sub> + ε<sub>it</sub>
              </code>
              <p className="mt-2 text-[12px] text-tertiary leading-relaxed">
                The DiD coefficient <strong>β</strong> is the causal % effect on regulated installations
                (≈ −0.10 for ETS). Attributed reduction ={' '}
                <span className="font-mono">baseline × |effect|</span>. RD uses the same logic at the{' '}
                <strong>20 MW</strong> coverage threshold; bunching and synthetic control recover the
                counterfactual where no untreated unit exists at the margin.
              </p>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4 flex flex-col justify-center">
              <div className="text-[11px] uppercase tracking-wide text-tertiary mb-2">Estimate band</div>
              <div className="flex gap-1 rounded-lg border border-grey-200 bg-grey-50 p-0.5 text-[12px]">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setScenario(s.key)}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                      scenario === s.key ? 'bg-white text-tertiary-dark shadow-sm border border-grey-200' : 'text-tertiary hover:text-tertiary-dark'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* headline numbers */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat
              big={`${fmt(attributableTotal)}`}
              unit="Mt CO₂e / yr"
              label="Tier-A attributable reduction (ETS + F-gas, summed)"
              tone="green"
            />
            <Stat
              big={`≈${fmt(partialTotal)}`}
              unit="Mt CO₂e / yr"
              label="Tier-B partial attribution (CO₂ standards + EED) — shown, not summed"
              tone="orange"
            />
            <Stat big="1.2 Gt" unit="2008–2016" label="Independent ETS cross-check (Bayer & Aklin, synthetic control)" tone="blue" />
          </div>
        </section>

        {/* Tier A + B attribution cards */}
        <section className="mb-6">
          <div className="text-[12px] font-bold uppercase tracking-wide text-secondary-dark mb-2">
            Tier A — identified attribution (summed)
          </div>
          <div className="space-y-2">
            {tierA.map((r) => <AttribCard key={r.id} row={r} scenario={scenario} />)}
          </div>

          <div className="text-[12px] font-bold uppercase tracking-wide text-accent-red mt-5 mb-2">
            Tier B — partial / haircut attribution (shown, not summed)
          </div>
          <div className="space-y-2">
            {tierB.map((r) => <AttribCard key={r.id} row={r} scenario={scenario} />)}
          </div>
        </section>

        {/* caveats */}
        <section className="mb-8">
          <div className="rounded-lg border-l-4 border-l-accent-red border border-grey-200 bg-surface-orange p-4">
            <div className="text-[12px] font-bold text-accent-red mb-1">Why the total is a floor, not a ledger</div>
            <ul className="space-y-1.5 text-[12px] text-tertiary-dark leading-relaxed">
              <li>• <strong>Partial equilibrium.</strong> Each DiD/RD estimate is the effect on regulated units only — it is silent on the induced price effect on uncovered emissions and on innovation. The ETS general-equilibrium and leakage channels must be modelled separately (Tier-A is the lower-bound installation effect).</li>
              <li>• <strong>Double-counting risk.</strong> Tier-B is kept out of the headline precisely because CO₂ standards (transport) and EED (buildings/industry) partly overlap with each other and with RES deployment; summing them would over-count.</li>
              <li>• <strong>Confounding.</strong> The 2020 over-achievements coincide with the 2008–09 crisis and the COVID shock — which is exactly why ESR/LULUCF are Tier-C contribution analysis, not regression.</li>
            </ul>
          </div>
        </section>

        {/* Tier C: contribution analysis */}
        <section className="mb-12">
          <div className="text-[12px] font-bold uppercase tracking-wide text-tertiary mb-2">
            Tier C — no clean counterfactual → contribution analysis, not identification
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {tierC.map((r) => (
              <div key={r.id} className="rounded-lg border border-grey-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[13px] font-bold text-tertiary-dark">{r.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-tertiary-light border border-grey-300 rounded px-1.5 py-0.5">{r.designTag}</span>
                </div>
                <p className="text-[12px] text-tertiary leading-relaxed">{r.source}</p>
                <p className="mt-1.5 text-[12px] text-accent-red leading-relaxed"><strong>Why no regression:</strong> {r.caveat}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= ADAPTATION: INTERVENTION LOGIC ================= */}
        <section className="mb-6">
          <SectionLabel>Adaptation · intervention logic & contribution analysis</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">Reconstruct the theory of change, test each link</h2>
          <p className="text-[13px] text-tertiary max-w-3xl">
            Adaptation's outcome — avoided damage against a non-stationary baseline — has no stable
            no-policy world to difference against, and binding tests are rare extreme events. So the
            evaluand is <strong>split in time</strong>: assess the upstream links of the intervention
            logic now, qualitatively; defer the outcome to an event-triggered quant evaluation. Each link
            carries a <strong>contribution claim</strong> and a process-tracing <strong>evidence test</strong>.
          </p>
        </section>

        {/* ToC chain */}
        <section className="mb-8">
          <div className="space-y-2">
            {TOC_LINKS.map((l, i) => (
              <div key={l.stage}>
                <div className={`rounded-lg border p-4 ${l.now ? 'border-grey-200 bg-white' : 'border-accent-orange bg-surface-orange'}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-white text-[12px] font-bold">{i + 1}</span>
                    <span className="text-[13px] font-bold text-tertiary-dark">{l.stage}</span>
                    <EvidenceBadge test={l.test} />
                    <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5 border ${l.now ? 'border-secondary-lighter text-secondary-dark bg-surface-green' : 'border-accent-orange text-accent-red bg-white'}`}>
                      {l.now ? 'Answerable now' : 'Deferred · event-triggered'}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] items-center mb-2">
                    <div className="rounded border border-grey-200 bg-grey-50 px-3 py-2 text-[12px] text-tertiary-dark">{l.from}</div>
                    <div className="hidden sm:block text-grey-400 text-lg text-center">→</div>
                    <div className="rounded border border-grey-200 bg-grey-50 px-3 py-2 text-[12px] text-tertiary-dark">{l.to}</div>
                  </div>
                  <p className="text-[12px] text-tertiary-dark leading-relaxed"><strong>Contribution claim:</strong> {l.claim}</p>
                  <p className="mt-1 text-[12px] text-tertiary leading-relaxed"><strong>Test:</strong> {l.testWhat}</p>
                </div>
                {i < TOC_LINKS.length - 1 && <div className="text-center text-grey-400 text-sm leading-none my-0.5">↓</div>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-tertiary italic">
            Evidence tests after Beach &amp; Pedersen and Bennett. Hover a badge for what it does to the
            claim. The upstream links (mainstreaming changed decisions?) are answerable today; &ldquo;did
            damage fall&rdquo; is not — it waits for the natural experiment.
          </p>
        </section>

        {/* realist CMO */}
        <section className="mb-8">
          <div className="text-[12px] font-bold uppercase tracking-wide text-tertiary mb-2">Realist evaluation · the differential pattern is the finding</div>
          <p className="text-[12px] text-tertiary mb-3 max-w-3xl">
            The same instrument lands in radically different hazard/governance contexts. The question is
            never &ldquo;did the Strategy work&rdquo; but <em>what built resilience, for whom, under what
            conditions</em> — so each case is written as a Context → Mechanism → Outcome configuration.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {CMO.map((c, i) => (
              <div key={i} className={`rounded-lg border p-4 ${c.tone === 'green' ? 'border-secondary-lighter bg-surface-green' : 'border-accent-orange bg-surface-orange'}`}>
                <div className="space-y-2">
                  <CmoRow tag="Context" body={c.context} />
                  <CmoRow tag="Mechanism" body={c.mechanism} />
                  <CmoRow tag="Outcome" body={c.outcome} strong />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* adaptation quant islands */}
        <section className="mb-12">
          <div className="text-[12px] font-bold uppercase tracking-wide text-secondary-dark mb-2">Quant islands · pre-committed event-triggered quantification</div>
          <div className="space-y-2">
            {ADAPT_QUANT.map((q) => (
              <div key={q.name} className="rounded-lg border border-secondary-lighter bg-white p-4">
                <div className="text-[13px] font-bold text-tertiary-dark">{q.name}</div>
                <p className="mt-0.5 text-[12px] text-tertiary italic">{q.method}</p>
                <ul className="mt-2 space-y-1">
                  {q.figures.map((f) => (
                    <li key={f} className="flex gap-2 text-[12px] text-tertiary-dark leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-tertiary-light">Source: {q.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- design rules ---- */}
        <section className="mb-12">
          <SectionLabel>Design rules · the deliverable's spine</SectionLabel>
          <div className="grid gap-3 lg:grid-cols-2">
            {RULES.map((r) => (
              <div key={r.n} className="flex gap-3 rounded-lg border border-grey-200 bg-white p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">{r.n}</span>
                <div>
                  <div className="text-[13px] font-bold text-tertiary-dark leading-snug">{r.head}</div>
                  <p className="mt-1 text-[12px] text-tertiary leading-relaxed">{r.body}</p>
                </div>
              </div>
            ))}
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
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-grey-400 text-[10px] text-grey-400">☐</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- source note ---- */}
        <section className="mb-4">
          <p className="text-[11px] text-tertiary border-t border-grey-200 pt-4 max-w-3xl">
            Reduced-form attribution synthesis of the published causal literature — not a re-estimation on
            microdata. Effect sizes and baselines are stated so the arithmetic is reproducible; the
            attributable total is a partial-equilibrium <em>floor</em>. Mitigation sources: Bayer &amp;
            Aklin (2020, PNAS); Dechezleprêtre, Nachtigall &amp; Venmans (2023, JEEM); Colmer, Martin,
            Muûls &amp; Wagner (2025, REStud); Reynaert (2021, REStud); Verde (2020); Fowlie, Greenstone
            &amp; Wolfram (2018, QJE); EEA inventories; Eurostat. Adaptation: JRC PESETA IV; Vousdoukas et
            al. (2020); EEA; EU Solidarity Fund records. Method references: Mayne; Beach &amp; Pedersen;
            Bennett; Pawson &amp; Tilley; Better Regulation guidelines. Recent EEA/Eurostat decimals are
            subject to inventory-vintage revision.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

/* ===================================================================== *
 *  SUB-COMPONENTS
 * ===================================================================== */

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
  const chip = tone === 'green' ? 'border-secondary text-secondary-dark bg-surface-green' : 'border-accent-orange text-accent-red bg-surface-orange';
  return (
    <div className={`rounded-lg border ${border} bg-white p-3 transition-opacity ${dimmed ? 'opacity-30' : 'opacity-100'}`}>
      <ul className="flex flex-wrap gap-1.5">
        {cell.instruments.map((it) => (
          <li key={it} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${chip}`}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ big, unit, label, tone }: { big: string; unit: string; label: string; tone: 'green' | 'orange' | 'blue' }) {
  const cls =
    tone === 'green' ? 'border-secondary-lighter bg-surface-green' : tone === 'orange' ? 'border-accent-orange bg-surface-orange' : 'border-primary-lighter bg-surface-blue';
  const txt = tone === 'green' ? 'text-secondary-dark' : tone === 'orange' ? 'text-accent-red' : 'text-primary-dark';
  return (
    <div className={`rounded-lg border ${cls} p-4`}>
      <div className={`text-2xl font-bold ${txt}`}>
        {big} <span className="text-sm font-semibold">{unit}</span>
      </div>
      <div className="mt-1 text-[12px] text-tertiary leading-snug">{label}</div>
    </div>
  );
}

function AttribCard({ row, scenario }: { row: AttribRow; scenario: Scenario }) {
  const eff = row.effect[scenario];
  const attributed = row.baselineMt * eff;
  const c = CONF_STYLE[row.confidence];
  return (
    <div className="rounded-lg border border-grey-200 bg-white overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-2.5 bg-grey-50 border-b border-grey-200">
        <span className="text-[13px] font-bold text-tertiary-dark flex-1">{row.name}</span>
        <span className="text-[11px] text-tertiary border border-grey-300 rounded px-2 py-0.5">{row.designTag}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${c.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
          {c.label}
        </span>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2.5">
          <Field label="Identification" value={row.design} />
          <Field label="Effect size (estimate)" value={row.effectLabel} />
          <Field label="Baseline applied" value={row.baselineLabel} />
          <Field label="Source" value={row.source} />
          <Field label="Caveat" value={row.caveat} accent />
        </div>
        <div className="rounded-lg border border-grey-200 bg-grey-50 p-4 flex flex-col justify-center">
          <div className="text-[11px] uppercase tracking-wide text-tertiary-light mb-1">Attributed reduction</div>
          <div className="text-3xl font-bold text-tertiary-dark">
            {fmt(attributed)} <span className="text-base font-semibold text-tertiary">Mt CO₂e/yr</span>
          </div>
          <div className="mt-1 text-[12px] text-tertiary font-mono">
            {fmt(row.baselineMt)} × {(eff * 100).toFixed(0)}%
          </div>
          {row.tier === 'B' && (
            <div className="mt-2 text-[11px] text-accent-red leading-snug">Partial — not summed into the headline total.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${accent ? 'text-accent-orange' : 'text-tertiary-light'}`}>{label}</div>
      <div className={`text-[12px] leading-relaxed ${accent ? 'text-tertiary-dark' : 'text-tertiary'}`}>{value}</div>
    </div>
  );
}

function EvidenceBadge({ test }: { test: EvidenceTest }) {
  const s = TEST_STYLE[test];
  return (
    <span className={`group relative inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
      {s.label}
      <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-60 rounded border border-grey-300 bg-white p-2 text-[11px] font-normal text-tertiary-dark shadow-md group-hover:block">
        {s.tip}
      </span>
    </span>
  );
}

function CmoRow({ tag, body, strong }: { tag: string; body: string; strong?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 w-[78px] text-[10px] font-bold uppercase tracking-wide text-tertiary-light pt-0.5">{tag}</span>
      <span className={`text-[12px] leading-relaxed ${strong ? 'font-semibold text-tertiary-dark' : 'text-tertiary'}`}>{body}</span>
    </div>
  );
}
