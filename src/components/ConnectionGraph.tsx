/**
 * D3 force-directed graph visualizing connections between a policy and its related policies.
 */
'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as d3 from 'd3';
import { PolicyConnection } from '@/lib/types';

const DOMAIN_COLORS: Record<string, string> = {
  climate: '#007B6C', energy: '#FF9933', transport: '#6667AB',
  finance: '#004B7F', 'cross-cutting': '#3D5265', security: '#B83230',
  defense: '#808285', agriculture: '#00928F', industry: '#A530B8',
  digital: '#2D7DD2', trade: '#8B6914', circular_economy: '#2E8B57',
  health: '#C14040', environment: '#228B22', social: '#C77DBA',
  justice: '#7B3F61', migration: '#D4762C', education: '#4682B4',
  consumer: '#B8860B', fisheries: '#1E90FF',
};

interface ConnNode { id: string; label: string; domain: string; isCurrent: boolean; }
interface ConnLink { source: string; target: string; type: string; }

interface Props {
  policyId: string;
  policyDomain: string;
  connections: (PolicyConnection & { source_title?: string; source_domain?: string; target_title?: string; target_domain?: string })[];
}

export default function ConnectionGraph({ policyId, policyDomain, connections }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!svgRef.current || connections.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const W = 500, H = 350;
    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const nodeMap = new Map<string, ConnNode>();
    nodeMap.set(policyId, { id: policyId, label: policyId, domain: policyDomain, isCurrent: true });
    const linkData: ConnLink[] = [];

    connections.forEach(c => {
      if (!nodeMap.has(c.source_policy_id)) {
        nodeMap.set(c.source_policy_id, { id: c.source_policy_id, label: c.source_title || c.source_policy_id, domain: c.source_domain || 'climate', isCurrent: c.source_policy_id === policyId });
      }
      if (!nodeMap.has(c.target_policy_id)) {
        nodeMap.set(c.target_policy_id, { id: c.target_policy_id, label: c.target_title || c.target_policy_id, domain: c.target_domain || 'climate', isCurrent: c.target_policy_id === policyId });
      }
      linkData.push({ source: c.source_policy_id, target: c.target_policy_id, type: c.connection_type });
    });

    const nodeData = Array.from(nodeMap.values());
    const g = svg.append('g');

    const link = g.selectAll('line').data(linkData).enter().append('line')
      .attr('stroke', '#BCBEC0').attr('stroke-width', 1.5).attr('stroke-opacity', 0.6);

    const node = g.selectAll('.cn').data(nodeData).enter().append('g').attr('class', 'cn').style('cursor', 'pointer');
    node.append('circle')
      .attr('r', d => d.isCurrent ? 18 : 12)
      .attr('fill', d => DOMAIN_COLORS[d.domain] || '#999')
      .attr('stroke', d => d.isCurrent ? '#FFCC00' : '#fff')
      .attr('stroke-width', d => d.isCurrent ? 3 : 2);
    node.append('text').text(d => d.label.length > 18 ? d.label.slice(0, 16) + '...' : d.label)
      .attr('dy', d => -(d.isCurrent ? 22 : 16)).attr('text-anchor', 'middle')
      .attr('fill', '#2E3E4C').attr('font-size', '9px').attr('font-weight', '500');

    node.on('click', (_, d) => { if (!d.isCurrent) router.push(`/policy-navigator/policy/?id=${d.id}`); });

    const sim = d3.forceSimulation(nodeData as any)
      .force('link', d3.forceLink(linkData as any).id((d: any) => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .on('tick', () => {
        link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
        node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

    return () => { sim.stop(); };
  }, [policyId, policyDomain, connections, router]);

  if (connections.length === 0) return <p className="text-sm text-grey-500 italic">No connections found.</p>;

  return <svg ref={svgRef} className="w-full max-w-lg mx-auto" style={{ height: 350 }} />;
}
