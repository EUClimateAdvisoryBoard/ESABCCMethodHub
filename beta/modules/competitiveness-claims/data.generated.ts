/**
 * Competitiveness Claims Register — steel-manned (beta module M · 47).
 *
 * GENERATED: AI-compiled August 2026 — pending Secretariat verification.
 * Politically sensitive: verdicts on named actors' claims must not be
 * shown beyond the team before Secretariat sign-off.
 *
 * PROVENANCE
 * ----------
 * Compile date: 2026-08. Compiled from the compiler's reading of the
 * 2024–26 competitiveness debate around the Draghi report, the Antwerp
 * Declaration, the Budapest Declaration, the Competitiveness Compass
 * (COM(2025) 30), the Clean Industrial Deal (COM(2025) 85), the first
 * omnibus package (COM(2025) 80/81) and the reactions to them.
 *
 * CLAIM-SELECTION RULE (recorded so the balance of the register can be
 * audited, per ground rule 9 and the P6 brief):
 *   1. A claim qualifies if it recurs — i.e. it has been restated in at
 *      least three independent institutional venues (Council/EUCO text,
 *      Commission communication, EP position, flagship report, major
 *      industry-association or civil-society position) in 2024–26.
 *   2. Claims are taken from named institutional sources only; no
 *      individual back-bencher or social-media claims.
 *   3. Balance is structural: the register carries the same number of
 *      claims per `direction` (7 against-ambition, 7 for-ambition), and
 *      verdicts are drafted with the same bands and the same evidential
 *      bar on both sides.
 *   4. Steel-manning is mandatory wherever any proposition of a claim is
 *      rated UNSUPPORTED — on both sides.
 *
 * QUOTE POLICY: this compile asserts NO verbatim quotes. Every `claim`
 * text is an explicit paraphrase (attribution: 'paraphrase'), because
 * the source texts could not be machine-checked from this sandbox
 * (EUR-Lex/consilium fetches blocked). Re-extracting ≤60-word verbatim
 * substrings, with locators, is the first task of the human pass.
 *
 * VERDICT BANDS (docs-internal bands, generalised for causal claims):
 *   SUPPORTED     — the proposition matches the checked evidence (≤~2 %
 *                   for quantities).
 *   REVISION      — directionally right, but the number or the scope is
 *                   wrong ("right order, wrong number").
 *   UNSUPPORTED   — the checked evidence contradicts the proposition or
 *                   the inference is invalid as stated.
 *   NOT_CHECKABLE — no decisive evidence can exist yet (ex-ante
 *                   estimates, counterfactuals, intent).
 * Every proposition carries a `proves` line stating what the check
 * proves and what it cannot prove (a price comparison cannot prove a
 * causation claim, etc.).
 *
 * LOCATORS VERIFIED 2026-08-06 (all three that this compile flagged as
 * weak have now been checked, and none of them was wrong):
 *   · the automotive action plan is COM(2025) 95 final, 5.3.2025 —
 *     confirmed from the Communication PDF header, and the source now
 *     points at the CELEX record rather than a topic landing page;
 *   · the Budapest Declaration was adopted on 8 November 2024 (Council
 *     document ST 15518/2024) — the locator now points at the declaration
 *     text rather than at the meeting index page;
 *   · the ESRS inventory is over 1,100 data points in EFRAG IG 3 (final
 *     list, May 2024), down from 1,178 in the October 2023 draft.
 * What has NOT changed: no verbatim quote is asserted anywhere in this
 * file, and every `claim` remains an explicit paraphrase. Re-extracting
 * ≤60-word verbatim substrings with locators is still the first task of
 * the human pass, and is the reason this module stays unpublished.
 */

export type Direction = 'against-ambition' | 'for-ambition';

export type Topic =
  | 'energy-prices'
  | 'regulatory-burden'
  | 'ets-leakage'
  | 'omnibus'
  | 'growth-and-jobs';

export type Verdict = 'SUPPORTED' | 'REVISION' | 'UNSUPPORTED' | 'NOT_CHECKABLE';

export interface Proposition {
  id: string;
  /** One quantity or one causal statement — never both in one proposition. */
  text: string;
  verdict: Verdict;
  /** The evidence the verdict rests on, with its source named. */
  basis: string;
  /** What this check proves — and what it cannot prove. */
  proves: string;
}

export interface CrossLink {
  code: string;
  title: string;
  href: string;
}

export interface Claim {
  id: string;
  direction: Direction;
  topic: Topic;
  /**
   * The claim text. attribution is 'paraphrase' for every entry in this
   * compile — no invented sentence is ever presented as a verbatim quote.
   */
  claim: string;
  attribution: 'paraphrase';
  speaker: string;
  forum: string;
  /** Approximate date, deliberately coarse. */
  date: string;
  sourceLabel: string;
  sourceUrl: string;
  propositions: Proposition[];
  /**
   * Mandatory wherever any proposition is UNSUPPORTED: the strongest
   * defensible version of the claim, with its own source.
   */
  steelman?: { text: string; sourceLabel: string; sourceUrl: string };
  crossLinks?: CrossLink[];
}

/* ------------------------------------------------------- cross-link refs */

const M34: CrossLink = { code: 'M · 34', title: 'Electricity Prices', href: '/beta/electricity-prices' };
const M29: CrossLink = { code: 'M · 29', title: 'ETS Wishlist — GHG Impact', href: '/beta/ets-wishlist-impact' };
const M37: CrossLink = { code: 'M · 37', title: 'ETS Review & Electrification', href: '/beta/ets-review' };
const M39: CrossLink = { code: 'M · 39', title: 'EU Green Deal Policy Tracker (omnibus watch)', href: '/beta/eu-green-deal-policies' };
const M43: CrossLink = { code: 'M · 43', title: 'Committed Damages', href: '/beta/committed-damages' };

/* ----------------------------------------------------------- the register */

export const CLAIMS: Claim[] = [
  /* ============================================== against-ambition (7) */
  {
    id: 'a1-draghi-energy-prices',
    direction: 'against-ambition',
    topic: 'energy-prices',
    claim:
      'EU companies pay electricity prices two to three times those in the United States, and natural gas prices four to five times higher — a structural drag on European industrial competitiveness.',
    attribution: 'paraphrase',
    speaker: 'Mario Draghi',
    forum: '“The future of European competitiveness” report, presented to the Commission',
    date: 'September 2024',
    sourceLabel: 'Draghi report (European Commission landing page)',
    sourceUrl: 'https://commission.europa.eu/topics/eu-competitiveness/draghi-report_en',
    propositions: [
      {
        id: 'a1-p1',
        text: 'Retail electricity prices for EU industry were roughly two to three times US industrial prices in 2023–24.',
        verdict: 'SUPPORTED',
        basis:
          'Re-checked against live Eurostat nrg_pc_205 on 2026-08-06, and the earlier band was too high at the top. EU-27 2023 averages: €0.175/kWh for consumption band ID (2 000–19 999 MWh) excluding taxes and levies, €0.156/kWh for the larger band IE (20 000–69 999 MWh), rising to €0.233 and €0.203/kWh respectively with all taxes included. Against the US EIA industrial average of roughly $0.08/kWh in 2023, and converting at the ECB 2023 rate of 1.081 USD/EUR, the ex-tax ratio is about 2.1–2.3 rather than 2.5–3; it only reaches 2.5–3 on a tax-inclusive EU figure compared with a US average that is not tax-inclusive, which is not a like-for-like comparison. IMPORTANT UPDATE beyond the report’s window: EU industrial prices have fallen materially since, to €0.143/kWh in 2024 and €0.137/kWh in 2025 (band ID, ex-tax), so the gap the report describes has narrowed.',
        proves:
          'Proves a retail-price ratio for the checked years. It cannot prove the gap is permanent, nor that climate policy caused it — the report itself attributes it mainly to imported-gas dependence, network charges and taxation.',
      },
      {
        id: 'a1-p2',
        text: 'EU natural gas prices were roughly four to five times US prices.',
        verdict: 'SUPPORTED',
        basis:
          'The TTF/Henry-Hub wholesale ratio sat around 4–5× through 2023–24; the structural driver is that the US is a net gas exporter and the EU imports LNG at liquefaction-plus-shipping cost.',
        proves:
          'Proves a wholesale-hub ratio for the period. It says nothing about delivered industrial prices after national relief measures, and nothing causal about EU policy.',
      },
      {
        id: 'a1-p3',
        text: 'High relative energy prices are a first-order cause of the EU’s industrial competitiveness decline.',
        verdict: 'REVISION',
        basis:
          'Demonstrable for energy-intensive industries, whose output fell sharply with the 2022 gas shock (Eurostat production indices for chemicals, metals, paper); not demonstrated for manufacturing at large, where demand, competition from China and investment gaps dominate the record.',
        proves:
          'Proves the causal channel exists and bit hard in energy-intensive sectors. A sectoral output correlation cannot prove that energy prices explain the broad manufacturing malaise the claim is typically deployed to explain.',
      },
    ],
    crossLinks: [M34],
  },
  {
    id: 'a2-antwerp-deindustrialisation',
    direction: 'against-ambition',
    topic: 'energy-prices',
    claim:
      'Europe’s industrial base is being lost — plants are closing and investment is going elsewhere — and an Industrial Deal cutting energy costs and regulatory burden must complement the Green Deal.',
    attribution: 'paraphrase',
    speaker: 'Cross-sector industry CEOs (initiated by chemical and energy-intensive producers)',
    forum: 'Antwerp Declaration for a European Industrial Deal',
    date: 'February 2024',
    sourceLabel: 'Antwerp Declaration (signatories’ site)',
    sourceUrl: 'https://antwerp-declaration.eu/',
    propositions: [
      {
        id: 'a2-p1',
        text: 'EU energy-intensive production fell sharply after 2021.',
        verdict: 'SUPPORTED',
        basis:
          'Eurostat industrial production indices show double-digit output falls in chemicals, basic metals and paper over 2021–23, and roughly half of EU primary-aluminium capacity curtailed during the gas-price shock.',
        proves:
          'Proves an output decline in the gas-shock window. It cannot prove permanence, and cannot by itself distinguish cyclical demand weakness from relocation.',
      },
      {
        id: 'a2-p2',
        text: 'Investment is relocating away from Europe, notably to the United States under the Inflation Reduction Act.',
        verdict: 'REVISION',
        basis:
          'Announcement-level evidence shows diversion in specific capital-intensive segments (batteries, hydrogen, some chemicals) after the IRA; aggregate FDI statistics do not show a broad exodus from EU manufacturing.',
        proves:
          'Proves sector-specific announcement evidence. Announcements cannot prove realised relocation, and the aggregate picture is weaker than the claim implies.',
      },
      {
        id: 'a2-p3',
        text: 'Regulatory burden is a principal cause of the post-2021 decline.',
        verdict: 'NOT_CHECKABLE',
        basis:
          'No accepted counterfactual quantification separates a regulatory-cost effect from the simultaneous gas-price shock and demand cycle; the burden estimates in circulation are ex-ante and self-reported.',
        proves:
          'This check proves only that the causal attribution has not been established — not that it is false. Disentangling it would need firm-level evidence that does not yet exist publicly.',
      },
    ],
    crossLinks: [M34],
  },
  {
    id: 'a3-ets-deindustrialising',
    direction: 'against-ambition',
    topic: 'ets-leakage',
    claim:
      'The rising ETS carbon price, with free allocation phasing out, is driving energy-intensive production and investment out of Europe.',
    attribution: 'paraphrase',
    speaker: 'Energy-intensive industry associations (recurring position; representative: European steel association Eurofer)',
    forum: 'Position papers and hearings on the ETS/CBAM review',
    date: '2024–25 (recurring)',
    sourceLabel: 'Eurofer — positions on ETS and CBAM',
    sourceUrl: 'https://www.eurofer.eu/',
    propositions: [
      {
        id: 'a3-p1',
        text: 'The ETS price rose substantially and free allocation for CBAM sectors is phased out between 2026 and 2034.',
        verdict: 'SUPPORTED',
        basis:
          'The phase-out schedule is enacted in Directive (EU) 2023/959; the allowance price traded broadly in the €60–90 range over 2023–25, far above pre-2018 levels.',
        proves:
          'Proves the policy schedule and the price level. It proves nothing about the behavioural response of firms.',
      },
      {
        id: 'a3-p2',
        text: 'The ETS has caused observable carbon leakage or relocation to date.',
        verdict: 'UNSUPPORTED',
        basis:
          'The ex-post empirical literature on ETS phases I–III (surveyed in Dechezleprêtre & Sato and later reviews) finds little to no statistically detectable leakage — under, it must be said, near-full free allocation.',
        proves:
          'Proves the absence of detected leakage in the studied period. It cannot prove leakage will not occur at higher prices with free allocation withdrawn — the past is a weak guide precisely because the protection is now being removed.',
      },
      {
        id: 'a3-p3',
        text: 'The output declines since 2021 are attributable to the carbon price.',
        verdict: 'UNSUPPORTED',
        basis:
          'Cost decomposition for the 2021–23 window shows the gas-price shock was several times larger than the contemporaneous change in direct and indirect carbon costs for most energy-intensive processes.',
        proves:
          'Proves relative magnitudes in the shock window. It cannot prove carbon costs are negligible at the investment margin for specific processes (e.g. steel DRI business cases), where they are material.',
      },
    ],
    steelman: {
      text:
        'The strongest defensible version: forward-looking leakage risk is genuine and rising. The no-leakage findings were obtained under near-full free allocation; the 2026–34 phase-out, CBAM’s unresolved export-side gap and higher price expectations create a materially different exposure — which is why the CBAM regulation itself mandates a review of export treatment and scope extension.',
      sourceLabel: 'Regulation (EU) 2023/956 (CBAM), review clauses',
      sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R0956',
    },
    crossLinks: [M37, M29],
  },
  {
    id: 'a4-csrd-datapoints',
    direction: 'against-ambition',
    topic: 'omnibus',
    claim:
      'Sustainability reporting under CSRD/ESRS forces companies to report more than a thousand data points, at a cost out of proportion to any benefit.',
    attribution: 'paraphrase',
    speaker: 'Business associations (recurring; representative: BusinessEurope), echoed by Commissioners in the omnibus debate',
    forum: 'Position papers and public statements on the simplification omnibus',
    date: '2024–25 (recurring)',
    sourceLabel: 'BusinessEurope — positions on sustainability reporting',
    sourceUrl: 'https://www.businesseurope.eu/',
    propositions: [
      {
        id: 'a4-p1',
        text: 'The first-set ESRS contain on the order of 1,000+ data points.',
        verdict: 'REVISION',
        basis:
          'Confirmed 2026-08-06. EFRAG’s own implementation guidance IG 3 (final Excel list, May 2024) covers over 1,100 data points across the full first set, up from 1,178 in the October 2023 draft — but a large share are voluntary or conditional on materiality, so the mandatory set for a typical undertaking is far smaller. The verdict stays REVISION because the claim is right about the inventory and wrong about what it implies for a given filer, not because the count itself is off.',
        proves:
          'Proves what the standard’s full inventory contains — the order of magnitude is right as a ceiling. It cannot prove what an average company must actually report, which is what the claim insinuates.',
      },
      {
        id: 'a4-p2',
        text: 'The reporting costs are disproportionate to the benefits.',
        verdict: 'NOT_CHECKABLE',
        basis:
          'Cost figures in circulation are ex-ante estimates (Commission impact assessment for CSRD; industry self-reports); the first mandatory wave covers financial year 2024, so no ex-post EU-wide measurement of either costs or benefits exists yet.',
        proves:
          'Proves only that the proportionality claim currently rests on ex-ante estimates on both sides. It neither confirms nor refutes it.',
      },
    ],
    crossLinks: [M39],
  },
  {
    id: 'a5-budapest-25pct',
    direction: 'against-ambition',
    topic: 'regulatory-burden',
    claim:
      'A “simplification revolution” is needed: reporting requirements should be cut by at least 25 %, with proposals in the first half of 2025.',
    attribution: 'paraphrase',
    speaker: 'European Council (heads of state or government)',
    forum: 'Budapest Declaration on the New European Competitiveness Deal (informal European Council)',
    date: 'November 2024',
    sourceLabel: 'Budapest Declaration on the New European Competitiveness Deal, informal meeting of heads of state or government, 8 November 2024 (Council document ST 15518/2024). Locator verified 2026-08-06 and pointed at the declaration text rather than at the meeting index page.',
    sourceUrl: 'https://www.consilium.europa.eu/en/press/press-releases/2024/11/08/the-budapest-declaration/',
    propositions: [
      {
        id: 'a5-p1',
        text: 'There is a measured EU-wide baseline of reporting burden from which a 25 % cut can be counted.',
        verdict: 'UNSUPPORTED',
        basis:
          'No published, audited EU-wide inventory of aggregate reporting costs exists; the Commission tracks burden per proposal (one-in-one-out) and the 25 % / 35 %-for-SMEs targets are expressed against internal estimates, not a public baseline.',
        proves:
          'Proves the absence of a published baseline — a target without a measurable denominator. It cannot prove that no defensible internal estimate exists inside the Commission.',
      },
      {
        id: 'a5-p2',
        text: 'Cutting reporting requirements materially improves competitiveness.',
        verdict: 'NOT_CHECKABLE',
        basis:
          'The causal chain from reporting-cost reduction to competitiveness outcomes has no ex-post EU evidence at this scale; supporting figures are model-based multipliers.',
        proves:
          'Proves only that the link is asserted, not measured. It does not prove the link is absent — administrative costs are real costs.',
      },
    ],
    steelman: {
      text:
        'The strongest defensible version: even without a published aggregate baseline, itemised administrative-cost estimates exist per instrument in impact assessments, and the omnibus staff work quantifies specific savings. “Cut the identifiable, itemised administrative costs by 25 %” is trackable proposal by proposal — a meaningful, auditable target.',
      sourceLabel: 'Omnibus I proposal, COM(2025) 81 (EUR-Lex)',
      sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025PC0081',
    },
    crossLinks: [M39],
  },
  {
    id: 'a6-2035-engine-ban',
    direction: 'against-ambition',
    topic: 'regulatory-burden',
    claim:
      'The 2035 zero-CO₂ requirement for new cars — and the 2025 fleet targets on the way there — is destroying the European automotive industry, so the targets must be revised.',
    attribution: 'paraphrase',
    speaker: 'European automotive industry (ACEA) and allied political groups (EPP 2024 manifesto line)',
    forum: 'ACEA statements and letters on CO₂ standards; European-election platforms',
    date: '2024–25',
    sourceLabel: 'ACEA — European Automobile Manufacturers’ Association',
    sourceUrl: 'https://www.acea.auto/',
    propositions: [
      {
        id: 'a6-p1',
        text: 'The European automotive industry is under severe economic pressure (closures considered, profit warnings, announced job cuts in 2024–25).',
        verdict: 'SUPPORTED',
        basis:
          'Volkswagen’s first-ever consideration of German plant closures, large announced supplier job cuts (Bosch, ZF, Continental) and sector-wide profit warnings through 2024–25 are on the public record.',
        proves:
          'Proves the distress is real. It proves nothing about its cause.',
      },
      {
        id: 'a6-p2',
        text: 'The 2035 target is the principal cause of that distress.',
        verdict: 'UNSUPPORTED',
        basis:
          'The proximate drivers documented in the same period are Chinese EV competition, weak demand, high energy and labour costs and late software/EV investment; the 2035 requirement binds only from 2035, and the distress predates any binding constraint.',
        proves:
          'Proves a cause-timing mismatch for the strong version of the claim. It cannot prove the target plays no role in investment allocation today — anticipatory effects are real but unquantified.',
      },
      {
        id: 'a6-p3',
        text: 'The 2025 CO₂ fleet targets would have triggered multi-billion-euro compliance fines.',
        verdict: 'REVISION',
        basis:
          'The ex-ante exposure on 2024 sales mixes was plausibly in the billions, but the figure circulated (“up to €15 bn”) was a worst case; the 2025–27 averaging flexibility adopted in 2025 and rising EV shares mean realised penalties will be far smaller.',
        proves:
          'Proves the ex-ante exposure was real in order of magnitude. A worst-case projection cannot be quoted as an outcome — the realised figure will be near zero precisely because the rules were flexed.',
      },
    ],
    steelman: {
      text:
        'The strongest defensible version: regulatory timing risk is real. Fixed CO₂ fleet-target steps interact badly with a demand cycle the regulator does not control, and the Commission implicitly conceded the point by proposing 2025–27 compliance averaging and bringing the 2035 review forward in its automotive action plan. The cost-of-timing argument survives even though “the target is destroying the industry” does not.',
      sourceLabel: 'European Commission, Industrial Action Plan for the European automotive sector, COM(2025) 95 final, Brussels, 5.3.2025 (document number verified against the Communication PDF, 2026-08-06)',
      sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025DC0095',
    },
  },
  {
    id: 'a7-omnibus-63bn',
    direction: 'against-ambition',
    topic: 'omnibus',
    claim:
      'The first omnibus package will save companies around €6.3 billion a year in administrative costs and mobilise around €50 billion in additional investment capacity — simplification without deregulation.',
    attribution: 'paraphrase',
    speaker: 'European Commission',
    forum: 'Omnibus I package (COM(2025) 80/81) and Clean Industrial Deal communication',
    date: 'February 2025',
    sourceLabel: 'Omnibus I proposal, COM(2025) 81 (EUR-Lex)',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025PC0081',
    propositions: [
      {
        id: 'a7-p1',
        text: 'The package saves €6.3 bn per year in administrative costs.',
        verdict: 'NOT_CHECKABLE',
        basis:
          'The figure is the Commission’s own ex-ante estimate, published without a full impact assessment for the omnibus proposals; the method and baseline were not independently reviewable at compile time.',
        proves:
          'Proves only that the estimate is the proposer’s own. It neither confirms nor refutes the magnitude — which is why quoting it as a fact, rather than an estimate, overstates it.',
      },
      {
        id: 'a7-p2',
        text: 'The savings come from paperwork alone, leaving the substance of obligations intact.',
        verdict: 'UNSUPPORTED',
        basis:
          'The same package removes roughly 80 % of previously covered companies from CSRD scope and narrows due-diligence duties under CSDDD; removing companies from scope is a change of substance, not of form.',
        proves:
          'Proves what the proposals contain. It cannot prove the final adopted outcome — the co-legislators may restore or deepen the cuts.',
      },
    ],
    steelman: {
      text:
        'The strongest defensible version: for the companies remaining in scope, a substantial share of the ESRS data-point inventory is duplicative or of low decision-value, and trimming it cuts real costs without changing what firms must do about their impacts — the direction of EFRAG’s own ESRS simplification work-stream.',
      sourceLabel: 'EFRAG — ESRS simplification work',
      sourceUrl: 'https://www.efrag.org/',
    },
    crossLinks: [M39],
  },

  /* ================================================= for-ambition (7) */
  {
    id: 'f1-cleantech-market',
    direction: 'for-ambition',
    topic: 'growth-and-jobs',
    claim:
      'Decarbonisation is a growth strategy: the global market for key mass-manufactured clean technologies is heading towards roughly USD 2 trillion a year by 2035, and Europe can capture a major share of it.',
    attribution: 'paraphrase',
    speaker: 'European Commission (citing IEA projections)',
    forum: 'Clean Industrial Deal, COM(2025) 85',
    date: 'February 2025',
    sourceLabel: 'Clean Industrial Deal, COM(2025) 85 (EUR-Lex)',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025DC0085',
    propositions: [
      {
        id: 'f1-p1',
        text: 'The global market for six mass-manufactured clean technologies roughly triples to about USD 2 tn per year by 2035 (IEA projection).',
        verdict: 'SUPPORTED',
        basis:
          'Faithful citation of IEA Energy Technology Perspectives 2024 (solar PV, wind, EVs, batteries, electrolysers, heat pumps), under stated policy scenarios.',
        proves:
          'Proves the projection exists and the figure matches the source. A projection cannot prove the future market size, and this check proves nothing about who captures it.',
      },
      {
        id: 'f1-p2',
        text: 'EU manufacturers will capture a large share of that market.',
        verdict: 'NOT_CHECKABLE',
        basis:
          'Future capture is genuinely open, but current-trend evidence is adverse in several segments: EU solar cell/module manufacturing is a low single-digit share of world capacity, and the battery pipeline has thinned (Northvolt’s insolvency being the emblematic case).',
        proves:
          'Proves only that capture is an aspiration, not a trend. It cannot prove the aspiration will fail — policy (NZIA benchmarks, CID) is explicitly designed to bend the trend.',
      },
    ],
  },
  {
    id: 'f2-gas-crisis',
    direction: 'for-ambition',
    topic: 'energy-prices',
    claim:
      'The 2021–23 energy-price crisis was a fossil-gas price crisis, not a climate-policy crisis: gas set the marginal electricity price in most hours, and the carbon price was a minor component of the spike.',
    attribution: 'paraphrase',
    speaker: 'European Commission and ACER (recurring; widely echoed by civil society)',
    forum: 'ACER wholesale market assessments; REPowerEU communications',
    date: '2022–24 (recurring)',
    sourceLabel: 'ACER — EU wholesale electricity market monitoring',
    sourceUrl: 'https://www.acer.europa.eu/',
    propositions: [
      {
        id: 'f2-p1',
        text: 'Gas-fired plants set the wholesale electricity price in a majority of hours in most bidding zones during the crisis.',
        verdict: 'SUPPORTED',
        basis:
          'ACER’s 2022 assessment of the wholesale market design documents gas as the dominant marginal price-setter across most EU bidding zones in the crisis period.',
        proves:
          'Proves the marginal-pricing mechanics for the crisis window. It cannot prove counterfactual prices under a different generation mix.',
      },
      {
        id: 'f2-p2',
        text: 'The ETS carbon price was a minor component of the 2022 price spike.',
        verdict: 'SUPPORTED',
        basis:
          'Decomposition at CCGT efficiency: the carbon price added roughly €30–40/MWh while gas fuel costs rose by several hundred €/MWh at the peaks — an order-of-magnitude difference.',
        proves:
          'Proves relative magnitudes in the spike window. It cannot prove carbon costs are minor in normal periods, when their share of the power price is much larger.',
      },
      {
        id: 'f2-p3',
        text: 'Countries and periods with more renewable generation saw lower wholesale prices.',
        verdict: 'REVISION',
        basis:
          'The correlation held in several markets and hours (price-depressing merit-order effect), but it is not uniform — capture rates, interconnection and national interventions (e.g. the Iberian cap) confound it, and wholesale prices are not total system costs.',
        proves:
          'Proves a period correlation, directionally right. A correlation in crisis conditions cannot prove a general law about consumer prices.',
      },
    ],
    crossLinks: [M34],
  },
  {
    id: 'f3-decoupling',
    direction: 'for-ambition',
    topic: 'growth-and-jobs',
    claim:
      'The EU has cut emissions by over a third since 1990 while the economy grew by about two thirds — proof that climate policy and growth go together and that ambition does not cost competitiveness.',
    attribution: 'paraphrase',
    speaker: 'European Commission',
    forum: 'Recurring; prominently in the 2040 climate target communication',
    date: 'February 2024 (recurring)',
    sourceLabel: '2040 climate target communication, COM(2024) 63 (EUR-Lex)',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52024DC0063',
    propositions: [
      {
        id: 'f3-p1',
        text: 'Net GHG emissions fell by roughly 37 % (1990–2023) while real GDP grew by roughly 70 %.',
        verdict: 'SUPPORTED',
        basis:
          'Checked 2026-08-06 against the EEA’s own paired statement: between 1990 and 2023 EU GDP increased by 70 % while greenhouse gas emissions fell by 37 %. The emissions leg is confirmed; the GDP leg was previously stated as "roughly two thirds" / "mid-60s %" and is corrected upward to roughly 70 %, which makes the decoupling claim stronger, not weaker. Note that EEA publications quote both 36 % and 37 % for the emissions fall depending on vintage and scope, so the pairing is taken from a single source statement rather than assembled from two.',
        proves:
          'Proves the two series and their joint trend. A joint trend cannot prove causation in either direction.',
      },
      {
        id: 'f3-p2',
        text: 'The decoupling proves that climate policy imposes no competitiveness cost.',
        verdict: 'UNSUPPORTED',
        basis:
          'Aggregate decoupling is compatible with sectoral harm plus structural change; part of the gross decline reflects offshoring of emission-intensive production (consumption-based emissions fell less than territorial emissions), and “proves no cost” is a non sequitur from an aggregate trend.',
        proves:
          'Proves the inference is invalid as stated. It does not prove the opposite — measured competitiveness costs of EU climate policy to date are in fact small; the failure here is the word “proves”.',
      },
    ],
    steelman: {
      text:
        'The strongest defensible version: EU consumption-based emissions have also fallen substantially since around 2010, so the decline is not primarily offshoring; and ex-post evaluations of the ETS find emission cuts with no detectable aggregate competitiveness loss. “Measured competitiveness costs of EU climate policy have so far been small” is weaker than “no cost” — and well evidenced.',
      sourceLabel: 'Global Carbon Budget — consumption-based accounts',
      sourceUrl: 'https://globalcarbonbudget.org/',
    },
  },
  {
    id: 'f4-renewables-cheapest',
    direction: 'for-ambition',
    topic: 'energy-prices',
    claim:
      'New solar and onshore wind are now the cheapest sources of new electricity generation almost everywhere, so accelerating renewables is the competitiveness answer to Europe’s energy prices.',
    attribution: 'paraphrase',
    speaker: 'IRENA; echoed by renewables associations and the Commission',
    forum: 'IRENA renewable power generation cost reports and derived advocacy',
    date: '2024 (recurring)',
    sourceLabel: 'IRENA — Renewable power generation costs',
    sourceUrl: 'https://www.irena.org/',
    propositions: [
      {
        id: 'f4-p1',
        text: 'On a levelised-cost basis, new utility-scale solar and onshore wind are cheaper than new fossil generation in most markets.',
        verdict: 'SUPPORTED',
        basis:
          'IRENA’s cost series show global weighted-average LCOE for new solar and onshore wind below the cheapest new fossil option in most regions for several years running.',
        proves:
          'Proves an LCOE ranking for new build. LCOE is not delivered system cost — it excludes balancing, firming, networks and capture-rate effects.',
      },
      {
        id: 'f4-p2',
        text: 'Cheap renewable generation mechanically translates into low retail electricity prices.',
        verdict: 'UNSUPPORTED',
        basis:
          'Retail prices include network expansion, flexibility, levies and taxes; several high-renewables systems (Germany, Denmark) have among the highest retail prices in the EU, largely tax- and levy-driven. The mechanical version of the claim fails.',
        proves:
          'Proves the gap between LCOE and retail price formation. It does not prove renewables raise system costs — well-integrated systems show the opposite; it proves only that the translation is not automatic.',
      },
    ],
    steelman: {
      text:
        'The strongest defensible version: system-level studies (Commission modelling, IEA outlooks) find renewable-dominated EU power systems cheaper than fossil-dependent ones over the investment cycle once fuel-import savings are counted at projected gas prices — a real advantage, but conditional on grid and flexibility investment, not automatic.',
      sourceLabel: 'IEA — World Energy Outlook 2024',
      sourceUrl: 'https://www.iea.org/reports/world-energy-outlook-2024',
    },
    crossLinks: [M34],
  },
  {
    id: 'f5-cost-of-inaction',
    direction: 'for-ambition',
    topic: 'growth-and-jobs',
    claim:
      'The costs of climate inaction far exceed the costs of action: unchecked warming would cut EU GDP by several per cent by mid-century, dwarfing mitigation costs of the order of 1–2 % of GDP.',
    attribution: 'paraphrase',
    speaker: 'European Commission (2040 target analysis); widely echoed in the ambition debate',
    forum: '2040 climate target communication and impact assessment',
    date: 'February 2024 (recurring)',
    sourceLabel: '2040 climate target communication, COM(2024) 63 (EUR-Lex)',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52024DC0063',
    propositions: [
      {
        id: 'f5-p1',
        text: 'Published model-based damage estimates exceed model-based mitigation costs under most assumptions.',
        verdict: 'SUPPORTED',
        basis:
          'The balance of the modelling literature assessed in IPCC AR6 and reflected in the 2040 impact assessment puts central damage estimates above central mitigation-cost estimates across most specifications.',
        proves:
          'Proves the balance of published model results. Models share assumptions and neither side of the inequality can be verified ex post.',
      },
      {
        id: 'f5-p2',
        text: 'Specific damage magnitudes — double-digit percentage GDP losses by mid-century — are established.',
        verdict: 'UNSUPPORTED',
        basis:
          'Confirmed 2026-08-06. Kotz, Wenz and Levermann, "The economic commitment of climate change" (Nature, April 2024), which projected a 19 % reduction in world income within 26 years, was retracted by its authors on 3 December 2025: the result proved sensitive to removing a single country, Uzbekistan, whose 1995–1999 economic data were inaccurate, and spatial auto-correlation affected the uncertainty ranges. The authors’ revised central estimate is 17 % with the range widening from 11–29 % to 6–31 %. Surviving estimates across the literature still span an order of magnitude.',
        proves:
          'Proves the fragility of any specific headline magnitude. It does not prove damages are small — the retraction removed a number, not the phenomenon.',
      },
    ],
    steelman: {
      text:
        'The strongest defensible version: even the low end of surviving damage estimates — plus the non-market and tail risks the models omit — exceeds central EU mitigation-cost estimates, so the inequality “inaction costs more than action” is robust across specifications even where any single damage number is not.',
      sourceLabel: 'IPCC AR6 Synthesis Report',
      sourceUrl: 'https://www.ipcc.ch/report/ar6/syr/',
    },
    crossLinks: [M43],
  },
  {
    id: 'f6-first-mover',
    direction: 'for-ambition',
    topic: 'growth-and-jobs',
    claim:
      'Because the EU moved first on climate regulation, its industries gain a first-mover advantage in the technologies the rest of the world will need.',
    attribution: 'paraphrase',
    speaker: 'European Commission (Green Deal framing, carried into the Clean Industrial Deal)',
    forum: 'Commission communications, 2019–25',
    date: '2019–25 (recurring)',
    sourceLabel: 'Clean Industrial Deal, COM(2025) 85 (EUR-Lex)',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025DC0085',
    propositions: [
      {
        id: 'f6-p1',
        text: 'The EU holds strong positions in some clean-tech segments (wind, grid equipment, heat pumps, electrolyser IP).',
        verdict: 'SUPPORTED',
        basis:
          'High-value patent shares and incumbent manufacturing positions in wind and grid equipment are documented in JRC and IEA innovation tracking.',
        proves:
          'Proves current positions. It cannot prove their durability under subsidised competition.',
      },
      {
        id: 'f6-p2',
        text: 'Early regulation reliably converted into EU market leadership.',
        verdict: 'UNSUPPORTED',
        basis:
          'Solar PV is the canonical counter-example: early EU deployment support did not prevent manufacturing migrating almost entirely to China; the EU cell/module share of world capacity is a low single-digit percentage.',
        proves:
          'Proves at least one major failed case, refuting the claim as a general law. It cannot prove the mechanism never works — wind and grid equipment are partial successes.',
      },
    ],
    steelman: {
      text:
        'The strongest defensible version: lead markets create advantage only when paired with manufacturing-side conditions — scale, energy costs, capital. Where those held, EU firms did convert early regulation into durable export positions (wind, grids). First-mover advantage is conditional, not automatic — the Draghi report’s own sectoral chapters make exactly this distinction.',
      sourceLabel: 'Draghi report — sectoral chapters (clean technologies)',
      sourceUrl: 'https://commission.europa.eu/topics/eu-competitiveness/draghi-report_en',
    },
  },
  {
    id: 'f7-simplification-deregulation',
    direction: 'for-ambition',
    topic: 'omnibus',
    claim:
      'The omnibus is deregulation dressed up as simplification: cutting some four in five companies out of sustainability reporting and narrowing due-diligence duties changes the substance of the Green Deal, not the paperwork.',
    attribution: 'paraphrase',
    speaker: 'Civil-society coalition (CAN Europe, WWF European Policy Office and others)',
    forum: 'Joint statements on the Omnibus I package',
    date: 'February 2025',
    sourceLabel: 'CAN Europe — omnibus statements',
    sourceUrl: 'https://caneurope.org/',
    propositions: [
      {
        id: 'f7-p1',
        text: 'Omnibus I removes roughly 80 % of previously covered companies from CSRD scope.',
        verdict: 'SUPPORTED',
        basis:
          'The Commission’s own explanatory material for COM(2025) 81 states that about 80 % of undertakings would leave scope under the raised employee threshold.',
        proves:
          'Proves what the proposal does to scope, on the proposer’s own figures. It cannot prove the final adopted law.',
      },
      {
        id: 'f7-p2',
        text: 'The package weakens substantive due-diligence obligations, not only reporting.',
        verdict: 'SUPPORTED',
        basis:
          'The CSDDD amendments narrow the tiers of the chain covered, lengthen assessment cycles and remove the harmonised civil-liability regime — substantive changes on the face of the proposal.',
        proves:
          'Proves the content of the proposals goes beyond paperwork. Whether that content is justified is an evaluative question this check cannot answer.',
      },
      {
        id: 'f7-p3',
        text: 'The Commission’s intent is deregulation rather than simplification.',
        verdict: 'NOT_CHECKABLE',
        basis:
          'Intent is not an empirical quantity; the observable record (scope cuts beyond pure form) is compatible with both descriptions.',
        proves:
          'Proves nothing about motive. The checkable part — that the changes are substantive — is established by the propositions above.',
      },
    ],
    crossLinks: [M39],
  },
];
