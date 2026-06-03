/**
 * One simplified overview figure for the whole report: a central climate-
 * neutrality hub connected to all six sector frameworks, each shown as a
 * compact card with its linked indicators. This is the landing view — from
 * here you expand any sector into its full framework, or switch to the
 * indicator list.
 */
'use client';
import { useMemo } from 'react';
import type { SectorFramework } from '@/data/sector-frameworks';
import { useConnectors, type Edge } from './useConnectors';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  sectors: SectorFramework[];
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  onExpand: (sectorId: string) => void;
}

export default function OverviewFigure({ sectors, onOpenIndicator, onExpand }: Props) {
  const edges = useMemo<Edge[]>(() => sectors.map((s) => ({ from: s.id, to: 'hub' })), [sectors]);
  const { containerRef, register, lines, size } = useConnectors(edges, [sectors]);

  return (
    <div ref={containerRef} className="relative">
      <svg
        className="absolute inset-0 pointer-events-none z-0"
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
        preserveAspectRatio="none"
      >
        {lines.map((l) => (
          <path key={l.id} d={l.d} fill="none" stroke="#94a3b8" strokeWidth={1.2} opacity={0.8} />
        ))}
      </svg>

      <div className="relative z-10">
        {/* central hub */}
        <div className="flex justify-center mb-5">
          <div
            ref={register('hub')}
            className="rounded-lg px-5 py-3 text-white text-center shadow-sm bg-[#2E4D3A] max-w-md"
          >
            <div className="text-[10px] uppercase tracking-wide opacity-80">Overall goal</div>
            <div className="font-semibold text-sm leading-snug">EU climate neutrality by 2050</div>
            <div className="text-[10px] opacity-80 mt-0.5">Net GHG −90 to −95% by 2040 (ESABCC advice)</div>
          </div>
        </div>

        {/* sector cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {sectors.map((s) => {
            const refs = [
              ...s.goalIndicators,
              ...s.outcomes.flatMap((o) => o.indicators),
              ...s.levers.flatMap((l) => l.indicators),
            ];
            const linked = refs.filter((r) => r.indicatorIds.length > 0);
            const unlinked = refs.length - linked.length;
            return (
              <div
                key={s.id}
                ref={register(s.id)}
                className="rounded-lg border border-grey-200 bg-white shadow-sm overflow-hidden flex flex-col"
              >
                <div className="h-1" style={{ background: s.color }} />
                <div className="p-3 flex flex-col gap-2 h-full">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="font-semibold text-sm text-tertiary-dark">{s.name}</span>
                      <span className="text-[10px] text-tertiary-light">{s.figure}</span>
                    </div>
                    <p className="text-[11px] text-tertiary leading-snug mt-1 line-clamp-2">{s.goal}</p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {linked.map((r) => (
                      <button
                        key={r.refId}
                        onClick={() => onOpenIndicator({ title: r.label, code: r.code, indicatorIds: r.indicatorIds })}
                        className="inline-flex items-center gap-1 rounded border border-grey-200 bg-grey-50 px-1.5 py-0.5 text-[10px] hover:border-primary"
                        title={r.label}
                      >
                        <span className="font-mono font-semibold" style={{ color: s.color }}>
                          {r.code}
                        </span>
                      </button>
                    ))}
                    {unlinked > 0 && (
                      <span
                        className="inline-flex items-center rounded border border-dashed border-grey-300 px-1.5 py-0.5 text-[10px] text-tertiary-light"
                        title="Report concepts with no curated data series yet"
                      >
                        +{unlinked} no data
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-[10px] text-tertiary-light">
                      {s.levers.length} levers · {linked.length}/{refs.length} linked
                    </span>
                    <button
                      onClick={() => onExpand(s.id)}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Expand framework ↓
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
