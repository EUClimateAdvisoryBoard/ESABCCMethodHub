'use client';

/**
 * Summer Prep · Note 2 — Synergies & trade-offs (mitigation ↔ adaptation)
 * for INDUSTRY and TRANSPORT.
 * -----------------------------------------------------------------------
 * A literature note, structured by the report's own subsectors, mapping where
 * cutting emissions also builds climate resilience (synergy), where it works
 * against it or an adaptation need pushes emissions up (trade-off), and where
 * it depends on design/siting (conditional). Data + citations live in
 * src/data/summer-prep-synergies.ts.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import SummerPrepGate from '@/components/SummerPrepGate';
import {
  SYNERGIES,
  SYNERGY_KIND_META,
  STRENGTH_META,
  SUBSECTOR_ORDER,
  SYNERGY_REPORT_META,
  type SectorKey,
  type InteractionKind,
  type SynergyEntry,
} from '@/data/summer-prep-synergies';

const KIND_KEYS = Object.keys(SYNERGY_KIND_META) as InteractionKind[];
const SECTORS: SectorKey[] = ['Industry', 'Transport'];

function KindBadge({ kind }: { kind: InteractionKind }) {
  const m = SYNERGY_KIND_META[kind];
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${m.color}1A`, color: m.color }}
      title={m.description}
    >
      <span aria-hidden>{m.symbol}</span> {m.label}
    </span>
  );
}

function EntryCard({ e }: { e: SynergyEntry }) {
  const m = SYNERGY_KIND_META[e.kind];
  const s = STRENGTH_META[e.strength];
  return (
    <article
      className="rounded-xl border border-[#E6E7E8] bg-white p-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
      style={{ borderLeft: `4px solid ${m.color}` }}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <KindBadge kind={e.kind} />
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${s.color}1A`, color: s.color }}
        >
          {s.label}
        </span>
      </div>
      <h3 className="text-[14px] font-bold leading-snug">{e.title}</h3>

      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <div className="rounded-md bg-[#F3F5F7] px-2.5 py-1.5 dark:bg-[var(--mh-bg)]">
          <div className="text-[9px] font-bold uppercase tracking-wide text-[#004B7F]">
            Mitigation
          </div>
          <div className="text-[12px] leading-snug">{e.mitigation}</div>
        </div>
        <div className="rounded-md bg-[#F3F5F7] px-2.5 py-1.5 dark:bg-[var(--mh-bg)]">
          <div className="text-[9px] font-bold uppercase tracking-wide text-[#007B6C]">
            Adaptation / resilience
          </div>
          <div className="text-[12px] leading-snug">{e.adaptation}</div>
        </div>
      </div>

      <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#3D5265]/85 dark:text-[var(--mh-muted)]">
        {e.mechanism}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed">
        <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">
          Policy implication:{' '}
        </span>
        <span className="text-[#3D5265]/80 dark:text-[var(--mh-muted)]">{e.implication}</span>
      </p>

      <details className="mt-2.5 group">
        <summary className="cursor-pointer list-none text-[11px] font-semibold text-[#00928F] hover:underline">
          {e.references.length} reference{e.references.length > 1 ? 's' : ''}
          <span className="ml-1 text-[#3D5265]/40 group-open:hidden">▸</span>
          <span className="ml-1 hidden text-[#3D5265]/40 group-open:inline">▾</span>
        </summary>
        <ul className="mt-1.5 space-y-1.5">
          {e.references.map((ref, i) => (
            <li
              key={i}
              className="text-[11px] leading-relaxed text-[#3D5265]/70 dark:text-[var(--mh-muted)]"
            >
              {ref.url ? (
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-[#00928F] underline-offset-2 hover:text-[#00928F]"
                >
                  {ref.cite}
                </a>
              ) : (
                ref.cite
              )}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function SynergiesInner() {
  const [sector, setSector] = useState<SectorKey>('Industry');
  const [kindFilter, setKindFilter] = useState<InteractionKind | 'all'>('all');

  const sectorEntries = useMemo(
    () => SYNERGIES.filter((e) => e.sector === sector),
    [sector],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { synergy: 0, 'trade-off': 0, mixed: 0 };
    sectorEntries.forEach((e) => (c[e.kind] += 1));
    return c;
  }, [sectorEntries]);

  const bySubsector = useMemo(() => {
    const order = SUBSECTOR_ORDER[sector];
    return order
      .map((sub) => ({
        sub,
        entries: sectorEntries.filter(
          (e) => e.subsector === sub && (kindFilter === 'all' || e.kind === kindFilter),
        ),
      }))
      .filter((g) => g.entries.length > 0);
  }, [sector, sectorEntries, kindFilter]);

  return (
    <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <PageHero
        title="Synergies & trade-offs — mitigation ↔ adaptation"
        subtitle={
          <>
            Where does cutting emissions in industry and transport also build climate resilience —
            and where does it work against it? A literature note kept in the subsector structure of{' '}
            <a
              href={SYNERGY_REPORT_META.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[#00928F] underline-offset-2"
            >
              “{SYNERGY_REPORT_META.reportTitle}”
            </a>
            .
          </>
        }
      />

      <main className="mx-auto max-w-[1080px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Sector switch */}
        <div className="mb-4 inline-flex rounded-lg border border-[#E6E7E8] p-1 dark:border-[var(--mh-border)]">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition ${
                sector === s
                  ? 'bg-[#003399] text-white'
                  : 'text-[#3D5265] hover:bg-[#F3F5F7] dark:text-[var(--mh-fg)] dark:hover:bg-[var(--mh-card)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Kind filter chips (double as a count summary) */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setKindFilter('all')}
            className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
              kindFilter === 'all'
                ? 'border-[#003399] bg-[#003399] text-white'
                : 'border-[#D6DAE0] text-[#3D5265] dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)]'
            }`}
          >
            All ({sectorEntries.length})
          </button>
          {KIND_KEYS.map((k) => {
            const m = SYNERGY_KIND_META[k];
            const active = kindFilter === k;
            return (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className="rounded-full border px-3 py-1 text-[12px] font-semibold"
                style={{
                  borderColor: m.color,
                  backgroundColor: active ? m.color : 'transparent',
                  color: active ? '#fff' : m.color,
                }}
              >
                {m.symbol} {m.label} ({counts[k] ?? 0})
              </button>
            );
          })}
        </div>

        {/* Grouped by subsector */}
        {bySubsector.map((g) => (
          <section key={g.sub} className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
                {g.sub}
              </h2>
              <span className="h-px flex-1 bg-[#E6E7E8] dark:bg-[var(--mh-border)]" />
              <span className="text-[11px] text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
                {g.entries.length} interaction{g.entries.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {g.entries.map((e) => (
                <EntryCard key={e.id} e={e} />
              ))}
            </div>
          </section>
        ))}

        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          Provenance: each interaction is a real, literature-grounded mechanism and cites the
          primary work it rests on (IPCC AR6 WGII/WGIII, the EEA European Climate Risk Assessment
          2024, and peer-reviewed studies). The framing and the assignment of each mechanism to a
          subsector were AI-compiled for this working note and are pending source re-verification by
          the sector lead — treat the citations as leads to check, not a finished evidence base.
          Nothing here is a Board position.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function SynergiesTradeoffsPage() {
  return (
    <SummerPrepGate>
      <SynergiesInner />
    </SummerPrepGate>
  );
}
