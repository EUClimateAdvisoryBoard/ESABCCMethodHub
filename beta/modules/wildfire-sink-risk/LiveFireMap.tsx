'use client';

/**
 * LiveFireMap — live wildfire situation map of Europe for the Wildfires & the
 * Land Sink module.
 *
 * Renders three Copernicus EFFIS WMS overlays over a light basemap:
 *
 *   1. `mf010.fwi`             — the Meteo-France Fire Weather Index forecast
 *      for today (a `TIME=YYYY-MM-DD` dimension is sent alongside the usual
 *      WMS params; that key isn't part of Leaflet's typed `WMSParams`, so it's
 *      added via a cast rather than left untyped).
 *   2. `modis.ba.poly.season`  — MODIS burnt-area polygons for the current
 *      season, i.e. the same seasonal footprint the live section of the page
 *      is built from.
 *   3. `viirs.hs`              — VIIRS thermal hotspots from the last 24 h.
 *      EFFIS renders these as green dots; a hotspot is a thermal anomaly, not
 *      a confirmed fire.
 *
 * EFFIS quirk worth flagging because it is easy to "clean up" by accident:
 * this MapServer instance 400s a GetMap request that omits STYLES entirely,
 * but is happy with an empty one. Leaflet's `TileLayer.WMS` already defaults
 * `styles` to `''`, which is exactly what's needed — so `styles: ''` is set
 * explicitly below only as documentation of that requirement, not because it
 * changes behaviour. Do not remove it under the assumption that an empty
 * string is a no-op.
 *
 * Client-only: Leaflet touches `window`/`document` on mount, so the page must
 * import this component via `next/dynamic` with `{ ssr: false }`. The
 * component itself makes no SSR allowance beyond that — it assumes it is
 * never rendered on the server.
 */

import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';
import type { WMSParams } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const EFFIS_BASE = 'https://maps.effis.emergency.copernicus.eu/effis';

interface Props {
  height?: number;
}

/** Shared WMS params every EFFIS overlay needs, keyed by layer name. */
function baseParams(layers: string): WMSParams {
  return {
    layers,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    // Required, even empty — see file header. Leaflet defaults this anyway;
    // set explicitly so the requirement is visible at the call site.
    styles: '',
  };
}

const FWI_RAMP: { color: string; label: string }[] = [
  { color: '#7EC8A5', label: 'Very low' },
  { color: '#F5D547', label: 'Low' },
  { color: '#F2994A', label: 'Moderate' },
  { color: '#D6392E', label: 'High' },
  { color: '#7A1F1A', label: 'Very high' },
  { color: '#2A1810', label: 'Extreme' },
];

function LayerToggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
        checked
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-grey-200 text-tertiary hover:border-primary/40'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 accent-primary"
      />
      {label}
    </label>
  );
}

export default function LiveFireMap({ height = 480 }: Props) {
  const [showFwi, setShowFwi] = useState(true);
  const [showBurnt, setShowBurnt] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);

  const todayUTC = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const seasonYear = useMemo(() => new Date().getUTCFullYear(), []);

  const fwiParams = useMemo(() => {
    const p = baseParams('mf010.fwi');
    // `time` is a non-standard WMS dimension EFFIS supports for the forecast
    // layer; `WMSParams` doesn't type it, so it's added via a cast rather
    // than an untyped object.
    return { ...p, time: todayUTC } as WMSParams;
  }, [todayUTC]);

  const burntParams = useMemo(() => baseParams('modis.ba.poly.season'), []);
  const hotspotParams = useMemo(() => baseParams('viirs.hs'), []);

  return (
    <div>
      {/* ── layer toggles ─────────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] uppercase tracking-wide text-tertiary">Layers:</span>
        <LayerToggle label="Fire danger today" checked={showFwi} onChange={setShowFwi} />
        <LayerToggle
          label={`Burnt areas ${seasonYear} season`}
          checked={showBurnt}
          onChange={setShowBurnt}
        />
        <LayerToggle label="Active fires 24 h" checked={showHotspots} onChange={setShowHotspots} />
      </div>

      {/* ── map ────────────────────────────────────────────────────────── */}
      <div className="w-full overflow-hidden rounded-lg border border-grey-200" style={{ height }}>
        <MapContainer
          center={[46, 8]}
          zoom={5}
          minZoom={3}
          maxZoom={12}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            maxZoom={19}
          />

          {showFwi && (
            <WMSTileLayer url={EFFIS_BASE} params={fwiParams} opacity={0.55} />
          )}
          {showBurnt && (
            <WMSTileLayer url={EFFIS_BASE} params={burntParams} opacity={0.9} />
          )}
          {showHotspots && (
            <WMSTileLayer url={EFFIS_BASE} params={hotspotParams} opacity={1} />
          )}
        </MapContainer>
      </div>

      {/* ── legend ─────────────────────────────────────────────────────── */}
      <div className="mt-3 rounded-lg border border-grey-200 bg-grey-50 p-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-tertiary">
          Fire Weather Index — danger forecast
        </div>
        <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-sm">
          {FWI_RAMP.map((s) => (
            <span key={s.label} className="flex-1" style={{ backgroundColor: s.color }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[9.5px] text-tertiary">
          {FWI_RAMP.map((s) => (
            <span key={s.label}>{s.label}</span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-tertiary">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-grey-200"
              style={{ backgroundColor: '#8B3A2E' }}
            />
            Burnt-area polygons
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: '#3DA35D' }}
            />
            Active-fire hotspots
          </span>
        </div>

        <p className="mt-2.5 text-[10.5px] leading-snug text-tertiary">
          Layers rendered live by the Copernicus EFFIS WMS; hotspots are thermal anomalies from
          the last 24 h, not confirmed fires.
        </p>
      </div>

      {/* ── attribution ────────────────────────────────────────────────── */}
      <p className="mt-2 text-[10px] text-tertiary">
        Map data © OpenStreetMap contributors · Fire layers:{' '}
        <a
          href="https://forest-fire.emergency.copernicus.eu/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          Copernicus Emergency Management Service — EFFIS
        </a>
      </p>
    </div>
  );
}
