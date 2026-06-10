/**
 * Immutable edit operations for the adaptive-policy-loop board (`PolicyLoopBoard`,
 * Advanced version 6).
 *
 * The loop is the richest of the computed boards — each sector carries five
 * stations of different shapes (scenario benchmarks, policy instruments, two
 * delivery lanes, observed results and the ratchet list) — so these helpers give
 * the editable view one place to add / delete / relabel every part without
 * duplicating the spread-and-map plumbing. New benchmark and policy chips are
 * resolved from the same registries the published builder uses, so an edited
 * board never invents data that isn't in the platform.
 */
import type { Indicator } from './ecno-indicators';
import {
  type LoopBenchmarkChip,
  type LoopIndicatorChip,
  type LoopPolicyChip,
  type LoopTrack,
  type PolicyLoopBoard,
  type PolicyLoopSector,
} from './policy-loop-v6';
import { SECTOR_POLICIES, type SectorPolicy } from './sectoral-policies';
import { POLICY_GAP_INDICATORS } from '@/lib/scenarios/policy-gap';

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** The three editable indicator-chip lanes inside a sector loop. */
export type LoopLane = 'mitigation' | 'adaptation' | 'observed';

/** Build an indicator chip from a catalogue indicator. */
export function chipFromIndicator(ind: Indicator, track: LoopTrack): LoopIndicatorChip {
  return {
    refId: uid('pl'),
    code: ind.code ?? '•',
    label: ind.name,
    indicatorIds: [ind.id],
    track,
  };
}

/** Build a policy chip from the sectoral-policy registry (acronym, type, next milestone). */
export function policyChipFromId(policyId: string): LoopPolicyChip | null {
  const p: SectorPolicy | undefined = SECTOR_POLICIES.find((x) => x.id === policyId);
  if (!p) return null;
  const nowYear = new Date().getFullYear();
  const next = [...p.keyMilestones].sort((a, b) => a.year - b.year).find((m) => m.year >= nowYear);
  return {
    id: p.id,
    name: p.name,
    acronym: p.acronym,
    instrumentType: p.instrumentType,
    nextMilestone: next,
  };
}

/** Build a benchmark chip from the Policy Gap registry. */
export function benchmarkChipFromId(gapId: string): LoopBenchmarkChip | null {
  const g = POLICY_GAP_INDICATORS.find((x) => x.id === gapId);
  if (!g) return null;
  return {
    code: g.code,
    title: g.title,
    unit: g.unit,
    targets: g.benchmarks.map((b) => ({ year: b.year, value: b.value, label: b.label })),
  };
}

/** Options for the "add policy" picker — every policy in the registry. */
export function policyOptions(): { id: string; label: string }[] {
  return SECTOR_POLICIES.map((p) => ({
    id: p.id,
    label: p.acronym ? `${p.acronym} — ${p.name}` : p.name,
  }));
}

/** Options for the "add benchmark" picker — every Policy Gap series. */
export function benchmarkOptions(): { id: string; label: string }[] {
  return POLICY_GAP_INDICATORS.map((g) => ({ id: g.id, label: `${g.code} — ${g.title}` }));
}

function mapSector(
  board: PolicyLoopBoard,
  key: string,
  fn: (s: PolicyLoopSector) => PolicyLoopSector,
): PolicyLoopBoard {
  return { ...board, sectors: board.sectors.map((s) => (s.key === key ? fn(s) : s)) };
}

// ── Sector level ─────────────────────────────────────────────────────────────

export function updateSector(
  board: PolicyLoopBoard,
  key: string,
  patch: Partial<Pick<PolicyLoopSector, 'label' | 'color' | 'blurb' | 'adaptationGapNote'>>,
): PolicyLoopBoard {
  return mapSector(board, key, (s) => ({ ...s, ...patch }));
}

export function deleteSector(board: PolicyLoopBoard, key: string): PolicyLoopBoard {
  return { ...board, sectors: board.sectors.filter((s) => s.key !== key) };
}

export function addSector(board: PolicyLoopBoard): PolicyLoopBoard {
  const sector: PolicyLoopSector = {
    key: uid('sector'),
    label: 'New sector loop',
    color: '#3D6E8C',
    blurb: 'Describe this sector’s loop',
    corridor: [],
    policies: [],
    mitigation: [],
    adaptation: [],
    observed: [],
    ratchet: [],
  };
  return { ...board, sectors: [...board.sectors, sector] };
}

// ── Indicator chips (delivery + observed) ────────────────────────────────────

export function addChip(
  board: PolicyLoopBoard,
  key: string,
  lane: LoopLane,
  track: LoopTrack,
  ind: Indicator,
): PolicyLoopBoard {
  const chip = chipFromIndicator(ind, track);
  return mapSector(board, key, (s) => {
    if (lane === 'mitigation') return { ...s, mitigation: [...s.mitigation, chip] };
    if (lane === 'adaptation') return { ...s, adaptation: [...s.adaptation, chip] };
    return { ...s, observed: [...s.observed, chip] };
  });
}

export function deleteChip(board: PolicyLoopBoard, key: string, refId: string): PolicyLoopBoard {
  return mapSector(board, key, (s) => ({
    ...s,
    mitigation: s.mitigation.filter((c) => c.refId !== refId),
    adaptation: s.adaptation.filter((c) => c.refId !== refId),
    observed: s.observed.filter((c) => c.refId !== refId),
  }));
}

export function updateChip(
  board: PolicyLoopBoard,
  key: string,
  refId: string,
  patch: Partial<Pick<LoopIndicatorChip, 'label' | 'track'>>,
): PolicyLoopBoard {
  const apply = (c: LoopIndicatorChip) => (c.refId === refId ? { ...c, ...patch } : c);
  return mapSector(board, key, (s) => ({
    ...s,
    mitigation: s.mitigation.map(apply),
    adaptation: s.adaptation.map(apply),
    observed: s.observed.map(apply),
  }));
}

// ── Policy instruments ───────────────────────────────────────────────────────

export function addPolicy(board: PolicyLoopBoard, key: string, policyId: string): PolicyLoopBoard {
  const chip = policyChipFromId(policyId);
  if (!chip) return board;
  return mapSector(board, key, (s) =>
    s.policies.some((p) => p.id === chip.id) ? s : { ...s, policies: [...s.policies, chip] },
  );
}

export function deletePolicy(board: PolicyLoopBoard, key: string, policyId: string): PolicyLoopBoard {
  return mapSector(board, key, (s) => ({
    ...s,
    policies: s.policies.filter((p) => p.id !== policyId),
  }));
}

// ── Scenario benchmarks ──────────────────────────────────────────────────────

export function addBenchmark(board: PolicyLoopBoard, key: string, gapId: string): PolicyLoopBoard {
  const chip = benchmarkChipFromId(gapId);
  if (!chip) return board;
  return mapSector(board, key, (s) =>
    s.corridor.some((c) => c.code === chip.code) ? s : { ...s, corridor: [...s.corridor, chip] },
  );
}

export function deleteBenchmark(board: PolicyLoopBoard, key: string, code: string): PolicyLoopBoard {
  return mapSector(board, key, (s) => ({
    ...s,
    corridor: s.corridor.filter((c) => c.code !== code),
  }));
}

// ── Ratchet mechanisms ───────────────────────────────────────────────────────

export function addRatchet(board: PolicyLoopBoard, key: string): PolicyLoopBoard {
  return mapSector(board, key, (s) => ({ ...s, ratchet: [...s.ratchet, 'New review mechanism'] }));
}

export function updateRatchet(
  board: PolicyLoopBoard,
  key: string,
  index: number,
  value: string,
): PolicyLoopBoard {
  return mapSector(board, key, (s) => ({
    ...s,
    ratchet: s.ratchet.map((m, i) => (i === index ? value : m)),
  }));
}

export function deleteRatchet(board: PolicyLoopBoard, key: string, index: number): PolicyLoopBoard {
  return mapSector(board, key, (s) => ({
    ...s,
    ratchet: s.ratchet.filter((_, i) => i !== index),
  }));
}
