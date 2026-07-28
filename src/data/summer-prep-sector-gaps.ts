/**
 * Summer Prep — Policy gaps for TRANSPORT and INDUSTRY (extends the Policy
 * Gap Tracker sub-module, formerly M · 36).
 * ---------------------------------------------------------------------------
 * This note takes the transport- and industry-tagged findings from the Policy
 * Gap Tracker (the gaps the 2024 ESABCC report identified) and does three
 * things the base tracker does not:
 *
 *   1. RE-ASSESSES whether each gap still exists, given legislation adopted
 *      since the January-2024 report (a provisional mid-2026 read).
 *   2. Proposes CANDIDATE additional gaps — issues that look like policy /
 *      ambition / implementation gaps but are not (yet) tagged as such in the
 *      report, for the sector lead to accept or reject.
 *   3. Assigns every gap to a report-aligned SUBSECTOR so the module can draw
 *      the gap landscape per subsector.
 *
 * The reassessment `status` / `note` and every candidate gap are AI-compiled
 * for this working note and are PENDING VERIFICATION. The base facts (that the
 * report tagged the original gap, its verbatim quote and page) live in
 * `src/data/policy-gaps.ts` and are unchanged here. Nothing below is a Board
 * position; it is a prompt for the lead's own judgement.
 */

import type { GapStatus, GapType } from './policy-gaps';

/** Report-aligned subsector taxonomy, reused from the synergies note. */
export const SECTOR_SUBSECTORS: Record<'Industry' | 'Transport', string[]> = {
  Industry: [
    'Iron & steel',
    'Cement & lime',
    'Chemicals & petrochemicals',
    'Cross-cutting',
  ],
  Transport: [
    'Road passenger',
    'Road freight',
    'Rail',
    'Aviation',
    'Maritime',
    'Cross-cutting',
  ],
};

/**
 * Overlay on the existing report gaps (keyed by the id in policy-gaps.ts).
 * `subsector` places the gap in the landscape; `status` / `note` are the
 * provisional mid-2026 re-assessment of whether the gap still exists.
 */
export interface GapReassessment {
  subsector: string;
  status: GapStatus;
  note: string;
  /**
   * Optional additional subsector(s) this gap also bears on, beyond its
   * primary `subsector` (e.g. an aviation/maritime ETS gap that concerns
   * both). Counted into the landscape-matrix cell for each listed subsector
   * as well as the primary one, so a shared gap doesn't leave one subsector's
   * row silently empty.
   */
  alsoSubsectors?: string[];
  /** Source URL(s) backing this reassessment's status/note, where the note relies on developments beyond the base report quote. */
  sources?: string[];
}

export const GAP_REASSESSMENTS: Record<string, GapReassessment> = {
  // ── Industry ──
  'industry-ceap-upstream': {
    subsector: 'Cross-cutting',
    status: 'partially-addressed',
    note: 'The Ecodesign for Sustainable Products Regulation (ESPR, Reg. (EU) 2024/1781) operationalises the design, durability and reuse agenda that CEAP 2 (COM(2020) 98 final, 11 March 2020) had already set out — so this is the delivery of an existing direction, not a first move. The gap stays open at both ends: the successor Circular Economy Act has not been tabled (expected Q3–Q4 2026), and although the ESPR working plan was adopted on 16 April 2025 (2025–2030, six priority groups, iron & steel first with an indicative 2026 delegated act), no product-group delegated act has been adopted as of July 2026.',
  },
  'industry-ecodesign-scope': {
    subsector: 'Cross-cutting',
    status: 'addressed',
    note: 'Largely closed: the ESPR (Reg. (EU) 2024/1781 of 13 June 2024, in force 18 July 2024) replaces the old energy-only Ecodesign Directive 2009/125/EC and extends the framework to physical products generally — subject to the Art. 1(2) carve-outs for food, feed, medicinal products, living plants, animals and micro-organisms, products of human origin and vehicles under Reg. (EU) 2018/858. Effect now depends on the pace of delegated acts, and none has yet been adopted for a product group (implementation risk remains).',
  },
  'industry-early-deployment': {
    subsector: 'Cross-cutting',
    status: 'partially-addressed',
    note: 'The Net-Zero Industry Act (Reg. (EU) 2024/1735) and the 2025 Clean Industrial Deal add lead-market and demand-side tools: NZIA Arts 25 and 26 bring non-price criteria into public procurement and renewables auctions, with the implementing act obliging Member States to apply them from 30 December 2025 to at least 30 % of annually auctioned capacity or at least 6 GW, and Commission guidance on Arts 25–26 followed on 22 July 2026. The Industrial Accelerator Act proposed on 4 March 2026 adds binding low-carbon procurement content on top. Coverage of early deployment / market formation is improving but still thin versus the R&D and diffusion ends.',
  },

  // ── Transport ──
  'transport-demand-moderation': {
    subsector: 'Cross-cutting',
    status: 'open',
    note: 'No sign that overall transport-demand moderation has entered EU mobility strategy since the report; the "avoid" tier remains largely absent. Assessed unchanged.',
  },
  'transport-modal-shift-freight': {
    subsector: 'Road freight',
    status: 'partially-addressed',
    note: 'The TEN-T recast (Reg. (EU) 2024/1679) has applied since 18 July 2024 and answers the report\'s specific finding on terminal capacity: Art. 36(4) requires Member States to complete an analysis of multimodal freight terminals and adopt action plans by 19 July 2028, feeding corridor work plans due 19 July 2026. Regulation (EU) 2026/1184 of 20 May 2026 on railway infrastructure capacity then replaces the delivery architecture the report criticised, repealing the Rail Freight Corridors Regulation (EU) No 913/2010 with effect from 14 December 2030. Against that, the Combined Transport Directive recast is in limbo: the Commission announced its INTENTION to withdraw COM(2023) 702 in its 2026 Work Programme (adopted 21 October 2025) — the proposal has never been formally withdrawn and the file still reads \'awaiting committee decision\' — a majority of political groups rejected the withdrawal at the end of January 2026 (exact date and forum unverified), and the June 2026 TTE Council reached no general approach. The ambition gap is narrowed on terminals and rail capacity but unresolved on combined transport.',
    sources: [
      'https://www.railwaygazette.com/freight/2026/06/04/rail-association-throw-last-hail-mary-to-save-combined-transport-directive/',
      'https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2023/0396(COD)',
    ],
  },
  'transport-modal-shift-implementation': {
    subsector: 'Road freight',
    status: 'open',
    note: 'Implementation across Member States remains heterogeneous. The TEN-T Regulation itself has applied since 18 July 2024 — it is its milestones that have not yet fallen due (terminal analysis 19 July 2028; network completion 2030/2040/2050) — and Reg. (EU) 2026/1184 only bites from December 2030, so implementation is still largely untested. Assessed unchanged.',
  },
  'transport-zev-efficiency': {
    subsector: 'Road passenger',
    status: 'open',
    note: 'CO₂ standards for cars and vans still reward zero-tailpipe rather than vehicle efficiency. The review has since been delivered — COM(2025) 995 of 16 December 2025, in the Automotive Package — and it contains the first size/efficiency lever inside the ZEV segment: super-credits for a new \'small affordable electric car\' class (≤4.2 m, with mass, width, wheel-size and motor-power criteria). The same proposal would cut the 2035 target from 100 % to 90 % and the 2030 van target from 50 % to 40 %. Nothing is adopted: Council was divided in March 2026 and the EP rapporteur\'s draft report came in April 2026. Status open, but the file to watch is now identified.',
  },
  'transport-biofuels-indirect': {
    subsector: 'Cross-cutting',
    status: 'open',
    note: 'The aviation and maritime instruments now largely shut out crop biofuels (ReFuelEU Aviation Art. 4(5) excludes food/feed crops from the SAF mandate; FuelEU Maritime assigns them fossil-equivalent emission factors), but RED III still admits food/feed-crop biofuels within Member-State caps for road transport and indirect land-use-change effects remain unpriced. Assessed still open, narrowed at the edges.',
  },
  'transport-biofuel-fraud': {
    subsector: 'Cross-cutting',
    status: 'partially-addressed',
    note: 'The Union Database for Biofuels has been operational since 15 January 2024 (gaseous fuels added end-November 2024), but the delegated act setting a binding mandatory-use/sanctions date is still a tabled draft as of July 2026 — it slipped past its end-2025 target and the mandatory-use date was the last open item. The revision of Implementing Regulation (EU) 2022/996 on voluntary schemes, often cited as the tightening step, is not expected before end-2026. Enforcement teeth are not yet in place, so the implementation gap is narrowed, not resolved.',
    sources: [
      'https://energy.ec.europa.eu/topics/renewable-energy/bioenergy/biofuels/union-database-liquid-and-gaseous-renewable-and-recycled-carbon-fuels_en',
      'https://energy.ec.europa.eu/news/eu-database-biofuels-becomes-operational-2024-01-15_en',
    ],
  },
  'transport-extra-eu-exemption': {
    subsector: 'Aviation',
    status: 'open',
    note: 'Extra-EU aviation still sits under CORSIA rather than the ETS, and half of extra-EU maritime remains outside it — but the review clause has now been acted on. On 17 July 2026 the Commission adopted COM(2026) 616 final (2026/0212(COD)), finding under Art. 28b(3) that CORSIA-participating states cover less than 70 % of international aviation emissions, and proposing to extend the ETS from 1 January 2029 to 31 December 2032 to flights departing the EEA for aerodromes within 5 000 km of Frankfurt, subject to a 2032 review. Long-haul (US, Brazil, India, China, Far East) would stay exempt and nothing is adopted, so the gap remains open — but it is no longer true that the review clauses have not changed the scope. The maritime half is unchanged: the proposal reproduces Art. 3ga(1) with the 50 % extra-EU voyage share intact.',
    alsoSubsectors: ['Maritime'],
  },
};

/** A proposed additional gap for the lead to accept or reject. */
export interface CandidateGap {
  id: string;
  sector: 'Industry' | 'Transport';
  subsector: string;
  type: GapType;
  title: string;
  rationale: string;
  instrument: string;
  /** Why this is only a *candidate* and what would confirm/refute it. */
  testToConfirm: string;
  /** Source URL(s) grounding the rationale/test, where it relies on facts beyond the underlying report gap. */
  sources?: string[];
}

export const CANDIDATE_GAPS: CandidateGap[] = [
  // ── Industry ──
  {
    id: 'cand-steel-lead-market',
    sector: 'Industry',
    subsector: 'Iron & steel',
    type: 'policy',
    title: 'No binding demand signal for near-zero steel',
    rationale:
      'Near-zero primary steel carries a green premium that no EU instrument yet guarantees demand for. Without mandatory lead-market quotas (e.g. green public procurement or a minimum near-zero content in cars/construction), first-mover H₂-DRI plants lack an offtake floor — a market-formation gap the report flags generically but not for steel specifically.',
    instrument: 'Public procurement, Clean Industrial Deal lead-market measures, product standards, Industrial Accelerator Act',
    testToConfirm:
      'A draft Industrial Accelerator Act (renamed from "Industrial Decarbonisation Accelerator Act" — the earlier title is used in the Steel and Metals Action Plan of 19 March 2025, and the SOTEU 2025 Letter of Intent of 10 September 2025 lists it under the new name) was tabled 4 March 2026 with "Made in EU" / low-carbon procurement content among its core measures — the gap is now "policy proposed, not yet enacted", not a purely hypothetical future test. The tabled text (COM(2026) 100 final, 2026/0068(COD)) already sets binding thresholds — at least 25 % low-carbon steel, 25 % low-carbon and Union-origin aluminium, and at least 5 % low-carbon and Union-origin concrete/mortar in publicly supported construction, pegged to standards to be set by CPR and ESPR delegated acts — but it nowhere uses \'near-zero\' and sets no near-zero quota. So the candidate now reads: binding LOW-CARBON procurement proposed, NEAR-ZERO still unaddressed. Confirmed if the Act is adopted with low-carbon thresholds only, or stalls; refuted if the adopted Act sets enforceable near-zero-steel demand. In first reading (joint INTA/ITRE/IMCO, rapporteurs appointed 29 April 2026, indicative plenary 14 December 2026).',
    sources: [
      'https://www.sidley.com/en/insights/newsupdates/2026/04/industrial-accelerator-act',
      'https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2026/0068(COD)',
    ],
  },
  {
    id: 'cand-cement-co2-storage',
    sector: 'Industry',
    subsector: 'Cement & lime',
    type: 'implementation',
    title: 'CO₂ transport & storage lags cement CCS needs',
    rationale:
      'Cement’s process emissions are unavoidable without CCS, yet permitted CO₂ storage capacity and shared transport infrastructure are being built far more slowly than the Net-Zero Industry Act 2030 injection target implies, leaving abatement plans without somewhere to send the CO₂ — an implementation gap specific to hard-to-abate process industry.',
    instrument: 'Net-Zero Industry Act (CO₂ storage target), CCS Directive, CEF / TEN-E',
    testToConfirm:
      'Confirmed if operational/committed storage & transport capacity stays below the trajectory needed for cement process emissions; refuted if storage FIDs and CO₂ networks scale to meet the 50 Mt/yr target on time. UPDATE (July 2026): obligated entities are on track for roughly 29 Mt and Member State plans for roughly 33 Mt against the 50 Mt NZIA Art. 23 target, with Porthos, Greensand and Prinos operational or near-operational and seven further sites totalling about 19 Mt. The CO2 transport and market package slipped from 2025 and is expected within the Energy Union package in Q3 2026, so there is still no tabled EU proposal on CO2 transport infrastructure — the strongest support for this candidate.',
  },
  {
    id: 'cand-chem-feedstock',
    sector: 'Industry',
    subsector: 'Chemicals & petrochemicals',
    type: 'policy',
    title: 'No incentive to decarbonise chemical feedstock (defossilisation)',
    rationale:
      'EU policy prices energy-related CO₂ but barely touches the fossil carbon embedded as feedstock in plastics and chemicals; there is no clear framework (or CCU/recycled-carbon accounting) to steer feedstock away from virgin fossil, so the largest part of the sector’s carbon is unaddressed.',
    instrument: 'EU ETS scope, ESPR, Packaging & Plastics rules, a possible recycled-carbon standard',
    testToConfirm:
      'Confirmed if no instrument sets a feedstock-defossilisation signal or CCU/recycled-carbon accounting rule; refuted if such a framework is proposed. UPDATE (July 2026): as written this test is already partly tripped. Commission Implementing Decision (EU) 2026/1425 of 30 June 2026 lays down mass-balance rules for recycled plastic content in single-use plastic beverage bottles, and the Chemicals Industry Action Plan of 8 July 2025 commits to incentivising clean carbon sources. Narrow the refutation condition to a binding, SECTOR-WIDE feedstock-defossilisation signal; these two are partial and sector-limited. Whether the July-2026 ETS review extends surrender-obligation exemptions to carbon embedded in products is unverified.',
  },
  {
    id: 'cand-ind-electrification-enabling',
    sector: 'Industry',
    subsector: 'Cross-cutting',
    type: 'implementation',
    title: 'Grid-connection and price barriers stall industrial electrification',
    rationale:
      'Electrification is the backbone of industrial mitigation, but multi-year grid-connection queues and the EU’s industrial-electricity price gap are not treated as a decarbonisation barrier in their own right, so plants electrify slower than the abatement pathway needs — an enabling-conditions implementation gap.',
    instrument: 'Electricity Market Design, grid planning, Clean Industrial Deal affordability measures',
    testToConfirm:
      'Confirmed if connection lead-times and industrial power prices remain binding constraints without a targeted instrument; refuted if the Affordable Energy / grid package resolves them. UPDATE (July 2026): the premise that grid access and power prices are not treated as a decarbonisation barrier in their own right no longer holds — the European Grids Package (10 December 2025) carries guidance on preventing and clearing connection queues plus eight prioritised energy highways, and the Electrification Action Plan (17 July 2026) targets the electricity-versus-fossil price gap directly, enabling Member States to cut network charges for certain consumer groups and taxes for energy-intensive businesses, against a 23%-to-46%-by-2040 electrification pathway and the Clean Industrial Deal 32%-by-2030 KPI. Read this as a DELIVERY gap and test it in outcome terms — connection lead times actually falling, the industrial price gap actually narrowing — not on whether an instrument exists.',
  },
  {
    id: 'cand-ind-water-siting',
    sector: 'Industry',
    subsector: 'Cross-cutting',
    type: 'policy',
    title: 'Decarbonisation siting ignores water-stress (mitigation–adaptation blind spot)',
    rationale:
      'Green-hydrogen and CCS support is allocated without a systematic water-availability screen, so water-intensive abatement can be steered toward drought-prone regions — a maladaptation risk that no industrial-decarbonisation instrument currently guards against.',
    instrument: 'Net-Zero Industry Act, Hydrogen Bank auctions, State-aid / IPCEI conditions',
    testToConfirm:
      'Confirmed if support instruments carry no water-stress conditionality; refuted if a water screen is added to siting/funding criteria. UPDATE (July 2026): the European Water Resilience Strategy of 4 June 2025 names hydrogen, batteries, CCS, semiconductors and data centres as water-intensive strategic technologies and calls for water to be integrated into EU industrial policy — a non-binding counterweight, not a siting or funding condition. The absence of a water criterion in NZIA, Hydrogen Bank auction terms and State-aid/IPCEI rules is evidence of absence from the documents checked, not a confirmed absence in the legal texts.',
  },

  // ── Transport ──
  {
    id: 'cand-road-pricing',
    sector: 'Transport',
    subsector: 'Road passenger',
    type: 'policy',
    title: 'No EU steer on road pricing & company-car tax to moderate demand',
    rationale:
      'Company-car taxation and the near-absence of distance/CO₂-based road pricing entrench car use and inefficient fleets, but demand- and fiscal-side levers sit almost entirely with Member States with no EU framework — reinforcing the report’s demand-moderation gap on the passenger side.',
    instrument: 'Energy Taxation Directive revision, Eurovignette, Member-State fiscal coordination',
    testToConfirm:
      'Confirmed if no EU instrument steers company-car/road-pricing reform; refuted if the ETD recast or a pricing framework does. UPDATE (July 2026): narrow this to FISCAL levers. The Clean Corporate Vehicles Regulation proposed on 16 December 2025 would oblige Member States to ensure minimum zero- and low-emission shares of new corporate car and van registrations by large undertakings from 2030 — corporate vehicles are around 60% of new cars and up to 90% of new vans — but it regulates registrations, not taxation. The Eurovignette targeted revision (proposal 2 October 2025, Council mandate 4 March 2026, provisional agreement 30 June 2026) is heavy-duty only. Company-car tax treatment and distance- or CO2-based charging for light vehicles remain unaddressed.',
  },
  {
    id: 'cand-hdv-charging',
    sector: 'Transport',
    subsector: 'Road freight',
    type: 'implementation',
    title: 'Heavy-duty charging/refuelling rollout trails the HDV CO₂ targets',
    rationale:
      'The 2024 HDV CO₂ standards assume a fast zero-emission truck ramp-up, but AFIR megawatt-charging and hydrogen-refuelling deployment at logistics hubs — and the grid capacity behind them — are lagging, risking an infrastructure implementation gap that could stall the mitigation the standards require.',
    instrument: 'AFIR, TEN-T, grid connection at freight hubs',
    testToConfirm:
      'Confirmed if MCS/H₂ corridor coverage stays below the truck-fleet trajectory; refuted if AFIR delivery keeps pace. CONFIRMED (July 2026): the 2024 HDV CO2 standards are Regulation (EU) 2024/1610 of 14 May 2024 (-45% from 2030, -65% from 2035, -90% from 2040; 100% zero-emission urban buses by 2035), and the AFIR review proposal is expected in Q4 2026 — the natural checkpoint for this test.',
  },
  {
    id: 'cand-rail-adaptation',
    sector: 'Transport',
    subsector: 'Rail',
    type: 'policy',
    title: 'Rail electrification not paired with mandatory climate-proofing',
    rationale:
      'EU funding accelerates rail electrification (a mitigation asset) without requiring the heat-/flood-proofing that keeps the network reliable in extremes, so the low-carbon backbone the modal-shift strategy depends on is left exposed — a joint mitigation–adaptation gap.',
    instrument: 'TEN-T climate-proofing requirements, CEF Transport, Rail Freight rules',
    testToConfirm:
      'Confirmed if electrification funding carries no binding adaptation/climate-proofing condition; refuted if TEN-T climate-proofing is enforced on rail works. UPDATE (July 2026): the premise is largely refuted as worded. Regulation (EU) 2024/1679 requires climate resilience to be taken into account when projects of common interest are planned, and makes projects requiring an EIA under Directive 2011/92/EU subject to climate proofing per Commission Notice 2021/C 373/01; corridor work plans must analyse climate-change impacts. Reframe as an IMPLEMENTATION gap — no adaptation performance standards, no coverage of sub-EIA or nationally funded electrification works, no monitoring of whether climate proofing is applied. The final article number should be checked against the OJ before use.',
  },
  {
    id: 'cand-maritime-fueleu-conditions',
    sector: 'Transport',
    subsector: 'Maritime',
    type: 'implementation',
    title: 'FuelEU Maritime compliance conditions not yet in place',
    rationale:
      'FuelEU Maritime\'s declining GHG-intensity limit (in force since 1 January 2025) assumes fuel and infrastructure conditions that are still open questions rather than settled facts: RFNBO/biofuel supply may not scale fast enough (a conditional 2% RFNBO sub-target only bites from 2034, and only if uptake stays below 1% through 2031), well-to-wake lifecycle accounting leaves commercial/contractual practicalities unresolved between charterers, pool members and owners, and shore-side (OPS) port infrastructure was only ~20% contracted/installed by May 2025 against the 1 January 2030 AFIR deadline for major container/passenger ports — leaving the sector\'s own gap landscape with no tagged Maritime-specific risk despite these open questions.',
    instrument: 'FuelEU Maritime (Reg. (EU) 2023/1805), AFIR onshore power supply requirements, RED III RFNBO sub-target mechanism',
    testToConfirm:
      'Confirmed if RFNBO uptake stays below 1% of maritime fuel use through 2031 (triggering the conditional 2034 sub-target) and/or OPS installation at major EU ports continues to lag the 1 January 2030 AFIR deadline; refuted if RFNBO/biofuel supply and port electrification scale to meet the FuelEU trajectory on schedule. CORRECTION (July 2026): the "~20% contracted or installed by May 2025" figure is not in the cited source. The source says 51 ports across 15 coastal Member States offered shore power with 309 MW installed as of May 2025, against a need to triple or quadruple capacity by 2030. COM(2026) 616 of 17 July 2026 also proposes a Sustainable Maritime Alternative Propulsion mechanism (new Art. 3gaa) recycling ETS revenue into sustainable maritime fuels — a partial response on the supply condition.',
    sources: [
      'https://transport.ec.europa.eu/transport-modes/maritime/decarbonising-maritime-transport-fueleu-maritime/questions-and-answers-regulation-eu-20231805-use-renewable-and-low-carbon-fuels-maritime-transport_en',
      'https://www.sustainable-ships.org/stories/2025/eu-shore-power-demand-2030',
    ],
  },
  {
    id: 'cand-aviation-nonco2',
    sector: 'Transport',
    subsector: 'Aviation',
    type: 'policy',
    title: 'Non-CO₂ aviation effects still unregulated',
    rationale:
      'Contrails and NOx account for roughly two-thirds of aviation’s effective warming (Lee et al. 2021, Atmospheric Environment 244:117834: non-CO₂ terms are ~66% of aviation’s net effective radiative forcing), yet only an MRV step exists — there is no instrument that prices or operationally mitigates non-CO₂ effects, leaving most of aviation’s climate impact outside policy.',
    instrument: 'EU ETS aviation (non-CO₂ MRV), air-traffic-management measures',
    testToConfirm:
      'Confirmed if non-CO₂ effects remain only monitored, not acted on, after the MRV review; refuted if a mitigation/pricing measure is introduced. UPDATE (July 2026): "only an MRV step exists" is no longer accurate at proposal level. COM(2026) 616 of 17 July 2026 proposes an amended Art. 3c(6) reserving up to 3 million allowances until 31 December 2033 for cost-effective contrail mitigation, allocating allowances worth 0.1% of verified emissions to operators that embed contrail forecasting in flight planning. Read the test as refuted only if a mitigation or pricing measure is ADOPTED; the Art. 14(5) MRV review report is due 31 December 2027.',
  },
];

/** Report metadata surfaced in the UI. */
export const SECTOR_GAP_META = {
  reportTitle: 'Towards EU climate neutrality: Progress, policy gaps and opportunities',
  reportPublished: 'January 2024',
  reassessmentAsOf: 'Provisional read, mid-2026',
  reportUrl:
    'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
};
