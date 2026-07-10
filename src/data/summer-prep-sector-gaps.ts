/**
 * Summer Prep — Policy gaps for TRANSPORT and INDUSTRY (extends M · 36).
 * ---------------------------------------------------------------------------
 * This note takes the transport- and industry-tagged findings from the Policy
 * Gap Tracker (the gaps the 2024 ESABCC report identified) and does three
 * things the base tracker does not:
 *
 *   1. RE-ASSESSES whether each gap still exists, given legislation adopted
 *      since the January-2025 report (a provisional mid-2026 read).
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
    note: 'The proposed recast of the Combined Transport Directive and TEN-T (Reg. (EU) 2024/1679) address some ambition weaknesses, but the Combined Transport file is still in negotiation and delivery mechanisms are unproven — ambition gap only partly narrowed.',
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
    note: 'RED III, ReFuelEU Aviation and FuelEU Maritime still admit food/feed-crop and category-3 biofuels within their limits. Assessed unchanged.',
  },
  'transport-biofuel-fraud': {
    subsector: 'Cross-cutting',
    status: 'partially-addressed',
    note: 'The Union Database for Biofuels (mandatory from 2024) and stricter voluntary-scheme oversight tighten traceability, but well-founded fraud suspicions persist — implementation gap narrowed, not resolved.',
  },
  'transport-extra-eu-exemption': {
    subsector: 'Aviation',
    status: 'open',
    note: 'Extra-EU aviation still sits under CORSIA rather than the ETS, and half of extra-EU maritime remains outside the ETS; the review clauses have not changed the scope. Assessed unchanged (also applies to Maritime).',
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
    instrument: 'Public procurement, Clean Industrial Deal lead-market measures, product standards',
    testToConfirm:
      'Confirmed if, by the 2025 review, no EU measure sets enforceable near-zero-steel demand; refuted if the Industrial Decarbonisation Accelerator Act introduces binding content/procurement quotas.',
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
    id: 'cand-aviation-nonco2',
    sector: 'Transport',
    subsector: 'Aviation',
    type: 'policy',
    title: 'Non-CO₂ aviation effects still unregulated',
    rationale:
      'Contrails and NOx account for roughly two-thirds of aviation’s effective warming, yet only an MRV step exists — there is no instrument that prices or operationally mitigates non-CO₂ effects, leaving most of aviation’s climate impact outside policy.',
    instrument: 'EU ETS aviation (non-CO₂ MRV), air-traffic-management measures',
    testToConfirm:
      'Confirmed if non-CO₂ effects remain only monitored, not acted on, after the MRV review; refuted if a mitigation/pricing measure is introduced.',
  },
];

/** Report metadata surfaced in the UI. */
export const SECTOR_GAP_META = {
  reportTitle: 'Towards EU climate neutrality: Progress, policy gaps and opportunities',
  reportPublished: 'January 2025',
  reassessmentAsOf: 'Provisional read, mid-2026',
  reportUrl:
    'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
};
