/**
 * Advanced version 6 — the ADAPTIVE POLICY LOOP flow chart.
 * ---------------------------------------------------------
 * Where versions 1–5 are *chains* (read top-to-bottom or left-to-right and
 * stop), version 6 closes the circle. It models EU climate monitoring as the
 * **control loop** it legally is under the European Climate Law and the
 * Governance Regulation: five stations read around a cycle, per sector,
 * with the gap signal feeding back into the legislation.
 *
 *   1 Scenario corridor — where the modelling says the sector must travel:
 *     Climate Law targets and Fit-for-55 MIX / Climate Target Plan benchmark
 *     trajectories (the same benchmark set that powers the Policy Gap charts).
 *   2 Policy instruments — the real EU laws that aim the sector at the
 *     corridor (drawn from the Policy Navigator's sectoral policy registry),
 *     each with the next milestone that bites.
 *   3 Twin-track delivery — the indicators showing whether the instruments
 *     are changing the system, with mitigation and adaptation as equal-weight
 *     lanes *inside every sector* (not adaptation as its own silo).
 *   4 Observed results — the realised twin impacts: emissions/removals on the
 *     mitigation lane, climate-driven losses and harm on the adaptation lane.
 *   5 Gap & ratchet — the named EU review mechanism that compares 4 against 1
 *     and feeds the gap back into 2: NECP updates, ETS cap reviews, CO₂
 *     standard reviews, CAP amendments, the Climate Law's own stocktake.
 *
 * Three things make this board different from every earlier version:
 *   • it is a loop, not a chain — monitoring is shown as *steering*, with the
 *     feedback mechanism (the ratchet) a first-class station;
 *   • scenario modelling results are on the board itself, as station 1 — the
 *     corridor each sector is steered along, not a separate explorer; and
 *   • the policy side is on the board too, as station 2 — every sector's loop
 *     starts from the actual instruments, deep-linked into the Policy
 *     Navigator, so "what the law requires" and "what the data shows" sit on
 *     one canvas.
 *
 * Like Advanced versions 2/4/5 this is a computed, read-only analytical view:
 * the content below is a curated synthesis over data that already lives in the
 * platform — `POLICY_GAP_INDICATORS` (benchmarks), `SECTOR_POLICIES` (laws and
 * milestones) and `FRAMEWORK_INDICATOR_INDEX` (indicator chips) — so the loop
 * never drifts from the underlying registries. Where a sector has **no
 * adaptation-delivery indicator yet, the empty lane is rendered as a finding**
 * (the monitoring gap), not silently dropped.
 */
import { FRAMEWORK_INDICATOR_INDEX } from './sector-frameworks';
import { SECTOR_POLICIES, type SectorPolicy } from './sectoral-policies';
import { POLICY_GAP_INDICATORS } from '@/lib/scenarios/policy-gap';

/** Current schema version of the v6 adaptive policy loop view. */
export const POLICY_LOOP_V6_VERSION = 1;

export type LoopTrack = 'mitigation' | 'adaptation';

// ── The five stations of the loop ────────────────────────────────────────────

export type LoopStationId = 'corridor' | 'instruments' | 'delivery' | 'observed' | 'ratchet';

export interface LoopStation {
  id: LoopStationId;
  index: number;
  name: string;
  blurb: string;
  color: string;
}

export const LOOP_STATIONS: readonly LoopStation[] = [
  {
    id: 'corridor',
    index: 1,
    name: 'Scenario corridor',
    blurb:
      'Where modelling says the sector must travel — Climate Law targets and Fit-for-55 MIX benchmark trajectories.',
    color: '#5B5BD6',
  },
  {
    id: 'instruments',
    index: 2,
    name: 'Policy instruments',
    blurb: 'The EU laws aiming the sector at the corridor, each with the next milestone that bites.',
    color: '#B45309',
  },
  {
    id: 'delivery',
    index: 3,
    name: 'Twin-track delivery',
    blurb:
      'Are the instruments changing the system? Mitigation and adaptation as equal lanes inside the sector.',
    color: '#3D6E8C',
  },
  {
    id: 'observed',
    index: 4,
    name: 'Observed results',
    blurb: 'The realised twin impacts: emissions and removals · climate-driven losses and harm.',
    color: '#9E4A46',
  },
  {
    id: 'ratchet',
    index: 5,
    name: 'Gap & ratchet',
    blurb:
      'The named review mechanism that compares results against the corridor and feeds the gap back into the law.',
    color: '#7A3E6B',
  },
];

// ── Board model ──────────────────────────────────────────────────────────────

/** One indicator chip on the delivery / observed stations. */
export interface LoopIndicatorChip {
  refId: string;
  code: string;
  label: string;
  /** Links into the indicator database. Empty → "no data" chip. */
  indicatorIds: string[];
  track: LoopTrack;
  /** True for qualitative policy-process indicators (strategies, plans, mainstreaming). */
  policy?: boolean;
}

/** One law chip on the instruments station, resolved from SECTOR_POLICIES. */
export interface LoopPolicyChip {
  id: string;
  name: string;
  acronym?: string;
  instrumentType: SectorPolicy['instrumentType'];
  /** The next key milestone at or after the current year — the requirement that bites next. */
  nextMilestone?: { year: number; requirement: string };
}

/** One benchmark chip on the corridor station, resolved from POLICY_GAP_INDICATORS. */
export interface LoopBenchmarkChip {
  /** Report code of the underlying series (O1, E1, T1 …). */
  code: string;
  title: string;
  unit: string;
  targets: { year: number; value: number; label: string }[];
}

export interface PolicyLoopSector {
  key: string;
  label: string;
  color: string;
  /** One-line systems description of this sector's loop. */
  blurb: string;
  corridor: LoopBenchmarkChip[];
  policies: LoopPolicyChip[];
  /** Station 3 — delivery drivers, by track. */
  mitigation: LoopIndicatorChip[];
  adaptation: LoopIndicatorChip[];
  /** Why the adaptation delivery lane is empty, when it is — the monitoring gap, stated. */
  adaptationGapNote?: string;
  /** Station 4 — realised impacts, both tracks mixed (each chip carries its track). */
  observed: LoopIndicatorChip[];
  /** Station 5 — the named review mechanisms that close this sector's loop. */
  ratchet: string[];
}

export interface PolicyLoopBoard {
  version: number;
  sectors: PolicyLoopSector[];
}

// ── Curated content ──────────────────────────────────────────────────────────
//
// Each sector row lists ids into the three underlying registries. Mitigation
// delivery ids follow the results-chain v2 ladder (outputs + outcome drivers);
// observed ids are the realised-impact series; adaptation ids pair each sector
// with its own climate-risk and adaptation-action indicators — the cross-walk
// that no earlier version draws.

interface SectorSpec {
  key: string;
  label: string;
  color: string;
  blurb: string;
  gapIndicatorIds: string[];
  policyIds: string[];
  mitigationIds: string[];
  adaptationIds: string[];
  adaptationGapNote?: string;
  observed: { id: string; track: LoopTrack }[];
  ratchet: string[];
}

/** Qualitative policy-process indicators (mirrors the v2 ladder's tagging). */
const POLICY_PROCESS_IDS = new Set<string>([
  'national-adaptation-strategies',
  'adv-adapt-cities-plans',
  'adapt-gov-cra-completed',
  'adapt-gov-climate-law-adaptation',
  'adapt-gov-nap-adopted',
  'adapt-gov-eu-strategy-actions',
  'adapt-out-mission-charter-signatories',
  'adapt-out-com-adaptation-signatories',
  'adapt-fin-mff-climate-mainstreaming',
  'necp-implementation-score',
  'national-climate-laws',
]);

const SECTOR_SPECS: readonly SectorSpec[] = [
  {
    key: 'economy-wide',
    label: 'EU economy-wide',
    color: '#9E4A46',
    blurb:
      'The master loop: the Climate Law sets the corridor, the cross-cutting instruments price and govern it, and the EU-level ratchet re-aims everything below.',
    gapIndicatorIds: ['o1-total-ghg', 'o2-primary-energy', 'o2-final-energy'],
    policyIds: ['climate-law', 'fit-for-55', 'governance-regulation', 'eu-ets', 'esr'],
    mitigationIds: [
      'clean-tech-investment',
      'eu-ets-price',
      'carbon-pricing-coverage',
      'national-climate-laws',
      'necp-implementation-score',
    ],
    adaptationIds: [
      'national-adaptation-strategies',
      'adapt-gov-cra-completed',
      'adapt-fin-mff-climate-mainstreaming',
      'adv-adapt-cities-plans',
      'adv-adapt-insurance-gap',
    ],
    observed: [
      { id: 'ghg-total-net', track: 'mitigation' },
      { id: 'esabcc-o1-ghg-total', track: 'mitigation' },
      { id: 'adv-adapt-economic-losses', track: 'adaptation' },
      { id: 'climate-economic-losses', track: 'adaptation' },
    ],
    ratchet: [
      'European Climate Law 5-yearly stocktake and 2040 target setting (Art. 4)',
      'NECP update cycle under the Governance Regulation (next full update 2029)',
      'EU Adaptation Strategy review, informed by the EUCRA climate risk assessment',
      'ESABCC independent assessment and carbon-budget advice',
    ],
  },
  {
    key: 'energy-supply',
    label: 'Energy supply',
    color: '#2563EB',
    blurb:
      'Decarbonise the power system while keeping it dependable in a hotter, drier climate — droughts and heat now constrain the very plants the corridor relies on.',
    gapIndicatorIds: ['e1-energy-ghg', 'e2-res-share', 'e3-grid-intensity'],
    policyIds: ['red-iii', 'eed', 'mdr', 'ten-e'],
    mitigationIds: [
      'solar-pv-additions',
      'wind-additions',
      'battery-storage-capacity',
      'res-share',
      'fossil-power-share',
    ],
    adaptationIds: ['adv-adapt-cooling-degree-days', 'adv-adapt-wei'],
    adaptationGapNote:
      'No indicator yet tracks adaptation *action* in the energy system (grid hardening, cooling-water management) — only the pressure side. A monitoring gap the loop makes visible.',
    observed: [
      { id: 'power-sector-ghg', track: 'mitigation' },
      { id: 'esabcc-e1-energy-supply-ghg', track: 'mitigation' },
      { id: 'beta-adapt-energy-drought-damage', track: 'adaptation' },
    ],
    ratchet: [
      'NECP renewables and efficiency trajectories — Commission gap-filler measures if pledges fall short',
      'RED III and EED review clauses (2027 / 2030)',
    ],
  },
  {
    key: 'industry',
    label: 'Industry',
    color: '#475569',
    blurb:
      'The ETS cap squeezes process emissions while CBAM guards against leakage; flood and water risk to industrial assets is the unpriced adaptation flank.',
    gapIndicatorIds: ['i1-industry-ghg', 'i5-final-energy'],
    policyIds: ['eu-ets', 'cbam', 'net-zero-industry-act', 'ied'],
    mitigationIds: [
      'industry-electrification',
      'esabcc-i4-steel-ghg-intensity',
      'esabcc-i3-circular-mat-use',
      'clean-tech-trade-balance',
    ],
    adaptationIds: ['water-exploitation-index'],
    adaptationGapNote:
      'Industrial adaptation (siting, flood-proofing, process-water resilience) has no dedicated EU indicator — the lane is open.',
    observed: [
      { id: 'industry-ghg', track: 'mitigation' },
      { id: 'esabcc-i1-industry-ghg', track: 'mitigation' },
      { id: 'adv-adapt-river-flood-damage', track: 'adaptation' },
    ],
    ratchet: [
      'ETS cap and linear-reduction-factor review',
      'CBAM transition review and free-allocation phase-out (2026–34)',
    ],
  },
  {
    key: 'transport',
    label: 'Transport',
    color: '#7C3AED',
    blurb:
      'Standards and infrastructure rules electrify the fleet; the same networks are increasingly disrupted by heat, storms and coastal flooding.',
    gapIndicatorIds: ['t1-transport-ghg', 't6-fossil-transport'],
    policyIds: ['co2-cars-vans', 'co2-hdv', 'afir', 'ets2'],
    mitigationIds: [
      'ev-share-new-cars',
      'zev-charging-points',
      'esabcc-t4-car-co2-intensity',
      'rail-iww-freight-share',
    ],
    adaptationIds: [],
    adaptationGapNote:
      'Transport-network resilience (climate-proofed TEN-T, rerouting capacity) is monitored only through realised disruption — no forward-looking delivery indicator exists yet.',
    observed: [
      { id: 'esabcc-t1-transport-ghg', track: 'mitigation' },
      { id: 'beta-adapt-rail-disruption', track: 'adaptation' },
      { id: 'adv-adapt-coastal-transport-damage', track: 'adaptation' },
    ],
    ratchet: [
      'CO₂ standards reviews — cars/vans 2026, heavy-duty 2027',
      'ETS2 price signal from 2027, cushioned by Social Climate Plans',
    ],
  },
  {
    key: 'buildings',
    label: 'Buildings',
    color: '#D97706',
    blurb:
      'Renovation and heat pumps cut demand-side emissions; the same stock must shelter people from heatwaves and floods — efficiency and resilience are one investment.',
    gapIndicatorIds: ['b1-buildings-ghg', 'b2-buildings-energy'],
    policyIds: ['epbd', 'ets2', 'sclf', 'red-iii'],
    mitigationIds: [
      'building-renovation-rate',
      'heat-pump-sales',
      'renewable-heating-cooling',
      'esabcc-b5a-residential-fossil-share',
    ],
    adaptationIds: ['adapt-out-com-adaptation-signatories', 'beta-adapt-flood-prone-population'],
    observed: [
      { id: 'buildings-ghg', track: 'mitigation' },
      { id: 'esabcc-b1-buildings-ghg', track: 'mitigation' },
      { id: 'adv-adapt-heat-mortality', track: 'adaptation' },
    ],
    ratchet: [
      'EPBD national building-renovation plans (first due 2026, reviewed 5-yearly)',
      'ETS2 and Social Climate Fund review',
    ],
  },
  {
    key: 'agriculture',
    label: 'Agriculture & food',
    color: '#16A34A',
    blurb:
      'CAP and Farm-to-Fork steer inputs and diets; the sector is simultaneously the most directly exposed to drought and crop loss — mitigation, adaptation and food security share one loop.',
    gapIndicatorIds: ['a1-agriculture-ghg'],
    policyIds: ['cap', 'farm-to-fork', 'nec', 'nature-restoration-law'],
    mitigationIds: [
      'nitrogen-fertiliser-use',
      'organic-farming-share',
      'cattle-population',
      'food-waste-per-capita',
    ],
    adaptationIds: ['adv-adapt-wei'],
    adaptationGapNote:
      'Farm-level adaptation uptake (irrigation efficiency, drought-tolerant varieties, insurance coverage) is not yet monitored EU-wide.',
    observed: [
      { id: 'agri-ghg', track: 'mitigation' },
      { id: 'esabcc-a1-agri-nonco2', track: 'mitigation' },
      { id: 'adv-adapt-crop-loss', track: 'adaptation' },
    ],
    ratchet: [
      'CAP strategic-plan amendments and the post-2027 CAP reform',
      'ESR compliance checks (2027 for 2021–25, then 2032)',
    ],
  },
  {
    key: 'lulucf',
    label: 'LULUCF & forests',
    color: '#059669',
    blurb:
      'The sink the corridor counts on is itself climate-vulnerable: fires and disturbances are eroding removals — here adaptation failure *is* mitigation failure.',
    gapIndicatorIds: ['l1-lulucf', 'l8-bioenergy'],
    policyIds: ['lulucf-regulation', 'nature-restoration-law', 'forest-strategy', 'deforestation-regulation'],
    mitigationIds: ['esabcc-l3-afforestation', 'harvested-wood-pool'],
    adaptationIds: [],
    adaptationGapNote:
      'Forest-resilience action (species diversification, fire management coverage) lacks an EU indicator — yet the sink projection in station 1 silently assumes it.',
    observed: [
      { id: 'lulucf-net-removal', track: 'mitigation' },
      { id: 'adv-forest-sink-decline', track: 'mitigation' },
      { id: 'adv-adapt-burnt-area', track: 'adaptation' },
      { id: 'adv-adapt-forest-disturbance', track: 'adaptation' },
    ],
    ratchet: [
      'LULUCF Regulation compliance checks (2025 / 2027) against the −310 Mt 2030 target',
      'Nature Restoration Law national plans (2026) and reviews',
    ],
  },
];

// ── Builder ──────────────────────────────────────────────────────────────────

let _ref = 0;

/** Derive a short chip token for indicators that carry no report code. */
function fallbackCode(name: string): string {
  const initials = name
    .replace(/[()]/g, '')
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return initials || '•';
}

function buildChips(ids: string[], track: LoopTrack): LoopIndicatorChip[] {
  return ids.map((id) => {
    const ind = FRAMEWORK_INDICATOR_INDEX[id];
    return {
      refId: `pl-${++_ref}`,
      code: ind?.code ?? (ind ? fallbackCode(ind.name) : '?'),
      label: ind?.name ?? id,
      indicatorIds: ind ? [id] : [],
      track,
      policy: POLICY_PROCESS_IDS.has(id) || undefined,
    };
  });
}

function buildPolicies(ids: string[]): LoopPolicyChip[] {
  const nowYear = new Date().getFullYear();
  const byId = new Map(SECTOR_POLICIES.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is SectorPolicy => !!p)
    .map((p) => {
      const next = [...p.keyMilestones]
        .sort((a, b) => a.year - b.year)
        .find((m) => m.year >= nowYear);
      return {
        id: p.id,
        name: p.name,
        acronym: p.acronym,
        instrumentType: p.instrumentType,
        nextMilestone: next,
      };
    });
}

function buildCorridor(ids: string[]): LoopBenchmarkChip[] {
  const byId = new Map(POLICY_GAP_INDICATORS.map((g) => [g.id, g]));
  return ids
    .map((id) => byId.get(id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => ({
      code: g.code,
      title: g.title,
      unit: g.unit,
      targets: g.benchmarks.map((b) => ({ year: b.year, value: b.value, label: b.label })),
    }));
}

/**
 * The published "Advanced version 6" adaptive policy loop board: every sector's
 * five-station control loop, computed from the platform's policy, benchmark and
 * indicator registries.
 */
export function defaultPolicyLoopBoardV6(): PolicyLoopBoard {
  _ref = 0;
  const sectors: PolicyLoopSector[] = SECTOR_SPECS.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    blurb: s.blurb,
    corridor: buildCorridor(s.gapIndicatorIds),
    policies: buildPolicies(s.policyIds),
    mitigation: buildChips(s.mitigationIds, 'mitigation'),
    adaptation: buildChips(s.adaptationIds, 'adaptation'),
    adaptationGapNote: s.adaptationGapNote,
    observed: s.observed.map(({ id, track }) => buildChips([id], track)[0]),
    ratchet: s.ratchet,
  }));
  return { version: POLICY_LOOP_V6_VERSION, sectors };
}
