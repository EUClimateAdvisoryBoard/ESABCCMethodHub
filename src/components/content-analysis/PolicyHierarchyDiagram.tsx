/**
 * Policy hierarchy — the cascade view alongside Policy clustering's category
 * grid, over the same per-system data.
 * ---------------------------------------------------------------------------
 * Where the category grid asks "what kind of instrument is this?", this asks
 * "how cross-cutting is this act, and what does it cascade into?" — ordered
 * strictly by reach, top to bottom:
 *
 *   1. Economy-wide framework   — cuts across the whole economy (the
 *      Climate Law; the Green Deal and Fit for 55 are the same breadth but
 *      non-legislative strategy, shown with a dashed outline).
 *   2. Sector framework legislation — the one master regulation that
 *      structures most of this system (NECPs for energy, the EPBD for
 *      buildings, the CAP Strategic Plans Regulation for agri-food).
 *   3. Sector-specific policy  — binding acts setting a headline
 *      target/price/standard for a defined slice of the system.
 *   4. Implementation instrument — narrow/technical legislation plus every
 *      non-legislative fund, platform, report, guideline or institution.
 *
 * Every node also carries whether it is actual, adopted legislation or a
 * non-binding strategy/communication/guideline/proposal — rendered as a
 * solid vs. a softer, dashed outline — so the binding backbone reads clearly
 * without removing the softer context. Click any box to trace its lineage up
 * and down the chain; the detail panel below shows the same description plus
 * the tier badge used throughout Policy clustering.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildHierarchyIndex,
  ancestorsOf,
  descendantsOf,
  relevanceMatches,
  CLUSTER_CATEGORY_LABEL,
  CLUSTER_CATEGORY_COLOR,
  CLUSTER_RELEVANCE_LABEL,
  CLUSTER_TIER_LABEL,
  type ClusterSystem,
  type ClusterRelevance,
} from '@/lib/content-analysis/policy-clustering';

interface Props {
  system: ClusterSystem;
  relevance: 'all' | ClusterRelevance;
}

function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

export default function PolicyHierarchyDiagram({ system, relevance }: Props) {
  const index = useMemo(() => buildHierarchyIndex(system), [system]);
  const links = useMemo(
    () => system.items.flatMap(item => item.parents.map(parent => ({ parent, child: item.id }))),
    [system],
  );

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [system.id]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [linkPaths, setLinkPaths] = useState<Record<string, string>>({});
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const recompute = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    setSvgSize({ w: canvasEl.scrollWidth, h: canvasEl.scrollHeight });
    const canvasRect = canvasEl.getBoundingClientRect();
    const next: Record<string, string> = {};
    for (const l of links) {
      const pEl = nodeRefs.current.get(l.parent);
      const cEl = nodeRefs.current.get(l.child);
      if (!pEl || !cEl) continue;
      const pr = pEl.getBoundingClientRect();
      const cr = cEl.getBoundingClientRect();
      const sx = pr.left - canvasRect.left + pr.width / 2;
      const sy = pr.bottom - canvasRect.top;
      const ex = cr.left - canvasRect.left + cr.width / 2;
      const ey = cr.top - canvasRect.top;
      const midY = (sy + ey) / 2;
      next[`${l.parent}>${l.child}`] = `M ${sx} ${sy} C ${sx} ${midY}, ${ex} ${midY}, ${ex} ${ey}`;
    }
    setLinkPaths(next);
  }, [links]);

  useEffect(() => {
    const raf = requestAnimationFrame(recompute);
    const onResize = debounce(recompute, 120);
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [recompute, system.id]);

  const related = useMemo(() => {
    if (!selected) return null;
    const anc = ancestorsOf(index, selected);
    const desc = descendantsOf(index, selected);
    return new Set<string>([selected, ...anc, ...desc]);
  }, [selected, index]);

  const passesRelevance = useCallback(
    (id: string): boolean => {
      const n = index.byId[id];
      if (!n || n.kind === 'framework' || !n.relevance) return true;
      return relevanceMatches(n.relevance, relevance);
    },
    [index, relevance],
  );

  const select = (id: string) => {
    setSelected(prev => (prev === id ? null : id));
    requestAnimationFrame(() => {
      nodeRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  };

  const setNodeRef = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  };

  /** Opacity/lift classes driven by the relevance filter + lineage tracing.
   *  Legislative-vs-strategy styling (solid vs dashed) is applied separately
   *  via inline style at each call site, since it's a fixed property of the
   *  node rather than something that changes with selection. */
  const nodeClass = (id: string, base: string): string => {
    const filteredOut = !passesRelevance(id);
    const dim = filteredOut || (related !== null && !related.has(id));
    const active = !filteredOut && related !== null && related.has(id);
    return [
      base,
      'transition-[opacity,transform,box-shadow] duration-150',
      dim ? 'opacity-30' : 'opacity-100',
      active ? '-translate-y-px shadow-sm' : '',
    ].join(' ');
  };

  const sectorFrameworkItems = system.items.filter(i => i.tier === 'sector-framework');
  const sectorPolicyItems = system.items.filter(i => i.tier === 'sector-policy');
  const instrumentItems = system.items.filter(i => i.tier === 'instrument');

  const selectedNode = selected ? index.byId[selected] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11.5px] text-[#3D5265]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[11px] w-4 rounded-[3px]" style={{ background: '#3D5265' }} />
          Economy-wide framework
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[11px] w-4 rounded-[3px] border-2" style={{ borderColor: '#3D5265' }} />
          Sector framework legislation
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[11px] w-4 rounded-[3px] border-[1.5px]" style={{ borderColor: '#3D5265' }} />
          Sector-specific policy
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-[11px] w-4 rounded-[3px] border border-[#E6E7E8] border-l-[3px] border-l-[#8A95A3]" />
          Implementation instrument
        </div>
        <div className="flex items-center gap-1.5 border-l border-[#E6E7E8] pl-6">
          <span className="inline-block w-5 border-t-2 border-[#3D5265]" />
          Legislation
          <span className="ml-2 inline-block w-5 border-t-2 border-dashed border-[#8A95A3]" />
          Strategy / non-binding
        </div>
      </div>

      <div className="rounded-xl border border-[#E6E7E8] bg-[#FBFBFA] p-4">
        <div className="overflow-x-auto pb-1">
          <div ref={canvasRef} className="relative flex min-w-[1080px] flex-col gap-11 px-5 py-2">
            <svg
              width={svgSize.w}
              height={svgSize.h}
              className="pointer-events-none absolute left-0 top-0 overflow-visible"
            >
              {links.map(l => {
                const key = `${l.parent}>${l.child}`;
                const d = linkPaths[key];
                if (!d) return null;
                const bothVisible = passesRelevance(l.parent) && passesRelevance(l.child);
                const isActive = bothVisible && related !== null && related.has(l.parent) && related.has(l.child);
                const isDim = !bothVisible || (related !== null && !isActive);
                const bothLegislative = index.byId[l.parent]?.legislative && index.byId[l.child]?.legislative;
                return (
                  <path
                    key={key}
                    d={d}
                    fill="none"
                    stroke={isActive ? '#00928F' : '#C7CCD1'}
                    strokeWidth={isActive ? 2.2 : 1.4}
                    strokeDasharray={bothLegislative ? undefined : '4 3'}
                    opacity={isDim ? 0.15 : isActive ? 1 : 0.55}
                    style={{ transition: 'stroke .15s ease, opacity .15s ease, stroke-width .15s ease' }}
                  />
                );
              })}
            </svg>

            {/* Row 1 — economy-wide framework */}
            <div className="relative z-[1] flex flex-nowrap justify-start gap-3.5">
              {system.frameworks.map(fw => (
                <button
                  key={fw.id}
                  ref={setNodeRef(fw.id)}
                  type="button"
                  onClick={() => select(fw.id)}
                  className={nodeClass(
                    fw.id,
                    'w-[210px] flex-none rounded-lg px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00928F]',
                  )}
                  style={
                    fw.legislative
                      ? { background: '#3D5265', border: `1.5px solid ${selected === fw.id ? '#00928F' : '#3D5265'}` }
                      : {
                          background: '#FBFBFA',
                          border: `1.5px dashed ${selected === fw.id ? '#00928F' : '#8A95A3'}`,
                        }
                  }
                >
                  <p className={`text-[13px] font-semibold leading-snug ${fw.legislative ? 'text-white' : 'text-[#3D5265]'}`}>
                    {fw.name}
                  </p>
                  <p className={`mt-0.5 text-[10.5px] ${fw.legislative ? 'text-[#C9D2DA]' : 'text-[#8A95A3]'}`}>{fw.sub}</p>
                </button>
              ))}
            </div>

            {/* Row 2 — sector framework legislation */}
            {sectorFrameworkItems.length > 0 && (
              <div className="relative z-[1] flex flex-nowrap justify-start gap-3.5">
                {sectorFrameworkItems.map(item => (
                  <button
                    key={item.id}
                    ref={setNodeRef(item.id)}
                    type="button"
                    onClick={() => select(item.id)}
                    className={nodeClass(
                      item.id,
                      'w-[186px] flex-none rounded-lg bg-white px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00928F]',
                    )}
                    style={{
                      border: item.legislative
                        ? `2px solid ${selected === item.id ? '#00928F' : '#3D5265'}`
                        : `2px dashed ${selected === item.id ? '#00928F' : '#8A95A3'}`,
                    }}
                  >
                    <p className="text-[12px] font-semibold leading-snug text-[#232019]">{item.name}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Row 3 — sector-specific policy */}
            <div className="relative z-[1] flex flex-nowrap justify-start gap-3.5">
              {sectorPolicyItems.map(item => (
                <button
                  key={item.id}
                  ref={setNodeRef(item.id)}
                  type="button"
                  onClick={() => select(item.id)}
                  className={nodeClass(
                    item.id,
                    'w-[172px] flex-none rounded-lg bg-white px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00928F]',
                  )}
                  style={{
                    border: item.legislative
                      ? `1.5px solid ${selected === item.id ? '#00928F' : '#3D5265'}`
                      : `1.5px dashed ${selected === item.id ? '#00928F' : '#8A95A3'}`,
                  }}
                >
                  <p className="text-[12px] font-semibold leading-snug text-[#232019]">{item.name}</p>
                </button>
              ))}
            </div>

            {/* Row 4 — implementation instruments */}
            <div className="relative z-[1] flex flex-nowrap justify-start gap-3">
              {instrumentItems.map(item => (
                <button
                  key={item.id}
                  ref={setNodeRef(item.id)}
                  type="button"
                  onClick={() => select(item.id)}
                  className={nodeClass(
                    item.id,
                    `w-[150px] flex-none rounded-md bg-white px-2.5 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00928F] ${
                      item.legislative ? 'border' : 'border border-dashed'
                    }`,
                  )}
                  style={{
                    borderColor: item.legislative ? '#E6E7E8' : '#C7CCD1',
                    borderLeft: `3px solid ${CLUSTER_CATEGORY_COLOR[item.category]}`,
                  }}
                >
                  <p className={`text-[11px] leading-snug ${item.legislative ? 'text-[#232019]' : 'text-[#5B6B7A]'}`}>
                    {item.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[10.5px] text-[#8A95A3]">
          Scroll horizontally if the diagram doesn&rsquo;t fit — click any box to trace its lineage.
        </p>
      </div>

      {!selectedNode && (
        <div className="flex min-h-[88px] items-center justify-center rounded-md border border-[#E6E7E8] bg-white text-[12.5px] text-[#8A95A3]">
          Click any box above to see where it sits in the cascade.
        </div>
      )}
      {selectedNode && selected && (
        <div className="rounded-md border border-[#E6E7E8] bg-white p-3.5">
          <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#E6E7E8] bg-[#FBFBFA] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#8A95A3]">
            {selectedNode.kind === 'framework' ? 'Economy-wide framework' : CLUSTER_TIER_LABEL[selectedNode.tier!]}
            <span className={selectedNode.legislative ? 'text-[#3D5265]' : 'text-[#8A95A3]'}>
              · {selectedNode.legislative ? 'Legislation' : 'Non-binding'}
            </span>
          </span>
          <h4 className="mb-1 mt-0.5 text-[14px] font-semibold text-[#232019]">{selectedNode.name}</h4>
          {selectedNode.kind === 'item' && selectedNode.category && selectedNode.relevance && (
            <span
              className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10.5px]"
              style={{
                backgroundColor: `${CLUSTER_CATEGORY_COLOR[selectedNode.category]}1a`,
                color: CLUSTER_CATEGORY_COLOR[selectedNode.category],
              }}
            >
              {CLUSTER_CATEGORY_LABEL[selectedNode.category]} · {CLUSTER_RELEVANCE_LABEL[selectedNode.relevance]}
            </span>
          )}
          <p className="text-[12.5px] leading-relaxed text-[#3D5265]">{selectedNode.desc}</p>

          {index.parentsOf[selected].length > 0 && (
            <div className="mt-2.5">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#8A95A3]">
                {selectedNode.kind === 'framework'
                  ? ''
                  : selectedNode.tier === 'instrument'
                    ? 'Supports / operationalises'
                    : 'Derives from'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {index.parentsOf[selected].map(pid => (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => select(pid)}
                    className="rounded-full border border-[#E6E7E8] bg-[#FBFBFA] px-2.5 py-1 text-[11.5px] text-[#3D5265] hover:border-[#C7CCD1] hover:text-[#232019]"
                  >
                    {index.byId[pid]?.name ?? pid}
                  </button>
                ))}
              </div>
            </div>
          )}
          {index.childrenOf[selected].length > 0 && (
            <div className="mt-2.5">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#8A95A3]">
                {selectedNode.kind === 'framework' || selectedNode.tier === 'sector-framework' ? 'Cascades to' : 'Supported by'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {index.childrenOf[selected].map(cid => (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => select(cid)}
                    className="rounded-full border border-[#E6E7E8] bg-[#FBFBFA] px-2.5 py-1 text-[11.5px] text-[#3D5265] hover:border-[#C7CCD1] hover:text-[#232019]"
                  >
                    {index.byId[cid]?.name ?? cid}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
