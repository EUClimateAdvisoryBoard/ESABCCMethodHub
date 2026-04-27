/**
 * Media Monitoring — server-side utilities.
 *
 * Core responsibilities:
 *  1. Build Google News RSS query URLs from keyword rows.
 *  2. Fetch and parse the feeds (reuses the lightweight XML parser pattern
 *     from src/lib/rss-feeds.ts so we don't pull in a new dependency).
 *  3. Deduplicate by canonical URL, resolve the publishing outlet, enrich
 *     with readership / country metadata from OUTLET_REGISTRY, and return
 *     normalised article records ready for insertion into `media_articles`.
 *
 * No secrets live in this file — it is safe to import from any server route.
 *
 * Like `rss-feeds.ts`, XML is parsed with regex rather than a library so the
 * Next.js bundle stays small and the code matches the existing project style.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MediaKeyword {
  id: string;
  keyword: string;
  label?: string | null;
  category: string;
  language: string;
  country: string;
  is_active: boolean;
}

export interface OutletInfo {
  domain: string;
  name: string;
  country: string;            // ISO-3166 alpha-2
  country_name: string;
  tier: 'global' | 'national' | 'trade' | 'regional' | 'blog';
  language: string;
  estimated_readership: number; // monthly uniques
  reach_score: number;          // 0..10
  latitude: number;
  longitude: number;
}

export interface FetchedArticle {
  url: string;
  canonical_url: string;
  title: string;
  summary: string;
  source_name: string;
  outlet_domain: string | null;
  outlet: OutletInfo | null;
  published_at: string | null;  // ISO
  language: string;
  country: string | null;
  estimated_reach: number;
  matched_keyword_ids: string[];
  matched_keywords: string[];
}

/* ------------------------------------------------------------------ */
/*  Outlet registry                                                    */
/*                                                                      */
/*  Curated list of the outlets most relevant to EU climate coverage   */
/*  with estimated monthly readership, country, and HQ coordinates.    */
/*  Values are best-effort public estimates (Similarweb / Press        */
/*  Gazette) and should be updated in the DB after migration runs;     */
/*  this registry is the seed + fallback when no DB row is found.      */
/* ------------------------------------------------------------------ */

export const OUTLET_REGISTRY: OutletInfo[] = [
  // Pan-European / Brussels
  { domain: 'politico.eu',           name: 'POLITICO Europe',         country: 'BE', country_name: 'Belgium',       tier: 'trade',    language: 'en', estimated_readership: 14_000_000, reach_score: 9.2, latitude: 50.8503, longitude: 4.3517 },
  { domain: 'euractiv.com',          name: 'EURACTIV',                country: 'BE', country_name: 'Belgium',       tier: 'trade',    language: 'en', estimated_readership:  6_000_000, reach_score: 8.5, latitude: 50.8503, longitude: 4.3517 },
  { domain: 'euronews.com',          name: 'Euronews',                country: 'FR', country_name: 'France',        tier: 'global',   language: 'en', estimated_readership: 55_000_000, reach_score: 9.0, latitude: 45.7640, longitude: 4.8357 },
  { domain: 'sciencebusiness.net',   name: 'Science|Business',        country: 'BE', country_name: 'Belgium',       tier: 'trade',    language: 'en', estimated_readership:    800_000, reach_score: 6.0, latitude: 50.8503, longitude: 4.3517 },
  { domain: 'contextnews.com',       name: 'Context (Reuters)',       country: 'GB', country_name: 'United Kingdom',tier: 'trade',    language: 'en', estimated_readership:  2_000_000, reach_score: 7.2, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'climatechangenews.com', name: 'Climate Home News',       country: 'GB', country_name: 'United Kingdom',tier: 'trade',    language: 'en', estimated_readership:    900_000, reach_score: 7.0, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'carbonbrief.org',       name: 'Carbon Brief',            country: 'GB', country_name: 'United Kingdom',tier: 'trade',    language: 'en', estimated_readership:  1_500_000, reach_score: 7.5, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'endseurope.com',        name: 'ENDS Europe',             country: 'GB', country_name: 'United Kingdom',tier: 'trade',    language: 'en', estimated_readership:    250_000, reach_score: 5.5, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'cleanenergywire.org',   name: 'Clean Energy Wire',       country: 'DE', country_name: 'Germany',       tier: 'trade',    language: 'en', estimated_readership:  1_800_000, reach_score: 7.6, latitude: 52.5200, longitude: 13.4050 },
  { domain: 'energymonitor.ai',      name: 'Energy Monitor',          country: 'GB', country_name: 'United Kingdom',tier: 'trade',    language: 'en', estimated_readership:    650_000, reach_score: 6.4, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'montelnews.com',        name: 'Montel News',             country: 'NO', country_name: 'Norway',        tier: 'trade',    language: 'en', estimated_readership:    400_000, reach_score: 6.0, latitude: 59.9139, longitude: 10.7522 },
  { domain: 'mlex.com',              name: 'MLex',                    country: 'BE', country_name: 'Belgium',       tier: 'trade',    language: 'en', estimated_readership:    350_000, reach_score: 6.2, latitude: 50.8503, longitude: 4.3517 },
  { domain: 'argusmedia.com',        name: 'Argus Media',             country: 'GB', country_name: 'United Kingdom',tier: 'trade',    language: 'en', estimated_readership:    700_000, reach_score: 6.8, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'spglobal.com',          name: 'S&P Global Commodity Insights', country: 'US', country_name: 'United States', tier: 'trade', language: 'en', estimated_readership: 15_000_000, reach_score: 8.0, latitude: 40.7128, longitude: -74.0060 },
  { domain: 'eurelectric.org',       name: 'Eurelectric',             country: 'BE', country_name: 'Belgium',       tier: 'trade',    language: 'en', estimated_readership:    200_000, reach_score: 5.5, latitude: 50.8503, longitude: 4.3517 },
  { domain: 'agenceurope.eu',        name: 'Agence Europe',           country: 'BE', country_name: 'Belgium',       tier: 'trade',    language: 'en', estimated_readership:    180_000, reach_score: 5.8, latitude: 50.8503, longitude: 4.3517 },
  { domain: 'ftm.eu',                name: 'Follow the Money',        country: 'NL', country_name: 'Netherlands',   tier: 'trade',    language: 'en', estimated_readership:  1_000_000, reach_score: 6.8, latitude: 52.3676, longitude: 4.9041 },
  { domain: 'investigate-europe.eu', name: 'Investigate Europe',      country: 'DE', country_name: 'Germany',       tier: 'trade',    language: 'en', estimated_readership:    500_000, reach_score: 6.5, latitude: 52.5200, longitude: 13.4050 },
  { domain: 'theparliamentmagazine.eu', name: 'The Parliament Magazine', country: 'BE', country_name: 'Belgium',   tier: 'trade',    language: 'en', estimated_readership:    550_000, reach_score: 6.3, latitude: 50.8503, longitude: 4.3517 },
  { domain: 'responsible-investor.com', name: 'Responsible Investor', country: 'GB', country_name: 'United Kingdom',tier: 'trade',    language: 'en', estimated_readership:    320_000, reach_score: 6.0, latitude: 51.5074, longitude: -0.1278 },

  // United Kingdom
  { domain: 'ft.com',                name: 'Financial Times',         country: 'GB', country_name: 'United Kingdom',tier: 'global',   language: 'en', estimated_readership: 25_000_000, reach_score: 9.5, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'theguardian.com',       name: 'The Guardian',            country: 'GB', country_name: 'United Kingdom',tier: 'global',   language: 'en', estimated_readership:400_000_000, reach_score: 9.8, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'bbc.com',               name: 'BBC News',                country: 'GB', country_name: 'United Kingdom',tier: 'global',   language: 'en', estimated_readership:1_200_000_000,reach_score:10.0, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'reuters.com',           name: 'Reuters',                 country: 'GB', country_name: 'United Kingdom',tier: 'global',   language: 'en', estimated_readership: 90_000_000, reach_score: 9.5, latitude: 51.5074, longitude: -0.1278 },
  { domain: 'economist.com',         name: 'The Economist',           country: 'GB', country_name: 'United Kingdom',tier: 'global',   language: 'en', estimated_readership: 60_000_000, reach_score: 9.3, latitude: 51.5074, longitude: -0.1278 },

  // Germany
  { domain: 'spiegel.de',            name: 'Der Spiegel',             country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 65_000_000, reach_score: 9.0, latitude: 53.5511, longitude: 9.9937 },
  { domain: 'faz.net',               name: 'Frankfurter Allgemeine',  country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 30_000_000, reach_score: 8.5, latitude: 50.1109, longitude: 8.6821 },
  { domain: 'sueddeutsche.de',       name: 'Süddeutsche Zeitung',     country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 35_000_000, reach_score: 8.5, latitude: 48.1351, longitude: 11.5820 },
  { domain: 'zeit.de',               name: 'Die Zeit',                country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 28_000_000, reach_score: 8.3, latitude: 53.5511, longitude: 9.9937 },
  { domain: 'tagesschau.de',         name: 'Tagesschau',              country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 80_000_000, reach_score: 9.0, latitude: 53.5511, longitude: 9.9937 },
  { domain: 'dw.com',                name: 'Deutsche Welle',          country: 'DE', country_name: 'Germany',       tier: 'global',   language: 'en', estimated_readership: 50_000_000, reach_score: 8.6, latitude: 50.7374, longitude: 7.0982 },
  { domain: 'handelsblatt.com',      name: 'Handelsblatt',            country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 18_000_000, reach_score: 8.0, latitude: 51.2277, longitude: 6.7735 },
  { domain: 'tagesspiegel.de',       name: 'Der Tagesspiegel',        country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 15_000_000, reach_score: 7.5, latitude: 52.5200, longitude: 13.4050 },
  { domain: 'welt.de',               name: 'Die Welt',                country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 40_000_000, reach_score: 8.3, latitude: 52.5200, longitude: 13.4050 },
  { domain: 'taz.de',                name: 'taz',                     country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 12_000_000, reach_score: 7.3, latitude: 52.5200, longitude: 13.4050 },
  { domain: 'zdf.de',                name: 'ZDF',                     country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 45_000_000, reach_score: 8.5, latitude: 50.0052, longitude: 8.2400 },
  { domain: 'ard.de',                name: 'ARD',                     country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 50_000_000, reach_score: 8.6, latitude: 52.5200, longitude: 13.4050 },
  { domain: 'n-tv.de',               name: 'n-tv',                    country: 'DE', country_name: 'Germany',       tier: 'national', language: 'de', estimated_readership: 22_000_000, reach_score: 7.8, latitude: 50.9413, longitude: 6.9583 },

  // France
  { domain: 'lemonde.fr',            name: 'Le Monde',                country: 'FR', country_name: 'France',        tier: 'national', language: 'fr', estimated_readership: 55_000_000, reach_score: 9.0, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'lefigaro.fr',           name: 'Le Figaro',               country: 'FR', country_name: 'France',        tier: 'national', language: 'fr', estimated_readership: 45_000_000, reach_score: 8.5, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'liberation.fr',         name: 'Libération',              country: 'FR', country_name: 'France',        tier: 'national', language: 'fr', estimated_readership: 20_000_000, reach_score: 7.8, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'lesechos.fr',           name: 'Les Échos',               country: 'FR', country_name: 'France',        tier: 'national', language: 'fr', estimated_readership: 18_000_000, reach_score: 8.0, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'france24.com',          name: 'France 24',               country: 'FR', country_name: 'France',        tier: 'global',   language: 'en', estimated_readership: 40_000_000, reach_score: 8.7, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'rfi.fr',                name: 'RFI',                     country: 'FR', country_name: 'France',        tier: 'global',   language: 'fr', estimated_readership: 22_000_000, reach_score: 8.0, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'latribune.fr',          name: 'La Tribune',              country: 'FR', country_name: 'France',        tier: 'national', language: 'fr', estimated_readership: 12_000_000, reach_score: 7.4, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'mediapart.fr',          name: 'Mediapart',               country: 'FR', country_name: 'France',        tier: 'national', language: 'fr', estimated_readership: 10_000_000, reach_score: 7.6, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'lepoint.fr',            name: 'Le Point',                country: 'FR', country_name: 'France',        tier: 'national', language: 'fr', estimated_readership: 25_000_000, reach_score: 7.8, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'francetvinfo.fr',       name: 'France Info',             country: 'FR', country_name: 'France',        tier: 'national', language: 'fr', estimated_readership: 35_000_000, reach_score: 8.2, latitude: 48.8566, longitude: 2.3522 },
  { domain: 'afp.com',               name: 'Agence France-Presse',    country: 'FR', country_name: 'France',        tier: 'global',   language: 'en', estimated_readership: 70_000_000, reach_score: 9.2, latitude: 48.8566, longitude: 2.3522 },

  // Italy
  { domain: 'corriere.it',           name: 'Corriere della Sera',     country: 'IT', country_name: 'Italy',         tier: 'national', language: 'it', estimated_readership: 55_000_000, reach_score: 8.8, latitude: 45.4642, longitude: 9.1900 },
  { domain: 'repubblica.it',         name: 'la Repubblica',           country: 'IT', country_name: 'Italy',         tier: 'national', language: 'it', estimated_readership: 60_000_000, reach_score: 8.8, latitude: 41.9028, longitude: 12.4964 },
  { domain: 'ilsole24ore.com',       name: 'Il Sole 24 Ore',          country: 'IT', country_name: 'Italy',         tier: 'national', language: 'it', estimated_readership: 25_000_000, reach_score: 8.3, latitude: 45.4642, longitude: 9.1900 },
  { domain: 'ansa.it',               name: 'ANSA',                    country: 'IT', country_name: 'Italy',         tier: 'national', language: 'it', estimated_readership: 35_000_000, reach_score: 8.0, latitude: 41.9028, longitude: 12.4964 },
  { domain: 'lastampa.it',           name: 'La Stampa',               country: 'IT', country_name: 'Italy',         tier: 'national', language: 'it', estimated_readership: 20_000_000, reach_score: 7.8, latitude: 45.0703, longitude: 7.6869 },
  { domain: 'ilmessaggero.it',       name: 'Il Messaggero',           country: 'IT', country_name: 'Italy',         tier: 'national', language: 'it', estimated_readership: 18_000_000, reach_score: 7.6, latitude: 41.9028, longitude: 12.4964 },
  { domain: 'rai.it',                name: 'RAI News',                country: 'IT', country_name: 'Italy',         tier: 'national', language: 'it', estimated_readership: 40_000_000, reach_score: 8.3, latitude: 41.9028, longitude: 12.4964 },

  // Spain
  { domain: 'elpais.com',            name: 'El País',                 country: 'ES', country_name: 'Spain',         tier: 'national', language: 'es', estimated_readership:110_000_000, reach_score: 9.0, latitude: 40.4168, longitude: -3.7038 },
  { domain: 'elmundo.es',            name: 'El Mundo',                country: 'ES', country_name: 'Spain',         tier: 'national', language: 'es', estimated_readership: 70_000_000, reach_score: 8.5, latitude: 40.4168, longitude: -3.7038 },
  { domain: 'abc.es',                name: 'ABC',                     country: 'ES', country_name: 'Spain',         tier: 'national', language: 'es', estimated_readership: 50_000_000, reach_score: 8.0, latitude: 40.4168, longitude: -3.7038 },
  { domain: 'expansion.com',         name: 'Expansión',               country: 'ES', country_name: 'Spain',         tier: 'national', language: 'es', estimated_readership: 22_000_000, reach_score: 7.8, latitude: 40.4168, longitude: -3.7038 },
  { domain: 'rtve.es',               name: 'RTVE',                    country: 'ES', country_name: 'Spain',         tier: 'national', language: 'es', estimated_readership: 35_000_000, reach_score: 8.2, latitude: 40.4168, longitude: -3.7038 },
  { domain: 'efe.com',               name: 'EFE',                     country: 'ES', country_name: 'Spain',         tier: 'national', language: 'es', estimated_readership: 25_000_000, reach_score: 8.0, latitude: 40.4168, longitude: -3.7038 },
  { domain: 'lavanguardia.com',      name: 'La Vanguardia',           country: 'ES', country_name: 'Spain',         tier: 'national', language: 'es', estimated_readership: 40_000_000, reach_score: 8.1, latitude: 41.3851, longitude: 2.1734 },

  // Netherlands
  { domain: 'nrc.nl',                name: 'NRC Handelsblad',         country: 'NL', country_name: 'Netherlands',   tier: 'national', language: 'nl', estimated_readership: 12_000_000, reach_score: 7.8, latitude: 52.3676, longitude: 4.9041 },
  { domain: 'volkskrant.nl',         name: 'de Volkskrant',           country: 'NL', country_name: 'Netherlands',   tier: 'national', language: 'nl', estimated_readership: 14_000_000, reach_score: 7.8, latitude: 52.3676, longitude: 4.9041 },
  { domain: 'nos.nl',                name: 'NOS',                     country: 'NL', country_name: 'Netherlands',   tier: 'national', language: 'nl', estimated_readership: 50_000_000, reach_score: 8.5, latitude: 52.0907, longitude: 5.1214 },

  // Belgium
  { domain: 'lesoir.be',             name: 'Le Soir',                 country: 'BE', country_name: 'Belgium',       tier: 'national', language: 'fr', estimated_readership: 10_000_000, reach_score: 7.5, latitude: 50.8503, longitude: 4.3517 },
  { domain: 'standaard.be',          name: 'De Standaard',            country: 'BE', country_name: 'Belgium',       tier: 'national', language: 'nl', estimated_readership:  9_000_000, reach_score: 7.5, latitude: 50.8503, longitude: 4.3517 },
  { domain: 'brusselstimes.com',     name: 'The Brussels Times',      country: 'BE', country_name: 'Belgium',       tier: 'trade',    language: 'en', estimated_readership:  2_500_000, reach_score: 6.5, latitude: 50.8503, longitude: 4.3517 },

  // Poland
  { domain: 'wyborcza.pl',           name: 'Gazeta Wyborcza',         country: 'PL', country_name: 'Poland',        tier: 'national', language: 'pl', estimated_readership: 25_000_000, reach_score: 8.0, latitude: 52.2297, longitude: 21.0122 },
  { domain: 'rzeczpospolita.pl',     name: 'Rzeczpospolita',          country: 'PL', country_name: 'Poland',        tier: 'national', language: 'pl', estimated_readership: 15_000_000, reach_score: 7.8, latitude: 52.2297, longitude: 21.0122 },
  { domain: 'notesfrompoland.com',   name: 'Notes from Poland',       country: 'PL', country_name: 'Poland',        tier: 'trade',    language: 'en', estimated_readership:  1_500_000, reach_score: 6.0, latitude: 52.2297, longitude: 21.0122 },
  { domain: 'onet.pl',               name: 'Onet',                    country: 'PL', country_name: 'Poland',        tier: 'national', language: 'pl', estimated_readership: 60_000_000, reach_score: 8.2, latitude: 52.2297, longitude: 21.0122 },
  { domain: 'tvn24.pl',              name: 'TVN24',                   country: 'PL', country_name: 'Poland',        tier: 'national', language: 'pl', estimated_readership: 45_000_000, reach_score: 8.0, latitude: 52.2297, longitude: 21.0122 },

  // Czech Republic, Hungary, Slovakia, Romania
  { domain: 'hn.cz',                 name: 'Hospodářské Noviny',      country: 'CZ', country_name: 'Czechia',       tier: 'national', language: 'cs', estimated_readership:  6_000_000, reach_score: 7.2, latitude: 50.0755, longitude: 14.4378 },
  { domain: 'irozhlas.cz',           name: 'iROZHLAS',                country: 'CZ', country_name: 'Czechia',       tier: 'national', language: 'cs', estimated_readership:  8_000_000, reach_score: 7.4, latitude: 50.0755, longitude: 14.4378 },
  { domain: 'telex.hu',              name: 'Telex',                   country: 'HU', country_name: 'Hungary',       tier: 'national', language: 'hu', estimated_readership:  8_000_000, reach_score: 7.4, latitude: 47.4979, longitude: 19.0402 },
  { domain: 'hvg.hu',                name: 'HVG',                     country: 'HU', country_name: 'Hungary',       tier: 'national', language: 'hu', estimated_readership:  7_000_000, reach_score: 7.2, latitude: 47.4979, longitude: 19.0402 },
  { domain: 'sme.sk',                name: 'SME',                     country: 'SK', country_name: 'Slovakia',      tier: 'national', language: 'sk', estimated_readership:  5_000_000, reach_score: 7.0, latitude: 48.1486, longitude: 17.1077 },
  { domain: 'digi24.ro',             name: 'Digi24',                  country: 'RO', country_name: 'Romania',       tier: 'national', language: 'ro', estimated_readership: 10_000_000, reach_score: 7.2, latitude: 44.4268, longitude: 26.1025 },
  { domain: 'g4media.ro',            name: 'G4Media',                 country: 'RO', country_name: 'Romania',       tier: 'national', language: 'ro', estimated_readership:  6_000_000, reach_score: 6.8, latitude: 44.4268, longitude: 26.1025 },

  // Baltics & Balkans
  { domain: 'delfi.lt',              name: 'Delfi (Lithuania)',       country: 'LT', country_name: 'Lithuania',     tier: 'national', language: 'lt', estimated_readership:  4_000_000, reach_score: 6.8, latitude: 54.6872, longitude: 25.2797 },
  { domain: 'err.ee',                name: 'ERR',                     country: 'EE', country_name: 'Estonia',       tier: 'national', language: 'et', estimated_readership:  2_500_000, reach_score: 6.6, latitude: 59.4370, longitude: 24.7536 },
  { domain: 'lsm.lv',                name: 'LSM',                     country: 'LV', country_name: 'Latvia',        tier: 'national', language: 'lv', estimated_readership:  2_500_000, reach_score: 6.5, latitude: 56.9496, longitude: 24.1052 },
  { domain: 'balkaninsight.com',     name: 'Balkan Insight',          country: 'RS', country_name: 'Serbia',        tier: 'trade',    language: 'en', estimated_readership:  1_000_000, reach_score: 6.4, latitude: 44.7866, longitude: 20.4489 },

  // Nordics
  { domain: 'dn.se',                 name: 'Dagens Nyheter',          country: 'SE', country_name: 'Sweden',        tier: 'national', language: 'sv', estimated_readership: 20_000_000, reach_score: 8.0, latitude: 59.3293, longitude: 18.0686 },
  { domain: 'svd.se',                name: 'Svenska Dagbladet',       country: 'SE', country_name: 'Sweden',        tier: 'national', language: 'sv', estimated_readership: 15_000_000, reach_score: 7.8, latitude: 59.3293, longitude: 18.0686 },
  { domain: 'hs.fi',                 name: 'Helsingin Sanomat',       country: 'FI', country_name: 'Finland',       tier: 'national', language: 'fi', estimated_readership: 12_000_000, reach_score: 7.8, latitude: 60.1699, longitude: 24.9384 },
  { domain: 'politiken.dk',          name: 'Politiken',               country: 'DK', country_name: 'Denmark',       tier: 'national', language: 'da', estimated_readership: 10_000_000, reach_score: 7.5, latitude: 55.6761, longitude: 12.5683 },
  { domain: 'berlingske.dk',         name: 'Berlingske',              country: 'DK', country_name: 'Denmark',       tier: 'national', language: 'da', estimated_readership:  8_000_000, reach_score: 7.3, latitude: 55.6761, longitude: 12.5683 },
  { domain: 'aftenposten.no',        name: 'Aftenposten',             country: 'NO', country_name: 'Norway',        tier: 'national', language: 'no', estimated_readership: 14_000_000, reach_score: 7.8, latitude: 59.9139, longitude: 10.7522 },
  { domain: 'nrk.no',                name: 'NRK',                     country: 'NO', country_name: 'Norway',        tier: 'national', language: 'no', estimated_readership: 35_000_000, reach_score: 8.4, latitude: 59.9139, longitude: 10.7522 },
  { domain: 'yle.fi',                name: 'Yle',                     country: 'FI', country_name: 'Finland',       tier: 'national', language: 'fi', estimated_readership: 30_000_000, reach_score: 8.4, latitude: 60.1699, longitude: 24.9384 },
  { domain: 'svt.se',                name: 'SVT',                     country: 'SE', country_name: 'Sweden',        tier: 'national', language: 'sv', estimated_readership: 40_000_000, reach_score: 8.4, latitude: 59.3293, longitude: 18.0686 },
  { domain: 'dr.dk',                 name: 'DR',                      country: 'DK', country_name: 'Denmark',       tier: 'national', language: 'da', estimated_readership: 30_000_000, reach_score: 8.3, latitude: 55.6761, longitude: 12.5683 },
  { domain: 'euobserver.com',        name: 'EU Observer',             country: 'BE', country_name: 'Belgium',       tier: 'trade',    language: 'en', estimated_readership:  1_200_000, reach_score: 7.0, latitude: 50.8503, longitude: 4.3517 },

  // Austria & Switzerland
  { domain: 'derstandard.at',        name: 'Der Standard',            country: 'AT', country_name: 'Austria',       tier: 'national', language: 'de', estimated_readership: 20_000_000, reach_score: 8.0, latitude: 48.2082, longitude: 16.3738 },
  { domain: 'diepresse.com',         name: 'Die Presse',              country: 'AT', country_name: 'Austria',       tier: 'national', language: 'de', estimated_readership: 12_000_000, reach_score: 7.5, latitude: 48.2082, longitude: 16.3738 },
  { domain: 'nzz.ch',                name: 'Neue Zürcher Zeitung',    country: 'CH', country_name: 'Switzerland',   tier: 'national', language: 'de', estimated_readership: 22_000_000, reach_score: 8.3, latitude: 47.3769, longitude: 8.5417 },
  { domain: 'swissinfo.ch',          name: 'SWI swissinfo',           country: 'CH', country_name: 'Switzerland',   tier: 'trade',    language: 'en', estimated_readership:  8_000_000, reach_score: 7.0, latitude: 46.9480, longitude: 7.4474 },

  // Other
  { domain: 'kathimerini.gr',        name: 'Kathimerini',             country: 'GR', country_name: 'Greece',        tier: 'national', language: 'el', estimated_readership: 10_000_000, reach_score: 7.5, latitude: 37.9838, longitude: 23.7275 },
  { domain: 'publico.pt',            name: 'Público',                 country: 'PT', country_name: 'Portugal',      tier: 'national', language: 'pt', estimated_readership:  8_000_000, reach_score: 7.3, latitude: 38.7223, longitude: -9.1393 },
  { domain: 'irishtimes.com',        name: 'The Irish Times',         country: 'IE', country_name: 'Ireland',       tier: 'national', language: 'en', estimated_readership: 18_000_000, reach_score: 7.8, latitude: 53.3498, longitude: -6.2603 },
  { domain: 'rte.ie',                name: 'RTÉ',                     country: 'IE', country_name: 'Ireland',       tier: 'national', language: 'en', estimated_readership: 25_000_000, reach_score: 8.1, latitude: 53.3498, longitude: -6.2603 },
  { domain: 'independent.ie',        name: 'Irish Independent',       country: 'IE', country_name: 'Ireland',       tier: 'national', language: 'en', estimated_readership: 16_000_000, reach_score: 7.5, latitude: 53.3498, longitude: -6.2603 },

  // United States (for trans-atlantic coverage)
  { domain: 'nytimes.com',           name: 'The New York Times',      country: 'US', country_name: 'United States', tier: 'global',   language: 'en', estimated_readership:500_000_000, reach_score:10.0, latitude: 40.7128, longitude: -74.0060 },
  { domain: 'washingtonpost.com',    name: 'The Washington Post',     country: 'US', country_name: 'United States', tier: 'global',   language: 'en', estimated_readership:150_000_000, reach_score: 9.5, latitude: 38.9072, longitude: -77.0369 },
  { domain: 'wsj.com',               name: 'The Wall Street Journal', country: 'US', country_name: 'United States', tier: 'global',   language: 'en', estimated_readership:110_000_000, reach_score: 9.5, latitude: 40.7128, longitude: -74.0060 },
  { domain: 'bloomberg.com',         name: 'Bloomberg',               country: 'US', country_name: 'United States', tier: 'global',   language: 'en', estimated_readership:120_000_000, reach_score: 9.6, latitude: 40.7128, longitude: -74.0060 },
  { domain: 'apnews.com',            name: 'Associated Press',        country: 'US', country_name: 'United States', tier: 'global',   language: 'en', estimated_readership: 80_000_000, reach_score: 9.4, latitude: 40.7128, longitude: -74.0060 },
  { domain: 'axios.com',             name: 'Axios',                   country: 'US', country_name: 'United States', tier: 'global',   language: 'en', estimated_readership: 55_000_000, reach_score: 8.6, latitude: 38.9072, longitude: -77.0369 },
  { domain: 'semafor.com',           name: 'Semafor',                 country: 'US', country_name: 'United States', tier: 'global',   language: 'en', estimated_readership: 18_000_000, reach_score: 7.8, latitude: 40.7128, longitude: -74.0060 },
  { domain: 'grist.org',             name: 'Grist',                   country: 'US', country_name: 'United States', tier: 'trade',    language: 'en', estimated_readership:  5_500_000, reach_score: 7.4, latitude: 47.6062, longitude: -122.3321 },
  { domain: 'insideclimatenews.org', name: 'Inside Climate News',     country: 'US', country_name: 'United States', tier: 'trade',    language: 'en', estimated_readership:  4_500_000, reach_score: 7.3, latitude: 40.7128, longitude: -74.0060 },
  { domain: 'eenews.net',            name: 'E&E News',                country: 'US', country_name: 'United States', tier: 'trade',    language: 'en', estimated_readership:  3_000_000, reach_score: 7.0, latitude: 38.9072, longitude: -77.0369 },
  { domain: 'theconversation.com',   name: 'The Conversation',        country: 'GB', country_name: 'United Kingdom',tier: 'trade',    language: 'en', estimated_readership: 50_000_000, reach_score: 8.2, latitude: 51.5074, longitude: -0.1278 },
];

/* ------------------------------------------------------------------ */
/*  Domain blocklist                                                   */
/*                                                                      */
/*  Google News surfaces a long tail of aggregators, content farms,    */
/*  press-release republishers and low-effort SEO blogs that pollute   */
/*  the coverage feed. Drop them at ingest time so they never reach    */
/*  the database or dashboard.                                         */
/*                                                                      */
/*  Match is on the article's registered domain OR any parent domain,  */
/*  so `foo.bar.example.com` matches `example.com`.                    */
/* ------------------------------------------------------------------ */

const BLOCKED_DOMAINS: string[] = [
  // Press release / wire republishers
  'prnewswire.com',
  'businesswire.com',
  'globenewswire.com',
  'einnews.com',
  'einpresswire.com',
  'openpr.com',
  'pressreleasepoint.com',
  'newswire.com',
  'accesswire.com',
  'prweb.com',
  'webwire.com',

  // News aggregators / SEO republishers
  'msn.com',
  'yahoo.com',
  'news.yahoo.com',
  'headtopics.com',
  'biztoc.com',
  'newsnow.co.uk',
  'smartbrief.com',
  'menafn.com',
  'freshnews.org',
  'thelocal.com',

  // Low-signal "content farms" / opinion blogs frequently returned by Google News
  'benzinga.com',
  'zerohedge.com',
  'seekingalpha.com',
  'marketscreener.com',
  'stocktitan.net',
  'investing.com',
  'finanzen.net',
  'finanznachrichten.de',
  'wallstreet-online.de',
  'markets.businessinsider.com',
  'fxstreet.com',
  'investorplace.com',
  'barchart.com',
  'simplywall.st',
  'nasdaq.com',
  'fool.com',

  // Known low-quality climate-sceptic / partisan outlets (not fit for the brief)
  'wattsupwiththat.com',
  'climatedepot.com',
  'breitbart.com',
  'rt.com',
  'sputniknews.com',
  'sputnikglobe.com',
  'tass.com',
];

const BLOCKED_SET = new Set(BLOCKED_DOMAINS);

/** Return true if the domain (or any parent) is on the blocklist. */
export function isBlockedDomain(domain: string | null | undefined): boolean {
  if (!domain) return false;
  const host = domain.toLowerCase().replace(/^www\./, '');
  if (BLOCKED_SET.has(host)) return true;
  const parts = host.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    if (BLOCKED_SET.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

const OUTLET_BY_DOMAIN: Record<string, OutletInfo> = OUTLET_REGISTRY.reduce(
  (acc, o) => {
    acc[o.domain] = o;
    return acc;
  },
  {} as Record<string, OutletInfo>,
);

/* ------------------------------------------------------------------ */
/*  URL helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Google News RSS returns a redirect URL like
 *   https://news.google.com/rss/articles/CBMi...?oc=5
 * The `description` field usually contains the real outlet link inside an
 * <a href="..."> tag. This helper extracts it so we can attribute the
 * article to the correct outlet and build a clean canonical URL.
 */
export function extractRealUrl(googleUrl: string, description: string): string {
  const hrefMatch = description.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
  if (hrefMatch && hrefMatch[1] && !hrefMatch[1].includes('news.google.com')) {
    return hrefMatch[1];
  }
  return googleUrl;
}

export function canonicaliseUrl(url: string): string {
  try {
    const u = new URL(url);
    // Strip common tracking parameters
    const drop = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'ref', 'ref_src', '_hsenc', '_hsmi',
    ];
    drop.forEach((p) => u.searchParams.delete(p));
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

export function domainFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function resolveOutlet(url: string): OutletInfo | null {
  const host = domainFromUrl(url);
  if (!host) return null;
  if (OUTLET_BY_DOMAIN[host]) return OUTLET_BY_DOMAIN[host];
  // Try parent domain (e.g. edition.cnn.com -> cnn.com)
  const parts = host.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join('.');
    if (OUTLET_BY_DOMAIN[candidate]) return OUTLET_BY_DOMAIN[candidate];
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Minimal XML helpers (same style as src/lib/rss-feeds.ts)           */
/* ------------------------------------------------------------------ */

function xmlText(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${tag}>`,
    'i',
  );
  const m = xml.match(re);
  if (!m) return '';
  return (m[1] ?? m[2] ?? '').trim();
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface RawGoogleItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

function parseGoogleNewsFeed(xml: string): RawGoogleItem[] {
  const items: RawGoogleItem[] = [];
  const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[0];
    const title = stripHtml(xmlText(block, 'title'));
    const link = xmlText(block, 'link');
    const descriptionRaw = xmlText(block, 'description');
    const pubDate = xmlText(block, 'pubDate');
    const sourceMatch = block.match(/<source[^>]*>([^<]*)<\/source>/i);
    const source = sourceMatch ? sourceMatch[1].trim() : '';
    if (title) {
      items.push({ title, link, description: descriptionRaw, pubDate, source });
    }
  }
  return items;
}

/* ------------------------------------------------------------------ */
/*  Google News query URL builder                                      */
/* ------------------------------------------------------------------ */

/**
 * Build a Google News query string for a keyword. Strategy:
 *  - Short keywords (1-2 words): exact phrase match with quotes
 *  - Acronyms (all-caps, ≤10 chars): exact match
 *  - Longer phrases (3+ words): no quotes so Google matches broadly
 */
function smartQuery(keyword: string): string {
  const words = keyword.trim().split(/\s+/);
  const isAcronym = /^[A-Z]{2,10}$/.test(keyword.trim());
  if (isAcronym || words.length <= 2) {
    return `"${keyword}"`;
  }
  // For longer phrases, use the raw terms so Google can match flexibly
  return keyword;
}

export function buildGoogleNewsUrl(kw: MediaKeyword): string {
  const q = encodeURIComponent(smartQuery(kw.keyword));
  const hl = kw.language || 'en';
  const gl = kw.country && kw.country !== 'any' ? kw.country.toUpperCase() : 'US';
  const ceid = `${gl}:${hl}`;
  return `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

/**
 * Build a combined Google News RSS URL for a batch of keywords in the
 * same language/country. Uses OR to combine them into a single query,
 * which is far more efficient than one request per keyword.
 */
export function buildBatchGoogleNewsUrl(
  keywords: MediaKeyword[],
): string {
  const first = keywords[0];
  const hl = first.language || 'en';
  const gl = first.country && first.country !== 'any' ? first.country.toUpperCase() : 'US';
  const ceid = `${gl}:${hl}`;

  const parts = keywords.map((kw) => smartQuery(kw.keyword));
  const q = encodeURIComponent(parts.join(' OR '));
  return `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

/* ------------------------------------------------------------------ */
/*  Main fetcher                                                       */
/* ------------------------------------------------------------------ */

interface FetchOptions {
  /** Cut-off date — articles older than this are discarded. */
  sinceIso?: string;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
  /** Max keywords to combine in one OR query (default 5). */
  batchSize?: number;
  /** Delay between batches in ms to avoid rate-limiting (default 800). */
  delayMs?: number;
  /**
   * Quality filter — when `true` (default) only keep articles from outlets
   * that appear in OUTLET_REGISTRY. This prevents the huge long tail of
   * aggregators, blogs and content farms Google News surfaces from polluting
   * the dashboard. Set to `false` only for debugging / discovery.
   */
  knownOutletsOnly?: boolean;
  /**
   * Drop any article whose domain is on BLOCKED_DOMAINS. On by default.
   * Applies even when `knownOutletsOnly` is false.
   */
  applyBlocklist?: boolean;
  /**
   * Minimum outlet reach_score (0..10) required for an article to be kept.
   * 0 = keep all. Applied on top of the known-outlets filter.
   */
  minReachScore?: number;
}

/** Group keywords by language+country so they can share one query. */
function groupKeywords(keywords: MediaKeyword[]): Map<string, MediaKeyword[]> {
  const groups = new Map<string, MediaKeyword[]>();
  for (const kw of keywords) {
    const key = `${kw.language || 'en'}|${kw.country || 'any'}`;
    const list = groups.get(key) ?? [];
    list.push(kw);
    groups.set(key, list);
  }
  return groups;
}

/** Split an array into chunks of at most `size` elements. */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/** Simple delay helper. */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; EU-Climate-Monitor/1.0)',
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
};

/**
 * Fetch articles for every active keyword.
 *
 * Strategy (v2):
 *  1. Group keywords by language + country.
 *  2. Within each group, batch up to `batchSize` keywords into one
 *     Google News OR query — this dramatically reduces the number of
 *     HTTP requests (from 150+ to ~30) and returns broader results.
 *  3. Additionally fire high-value keywords individually so we don't
 *     miss niche results that get crowded out in OR queries.
 *  4. Throttle between batches to avoid Google rate-limiting.
 *  5. Deduplicate by canonical URL, merging matched keywords.
 */
export async function fetchArticlesForKeywords(
  keywords: MediaKeyword[],
  opts: FetchOptions = {},
): Promise<FetchedArticle[]> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const batchSize = opts.batchSize ?? 5;
  const delayMs = opts.delayMs ?? 800;
  const sinceTs = opts.sinceIso ? new Date(opts.sinceIso).getTime() : 0;
  const knownOutletsOnly = opts.knownOutletsOnly ?? true;
  const applyBlocklist = opts.applyBlocklist ?? true;
  const minReachScore = opts.minReachScore ?? 0;

  let dropped = { blocked: 0, unknown: 0, lowReach: 0 };

  const active = keywords.filter((k) => k.is_active);
  if (active.length === 0) return [];

  // ── Build request plan ──────────────────────────────────────────────
  // Priority keywords (core ESABCC terms, acronyms) get their own request
  // so results aren't diluted by broad OR queries.
  const PRIORITY_CATEGORIES = new Set(['esabcc', 'report']);
  const priorityKws = active.filter(
    (kw) =>
      PRIORITY_CATEGORIES.has(kw.category) ||
      /^[A-Z]{2,10}$/.test(kw.keyword.trim()),
  );
  const batchableKws = active.filter((kw) => !priorityKws.includes(kw));

  type FetchJob = {
    url: string;
    keywords: MediaKeyword[];
  };
  const jobs: FetchJob[] = [];

  // Individual requests for priority keywords
  for (const kw of priorityKws) {
    jobs.push({ url: buildGoogleNewsUrl(kw), keywords: [kw] });
  }

  // Batched OR requests for the rest, grouped by language+country
  const groups = groupKeywords(batchableKws);
  for (const kwGroup of groups.values()) {
    for (const batch of chunk(kwGroup, batchSize)) {
      jobs.push({ url: buildBatchGoogleNewsUrl(batch), keywords: batch });
    }
  }

  // ── Execute with throttling ─────────────────────────────────────────
  const merged = new Map<string, FetchedArticle>();

  // Process in waves of 3 concurrent requests with delays between waves
  const CONCURRENCY = 3;
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const wave = jobs.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      wave.map(async (job) => {
        const res = await fetch(job.url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(timeoutMs),
          next: { revalidate: 900 },
        });
        if (!res.ok) return { keywords: job.keywords, items: [] as RawGoogleItem[] };
        const xml = await res.text();
        return { keywords: job.keywords, items: parseGoogleNewsFeed(xml) };
      }),
    );

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { keywords: jobKws, items } = r.value;

      for (const it of items) {
        const realUrl = extractRealUrl(it.link, it.description);
        const canonical = canonicaliseUrl(realUrl);
        const publishedTs = it.pubDate ? Date.parse(it.pubDate) : NaN;
        if (sinceTs && Number.isFinite(publishedTs) && publishedTs < sinceTs) {
          continue;
        }

        const outlet = resolveOutlet(canonical);
        const domain = domainFromUrl(canonical);
        const cleanSummary = stripHtml(it.description).slice(0, 500);

        // ── Quality filters ────────────────────────────────────────────
        if (applyBlocklist && isBlockedDomain(domain)) {
          dropped.blocked += 1;
          continue;
        }
        if (knownOutletsOnly && !outlet) {
          dropped.unknown += 1;
          continue;
        }
        if (minReachScore > 0 && (outlet?.reach_score ?? 0) < minReachScore) {
          dropped.lowReach += 1;
          continue;
        }

        // Match article text against ALL job keywords to attribute correctly
        const titleLower = it.title.toLowerCase();
        const descLower = it.description.toLowerCase();
        const matchedKws = jobKws.filter((kw) => {
          const kl = kw.keyword.toLowerCase();
          return titleLower.includes(kl) || descLower.includes(kl);
        });
        // If no specific keyword matched (broad OR hit), attribute to all
        const attributedKws = matchedKws.length > 0 ? matchedKws : jobKws;

        const existing = merged.get(canonical);
        if (existing) {
          for (const kw of attributedKws) {
            if (!existing.matched_keyword_ids.includes(kw.id)) {
              existing.matched_keyword_ids.push(kw.id);
              existing.matched_keywords.push(kw.keyword);
            }
          }
          continue;
        }

        merged.set(canonical, {
          url: realUrl,
          canonical_url: canonical,
          title: it.title,
          summary: cleanSummary || 'No description available.',
          source_name: it.source || outlet?.name || domain || 'Unknown',
          outlet_domain: outlet?.domain ?? domain,
          outlet,
          published_at: Number.isFinite(publishedTs)
            ? new Date(publishedTs).toISOString()
            : null,
          language: jobKws[0].language,
          country: outlet?.country ?? null,
          estimated_reach: outlet?.estimated_readership ?? 0,
          matched_keyword_ids: attributedKws.map((k) => k.id),
          matched_keywords: attributedKws.map((k) => k.keyword),
        });
      }
    }

    // Throttle between waves
    if (i + CONCURRENCY < jobs.length) {
      await sleep(delayMs);
    }
  }

  if (dropped.blocked || dropped.unknown || dropped.lowReach) {
    console.log(
      `[media-monitoring] quality filter dropped: ${dropped.blocked} blocked, ${dropped.unknown} unknown, ${dropped.lowReach} low-reach`,
    );
  }

  return Array.from(merged.values()).sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });
}
