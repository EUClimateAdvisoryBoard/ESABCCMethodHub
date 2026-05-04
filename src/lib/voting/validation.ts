/**
 * Server-side ballot validation. Mirrors the constraints the ballot UI
 * enforces so we never trust the client.
 */

import type { VoteRecord } from './types';

export function validateBallotResponses(
  vote: VoteRecord,
  responses: Record<string, unknown>,
): { ok: true; cleaned: Record<string, number | boolean> } | { ok: false; error: string } {
  if (typeof responses !== 'object' || responses === null) {
    return { ok: false, error: 'Responses must be an object' };
  }
  const optionIds = new Set(vote.options.map((o) => o.id));
  const cleaned: Record<string, number | boolean> = {};

  for (const [k, v] of Object.entries(responses)) {
    if (!optionIds.has(k)) {
      return { ok: false, error: `Unknown option: ${k}` };
    }
    cleaned[k] = v as number | boolean;
  }

  switch (vote.votingSystem) {
    case 'priority_ranking': {
      const allowed = new Set((vote.config.scores ?? []).map(Number));
      const counts: Record<string, number> = {};
      for (const [optId, val] of Object.entries(cleaned)) {
        if (typeof val !== 'number' || !Number.isInteger(val) || !allowed.has(val)) {
          return { ok: false, error: `Score for "${optId}" must be one of ${[...allowed].join(', ')}` };
        }
        counts[String(val)] = (counts[String(val)] ?? 0) + 1;
      }
      const caps = vote.config.maxPerScore ?? {};
      for (const [score, cap] of Object.entries(caps)) {
        if (cap == null) continue;
        if ((counts[score] ?? 0) > cap) {
          return { ok: false, error: `At most ${cap} option(s) may receive score ${score}` };
        }
      }
      if (vote.config.requireAllScored) {
        for (const opt of vote.options) {
          if (!(opt.id in cleaned)) {
            return { ok: false, error: `Every option must be scored — missing "${opt.label}"` };
          }
        }
      }
      return { ok: true, cleaned };
    }

    case 'single_choice': {
      const picked = Object.entries(cleaned).filter(([, v]) => v === true);
      if (picked.length !== 1) {
        return { ok: false, error: 'Pick exactly one option' };
      }
      return { ok: true, cleaned: Object.fromEntries(picked) as Record<string, boolean> };
    }

    case 'multi_choice': {
      const picked = Object.entries(cleaned).filter(([, v]) => v === true);
      const max = vote.config.maxSelections ?? vote.options.length;
      if (picked.length === 0) {
        return { ok: false, error: 'Pick at least one option' };
      }
      if (picked.length > max) {
        return { ok: false, error: `Pick at most ${max} option(s)` };
      }
      return { ok: true, cleaned: Object.fromEntries(picked) as Record<string, boolean> };
    }

    case 'approval': {
      for (const [, v] of Object.entries(cleaned)) {
        if (typeof v !== 'boolean') return { ok: false, error: 'Each option must be approved or rejected' };
      }
      return { ok: true, cleaned };
    }

    case 'star': {
      const max = vote.config.maxStars ?? 5;
      for (const [optId, v] of Object.entries(cleaned)) {
        if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > max) {
          return { ok: false, error: `Rating for "${optId}" must be 1..${max}` };
        }
      }
      return { ok: true, cleaned };
    }
  }
}
