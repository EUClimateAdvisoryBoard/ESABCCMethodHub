'use client';

/**
 * FIGARO input–output table viewer.
 * ---------------------------------
 * The full EU-27 industry-by-industry table (64 industries + value-added rows
 * × 64 industries + final demand), filterable by year, origin (intra-EU /
 * extra-EU / each partner country), row and column scope, with a single-hue
 * heat shading, row/column totals and CSV export of the current slice. All
 * data is served from the MethodHub (`/data/figaro/figaro-io-eu27.json`).
 */

import { useMemo, useState } from 'react';
import {
  type FigaroIoData,
  type FigaroYear,
  type OriginSelection,
  FIGARO_MATRIX_YEARS,
  ORIGIN_SCOPES,
  matrixFor,
  sectionOf,
  shortLabel,
  fmtCell,
  fmtBn,
} from './figaro-data';

type RowScope = 'all' | 'industries' | 'C' | 'va';
type ColScope = 'all' | 'intermediate' | 'C' | 'final';
type Unit = 'bn' | 'pct';

const ROW_SCOPES: { id: RowScope; label: string }[] = [
  { id: 'all', label: 'All rows' },
  { id: 'industries', label: 'Industries only' },
  { id: 'C', label: 'Manufacturing (C) rows' },
  { id: 'va', label: 'Value-added rows' },
];
const COL_SCOPES: { id: ColScope; label: string }[] = [
  { id: 'all', label: 'All columns' },
  { id: 'intermediate', label: 'Intermediate use only' },
  { id: 'C', label: 'Manufacturing (C) columns' },
  { id: 'final', label: 'Final demand only' },
];

export default function FigaroTableViewer({ data }: { data: FigaroIoData }) {
  const [year, setYear] = useState<FigaroYear>('2023');
  const [origin, setOrigin] = useState<OriginSelection>('TOTAL');
  const [rowScope, setRowScope] = useState<RowScope>('all');
  const [colScope, setColScope] = useState<ColScope>('all');
  const [unit, setUnit] = useState<Unit>('bn');
  const [search, setSearch] = useState('');

  const n = data.nIndustries;
  const matrix = useMemo(() => matrixFor(data, year, origin), [data, year, origin]);

  const rowIdxs = useMemo(() => {
    let idxs = data.indAva.map((_, i) => i);
    if (rowScope === 'industries') idxs = idxs.filter((i) => i < n);
    if (rowScope === 'va') idxs = idxs.filter((i) => i >= n);
    if (rowScope === 'C') idxs = idxs.filter((i) => i < n && sectionOf(data.indAva[i]) === 'C');
    const q = search.trim().toLowerCase();
    if (q) {
      idxs = idxs.filter(
        (i) =>
          data.indAva[i].toLowerCase().includes(q) ||
          (data.industries[data.indAva[i]] ?? '').toLowerCase().includes(q),
      );
    }
    return idxs;
  }, [data, rowScope, search, n]);

  const colIdxs = useMemo(() => {
    let idxs = data.indUse.map((_, i) => i);
    if (colScope === 'intermediate') idxs = idxs.filter((i) => i < n);
    if (colScope === 'final') idxs = idxs.filter((i) => i >= n);
    if (colScope === 'C') idxs = idxs.filter((i) => i < n && sectionOf(data.indUse[i]) === 'C');
    return idxs;
  }, [data, colScope, n]);

  // Column totals over ALL 70 rows (the denominator for % mode) and over the
  // visible rows (the totals row shown), plus visible row totals and the max
  // cell for the heat scale.
  const { colTotalsAll, colTotalsVisible, rowTotals, maxCell } = useMemo(() => {
    const colTotalsAll = colIdxs.map((c) => matrix.reduce((s, row) => s + row[c], 0));
    const colTotalsVisible = colIdxs.map((c) => rowIdxs.reduce((s, r) => s + matrix[r][c], 0));
    const rowTotals = rowIdxs.map((r) => colIdxs.reduce((s, c) => s + matrix[r][c], 0));
    let maxCell = 0;
    for (const r of rowIdxs) for (const c of colIdxs) maxCell = Math.max(maxCell, matrix[r][c]);
    return { colTotalsAll, colTotalsVisible, rowTotals, maxCell };
  }, [matrix, rowIdxs, colIdxs]);

  const originLabel =
    ORIGIN_SCOPES.find((s) => s.id === origin)?.label ?? `${data.countries[origin] ?? origin} → EU-27`;

  const heat = (v: number): string => {
    if (v <= 0 || maxCell <= 0) return 'transparent';
    // single-hue sequential ramp (primary blue), sqrt so mid flows stay visible
    const a = Math.min(Math.sqrt(v / maxCell), 1) * 0.55;
    return `rgba(0, 75, 127, ${a.toFixed(3)})`;
  };

  const downloadCsv = () => {
    const header = ['supplying_row', 'row_label', ...colIdxs.map((c) => data.indUse[c])];
    const lines = [header.join(',')];
    for (const r of rowIdxs) {
      const cells = colIdxs.map((c, ci) =>
        unit === 'pct'
          ? colTotalsAll[ci] > 0
            ? ((matrix[r][c] / colTotalsAll[ci]) * 100).toFixed(2)
            : ''
          : matrix[r][c].toFixed(1),
      );
      lines.push([data.indAva[r], `"${(data.industries[data.indAva[r]] ?? '').replace(/"/g, "'")}"`, ...cells].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `figaro-io-eu27-${year}-${origin}${unit === 'pct' ? '-pct' : '-mio-eur'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      {/* controls */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-grey-500">Year</div>
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
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-grey-500">
            Origin of supply
          </div>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="rounded border border-grey-200 bg-white px-2 py-1 text-[12px] text-grey-800"
          >
            {ORIGIN_SCOPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
            <optgroup label="Single partner → EU-27">
              {data.origins
                .filter((o) => o !== 'EU27')
                .map((o) => (
                  <option key={o} value={o}>
                    {data.countries[o] ?? o}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-grey-500">Rows</div>
          <select
            value={rowScope}
            onChange={(e) => setRowScope(e.target.value as RowScope)}
            className="rounded border border-grey-200 bg-white px-2 py-1 text-[12px] text-grey-800"
          >
            {ROW_SCOPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-grey-500">Columns</div>
          <select
            value={colScope}
            onChange={(e) => setColScope(e.target.value as ColScope)}
            className="rounded border border-grey-200 bg-white px-2 py-1 text-[12px] text-grey-800"
          >
            {COL_SCOPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-grey-500">Values</div>
          <div className="flex overflow-hidden rounded border border-grey-200 text-[11px]">
            <button
              onClick={() => setUnit('bn')}
              className={`px-2.5 py-1 font-semibold transition ${
                unit === 'bn' ? 'bg-primary text-white' : 'bg-white text-grey-600 hover:bg-grey-50'
              }`}
            >
              € bn
            </button>
            <button
              onClick={() => setUnit('pct')}
              className={`px-2.5 py-1 font-semibold transition ${
                unit === 'pct' ? 'bg-primary text-white' : 'bg-white text-grey-600 hover:bg-grey-50'
              }`}
              title="Each cell as % of its column's total supply (all rows, current origin selection)"
            >
              % of column
            </button>
          </div>
        </div>
        <div className="grow">
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-grey-500">
            Filter rows
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. C24, basic metals, pharma…"
            className="w-full max-w-[240px] rounded border border-grey-200 bg-white px-2 py-1 text-[12px] text-grey-800"
          />
        </div>
        <button
          onClick={downloadCsv}
          className="rounded border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-surface-blue"
        >
          ⬇ CSV (this slice)
        </button>
      </div>

      <p className="mb-2 text-[11px] text-grey-500">
        <span className="font-semibold text-grey-700">{originLabel}</span>, {year} — rows supply, columns
        use. {unit === 'bn' ? 'Values in € billion (current prices, basic prices).' : 'Each cell as a share of its column’s total supply under the current origin selection.'}{' '}
        Shading scales with the value. {rowIdxs.length} × {colIdxs.length} of 70 × 69 cells shown.
      </p>

      {/* the table */}
      <div className="max-h-[560px] overflow-auto rounded border border-grey-200">
        <table className="border-collapse text-[10px]" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 border-b border-r border-grey-200 bg-grey-50 px-2 py-1 text-left font-semibold text-grey-600">
                supplying ↓ · using →
              </th>
              {colIdxs.map((c) => (
                <th
                  key={data.indUse[c]}
                  className={`sticky top-0 z-20 border-b border-grey-200 px-1 py-1 text-right font-semibold ${
                    c >= n ? 'bg-surface-teal text-tertiary' : 'bg-grey-50 text-grey-600'
                  }`}
                  title={shortLabel(data, data.indUse[c])}
                >
                  {data.indUse[c]}
                </th>
              ))}
              <th className="sticky top-0 z-20 border-b border-l border-grey-200 bg-grey-100 px-1.5 py-1 text-right font-bold text-grey-700">
                Σ row
              </th>
            </tr>
          </thead>
          <tbody>
            {rowIdxs.map((r, ri) => {
              const code = data.indAva[r];
              const isVa = r >= n;
              return (
                <tr key={code} className="hover:bg-surface-blue/60">
                  <th
                    className={`sticky left-0 z-10 max-w-[220px] truncate border-r border-grey-200 px-2 py-0.5 text-left font-medium ${
                      isVa ? 'bg-surface-yellow text-grey-700' : 'bg-white text-grey-800'
                    }`}
                    title={shortLabel(data, code)}
                  >
                    <span className="font-semibold">{code}</span>{' '}
                    <span className="font-normal text-grey-500">{shortLabel(data, code)}</span>
                  </th>
                  {colIdxs.map((c, ci) => {
                    const v = matrix[r][c];
                    const pct = colTotalsAll[ci] > 0 ? (v / colTotalsAll[ci]) * 100 : 0;
                    return (
                      <td
                        key={c}
                        className="px-1 py-0.5 text-right tabular-nums text-grey-800"
                        style={{ background: heat(v) }}
                        title={`${code} → ${data.indUse[c]} (${shortLabel(data, data.indUse[c])}): €${fmtBn(v)} · ${pct.toFixed(1)}% of column`}
                      >
                        {unit === 'pct' ? (pct >= 0.05 ? pct.toFixed(1) : '·') : fmtCell(v)}
                      </td>
                    );
                  })}
                  <td className="border-l border-grey-200 bg-grey-50 px-1.5 py-0.5 text-right font-semibold tabular-nums text-grey-700">
                    {fmtCell(rowTotals[ri])}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="sticky bottom-0 left-0 z-30 border-r border-t border-grey-200 bg-grey-100 px-2 py-1 text-left font-bold text-grey-700">
                Σ visible rows
              </th>
              {colTotalsVisible.map((t, ci) => (
                <td
                  key={ci}
                  className="sticky bottom-0 z-20 border-t border-grey-200 bg-grey-100 px-1 py-1 text-right font-semibold tabular-nums text-grey-700"
                >
                  {unit === 'pct'
                    ? colTotalsAll[ci] > 0
                      ? ((t / colTotalsAll[ci]) * 100).toFixed(0)
                      : '·'
                    : fmtCell(t)}
                </td>
              ))}
              <td className="sticky bottom-0 z-20 border-l border-t border-grey-200 bg-grey-200 px-1.5 py-1 text-right font-bold tabular-nums text-grey-900">
                {fmtCell(rowTotals.reduce((a, b) => a + b, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-grey-400">
        Rows C10-12 … C33 are NACE Section C. Yellow rows = value added &amp; adjustments (intra-EU view
        only); teal columns = final demand. &apos;·&apos; = below €50 m (or 0.05%). Hover any cell for the
        exact value. Source: Eurostat FIGARO <code className="rounded bg-grey-100 px-1">naio_10_fcp_ii4</code>,
        aggregated to EU-27 as one economy.
      </p>
    </div>
  );
}
