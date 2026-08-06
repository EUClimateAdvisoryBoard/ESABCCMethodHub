/**
 * Climate Security Ledger — avoided fossil imports (beta module M · 45).
 * Calibration anchors: EU-27 fossil demand, import shares, activity index,
 * border prices, supplier shares and 2030 projection levels.
 *
 * PROVENANCE (read before citing anything)
 * ----------------------------------------
 * AI-compiled — pending Secretariat verification. Compile date: 2026-08.
 *
 * Every figure in this file is an ORDER-OF-MAGNITUDE calibration anchor,
 * rounded from the assistant's knowledge of public sources. Eurostat, EEA
 * and EUR-Lex hosts are blocked from this sandbox, so NO live pull has
 * validated these values yet; the follow-up work item is a snapshot fetch
 * via the GitHub-runner workflows (docs/how-to-access-eurostat-eea-data.md)
 * committed under public/data/climate-security/, after which this file is
 * regenerated. Where sources disagree, or where compile-time precision is
 * genuinely limited, a lo–hi range is stored and the module surfaces it —
 * no figure here claims more precision than its source note states.
 *
 * Documents used (locators are dataset/table codes, so no page-offset
 * rules apply):
 *   · Eurostat energy balances `nrg_bal_c` (gross inland consumption /
 *     deliveries per fuel, converted to natural units);
 *   · Eurostat imports by partner `nrg_ti_gas`, `nrg_ti_oil`, `nrg_ti_sff`;
 *   · Eurostat energy import dependency `nrg_ind_id`;
 *   · Eurostat national accounts `nama_10_gdp` (chain-linked volumes) and
 *     population `demo_pjan`;
 *   · EEA "Trends and projections in Europe 2024" (WEM / WAM aggregates);
 *   · European Commission REPowerEU communication COM(2022) 230 and the
 *     Fit-for-55 MIX scenario (2030 gas demand implications);
 *   · ACER wholesale market monitoring / TTF front-month settlement
 *     averages; Brent yearly averages; ARA (API2) steam-coal averages.
 *
 * Unit conventions:
 *   · gas in bcm (1 bcm ≈ 38.1 PJ GCV ≈ 10.55 TWh), oil in Mt, hard coal
 *     in Mt — the natural units of each trade discussion;
 *   · prices are stored in € million per native volume unit (gas: €m/bcm;
 *     oil and coal: €/t, which is numerically identical to €m/Mt), so
 *     volume × price is always € million;
 *   · shares (import shares, supplier shares) are stored on the 0–100
 *     percent scale, per the repository convention; model.ts divides
 *     by 100.
 */

export type Fuel = 'gas' | 'oil' | 'coal';
export type PriceScenario = 'avg2019' | 'crisis2022' | 'forward';
export type PathKey = 'wem' | 'wam' | 'advised';

/** A value with an explicit disagreement/uncertainty range and a source locator. */
export type SourcedRange = { value: number; lo: number; hi: number; source: string };

export const FUELS: Fuel[] = ['gas', 'oil', 'coal'];

export const FUEL_META: Record<Fuel, { label: string; unit: string; priceUnit: string }> = {
  gas: { label: 'Natural gas', unit: 'bcm', priceUnit: '€m/bcm' },
  oil: { label: 'Oil & petroleum products', unit: 'Mt', priceUnit: '€/t' },
  coal: { label: 'Hard coal', unit: 'Mt', priceUnit: '€/t' },
};

/** Observation years of the backward-looking leg. */
export const YEARS: number[] = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

/**
 * EU-27 fossil demand per year, natural units (gas bcm; oil, coal Mt).
 * Rounded order-of-magnitude series; the stated tolerance applies to every
 * entry of the series.
 */
export const DEMAND: Record<Fuel, { series: number[]; tolerance: string; source: string }> = {
  gas: {
    //       2015  2016  2017  2018  2019  2020  2021  2022  2023  2024
    series: [386, 410, 423, 408, 412, 400, 412, 360, 333, 332],
    tolerance: '± 5 % on every entry (unit conversion from TJ GCV plus rounding)',
    source:
      'Eurostat nrg_bal_c, EU-27 gross inland consumption of natural gas, converted at 1 bcm ≈ 38.1 PJ GCV; shape cross-checked against the widely reported ≈ 20 % demand fall 2021 → 2023. AI-compiled 2026-08, not yet validated by a live pull.',
  },
  oil: {
    series: [455, 465, 470, 468, 465, 410, 430, 450, 445, 435],
    tolerance: '± 5 % on every entry (definition-sensitive: gross inland deliveries vs refinery intake)',
    source:
      'Eurostat nrg_bal_c, EU-27 oil and petroleum products, gross inland deliveries (≈ 9.2–9.8 Mb/d over the period). AI-compiled 2026-08, not yet validated by a live pull.',
  },
  coal: {
    series: [226, 215, 208, 200, 176, 144, 160, 161, 129, 106],
    tolerance: '± 10 % on every entry (hard coal only; lignite is excluded because it is almost entirely domestic)',
    source:
      'Eurostat nrg_bal_c / annual coal news releases, EU-27 hard coal consumption; the 2022 sanction-year plateau and the post-2022 collapse are the robust features. AI-compiled 2026-08, not yet validated by a live pull.',
  },
};

/**
 * Import share of demand per fuel and year, percent (0–100 scale).
 * Gas rises as EU production (notably Groningen) closes; oil is nearly all
 * imported throughout; hard coal is partly met by remaining EU (mostly
 * Polish) production.
 */
export const IMPORT_SHARE: Record<Fuel, { series: number[]; tolerance: string; source: string }> = {
  gas: {
    series: [74, 76, 78, 80, 81, 82, 85, 87, 89, 90],
    tolerance: '± 5 percentage points',
    source:
      'Eurostat nrg_ind_id, EU-27 natural-gas import dependency; endpoints anchored (≈ 74 % in 2015, ≈ 90 % by 2024), intermediate years interpolated. AI-compiled 2026-08.',
  },
  oil: {
    series: [97, 97, 97, 97, 97, 97, 97, 97, 97, 97],
    tolerance: '± 2 percentage points',
    source: 'Eurostat nrg_ind_id, EU-27 oil import dependency, stable at ≈ 96–98 % throughout. AI-compiled 2026-08.',
  },
  coal: {
    series: [58, 58, 58, 57, 57, 56, 57, 58, 56, 55],
    tolerance: '± 8 percentage points',
    source:
      'Derived: Eurostat nrg_bal_c hard-coal consumption minus EU-27 production (Eurostat coal statistics; production ≈ 100 Mt in 2015 falling to ≈ 50 Mt). The flat share hides a falling absolute level. AI-compiled 2026-08.',
  },
};

/**
 * EU-27 activity index (real GDP, chain-linked volumes), 2015 = 100.
 * Used to scale the frozen-intensity counterfactual by actual activity.
 */
export const ACTIVITY: { series: number[]; source: string } = {
  //       2015   2016   2017   2018   2019   2020   2021   2022   2023   2024
  series: [100.0, 102.0, 104.9, 107.1, 108.9, 102.6, 108.9, 112.6, 113.1, 114.3],
  source:
    'Eurostat nama_10_gdp, EU-27 GDP chain-linked volumes rebased to 2015 = 100 (annual real growth ≈ +2.0, +2.8, +2.1, +1.7, −5.6, +6.1, +3.4, +0.4, +1.0 %). AI-compiled 2026-08, ± 0.5 index points.',
};

/**
 * Border prices per fuel under the three switchable scenarios, in € million
 * per native volume unit (gas €m/bcm; oil and coal €/t ≡ €m/Mt).
 * Gas conversion: TTF €/MWh × 10.55 TWh/bcm.
 */
export const PRICES: Record<Fuel, Record<PriceScenario, SourcedRange>> = {
  gas: {
    avg2019: {
      value: 150,
      lo: 130,
      hi: 170,
      source: 'TTF day-ahead/front-month 2019 average ≈ €13–16/MWh (ACER wholesale market monitoring). AI-compiled 2026-08.',
    },
    crisis2022: {
      value: 1250,
      lo: 1050,
      hi: 1450,
      source:
        'TTF 2022 full-year average ≈ €100–135/MWh (ACER MMR 2022; the August 2022 peak was far higher and is NOT used here). AI-compiled 2026-08.',
    },
    forward: {
      value: 340,
      lo: 280,
      hi: 400,
      source: 'TTF calendar-forward level as of the 2026-08 compile, ≈ €27–38/MWh. AI-compiled; refresh on regeneration.',
    },
  },
  oil: {
    avg2019: {
      value: 420,
      lo: 390,
      hi: 450,
      source: 'Brent 2019 average ≈ $64/bbl at ≈ 1.12 USD/EUR, × 7.33 bbl/t. AI-compiled 2026-08.',
    },
    crisis2022: {
      value: 700,
      lo: 650,
      hi: 760,
      source: 'Brent 2022 average ≈ $101/bbl at ≈ 1.05 USD/EUR, × 7.33 bbl/t. AI-compiled 2026-08.',
    },
    forward: {
      value: 460,
      lo: 400,
      hi: 520,
      source: 'Brent forward strip as of the 2026-08 compile, ≈ $60–75/bbl. AI-compiled; refresh on regeneration.',
    },
  },
  coal: {
    avg2019: {
      value: 55,
      lo: 45,
      hi: 65,
      source: 'ARA (API2) steam coal 2019 average ≈ $60/t. AI-compiled 2026-08.',
    },
    crisis2022: {
      value: 270,
      lo: 230,
      hi: 310,
      source: 'ARA (API2) 2022 average ≈ $290/t at ≈ 1.05 USD/EUR. AI-compiled 2026-08.',
    },
    forward: {
      value: 100,
      lo: 85,
      hi: 120,
      source: 'ARA (API2) forward level as of the 2026-08 compile, ≈ $95–125/t. AI-compiled; refresh on regeneration.',
    },
  },
};

export const PRICE_SCENARIO_META: Record<PriceScenario, { label: string; hint: string }> = {
  avg2019: { label: '2019 average', hint: 'pre-crisis border prices — the conservative valuation' },
  crisis2022: { label: '2022 crisis', hint: 'full-year 2022 averages, not the August peak' },
  forward: { label: 'Recent forward', hint: 'forward-curve levels at the 2026-08 compile' },
};

/**
 * Russian share of EU-27 extra-EU imports per fuel BEFORE the 2022 invasion
 * (2021 reference year), percent. Used to state the "avoided Russian
 * imports at the pre-war mix" line.
 */
export const RUSSIAN_SHARE_PRE2022: Record<Fuel, SourcedRange> = {
  gas: {
    value: 45,
    lo: 40,
    hi: 45,
    source:
      'European Commission, REPowerEU COM(2022) 230: Russia supplied ≈ 45 % of EU gas imports in 2021 (pipeline + LNG); Eurostat nrg_ti_gas is the underlying table. AI-compiled 2026-08.',
  },
  oil: {
    value: 27,
    lo: 25,
    hi: 29,
    source: 'Eurostat nrg_ti_oil / Commission figures: Russia ≈ 25–29 % of EU crude and product imports in 2021. AI-compiled 2026-08.',
  },
  coal: {
    value: 45,
    lo: 40,
    hi: 50,
    source: 'Eurostat nrg_ti_sff: Russia ≈ 45 % of EU hard-coal imports in 2021 (embargoed from August 2022). AI-compiled 2026-08.',
  },
};

/**
 * Gas import supplier mix, 2021 vs 2024, percent of extra-EU gas imports
 * (pipeline + LNG). Recorded in both directions on purpose: the fall of the
 * Russian share and the rise of the US LNG share — a NEW dependency — are
 * the same story told even-handedly.
 */
export const GAS_SUPPLIER_MIX: {
  rows: { name: string; share2021: number; share2024: number }[];
  tolerance: string;
  source: string;
} = {
  rows: [
    { name: 'Russia (pipeline + LNG)', share2021: 45, share2024: 18 },
    { name: 'Norway', share2021: 23, share2024: 30 },
    { name: 'United States (LNG)', share2021: 6, share2024: 20 },
    { name: 'North Africa', share2021: 12, share2024: 14 },
    { name: 'Other (UK, Azerbaijan, other LNG)', share2021: 14, share2024: 18 },
  ],
  tolerance: '± 4 percentage points per cell; rows sum to 100 by construction',
  source:
    'Eurostat nrg_ti_gas plus Commission/DG ENER quarterly gas-market reports and the Bruegel European natural-gas imports tracker. The 2024 Russian share (≈ 13–19 % depending on treatment of LNG trans-shipment) is contested between sources — the range is real disagreement, not rounding. AI-compiled 2026-08.',
};

/** Russian share in 2024, per fuel, percent — the post-sanctions residual. */
export const RUSSIAN_SHARE_2024: Record<Fuel, SourcedRange> = {
  gas: {
    value: 18,
    lo: 13,
    hi: 19,
    source: 'See GAS_SUPPLIER_MIX source note — the 2024 figure is genuinely contested between trackers. AI-compiled 2026-08.',
  },
  oil: {
    value: 3,
    lo: 2,
    hi: 4,
    source: 'Eurostat nrg_ti_oil after the December 2022 crude / February 2023 products embargoes (pipeline exemptions remain). AI-compiled 2026-08.',
  },
  coal: { value: 0, lo: 0, hi: 0, source: 'Full EU embargo on Russian coal since August 2022 (Council Reg. (EU) 2022/576).' },
};

/**
 * 2030 fossil-demand levels per pathway, natural units.
 * WEM/WAM are the EEA with-existing / with-additional-measures projection
 * aggregates (Trends and projections 2024: ≈ −43 % / −49 % GHG vs 1990);
 * the advised path is a −55 %-consistent level in the spirit of the
 * Fit-for-55 MIX scenario and the ESABCC 2024 progress-report assessment.
 * CAUTION: EEA publishes GHG aggregates, not per-fuel demand — the per-fuel
 * split below is AI-INFERRED from Commission scenario material and carries
 * the widest ranges in this file.
 */
export const PROJ_2030: {
  levels: Record<PathKey, Record<Fuel, SourcedRange>>;
  source: string;
} = {
  levels: {
    wem: {
      gas: { value: 290, lo: 260, hi: 320, source: 'AI-inferred from EEA WEM aggregate + Commission reference scenarios. 2026-08.' },
      oil: { value: 400, lo: 370, hi: 430, source: 'AI-inferred from EEA WEM aggregate + Commission reference scenarios. 2026-08.' },
      coal: { value: 90, lo: 70, hi: 110, source: 'AI-inferred from EEA WEM aggregate + announced coal phase-out dates. 2026-08.' },
    },
    wam: {
      gas: { value: 250, lo: 220, hi: 280, source: 'AI-inferred from EEA WAM aggregate. 2026-08.' },
      oil: { value: 370, lo: 340, hi: 400, source: 'AI-inferred from EEA WAM aggregate. 2026-08.' },
      coal: { value: 70, lo: 55, hi: 90, source: 'AI-inferred from EEA WAM aggregate + announced coal phase-out dates. 2026-08.' },
    },
    advised: {
      gas: { value: 210, lo: 180, hi: 240, source: 'AI-inferred from the FF55 MIX scenario (≈ −30–37 % gas vs 2015 by 2030) and REPowerEU COM(2022) 230. 2026-08.' },
      oil: { value: 340, lo: 310, hi: 370, source: 'AI-inferred from FF55 MIX transport/oil implications. 2026-08.' },
      coal: { value: 45, lo: 30, hi: 60, source: 'AI-inferred from FF55 MIX power-sector implications. 2026-08.' },
    },
  },
  source:
    'EEA "Trends and projections in Europe 2024" (WEM ≈ −43 %, WAM ≈ −49 % GHG vs 1990 by 2030; the legislated target is −55 %); European Commission FF55 MIX scenario and REPowerEU COM(2022) 230 for the gas split; ESABCC 2024 progress report for the advised-path framing. Per-fuel levels are AI-inferred order-of-magnitude values pending Secretariat verification.',
};

/** Assumed import share of demand in 2030, percent, per fuel. */
export const IMPORT_SHARE_2030: { shares: Record<Fuel, number>; source: string } = {
  shares: { gas: 92, oil: 97, coal: 60 },
  source:
    'Extrapolation of the Eurostat nrg_ind_id trends above (EU gas production keeps declining; oil dependency stable; residual Polish hard-coal production). AI-compiled 2026-08, ± 5 percentage points.',
};

/** EU-27 population, millions, for the €-per-citizen line. */
export const EU_POPULATION_M: { value: number; source: string } = {
  value: 449.3,
  source: 'Eurostat demo_pjan, EU-27 population on 1 January 2024 ≈ 449.3 million.',
};
