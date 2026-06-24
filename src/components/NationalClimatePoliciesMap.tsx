'use client';

/**
 * NationalClimatePoliciesMap — EU-27 choropleth for the National Level
 * Climate Policies beta module.
 *
 * Each member state is filled by the selected metric (framework climate law
 * status, catalogue depth, legislative share, adaptation attention, most
 * recent activity) computed from the climate-laws.org catalogue. Hovering
 * shows the country's key figures; clicking toggles the country filter on
 * the catalogue list below the map.
 *
 * Topology is the same static `/data/eu27-boundaries.geojson` asset used by
 * the Member States choropleth (built by `scripts/build-eu27-geojson.mjs`).
 * Client-only: import via `next/dynamic` with `ssr: false` because Leaflet
 * touches `window` / `document` on mount.
 */

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useMemo, useState } from 'react';
import type { CountryPolicyMetrics, MapMetric } from '@/lib/climate-policy-insights';
import { buildMapMetrics } from '@/lib/climate-policy-insights';
import { N3_TO_A2, useEu27Geojson } from '@/lib/geo/eu-choropleth';

interface Props {
  metrics: CountryPolicyMetrics[];
  /** Currently selected country filter ('all' = none). */
  selected: string;
  /** Toggle the country filter — receives the ISO-2 code or 'all'. */
  onSelect: (code: string) => void;
  height?: number;
}

export default function NationalClimatePoliciesMap({
  metrics, selected, onSelect, height = 540,
}: Props) {
  const { geo, geoError } = useEu27Geojson();

  const mapMetrics = useMemo(() => buildMapMetrics(metrics), [metrics]);
  const [metricKey, setMetricKey] = useState(mapMetrics[0]?.key ?? 'framework');
  const metric: MapMetric = mapMetrics.find(m => m.key === metricKey) ?? mapMetrics[0];

  const byCode = useMemo(() => {
    const m = new Map<string, CountryPolicyMetrics>();
    for (const cm of metrics) m.set(cm.code, cm);
    return m;
  }, [metrics]);

  const datasetSize = useMemo(() => metrics.reduce((s, m) => s + m.total, 0), [metrics]);

  // Force GeoJSON to redraw when the metric, selection, or dataset changes
  // (Leaflet caches styles).
  const layerKey = `${metricKey}-${selected}-${datasetSize}-${geo ? 'ready' : 'loading'}`;

  return (
    <div className="bg-white rounded-lg border border-grey-200 shadow-sm overflow-hidden">
      {/* Metric picker + legend */}
      <div className="px-3 py-2 border-b border-grey-100 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-tertiary mr-1">
          Colour countries by:
        </span>
        {mapMetrics.map(m => (
          <button
            key={m.key}
            onClick={() => setMetricKey(m.key)}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${
              metricKey === m.key
                ? 'bg-primary text-white border-primary'
                : 'border-grey-200 text-tertiary-dark hover:border-primary hover:text-primary'
            }`}
          >
            {m.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[10px] text-tertiary">
          {metric.legend.map((l, i) => (
            <span key={i} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-sm border border-grey-200"
                style={{ backgroundColor: l.color }}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div className="px-3 py-1.5 border-b border-grey-100 text-[11px] text-tertiary">
        {metric.description} Click a country to filter the catalogue below
        {selected !== 'all' && (
          <button
            onClick={() => onSelect('all')}
            className="ml-2 text-primary hover:underline"
          >
            · clear filter ({selected})
          </button>
        )}
      </div>

      <MapContainer
        center={[54, 13]}
        zoom={4}
        scrollWheelZoom={true}
        style={{ height: `min(${height}px, 70dvh)`, minHeight: 360, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoError && (
          <div className="absolute top-2 left-2 z-[400] bg-red-50 border border-red-200 text-red-900 text-[11px] rounded px-2 py-1">
            Map polygons failed to load: {geoError}. The catalogue below still works.
          </div>
        )}

        {geo && (
          <GeoJSON
            key={layerKey}
            data={geo}
            style={(feature) => {
              const id = String(feature?.id ?? feature?.properties?.iso_n3 ?? '').padStart(3, '0');
              const code = N3_TO_A2[id];
              const m = code ? byCode.get(code) : undefined;
              const isSelected = code != null && code === selected;
              return {
                fillColor: m ? metric.fill(m) : '#ECEFF1',
                fillOpacity: selected === 'all' || isSelected ? 0.82 : 0.35,
                color: isSelected ? '#2E3E4C' : '#ffffff',
                weight: isSelected ? 2.5 : 1,
              };
            }}
            onEachFeature={(feature, layer) => {
              const id = String(feature?.id ?? feature?.properties?.iso_n3 ?? '').padStart(3, '0');
              const code = N3_TO_A2[id];
              const m = code ? byCode.get(code) : undefined;
              if (!m || !code) return;

              layer.on({
                mouseover: (e) => {
                  const l = e.target as L.Path;
                  l.setStyle({ weight: 2.5, color: '#3D5265', fillOpacity: 0.92 });
                  l.bringToFront();
                },
                mouseout: (e) => {
                  const l = e.target as L.Path;
                  const isSelected = code === selected;
                  l.setStyle({
                    weight: isSelected ? 2.5 : 1,
                    color: isSelected ? '#2E3E4C' : '#ffffff',
                    fillOpacity: selected === 'all' || isSelected ? 0.82 : 0.35,
                  });
                },
                click: () => onSelect(code === selected ? 'all' : code),
              });

              const swatch = metric.fill(m);
              layer.bindTooltip(
                `<div style="font:12px system-ui;color:#2E3E4C;max-width:260px">` +
                `<div style="font-weight:700;font-size:13px">${m.name}</div>` +
                `<div style="color:#5C6770;margin:2px 0">` +
                `${m.total} instruments · ${m.laws} laws / ${m.policies} policies</div>` +
                `<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;` +
                `background:${swatch};margin-right:4px"></span>${metric.valueLabel(m)}</div>` +
                (m.latestYear != null
                  ? `<div style="color:#5C6770">Active ${m.firstYear}–${m.latestYear} · ` +
                    `${m.sectorsCovered} sectors covered</div>`
                  : '') +
                `<div style="color:#808285;font-size:10px;margin-top:3px">` +
                `Click to ${code === selected ? 'clear the' : 'filter the'} catalogue</div>` +
                `</div>`,
                { sticky: true, direction: 'top', opacity: 0.96 },
              );
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
