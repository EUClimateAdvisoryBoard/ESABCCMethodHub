/**
 * Categorical breakdowns for indicators the report presents as a stacked bar
 * chart rather than an annual time series (e.g. I7 — number of low-carbon
 * projects by technology group and project scale, report Figures 29/30).
 *
 * Keyed by indicator id; when present, the indicator detail view renders this
 * as a stacked bar chart "just like the report" instead of a trend line.
 * Numbers transcribed from Ch5 'I7a,b&c. Low carbon projects'.
 */
export interface BreakdownSeries {
  label: string;
  color: string;
  /** one value per category, in the same order as `categories`. */
  values: number[];
}

export interface IndicatorBreakdown {
  unit: string;
  categories: string[];
  /** stacked bottom-to-top in array order. */
  series: BreakdownSeries[];
  caption?: string;
}

export const INDICATOR_BREAKDOWNS: Record<string, IndicatorBreakdown> = {
  // Figure 29 — steel low-carbon projects by technology group and scale
  'esabcc-i7a-steel-projects': {
    unit: '# of projects',
    categories: ['DRI', 'H2 production', 'EAF', 'Other', 'CCS/CCU'],
    series: [
      { label: 'Full scale', color: '#8FC0E0', values: [15, 7, 5, 1, 1] },
      { label: 'Demo', color: '#27408B', values: [3, 2, 0, 0, 0] },
      { label: 'Pilot', color: '#F0C0CE', values: [3, 1, 0, 3, 1] },
      { label: 'R&D', color: '#9C7BB8', values: [2, 2, 0, 2, 0] },
    ],
    caption: 'Source: Green Steel Tracker database (LeadIT).',
  },
  // Figure 30 — cement low-carbon projects by technology group and scale
  'esabcc-i7b-cement-projects': {
    unit: '# of projects',
    categories: ['CCS/CCU', 'Material substitution/recycling', 'Fuel switch/electrification', 'Energy efficiency', 'Mineralization'],
    series: [
      { label: 'Full scale', color: '#8FC0E0', values: [2, 0, 1, 1, 0] },
      { label: 'Demo', color: '#27408B', values: [6, 1, 0, 0, 0] },
      { label: 'Pilot', color: '#F0C0CE', values: [13, 6, 4, 0, 1] },
      { label: 'R&D', color: '#9C7BB8', values: [9, 8, 2, 1, 2] },
      { label: 'Unspecified', color: '#5E8C3D', values: [5, 0, 0, 0, 0] },
    ],
    caption: "Source: Cembureau's online map of innovation projects.",
  },
  // Base-chemicals low-carbon projects by route (planned + started)
  'esabcc-i7c-chemicals-projects': {
    unit: '# of projects',
    categories: ['Renewables', 'Chemical recycling', 'H2 & derivatives', 'CCS/CCU', 'Efficiency', 'Biochemicals', 'Mechanical recycling', 'E-cracker'],
    series: [
      { label: 'Started', color: '#27408B', values: [24, 14, 7, 6, 10, 12, 11, 1] },
      { label: 'Planned', color: '#8FC0E0', values: [30, 14, 20, 12, 5, 2, 2, 1] },
    ],
    caption: 'Source: industry low-carbon project databases.',
  },
};
