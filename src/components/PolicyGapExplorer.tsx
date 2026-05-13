'use client';

/**
 * PolicyGapExplorer — interactive dashboard that reproduces the progress
 * indicator figures from the ESABCC Assessment Report 2024:
 * "Towards EU climate neutrality: Progress, policy gaps and opportunities"
 *
 * Each chart fetches live data from the Eurostat REST API (or EEA SDMX),
 * so figures auto-update when new inventory / energy balance data is released.
 *
 * Benchmark targets from the Fit for 55 MIX scenario (EC, 2021) and Climate
 * Target Plan impact assessment (EC, 2020) are displayed as reference markers.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  POLICY_GAP_INDICATORS,
  POLICY_GAP_SECTORS,
  SECTOR_COLORS,
  EUROSTAT_DATASET_URLS,
  type PolicyGapIndicator,
  type PolicyGapSector,
  buildEurostatUrl,
  parseEurostatResponse,
} from '@/lib/scenarios/policy-gap';
import { ESABCC } from '@/lib/esabcc-palette';
import {
  type IndicatorProjections,
  LEGACY_PROJECTION_VINTAGES,
} from '@/lib/scenarios/eea-projections';
import { EU_COUNTRIES } from '@/lib/eu-countries';

const PolicyGapChart = dynamic(
  () => import('@/components/charts/PolicyGapChart'),
  { ssr: false },
);

interface IndicatorData {
  id: string;
  data: { year: number; value: number }[];
  loading: boolean;
  error?: string;
  lastUpdated?: string;
}

// EU-27 member states only (exclude NO, CH, GB)
const EU27_ISO2 = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR',
  'DE','GR','HU','IE','IT','LV','LT','LU','MT','NL',
  'PL','PT','RO','SK','SI','ES','SE',
]);

const MEMBER_STATE_OPTIONS = [
  { value: 'EU27_2020', label: 'EU-27' },
  ...EU_COUNTRIES
    .filter((c, idx, arr) => EU27_ISO2.has(c.iso2) && arr.findIndex(x => x.iso2 === c.iso2) === idx)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => ({ value: c.iso2, label: c.name })),
];

export default function PolicyGapExplorer() {
  const [activeSector, setActiveSector] = useState<PolicyGapSector>('Overall');
  const [indicatorData, setIndicatorData] = useState<Record<string, IndicatorData>>({});
  const [projectionData, setProjectionData] = useState<Record<string, IndicatorProjections>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedGeo, setSelectedGeo] = useState<string>('EU27_2020');
  const [showVintage2021, setShowVintage2021] = useState(false);
  const [showVintage2017, setShowVintage2017] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const projectionsFetched = useRef<string>(''); // tracks geo for which projections were fetched

  const sectorIndicators = POLICY_GAP_INDICATORS.filter(i => i.sector === activeSector);
  const isEU27 = selectedGeo === 'EU27_2020';

  // Resolve the Eurostat geo code (EU27_2020 for EU, ISO-2 for MS)
  const eurostatGeo = selectedGeo;
  // Resolve the EEA projections geo code (null for EU27, ISO-2 for MS)
  const eeaGeo = isEU27 ? null : selectedGeo;

  // ── Fetch data for all indicators in the active sector ──────────────
  const fetchSectorData = useCallback(async (sector: PolicyGapSector, geoCode: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const indicators = POLICY_GAP_INDICATORS.filter(i => i.sector === sector);
    const isEU = geoCode === 'EU27_2020';

    // Mark all as loading
    setIndicatorData(prev => {
      const next = { ...prev };
      for (const ind of indicators) {
        next[ind.id] = { id: ind.id, data: prev[ind.id]?.data || [], loading: true };
      }
      return next;
    });

    // EEA SDMX region name (EU27 for aggregate, ISO-2 for MS)
    const eeaRegion = isEU ? 'EU27' : geoCode;

    // Fetch in parallel
    const results = await Promise.allSettled(
      indicators.map(async (ind) => {
        const source = ind.sources[0]; // Use primary source
        if (!source) throw new Error('No data source configured');

        if (source.provider === 'eurostat') {
          const url = buildEurostatUrl(source, geoCode);
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error(`Eurostat ${res.status}`);
          const json = await res.json();
          let points = parseEurostatResponse(json, source.scale);

          // Handle ratio indicators (e.g. electrification rate = electricity / total)
          if (ind.ratioSource) {
            const denUrl = buildEurostatUrl(ind.ratioSource, geoCode);
            const denRes = await fetch(denUrl, { signal: controller.signal });
            if (!denRes.ok) throw new Error(`Eurostat denominator ${denRes.status}`);
            const denJson = await denRes.json();
            const denPoints = parseEurostatResponse(denJson, ind.ratioSource.scale);
            const denMap = new Map(denPoints.map(p => [p.year, p.value]));
            points = points
              .filter(p => denMap.has(p.year) && denMap.get(p.year)! > 0)
              .map(p => ({
                year: p.year,
                value: (p.value / denMap.get(p.year)!) * 100,
              }));
          }

          // Handle inverted percentage (e.g. fossil share = 100 - renewable share)
          if (ind.invertPercentage) {
            points = points.map(p => ({ year: p.year, value: 100 - p.value }));
          }

          return { id: ind.id, points };
        } else {
          // EEA SDMX — use the existing API route
          const params = new URLSearchParams({
            db: 'eea',
            action: 'datapoints',
            variables: ind.sources[0].code,
            regions: eeaRegion,
          });
          const res = await fetch(`/api/scenarios?${params}`, { signal: controller.signal });
          if (!res.ok) throw new Error(`EEA ${res.status}`);
          const json = await res.json();
          const points = (json.data || []).map((d: { year: number; value: number }) => ({
            year: d.year,
            value: d.value * (source.scale || 1),
          }));
          return { id: ind.id, points };
        }
      }),
    );

    if (controller.signal.aborted) return;

    setIndicatorData(prev => {
      const next = { ...prev };
      results.forEach((result, i) => {
        const ind = indicators[i];
        if (result.status === 'fulfilled') {
          next[ind.id] = {
            id: ind.id,
            data: result.value.points,
            loading: false,
            lastUpdated: new Date().toISOString(),
          };
        } else {
          next[ind.id] = {
            id: ind.id,
            data: prev[ind.id]?.data || [],
            loading: false,
            error: result.reason?.message || 'Failed to fetch',
          };
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    fetchSectorData(activeSector, selectedGeo);
    return () => { abortRef.current?.abort(); };
  }, [activeSector, selectedGeo, fetchSectorData]);

  // ── Fetch EEA projections (whenever selected geo changes) ─────────────
  useEffect(() => {
    const geoKey = selectedGeo;
    if (projectionsFetched.current === geoKey) return;
    projectionsFetched.current = geoKey;

    const controller = new AbortController();
    setProjectionData({}); // clear old projections while fetching
    (async () => {
      try {
        const params = new URLSearchParams();
        if (selectedGeo !== 'EU27_2020') params.set('geo', selectedGeo);
        const url = `/api/eea-projections${params.toString() ? `?${params}` : ''}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data: IndicatorProjections[] = await res.json();
        const map: Record<string, IndicatorProjections> = {};
        for (const p of data) map[p.indicatorId] = p;
        setProjectionData(map);
      } catch {
        // Projections are optional — charts still work without them
      }
    })();

    return () => controller.abort();
  }, [selectedGeo]);

  // ── Export chart as PNG ─────────────────────────────────────────────
  const exportChart = useCallback((canvasId: string, filename: string) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  }, []);

  // ── Export data as CSV ─────────────────────────────────────────────
  const exportCsv = useCallback((ind: PolicyGapIndicator, data: { year: number; value: number }[], geoLabel: string) => {
    const rows = [
      ['Year', ind.title, `Unit: ${ind.unit}`, `Region: ${geoLabel}`].join(','),
      ...data.map(d => `${d.year},${d.value.toFixed(2)},`),
      '',
      'Benchmarks (EU-27):',
      ...ind.benchmarks.map(b => `${b.year},${b.value},${b.label}`),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `${ind.code}_${ind.id}_${geoLabel.replace(/\s+/g, '_')}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  // ── Summary stats for the latest year ──────────────────────────────
  // Reference period for the observed trend: last 5 years of data ending
  // with the most recent year available from Eurostat/EEA.
  const TREND_WINDOW_YEARS = 5;

  const getLatestStats = (ind: PolicyGapIndicator) => {
    const d = indicatorData[ind.id];
    if (!d?.data?.length) return null;
    const sorted = [...d.data].sort((a, b) => a.year - b.year);
    const latest = sorted[sorted.length - 1];
    const allTargets = ind.benchmarks
      .filter(b => b.type === 'target')
      .sort((a, b) => a.year - b.year);
    const nearestTarget = allTargets[0];
    // Furthest target (typically 2050) for long-term progress info
    const furthestTarget = allTargets[allTargets.length - 1];
    if (!nearestTarget) return { latest, gap: null, onTrack: null };

    // Required annual change
    const yearsToTarget = nearestTarget.year - latest.year;
    if (yearsToTarget <= 0) return { latest, gap: null, onTrack: null };
    const requiredAnnual = (nearestTarget.value - latest.value) / yearsToTarget;

    // Observed annual change over the reference window (last 5 years)
    const recent = sorted.slice(-TREND_WINDOW_YEARS);
    const n = recent.length;
    if (n < 2) return { latest, gap: null, onTrack: null };
    const refStart = recent[0].year;
    const refEnd = recent[n - 1].year;
    const observedAnnual = (recent[n - 1].value - recent[0].value) / (refEnd - refStart);

    // For decreasing targets (emissions), required is negative, observed should also be negative
    const onTrack = ind.unit === '%'
      ? (nearestTarget.value > latest.value ? observedAnnual >= requiredAnnual : observedAnnual <= requiredAnnual)
      : (requiredAnnual < 0 ? observedAnnual <= requiredAnnual : observedAnnual >= requiredAnnual);

    // Progress toward the furthest target (e.g. 2050)
    let longTerm: { year: number; requiredAnnual: number; onTrack: boolean | null } | null = null;
    if (furthestTarget && furthestTarget.year !== nearestTarget.year) {
      const yearsToLong = furthestTarget.year - latest.year;
      if (yearsToLong > 0) {
        const reqLong = (furthestTarget.value - latest.value) / yearsToLong;
        const onTrackLong = ind.unit === '%'
          ? (furthestTarget.value > latest.value ? observedAnnual >= reqLong : observedAnnual <= reqLong)
          : (reqLong < 0 ? observedAnnual <= reqLong : observedAnnual >= reqLong);
        longTerm = { year: furthestTarget.year, requiredAnnual: reqLong, onTrack: onTrackLong };
      }
    }

    return {
      latest,
      gap: requiredAnnual - observedAnnual,
      onTrack,
      observedAnnual,
      requiredAnnual,
      targetYear: nearestTarget.year,
      refStart,
      refEnd,
      longTerm,
    };
  };

  // Derive the selected country label for display
  const selectedGeoLabel = MEMBER_STATE_OPTIONS.find(o => o.value === selectedGeo)?.label ?? selectedGeo;

  // Build legacy projection series for the chart based on active toggles
  const buildLegacyProjections = (indicatorId: string) => {
    const series = [];
    if (showVintage2021 && isEU27) {
      const v = LEGACY_PROJECTION_VINTAGES.find(v => v.year === 2021);
      const d = v?.byIndicator[indicatorId];
      if (d) series.push({ label: v!.label, wem: d.wem, wam: d.wam });
    }
    if (showVintage2017 && isEU27) {
      const v = LEGACY_PROJECTION_VINTAGES.find(v => v.year === 2017);
      const d = v?.byIndicator[indicatorId];
      if (d) series.push({ label: v!.label, wem: d.wem, wam: d.wam });
    }
    return series.length > 0 ? series : undefined;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#608c95]/10 to-[#3d5584]/10 rounded-lg p-4 border border-[#608c95]/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
               style={{ backgroundColor: ESABCC.signature }}>
            PG
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2c2d2d]">
              Policy Gap Assessment — Interactive Progress Indicators
            </h3>
            <p className="text-xs text-grey-600">
              Based on ESABCC Assessment Report 2024 &quot;Towards EU climate neutrality&quot;
            </p>
          </div>
        </div>
        <p className="text-xs text-grey-500 mt-1">
          Charts auto-update from Eurostat and EEA APIs. Benchmarks from Fit for 55 MIX scenario (EC, 2021),
          the revised Energy Efficiency Directive (EED recast, 2023) and the European Climate Law.
          Projections from EEA WEM/WAM scenarios (Member States&apos; GHG projections).
        </p>
        <p className="text-[11px] text-grey-500 mt-1">
          <strong>Methodology:</strong> &quot;On track&quot; is assessed by comparing the observed annual change over
          the last {TREND_WINDOW_YEARS} years of reported data (reference period shown on each card) against
          the linear annual change required to reach the 2030 and, where available, 2050 benchmarks.
        </p>

        {/* ── Region selector + projection vintage toggles ──────────────── */}
        <div className="mt-3 flex flex-wrap items-start gap-4">
          {/* Region selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-grey-600 uppercase tracking-wide">
              Region
            </label>
            <select
              value={selectedGeo}
              onChange={e => {
                setSelectedGeo(e.target.value);
                setExpandedId(null);
              }}
              className="text-xs border border-grey-300 rounded px-2 py-1 bg-white text-grey-800 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {MEMBER_STATE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Projection vintage overlays (EU-27 only — legacy data is aggregated) */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-grey-600 uppercase tracking-wide">
              Overlay historical projections
            </span>
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${!isEU27 ? 'opacity-40 pointer-events-none' : 'text-grey-700'}`}>
                <input
                  type="checkbox"
                  checked={showVintage2021}
                  onChange={() => setShowVintage2021(v => !v)}
                  disabled={!isEU27}
                  className="rounded border-grey-300 text-primary focus:ring-primary"
                />
                <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: '#7b9e87', borderTop: '2px dashed #7b9e87' }} />
                WEM/WAM 2021
              </label>
              <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${!isEU27 ? 'opacity-40 pointer-events-none' : 'text-grey-700'}`}>
                <input
                  type="checkbox"
                  checked={showVintage2017}
                  onChange={() => setShowVintage2017(v => !v)}
                  disabled={!isEU27}
                  className="rounded border-grey-300 text-primary focus:ring-primary"
                />
                <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: '#9baabb', borderTop: '2px dashed #9baabb' }} />
                WEM/WAM 2017
              </label>
              {!isEU27 && (
                <span className="text-[10px] text-grey-400 italic">EU-27 only</span>
              )}
            </div>
          </div>

          {/* Auto-refresh + manual refresh */}
          <div className="flex flex-col gap-1 ml-auto">
            <span className="text-[10px] font-semibold text-grey-600 uppercase tracking-wide">Data</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-grey-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                  className="rounded border-grey-300 text-primary focus:ring-primary"
                />
                Auto-update
              </label>
              <button
                onClick={() => fetchSectorData(activeSector, selectedGeo)}
                className="text-xs text-primary hover:underline font-medium"
              >
                Refresh now
              </button>
            </div>
          </div>
        </div>

        {/* Member state notice */}
        {!isEU27 && (
          <div className="mt-2 text-[10px] text-grey-500 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            Showing data for <strong>{selectedGeoLabel}</strong>. EU-level benchmark targets are shown for reference —
            Member State-specific targets under the Effort Sharing Regulation differ by country.
            Projection overlays (WEM/WAM) show country-level submissions to the EEA where available.
          </div>
        )}
      </div>

      {/* Sector tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scroll-x pb-1">
        {POLICY_GAP_SECTORS.map(sector => (
          <button
            key={sector}
            onClick={() => setActiveSector(sector)}
            className={`px-3 py-2 text-xs font-medium rounded-md transition whitespace-nowrap ${
              activeSector === sector
                ? 'text-white shadow-sm'
                : 'text-grey-600 hover:bg-grey-100'
            }`}
            style={activeSector === sector ? { backgroundColor: SECTOR_COLORS[sector] } : undefined}
          >
            {sector}
          </button>
        ))}
      </div>

      {/* Sector summary */}
      <div className="text-xs text-grey-500 mb-2">
        {sectorIndicators.length} indicator{sectorIndicators.length > 1 ? 's' : ''} in {activeSector}
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {sectorIndicators.map(ind => {
          const stats = getLatestStats(ind);
          const d = indicatorData[ind.id];
          const isLoading = d?.loading;

          return (
            <button
              key={ind.id}
              onClick={() => setExpandedId(expandedId === ind.id ? null : ind.id)}
              className={`text-left p-3 rounded-lg border transition hover:shadow-md ${
                expandedId === ind.id
                  ? 'border-2 shadow-md'
                  : 'border-grey-200 hover:border-grey-300'
              }`}
              style={expandedId === ind.id ? { borderColor: SECTOR_COLORS[activeSector] } : undefined}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: SECTOR_COLORS[activeSector] }}
                >
                  {ind.code}
                </span>
                <span className="text-xs font-medium text-grey-800 line-clamp-1">
                  {ind.title}
                </span>
              </div>
              {isLoading ? (
                <div className="text-xs text-grey-400 mt-2 animate-pulse">Loading data...</div>
              ) : stats?.latest ? (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-grey-900">
                      {stats.latest.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-grey-500">{ind.unit} ({stats.latest.year})</span>
                    {ind.altUnit && (
                      <span className="text-[10px] text-grey-400">
                        ≈ {(stats.latest.value * ind.altUnit.factor).toLocaleString(undefined, { maximumFractionDigits: 0 })} {ind.altUnit.unit}
                      </span>
                    )}
                  </div>
                  {stats.onTrack !== null && (
                    <div className={`flex items-center gap-1 text-[10px] font-medium ${
                      stats.onTrack ? 'text-[#2e422f]' : 'text-[#b04545]'
                    }`}>
                      <span>{stats.onTrack ? '\u2713' : '\u2717'}</span>
                      <span>
                        {stats.onTrack ? 'On track' : 'Not on track'} for {stats.targetYear}
                      </span>
                    </div>
                  )}
                  {stats.longTerm && stats.longTerm.onTrack !== null && (
                    <div className={`flex items-center gap-1 text-[10px] font-medium ${
                      stats.longTerm.onTrack ? 'text-[#2e422f]' : 'text-[#b04545]'
                    }`}>
                      <span>{stats.longTerm.onTrack ? '\u2713' : '\u2717'}</span>
                      <span>
                        {stats.longTerm.onTrack ? 'On track' : 'Not on track'} for {stats.longTerm.year}
                      </span>
                    </div>
                  )}
                  {stats.observedAnnual != null && stats.requiredAnnual != null && (
                    <div className="text-[10px] text-grey-500">
                      Trend ({stats.refStart}–{stats.refEnd}): {stats.observedAnnual > 0 ? '+' : ''}{stats.observedAnnual.toFixed(1)}/yr
                      {' '}vs required: {stats.requiredAnnual > 0 ? '+' : ''}{stats.requiredAnnual.toFixed(1)}/yr
                    </div>
                  )}
                </div>
              ) : d?.error ? (
                <div className="text-xs text-[#b04545] mt-2">{d.error}</div>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Charts */}
      <div className={`grid gap-6 ${expandedId ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {sectorIndicators
          .filter(ind => !expandedId || expandedId === ind.id)
          .map(ind => {
            const d = indicatorData[ind.id];
            const isLoading = d?.loading;
            const hasData = d?.data && d.data.length > 0;

            return (
              <div
                key={ind.id}
                className="bg-white rounded-lg border border-grey-200 shadow-sm overflow-hidden"
              >
                {/* Chart toolbar */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-grey-100 bg-grey-50/50">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: SECTOR_COLORS[activeSector] }}
                  >
                    {ind.code}
                  </span>
                  <span className="text-xs text-grey-600 flex-1 truncate">{ind.description}</span>
                  <span className="text-[9px] text-grey-400">
                    {ind.figures.join(', ')}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); exportChart(`pg-chart-${ind.id}`, `${ind.code}_${ind.id}`); }}
                      className="text-[10px] text-grey-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-grey-100"
                      title="Export PNG"
                    >
                      PNG
                    </button>
                    {hasData && (
                      <button
                        onClick={(e) => { e.stopPropagation(); exportCsv(ind, d!.data, selectedGeoLabel); }}
                        className="text-[10px] text-grey-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-grey-100"
                        title="Export CSV"
                      >
                        CSV
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(expandedId === ind.id ? null : ind.id)}
                      className="text-[10px] text-grey-500 hover:text-primary px-1.5 py-0.5 rounded hover:bg-grey-100"
                    >
                      {expandedId === ind.id ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>

                {/* Chart body */}
                <div className="p-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64 text-sm text-grey-400 animate-pulse">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-grey-300 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                        Fetching latest data from Eurostat...
                      </div>
                    </div>
                  ) : hasData ? (
                    <PolicyGapChart
                      data={d!.data}
                      benchmarks={ind.benchmarks}
                      projections={projectionData[ind.id] ? {
                        wem: projectionData[ind.id].wem,
                        wam: projectionData[ind.id].wam,
                      } : undefined}
                      legacyProjections={buildLegacyProjections(ind.id)}
                      title={`${ind.title}${!isEU27 ? ` — ${selectedGeoLabel}` : ''}`}
                      unit={ind.unit}
                      code={ind.code}
                      sectorColor={SECTOR_COLORS[activeSector]}
                      compact={!expandedId}
                      canvasId={`pg-chart-${ind.id}`}
                      altUnit={ind.altUnit ? { unit: ind.altUnit.unit, factor: ind.altUnit.factor } : undefined}
                      sourceLabel={ind.sourceLabel}
                    />
                  ) : d?.error ? (
                    <div className="flex items-center justify-center h-64 text-sm text-[#b04545]">
                      <div className="text-center">
                        <p className="font-medium mb-1">Data fetch failed</p>
                        <p className="text-xs text-grey-500">{d.error}</p>
                        <button
                          onClick={() => fetchSectorData(activeSector)}
                          className="mt-2 text-xs text-primary hover:underline"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-sm text-grey-400">
                      No data available
                    </div>
                  )}
                </div>

                {/* Data source footnote */}
                {hasData && (
                  <div className="px-3 pb-2 text-[9px] text-grey-400 space-y-0.5">
                    <div>
                      Source:{' '}
                      {ind.sources[0].provider === 'eurostat' ? (
                        <a
                          href={EUROSTAT_DATASET_URLS[ind.sources[0].code] || `https://ec.europa.eu/eurostat/databrowser/view/${ind.sources[0].code}/default/table?lang=en`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {ind.sourceLabel || `Eurostat (${ind.sources[0].code})`}
                        </a>
                      ) : (
                        <>{ind.sourceLabel || `EEA (${ind.sources[0].code})`}</>
                      )}
                      {projectionData[ind.id] && (
                        <> · Projections:{' '}
                          <a
                            href="https://www.eea.europa.eu/en/datahub/datahubitem-view/4b8d94a4-aed7-4e67-a54c-0623a50f48e8"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            EEA WEM/WAM ({projectionData[ind.id].source})
                          </a>
                        </>
                      )}
                      {d?.lastUpdated && (
                        <> · Fetched {new Date(d.lastUpdated).toLocaleDateString()}</>
                      )}
                      {' '}· Region: {selectedGeoLabel} · Trend reference period: last {TREND_WINDOW_YEARS} years of observed data
                    </div>
                    {ind.scopeNote && (
                      <div className="italic text-grey-500">{ind.scopeNote}</div>
                    )}
                    {ind.altUnit?.note && (
                      <div className="italic text-grey-500">{ind.altUnit.note}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Chart legend explanation */}
      <div className="mt-6 p-3 bg-white rounded-lg text-[11px] text-grey-600 border border-grey-200">
        <p className="font-medium text-grey-700 mb-2">How to read these charts</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-start gap-2">
            <span className="w-4 h-0.5 mt-1.5 bg-[#608c95] shrink-0 rounded" />
            <span><strong>Historical data</strong> — Observed values from official EU statistics (Eurostat / EEA), auto-updated from live APIs.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-0.5 mt-1.5 shrink-0 rounded border-t-2 border-dashed border-[#608c95]" />
            <span><strong>Required trajectory</strong> — Linear path from the latest observed value to EU legislated targets. Shows the annual rate of change needed to meet each target on time.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-0.5 mt-1.5 shrink-0 rounded border-t-2 border-dashed border-[#b04545]" />
            <span><strong>WEM projection</strong> — &quot;With Existing Measures&quot; scenario from EEA Member States&apos; GHG projections. Shows where the EU is heading under currently implemented policies. Falls back to a 5-year linear trend when EEA data is unavailable.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-0.5 mt-1.5 shrink-0 rounded border-t-2 border-dashed border-[#d4882c]" />
            <span><strong>WAM projection</strong> — &quot;With Additional Measures&quot; scenario from EEA projections. Shows the expected path if planned but not-yet-implemented policies are delivered by Member States.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-3 mt-0.5 shrink-0 rounded bg-[rgba(242,97,25,0.15)]" />
            <span><strong>Policy gap</strong> — The shaded area between the WEM projection and the required trajectory. It represents the additional reduction (or improvement) that existing policies fail to deliver. A larger gap means stronger policy action is needed.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-0.5 mt-1.5 shrink-0 rounded border-t-2 border-dashed border-[#b04545]" />
            <span><strong>Current trend</strong> — 5-year linear extrapolation of recent historical data. Shown instead of WEM/WAM projections when EEA projection data is not available for an indicator.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-3 h-3 mt-0.5 shrink-0 bg-[#3d5584] rotate-45 rounded-sm" />
            <span><strong>EU legislated targets</strong> — Binding objectives set in EU law (e.g. European Climate Law, EED recast, Fit for 55 package).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-0.5 mt-1.5 shrink-0 rounded border-t-2 border-dashed border-[#7b9e87]" />
            <span><strong>WEM/WAM 2021</strong> — EU-27 projections from EEA Trends &amp; Projections 2021 (pre Fit for 55). Shown for comparison when the 2021 overlay is enabled.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-0.5 mt-1.5 shrink-0 rounded border-t-2 border-dashed border-[#9baabb]" />
            <span><strong>WEM/WAM 2017</strong> — EU-27 projections from EEA Trends &amp; Projections 2017 (pre European Green Deal). Shown for comparison when the 2017 overlay is enabled.</span>
          </div>
        </div>
      </div>

      {/* Report attribution */}
      <div className="mt-3 p-3 bg-grey-50 rounded-lg text-[10px] text-grey-500 border border-grey-200">
        <p className="font-medium text-grey-700 mb-1">
          ESABCC Assessment Report 2024 — Towards EU climate neutrality: Progress, policy gaps and opportunities
        </p>
        <p>
          Benchmarks derived from: Fit for 55 MIX scenario (EC, 2021), Climate Target Plan impact assessment (EC, 2020).
          Historical data from Eurostat energy balances and EEA GHG inventory (auto-updated via live APIs).
          WEM/WAM projections from{' '}
          <a
            href="https://www.eea.europa.eu/en/datahub/datahubitem-view/4b8d94a4-aed7-4e67-a54c-0623a50f48e8"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            EEA Member States&apos; GHG emission projections
          </a>
          {' '}(Governance Regulation EU 2018/1999).
        </p>
      </div>
    </div>
  );
}
