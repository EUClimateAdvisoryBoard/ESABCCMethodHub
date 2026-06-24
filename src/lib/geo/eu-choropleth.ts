/**
 * Shared scaffolding for the EU-27 Leaflet choropleth maps (Member States
 * heatmap, National Climate Policies map, …).
 *
 * Every one of those maps fills the same EU-27 polygons from the same
 * static boundary asset and keys features by ISO numeric code. They each
 * used to inline an identical alpha-2 ↔ numeric lookup, the asset URL and
 * the fetch-once-on-mount effect; this module is the single home for that
 * shared geography so a new EU-27 map is a few lines, not a copy-paste.
 *
 * The actual polygon styling, popups and legends stay in each component —
 * only the country-code maps and the boundary load live here.
 */
import { useEffect, useState } from 'react';

/** ISO alpha-2 → ISO numeric N3 (the id used by the world-atlas topology). */
export const EU_A2_TO_N3: Record<string, string> = {
  AT: '040', BE: '056', BG: '100', CY: '196', CZ: '203',
  DE: '276', DK: '208', EE: '233', ES: '724', FI: '246',
  FR: '250', GR: '300', HR: '191', HU: '348', IE: '372',
  IT: '380', LT: '440', LU: '442', LV: '428', MT: '470',
  NL: '528', PL: '616', PT: '620', RO: '642', SE: '752',
  SI: '705', SK: '703',
};

/** ISO numeric N3 → ISO alpha-2 (inverse of {@link EU_A2_TO_N3}). */
export const N3_TO_A2: Record<string, string> = Object.fromEntries(
  Object.entries(EU_A2_TO_N3).map(([k, v]) => [v, k]),
);

/**
 * Static asset produced by `scripts/build-eu27-geojson.mjs` (prebuild).
 * Same origin, so the site's CSP `connect-src` directive doesn't block it.
 */
export const EU27_GEOJSON_URL = '/data/eu27-boundaries.geojson';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGeo = any;

/**
 * Fetch the shared EU-27 boundary GeoJSON once on mount, cancelling the
 * state update if the component unmounts first. Returns the loaded feature
 * collection (`null` while loading) and an error string on failure — the
 * exact contract the choropleth components already expected from their
 * hand-rolled effect.
 */
export function useEu27Geojson(): { geo: AnyGeo | null; geoError: string | null } {
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

  return { geo, geoError };
}
