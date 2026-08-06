/**
 * Critical Raw Materials × 2040 Pathway Stress Test (beta module M · 48) —
 * deterministic computation layer.
 *
 * Everything in this file is arithmetic on the compiled records in
 * `data.generated.ts`; there is no fitted or stochastic element anywhere.
 *
 *   DEMAND.  Per material and year (2030, 2040):
 *     demand [kt/yr] = Σ over technologies of
 *       deployment rate × material-intensity coefficient × thrifting factor.
 *     Coefficients are RANGES (lo–hi); the model propagates lo and hi
 *     separately and never averages them. The thrifting factor is
 *     (1 − r/100)^(year − 2024) for a user-chosen intensity-decline rate r
 *     in %/yr — a slider, not a baked-in assumption. Units: technologies
 *     deployed in GW/yr carry coefficients in t/MW (so kt = GW·t/MW);
 *     technologies deployed in GWh/yr carry t/GWh (so kt = GWh·t/GWh/1000).
 *
 *   SUPPLY.  Two deterministic counterfactuals, both expressed as shares of
 *   the material's own EU consumption, so they scale with whatever demand
 *   the coefficients produce:
 *     · at CURRENT shares — domestically-secured share = current EU
 *       extraction share + current EU recycling share (processing is
 *       deliberately NOT counted as domestic origin, because EU processing
 *       capacity can run on imported ore — stated in the UI);
 *     · at CRMA BENCHMARKS MET — extraction lifted to ≥ 10 % and recycling
 *       to ≥ 25 % (Reg. (EU) 2024/1252, Art. 5(1)(a)), keeping the current
 *       value where it already exceeds the benchmark; any single third
 *       country capped at 65 % of consumption (Art. 5(1)(b)).
 *
 *   EXPOSURE.  "Months of deployment at risk if the top supplier restricts
 *   exports for a year" = 12 × (top supplier's share of EU supply of the
 *   material). This assumes zero stockpiles, zero short-run substitution and
 *   pro-rata pass-through of the material shortfall to deployment. It is an
 *   EXPOSURE MEASURE — a deterministic what-if magnitude — and explicitly
 *   NOT a probability or a forecast that any supplier will restrict exports.
 *   Top-supplier shares arrive on three bases (share of EU supply, share of
 *   EU imports, share of global supply at a stage); the conversion to a
 *   share of EU supply is made explicit in `topSupplierShareOfSupply` and
 *   the global-supply basis is flagged as a proxy in the data records.
 *
 * AI-compiled — pending Secretariat verification. Compiled 2026-08.
 */

import {
  MATERIALS,
  TECH_DEPLOYMENT,
  type Material,
  type Range,
  type TechKey,
} from './data.generated';

export type StressYear = 2030 | 2040;

const BASE_YEAR = 2024;

/* ------------------------------------------------------------------ demand */

/** Intensity-decline (thrifting) factor for a given year at r %/yr. */
export function thriftFactor(ratePctPerYr: number, year: StressYear): number {
  return Math.pow(1 - ratePctPerYr / 100, year - BASE_YEAR);
}

function deploymentRate(tech: TechKey, year: StressYear): { rate: number; unit: 'GW/yr' | 'GWh/yr' } {
  const t = TECH_DEPLOYMENT.find((d) => d.key === tech);
  if (!t) throw new Error(`Unknown technology key: ${tech}`); // loud, not silent
  return { rate: year === 2030 ? t.rate2030 : t.rate2040, unit: t.unit };
}

/**
 * EU demand for one material in one year, kt/yr, as a lo–hi range.
 * Lo and hi are propagated separately; nothing is averaged.
 */
export function demandRange(material: Material, year: StressYear, thriftPctPerYr: number): Range {
  const f = thriftFactor(thriftPctPerYr, year);
  let lo = 0;
  let hi = 0;
  for (const c of material.coefficients) {
    const { rate, unit } = deploymentRate(c.tech, year);
    // GW/yr × t/MW → kt/yr;  GWh/yr × t/GWh ÷ 1000 → kt/yr.
    const scale = unit === 'GW/yr' ? 1 : 1 / 1000;
    lo += rate * c.range.lo * scale * f;
    hi += rate * c.range.hi * scale * f;
  }
  return { lo, hi };
}

/* ------------------------------------------------------------------ supply */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Domestically-secured share of consumption at CURRENT shares:
 * extraction + recycling (null → 0, surfaced as "n/a" in the UI).
 * Processing is excluded — it can run on imported ore.
 */
export function domesticShareCurrent(m: Material): number {
  return clamp01(((m.shares.extraction ?? 0) + (m.shares.recycling ?? 0)) / 100);
}

/**
 * Domestically-secured share with the CRMA 2030 benchmarks met:
 * extraction ≥ 10 %, recycling ≥ 25 % (current value kept where higher).
 */
export function domesticShareBenchmark(m: Material): number {
  const ext = Math.max(m.shares.extraction ?? 0, 10);
  const rec = Math.max(m.shares.recycling ?? 0, 25);
  return clamp01((ext + rec) / 100);
}

/** demand × share, applied to both ends of the range. */
export function scaleRange(r: Range, share: number): Range {
  return { lo: r.lo * share, hi: r.hi * share };
}

/** Import requirement = demand × (1 − domestic share), range-preserving. */
export function importRange(r: Range, domesticShare: number): Range {
  return scaleRange(r, 1 - domesticShare);
}

/* ---------------------------------------------------------------- exposure */

/**
 * Top supplier's share of EU SUPPLY of the material, converted from the
 * basis on which the figure was compiled:
 *   'eu-supply'     — already a share of EU supply; used as-is.
 *   'eu-imports'    — share of imports × current import share of supply.
 *   'global-supply' — share of global supply at the stated stage, used as a
 *                     PROXY for the share of EU imports (flagged uncertain
 *                     in the data); × current import share of supply.
 */
export function topSupplierShareOfSupply(m: Material): number {
  const s = m.topSupplier.sharePct / 100;
  const importShare = 1 - domesticShareCurrent(m);
  switch (m.topSupplier.shareBasis) {
    case 'eu-supply':
      return clamp01(s);
    case 'eu-imports':
    case 'global-supply':
      return clamp01(s * importShare);
  }
}

/** The same figure re-expressed as a share of EU imports (for the benchmark case). */
export function topSupplierShareOfImports(m: Material): number {
  const importShare = 1 - domesticShareCurrent(m);
  if (importShare <= 0) return 0;
  const s = m.topSupplier.sharePct / 100;
  switch (m.topSupplier.shareBasis) {
    case 'eu-supply':
      return clamp01(s / importShare);
    case 'eu-imports':
    case 'global-supply':
      return clamp01(s);
  }
}

/**
 * Months of deployment at risk if the top supplier restricts exports for a
 * year, at CURRENT shares. Exposure measure, not a probability: assumes no
 * stockpiles, no short-run substitution, pro-rata pass-through to deployment.
 */
export function monthsAtRiskCurrent(m: Material): number {
  return 12 * topSupplierShareOfSupply(m);
}

/**
 * The same exposure with the CRMA benchmarks met: domestic share lifted to
 * the benchmark level, the top supplier keeping its current share of the
 * (smaller) import requirement, and the Art. 5(1)(b) cap binding — no single
 * third country above 65 % of consumption.
 */
export function monthsAtRiskBenchmark(m: Material): number {
  const importShareBench = 1 - domesticShareBenchmark(m);
  const supplierShare = Math.min(topSupplierShareOfImports(m) * importShareBench, 0.65);
  return 12 * supplierShare;
}

/* ----------------------------------------------------- benchmark distances */

export type BenchmarkDistance = {
  /** Current value in % of consumption, or null where not meaningfully tracked. */
  current: number | null;
  /** CRMA 2030 benchmark in % of consumption. */
  target: number;
  /** target − current (≥ 0 means shortfall), or null when current is null. */
  gapPts: number | null;
  met: boolean | null;
};

function distance(current: number | null, target: number): BenchmarkDistance {
  if (current === null) return { current: null, target, gapPts: null, met: null };
  return { current, target, gapPts: Math.max(0, target - current), met: current >= target };
}

/** Distance to each CRMA Art. 5(1) benchmark for one material. */
export function benchmarkDistances(m: Material): {
  extraction: BenchmarkDistance;
  processing: BenchmarkDistance;
  recycling: BenchmarkDistance;
  /** For the 65 % cap the comparison runs the other way: supply share vs cap. */
  singleSupplier: { current: number; cap: number; exceeded: boolean };
} {
  const top = topSupplierShareOfSupply(m) * 100;
  return {
    extraction: distance(m.shares.extraction, 10),
    processing: distance(m.shares.processing, 40),
    recycling: distance(m.shares.recycling, 25),
    singleSupplier: { current: top, cap: 65, exceeded: top > 65 },
  };
}

/* ------------------------------------------------------------- aggregates */

export type MaterialStress = {
  material: Material;
  demand2030: Range;
  demand2040: Range;
  domesticCurrent: number;
  domesticBenchmark: number;
  importsCurrent2030: Range;
  importsBenchmark2030: Range;
  importsCurrent2040: Range;
  importsBenchmark2040: Range;
  monthsCurrent: number;
  monthsBenchmark: number;
};

/** The full stress table for all materials at a given thrifting rate. */
export function stressTable(thriftPctPerYr: number): MaterialStress[] {
  return MATERIALS.map((material) => {
    const demand2030 = demandRange(material, 2030, thriftPctPerYr);
    const demand2040 = demandRange(material, 2040, thriftPctPerYr);
    const domesticCurrent = domesticShareCurrent(material);
    const domesticBenchmark = domesticShareBenchmark(material);
    return {
      material,
      demand2030,
      demand2040,
      domesticCurrent,
      domesticBenchmark,
      importsCurrent2030: importRange(demand2030, domesticCurrent),
      importsBenchmark2030: importRange(demand2030, domesticBenchmark),
      importsCurrent2040: importRange(demand2040, domesticCurrent),
      importsBenchmark2040: importRange(demand2040, domesticBenchmark),
      monthsCurrent: monthsAtRiskCurrent(material),
      monthsBenchmark: monthsAtRiskBenchmark(material),
    };
  });
}
