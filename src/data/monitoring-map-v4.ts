/**
 * Advanced version 4 — the monitoring-map board (sector-free, thematic).
 * ---------------------------------------------------------------------
 * Where Advanced version 3 reads *down each sector* and Advanced version 2
 * re-clusters the catalogue along the six-rung M&E results chain, this version
 * folds the whole catalogue into **four thematic monitoring-map layers**, with
 * **no sector split at all** — one overarching goal, two equal-weight pillars
 * (mitigation and adaptation), and every indicator placed by *what kind of
 * signal it is* rather than which sector it belongs to:
 *
 *   1 Enablers & inputs   — the conditions that have to be in place before
 *                           anything is delivered: finance, carbon pricing,
 *                           laws, R&D, skills, and adopted strategies & plans.
 *   2 Delivery on the ground — whether action is actually happening: capacity
 *                           installed, assets built, measures rolled out.
 *   3 Outcomes            — whether delivery shows up in the numbers that
 *                           matter: shares, rates, intensities and, ultimately,
 *                           realised emissions and removals.
 *   4 Risk, harm & signal — whether residual risk, loss and vulnerability are
 *                           actually falling: the hazard signal we operate in
 *                           and the realised harm the system exists to reduce.
 *
 * The layered "enabler → delivery → outcome → risk" reading is *inspired by*
 * the monitoring-map approach that national climate advisory bodies use to
 * judge progress (are the enablers in place, is delivery following, are the
 * outcomes and the residual risk moving?). It is an original synthesis, not a
 * reproduction of any one body's framework: the layer names, descriptions and
 * the placement of indicators below are our own, and the chips link only to
 * indicators already curated in this platform.
 *
 * To stay in lock-step with the curated catalogue (and avoid re-listing ~100
 * indicator ids by hand), the board is *derived* from the Advanced version 2
 * results-chain board: each of its six rungs maps onto one of the four layers
 * here, preserving the mitigation / adaptation pillar and the policy flag. The
 * mapping ladder:
 *   • Input + Process            → Enablers & inputs
 *   • Output                     → Delivery on the ground
 *   • Outcome                    → Outcomes
 *   • Impact (mitigation)        → Outcomes      (realised emissions & removals)
 *   • Impact (adaptation)        → Risk, harm & signal  (realised loss & harm)
 *   • Context                    → Risk, harm & signal  (the climate signal)
 */
import {
  defaultResultsChainBoardV2,
  type ResultsChainBoard,
  type ResultsChainItem,
  type ResultsGroup,
  type ResultsGroupId,
} from './results-chain-v2';

/** Current schema version of the monitoring-map board (bump to invalidate). */
export const MONITORING_MAP_V4_VERSION = 1;

/** A monitoring-map layer id (subset of ResultsGroupId reused for v4). */
type LayerId = Extract<ResultsGroupId, 'enabler' | 'delivery' | 'outcome' | 'risk'>;

interface LayerMeta {
  id: LayerId;
  index: number;
  name: string;
  blurb: string;
  color: string;
}

/** The four layers, in monitoring-map reading order (enabler → … → risk). */
const LAYER_META: readonly LayerMeta[] = [
  {
    id: 'enabler',
    index: 1,
    name: 'Enablers & inputs',
    blurb:
      'Are the conditions for action in place? Finance, carbon pricing, laws, R&D, skills and the strategies & plans that have to be set before anything can be delivered.',
    color: '#6D5BD0',
  },
  {
    id: 'delivery',
    index: 2,
    name: 'Delivery on the ground',
    blurb:
      'Is action actually happening? Capacity installed, assets built and measures rolled out — the physical roll-out the enablers are meant to unlock.',
    color: '#2563A6',
  },
  {
    id: 'outcome',
    index: 3,
    name: 'Outcomes',
    blurb:
      'Is delivery showing up in the numbers that matter — shares, rates and intensities, and ultimately the realised emissions and removals?',
    color: '#3F8F5B',
  },
  {
    id: 'risk',
    index: 4,
    name: 'Risk, harm & climate signal',
    blurb:
      'Is residual risk, loss and vulnerability actually falling? The hazard signal we operate in and the realised harm the system exists to reduce.',
    color: '#B5524C',
  },
];

/** Map one Advanced-version-2 rung (+ pillar) onto a monitoring-map layer. */
function layerForItem(groupId: ResultsGroupId, item: ResultsChainItem): LayerId {
  switch (groupId) {
    case 'input':
    case 'process':
      return 'enabler';
    case 'output':
      return 'delivery';
    case 'outcome':
      return 'outcome';
    case 'impact':
      // Realised emissions & removals are mitigation outcomes; realised loss,
      // mortality and damages are the adaptation risk the system reduces.
      return item.track === 'adaptation' ? 'risk' : 'outcome';
    case 'context':
      return 'risk';
    default:
      return 'outcome';
  }
}

/**
 * The monitoring-map board: the Advanced-version-2 catalogue re-binned into the
 * four thematic layers, each layer keeping the mitigation / adaptation pillars.
 */
export function defaultMonitoringMapBoardV4(): ResultsChainBoard {
  const source = defaultResultsChainBoardV2();
  const buckets = new Map<LayerId, ResultsChainItem[]>(
    LAYER_META.map((l) => [l.id, [] as ResultsChainItem[]]),
  );

  for (const group of source.groups) {
    for (const item of group.items) {
      const layer = layerForItem(group.id, item);
      buckets.get(layer)!.push({ ...item, refId: `v4-${item.refId}` });
    }
  }

  const groups: ResultsGroup[] = LAYER_META.map((meta) => ({
    id: meta.id,
    index: meta.index,
    name: meta.name,
    blurb: meta.blurb,
    color: meta.color,
    items: buckets.get(meta.id) ?? [],
  }));

  return { version: MONITORING_MAP_V4_VERSION, groups };
}
