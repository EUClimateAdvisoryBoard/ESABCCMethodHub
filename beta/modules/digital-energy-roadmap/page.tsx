'use client';

/**
 * Digitalisation & AI Energy Roadmap — Coherence Check (beta module · M·30).
 *
 * A structured side-by-side reading of the Commission's "Strategic Roadmap for
 * Digitalisation and AI in the Energy Sector" (COM(2026) 501 final, 3 Jun 2026)
 * against (a) the ESABCC recommendations and (b) the EU's binding climate and
 * energy goals.
 *
 * The lens: every Roadmap commitment is classified as a CONTRADICTION, a
 * TENSION, an AMBITION GAP, or an ALIGNMENT, each with a near-verbatim Roadmap
 * quote, the specific ESABCC recommendation id it pulls against (resolved live
 * from esabcc-recommendations.ts), the EU goal at stake, and a numbered
 * reasoning chain. Alignments are included so the assessment is even-handed:
 * the same digitalisation that drives the demand problem also supplies part of
 * the flexibility solution.
 *
 * Data: src/data/digital-energy-roadmap.ts (the analysis is a transparent,
 * deterministic reading — not an automated extraction).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  COHERENCE_FINDINGS,
  EU_CLIMATE_GOALS,
  FINDING_KIND_META,
  FINDING_KINDS,
  ROADMAP_HEADLINE_STATS,
  ROADMAP_MEASURES,
  ROADMAP_META,
  countByKind,
  type CoherenceFinding,
  type FindingKind,
  type FindingSeverity,
} from '@/data/digital-energy-roadmap';
import {
  ESABCC_2023_2040_TARGET_ADVICE,
  ESABCC_2024_RECOMMENDATIONS,
  type PastRecommendation,
} from '@/data/esabcc-recommendations';

// ── Palette ──────────────────────────────────────────────────────────────────

const PANEL = 'rounded-xl border border-[#1E2C46] bg-[#101B30]';

const SEV_DARK: Record<FindingSeverity, string> = {
  high: 'bg-red-500/15 text-red-300 border-red-500/40',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  low: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
};

const PILLAR_COLOR: Record<string, string> = {
  P1: '#E87722',
  P2: '#38BDF8',
  P3: '#A78BFA',
  X: '#64748B',
};

// ── Lookups ──────────────────────────────────────────────────────────────────

const REC_BY_ID = new Map<string, PastRecommendation>(
  [...ESABCC_2024_RECOMMENDATIONS, ESABCC_2023_2040_TARGET_ADVICE].map(r => [r.id, r]),
);
const MEASURE_BY_ID = new Map(ROADMAP_MEASURES.map(m => [m.id, m]));
const GOAL_BY_ID = new Map(EU_CLIMATE_GOALS.map(g => [g.id, g]));

// ── Small building blocks ────────────────────────────────────────────────────

function KindBadge({ kind }: { kind: FindingKind }) {
  const m = FINDING_KIND_META[kind];
  return (
    <span
      title={m.definition}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[9px] uppercase tracking-[0.08em] cursor-help"
      style={{ color: m.color, borderColor: `${m.color}66`, background: `${m.color}1A` }}
    >
      {m.name}
    </span>
  );
}

function SevBadge({ severity }: { severity: FindingSeverity }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border font-mono text-[9px] uppercase tracking-[0.08em] ${SEV_DARK[severity]}`}>
      {severity}
    </span>
  );
}

function ReasoningChain({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-1.5 space-y-1">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2 text-[11.5px] text-[#9DAEC5] leading-relaxed">
          <span className="font-mono text-[10px] text-[#E87722] shrink-0 tabular-nums">{i + 1}.</span>
          <span className={i === steps.length - 1 ? 'text-[#C6D2E2] font-semibold' : undefined}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function FindingCard({ f }: { f: CoherenceFinding }) {
  const meta = FINDING_KIND_META[f.kind];
  return (
    <div className={`${PANEL} p-3.5`} style={{ borderLeft: `3px solid ${meta.color}` }}>
      <div className="flex flex-wrap items-center gap-1.5">
        <KindBadge kind={f.kind} />
        <SevBadge severity={f.severity} />
      </div>
      <p className="mt-1.5 text-[13px] font-bold text-[#E6EBF2] leading-snug">{f.title}</p>

      {/* Roadmap evidence */}
      <div className="mt-2.5 space-y-1.5">
        {f.measureIds.map(id => {
          const m = MEASURE_BY_ID.get(id);
          if (!m) return null;
          return (
            <div key={id} className="rounded-lg border border-[#1E2C46] bg-[#0B1322] px-2.5 py-1.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.08em]" style={{ color: PILLAR_COLOR[m.pillar] }}>
                Roadmap · {m.pillar} · p.{m.page}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#C6D2E2]">{m.title}</p>
              <p className="mt-0.5 text-[11px] text-[#8FA1BC] italic leading-snug">{m.quote}</p>
            </div>
          );
        })}
      </div>

      <ReasoningChain steps={f.reasoning} />

      {/* ESABCC ask + linked recommendations */}
      <div className="mt-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-2">
        <p className="text-[9px] uppercase tracking-[0.12em] text-emerald-300/80 font-bold">ESABCC asks</p>
        <p className="mt-0.5 text-[11px] text-[#C6D2E2] leading-snug">{f.esabccAsk}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {f.esabccRecIds.map(id => {
            const rec = REC_BY_ID.get(id);
            const label = rec ? rec.area : id;
            const url = rec?.report?.url;
            const chip = (
              <span className="inline-block px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-mono text-[9px]">
                {label}
              </span>
            );
            return url ? (
              <a key={id} href={url} target="_blank" rel="noopener noreferrer" title={rec?.title}>
                {chip}
              </a>
            ) : (
              <span key={id} title={rec?.title}>{chip}</span>
            );
          })}
        </div>
      </div>

      {/* EU goals at stake */}
      {f.euGoalIds.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[9px] uppercase tracking-[0.1em] text-[#7E92AE] font-bold mr-1">EU goal</span>
          {f.euGoalIds.map(id => {
            const g = GOAL_BY_ID.get(id);
            return (
              <span
                key={id}
                title={g?.label}
                className="inline-block px-1.5 py-0.5 rounded border border-[#2A3B5C] bg-[#0B1322] text-[#9DAEC5] font-mono text-[9px] cursor-help"
              >
                {g?.short ?? id}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DigitalEnergyRoadmapPage() {
  const counts = useMemo(() => countByKind(), []);
  const [kindFilter, setKindFilter] = useState<FindingKind | ''>('');
  const [sevFilter, setSevFilter] = useState<FindingSeverity | ''>('');

  const sevRank: Record<FindingSeverity, number> = { high: 3, medium: 2, low: 1 };
  const kindRank: Record<FindingKind, number> = { contradiction: 0, tension: 1, 'ambition-gap': 2, alignment: 3 };

  const filtered = useMemo(
    () =>
      COHERENCE_FINDINGS
        .filter(f => (!kindFilter || f.kind === kindFilter) && (!sevFilter || f.severity === sevFilter))
        .sort((a, b) => kindRank[a.kind] - kindRank[b.kind] || sevRank[b.severity] - sevRank[a.severity]),
    [kindFilter, sevFilter],
  );

  const totalNonAlign = counts.contradiction + counts.tension + counts['ambition-gap'];

  return (
    <>
      <SiteHeader />
      <main className="bg-[#0B1322] text-[#E6EBF2] min-h-screen">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#7E92AE]">
              Beta module · M·30
            </p>
            <h1 className="mt-1 text-[26px] sm:text-[34px] font-bold tracking-tight">
              Digitalisation &amp; AI Energy Roadmap — Coherence Check
            </h1>
            <p className="mt-2 text-[13.5px] text-[#9DAEC5] max-w-3xl leading-relaxed">
              Where the Commission&apos;s <span className="text-[#C6D2E2] font-semibold">{ROADMAP_META.title}</span>{' '}
              ({ROADMAP_META.celex}, {ROADMAP_META.dateLabel}) pulls against the{' '}
              <span className="text-emerald-300 font-semibold">ESABCC recommendations</span> and the EU&apos;s binding
              climate goals — and, for balance, where it supports them.
            </p>

            {/* Headline numbers */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { v: `×3`, l: `data-centre capacity, in ${ROADMAP_HEADLINE_STATS.tripleYears} years`, c: '#E87722' },
                { v: `12→28 GW`, l: 'installed capacity by 2030', c: '#F59E0B' },
                { v: `${ROADMAP_HEADLINE_STATS.contradictionCount}`, l: 'direct contradictions found', c: '#EF4444' },
                { v: `${totalNonAlign}`, l: 'tensions / gaps with the advice', c: '#38BDF8' },
              ].map(s => (
                <div key={s.l} className={`${PANEL} px-3 py-3 text-center`}>
                  <p className="font-mono text-[22px] font-bold tabular-nums" style={{ color: s.c }}>{s.v}</p>
                  <p className="mt-0.5 text-[10px] text-[#7E92AE] leading-tight">{s.l}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 font-mono text-[10px] text-[#56688A]">
              source: {ROADMAP_META.sourceLabel} · {ROADMAP_HEADLINE_STATS.pillarCount} pillars ·{' '}
              {ROADMAP_HEADLINE_STATS.flagshipCount} flagship actions · {ROADMAP_HEADLINE_STATS.findingCount} findings ·
              ESABCC recs resolved live from the tracker
            </p>
            <div className="mt-3">
              <Link
                href="/recommendations"
                className="inline-block px-3 py-1.5 rounded-lg border border-[#2A3B5C] text-[12px] font-bold text-[#C6D2E2] hover:border-[#3A4D6E] transition"
              >
                Open the ESABCC recommendations tracker →
              </Link>
            </div>
          </section>

          {/* ── The core finding ─────────────────────────────────────────── */}
          <section className="mt-9">
            <div className={`${PANEL} p-5 border-l-[3px] border-l-[#EF4444]`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#EF4444] font-bold">
                The headline tension
              </p>
              <p className="mt-2 text-[15px] sm:text-[16px] text-[#E6EBF2] leading-relaxed max-w-4xl">
                The Roadmap&apos;s anchor objective is to <span className="text-[#E87722] font-semibold">triple EU
                data-centre capacity</span> and let electricity demand &ldquo;raise substantially&rdquo; — the{' '}
                <span className="font-semibold">opposite vector</span> to the ESABCC&apos;s headline call for{' '}
                <span className="text-emerald-300 font-semibold">energy- and material-demand reduction (KR12)</span> and
                to the binding Energy Efficiency Directive&apos;s <span className="font-semibold">absolute</span> cut in
                EU final energy consumption. It mostly relies on <span className="font-semibold">voluntary</span>{' '}
                instruments — a model agreement, a rating label — and defers the one binding efficiency lever (minimum
                performance standards) to a &ldquo;needs assessment by 2027&rdquo;.
              </p>
            </div>
          </section>

          {/* ── Verdict overview ─────────────────────────────────────────── */}
          <section className="mt-9">
            <h2 className="text-[20px] font-bold">Coherence verdict</h2>
            <p className="mt-1 font-mono text-[10px] text-[#56688A]">
              click a card to filter the findings below · hover any label for its definition
            </p>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {FINDING_KINDS.map(k => {
                const m = FINDING_KIND_META[k];
                const active = kindFilter === k;
                return (
                  <button
                    key={k}
                    onClick={() => setKindFilter(active ? '' : k)}
                    title={m.definition}
                    className={`text-left rounded-xl border p-3 transition ${active ? 'ring-2' : ''}`}
                    style={{
                      borderColor: `${m.color}55`,
                      background: `${m.color}12`,
                      // @ts-expect-error css var for ring colour
                      '--tw-ring-color': m.color,
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em]" style={{ color: m.color }}>
                        {m.name}
                      </span>
                      <span className="font-mono text-[22px] font-bold tabular-nums" style={{ color: m.color }}>
                        {counts[k]}
                      </span>
                    </div>
                    <p className="mt-1 text-[10.5px] text-[#8FA1BC] leading-snug">{m.definition}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Roadmap at a glance ──────────────────────────────────────── */}
          <section className="mt-10">
            <h2 className="text-[20px] font-bold">The Roadmap at a glance</h2>
            <p className="mt-1 font-mono text-[10px] text-[#56688A]">
              three pillars and seven flagship actions, as set out in {ROADMAP_META.celex}
            </p>
            <div className="mt-3 grid lg:grid-cols-4 gap-2.5">
              {ROADMAP_META.pillars.map(p => {
                const flags = ROADMAP_META.flagships.filter(f => f.pillar === p.id);
                return (
                  <div key={p.id} className={`${PANEL} p-3.5`} style={{ borderTop: `2px solid ${PILLAR_COLOR[p.id]}` }}>
                    <p className="text-[12.5px] font-bold text-[#E6EBF2] leading-snug">{p.name}</p>
                    <p className="mt-1 text-[11px] text-[#8FA1BC] leading-snug">{p.gist}</p>
                    <div className="mt-2.5 space-y-1.5">
                      {flags.map(f => (
                        <div key={f.id} className="rounded-lg border border-[#1E2C46] bg-[#0B1322] px-2 py-1.5">
                          <p className="font-mono text-[8.5px] uppercase tracking-[0.08em]" style={{ color: PILLAR_COLOR[p.id] }}>
                            {f.id}
                          </p>
                          <p className="mt-0.5 text-[10.5px] text-[#C6D2E2] leading-snug">{f.name}</p>
                          <p className="mt-0.5 font-mono text-[9px] text-[#56688A]">{f.timing}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Findings ─────────────────────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-bold mr-1">
                Findings{' '}
                <span className="text-[#7E92AE] font-normal text-[13px]">— {filtered.length} of {COHERENCE_FINDINGS.length}</span>
              </h2>
              <select
                value={kindFilter}
                onChange={e => setKindFilter(e.target.value as FindingKind | '')}
                className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2]"
              >
                <option value="">All types</option>
                {FINDING_KINDS.map(k => (
                  <option key={k} value={k}>{FINDING_KIND_META[k].name} ({counts[k]})</option>
                ))}
              </select>
              <select
                value={sevFilter}
                onChange={e => setSevFilter(e.target.value as FindingSeverity | '')}
                className="bg-[#101B30] border border-[#1E2C46] rounded-lg px-2 py-1.5 text-[11px] text-[#C6D2E2]"
              >
                <option value="">All severities</option>
                {(['high', 'medium', 'low'] as FindingSeverity[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {(kindFilter || sevFilter) && (
                <button onClick={() => { setKindFilter(''); setSevFilter(''); }} className="text-[11px] text-[#7E92AE] underline">
                  clear
                </button>
              )}
            </div>

            <div className="mt-3 grid md:grid-cols-2 gap-3">
              {filtered.map(f => <FindingCard key={f.id} f={f} />)}
            </div>
          </section>

          {/* ── EU climate goals reference ───────────────────────────────── */}
          <section className="mt-10">
            <h2 className="text-[20px] font-bold">The EU goals being tested</h2>
            <p className="mt-1 font-mono text-[10px] text-[#56688A]">
              the binding climate and energy objectives the Roadmap must stay consistent with
            </p>
            <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {EU_CLIMATE_GOALS.map(g => (
                <div key={g.id} className={`${PANEL} p-3.5`}>
                  <p className="text-[12.5px] font-bold text-[#E6EBF2]">{g.label}</p>
                  <p className="mt-1 text-[11px] text-[#8FA1BC] leading-snug">{g.detail}</p>
                  <p className="mt-2 font-mono text-[9px] text-[#56688A]">{g.instrument}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Method & caveats ─────────────────────────────────────────── */}
          <section className="mt-10 border-t border-[#1E2C46] pt-5 max-w-3xl">
            <details className="text-[11.5px] text-[#9DAEC5] leading-relaxed">
              <summary className="cursor-pointer font-bold text-[#C6D2E2] text-[12px]">Method &amp; caveats</summary>
              <p className="mt-2">
                This module is a <span className="text-[#C6D2E2] font-semibold">structured reading</span> of{' '}
                {ROADMAP_META.celex}, not an automated text-extraction. Each Roadmap fact carries a near-verbatim quote
                and the source-PDF page; each finding cites the specific ESABCC recommendation id (resolved live from the
                same dataset that powers the Recommendations tracker) and the EU goal at stake, with a numbered reasoning
                chain. Classification follows four types — contradiction, tension, ambition gap, alignment — defined on
                the verdict cards above.
              </p>
              <p className="mt-2">
                Two honesty guards: (1) <span className="text-emerald-300 font-semibold">alignments are included</span>{' '}
                — the Roadmap&apos;s smart-grid, flexibility and curtailment-reduction measures genuinely support ESABCC
                E4/E5, so the demand-growth critique is not the whole story; and (2) findings distinguish a{' '}
                <span className="text-red-300 font-semibold">contradiction</span> (opposite direction to the advice)
                from a <span className="text-amber-300 font-semibold">tension</span> (a risk the Roadmap does not
                bindingly safeguard) from an <span className="text-sky-300 font-semibold">ambition gap</span> (right
                objective, soft instrument). The quantified data-centre figures (12 GW → 28 GW, ≈2.5% of EU electricity,
                ≈230 GW flexibility by 2030) are the Roadmap&apos;s own. The ESABCC asks are paraphrased from{' '}
                <em>Towards EU climate neutrality</em> (Jan 2024) and the June 2023 2040-target advice.
              </p>
            </details>
            <p className="mt-4 font-mono text-[9.5px] text-[#56688A]">
              Beta · structured-reading analysis · sources cited inline · {ROADMAP_META.celex}
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
