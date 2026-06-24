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

import { useMemo, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
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
 *  TIME-SERIES DATA (for the charts)
 *  All series are the published/observed values; flagged approximate where
 *  inventory-vintage-sensitive. Sources match the attribution table above.
 * ===================================================================== */

type Pt = { x: number; y: number };

// EU ETS annual-average EUA price, €/tCO2 (approx; ICAP/Ember). <€10 2013–17,
// climbs to >€80, first >€100 Feb 2023, eases 2024.
const ETS_PRICE: Pt[] = [
  { x: 2013, y: 4.5 }, { x: 2014, y: 6.0 }, { x: 2015, y: 7.7 }, { x: 2016, y: 5.3 },
  { x: 2017, y: 5.8 }, { x: 2018, y: 15.9 }, { x: 2019, y: 24.8 }, { x: 2020, y: 24.8 },
  { x: 2021, y: 53.4 }, { x: 2022, y: 81.0 }, { x: 2023, y: 83.7 }, { x: 2024, y: 64.8 },
];

// ETS-covered (stationary) verified emissions, Mt CO2e (approx; EEA/EUTL).
const ETS_OBSERVED: Pt[] = [
  { x: 2013, y: 1908 }, { x: 2014, y: 1814 }, { x: 2015, y: 1803 }, { x: 2016, y: 1750 },
  { x: 2017, y: 1755 }, { x: 2018, y: 1682 }, { x: 2019, y: 1527 }, { x: 2020, y: 1355 },
  { x: 2021, y: 1425 }, { x: 2022, y: 1386 }, { x: 2023, y: 1189 },
];

// New passenger-car fleet-average CO2, g/km, NEDC basis (EEA). WLTP from 2021
// is not comparable, so the clean series stops at 2020.
const CAR_CO2: Pt[] = [
  { x: 2007, y: 158.7 }, { x: 2010, y: 140.3 }, { x: 2012, y: 132.2 }, { x: 2014, y: 123.4 },
  { x: 2015, y: 119.6 }, { x: 2017, y: 118.5 }, { x: 2018, y: 120.4 }, { x: 2019, y: 122.3 },
  { x: 2020, y: 107.8 },
];

// EV (BEV+PHEV) share of EU new-car sales, % (ACEA).
const EV_SHARE: Pt[] = [
  { x: 2019, y: 3.0 }, { x: 2020, y: 10.5 }, { x: 2021, y: 18.0 }, { x: 2022, y: 21.6 }, { x: 2023, y: 22.3 },
];

// EU F-gas emissions, Mt CO2e (approx; EEA — peak 2014, −25% by 2022, −38% by 2023).
const FGAS: Pt[] = [
  { x: 2014, y: 110 }, { x: 2016, y: 105 }, { x: 2018, y: 100 }, { x: 2020, y: 92 },
  { x: 2021, y: 90 }, { x: 2022, y: 83 }, { x: 2023, y: 68 },
];

// HFC quota phase-down, % of baseline (Reg. 517/2014 Annex V) — step series.
const FGAS_QUOTA: Pt[] = [
  { x: 2015, y: 100 }, { x: 2016, y: 93 }, { x: 2018, y: 63 }, { x: 2021, y: 45 },
  { x: 2024, y: 31 }, { x: 2027, y: 24 }, { x: 2030, y: 21 },
];

// EU renewable share of gross final energy consumption, % (Eurostat).
const RES_SHARE: Pt[] = [
  { x: 2010, y: 14.4 }, { x: 2012, y: 16.0 }, { x: 2014, y: 17.4 }, { x: 2016, y: 18.0 },
  { x: 2018, y: 19.9 }, { x: 2020, y: 22.1 }, { x: 2022, y: 23.0 }, { x: 2023, y: 24.5 },
];

// EU net LULUCF sink, magnitude of net removals, Mt CO2e (EEA — declining).
const LULUCF: Pt[] = [
  { x: 2013, y: 322 }, { x: 2015, y: 300 }, { x: 2017, y: 270 }, { x: 2019, y: 249 },
  { x: 2021, y: 235 }, { x: 2022, y: 230 }, { x: 2023, y: 198 },
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
 *  MIXED-METHOD INTEGRATION — the structured "how to combine"
 * ===================================================================== */

// The integration sequence: one shared theory of change, two strands, one
// triangulated judgement. This is the method spine.
const INTEGRATION_STEPS: { n: string; head: string; body: string; strand: 'shared' | 'quant' | 'qual' | 'join' }[] = [
  { n: '1', head: 'Reconstruct one theory of change', body: 'Both strands hang off the same causal chain (problem → instrument → output → outcome → impact). The ToC is the shared backbone — quant and qual answer different links of the same chain, not different questions.', strand: 'shared' },
  { n: '2', head: 'Quant identification where a counterfactual exists', body: 'On links with exploitable treatment variation, estimate the causal effect (DiD / RD / bunching / synthetic control) and propagate a confidence interval into the attributed Mt CO₂e.', strand: 'quant' },
  { n: '3', head: 'Qual contribution analysis on the links quant cannot reach', body: 'Leakage, the general-equilibrium price channel, innovation, mechanism, and every Tier-C instrument get theory-based contribution analysis with process-tracing evidence tests.', strand: 'qual' },
  { n: '4', head: 'Lay both strands in a joint display', body: 'Put the quant estimate and the qual finding side by side, per instrument and per link — the mixed-methods "joint display". This is where integration actually happens, not in the write-up.', strand: 'join' },
  { n: '5', head: 'Triangulate — converge, complement or diverge?', body: 'Classify each pairing: do the strands agree (confirmation), cover different parts of the chain (complementarity), or disagree (divergence)? Divergence triggers an active hunt for rival explanations before any conclusion.', strand: 'join' },
  { n: '6', head: 'Write the integrated judgement + confidence', body: 'A single conclusion per instrument with an explicit evidence→conclusion chain and a confidence rating that reflects both strands — never a quant number presented as if it answered the whole policy question.', strand: 'join' },
];

type Convergence = 'converge' | 'complementary' | 'diverge' | 'qual-only';

const CONV_STYLE: Record<Convergence, { label: string; cls: string }> = {
  converge: { label: 'Converge', cls: 'bg-surface-green text-secondary-dark border-secondary-lighter' },
  complementary: { label: 'Complementary', cls: 'bg-surface-blue text-primary-dark border-primary-lighter' },
  diverge: { label: 'Diverge', cls: 'bg-surface-orange text-accent-red border-accent-orange' },
  'qual-only': { label: 'Qual-only', cls: 'bg-grey-100 text-tertiary border-grey-300' },
};

// The joint display: the heart of the mixed-method integration.
const JOINT_DISPLAY: { instrument: string; quant: string; qual: string; integrated: string; convergence: Convergence; confidence: Confidence }[] = [
  {
    instrument: 'EU ETS (ETS1)',
    quant: '−10% on regulated installations (DiD); ≈1.2 Gt 2008–16 (synthetic control)',
    qual: 'No leakage (Verde 2020); +10% low-carbon patents; GE price effect on uncovered emissions unmodelled',
    integrated: 'Robust installation-level cut; economy-wide effect is larger once the price/innovation channels are added — the quant is a floor.',
    convergence: 'complementary',
    confidence: 'strong',
  },
  {
    instrument: 'CO₂ car/van standards',
    quant: '−14% type-approval CO₂ (structural/bunching, Reynaert)',
    qual: 'Test gaming and PHEV real-world use; manufacturer pooling (Tesla pool)',
    integrated: 'Real-world abatement ≈−5%, roughly half the headline — the strands diverge and the qual corrects the quant downward.',
    convergence: 'diverge',
    confidence: 'moderate',
  },
  {
    instrument: 'F-gas Regulation',
    quant: '−25% / ≈100 Mt by 2022 (interrupted time series on quota steps)',
    qual: 'Illegal HFC imports ≈20–30% of the legal market (EIA); enforcement heterogeneity',
    integrated: 'Largely real and policy-driven, but the realised atmospheric cut is eroded by the enforcement gap — qual sets the conservative band.',
    convergence: 'complementary',
    confidence: 'moderate',
  },
  {
    instrument: 'EED (Art. 7)',
    quant: 'Deemed engineering savings',
    qual: 'Realisation ≈⅓ (Fowlie RCT); rebound, additionality, behavioural channel',
    integrated: 'Engineering ≠ measured — the qual realisation haircut dominates; the deemed number alone would badly overstate the effect.',
    convergence: 'diverge',
    confidence: 'weak',
  },
  {
    instrument: 'RED',
    quant: 'Auction strike prices ≈−49% (scheme-design switches)',
    qual: 'Permitting, social acceptance; counterfactual deployment unidentified',
    integrated: 'Quant identifies support-cost efficiency, not the emission counterfactual — the emission question is answered qualitatively.',
    convergence: 'qual-only',
    confidence: 'weak',
  },
  {
    instrument: 'ESR / LULUCF',
    quant: 'None — every MS treated / natural variability swamps the signal',
    qual: 'Contribution analysis vs modelled WEM/WAM baselines; management vs weather attribution',
    integrated: 'No regression possible; the 2020 over-achievement is confounded by crisis/COVID. Conclusions are contribution claims, explicitly not identification.',
    convergence: 'qual-only',
    confidence: 'weak',
  },
  {
    instrument: 'Adaptation (Strategy, mainstreaming, …)',
    quant: 'Event-triggered islands only (Floods Directive BCR; Solidarity Fund disbursement)',
    qual: 'Theory-of-change + realist CMO + process tracing on the upstream links',
    integrated: 'Process and output assessed now, qualitatively; outcome deferred to a pre-committed event-triggered quant evaluation. The strands are sequenced in time.',
    convergence: 'complementary',
    confidence: 'moderate',
  },
];



type Params = Record<string, { baseline: number; effect: Record<Scenario, number> }>;
const defaultParams = (): Params =>
  Object.fromEntries(ATTRIB.map((r) => [r.id, { baseline: r.baselineMt, effect: { ...r.effect } }]));

export default function ExPostAnalysisPage() {
  const [domain, setDomain] = useState<'all' | Domain>('all');
  const [scenario, setScenario] = useState<Scenario>('central');
  const [params, setParams] = useState<Params>(defaultParams);

  const tierA = ATTRIB.filter((r) => r.tier === 'A');
  const tierB = ATTRIB.filter((r) => r.tier === 'B');
  const tierC = ATTRIB.filter((r) => r.tier === 'C');

  // every displayed number is recomputed live from the editable params
  const attr = (id: string) => params[id].baseline * params[id].effect[scenario];
  const setBaseline = (id: string, v: number) =>
    setParams((p) => ({ ...p, [id]: { ...p[id], baseline: v } }));
  const setEffect = (id: string, v: number) =>
    setParams((p) => ({ ...p, [id]: { ...p[id], effect: { ...p[id].effect, [scenario]: v } } }));
  const isDirty = JSON.stringify(params) !== JSON.stringify(defaultParams());

  const attributableTotal = useMemo(() => tierA.reduce((s, r) => s + attr(r.id), 0), [params, scenario, tierA]);
  const partialTotal = useMemo(() => tierB.reduce((s, r) => s + attr(r.id), 0), [params, scenario, tierB]);

  // chart rows reflect the live params
  const liveRows = (rows: AttribRow[]) => rows.map((r) => ({ ...r, baselineMt: params[r.id].baseline, effect: params[r.id].effect }));

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

        {/* ================= MIXED-METHOD DESIGN ================= */}
        <section className="mb-12">
          <SectionLabel>The mixed-method design · how the two strands combine</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">One theory of change, two strands, one triangulated judgement</h2>
          <p className="text-[13px] text-tertiary mb-4 max-w-3xl">
            The method is explicit and sequenced. Quant attribution and qual contribution analysis are not
            rival approaches picked by taste — they answer <strong>different links of the same causal
            chain</strong> and are integrated in a joint display before any conclusion is written.
          </p>

          {/* strand diagram */}
          <div className="rounded-lg border border-grey-200 bg-grey-50 p-4 mb-4">
            <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center">
              <div className="rounded-lg border border-secondary-lighter bg-surface-green p-3 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wide text-secondary-dark">Quant strand</div>
                <div className="text-[12px] text-tertiary-dark mt-0.5">DiD · RD · bunching · synthetic control → attributed Mt CO₂e + CI</div>
              </div>
              <div className="hidden md:block text-center text-grey-400 text-xl">&rarr;</div>
              <div className="rounded-lg border border-primary-lighter bg-surface-blue p-3 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wide text-primary-dark">Joint display</div>
                <div className="text-[12px] text-tertiary-dark mt-0.5">strands laid side by side per instrument → triangulate</div>
              </div>
              <div className="hidden md:block text-center text-grey-400 text-xl">&larr;</div>
              <div className="rounded-lg border border-accent-orange bg-surface-orange p-3 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wide text-accent-red">Qual strand</div>
                <div className="text-[12px] text-tertiary-dark mt-0.5">contribution analysis · realist CMO · process tracing</div>
              </div>
            </div>
            <div className="mt-2 text-center text-[11px] text-tertiary">Both strands hang off the same reconstructed theory of change.</div>
          </div>

          <ol className="grid gap-2 md:grid-cols-2">
            {INTEGRATION_STEPS.map((s) => {
              const tone =
                s.strand === 'quant' ? 'border-l-secondary' : s.strand === 'qual' ? 'border-l-accent-orange' : s.strand === 'join' ? 'border-l-primary' : 'border-l-grey-400';
              return (
                <li key={s.n} className={`flex gap-3 rounded-lg border border-grey-200 border-l-4 ${tone} bg-white p-4`}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tertiary text-white text-sm font-bold">{s.n}</span>
                  <div>
                    <div className="text-[13px] font-bold text-tertiary-dark leading-snug">{s.head}</div>
                    <p className="mt-1 text-[12px] text-tertiary leading-relaxed">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
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
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wide text-tertiary">Estimate band</div>
                {isDirty && (
                  <button onClick={() => setParams(defaultParams())} className="text-[11px] font-semibold text-primary hover:text-primary-dark underline underline-offset-2">
                    Reset to published defaults
                  </button>
                )}
              </div>
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
              <p className="mt-2 text-[11px] text-tertiary leading-snug">
                Every baseline and effect size below is <strong>editable</strong> — drag a slider to test
                an assumption and the totals, bars and counterfactual all recompute live.
              </p>
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

          {/* econometric visuals */}
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="ETS — synthetic-control / DiD view"
              sub="Observed ETS-covered emissions vs the no-ETS counterfactual implied by the −10% effect; shaded = attributed reduction."
            >
              <CounterfactualChart observed={ETS_OBSERVED} effect={params['ets'].effect[scenario]} yMax={2200} yLabel="Mt CO₂e (ETS-covered, stationary)" xTicks={[2013, 2016, 2019, 2022]} />
              <Legend items={[{ label: 'Observed', color: '#007B6C' }, { label: 'Counterfactual (no-ETS)', color: '#B83230', dash: true }, { label: 'Attributed reduction', color: '#B83230' }]} />
            </ChartCard>
            <ChartCard
              title="Attributed reduction by instrument"
              sub={`Bar = current band (${SCENARIOS.find((s) => s.key === scenario)!.label}); whisker = conservative–high range. Green = Tier A (summed), orange = Tier B (shown, not summed). Updates live with your assumptions.`}
            >
              <AttributionBars rows={liveRows([...tierA, ...tierB])} scenario={scenario} />
            </ChartCard>
          </div>
        </section>

        {/* Tier A + B attribution cards */}
        <section className="mb-6">
          <div className="text-[12px] font-bold uppercase tracking-wide text-secondary-dark mb-2">
            Tier A — identified attribution (summed)
          </div>
          <div className="space-y-2">
            {tierA.map((r) => (
              <AttribCard key={r.id} row={r} scenario={scenario} p={params[r.id]} onBaseline={(v) => setBaseline(r.id, v)} onEffect={(v) => setEffect(r.id, v)} />
            ))}
          </div>

          <div className="text-[12px] font-bold uppercase tracking-wide text-accent-red mt-5 mb-2">
            Tier B — partial / haircut attribution (shown, not summed)
          </div>
          <div className="space-y-2">
            {tierB.map((r) => (
              <AttribCard key={r.id} row={r} scenario={scenario} p={params[r.id]} onBaseline={(v) => setBaseline(r.id, v)} onEffect={(v) => setEffect(r.id, v)} />
            ))}
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

        {/* ================= THE DATA BEHIND THE ESTIMATES ================= */}
        <section className="mb-12">
          <SectionLabel>The data behind the estimates</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">The observed series each attribution rests on</h2>
          <p className="text-[13px] text-tertiary mb-4 max-w-3xl">
            The attribution arithmetic is only as good as the data feeding it. These are the observed
            trajectories behind each instrument — the raw material the causal designs exploit.
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard title="EU ETS — carbon price" sub="Annual-average EUA, €/tCO₂ (approx.). <€10 through 2013–17; first >€100 in Feb 2023.">
              <LineChart series={[{ label: 'EUA €/t', color: '#004B7F', points: ETS_PRICE }]} yMax={100} yLabel="€/tCO₂" xTicks={[2013, 2016, 2019, 2022, 2024]} height={200} />
            </ChartCard>

            <ChartCard title="CO₂ car standards — fleet intensity & EV share" sub="New-car CO₂ g/km (NEDC; series stops at 2020 — WLTP not comparable) and EV (BEV+PHEV) sales share.">
              <LineChart
                series={[{ label: 'g CO₂/km', color: '#004B7F', points: CAR_CO2 }, { label: 'EV share %', color: '#FF9933', points: EV_SHARE }]}
                yMax={170}
                yLabel="g CO₂/km (blue) · EV share % (orange)"
                xTicks={[2007, 2012, 2017, 2023]}
                hlines={[{ y: 130, label: '2015 target 130', color: '#54728C' }, { y: 95, label: '2021 target 95', color: '#B83230' }]}
                height={200}
              />
            </ChartCard>

            <ChartCard title="F-gas — emissions vs the HFC quota phase-down" sub="F-gas emissions Mt CO₂e (approx.; −25% by 2022) against the statutory quota steps (% of baseline).">
              <LineChart
                series={[{ label: 'F-gas Mt CO₂e', color: '#007B6C', points: FGAS }, { label: 'Quota % of baseline', color: '#A530B8', points: FGAS_QUOTA, step: true }]}
                yMax={120}
                yLabel="Mt CO₂e (teal) · quota % (purple, stepped)"
                xTicks={[2014, 2018, 2021, 2024, 2030]}
                height={200}
              />
            </ChartCard>

            <ChartCard title="RED — renewable share vs targets" sub="RES % of gross final energy consumption (Eurostat) against the 2020 and 2030 (RED III) targets.">
              <LineChart
                series={[{ label: 'RES %', color: '#007B6C', points: RES_SHARE }]}
                yMax={45}
                yLabel="RES share, %"
                xTicks={[2010, 2014, 2018, 2023]}
                hlines={[{ y: 20, label: '2020 target', color: '#54728C' }, { y: 42.5, label: '2030 RED III 42.5%', color: '#B83230' }]}
                height={200}
              />
            </ChartCard>

            <ChartCard title="LULUCF — the weakening net sink" sub="Magnitude of EU net removals, Mt CO₂e (EEA) — falling ~30% — against the −310 Mt 2030 target.">
              <LineChart
                series={[{ label: 'Net sink Mt', color: '#007B6C', points: LULUCF }]}
                yMax={350}
                yLabel="net removals, Mt CO₂e"
                xTicks={[2013, 2017, 2021, 2023]}
                hlines={[{ y: 310, label: '2030 target −310', color: '#B83230' }]}
                height={200}
              />
            </ChartCard>

            <div className="grid grid-cols-2 gap-3">
              <ChartCard title="CO₂ standards — the gaming gap" sub="Reynaert (2021): real-world abatement is roughly half the type-approval figure.">
                <CompareBars
                  bars={[{ label: 'Type-approval', value: 14, color: '#BCBEC0' }, { label: 'Real-world', value: 5, color: '#007B6C' }]}
                  yMax={16}
                  unit="% CO₂ reduction"
                  height={200}
                />
              </ChartCard>
              <ChartCard title="EED — the efficiency gap" sub="Fowlie et al. (2018): realised savings ≈ ⅓ of the engineering projection.">
                <CompareBars
                  bars={[{ label: 'Engineering', value: 100, color: '#BCBEC0' }, { label: 'Realised', value: 33, color: '#FF9933' }]}
                  yMax={110}
                  unit="savings, index (projected = 100)"
                  height={200}
                />
              </ChartCard>
            </div>
          </div>
        </section>

        {/* ================= INTEGRATION: JOINT DISPLAY ================= */}
        <section className="mb-12">
          <SectionLabel>Integration · the joint display</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">Quant strand, qual strand, one integrated judgement</h2>
          <p className="text-[13px] text-tertiary mb-4 max-w-3xl">
            This is where the mixed method actually integrates. For each instrument the two strands sit
            side by side; the <strong>convergence</strong> tag records whether they confirm each other,
            cover complementary links, diverge (qual corrects quant), or whether identification was
            impossible and the conclusion is qualitative only.
          </p>
          <div className="space-y-2">
            {/* header row */}
            <div className="hidden lg:grid grid-cols-[1.1fr_1.4fr_1.4fr_1.6fr_auto] gap-2 px-3 text-[10px] font-bold uppercase tracking-wide text-tertiary-light">
              <div>Instrument</div>
              <div className="text-secondary-dark">Quant strand</div>
              <div className="text-accent-red">Qual strand</div>
              <div>Integrated judgement</div>
              <div>Convergence</div>
            </div>
            {JOINT_DISPLAY.map((j) => {
              const cv = CONV_STYLE[j.convergence];
              const cf = CONF_STYLE[j.confidence];
              return (
                <div key={j.instrument} className="grid gap-2 lg:grid-cols-[1.1fr_1.4fr_1.4fr_1.6fr_auto] rounded-lg border border-grey-200 bg-white p-3 items-start">
                  <div>
                    <div className="text-[13px] font-bold text-tertiary-dark leading-snug">{j.instrument}</div>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cf.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cf.dot}`} />{cf.label}
                    </span>
                  </div>
                  <div className="lg:border-l lg:border-grey-200 lg:pl-2">
                    <div className="lg:hidden text-[10px] font-bold uppercase text-secondary-dark mb-0.5">Quant</div>
                    <p className="text-[12px] text-tertiary leading-relaxed">{j.quant}</p>
                  </div>
                  <div className="lg:border-l lg:border-grey-200 lg:pl-2">
                    <div className="lg:hidden text-[10px] font-bold uppercase text-accent-red mb-0.5">Qual</div>
                    <p className="text-[12px] text-tertiary leading-relaxed">{j.qual}</p>
                  </div>
                  <div className="lg:border-l lg:border-grey-200 lg:pl-2">
                    <p className="text-[12px] text-tertiary-dark leading-relaxed font-medium">{j.integrated}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cv.cls}`}>{cv.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-tertiary italic max-w-3xl">
            Reading the column of convergence tags is the integrity check: where strands <em>diverge</em>
            (CO₂ standards, EED) the qual corrects an over-optimistic quant; where the tag is{' '}
            <em>qual-only</em> (ESR, LULUCF, RED emissions) no regression was defensible and the honest
            output is a contribution claim, not an identified number.
          </p>
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

function AttribCard({
  row,
  scenario,
  p,
  onBaseline,
  onEffect,
}: {
  row: AttribRow;
  scenario: Scenario;
  p: { baseline: number; effect: Record<Scenario, number> };
  onBaseline: (v: number) => void;
  onEffect: (v: number) => void;
}) {
  const eff = p.effect[scenario];
  const attributed = p.baseline * eff;
  const c = CONF_STYLE[row.confidence];
  const edited = p.baseline !== row.baselineMt || p.effect[scenario] !== row.effect[scenario];
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
          <div className="flex items-center gap-2 mb-1">
            <div className="text-[11px] uppercase tracking-wide text-tertiary-light">Attributed reduction</div>
            {edited && <span className="text-[9px] font-bold uppercase tracking-wide text-accent-orange border border-accent-orange rounded px-1">edited</span>}
          </div>
          <div className="text-3xl font-bold text-tertiary-dark">
            {fmt(attributed)} <span className="text-base font-semibold text-tertiary">Mt CO₂e/yr</span>
          </div>
          <div className="mt-1 text-[12px] text-tertiary font-mono">
            {fmt(p.baseline)} × {(eff * 100).toFixed(0)}% (default {fmt(row.baselineMt)} × {(row.effect[scenario] * 100).toFixed(0)}%)
          </div>
          {/* transparent, editable assumptions */}
          <div className="mt-3 space-y-2.5">
            <Slider label={`Baseline (${scenario === 'central' ? 'Mt CO₂e' : 'Mt CO₂e'})`} value={p.baseline} min={Math.round(row.baselineMt * 0.5)} max={Math.round(row.baselineMt * 1.5)} step={5} suffix=" Mt" onChange={onBaseline} />
            <Slider label={`Effect — ${SCENARIOS.find((s) => s.key === scenario)!.label}`} value={Math.round(eff * 100)} min={0} max={70} step={1} suffix="%" onChange={(v) => onEffect(v / 100)} />
          </div>
          {row.tier === 'B' && (
            <div className="mt-2 text-[11px] text-accent-red leading-snug">Partial — not summed into the headline total.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-[11px] text-tertiary mb-0.5">
        <span>{label}</span>
        <span className="font-mono font-semibold text-tertiary-dark">{fmt(value)}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-primary cursor-pointer"
      />
    </label>
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

/* ===================================================================== *
 *  CHART PRIMITIVES (inline SVG — house style, no chart library)
 * ===================================================================== */

type Series = { label: string; color: string; points: Pt[]; dash?: boolean; step?: boolean };

/** Generic year-axis line chart with optional horizontal reference lines + markers. */
function LineChart(props: {
  series: Series[];
  yMax: number;
  yLabel: string;
  xTicks: number[];
  hlines?: { y: number; label: string; color?: string }[];
  height?: number;
  yMin?: number;
}) {
  const { series, yMax, yLabel, xTicks, hlines = [], height = 220, yMin = 0 } = props;
  const W = 720;
  const H = height;
  const m = { l: 46, r: 14, t: 18, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const allX = series.flatMap((s) => s.points.map((p) => p.x));
  const x0 = Math.min(...allX, ...xTicks);
  const x1 = Math.max(...allX, ...xTicks);
  const sx = (x: number) => m.l + ((x - x0) / (x1 - x0)) * iw;
  const sy = (y: number) => m.t + ih - ((Math.min(y, yMax) - yMin) / (yMax - yMin)) * ih;
  const yTicks = 4;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hx, setHx] = useState<number | null>(null);
  const uniqX = Array.from(new Set(allX)).sort((a, b) => a - b);

  const pathFor = (s: Series) =>
    s.points
      .map((p, i) => {
        if (i === 0) return `M ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`;
        if (s.step) return `H ${sx(p.x).toFixed(1)} V ${sy(p.y).toFixed(1)}`;
        return `L ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`;
      })
      .join(' ');

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vx = ((e.clientX - rect.left) / rect.width) * W; // viewBox x
    const dataX = x0 + ((vx - m.l) / iw) * (x1 - x0);
    const nearest = uniqX.reduce((a, b) => (Math.abs(b - dataX) < Math.abs(a - dataX) ? b : a), uniqX[0]);
    setHx(nearest);
  };

  const tipRows = hx == null ? [] : series.map((s) => ({ s, p: s.points.find((pt) => pt.x === hx) })).filter((r) => r.p);
  const tipX = hx == null ? 0 : sx(hx);
  const tipLeft = tipX > W / 2;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={yLabel} onMouseMove={onMove} onMouseLeave={() => setHx(null)}>
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = yMin + ((yMax - yMin) / yTicks) * i;
        const y = sy(v);
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y} y2={y} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 6} y={y + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>{fmt(v)}</text>
          </g>
        );
      })}
      {xTicks.map((yr) => (
        <text key={yr} x={sx(yr)} y={H - 8} textAnchor="middle" className="fill-grey-500" fontSize={10}>{yr}</text>
      ))}
      <text x={m.l} y={m.t - 4} className="fill-tertiary" fontSize={10}>{yLabel}</text>
      {hlines.map((h) => (
        <g key={h.label}>
          <line x1={m.l} x2={W - m.r} y1={sy(h.y)} y2={sy(h.y)} stroke={h.color ?? '#B83230'} strokeWidth={1.25} strokeDasharray="5 4" />
          <text x={W - m.r} y={sy(h.y) - 3} textAnchor="end" fontSize={9} fill={h.color ?? '#B83230'}>{h.label}</text>
        </g>
      ))}
      {series.map((s) => (
        <g key={s.label}>
          <path d={pathFor(s)} fill="none" stroke={s.color} strokeWidth={2.25} strokeDasharray={s.dash ? '5 4' : undefined} strokeLinejoin="round" />
          {s.points.map((p) => <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={2.4} fill={s.color} />)}
        </g>
      ))}
      {/* hover guide + tooltip */}
      {hx != null && tipRows.length > 0 && (
        <g pointerEvents="none">
          <line x1={tipX} x2={tipX} y1={m.t} y2={m.t + ih} stroke="#54728C" strokeWidth={1} strokeDasharray="3 3" />
          {tipRows.map((r) => <circle key={r.s.label} cx={tipX} cy={sy(r.p!.y)} r={3.5} fill="#fff" stroke={r.s.color} strokeWidth={2} />)}
          <g transform={`translate(${tipLeft ? tipX - 122 : tipX + 8}, ${m.t + 2})`}>
            <rect width={114} height={16 + tipRows.length * 13} rx={3} fill="#fff" stroke="#DCDDDE" />
            <text x={6} y={12} fontSize={10} fontWeight={700} className="fill-tertiary-dark">{hx}</text>
            {tipRows.map((r, i) => (
              <text key={r.s.label} x={6} y={26 + i * 13} fontSize={10} fill={r.s.color}>
                {r.s.label}: {fmt(r.p!.y, Math.abs(r.p!.y) < 50 ? 1 : 0)}
              </text>
            ))}
          </g>
        </g>
      )}
    </svg>
  );
}

/** Synthetic-control / DiD visual: observed vs implied counterfactual, with the
 *  attributed reduction shaded between them. */
function CounterfactualChart({ observed, effect, yMax, yLabel, xTicks }: { observed: Pt[]; effect: number; yMax: number; yLabel: string; xTicks: number[] }) {
  const W = 720;
  const H = 250;
  const m = { l: 50, r: 14, t: 18, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const x0 = observed[0].x;
  const x1 = observed[observed.length - 1].x;
  const sx = (x: number) => m.l + ((x - x0) / (x1 - x0)) * iw;
  const sy = (y: number) => m.t + ih - (Math.min(y, yMax) / yMax) * ih;
  const counter = observed.map((p) => ({ x: p.x, y: p.y / (1 - effect) }));
  const line = (pts: Pt[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');
  const band =
    line(counter) + ' ' + observed.slice().reverse().map((p) => `L ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ') + ' Z';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={yLabel}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = (yMax / 4) * i;
        const y = sy(v);
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y} y2={y} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 6} y={y + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>{fmt(v)}</text>
          </g>
        );
      })}
      {xTicks.map((yr) => <text key={yr} x={sx(yr)} y={H - 8} textAnchor="middle" className="fill-grey-500" fontSize={10}>{yr}</text>)}
      <text x={m.l} y={m.t - 4} className="fill-tertiary" fontSize={10}>{yLabel}</text>
      <path d={band} fill="#B83230" fillOpacity={0.12} stroke="none" />
      <path d={line(counter)} fill="none" stroke="#B83230" strokeWidth={2.25} strokeDasharray="5 4" strokeLinejoin="round" />
      <path d={line(observed)} fill="none" stroke="#007B6C" strokeWidth={2.5} strokeLinejoin="round" />
      <text x={sx(counter[counter.length - 1].x) - 4} y={sy(counter[counter.length - 1].y) - 6} textAnchor="end" fontSize={10} fill="#B83230" fontWeight={700}>
        counterfactual (no-ETS)
      </text>
      <text x={sx(observed[observed.length - 1].x) - 4} y={sy(observed[observed.length - 1].y) + 14} textAnchor="end" fontSize={10} fill="#00665A" fontWeight={700}>
        observed
      </text>
    </svg>
  );
}

/** Horizontal attribution bars with conservative–high whiskers and a marker at
 *  the current scenario. */
function AttributionBars({ rows, scenario }: { rows: AttribRow[]; scenario: Scenario }) {
  const W = 720;
  const rowH = 38;
  const m = { l: 150, r: 60, t: 10, b: 26 };
  const H = m.t + m.b + rows.length * rowH;
  const iw = W - m.l - m.r;
  const xMax = Math.max(...rows.map((r) => r.baselineMt * r.effect.high)) * 1.1;
  const sx = (v: number) => m.l + (v / xMax) * iw;
  const xTicks = [0, 50, 100, 150, 200].filter((t) => t <= xMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Attributed emission reductions by instrument">
      {xTicks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke="#E6E7E8" strokeWidth={1} />
          <text x={sx(t)} y={H - 10} textAnchor="middle" className="fill-grey-500" fontSize={10}>{t}</text>
        </g>
      ))}
      <text x={sx(0)} y={H - 10} textAnchor="middle" className="fill-grey-500" fontSize={10}>0</text>
      {rows.map((r, i) => {
        const y = m.t + i * rowH + rowH / 2;
        const lo = r.baselineMt * r.effect.conservative;
        const hi = r.baselineMt * r.effect.high;
        const cur = r.baselineMt * r.effect[scenario];
        const fill = r.tier === 'A' ? '#007B6C' : '#FF9933';
        return (
          <g key={r.id}>
            <text x={m.l - 8} y={y + 3} textAnchor="end" className="fill-tertiary-dark" fontSize={11} fontWeight={600}>{r.name}</text>
            {/* whisker low–high */}
            <line x1={sx(lo)} x2={sx(hi)} y1={y} y2={y} stroke={fill} strokeOpacity={0.35} strokeWidth={8} strokeLinecap="round" />
            {/* current-scenario bar */}
            <rect x={sx(0)} y={y - 7} width={Math.max(0, sx(cur) - sx(0))} height={14} fill={fill} fillOpacity={0.9} rx={2} />
            <text x={sx(hi) + 6} y={y + 3} fontSize={10} className="fill-tertiary" >{fmt(lo)}–{fmt(hi)}</text>
            <text x={sx(cur) - 4} y={y + 3} textAnchor="end" fontSize={10} fill="#fff" fontWeight={700}>{cur >= 12 ? fmt(cur) : ''}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Simple paired comparison bars (e.g. type-approval vs real-world). */
function CompareBars({ bars, yMax, unit, height = 200 }: { bars: { label: string; value: number; color: string }[]; yMax: number; unit: string; height?: number }) {
  const W = 360;
  const H = height;
  const m = { l: 40, r: 14, t: 16, b: 40 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const bw = iw / bars.length;
  const sy = (v: number) => m.t + ih - (v / yMax) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={unit}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = (yMax / 4) * i;
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 6} y={sy(v) + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>{fmt(v)}</text>
          </g>
        );
      })}
      {bars.map((b, i) => {
        const x = m.l + i * bw + bw * 0.2;
        const w = bw * 0.6;
        return (
          <g key={b.label}>
            <rect x={x} y={sy(b.value)} width={w} height={m.t + ih - sy(b.value)} fill={b.color} rx={2} />
            <text x={x + w / 2} y={sy(b.value) - 5} textAnchor="middle" fontSize={11} fontWeight={700} className="fill-tertiary-dark">{fmt(b.value)}</text>
            <text x={x + w / 2} y={H - 24} textAnchor="middle" fontSize={10} className="fill-tertiary">{b.label}</text>
          </g>
        );
      })}
      <text x={m.l} y={m.t - 4} className="fill-tertiary" fontSize={10}>{unit}</text>
    </svg>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-4">
      <div className="text-[13px] font-bold text-tertiary-dark">{title}</div>
      {sub && <div className="text-[11px] text-tertiary mb-2">{sub}</div>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; dash?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
          <svg width="22" height="8" className="shrink-0">
            <line x1="0" y1="4" x2="22" y2="4" stroke={it.color} strokeWidth={2.5} strokeDasharray={it.dash ? '5 4' : undefined} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  );
}
