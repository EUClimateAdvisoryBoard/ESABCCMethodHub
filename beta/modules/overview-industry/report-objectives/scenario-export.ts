/**
 * Excel sheets for the whole-industry scenario database + NACE-C subsector
 * layer. Merged into the report-objectives workbook so one download carries the
 * evidence base, the scenario database and the subsector pathways — every row
 * with a clickable source link.
 */

import type { SheetSpec, CellValue } from '@/lib/exports/excel';
import {
  SCENARIOS,
  SUBSECTORS,
  ENSEMBLE_FAMILIES,
  INDUSTRY_HISTORY,
  INDUSTRY_BENCHMARKS,
  ensembleMedian,
  indexedValueAt,
  subsectorValueAt,
  subsectorIndexAt,
  scenarioSourceById,
  SUBSECTOR_YEARS,
} from '@/data/industry-scenario-db';

function link(sourceId: string): CellValue {
  const s = scenarioSourceById(sourceId);
  return s ? { text: s.url, hyperlink: s.url } : '';
}
function cite(sourceId: string): string {
  return scenarioSourceById(sourceId)?.cite ?? '';
}

export function scenarioSheets(): SheetSpec[] {
  const median = ensembleMedian(SCENARIOS);

  return [
    {
      name: 'Scenario database',
      title: 'Whole-industry scenario database — characterisation',
      subtitle:
        'One row per scenario: what it is characterised by, how it differs, scope, 2040 net-GHG level and the source link',
      headers: [
        'Scenario',
        'Ensemble',
        'Class',
        'Scope',
        'Highlighted (EU 2040)',
        'Net 2040 vs 1990',
        'Characterised by',
        'How it differs',
        'Full citation',
        'Source link',
      ],
      rows: SCENARIOS.map((s) => [
        s.label,
        s.ensemble,
        s.scenarioClass,
        s.scope,
        s.highlight ? 'yes' : '',
        s.net2040 ?? '',
        s.characterisedBy,
        s.differsBy,
        cite(s.sourceId),
        link(s.sourceId),
      ]),
    },
    {
      name: 'Scenario pathways',
      title: 'Whole-industry scenario pathways — values & indexed pace',
      subtitle:
        'Long format: one row per scenario-year with the value in its own unit and the base-year index (100 = base); the ensemble median (indexed) is appended',
      headers: ['Scenario', 'Scope', 'Year', 'Value', 'Unit', 'Index (base = 100)', 'Source link'],
      rows: [
        ...SCENARIOS.flatMap((s) =>
          s.series.map((p): CellValue[] => [
            s.label,
            s.scope,
            p.year,
            p.value,
            s.unit,
            Math.round((indexedValueAt(s, p.year) ?? 0) * 10) / 10,
            link(s.sourceId),
          ]),
        ),
        ...median.map((m): CellValue[] => [
          'ENSEMBLE MEDIAN',
          'indexed across pathways',
          m.year,
          '',
          'index',
          m.index,
          '',
        ]),
      ],
    },
    {
      name: 'Scenario ensembles',
      title: 'Scenario ensembles & databases',
      subtitle:
        'The scenario infrastructure the report draws on — what each is, its axis of variation, and whether it is plotted',
      headers: ['Ensemble / database', 'Operator', 'Scope', 'Characterised by', 'Axis of variation', 'Plotted', 'Full citation', 'Source link'],
      rows: ENSEMBLE_FAMILIES.map((e) => [
        e.name,
        e.operator,
        e.scope,
        e.characterisedBy,
        e.differsBy,
        e.plotted ? 'yes' : 'no',
        cite(e.sourceId),
        link(e.sourceId),
      ]),
    },
    {
      name: 'Subsectors (NACE C)',
      title: 'NACE Section-C manufacturing subsectors — 2019 profile & decarbonisation',
      subtitle:
        'EU-27 GHG in 2019/2021 (EEA inventory, reconciled to the 760 Mt industry total), the inventory categories, characterisation, levers and pathway note',
      headers: [
        'Subsector',
        'NACE divisions',
        'CRF categories',
        'GHG 2019 (Mt CO2e)',
        'GHG 2021 (Mt CO2e)',
        'Emission type',
        'Characterised by',
        'Near-zero levers',
        'Pathway note (source base year)',
        'Source link',
      ],
      rows: SUBSECTORS.map((s) => [
        s.label,
        s.naceDivisions.join(', '),
        s.crfCategories,
        s.ghg2019,
        s.ghg2021,
        s.processShare ?? '',
        s.characterisedBy,
        s.levers.join(' • '),
        s.pathwayNote ?? '',
        link(s.sourceId),
      ]),
    },
    {
      name: 'Subsector pathways',
      title: 'NACE Section-C subsector pathways (indicative, indexed to 2019)',
      subtitle:
        'Long format: one row per subsector-year with the indexed pathway and the implied absolute Mt (2019 level × index); indicative net-zero-2050 shapes from the cited roadmaps, not modelled tonnages',
      headers: ['Subsector', 'NACE divisions', 'Year', 'Index (2019 = 100)', 'Implied Mt CO2e', 'Source link'],
      rows: SUBSECTORS.flatMap((s) =>
        SUBSECTOR_YEARS.map((y): CellValue[] => [
          s.label,
          s.naceDivisions.join(', '),
          y,
          Math.round((subsectorIndexAt(s, y) ?? 100) * 10) / 10,
          subsectorValueAt(s, y),
          link(s.sourceId),
        ]),
      ),
    },
    {
      name: 'Industry history',
      title: 'EU-27 industry GHG history & benchmark markers',
      subtitle:
        'EEA GHG data viewer as compiled in the ESABCC Ch.5 Industry workbook (2005–2022), plus the Fit-for-55 2030, ESABCC 2040-advice and Climate-Target-Plan 2050 markers',
      headers: ['Year', 'Industry GHG (Mt CO2e)', 'Industry CO2 only (Mt)', 'Marker', 'Note'],
      rows: [
        ...INDUSTRY_HISTORY.map((h): CellValue[] => [h.year, h.ghg, h.co2 ?? '', '', '']),
        ...INDUSTRY_BENCHMARKS.map((b): CellValue[] => [
          b.year,
          b.ghg ?? '',
          b.co2 ?? '',
          b.label,
          b.note,
        ]),
      ],
    },
  ];
}
