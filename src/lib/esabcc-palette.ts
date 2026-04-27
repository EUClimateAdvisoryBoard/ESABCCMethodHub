/**
 * ESABCC (European Scientific Advisory Board on Climate Change) visual
 * identity palette. These 16 colours are the official chart palette used
 * throughout the method hub — applied consistently across every figure,
 * SVG map and data-driven visual on every method page.
 *
 * Source: ESABCC colour system sheet.
 */

export const ESABCC = {
  signature:    '#608c95', // teal-grey
  seaBlue:      '#3d5584',
  signalOrange: '#f26119',
  forestGreen:  '#2e422f',
  mintGreen:    '#a2c0b6',
  lightOrange:  '#f59e2d',
  lightBlue:    '#98c9ee',
  plum:         '#4f3a66',
  pollenYellow: '#efe973',
  skyBlue:      '#648eca',
  pansyPurple:  '#b497c7',
  red:          '#b04545',
  sageGreen:    '#64786a',
  lightPink:    '#f0cbd9',
  almostBlack:  '#2c2d2d',
  white:        '#ffffff',
} as const;

/** Ordered palette for categorical charts with many series. */
export const ESABCC_ORDERED: string[] = [
  ESABCC.signature,
  ESABCC.seaBlue,
  ESABCC.signalOrange,
  ESABCC.forestGreen,
  ESABCC.mintGreen,
  ESABCC.lightOrange,
  ESABCC.lightBlue,
  ESABCC.plum,
  ESABCC.pollenYellow,
  ESABCC.skyBlue,
  ESABCC.pansyPurple,
  ESABCC.red,
  ESABCC.sageGreen,
  ESABCC.lightPink,
];

/**
 * Wong (2011) deuteranope-safe categorical palette — 8 colours optimised
 * for users with the most common form of red-green colour blindness
 * (~8% of men of European descent). Used when the user opts into the
 * accessible-palette toggle on the Scenario Explorer.
 *
 * Reference: Wong, B. "Points of view: Color blindness." Nature Methods 8, 441 (2011).
 * https://www.nature.com/articles/nmeth.1618
 */
export const COLORBLIND_SAFE_ORDERED: string[] = [
  '#000000', // black
  '#E69F00', // orange
  '#56B4E9', // sky blue
  '#009E73', // bluish green
  '#F0E442', // yellow
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#CC79A7', // reddish purple
];

/**
 * Returns the appropriate ordered palette for the current preferences.
 * Pass true for the colour-blind-safe Wong palette; false (the default)
 * returns the standard ESABCC palette.
 */
export function paletteFor(colorBlindSafe: boolean): string[] {
  return colorBlindSafe ? COLORBLIND_SAFE_ORDERED : ESABCC_ORDERED;
}

/**
 * Canonical tech → colour mapping used by the Energy System, Climate
 * Finance and Maritime & Aviation method pages. The mapping keeps
 * physical intuition (yellow = solar, blue = wind, black = coal) while
 * only drawing from the ESABCC palette.
 */
export const ESABCC_TECH_COLORS: Record<string, string> = {
  // Power generation technologies
  'Onshore Wind':     ESABCC.skyBlue,
  'Offshore Wind':    ESABCC.seaBlue,
  'Solar PV':         ESABCC.pollenYellow,
  'Solar Thermal':    ESABCC.lightOrange,
  'Nuclear':          ESABCC.plum,
  'Hydro Reservoir':  ESABCC.signature,
  'Run-of-River':     ESABCC.mintGreen,
  'Pumped Hydro':     ESABCC.sageGreen,
  'Gas OCGT':         ESABCC.signalOrange,
  'Gas CCGT':         ESABCC.lightOrange,
  'Coal':             ESABCC.almostBlack,
  'Lignite':          ESABCC.almostBlack,
  'Biomass':          ESABCC.forestGreen,
  'Battery (4h)':     ESABCC.sageGreen,
  'Battery':          ESABCC.sageGreen,
  'Hydrogen Turbine': ESABCC.pansyPurple,
  'H2 Storage':       ESABCC.pansyPurple,
  'Oil':              ESABCC.red,
  'Imports':          ESABCC.lightPink,
  'Losses':           ESABCC.lightPink,
};

/** NGFS scenario colour mapping for the Climate Finance page. */
export const ESABCC_SCENARIO_COLORS: Record<string, string> = {
  'Net Zero 2050':       ESABCC.forestGreen,
  'Below 2°C':            ESABCC.signature,
  'Divergent Net Zero':  ESABCC.plum,
  'Delayed Transition':  ESABCC.pansyPurple,
  'NDCs (Current Pledges)': ESABCC.lightOrange,
  'Current Policies':    ESABCC.red,
};

/** Maritime & aviation bunker-fuel colour mapping. */
export const ESABCC_FUEL_COLORS: Record<string, string> = {
  'Heavy Fuel Oil (VLSFO)': ESABCC.almostBlack,
  'Marine Gas Oil':         ESABCC.sageGreen,
  'LNG (marine)':           ESABCC.signalOrange,
  'Bio-methanol':           ESABCC.mintGreen,
  'E-methanol':             ESABCC.forestGreen,
  'Green ammonia':          ESABCC.signature,
  'Liquid hydrogen (ship)': ESABCC.pansyPurple,
  'Jet A-1 (fossil)':       ESABCC.almostBlack,
  'HEFA SAF (bio)':         ESABCC.mintGreen,
  'Alcohol-to-Jet SAF':     ESABCC.forestGreen,
  'Fischer-Tropsch SAF':    ESABCC.sageGreen,
  'E-kerosene (PtL)':       ESABCC.seaBlue,
  'Liquid hydrogen (aero)': ESABCC.pansyPurple,
};

/** Semantic colours used for status, trends and KPIs. */
export const ESABCC_SEMANTIC = {
  positive: ESABCC.forestGreen,
  caution:  ESABCC.lightOrange,
  negative: ESABCC.red,
  neutral:  ESABCC.signature,
  info:     ESABCC.seaBlue,
} as const;
