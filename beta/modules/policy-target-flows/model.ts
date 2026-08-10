/**
 * M·53 Policy Targets → Indicators — flow-chart assembly and coverage maths.
 * --------------------------------------------------------------------------
 * Turns the assessment ledger (src/data/target-indicators.ts) into the same
 * shape as the Policy Gap 2.0 flow charts in the Project Workspace: one chart
 * per sector column, read bottom-to-top —
 *
 *     [ sector goal ]                        dark band
 *          ↑
 *     [ first-order targets ]                one group per act
 *          ↑
 *     [ second-order targets ]               one group per act
 *
 *     [ procedural obligations ]             enabling band, no causal arrows
 *
 * The cards are M·36 targets rather than the report's hand-drawn levers, and the
 * white boxes beneath each card are its indicators — exactly the white progress
 * boxes of the report figures, but sourced from the assessment ledger.
 *
 * Grouping by act is what keeps the chart readable at this scale: 544 targets do
 * not fit as free-standing cards, and an act is the unit the Policy Gap report
 * argues about anyway. Connectors therefore run between act groups: an act's
 * second-order group feeds its first-order group, which feeds the sector goal.
 *
 * Everything here is derivation — no data is authored in this file except the
 * sector goal band, which is compiled from the cited provisions and flagged as
 * AI-compiled in the UI.
 */
import {
  FAMILY_BY_KEY,
  MILESTONE_FAMILY_KEY,
  type AssessmentRoute,
  type FlowColumnKey,
  type MeasurementFamily,
  type Rung,
  type TargetAssessment,
} from '@/data/target-indicators';
import { SECTOR_META } from '@/data/policy-targets';
import { ECNO_INDICATORS, type Indicator } from '@/data/ecno-indicators';
import { ESABCC_REPORT_INDICATORS } from '@/data/esabcc-indicators';
import { ALL_ADVANCED_INDICATORS } from '@/data/advanced-indicators';
import { ALL_BETA_INDICATORS } from '@/data/beta-indicators';

// ── Indicator lookup ────────────────────────────────────────────────────────
/**
 * The four curated indicator sets, indexed by id — the same union the Project
 * Workspace flow charts resolve their white boxes against, built here directly
 * so the module does not pull the whole framework-board dataset with it.
 */
export const INDICATOR_INDEX: Record<string, Indicator> = Object.fromEntries(
  [...ECNO_INDICATORS, ...ALL_BETA_INDICATORS, ...ALL_ADVANCED_INDICATORS, ...ESABCC_REPORT_INDICATORS]
    .map((i) => [i.id, i]),
);

export function resolveIndicators(ids: string[]): Indicator[] {
  return ids.map((id) => INDICATOR_INDEX[id]).filter(Boolean);
}

// ── Columns ─────────────────────────────────────────────────────────────────
export interface FlowColumn {
  key: FlowColumnKey;
  label: string;
  /** Short label for the switcher. */
  short: string;
  color: string;
  /** The sector goal the targets in this column serve. */
  goal: string;
  /** Where that goal statement comes from — always an act and a provision. */
  goalSource: string;
  /** Measurement families that stand for the goal itself (the dark band's
   *  white boxes). Keys resolve in the ledger's family catalogue. */
  goalFamilies: string[];
}

/**
 * The nine columns: the eight sectors/systems M·36 classifies targets against,
 * plus a cross-cutting column for targets that carry no sector (governance,
 * finance, external action).
 *
 * The goal statements are compiled from the provisions cited in `goalSource` —
 * AI-compiled, pending Secretariat verification. They are the module's only
 * authored prose about legal content; everything else is quoted from M·36.
 */
export const FLOW_COLUMNS: FlowColumn[] = [
  {
    key: 'energy',
    label: 'Energy',
    short: 'Energy',
    color: SECTOR_META.find((s) => s.key === 'energy')!.color,
    goal: 'A decarbonised and secure energy system: at least 42.5 % renewables in gross final '
      + 'consumption by 2030 (indicative 45 %), with binding energy-consumption limits.',
    goalSource: 'Dir. (EU) 2023/2413 Art. 3; Dir. (EU) 2023/1791 Art. 4',
    goalFamilies: ['energy-supply-ghg', 'res-share', 'energy-consumption'],
  },
  {
    key: 'buildings',
    label: 'Buildings and built environment',
    short: 'Buildings',
    color: SECTOR_META.find((s) => s.key === 'buildings')!.color,
    goal: 'A zero-emission building stock by 2050, reached through minimum energy performance '
      + 'standards and national renovation trajectories.',
    goalSource: 'Dir. (EU) 2024/1275 Arts. 1, 3, 9',
    goalFamilies: ['buildings-ghg', 'renovation', 'zero-emission-buildings'],
  },
  {
    key: 'transport',
    label: 'Transport and mobility',
    short: 'Transport',
    color: SECTOR_META.find((s) => s.key === 'transport')!.color,
    goal: 'Zero-emission road transport (100 % CO₂ reduction for new cars and vans from 2035), '
      + 'with the recharging, refuelling and rail capacity to make it usable.',
    goalSource: 'Reg. (EU) 2023/851 Art. 1; Reg. (EU) 2023/1804; Reg. (EU) 2024/1679',
    goalFamilies: ['transport-ghg', 'car-co2', 'charging-infrastructure'],
  },
  {
    key: 'industry',
    label: 'Industry',
    short: 'Industry',
    color: SECTOR_META.find((s) => s.key === 'industry')!.color,
    goal: 'Industrial emissions falling in line with the ETS cap while production stays in the EU: '
      + 'clean-tech manufacturing, circular material use and carbon management.',
    goalSource: 'Dir. 2003/87/EC as amended by Dir. (EU) 2023/959; Reg. (EU) 2024/1735; Reg. (EU) 2023/956',
    goalFamilies: ['industry-ghg', 'ets-emissions', 'circularity'],
  },
  {
    key: 'agrifood',
    label: 'Agri-food',
    short: 'Agri-food',
    color: SECTOR_META.find((s) => s.key === 'agrifood')!.color,
    goal: 'Agricultural emissions on the Effort Sharing trajectory (−40 % EU-wide by 2030 vs 2005 '
      + 'across the non-ETS sectors), with nutrient losses and food waste cut.',
    goalSource: 'Reg. (EU) 2018/842 as amended by Reg. (EU) 2023/857 Art. 4; Reg. (EU) 2021/2115',
    goalFamilies: ['agri-ghg', 'nutrients', 'diets-food-waste'],
  },
  {
    key: 'ecosystems',
    label: 'Land and marine ecosystems',
    short: 'Ecosystems',
    color: SECTOR_META.find((s) => s.key === 'ecosystems')!.color,
    goal: 'A net land sink of −310 Mt CO₂eq in 2030, and restoration measures on at least 20 % of '
      + 'the EU\'s land and sea areas by 2030.',
    goalSource: 'Reg. (EU) 2018/841 as amended by Reg. (EU) 2023/839 Art. 4; Reg. (EU) 2024/1991 Art. 1',
    goalFamilies: ['lulucf-sink', 'forests', 'restoration'],
  },
  {
    key: 'water',
    label: 'Water',
    short: 'Water',
    color: SECTOR_META.find((s) => s.key === 'water')!.color,
    goal: 'Good status for EU water bodies and a water-resilient economy: abstraction within '
      + 'renewable resources, and flood risk managed river basin by river basin.',
    goalSource: 'Dir. 2000/60/EC Art. 4; Dir. 2007/60/EC Arts. 7–8; COM(2025) 280 (Water Resilience Strategy)',
    goalFamilies: ['water-stress', 'water-quality', 'floods-droughts'],
  },
  {
    key: 'health',
    label: 'Health',
    short: 'Health',
    color: SECTOR_META.find((s) => s.key === 'health')!.color,
    goal: 'Health systems and populations protected from climate-sensitive risks — heat, '
      + 'vector-borne disease, air pollution — with EU-level preparedness and response capacity.',
    goalSource: 'Reg. (EU) 2022/2371 Arts. 5–7; COM(2021) 82 (EU Adaptation Strategy)',
    goalFamilies: ['heat-health', 'infectious-disease', 'air-quality', 'health-preparedness'],
  },
  {
    key: 'cross-cutting',
    label: 'Cross-cutting: governance, finance, external action',
    short: 'Cross-cutting',
    color: '#6B7280',
    goal: 'Climate neutrality by 2050 and at least −55 % net emissions by 2030, with the '
      + 'governance, finance and adaptation machinery to deliver and verify it.',
    goalSource: 'Reg. (EU) 2021/1119 Arts. 2, 4, 5; Reg. (EU) 2018/1999',
    goalFamilies: ['ghg-total', 'climate-finance-eu-budget', 'adaptation-governance'],
  },
];

export const COLUMN_BY_KEY: Record<string, FlowColumn> = Object.fromEntries(
  FLOW_COLUMNS.map((c) => [c.key, c]),
);

// ── Filtering ───────────────────────────────────────────────────────────────
export interface Filters {
  column: FlowColumnKey;
  /** '' = all acts. */
  policy: string;
  /** '' = all routes. */
  route: string;
  /** true = only rows whose match rests on the heading/act title. */
  weakOnly: boolean;
  /** true = only rows with no curated series (the measurement gaps). */
  gapsOnly: boolean;
  query: string;
}

export const EMPTY_FILTERS: Filters = {
  column: 'energy', policy: '', route: '', weakOnly: false, gapsOnly: false, query: '',
};

export function applyFilters(rows: TargetAssessment[], f: Filters, columnScoped = true): TargetAssessment[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter((r) => {
    if (columnScoped && !r.columns.includes(f.column)) return false;
    if (f.policy && r.policy_id !== f.policy) return false;
    if (f.route && r.route !== f.route) return false;
    if (f.weakOnly && r.confidence !== 'weak') return false;
    if (f.gapsOnly && r.route === 'series') return false;
    if (q) {
      const hay = `${r.label} ${r.target.target_text} ${r.target.policy_name} ${r.families.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ── Flow-chart assembly ─────────────────────────────────────────────────────
/** One act's cards inside one row of one column. */
export interface ActGroup {
  /** Stable DOM/connector id: `${rung}:${policyId}`. */
  id: string;
  policyId: string;
  policyShort: string;
  policyName: string;
  eurlexUrl: string;
  rows: TargetAssessment[];
}

export interface FlowChart {
  column: FlowColumn;
  /** Groups of first-order targets, act by act. */
  outcomes: ActGroup[];
  /** Groups of second-order targets, act by act. */
  levers: ActGroup[];
  /** Procedural obligations, act by act (drawn in the enabling band). */
  enabling: ActGroup[];
  /** Connector edges, child → parent, by group id ('goal' is the dark band). */
  edges: { from: string; to: string }[];
  /** Curated indicator ids standing for the goal itself. */
  goalIndicatorIds: string[];
  /** Every act appearing anywhere in the column, for the act filter. */
  policies: { id: string; short: string; count: number }[];
}

function groupByAct(rows: TargetAssessment[], rung: Rung): ActGroup[] {
  const byAct = new Map<string, ActGroup>();
  for (const r of rows) {
    if (r.rung !== rung) continue;
    let g = byAct.get(r.policy_id);
    if (!g) {
      g = {
        id: `${rung}:${r.policy_id}`,
        policyId: r.policy_id,
        policyShort: r.target.policy_short,
        policyName: r.target.policy_name,
        eurlexUrl: r.target.eurlex_url,
        rows: [],
      };
      byAct.set(r.policy_id, g);
    }
    g.rows.push(r);
  }
  for (const g of byAct.values()) {
    g.rows.sort((a, b) => a.target.target_number - b.target.target_number);
  }
  // Biggest groups first — the acts that carry the most of the sector's targets
  // are the ones the Policy Gap report leads on.
  return [...byAct.values()].sort((a, b) => b.rows.length - a.rows.length || a.policyShort.localeCompare(b.policyShort));
}

export function buildFlowChart(all: TargetAssessment[], f: Filters): FlowChart {
  const column = COLUMN_BY_KEY[f.column] ?? FLOW_COLUMNS[0];
  const rows = applyFilters(all, f);
  const outcomes = groupByAct(rows, 'outcome');
  const levers = groupByAct(rows, 'lever');
  const enabling = groupByAct(rows, 'enabling');

  // Each act's second-order group feeds its own first-order group where the act
  // has one in this column, and the sector goal where it does not. First-order
  // groups always feed the goal. Procedural obligations carry no causal arrow —
  // they are drawn in the enabling band, exactly as the report figures do.
  const outcomeByAct = new Map(outcomes.map((g) => [g.policyId, g]));
  const edges: { from: string; to: string }[] = [];
  for (const g of outcomes) edges.push({ from: g.id, to: 'goal' });
  for (const g of levers) edges.push({ from: g.id, to: outcomeByAct.get(g.policyId)?.id ?? 'goal' });

  const counts = new Map<string, { id: string; short: string; count: number }>();
  for (const r of all) {
    if (!r.columns.includes(f.column)) continue;
    const c = counts.get(r.policy_id) ?? { id: r.policy_id, short: r.target.policy_short, count: 0 };
    c.count++;
    counts.set(r.policy_id, c);
  }

  const goalIndicatorIds = [...new Set(
    column.goalFamilies.flatMap((k) => FAMILY_BY_KEY[k]?.indicator_ids ?? []),
  )];

  return {
    column,
    outcomes,
    levers,
    enabling,
    edges,
    goalIndicatorIds,
    policies: [...counts.values()].sort((a, b) => b.count - a.count || a.short.localeCompare(b.short)),
  };
}

// ── Per-column coverage ─────────────────────────────────────────────────────
export interface ColumnCoverage {
  column: FlowColumn;
  total: number;
  series: number;
  dataset: number;
  milestone: number;
  /** Share of the column's targets that a curated series already measures. */
  seriesShare: number;
}

export function columnCoverage(all: TargetAssessment[]): ColumnCoverage[] {
  return FLOW_COLUMNS.map((column) => {
    const rows = all.filter((r) => r.columns.includes(column.key));
    const series = rows.filter((r) => r.route === 'series').length;
    const dataset = rows.filter((r) => r.route === 'dataset').length;
    const milestone = rows.filter((r) => r.route === 'milestone').length;
    return {
      column,
      total: rows.length,
      series,
      dataset,
      milestone,
      seriesShare: rows.length ? (series / rows.length) * 100 : 0,
    };
  });
}

// ── The one-figure overview ─────────────────────────────────────────────────
/**
 * The Policy Gap report's own indicator set: the 2024 report progress
 * indicators, plus the ECNO ids they are declared duplicates of (the ESABCC
 * copy is authoritative, but a target matched to the ECNO twin is measuring
 * the same concept). A measured target whose series sits in this set is one
 * the report could track today with its existing indicator framework.
 */
const REPORT_SET_IDS: Set<string> = new Set(
  ESABCC_REPORT_INDICATORS.flatMap((i) => (i.duplicateOf ? [i.id, i.duplicateOf] : [i.id])),
);

export function inReportSet(r: TargetAssessment): boolean {
  return r.route === 'series' && r.indicator_ids.some((id) => REPORT_SET_IDS.has(id));
}

/** Route mix of an arbitrary set of rows — the unit both the overview figure
 *  and the collapsed act chips are drawn from. */
export interface RouteCounts {
  series: number;
  dataset: number;
  milestone: number;
  total: number;
  /** Of the `series` rows, those measured by the Policy Gap report's own set. */
  reportSet: number;
}

export function routeCounts(rows: TargetAssessment[]): RouteCounts {
  return {
    series: rows.filter((r) => r.route === 'series').length,
    dataset: rows.filter((r) => r.route === 'dataset').length,
    milestone: rows.filter((r) => r.route === 'milestone').length,
    total: rows.length,
    reportSet: rows.filter(inReportSet).length,
  };
}

export const ROUTE_ORDER: AssessmentRoute[] = ['series', 'dataset', 'milestone'];

/**
 * One sector column reduced to the numbers the overview figure draws: how many
 * targets sit on each row of that sector's chart, how they are measured, and
 * how much of the sector the filters have left standing.
 *
 * `total` is filter-aware so the map and the chart below it can never disagree;
 * `unfilteredTotal` is kept alongside it so the figure can still say what share
 * of the sector is in view rather than silently shrinking.
 */
export interface ColumnOverview {
  column: FlowColumn;
  /** Rows in this column under the current filters, sector selection aside. */
  total: number;
  /** Rows in this column with no filters applied — the denominator. */
  unfilteredTotal: number;
  /** Acts contributing at least one row in view. */
  acts: number;
  /** Rows whose family match rests on the heading or the act's title. */
  weak: number;
  byRung: Record<Rung, number>;
  routes: RouteCounts;
  /** Share of the rows in view that a curated series already measures, 0–100. */
  seriesShare: number;
  /** The acts carrying most of the column, biggest first — the chart's own order. */
  topActs: { short: string; count: number }[];
}

export function overviewColumns(all: TargetAssessment[], f: Filters): ColumnOverview[] {
  // Every filter except the sector selection: the figure exists to show where
  // the filtered rows are, across all nine columns at once.
  const inScope = applyFilters(all, f, false);
  return FLOW_COLUMNS.map((column) => {
    const rows = inScope.filter((r) => r.columns.includes(column.key));
    const byAct = new Map<string, number>();
    for (const r of rows) byAct.set(r.target.policy_short, (byAct.get(r.target.policy_short) ?? 0) + 1);
    const routes = routeCounts(rows);
    return {
      column,
      total: rows.length,
      unfilteredTotal: all.filter((r) => r.columns.includes(column.key)).length,
      acts: byAct.size,
      weak: rows.filter((r) => r.confidence === 'weak').length,
      byRung: {
        outcome: rows.filter((r) => r.rung === 'outcome').length,
        lever: rows.filter((r) => r.rung === 'lever').length,
        enabling: rows.filter((r) => r.rung === 'enabling').length,
      },
      routes,
      seriesShare: rows.length ? (routes.series / rows.length) * 100 : 0,
      topActs: [...byAct.entries()]
        .map(([short, count]) => ({ short, count }))
        .sort((a, b) => b.count - a.count || a.short.localeCompare(b.short))
        .slice(0, 3),
    };
  });
}

/**
 * The measurement gaps, ranked the way a report section would want them: the
 * families with no curated series, most-targets-first, each with the dataset
 * that would close it.
 */
export interface GapFamily {
  family: MeasurementFamily;
  targets: number;
  policies: number;
}

export function gapFamilies(all: TargetAssessment[]): GapFamily[] {
  const byFamily = new Map<string, { targets: number; policies: Set<string> }>();
  for (const r of all) {
    if (r.route === 'series') continue;
    for (const k of r.families) {
      if (k === MILESTONE_FAMILY_KEY) continue;
      const fam = FAMILY_BY_KEY[k];
      if (!fam || fam.indicator_ids.length) continue;
      const e = byFamily.get(k) ?? { targets: 0, policies: new Set<string>() };
      e.targets++;
      e.policies.add(r.policy_id);
      byFamily.set(k, e);
    }
  }
  return [...byFamily.entries()]
    .map(([k, e]) => ({ family: FAMILY_BY_KEY[k], targets: e.targets, policies: e.policies.size }))
    .sort((a, b) => b.targets - a.targets || a.family.label.localeCompare(b.family.label));
}

// ── Ledger export ───────────────────────────────────────────────────────────
export interface LedgerColumn {
  header: string;
  value: (r: TargetAssessment) => string;
}

/** The ledger as the Policy Gap report would cite it: one row per target, the
 *  verbatim requirement, and how it is measured. */
export const LEDGER_COLUMNS: LedgerColumn[] = [
  { header: 'Target id', value: (r) => r.id },
  { header: 'Act', value: (r) => r.target.policy_name },
  { header: 'Provision', value: (r) => r.target.article },
  { header: 'Target (verbatim)', value: (r) => r.target.target_text },
  { header: 'Timeline', value: (r) => r.target.timeline || 'Unspecified' },
  { header: 'Order', value: (r) => (r.target.target_order === 1 ? 'First order' : r.target.target_order === 2 ? 'Second order' : '') },
  { header: 'Flow-chart row', value: (r) => r.rung },
  { header: 'Sector columns', value: (r) => r.columns.join('; ') },
  { header: 'Assessment route', value: (r) => r.route },
  { header: 'Measurement family', value: (r) => r.families.map((k) => FAMILY_BY_KEY[k]?.label ?? k).join('; ') },
  { header: 'Indicator ids', value: (r) => r.indicator_ids.join('; ') },
  { header: 'Source dataset', value: (r) => r.families.map((k) => FAMILY_BY_KEY[k]?.dataset.name ?? '').filter(Boolean).join('; ') },
  { header: 'Dataset URL', value: (r) => r.families.map((k) => FAMILY_BY_KEY[k]?.dataset.url ?? '').filter(Boolean).join('; ') },
  { header: 'Match confidence', value: (r) => r.confidence },
  { header: 'Matched terms', value: (r) => Object.entries(r.evidence).map(([k, ts]) => `${k}: ${ts.join(', ')}`).join(' | ') },
  { header: 'Override reason', value: (r) => r.override_reason },
  { header: 'Source (EUR-Lex)', value: (r) => r.target.eurlex_url },
];

const csvCell = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;

export function ledgerCsv(rows: TargetAssessment[]): string {
  const head = LEDGER_COLUMNS.map((c) => csvCell(c.header)).join(',');
  const body = rows.map((r) => LEDGER_COLUMNS.map((c) => csvCell(c.value(r))).join(','));
  return [head, ...body].join('\r\n');
}
