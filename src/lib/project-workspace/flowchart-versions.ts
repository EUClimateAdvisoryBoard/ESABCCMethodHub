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
  FRAMEWORK_BOARD_VERSION,
  FRAMEWORK_BOARD_BETA_VERSION,
  FRAMEWORK_BOARD_ADVANCED_VERSION,
  type FrameworkBoard,
} from '@/data/sector-frameworks';

/**
 * Controls adaptation wording in the board UI; inherited from the foundation.
 *  - 'report'   — plain mitigation layout (report-faithful / enhanced boards);
 *  - 'beta'     — report frameworks + the provisional beta adaptation layer;
 *  - 'advanced' — the high-quality "Advanced version 1" board, where adaptation
 *                 is a first-class track of equal weight to mitigation; and
 *  - 'advanced-v2' — the "Advanced version 2" results-chain board: the whole
 *                 indicator catalogue re-clustered along the six M&E groups
 *                 (Input → Process → Output → Outcome → Impact → Context),
 *                 each rung pairing a mitigation and an adaptation track.
 */
export type FlowChartVariant = 'report' | 'beta' | 'advanced' | 'advanced-v2';

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
  return `esabcc-framework-board:v:${version.id}:${projectId}`;
}

/** localStorage key holding a custom version's immutable seed (its reset target). */
function seedStorageKey(version: FlowChartVersion, projectId: string): string {
  return `${boardStorageKey(version, projectId)}:seed`;
}

/** Schema version a version's board is validated against (matches its variant). */
export function boardSchemaVersion(version: FlowChartVersion): number {
  // The advanced-v2 results-chain board is computed/read-only and not stored as
  // a sectors board, so it has no sectors schema to validate against.
  if (version.variant === 'advanced-v2') return FRAMEWORK_BOARD_VERSION;
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
  // The advanced-v2 results-chain board is computed in its own view and is not
  // a sectors board; hand back an empty sectors board so callers that expect
  // the `{ sectors }` shape (e.g. duplicating a version) never crash.
  if (version.variant === 'advanced-v2') return { version: FRAMEWORK_BOARD_VERSION, sectors: [] };
  if (version.id === 'report-faithful') return defaultFrameworkBoardReport();
  if (version.id === 'report') return defaultFrameworkBoard();
  if (version.id === 'beta') return defaultFrameworkBoardBeta();
  if (version.id === 'advanced-v1') return defaultFrameworkBoardAdvancedV1();
  if (version.id === 'advanced-v3') return defaultFrameworkBoardAdvancedV3();
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
  const source =
    readBoard(boardStorageKey(foundation, projectId)) ?? defaultBoardFor(foundation, projectId);
  const version: FlowChartVersion = {
    id,
    name: name.trim() || 'Untitled flow charts',
    variant: foundation.variant,
    builtIn: false,
    basedOnId: foundation.id,
    basedOnName: foundation.name,
    createdAt: Date.now(),
  };
  writeBoard(boardStorageKey(version, projectId), source);
  writeBoard(seedStorageKey(version, projectId), source);
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
  try {
    localStorage.removeItem(boardStorageKey(version, projectId));
    localStorage.removeItem(seedStorageKey(version, projectId));
  } catch {
    /* ignore */
  }
}
