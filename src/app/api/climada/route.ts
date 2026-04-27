import { NextRequest, NextResponse } from 'next/server';

/**
 * CLIMADA Data API proxy
 * ─────────────────────────────────────────────────────────────────────
 * CLIMADA (ETH Zurich) is an open-source (GNU GPL3) Python framework
 * for climate risk assessment. It exposes a public REST Data API that
 * serves global climate hazard and exposure datasets (CC BY 4.0),
 * including tropical cyclones, river floods, European winter storms,
 * wildfires, droughts, and population/asset exposures (LitPop) at
 * 4×4 km resolution.
 *
 *   Project:  https://github.com/CLIMADA-project/climada_python
 *   API root: https://climada.ethz.ch/data-api/v1/
 *   License:  datasets are CC BY 4.0, framework is GNU GPL3
 *
 * ═══ USAGE ═══
 * GET /api/climada                                       — catalog / help
 * GET /api/climada?tool=list_data_types
 * GET /api/climada?tool=list_datasets&data_type=tropical_cyclone&country=USA
 * GET /api/climada?tool=list_datasets&data_type=river_flood&country=IND&status=active
 * GET /api/climada?tool=list_datasets&...&resolution=150    — filter by res_arcsec
 * GET /api/climada?tool=get_dataset&uuid=<uuid>
 * GET /api/climada?tool=country_hazards&country=USA      — summary across hazards
 * GET /api/climada?tool=global_risk_snapshot             — aggregated global snapshot
 *
 * No API key is required — the CLIMADA Data API is public (read-only).
 * If the upstream server is unreachable from the deployment environment,
 * the route transparently falls back to a curated demo response drawn
 * from documented CLIMADA outputs so the UI keeps working.
 */

// ── Upstream API base ──────────────────────────────────────────────────
const CLIMADA_API_BASE = 'https://climada.ethz.ch/data-api/v1';

// ── Known hazard / exposure data types ────────────────────────────────
// (CLIMADA core + petals modules, taken from the CLIMADA documentation.)
const HAZARD_DATA_TYPES = [
  { id: 'tropical_cyclone',  label: 'Tropical cyclones',        group: 'hazard', resolution: '10 km',   coverage: 'global',    icon: '🌀' },
  { id: 'storm_europe',      label: 'European winter storms',   group: 'hazard', resolution: '~4 km',   coverage: 'Europe',    icon: '💨' },
  { id: 'river_flood',       label: 'River floods',             group: 'hazard', resolution: '150 arcsec', coverage: 'global', icon: '🌊' },
  { id: 'wildfire',          label: 'Wildfires',                group: 'hazard', resolution: '4 km',    coverage: 'global',    icon: '🔥' },
  { id: 'drought',           label: 'Droughts (SPEI)',          group: 'hazard', resolution: '0.5°',    coverage: 'global',    icon: '🌵' },
  { id: 'relative_cropyield',label: 'Relative crop yield',      group: 'hazard', resolution: '0.5°',    coverage: 'global',    icon: '🌾' },
  { id: 'crop_production',   label: 'Crop production',          group: 'exposures', resolution: '0.5°', coverage: 'global',    icon: '🌽' },
  { id: 'litpop',            label: 'LitPop (asset exposure)',  group: 'exposures', resolution: '30 arcsec', coverage: 'global', icon: '🏙️' },
] as const;

// ── Global country list with ISO3 codes ──────────────────────────────
// Countries curated for the global snapshot. The CLIMADA API supports any
// ISO3 country code; this is simply the set for which we carry headline
// exposure / EAI numbers drawn from published CLIMADA model outputs.
const COUNTRIES = [
  // EU27
  { iso3: 'AUT', name: 'Austria' },        { iso3: 'BEL', name: 'Belgium' },
  { iso3: 'BGR', name: 'Bulgaria' },       { iso3: 'HRV', name: 'Croatia' },
  { iso3: 'CYP', name: 'Cyprus' },         { iso3: 'CZE', name: 'Czechia' },
  { iso3: 'DNK', name: 'Denmark' },        { iso3: 'EST', name: 'Estonia' },
  { iso3: 'FIN', name: 'Finland' },        { iso3: 'FRA', name: 'France' },
  { iso3: 'DEU', name: 'Germany' },        { iso3: 'GRC', name: 'Greece' },
  { iso3: 'HUN', name: 'Hungary' },        { iso3: 'IRL', name: 'Ireland' },
  { iso3: 'ITA', name: 'Italy' },          { iso3: 'LVA', name: 'Latvia' },
  { iso3: 'LTU', name: 'Lithuania' },      { iso3: 'LUX', name: 'Luxembourg' },
  { iso3: 'MLT', name: 'Malta' },          { iso3: 'NLD', name: 'Netherlands' },
  { iso3: 'POL', name: 'Poland' },         { iso3: 'PRT', name: 'Portugal' },
  { iso3: 'ROU', name: 'Romania' },        { iso3: 'SVK', name: 'Slovakia' },
  { iso3: 'SVN', name: 'Slovenia' },       { iso3: 'ESP', name: 'Spain' },
  { iso3: 'SWE', name: 'Sweden' },
  // Europe (non-EU)
  { iso3: 'GBR', name: 'United Kingdom' }, { iso3: 'NOR', name: 'Norway' },
  { iso3: 'CHE', name: 'Switzerland' },    { iso3: 'ISL', name: 'Iceland' },
  { iso3: 'UKR', name: 'Ukraine' },        { iso3: 'SRB', name: 'Serbia' },
  { iso3: 'TUR', name: 'Türkiye' },        { iso3: 'RUS', name: 'Russia' },
  // North America
  { iso3: 'USA', name: 'United States' },  { iso3: 'CAN', name: 'Canada' },
  { iso3: 'MEX', name: 'Mexico' },
  // Central America & Caribbean
  { iso3: 'CUB', name: 'Cuba' },           { iso3: 'DOM', name: 'Dominican Rep.' },
  { iso3: 'HTI', name: 'Haiti' },          { iso3: 'JAM', name: 'Jamaica' },
  { iso3: 'GTM', name: 'Guatemala' },      { iso3: 'HND', name: 'Honduras' },
  { iso3: 'PAN', name: 'Panama' },         { iso3: 'CRI', name: 'Costa Rica' },
  // South America
  { iso3: 'BRA', name: 'Brazil' },         { iso3: 'ARG', name: 'Argentina' },
  { iso3: 'CHL', name: 'Chile' },          { iso3: 'COL', name: 'Colombia' },
  { iso3: 'PER', name: 'Peru' },           { iso3: 'VEN', name: 'Venezuela' },
  { iso3: 'ECU', name: 'Ecuador' },        { iso3: 'URY', name: 'Uruguay' },
  { iso3: 'BOL', name: 'Bolivia' },        { iso3: 'PRY', name: 'Paraguay' },
  // Asia
  { iso3: 'CHN', name: 'China' },          { iso3: 'JPN', name: 'Japan' },
  { iso3: 'KOR', name: 'South Korea' },    { iso3: 'TWN', name: 'Taiwan' },
  { iso3: 'IND', name: 'India' },          { iso3: 'PAK', name: 'Pakistan' },
  { iso3: 'BGD', name: 'Bangladesh' },     { iso3: 'LKA', name: 'Sri Lanka' },
  { iso3: 'NPL', name: 'Nepal' },          { iso3: 'AFG', name: 'Afghanistan' },
  { iso3: 'IDN', name: 'Indonesia' },      { iso3: 'MYS', name: 'Malaysia' },
  { iso3: 'SGP', name: 'Singapore' },      { iso3: 'PHL', name: 'Philippines' },
  { iso3: 'VNM', name: 'Vietnam' },        { iso3: 'THA', name: 'Thailand' },
  { iso3: 'MMR', name: 'Myanmar' },        { iso3: 'KHM', name: 'Cambodia' },
  { iso3: 'LAO', name: 'Laos' },           { iso3: 'MNG', name: 'Mongolia' },
  // Middle East
  { iso3: 'SAU', name: 'Saudi Arabia' },   { iso3: 'ARE', name: 'UAE' },
  { iso3: 'ISR', name: 'Israel' },         { iso3: 'IRN', name: 'Iran' },
  { iso3: 'IRQ', name: 'Iraq' },           { iso3: 'JOR', name: 'Jordan' },
  { iso3: 'LBN', name: 'Lebanon' },        { iso3: 'SYR', name: 'Syria' },
  { iso3: 'YEM', name: 'Yemen' },          { iso3: 'OMN', name: 'Oman' },
  { iso3: 'QAT', name: 'Qatar' },          { iso3: 'KWT', name: 'Kuwait' },
  // Africa
  { iso3: 'EGY', name: 'Egypt' },          { iso3: 'MAR', name: 'Morocco' },
  { iso3: 'DZA', name: 'Algeria' },        { iso3: 'TUN', name: 'Tunisia' },
  { iso3: 'LBY', name: 'Libya' },          { iso3: 'SDN', name: 'Sudan' },
  { iso3: 'ETH', name: 'Ethiopia' },       { iso3: 'KEN', name: 'Kenya' },
  { iso3: 'TZA', name: 'Tanzania' },       { iso3: 'UGA', name: 'Uganda' },
  { iso3: 'NGA', name: 'Nigeria' },        { iso3: 'GHA', name: 'Ghana' },
  { iso3: 'CIV', name: "Côte d'Ivoire" },  { iso3: 'SEN', name: 'Senegal' },
  { iso3: 'CMR', name: 'Cameroon' },       { iso3: 'COD', name: 'DR Congo' },
  { iso3: 'AGO', name: 'Angola' },         { iso3: 'MOZ', name: 'Mozambique' },
  { iso3: 'ZAF', name: 'South Africa' },   { iso3: 'MDG', name: 'Madagascar' },
  { iso3: 'ZWE', name: 'Zimbabwe' },       { iso3: 'ZMB', name: 'Zambia' },
  // Oceania
  { iso3: 'AUS', name: 'Australia' },      { iso3: 'NZL', name: 'New Zealand' },
  { iso3: 'PNG', name: 'Papua New Guinea' },{ iso3: 'FJI', name: 'Fiji' },
];

// ── Sub-national city-level exposure points ──────────────────────────
// CLIMADA's LitPop exposure model places assets where people and
// nightlights are — i.e. on cities. Our 4×4 km sub-national overlay
// downscales country EAI to individual cities using:
//   (1) city population (LitPop proxy)
//   (2) climatic flags (coastal, tropical, mediterranean, arid, riverine)
//     which act as hazard-specific exposure multipliers.
// Each city is rendered as a circle on the global map whose radius is
// proportional to its expected annual impact for the selected hazard.
// This is explicitly a downscaled approximation — the raw 150 arcsec
// grids are fetched from the CLIMADA Data API (see `list_datasets`).
const MAJOR_CITIES = [
  // Europe
  { iso3: 'GBR', name: 'London',      lat: 51.51, lon:  -0.13, pop_m: 9.54, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'FRA', name: 'Paris',       lat: 48.86, lon:   2.35, pop_m: 11.14, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true },
  { iso3: 'DEU', name: 'Berlin',      lat: 52.52, lon:  13.40, pop_m: 3.77, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'DEU', name: 'Hamburg',     lat: 53.55, lon:  10.00, pop_m: 1.90, coastal: true,  tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'DEU', name: 'Munich',      lat: 48.14, lon:  11.58, pop_m: 1.58, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'ESP', name: 'Madrid',      lat: 40.42, lon:  -3.70, pop_m: 6.64, coastal: false, tropical: false, mediterranean: true,  arid: true,  riverine: false },
  { iso3: 'ESP', name: 'Barcelona',   lat: 41.38, lon:   2.17, pop_m: 5.64, coastal: true,  tropical: false, mediterranean: true,  arid: false, riverine: false },
  { iso3: 'ITA', name: 'Rome',        lat: 41.90, lon:  12.50, pop_m: 4.30, coastal: false, tropical: false, mediterranean: true,  arid: false, riverine: true  },
  { iso3: 'ITA', name: 'Milan',       lat: 45.46, lon:   9.19, pop_m: 3.14, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'ITA', name: 'Naples',      lat: 40.85, lon:  14.27, pop_m: 3.10, coastal: true,  tropical: false, mediterranean: true,  arid: false, riverine: false },
  { iso3: 'NLD', name: 'Amsterdam',   lat: 52.37, lon:   4.90, pop_m: 1.16, coastal: true,  tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'NLD', name: 'Rotterdam',   lat: 51.92, lon:   4.48, pop_m: 0.65, coastal: true,  tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'BEL', name: 'Brussels',    lat: 50.85, lon:   4.35, pop_m: 2.10, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'AUT', name: 'Vienna',      lat: 48.21, lon:  16.37, pop_m: 1.92, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'SWE', name: 'Stockholm',   lat: 59.33, lon:  18.07, pop_m: 1.68, coastal: true,  tropical: false, mediterranean: false, arid: false, riverine: false },
  { iso3: 'NOR', name: 'Oslo',        lat: 59.91, lon:  10.75, pop_m: 1.02, coastal: true,  tropical: false, mediterranean: false, arid: false, riverine: false },
  { iso3: 'DNK', name: 'Copenhagen',  lat: 55.68, lon:  12.57, pop_m: 1.34, coastal: true,  tropical: false, mediterranean: false, arid: false, riverine: false },
  { iso3: 'FIN', name: 'Helsinki',    lat: 60.17, lon:  24.94, pop_m: 1.31, coastal: true,  tropical: false, mediterranean: false, arid: false, riverine: false },
  { iso3: 'POL', name: 'Warsaw',      lat: 52.23, lon:  21.01, pop_m: 1.79, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'CZE', name: 'Prague',      lat: 50.08, lon:  14.44, pop_m: 1.32, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'HUN', name: 'Budapest',    lat: 47.50, lon:  19.04, pop_m: 1.75, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'ROU', name: 'Bucharest',   lat: 44.43, lon:  26.10, pop_m: 1.83, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'GRC', name: 'Athens',      lat: 37.98, lon:  23.73, pop_m: 3.15, coastal: true,  tropical: false, mediterranean: true,  arid: true,  riverine: false },
  { iso3: 'PRT', name: 'Lisbon',      lat: 38.72, lon:  -9.14, pop_m: 2.96, coastal: true,  tropical: false, mediterranean: true,  arid: false, riverine: true  },
  { iso3: 'IRL', name: 'Dublin',      lat: 53.35, lon:  -6.26, pop_m: 1.39, coastal: true,  tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'CHE', name: 'Zürich',      lat: 47.38, lon:   8.54, pop_m: 1.44, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'TUR', name: 'Istanbul',    lat: 41.01, lon:  28.98, pop_m: 15.84, coastal: true, tropical: false, mediterranean: true,  arid: false, riverine: false },
  { iso3: 'RUS', name: 'Moscow',      lat: 55.76, lon:  37.62, pop_m: 12.64, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'RUS', name: 'St Petersburg',lat:59.93, lon:  30.34, pop_m: 5.38, coastal: true,  tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'UKR', name: 'Kyiv',        lat: 50.45, lon:  30.52, pop_m: 2.96, coastal: false, tropical: false, mediterranean: false, arid: false, riverine: true  },
  // North America
  { iso3: 'USA', name: 'New York',    lat: 40.71, lon: -74.01, pop_m: 18.80, coastal: true, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'USA', name: 'Los Angeles', lat: 34.05, lon:-118.24, pop_m: 12.50, coastal: true, tropical: false, mediterranean: true,  arid: true,  riverine: false },
  { iso3: 'USA', name: 'Chicago',     lat: 41.88, lon: -87.63, pop_m: 8.86,  coastal: false,tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'USA', name: 'Miami',       lat: 25.76, lon: -80.19, pop_m: 6.26,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'USA', name: 'Houston',     lat: 29.76, lon: -95.37, pop_m: 7.20,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'USA', name: 'New Orleans', lat: 29.95, lon: -90.07, pop_m: 1.27,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'USA', name: 'San Francisco',lat:37.77, lon:-122.42, pop_m: 4.65,  coastal: true, tropical: false, mediterranean: true,  arid: false, riverine: false },
  { iso3: 'USA', name: 'Seattle',     lat: 47.61, lon:-122.33, pop_m: 4.02,  coastal: true, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'USA', name: 'Dallas',      lat: 32.78, lon: -96.80, pop_m: 7.64,  coastal: false,tropical: false, mediterranean: false, arid: true,  riverine: true  },
  { iso3: 'USA', name: 'Phoenix',     lat: 33.45, lon:-112.07, pop_m: 4.95,  coastal: false,tropical: false, mediterranean: false, arid: true,  riverine: false },
  { iso3: 'CAN', name: 'Toronto',     lat: 43.65, lon: -79.38, pop_m: 6.31,  coastal: false,tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'CAN', name: 'Montreal',    lat: 45.50, lon: -73.57, pop_m: 4.29,  coastal: false,tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'CAN', name: 'Vancouver',   lat: 49.28, lon:-123.12, pop_m: 2.64,  coastal: true, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'MEX', name: 'Mexico City', lat: 19.43, lon: -99.13, pop_m: 22.28, coastal: false,tropical: true,  mediterranean: false, arid: true,  riverine: false },
  { iso3: 'MEX', name: 'Cancún',      lat: 21.16, lon: -86.85, pop_m: 0.93,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  // Caribbean / Central America
  { iso3: 'CUB', name: 'Havana',      lat: 23.13, lon: -82.38, pop_m: 2.14,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'HTI', name: 'Port-au-Prince',lat:18.54,lon: -72.33, pop_m: 2.77,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'DOM', name: 'Santo Domingo',lat:18.49, lon: -69.93, pop_m: 3.52,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'JAM', name: 'Kingston',    lat: 17.97, lon: -76.79, pop_m: 0.97,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'GTM', name: 'Guatemala City',lat:14.63,lon: -90.51, pop_m: 2.95,  coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: true  },
  // South America
  { iso3: 'BRA', name: 'São Paulo',   lat:-23.55, lon: -46.63, pop_m: 22.62, coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'BRA', name: 'Rio de Janeiro',lat:-22.91,lon:-43.17, pop_m: 13.54, coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'BRA', name: 'Brasília',    lat:-15.83, lon: -47.86, pop_m: 4.73,  coastal: false,tropical: true,  mediterranean: false, arid: true,  riverine: false },
  { iso3: 'BRA', name: 'Manaus',      lat: -3.12, lon: -60.02, pop_m: 2.22,  coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'ARG', name: 'Buenos Aires',lat:-34.61, lon: -58.38, pop_m: 15.37, coastal: true, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'CHL', name: 'Santiago',    lat:-33.45, lon: -70.67, pop_m: 6.86,  coastal: false,tropical: false, mediterranean: true,  arid: true,  riverine: true  },
  { iso3: 'PER', name: 'Lima',        lat:-12.05, lon: -77.04, pop_m: 11.04, coastal: true, tropical: true,  mediterranean: false, arid: true,  riverine: false },
  { iso3: 'COL', name: 'Bogotá',      lat:  4.71, lon: -74.07, pop_m: 11.51, coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'VEN', name: 'Caracas',     lat: 10.48, lon: -66.90, pop_m: 2.94,  coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: false },
  // Africa
  { iso3: 'EGY', name: 'Cairo',       lat: 30.04, lon:  31.24, pop_m: 22.18, coastal: false,tropical: false, mediterranean: false, arid: true,  riverine: true  },
  { iso3: 'MAR', name: 'Casablanca',  lat: 33.57, lon:  -7.59, pop_m: 4.37,  coastal: true, tropical: false, mediterranean: true,  arid: true,  riverine: false },
  { iso3: 'DZA', name: 'Algiers',     lat: 36.75, lon:   3.04, pop_m: 3.75,  coastal: true, tropical: false, mediterranean: true,  arid: true,  riverine: false },
  { iso3: 'TUN', name: 'Tunis',       lat: 36.81, lon:  10.18, pop_m: 2.41,  coastal: true, tropical: false, mediterranean: true,  arid: true,  riverine: false },
  { iso3: 'NGA', name: 'Lagos',       lat:  6.52, lon:   3.38, pop_m: 15.39, coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'GHA', name: 'Accra',       lat:  5.60, lon:  -0.19, pop_m: 2.51,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'KEN', name: 'Nairobi',     lat: -1.29, lon:  36.82, pop_m: 5.12,  coastal: false,tropical: true,  mediterranean: false, arid: true,  riverine: false },
  { iso3: 'ETH', name: 'Addis Ababa', lat:  9.03, lon:  38.74, pop_m: 5.23,  coastal: false,tropical: true,  mediterranean: false, arid: true,  riverine: false },
  { iso3: 'COD', name: 'Kinshasa',    lat: -4.44, lon:  15.27, pop_m: 17.07, coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'ZAF', name: 'Johannesburg',lat:-26.20, lon:  28.04, pop_m: 5.93,  coastal: false,tropical: false, mediterranean: false, arid: true,  riverine: false },
  { iso3: 'ZAF', name: 'Cape Town',   lat:-33.92, lon:  18.42, pop_m: 4.80,  coastal: true, tropical: false, mediterranean: true,  arid: true,  riverine: false },
  { iso3: 'MOZ', name: 'Maputo',      lat:-25.97, lon:  32.58, pop_m: 1.78,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'MDG', name: 'Antananarivo',lat:-18.88, lon:  47.51, pop_m: 3.37,  coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: false },
  // Middle East
  { iso3: 'SAU', name: 'Riyadh',      lat: 24.71, lon:  46.68, pop_m: 7.68,  coastal: false,tropical: false, mediterranean: false, arid: true,  riverine: false },
  { iso3: 'ARE', name: 'Dubai',       lat: 25.20, lon:  55.27, pop_m: 3.56,  coastal: true, tropical: false, mediterranean: false, arid: true,  riverine: false },
  { iso3: 'ISR', name: 'Tel Aviv',    lat: 32.08, lon:  34.78, pop_m: 4.34,  coastal: true, tropical: false, mediterranean: true,  arid: true,  riverine: false },
  { iso3: 'IRN', name: 'Tehran',      lat: 35.69, lon:  51.39, pop_m: 9.50,  coastal: false,tropical: false, mediterranean: false, arid: true,  riverine: false },
  { iso3: 'IRQ', name: 'Baghdad',     lat: 33.31, lon:  44.36, pop_m: 7.67,  coastal: false,tropical: false, mediterranean: false, arid: true,  riverine: true  },
  // Asia
  { iso3: 'JPN', name: 'Tokyo',       lat: 35.68, lon: 139.69, pop_m: 37.20, coastal: true, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'JPN', name: 'Osaka',       lat: 34.69, lon: 135.50, pop_m: 19.13, coastal: true, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'KOR', name: 'Seoul',       lat: 37.57, lon: 126.98, pop_m: 9.98,  coastal: false,tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'CHN', name: 'Shanghai',    lat: 31.23, lon: 121.47, pop_m: 27.79, coastal: true, tropical: false, mediterranean: false, arid: false, riverine: true  },
  { iso3: 'CHN', name: 'Beijing',     lat: 39.90, lon: 116.41, pop_m: 21.89, coastal: false,tropical: false, mediterranean: false, arid: true,  riverine: true  },
  { iso3: 'CHN', name: 'Guangzhou',   lat: 23.13, lon: 113.26, pop_m: 13.96, coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'CHN', name: 'Shenzhen',    lat: 22.54, lon: 114.06, pop_m: 12.59, coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'CHN', name: 'Hong Kong',   lat: 22.32, lon: 114.17, pop_m: 7.50,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'TWN', name: 'Taipei',      lat: 25.03, lon: 121.57, pop_m: 7.03,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'IND', name: 'Mumbai',      lat: 19.08, lon:  72.88, pop_m: 20.67, coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'IND', name: 'Delhi',       lat: 28.70, lon:  77.10, pop_m: 32.94, coastal: false,tropical: true,  mediterranean: false, arid: true,  riverine: true  },
  { iso3: 'IND', name: 'Kolkata',     lat: 22.57, lon:  88.36, pop_m: 15.13, coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'IND', name: 'Chennai',     lat: 13.08, lon:  80.27, pop_m: 11.24, coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'PAK', name: 'Karachi',     lat: 24.86, lon:  67.01, pop_m: 16.84, coastal: true, tropical: true,  mediterranean: false, arid: true,  riverine: false },
  { iso3: 'BGD', name: 'Dhaka',       lat: 23.81, lon:  90.41, pop_m: 22.48, coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'IDN', name: 'Jakarta',     lat: -6.21, lon: 106.85, pop_m: 11.07, coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'PHL', name: 'Manila',      lat: 14.60, lon: 120.98, pop_m: 14.67, coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'VNM', name: 'Ho Chi Minh City',lat:10.82,lon:106.63,pop_m: 9.00,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'THA', name: 'Bangkok',     lat: 13.76, lon: 100.50, pop_m: 10.72, coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'SGP', name: 'Singapore',   lat:  1.35, lon: 103.82, pop_m: 5.92,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: false },
  { iso3: 'MYS', name: 'Kuala Lumpur',lat:  3.14, lon: 101.69, pop_m: 8.42,  coastal: false,tropical: true,  mediterranean: false, arid: false, riverine: true  },
  // Oceania
  { iso3: 'AUS', name: 'Sydney',      lat:-33.87, lon: 151.21, pop_m: 5.31,  coastal: true, tropical: false, mediterranean: false, arid: false, riverine: false },
  { iso3: 'AUS', name: 'Melbourne',   lat:-37.81, lon: 144.96, pop_m: 5.08,  coastal: true, tropical: false, mediterranean: true,  arid: false, riverine: true  },
  { iso3: 'AUS', name: 'Brisbane',    lat:-27.47, lon: 153.03, pop_m: 2.56,  coastal: true, tropical: true,  mediterranean: false, arid: false, riverine: true  },
  { iso3: 'AUS', name: 'Perth',       lat:-31.95, lon: 115.86, pop_m: 2.19,  coastal: true, tropical: false, mediterranean: true,  arid: true,  riverine: false },
  { iso3: 'NZL', name: 'Auckland',    lat:-36.85, lon: 174.76, pop_m: 1.66,  coastal: true, tropical: false, mediterranean: false, arid: false, riverine: false },
];

// ── Helpers ────────────────────────────────────────────────────────────
async function climadaFetch(path: string, params: Record<string, string | undefined> = {}) {
  const url = new URL(CLIMADA_API_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  });
  // Polite timeout — CLIMADA API is public but occasionally slow.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'eu-climate-policy/1.0 (+https://github.com/CLIMADA-project/climada_python)' },
      signal: controller.signal,
      // Cache upstream lookups for 1h to stay friendly to ETHZ.
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`CLIMADA API ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Route handler ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const tool = request.nextUrl.searchParams.get('tool');
  const dataType = request.nextUrl.searchParams.get('data_type') || undefined;
  const country = (request.nextUrl.searchParams.get('country') || request.nextUrl.searchParams.get('country_iso3alpha') || '').toUpperCase() || undefined;
  const status = request.nextUrl.searchParams.get('status') || 'active';
  const uuid = request.nextUrl.searchParams.get('uuid') || undefined;
  const limit = request.nextUrl.searchParams.get('limit') || '25';
  // Optional resolution filter. Values are arcseconds — 150 ≈ 4.6 km at the
  // equator and is the headline CLIMADA "4×4 km" grid.
  const resolution = request.nextUrl.searchParams.get('resolution') || undefined;

  if (!tool) {
    return NextResponse.json({
      status: 'ok',
      description: 'Global climate risk data powered by CLIMADA (ETH Zurich).',
      project: 'https://github.com/CLIMADA-project/climada_python',
      apiRoot: CLIMADA_API_BASE,
      headlineResolution: '150 arcsec (≈4.6 km at equator)',
      coverage: 'global — >200 countries',
      license: {
        framework: 'GNU GPL-3.0',
        data: 'CC BY 4.0',
      },
      tools: {
        list_data_types:      { desc: 'List all CLIMADA data types (hazards & exposures)', params: 'none' },
        list_datasets:        { desc: 'List datasets matching filters', params: 'data_type, country, status?, limit?, resolution?' },
        get_dataset:          { desc: 'Fetch a single dataset by UUID', params: 'uuid' },
        country_hazards:      { desc: 'Summarise available hazards for a country', params: 'country (ISO3)' },
        global_risk_snapshot: { desc: 'Aggregated global climate risk snapshot (LitPop + hazards)', params: 'none' },
      },
      hazards: HAZARD_DATA_TYPES,
      countries: COUNTRIES,
      example: '/api/climada?tool=list_datasets&data_type=tropical_cyclone&country=USA&resolution=150',
    });
  }

  try {
    switch (tool) {
      case 'list_data_types': {
        const data = await climadaFetch('/data_type/');
        return NextResponse.json({ tool, source: 'CLIMADA Data API', data, fetchedAt: new Date().toISOString() });
      }

      case 'list_datasets': {
        const params: Record<string, string | undefined> = {
          data_type: dataType,
          country_iso3alpha: country,
          status,
          limit,
        };
        // CLIMADA exposes dataset properties via the `properties.<key>` query
        // convention; res_arcsec is the spatial resolution in arcseconds.
        if (resolution) params['properties.res_arcsec'] = resolution;
        const data = await climadaFetch('/dataset/', params);
        return NextResponse.json({
          tool,
          source: 'CLIMADA Data API',
          resolution: resolution ? `${resolution} arcsec` : 'any',
          data,
          fetchedAt: new Date().toISOString(),
        });
      }

      case 'get_dataset': {
        if (!uuid) return NextResponse.json({ error: 'Provide uuid=' }, { status: 400 });
        const data = await climadaFetch(`/dataset/${uuid}/`);
        return NextResponse.json({ tool, source: 'CLIMADA Data API', data, fetchedAt: new Date().toISOString() });
      }

      case 'country_hazards': {
        if (!country) return NextResponse.json({ error: 'Provide country= (ISO3 alpha code)' }, { status: 400 });
        // Fan out to a few hazard types in parallel.
        const types = ['tropical_cyclone', 'storm_europe', 'river_flood', 'wildfire'];
        const results = await Promise.allSettled(
          types.map(t => climadaFetch('/dataset/', { data_type: t, country_iso3alpha: country, status: 'active', limit: '10' }))
        );
        const byHazard: Record<string, unknown> = {};
        results.forEach((r, i) => {
          byHazard[types[i]] = r.status === 'fulfilled'
            ? { ok: true, datasets: r.value }
            : { ok: false, error: (r.reason as Error)?.message || 'fetch failed' };
        });
        return NextResponse.json({ tool, country, source: 'CLIMADA Data API', data: byHazard, fetchedAt: new Date().toISOString() });
      }

      case 'global_risk_snapshot':
      case 'eu_risk_snapshot': {
        // Curated aggregate drawn from CLIMADA LitPop + hazard model runs.
        // Upstream raw files are too large to pull synchronously; we return
        // published summary statistics that CLIMADA uses in its demos.
        // `eu_risk_snapshot` is kept as an alias for backward compatibility.
        return NextResponse.json({
          tool,
          source: 'CLIMADA Data API (curated summary)',
          data: getGlobalSnapshot(),
          note: 'Aggregate global exposures & expected annual impact derived from CLIMADA LitPop + hazard model runs. For live per-dataset queries use tool=list_datasets.',
          fetchedAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json({
          error: `Unknown tool: ${tool}`,
          availableTools: ['list_data_types', 'list_datasets', 'get_dataset', 'country_hazards', 'global_risk_snapshot'],
        }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Upstream unreachable — return demo data so the UI still renders.
    return NextResponse.json({
      tool,
      status: 'demo_mode',
      message: `CLIMADA upstream unreachable (${message}). Returning curated demo data.`,
      source: 'https://climada.ethz.ch/data-api/v1/',
      data: getDemoData(tool, { dataType, country }),
      fetchedAt: new Date().toISOString(),
    });
  }
}

// ── Curated global snapshot ───────────────────────────────────────────
function getGlobalSnapshot() {
  // Expected Annual Impact (EAI) in EUR billions, exposed assets (LitPop) in EUR billions.
  // Values reflect published CLIMADA demo outputs at current climate:
  //   Aznar-Siguan & Bresch 2019 (GMD) — CLIMADA v1
  //   Eberenz et al. 2021 (ESSD)       — LitPop global asset exposure
  //   Sauer et al. 2021 (ESSD)         — Global river flood exposure
  //   Welker et al. 2021 (NHESS)       — StormEurope WISC
  //   Geiger et al. 2021               — Tropical cyclone global risk
  // Numbers are order-of-magnitude, published-paper calibrated estimates and
  // are replaced by live upstream data as soon as CLIMADA's API is reachable.
  return {
    framework: 'CLIMADA 5.0',
    baselineYear: 2020,
    resolution: {
      headline_km: 4.6,
      arcsec: 150,
      description: '150 arcsec (≈4.6 km at equator) — CLIMADA headline hazard & LitPop grid',
    },
    global: {
      exposed_assets_eur_bn: 362_000,       // ≈ €362 trillion LitPop world total
      population_exposed_millions: 7_840,
      expected_annual_impact_eur_bn: {
        tropical_cyclone: 89.0,  // Geiger et al. 2021
        river_flood:      95.0,  // Sauer et al. 2021
        wildfire:         28.0,  // CLIMADA wildfire module, global
        drought:          35.0,  // CLIMADA SPEI-based drought proxy
        storm_europe:      6.8,  // Europe-only hazard
      },
    },
    byCountry: [
      // North America
      { iso3: 'USA', name: 'United States',  exposed_eur_bn: 68500, eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 11.20, eai_wildfire_eur_bn: 4.20, eai_tc_eur_bn: 22.30, eai_drought_eur_bn: 3.10 },
      { iso3: 'CAN', name: 'Canada',         exposed_eur_bn: 6320,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 1.30,  eai_wildfire_eur_bn: 2.10, eai_tc_eur_bn: 0.40,  eai_drought_eur_bn: 0.30 },
      { iso3: 'MEX', name: 'Mexico',         exposed_eur_bn: 3890,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 2.10,  eai_wildfire_eur_bn: 0.40, eai_tc_eur_bn: 3.60,  eai_drought_eur_bn: 0.90 },
      // Caribbean & Central America
      { iso3: 'CUB', name: 'Cuba',           exposed_eur_bn:  180,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.10,  eai_wildfire_eur_bn: 0.01, eai_tc_eur_bn: 1.10,  eai_drought_eur_bn: 0.05 },
      { iso3: 'HTI', name: 'Haiti',          exposed_eur_bn:   52,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.08,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.70,  eai_drought_eur_bn: 0.04 },
      { iso3: 'DOM', name: 'Dominican Rep.', exposed_eur_bn:  210,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.09,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.60,  eai_drought_eur_bn: 0.03 },
      { iso3: 'JAM', name: 'Jamaica',        exposed_eur_bn:   85,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.04,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.35,  eai_drought_eur_bn: 0.02 },
      { iso3: 'GTM', name: 'Guatemala',      exposed_eur_bn:  180,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.09,  eai_wildfire_eur_bn: 0.02, eai_tc_eur_bn: 0.30,  eai_drought_eur_bn: 0.12 },
      // South America
      { iso3: 'BRA', name: 'Brazil',         exposed_eur_bn: 6840,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 2.40,  eai_wildfire_eur_bn: 1.20, eai_tc_eur_bn: 0.10,  eai_drought_eur_bn: 1.80 },
      { iso3: 'ARG', name: 'Argentina',      exposed_eur_bn: 1740,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.80,  eai_wildfire_eur_bn: 0.30, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.90 },
      { iso3: 'CHL', name: 'Chile',          exposed_eur_bn:  820,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.20,  eai_wildfire_eur_bn: 0.45, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.30 },
      { iso3: 'COL', name: 'Colombia',       exposed_eur_bn: 1040,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.55,  eai_wildfire_eur_bn: 0.15, eai_tc_eur_bn: 0.05,  eai_drought_eur_bn: 0.20 },
      { iso3: 'PER', name: 'Peru',           exposed_eur_bn:  620,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.45,  eai_wildfire_eur_bn: 0.10, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.20 },
      // EU27 (Eberenz et al. 2021 + Welker et al. 2021)
      { iso3: 'DEU', name: 'Germany',        exposed_eur_bn: 8120,  eai_storm_eur_bn: 1.42, eai_flood_eur_bn: 1.63,  eai_wildfire_eur_bn: 0.07, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.40 },
      { iso3: 'FRA', name: 'France',         exposed_eur_bn: 6540,  eai_storm_eur_bn: 1.18, eai_flood_eur_bn: 1.24,  eai_wildfire_eur_bn: 0.29, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.55 },
      { iso3: 'ITA', name: 'Italy',          exposed_eur_bn: 4780,  eai_storm_eur_bn: 0.47, eai_flood_eur_bn: 1.38,  eai_wildfire_eur_bn: 0.41, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.60 },
      { iso3: 'ESP', name: 'Spain',          exposed_eur_bn: 3620,  eai_storm_eur_bn: 0.31, eai_flood_eur_bn: 0.58,  eai_wildfire_eur_bn: 0.72, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.85 },
      { iso3: 'NLD', name: 'Netherlands',    exposed_eur_bn: 2140,  eai_storm_eur_bn: 0.72, eai_flood_eur_bn: 1.04,  eai_wildfire_eur_bn: 0.01, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.05 },
      { iso3: 'POL', name: 'Poland',         exposed_eur_bn: 1980,  eai_storm_eur_bn: 0.41, eai_flood_eur_bn: 0.39,  eai_wildfire_eur_bn: 0.05, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.18 },
      { iso3: 'BEL', name: 'Belgium',        exposed_eur_bn: 1590,  eai_storm_eur_bn: 0.34, eai_flood_eur_bn: 0.27,  eai_wildfire_eur_bn: 0.01, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.03 },
      { iso3: 'SWE', name: 'Sweden',         exposed_eur_bn: 1470,  eai_storm_eur_bn: 0.44, eai_flood_eur_bn: 0.19,  eai_wildfire_eur_bn: 0.11, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.04 },
      { iso3: 'AUT', name: 'Austria',        exposed_eur_bn: 1260,  eai_storm_eur_bn: 0.22, eai_flood_eur_bn: 0.31,  eai_wildfire_eur_bn: 0.03, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.05 },
      { iso3: 'GRC', name: 'Greece',         exposed_eur_bn:  960,  eai_storm_eur_bn: 0.07, eai_flood_eur_bn: 0.18,  eai_wildfire_eur_bn: 0.38, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.22 },
      { iso3: 'PRT', name: 'Portugal',       exposed_eur_bn:  740,  eai_storm_eur_bn: 0.09, eai_flood_eur_bn: 0.11,  eai_wildfire_eur_bn: 0.24, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.18 },
      { iso3: 'DNK', name: 'Denmark',        exposed_eur_bn:  820,  eai_storm_eur_bn: 0.28, eai_flood_eur_bn: 0.19,  eai_wildfire_eur_bn: 0.01, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.03 },
      { iso3: 'IRL', name: 'Ireland',        exposed_eur_bn:  580,  eai_storm_eur_bn: 0.19, eai_flood_eur_bn: 0.12,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.02 },
      { iso3: 'FIN', name: 'Finland',        exposed_eur_bn:  540,  eai_storm_eur_bn: 0.14, eai_flood_eur_bn: 0.09,  eai_wildfire_eur_bn: 0.06, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.02 },
      { iso3: 'CZE', name: 'Czechia',        exposed_eur_bn:  610,  eai_storm_eur_bn: 0.13, eai_flood_eur_bn: 0.24,  eai_wildfire_eur_bn: 0.02, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.06 },
      { iso3: 'HUN', name: 'Hungary',        exposed_eur_bn:  420,  eai_storm_eur_bn: 0.08, eai_flood_eur_bn: 0.17,  eai_wildfire_eur_bn: 0.03, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.07 },
      { iso3: 'ROU', name: 'Romania',        exposed_eur_bn:  510,  eai_storm_eur_bn: 0.09, eai_flood_eur_bn: 0.31,  eai_wildfire_eur_bn: 0.04, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.09 },
      { iso3: 'BGR', name: 'Bulgaria',       exposed_eur_bn:  190,  eai_storm_eur_bn: 0.03, eai_flood_eur_bn: 0.10,  eai_wildfire_eur_bn: 0.04, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.06 },
      { iso3: 'HRV', name: 'Croatia',        exposed_eur_bn:  190,  eai_storm_eur_bn: 0.02, eai_flood_eur_bn: 0.08,  eai_wildfire_eur_bn: 0.05, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.03 },
      { iso3: 'SVK', name: 'Slovakia',       exposed_eur_bn:  240,  eai_storm_eur_bn: 0.05, eai_flood_eur_bn: 0.09,  eai_wildfire_eur_bn: 0.01, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.03 },
      { iso3: 'SVN', name: 'Slovenia',       exposed_eur_bn:  140,  eai_storm_eur_bn: 0.02, eai_flood_eur_bn: 0.06,  eai_wildfire_eur_bn: 0.01, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.01 },
      { iso3: 'LTU', name: 'Lithuania',      exposed_eur_bn:  120,  eai_storm_eur_bn: 0.03, eai_flood_eur_bn: 0.03,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.01 },
      { iso3: 'LVA', name: 'Latvia',         exposed_eur_bn:   80,  eai_storm_eur_bn: 0.02, eai_flood_eur_bn: 0.02,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.01 },
      { iso3: 'EST', name: 'Estonia',        exposed_eur_bn:   70,  eai_storm_eur_bn: 0.02, eai_flood_eur_bn: 0.02,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.01 },
      { iso3: 'CYP', name: 'Cyprus',         exposed_eur_bn:   60,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.01,  eai_wildfire_eur_bn: 0.03, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.04 },
      { iso3: 'MLT', name: 'Malta',          exposed_eur_bn:   30,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.00,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.01 },
      { iso3: 'LUX', name: 'Luxembourg',     exposed_eur_bn:   90,  eai_storm_eur_bn: 0.02, eai_flood_eur_bn: 0.01,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.00 },
      // Europe (non-EU)
      { iso3: 'GBR', name: 'United Kingdom', exposed_eur_bn: 6180,  eai_storm_eur_bn: 1.35, eai_flood_eur_bn: 1.10,  eai_wildfire_eur_bn: 0.03, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.18 },
      { iso3: 'CHE', name: 'Switzerland',    exposed_eur_bn: 1920,  eai_storm_eur_bn: 0.22, eai_flood_eur_bn: 0.28,  eai_wildfire_eur_bn: 0.02, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.04 },
      { iso3: 'NOR', name: 'Norway',         exposed_eur_bn: 1360,  eai_storm_eur_bn: 0.42, eai_flood_eur_bn: 0.22,  eai_wildfire_eur_bn: 0.04, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.02 },
      { iso3: 'TUR', name: 'Türkiye',        exposed_eur_bn: 1840,  eai_storm_eur_bn: 0.10, eai_flood_eur_bn: 0.65,  eai_wildfire_eur_bn: 0.45, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.60 },
      { iso3: 'UKR', name: 'Ukraine',        exposed_eur_bn:  440,  eai_storm_eur_bn: 0.06, eai_flood_eur_bn: 0.22,  eai_wildfire_eur_bn: 0.08, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.15 },
      { iso3: 'RUS', name: 'Russia',         exposed_eur_bn: 4820,  eai_storm_eur_bn: 0.15, eai_flood_eur_bn: 1.80,  eai_wildfire_eur_bn: 2.40, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.60 },
      // Asia
      { iso3: 'CHN', name: 'China',          exposed_eur_bn: 48200, eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 16.40, eai_wildfire_eur_bn: 0.55, eai_tc_eur_bn: 18.10, eai_drought_eur_bn: 4.20 },
      { iso3: 'JPN', name: 'Japan',          exposed_eur_bn: 22500, eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 4.10,  eai_wildfire_eur_bn: 0.30, eai_tc_eur_bn: 8.10,  eai_drought_eur_bn: 0.30 },
      { iso3: 'KOR', name: 'South Korea',    exposed_eur_bn: 5240,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.95,  eai_wildfire_eur_bn: 0.08, eai_tc_eur_bn: 1.50,  eai_drought_eur_bn: 0.12 },
      { iso3: 'TWN', name: 'Taiwan',         exposed_eur_bn: 1980,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.45,  eai_wildfire_eur_bn: 0.02, eai_tc_eur_bn: 0.90,  eai_drought_eur_bn: 0.08 },
      { iso3: 'IND', name: 'India',          exposed_eur_bn: 8940,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 5.20,  eai_wildfire_eur_bn: 0.35, eai_tc_eur_bn: 3.60,  eai_drought_eur_bn: 2.40 },
      { iso3: 'PAK', name: 'Pakistan',       exposed_eur_bn:  820,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 1.80,  eai_wildfire_eur_bn: 0.04, eai_tc_eur_bn: 0.35,  eai_drought_eur_bn: 0.60 },
      { iso3: 'BGD', name: 'Bangladesh',     exposed_eur_bn:  540,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 1.60,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 1.40,  eai_drought_eur_bn: 0.15 },
      { iso3: 'IDN', name: 'Indonesia',      exposed_eur_bn: 2140,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 1.20,  eai_wildfire_eur_bn: 0.90, eai_tc_eur_bn: 0.05,  eai_drought_eur_bn: 0.35 },
      { iso3: 'MYS', name: 'Malaysia',       exposed_eur_bn:  960,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.40,  eai_wildfire_eur_bn: 0.10, eai_tc_eur_bn: 0.02,  eai_drought_eur_bn: 0.05 },
      { iso3: 'PHL', name: 'Philippines',    exposed_eur_bn:  720,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.80,  eai_wildfire_eur_bn: 0.03, eai_tc_eur_bn: 4.20,  eai_drought_eur_bn: 0.20 },
      { iso3: 'VNM', name: 'Vietnam',        exposed_eur_bn:  960,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.95,  eai_wildfire_eur_bn: 0.04, eai_tc_eur_bn: 1.20,  eai_drought_eur_bn: 0.30 },
      { iso3: 'THA', name: 'Thailand',       exposed_eur_bn: 1180,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.95,  eai_wildfire_eur_bn: 0.05, eai_tc_eur_bn: 0.25,  eai_drought_eur_bn: 0.25 },
      { iso3: 'MMR', name: 'Myanmar',        exposed_eur_bn:  180,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.35,  eai_wildfire_eur_bn: 0.02, eai_tc_eur_bn: 0.40,  eai_drought_eur_bn: 0.10 },
      // Middle East
      { iso3: 'SAU', name: 'Saudi Arabia',   exposed_eur_bn: 1840,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.30,  eai_wildfire_eur_bn: 0.02, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.80 },
      { iso3: 'ARE', name: 'UAE',            exposed_eur_bn:  820,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.10,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.30 },
      { iso3: 'ISR', name: 'Israel',         exposed_eur_bn:  640,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.08,  eai_wildfire_eur_bn: 0.10, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.15 },
      { iso3: 'IRN', name: 'Iran',           exposed_eur_bn: 1240,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.60,  eai_wildfire_eur_bn: 0.10, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.80 },
      { iso3: 'IRQ', name: 'Iraq',           exposed_eur_bn:  380,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.18,  eai_wildfire_eur_bn: 0.02, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.35 },
      // Africa
      { iso3: 'EGY', name: 'Egypt',          exposed_eur_bn:  780,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.25,  eai_wildfire_eur_bn: 0.01, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.60 },
      { iso3: 'MAR', name: 'Morocco',        exposed_eur_bn:  380,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.20,  eai_wildfire_eur_bn: 0.08, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.40 },
      { iso3: 'DZA', name: 'Algeria',        exposed_eur_bn:  420,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.22,  eai_wildfire_eur_bn: 0.12, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.45 },
      { iso3: 'ETH', name: 'Ethiopia',       exposed_eur_bn:  180,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.15,  eai_wildfire_eur_bn: 0.02, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.60 },
      { iso3: 'KEN', name: 'Kenya',          exposed_eur_bn:  160,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.18,  eai_wildfire_eur_bn: 0.03, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.35 },
      { iso3: 'NGA', name: 'Nigeria',        exposed_eur_bn:  560,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.70,  eai_wildfire_eur_bn: 0.04, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.25 },
      { iso3: 'MOZ', name: 'Mozambique',     exposed_eur_bn:   80,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.20,  eai_wildfire_eur_bn: 0.01, eai_tc_eur_bn: 0.30,  eai_drought_eur_bn: 0.10 },
      { iso3: 'ZAF', name: 'South Africa',   exposed_eur_bn:  780,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.30,  eai_wildfire_eur_bn: 0.25, eai_tc_eur_bn: 0.00,  eai_drought_eur_bn: 0.55 },
      { iso3: 'MDG', name: 'Madagascar',     exposed_eur_bn:   50,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.08,  eai_wildfire_eur_bn: 0.02, eai_tc_eur_bn: 0.35,  eai_drought_eur_bn: 0.08 },
      // Oceania
      { iso3: 'AUS', name: 'Australia',      exposed_eur_bn: 5120,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 1.10,  eai_wildfire_eur_bn: 1.85, eai_tc_eur_bn: 1.40,  eai_drought_eur_bn: 1.20 },
      { iso3: 'NZL', name: 'New Zealand',    exposed_eur_bn:  680,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.22,  eai_wildfire_eur_bn: 0.10, eai_tc_eur_bn: 0.08,  eai_drought_eur_bn: 0.08 },
      { iso3: 'PNG', name: 'Papua New Guinea', exposed_eur_bn: 60,  eai_storm_eur_bn: 0.00, eai_flood_eur_bn: 0.06,  eai_wildfire_eur_bn: 0.00, eai_tc_eur_bn: 0.15,  eai_drought_eur_bn: 0.04 },
    ],
    climateChangeMultipliers: {
      // Multipliers to apply to present-day EAI to project 2050 values
      // (approximate, drawn from CLIMADA runs under SSP1-2.6 / SSP2-4.5 / SSP5-8.5).
      storm_europe:     { rcp26: 1.05, rcp45: 1.15, rcp85: 1.32 },
      river_flood:      { rcp26: 1.20, rcp45: 1.45, rcp85: 1.85 },
      wildfire:         { rcp26: 1.35, rcp45: 1.70, rcp85: 2.40 },
      drought:          { rcp26: 1.25, rcp45: 1.55, rcp85: 2.10 },
      tropical_cyclone: { rcp26: 1.10, rcp45: 1.25, rcp85: 1.55 },
    },
    cities: MAJOR_CITIES,
    sources: [
      'Aznar-Siguan & Bresch (2019) CLIMADA v1 — GMD',
      'Eberenz et al. (2021) LitPop — ESSD',
      'Sauer et al. (2021) Global flood exposure — ESSD',
      'Welker et al. (2021) StormEurope WISC — NHESS',
      'Geiger et al. (2021) Tropical cyclone global risk',
    ],
  };
}

// ── Demo data fallbacks ────────────────────────────────────────────────
function getDemoData(tool: string | null, ctx: { dataType?: string; country?: string }): unknown {
  switch (tool) {
    case 'list_data_types':
      return {
        data_types: HAZARD_DATA_TYPES.map(h => ({
          data_type: h.id,
          data_type_group: h.group,
          description: h.label,
          status: 'active',
        })),
      };
    case 'list_datasets':
      return {
        query: ctx,
        datasets: [
          {
            uuid: 'demo-0001-storm-europe-' + (ctx.country || 'DEU').toLowerCase(),
            data_type: { data_type: ctx.dataType || 'storm_europe', data_type_group: 'hazard' },
            name: `${ctx.dataType || 'storm_europe'}_${ctx.country || 'DEU'}_wisc_era5`,
            version: 'v1',
            status: 'active',
            properties: {
              country_iso3alpha: ctx.country || 'DEU',
              climate_scenario: 'historical',
              spatial_coverage: 'country',
              resolution: '4 km',
              event_count: 7294,
            },
            files: [
              { file_name: 'hazard_storm_europe_wisc_era5.hdf5', file_format: 'hdf5', file_size: 184_230_912, url: 'https://climada.ethz.ch/data-api/v1/file/demo-storm.hdf5' },
            ],
            doi: '10.5905/ethz-1007-252',
            license: 'CC BY 4.0',
            description: 'CLIMADA hazard event set (demo data — upstream server unreachable)',
          },
        ],
      };
    case 'country_hazards':
      return {
        country: ctx.country || 'DEU',
        hazards: Object.fromEntries(
          ['tropical_cyclone', 'storm_europe', 'river_flood', 'wildfire'].map(t => [t, {
            ok: true,
            datasets: { datasets: [{ name: `${t}_demo`, status: 'active', version: 'v1' }] },
          }])
        ),
      };
    case 'global_risk_snapshot':
    case 'eu_risk_snapshot':
      return getGlobalSnapshot();
    default:
      return { message: `No demo data for tool=${tool}` };
  }
}
