'use client';
/**
 * Excel handover workbook for the Clean Tech sub-module.
 * ------------------------------------------------------
 * Everything BOTH sides of the Clean Tech page know, in one self-contained
 * .xlsx a colleague can work from without the site: Side 1 (inside industry)
 * — the EU-27 industry emission profile, every subsector with its sourced
 * emission statements, every decarbonisation lever with MAC / TRL /
 * availability / rationale and the clean-vs-old classification, the real
 * project pipeline (incl. FIDs), the emissions map and sector MACC behind the
 * figures; Side 2 (outside industry) — the clean-tech industries, the sectors
 * their products decarbonise, the sourced mitigation potentials and EU
 * manufacturing positions, the EC 2040 impact-assessment sectoral pathways
 * and the flagged priority & competitiveness read; plus the Clean Tech
 * reading list and every source with a clickable URL.
 *
 * Sheets:
 *   1.  "Read me"          — purpose, scope, method, caveats, provenance.
 *   2.  "Overview"         — headline facts + the EU ETS 2023 industry split.
 *   3.  "Subsectors"       — one row per subsector × emission statement (NACE map).
 *   4.  "Technologies"     — one row per lever: MAC, TRL, availability,
 *                            clean/old class + rationale, cost/readiness/scale.
 *   5.  "Projects"         — the real project pipeline, incl. FID status.
 *   6.  "Emissions map"    — the sourced Mt CO₂ blocks behind the treemap/sunburst.
 *   7.  "Sector MACC"      — the indicative sector-level abatement-cost curve.
 *   8.  "Ext. industries"  — Side 2: one row per clean-tech industry × sourced
 *                            statement (mitigation / 2040 deployment / EU position).
 *   9.  "Ext. matrix"      — Side 2: industry × demand-sector support matrix.
 *   10. "Ext. 2040 paths"  — Side 2: EC 2040-IA sectoral reductions + drivers.
 *   11. "Ext. priorities"  — Side 2: the editorial priority & competitiveness read.
 *   12. "Reading list"     — the Clean Tech chapter reading list (seeded corpus).
 *   13. "Sources"          — every source deduplicated, with clickable URL.
 *
 * Uses ExcelJS (existing project dep), same pattern as the Downstream
 * sub-module handover export (../downstream/export.ts).
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  CATALOGUE,
  CROSS_CUTTING_ENABLERS,
  OVERVIEW_FACTS,
  MANUFACTURING_SECTION,
  EMISSIONS_SPLIT,
  EMISSIONS_SPLIT_TOTAL_MT,
  EMISSIONS_SPLIT_SOURCE,
  EMISSIONS_MAP,
  EMISSIONS_MAP_UNSIZED,
  SECTOR_MACC,
  TECH_METRICS,
  TECH_CLASSIFICATION,
  TECH_CLASS_META,
  type Source,
  type Subsector,
} from '../cleantech-catalogue';
import {
  CLEANTECH_INDUSTRIES,
  DEMAND_SECTORS,
  EXTERNAL_HEADLINES,
  EXTERNAL_PRIORITIES,
  EXTERNAL_PRIORITY_NOTE,
  PATHWAY_CAVEAT,
  SECTOR_PATHWAYS,
} from '../cleantech-external-role';
import { CLEAN_TECH_READING_LIST } from '@/data/clean-tech-reading-list';

const NAVY = 'FF004B7F';
const TEAL = 'FF007B6C';
const ORANGE = 'FFFF9933';
const VIOLET = 'FF6667AB';
const GREY = 'FF54728C';

const CLASS_FILL: Record<string, string> = {
  clean: 'FFDDF2EC',
  old: 'FFFFEDDE',
};

function styleHeaderRow(ws: ExcelJS.Worksheet, argb: string) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.height = 30;
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function wrapAll(ws: ExcelJS.Worksheet, fromRow = 2) {
  ws.eachRow((row, n) => {
    if (n < fromRow) return;
    row.alignment = { vertical: 'top', wrapText: true };
  });
}

function linkCell(cell: ExcelJS.Cell, url: string) {
  cell.value = { text: url, hyperlink: url };
  cell.font = { color: { argb: 'FF0065A4' }, underline: true, size: 10 };
}

/** Inline citation text for a source ("org — title (year)"). URLs live in Sources. */
const cite = (s?: Source): string => (s ? `${s.org} — ${s.title}${s.year ? ` (${s.year})` : ''}` : '');

export async function exportCleanTechWorkbook(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ESABCC MethodHub — Overview Industry / Clean Tech';
  wb.created = new Date();
  const today = new Date().toISOString().slice(0, 10);

  /* Source collector for the dedicated Sources sheet (dedup by URL). */
  const sources = new Map<string, { src: Source; usedFor: Set<string> }>();
  const addSrc = (src: Source | undefined, usedFor: string) => {
    if (!src?.url) return;
    const entry = sources.get(src.url) ?? { src, usedFor: new Set<string>() };
    entry.usedFor.add(usedFor);
    sources.set(src.url, entry);
  };

  const ALL_SUBSECTORS: { sub: Subsector; sectionC: boolean }[] = [
    ...CATALOGUE.map((sub) => ({ sub, sectionC: true })),
    ...CROSS_CUTTING_ENABLERS.map((sub) => ({ sub, sectionC: false })),
  ];

  /* ── 1 · Read me ──────────────────────────────────────────────────── */
  const rm = wb.addWorksheet('Read me', { properties: { tabColor: { argb: NAVY } } });
  rm.columns = [{ width: 28 }, { width: 110 }];
  const rmRows: [string, string][] = [
    ['Workbook', 'Clean Tech — EU industry decarbonisation, both sides (handover copy)'],
    ['Compiled', today],
    ['Purpose', 'Handover pack for BOTH sides of the Clean Tech module. Side 1 (inside industry): the full catalogue mapping the EU-27 industry emission profile → each energy-intensive subsector → every available mitigation technology → its marginal abatement cost (MAC), technology readiness (TRL), commercial availability, real project pipeline (incl. Final Investment Decisions) and plain-language rationale for costs, readiness and scaling. Side 2 (outside industry): the new clean-tech manufacturing industries (solar PV, wind, batteries, EVs, electrolysers, heat pumps), the demand sectors their products decarbonise, sourced mitigation potentials, the EC 2040 impact-assessment sectoral pathways, the EU manufacturing position per industry and the flagged priority & competitiveness read. Built so a colleague can work from the file without the MethodHub.'],
    ['Scope', MANUFACTURING_SECTION.note],
    ['Sourcing rule', 'Every data point carries a real, working source link — nothing is invented. Figures come from EU official data (EEA, EU ETS/EUTL), IPCC AR6 WGIII Ch. 11, IEA roadmaps/databases and peer-reviewed / high-quality grey literature. MAC and TRL bands are study- and assumption-dependent: read each as "as reported by <source>", not a settled number.'],
    ['Clean vs old tech', `EDITORIAL overlay, not a sourced datum: "${TECH_CLASS_META.clean.label}" = ${TECH_CLASS_META.clean.definition} "${TECH_CLASS_META.old.label}" = ${TECH_CLASS_META.old.definition}`],
    ['Sheet guide', 'Overview = headline facts + ETS 2023 industry split. Subsectors = one row per subsector × sourced emission statement, with the NACE Rev. 2.1 mapping. Technologies = one row per decarbonisation lever with MAC / TRL / availability, the clean-vs-old call and the cost/readiness/scale rationale. Projects = the real pipeline with FID status. Emissions map + Sector MACC = the sourced numbers behind the figures. Ext. industries / Ext. matrix / Ext. 2040 paths / Ext. priorities = Side 2, the external role of the clean-tech industries (per-industry sourced statements; the industry × sector support matrix; the EC 2040 impact-assessment sectoral pathways with their modelled clean-tech drivers; the editorial priority & competitiveness read). Reading list = the Clean Tech chapter corpus. Sources = every link, deduplicated.'],
    ['Live module', '/beta/overview-industry/cleantech on the MethodHub (this workbook is generated from the same data files: beta/modules/overview-industry/cleantech-catalogue.ts and cleantech-external-role.ts).'],
    ['Provenance / caveat', 'Curated first build (v0.1): broad across the high-emitting subsectors and principal levers, deliberately extensible; gaps are marked rather than filled with guesses. The clean/old classification is an analytical judgement by MethodHub, clearly flagged as such.'],
  ];
  rmRows.forEach(([k, v]) => {
    const row = rm.addRow([k, v]);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: GREY } };
    row.getCell(1).alignment = { vertical: 'top', wrapText: true };
    row.getCell(2).alignment = { vertical: 'top', wrapText: true };
  });
  rm.spliceRows(1, 0, []);
  const title = rm.getCell('A1');
  title.value = 'Clean Tech — EU industry decarbonisation catalogue · handover workbook';
  title.font = { bold: true, size: 14, color: { argb: NAVY } };
  rm.mergeCells('A1:B1');
  addSrc(MANUFACTURING_SECTION.source, 'NACE Section C scope');
  addSrc(MANUFACTURING_SECTION.regulation, 'NACE Rev. 2.1 regulation');

  /* ── 2 · Overview ─────────────────────────────────────────────────── */
  const ov = wb.addWorksheet('Overview', { properties: { tabColor: { argb: TEAL } } });
  ov.columns = [
    { header: 'Block', key: 'block', width: 22 },
    { header: 'Item', key: 'label', width: 40 },
    { header: 'Value', key: 'value', width: 26 },
    { header: 'Detail', key: 'detail', width: 100 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  OVERVIEW_FACTS.forEach((f) => {
    ov.addRow({ block: 'Headline fact', label: f.label, value: f.value, detail: f.detail, source: cite(f.source) });
    addSrc(f.source, `Overview fact: ${f.label}`);
  });
  EMISSIONS_SPLIT.forEach((s) => {
    ov.addRow({
      block: 'EU ETS 2023 split',
      label: s.name,
      value: `${s.mt} Mt CO₂`,
      detail: `${((s.mt / EMISSIONS_SPLIT_TOTAL_MT) * 100).toFixed(1)}% of the ${EMISSIONS_SPLIT_TOTAL_MT} Mt EU ETS stationary-industry total (2023)`,
      source: cite(EMISSIONS_SPLIT_SOURCE),
    });
  });
  addSrc(EMISSIONS_SPLIT_SOURCE, 'EU ETS 2023 industry split');
  styleHeaderRow(ov, TEAL);
  wrapAll(ov);

  /* ── 3 · Subsectors ───────────────────────────────────────────────── */
  const sb = wb.addWorksheet('Subsectors', { properties: { tabColor: { argb: NAVY } } });
  sb.columns = [
    { header: 'Subsector', key: 'name', width: 30 },
    { header: 'Branch', key: 'branch', width: 22 },
    { header: 'NACE C?', key: 'sectionC', width: 16 },
    { header: 'NACE Rev. 2.1 codes', key: 'nace', width: 26 },
    { header: 'NACE mapping note', key: 'naceNote', width: 50 },
    { header: 'Summary', key: 'summary', width: 70 },
    { header: 'Emissions statement', key: 'value', width: 42 },
    { header: 'Note', key: 'note', width: 50 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  ALL_SUBSECTORS.forEach(({ sub, sectionC }) => {
    const base = {
      name: sub.name,
      branch: sub.branch,
      sectionC: sectionC ? 'Yes (Manufacturing)' : 'No — cross-cutting enabler',
      nace: sub.nace.join(', '),
      naceNote: sub.naceNote ?? '',
      summary: sub.summary,
    };
    if (sub.emissions.length === 0) {
      sb.addRow({ ...base, value: '', note: '', source: '' });
      return;
    }
    sub.emissions.forEach((e, i) => {
      sb.addRow({
        ...(i === 0 ? base : { name: sub.name, branch: sub.branch }),
        value: e.value,
        note: e.note ?? '',
        source: cite(e.source),
      });
      addSrc(e.source, `Subsector emissions: ${sub.name}`);
    });
  });
  styleHeaderRow(sb, NAVY);
  wrapAll(sb);

  /* ── 4 · Technologies ─────────────────────────────────────────────── */
  const tc = wb.addWorksheet('Technologies', { properties: { tabColor: { argb: TEAL } } });
  tc.columns = [
    { header: 'Subsector', key: 'sub', width: 26 },
    { header: 'Technology / lever', key: 'name', width: 38 },
    { header: 'Class', key: 'klass', width: 16 },
    { header: 'Classification rationale (editorial)', key: 'klassNote', width: 55 },
    { header: 'What it is', key: 'description', width: 65 },
    { header: 'MAC (as reported)', key: 'mac', width: 30 },
    { header: 'MAC note', key: 'macNote', width: 36 },
    { header: 'MAC source', key: 'macSrc', width: 45 },
    { header: 'MAC band €/tCO₂ (chart metric)', key: 'macBand', width: 22 },
    { header: 'TRL', key: 'trl', width: 30 },
    { header: 'TRL source', key: 'trlSrc', width: 45 },
    { header: 'Commercial availability', key: 'avail', width: 45 },
    { header: 'Availability source', key: 'availSrc', width: 45 },
    { header: 'Why costs are high', key: 'cost', width: 60 },
    { header: 'Cost source', key: 'costSrc', width: 45 },
    { header: 'What holds readiness back', key: 'ready', width: 60 },
    { header: 'Readiness source', key: 'readySrc', width: 45 },
    { header: 'What makes scaling hard', key: 'scale', width: 60 },
    { header: 'Scale source', key: 'scaleSrc', width: 45 },
    { header: 'Projects (n)', key: 'nProjects', width: 12 },
  ];
  ALL_SUBSECTORS.forEach(({ sub }) => {
    sub.technologies.forEach((t) => {
      const klass = TECH_CLASSIFICATION[t.id];
      const metric = TECH_METRICS[t.id];
      const macBand =
        metric?.macLowEur !== undefined && metric?.macHighEur !== undefined
          ? `${metric.macLowEur} to ${metric.macHighEur}${metric.costNote ? ` (${metric.costNote})` : ''}`
          : metric?.costNote ?? '';
      const added = tc.addRow({
        sub: sub.name,
        name: t.name,
        klass: klass ? TECH_CLASS_META[klass.class].label : '',
        klassNote: klass?.note ?? '',
        description: t.description,
        mac: t.mac?.value ?? '',
        macNote: t.mac?.note ?? '',
        macSrc: cite(t.mac?.source),
        macBand,
        trl: t.trl?.value ?? '',
        trlSrc: cite(t.trl?.source),
        avail: t.availability?.value ?? '',
        availSrc: cite(t.availability?.source),
        cost: t.rationale.costDrivers.value,
        costSrc: cite(t.rationale.costDrivers.source),
        ready: t.rationale.readinessBarriers.value,
        readySrc: cite(t.rationale.readinessBarriers.source),
        scale: t.rationale.scaleProblems.value,
        scaleSrc: cite(t.rationale.scaleProblems.source),
        nProjects: t.projects.length,
      });
      if (klass) {
        const cell = added.getCell(3);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CLASS_FILL[klass.class] } };
        cell.font = { bold: true, size: 10 };
      }
      addSrc(t.mac?.source, `MAC: ${t.name}`);
      addSrc(t.trl?.source, `TRL: ${t.name}`);
      addSrc(t.availability?.source, `Availability: ${t.name}`);
      addSrc(metric?.macSource, `MAC band: ${t.name}`);
      addSrc(t.rationale.costDrivers.source, `Cost drivers: ${t.name}`);
      addSrc(t.rationale.readinessBarriers.source, `Readiness barriers: ${t.name}`);
      addSrc(t.rationale.scaleProblems.source, `Scale problems: ${t.name}`);
    });
  });
  styleHeaderRow(tc, TEAL);
  wrapAll(tc);

  /* ── 5 · Projects ─────────────────────────────────────────────────── */
  const pj = wb.addWorksheet('Projects', { properties: { tabColor: { argb: ORANGE } } });
  pj.columns = [
    { header: 'Subsector', key: 'sub', width: 24 },
    { header: 'Technology', key: 'tech', width: 36 },
    { header: 'Project', key: 'name', width: 42 },
    { header: 'Company', key: 'company', width: 24 },
    { header: 'Location', key: 'location', width: 26 },
    { header: 'Capacity / scale', key: 'capacity', width: 45 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'FID / status detail', key: 'fid', width: 70 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Source', key: 'source', width: 50 },
    { header: 'URL', key: 'url', width: 70 },
  ];
  ALL_SUBSECTORS.forEach(({ sub }) =>
    sub.technologies.forEach((t) =>
      t.projects.forEach((p) => {
        const row = pj.addRow({
          sub: sub.name,
          tech: t.name,
          name: p.name,
          company: p.company ?? '',
          location: p.location ?? '',
          capacity: p.capacity ?? '',
          status: p.status,
          fid: p.fid ?? '',
          year: p.year ?? '',
          source: cite(p.source),
          url: '',
        });
        linkCell(row.getCell(11), p.source.url);
        addSrc(p.source, `Project: ${p.name}`);
      }),
    ),
  );
  styleHeaderRow(pj, ORANGE);
  wrapAll(pj);

  /* ── 6 · Emissions map ────────────────────────────────────────────── */
  const em = wb.addWorksheet('Emissions map', { properties: { tabColor: { argb: VIOLET } } });
  em.columns = [
    { header: 'Block', key: 'label', width: 42 },
    { header: 'Branch', key: 'branch', width: 22 },
    { header: 'Mt CO₂(e)/yr', key: 'mt', width: 14 },
    { header: 'Scope of figure', key: 'scope', width: 28 },
    { header: '% of EU ETS industry (569 Mt, 2023)', key: 'pct', width: 20 },
    { header: 'Note', key: 'note', width: 80 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  EMISSIONS_MAP.forEach((b) => {
    em.addRow({
      label: b.label,
      branch: b.branch,
      mt: b.mt,
      scope: b.scope,
      pct: b.etsBasis ? `${((b.mt / EMISSIONS_SPLIT_TOTAL_MT) * 100).toFixed(1)}%` : '— (different basis)',
      note: b.note ?? '',
      source: cite(b.source),
    });
    addSrc(b.source, `Emissions map: ${b.label}`);
  });
  EMISSIONS_MAP_UNSIZED.forEach((u) => {
    em.addRow({ label: u.label, branch: '', mt: '', scope: 'not sized', pct: '', note: u.reason, source: '' });
  });
  styleHeaderRow(em, VIOLET);
  wrapAll(em);

  /* ── 7 · Sector MACC ──────────────────────────────────────────────── */
  const mc = wb.addWorksheet('Sector MACC', { properties: { tabColor: { argb: NAVY } } });
  mc.columns = [
    { header: 'Sector', key: 'label', width: 24 },
    { header: 'Primary near-zero route', key: 'route', width: 40 },
    { header: 'Abatement potential (Mt CO₂/yr)', key: 'potentialMt', width: 18 },
    { header: 'MAC low (€/tCO₂)', key: 'macLow', width: 14 },
    { header: 'MAC high (€/tCO₂)', key: 'macHigh', width: 14 },
    { header: 'Potential source', key: 'potSrc', width: 50 },
    { header: 'MAC source', key: 'macSrc', width: 50 },
  ];
  SECTOR_MACC.forEach((b) => {
    mc.addRow({
      label: b.label,
      route: b.route,
      potentialMt: b.potentialMt,
      macLow: b.macLow,
      macHigh: b.macHigh,
      potSrc: cite(b.potentialSource),
      macSrc: cite(b.macSource),
    });
    addSrc(b.potentialSource, `MACC potential: ${b.label}`);
    addSrc(b.macSource, `MACC cost: ${b.label}`);
  });
  mc.addRow({});
  mc.addRow({
    label: 'CAVEATS',
    route:
      'Indicative, simplified curve: one primary route per sector (cheaper partial levers not drawn separately); cross-cutting levers excluded to avoid double-counting; baselines mix EU-27 ETS-activity and sector-association scopes / base years.',
  });
  styleHeaderRow(mc, NAVY);
  wrapAll(mc);

  /* ── 8 · Ext. industries (Side 2) ─────────────────────────────────── */
  const xi = wb.addWorksheet('Ext. industries', { properties: { tabColor: { argb: TEAL } } });
  xi.columns = [
    { header: 'Clean-tech industry', key: 'name', width: 26 },
    { header: 'NACE Rev. 2.1 codes', key: 'nace', width: 22 },
    { header: 'What it manufactures', key: 'what', width: 60 },
    { header: 'Block', key: 'block', width: 26 },
    { header: 'Statement', key: 'value', width: 55 },
    { header: 'Note', key: 'note', width: 55 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  EXTERNAL_HEADLINES.forEach((f) => {
    xi.addRow({ name: '(headline)', nace: '', what: '', block: 'Headline fact', value: f.value, note: f.note ?? '', source: cite(f.source) });
    addSrc(f.source, 'External role: headline fact');
  });
  CLEANTECH_INDUSTRIES.forEach((t) => {
    const blocks: [string, typeof t.mitigation][] = [
      ['Mitigation potential', t.mitigation],
      ['Deployment in 2040 modelling', t.scenarioDeployment],
      ['EU manufacturing position', t.euPosition],
    ];
    let first = true;
    blocks.forEach(([block, items]) =>
      items.forEach((e) => {
        xi.addRow({
          name: t.name,
          nace: first ? t.nace.join(', ') : '',
          what: first ? t.what : '',
          block,
          value: e.value,
          note: e.note ?? '',
          source: cite(e.source),
        });
        addSrc(e.source, `External role: ${t.name}`);
        first = false;
      }),
    );
  });
  styleHeaderRow(xi, TEAL);
  wrapAll(xi);

  /* ── 9 · Ext. matrix (Side 2) ─────────────────────────────────────── */
  const xm = wb.addWorksheet('Ext. matrix', { properties: { tabColor: { argb: ORANGE } } });
  xm.columns = [
    { header: 'Clean-tech industry', key: 'tech', width: 26 },
    { header: 'Demand sector it decarbonises', key: 'sector', width: 26 },
    { header: 'Role', key: 'role', width: 14 },
    { header: 'Mechanism', key: 'note', width: 90 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  CLEANTECH_INDUSTRIES.forEach((t) =>
    t.supports.forEach((c) => {
      xm.addRow({
        tech: t.name,
        sector: DEMAND_SECTORS.find((s) => s.id === c.sectorId)?.name ?? c.sectorId,
        role: c.role,
        note: c.note,
        source: cite(c.source),
      });
      addSrc(c.source, `Support matrix: ${t.name}`);
    }),
  );
  styleHeaderRow(xm, ORANGE);
  wrapAll(xm);

  /* ── 10 · Ext. 2040 paths (Side 2) ────────────────────────────────── */
  const xp = wb.addWorksheet('Ext. 2040 paths', { properties: { tabColor: { argb: VIOLET } } });
  xp.columns = [
    { header: 'Sector', key: 'sector', width: 22 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Reduction vs base year (%)', key: 'pct', width: 20 },
    { header: 'Base year', key: 'base', width: 12 },
    { header: 'Scenario', key: 'scenario', width: 34 },
    { header: 'Modelled clean-tech drivers', key: 'drivers', width: 45 },
    { header: 'Note', key: 'note', width: 70 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  SECTOR_PATHWAYS.forEach((p) => {
    const sector = DEMAND_SECTORS.find((s) => s.id === p.sectorId)?.name ?? p.sectorId;
    const drivers = p.drivenBy
      .map((id) => CLEANTECH_INDUSTRIES.find((t) => t.id === id)?.name ?? id)
      .join(' · ');
    p.points.forEach((pt, i) => {
      xp.addRow({
        sector: i === 0 ? sector : '',
        year: pt.year,
        pct: -pt.pct,
        base: p.baseYear,
        scenario: p.scenario,
        drivers: i === 0 ? drivers : '',
        note: i === 0 ? p.note ?? '' : '',
        source: cite(p.source),
      });
    });
    addSrc(p.source, `2040 pathway: ${sector}`);
  });
  xp.addRow({});
  xp.addRow({ sector: 'CAVEATS', year: '', pct: '', base: '', scenario: '', drivers: '', note: PATHWAY_CAVEAT });
  styleHeaderRow(xp, VIOLET);
  wrapAll(xp);

  /* ── 11 · Ext. priorities (Side 2, editorial) ─────────────────────── */
  const xr = wb.addWorksheet('Ext. priorities', { properties: { tabColor: { argb: NAVY } } });
  xr.columns = [
    { header: 'Rank', key: 'rank', width: 8 },
    { header: 'Clean-tech industry', key: 'tech', width: 26 },
    { header: 'Mitigation leverage (editorial)', key: 'rationale', width: 90 },
    { header: 'Competitiveness read (editorial)', key: 'competitiveness', width: 90 },
  ];
  EXTERNAL_PRIORITIES.forEach((p) => {
    xr.addRow({
      rank: p.rank,
      tech: CLEANTECH_INDUSTRIES.find((t) => t.id === p.techId)?.name ?? p.techId,
      rationale: p.rationale,
      competitiveness: p.competitiveness,
    });
  });
  xr.addRow({});
  xr.addRow({ rank: '', tech: 'NOTE', rationale: EXTERNAL_PRIORITY_NOTE });
  styleHeaderRow(xr, NAVY);
  wrapAll(xr);

  /* ── 12 · Reading list ────────────────────────────────────────────── */
  const rl = wb.addWorksheet('Reading list', { properties: { tabColor: { argb: TEAL } } });
  rl.columns = [
    { header: 'Organisation / authors', key: 'source', width: 40 },
    { header: 'Title', key: 'title', width: 75 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Tier', key: 'tier', width: 12 },
    { header: 'Reader', key: 'reader', width: 14 },
    { header: 'URL', key: 'url', width: 80 },
  ];
  CLEAN_TECH_READING_LIST.forEach((r) => {
    const row = rl.addRow({
      source: r.source,
      title: r.title,
      year: r.year ?? '',
      tier: r.tier === 'scientific' ? 'Scientific' : 'Grey',
      reader: r.reader || 'unassigned',
      url: '',
    });
    linkCell(row.getCell(6), r.url);
  });
  styleHeaderRow(rl, TEAL);
  wrapAll(rl);

  /* ── 13 · Sources ─────────────────────────────────────────────────── */
  const src = wb.addWorksheet('Sources', { properties: { tabColor: { argb: VIOLET } } });
  src.columns = [
    { header: 'Organisation', key: 'org', width: 38 },
    { header: 'Title', key: 'title', width: 75 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Used for', key: 'usedFor', width: 70 },
    { header: 'URL', key: 'url', width: 80 },
  ];
  [...sources.values()]
    .sort((a, b) => a.src.org.localeCompare(b.src.org) || a.src.title.localeCompare(b.src.title))
    .forEach(({ src: s, usedFor }) => {
      const uses = [...usedFor];
      const row = src.addRow({
        org: s.org,
        title: s.title,
        year: s.year ?? '',
        usedFor: uses.slice(0, 6).join(' · ') + (uses.length > 6 ? ` · +${uses.length - 6} more` : ''),
        url: '',
      });
      linkCell(row.getCell(5), s.url);
    });
  styleHeaderRow(src, VIOLET);
  wrapAll(src);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `clean-tech-catalogue-handover-${today}.xlsx`,
  );
}
