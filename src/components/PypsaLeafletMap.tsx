'use client';

/**
 * PypsaLeafletMap — interactive geospatial visualization of the 30-country
 * PyPSA-Eur–style network. Replaces the previous static SVG map with a
 * Leaflet-powered, zoomable/pannable map rendered on OpenStreetMap tiles.
 *
 * Each country node shows:
 *   - A circle whose size scales with total installed capacity (GW)
 *   - A pie (SVG DivIcon) showing its scenario technology mix
 *   - An iso2 label and a click/hover popup with the full capacity breakdown
 *
 * Each interconnector is drawn as a geodesic Polyline between the two
 * national capitals, colour-coded AC / HVDC, with line weight scaling with
 * cross-border flow (TWh/yr).
 *
 * NOTE: This component is client-only. Import it via next/dynamic with
 * { ssr: false } because Leaflet touches `window` / `document` on mount.
 */

import { useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Tooltip,
  Popup,
  Marker,
  LayersControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { EU_COUNTRIES, EU_COUNTRY_INDEX, EU_INTERCONNECTORS } from '@/lib/eu-countries';

export type PypsaResult = {
  capacity_gw: Record<string, Record<string, number>>;
  flows_twh: Record<string, number>;
};

interface Props {
  result: PypsaResult;
  /** Color per technology, passed through from the page (stays consistent with charts). */
  colors: Record<string, string>;
  height?: number;
}

// -------------------------------------------------------------------------
// SVG pie helper — rendered via Leaflet DivIcon so it sits on the map in
// true geographic coordinates (unlike the old viewBox-projected version).
// -------------------------------------------------------------------------
function pieSvg(
  techs: [string, number][],
  total: number,
  r: number,
  colors: Record<string, string>,
  label: string,
): string {
  const d = r * 2 + 4;
  if (techs.length === 0) return '';

  if (techs.length === 1) {
    const color = colors[techs[0][0]] || '#888';
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" style="overflow:visible;">
        <circle cx="${d / 2}" cy="${d / 2}" r="${r}" fill="${color}" fill-opacity="0.88" stroke="white" stroke-width="1.2"/>
        <text x="${d / 2 + r + 3}" y="${d / 2 + 3}" font-size="10" font-weight="600" fill="#1e293b" style="text-shadow: 0 0 3px white, 0 0 3px white;">${label}</text>
      </svg>`;
  }

  const cx = d / 2;
  const cy = d / 2;
  let startAngle = -Math.PI / 2;
  const paths: string[] = [];
  for (const [tech, gw] of techs) {
    const fraction = gw / total;
    const angle = fraction * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const sx = cx + r * Math.cos(startAngle);
    const sy = cy + r * Math.sin(startAngle);
    const ex = cx + r * Math.cos(endAngle);
    const ey = cy + r * Math.sin(endAngle);
    const color = colors[tech] || '#888';
    // Near-full circle: draw as plain <circle> so the path doesn't self-close.
    if (fraction > 0.999) {
      paths.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.88" stroke="white" stroke-width="0.6"/>`);
    } else {
      paths.push(
        `<path d="M ${cx} ${cy} L ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z" fill="${color}" fill-opacity="0.88" stroke="white" stroke-width="0.6"/>`,
      );
    }
    startAngle = endAngle;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" style="overflow:visible;">
      ${paths.join('')}
      <text x="${cx + r + 3}" y="${cy + 3}" font-size="10" font-weight="600" fill="#1e293b" style="text-shadow: 0 0 3px white, 0 0 3px white;">${label}</text>
    </svg>`;
}

function makePieIcon(
  techs: [string, number][],
  total: number,
  r: number,
  colors: Record<string, string>,
  label: string,
): L.DivIcon {
  const d = r * 2 + 4;
  const html = pieSvg(techs, total, r, colors, label);
  return L.divIcon({
    html,
    className: 'pypsa-pie-icon',
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
  });
}

export default function PypsaLeafletMap({ result, colors, height = 560 }: Props) {
  // -- Aggregate per-country data ---------------------------------------
  const { countryData, maxTotal, flowAbs } = useMemo(() => {
    const countryData: Record<string, { total: number; dominant: string; color: string }> = {};
    for (const [iso, mix] of Object.entries(result.capacity_gw)) {
      let total = 0;
      let dominant = '';
      let dominantGw = 0;
      for (const [tech, gw] of Object.entries(mix)) {
        total += gw;
        if (gw > dominantGw) {
          dominantGw = gw;
          dominant = tech;
        }
      }
      countryData[iso] = { total, dominant, color: colors[dominant] || '#888' };
    }
    const maxTotal = Math.max(...Object.values(countryData).map((d) => d.total), 1);
    const flowAbs = Math.max(...Object.values(result.flows_twh).map((v) => Math.abs(v)), 1);
    return { countryData, maxTotal, flowAbs };
  }, [result, colors]);

  // Reasonable default bounds covering EU + NO + GB (roughly)
  const bounds: L.LatLngBoundsExpression = [
    [34, -11], // SW
    [71, 32],  // NE
  ];

  return (
    <div style={{ width: '100%', height, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        bounds={bounds}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', background: '#eef2f7' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Light (Carto)">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Terrain (OpenTopoMap)">
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> (CC-BY-SA)'
              maxZoom={17}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* -------- Interconnectors -------------------------------------- */}
        {EU_INTERCONNECTORS.map(([a, b, cap, kind], i) => {
          const ca = EU_COUNTRY_INDEX[a];
          const cb = EU_COUNTRY_INDEX[b];
          if (!ca || !cb) return null;
          const flow = result.flows_twh[`${a}-${b}`] ?? result.flows_twh[`${b}-${a}`] ?? 0;
          const weight = 1.2 + (Math.abs(flow) / flowAbs) * 6;
          const color = kind === 'HVDC' ? '#2563eb' : '#fb923c';
          return (
            <Polyline
              key={`link-${i}-${a}-${b}`}
              positions={[
                [ca.capitalLat, ca.capitalLon],
                [cb.capitalLat, cb.capitalLon],
              ]}
              pathOptions={{
                color,
                weight,
                opacity: 0.75,
                dashArray: kind === 'HVDC' ? '6 4' : undefined,
                lineCap: 'round',
              }}
            >
              <Tooltip sticky opacity={0.95}>
                <div style={{ fontSize: 11 }}>
                  <strong>
                    {a} ↔ {b}
                  </strong>{' '}
                  <span style={{ color: '#64748b' }}>({kind})</span>
                  <br />
                  NTC capacity: <b>{cap.toFixed(1)} GW</b>
                  <br />
                  Net flow: <b>{flow.toFixed(2)} TWh/yr</b>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* -------- Country pie/circle markers --------------------------- */}
        {EU_COUNTRIES.map((c) => {
          const d = countryData[c.iso2];
          if (!d || d.total < 0.1) return null;

          const mix = result.capacity_gw[c.iso2] || {};
          const techs: [string, number][] = Object.entries(mix)
            .filter(([, gw]) => gw > 0.5)
            .sort((a, b) => b[1] - a[1]);

          const baseR = 6 + Math.sqrt(d.total / maxTotal) * 18;

          const icon = makePieIcon(
            techs.length > 0 ? techs : [[d.dominant || 'Other', d.total]],
            d.total || 1,
            baseR,
            colors,
            c.iso2,
          );

          return (
            <Marker
              key={c.iso2}
              position={[c.capitalLat, c.capitalLon]}
              icon={icon}
              keyboard={false}
            >
              <Popup>
                <div style={{ fontSize: 12, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {c.name} ({c.iso2})
                  </div>
                  <div style={{ color: '#475569', marginBottom: 6 }}>
                    Demand {c.demand_twh} TWh/yr · {c.coastal ? 'coastal' : 'landlocked'}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    Total capacity: {d.total.toFixed(1)} GW
                  </div>
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <tbody>
                      {techs.map(([tech, gw]) => (
                        <tr key={tech}>
                          <td style={{ paddingRight: 6, verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 10,
                                height: 10,
                                borderRadius: 2,
                                background: colors[tech] || '#888',
                                marginRight: 4,
                                verticalAlign: 'middle',
                              }}
                            />
                            {tech}
                          </td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {gw.toFixed(1)} GW
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              color: '#64748b',
                              paddingLeft: 6,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {((gw / d.total) * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* -------- Invisible circle markers used only for hit-testing --- */}
        {/* (gives a generous hover/click target on top of each pie) */}
        {EU_COUNTRIES.map((c) => {
          const d = countryData[c.iso2];
          if (!d || d.total < 0.1) return null;
          const r = 6 + Math.sqrt(d.total / maxTotal) * 18;
          return (
            <CircleMarker
              key={`hit-${c.iso2}`}
              center={[c.capitalLat, c.capitalLon]}
              radius={r}
              pathOptions={{ color: 'transparent', fillOpacity: 0, weight: 0 }}
              interactive={false}
            />
          );
        })}
      </MapContainer>

      {/* -------- In-map legend (HTML overlay, stays put on zoom) -------- */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 6,
          border: '1px solid #cbd5e1',
          padding: '8px 10px',
          fontSize: 11,
          color: '#1e293b',
          lineHeight: 1.35,
          zIndex: 500,
          maxWidth: 220,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Power lines</div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
          width ∝ cross-border flow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ display: 'inline-block', width: 28, height: 3, background: '#fb923c', borderRadius: 2 }} />
          <span>AC corridor</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 28,
              height: 0,
              borderTop: '3px dashed #2563eb',
            }}
          />
          <span>HVDC link</span>
        </div>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>Power plants</div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
          pie size ∝ total GW · click for mix
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 2, columnGap: 6 }}>
          {Object.keys(colors).map((tech) => (
            <div key={tech} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: colors[tech],
                }}
              />
              <span style={{ fontSize: 10 }}>{tech}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
