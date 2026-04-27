'use client';

import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import * as topojsonClient from 'topojson-client';

interface RegionValue {
  region: string;
  value: number;
}

interface Props {
  data: RegionValue[];
  unit: string;
  title: string;
  compact?: boolean;
}

// Map IIASA region names to ISO country/region codes for D3 geo
const REGION_TO_ISO: Record<string, string[]> = {
  'World': [],
  'USA': ['840'], 'United States': ['840'], 'US': ['840'],
  'China': ['156'], 'CHN': ['156'],
  'India': ['356'], 'IND': ['356'],
  'EU27': ['040','056','100','191','196','203','208','233','246','250','276','300','348','372','380','428','440','442','470','528','616','620','642','703','705','724','752'],
  'EU': ['040','056','100','191','196','203','208','233','246','250','276','300','348','372','380','428','440','442','470','528','616','620','642','703','705','724','752'],
  'Europe': ['040','056','100','191','196','203','208','233','246','250','276','300','348','372','380','428','440','442','470','528','616','620','642','703','705','724','752','826','756'],
  'Japan': ['392'], 'JPN': ['392'],
  'Brazil': ['076'], 'BRA': ['076'],
  'Russia': ['643'], 'Former USSR': ['643'], 'R5.2REF': ['643'],
  'Canada': ['124'], 'CAN': ['124'],
  'Australia': ['036'], 'AUS': ['036'],
  'South Korea': ['410'], 'Korea': ['410'],
  'Mexico': ['484'], 'MEX': ['484'],
  'Indonesia': ['360'], 'IDN': ['360'],
  'South Africa': ['710'], 'ZAF': ['710'],
  'Africa': ['012','024','204','854','108','120','132','140','148','174','178','180','262','818','226','232','231','266','270','288','324','624','384','404','426','430','434','450','454','466','478','480','504','508','516','562','566','646','678','686','694','706','710','728','729','748','768','788','800','834','894','716'],
  'R5.2MAF': ['012','024','204','854','108','120','132','140','148','174','178','180','262','818','226','232','231','266','270','288','324','624','384','404','426','430','434','450','454','466','478','480','504','508','516','562','566','646','678','686','694','706','710','728','729','748','768','788','800','834','894','716','364','368','376','400','414','422','275','512','634','682','760','784','887'],
  'Middle East': ['364','368','376','400','414','422','275','512','634','682','760','784','887'],
  'Latin America': ['032','068','076','152','170','188','192','214','218','222','320','328','332','340','388','484','558','591','600','604','740','858','862'],
  'Countries of Latin America and the Caribbean': ['032','068','076','152','170','188','192','214','218','222','320','328','332','340','388','484','558','591','600','604','740','858','862','044','052','084','212','308','312','332','388','659','662','670','780'],
  'R5.2LAM': ['032','068','076','152','170','188','192','214','218','222','320','328','332','340','388','484','558','591','600','604','740','858','862'],
  'Southeast Asia': ['096','104','116','360','418','458','608','702','764','704'],
  'R5.2ASIA': ['096','104','116','356','360','410','418','458','586','608','702','764','704'],
  'Countries of South and South-East Asia and developing Pacific': ['096','104','116','356','360','418','458','586','608','702','764','704'],
  'Developed Countries': ['840','124','250','276','826','380','392','036','554','040','056','208','246','300','372','528','620','724','752','756','348','203','616','703','705','233','428','440'],
  'R5.2OECD': ['840','124','250','276','826','380','392','036','554','040','056','208','246','300','372','528','620','724','752','756'],
  'R10EUROPE': ['040','056','100','191','196','203','208','233','246','250','276','300','348','372','380','428','440','442','470','528','616','620','642','703','705','724','752','826','756'],
  'R10NORTH_AM': ['840','124'],
  'R10CHINA+': ['156'],
  'R10INDIA+': ['356'],
};

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export default function WorldMap({ data, unit, title, compact }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geoData, setGeoData] = useState<unknown>(null);

  // Load world topology once
  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!svgRef.current || !geoData || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 600;
    const height = compact ? 220 : 340;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topo = geoData as any;

    // Convert topojson to geojson features
    let features: d3.GeoPermissibleObjects[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fc = topojsonClient.feature(topo, topo.objects.countries) as any;
      features = fc.features || [];
    } catch {
      // Fallback: raw geojson
      if (topo.features) features = topo.features;
    }

    // Build country -> value map
    const countryValues: Record<string, number> = {};
    data.forEach(d => {
      const isos = REGION_TO_ISO[d.region];
      if (isos) {
        isos.forEach(iso => { countryValues[iso] = d.value; });
      }
    });

    const values = Object.values(countryValues);
    const vMin = Math.min(...values, 0);
    const vMax = Math.max(...values, 1);

    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([vMax, vMin]);

    const projection = d3.geoNaturalEarth1()
      .fitSize([width - 20, height - (compact ? 30 : 50)], { type: 'Sphere' } as d3.GeoPermissibleObjects)
      .translate([width / 2, height / 2 + (compact ? 5 : 10)]);

    const pathGen = d3.geoPath().projection(projection);

    // Title
    svg.append('text')
      .attr('x', width / 2).attr('y', compact ? 14 : 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#2E3E4C')
      .attr('font-size', compact ? 12 : 14)
      .attr('font-weight', 'bold')
      .text(title);

    // Draw countries
    svg.selectAll('path')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .data(features as any[])
      .join('path')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', (d: any) => pathGen(d) || '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('fill', (d: any) => {
        const id = d.id || d.properties?.iso_n3;
        return id && countryValues[id] != null ? colorScale(countryValues[id]) : '#E6E7E8';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.3)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .append('title')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .text((d: any) => {
        const id = d.id || d.properties?.iso_n3;
        const name = d.properties?.name || id;
        const val = id && countryValues[id] != null ? countryValues[id].toLocaleString(undefined, { maximumFractionDigits: 1 }) : 'N/A';
        return `${name}: ${val} ${unit}`;
      });

    // Color legend
    const legendW = compact ? 120 : 180;
    const legendH = 10;
    const legendX = width - legendW - 10;
    const legendY = height - 15;

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'map-legend-grad');
    grad.append('stop').attr('offset', '0%').attr('stop-color', colorScale(vMax));
    grad.append('stop').attr('offset', '100%').attr('stop-color', colorScale(vMin));

    svg.append('rect').attr('x', legendX).attr('y', legendY).attr('width', legendW).attr('height', legendH)
      .attr('fill', 'url(#map-legend-grad)').attr('rx', 2);

    svg.append('text').attr('x', legendX).attr('y', legendY - 2)
      .attr('fill', '#808285').attr('font-size', 8).text(vMax.toLocaleString(undefined, { maximumFractionDigits: 0 }));
    svg.append('text').attr('x', legendX + legendW).attr('y', legendY - 2)
      .attr('fill', '#808285').attr('font-size', 8).attr('text-anchor', 'end').text(vMin.toLocaleString(undefined, { maximumFractionDigits: 0 }));

  }, [geoData, data, unit, title, compact]);

  return (
    <div style={{ height: compact ? 260 : 400 }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
