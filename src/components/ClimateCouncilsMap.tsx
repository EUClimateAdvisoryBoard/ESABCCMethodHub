'use client';

/**
 * ClimateCouncilsMap — Leaflet map of EU climate advisory councils.
 *
 * Drops a colour-coded CircleMarker on each body in the catalogue. Pin colour
 * encodes status (active / dormant / legislated-not-operational / abolished /
 * none …) using the May 2026 PDF heatmap palette. Click a pin to open a
 * tooltip with the body name, status, year, URL, and an "Edit" button that
 * surfaces the entry to the parent page for editing.
 *
 * Client-only: import via `next/dynamic` with `ssr: false` because Leaflet
 * touches `window` / `document` on mount.
 */

import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ClimateCouncil,
  COUNCIL_STATUS_COLORS,
  COUNCIL_STATUS_LABELS,
} from '@/data/climate-councils';

interface Props {
  councils: ClimateCouncil[];
  onEdit?: (council: ClimateCouncil) => void;
  onExpand?: (council: ClimateCouncil) => void;
  height?: number;
}

export default function ClimateCouncilsMap({
  councils, onEdit, onExpand, height = 560,
}: Props) {
  // Slight jitter for bodies that share a city (Brussels, Athens, Berlin,
  // Vienna…) so overlapping pins remain individually clickable.
  const seen = new Map<string, number>();
  const positioned = councils
    .filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lon))
    .map(c => {
      const key = `${c.lat.toFixed(2)},${c.lon.toFixed(2)}`;
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      const angle = (n * 137.5 * Math.PI) / 180; // golden-angle spread
      const r = n === 0 ? 0 : 0.35 + 0.18 * Math.sqrt(n);
      return {
        ...c,
        plotLat: c.lat + r * Math.sin(angle),
        plotLon: c.lon + r * Math.cos(angle),
      };
    });

  return (
    <div className="rounded-lg overflow-hidden border border-grey-200 dark:border-[var(--mh-border)] shadow-sm bg-white dark:bg-[var(--mh-card)]">
      <MapContainer
        center={[52.5, 13.0]}
        zoom={4}
        scrollWheelZoom={true}
        style={{ height: `min(${height}px, 70dvh)`, minHeight: 320, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {positioned.map(c => {
          const color = COUNCIL_STATUS_COLORS[c.status];
          const radius = c.level === 'eu' ? 14 : c.level === 'national' ? 9 : 6;
          return (
            <CircleMarker
              key={c.id}
              center={[c.plotLat, c.plotLon]}
              radius={radius}
              pathOptions={{
                color: '#ffffff',
                weight: 1.5,
                fillColor: color,
                fillOpacity: c.status === 'none' ? 0.55 : 0.88,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="text-[12px]">
                  <div className="font-semibold text-tertiary-dark">
                    {c.countryName}
                    {c.region && ` — ${c.region}`}
                  </div>
                  <div className="text-tertiary">{c.bodyName}</div>
                </div>
              </Tooltip>

              <Popup minWidth={260} maxWidth={340}>
                <div className="text-[12px] text-tertiary-dark">
                  <div className="text-[10px] uppercase tracking-wide text-tertiary mb-1">
                    {c.countryName}
                    {c.region && ` · ${c.region}`}
                  </div>
                  <div className="font-bold mb-1.5 leading-snug">{c.bodyName}</div>
                  <div
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white mb-2"
                    style={{ backgroundColor: color }}
                  >
                    {COUNCIL_STATUS_LABELS[c.status]}
                  </div>
                  {c.established && (
                    <div className="mb-1">
                      <span className="text-tertiary">Established:</span>{' '}
                      {c.established}
                    </div>
                  )}
                  {c.statutory && (
                    <div className="mb-1">
                      <span className="text-tertiary">Statutory:</span> {c.statutory}
                    </div>
                  )}
                  {c.notes && <div className="mt-2 text-[11px] leading-snug">{c.notes}</div>}
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline"
                      >
                        Website ↗
                      </a>
                    )}
                    {c.legalBasisUrl && (
                      <a
                        href={c.legalBasisUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:underline"
                      >
                        Legal basis ↗
                      </a>
                    )}
                    {onExpand && (
                      <button
                        onClick={() => onExpand(c)}
                        className="ml-auto text-[11px] text-primary border border-primary/40 px-2 py-0.5 rounded hover:bg-primary/5"
                        title="Jump to this body's entry in the list below"
                      >
                        Expand ↓
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(c)}
                        className={`${onExpand ? '' : 'ml-auto'} text-[11px] text-white bg-primary px-2 py-0.5 rounded hover:bg-primary-dark`}
                      >
                        Edit
                      </button>
                    )}
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
