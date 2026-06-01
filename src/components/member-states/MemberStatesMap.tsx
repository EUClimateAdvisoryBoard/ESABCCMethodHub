'use client';

/**
 * MemberStatesMap — EU-27 choropleth.
 *
 * Each EU member state is rendered as a polygon, filled by its assessed
 * status for the selected indicator (GHG, renewables, efficiency, air, …).
 * Hovering shows the country name and status; clicking opens a popup with
 * key headline figures and a jump-to-profile button.
 *
 * Topology is the world-atlas 110m topojson (cdn.jsdelivr.net), filtered
 * to the EU-27 by ISO numeric code on render. Loaded client-side because
 * Leaflet touches `window` / `document` on mount.
 */

import {
  MapContainer, TileLayer, GeoJSON,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CountryProfile, HeatmapIndicatorKey } from '@/data/country-profiles/_types';
import {
  STATUS_COLORS, STATUS_LABELS, HEATMAP_INDICATORS,
} from '@/data/country-profiles/_types';
import { heatmapStatus } from '@/data/country-profiles';

interface Props {
  profiles: CountryProfile[];
  /** Initial indicator. */
  defaultIndicator?: HeatmapIndicatorKey;
  height?: number;
}

// ISO alpha-2 → ISO numeric N3 (the id used by world-atlas topojson).
const EU_A2_TO_N3: Record<string, string> = {
  AT: '040', BE: '056', BG: '100', CY: '196', CZ: '203',
  DE: '276', DK: '208', EE: '233', ES: '724', FI: '246',
  FR: '250', GR: '300', HR: '191', HU: '348', IE: '372',
  IT: '380', LT: '440', LU: '442', LV: '428', MT: '470',
  NL: '528', PL: '616', PT: '620', RO: '642', SE: '752',
  SI: '705', SK: '703',
};

const N3_TO_A2: Record<string, string> = Object.fromEntries(
  Object.entries(EU_A2_TO_N3).map(([k, v]) => [v, k]),
);

// Static asset produced by `scripts/build-eu27-geojson.mjs` (prebuild). Same
// origin, so the site's CSP `connect-src` directive doesn't block it.
const EU27_GEOJSON_URL = '/data/eu27-boundaries.geojson';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGeo = any;

export default function MemberStatesMap({
  profiles, defaultIndicator = 'ghg', height = 540,
}: Props) {
  const [indicator, setIndicator] = useState<HeatmapIndicatorKey>(defaultIndicator);
  const [geo, setGeo] = useState<AnyGeo | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(EU27_GEOJSON_URL)
      .then(r => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then(fc => { if (!cancelled) setGeo(fc); })
      .catch(e => { if (!cancelled) setGeoError(e instanceof Error ? e.message : 'load failed'); });
    return () => { cancelled = true; };
  }, []);

  const byCode = useMemo(() => {
    const m = new Map<string, CountryProfile>();
    for (const p of profiles) m.set(p.code, p);
    return m;
  }, [profiles]);

  // Force GeoJSON to redraw when the indicator changes (Leaflet caches styles).
  const layerKey = `${indicator}-${geo ? 'ready' : 'loading'}`;

  return (
    <div className="bg-white rounded-lg border border-grey-200 shadow-sm overflow-hidden">
      {/* Indicator picker */}
      <div className="px-3 py-2 border-b border-grey-100 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-tertiary mr-1">
          Colour countries by:
        </span>
        {HEATMAP_INDICATORS.map(ind => (
          <button
            key={ind.key}
            onClick={() => setIndicator(ind.key)}
            className={`text-[11px] px-2.5 py-1 rounded-full border ${
              indicator === ind.key
                ? 'bg-primary text-white border-primary'
                : 'border-grey-200 text-tertiary-dark hover:border-primary hover:text-primary'
            }`}
          >
            {ind.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[10px] text-tertiary">
          {(['on-track','partial','concern','off-track','unknown'] as const).map(s => (
            <span key={s} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: STATUS_COLORS[s] }}
              />
              {STATUS_LABELS[s]}
            </span>
          ))}
        </div>
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
            Map polygons failed to load: {geoError}. The directory below still works.
          </div>
        )}

        {geo && (
          <GeoJSON
            key={layerKey}
            data={geo}
            style={(feature) => {
              const id = String(feature?.id ?? feature?.properties?.iso_n3 ?? '').padStart(3, '0');
              const code = N3_TO_A2[id];
              const p = code ? byCode.get(code) : undefined;
              const status = p ? heatmapStatus(p, indicator) : 'unknown';
              return {
                fillColor: STATUS_COLORS[status],
                fillOpacity: 0.78,
                color: '#ffffff',
                weight: 1,
              };
            }}
            onEachFeature={(feature, layer) => {
              const id = String(feature?.id ?? feature?.properties?.iso_n3 ?? '').padStart(3, '0');
              const code = N3_TO_A2[id];
              const p = code ? byCode.get(code) : undefined;
              if (!p) return;
              const status = heatmapStatus(p, indicator);
              const statusColor = STATUS_COLORS[status];

              // Hover highlight
              layer.on({
                mouseover: (e) => {
                  const l = e.target as L.Path;
                  l.setStyle({ weight: 2.5, color: '#3D5265', fillOpacity: 0.92 });
                  l.bringToFront();
                },
                mouseout: (e) => {
                  const l = e.target as L.Path;
                  l.setStyle({ weight: 1, color: '#ffffff', fillOpacity: 0.78 });
                },
              });

              // Tooltip — quick name + status badge.
              layer.bindTooltip(
                `<div style="font:600 12px system-ui;color:#2E3E4C">${p.name}` +
                `<div style="font-weight:400;color:#5C6770">` +
                `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;` +
                `background:${statusColor};margin-right:4px"></span>` +
                `${STATUS_LABELS[status]}</div></div>`,
                { sticky: true, direction: 'top', opacity: 0.95 },
              );

              // Popup — fuller card with key figures and "open profile" jump.
              const target2030 = p.ghg.target2030
                ? `<div><span style="color:#808285">2030 GHG target:</span> ${p.ghg.target2030.value}${p.ghg.target2030.unit}</div>`
                : '';
              const resTarget = p.renewables.target2030 != null
                ? `<div><span style="color:#808285">2030 RES target:</span> ${p.renewables.target2030}%</div>`
                : '';
              const summaryLine = p.hero.summary?.split('\n')[0]?.slice(0, 220) ?? '';
              layer.bindPopup(
                `<div style="font:12px system-ui;color:#2E3E4C;max-width:300px">` +
                `<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#808285;margin-bottom:2px">${p.code} · ${p.hero.capital ?? ''}</div>` +
                `<div style="font-weight:700;font-size:13px;margin-bottom:6px">${p.name}</div>` +
                `<div style="display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:500;color:#fff;background:${statusColor};margin-bottom:6px">${STATUS_LABELS[status]}</div>` +
                (summaryLine ? `<div style="margin-bottom:6px">${summaryLine}…</div>` : '') +
                target2030 + resTarget +
                `<a href="/member-states/${p.code}" style="display:inline-block;margin-top:8px;padding:3px 8px;border-radius:3px;background:#0065A4;color:#fff;text-decoration:none;font-size:11px">Open profile →</a>` +
                `</div>`,
                { maxWidth: 320 },
              );
            }}
          />
        )}
      </MapContainer>

      {/* Directory chips beneath the map — helpful for keyboard users and as a
          fallback when the polygon layer can't load. */}
      <div className="px-3 py-2 border-t border-grey-100 flex flex-wrap gap-1">
        {profiles
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(p => {
            const status = heatmapStatus(p, indicator);
            return (
              <Link
                key={p.code}
                href={`/member-states/${p.code}`}
                title={`${p.name} — ${STATUS_LABELS[status]}`}
                className="flex items-center gap-1 px-2 py-0.5 rounded border border-grey-200 text-[10px] text-tertiary-dark hover:border-primary hover:text-primary"
              >
                <span
                  className="inline-block w-2 h-2 rounded-sm"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                {p.code}
              </Link>
            );
          })}
      </div>
    </div>
  );
}
