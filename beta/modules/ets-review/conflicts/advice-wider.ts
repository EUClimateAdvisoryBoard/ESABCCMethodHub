/**
 * ADVICE_WIDER — ESABCC advice corpus, wider layer: carbon dioxide removals,
 * the energy crisis, energy infrastructure/TEN-E, adaptation and agri-food.
 *
 * Work package WP1b of the "Advice conflicts" submodule (beta module M·37,
 * ETS Review). AI-extracted by a Sonnet agent (Claude Sonnet 5) from the
 * pre-extracted report texts (`===== PAGE n =====` markers), pending
 * Secretariat verification — do not treat quotes, page cites or paraphrases
 * here as final until checked against the source PDFs.
 *
 * Source PDFs (see `ADVICE_REPORT_FILES` in `./types` for the exact filenames):
 *   - `carbon-removals-2025` — "Scaling up carbon dioxide removals:
 *     recommendations for navigating opportunities and risks in the EU"
 *     (Feb 2025).
 *   - `energy-crisis-2023` — "Scientific advice on policy responses to the
 *     energy crisis in relation to the transition to climate neutrality"
 *     (Feb 2023).
 *   - `acer-energy-infrastructure-2022` — letter to ACER on framework
 *     guidelines on scenarios for network development planning (Nov 2022).
 *   - `scenario-guidelines-2022` — advice on the TEN-E scenario guidelines
 *     (Nov 2022).
 *   - `decarbonised-energy-infrastructure-2023` — "Towards a decarbonised and
 *     climate-resilient EU energy infrastructure" (TYNDP cost-benefit-analysis
 *     advice, Mar 2023).
 *   - `ten-e-draft-scenarios-2024` — advice on the draft TYNDP 2024 scenarios
 *     under the TEN-E Regulation (Jun 2024).
 *   - `adaptation-2026` — EU adaptation policy framework report (Feb 2026).
 *   - `agri-food-2026` — EU agri-food system report (Mar 2026).
 */

import type { AdvicePosition } from './types';

export const ADVICE_WIDER: AdvicePosition[] = [
  /* --------------------------------------------------- carbon-removals-2025 */
  {
    id: 'ap-cdr-separate-targets',
    reportId: 'carbon-removals-2025',
    theme: 'removals',
    title: 'Set separate legally-binding targets for reductions, permanent removals and temporary removals',
    position:
      'The Board recommends that the EU set separate, legally-binding targets for gross emission reductions, permanent removals and temporary removals, covering near-, medium- and long-term horizons, so that removals cannot be used to mask a shortfall in actual emission cuts.',
    quote:
      'To signal commitment, guide investments, drive innovation and ensure that both temporary and permanent removals contribute effectively to climate goals without deterring emission reductions, the Advisory Board recommends that the EU set separate legally-binding targets for gross emission reductions, permanent removals and temporary removals.',
    pages: [10],
    recIds: ['cdr-2025-separate-targets'],
  },
  {
    id: 'ap-cdr-mrv-quality',
    reportId: 'carbon-removals-2025',
    theme: 'removals',
    title: 'Build robust activity- and national-level MRV before removals gain market value',
    position:
      'The Board asks the EU to develop robust monitoring, reporting and verification systems at both activity and national level, differentiating certificates for temporary removals, permanent removals and emission reductions, as a precondition for trust and accountability.',
    quote:
      'To build trust, ensure accountability and drive investments while addressing associated reversals and impacts on ecosystems and communities, the Advisory Board recommends that the EU develop robust monitoring, reporting and verification (MRV) systems at both activity and national levels.',
    pages: [10],
    recIds: ['cdr-2025-mrv-quality'],
  },
  {
    id: 'ap-cdr-ets-integration',
    reportId: 'carbon-removals-2025',
    theme: 'removals',
    title: 'Only integrate permanent removals into the ETS progressively and under strict conditions',
    position:
      'The Board supports using the ETS Directive revision to bring permanent removals into the system, but only progressively, under strict quantitative and qualitative limits consistent with separate targets, and only once robust certification is in place — explicitly to prevent mitigation deterrence and protect distributional fairness.',
    quote:
      'To incentivise the deployment of removals in a fiscally sustainable and cost-effective way, the Advisory Board recommends that the EU consider a progressive integration of permanent removals into the EU ETS, under strict conditions to prevent mitigation deterrence, address environmental risks, support distributional fairness and enhance dynamic cost-effectiveness.',
    pages: [12],
    recIds: ['cdr-2025-ets-integration'],
  },
  {
    id: 'ap-cdr-lulucf-pricing',
    reportId: 'carbon-removals-2025',
    theme: 'removals',
    title: 'Price LULUCF emissions and removals through a separate instrument, not the ETS',
    position:
      'The Board wants a dedicated pricing instrument for land-sector emissions and removals, kept coherent with — but distinct from — the wider carbon-pricing framework, with any future integration into other GHG pricing systems made conditional.',
    quote:
      'To balance the competing demands for land and biomass resources, and to incentivise the conservation and enhancement of the land sink while accounting for reversal, the Advisory Board recommends that the EU introduce new instruments to price emissions and reward removals in the LULUCF sector, and to ensure coherence with the broader climate policy framework.',
    pages: [12],
    recIds: ['cdr-2025-lulucf-pricing'],
  },
  {
    id: 'ap-cdr-mitigation-deterrence',
    reportId: 'carbon-removals-2025',
    theme: 'removals',
    title: 'Optimistic removals assumptions risk mitigation deterrence and jeopardise EU climate objectives',
    position:
      'The Board warns that treating removals as a cheap, readily available substitute for emission cuts risks mitigation deterrence: if the assumed volume of removals fails to materialise, the shortfall directly jeopardises the EU\'s climate objectives, which is why removals should be restricted to activities with no or limited mitigation alternatives.',
    quote:
      'Pursuing a seemingly cost-effective contribution of removals towards climate neutrality based on overly optimistic assumptions about future removal costs and potentials risks leading to mitigation deterrence, which can jeopardise the achievement of the EU climate objectives if the expected volume of removals does not materialise ...',
    pages: [84],
    recIds: [],
  },
  {
    id: 'ap-cdr-permanence-definition',
    reportId: 'carbon-removals-2025',
    theme: 'removals',
    title: 'Only carbon stored for several centuries counts as a permanent removal',
    position:
      'The Board endorses the CRCF Regulation\'s strict definition of "permanent" removal — storage for several centuries, excluding enhanced hydrocarbon recovery — and insists that permanent, temporary and reduction units follow distinct MRV requirements rather than being conflated, since any looser permanence standard entering the ETS would undermine the environmental integrity of allowances.',
    quote:
      "'permanent carbon removal' means any practice or process that, under normal circumstances and using appropriate management practices, captures and stores atmospheric or biogenic carbon for several centuries, including permanently chemically bound carbon in products, and which is not combined with Enhanced Hydrocarbon Recovery",
    pages: [125],
    recIds: ['cdr-2025-mrv-quality'],
  },
  {
    id: 'ap-cdr-liability-reversal',
    reportId: 'carbon-removals-2025',
    theme: 'removals',
    title: 'Liability mechanisms for reversal must be in place before removals are traded',
    position:
      'The Board requires that binding liability mechanisms for reversal — collective buffers, up-front insurance, corrective measures aligned with the ETS and CCS directives — be established under the CRCF delegated acts before removal credits are relied upon, so that any future ETS integration does not inherit unmanaged reversal risk.',
    quote:
      'The CRCF regulation signals the need for preventive measures to minimise the risk of reversals and liability mechanisms, as well as rules on the risk of failure of the liability mechanisms, such as collective buffers and up-front insurance mechanisms.',
    pages: [126],
    recIds: ['cdr-2025-mrv-quality'],
  },

  /* ------------------------------------------------------- energy-crisis-2023 */
  {
    id: 'ap-crisis-root-causes',
    reportId: 'energy-crisis-2023',
    theme: 'demand-reduction',
    title: 'Tackle the energy crisis through demand reduction and low-carbon supply, not ad hoc price interventions',
    position:
      'The Board\'s central crisis-response recommendation is to rebalance energy demand and supply structurally, rather than to subsidise prices — ad hoc interventions such as consumption subsidies and price caps treat symptoms and blunt the price signal that drives the transition.',
    quote:
      'The Advisory Board recommends that policy makers focus on reducing energy demand and increasing the supply of secure, domestic and low-carbon energy sources as the principal mechanism by which energy prices can be brought down, rather than ad hoc market interventions such as energy consumption subsidies and price caps.',
    pages: [7],
    recIds: ['energy-crisis-2023-root-causes'],
  },
  {
    id: 'ap-crisis-electrification-price-signal',
    reportId: 'energy-crisis-2023',
    theme: 'electrification',
    title: 'Align carbon-price signals with electrification and welcome ETS strengthening',
    position:
      'The Board asks that price signals be aligned with electrification goals, explicitly welcoming the strengthening of the EU ETS and the introduction of a parallel system for buildings and road transport as complements to accelerated heat-pump deployment.',
    quote:
      'the Advisory Board recommends aligning price signals with electrification goals. It welcomes the provisional agreement on strengthening the EU Emissions Trading System (EU ETS) and the introduction of a similar system for buildings and road transport.',
    pages: [8],
    recIds: ['energy-crisis-2023-electrification'],
  },
  {
    id: 'ap-crisis-income-support',
    reportId: 'energy-crisis-2023',
    theme: 'fairness',
    title: 'Shield vulnerable consumers with direct income support that preserves the carbon-price signal',
    position:
      'The Board\'s preferred way to protect vulnerable households is direct income support rather than price-distorting subsidies, precisely because it maintains the price signal that drives energy savings and low-carbon investment.',
    quote:
      'Direct income support is preferred over price-distorting interventions, as it maintains the price signal for energy savings and investments in renewables.',
    pages: [8],
    recIds: ['energy-crisis-2023-vulnerable-consumers'],
  },
  {
    id: 'ap-crisis-msr-carbon-price',
    reportId: 'energy-crisis-2023',
    theme: 'investment-revenue',
    title: 'Selling Market Stability Reserve allowances to fund the crisis response risks expanding the ETS carbon budget',
    position:
      'The Board flags that raising crisis-response revenue by selling allowances held in the Market Stability Reserve increases the total supply of allowances under the ETS, which both depresses the carbon price and expands the system\'s overall carbon budget — a trade-off between short-term revenue needs and the integrity of the price signal.',
    quote:
      'The sale of MSR allowances could increase the total carbon budget under the system by approximately 25 Mt CO2eq, assuming an average carbon price of €80/t ...',
    pages: [36],
    recIds: [],
  },
  {
    id: 'ap-crisis-revenue-earmarking',
    reportId: 'energy-crisis-2023',
    theme: 'investment-revenue',
    title: 'Welcomes full earmarking of crisis-response revenues for climate-aligned measures',
    position:
      'The Board welcomes the EU rule that 100% of the revenue raised from energy-sector windfall measures be spent on crisis-response measures that are themselves aligned with EU climate objectives, treating this earmarking as the model for how emergency revenue should be used.',
    quote:
      "the Advisory Board welcomes the provisions in the EU measures that earmark 100% of the revenues generated from these measures to be spent on crisis response measures, which are also aligned with the EU's climate objectives ...",
    pages: [35],
    recIds: [],
  },

  /* ------------------------------------------------ acer-energy-infrastructure-2022 */
  {
    id: 'ap-acer-target-compliance',
    reportId: 'acer-energy-infrastructure-2022',
    theme: 'governance',
    title: 'Network-planning scenarios must comply with climate targets at all times',
    position:
      'The Board\'s headline ask to ACER is that TYNDP network-planning scenarios be adjusted as soon as intermediary climate targets are adopted, modelled out to at least 2050, and span a genuine range of climate-neutrality pathways — a standing conditionality on infrastructure planning, not a one-off check.',
    quote:
      'Comply with climate targets at all times: Scenarios should be adjusted as soon as intermediary climate targets are adopted, be modelled until at least 2050, and capture a range of different pathways to climate neutrality.',
    pages: [1],
    recIds: ['acer-2022-target-compliance'],
  },

  /* ------------------------------------------------------ scenario-guidelines-2022 */
  {
    id: 'ap-tene-guide-target-compliance',
    reportId: 'scenario-guidelines-2022',
    theme: 'governance',
    title: 'Scenario Guidelines must require ongoing, not one-off, climate-target compliance',
    position:
      'The Board recommends the Scenario Guidelines require scenarios to track new or revised EU climate targets over time, not just the targets in force when a scenario cycle begins.',
    quote:
      'The Advisory Board recommends that the Scenario Guidelines require the scenarios to comply not only with the current 2030 and 2050 climate targets, but to be updated as necessary to comply with new or revised EU climate targets.',
    pages: [7],
    recIds: ['tene-guide-2022-target-compliance'],
  },
  {
    id: 'ap-tene-guide-infra-lifetimes',
    reportId: 'scenario-guidelines-2022',
    theme: 'governance',
    title: 'New fossil infrastructure with a 25-year lifetime is incompatible with target-compliant scenarios',
    position:
      'The Board holds that in scenarios genuinely compliant with EU climate targets, new fossil infrastructure cannot be assumed to run a full 25-year lifetime — it would either be retired early or become a stranded asset — so infrastructure-lifetime assumptions must be aligned with the transition pathway, not the other way round.',
    quote:
      'In scenarios that comply with climate targets, it is not conceivable that new fossil infrastructure would have a lifetime of 25 years. These will either be retired early or become ... stranded assets unless there is a potential for repurposing.',
    pages: [15],
    recIds: ['tene-guide-2022-infrastructure-lifetimes'],
  },

  /* --------------------------------------------- decarbonised-energy-infrastructure-2023 */
  {
    id: 'ap-eicba-cost-of-carbon',
    reportId: 'decarbonised-energy-infrastructure-2023',
    theme: 'pricing-scope',
    title: 'Cost-benefit analysis of infrastructure should price carbon on an EU-wide opportunity-cost basis, inside and outside the ETS',
    position:
      'The Board recommends that the cost of GHG emissions used in TYNDP cost-benefit analysis reflect an opportunity-cost approach spanning the whole of EU climate policy — including options outside the ETS — rather than being left to project appraisers\' discretion, so that infrastructure choices are not distorted by an artificially low or inconsistent carbon price.',
    quote:
      'Given that the EU has a set of climate targets, we suggest using an opportunity cost approach for the entire EU climate policy, i.e. one that considers options both within and outside the EU Emissions Trading System (ETS).',
    pages: [14],
    recIds: ['ei-cba-2023-cost-of-carbon'],
  },

  /* ------------------------------------------------------- ten-e-draft-scenarios-2024 */
  {
    id: 'ap-tene24-ghg-budget',
    reportId: 'ten-e-draft-scenarios-2024',
    theme: 'carbon-budget',
    title: 'Draft TYNDP 2024 scenarios exceed the Board\'s 11–14 Gt 2030–50 GHG budget',
    position:
      'The Board finds that the draft TYNDP 2024 scenarios (Distributed Energy at 15.9 Gt, Global Ambition at roughly 15 Gt CO2e) sit above its recommended 11–14 Gt cumulative GHG budget for 2030–2050, with excluded industrial-process emissions suggesting the gap could be even larger — the infrastructure these scenarios plan for is not sized to a target-compliant emissions pathway.',
    quote:
      'At 15.9 Gt of carbon dioxide equivalent (CO2e), the GHG budget presented for the distributed energy (DE) scenario exceeds the Advisory Board\'s recommended GHG budget of 11–14 Gt CO2e for 2030–2050.',
    pages: [6],
    recIds: ['tene-2024-target-alignment'],
  },
  {
    id: 'ap-tene24-electrification-gap',
    reportId: 'ten-e-draft-scenarios-2024',
    theme: 'electrification',
    title: 'Draft TYNDP 2024 scenarios under-deliver on electrification relative to the Board\'s benchmark range',
    position:
      'The Board finds that final energy consumption and electrification rates in the draft joint scenarios — especially the Global Ambition scenario — fall below its benchmark scenario range for 2040 and 2050, meaning the infrastructure planned understates the pace of direct electrification needed for a target-compliant transition.',
    quote:
      'final energy consumption and electrification rates are lower than benchmark scenarios in 2040 and 2050, especially in the GA scenario, which has higher final energy consumption and lower electrification rates than all the benchmark scenarios ...',
    pages: [13],
    recIds: ['tene-2024-target-alignment'],
  },
  {
    id: 'ap-tene24-co2-price',
    reportId: 'ten-e-draft-scenarios-2024',
    theme: 'pricing-scope',
    title: 'Draft scenarios use a CO2 price far below the Board\'s recommended opportunity-cost trajectory',
    position:
      'The Board notes that the draft joint scenarios assume a CO2 price rising from only €114/t in 2030 to €168/t in 2050, well below the €250/t (2030) to €800/t (2050) opportunity-cost trajectory it had previously recommended — understating the carbon price materially skews the infrastructure investment case away from what a credible climate-target-compliant price path would imply.',
    quote:
      'The CO₂ price is assumed to be equal in all draft joint scenarios and ranges from EUR 114/t in 2030 and EUR 147/t in 2040 to EUR 168/t in 2050 ... a value that increases from EUR 250/t CO2e in 2030 to EUR 800/t CO2e in 2050 ...',
    pages: [25],
    recIds: ['tene-2024-co2-price'],
  },

  /* ------------------------------------------------------------- adaptation-2026 */
  {
    id: 'ap-adapt-resilience-by-design',
    reportId: 'adaptation-2026',
    theme: 'governance',
    title: 'Apply climate resilience by design across all EU policies, including the ETS review',
    position:
      'The Board\'s headline governance ask is that climate resilience be built in by design across every EU policy, programme and decision — not confined to dedicated adaptation instruments — which extends in principle to the design of the ETS review and the Electrification Action Plan.',
    quote:
      'The EU should apply the climate resilience by design principle across all EU policies, programmes, and decisions.',
    pages: [15],
    recIds: ['adaptation-2026-resilience-by-design'],
  },
  {
    id: 'ap-adapt-revenue-fairness',
    reportId: 'adaptation-2026',
    theme: 'fairness',
    title: 'ETS auction revenue already funds just-transition instruments, but adaptation funding responsibility is unclear',
    position:
      'The Board notes that the polluter-pays principle underpins the use of EU ETS auctioning revenue to finance the Social Climate Fund and Modernisation Fund for mitigation, but that equivalent funding responsibilities for just resilience/adaptation remain undefined — a gap the Board wants addressed as ETS revenue instruments are reviewed.',
    quote:
      "several EU instruments aimed at ensuring a just transition apply the 'polluter pays' principle, such as in the use of EU emissions trading system auctioning revenue to finance the Social Climate Fund and the Modernisation Fund. While these funds can finance adaptation, funding responsibilities for just resilience are not yet clear ...",
    pages: [92],
    recIds: ['adaptation-2026-fairness'],
  },

  /* --------------------------------------------------------------- agri-food-2026 */
  {
    id: 'ap-agri-unpriced-emissions',
    reportId: 'agri-food-2026',
    theme: 'pricing-scope',
    title: 'Agriculture is 17% of EU net GHG emissions and remains unpriced',
    position:
      'The Board\'s central pricing-scope finding is that agriculture accounts for roughly 17% of the EU\'s net GHG emissions yet faces no carbon price under existing market mechanisms, which it treats as a coherence gap in an EU climate-pricing framework that increasingly leans on the ETS elsewhere.',
    quote:
      'Agriculture currently accounts for roughly 17% of the EU\'s net greenhouse gas emissions, yet these emissions are not priced under existing carbon-market mechanisms.',
    pages: [13],
    recIds: ['agri-food-2026-ag-ets'],
  },
  {
    id: 'ap-agri-free-allocation-auctioning',
    reportId: 'agri-food-2026',
    theme: 'pricing-scope',
    title: 'A future AgETS should start with free allocation and transition to auctioning, ETS-style',
    position:
      'The Board recommends that any agricultural GHG pricing system apply the polluter-pays principle gradually, starting with free allocation before transitioning to auctioning — explicitly modelled on the EU ETS\'s own free-allocation-to-auctioning trajectory — so that auction revenue can be reinvested in the sector\'s transition.',
    quote:
      'Gradually apply the polluter pays principle and reward removals. Start with free allocation of allowances but transition towards auctioning, which would generate revenues that could be reinvested within the agricultural sector ...',
    pages: [14],
    recIds: ['agri-food-2026-ag-ets'],
  },
  {
    id: 'ap-agri-ets2-fossil-fuel',
    reportId: 'agri-food-2026',
    theme: 'pricing-scope',
    title: 'Agriculture\'s fossil-fuel use should be folded into EU ETS2, not left excluded',
    position:
      'The Board argues that agricultural machinery and heating fuel use could feasibly be brought inside the forthcoming EU ETS2 alongside buildings and road transport, and sees no clear economic justification for agriculture\'s current exclusion from that scheme — directly bearing on how the ETS2 scope is defined in the review.',
    quote:
      'the sector\'s use of oil and natural gas for agricultural machinery, greenhouses etc. could feasibly be incorporated into the forthcoming EU ETS2, which is designed to cover emissions from buildings, road transport and small-scale industry. Although agriculture (alongside fisheries) has thus far been excluded from EU ETS2, it would make economic sense to have all fuel uses covered under the same pricing scheme.',
    pages: [190],
    recIds: ['agri-food-2026-ag-ets'],
  },
];
