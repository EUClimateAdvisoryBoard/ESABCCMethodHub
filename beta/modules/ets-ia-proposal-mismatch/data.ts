// IA ↔ Proposal mismatch register (beta module M·44).
//
// Every entry compares what the impact assessment SWD(2026) 616 assessed /
// preferred with what the ETS Directive proposal COM(2026) 616 actually
// proposes, with verbatim quotes, page references and passage screenshots
// from both documents (shots under /data/ets-ia-proposal-mismatch/shots/).
//
// Page conventions:
//  · COM(2026) 616 quotes/pages come from the Council transmission copy
//    ST 12073/26 (identical text; printed page = PDF page − 2).
//  · SWD(2026) 616 Part 1 printed page = PDF page − 5.
//
// The register was AI-compiled from the two documents on 2026-08-05 and is
// pending human verification — the screenshots exist so every claim can be
// checked against the source in one click.

export type Verdict = 'deviation' | 'unassessed' | 'partial' | 'aligned';

export const VERDICT_META: Record<Verdict, { label: string; color: string; blurb: string }> = {
  deviation:  { label: 'Deviates from assessed options', color: '#B83230', blurb: 'The proposal does something outside every option the IA assessed.' },
  unassessed: { label: 'Not assessed in the IA',         color: '#D97706', blurb: 'The proposal relies on a mechanism or quantity the IA explicitly did not model.' },
  partial:    { label: 'Partly assessed / hybrid',       color: '#6667AB', blurb: 'The direction was assessed but the concrete design or calendar was not.' },
  aligned:    { label: 'Follows the IA',                 color: '#007B6C', blurb: 'The proposal implements the IA’s preferred option.' },
};

export interface Passage {
  quote: string;   // verbatim from the document
  cite: string;    // human-readable citation
  shots: string[]; // files under /data/ets-ia-proposal-mismatch/shots/
}

export interface MismatchEntry {
  id: string;
  rank: number;            // 1 = biggest mismatch
  title: string;
  verdict: Verdict;
  iaSays: string;          // one-sentence summary of the IA position
  proposalDoes: string;    // one-sentence summary of the proposal
  ia: Passage[];
  com: Passage[];
  why: string;             // why this is (or is not) a mismatch
}

export const MISMATCHES: MismatchEntry[] = [
  {
    id: 'cap-trajectory',
    rank: 1,
    title: 'The cap trajectory (LRF 3.7% → 1.7%)',
    verdict: 'deviation',
    iaSays: 'Assessed CAP1–CAP3 with LRFs of 2.3–3.3% (2030–35) and 2.1–2.7% (2035–40), all reaching a 2040 cap of 330–375 Mt; §8 adds that an ambitious cap in the first half of the decade "would have significant advantages".',
    proposalDoes: 'Sets an LRF of 3.7% for 2031–2035 and 1.7% from 2036 — both values outside every assessed option — and permits "continued issuance of allowances into the 2040s".',
    ia: [
      {
        quote: 'LRF 2030-2035: 2.7-2.5% (CAP1) / 3.1-2.3% (CAP2) / 3.3-2.9% (CAP3) · LRF 2035-2040: 2.7-2.5% / 2.3-2.7% / 2.1-2.1% · 2040 cap: 330-375 Mt · Carbon budget 2031-2040: 5605-6295 Mt',
        cite: 'SWD(2026) 616 Part 1, Table 2, p. 23 (PDF p. 28)',
        shots: ['swd1-028-cap-table2.png'],
      },
      {
        quote: 'For the cap no single option is preferred, and the decision on the cap can be analytically separated from the other issues discussed. However, a sufficiently ambitious cap in the first half of the decade would have significant advantages.',
        cite: 'SWD(2026) 616 Part 1, §8.1, p. 98 (PDF p. 103)',
        shots: ['swd1-103-cap-no-option.png'],
      },
    ],
    com: [
      {
        quote: 'Regarding the option chosen for the ETS cap, the final policy proposal deviates from the options assessed in the impact assessment.',
        cite: 'COM(2026) 616, explanatory memorandum, p. 16 (PDF p. 18 of ST 12073/26)',
        shots: ['com-018-cap-deviation.png'],
      },
      {
        quote: 'The linear factor shall be 3.7% from 2031 to 2035 and 1.7% from 2036.',
        cite: 'COM(2026) 616, amended Article 9, p. 72 (PDF p. 74)',
        shots: ['com-074-article9-lrf.png'],
      },
    ],
    why: 'This is the one deviation the Commission itself admits in writing. The proposed 3.7% is steeper than the steepest assessed first-half LRF (3.3%) and the 1.7% tail is flatter than the flattest assessed second-half LRF (2.1%) — a back-loaded easing that no CAP option contained, justified by international credits and removals that enter through separate, largely unmodelled articles (see ranks 3 and 6). The impact numbers in the IA (carbon budgets, prices, investment paths) therefore describe trajectories the proposal does not follow.',
  },
  {
    id: 'aviation-scope',
    rank: 2,
    title: 'Aviation scope: all departing flights → 5,000 km "neighbourhood"',
    verdict: 'deviation',
    iaSays: 'The preferred option PO2 (and PO3) includes ALL outgoing extra-EEA flights from 2027, and every cap table is computed "under the assumption that (one-way) international extra EU aviation has been included in the EU target".',
    proposalDoes: 'Covers only flights departing to third-country aerodromes no further than 5,000 km, from 2029 (not 2027), for four years, subject to a 2032 CORSIA review — and books the newly covered emissions outside the NDC and the Climate Law targets.',
    ia: [
      {
        quote: 'In PO1, EU ETS includes intra-EU flights but not international extra EU flights, and the cap is therefore lower. […] In PO2 and PO3, outgoing international aviation is included in the EU ETS, as well as emissions from smaller ships.',
        cite: 'SWD(2026) 616 Part 1, p. 23 (PDF p. 28)',
        shots: ['swd1-028-aviation-scope.png'],
      },
      {
        quote: 'PO2 was considered to be the preferred policy option. […] An effective carbon price would apply also to the EU’s fair share of international aviation emissions.',
        cite: 'SWD(2026) 616 Part 1, §8.1, pp. 97–98 (PDF pp. 102–103)',
        shots: ['swd1-102-preferred-po2.png'],
      },
    ],
    com: [
      {
        quote: 'the scope of the EU ETS should be extended in a non-discriminatory way to cover all flights departing from an airport situated in the EEA and landing in aerodromes in third countries, no further than 5 000 kilometres from the largest aerodrome in the geographical centre of the Union. […] This coverage should apply from 2029 rather than 2027, for a period of four years and be dependent on the review in 2032.',
        cite: 'COM(2026) 616, recital 82, p. 54 (PDF p. 56)',
        shots: ['com-056-aviation-5000km.png'],
      },
      {
        quote: 'The additional aviation emissions covered by the EU ETS from 2027 onwards should not yet be included in the NDC of the Union and its Member States, nor be considered to be emissions for the purposes of Regulation (EU) 2021/1119.',
        cite: 'COM(2026) 616, recital 11, p. 31 (PDF p. 33)',
        shots: ['com-033-aviation-ndc.png'],
      },
    ],
    why: 'The assessed scope (all departing flights, in the target, from 2027) is roughly halved by the 5,000 km cut-off, delayed two years, given a four-year sunset — and, most consequentially for accounting, the covered emissions are excluded from the target arithmetic that the IA’s 911 Mt 2030 cap and all carbon budgets were built on. The IA notes that excluding international aviation from the target would free ca. 45 Mt of emissions space for other sectors; the proposal creates a variant of this world that was flagged in Annex 8 but is not the modelled basis of the preferred option.',
  },
  {
    id: 'international-credits',
    rank: 3,
    title: 'International credits: 260 Mt architecture the IA did not cost',
    verdict: 'unassessed',
    iaSays: 'The IA models 85%-net scenarios only as a proxy for maximum credit use and states outright that the costs and full impacts of credit purchases "are not included in this impact assessment"; direct integration is ruled out, central purchase is sketched qualitatively.',
    proposalDoes: 'Article 9b sets aside up to 260 million allowances to fund the purchase of up to 260 Mt of Article 6 credits for 2036–2040, with a fallback LRF of 2.7% from 2036 if credible credits are unavailable.',
    ia: [
      {
        quote: 'However, this target was chosen as the basis for the impact assessment to consider the maximum potential use of the international credit flexibility allowed in the European Climate Law. The costs and full impacts of purchases of international credits are not included in this impact assessment.',
        cite: 'SWD(2026) 616 Part 1, p. 3 (PDF p. 8)',
        shots: ['swd1-008-credits-excluded.png'],
      },
      {
        quote: 'Nevertheless, this impact assessment concludes that a direct integration of international credits in the ETS is not appropriate. […] By contrast, adjusting the ETS cap equivalent to the amount of international credits that would be centrally purchased from mitigation outside of the EU under strict criteria and oversight, is a simpler, straightforward approach.',
        cite: 'SWD(2026) 616 Part 1, p. 3 (PDF p. 8)',
        shots: ['swd1-008-credits-direct.png'],
      },
    ],
    com: [
      {
        quote: 'Up to 260 million allowances from the Union-wide quantity of allowances referred to in Article 9 shall be made available to the facility for the purchase of up to 260 Mt of high quality and high integrity international credits […] to contribute to the climate ambition of the activities listed in Annex I from 2036 to 2040.',
        cite: 'COM(2026) 616, new Article 9b(1), p. 72 (PDF p. 74)',
        shots: ['com-074-article9b-credits.png'],
      },
      {
        quote: 'Subject to the report in paragraph 3, by way of derogation from Article 9, in the event that high-quality and high-integrity, cost-effective international credits referred to in paragraph 1, are not available, the linear factor shall revert to 2.7% from 2036.',
        cite: 'COM(2026) 616, new Article 9b(4), p. 72 (PDF p. 74)',
        shots: ['com-074-article9b-fallback.png'],
      },
    ],
    why: 'The proposal’s architecture (central purchase financed by auctioning set-aside allowances) does follow the sketch on IA p. 3 — the design direction is aligned. The mismatch is quantitative: the 260 Mt volume, its EUR cost, the auction-supply effect of 260 million extra allowances and the market impact of the 2033 availability review were never modelled. Note the irony: the FALLBACK trajectory (2.7% from 2036) sits inside the assessed 2035–40 LRF range (2.1–2.7%) — the fallback, not the headline path, is what the IA actually assessed.',
  },
  {
    id: 'cbam-free-allocation',
    rank: 4,
    title: 'Free allocation for CBAM sectors stretched to 2038',
    verdict: 'partial',
    iaSays: 'The preferred option’s CL2 measure "includes a revision of the CBAM phase-out factor", assessed only as unquantified GEM-E3 scenario variants ("C") — no concrete calendar appears in the main report, whose baseline keeps the current-law full phase-out after 2034.',
    proposalDoes: 'Writes a specific slower calendar into Article 10a(1a): 59% in 2030, 48% in 2031, 37.5% in 2032, 27% in 2033, then a 15% plateau from 2034 to 2037, reaching 0% only in 2038 — four years later than current law.',
    ia: [
      {
        quote: 'In PO2, free allocation is reformed in accordance with the CL2 measure, which assumes that a progressive share of free allocation is conditional on investments […] This policy options also includes a revision of the CBAM phase-out factor. […] scenario variants marked with C for PO2 refer to variants with a slow-down of the phase-out of free allocation for the sectors under the scope of CBAM.',
        cite: 'SWD(2026) 616 Part 1, p. 38 (PDF p. 43)',
        shots: ['swd1-043-cl2-cbam.png'],
      },
    ],
    com: [
      {
        quote: 'The CBAM factor shall be […] 95 % in 2027, 91.5 % in 2028, 81 % in 2029, 59% in 2030, 48% in 2031, 37,5% in 2032 and 27% in 2033, 15% from 2034 to 2037. From 2038, a CBAM factor of 0 % shall apply.',
        cite: 'COM(2026) 616, amended Article 10a(1a), p. 78 (PDF p. 80)',
        shots: ['com-080-cbam-factor.png'],
      },
    ],
    why: 'Direction assessed, calendar not. Under the 2023 ETS Directive the CBAM factor reaches 0% in 2034; the proposal both raises the factors already inside the current trading period (from 2028) and extends free allocation for CBAM sectors to the end of 2037. The IA discusses a "slow-down […] addressing residual risks of carbon leakage" and models it only as scenario variants whose schedule is not stated in Part 1 — so the four extra years of free allocation, and their auction-revenue cost, have no quantified counterpart in the published assessment.',
  },
  {
    id: 'idb-booster',
    rank: 5,
    title: 'IDB "Investment Booster": 400 M allowances, first-come-first-served, from 2028',
    verdict: 'unassessed',
    iaSays: 'The IA’s IDB analysis simulates EUR 100 billion in ten yearly EUR 10 billion auction rounds (i.e. 2031–2040); §8 mentions the "Investment Booster" idea qualitatively, with no volume, start date or funding source.',
    proposalDoes: 'Creates a first phase already in 2028–2031 financed by 400 million allowances on a first-in-first-served basis, sourced from the free-allocation buffer and, if short, from leftover New Entrants Reserve allowances — which are then not returned to the MSR.',
    ia: [
      {
        quote: 'The analysis performed for this Impact Assessment is a simulation of the impact of the IDB […] based on a total budget of EUR 100 billion allocated across ten yearly auction rounds, each of EUR 10 billion funding volume.',
        cite: 'SWD(2026) 616 Part 1, p. 29 (PDF p. 34)',
        shots: ['swd1-034-idb-10bn.png'],
      },
      {
        quote: 'in the early years of the IDB operation (i.e. the ‘Investment Booster’ announced in March 2026), the Commission could start with administrative schemes awarding a fixed premium […] As technologies mature, ETS prices increase and regulatory frameworks fully take effect, the Commission could move to auctions for a Carbon Contracts for Difference.',
        cite: 'SWD(2026) 616 Part 1, §8.1, p. 98 (PDF p. 103)',
        shots: ['swd1-103-idb-booster.png'],
      },
    ],
    com: [
      {
        quote: 'The first phase of the Industrial Decarbonisation Bank should be the ETS Investment Booster financed by 400 million allowances. To fast-track decarbonisation investments through speed, the ETS Investment Booster, operating on a ‘first in, first served’ basis, should provide fixed carbon premia per tonne of CO₂ avoided and paid in ETS allowances.',
        cite: 'COM(2026) 616, recital 62, p. 46 (PDF p. 48)',
        shots: ['com-048-booster-400m.png'],
      },
      {
        quote: 'Where the allowances available are not sufficient to allocate 400 million allowances to the Investment Booster, these should come from the leftover allowances from the new entrants reserve provided for in Article 10a(7) of Directive 2003/87/EC. […] it should be allocated allowances from the phase-out of free allocation due to the phase-in of carbon border adjustment mechanism (CBAM) and allowances should not be returned to the MSR.',
        cite: 'COM(2026) 616, recital 55, pp. 44–45 (PDF pp. 46–47)',
        shots: ['com-046-booster-ner.png'],
      },
    ],
    why: 'The 400 million allowances are a supply-and-timing decision the IA never quantified: they arrive in 2028–2031, before Phase 5, from reserves that would otherwise (in part) flow back to the MSR. This is precisely the discretionary-supply channel the Öko-Institut brief modelled (400 M EUA of NER auctions for the IDB) and warned recreates oversupply when combined with a weaker cap — and ESMA found that even the 35 M frontloaded REPowerEU allowances had "a noticeable impact" on the price in 2023.',
  },
  {
    id: 'removals-integration',
    rank: 6,
    title: 'Removals: cap pre-increase of 250 M + own-use BioCCS',
    verdict: 'partial',
    iaSays: 'PO1 (public-authority purchase) is the preferred option for removals — with volumes of 175–330 Mt modelled — but §8 itself flags that "removals integration with a pre-increase of the cap" introduces uncertainty about the ETS’s net climate contribution.',
    proposalDoes: 'Article 9c increases the cap by 250 million LRF-exempt allowances (plus a 10 M price buffer) auctioned in 2031–2040 to fund Commission purchases "upon delivery", and lets operators compensate fossil emissions with their own BioCCS removals.',
    ia: [
      {
        quote: 'As an exception, PO1 is preferred for carbon removals, as it is considered preferable to provide certainty to the ETS sectors on the gross emissions space available and the CDR industry on the demand for carbon removals, for the benefit of the EU’s competitiveness.',
        cite: 'SWD(2026) 616 Part 1, §8.1, p. 98 (PDF p. 103)',
        shots: ['swd1-103-removals-po1.png'],
      },
    ],
    com: [
      {
        quote: 'The Union-wide quantity of allowances referred to in Article 9 shall be increased by 250 million allowances. Those allowances shall be made available to the Commission to auction them from 2031 to 2040 to generate revenues for the purchase of an equivalent amount of domestic permanent carbon removal units […] The linear reduction factor established in Article 9 shall not apply to the increase of allowances established in paragraph 1.',
        cite: 'COM(2026) 616, new Article 9c(1) and (7), p. 73 (PDF pp. 75–76)',
        shots: ['com-075-article9c-removals.png'],
      },
    ],
    why: 'Mostly the preferred option: public purchase, 250 Mt inside the modelled 175–330 Mt band. Two design choices go beyond it. First, the emission space is created up front — allowances are auctioned 2031–2040 while removals are paid on delivery — which is exactly the "pre-increase of the cap" risk the IA’s own consistency check names (mitigated, it says, by a sufficient purchase budget and a review clause). Second, own-use BioCCS compensation under Article 14(1a) imports a piece of the operator-integration route (CR1) that the IA weighed and did not prefer.',
  },
];

// ── Where the proposal follows the IA ───────────────────────────────────────
export interface AlignmentEntry {
  id: string;
  title: string;
  detail: string;
  shots: string[];
}

export const ALIGNMENTS: AlignmentEntry[] = [
  {
    id: 'msr',
    title: 'MSR: dynamic declining parameters (MSR3)',
    detail: 'The proposal sets intake thresholds of 833/947 M with a 12% intake rate and a release band of 300–400 M (+100 M releases), all declining 4% annually from 2029 — implementing the "dynamic parameters at a declining fixed rate" design (MSR3) that the IA’s preferred PO2 is built on. Ending invalidation was proposed separately in April 2026.',
    shots: ['com-107-msr-dynamic.png'],
  },
  {
    id: 'conditional-fa',
    title: 'Conditional free allocation (CL2)',
    detail: 'Free allocation made progressively conditional on decarbonisation investment plans and their implementation — the CL2 measure of the preferred PO2.',
    shots: [],
  },
  {
    id: 'maritime',
    title: 'Maritime: partial extension to 400–5,000 GT vessels',
    detail: 'The targeted extension to specific categories of smaller ships, plus MRV simplification and an IMO deduction mechanism, matches the preferred option’s "partial ETS scope extension to smaller vessels, reflecting the needed balance between environmental benefits and implementation costs".',
    shots: [],
  },
  {
    id: 'waste',
    title: 'Municipal waste incineration from 2031',
    detail: 'Inclusion of all municipal waste incinerators from 2031 with phased cap additions (10.2 → 36 M allowances, 2031–2034) follows PO2; landfills (PO3) are left out, as the preferred option implies.',
    shots: [],
  },
  {
    id: 'idb-envelope',
    title: 'IDB envelope of EUR 100 billion',
    detail: 'The overall EUR 100 billion industrial-decarbonisation envelope, CCfD-based competitive bidding from 2031 and placement within the European Competitiveness Fund governance match the assessed baseline size and preferred toolbox approach — the mismatch is confined to the 2028 Booster phase (rank 5).',
    shots: [],
  },
  {
    id: 'ets2',
    title: 'ETS2 kept separate',
    detail: 'Both documents keep ETS2 out of scope: the proposal because ETS2 only becomes fully operational in 2028 with its own review due by 2029, the IA by assessing no ETS1–ETS2 merge option and rejecting a lower 20 MW threshold as disproportionate given ETS2 coverage.',
    shots: [],
  },
];

// ── Öko-Institut cross-check ────────────────────────────────────────────────
export interface OekoPoint {
  claim: string;     // what the brief says / does
  question: string;  // the critical question against it
}

export const OEKO_BRIEF = {
  title: 'Getting the balance right — how today’s ETS design choices shape supply, market stability, and the path to 2040 and beyond',
  authors: 'Johanna Cludius, Jakob Graichen (Öko-Institut, policy brief, 19 May 2026)',
  summary: 'Written two months before the proposal, the brief argues the post-2030 debate is wrongly fixated on scarcity: ending MSR invalidation plus 400 M EUA of NER auctions for the IDB would already cover 2040-aligned demand, and additionally lowering the LRF would recreate a structural oversupply (supply ≈ 40–50% above demand in their "weakened ETS" scenario). It recommends keeping the LRF at 4.4% until 2035, correcting the TNAC indicator, and refraining from NER-based IDB auctions.',
  relevance: 'The brief anticipates exactly the two supply channels where the proposal departs from the IA: the back-loaded LRF easing (rank 1) and the 400 M-allowance Booster (rank 5). Its "weakened ETS" scenario (LRF 3.2%/2.2% + 400 M NER auctions) is not the proposal, but it is the nearest published stress test of the proposal’s combination.',
  shots: ['oeko-001-recommendations.png', 'oeko-003-figure1.png', 'oeko-005-figure2.png', 'oeko-010-table1.png'],
  points: [
    {
      claim: 'The headline finding — "total supply of allowances in the fifth trading period exceeds demand" — is produced by adding the whole MSR stock (≈1,023 M) and unallocated NER (≈234 M) to the decade’s cap and surplus (Figure 1).',
      question: 'Stocks are not flow supply. MSR holdings only reach the market through the release rule (≈100 M/yr near the lower threshold), and the brief’s own Table 1 keeps 989 M in MSR & NER at end-2040 under current rules — while showing a NEGATIVE market surplus (−567 M linear / −383 M fast decline) in that same scenario. Read on its own net numbers, the current-rules market runs short of allowances, the opposite of the headline; that result is relegated to a table note calling it "counterfactual".',
    },
    {
      claim: 'Demand is an exogenous emissions pathway (Commission S2, 88% domestic, 250 Mt ETS-1 emissions in 2040), compared against supply in a model the authors describe as static.',
      question: 'In a banked, binding cap-and-trade market, emissions respond to price and banking shifts abatement across time — comparing cumulative supply with a fixed scenario pathway treats "surplus" as lost mitigation when it can equally be rational intertemporal smoothing (the brief concedes: "It is important to note that our model is static"). The cumulative cap, not the annual balance, pins down cumulative emissions.',
    },
    {
      claim: 'Auctioning NER volumes for the IDB is framed as "additional supply outside the ETS’s rule-based mechanisms".',
      question: 'NER allowances already sit inside the cap. Whether auctioning them "adds" supply depends entirely on the counterfactual: under current law unused NER volumes return to the MSR at end-2030 — and once invalidation ends (which the brief’s own scenarios assume), they re-enter the market later anyway. The genuine effect is timing and revenue use, not new cumulative supply; the brief’s wording overstates it.',
    },
    {
      claim: 'The MSR should be triggered on an "actual TNAC" corrected by ≈300 M EUA for historic aviation/ESR net demand.',
      question: 'The correction is the authors’ own construct, and their recommended MSR redesign (plus the 4.4%-until-2035 LRF) is calibrated on it. A ±300 M shift in the trigger variable is larger than most of the annual flows being argued about — the policy conclusion inherits the assumption.',
    },
    {
      claim: 'The scenario parameters were guesses made before 17 July: LRF 3.2% (2031–35) / 2.2% (2036–40), 400 M EUA auctioned 2028–2032 from the NER, no removals integration.',
      question: 'The actual proposal differs on every parameter: LRF 3.7%/1.7% (steeper early, flatter late), the 400 M Booster drawn first from the free-allocation buffer, plus 250 M removal allowances and a 260 M credit set-aside the brief did not anticipate. The brief’s conclusions cannot be read as numbers about the proposal — its own conclusions section concedes the removals channel alone would make the oversupply "if anything … conservative", cutting the other way.',
    },
    {
      claim: 'Combining supply-expanding reforms risks a renewed oversupply that depresses the price and endangers the 2040 target.',
      question: 'This directional warning survives the methodological critique — it echoes the IA’s own logic for the MSR reform and ESMA’s finding that 35 M frontloaded REPowerEU allowances moved the 2023 price. The defensible core is "assess all supply changes jointly"; the contestable part is the static arithmetic used to size the risk.',
    },
  ] as OekoPoint[],
};

// ── Source documents ────────────────────────────────────────────────────────
export const DOCS = [
  { label: 'COM(2026) 616 — ETS Directive proposal (EUR-Lex)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2026:616:FIN' },
  { label: 'COM(2026) 616 — Council transmission ST 12073/26 (PDF used for page refs)', url: 'https://data.consilium.europa.eu/doc/document/ST-12073-2026-INIT/en/pdf' },
  { label: 'SWD(2026) 616 — impact assessment landing page (all parts)', url: 'https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en' },
  { label: 'SWD(2026) 616 Part 1 — main report (PDF used for page refs)', url: 'https://climate.ec.europa.eu/document/download/6dffbc5a-b5f3-4c51-b999-a6243e155e8c_en?filename=swd_2026_616_part_1_en.pdf' },
  { label: 'Öko-Institut policy brief — Getting the balance right (19 May 2026)', url: 'https://www.oeko.de/' },
  { label: 'ESMA EU Carbon Markets Report 2024 (REPowerEU price impact)', url: 'https://www.esma.europa.eu/sites/default/files/2024-10/ESMA50-43599798-10379_Carbon_markets_report_2024.pdf' },
];
