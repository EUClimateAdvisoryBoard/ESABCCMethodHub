'use client';

/**
 * MemberStatesMap — Leaflet map of EU-27.
 *
 * Drops one CircleMarker per member state at the country centroid stored in
 * `CountryProfile.hero.{lat,lon}`. Marker colour reflects the headline GHG
 * status (or whichever indicator is passed in via `colorBy`). Clicking a
 * marker fires `onSelect(code)` which the parent uses to navigate or open
 * the profile sheet.
 */

import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import Link from 'next/link';
import type { CountryProfile, HeatmapIndicatorKey } from '@/data/country-profiles/_types';
import { STATUS_COLORS, STATUS_LABELS } from '@/data/country-profiles/_types';
import { heatmapStatus } from '@/data/country-profiles';

interface Props {
  profiles: CountryProfile[];
  colorBy?: HeatmapIndicatorKey;
  onSelect?: (code: string) => void;
  height?: number;
}

export default function MemberStatesMap({
  profiles,
  colorBy = 'ghg',
  onSelect,
  height = 540,
}: Props) {
  const positioned = useMemo(
    () => profiles.filter(p => Number.isFinite(p.hero.lat) && Number.isFinite(p.hero.lon)),
    [profiles],
  );

  return (
    <div className="rounded-lg overflow-hidden border border-grey-200 shadow-sm bg-white">
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

        {positioned.map(p => {
          const status = heatmapStatus(p, colorBy);
          const color = STATUS_COLORS[status];
          // Marker radius scales softly with population so big states pop out.
          const pop = p.hero.populationM ?? 5;
          const radius = 6 + Math.min(14, Math.sqrt(pop) * 1.6);

          return (
            <CircleMarker
              key={p.code}
              center={[p.hero.lat, p.hero.lon]}
              radius={radius}
              eventHandlers={{ click: () => onSelect?.(p.code) }}
              pathOptions={{
                color: '#ffffff',
                weight: 1.5,
                fillColor: color,
                fillOpacity: 0.85,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="text-[12px]">
                  <div className="font-semibold text-tertiary-dark">{p.name}</div>
                  <div className="text-tertiary">
                    {STATUS_LABELS[status]} · {colorBy}
                  </div>
                </div>
              </Tooltip>

              <Popup minWidth={280} maxWidth={340}>
                <div className="text-[12px] text-tertiary-dark">
                  <div className="text-[10px] uppercase tracking-wide text-tertiary mb-1">
                    {p.code} · {p.hero.capital}
                  </div>
                  <div className="font-bold mb-1.5 leading-snug">{p.name}</div>
                  <div
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white mb-2"
                    style={{ backgroundColor: color }}
                  >
                    {STATUS_LABELS[status]}
                  </div>
                  {p.hero.summary && (
                    <p className="text-[11px] leading-snug mb-2 line-clamp-4">
                      {p.hero.summary.split('\n')[0]}
                    </p>
                  )}
                  {p.ghg.target2030 && (
                    <div className="text-[11px] mb-1">
                      <span className="text-tertiary">2030 GHG target:</span>{' '}
                      {p.ghg.target2030.value}{p.ghg.target2030.unit}
                    </div>
                  )}
                  {p.renewables.target2030 != null && (
                    <div className="text-[11px] mb-2">
                      <span className="text-tertiary">2030 RES target:</span>{' '}
                      {p.renewables.target2030}%
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <Link
                      href={`/member-states/${p.code}`}
                      className="text-[11px] text-white bg-primary px-2 py-0.5 rounded hover:bg-primary-dark"
                    >
                      Open profile →
                    </Link>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
