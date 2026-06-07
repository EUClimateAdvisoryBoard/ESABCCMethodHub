/**
 * Slide-over drawer showing the data "behind" a framework indicator chip.
 *
 * A framework white-box (e.g. T2 "Total demand") can resolve to one or more
 * database indicators; this drawer shows each with its chart, metadata, latest
 * value and a deep link into the full indicator list view.
 */
'use client';
import { useEffect } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import { INDICATOR_BREAKDOWNS } from '@/data/indicator-breakdowns';
import IndicatorChart from './IndicatorChart';
import BreakdownChart from './BreakdownChart';

interface Props {
  title: string;
  code?: string;
  indicators: Indicator[];
  onClose: () => void;
  onOpenInList?: (id: string) => void;
}

function latest(ind: Indicator) {
  const sorted = [...ind.data].sort((a, b) => b.year - a.year);
  return sorted[0];
}

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function IndicatorDetail({ title, code, indicators, onClose, onOpenInList }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-[var(--mh-card,#1a1a1a)] h-full overflow-y-auto shadow-2xl border-l border-[#E6E7E8] dark:border-[var(--mh-border,#333)]">
        <div className="sticky top-0 bg-white dark:bg-[var(--mh-card,#1a1a1a)] border-b border-[#E6E7E8] dark:border-[var(--mh-border,#333)] px-5 py-4 flex items-start justify-between gap-3">
          <div>
            {code && (
              <span className="inline-block text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#3D6E8C]/10 text-[#3D6E8C] mb-1">
                {code}
              </span>
            )}
            <h2 className="text-base font-semibold leading-snug">{title}</h2>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700 shrink-0" aria-label="Close">
            ×
          </button>
        </div>

        <div className="p-5 space-y-6">
          {indicators.length === 0 && (
            <div className="text-sm text-gray-500 border border-dashed rounded-lg p-4">
              No data series is linked to this node yet. It exists in the framework as a
              concept; you can link an indicator to it from the database in edit mode.
            </div>
          )}

          {indicators.map((ind) => {
            const l = latest(ind);
            const breakdown = INDICATOR_BREAKDOWNS[ind.id];
            return (
              <div key={ind.id} className="border border-[#E6E7E8] dark:border-[var(--mh-border,#333)] rounded-lg p-4">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <h3 className="font-medium text-sm">{ind.name}</h3>
                  {ind.code && <span className="text-[11px] font-mono text-gray-400">{ind.code}</span>}
                </div>
                <p className="text-xs text-gray-500 mb-3">{ind.description}</p>

                {ind.storyline && (
                  <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 dark:border-indigo-900 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 mb-1">
                      <InfoIcon className="w-3.5 h-3.5" />
                      Why it matters — the storyline
                    </div>
                    <p className="text-xs text-indigo-900/90 dark:text-indigo-100/90 leading-relaxed">
                      {ind.storyline}
                    </p>
                  </div>
                )}

                {breakdown ? <BreakdownChart spec={breakdown} height={210} /> : <IndicatorChart indicator={ind} height={150} />}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                  {l && !breakdown && (
                    <>
                      <dt className="text-gray-400">Latest ({l.year})</dt>
                      <dd className="text-right font-medium">
                        {l.value.toLocaleString()} {ind.unit}
                      </dd>
                    </>
                  )}
                  {ind.targetValue != null && (
                    <>
                      <dt className="text-gray-400">Target {ind.targetYear ?? ''}</dt>
                      <dd className="text-right font-medium text-red-600">
                        {ind.targetValue.toLocaleString()} {ind.unit}
                      </dd>
                    </>
                  )}
                  <dt className="text-gray-400">Source</dt>
                  <dd className="text-right">
                    <a href={ind.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#3D6E8C] hover:underline">
                      {ind.source}
                    </a>
                  </dd>
                </dl>

                {onOpenInList && (
                  <button
                    onClick={() => onOpenInList(ind.id)}
                    className="mt-3 text-xs font-medium text-[#3D6E8C] hover:underline"
                  >
                    Open in indicator list →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
