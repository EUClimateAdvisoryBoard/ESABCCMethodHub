/**
 * EU-27 member states, used by the Project Workspace "Member State Space"
 * module. Country codes are ISO 3166-1 alpha-2 (Eurostat uses "EL" for
 * Greece and "UK" for the UK — we use the ISO codes here).
 */
export interface MemberState {
  code: string;
  name: string;
  eurostatCode: string;
}

export const EU_MEMBER_STATES: MemberState[] = [
  { code: 'AT', name: 'Austria',        eurostatCode: 'AT' },
  { code: 'BE', name: 'Belgium',        eurostatCode: 'BE' },
  { code: 'BG', name: 'Bulgaria',       eurostatCode: 'BG' },
  { code: 'HR', name: 'Croatia',        eurostatCode: 'HR' },
  { code: 'CY', name: 'Cyprus',         eurostatCode: 'CY' },
  { code: 'CZ', name: 'Czechia',        eurostatCode: 'CZ' },
  { code: 'DK', name: 'Denmark',        eurostatCode: 'DK' },
  { code: 'EE', name: 'Estonia',        eurostatCode: 'EE' },
  { code: 'FI', name: 'Finland',        eurostatCode: 'FI' },
  { code: 'FR', name: 'France',         eurostatCode: 'FR' },
  { code: 'DE', name: 'Germany',        eurostatCode: 'DE' },
  { code: 'GR', name: 'Greece',         eurostatCode: 'EL' },
  { code: 'HU', name: 'Hungary',        eurostatCode: 'HU' },
  { code: 'IE', name: 'Ireland',        eurostatCode: 'IE' },
  { code: 'IT', name: 'Italy',          eurostatCode: 'IT' },
  { code: 'LV', name: 'Latvia',         eurostatCode: 'LV' },
  { code: 'LT', name: 'Lithuania',      eurostatCode: 'LT' },
  { code: 'LU', name: 'Luxembourg',     eurostatCode: 'LU' },
  { code: 'MT', name: 'Malta',          eurostatCode: 'MT' },
  { code: 'NL', name: 'Netherlands',    eurostatCode: 'NL' },
  { code: 'PL', name: 'Poland',         eurostatCode: 'PL' },
  { code: 'PT', name: 'Portugal',       eurostatCode: 'PT' },
  { code: 'RO', name: 'Romania',        eurostatCode: 'RO' },
  { code: 'SK', name: 'Slovakia',       eurostatCode: 'SK' },
  { code: 'SI', name: 'Slovenia',       eurostatCode: 'SI' },
  { code: 'ES', name: 'Spain',          eurostatCode: 'ES' },
  { code: 'SE', name: 'Sweden',         eurostatCode: 'SE' },
];
