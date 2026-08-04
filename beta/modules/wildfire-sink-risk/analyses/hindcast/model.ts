/**
 * A4 — Hindcast attribution: how much of the observed sink decline is fire?
 *
 * The EU land sink fell from ~268 MtCO2e (2016-18 average) to ~198 Mt in the
 * 2023 inventory. The parent module projects fire FORWARD; this analysis runs
 * the identical cohort machinery BACKWARD over the EFFIS record (2006-2025,
 * EU-wide weekly-statistics product) and asks what share of that observed
 * decline excess fire can explain.
 *
 * Method: the cohort model is run once over the actual burnt-area series and
 * once over a counterfactual held at the series' own 2006-2024 mean
 * (~355,000 ha/yr in this product), both accumulating cohorts from 2006. The
 * difference — the "fire drag" — is the sink loss attributable to fire being
 * above (or below: quiet years are negative) its long-run load in and before
 * that year. The drag change between the 2016-18 reference window and 2023 is
 * then compared with the observed ~70 Mt sink decline.
 *
 * Two deliberate honesty features:
 *
 *   • The result CUTS AGAINST the module's dramatic framing: at default
 *     parameters fire explains only a small share of the decline to date.
 *     Harvest rates, stand ageing, and drought/beetle mortality dominate.
 *     Publishing that number is what makes the forward-looking pages
 *     credible — the module does not need fire to have caused the past
 *     decline, and says so.
 *
 *   • The reference window 2016-18 CONTAINS the 2017 fire year (988,524 ha
 *     in this product — Portugal's disaster year), which inflates reference
 *     drag and so deflates the attribution. The sensitivity excluding 2017
 *     from the reference is therefore reported alongside, and roughly
 *     septuples the share. The honest answer is a range.
 *
 * Product note: this analysis uses the EFFIS weekly-statistics product
 * (week-52 cumulative) throughout, whose 2006-24 mean (~355k ha) is lower
 * than the ~550k ha long-run figure derived from JRC reports that the parent
 * module uses. Within-product consistency is what matters for a differenced
 * hindcast; the two products are never mixed. See `../data.ts`.
 */

import { DEFAULTS, SINK_HISTORY, cohortImpact, type Params } from '../../model';
import { EU_ANNUAL, LAST_COMPLETE_YEAR } from '../data';

export const HINDCAST_START = 2006;

/** The product's own long-run mean, 2006-2024, ha/yr. */
export const PRODUCT_MEAN = (() => {
  const rows = EU_ANNUAL.filter(([y]) => y >= 2006 && y <= 2024);
  return rows.reduce((s, [, ba]) => s + ba, 0) / rows.length;
})();

/** Parameter set for the upper-bound band (hotter fires, slower recovery). */
export const SEVERE: Params = { ...DEFAULTS, fuelLoad: 55, recoveryYears: 35, decompShare: 0.35 };

function areaActual(year: number): number {
  const row = EU_ANNUAL.find(([y]) => y === year);
  return row ? row[1] : PRODUCT_MEAN;
}

/** Fire drag on the sink in `year`, MtCO2e — actual minus counterfactual-at-mean. */
export function drag(year: number, p: Params = DEFAULTS): number {
  const actual = cohortImpact(year, areaActual, p, HINDCAST_START);
  const counter = cohortImpact(year, () => PRODUCT_MEAN, p, HINDCAST_START);
  return actual.total - counter.total;
}

export type DragRow = { year: number; ba: number; drag: number; dragSevere: number };

export function dragSeries(): DragRow[] {
  return EU_ANNUAL.filter(([y]) => y <= LAST_COMPLETE_YEAR).map(([year, ba]) => ({
    year,
    ba,
    drag: drag(year),
    dragSevere: drag(year, SEVERE),
  }));
}

/** Observed sink decline being attributed, MtCO2e: 2016-18 avg → 2023 inventory. */
export const OBSERVED_DECLINE =
  SINK_HISTORY.find((s) => s.label === '2016-18 average')!.mt - SINK_HISTORY.find((s) => s.label === 'Inventory')!.mt;

export type Attribution = {
  /** Fire drag averaged over the 2016-18 reference window, Mt. */
  refDrag: number;
  /** Fire drag in 2023, Mt. */
  drag2023: number;
  /** Change in drag between the two — fire's contribution to the decline, Mt. */
  deltaMt: number;
  /** As a share of the observed ~70 Mt decline, %. */
  sharePct: number;
  /** Same, with 2017 excluded from the reference window, Mt and %. */
  deltaExcl2017Mt: number;
  shareExcl2017Pct: number;
  /** Fire drag in 2025 — the record year — for the "where this is going" point. */
  drag2025: number;
};

export function attribution(p: Params = DEFAULTS): Attribution {
  const ref = (drag(2016, p) + drag(2017, p) + drag(2018, p)) / 3;
  const refX = (drag(2016, p) + drag(2018, p)) / 2;
  const d23 = drag(2023, p);
  return {
    refDrag: ref,
    drag2023: d23,
    deltaMt: d23 - ref,
    sharePct: ((d23 - ref) / OBSERVED_DECLINE) * 100,
    deltaExcl2017Mt: d23 - refX,
    shareExcl2017Pct: ((d23 - refX) / OBSERVED_DECLINE) * 100,
    drag2025: drag(2025, p),
  };
}

export type A4Summary = {
  sharePct: number;
  shareExcl2017Pct: number;
  shareSeverePct: number;
  drag2025: number;
  drag2025Severe: number;
  observedDecline: number;
};

export function summary(): A4Summary {
  const a = attribution();
  const aSev = attribution(SEVERE);
  return {
    sharePct: a.sharePct,
    shareExcl2017Pct: a.shareExcl2017Pct,
    shareSeverePct: aSev.shareExcl2017Pct,
    drag2025: a.drag2025,
    drag2025Severe: aSev.drag2025,
    observedDecline: OBSERVED_DECLINE,
  };
}
