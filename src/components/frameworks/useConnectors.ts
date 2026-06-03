/**
 * Measures the on-screen positions of framework cards and produces SVG connector
 * paths between a child card (top-centre) and each of its parent cards
 * (bottom-centre), so the board renders as a genuinely connected tree that
 * re-flows on resize, edit, and expand/collapse.
 */
'use client';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface Connector {
  id: string;
  d: string;
}

export interface Edge {
  /** child node id (must have a registered element). */
  from: string;
  /** parent node id (must have a registered element). */
  to: string;
}

export function useConnectors(edges: Edge[], deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const els = useRef<Record<string, HTMLElement | null>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [lines, setLines] = useState<Connector[]>([]);

  const register = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      els.current[id] = el;
    },
    [],
  );

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cb = container.getBoundingClientRect();
    setSize({ w: cb.width, h: cb.height });
    const next: Connector[] = [];
    for (const edge of edges) {
      const childEl = els.current[edge.from];
      const parentEl = els.current[edge.to];
      if (!childEl || !parentEl) continue;
      const c = childEl.getBoundingClientRect();
      const p = parentEl.getBoundingClientRect();
      const x1 = c.left + c.width / 2 - cb.left;
      const y1 = c.top - cb.top;
      const x2 = p.left + p.width / 2 - cb.left;
      const y2 = p.bottom - cb.top;
      const my = (y1 + y2) / 2;
      next.push({ id: `${edge.from}->${edge.to}`, d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}` });
    }
    setLines(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges]);

  useLayoutEffect(() => {
    recompute();
    const ro = new ResizeObserver(() => recompute());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { containerRef, register, lines, size, recompute };
}
