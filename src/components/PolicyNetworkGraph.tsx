'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as d3 from 'd3';
import { GraphNode, GraphLink } from '@/lib/types';
import {
  CONNECTION_TYPES,
  CONNECTION_TYPE_LIST,
  type ConnectionTypeId,
} from '@/lib/connectionTypes';

const DOMAIN_COLORS: Record<string, string> = {
  climate: '#2D6A4F',
  energy: '#B5651D',
  transport: '#5C5F8A',
  finance: '#1B4965',
  'cross-cutting': '#495057',
  security: '#6C757D',
  defense: '#6C757D',
  agriculture: '#40916C',
  industry: '#7B2D8B',
  digital: '#3A6EA5',
  trade: '#7A6520',
  circular_economy: '#2D6A4F',
  health: '#A63D40',
  environment: '#1B7340',
  social: '#8E4585',
  justice: '#6B3A5D',
  migration: '#C45E2C',
  education: '#3A7CA5',
  consumer: '#9A7B2A',
  fisheries: '#2680C2',
};

// Assign each domain a cluster position angle for grouping
const DOMAIN_LIST = Object.keys(DOMAIN_COLORS);
const DOMAIN_ANGLE: Record<string, number> = {};
DOMAIN_LIST.forEach((d, i) => {
  DOMAIN_ANGLE[d] = (2 * Math.PI * i) / DOMAIN_LIST.length;
});

const LINK_STYLES: Record<string, string> = Object.fromEntries(
  CONNECTION_TYPE_LIST.map(t => [t.id, t.dash]),
);
const LINK_COLORS: Record<string, string> = Object.fromEntries(
  CONNECTION_TYPE_LIST.map(t => [t.id, t.color]),
);

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  /**
   * Optional network filter. When provided, only nodes whose id is in this
   * set will be rendered; links entirely within the set are kept.
   */
  networkPolicyIds?: Set<string> | null;
  /** Fired when a user clicks on a link; used to open a connection detail panel. */
  onLinkClick?: (payload: { sourceId: string; targetId: string; connection_type: string; description: string }) => void;
}

export default function PolicyNetworkGraph({ nodes, links, networkPolicyIds, onLinkClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [activeDomains, setActiveDomains] = useState<Set<string>>(new Set(Object.keys(DOMAIN_COLORS)));
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const svgSelRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  // Mini-map state (M·04 #2): publishes the current zoom transform + the
  // simulated node positions so the bottom-right overview can render
  // a viewport rectangle that tracks the main view.
  const [miniTransform, setMiniTransform] = useState<{ k: number; x: number; y: number }>({ k: 1, x: 0, y: 0 });
  const [miniDots, setMiniDots] = useState<Array<{ id: string; x: number; y: number; domain: string }>>([]);
  const [miniBounds, setMiniBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number; W: number; H: number }>({ minX: 0, minY: 0, maxX: 800, maxY: 600, W: 800, H: 600 });
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setFilterOpen(false);
        setLegendOpen(false);
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const domains = [...new Set(nodes.map(n => n.domain))];

  const toggleDomain = useCallback((domain: string) => {
    setActiveDomains(prev => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    if (svgSelRef.current && zoomRef.current) {
      svgSelRef.current.transition().duration(600)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = containerRef.current.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    svg.attr('width', W).attr('height', H);

    const filteredNodes = nodes.filter(n => {
      if (!activeDomains.has(n.domain)) return false;
      if (networkPolicyIds && !networkPolicyIds.has(n.id)) return false;
      return true;
    });
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = links.filter(l => {
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      return nodeIds.has(s) && nodeIds.has(t);
    });

    // Build adjacency map for hover interactions
    const adjacencyMap = new Map<string, Set<string>>();
    filteredLinks.forEach(l => {
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      if (!adjacencyMap.has(s)) adjacencyMap.set(s, new Set());
      if (!adjacencyMap.has(t)) adjacencyMap.set(t, new Set());
      adjacencyMap.get(s)!.add(t);
      adjacencyMap.get(t)!.add(s);
    });

    const defs = svg.append('defs');

    // Fine grid pattern — scientific paper style
    const gridPattern = defs.append('pattern')
      .attr('id', 'sci-grid')
      .attr('width', 40)
      .attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse');
    // Minor grid lines
    gridPattern.append('path')
      .attr('d', 'M 40 0 L 0 0 0 40')
      .attr('fill', 'none')
      .attr('stroke', '#E2E4E8')
      .attr('stroke-width', 0.4)
      .attr('opacity', 0.5);
    // Major grid dots at intersections
    gridPattern.append('circle')
      .attr('cx', 0).attr('cy', 0).attr('r', 0.6)
      .attr('fill', '#C9CCD1').attr('opacity', 0.4);

    // Drop shadow filter for nodes
    const dropShadow = defs.append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    dropShadow.append('feDropShadow')
      .attr('dx', 0).attr('dy', 1)
      .attr('stdDeviation', 2)
      .attr('flood-color', 'rgba(0,0,0,0.12)');

    // Glow filter for hovered nodes
    const glow = defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-80%').attr('y', '-80%')
      .attr('width', '260%').attr('height', '260%');
    glow.append('feGaussianBlur')
      .attr('stdDeviation', 4)
      .attr('result', 'blur');
    const feMerge = glow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers for directed links
    Object.entries(LINK_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-3L7,0L0,3')
        .attr('fill', color)
        .attr('opacity', 0.5);
    });

    // Background rect with grid
    svg.insert('rect', ':first-child')
      .attr('width', W).attr('height', H)
      .attr('fill', '#FAFBFC');
    svg.insert('rect', ':first-child')
      .attr('width', W).attr('height', H)
      .attr('fill', 'url(#sci-grid)');

    const g = svg.append('g');

    // Zoom with wider extent to see all policies at overview
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (e) => {
        g.attr('transform', e.transform);
        // Adaptive label visibility based on zoom level
        const k = e.transform.k;
        g.selectAll('.node-label')
          .attr('opacity', k > 0.45 ? Math.min(1, (k - 0.45) * 2.5) : 0);
        g.selectAll('.node-label-bg')
          .attr('opacity', k > 0.45 ? Math.min(0.85, (k - 0.45) * 2) : 0);
        // Publish transform to the mini-map so its viewport rectangle tracks.
        setMiniTransform({ k, x: e.transform.x, y: e.transform.y });
      });
    svg.call(zoom);
    zoomRef.current = zoom;
    svgSelRef.current = svg;

    // Tooltip (declared early so both link and node handlers can reference it)
    const tooltip = d3.select(containerRef.current).append('div')
      .style('position', 'absolute')
      .style('display', 'none')
      .style('background', 'rgba(255,255,255,0.97)')
      .style('backdrop-filter', 'blur(12px)')
      .style('-webkit-backdrop-filter', 'blur(12px)')
      .style('border', '1px solid #D1D5DB')
      .style('border-radius', '6px')
      .style('padding', '10px 14px')
      .style('font-size', '11px')
      .style('font-family', "'Inter', 'Roboto', system-ui, sans-serif")
      .style('color', '#374151')
      .style('box-shadow', '0 4px 20px rgba(0,0,0,0.08)')
      .style('pointer-events', 'none')
      .style('z-index', '10')
      .style('max-width', '260px')
      .style('line-height', '1.5');

    // Base opacity depends on review status — approved connections read as
    // solid lines, still-pending ones fade so the viewer can tell at a
    // glance which edges a human has signed off on.
    const baseOpacity = (l: GraphLink) =>
      l.review_status === 'verified'
        ? 0.55
        : l.review_status === 'needs_review'
          ? 0.3
          : 0.15;

    // Edge-thickness encodes trust (M·04 #3): graph data doesn't carry a
    // numeric confidence yet, so we use review_status as the proxy:
    //   verified      → 2.4 px  (high trust)
    //   needs_review  → 1.4 px
    //   unverified    → 0.8 px  (default — current behaviour)
    //   rejected      → 0.5 px  (visually de-emphasised)
    // High-confidence connections jump out at the user; speculative ones
    // recede. Pairs with the connection_type colour + dash pattern, so
    // hue/dash still encode kind and thickness encodes trust.
    const linkStrokeWidth = (l: GraphLink): number => {
      switch (l.review_status) {
        case 'verified':     return 2.4;
        case 'needs_review': return 1.4;
        case 'rejected':     return 0.5;
        case 'unverified':   return 0.8;
        default:             return 0.8;
      }
    };

    // Links — visible stroke
    const link = g.selectAll('.link').data(filteredLinks).enter().append('line')
      .attr('class', 'link')
      .attr('stroke', l => LINK_COLORS[l.connection_type] || '#9CA3AF')
      .attr('stroke-opacity', (l) => baseOpacity(l))
      .attr('stroke-width', l => linkStrokeWidth(l))
      .attr('stroke-dasharray', l => LINK_STYLES[l.connection_type] || '0')
      .attr('marker-end', l => `url(#arrow-${l.connection_type})`);

    // Links — wide invisible hit area for easier hover / click
    const linkHit = g.selectAll('.link-hit').data(filteredLinks).enter().append('line')
      .attr('class', 'link-hit')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 12)
      .style('cursor', onLinkClick ? 'pointer' : 'default');

    linkHit
      .on('mouseover', (_event, l) => {
        link
          .filter((d: any) => d === l)
          .attr('stroke-opacity', 0.95)
          .attr('stroke-width', 2.4);
        const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
        const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
        const srcNode = filteredNodes.find(n => n.id === s);
        const tgtNode = filteredNodes.find(n => n.id === t);
        const typeDef = CONNECTION_TYPES[l.connection_type as ConnectionTypeId];
        const reviewBadge = (() => {
          switch (l.review_status) {
            case 'verified':
              return '<span style="display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:999px;background:#D1FAE5;color:#065F46;margin-left:6px;vertical-align:middle">✓ Human approved</span>';
            case 'needs_review':
              return '<span style="display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:999px;background:#DBEAFE;color:#1E40AF;margin-left:6px;vertical-align:middle">Needs info</span>';
            case 'unverified':
              return '<span style="display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:999px;background:#FEF3C7;color:#92400E;margin-left:6px;vertical-align:middle">Pending review</span>';
            default:
              return '';
          }
        })();
        tooltip.style('display', 'block')
          .html(
            `<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:${typeDef?.color || '#6B7280'};font-weight:600;margin-bottom:4px">${typeDef?.label || l.connection_type}${reviewBadge}</div>` +
            `<div style="font-size:12px;font-weight:600;color:#111827;line-height:1.3;margin-bottom:4px">${srcNode?.short_title || s} <span style="color:#9CA3AF;margin:0 4px">→</span> ${tgtNode?.short_title || t}</div>` +
            `<div style="font-size:11px;color:#4B5563;line-height:1.45">${(l.description || '').replace(/</g, '&lt;').slice(0, 220)}${(l.description || '').length > 220 ? '…' : ''}</div>` +
            (onLinkClick ? `<div style="font-size:10px;color:#6B7280;margin-top:6px;font-style:italic">Click for details</div>` : ''),
          );
      })
      .on('mousemove', (event) => {
        const [x, y] = d3.pointer(event, containerRef.current);
        tooltip.style('left', (x + 14) + 'px').style('top', (y - 14) + 'px');
      })
      .on('mouseout', (_event, l) => {
        link
          .filter((d: any) => d === l)
          .attr('stroke-opacity', baseOpacity(l))
          .attr('stroke-width', 0.8);
        tooltip.style('display', 'none');
      })
      .on('click', (event, l) => {
        if (!onLinkClick) return;
        event.stopPropagation();
        const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
        const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
        onLinkClick({
          sourceId: s,
          targetId: t,
          connection_type: l.connection_type,
          description: l.description,
        });
      });

    // Node radius helper — emphasize highly connected nodes
    const maxConn = Math.max(...filteredNodes.map(n => n.connections), 1);
    const nodeRadius = (d: GraphNode) => {
      const base = 6 + (d.connections / maxConn) * 18;
      return Math.max(7, Math.min(26, base));
    };

    // Nodes
    const node = g.selectAll('.node').data(filteredNodes).enter().append('g')
      .attr('class', 'node').style('cursor', 'pointer');

    // Outer ring showing document type
    node.append('circle')
      .attr('r', d => nodeRadius(d) + 2)
      .attr('fill', 'none')
      .attr('stroke', d => DOMAIN_COLORS[d.domain] || '#6B7280')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', d => d.document_type === 'directive' ? '3,2' : '0');

    // Main node circle
    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => DOMAIN_COLORS[d.domain] || '#6B7280')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.88)
      .attr('filter', 'url(#node-shadow)')
      .style('transition', 'opacity 0.2s ease');

    // Connection count inside node (only for nodes with 3+ connections)
    node.filter(d => d.connections >= 3).append('text')
      .text(d => d.connections)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', d => Math.max(8, nodeRadius(d) * 0.65) + 'px')
      .attr('font-weight', '600')
      .attr('font-family', "'Inter', 'Roboto', system-ui, sans-serif")
      .attr('pointer-events', 'none');

    // Label backgrounds for readability (hidden at low zoom)
    node.append('rect')
      .attr('class', 'node-label-bg')
      .attr('rx', 2).attr('ry', 2)
      .attr('fill', 'white')
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    // Labels (hidden at low zoom, revealed on zoom in)
    const labels = node.append('text')
      .attr('class', 'node-label')
      .text(d => d.short_title)
      .attr('dy', d => -(nodeRadius(d) + 8))
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '9.5px')
      .attr('font-weight', '400')
      .attr('font-family', "'Inter', 'Roboto', system-ui, sans-serif")
      .attr('letter-spacing', '-0.01em')
      .attr('pointer-events', 'none')
      .attr('opacity', 0);

    // Size the background rects to match labels
    labels.each(function(d) {
      const bbox = (this as SVGTextElement).getBBox();
      const parent = (this as SVGTextElement).parentNode as Element | null;
      if (parent) {
        d3.select(parent).select('.node-label-bg')
          .attr('x', bbox.x - 3)
          .attr('y', bbox.y - 1)
          .attr('width', bbox.width + 6)
          .attr('height', bbox.height + 2);
      }
    });

    // Hover interactions. M·04 #8: Material Design 3 hover timing —
    // 200 ms delay on entry (avoids tooltip-flicker as the user passes
    // through a dense node cluster), 50 ms delay on exit (feels instant).
    let hoverEnterTimer: ReturnType<typeof setTimeout> | null = null;
    let hoverExitTimer: ReturnType<typeof setTimeout> | null = null;
    node.on('mouseover', (event, d) => {
      // Cancel any pending hide; if a show is already pending, restart it
      // for the new node so we don't lock onto the wrong one.
      if (hoverExitTimer) { clearTimeout(hoverExitTimer); hoverExitTimer = null; }
      if (hoverEnterTimer) clearTimeout(hoverEnterTimer);
      hoverEnterTimer = setTimeout(() => { runHoverShow(event, d); }, 200);
    }).on('mousemove', (event) => {
      const [x, y] = d3.pointer(event, containerRef.current);
      tooltip.style('left', (x + 14) + 'px').style('top', (y - 14) + 'px');
    }).on('mouseout', (event, d) => {
      // Cancel any pending show — the user moved off before the tooltip
      // would have appeared, so it should never appear at all.
      if (hoverEnterTimer) { clearTimeout(hoverEnterTimer); hoverEnterTimer = null; }
      if (hoverExitTimer) clearTimeout(hoverExitTimer);
      hoverExitTimer = setTimeout(() => { runHoverHide(event, d); }, 50);
    });

    // The full hover-show / hide bodies are closures so the delayed
    // setTimeout above can call them. Behaviour identical to the previous
    // mouseover/mouseout handlers, just deferred 200 ms / 50 ms.
    function runHoverShow(event: MouseEvent, d: GraphNode) {
      const connectedIds = adjacencyMap.get(d.id) || new Set();

      // Lens / fish-eye focus (M·04 #1): hovered node scales 1.4×,
      // 1-hop neighbours 1.2×, everything else fades to 30% opacity.
      node.select('.node-circle')
        .attr('opacity', (n: any) => (n.id === d.id || connectedIds.has(n.id)) ? 1 : 0.3)
        .attr('r', (n: any) => {
          const base = nodeRadius(n as GraphNode);
          if (n.id === d.id) return base * 1.4;
          if (connectedIds.has(n.id)) return base * 1.2;
          return base;
        });
      node.selectAll('text')
        .attr('opacity', (n: any) => (n.id === d.id || connectedIds.has(n.id)) ? 1 : 0.2);
      node.select('.node-label-bg')
        .attr('opacity', (n: any) => (n.id === d.id || connectedIds.has(n.id)) ? 0.9 : 0);

      // Highlight connected links
      link
        .attr('stroke-opacity', (l: any) => {
          const s = typeof l.source === 'string' ? l.source : l.source.id;
          const t = typeof l.target === 'string' ? l.target : l.target.id;
          return (s === d.id || t === d.id) ? 0.7 : 0.03;
        })
        .attr('stroke-width', (l: any) => {
          const s = typeof l.source === 'string' ? l.source : l.source.id;
          const t = typeof l.target === 'string' ? l.target : l.target.id;
          return (s === d.id || t === d.id) ? 1.8 : 0.4;
        });

      // Scale up hovered node
      d3.select(event.currentTarget as Element).select('.node-circle')
        .transition().duration(150)
        .attr('r', nodeRadius(d) * 1.2)
        .attr('filter', 'url(#node-glow)')
        .attr('opacity', 1);

      // Show tooltip
      const status = (d as any).status || '';
      const docType = (d as any).document_type || '';
      tooltip.style('display', 'block')
        .html(
          `<div style="font-weight:600;font-size:12px;color:#111827;margin-bottom:5px;line-height:1.3">${d.short_title}</div>` +
          `<div style="display:flex;flex-direction:column;gap:3px">` +
          `<div style="display:flex;align-items:center;gap:6px">` +
          `<span style="width:8px;height:8px;border-radius:50%;background:${DOMAIN_COLORS[d.domain] || '#6B7280'};display:inline-block;flex-shrink:0"></span>` +
          `<span style="color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.06em">${d.domain.replace('_', ' ')}</span>` +
          `</div>` +
          (docType ? `<span style="color:#6B7280;font-size:10px;text-transform:capitalize">${docType}</span>` : '') +
          (status ? `<span style="color:#6B7280;font-size:10px;text-transform:capitalize">${status.replace('_', ' ')}</span>` : '') +
          `<span style="color:#374151;font-weight:500;font-size:11px;margin-top:2px">${d.connections} connection${d.connections !== 1 ? 's' : ''}</span>` +
          `</div>`
        );
    }
    function runHoverHide(event: MouseEvent, d: GraphNode) {
      node.select('.node-circle')
        .attr('opacity', 0.88)
        .attr('r', (n: any) => nodeRadius(n as GraphNode));
      node.selectAll('.node-label').attr('opacity', 0);
      node.select('.node-label-bg').attr('opacity', 0);
      link
        .attr('stroke-opacity', 0.2)
        .attr('stroke-width', (l: any) => linkStrokeWidth(l));
      d3.select(event.currentTarget as Element).select('.node-circle')
        .transition().duration(150)
        .attr('r', nodeRadius(d))
        .attr('filter', 'url(#node-shadow)');
      tooltip.style('display', 'none');
    }

    node.on('click', (_, d) => { router.push(`/policy-navigator/policy/?id=${d.id}`); });

    // Compute cluster centers based on domain
    const clusterRadius = Math.min(W, H) * 0.32;
    const domainCenters: Record<string, { x: number; y: number }> = {};
    const activeDomainList = [...new Set(filteredNodes.map(n => n.domain))];
    activeDomainList.forEach((d, i) => {
      const angle = (2 * Math.PI * i) / activeDomainList.length - Math.PI / 2;
      domainCenters[d] = {
        x: W / 2 + Math.cos(angle) * clusterRadius,
        y: H / 2 + Math.sin(angle) * clusterRadius,
      };
    });

    // Reduced-motion fallback (M·04 #9): when prefers-reduced-motion is set,
    // run the simulation hot for 200 ticks then freeze it, so the user sees
    // a stable layout without the live wobble. Otherwise run as a live
    // simulation as before.
    const reducedMotion = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Simulation with domain clustering forces
    const sim = d3.forceSimulation(filteredNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(filteredLinks).id(d => d.id).distance(80).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.05))
      .force('collide', d3.forceCollide().radius(d => nodeRadius(d as GraphNode) + 5).strength(0.7))
      // Cluster by domain
      .force('x', d3.forceX<GraphNode>(d => domainCenters[d.domain]?.x || W / 2).strength(0.12))
      .force('y', d3.forceY<GraphNode>(d => domainCenters[d.domain]?.y || H / 2).strength(0.12))
      .on('tick', () => {
        link
          .attr('x1', d => (d.source as GraphNode).x || 0)
          .attr('y1', d => (d.source as GraphNode).y || 0)
          .attr('x2', d => (d.target as GraphNode).x || 0)
          .attr('y2', d => (d.target as GraphNode).y || 0);
        linkHit
          .attr('x1', d => (d.source as GraphNode).x || 0)
          .attr('y1', d => (d.source as GraphNode).y || 0)
          .attr('x2', d => (d.target as GraphNode).x || 0)
          .attr('y2', d => (d.target as GraphNode).y || 0);
        node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
      });
    simRef.current = sim;

    if (reducedMotion) {
      // Run the simulation hot for ~200 ticks without animation, then stop.
      // Force-stop yields a stable static layout — no jitter, no wobble —
      // for users who can't tolerate the live force animation.
      for (let i = 0; i < 200; i++) sim.tick();
      sim.stop();
    }

    // After simulation stabilizes, fit all nodes into view
    sim.on('end', () => {
      const xs = filteredNodes.map(n => n.x || 0);
      const ys = filteredNodes.map(n => n.y || 0);
      if (xs.length === 0) return;
      const padding = 60;
      const x0 = Math.min(...xs) - padding;
      const y0 = Math.min(...ys) - padding;
      const x1 = Math.max(...xs) + padding;
      const y1 = Math.max(...ys) + padding;
      const bw = x1 - x0;
      const bh = y1 - y0;
      const scale = Math.min(W / bw, H / bh, 1);
      const tx = (W - bw * scale) / 2 - x0 * scale;
      const ty = (H - bh * scale) / 2 - y0 * scale;
      svg.transition().duration(800)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      // Publish stabilised positions + bounds to the mini-map.
      setMiniBounds({ minX: x0, minY: y0, maxX: x1, maxY: y1, W, H });
      setMiniDots(filteredNodes.map(n => ({ id: n.id, x: n.x || 0, y: n.y || 0, domain: n.domain })));
    });

    // Drag
    const dragHandler = d3.drag<SVGGElement, GraphNode>()
      .on('start', function(event, d) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on('drag', function(event, d) {
        d.fx = event.x; d.fy = event.y;
      })
      .on('end', function(event, d) {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
    node.call(dragHandler);

    return () => { sim.stop(); tooltip.remove(); };
  }, [nodes, links, activeDomains, router, networkPolicyIds, onLinkClick]);

  const overlayCardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(209,213,219,0.6)',
    boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
  };

  const visibleNodeIds = new Set(
    nodes
      .filter(n => activeDomains.has(n.domain))
      .filter(n => !networkPolicyIds || networkPolicyIds.has(n.id))
      .map(n => n.id),
  );
  const totalConnections = links.filter(l => {
    const s = typeof l.source === 'string' ? l.source : l.source.id;
    const t = typeof l.target === 'string' ? l.target : l.target.id;
    return visibleNodeIds.has(s) && visibleNodeIds.has(t);
  }).length;
  const totalNodes = visibleNodeIds.size;

  return (
    <div className="relative w-full h-full overflow-hidden" ref={containerRef} style={{ background: '#FAFBFC' }}>
      {/* Mobile toggle chips */}
      <div className="absolute top-2 left-2 right-2 z-20 flex gap-2 md:hidden pointer-events-none">
        <button
          onClick={() => { setFilterOpen(v => !v); setLegendOpen(false); }}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-full text-[#374151] active:bg-white"
          style={overlayCardStyle}
          aria-label="Toggle domain filter"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          Filter
        </button>
        <button
          onClick={() => { setLegendOpen(v => !v); setFilterOpen(false); }}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-full text-[#374151] active:bg-white ml-auto"
          style={overlayCardStyle}
          aria-label="Toggle legend"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          Legend
        </button>
      </div>

      {/* Statistics badge — top-right */}
      <div
        className="absolute top-3 right-3 z-10 rounded-md px-3 py-2 hidden md:flex items-center gap-4"
        style={overlayCardStyle}
      >
        <div className="text-center">
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', lineHeight: 1 }}>{totalNodes}</p>
          <p style={{ fontSize: '8px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Policies</p>
        </div>
        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />
        <div className="text-center">
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', lineHeight: 1 }}>{totalConnections}</p>
          <p style={{ fontSize: '8px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Connections</p>
        </div>
        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />
        <div className="text-center">
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', lineHeight: 1 }}>{activeDomains.size}</p>
          <p style={{ fontSize: '8px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Domains</p>
        </div>
      </div>

      {/* Reset zoom button */}
      <button
        onClick={handleResetZoom}
        className="absolute bottom-3 left-3 z-10 rounded-md px-3 py-2 text-[11px] font-medium text-[#374151] hover:bg-white/80 transition hidden md:flex items-center gap-1.5"
        style={overlayCardStyle}
        aria-label="Reset zoom to show all policies"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
        Fit all
      </button>

      {/* Domain filter */}
      <div
        className={`absolute top-14 md:top-3 left-2 md:left-3 z-10 rounded-md p-3 max-h-[60%] md:max-h-none overflow-y-auto transition-opacity ${
          filterOpen ? 'block' : 'hidden md:block'
        }`}
        style={overlayCardStyle}
      >
        <p
          className="mb-2"
          style={{
            fontSize: '8px',
            fontWeight: 500,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Filter by Domain
        </p>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-x-3">
          {domains.map(d => (
            <label
              key={d}
              className="flex items-center gap-1.5 cursor-pointer py-[2px]"
              style={{ fontSize: '11px', color: '#4B5563', fontWeight: 400 }}
            >
              <input
                type="checkbox"
                checked={activeDomains.has(d)}
                onChange={() => toggleDomain(d)}
                className="rounded border-grey-300 shrink-0"
                style={{ width: '13px', height: '13px' }}
              />
              <span
                className="rounded-full shrink-0"
                style={{
                  width: '7px',
                  height: '7px',
                  background: DOMAIN_COLORS[d] || '#6B7280',
                }}
              />
              <span className="capitalize truncate">{d.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        className={`absolute bottom-12 md:bottom-3 right-3 z-10 rounded-md p-3 ${
          legendOpen ? 'block' : 'hidden md:block'
        }`}
        style={overlayCardStyle}
      >
        <p
          className="mb-1.5"
          style={{
            fontSize: '8px',
            fontWeight: 500,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Connection Types
        </p>
        {CONNECTION_TYPE_LIST.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-2"
            style={{ fontSize: '10px', color: '#4B5563', padding: '1.5px 0', fontWeight: 400, cursor: 'help' }}
            title={`${t.label} — ${t.definition} When to use: ${t.criteria}`}
          >
            <svg width="24" height="6">
              <line
                x1="0" y1="3" x2="18" y2="3"
                stroke={t.color}
                strokeWidth="1.5"
                strokeDasharray={t.dash}
              />
              <polygon
                points="18,0 24,3 18,6"
                fill={t.color}
                opacity="0.7"
              />
            </svg>
            <span>{t.label}</span>
          </div>
        ))}
        <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' }}>
          Hover a type for its definition
        </p>
        <div className="mt-2 pt-1.5 border-t border-grey-200">
          <p style={{ fontSize: '8px', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Node Style</p>
          <div className="flex items-center gap-2" style={{ fontSize: '10px', color: '#4B5563', padding: '1px 0' }}>
            <svg width="14" height="14">
              <circle cx="7" cy="7" r="5" fill="none" stroke="#6B7280" strokeWidth="1" />
            </svg>
            <span>Regulation (solid ring)</span>
          </div>
          <div className="flex items-center gap-2" style={{ fontSize: '10px', color: '#4B5563', padding: '1px 0' }}>
            <svg width="14" height="14">
              <circle cx="7" cy="7" r="5" fill="none" stroke="#6B7280" strokeWidth="1" strokeDasharray="3,2" />
            </svg>
            <span>Directive (dashed ring)</span>
          </div>
          <div className="flex items-center gap-2 mt-1" style={{ fontSize: '9px', color: '#9CA3AF' }}>
            <span>Node size = connection count</span>
          </div>
        </div>
      </div>

      {/* SVG */}
      <svg ref={svgRef} className="w-full h-full" style={{ touchAction: 'none' }} />

      {/* Mini-map (M·04 #2): bottom-right overview with a viewport rectangle.
          Click anywhere in the mini-map to pan the main view to that point;
          the rectangle stays in sync with the main zoom transform. */}
      {miniDots.length > 0 && (() => {
        const MINI_W = 160;
        const MINI_H = 120;
        const PAD = 6;
        const bx = miniBounds.maxX - miniBounds.minX;
        const by = miniBounds.maxY - miniBounds.minY;
        const ms = Math.min((MINI_W - 2 * PAD) / bx, (MINI_H - 2 * PAD) / by);
        const offX = (MINI_W - bx * ms) / 2 - miniBounds.minX * ms;
        const offY = (MINI_H - by * ms) / 2 - miniBounds.minY * ms;
        // Compute viewport rect: where in graph-space is the main SVG looking?
        const k = miniTransform.k;
        const tx = miniTransform.x;
        const ty = miniTransform.y;
        const W = miniBounds.W;
        const H = miniBounds.H;
        // Visible region in graph coords:
        const visX = -tx / k;
        const visY = -ty / k;
        const visW = W / k;
        const visH = H / k;
        // Convert to mini-map coords:
        const rx = visX * ms + offX;
        const ry = visY * ms + offY;
        const rw = visW * ms;
        const rh = visH * ms;
        const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
          const target = e.currentTarget;
          const rect = target.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          // Click point in mini-map → graph coords:
          const gx = (mx - offX) / ms;
          const gy = (my - offY) / ms;
          // Centre the main view on (gx, gy) at current k.
          const sel = svgSelRef.current;
          const z = zoomRef.current;
          if (!sel || !z) return;
          const newTx = W / 2 - gx * k;
          const newTy = H / 2 - gy * k;
          sel.transition().duration(280)
            .call(z.transform, d3.zoomIdentity.translate(newTx, newTy).scale(k));
        };
        return (
          <div
            data-tour="mini-map"
            className="absolute bottom-3 right-3 bg-[var(--mh-card)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--mh-card)]/85 border border-[var(--mh-border)] rounded-md shadow-md p-1 pointer-events-auto"
            style={{ width: MINI_W + 8, height: MINI_H + 18 }}
            aria-hidden="true"
            title="Mini-map — click to pan the main view"
          >
            <div
              className="text-[var(--mh-muted)] uppercase tracking-wider font-semibold pl-1 pb-0.5"
              style={{ fontSize: 8 }}
            >
              Overview
            </div>
            <svg
              width={MINI_W}
              height={MINI_H}
              onClick={handleClick}
              style={{ cursor: 'crosshair', display: 'block' }}
            >
              <rect width={MINI_W} height={MINI_H} fill="var(--mh-bg)" />
              {miniDots.map(d => (
                <circle
                  key={d.id}
                  cx={d.x * ms + offX}
                  cy={d.y * ms + offY}
                  r={1.4}
                  fill={DOMAIN_COLORS[d.domain] || '#9CA3AF'}
                  opacity={0.7}
                />
              ))}
              {/* Viewport rectangle — draggable visually (cursor-only for now). */}
              <rect
                x={Math.max(0, rx)}
                y={Math.max(0, ry)}
                width={Math.min(MINI_W - Math.max(0, rx), Math.max(2, rw))}
                height={Math.min(MINI_H - Math.max(0, ry), Math.max(2, rh))}
                fill="var(--mh-status-primary)"
                fillOpacity={0.12}
                stroke="var(--mh-status-primary)"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            </svg>
          </div>
        );
      })()}
    </div>
  );
}
