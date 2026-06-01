/**
 * Aggregator that loads every per-country file and exposes the EU-27 set.
 *
 * Country files live at `src/data/country-profiles/{cc}.ts` and default-
 * export a `CountryProfile`. Add a new member state (or candidate country
 * profile) by dropping the new file and importing it below.
 *
 * Imports use the dynamic ?:require pattern so that the build does not
 * fail while data files for individual countries are still being authored —
 * countries with no file yet fall back to a minimal placeholder so the
 * UI still renders a row in the heatmap and a marker on the map.
 */
import { EU_MEMBER_STATES } from '@/data/eu-member-states';
import type { CountryProfile, Status, HeatmapIndicatorKey } from './_types';

// Centroid lookup so the placeholder hero has a valid lat/lon for the map.
const CENTROIDS: Record<string, { lat: number; lon: number; capital: string }> = {
  AT: { lat: 47.5162, lon: 14.5501, capital: 'Vienna' },
  BE: { lat: 50.5039, lon: 4.4699,  capital: 'Brussels' },
  BG: { lat: 42.7339, lon: 25.4858, capital: 'Sofia' },
  HR: { lat: 45.1000, lon: 15.2000, capital: 'Zagreb' },
  CY: { lat: 35.1264, lon: 33.4299, capital: 'Nicosia' },
  CZ: { lat: 49.8175, lon: 15.4730, capital: 'Prague' },
  DK: { lat: 56.2639, lon: 9.5018,  capital: 'Copenhagen' },
  EE: { lat: 58.5953, lon: 25.0136, capital: 'Tallinn' },
  FI: { lat: 61.9241, lon: 25.7482, capital: 'Helsinki' },
  FR: { lat: 46.2276, lon: 2.2137,  capital: 'Paris' },
  DE: { lat: 51.1657, lon: 10.4515, capital: 'Berlin' },
  GR: { lat: 39.0742, lon: 21.8243, capital: 'Athens' },
  HU: { lat: 47.1625, lon: 19.5033, capital: 'Budapest' },
  IE: { lat: 53.4129, lon: -8.2439, capital: 'Dublin' },
  IT: { lat: 41.8719, lon: 12.5674, capital: 'Rome' },
  LV: { lat: 56.8796, lon: 24.6032, capital: 'Riga' },
  LT: { lat: 55.1694, lon: 23.8813, capital: 'Vilnius' },
  LU: { lat: 49.8153, lon: 6.1296,  capital: 'Luxembourg' },
  MT: { lat: 35.9375, lon: 14.3754, capital: 'Valletta' },
  NL: { lat: 52.1326, lon: 5.2913,  capital: 'Amsterdam' },
  PL: { lat: 51.9194, lon: 19.1451, capital: 'Warsaw' },
  PT: { lat: 39.3999, lon: -8.2245, capital: 'Lisbon' },
  RO: { lat: 45.9432, lon: 24.9668, capital: 'Bucharest' },
  SK: { lat: 48.6690, lon: 19.6990, capital: 'Bratislava' },
  SI: { lat: 46.1512, lon: 14.9955, capital: 'Ljubljana' },
  ES: { lat: 40.4637, lon: -3.7492, capital: 'Madrid' },
  SE: { lat: 60.1282, lon: 18.6435, capital: 'Stockholm' },
};

function placeholder(code: string, name: string): CountryProfile {
  const c = CENTROIDS[code];
  return {
    code,
    name,
    eurostatCode: code === 'GR' ? 'EL' : code,
    hero: {
      lat: c?.lat ?? 50,
      lon: c?.lon ?? 10,
      capital: c?.capital ?? '',
      summary: `Country profile for ${name} is being authored. Use "Edit profile" or invite an external contributor to populate the data.`,
    },
    ghg:          { status: 'unknown' },
    renewables:   { status: 'unknown' },
    efficiency:   { status: 'unknown' },
    air:          { status: 'unknown' },
    water:        { status: 'unknown' },
    biodiversity: { status: 'unknown' },
    circular:     { status: 'unknown' },
    adaptation:   { status: 'unknown' },
    necp:         { status: 'unknown' },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryLoad(code: string): CountryProfile | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(`./${code.toLowerCase()}`);
    return (mod.default ?? mod) as CountryProfile;
  } catch {
    return null;
  }
}

export const COUNTRY_PROFILES: CountryProfile[] = EU_MEMBER_STATES.map(ms => {
  const loaded = tryLoad(ms.code);
  return loaded ?? placeholder(ms.code, ms.name);
});

export const COUNTRY_BY_CODE: Record<string, CountryProfile> = Object.fromEntries(
  COUNTRY_PROFILES.map(p => [p.code, p]),
);

export function getCountry(code: string): CountryProfile | undefined {
  return COUNTRY_BY_CODE[code.toUpperCase()];
}

/**
 * Pick the headline status for a heatmap cell. Falls back to "unknown" when
 * the country has no assessment for that indicator.
 */
export function heatmapStatus(
  p: CountryProfile,
  key: HeatmapIndicatorKey,
): Status {
  switch (key) {
    case 'ghg':          return p.ghg.status ?? 'unknown';
    case 'renewables':   return p.renewables.status ?? 'unknown';
    case 'efficiency':   return p.efficiency.status ?? 'unknown';
    case 'air':          return p.air.status ?? 'unknown';
    case 'water':        return p.water.status ?? 'unknown';
    case 'biodiversity': return p.biodiversity.status ?? 'unknown';
    case 'circular':     return p.circular.status ?? 'unknown';
    case 'adaptation':   return p.adaptation.status ?? 'unknown';
    case 'necp':         return p.necp.status ?? 'unknown';
  }
}

export * from './_types';
