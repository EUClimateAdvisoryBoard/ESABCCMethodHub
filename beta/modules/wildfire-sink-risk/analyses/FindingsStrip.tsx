'use client';

/**
 * Compact findings strip for the parent module page — one computed headline
 * per sub-analysis, imported from the analysis models at module defaults so
 * the strip can never say something the pages do not. Rendered directly
 * below the "seven deep-dive analyses" banner in the module hero.
 */

import Link from 'next/link';
import { fmt, mt } from '../model';
import { ANALYSES } from './lib';
import { summary as a1 } from './member-states/model';
import { summary as a2 } from './disturbance-flexibility/model';
import { summary as a3 } from './prevention/model';
import { summary as a4 } from './hindcast/model';
import { summary as a5 } from './crcf-reversal/model';
import { summary as a6 } from './natura2000/model';
import { summary as a7 } from './fwi-scenarios/model';

export default function FindingsStrip() {
  const s1 = a1();
  const s2 = a2();
  const s3 = a3();
  const s4 = a4();
  const s5 = a5();
  const s6 = a6();
  const s7 = a7();

  const items: { slug: string; stat: string; text: string }[] = [
    {
      slug: 'member-states',
      stat: `${fmt(s1.top4FireSharePct, 0)}% vs ${fmt(s1.top4SinkSharePct, 0)}%`,
      text: 'Four countries hold three quarters of the fire but a quarter of the 310 Mt sink obligation — the shortfall lands on everyone.',
    },
    {
      slug: 'disturbance-flexibility',
      stat: mt(s2.compensableAt5, 0),
      text: 'can legally leave the compliance accounts in 2026-30 — none of it leaves the atmosphere, and the 178 Mt mechanism voids itself under fire stress.',
    },
    {
      slug: 'prevention',
      stat: `€${fmt(s3.marginalEurPerT, 0)}/t`,
      text: `implied cost of fire prevention — ~${fmt(s3.cheaperBy, 0)}× cheaper than the €400/t engineered removals the module otherwise books. No EU instrument funds it.`,
    },
    {
      slug: 'hindcast',
      stat: `${fmt(s4.sharePct, 0)}–${fmt(s4.shareExcl2017Pct, 0)}%`,
      text: `of the observed ${mt(s4.observedDecline, 0)} sink decline is attributable to fire — the past validates the model; the record 2025 fire drag arms it.`,
    },
    {
      slug: 'crcf-reversal',
      stat: `${fmt(s5.reversedShareAt5, 0)}%`,
      text: 'of certified carbon-farming units reversed by fire alone at the default scenario — most of a standard registry buffer before any other risk.',
    },
    {
      slug: 'natura2000',
      stat: `${fmt(s6.ratio2025, 1)}×`,
      text: 'the burn rate inside Natura 2000 vs outside in 2025 — the restoration law’s obligations concentrate on the land most likely to burn.',
    },
    {
      slug: 'fwi-scenarios',
      stat: `${fmt(s7.loPctAt2C, 1)}–${fmt(s7.hiPctAt2C, 1)}%/yr`,
      text: `is the climate-consistent dial range at 2 °C by 2050 — the recent trend runs ${fmt(s7.recentTrendPct, 0)}%/yr; the gap between them is the honest uncertainty.`,
    },
  ];

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => {
        const a = ANALYSES.find((x) => x.slug === it.slug)!;
        return (
          <Link
            key={it.slug}
            href={`/beta/wildfire-sink-risk/analyses/${it.slug}`}
            className="group rounded-lg border border-grey-200 bg-white p-3.5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-baseline gap-2">
              <span className="rounded bg-accent-red px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-white">
                {a.code}
              </span>
              <span className="truncate text-[11px] font-bold text-tertiary-dark group-hover:text-primary">
                {a.title}
              </span>
            </div>
            <div className="mt-2 font-mono text-[19px] font-bold leading-none tabular-nums text-accent-red">
              {it.stat}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-snug text-tertiary">{it.text}</p>
          </Link>
        );
      })}
      <Link
        href="/beta/wildfire-sink-risk/analyses"
        className="group flex flex-col items-start justify-center rounded-lg border border-accent-red/30 bg-[#FDF3F3] p-3.5 transition-shadow hover:shadow-md"
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-red">The synthesis</div>
        <p className="mt-1.5 text-[10.5px] leading-snug text-tertiary">
          What the seven add up to, and the four routes into the Policy Gap report — every number above recomputed
          live from the analysis models.
        </p>
        <span className="mt-2 text-[11.5px] font-bold text-primary group-hover:underline">Read it →</span>
      </Link>
    </div>
  );
}
