/**
 * ADVICE_CORE — ESABCC advice corpus, core targets/budget/climate-law layer.
 *
 * Work package WP1a of the "Advice conflicts" submodule (beta module M·37,
 * ETS Review). AI-extracted by a Sonnet agent from the pre-extracted report
 * texts (`===== PAGE n =====` markers), pending Secretariat verification —
 * do not treat quotes, page cites or paraphrases here as final until checked
 * against the source PDFs.
 *
 * Source PDFs (see `ADVICE_REPORT_FILES` in `./types` for the exact filenames):
 *   - `2040-target-advice-2023` — "Scientific advice for the determination of
 *     an EU-wide 2040 climate target and a greenhouse gas budget for
 *     2030–2050" (June 2023).
 *   - `towards-eu-climate-neutrality-2024` — "Towards EU climate neutrality:
 *     progress, policy gaps and opportunities" (Jan 2024). The tracker-source
 *     index at `esabcc-reports/2024-01-18-towards-eu-climate-neutrality-tracker-source.md`
 *     was used to locate recommendation numbers; all `pages` below cite the
 *     PDF text extraction, not the index.
 *   - `climate-targets-2023` — "Setting climate targets based on scientific
 *     evidence and EU values: initial recommendations to the European
 *     Commission" (Jan 2023).
 *   - `climate-law-amendment-2025` — advice on amending the European Climate
 *     Law (June 2025).
 */

import type { AdvicePosition } from './types';

export const ADVICE_CORE: AdvicePosition[] = [
  /* ---------------------------------------------- 2040-target-advice-2023 */
  {
    id: 'ap-2040-headline-range',
    reportId: '2040-target-advice-2023',
    theme: 'cap-ambition',
    title: 'Keep the 2030–50 GHG budget to 11–14 Gt CO2e, requiring 90–95% domestic cuts by 2040',
    position:
      'The Board recommends that the EU keep its greenhouse gas budget for 2030–2050 within 11 to 14 Gt CO2e, which requires domestic emission reductions of 90–95% by 2040 relative to 1990. The range reflects both fairness and feasibility considerations.',
    quote:
      "The Advisory Board recommends keeping the EU’s greenhouse gas emissions budget within a limit of 11 to 14 Gt CO2e between 2030 and 2050. Staying within this budget requires emission reductions of 90–95% by 2040, relative to 1990.",
    pages: [10],
    recIds: ['advice-2023-2040-target'],
  },
  {
    id: 'ap-2040-fairness-floor',
    reportId: '2040-target-advice-2023',
    theme: 'carbon-budget',
    title: 'Fairness sets the 90% floor of the 2040 range and the 14 Gt CO2e budget ceiling',
    position:
      'Taking fairness considerations into account, the Board sets 90% as the minimum acceptable 2040 reduction, corresponding to a budget ceiling of 14 Gt CO2e for 2030–2050, with the full 90–95% range corresponding to an 11–14 Gt CO2e budget.',
    quote:
      'Taking fairness into account, the Advisory Board therefore considers that the minimum reduction for 2040 should be 90% below 1990 levels, with a corresponding greenhouse gas budget under 14 Gt CO2e for 2030-2050.',
    pages: [15],
    recIds: ['advice-2023-2040-target'],
  },
  {
    id: 'ap-2040-domestic-plus-outside-eu',
    reportId: '2040-target-advice-2023',
    theme: 'international-credits',
    title: 'Domestic ambition comes first; action outside the EU complements, and net-negative emissions follow 2050',
    position:
      'To deliver a fair contribution, the Board sets out three obligations: maximise domestic emission reductions and carbon dioxide removals; contribute to direct emission reductions outside the EU to bridge the fairness shortfall; and pursue sustainable net-negative emissions after 2050 to help manage temperature overshoot.',
    quote:
      'the Advisory Board recommends that ambitious reductions in domestic emissions be complemented by measures outside the EU... 1. Aim for the highest level of ambition in domestic emission reductions and carbon dioxide removals... 2. Contribute to direct emission reductions outside the EU... 3. Pursue sustainable net negative emissions after 2050, as required under the European Climate Law.',
    pages: [15],
    recIds: [],
  },
  {
    id: 'ap-2040-early-action-cumulative',
    reportId: '2040-target-advice-2023',
    theme: 'carbon-budget',
    title: 'Going beyond the 55% 2030 target lowers cumulative emissions and raises fairness',
    position:
      'The Board frames the budget as a cumulative-emissions problem: additional near-term ambition beyond the 55% 2030 target — including through enhanced carbon removal — reduces the EU\'s cumulative emissions to 2050, directly increasing the fairness of its contribution.',
    quote:
      "Additional efforts to increase the level of ambition beyond 55%, including through enhanced carbon removal, would considerably decrease the EU’s cumulative emissions until 2050, and thus increase the fairness of the EU’s contribution to global climate change mitigation efforts.",
    pages: [15, 16],
    recIds: [],
  },
  {
    id: 'ap-2040-fair-share-exhausted',
    reportId: '2040-target-advice-2023',
    theme: 'fairness',
    title: 'Under some equity principles the EU has already used up its fair share of the global budget',
    position:
      'Assessing the EU\'s contribution against different ethical principles, the Board finds that under some of them the EU has already exhausted its fair share of the remaining global emissions budget — an argument for pursuing the top of the 2040 range.',
    quote:
      "The Advisory Board assessed the fairness of the EU’s contribution under different ethical principles. Under some of these principles, the EU has already exhausted its fair share of the global emissions budget.",
    pages: [10],
    recIds: [],
  },
  {
    id: 'ap-2040-aviation-extra-eu-ets',
    reportId: '2040-target-advice-2023',
    theme: 'pricing-scope',
    title: 'Extra-EU aviation should be brought into the ETS or CORSIA by 2027',
    position:
      'The Board notes that 2026 legislation should extend carbon pricing to extra-EU aviation emissions, either through EU ETS inclusion or the international CORSIA scheme, with an EU ETS extension to extra-EU flights required from January 2027 if CORSIA proves too weak.',
    quote:
      "Legislation to be proposed in 2026 should cover extra-EU aviation, through inclusion in EU ETS and/or under the International Civil Aviation Authority’s carbon offsetting and reduction scheme (CORSIA).",
    pages: [51],
    recIds: [],
  },
  {
    id: 'ap-2040-carbon-leakage-industry',
    reportId: '2040-target-advice-2023',
    theme: 'pricing-scope',
    title: 'Industrial decarbonisation must guard against carbon leakage from relocation',
    position:
      'Reducing industrial energy use and emissions depends on both domestic and international action, and the Board flags carbon leakage — energy-intensive industries relocating outside the EU — as a risk to watch as pricing tightens.',
    quote:
      'A consistent reduction in the energy use and emissions from the industry sector relies on both domestic and international reductions. The EU should watch out for the risk of carbon leakage resulting from the relocation of energy-intensive industries, such as metals, cement, chemicals or fertilisers.',
    pages: [66],
    recIds: [],
  },

  /* ------------------------------------------------------ climate-targets-2023 */
  {
    id: 'ap-ct2023-systematic-transparent',
    reportId: 'climate-targets-2023',
    theme: 'governance',
    title: 'The 2040 target and budget should be set through a systematic, transparent, values-based process',
    position:
      'Ahead of its quantitative advice, the Board\'s initial input asks the Commission to follow a systematic, transparent process guided by EU values when preparing the 2040 target proposal and its accompanying greenhouse gas budget.',
    quote:
      'The Advisory Board recommends that the European Commission follow an approach that is systematic, transparent and guided by EU values, when preparing its EU 2040 climate target proposal and accompanying greenhouse gas budget.',
    pages: [1],
    recIds: ['climate-targets-2023-init-context'],
  },
  {
    id: 'ap-ct2023-side-effects-feasibility',
    reportId: 'climate-targets-2023',
    theme: 'governance',
    title: 'Target choice should weigh side effects, co-benefits, resilience and feasibility, not emissions alone',
    position:
      'Among the five key areas the Commission should address, the Board asks that the implications of different 2040 pathways be assessed in terms of side effects, co-benefits, resilience to climate impacts and overall feasibility, not emissions numbers alone.',
    quote:
      'The implications of different pathways in terms of side effects, co-benefits, resilience and feasibility',
    pages: [2],
    recIds: ['climate-targets-2023-init-side-effects'],
  },

  /* --------------------------------------------------- climate-law-amendment-2025 */
  {
    id: 'ap-cl2025-domestic-9095-budget',
    reportId: 'climate-law-amendment-2025',
    theme: 'cap-ambition',
    title: 'A domestic 90–95% 2040 target, corresponding to the 11–14 Gt CO2e budget, remains the Board\'s advice',
    position:
      'Reviewing its 2023 advice in 2025, the Board reaffirms a domestic net GHG reduction target of 90–95% below 1990 levels by 2040, tied to the 11–14 Gt CO2e 2030–2050 budget and framed as a critical milestone to climate neutrality.',
    quote:
      'The EU should set a domestic net greenhouse gas reduction target of 90–95 % below 1990 levels by 2040, as recommended by the Advisory Board... corresponds to a 2030–2050 greenhouse gas budget of 11–14 Gt CO₂e, aligned with the 1.5 °C goal of the Paris Agreement.',
    pages: [27],
    recIds: ['climate-law-2025-2040-target'],
  },
  {
    id: 'ap-cl2025-no-intl-credits-for-target',
    reportId: 'climate-law-amendment-2025',
    theme: 'international-credits',
    title: 'International carbon credits should not replace domestic reductions in meeting the 2040 target',
    position:
      'Because international credits carry additionality, leakage and MRV risks and could divert investment from the EU\'s own transformation, the Board does not recommend using them to replace domestic emission reductions when meeting the 2040 target.',
    quote:
      'For these reasons, the Advisory Board does not recommend using international carbon credits to replace domestic emission reductions when meeting the 2040 target.',
    pages: [7],
    recIds: ['climate-law-2025-international-action'],
  },
  {
    id: 'ap-cl2025-article6-domestic-only',
    reportId: 'climate-law-amendment-2025',
    theme: 'international-credits',
    title: 'The Climate Law mandates domestic-only delivery; Article 6 credits cannot substitute for it',
    position:
      'The Board reads the European Climate Law as requiring the EU\'s targets to be met through domestic action only, so any mitigation outcomes or credits obtained through Article 6 of the Paris Agreement cannot substitute for domestic emission reductions or removals.',
    quote:
      "the European Climate Law mandates the EU’s climate targets be met through domestic action only, any mitigation outcomes or credits obtained via Article 6 mechanisms cannot substitute for domestic emission reductions and carbon removals.",
    pages: [38],
    recIds: ['climate-law-2025-international-action'],
  },
  {
    id: 'ap-cl2025-three-separate-targets',
    reportId: 'climate-law-amendment-2025',
    theme: 'removals',
    title: 'Set three separate 2040 targets — gross reductions, permanent removals, temporary removals',
    position:
      'To stop removals substituting for emission cuts, the Board recommends the EU set three distinct 2040 targets — for gross emission reductions, permanent carbon dioxide removals and temporary carbon dioxide removals — as part of a broader CDR framework.',
    quote:
      'To ensure that both temporary and permanent removals contribute effectively to climate goals without deterring emission reductions, the EU should set three separate 2040 targets for gross emission reductions, permanent carbon dioxide removals and temporary carbon dioxide removals.',
    pages: [8],
    recIds: ['climate-law-2025-three-targets'],
  },
  {
    id: 'ap-cl2025-speed-matters',
    reportId: 'climate-law-amendment-2025',
    theme: 'carbon-budget',
    title: 'Early domestic action minimises cumulative emissions and avoids abrupt later cuts',
    position:
      'The Board argues that the pace of action matters as much as the 2040 endpoint: early domestic action reduces cumulative emissions, avoids the need for abrupt reductions later, and accelerates innovation and cost reductions.',
    quote:
      'Speed matters. Early domestic action is critical to achieving the 2040 target, minimising cumulative emissions, avoiding abrupt reductions later, and accelerating innovation and cost reductions.',
    pages: [8],
    recIds: [],
  },
  {
    id: 'ap-cl2025-permanent-removals-ets-integration',
    reportId: 'climate-law-amendment-2025',
    theme: 'removals',
    title: 'Separate removal targets should be backed by gradual, priced integration of permanent removals into the ETS',
    position:
      'Alongside the three separate targets, the Board calls for effective pricing tools to support them, including the gradual integration of permanent removals into the EU ETS and an extended emitter-responsibility mechanism — a conditional, cautious form of ETS integration rather than immediate netting.',
    quote:
      'These targets should be set in the European Climate Law or subsequent legislation and form part of a broader EU carbon dioxide removal framework... effective pricing tools, such as the gradual integration of permanent removals into the EU ETS and the introduction of extended emitter responsibility.',
    pages: [8],
    recIds: ['climate-law-2025-three-targets'],
  },
  {
    id: 'ap-cl2025-polluter-pays-broadening',
    reportId: 'climate-law-amendment-2025',
    theme: 'pricing-scope',
    title: 'Broaden emission pricing and apply the polluter-pays principle consistently across sectors',
    position:
      'The Board has repeatedly highlighted that broadening emission pricing and consistently applying the polluter-pays principle across sectors is necessary both to maintain cost-effective mitigation incentives and to generate revenue for socially balanced climate action.',
    quote:
      'The Advisory Board has highlighted how broadening emission pricing and consistently applying the polluter pays principle across sectors is necessary to maintain cost-effective incentives to reduce emissions, while generating additional revenues for socially balanced climate action.',
    pages: [37],
    recIds: [],
  },
  {
    id: 'ap-cl2025-fossil-subsidy-redirect',
    reportId: 'climate-law-amendment-2025',
    theme: 'investment-revenue',
    title: 'Redirect fossil fuel subsidies towards targeted measures against regressive impacts',
    position:
      'The Board has highlighted that significant public resources — roughly EUR 50 billion a year before the energy crisis, spiking above EUR 100 billion in 2022–2023 — could be freed up by redirecting fossil fuel subsidies towards targeted measures that mitigate regressive impacts on households.',
    quote:
      'The Advisory Board has also highlighted how significant public resources can be freed up by redirecting fossil fuel subsidies towards targeted measures to mitigate regressive impacts',
    pages: [37],
    recIds: [],
  },

  /* ---------------------------------------------- towards-eu-climate-neutrality-2024 */
  {
    id: 'ap-2024-kr7-ets-fit-for-net-zero',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'cap-ambition',
    title: 'Clarify urgently how the ETS functions once the cap for stationary installations nears zero',
    position:
      'Key recommendation 7 asks that the functioning of the EU ETS once the stationary-installations cap approaches or reaches zero be clarified shortly, including the potential role of carbon removals, alongside alternatives to free allocation for leakage-exposed sectors not yet covered by CBAM.',
    quote:
      'The functioning of the EU ETS when the emissions cap for stationary installations approaches or equals zero must be clarified shortly, including the potential role of carbon removals. The EU should also develop alternatives to free allocation to address the risk of carbon leakage for sectors not yet covered by the Carbon Border Adjustment Mechanism (CBAM).',
    pages: [11],
    recIds: ['kr7-ets-fit-for-net-zero'],
  },
  {
    id: 'ap-2024-c2-free-allocation-cbam',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'pricing-scope',
    title: 'Develop alternatives to free allocation as the cap declines, and expand CBAM',
    position:
      'Recommendation C2 asks the EU to develop further alternatives to free allocation to protect against carbon leakage as the cap declines, with the Commission monitoring CBAM implementation and working towards expanding it to more products and sectors.',
    quote:
      'The EU should further develop alternatives to free allocation for addressing the risk of carbon leakage, to maintain adequate protection even when the cap reduces further... the European Commission should monitor the introduction of the CBAM carefully, with a view to expanding it to more products and sectors.',
    pages: [209],
    recIds: ['c2-free-allocation-alternatives'],
  },
  {
    id: 'ap-2024-c3-ets2-post2030-reform',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'pricing-scope',
    title: 'Reform ETS2 after 2030 for a stronger, more predictable price signal',
    position:
      'Recommendation C3 calls for the EU ETS 2 to be reformed after 2030 to give greater certainty on the quantity of allowances and the strength of the price signal for fuel use in transport, buildings and other covered sectors, including possible convergence with the main ETS.',
    quote:
      'The EU ETS 2 should be reformed for after 2030 to give greater certainty regarding the overall quantity of allowances and strength of the emission price signal associated with fuel use in transport, buildings and the other sectors covered.',
    pages: [210],
    recIds: ['c3-ets2-post-2030-reform'],
  },
  {
    id: 'ap-2024-c6-expand-climate-revenue',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'investment-revenue',
    title: 'End free allocation and require CBAM revenues to fund climate and energy purposes',
    position:
      'Recommendation C6 asks that resources for climate and energy-related expenditure be expanded by ending free allowance allocation in the ETS and by requiring that revenues collected through CBAM be spent on climate- and energy-related purposes.',
    quote:
      'Resources for climate and energy-related expenditure should be expanded by ending the free allowance allocation in the EU ETS and requiring revenues collected by the CBAM to be spent for climate- and energy-related purposes.',
    pages: [212],
    recIds: ['c6-expand-climate-revenue'],
  },
  {
    id: 'ap-2024-e5-electrification-50pct-2040',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'electrification',
    title: 'Indicator E5: electricity reaches 50% of final energy demand by 2040 in the Board\'s 90–95% pathways',
    position:
      'Using the E5 electrification-rate indicator, the report shows that in the pathways underpinning the Board\'s 90–95% 2040 advice, electricity reaches 50% of final energy demand by 2040 and 60% by 2050 — pathways with lower electrification instead lean more heavily on bioenergy or carbon removal.',
    quote:
      'Electricity reaches 50% of final energy demand by 2040 and 60% by 2050 in the pathways that achieve a 90-95% emissions reduction, while remaining within specified environmental risk levels.',
    pages: [68],
    recIds: ['e5-system-integration-flexibility'],
  },
  {
    id: 'ap-2024-e3-efficiency-first-mandatory',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'demand-reduction',
    title: 'Make the energy-efficiency-first principle mandatory for infrastructure projects',
    position:
      'Recommendation E3 asks that putting the energy-efficiency-first principle into practice be made mandatory for all energy infrastructure projects that advance system integration, and that the EED Article 3 investment-value threshold triggering the requirement be lowered.',
    quote:
      'Putting the energy efficiency first principle into practice should be mandatory for all energy infrastructure projects advancing energy system integration. The investment value threshold set out in Article 3 of the EED should be lowered.',
    pages: [49],
    recIds: ['e3-efficiency-first-mandatory'],
  },
  {
    id: 'ap-2024-kr12-demand-reduction',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'demand-reduction',
    title: 'Pursue more ambitious energy and material demand reduction through new policy',
    position:
      'Key recommendation 12 asks for new and strengthened policies that more vigorously reduce energy and material demand across mobility, housing, material use and diets, through both efficiency improvements and behavioural change.',
    quote:
      'The Advisory Board recommends pursuing more ambitious reductions in energy and material demand through new and strengthened policies.',
    pages: [12],
    recIds: ['kr12-energy-material-demand-reduction'],
  },
  {
    id: 'ap-2024-kr4-fossil-subsidy-phaseout',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'investment-revenue',
    title: 'Phase out fossil fuel subsidies fully and urgently',
    position:
      'Key recommendation 4 asks Member States to phase out fossil fuel subsidies fully and urgently, in line with existing 8th EAP commitments, because such subsidies undermine the transition by diverting private finance, locking in emissions and reducing the public budget available for climate investment.',
    quote:
      'Fossil fuel subsidies undermine the climate transition, by hindering the reorientation of private financial flows towards climate mitigation, locking in GHG emissions from fossil fuel-dependent infrastructure, and reducing the public budget available to support climate investments.',
    pages: [21],
    recIds: ['kr4-phase-out-ff-subsidies'],
  },
  {
    id: 'ap-2024-kr13-expand-ghg-pricing',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'pricing-scope',
    title: 'Expand GHG pricing to agri-food, LULUCF and upstream fossil fuel operations',
    position:
      'Key recommendation 13 asks the EU to expand its greenhouse gas pricing regime to all major sectors currently outside it — including agricultural/food, LULUCF and upstream fossil fuel operations — alongside EU-level incentives for carbon removals.',
    quote:
      'The Advisory Board recommends expanding the EU GHG pricing regime to all major sectors (including agricultural/food, LULUCF and upstream fossil fuel operations) and providing EU-level incentives for carbon removals.',
    pages: [13],
    recIds: ['kr13-expand-ghg-pricing-and-removal-incentives'],
  },
  {
    id: 'ap-2024-g1-enforce-governance',
    reportId: 'towards-eu-climate-neutrality-2024',
    theme: 'governance',
    title: 'Rigorously enforce the Governance Regulation and bring LTSs under EU-level review',
    position:
      'Recommendation G1 asks the Commission to rigorously enforce the Governance Regulation for full and timely implementation by all Member States, subjecting long-term strategies to EU-level review with country-specific recommendations feeding into the NECPs.',
    quote:
      "The European Commission should rigorously enforce the Governance Regulation to ensure its full and timely implementation by all EU Member States. LTSs should become subject to EU-level reviews with country-specific recommendations, and lay the basis for the NECPs.",
    pages: [267],
    recIds: ['g1-enforce-governance-lts'],
  },
];
