/**
 * Advanced version 8 — the STEERING PANORAMA (the headline figure).
 * ------------------------------------------------------------------
 * Versions 1–7 each answered one question well: how a sector transforms
 * (1, 3), where an indicator sits in the results chain (2, 5), what the whole
 * monitoring map looks like (4), how the governance loop closes (6), and how
 * the report's method is structured (7). Version 8 answers the question a
 * report *cover figure* must answer in one glance:
 *
 *   «Is each sector on track — do its policies explain why — and what does
 *    the Board therefore recommend?»
 *
 * It is one figure with three stacked layers, pierced by one vertical thread
 * per sector:
 *
 *   ① PROGRESS — the monitoring layer. Per sector: the benchmark corridor
 *     (Climate Law / Fit-for-55 MIX, the same set behind the Policy Gap
 *     charts), the observed results, the delivery drivers, and a pace verdict
 *     (on track · mixed · too slow · off track) with the gap stated as one
 *     finding.
 *   ② POLICY — the steering layer. Per sector: the real EU instruments
 *     (from the Policy Navigator registry, each with the next milestone that
 *     bites), each scored for its *contribution* — delivering · partial ·
 *     lagging — so the layer shows not just which laws exist but whether they
 *     explain the pace above.
 *   ③ RECOMMENDATIONS — the advice layer. Per sector: the ESABCC's own
 *     recommendations (resolved live from the recommendation tracker seed, so
 *     uptake status never drifts), each tagged with the gap in layers ①/② it
 *     responds to.
 *
 * The figure's claim — and the reason it can be a report's major figure — is
 * the *derivation*: reading any sector top-to-bottom is an argument, not a
 * collage. The measured gap (①) is explained by the instrument mix (②), and
 * the explanation points at the advice (③); each sector card states that
 * chain in one line.
 *
 * Like Advanced version 7 this is a computed, read-only analytical view: every
 * chip resolves at build time against the platform's registries —
 * `POLICY_GAP_INDICATORS` (benchmarks), `SECTOR_POLICIES` (laws + milestones),
 * `FRAMEWORK_INDICATOR_INDEX` (indicator chips) and
 * `ESABCC_2024_RECOMMENDATIONS` (advice + uptake status) — so the panorama
 * cannot drift from the underlying data. The pace and contribution verdicts
 * are the curated editorial layer (the report's own findings, January 2024,
 * statuses updated to the 2026-06 tracker assessment); everything they score
 * is linked, inspectable data.
 */
import { FRAMEWORK_INDICATOR_INDEX } from './sector-frameworks';
import { SECTOR_POLICIES, type SectorPolicy } from './sectoral-policies';
import { POLICY_GAP_INDICATORS } from '@/lib/scenarios/policy-gap';
import {
  ESABCC_2024_RECOMMENDATIONS,
  type RecommendationStatus,
} from './esabcc-recommendations';

/** Current schema version of the v8 steering-panorama view. */
export const HEADLINE_FIGURE_V8_VERSION = 1;

// ── Verdict vocabularies ─────────────────────────────────────────────────────

/** Layer-① pace verdict — pace against the corridor, not position. */
export type PaceVerdict = 'on-track' | 'mixed' | 'too-slow' | 'off-track';

/** Layer-② contribution verdict — does the instrument explain the pace? */
export type PolicyContribution = 'delivering' | 'partial' | 'lagging';

export const PACE_META: Record<PaceVerdict, { label: string; color: string; glyph: string }> = {
  'on-track': { label: 'On track', color: '#15803D', glyph: '●' },
  mixed: { label: 'Mixed', color: '#0E7490', glyph: '◐' },
  'too-slow': { label: 'Too slow', color: '#B45309', glyph: '◔' },
  'off-track': { label: 'Off track', color: '#B91C1C', glyph: '○' },
};

export const CONTRIBUTION_META: Record<
  PolicyContribution,
  { label: string; color: string }
> = {
  delivering: { label: 'Delivering', color: '#15803D' },
  partial: { label: 'Partial', color: '#B45309' },
  lagging: { label: 'Lagging', color: '#B91C1C' },
};

export const REC_STATUS_META: Record<
  RecommendationStatus,
  { label: string; color: string }
> = {
  addressed: { label: 'Addressed', color: '#15803D' },
  partially: { label: 'Partially addressed', color: '#B45309' },
  'in-progress': { label: 'In progress', color: '#1D4ED8' },
  'not-addressed': { label: 'Not addressed', color: '#B91C1C' },
};

// ── The three layers of the panorama ─────────────────────────────────────────

export type PanoramaLayerId = 'progress' | 'policy' | 'recommendations';

export interface PanoramaLayer {
  id: PanoramaLayerId;
  index: number;
  name: string;
  blurb: string;
  color: string;
}

export const PANORAMA_LAYERS: readonly PanoramaLayer[] = [
  {
    id: 'progress',
    index: 1,
    name: 'Progress — what the data shows',
    blurb:
      'Per sector: the benchmark corridor, the observed results, the delivery drivers — and a pace verdict with the gap stated as a finding.',
    color: '#3D6E8C',
  },
  {
    id: 'policy',
    index: 2,
    name: 'Policy — what steers it',
    blurb:
      'Per sector: the EU instruments aiming it at the corridor, each scored for whether it is delivering, partial or lagging — the explanation of the pace above.',
    color: '#B45309',
  },
  {
    id: 'recommendations',
    index: 3,
    name: 'Recommendations — what the Board advises',
    blurb:
      'Per sector: the ESABCC recommendations responding to the gap, with live uptake status from the recommendation tracker.',
    color: '#5B5BD6',
  },
];

// ── Board model ──────────────────────────────────────────────────────────────

export type PanoramaTrack = 'mitigation' | 'adaptation';

/** One benchmark chip on the progress layer, resolved from POLICY_GAP_INDICATORS. */
export interface PanoramaBenchmarkChip {
  code: string;
  title: string;
  unit: string;
  targets: { year: number; value: number; label: string }[];
}

/** One indicator chip (observed / driver), resolved from FRAMEWORK_INDICATOR_INDEX. */
export interface PanoramaIndicatorChip {
  refId: string;
  code: string;
  label: string;
  /** Links into the indicator database. Empty → "no data" chip. */
  indicatorIds: string[];
  track: PanoramaTrack;
}

/** One instrument chip on the policy layer, resolved from SECTOR_POLICIES. */
export interface PanoramaPolicyChip {
  id: string;
  name: string;
  acronym?: string;
  instrumentType: SectorPolicy['instrumentType'];
  /** The next key milestone at or after the current year — the requirement that bites next. */
  nextMilestone?: { year: number; requirement: string };
  /** Curated verdict: does this instrument explain the sector's pace? */
  contribution: PolicyContribution;
  /** One-line justification of the contribution verdict. */
  assessment: string;
}

/** One advice chip on the recommendations layer, resolved live from the tracker seed. */
export interface PanoramaRecommendationChip {
  id: string;
  /** Report code, e.g. "KR1", "T5" — derived from the recommendation's area. */
  code: string;
  title: string;
  status: RecommendationStatus;
  /** The gap in layers ①/② this recommendation responds to — the derivation made explicit. */
  respondsTo: string;
}

export interface PanoramaSector {
  key: string;
  label: string;
  color: string;
  /** One-line systems description of this sector's thread through the figure. */
  blurb: string;
  progress: {
    pace: PaceVerdict;
    /** The gap stated as one finding — the layer-① output. */
    gapStatement: string;
    benchmarks: PanoramaBenchmarkChip[];
    /** Realised results the verdict is judged on (each chip carries its track). */
    observed: PanoramaIndicatorChip[];
    /** The levers currently bending (or failing to bend) the line. */
    drivers: PanoramaIndicatorChip[];
  };
  policy: {
    /** Lane verdict: the instrument mix as a whole. */
    coverage: PolicyContribution;
    /** One-line reading of the lane — why the mix does (not) explain the pace. */
    statement: string;
    instruments: PanoramaPolicyChip[];
  };
  recommendations: {
    /** The derivation in one line: gap + instrument mix ⇒ this advice cluster. */
    statement: string;
    items: PanoramaRecommendationChip[];
  };
}

export interface HeadlineFigureBoard {
  version: number;
  sectors: PanoramaSector[];
}

// ── Curated content ──────────────────────────────────────────────────────────
//
// Each sector spec lists ids into the four underlying registries plus the
// curated verdict layer. The pace/gap findings follow the ESABCC 2024 report's
// own sector verdicts; the recommendation statuses resolve live from the
// tracker seed (assessed 2026-06), so the derivation stays current.

interface SectorSpec {
  key: string;
  label: string;
  color: string;
  blurb: string;
  pace: PaceVerdict;
  gapStatement: string;
  gapIndicatorIds: string[];
  observed: { id: string; track: PanoramaTrack }[];
  driverIds: string[];
  coverage: PolicyContribution;
  policyStatement: string;
  instruments: { id: string; contribution: PolicyContribution; assessment: string }[];
  recStatement: string;
  recommendations: { id: string; respondsTo: string }[];
}

const SECTOR_SPECS: readonly SectorSpec[] = [
  {
    key: 'economy-wide',
    label: 'EU economy-wide',
    color: '#9E4A46',
    blurb:
      'The master thread: the Climate Law sets the corridor, the cross-cutting machinery prices and governs it, and the Board’s advice clusters on enforcement and the unfinished pieces.',
    pace: 'too-slow',
    gapStatement:
      'Emissions are falling, but the final NECPs project ~−54% by 2030 against the −55% target — and the pace must nearly double after 2030 to hold the 2040/2050 corridor.',
    gapIndicatorIds: ['o1-total-ghg', 'o2-primary-energy', 'o2-final-energy'],
    observed: [
      { id: 'ghg-total-net', track: 'mitigation' },
      { id: 'esabcc-o1-ghg-total', track: 'mitigation' },
      { id: 'adv-adapt-economic-losses', track: 'adaptation' },
    ],
    driverIds: ['clean-tech-investment', 'eu-ets-price', 'necp-implementation-score'],
    coverage: 'partial',
    policyStatement:
      'The architecture is complete on paper; enforcement and one blocked file are the gap.',
    instruments: [
      {
        id: 'climate-law',
        contribution: 'delivering',
        assessment:
          'The corridor itself: −55% by 2030 and neutrality by 2050 are binding, and the Art. 4 stocktake is the ratchet.',
      },
      {
        id: 'eu-ets',
        contribution: 'delivering',
        assessment:
          'Cap and price are biting — stationary ETS emissions fall faster than the economy-wide average.',
      },
      {
        id: 'governance-regulation',
        contribution: 'partial',
        assessment:
          'The NECP machinery works, but the final plans land ~1 point short and enforcement has not closed it.',
      },
      {
        id: 'esr',
        contribution: 'partial',
        assessment:
          'Several Member States are projected to miss their effort-sharing budgets without leaning on flexibilities.',
      },
      {
        id: 'fit-for-55',
        contribution: 'partial',
        assessment:
          'Nearly every file is adopted; the Energy Taxation Directive remains the one blocked piece.',
      },
    ],
    recStatement:
      'A too-slow corridor with the machinery mostly built ⇒ the advice clusters on enforcement and the unfinished pieces.',
    recommendations: [
      { id: 'kr1-necps-implementation', respondsTo: 'the ~1-point NECP gap to −55%' },
      { id: 'kr2-adopt-pending-greendeal', respondsTo: 'the blocked Energy Taxation Directive' },
      { id: 'kr4-phase-out-ff-subsidies', respondsTo: 'fossil subsidies blunting the price signal' },
      { id: 'kr5-policy-consistency-climate-neutrality', respondsTo: 'instruments still pulling against the corridor' },
      { id: 'kr6-strengthen-governance', respondsTo: 'governance that monitors but does not yet enforce' },
    ],
  },
  {
    key: 'energy-supply',
    label: 'Energy supply',
    color: '#2563EB',
    blurb:
      'The strongest thread on the board: power decarbonises roughly on corridor — so the gap, and the advice, move downstream to demand, grids and flexibility.',
    pace: 'mixed',
    gapStatement:
      'Power-sector emissions and renewables broadly track the corridor; electrification of final demand and grid build-out do not.',
    gapIndicatorIds: ['e1-energy-ghg', 'e2-res-share', 'e3-grid-intensity'],
    observed: [
      { id: 'power-sector-ghg', track: 'mitigation' },
      { id: 'esabcc-e1-energy-supply-ghg', track: 'mitigation' },
      { id: 'beta-adapt-energy-drought-damage', track: 'adaptation' },
    ],
    driverIds: ['solar-pv-additions', 'wind-additions', 'res-share'],
    coverage: 'delivering',
    policyStatement:
      'The strongest policy lane on the board — its remaining gaps are downstream: grids, demand, system integration.',
    instruments: [
      {
        id: 'eu-ets',
        contribution: 'delivering',
        assessment:
          'The power sector is the ETS’s clearest success: coal-to-clean switching tracks the tightening cap.',
      },
      {
        id: 'red-iii',
        contribution: 'delivering',
        assessment:
          'Renewables build-out is broadly on the 2030 trajectory; permitting reforms are flowing through.',
      },
      {
        id: 'eed',
        contribution: 'lagging',
        assessment:
          'Efficiency-first is the weakest pillar: final-energy demand is not falling at the EED pace.',
      },
      {
        id: 'ten-e',
        contribution: 'partial',
        assessment:
          'Grid and interconnection build-out trails the renewables it must absorb.',
      },
    ],
    recStatement:
      'Where delivery is strongest, the advice shifts to system integration — demand, grids, flexibility and the unpriced upstream.',
    recommendations: [
      { id: 'e3-efficiency-first-mandatory', respondsTo: 'demand not falling at EED pace' },
      { id: 'kr3-renewables-investment-outlook', respondsTo: 'investment certainty for the build-out' },
      { id: 'e5-system-integration-flexibility', respondsTo: 'grids and flexibility trailing renewables' },
      { id: 'e9-upstream-fossil-emissions', respondsTo: 'upstream methane the cap does not reach' },
    ],
  },
  {
    key: 'industry',
    label: 'Industry',
    color: '#475569',
    blurb:
      'Emissions decline — but partly through lost output rather than transformation. The thread runs from the investment gap to the advice on circularity and leakage protection.',
    pace: 'too-slow',
    gapStatement:
      'Industrial emissions decline, but partly through lost output rather than transformation — the clean-tech investment gap is the tell.',
    gapIndicatorIds: ['i1-industry-ghg', 'i5-final-energy'],
    observed: [
      { id: 'industry-ghg', track: 'mitigation' },
      { id: 'esabcc-i1-industry-ghg', track: 'mitigation' },
      { id: 'adv-adapt-river-flood-damage', track: 'adaptation' },
    ],
    driverIds: ['industry-electrification', 'esabcc-i4-steel-ghg-intensity', 'clean-tech-trade-balance'],
    coverage: 'partial',
    policyStatement:
      'Pricing is in place; the transformation layer — CBAM at full force, NZIA delivery — is still arriving.',
    instruments: [
      {
        id: 'eu-ets',
        contribution: 'delivering',
        assessment:
          'Free allocation shrinks and the cap tightens; industrial ETS emissions are declining under it.',
      },
      {
        id: 'cbam',
        contribution: 'partial',
        assessment:
          'Transitional phase only: the leakage shield bites from 2026 alongside the free-allocation phase-out.',
      },
      {
        id: 'net-zero-industry-act',
        contribution: 'partial',
        assessment:
          'Manufacturing targets are set, but clean-tech investment still trails global competitors.',
      },
      {
        id: 'ied',
        contribution: 'partial',
        assessment:
          'Permitting reform adopted; transformation plans for industrial sites are still maturing.',
      },
    ],
    recStatement:
      'Decline without transformation ⇒ the advice targets investment certainty, circularity and an honest leakage shield.',
    recommendations: [
      { id: 'i3-low-emission-industrial-tech', respondsTo: 'transformation, not output loss' },
      { id: 'i1-circular-economy-ceap2', respondsTo: 'material demand and circularity untapped' },
      { id: 'i2-carbon-leakage-alternatives', respondsTo: 'leakage protection beyond free allocation' },
      { id: 'c2-free-allocation-alternatives', respondsTo: 'free allocation blunting the ETS signal' },
    ],
  },
  {
    key: 'transport',
    label: 'Transport',
    color: '#7C3AED',
    blurb:
      'The off-track thread: strong vehicle standards, late prices, untouched demand — the advice reaches past technology to modal shift and taxation.',
    pace: 'off-track',
    gapStatement:
      'The only sector whose emissions barely fell since 1990 — the 2030 benchmark needs a bend that fleet turnover alone cannot deliver in time.',
    gapIndicatorIds: ['t1-transport-ghg', 't6-fossil-transport'],
    observed: [
      { id: 'esabcc-t1-transport-ghg', track: 'mitigation' },
      { id: 'beta-adapt-rail-disruption', track: 'adaptation' },
    ],
    driverIds: ['ev-share-new-cars', 'zev-charging-points', 'rail-iww-freight-share'],
    coverage: 'partial',
    policyStatement:
      'Strong standards, late prices: the instrument mix bends the line after 2030, not before.',
    instruments: [
      {
        id: 'co2-cars-vans',
        contribution: 'delivering',
        assessment:
          'The 2035 zero-emission requirement anchors the corridor; EV shares step up with each target year.',
      },
      {
        id: 'co2-hdv',
        contribution: 'partial',
        assessment:
          '−90% by 2040 is adopted; zero-emission heavy-duty uptake is still in its first percent.',
      },
      {
        id: 'afir',
        contribution: 'partial',
        assessment:
          'Charging-point targets are binding but unevenly delivered across Member States.',
      },
      {
        id: 'ets2',
        contribution: 'lagging',
        assessment:
          'The road-fuel price signal only starts in 2027 — too late to bend the 2030 line on its own.',
      },
    ],
    recStatement:
      'Standards alone cannot close an off-track corridor ⇒ the advice reaches for demand, modal shift and prices — and most of it is not yet addressed.',
    recommendations: [
      { id: 't1-curb-transport-demand', respondsTo: 'demand growth eating technology gains' },
      { id: 't2-modal-shift', respondsTo: 'modal shift stalled' },
      { id: 't3-efficient-zev-incentives', respondsTo: 'uneven ZEV incentives across Member States' },
      { id: 't5-etd-end-exemptions', respondsTo: 'aviation & maritime fuel-tax exemptions' },
      { id: 't6-ets-price-convergence', respondsTo: 'fragmented carbon prices across modes' },
    ],
  },
  {
    key: 'buildings',
    label: 'Buildings',
    color: '#D97706',
    blurb:
      'Every instrument is adopted, none yet bites: renovation runs at half the needed pace while the lane waits on 2026–27 milestones — the advice pairs delivery with fairness.',
    pace: 'too-slow',
    gapStatement:
      'Renovation runs near 1% a year where the corridor needs more than 2%, and heat-pump sales fell back in 2023–24.',
    gapIndicatorIds: ['b1-buildings-ghg', 'b2-buildings-energy'],
    observed: [
      { id: 'buildings-ghg', track: 'mitigation' },
      { id: 'esabcc-b1-buildings-ghg', track: 'mitigation' },
      { id: 'adv-adapt-heat-mortality', track: 'adaptation' },
    ],
    driverIds: ['building-renovation-rate', 'heat-pump-sales', 'renewable-heating-cooling'],
    coverage: 'partial',
    policyStatement:
      'Every instrument is adopted but none yet bites — the lane is all milestones, 2026–27.',
    instruments: [
      {
        id: 'epbd',
        contribution: 'partial',
        assessment:
          'Zero-emission newbuild dates are set; the 2026 national renovation plans must turn them into renovation rates.',
      },
      {
        id: 'ets2',
        contribution: 'lagging',
        assessment:
          'Heating-fuel pricing starts in 2027, with the social cushioning still being built.',
      },
      {
        id: 'sclf',
        contribution: 'partial',
        assessment:
          'Social Climate Plans are due 2025–26 — the fairness valve for ETS2 is not yet operational.',
      },
      {
        id: 'red-iii',
        contribution: 'partial',
        assessment:
          'Renewable-heat targets are adopted; heat-pump sales lost momentum in 2023–24.',
      },
    ],
    recStatement:
      'Slow renovation with the price signal arriving late ⇒ the advice pairs delivery (plans, heat) with fairness and sufficiency.',
    recommendations: [
      { id: 'b1-ets2-epbd-implementation', respondsTo: 'ETS2 and the EPBD must land together' },
      { id: 'b2-renovation-strategies', respondsTo: 'renovation stuck near 1% a year' },
      { id: 'b3-heat-pumps-district-heating', respondsTo: 'heat-pump rollout losing momentum' },
      { id: 'b4-buildings-demand-sufficiency', respondsTo: 'the sufficiency lever entirely unused' },
    ],
  },
  {
    key: 'agriculture',
    label: 'Agriculture & food',
    color: '#16A34A',
    blurb:
      'The structurally weakest thread: flat emissions, an unpriced externality, and a main instrument with no emission objective — so the advice is structural, and largely unaddressed.',
    pace: 'off-track',
    gapStatement:
      'Non-CO₂ emissions have been flat since 2010; no instrument prices them, yet the 2030 benchmark assumes a fall.',
    gapIndicatorIds: ['a1-agriculture-ghg'],
    observed: [
      { id: 'agri-ghg', track: 'mitigation' },
      { id: 'esabcc-a1-agri-nonco2', track: 'mitigation' },
      { id: 'adv-adapt-crop-loss', track: 'adaptation' },
    ],
    driverIds: ['nitrogen-fertiliser-use', 'organic-farming-share', 'food-waste-per-capita'],
    coverage: 'lagging',
    policyStatement:
      'The only sector whose main instrument is misaligned with the corridor: the CAP does not steer the emissions it pays alongside.',
    instruments: [
      {
        id: 'cap',
        contribution: 'lagging',
        assessment:
          'The CAP carries no emission-reduction objective — the sector’s main instrument does not steer its main externality.',
      },
      {
        id: 'farm-to-fork',
        contribution: 'lagging',
        assessment:
          'The flagship demand-side piece (a sustainable food systems law) was never tabled.',
      },
      {
        id: 'nature-restoration-law',
        contribution: 'partial',
        assessment:
          'Adopted with peatland and rewetting targets that serve both pillars; national plans are due 2026.',
      },
      {
        id: 'nec',
        contribution: 'partial',
        assessment:
          'Ammonia ceilings deliver co-benefits only — there is no methane target for livestock.',
      },
    ],
    recStatement:
      'An off-track sector whose main instrument does not steer ⇒ the advice is structural — objectives, pricing, demand — and none of it is yet addressed.',
    recommendations: [
      { id: 'kr9-agriculture-food-incentives', respondsTo: 'the main instrument not steering emissions' },
      { id: 'a1-cap-emission-objective', respondsTo: 'a CAP with no emission objective' },
      { id: 'a2-agri-emissions-pricing', respondsTo: 'agricultural emissions entirely unpriced' },
      { id: 'a3-healthy-diets-food-waste', respondsTo: 'the demand side (diets, waste) untouched' },
    ],
  },
  {
    key: 'lulucf',
    label: 'LULUCF & forests',
    color: '#059669',
    blurb:
      'The thread the whole figure leans on: a shrinking sink the corridor counts on — regulation states the target but cannot make a forest grow, so the advice is to price, incentivise and insure removals.',
    pace: 'off-track',
    gapStatement:
      'The sink is roughly half its 2010 level and moving away from the −310 Mt 2030 target — the corridor counts on removals that are currently shrinking.',
    gapIndicatorIds: ['l1-lulucf', 'l8-bioenergy'],
    observed: [
      { id: 'lulucf-net-removal', track: 'mitigation' },
      { id: 'adv-forest-sink-decline', track: 'mitigation' },
      { id: 'adv-adapt-burnt-area', track: 'adaptation' },
    ],
    driverIds: ['esabcc-l3-afforestation', 'harvested-wood-pool'],
    coverage: 'lagging',
    policyStatement:
      'Regulation states the target but cannot make a forest grow — incentives are the missing instrument.',
    instruments: [
      {
        id: 'lulucf-regulation',
        contribution: 'lagging',
        assessment:
          'The −310 Mt 2030 target recedes as the sink declines; the 2025/2027 compliance checks will bite.',
      },
      {
        id: 'nature-restoration-law',
        contribution: 'partial',
        assessment:
          'Restoration targets serve sink and resilience at once; delivery hangs on the 2026 national plans.',
      },
      {
        id: 'forest-strategy',
        contribution: 'partial',
        assessment:
          'Non-binding: resilience and monitoring rely on voluntary uptake.',
      },
      {
        id: 'deforestation-regulation',
        contribution: 'partial',
        assessment:
          'The demand-side guard is adopted, but application has been repeatedly delayed.',
      },
    ],
    recStatement:
      'A shrinking sink the corridor counts on ⇒ the advice is to price land-sector carbon, pay for removals, and plan for the sink falling short.',
    recommendations: [
      { id: 'l1-forests-wetlands-land', respondsTo: 'the sink decline itself' },
      { id: 'l3-lulucf-pricing-instrument', respondsTo: 'no price on land-sector carbon' },
      { id: 'l4-land-use-removal-incentives', respondsTo: 'no incentive reaching land managers' },
      { id: 'l6-lulucf-sink-contingency', respondsTo: 'no contingency if the sink keeps shrinking' },
      { id: 'l5-increase-adaptation', respondsTo: 'resilience underpinning every removal projection' },
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

function buildChips(ids: string[], track: PanoramaTrack): PanoramaIndicatorChip[] {
  return ids.map((id) => {
    const ind = FRAMEWORK_INDICATOR_INDEX[id];
    return {
      refId: `hf-${++_ref}`,
      code: ind?.code ?? (ind ? fallbackCode(ind.name) : '?'),
      label: ind?.name ?? id,
      indicatorIds: ind ? [id] : [],
      track,
    };
  });
}

function buildBenchmarks(ids: string[]): PanoramaBenchmarkChip[] {
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

function buildInstruments(
  specs: SectorSpec['instruments'],
): PanoramaPolicyChip[] {
  const nowYear = new Date().getFullYear();
  const byId = new Map(SECTOR_POLICIES.map((p) => [p.id, p]));
  return specs
    .map((spec): PanoramaPolicyChip | null => {
      const p = byId.get(spec.id);
      if (!p) return null;
      const next = [...p.keyMilestones]
        .sort((a, b) => a.year - b.year)
        .find((m) => m.year >= nowYear);
      return {
        id: p.id,
        name: p.name,
        acronym: p.acronym,
        instrumentType: p.instrumentType,
        nextMilestone: next,
        contribution: spec.contribution,
        assessment: spec.assessment,
      };
    })
    .filter((p): p is PanoramaPolicyChip => !!p);
}

function buildRecommendations(
  specs: SectorSpec['recommendations'],
): PanoramaRecommendationChip[] {
  const byId = new Map(ESABCC_2024_RECOMMENDATIONS.map((r) => [r.id, r]));
  return specs
    .map((spec) => {
      const r = byId.get(spec.id);
      if (!r) return null;
      // "KR1 · 2030 target" → "KR1"
      const code = r.area.split('·')[0]?.trim() || r.area;
      return {
        id: r.id,
        code,
        title: r.title,
        status: r.status,
        respondsTo: spec.respondsTo,
      };
    })
    .filter((r): r is PanoramaRecommendationChip => !!r);
}

/**
 * The published "Advanced version 8" steering panorama: every sector's
 * three-layer thread (progress → policy → recommendations), computed from the
 * platform's benchmark, policy, indicator and recommendation registries.
 */
export function defaultHeadlineFigureBoardV8(): HeadlineFigureBoard {
  _ref = 0;
  const sectors: PanoramaSector[] = SECTOR_SPECS.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    blurb: s.blurb,
    progress: {
      pace: s.pace,
      gapStatement: s.gapStatement,
      benchmarks: buildBenchmarks(s.gapIndicatorIds),
      observed: s.observed.map(({ id, track }) => buildChips([id], track)[0]),
      drivers: buildChips(s.driverIds, 'mitigation'),
    },
    policy: {
      coverage: s.coverage,
      statement: s.policyStatement,
      instruments: buildInstruments(s.instruments),
    },
    recommendations: {
      statement: s.recStatement,
      items: buildRecommendations(s.recommendations),
    },
  }));
  return { version: HEADLINE_FIGURE_V8_VERSION, sectors };
}
