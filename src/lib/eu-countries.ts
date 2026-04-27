/**
 * EU-27 + NO + CH + GB country metadata used by the Energy System
 * Modelling method page. Values are 2030 reference projections from
 * ENTSO-E TYNDP 2022, EMBER European Electricity Review 2024 and the
 * European Commission Impact Assessment for the 2040 Climate Target.
 *
 * Keep this list in sync with `pypsa-service/app/eu_countries.py`
 * where the same country set defines the 30-bus LP network.
 */

export type EuCountry = {
  iso2: string;          // ENTSO-E bidding-zone code (2 letters)
  iso3: string;          // ISO-3 code, matches Natural Earth GeoJSON
  name: string;
  lat: number;           // approximate centroid
  lon: number;
  demand_twh: number;    // annual electricity demand, TWh/yr (2030 ref)
  capital: string;
  capitalLat: number;
  capitalLon: number;
  windOnshoreScale: number;   // climatological onshore-wind CF adjustment
  windOffshoreScale: number;  // offshore-wind CF adjustment (0 = landlocked)
  solarScale: number;         // solar CF climate multiplier
  hydroTwh: number;           // hydro generation TWh/yr (2020-2022)
  coastal: boolean;           // has offshore wind potential
};

export const EU_COUNTRIES: EuCountry[] = [
  { iso2: 'AT', iso3: 'AUT', name: 'Austria',        lat: 47.5, lon: 14.5, demand_twh:  75, capital: 'Vienna',     capitalLat: 48.21, capitalLon: 16.37, windOnshoreScale: 0.75, windOffshoreScale: 0.00, solarScale: 0.88, hydroTwh: 42.0, coastal: false },
  { iso2: 'BE', iso3: 'BEL', name: 'Belgium',        lat: 50.5, lon:  4.5, demand_twh:  92, capital: 'Brussels',   capitalLat: 50.85, capitalLon:  4.35, windOnshoreScale: 0.90, windOffshoreScale: 1.05, solarScale: 0.90, hydroTwh: 0.4, coastal: true },
  { iso2: 'BG', iso3: 'BGR', name: 'Bulgaria',       lat: 42.7, lon: 25.5, demand_twh:  38, capital: 'Sofia',      capitalLat: 42.70, capitalLon: 23.32, windOnshoreScale: 0.80, windOffshoreScale: 0.75, solarScale: 1.10, hydroTwh: 4.8, coastal: true },
  { iso2: 'HR', iso3: 'HRV', name: 'Croatia',        lat: 45.2, lon: 16.0, demand_twh:  19, capital: 'Zagreb',     capitalLat: 45.81, capitalLon: 15.98, windOnshoreScale: 0.80, windOffshoreScale: 0.75, solarScale: 1.05, hydroTwh: 6.5, coastal: true },
  { iso2: 'CY', iso3: 'CYP', name: 'Cyprus',         lat: 35.1, lon: 33.4, demand_twh:   6, capital: 'Nicosia',    capitalLat: 35.18, capitalLon: 33.38, windOnshoreScale: 0.70, windOffshoreScale: 0.90, solarScale: 1.35, hydroTwh: 0.0, coastal: true },
  { iso2: 'CZ', iso3: 'CZE', name: 'Czechia',        lat: 49.8, lon: 15.5, demand_twh:  75, capital: 'Prague',     capitalLat: 50.08, capitalLon: 14.42, windOnshoreScale: 0.80, windOffshoreScale: 0.00, solarScale: 0.85, hydroTwh: 1.9, coastal: false },
  { iso2: 'DK', iso3: 'DNK', name: 'Denmark',        lat: 56.0, lon:  9.5, demand_twh:  42, capital: 'Copenhagen', capitalLat: 55.68, capitalLon: 12.57, windOnshoreScale: 1.15, windOffshoreScale: 1.35, solarScale: 0.85, hydroTwh: 0.02, coastal: true },
  { iso2: 'EE', iso3: 'EST', name: 'Estonia',        lat: 58.8, lon: 25.5, demand_twh:  10, capital: 'Tallinn',    capitalLat: 59.44, capitalLon: 24.75, windOnshoreScale: 1.00, windOffshoreScale: 1.05, solarScale: 0.75, hydroTwh: 0.03, coastal: true },
  { iso2: 'FI', iso3: 'FIN', name: 'Finland',        lat: 63.5, lon: 26.0, demand_twh: 100, capital: 'Helsinki',   capitalLat: 60.17, capitalLon: 24.94, windOnshoreScale: 0.95, windOffshoreScale: 1.05, solarScale: 0.70, hydroTwh: 14.5, coastal: true },
  { iso2: 'FR', iso3: 'FRA', name: 'France',         lat: 46.5, lon:  2.5, demand_twh: 505, capital: 'Paris',      capitalLat: 48.85, capitalLon:  2.35, windOnshoreScale: 0.92, windOffshoreScale: 1.10, solarScale: 1.00, hydroTwh: 58.0, coastal: true },
  { iso2: 'DE', iso3: 'DEU', name: 'Germany',        lat: 51.0, lon: 10.5, demand_twh: 620, capital: 'Berlin',     capitalLat: 52.52, capitalLon: 13.40, windOnshoreScale: 0.95, windOffshoreScale: 1.20, solarScale: 0.92, hydroTwh: 18.5, coastal: true },
  { iso2: 'GR', iso3: 'GRC', name: 'Greece',         lat: 39.0, lon: 22.5, demand_twh:  58, capital: 'Athens',     capitalLat: 37.98, capitalLon: 23.73, windOnshoreScale: 0.85, windOffshoreScale: 0.95, solarScale: 1.30, hydroTwh: 4.2, coastal: true },
  { iso2: 'HU', iso3: 'HUN', name: 'Hungary',        lat: 47.2, lon: 19.5, demand_twh:  48, capital: 'Budapest',   capitalLat: 47.50, capitalLon: 19.04, windOnshoreScale: 0.70, windOffshoreScale: 0.00, solarScale: 0.95, hydroTwh: 0.2, coastal: false },
  { iso2: 'IE', iso3: 'IRL', name: 'Ireland',        lat: 53.1, lon: -8.0, demand_twh:  33, capital: 'Dublin',     capitalLat: 53.35, capitalLon: -6.26, windOnshoreScale: 1.20, windOffshoreScale: 1.30, solarScale: 0.78, hydroTwh: 0.7, coastal: true },
  { iso2: 'IT', iso3: 'ITA', name: 'Italy',          lat: 42.5, lon: 12.5, demand_twh: 335, capital: 'Rome',       capitalLat: 41.90, capitalLon: 12.50, windOnshoreScale: 0.82, windOffshoreScale: 0.85, solarScale: 1.15, hydroTwh: 48.0, coastal: true },
  { iso2: 'LV', iso3: 'LVA', name: 'Latvia',         lat: 56.9, lon: 24.6, demand_twh:   8, capital: 'Riga',       capitalLat: 56.95, capitalLon: 24.11, windOnshoreScale: 0.95, windOffshoreScale: 1.00, solarScale: 0.78, hydroTwh: 2.8, coastal: true },
  { iso2: 'LT', iso3: 'LTU', name: 'Lithuania',      lat: 55.2, lon: 23.9, demand_twh:  13, capital: 'Vilnius',    capitalLat: 54.69, capitalLon: 25.28, windOnshoreScale: 0.92, windOffshoreScale: 1.00, solarScale: 0.80, hydroTwh: 0.9, coastal: true },
  { iso2: 'LU', iso3: 'LUX', name: 'Luxembourg',     lat: 49.8, lon:  6.1, demand_twh:   8, capital: 'Luxembourg', capitalLat: 49.61, capitalLon:  6.13, windOnshoreScale: 0.80, windOffshoreScale: 0.00, solarScale: 0.88, hydroTwh: 0.1, coastal: false },
  { iso2: 'MT', iso3: 'MLT', name: 'Malta',          lat: 35.9, lon: 14.4, demand_twh:   3, capital: 'Valletta',   capitalLat: 35.90, capitalLon: 14.51, windOnshoreScale: 0.65, windOffshoreScale: 0.80, solarScale: 1.35, hydroTwh: 0.0, coastal: true },
  { iso2: 'NL', iso3: 'NLD', name: 'Netherlands',    lat: 52.1, lon:  5.4, demand_twh: 128, capital: 'Amsterdam',  capitalLat: 52.37, capitalLon:  4.90, windOnshoreScale: 1.05, windOffshoreScale: 1.30, solarScale: 0.90, hydroTwh: 0.04, coastal: true },
  { iso2: 'PL', iso3: 'POL', name: 'Poland',         lat: 52.0, lon: 19.5, demand_twh: 188, capital: 'Warsaw',     capitalLat: 52.23, capitalLon: 21.01, windOnshoreScale: 0.88, windOffshoreScale: 1.05, solarScale: 0.85, hydroTwh: 2.3, coastal: true },
  { iso2: 'PT', iso3: 'PRT', name: 'Portugal',       lat: 39.5, lon: -8.0, demand_twh:  55, capital: 'Lisbon',     capitalLat: 38.72, capitalLon: -9.14, windOnshoreScale: 0.95, windOffshoreScale: 1.10, solarScale: 1.25, hydroTwh: 12.0, coastal: true },
  { iso2: 'RO', iso3: 'ROU', name: 'Romania',        lat: 45.8, lon: 25.0, demand_twh:  62, capital: 'Bucharest',  capitalLat: 44.43, capitalLon: 26.10, windOnshoreScale: 0.80, windOffshoreScale: 0.90, solarScale: 1.00, hydroTwh: 16.5, coastal: true },
  { iso2: 'SK', iso3: 'SVK', name: 'Slovakia',       lat: 48.7, lon: 19.7, demand_twh:  31, capital: 'Bratislava', capitalLat: 48.15, capitalLon: 17.11, windOnshoreScale: 0.72, windOffshoreScale: 0.00, solarScale: 0.90, hydroTwh: 4.5, coastal: false },
  { iso2: 'SI', iso3: 'SVN', name: 'Slovenia',       lat: 46.1, lon: 14.8, demand_twh:  16, capital: 'Ljubljana',  capitalLat: 46.05, capitalLon: 14.51, windOnshoreScale: 0.75, windOffshoreScale: 0.70, solarScale: 0.95, hydroTwh: 4.2, coastal: true },
  { iso2: 'ES', iso3: 'ESP', name: 'Spain',          lat: 40.0, lon: -3.7, demand_twh: 295, capital: 'Madrid',     capitalLat: 40.42, capitalLon: -3.70, windOnshoreScale: 0.95, windOffshoreScale: 1.05, solarScale: 1.30, hydroTwh: 25.0, coastal: true },
  { iso2: 'SE', iso3: 'SWE', name: 'Sweden',         lat: 62.0, lon: 15.0, demand_twh: 158, capital: 'Stockholm',  capitalLat: 59.33, capitalLon: 18.07, windOnshoreScale: 0.95, windOffshoreScale: 1.15, solarScale: 0.70, hydroTwh: 70.0, coastal: true },
  { iso2: 'MT', iso3: 'MLT', name: 'Malta',          lat: 35.9, lon: 14.4, demand_twh:   3, capital: 'Valletta',   capitalLat: 35.90, capitalLon: 14.51, windOnshoreScale: 0.65, windOffshoreScale: 0.80, solarScale: 1.35, hydroTwh: 0.0, coastal: true },
  { iso2: 'NO', iso3: 'NOR', name: 'Norway',         lat: 61.5, lon:  9.0, demand_twh: 150, capital: 'Oslo',       capitalLat: 59.91, capitalLon: 10.75, windOnshoreScale: 1.00, windOffshoreScale: 1.25, solarScale: 0.68, hydroTwh: 140.0, coastal: true },
  { iso2: 'CH', iso3: 'CHE', name: 'Switzerland',    lat: 46.8, lon:  8.2, demand_twh:  65, capital: 'Bern',       capitalLat: 46.95, capitalLon:  7.44, windOnshoreScale: 0.70, windOffshoreScale: 0.00, solarScale: 0.95, hydroTwh: 38.0, coastal: false },
  { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom', lat: 54.0, lon: -2.0, demand_twh: 345, capital: 'London',     capitalLat: 51.50, capitalLon: -0.13, windOnshoreScale: 1.10, windOffshoreScale: 1.35, solarScale: 0.80, hydroTwh: 6.5, coastal: true },
];

/** Lookup by ISO-2 code */
export const EU_COUNTRY_INDEX: Record<string, EuCountry> =
  Object.fromEntries(EU_COUNTRIES.map(c => [c.iso2, c]));

/**
 * Interconnector NTC (transfer capacity) in GW, based on ENTSO-E
 * Winter Outlook 2023/24 net-transfer-capacity matrices. These form
 * the transmission topology of the 30-bus LP network. The model
 * treats each link as a transport PyPSA `Link` (p_min_pu = -1) with
 * a 98 % round-trip efficiency.
 */
export const EU_INTERCONNECTORS: Array<[string, string, number, 'AC' | 'HVDC']> = [
  // Nordic synchronous area
  ['NO', 'SE', 3.7, 'AC'],
  ['NO', 'DK', 1.7, 'HVDC'],
  ['NO', 'NL', 0.7, 'HVDC'],
  ['NO', 'GB', 1.4, 'HVDC'],
  ['NO', 'DE', 1.4, 'HVDC'],
  ['SE', 'FI', 2.7, 'AC'],
  ['SE', 'DK', 2.5, 'AC'],
  ['SE', 'DE', 0.6, 'HVDC'],
  ['SE', 'PL', 0.6, 'HVDC'],
  ['SE', 'LT', 0.7, 'HVDC'],
  ['FI', 'EE', 1.0, 'HVDC'],
  // Baltic ring
  ['EE', 'LV', 1.0, 'AC'],
  ['LV', 'LT', 1.0, 'AC'],
  ['LT', 'PL', 0.5, 'HVDC'],
  // Continental core (Germany cluster)
  ['DK', 'DE', 3.5, 'AC'],
  ['DK', 'NL', 0.7, 'HVDC'],
  ['DK', 'GB', 1.4, 'HVDC'],
  ['DE', 'NL', 5.0, 'AC'],
  ['DE', 'BE', 1.0, 'HVDC'],
  ['DE', 'FR', 3.0, 'AC'],
  ['DE', 'CH', 4.2, 'AC'],
  ['DE', 'AT', 7.5, 'AC'],
  ['DE', 'CZ', 2.5, 'AC'],
  ['DE', 'PL', 3.5, 'AC'],
  ['DE', 'LU', 2.3, 'AC'],
  ['NL', 'BE', 2.4, 'AC'],
  ['NL', 'GB', 1.0, 'HVDC'],
  ['BE', 'FR', 3.0, 'AC'],
  ['BE', 'GB', 1.0, 'HVDC'],
  ['BE', 'LU', 1.0, 'AC'],
  ['LU', 'FR', 1.7, 'AC'],
  ['FR', 'ES', 4.0, 'AC'],
  ['FR', 'IT', 4.3, 'AC'],
  ['FR', 'CH', 3.7, 'AC'],
  ['FR', 'GB', 5.0, 'HVDC'],
  ['IE', 'GB', 1.0, 'HVDC'],
  ['ES', 'PT', 4.2, 'AC'],
  // Alpine / Mediterranean
  ['CH', 'IT', 4.2, 'AC'],
  ['CH', 'AT', 1.5, 'AC'],
  ['IT', 'AT', 0.3, 'AC'],
  ['IT', 'SI', 2.0, 'AC'],
  ['IT', 'GR', 0.5, 'HVDC'],
  // Central-Eastern
  ['AT', 'CZ', 1.8, 'AC'],
  ['AT', 'HU', 1.2, 'AC'],
  ['AT', 'SI', 1.5, 'AC'],
  ['CZ', 'PL', 1.0, 'AC'],
  ['CZ', 'SK', 1.1, 'AC'],
  ['PL', 'SK', 1.0, 'AC'],
  ['SK', 'HU', 1.8, 'AC'],
  ['HU', 'RO', 1.5, 'AC'],
  ['HU', 'HR', 0.9, 'AC'],
  ['HU', 'SI', 1.2, 'AC'],
  ['HR', 'SI', 1.2, 'AC'],
  // Balkans / SE Europe
  ['RO', 'BG', 1.3, 'AC'],
  ['BG', 'GR', 1.6, 'AC'],
];
