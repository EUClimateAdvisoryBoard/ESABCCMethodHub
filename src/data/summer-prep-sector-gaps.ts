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
    note: 'The Ecodesign for Sustainable Products Regulation (ESPR, 2024) and the CEAP-2 workstream push design, durability and reuse upstream of recycling for the first time — but the prevention/waste-hierarchy tilt is still early and product-group delegated acts are pending, so the gap is narrowed, not closed.',
  },
  'industry-ecodesign-scope': {
    subsector: 'Cross-cutting',
    status: 'addressed',
    note: 'Largely closed: the ESPR (Reg. (EU) 2024/1781) replaces the old energy-only Ecodesign Directive and extends the framework to almost all physical product groups. Effect now depends on the pace of delegated acts (implementation risk remains).',
  },
  'industry-early-deployment': {
    subsector: 'Cross-cutting',
    status: 'partially-addressed',
    note: 'The Net-Zero Industry Act (2024) and the 2025 Clean Industrial Deal add lead-market and demand-side tools (e.g. non-price criteria in public procurement and auctions, planned resilience/green-content requirements). Coverage of early deployment / market formation is improving but still thin versus the R&D and diffusion ends.',
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
    note: 'The TEN-T recast (Reg. (EU) 2024/1679) is in force and addresses some ambition weaknesses, but the Combined Transport Directive recast came close to being withdrawn by the Commission in late 2025, was kept alive only after Parliament rejected the withdrawal (Jan 2026), and remains stalled in Council with no agreed text as of mid-2026 — the ambition gap is unresolved and the file’s survival itself is in question.',
    sources: [
      'https://www.railwaygazette.com/freight/2026/06/04/rail-association-throw-last-hail-mary-to-save-combined-transport-directive/',
      'https://www.cer.be/cer-press-releases/council-faces-stalemate-as-combined-transport-directive-loses-momentum',
    ],
  },
  'transport-modal-shift-implementation': {
    subsector: 'Road freight',
    status: 'open',
    note: 'Implementation across Member States remains heterogeneous; the new TEN-T deadlines are not yet in force. Assessed unchanged.',
  },
  'transport-zev-efficiency': {
    subsector: 'Road passenger',
    status: 'open',
    note: 'CO₂ standards for cars and vans still reward zero-tailpipe rather than vehicle efficiency; the 2025/2026 review of the standards is the moment to close it, but nothing is adopted. Assessed unchanged.',
  },
  'transport-biofuels-indirect': {
    subsector: 'Cross-cutting',
    status: 'open',
    note: 'The aviation and maritime instruments now largely shut out crop biofuels (ReFuelEU Aviation Art. 4(5) excludes food/feed crops from the SAF mandate; FuelEU Maritime assigns them fossil-equivalent emission factors), but RED III still admits food/feed-crop biofuels within Member-State caps for road transport and indirect land-use-change effects remain unpriced. Assessed still open, narrowed at the edges.',
  },
  'transport-biofuel-fraud': {
    subsector: 'Cross-cutting',
    status: 'partially-addressed',
    note: 'The Union Database for Biofuels has been operational since January 2024 and stricter voluntary-scheme oversight tightens traceability, but the delegated act setting a binding mandatory-use/sanctions date is still pending agreement with Member States as of 2025–2026 — enforcement teeth are not yet in place, so the implementation gap is narrowed, not resolved.',
    sources: [
      'https://vespertool.com/blog/the-udb-will-be-mandatory/',
      'https://energy.ec.europa.eu/news/eu-database-biofuels-becomes-operational-2024-01-15_en',
    ],
  },
  'transport-extra-eu-exemption': {
    subsector: 'Aviation',
    status: 'open',
    note: 'Extra-EU aviation still sits under CORSIA rather than the ETS, and half of extra-EU maritime remains outside the ETS; the review clauses have not changed the scope. Assessed unchanged (also applies to Maritime).',
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
      'A draft Industrial Accelerator Act (renamed from "Industrial Decarbonisation Accelerator Act" in von der Leyen’s Sept-2025 State of the Union address) was tabled 4 March 2026 with "Made in EU" / low-carbon procurement content among its core measures — the gap is now "policy proposed, not yet enacted", not a purely hypothetical future test. Confirmed if the Act is adopted without binding near-zero-steel content/procurement quotas, or stalls before adoption; refuted if the adopted Act sets enforceable near-zero-steel demand.',
    sources: [
      'https://www.sidley.com/en/insights/newsupdates/2026/04/industrial-accelerator-act',
      'https://single-market-economy.ec.europa.eu/publications/industrial-accelerator-act_en',
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
      'Confirmed if operational/committed storage & transport capacity stays below the trajectory needed for cement process emissions; refuted if storage FIDs and CO₂ networks scale to meet the 50 Mt/yr target on time.',
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
      'Confirmed if no instrument sets a feedstock-defossilisation signal or CCU/recycled-carbon accounting rule; refuted if such a framework is proposed.',
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
      'Confirmed if connection lead-times and industrial power prices remain binding constraints without a targeted instrument; refuted if the Affordable Energy / grid package resolves them.',
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
      'Confirmed if support instruments carry no water-stress conditionality; refuted if a water screen is added to siting/funding criteria.',
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
      'Confirmed if no EU instrument steers company-car/road-pricing reform; refuted if the ETD recast or a pricing framework does.',
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
      'Confirmed if MCS/H₂ corridor coverage stays below the truck-fleet trajectory; refuted if AFIR delivery keeps pace.',
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
      'Confirmed if electrification funding carries no binding adaptation/climate-proofing condition; refuted if TEN-T climate-proofing is enforced on rail works.',
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
      'Confirmed if RFNBO uptake stays below 1% of maritime fuel use through 2031 (triggering the conditional 2034 sub-target) and/or OPS installation at major EU ports continues to lag the 1 January 2030 AFIR deadline; refuted if RFNBO/biofuel supply and port electrification scale to meet the FuelEU trajectory on schedule.',
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
      'Confirmed if non-CO₂ effects remain only monitored, not acted on, after the MRV review; refuted if a mitigation/pricing measure is introduced.',
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
