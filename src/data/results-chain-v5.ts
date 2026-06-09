/**
 * Advanced version 5 — the results-chain (M&E) flow chart, with SECTORS as a
 * sub-layer.
 * ----------------------------------------------------------------------------
 * Advanced version 5 builds directly on Advanced version 2: it keeps the exact
 * same six-rung monitoring-&-evaluation results chain (Input → Process → Output
 * → Outcome → Impact, with Context & Environmental as a cross-cutting base) and
 * the same paired mitigation / adaptation tracks. What it adds is a third axis —
 * the **sector** — folded in as a sub-layer *inside* every rung and track.
 *
 * Where v2 answers "where on the results chain does each indicator sit, and on
 * which climate track", v5 also answers "**which sectors are covered** at each
 * rung". Every indicator already carries a sector (its `category`); v5 surfaces
 * that by clustering each track column into sector groups, colour-coding the
 * chips by sector, and reporting per-rung and overall sector coverage.
 *
 * The board content itself is unchanged from v2 — v5 is a *view* over the same
 * `defaultResultsChainBoardV2()` data — so the two versions never drift apart.
 * This module owns only the sector taxonomy (labels + colours + canonical order)
 * and the helpers that map an item to its sector and group a rung by sector.
 */
import type { IndicatorCategory } from './ecno-indicators';
import {
  defaultResultsChainBoardV2,
  type ResultsChainBoard,
  type ResultsChainItem,
} from './results-chain-v2';

/** Current schema version of the v5 sectored results-chain view. */
export const RESULTS_CHAIN_V5_VERSION = 1;

/**
 * A sector key used to sub-cluster each rung's track. These are the indicator
 * `category` values, plus a `cross-cutting` catch-all for chips that carry no
 * sector (e.g. "no data" chips or economy-wide indicators without a category).
 */
export type SectorKey = IndicatorCategory | 'cross-cutting';

export interface SectorMeta {
  key: SectorKey;
  /** Short label shown on the sector sub-header and in the coverage legend. */
  label: string;
  /** Accent colour for the sector (chip border + leading dot + legend swatch). */
  color: string;
}

/**
 * The canonical sector order + colours for the sub-layer. The order mirrors the
 * report's chapter order (Energy → Industry → Transport → Buildings →
 * Agriculture → LULUCF), then the cross-cutting enablers (Finance, Fairness,
 * economy-wide Emissions), then the Adaptation & resilience sector, then the
 * catch-all. Colours are chosen to be distinct and readable on white chips.
 */
export const RESULTS_CHAIN_SECTORS: readonly SectorMeta[] = [
  { key: 'energy-supply', label: 'Energy supply', color: '#2563EB' },
  { key: 'energy-demand', label: 'Energy demand', color: '#0EA5E9' },
  { key: 'industry', label: 'Industry', color: '#475569' },
  { key: 'transport', label: 'Transport', color: '#7C3AED' },
  { key: 'buildings', label: 'Buildings', color: '#D97706' },
  { key: 'agriculture', label: 'Agriculture', color: '#16A34A' },
  { key: 'lulucf', label: 'LULUCF', color: '#059669' },
  { key: 'finance', label: 'Finance', color: '#CA8A04' },
  { key: 'fairness', label: 'Fairness & jobs', color: '#DB2777' },
  { key: 'emissions', label: 'Economy-wide emissions', color: '#9E4A46' },
  { key: 'adaptation', label: 'Adaptation & resilience', color: '#2E7D74' },
  { key: 'cross-cutting', label: 'Cross-cutting / other', color: '#6B7280' },
];

/** Index of the sector metadata by key, for O(1) lookup. */
export const SECTOR_META_BY_KEY: Record<SectorKey, SectorMeta> = Object.fromEntries(
  RESULTS_CHAIN_SECTORS.map((s) => [s.key, s]),
) as Record<SectorKey, SectorMeta>;

/** Canonical sort rank of a sector (for stable ordering of sub-groups). */
const SECTOR_RANK: Record<SectorKey, number> = Object.fromEntries(
  RESULTS_CHAIN_SECTORS.map((s, i) => [s.key, i]),
) as Record<SectorKey, number>;

/** The sector a chip belongs to — its `category`, or `cross-cutting` if unset/unknown. */
export function sectorKeyOf(item: Pick<ResultsChainItem, 'sector'>): SectorKey {
  const s = item.sector;
  if (s && s in SECTOR_META_BY_KEY) return s as SectorKey;
  return 'cross-cutting';
}

/** One sector's chips inside a single track column of one rung. */
export interface SectorBucket {
  meta: SectorMeta;
  items: ResultsChainItem[];
}

/**
 * Group a track's chips into sector buckets, in canonical sector order. Empty
 * sectors are dropped — only the sectors actually present at this rung/track
 * appear, so the sub-layer reads as "the sectors covered here".
 */
export function groupBySector(items: ResultsChainItem[]): SectorBucket[] {
  const byKey = new Map<SectorKey, ResultsChainItem[]>();
  for (const it of items) {
    const key = sectorKeyOf(it);
    const arr = byKey.get(key);
    if (arr) arr.push(it);
    else byKey.set(key, [it]);
  }
  return [...byKey.entries()]
    .map(([key, list]) => ({ meta: SECTOR_META_BY_KEY[key], items: list }))
    .sort((a, b) => SECTOR_RANK[a.meta.key] - SECTOR_RANK[b.meta.key]);
}

/** Per-sector coverage across the whole board: indicator count + which rungs it appears in. */
export interface SectorCoverage {
  meta: SectorMeta;
  /** Total chips in this sector across every rung and track. */
  count: number;
  /** How many of the six rungs this sector reaches. */
  rungs: number;
}

/**
 * Roll up sector coverage for the whole board (or a single track when `track`
 * is given), in canonical sector order. Used by the coverage legend so the user
 * can see, at a glance, how many sectors the chain covers and how deeply.
 */
export function sectorCoverage(
  board: ResultsChainBoard,
  track?: ResultsChainItem['track'],
): SectorCoverage[] {
  const counts = new Map<SectorKey, number>();
  const rungs = new Map<SectorKey, Set<string>>();
  for (const g of board.groups) {
    for (const it of g.items) {
      if (track && it.track !== track) continue;
      const key = sectorKeyOf(it);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const seen = rungs.get(key) ?? new Set<string>();
      seen.add(g.id);
      rungs.set(key, seen);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({
      meta: SECTOR_META_BY_KEY[key],
      count,
      rungs: rungs.get(key)?.size ?? 0,
    }))
    .sort((a, b) => SECTOR_RANK[a.meta.key] - SECTOR_RANK[b.meta.key]);
}

/**
 * The published "Advanced version 5" board: identical content to Advanced
 * version 2 (the same six-rung results chain with paired mitigation/adaptation
 * tracks), surfaced with sectors as a sub-layer in the v5 view.
 */
export function defaultResultsChainBoardV5(): ResultsChainBoard {
  return defaultResultsChainBoardV2();
}
