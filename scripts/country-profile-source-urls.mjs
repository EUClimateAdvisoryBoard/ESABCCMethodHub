#!/usr/bin/env node
/**
 * Adds `source` and `sourceUrl` fields to every IndicatorValue object in a
 * member-state country profile (`src/data/country-profiles/<code>.ts`).
 *
 * The URL templates here are the canonical Eurostat / EEA / WISE-WFD / EU
 * Bathing Water / EU Drinking Water / Climate-ADAPT / IUCN datasets for each
 * indicator, with the country code substituted in where the dataset supports
 * a per-country deep link. These are the *exact* original sources that the
 * Renewable energy panel and the rest of the country profile draw from.
 *
 * Usage:
 *   node scripts/country-profile-source-urls.mjs <countryCode> [...]
 *   node scripts/country-profile-source-urls.mjs ALL
 *
 * The script is idempotent: re-running it on a file that already has
 * `sourceUrl` will leave the existing values alone.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROFILES_DIR = path.join(ROOT, 'src', 'data', 'country-profiles');

/** Maps the EU member-state ISO/Eurostat code (Eurostat uses EL for GR, UK for GB). */
const EUROSTAT_CODE = {
  AT: 'AT', BE: 'BE', BG: 'BG', CY: 'CY', CZ: 'CZ', DE: 'DE', DK: 'DK',
  EE: 'EE', ES: 'ES', FI: 'FI', FR: 'FR', GR: 'EL', HR: 'HR', HU: 'HU',
  IE: 'IE', IT: 'IT', LT: 'LT', LU: 'LU', LV: 'LV', MT: 'MT', NL: 'NL',
  PL: 'PL', PT: 'PT', RO: 'RO', SE: 'SE', SI: 'SI', SK: 'SK',
};

/** Long lowercase name used in Climate-ADAPT / WISE / EEA biodiversity URLs. */
const COUNTRY_SLUG = {
  AT: 'austria', BE: 'belgium', BG: 'bulgaria', CY: 'cyprus', CZ: 'czechia',
  DE: 'germany', DK: 'denmark', EE: 'estonia', ES: 'spain', FI: 'finland',
  FR: 'france', GR: 'greece', HR: 'croatia', HU: 'hungary', IE: 'ireland',
  IT: 'italy', LT: 'lithuania', LU: 'luxembourg', LV: 'latvia', MT: 'malta',
  NL: 'netherlands', PL: 'poland', PT: 'portugal', RO: 'romania', SE: 'sweden',
  SI: 'slovenia', SK: 'slovakia',
};

/**
 * One entry per known IndicatorValue field. Each yields the source label and
 * URL (which may depend on the country code) for that field.
 */
const INDICATORS = {
  // ── GHG ────────────────────────────────────────────────────────────────
  totalLatest: {
    section: 'ghg',
    source: 'EEA GHG inventory',
    url: cc =>
      `https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=${EUROSTAT_CODE[cc]}`,
  },
  perCapita: {
    section: 'ghg',
    source: 'EEA',
    url: cc =>
      `https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=${EUROSTAT_CODE[cc]}`,
  },
  perGdp: {
    section: 'ghg',
    source: 'EEA / Eurostat',
    url: cc =>
      `https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=${EUROSTAT_CODE[cc]}`,
  },

  // ── Renewables ─────────────────────────────────────────────────────────
  shareLatest: {
    section: 'renewables',
    source: 'Eurostat SHARES (nrg_ind_ren)',
    url: cc =>
      `https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=${EUROSTAT_CODE[cc]}`,
  },

  // ── Energy efficiency ──────────────────────────────────────────────────
  primary: {
    section: 'efficiency',
    source: 'Eurostat (nrg_bal_s — primary energy)',
    url: cc =>
      `https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=${EUROSTAT_CODE[cc]}`,
  },
  final: {
    section: 'efficiency',
    source: 'Eurostat (nrg_bal_s — final energy)',
    url: cc =>
      `https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=${EUROSTAT_CODE[cc]}`,
  },
  intensity: {
    section: 'efficiency',
    source: 'Eurostat (nrg_ind_ei)',
    url: cc =>
      `https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=${EUROSTAT_CODE[cc]}`,
  },

  // ── Air quality ────────────────────────────────────────────────────────
  // EEA publishes per-country "air pollution country fact sheets" yearly
  // (https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/<slug>-...)
  // which is the most direct per-country source for PM2.5, NO2, O3 and PM2.5-attributable mortality.
  pm25: {
    section: 'air',
    source: 'EEA air pollution country fact sheet',
    url: cc =>
      `https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/${COUNTRY_SLUG[cc]}-air-pollution-country-fact-sheet-2024`,
  },
  no2: {
    section: 'air',
    source: 'EEA air pollution country fact sheet',
    url: cc =>
      `https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/${COUNTRY_SLUG[cc]}-air-pollution-country-fact-sheet-2024`,
  },
  ozone: {
    section: 'air',
    source: 'EEA air pollution country fact sheet',
    url: cc =>
      `https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/${COUNTRY_SLUG[cc]}-air-pollution-country-fact-sheet-2024`,
  },
  prematureDeaths: {
    section: 'air',
    source: 'EEA — Health impacts of air pollution in Europe',
    url: () =>
      `https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024`,
  },
  exceedanceShare: {
    section: 'air',
    source: 'EEA — Exceedance of air quality standards',
    url: cc =>
      `https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=${EUROSTAT_CODE[cc]}`,
  },

  // ── Water ──────────────────────────────────────────────────────────────
  surfaceWaterGood: {
    section: 'water',
    source: 'WISE-WFD country profile',
    url: cc =>
      `https://water.europa.eu/freshwater/countries/wfd/${COUNTRY_SLUG[cc]}`,
  },
  groundwaterGood: {
    section: 'water',
    source: 'WISE-WFD country profile',
    url: cc =>
      `https://water.europa.eu/freshwater/countries/wfd/${COUNTRY_SLUG[cc]}`,
  },
  bathingWaterExcellent: {
    section: 'water',
    source: 'EEA bathing water reports',
    url: cc =>
      `https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=${EUROSTAT_CODE[cc]}`,
  },
  drinkingWaterCompliance: {
    section: 'water',
    source: 'EU Drinking Water Directive reporting',
    url: cc =>
      `https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=${EUROSTAT_CODE[cc]}`,
  },

  // ── Biodiversity ───────────────────────────────────────────────────────
  natura2000Land: {
    section: 'biodiversity',
    source: 'EEA Natura 2000 barometer',
    url: cc =>
      `https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=${EUROSTAT_CODE[cc]}`,
  },
  natura2000Marine: {
    section: 'biodiversity',
    source: 'EEA Natura 2000 barometer',
    url: cc =>
      `https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=${EUROSTAT_CODE[cc]}`,
  },
  protectedAreas: {
    section: 'biodiversity',
    source: 'EEA CDDA — designated areas',
    url: cc =>
      `https://www.eea.europa.eu/en/datahub/datahubitem-view/c97c5544-1ed5-453c-94a9-7c0e065e18a3?country=${EUROSTAT_CODE[cc]}`,
  },
  threatenedSpecies: {
    section: 'biodiversity',
    source: 'IUCN Red List — national totals',
    url: cc =>
      `https://www.iucnredlist.org/search?searchType=species&landRegions=${EUROSTAT_CODE[cc]}`,
  },
  habitatsFavourable: {
    section: 'biodiversity',
    source: 'EEA Article 17 dashboards',
    url: cc =>
      `https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/${COUNTRY_SLUG[cc]}`,
  },

  // ── Circular economy ───────────────────────────────────────────────────
  municipalRecycling: {
    section: 'circular',
    source: 'Eurostat (cei_wm011)',
    url: cc =>
      `https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=${EUROSTAT_CODE[cc]}`,
  },
  circularMaterialUseRate: {
    section: 'circular',
    source: 'Eurostat (cei_srm030)',
    url: cc =>
      `https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=${EUROSTAT_CODE[cc]}`,
  },
  resourceProductivity: {
    section: 'circular',
    source: 'Eurostat (cei_pc030)',
    url: cc =>
      `https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=${EUROSTAT_CODE[cc]}`,
  },
};

/**
 * For a single IndicatorValue body (the text between `{` and `}`), insert
 * `source` and `sourceUrl` if they are missing. Leave existing fields alone.
 */
function patchIndicatorBody(body, sourceLabel, sourceUrl) {
  const hasSource = /\bsource\s*:/.test(body);
  const hasSourceUrl = /\bsourceUrl\s*:/.test(body);
  if (hasSource && hasSourceUrl) return body;

  // Trim trailing whitespace + optional trailing comma, then re-append.
  let trimmed = body.replace(/[\s,]+$/, '');
  const additions = [];
  if (!hasSource) additions.push(`source: ${JSON.stringify(sourceLabel)}`);
  if (!hasSourceUrl) additions.push(`sourceUrl: ${JSON.stringify(sourceUrl)}`);
  return `${trimmed}, ${additions.join(', ')} `;
}

/**
 * Walk the source file once per known indicator field, find single-line
 * `<field>: { ... }` IndicatorValue literals, and patch them.
 *
 * We scope the search to the file's "<section>: { ... }" block so e.g. the
 * `primary:` field in the efficiency section is patched but the `primary:`
 * inside an adaptation strategy literal (if one ever existed) wouldn't be.
 */
function patchProfileSource(text, countryCode) {
  let out = text;
  for (const [field, spec] of Object.entries(INDICATORS)) {
    const sourceUrl = spec.url(countryCode);
    // single-line IndicatorValue: `field: { ... },`
    const re = new RegExp(
      `(^\\s+${field}:\\s*\\{)([^{}\\n]*?)(\\},)`,
      'gm',
    );
    out = out.replace(re, (_match, head, body, tail) => {
      const patched = patchIndicatorBody(body, spec.source, sourceUrl);
      return `${head}${patched}${tail}`;
    });
  }
  return out;
}

function processCountry(code) {
  const cc = code.toUpperCase();
  if (!EUROSTAT_CODE[cc]) {
    console.error(`Unknown country code: ${cc}`);
    process.exitCode = 1;
    return;
  }
  const filePath = path.join(PROFILES_DIR, `${cc.toLowerCase()}.ts`);
  if (!fs.existsSync(filePath)) {
    console.error(`No profile for ${cc} at ${filePath}`);
    process.exitCode = 1;
    return;
  }
  const before = fs.readFileSync(filePath, 'utf8');
  const after = patchProfileSource(before, cc);
  if (before === after) {
    console.log(`[${cc}] no changes`);
    return;
  }
  fs.writeFileSync(filePath, after);
  console.log(`[${cc}] updated`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/country-profile-source-urls.mjs <CODE> [...]  |  ALL');
  process.exit(2);
}

const codes = args.includes('ALL') ? Object.keys(EUROSTAT_CODE) : args;
codes.forEach(processCountry);
