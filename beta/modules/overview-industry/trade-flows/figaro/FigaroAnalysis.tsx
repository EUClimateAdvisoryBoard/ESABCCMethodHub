'use client';

/**
 * FIGARO analysis dashboard.
 * --------------------------
 * Derived entirely client-side from the repo-hosted FIGARO extract: import
 * dependence of every industry, who supplies the EU, the largest imported
 * input flows, EU export destinations, and a per-industry input decomposition.
 * Single-hue charts; manufacturing (Section C) is highlighted against grey so
 * identity never rides on hue alone.
 */

import { useMemo, useState } from 'react';
import {
  type FigaroIoData,
  type FigaroGlobalData,
  type FigaroYear,
  FIGARO_MATRIX_YEARS,
  EXT_TEC03_SOURCE_URL,
  matrixFor,
  sectionOf,
  shortLabel,
  fmtBn,
} from './figaro-data';

const BLUE = '#004B7F';
const RED = '#B83230';
const TEAL = '#007B6C';
const GREY = '#BCBEC0';
const SLATE = '#3D5265';

function HBar({
  label,
  sub,
  value,
  max,
  color,
  valueLabel,
  title,
}: {
  label: string;
  sub?: string;
  value: number;
  max: number;
  color: string;
  valueLabel: string;
  title?: string;
}) {
  return (
    <div className="grid grid-cols-[168px_1fr_66px] items-center gap-2" title={title}>
      <div className="truncate text-[11px] text-grey-800">
        <span className="font-semibold">{label}</span>
        {sub && <span className="ml-1 text-[10px] text-grey-500">{sub}</span>}
      </div>
      <div className="h-3.5 overflow-hidden rounded-sm bg-grey-100">
        <div
          className="h-full rounded-r-sm"
          style={{ width: `${max > 0 ? Math.max((value / max) * 100, 0.5) : 0}%`, background: color }}
        />
      </div>
      <div className="text-right text-[10px] font-semibold tabular-nums text-grey-700">{valueLabel}</div>
    </div>
  );
}

/**
 * Inside "Rest of the world": FIGARO only names 23 partner areas, so Taiwan,
 * Viet Nam, the Gulf states, Ukraine, North Africa… all hide in WRL_REST.
 * This panel breaks that block down with EU goods trade by partner country
 * (ext_tec03) — a different attribution (customs/TEC, goods only), so it is
 * shown as an indicative composition in its own colour, never mixed into the
 * FIGARO bars above.
 */
function RestOfWorldBreakdown({
  global,
  year,
  restTotal,
}: {
  global: FigaroGlobalData;
  year: FigaroYear;
  restTotal: number;
}) {
  const partners = global.restOfWorld.partners
    .filter((p) => (p.imp[year] ?? 0) > 0)
    .sort((a, b) => (b.imp[year] ?? 0) - (a.imp[year] ?? 0));
  if (partners.length === 0) return null;
  const shown = partners.slice(0, 12);
  const max = shown[0].imp[year] ?? 1;
  const shownSum = shown.reduce((s, p) => s + (p.imp[year] ?? 0), 0);

  return (
    <div className="mt-3 rounded border border-grey-200 bg-grey-50 p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold text-grey-800">
          Inside &quot;Rest of the world&quot; (€{fmtBn(restTotal)} above)
        </span>
        <span className="text-[9px] text-grey-500">customs goods trade, {year}</span>
      </div>
      <p className="mb-1.5 mt-0.5 text-[10px] leading-snug text-grey-500">
        FIGARO names only 23 partners — everyone else is one block. EU goods imports by partner country
        (different attribution, indicative composition only):
      </p>
      <div className="space-y-1">
        {shown.map((p) => (
          <HBar
            key={p.code}
            label={p.name}
            value={p.imp[year] ?? 0}
            max={max}
            color={SLATE}
            valueLabel={`€${fmtBn(p.imp[year] ?? 0)}`}
            title={`${p.name}: €${fmtBn(p.imp[year] ?? 0)} EU goods imports (${year}, all activities); industry (NACE B–E) share €${fmtBn(p.impInd[year] ?? 0)}; EU exports there €${fmtBn(p.exp[year] ?? 0)}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[9px] leading-snug text-grey-400">
        Top {shown.length} of {partners.length} named countries, €{fmtBn(shownSum)} of goods imports. Source:
        Eurostat TEC{' '}
        <a
          href={EXT_TEC03_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          ext_tec03 ↗
        </a>{' '}
        (enterprise attribution, goods only — services and valuation differences mean these do not sum to the
        FIGARO block).
      </p>
    </div>
  );
}

export default function FigaroAnalysis({
  data,
  global,
}: {
  data: FigaroIoData;
  global: FigaroGlobalData | null;
}) {
  const [year, setYear] = useState<FigaroYear>('2023');
  const [manufacturingOnly, setManufacturingOnly] = useState(false);
  const [focus, setFocus] = useState('C29');

  const n = data.nIndustries;

  const totals = useMemo(() => matrixFor(data, year, 'TOTAL'), [data, year]);
  const intra = useMemo(() => matrixFor(data, year, 'EU27'), [data, year]);

  const stats = useMemo(() => {
    // Per using industry j: intermediate inputs (industry rows only), split
    // domestic (intra-EU) vs imported (extra-EU).
    const perIndustry = data.indUse.slice(0, n).map((code, j) => {
      let total = 0;
      let dom = 0;
      for (let r = 0; r < n; r++) {
        total += totals[r][j];
        dom += intra[r][j];
      }
      const imp = total - dom;
      return { code, j, total, dom, imp, share: total > 0 ? (imp / total) * 100 : 0 };
    });

    // Per origin: supply into EU-27 intermediate vs final use.
    const perOrigin = data.origins
      .filter((o) => o !== 'EU27')
      .map((o) => {
        const m = data.matrix[year][o];
        let int = 0;
        let fin = 0;
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < data.indUse.length; c++) {
            if (c < n) int += m[r][c];
            else fin += m[r][c];
          }
        }
        return { code: o, int, fin, total: int + fin };
      })
      .sort((a, b) => b.total - a.total);

    // Largest single imported flows origin × supplying industry → use.
    const flows: { origin: string; row: string; col: string; v: number }[] = [];
    for (const o of data.origins) {
      if (o === 'EU27') continue;
      const m = data.matrix[year][o];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < data.indUse.length; c++) {
          const v = m[r][c];
          if (v > 2000) flows.push({ origin: o, row: data.indAva[r], col: data.indUse[c], v });
        }
      }
    }
    flows.sort((a, b) => b.v - a.v);

    const totalIntermediate = perIndustry.reduce((s, d) => s + d.total, 0);
    const totalImported = perIndustry.reduce((s, d) => s + d.imp, 0);
    const manuf = perIndustry.filter((d) => sectionOf(d.code) === 'C');
    const manufTotal = manuf.reduce((s, d) => s + d.total, 0);
    const manufImported = manuf.reduce((s, d) => s + d.imp, 0);
    const extraSupply = perOrigin.reduce((s, d) => s + d.total, 0);

    return { perIndustry, perOrigin, flows: flows.slice(0, 15), totalIntermediate, totalImported, manufTotal, manufImported, extraSupply };
  }, [data, totals, intra, year, n]);

  const exportStats = useMemo(() => {
    if (!global) return null;
    const ex = global.euExportsByIndustry[year];
    const byDest = global.extra
      .map((d, di) => ({
        code: d,
        v: global.industries.reduce((s, _, i) => s + ex.int[i][di] + ex.fin[i][di], 0),
      }))
      .sort((a, b) => b.v - a.v);
    const byIndustry = global.industries
      .map((code, i) => ({
        code,
        v: ex.int[i].reduce((a, b) => a + b, 0) + ex.fin[i].reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.v - a.v);
    const total = byDest.reduce((s, d) => s + d.v, 0);
    return { byDest, byIndustry, total };
  }, [global, year]);

  const focusStats = useMemo(() => {
    const j = data.indUse.indexOf(focus);
    if (j === -1 || j >= n) return null;
    const rows = data.indAva
      .slice(0, n)
      .map((code, r) => ({ code, total: totals[r][j], dom: intra[r][j], imp: totals[r][j] - intra[r][j] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    const origins = data.origins
      .filter((o) => o !== 'EU27')
      .map((o) => {
        const m = data.matrix[year][o];
        let v = 0;
        for (let r = 0; r < n; r++) v += m[r][j];
        return { code: o, v };
      })
      .sort((a, b) => b.v - a.v)
      .slice(0, 8);
    let total = 0;
    let dom = 0;
    for (let r = 0; r < n; r++) {
      total += totals[r][j];
      dom += intra[r][j];
    }
    return { rows, origins, total, dom, imp: total - dom };
  }, [data, totals, intra, year, focus, n]);

  const industryRows = useMemo(() => {
    const rows = manufacturingOnly ? stats.perIndustry.filter((d) => sectionOf(d.code) === 'C') : stats.perIndustry;
    return [...rows].sort((a, b) => b.share - a.share).filter((d) => d.total > 5000);
  }, [stats.perIndustry, manufacturingOnly]);

  const kpi = (v: string, l: string, d: string) => (
    <div className="rounded-lg border border-grey-200 bg-white p-3">
      <div className="text-2xl font-bold text-grey-900">{v}</div>
      <div className="mt-0.5 text-xs font-semibold text-grey-700">{l}</div>
      <div className="mt-1 text-[11px] leading-snug text-grey-500">{d}</div>
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded border border-grey-200 text-[11px]">
          {FIGARO_MATRIX_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-2.5 py-1 font-semibold transition ${
                year === y ? 'bg-primary text-white' : 'bg-white text-grey-600 hover:bg-grey-50'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-grey-500">
          All figures computed live from the MethodHub-hosted FIGARO extract (EU-27 as one economy, € current
          prices).
        </span>
      </div>

      {/* KPI strip */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpi(
          `€${fmtBn(stats.totalIntermediate)}`,
          'Intermediate inputs used in the EU-27',
          `Everything EU industries bought from other industries in ${year} — the inter-industry economy the table maps.`,
        )}
        {kpi(
          `${((stats.totalImported / stats.totalIntermediate) * 100).toFixed(1)}%`,
          'of those inputs were imported',
          `€${fmtBn(stats.totalImported)} of intermediate inputs came from outside the EU-27.`,
        )}
        {kpi(
          `${((stats.manufImported / stats.manufTotal) * 100).toFixed(1)}%`,
          'imported share in manufacturing',
          `Section C bought €${fmtBn(stats.manufTotal)} of intermediate inputs; €${fmtBn(stats.manufImported)} imported.`,
        )}
        {kpi(
          `€${fmtBn(stats.extraSupply)}`,
          'total extra-EU supply into the EU',
          `All goods & services delivered into EU-27 use by the ${stats.perOrigin.length} partner areas — ${data.countries[stats.perOrigin[0]?.code] ?? ''} first (€${fmtBn(stats.perOrigin[0]?.total ?? 0)}).`,
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* import dependence by industry */}
        <div className="rounded-lg border border-grey-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-grey-900">Import dependence by industry</h3>
            <label className="flex items-center gap-1.5 text-[11px] text-grey-600">
              <input
                type="checkbox"
                checked={manufacturingOnly}
                onChange={(e) => setManufacturingOnly(e.target.checked)}
              />
              manufacturing only
            </label>
          </div>
          <p className="mb-2 mt-1 text-[11px] text-grey-500">
            Imported share of each industry&apos;s intermediate inputs, {year}.{' '}
            <span className="font-semibold" style={{ color: BLUE }}>
              Blue
            </span>{' '}
            = manufacturing (Section C), grey = other sections. Industries with &lt;€5 bn of inputs omitted.
          </p>
          <div className="max-h-[430px] space-y-1 overflow-y-auto pr-1">
            {industryRows.map((d) => (
              <HBar
                key={d.code}
                label={d.code}
                sub={shortLabel(data, d.code).slice(0, 30)}
                value={d.share}
                max={Math.max(...industryRows.map((x) => x.share), 1)}
                color={sectionOf(d.code) === 'C' ? BLUE : GREY}
                valueLabel={`${d.share.toFixed(0)}%`}
                title={`${shortLabel(data, d.code)} — €${fmtBn(d.imp)} imported of €${fmtBn(d.total)} intermediate inputs`}
              />
            ))}
          </div>
        </div>

        {/* who supplies the EU */}
        <div className="rounded-lg border border-grey-200 bg-white p-4">
          <h3 className="text-sm font-bold text-grey-900">Who supplies the EU-27</h3>
          <p className="mb-2 mt-1 text-[11px] text-grey-500">
            Total supply delivered into EU-27 use by partner, {year} — solid ={' '}
            <span className="font-semibold text-grey-700">to industries (intermediate)</span>, pale = to final
            demand. Hover for the split.
          </p>
          <div className="space-y-1">
            {stats.perOrigin.map((o) => {
              const max = stats.perOrigin[0].total;
              return (
                <div
                  key={o.code}
                  className="grid grid-cols-[128px_1fr_66px] items-center gap-2"
                  title={`${data.countries[o.code] ?? o.code}: €${fmtBn(o.int)} to intermediate use + €${fmtBn(o.fin)} to final demand`}
                >
                  <div className="truncate text-[11px] font-semibold text-grey-800">
                    {data.countries[o.code] ?? o.code}
                  </div>
                  <div className="flex h-3.5 overflow-hidden rounded-sm bg-grey-100">
                    <div style={{ width: `${(o.int / max) * 100}%`, background: RED }} />
                    <div style={{ width: `${(o.fin / max) * 100}%`, background: RED, opacity: 0.35 }} />
                  </div>
                  <div className="text-right text-[10px] font-semibold tabular-nums text-grey-700">
                    €{fmtBn(o.total)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* inside "Rest of the world" */}
          {global?.restOfWorld && (
            <RestOfWorldBreakdown
              global={global}
              year={year}
              restTotal={stats.perOrigin.find((o) => o.code === 'WRL_REST')?.total ?? 0}
            />
          )}
        </div>

        {/* biggest imported flows */}
        <div className="rounded-lg border border-grey-200 bg-white p-4">
          <h3 className="text-sm font-bold text-grey-900">The 15 largest imported input flows</h3>
          <p className="mb-2 mt-1 text-[11px] text-grey-500">
            Single origin → supplying industry → EU use, {year}. The concentrated arteries of the EU&apos;s
            import structure.
          </p>
          <div className="space-y-1">
            {stats.flows.map((f) => (
              <HBar
                key={`${f.origin}-${f.row}-${f.col}`}
                label={`${data.countries[f.origin]?.split(' ')[0] ?? f.origin} · ${f.row} → ${f.col}`}
                value={f.v}
                max={stats.flows[0].v}
                color={RED}
                valueLabel={`€${fmtBn(f.v)}`}
                title={`${data.countries[f.origin] ?? f.origin}: ${shortLabel(data, f.row)} → ${shortLabel(data, f.col)} — €${fmtBn(f.v)}`}
              />
            ))}
          </div>
        </div>

        {/* EU exports */}
        <div className="rounded-lg border border-grey-200 bg-white p-4">
          <h3 className="text-sm font-bold text-grey-900">Where EU-27 output goes (exports)</h3>
          {exportStats ? (
            <>
              <p className="mb-2 mt-1 text-[11px] text-grey-500">
                EU-27 deliveries to extra-EU economies, {year}: €{fmtBn(exportStats.total)} in total. Top
                destinations, all industries.
              </p>
              <div className="space-y-1">
                {exportStats.byDest.slice(0, 10).map((d) => (
                  <HBar
                    key={d.code}
                    label={global?.countryNames[d.code] ?? d.code}
                    value={d.v}
                    max={exportStats.byDest[0].v}
                    color={TEAL}
                    valueLabel={`€${fmtBn(d.v)}`}
                  />
                ))}
              </div>
              <div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wide text-grey-500">
                Top exporting industries
              </div>
              <div className="space-y-1">
                {exportStats.byIndustry.slice(0, 8).map((d) => (
                  <HBar
                    key={d.code}
                    label={d.code}
                    sub={shortLabel(data, d.code).slice(0, 30)}
                    value={d.v}
                    max={exportStats.byIndustry[0].v}
                    color={sectionOf(d.code) === 'C' ? TEAL : GREY}
                    valueLabel={`€${fmtBn(d.v)}`}
                    title={shortLabel(data, d.code)}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-[11px] text-grey-500">Loading export data…</p>
          )}
        </div>
      </div>

      {/* industry focus */}
      <div className="mt-4 rounded-lg border border-grey-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-grey-900">Industry focus — input decomposition of</h3>
          <select
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            className="rounded border border-grey-200 bg-white px-2 py-1 text-[12px] text-grey-800"
          >
            {data.indUse.slice(0, n).map((code) => (
              <option key={code} value={code}>
                {code} — {shortLabel(data, code)}
              </option>
            ))}
          </select>
        </div>
        {focusStats && (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] text-grey-600">
                {focus} bought <span className="font-bold">€{fmtBn(focusStats.total)}</span> of intermediate
                inputs in {year} — <span className="font-bold text-accent-red">{focusStats.total > 0 ? ((focusStats.imp / focusStats.total) * 100).toFixed(1) : '0'}% imported</span>. Top supplying industries (solid = intra-EU, pale red = imported):
              </div>
              <div className="space-y-1">
                {focusStats.rows.map((r) => {
                  const max = focusStats.rows[0].total;
                  return (
                    <div
                      key={r.code}
                      className="grid grid-cols-[168px_1fr_66px] items-center gap-2"
                      title={`${shortLabel(data, r.code)}: €${fmtBn(r.dom)} intra-EU + €${fmtBn(r.imp)} imported`}
                    >
                      <div className="truncate text-[11px] text-grey-800">
                        <span className="font-semibold">{r.code}</span>{' '}
                        <span className="text-[10px] text-grey-500">{shortLabel(data, r.code).slice(0, 24)}</span>
                      </div>
                      <div className="flex h-3.5 overflow-hidden rounded-sm bg-grey-100">
                        <div style={{ width: `${(r.dom / max) * 100}%`, background: BLUE }} />
                        <div style={{ width: `${(r.imp / max) * 100}%`, background: RED }} />
                      </div>
                      <div className="text-right text-[10px] font-semibold tabular-nums text-grey-700">
                        €{fmtBn(r.total)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-grey-600">
                Where {focus}&apos;s imported inputs come from (all supplying industries summed):
              </div>
              <div className="space-y-1">
                {focusStats.origins.map((o) => (
                  <HBar
                    key={o.code}
                    label={data.countries[o.code] ?? o.code}
                    value={o.v}
                    max={focusStats.origins[0]?.v ?? 1}
                    color={RED}
                    valueLabel={`€${fmtBn(o.v)}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-snug text-grey-400">
                Legend: <span className="font-semibold" style={{ color: BLUE }}>blue</span> = intra-EU supply,{' '}
                <span className="font-semibold" style={{ color: RED }}>red</span> = extra-EU imports. Origin
                bars sum every supplying industry&apos;s deliveries into {focus}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
