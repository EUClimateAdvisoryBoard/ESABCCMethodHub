/**
 * A2 — The paper wedge: the natural-disturbance mechanism as a policy
 * inconsistency.
 *
 * The LULUCF Regulation (2018/841 as amended by 2023/839) contains machinery
 * that lets fire emissions leave the COMPLIANCE ledger while staying in the
 * ATMOSPHERE's ledger:
 *
 *   • Annex VI: a Member State may exclude disturbance emissions above a
 *     "background level" computed from 2001-2020, with a 95%-probability
 *     margin. Salvage-logging and prescribed-burning emissions are explicitly
 *     NOT excludable (Annex VI point 4, as amended).
 *   • Article 10: the exclusion route for 2021-2025 (afforested land and
 *     managed forest land).
 *   • Article 13b: for 2026-2030, a "land use mechanism" of up to
 *     178 MtCO2e in the Union Registry — compensation for Member States that
 *     miss their Annex IIa target, conditional on (a) vulnerability-reduction
 *     measures in the NECP, (b) exhausting Article 12 flexibilities, and —
 *     crucially — (c) THE UNION-WIDE 310 Mt TARGET STILL BEING MET in 2030.
 *     When assessing (c), the Commission may count up to 30% (max 20 MtCO2e)
 *     of unused 2021-25 surplus, if Member States submit natural-disturbance
 *     evidence (Article 13b(3), second subparagraph).
 *
 * All of the above is quoted from the Official Journal text (OJ L 107,
 * 21.4.2023), fetched and checked for this analysis.
 *
 * Two findings fall straight out of the module's arithmetic:
 *
 * 1. THE WEDGE. Only the *emission* terms of a fire year (combustion +
 *    later decomposition) are even conceptually excludable as disturbance
 *    emissions. The foregone-removals term — the sink the burnt land fails to
 *    deliver while it recovers, the term that compounds — is not an emission
 *    and has no exclusion route. So the accounts can be relieved of the
 *    visible part of the fire and still silently keep losing the invisible
 *    part. Both parts are in the atmosphere either way.
 *
 * 2. THE VOID. Condition (c) makes Article 13b an insurance policy that pays
 *    out only if the storm misses: on the module's reference sink path (which
 *    reaches 310 Mt in 2030 exactly when fire behaves), ANY excess fire
 *    pushes the Union below 310 and the mechanism starts depending on the
 *    20 Mt evidence carve-in; once the 2030 excess loss passes ~20 Mt the
 *    mechanism is void outright — at growth rates well inside the module's
 *    plausible range.
 *
 * Caveat, stated prominently: the reference path assumes the Union would hit
 * 310 Mt in 2030 absent excess fire. If other sink drivers overachieve, the
 * mechanism survives more fire; if (as 2023-24 inventories suggest) they
 * underachieve, it voids sooner. The threshold is a property of the module's
 * reference path, not a prediction.
 */

import {
  DEFAULTS,
  SINK_TARGET_2030,
  adjustedSink,
  excessImpact,
  type Params,
} from '../../model';

/** Article 13b(1): size of the 2026-30 land use mechanism, MtCO2e. */
export const MECHANISM_CAP_MT = 178;

/** Article 13b(3): max unused 2021-25 surplus countable toward condition (c), MtCO2e. */
export const SURPLUS_CARVE_MT = 20;

export type Wedge = {
  growthPct: number;
  /** Cumulative 2026-30 excess emission terms (combustion + decomposition), Mt.
   *  The only part with an Annex VI exclusion / Art 13b compensation route. */
  compensableMt: number;
  /** Cumulative 2026-30 excess foregone removals, Mt — no exclusion route. */
  neverCompensableMt: number;
  /** Total excess sink loss in the year 2030 alone, Mt. */
  excess2030Mt: number;
  /** Modelled Union sink in 2030 after fire, Mt. */
  sink2030Mt: number;
  /** How far below the 310 Mt Union target that is, Mt (0 if on target). */
  unionShortfallMt: number;
  /** Article 13b availability on the reference path. */
  mechanism: 'available' | 'evidence-dependent' | 'void';
  /** Compensable amount as a share of the 178 Mt mechanism, %. */
  shareOfMechanismPct: number;
};

function withGrowth(growthPct: number): Params {
  return { ...DEFAULTS, mode: 'growth', growthPct };
}

export function wedge(growthPct: number): Wedge {
  const p = withGrowth(growthPct);
  let comp = 0;
  let never = 0;
  for (let y = 2026; y <= 2030; y++) {
    const e = excessImpact(y, p);
    comp += e.combustion + e.decomposition;
    never += e.foregone;
  }
  const excess2030 = excessImpact(2030, p).total;
  const sink2030 = adjustedSink(2030, p);
  const shortfall = Math.max(0, SINK_TARGET_2030 - sink2030);
  return {
    growthPct,
    compensableMt: comp,
    neverCompensableMt: never,
    excess2030Mt: excess2030,
    sink2030Mt: sink2030,
    unionShortfallMt: shortfall,
    mechanism: shortfall <= 0.01 ? 'available' : shortfall <= SURPLUS_CARVE_MT ? 'evidence-dependent' : 'void',
    shareOfMechanismPct: (comp / MECHANISM_CAP_MT) * 100,
  };
}

/** Growth rate above which the 2030 Union shortfall exceeds the 20 Mt
 *  carve-in and Article 13b is void on the reference path; null if never
 *  inside 0-15%/yr. */
export function voidThresholdPct(): number | null {
  for (let g = 0; g <= 15; g += 0.1) {
    if (wedge(g).unionShortfallMt > SURPLUS_CARVE_MT) return Math.round(g * 10) / 10;
  }
  return null;
}

export type A2Summary = {
  compensableAt5: number;
  neverCompensableAt5: number;
  shortfallAt5: number;
  mechanismAt5: Wedge['mechanism'];
  voidThreshold: number | null;
};

export function summary(): A2Summary {
  const w = wedge(5);
  return {
    compensableAt5: w.compensableMt,
    neverCompensableAt5: w.neverCompensableMt,
    shortfallAt5: w.unionShortfallMt,
    mechanismAt5: w.mechanism,
    voidThreshold: voidThresholdPct(),
  };
}

/** The fine print of the mechanism, each point verified against the OJ text. */
export const FINE_PRINT: { title: string; body: string; ref: string }[] = [
  {
    title: 'Up to 178 Mt of accounting relief',
    body:
      'The 2026-30 land use mechanism is sized at up to 178 MtCO2e in the Union Registry — more than half a year of the entire planned 2030 sink. It relieves compliance, not the atmosphere: no tonne of it is a removal.',
    ref: 'Art. 13b(1)',
  },
  {
    title: 'Only if the Union target is met anyway',
    body:
      'Compensation requires that the EU-wide difference to the 310 Mt target "is negative, in 2030" — i.e. the Union target is achieved. Fire big enough to break the Union target switches the mechanism off exactly when it would be needed.',
    ref: 'Art. 13b(3)(c)',
  },
  {
    title: 'A 20 Mt evidence valve',
    body:
      'When assessing the Union condition, the Commission may count up to 30% — capped at 20 MtCO2e — of unused 2021-25 surplus, but only where Member States submit natural-disturbance evidence under Annex VI. That is the entire buffer between "available" and "void".',
    ref: 'Art. 13b(3), 2nd subpara.',
  },
  {
    title: 'Background level with a 95% margin',
    body:
      'Exclusion applies only to emissions above a background level computed from 2001-2020 disturbance emissions, plus a margin equal to a 95% probability level. The "normal" fire load stays in the accounts — which is the same logic as this module\'s baseline subtraction.',
    ref: 'Annex VI(2)-(3)',
  },
  {
    title: 'Salvage logging cannot be excluded',
    body:
      'Emissions from harvesting and salvage logging on disturbed land, and from prescribed burning, are explicitly not excludable. A post-fire salvage harvest re-enters the accounts in full.',
    ref: 'Annex VI(4)',
  },
  {
    title: 'Vulnerability reduction is a precondition',
    body:
      'A Member State must have NECP measures to conserve or enhance sinks and to reduce the vulnerability of land to natural disturbances, and must have exhausted its Article 12 flexibilities first. Prevention is a legal gate to the flexibility — but nothing in the Regulation funds it.',
    ref: 'Art. 13b(3)(a)-(b)',
  },
];
