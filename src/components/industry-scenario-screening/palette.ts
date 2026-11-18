/**
 * Chart palette of the Scenario database tab, taken from the EEA deck
 * "EU industry emission pathways in scenario databases: screening against the
 * ESABCC criteria" (18 November 2026) so the tab and the slides read alike.
 *
 * Colour-vision-deficiency note: the stage ramp (lilac → violet → amber →
 * deep purple) alternates lightness as well as hue, so adjacent stages stay
 * distinguishable under deuteranopia and protanopia; WEM (dark teal) and WAM
 * (red) are also told apart by dash pattern, and the stage of every pathway
 * is repeated as text in the table and tooltips, never colour alone.
 */
export const DECK = {
  ink: '#1f1f1f',
  ink2: '#474747',
  muted: '#7a7a7a',
  teal: '#608c95',
  tealD: '#3f6670',
  tealL: '#97b4ba',
  tealXL: '#eef3f4',
  orange: '#ec621d',
  red: '#a84048',
  grid: '#dfdfdf',
  pathway: '#9b9b9b',
} as const;
