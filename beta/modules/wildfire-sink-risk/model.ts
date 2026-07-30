/**
 * Wildfires & the Land Sink — model core.
 *
 * A transparent back-of-the-envelope model that asks one question:
 *
 *   If EU wildfires keep burning at the rate of the last five years — or worse —
 *   how much of the EU land carbon sink is lost, and what does that do to the
 *   feasibility of the 2040 (-90%) and 2050 (net-zero) targets?
 *
 * Every number below is an explicit, sourced, adjustable assumption. Nothing
 * here is a projection in the scientific sense: it is an order-of-magnitude
 * reconstruction designed to be argued with. The sliders exist because the
 * honest answer to "how bad is this?" spans a factor of four, and the point of
 * the module is to show *where* that spread comes from.
 *
 * ── THE CHAIN OF REASONING ─────────────────────────────────────────────────
 *
 *  1. BURNT AREA. EFFIS mapped burnt area for the EU-27, 2021-2025. Five years,
 *     one of them (2025) an all-time record. We extrapolate that forward under
 *     three modes (flat / compound growth / linear trend) — see `Params`.
 *
 *  2. CARBON. A burnt hectare costs the inventory three separate things:
 *       (a) COMBUSTION — carbon in the vegetation that goes up the smoke column
 *           in the fire itself. Calibrated to CAMS: the EU's ~1.08 Mha in 2025
 *           produced ~12.5 MtC ≈ 45.8 MtCO2, i.e. ≈ 42 tCO2/ha.
 *       (b) DECOMPOSITION — fire-killed biomass that did not burn, rotting over
 *           the following decade and releasing CO2 slowly.
 *       (c) FOREGONE REMOVALS — the sink that the burnt stand *would have*
 *           delivered while it regrows. This is the term everyone forgets and
 *           the one that compounds: each year's fires leave a cohort of land
 *           that under-performs for decades.
 *
 *  3. THE BASELINE SUBTRACTION. This is the most important methodological
 *     choice in the module, and the one that keeps it honest. The EU's LULUCF
 *     inventory and its projections ALREADY contain a normal amount of fire.
 *     Counting the whole fire impact against the target would double-count.
 *     So we compute the impact of the *projected* fire path and subtract the
 *     impact of a *counterfactual* path in which burnt area stays at its
 *     long-run 2006-2024 average. What the targets feel is only the excess.
 *
 *  4. TARGET FEASIBILITY. The 2040 target is -90% net vs 1990. Net emissions =
 *     gross emissions - land sink. So a sink that under-delivers by X Mt means
 *     the gross budget for every other sector shrinks by exactly X Mt. That is
 *     the "other sectors must catch up" arithmetic, and it is not a metaphor:
 *     it is subtraction.
 *
 * ── WHAT THIS MODEL DELIBERATELY DOES NOT DO ───────────────────────────────
 *   • It does not model fire-climate feedbacks, drought, or bark beetle
 *     interactions. The growth rate is a dial, not a projection.
 *   • It does not model soil carbon loss or peat fires (which would make the
 *     numbers worse, especially for Nordic and Baltic land).
 *   • It does not model adaptation, fuel management, or improved suppression
 *     (which would make them better). Use the growth-rate slider for both.
 *   • It treats the EU as one pool. Real fire risk is overwhelmingly Iberian
 *     and Mediterranean, and so is the sink that is exposed to it.
 */

/* ═══════════════════════════════════════════════════════ 1. OBSERVED DATA */

/**
 * EFFIS mapped burnt area, EU-27, hectares.
 *
 * Source: Copernicus EMS / EFFIS (forest-fire.emergency.copernicus.eu) and the
 * JRC "Forest Fires in Europe, Middle East and North Africa" annual reports.
 *
 * Note 2025: the JRC reported 1,079,538 ha across 7,783 fires in 25 of 27
 * Member States — the highest EU-27 burnt area in the EFFIS record (from 2006)
 * and close to double the 2006-2024 average. 39% of it (424,023 ha) fell inside
 * Natura 2000 sites, which is precisely the land the sink strategy relies on.
 */
export const BURNT_AREA: { year: number; ha: number; note?: string }[] = [
  { year: 2021, ha: 449_342, note: 'A quiet year by recent standards.' },
  { year: 2022, ha: 837_212, note: 'Record at the time — fires in 26 of 27 Member States.' },
  { year: 2023, ha: 504_002, note: 'Includes Alexandroupolis (Greece), ~96,000 ha — the largest single fire ever recorded in the EU.' },
  { year: 2024, ha: 419_298, note: 'The mildest of the five years; roughly 80% of 2023.' },
  { year: 2025, ha: 1_079_538, note: 'All-time EFFIS record. 22 very large fires in Iberia in August burnt 460,585 ha — 43% of the EU total — in under two weeks.' },
];

export const FIRST_YEAR = BURNT_AREA[0].year;   // 2021
export const LAST_OBS_YEAR = BURNT_AREA[BURNT_AREA.length - 1].year; // 2025

/** Mean burnt area over the observed five years, ha/yr. */
export const FIVE_YEAR_MEAN =
  BURNT_AREA.reduce((s, d) => s + d.ha, 0) / BURNT_AREA.length;

/**
 * Long-run EFFIS average burnt area, 2006-2024, ha/yr.
 *
 * Derived, not published directly: the JRC described 2025 (1,079,538 ha) as
 * "nearly double the 2006-2024 average", which puts that average at ~550,000 ha.
 * This is the fire load that the LULUCF inventory trend and the Member State
 * projections implicitly already contain — see the baseline subtraction above.
 */
export const LONG_RUN_MEAN = 550_000;

/**
 * Ordinary-least-squares slope through the five observed years, ha/yr².
 * Five noisy points, one of them a record — this is a very weak trend estimate
 * and is offered as a stress case, not a best guess. It works out at roughly
 * +84,000 ha per year, i.e. about +13% of the five-year mean annually.
 */
export const OLS = (() => {
  const n = BURNT_AREA.length;
  const mx = BURNT_AREA.reduce((s, d) => s + d.year, 0) / n;
  const my = FIVE_YEAR_MEAN;
  let num = 0;
  let den = 0;
  for (const d of BURNT_AREA) {
    num += (d.year - mx) * (d.ha - my);
    den += (d.year - mx) ** 2;
  }
  return { slope: num / den, meanYear: mx, meanHa: my };
})();

/* ══════════════════════════════════════════════════ 2. POLICY ANCHOR DATA */

/** EU-27 net GHG emissions in 1990, MtCO2e, including LULUCF (EU inventory). */
export const BASE_1990 = 4_649;

/** Observed / estimated EU-27 net LULUCF sink, MtCO2e (positive = removals). */
export const SINK_HISTORY: { year: number; mt: number; label: string }[] = [
  { year: 2017, mt: 268, label: '2016-18 average' },
  { year: 2023, mt: 198, label: 'Inventory' },
  { year: 2024, mt: 212, label: 'Estimate' },
];

/** Legal 2030 LULUCF net-removal target, MtCO2e (Regulation (EU) 2023/839). */
export const SINK_TARGET_2030 = 310;

/**
 * 2040 land-sink assumptions from the Commission's 2040 impact assessment:
 * a low/central/high span of 215 / 317 / 376 MtCO2e. The ESABCC's own advice
 * frames total removals within a 100-400 MtCO2 range.
 */
export const SINK_2040_RANGE = { low: 215, central: 317, high: 376 };

/**
 * Illustrative EU-27 residual gross emissions by sector in 2040 under a -90%
 * pathway, MtCO2e. These are rough shares of the ~780 Mt gross budget used
 * only to give the sink gap a sense of scale — they are NOT a Commission
 * scenario read-out and should not be quoted as one.
 */
export const SECTOR_2040: { sector: string; mt: number; color: string }[] = [
  { sector: 'Agriculture (non-CO₂)', mt: 320, color: '#007B6C' },
  { sector: 'Transport (incl. intl.)', mt: 180, color: '#004B7F' },
  { sector: 'Industry (process + energy)', mt: 150, color: '#B83230' },
  { sector: 'Buildings', mt: 45, color: '#FF9933' },
  { sector: 'Power', mt: 40, color: '#6667AB' },
  { sector: 'Waste + other', mt: 45, color: '#54728C' },
];

/** Average tailpipe CO2 of one EU passenger car, tCO2/yr — for equivalences. */
export const CAR_TCO2_YR = 2.0;

/* ═══════════════════════════════════════════════════════ 3. PARAMETERS */

export type ProjectionMode = 'flat' | 'growth' | 'trend';

export type Params = {
  /* --- burnt area projection --- */
  mode: ProjectionMode;
  /** Anchor burnt area for the projection in the launch year, ha/yr. */
  anchorHa: number;
  /** Compound annual growth in burnt area, %/yr (used by `growth` mode). */
  growthPct: number;
  /** Long-run average already embedded in inventories/projections, ha/yr. */
  embeddedHa: number;

  /* --- carbon --- */
  /** Direct combustion emissions per hectare burnt, tCO2/ha. */
  fuelLoad: number;
  /** Share of burnt area that is forest carrying a durable sink, 0-1. */
  forestShare: number;
  /** Net removals on unburnt productive EU forest land, tCO2/ha/yr. */
  seqRate: number;
  /** Years for a burnt stand to return to its pre-fire removal rate. */
  recoveryYears: number;
  /** Post-fire decomposition, as a share of the combustion emission, 0-1. */
  decompShare: number;
  /** Years over which that decomposition flux is released. */
  decompYears: number;

  /* --- policy --- */
  /** Reference (planned) land sink in 2040, MtCO2e. */
  sink2040: number;
  /** 2040 net reduction target vs 1990, %. */
  target2040Pct: number;
};

export const DEFAULTS: Params = {
  mode: 'growth',
  anchorHa: Math.round(FIVE_YEAR_MEAN),
  growthPct: 2.5,
  embeddedHa: LONG_RUN_MEAN,

  fuelLoad: 42,
  forestShare: 0.5,
  seqRate: 2.5,
  recoveryYears: 20,
  decompShare: 0.25,
  decompYears: 10,

  sink2040: SINK_2040_RANGE.central,
  target2040Pct: 90,
};

/**
 * Named assumption sets. These are the "what if I don't trust your defaults"
 * button — each one is a coherent worldview, not a random perturbation.
 */
export type Preset = {
  id: string;
  label: string;
  blurb: string;
  over: Partial<Params>;
};

export const PRESETS: Preset[] = [
  {
    id: 'central',
    label: 'Central — five-year mean, slow growth',
    blurb:
      'Burnt area settles at the 2021-25 average and creeps up 2.5%/yr with a warming climate. Mid-range fuel loads and a 20-year recovery. This is the module’s default and the most defensible single case.',
    over: {},
  },
  {
    id: 'held',
    label: 'Held — no worsening',
    blurb:
      'Optimistic. Burnt area stays flat at the five-year mean forever: better suppression and fuel management exactly cancel a hotter, drier climate. Even here the sink still loses ground, because the five-year mean is already above the long-run average the inventories assume.',
    over: { mode: 'flat', growthPct: 0 },
  },
  {
    id: 'trend',
    label: 'Trend — the last five years continue',
    blurb:
      'The stress case. The straight line through 2021-25 (about +84,000 ha every year) is simply extended. Five noisy points and a record year make this a weak statistical basis — but it is what the recent record actually says, and it is the case in which the 2040 target visibly breaks.',
    over: { mode: 'trend' },
  },
  {
    id: 'severe',
    label: 'Severe — hotter fires, slower recovery',
    blurb:
      'Same 2025-record starting point, faster growth, heavier fuel loads and a 35-year recovery in fire-degraded Mediterranean stands. Tests what happens if fires get worse rather than merely more frequent.',
    over: {
      mode: 'growth',
      anchorHa: 1_079_538,
      growthPct: 4,
      fuelLoad: 55,
      recoveryYears: 35,
      decompShare: 0.35,
    },
  },
  {
    id: 'conservative',
    label: 'Conservative — small durable loss',
    blurb:
      'Deliberately downplays the effect: only a third of burnt land is sink-bearing forest, fuel loads are light, stands bounce back in a decade. Use this to check whether the story survives assumptions chosen against it.',
    over: {
      forestShare: 0.33,
      fuelLoad: 28,
      recoveryYears: 10,
      decompShare: 0.15,
      seqRate: 1.8,
    },
  },
];

/* ═══════════════════════════════════════════════════════ 4. THE MODEL */

export const END_YEAR = 2050;

/** Burnt area in a given year under the chosen projection mode, ha. */
export function areaInYear(year: number, p: Params): number {
  const obs = BURNT_AREA.find((d) => d.year === year);
  if (obs) return obs.ha;
  if (year < FIRST_YEAR) return p.embeddedHa;

  const dt = year - LAST_OBS_YEAR;
  switch (p.mode) {
    case 'flat':
      return p.anchorHa;
    case 'growth':
      return p.anchorHa * Math.pow(1 + p.growthPct / 100, dt);
    case 'trend': {
      // Extend the OLS line; never let it go negative.
      const v = OLS.meanHa + OLS.slope * (year - OLS.meanYear);
      return Math.max(0, v);
    }
  }
}

export type Impact = {
  /** CO2 released by the fire itself, MtCO2e. */
  combustion: number;
  /** CO2 from fire-killed biomass decaying in later years, MtCO2e. */
  decomposition: number;
  /** Removals the recovering land failed to deliver this year, MtCO2e. */
  foregone: number;
  /** Sum of the three, MtCO2e. */
  total: number;
};

const ZERO: Impact = { combustion: 0, decomposition: 0, foregone: 0, total: 0 };

/**
 * Gross fire impact on the inventory in `year`, for an arbitrary burnt-area
 * path. Cohorts are accumulated from `FIRST_YEAR` forward, so the foregone-
 * removals term correctly builds up as successive years of fire leave more and
 * more land in a recovering, under-performing state.
 */
function grossImpact(year: number, area: (y: number) => number, p: Params): Impact {
  if (year < FIRST_YEAR) return ZERO;

  const combustion = (area(year) * p.fuelLoad) / 1e6;

  // Decomposition: each cohort's dead biomass releases decompShare of its
  // combustion-equivalent carbon, spread evenly over decompYears.
  let decomposition = 0;
  const dY = Math.max(1, p.decompYears);
  for (let c = Math.max(FIRST_YEAR, year - dY + 1); c <= year; c++) {
    decomposition += (area(c) * p.fuelLoad * p.decompShare) / dY / 1e6;
  }

  // Foregone removals: a cohort burnt k years ago still under-delivers, on a
  // linear recovery ramp from a full deficit in the fire year to zero at
  // recoveryYears.
  let foregone = 0;
  const R = Math.max(1, p.recoveryYears);
  for (let c = Math.max(FIRST_YEAR, year - R + 1); c <= year; c++) {
    const k = year - c;
    const deficitShare = Math.max(0, 1 - k / R);
    foregone += (area(c) * p.forestShare * p.seqRate * deficitShare) / 1e6;
  }

  return {
    combustion,
    decomposition,
    foregone,
    total: combustion + decomposition + foregone,
  };
}

/**
 * The number that actually matters: how much WORSE the projected fire path is
 * than the fire load already baked into inventories and projections.
 *
 * Both paths are run through the identical cohort machinery and differenced,
 * so the pre-existing "normal" fire load cancels exactly. A negative value in a
 * mild year is real and is shown as such.
 */
export function excessImpact(year: number, p: Params): Impact {
  const projected = grossImpact(year, (y) => areaInYear(y, p), p);
  const counterfactual = grossImpact(year, () => p.embeddedHa, p);
  return {
    combustion: projected.combustion - counterfactual.combustion,
    decomposition: projected.decomposition - counterfactual.decomposition,
    foregone: projected.foregone - counterfactual.foregone,
    total: projected.total - counterfactual.total,
  };
}

/**
 * The reference (planned) land sink path: what the targets assume the land
 * will deliver, before fire erodes it. Anchored on the 2024 estimate, the
 * legal 2030 target and the chosen 2040 assumption, linearly interpolated,
 * then held flat to 2050.
 */
export function referenceSink(year: number, p: Params): number {
  const a = { y: 2024, v: 212 };
  const b = { y: 2030, v: SINK_TARGET_2030 };
  const c = { y: 2040, v: p.sink2040 };
  if (year <= a.y) return a.v;
  if (year <= b.y) return a.v + ((b.v - a.v) * (year - a.y)) / (b.y - a.y);
  if (year <= c.y) return b.v + ((c.v - b.v) * (year - b.y)) / (c.y - b.y);
  return c.v;
}

/** The sink actually delivered once the excess fire load is subtracted. */
export function adjustedSink(year: number, p: Params): number {
  return referenceSink(year, p) - excessImpact(year, p).total;
}

export type YearRow = {
  year: number;
  ha: number;
  observed: boolean;
  excess: Impact;
  refSink: number;
  adjSink: number;
};

/** The full modelled series, 2021 → 2050. */
export function series(p: Params): YearRow[] {
  const out: YearRow[] = [];
  for (let y = FIRST_YEAR; y <= END_YEAR; y++) {
    out.push({
      year: y,
      ha: areaInYear(y, p),
      observed: y <= LAST_OBS_YEAR,
      excess: excessImpact(y, p),
      refSink: referenceSink(y, p),
      adjSink: adjustedSink(y, p),
    });
  }
  return out;
}

/* ══════════════════════════════════════════ 5. TARGET-FEASIBILITY ARITHMETIC */

export type Feasibility = {
  year: number;
  /** Net emissions allowed in the target year, MtCO2e. */
  netAllowed: number;
  /** Gross budget for all other sectors if the sink delivers as planned. */
  grossPlanned: number;
  /** Gross budget once fire has eroded the sink. */
  grossActual: number;
  /** The extra cut other sectors must find, MtCO2e (= the sink loss). */
  extraBurden: number;
  /** That burden as a share of the planned gross budget, %. */
  burdenPctOfGross: number;
  /** That burden as a share of the planned sink, %. */
  burdenPctOfSink: number;
  /** Equivalent number of EU passenger cars taken off the road, millions. */
  carsMillions: number;
  /**
   * The burden expressed as time: how many months of the EU's average
   * 2030→2040 net-reduction effort it consumes. The single most intuitive
   * framing in the module.
   */
  monthsOfEffort: number;
};

/** Net emissions permitted in 2040 under a `target2040Pct` cut vs 1990. */
export function netAllowed2040(p: Params): number {
  return BASE_1990 * (1 - p.target2040Pct / 100);
}

/** Net emissions permitted in 2030 under the legislated -55%. */
export const NET_ALLOWED_2030 = BASE_1990 * 0.45;

export function feasibility(year: number, p: Params): Feasibility {
  const netAllowed = year >= 2050 ? 0 : netAllowed2040(p);
  const ref = referenceSink(year, p);
  const loss = excessImpact(year, p).total;

  const grossPlanned = netAllowed + ref;
  const grossActual = netAllowed + ref - loss;

  // Average annual net reduction the EU must deliver between 2030 and 2040.
  const annualEffort = (NET_ALLOWED_2030 - netAllowed2040(p)) / 10;

  return {
    year,
    netAllowed,
    grossPlanned,
    grossActual,
    extraBurden: loss,
    burdenPctOfGross: grossPlanned > 0 ? (loss / grossPlanned) * 100 : 0,
    burdenPctOfSink: ref > 0 ? (loss / ref) * 100 : 0,
    carsMillions: (loss * 1e6) / CAR_TCO2_YR / 1e6,
    monthsOfEffort: annualEffort > 0 ? (loss / annualEffort) * 12 : 0,
  };
}

/**
 * Cumulative excess emissions between two years, MtCO2e — the budget framing.
 * A sink shortfall is not only a target-year problem: it eats the cumulative
 * carbon budget every year on the way there.
 */
export function cumulativeExcess(from: number, to: number, p: Params): number {
  let s = 0;
  for (let y = from; y <= to; y++) s += excessImpact(y, p).total;
  return s;
}

/* ═════════════════════════════════════════════════ 6. ASSUMPTION REGISTRY */

/**
 * Every dial in the model, with its provenance and — crucially — an honest
 * confidence rating. Rendered as the documentation table in the UI so that the
 * assumptions travel with the numbers instead of living in a separate PDF.
 */
export type AssumptionDoc = {
  key: keyof Params | 'burntArea' | 'baseline' | 'sinkPath';
  label: string;
  value: string;
  source: string;
  rationale: string;
  confidence: 'high' | 'medium' | 'low';
};

export const ASSUMPTIONS: AssumptionDoc[] = [
  {
    key: 'burntArea',
    label: 'Observed burnt area 2021-25',
    value: '449k / 837k / 504k / 419k / 1,080k ha',
    source: 'Copernicus EMS — EFFIS; JRC annual fire reports',
    rationale:
      'Satellite-mapped burnt area for the EU-27. EFFIS maps fires above roughly 30 ha, so the true burnt area is somewhat higher; using EFFIS makes the estimate conservative.',
    confidence: 'high',
  },
  {
    key: 'embeddedHa',
    label: 'Fire load already in the projections',
    value: '550,000 ha/yr',
    source: 'Derived — JRC states 2025 was “nearly double the 2006-2024 average”',
    rationale:
      'The single most important assumption here. LULUCF inventories and Member State projections already contain a normal amount of fire; only burnt area above this line is an additional problem for the target. Raising this dial shrinks the whole story.',
    confidence: 'medium',
  },
  {
    key: 'fuelLoad',
    label: 'Combustion emissions per hectare',
    value: '42 tCO₂/ha',
    source: 'Calibrated to CAMS: ~12.5 MtC for ~1.08 Mha in 2025',
    rationale:
      'Back-solved from the observed 2025 emissions and burnt area, so it reproduces the record year by construction. Varies enormously by fuel type — light Mediterranean shrub sits near 20, dense conifer above 70.',
    confidence: 'high',
  },
  {
    key: 'forestShare',
    label: 'Share of burnt area that is sink-bearing forest',
    value: '50%',
    source: 'EFFIS land-cover breakdown of burnt area (order of magnitude)',
    rationale:
      'A large part of EFFIS burnt area is shrubland, grassland and transitional woodland rather than productive forest. Only the forest fraction carries a durable removals stream worth losing; grass and scrub regrow within a few years and are close to carbon-neutral over the cycle.',
    confidence: 'low',
  },
  {
    key: 'seqRate',
    label: 'Removals on unburnt forest land',
    value: '2.5 tCO₂/ha/yr',
    source: 'EU LULUCF inventory: ~200 MtCO₂e net over ~160 Mha of forest',
    rationale:
      'The EU-wide net sink divided by forest area lands near 1.3 tCO₂/ha/yr, but that figure is dragged down by cropland, grassland and settlements. Productive forest land alone sits meaningfully higher.',
    confidence: 'medium',
  },
  {
    key: 'recoveryYears',
    label: 'Years to recover pre-fire removal rate',
    value: '20 years',
    source: 'Post-fire regrowth literature; modelled as a linear ramp',
    rationale:
      'Mediterranean pine and oak systems regain canopy in decades, not years, and repeat burns can push a stand into permanent shrub. The linear ramp is a simplification of an S-curve and slightly understates the early-year deficit.',
    confidence: 'low',
  },
  {
    key: 'decompShare',
    label: 'Post-fire decomposition',
    value: '25% of combustion, over 10 years',
    source: 'Standing dead wood and root necromass decay literature',
    rationale:
      'Fire kills far more biomass than it consumes. The remainder rots and outgasses over the following decade, which is why the emissions consequence of a fire year outlasts the fire year.',
    confidence: 'low',
  },
  {
    key: 'sinkPath',
    label: 'Reference (planned) sink path',
    value: '212 Mt (2024) → 310 Mt (2030) → 317 Mt (2040)',
    source: 'Regulation (EU) 2023/839; Commission 2040 impact assessment',
    rationale:
      'The 2030 value is legally binding. The 2040 value is the central of the impact assessment’s 215 / 317 / 376 MtCO₂e span, all of which sit inside the ESABCC’s 100-400 MtCO₂ removals range. The path between anchors is linear.',
    confidence: 'medium',
  },
  {
    key: 'target2040Pct',
    label: '2040 target and 1990 baseline',
    value: '-90% vs 4,649 MtCO₂e',
    source: 'European Climate Law as amended (in force April 2026); EU inventory',
    rationale:
      'The target is net and includes LULUCF, which is exactly why a sink shortfall converts one-for-one into a deeper cut required from every other sector. The ESABCC advised 90-95%; the slider covers that range.',
    confidence: 'high',
  },
];

/* ═══════════════════════════════════════════════════════ 7. FORMATTING */

export function fmt(n: number, d = 0) {
  return n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Hectares → a human-readable string. */
export function ha(n: number) {
  if (Math.abs(n) >= 1e6) return `${fmt(n / 1e6, 2)} Mha`;
  return `${fmt(Math.round(n / 1000))}k ha`;
}

/** MtCO2e → a human-readable signed string. */
export function mt(n: number, d = 1) {
  return `${n >= 0 ? '' : '−'}${fmt(Math.abs(n), d)} Mt`;
}
