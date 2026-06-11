/**
 * Flow-chart version registry — client-side (localStorage), per project.
 * ----------------------------------------------------------------------
 * The "Flow charts" view of the Indicator module is no longer a fixed pair of
 * boards (report + beta). Instead it is a *registry* of named versions:
 *
 *   • four built-in versions — the report-faithful ESABCC frameworks (the
 *     default), the "enhanced" board (every lever/outcome given an indicator),
 *     the beta board (enhanced + adaptation & resilience layer), and the
 *     "Advanced version 1" board (high-quality indicators + a first-class,
 *     equal-weight adaptation track); and
 *   • any number of user-created versions, each one started by copying an
 *     existing version (its "foundation") and then edited freely.
 *
 * This module owns everything that is version-aware: the metadata registry,
 * the localStorage key for each version's board (and the immutable "seed"
 * snapshot a custom version is reset to), and the create / rename / delete
 * operations. The board *content* model and the published defaults still live
 * in `@/data/sector-frameworks`.
 *
 * The enhanced + beta board keys are kept identical to the pre-registry scheme
 * so existing saved edits survive the upgrade; the report-faithful default gets
 * its own key:
 *   report-faithful → `esabcc-framework-board-report:<project>`
 *   report (enhanced) → `esabcc-framework-board:<project>`
 *   beta   → `esabcc-framework-board-beta:<project>`
 */
import {
  defaultFrameworkBoard,
  defaultFrameworkBoardReport,
  defaultFrameworkBoardBeta,
  defaultFrameworkBoardAdvancedV1,
  defaultFrameworkBoardAdvancedV3,
  defaultFrameworkBoardPolicyGap2,
  defaultFrameworkBoardEnergyTest,
  defaultFrameworkBoardV3,
  FRAMEWORK_BOARD_VERSION,
  FRAMEWORK_BOARD_BETA_VERSION,
  FRAMEWORK_BOARD_ADVANCED_VERSION,
  type FrameworkBoard,
} from '@/data/sector-frameworks';
import { defaultResultsChainBoardV2 } from '@/data/results-chain-v2';
import { defaultMonitoringMapBoardV4 } from '@/data/monitoring-map-v4';
import { defaultResultsChainBoardV5 } from '@/data/results-chain-v5';
import { defaultPolicyLoopBoardV6 } from '@/data/policy-loop-v6';

/**
 * Controls adaptation wording in the board UI; inherited from the foundation.
 *  - 'report'   — plain mitigation layout (report-faithful / enhanced boards);
 *  - 'beta'     — report frameworks + the provisional beta adaptation layer;
 *  - 'advanced' — the high-quality "Advanced version 1" board, where adaptation
 *                 is a first-class track of equal weight to mitigation; and
 *  - 'advanced-v2' — the "Advanced version 2" results-chain board: the whole
 *                 indicator catalogue re-clustered along the six M&E groups
 *                 (Input → Process → Output → Outcome → Impact → Context),
 *                 each rung pairing a mitigation and an adaptation track; and
 *  - 'advanced-v4' — the "Advanced version 4" monitoring-map board: the whole
 *                 catalogue folded into four thematic layers (Enablers →
 *                 Delivery → Outcomes → Risk) with no sector split, each layer
 *                 pairing a mitigation and an adaptation pillar of equal weight;
 *                 and
 *  - 'advanced-v5' — the "Advanced version 5" sectored results-chain board: the
 *                 same six-rung M&E chain as Advanced version 2, but with the
 *                 sector folded in as a sub-layer inside every rung and track,
 *                 so each rung shows which sectors it covers; and
 *  - 'advanced-v6' — the "Advanced version 6" adaptive-policy-loop board: each
 *                 sector as a closed five-station control loop (scenario
 *                 corridor → policy instruments → twin-track delivery →
 *                 observed results → gap & ratchet), with mitigation and
 *                 adaptation as equal lanes inside every sector, scenario
 *                 benchmarks as station 1 and the policy side as stations 2/5;
 *                 and
 *  - 'advanced-v7' — the "Advanced version 7" structured-assessment-matrix
 *                 board: the monitoring-report methodology made explicit as
 *                 five structural dimensions (mitigation by emission sector,
 *                 adaptation by adaptation area, main policies, crosscutting
 *                 themes, societal-objective lenses) plus the eight-step
 *                 assessment protocol that turns a matrix cell into a finding.
 */
export type FlowChartVariant =
  | 'report'
  | 'beta'
  | 'advanced'
  | 'advanced-v2'
  | 'advanced-v4'
  | 'advanced-v5'
  | 'advanced-v6'
  | 'advanced-v7';

export interface FlowChartVersion {
  /** Stable id. Built-ins use 'report-faithful' / 'report' / 'beta'; custom versions use a uid. */
  id: string;
  /** Display name shown in the registry. */
  name: string;
  /** 'beta' enables the adaptation row labels; 'report' is the plain layout. */
  variant: FlowChartVariant;
  /** True for the two published versions (cannot be deleted). */
  builtIn: boolean;
  /** Foundation this version was copied from (custom versions only). */
  basedOnId?: string;
  /** Foundation's name at creation time, for display. */
  basedOnName?: string;
  createdAt?: number;
}

/**
 * The published versions, in the order they appear in the registry. The first
 * one is the default selection:
 *   • 'report-faithful' — 1:1 the report figures (some levers carry no
 *     indicator, exactly as drawn);
 *   • 'report'          — the *enhanced* board, where every lever/outcome was
 *     given an indicator chip (beta or reused ECNO series);
 *   • 'beta'            — the enhanced board + the adaptation & resilience layer;
 *     and
 *   • 'advanced-v1'     — "Advanced version 1": the enhanced board enriched with
 *     high-quality, long-historic-series mitigation indicators and a richer,
 *     equal-weight per-sector adaptation & resilience track.
 */
const BUILTIN_VERSIONS: readonly FlowChartVersion[] = [
  { id: 'report-faithful', name: 'ESABCC report (default)', variant: 'report', builtIn: true },
  { id: 'report', name: 'Enhanced flow charts', variant: 'report', builtIn: true },
  { id: 'beta', name: 'Beta — adaptation & resilience', variant: 'beta', builtIn: true },
  { id: 'advanced-v1', name: 'Advanced version 1', variant: 'advanced', builtIn: true },
  { id: 'advanced-v2', name: 'Advanced version 2', variant: 'advanced-v2', builtIn: true },
  { id: 'advanced-v3', name: 'Advanced version 3', variant: 'advanced', builtIn: true },
  { id: 'advanced-v4', name: 'Advanced version 4', variant: 'advanced-v4', builtIn: true },
  { id: 'advanced-v5', name: 'Advanced version 5', variant: 'advanced-v5', builtIn: true },
  { id: 'advanced-v6', name: 'Advanced version 6', variant: 'advanced-v6', builtIn: true },
  { id: 'advanced-v7', name: 'Advanced version 7', variant: 'advanced-v7', builtIn: true },
  { id: 'policy-gap-2', name: 'Policy Gap Report 2.0', variant: 'report', builtIn: true },
  { id: 'energy-supply-test', name: 'Energy supply test', variant: 'report', builtIn: true },
  { id: 'v3', name: 'v3 — EUCRA climate risk chain', variant: 'report', builtIn: true },
  { id: 'adaptation-mitigation-toc', name: 'Adaptation–Mitigation Theory of Change', variant: 'report', builtIn: true },
];

interface RegistryData {
  /** User-created versions (metadata only — boards live under their own keys). */
  versions: FlowChartVersion[];
  /** Renames of the built-in versions (id → display name). */
  nameOverrides: Record<string, string>;
}

const registryKey = (projectId: string) => `esabcc-flowchart-registry:${projectId}`;

/** localStorage key holding a given version's editable board. */
export function boardStorageKey(version: FlowChartVersion, projectId: string): string {
  if (version.id === 'report-faithful') return `esabcc-framework-board-report:${projectId}`;
  if (version.id === 'report') return `esabcc-framework-board:${projectId}`;
  if (version.id === 'beta') return `esabcc-framework-board-beta:${projectId}`;
  if (version.id === 'advanced-v1') return `esabcc-framework-board-advanced:${projectId}`;
  if (version.id === 'advanced-v2') return `esabcc-framework-board-advanced-v2:${projectId}`;
  if (version.id === 'advanced-v3') return `esabcc-framework-board-advanced-v3:${projectId}`;
  if (version.id === 'advanced-v4') return `esabcc-framework-board-advanced-v4:${projectId}`;
  if (version.id === 'advanced-v5') return `esabcc-framework-board-advanced-v5:${projectId}`;
  if (version.id === 'advanced-v6') return `esabcc-framework-board-advanced-v6:${projectId}`;
  if (version.id === 'advanced-v7') return `esabcc-framework-board-advanced-v7:${projectId}`;
  if (version.id === 'policy-gap-2') return `esabcc-framework-board-policy-gap-2:${projectId}`;
  if (version.id === 'energy-supply-test') return `esabcc-framework-board-energy-test:${projectId}`;
  if (version.id === 'v3') return `esabcc-framework-board-v3:${projectId}`;
  if (version.id === 'adaptation-mitigation-toc') return `esabcc-framework-board-adaptation-toc:${projectId}`;
  return `esabcc-framework-board:v:${version.id}:${projectId}`;
}

/** localStorage key holding a custom version's immutable seed (its reset target). */
function seedStorageKey(version: FlowChartVersion, projectId: string): string {
  return `${boardStorageKey(version, projectId)}:seed`;
}

// ── Shared server sync ──────────────────────────────────────────────────────
// localStorage stays a synchronous cache; the pw_flowchart_state table is the
// shared source of truth. We hydrate the cache from the server on mount and
// write through to the server on every edit, so collaborators converge on the
// same boards and versions. All network calls are best-effort — the cache keeps
// the editing session consistent if a request fails.

const STATE_API = '/api/project-workspace/flowchart-state';

/** Push one key→JSON entry to the shared store. */
function pushState(projectId: string, storageKey: string, data: unknown): void {
  if (typeof window === 'undefined' || !projectId) return;
  void fetch(STATE_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, storageKey, data }),
  }).catch(() => {
    /* best-effort — retried on next edit; the local cache still holds it */
  });
}

/** Delete one entry from the shared store. */
function removeState(projectId: string, storageKey: string): void {
  if (typeof window === 'undefined' || !projectId) return;
  void fetch(
    `${STATE_API}?projectId=${encodeURIComponent(projectId)}&storageKey=${encodeURIComponent(storageKey)}`,
    { method: 'DELETE' },
  ).catch(() => {
    /* best-effort */
  });
}

/**
 * Pull every flow-chart state row for a project from the shared store into the
 * localStorage cache, so the synchronous loaders below render server content.
 * Call once on mount before reading versions/boards. Resolves when the cache
 * has been populated (or on failure, leaving the existing cache untouched).
 */
export async function hydrateFlowchartState(projectId: string): Promise<void> {
  if (typeof window === 'undefined' || !projectId) return;
  try {
    const resp = await fetch(`${STATE_API}?projectId=${encodeURIComponent(projectId)}`);
    if (!resp.ok) return;
    const body = (await resp.json()) as { items?: Array<{ storageKey: string; data: unknown }> };
    for (const it of body.items ?? []) {
      if (!it?.storageKey) continue;
      try {
        localStorage.setItem(it.storageKey, JSON.stringify(it.data));
      } catch {
        /* quota — skip this entry */
      }
    }
  } catch {
    /* offline / unconfigured — keep the existing local cache */
  }
}

/**
 * Persist a version's edited board: update the localStorage cache and write
 * through to the shared store. Used by the board editor on every change.
 */
export function saveBoard(projectId: string, version: FlowChartVersion, board: FrameworkBoard): void {
  const key = boardStorageKey(version, projectId);
  writeBoard(key, board);
  pushState(projectId, key, board);
}

// ── Generic (any-shape) board state ──────────────────────────────────────────
// The four "Advanced" computed views (v2 results-chain, v4 monitoring-map, v5
// sectored results-chain, v6 policy-loop) each persist their own board shape,
// not the sectors `FrameworkBoard`. These helpers store/read arbitrary JSON
// under the version's board key (and seed key) so those views can be edited and
// the edits synced exactly like the sector boards.

/** The computed published default for a *computed* variant, else null. */
export function computedDefaultBoard(version: FlowChartVersion): unknown | null {
  switch (version.variant) {
    case 'advanced-v2':
      return defaultResultsChainBoardV2();
    case 'advanced-v4':
      return defaultMonitoringMapBoardV4();
    case 'advanced-v5':
      return defaultResultsChainBoardV5();
    case 'advanced-v6':
      return defaultPolicyLoopBoardV6();
    default:
      return null;
  }
}

/** Parse a stored board as arbitrary JSON, with no shape validation. */
function readAnyBoard(key: string): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Read a version's stored board as arbitrary JSON (computed views). */
export function readVersionBoard(projectId: string, version: FlowChartVersion): unknown | null {
  return readAnyBoard(boardStorageKey(version, projectId));
}

/** Read a custom computed version's reset seed (the foundation snapshot). */
export function readVersionSeed(projectId: string, version: FlowChartVersion): unknown | null {
  return readAnyBoard(seedStorageKey(version, projectId));
}

/** Persist any-shape board state for a version (cache + shared store). */
export function saveVersionBoard(projectId: string, version: FlowChartVersion, board: unknown): void {
  const key = boardStorageKey(version, projectId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(board));
    } catch {
      /* quota / private mode */
    }
  }
  pushState(projectId, key, board);
}

/** Schema version a version's board is validated against (matches its variant). */
export function boardSchemaVersion(version: FlowChartVersion): number {
  // The advanced-v2 results-chain, advanced-v4 monitoring-map, advanced-v5
  // sectored results-chain, advanced-v6 policy-loop and advanced-v7
  // assessment-matrix boards are computed/read-only and not stored as sectors
  // boards, so they have no sectors schema to validate against.
  if (
    version.variant === 'advanced-v2' ||
    version.variant === 'advanced-v4' ||
    version.variant === 'advanced-v5' ||
    version.variant === 'advanced-v6' ||
    version.variant === 'advanced-v7'
  )
    return FRAMEWORK_BOARD_VERSION;
  if (version.variant === 'advanced') return FRAMEWORK_BOARD_ADVANCED_VERSION;
  if (version.variant === 'beta') return FRAMEWORK_BOARD_BETA_VERSION;
  return FRAMEWORK_BOARD_VERSION;
}

function readBoard(key: string): FrameworkBoard | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FrameworkBoard;
    if (Array.isArray(parsed.sectors)) return parsed;
  } catch {
    /* ignore corrupt / unavailable storage */
  }
  return null;
}

function writeBoard(key: string, board: FrameworkBoard): void {
  writeAnyBoard(key, board);
}

/** Write any-shape board JSON to the localStorage cache. */
function writeAnyBoard(key: string, board: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(board));
  } catch {
    /* quota / private mode */
  }
}

/**
 * The board a version resets to:
 *   • built-ins → the published default; and
 *   • custom    → the seed snapshot taken when it was created (the foundation's
 *     content at that moment), falling back to its variant's published default
 *     if the seed was lost.
 */
export function defaultBoardFor(version: FlowChartVersion, projectId: string): FrameworkBoard {
  // The advanced-v2 results-chain, advanced-v4 monitoring-map, advanced-v5
  // sectored results-chain, advanced-v6 policy-loop and advanced-v7
  // assessment-matrix boards are computed in their own views and are not
  // sectors boards; hand back an empty sectors board so callers that expect
  // the `{ sectors }` shape (e.g. duplicating a version) never crash.
  if (
    version.variant === 'advanced-v2' ||
    version.variant === 'advanced-v4' ||
    version.variant === 'advanced-v5' ||
    version.variant === 'advanced-v6' ||
    version.variant === 'advanced-v7'
  )
    return { version: FRAMEWORK_BOARD_VERSION, sectors: [] };
  if (version.id === 'report-faithful') return defaultFrameworkBoardReport();
  if (version.id === 'report') return defaultFrameworkBoard();
  if (version.id === 'beta') return defaultFrameworkBoardBeta();
  if (version.id === 'advanced-v1') return defaultFrameworkBoardAdvancedV1();
  if (version.id === 'advanced-v3') return defaultFrameworkBoardAdvancedV3();
  if (version.id === 'policy-gap-2') return defaultFrameworkBoardPolicyGap2();
  if (version.id === 'energy-supply-test') return defaultFrameworkBoardEnergyTest();
  if (version.id === 'v3') return defaultFrameworkBoardV3();
  return (
    readBoard(seedStorageKey(version, projectId)) ??
    (version.variant === 'advanced'
      ? defaultFrameworkBoardAdvancedV1()
      : version.variant === 'beta'
        ? defaultFrameworkBoardBeta()
        : defaultFrameworkBoard())
  );
}

function readRegistry(projectId: string): RegistryData {
  if (typeof window === 'undefined') return { versions: [], nameOverrides: {} };
  try {
    const raw = localStorage.getItem(registryKey(projectId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RegistryData>;
      return {
        versions: Array.isArray(parsed.versions) ? parsed.versions : [],
        nameOverrides: parsed.nameOverrides ?? {},
      };
    }
  } catch {
    /* ignore */
  }
  return { versions: [], nameOverrides: {} };
}

function writeRegistry(projectId: string, data: RegistryData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(registryKey(projectId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
  pushState(projectId, registryKey(projectId), data);
}

/** All versions for a project: the (possibly renamed) built-ins, then custom ones. */
export function loadVersions(projectId: string): FlowChartVersion[] {
  const reg = readRegistry(projectId);
  const builtins = BUILTIN_VERSIONS.map((b) => ({
    ...b,
    name: reg.nameOverrides[b.id] ?? b.name,
  }));
  return [...builtins, ...reg.versions];
}

/**
 * Create a new version by copying the foundation's *current* board (its saved
 * edits, or the published default if it has none) into a fresh version, and
 * snapshotting the same content as the seed it can later be reset to.
 */
export function createVersion(
  projectId: string,
  foundation: FlowChartVersion,
  name: string,
): FlowChartVersion {
  const id = `fcv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  // Snapshot the foundation's *current* board. For the computed views this is an
  // any-shape board (results-chain / policy-loop), so read it generically and
  // fall back to that variant's computed default; sector boards keep their
  // existing default path.
  const source =
    readAnyBoard(boardStorageKey(foundation, projectId)) ??
    computedDefaultBoard(foundation) ??
    defaultBoardFor(foundation, projectId);
  const version: FlowChartVersion = {
    id,
    name: name.trim() || 'Untitled flow charts',
    variant: foundation.variant,
    builtIn: false,
    basedOnId: foundation.id,
    basedOnName: foundation.name,
    createdAt: Date.now(),
  };
  const boardKey = boardStorageKey(version, projectId);
  const seedKey = seedStorageKey(version, projectId);
  // `source` is any-shape (sector or computed board); write it verbatim.
  writeAnyBoard(boardKey, source);
  writeAnyBoard(seedKey, source);
  pushState(projectId, boardKey, source);
  pushState(projectId, seedKey, source);
  const reg = readRegistry(projectId);
  reg.versions.push(version);
  writeRegistry(projectId, reg);
  return version;
}

/** Rename any version — built-ins via an override, custom versions in place. */
export function renameVersion(
  projectId: string,
  version: FlowChartVersion,
  name: string,
): void {
  const next = name.trim();
  if (!next) return;
  const reg = readRegistry(projectId);
  if (version.builtIn) {
    reg.nameOverrides[version.id] = next;
  } else {
    const target = reg.versions.find((v) => v.id === version.id);
    if (target) target.name = next;
  }
  writeRegistry(projectId, reg);
}

/** Delete a custom version and its boards. Built-ins are never deleted. */
export function deleteVersion(projectId: string, version: FlowChartVersion): void {
  if (version.builtIn) return;
  const reg = readRegistry(projectId);
  reg.versions = reg.versions.filter((v) => v.id !== version.id);
  writeRegistry(projectId, reg);
  if (typeof window === 'undefined') return;
  const boardKey = boardStorageKey(version, projectId);
  const seedKey = seedStorageKey(version, projectId);
  try {
    localStorage.removeItem(boardKey);
    localStorage.removeItem(seedKey);
  } catch {
    /* ignore */
  }
  removeState(projectId, boardKey);
  removeState(projectId, seedKey);
}
