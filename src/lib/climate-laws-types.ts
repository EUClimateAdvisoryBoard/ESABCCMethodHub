/**
 * Shared types for the National Level Climate Policies beta module.
 *
 * Used by the client page (beta/modules/national-climate-policies),
 * the API route (/api/national-climate-policies) and the server-side
 * fetcher (src/lib/climate-laws.ts). Keep this file free of server-only
 * imports — it is bundled into the client.
 */

export interface ClimatePolicy {
  id: string;
  countryCode: string; // ISO-2, matches src/data/eu-member-states.ts
  countryName: string;
  title: string;
  summary: string;
  category: string; // 'Law' (legislative) | 'Policy' (executive)
  type: string;
  date: string; // ISO yyyy-mm-dd, '' when unknown
  year: number | null;
  sectors: string[];
  instruments: string[];
  frameworks: string[];
  responses: string[];
  keywords: string[];
  hazards: string[];
  language: string;
  documentUrl: string;
  climateLawsUrl: string;
}

export interface PolicyDataset {
  snapshotDate: string;
  generatedFrom: string;
  source: {
    name: string;
    publisher: string;
    url: string;
    license: string;
    licenseUrl: string;
  };
  refresh: string;
  policies: ClimatePolicy[];
}
