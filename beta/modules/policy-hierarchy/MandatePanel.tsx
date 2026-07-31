'use client';

/**
 * MandatePanel — the Secretariat's working argument for reading the Board's
 * mandate under Art. 3(2) of the Climate Law as reaching beyond the climate
 * files proper. Three parts: what the mandate says, how it is read here
 * (three rings), and an honest flag on what this reading is not.
 *
 * Collapsed by default; a single header button expands it. No external
 * imports beyond react — this is meant to drop into the module page as-is.
 */

import { useState } from 'react';
import { RELEVANCE_META } from './data';

const EUR_LEX_CLIMATE_LAW = 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1119';

const RING_META = {
  core: {
    label: 'Core',
    tagline: 'The climate architecture itself',
    description:
      'Instruments whose purpose is the EU climate framework: the Climate Law, the ETS, ESR, LULUCF, CBAM and their delegated/implementing acts. Directly and obviously within Art. 3(2).',
  },
  adjacent: {
    label: 'Adjacent',
    tagline: 'Other-purpose acts with material climate provisions',
    description:
      'Union measures adopted for a different primary purpose — industrial, fiscal, trade, energy-security, defence — that carry provisions with material consequences for the trajectory to climate neutrality. Coherence-assessable under a plain reading of "Union measures".',
  },
  context: {
    label: 'Context',
    tagline: 'Shapes feasibility, not coherence',
    description:
      'Instruments that shape the political and economic conditions the climate framework operates in, without a direct, material climate provision to assess coherence against. Useful background, not an assessment target.',
  },
} as const;

const RING_ORDER: (keyof typeof RING_META)[] = ['core', 'adjacent', 'context'];

export default function MandatePanel({
  counts,
}: {
  counts: { core: number; adjacent: number; context: number };
}) {
  const [open, setOpen] = useState(false);
  const total = counts.core + counts.adjacent + counts.context;

  return (
    <div className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-3 sm:px-4 py-2.5 text-left hover:bg-[#F9FAFB] dark:hover:bg-white/5 transition-colors"
      >
        <span className="text-[#00928F] text-[12px] w-3 shrink-0" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="font-bold text-[13px] text-[#3D5265] dark:text-[var(--mh-fg)]">
          Reading the mandate — why &ldquo;Union measures&rdquo; reaches beyond the climate files
        </span>
        <span className="text-[11px] text-[#808285] dark:text-[var(--mh-muted)]">
          {counts.core} core · {counts.adjacent} adjacent · {counts.context} context ({total} instruments)
        </span>
      </button>

      {open && (
        <div className="px-3 sm:px-4 pb-4 border-t border-[#F3F4F5] dark:border-[var(--mh-border)] space-y-4 text-[12px] leading-relaxed text-[#54728C] dark:text-[var(--mh-muted)]">

          {/* 1. The mandate as written */}
          <div className="pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]">
              1. The mandate as written
            </p>
            <p className="mt-1">
              Under Art. 3(2) of Regulation (EU) 2021/1119 (the European Climate Law), the ESABCC's tasks are, in
              substance: to provide scientific advice on existing and proposed Union measures and on their coherence
              with the Regulation's climate-neutrality and adaptation objectives and with the Union's commitments
              under the Paris Agreement; to identify actions and opportunities needed to meet those objectives; and
              to contribute to the exchange of independent scientific knowledge in this field.
            </p>
            <p className="mt-1">
              <a
                href={EUR_LEX_CLIMATE_LAW}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00928F] hover:text-[#007B6C] hover:underline"
              >
                Regulation (EU) 2021/1119 — EUR-Lex ↗
              </a>
            </p>
          </div>

          {/* 2. The reading */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]">
              2. The reading
            </p>
            <p className="mt-1">
              Art. 3(2)(b) says the Board advises on the coherence of <em>Union measures</em> — not &ldquo;climate
              measures&rdquo; or &ldquo;climate policy&rdquo;. Read plainly, any Union instrument with material
              consequences for the trajectory to climate neutrality falls within scope for a coherence assessment,
              regardless of which Directorate-General drafted it or which committee it sits in. That reading sorts
              the acquis into three rings:
            </p>

            {/* Ring band figure */}
            <div
              className="mt-3 flex flex-col sm:flex-row items-stretch gap-1.5 sm:gap-0"
              role="img"
              aria-label={`Three mandate rings: ${counts.core} core instruments, ${counts.adjacent} adjacent instruments, ${counts.context} context instruments`}
            >
              {RING_ORDER.map((key, idx) => {
                const meta = RING_META[key];
                const n = counts[key];
                const share = total > 0 ? Math.round((n / total) * 100) : 0;
                return (
                  <div
                    key={key}
                    className={`flex-1 rounded-md sm:rounded-none px-3 py-2.5 text-white ${
                      idx === 0 ? 'sm:rounded-l-md' : ''
                    } ${idx === RING_ORDER.length - 1 ? 'sm:rounded-r-md' : ''}`}
                    style={{ background: RELEVANCE_META[key].color }}
                  >
                    <p className="text-[9px] uppercase tracking-wide opacity-80 font-semibold">{meta.label}</p>
                    <p className="text-[16px] font-bold leading-tight">
                      {n}
                      <span className="text-[10px] font-normal opacity-80"> ({share}%)</span>
                    </p>
                    <p className="text-[10px] opacity-90 leading-snug mt-0.5">{meta.tagline}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-2.5 space-y-1.5">
              {RING_ORDER.map(key => {
                const meta = RING_META[key];
                return (
                  <div key={key} className="flex items-start gap-2">
                    <span
                      className="mt-[3px] inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: RELEVANCE_META[key].color }}
                      aria-hidden
                    />
                    <p>
                      <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">{meta.label}.</span>{' '}
                      {meta.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="mt-2.5">
              This matters now: through 2025-26 the centre of legislative gravity has moved to competitiveness,
              simplification and defence files — the Omnibus packages, the Clean Industrial Deal, the readiness and
              defence-industry agenda — rather than to new climate-specific instruments. If the Board only assessed
              coherence within files labelled &ldquo;climate&rdquo;, most of where climate-neutrality risk is
              actually being created or defused in this period would fall outside its advice. Arguing coherence
              where the legislative action is, not only in the climate files, is what the adjacent ring is for.
            </p>
          </div>

          {/* 3. What this is not */}
          <div className="rounded-md border border-[#FF9933]/40 bg-[#FFEDDE]/60 dark:bg-[#FF9933]/10 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]">
              3. What this is not
            </p>
            <p className="mt-1">
              This is a Secretariat working interpretation of the mandate, produced to prioritise where scientific
              advice gets drafted — it is not a legal opinion and not a position adopted by the Board. The ring
              assignment for every individual instrument in this register is AI-drafted and pending Secretariat and
              legal review; treat placements, especially in the adjacent ring, as provisional.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
