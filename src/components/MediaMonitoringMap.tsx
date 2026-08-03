'use client';

/**
 * MediaMonitoringMap — a world choropleth + outlet pin overlay.
 *
 * Used exclusively by src/app/media-monitoring/page.tsx. Kept in its own
 * component because it needs a one-time `fetch()` of the world topology and
 * must render client-side only (dynamic import with `ssr: false`).
 *
 * Inspired by src/components/charts/WorldMap.tsx but differs in that:
 *  - The colour scale is sequential on article *count* (not climate metric)
 *  - It overlays outlet pins sized by reach so the map doubles as a scatter
 */

import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import * as topojsonClient from 'topojson-client';

interface CountryValue {
  country: string; // ISO alpha-2
  country_name: string;
  count: number;
  reach: number;
}

interface OutletPoint {
  domain: string;
  name: string;
  country: string;
  count: number;
  reach: number;
  latitude?: number;
  longitude?: number;
}

interface Props {
  byCountry: CountryValue[];
  outlets: OutletPoint[];
  metric?: 'count' | 'reach';
  height?: number;
}

// ISO alpha-2 → ISO numeric (3-digit), which is what the world-atlas topojson uses
const ISO_A2_TO_N3: Record<string, string> = {
  AD: '020', AL: '008', AT: '040', BA: '070', BE: '056', BG: '100', BY: '112',
  CH: '756', CY: '196', CZ: '203', DE: '276', DK: '208', EE: '233', ES: '724',
  FI: '246', FR: '250', GB: '826', GE: '268', GR: '300', HR: '191', HU: '348',
  IE: '372', IS: '352', IT: '380', LT: '440', LU: '442', LV: '428', MD: '498',
  ME: '499', MK: '807', MT: '470', NL: '528', NO: '578', PL: '616', PT: '620',
  RO: '642', RS: '688', RU: '643', SE: '752', SI: '705', SK: '703', TR: '792',
  UA: '804',
  US: '840', CA: '124', MX: '484', BR: '076', AR: '032',
  JP: '392', CN: '156', IN: '356', KR: '410', AU: '036', NZ: '554',
  ZA: '710', EG: '818', IL: '376', SA: '682', AE: '784',
};

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Module-level cache so the (fairly large) world topology is only ever
// downloaded once per browser session, even though this component mounts
// and unmounts every time the user leaves and revisits the Overview tab.
let worldTopoPromise: Promise<unknown> | null = null;
function loadWorldTopo(): Promise<unknown> {
  if (!worldTopoPromise) {
    worldTopoPromise = fetch(WORLD_TOPO_URL)
      .then((r) => r.json())
      .catch((err) => {
        // Allow a later mount to retry instead of caching a permanent failure.
        worldTopoPromise = null;
        throw err;
      });
  }
  return worldTopoPromise;
}

export default function MediaMonitoringMap({
  byCountry,
  outlets,
  metric = 'count',
  height = 420,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [geoData, setGeoData] = useState<unknown>(null);
  const [width, setWidth] = useState(900);
  const [offMapCount, setOffMapCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadWorldTopo()
      .then((data) => {
        if (!cancelled) setGeoData(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Track the container's width so the map redraws at the right size on
  // window/panel resize instead of freezing at its first-render width.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 900);
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !geoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topo = geoData as any;
    let features: d3.GeoPermissibleObjects[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fc = topojsonClient.feature(topo, topo.objects.countries) as any;
      features = fc.features || [];
    } catch {
      if (topo.features) features = topo.features;
    }

    // Country value lookup by ISO numeric code
    const valueByN3: Record<string, number> = {};
    const nameByN3: Record<string, string> = {};
    byCountry.forEach((c) => {
      const n3 = ISO_A2_TO_N3[c.country];
      if (!n3) {
        console.debug(`MediaMonitoringMap: no ISO numeric mapping for country code "${c.country}"`);
        return;
      }
      valueByN3[n3] = metric === 'count' ? c.count : c.reach;
      nameByN3[n3] = c.country_name || c.country;
    });

    const values = Object.values(valueByN3).filter((v) => v > 0);
    const vMax = values.length > 0 ? Math.max(...values) : 1;

    // Colour scale — teal ramp matching the project palette
    const colorScale = d3
      .scaleSequential((t) => d3.interpolateRgb('#F1F6F8', '#004B7F')(t))
      .domain([0, Math.log10(vMax + 1)]);

    // Europe-focused projection: centre roughly on Brussels, scale to fit
    const projection = d3
      .geoMercator()
      .center([12, 52])
      .scale(width / 1.4)
      .translate([width / 2, height / 2 + 30]);

    const pathGen = d3.geoPath().projection(projection);

    // Draw country polygons
    svg
      .selectAll('path.country')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .data(features as any[])
      .join('path')
      .attr('class', 'country')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', (d: any) => pathGen(d) || '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('fill', (d: any) => {
        const id = d.id || d.properties?.iso_n3;
        const v = id ? valueByN3[id] || 0 : 0;
        return v > 0 ? colorScale(Math.log10(v + 1)) : '#F3F4F6';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.4)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .append('title')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .text((d: any) => {
        const id = d.id || d.properties?.iso_n3;
        const v = id ? valueByN3[id] || 0 : 0;
        const name = (id && nameByN3[id]) || d.properties?.name || id || 'Unknown';
        return `${name}: ${v.toLocaleString()} ${metric === 'count' ? 'articles' : 'reach'}`;
      });

    // Outlet pins — size scaled by sqrt(reach). The projection is
    // Europe-centred, so outlets outside its visible area (e.g. the
    // non-European entries in ISO_A2_TO_N3) are excluded here rather than
    // left to render off-canvas/clipped; their count is surfaced in a
    // caption instead of being silently dropped.
    const candidateOutlets = outlets.filter(
      (o) => typeof o.latitude === 'number' && typeof o.longitude === 'number' && o.count > 0,
    );

    let outOfBounds = 0;
    const pinOutlets = candidateOutlets.filter((o) => {
      const p = projection([o.longitude!, o.latitude!]);
      const inBounds = !!p && p[0] >= 0 && p[0] <= width && p[1] >= 0 && p[1] <= height;
      if (!inBounds) outOfBounds += 1;
      return inBounds;
    });
    setOffMapCount(outOfBounds);

    const maxReach = d3.max(pinOutlets, (o) => o.reach) ?? 1;
    const rScale = d3.scaleSqrt().domain([0, maxReach]).range([2, 18]);

    svg
      .selectAll('circle.outlet')
      .data(pinOutlets)
      .join('circle')
      .attr('class', 'outlet')
      .attr('cx', (d) => {
        const p = projection([d.longitude!, d.latitude!]);
        return p ? p[0] : -100;
      })
      .attr('cy', (d) => {
        const p = projection([d.longitude!, d.latitude!]);
        return p ? p[1] : -100;
      })
      .attr('r', (d) => rScale(d.reach))
      .attr('fill', '#E8712B')
      .attr('fill-opacity', 0.65)
      .attr('stroke', '#B3450F')
      .attr('stroke-width', 0.8)
      .append('title')
      .text(
        (d) =>
          `${d.name} (${d.country}) — ${d.count} articles · ${(d.reach / 1e6).toFixed(1)}M reach`,
      );

    // Title + legend
    svg
      .append('text')
      .attr('x', 12)
      .attr('y', 20)
      .attr('fill', '#2E3E4C')
      .attr('font-size', 13)
      .attr('font-weight', 'bold')
      .text(
        metric === 'count'
          ? 'Media coverage by country (article count, log scale)'
          : 'Media reach by country (estimated readership)',
      );

    // Gradient legend bar
    const legendW = 180;
    const legendH = 8;
    const legendX = width - legendW - 14;
    const legendY = height - 24;

    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'mm-map-grad')
      .attr('x1', '0%')
      .attr('x2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#F1F6F8');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#004B7F');

    svg
      .append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendW)
      .attr('height', legendH)
      .attr('fill', 'url(#mm-map-grad)')
      .attr('rx', 2);

    svg
      .append('text')
      .attr('x', legendX)
      .attr('y', legendY - 3)
      .attr('fill', '#54728C')
      .attr('font-size', 9)
      .text('low');
    svg
      .append('text')
      .attr('x', legendX + legendW)
      .attr('y', legendY - 3)
      .attr('text-anchor', 'end')
      .attr('fill', '#54728C')
      .attr('font-size', 9)
      .text(`high (${vMax.toLocaleString()})`);
  }, [geoData, byCountry, outlets, metric, height, width]);

  return (
    <div ref={containerRef}>
      <div style={{ height }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      </div>
      {offMapCount > 0 && (
        <p className="text-[10px] text-tertiary mt-1 text-right">
          +{offMapCount} outlet{offMapCount === 1 ? '' : 's'} outside map area
        </p>
      )}
    </div>
  );
}
