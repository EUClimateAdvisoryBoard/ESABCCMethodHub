#!/usr/bin/env node
/**
 * Fetch the Eurostat data behind beta/modules/overview-industry/trade-flows.
 * ---------------------------------------------------------------------------
 * Regenerates `beta/modules/overview-industry/trade-flows/eurostat-io.generated.ts`
 * from five official Eurostat datasets (dissemination API, no key needed):
 *
 *   1. ext_tec01        — trade backbone: EU-27 imports/exports by NACE Section C
 *                         division, intra-EU vs extra-EU, 2023 + 2024 (enterprise-
 *                         based TEC attribution). Divisions AND the Section C
 *                         aggregate row (they differ — see methodology).
 *   2. naio_10_fgti     — FIGARO application: EU-27 imports of each industry's
 *                         products by origin country, 2023 (input–output framework;
 *                         product-based attribution, 23 named partners + rest).
 *   3. naio_10_fgte     — FIGARO application: EU-27 exports by destination, 2023.
 *   4. naio_10_fgfoee   — FIGARO application: foreign value added embedded in
 *                         EU-27 exports, by country of origin of that value added,
 *                         2023. FVA share = FVA / gross extra-EU exports (fgte).
 *   5. naio_10_cp1610   — EU-27 use table at basic prices, 2023: intermediate
 *                         inputs of each manufacturing division by product, split
 *                         domestic vs imported — the actual input–output "what
 *                         does this industry buy and how much of it is imported".
 *   6. nrg_ind_id       — energy import dependency (total, oil, gas), 2021–2024.
 *
 * Usage:  node scripts/fetch-trade-flows-io-data.mjs
 * Output: beta/modules/overview-industry/trade-flows/eurostat-io.generated.ts
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'beta/modules/overview-industry/trade-flows/eurostat-io.generated.ts',
);

const DIVISIONS = Array.from({ length: 24 }, (_, i) => `C${10 + i}`);
/** FIGARO application datasets group some divisions. */
const FIGARO_INDUSTRIES = [
  'C', 'C10-C12', 'C13-C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C23',
  'C24', 'C25', 'C26', 'C27', 'C28', 'C29', 'C30', 'C31_C32', 'C33',
];
/**
 * The EU-27 use table populates the grouped industries (C10-12, C13-15, C31_32)
 * but not their individual divisions — use the disjoint 19-industry set.
 */
const USE_INDUSTRIES = [
  'C10-12', 'C13-15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C23',
  'C24', 'C25', 'C26', 'C27', 'C28', 'C29', 'C30', 'C31_32', 'C33',
];
const EU_MS = new Set([
  'BE', 'BG', 'CZ', 'DK', 'DE', 'EE', 'IE', 'EL', 'ES', 'FR', 'HR', 'IT', 'CY', 'LV',
  'LT', 'LU', 'HU', 'MT', 'NL', 'AT', 'PL', 'PT', 'RO', 'SI', 'SK', 'FI', 'SE',
]);
/** Standard ESA A*64 product list (aggregation level guaranteed in the EU use table). */
const PRODUCTS_64 = [
  'CPA_A01', 'CPA_A02', 'CPA_A03', 'CPA_B', 'CPA_C10-12', 'CPA_C13-15', 'CPA_C16',
  'CPA_C17', 'CPA_C18', 'CPA_C19', 'CPA_C20', 'CPA_C21', 'CPA_C22', 'CPA_C23',
  'CPA_C24', 'CPA_C25', 'CPA_C26', 'CPA_C27', 'CPA_C28', 'CPA_C29', 'CPA_C30',
  'CPA_C31_32', 'CPA_C33', 'CPA_D35', 'CPA_E36', 'CPA_E37-39', 'CPA_F', 'CPA_G45',
  'CPA_G46', 'CPA_G47', 'CPA_H49', 'CPA_H50', 'CPA_H51', 'CPA_H52', 'CPA_H53',
  'CPA_I', 'CPA_J58', 'CPA_J59_60', 'CPA_J61', 'CPA_J62_63', 'CPA_K64', 'CPA_K65',
  'CPA_K66', 'CPA_L68', 'CPA_M69_70', 'CPA_M71', 'CPA_M72', 'CPA_M73', 'CPA_M74_75',
  'CPA_N77', 'CPA_N78', 'CPA_N79', 'CPA_N80-82', 'CPA_O84', 'CPA_P85', 'CPA_Q86',
  'CPA_Q87_88', 'CPA_R90-92', 'CPA_R93', 'CPA_S94', 'CPA_S95', 'CPA_S96', 'CPA_T', 'CPA_U',
];

const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;

async function fetchJson(dataset, params) {
  const url = `${API}/${dataset}?format=JSON&lang=EN&${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${dataset}: HTTP ${res.status} for ${url}`);
  const json = await res.json();
  if (json.error) throw new Error(`${dataset}: ${JSON.stringify(json.error)}`);
  return json;
}

/** Unroll the JSON-stat flat value map into records keyed by dimension codes. */
function unroll(js) {
  const dims = js.id;
  const sizes = js.size;
  const codeAt = dims.map((dim) => {
    const idx = js.dimension[dim].category.index;
    return Object.fromEntries(Object.entries(idx).map(([code, i]) => [i, code]));
  });
  const records = [];
  for (const [flatKey, value] of Object.entries(js.value)) {
    let f = Number(flatKey);
    const coords = new Array(dims.length);
    for (let d = dims.length - 1; d >= 0; d--) {
      coords[d] = f % sizes[d];
      f = Math.floor(f / sizes[d]);
    }
    const rec = { value };
    dims.forEach((dim, d) => (rec[dim] = codeAt[d][coords[d]]));
    records.push(rec);
  }
  return { records, labels: (dim) => js.dimension[dim].category.label };
}

/* ------------------------------------------------- 1. TEC trade backbone */

async function fetchTec() {
  const naceQ = ['C', ...DIVISIONS].map((c) => `nace_r2=${c}`).join('&');
  const js = await fetchJson(
    'ext_tec01',
    `geo=EU&sizeclas=TOTAL&unit=THS_EUR&${naceQ}` +
      '&stk_flow=IMP&stk_flow=EXP&partner=INT_EU&partner=EXT_EU&time=2023&time=2024',
  );
  const { records } = unroll(js);
  const byCode = {};
  for (const r of records) {
    const code = r.nace_r2;
    byCode[code] ??= {};
    byCode[code][r.time] ??= {};
    const key = `${r.stk_flow === 'IMP' ? 'imp' : 'exp'}${r.partner === 'EXT_EU' ? 'Ext' : 'Int'}`;
    byCode[code][r.time][key] = round1(r.value / 1e6); // THS_EUR -> bn EUR
  }
  return byCode;
}

/* ------------------------- 2+3. FIGARO imports by origin / exports by destination */

async function fetchFigaroFlows(dataset, partnerDim) {
  const naceQ = FIGARO_INDUSTRIES.map((c) => `nace_r2=${c}`).join('&');
  const js = await fetchJson(dataset, `geo=EU27_2020&time=2023&unit=MIO_EUR&${naceQ}`);
  const { records, labels } = unroll(js);
  const names = labels(partnerDim);
  const out = [];
  for (const ind of FIGARO_INDUSTRIES) {
    const rows = records.filter((r) => r.nace_r2 === ind);
    const get = (p) => rows.find((r) => r[partnerDim] === p)?.value ?? 0;
    const totalBn = round1(get('TOTAL') / 1e3);
    const intraBn = round1(get('EU27_2020') / 1e3);
    const extraBn = round1(get('NEU27_2020') / 1e3);
    const named = rows
      .filter(
        (r) =>
          !['TOTAL', 'EU27_2020', 'NEU27_2020'].includes(r[partnerDim]) &&
          !EU_MS.has(r[partnerDim]),
      )
      .sort((a, b) => b.value - a.value);
    const extraMio = get('NEU27_2020');
    out.push({
      industry: ind,
      totalBn,
      intraBn,
      extraBn,
      partners: named.map((r) => ({
        code: r[partnerDim],
        name: names[r[partnerDim]],
        valueBn: round1(r.value / 1e3),
        pctOfExtra: extraMio ? round1((100 * r.value) / extraMio) : 0,
      })),
    });
  }
  return out;
}

/* --------------------------------- 4. FIGARO foreign value added in EU exports */

async function fetchFva(exportsByIndustry) {
  const naceQ = FIGARO_INDUSTRIES.map((c) => `nace_r2=${c}`).join('&');
  const js = await fetchJson('naio_10_fgfoee', `geo=EU27_2020&time=2023&unit=THS_EUR&${naceQ}`);
  const { records, labels } = unroll(js);
  const names = labels('c_orig');
  const out = [];
  for (const ind of FIGARO_INDUSTRIES) {
    const rows = records.filter((r) => r.nace_r2 === ind);
    const fvaTotalBn = (rows.find((r) => r.c_orig === 'NEU27_2020')?.value ?? 0) / 1e6;
    const grossExpBn = exportsByIndustry.find((e) => e.industry === ind)?.extraBn ?? 0;
    const named = rows
      .filter((r) => r.c_orig !== 'NEU27_2020')
      .sort((a, b) => b.value - a.value);
    out.push({
      industry: ind,
      fvaBn: round1(fvaTotalBn),
      grossExportsBn: grossExpBn,
      fvaPct: grossExpBn ? round1((100 * fvaTotalBn) / grossExpBn) : 0,
      origins: named.slice(0, 8).map((r) => ({
        code: r.c_orig,
        name: names[r.c_orig],
        valueBn: round1(r.value / 1e6),
        pctOfExports: grossExpBn ? round2((100 * r.value) / 1e6 / grossExpBn) : 0,
      })),
    });
  }
  return out;
}

/* ----------------------- 5. EU-27 use table: imported intermediate inputs by product */

async function fetchUseTable() {
  const indQ = USE_INDUSTRIES.map((c) => `ind_use=${c}`).join('&');
  const prdQ = ['CPA_TOTAL', ...PRODUCTS_64].map((p) => `prd_ava=${p}`).join('&');
  const js = await fetchJson(
    'naio_10_cp1610',
    `geo=EU27_2020&time=2023&unit=MIO_EUR&stk_flow=TOTAL&stk_flow=IMP&${indQ}&${prdQ}`,
  );
  const { records, labels } = unroll(js);
  const prodNames = labels('prd_ava');
  const out = [];
  for (const ind of USE_INDUSTRIES) {
    const rows = records.filter((r) => r.ind_use === ind);
    const total = rows.find((r) => r.prd_ava === 'CPA_TOTAL' && r.stk_flow === 'TOTAL')?.value ?? 0;
    const imported = rows.find((r) => r.prd_ava === 'CPA_TOTAL' && r.stk_flow === 'IMP')?.value ?? 0;
    const topImported = rows
      .filter((r) => r.stk_flow === 'IMP' && r.prd_ava !== 'CPA_TOTAL' && r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
      .map((r) => ({
        product: r.prd_ava,
        name: prodNames[r.prd_ava],
        valueBn: round1(r.value / 1e3),
        pctOfImportedInputs: imported ? round1((100 * r.value) / imported) : 0,
      }));
    out.push({
      industry: ind,
      intermediateInputsBn: round1(total / 1e3),
      importedInputsBn: round1(imported / 1e3),
      importedShare: total ? round1((100 * imported) / total) : 0,
      topImported,
    });
  }
  // Section C aggregate — the 19 groups are disjoint and cover all of manufacturing.
  const totalC = out.reduce((s, r) => s + r.intermediateInputsBn, 0);
  const importedC = out.reduce((s, r) => s + r.importedInputsBn, 0);
  const totals = { totalBn: round1(totalC), importedBn: round1(importedC), importedShare: round1((100 * importedC) / totalC) };
  return { rows: out, totals };
}

/* ------------------------------------------------ 6. energy import dependency */

async function fetchEnergyDependency() {
  const js = await fetchJson(
    'nrg_ind_id',
    'geo=EU27_2020&unit=PC&siec=TOTAL&siec=O4000XBIO&siec=G3000&time=2021&time=2022&time=2023&time=2024',
  );
  const { records, labels } = unroll(js);
  const names = labels('siec');
  const out = {};
  for (const r of records) {
    out[r.siec] ??= { label: names[r.siec], byYear: {} };
    out[r.siec].byYear[r.time] = round1(r.value);
  }
  return out;
}

/* -------------------------------------------------------------------- main */

const tec = await fetchTec();
console.log(`TEC backbone: ${Object.keys(tec).length} NACE codes`);
const importOrigins = await fetchFigaroFlows('naio_10_fgti', 'c_exp');
console.log(`FIGARO import origins: ${importOrigins.length} industries`);
const exportDestinations = await fetchFigaroFlows('naio_10_fgte', 'c_imp');
console.log(`FIGARO export destinations: ${exportDestinations.length} industries`);
const fva = await fetchFva(exportDestinations);
console.log(`FIGARO FVA: ${fva.length} industries`);
const useTable = await fetchUseTable();
console.log(`Use table input mix: ${useTable.rows.length} industries`);
const energy = await fetchEnergyDependency();
console.log(`Energy dependency: ${Object.keys(energy).length} fuels`);

const banner = `/**
 * AUTO-GENERATED by scripts/fetch-trade-flows-io-data.mjs — do not edit by hand.
 * Regenerate with:  node scripts/fetch-trade-flows-io-data.mjs
 *
 * All values are official Eurostat statistics fetched from the dissemination
 * API (no key required). Money values in € billion (current prices).
 * Datasets: ext_tec01 (2023+2024), naio_10_fgti / naio_10_fgte / naio_10_fgfoee
 * (FIGARO application, 2023), naio_10_cp1610 (EU-27 use table, 2023),
 * nrg_ind_id (2021–2024).
 *
 * Generated: ${new Date().toISOString().slice(0, 10)}
 */

/* eslint-disable */

export interface TecFlows {
  impExt: number;
  expExt: number;
  impInt: number;
  expInt: number;
}
/** ext_tec01 — by NACE code ('C' = Section C aggregate row), then by year. */
export type TecBackbone = Record<string, Record<string, TecFlows>>;

export interface FigaroPartner {
  code: string;
  name: string;
  valueBn: number;
  /** % of the extra-EU flow. Named partners only — FIGARO names 23 countries; the remainder is 'WRL_REST'. */
  pctOfExtra: number;
}
export interface FigaroIndustryFlow {
  /** FIGARO industry code; groups C10-C12, C13-C15, C31_C32; 'C' = whole Section C. */
  industry: string;
  totalBn: number;
  intraBn: number;
  extraBn: number;
  partners: FigaroPartner[];
}

export interface FvaOrigin {
  code: string;
  name: string;
  valueBn: number;
  pctOfExports: number;
}
export interface FigaroFva {
  industry: string;
  /** Foreign value added embedded in extra-EU exports, € bn. */
  fvaBn: number;
  grossExportsBn: number;
  /** FVA as % of gross extra-EU exports (EU-27 as one economy). */
  fvaPct: number;
  origins: FvaOrigin[];
}

export interface ImportedInput {
  product: string;
  name: string;
  valueBn: number;
  pctOfImportedInputs: number;
}
export interface IndustryInputMix {
  /** Use-table industry code; groups C10-12, C13-15, C31_32. */
  industry: string;
  /** Total intermediate consumption, € bn (use table at basic prices). */
  intermediateInputsBn: number;
  importedInputsBn: number;
  /** Imported share of intermediate inputs, %. */
  importedShare: number;
  topImported: ImportedInput[];
}

export interface EnergyDependencyRow {
  label: string;
  byYear: Record<string, number>;
}
`;

const body = `
export const TEC_BACKBONE: TecBackbone = ${JSON.stringify(tec, null, 1)};

export const FIGARO_IMPORT_ORIGINS: FigaroIndustryFlow[] = ${JSON.stringify(importOrigins, null, 1)};

export const FIGARO_EXPORT_DESTINATIONS: FigaroIndustryFlow[] = ${JSON.stringify(exportDestinations, null, 1)};

export const FIGARO_FVA: FigaroFva[] = ${JSON.stringify(fva, null, 1)};

export const INDUSTRY_INPUT_MIX: IndustryInputMix[] = ${JSON.stringify(useTable.rows, null, 1)};

/** Manufacturing-wide intermediate-input totals (sum of the 19 disjoint industry groups). */
export const INPUT_MIX_TOTAL_C = ${JSON.stringify(useTable.totals)} as const;

/** nrg_ind_id — net import dependency %, EU-27. */
export const ENERGY_IMPORT_DEPENDENCY: Record<string, EnergyDependencyRow> = ${JSON.stringify(energy, null, 1)};
`;

writeFileSync(OUT, banner + body);
console.log(`Wrote ${OUT}`);
