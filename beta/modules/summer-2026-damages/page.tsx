'use client';

/**
 * Summer 2026 Economic Damage Ledger (beta module M · 54).
 *
 * The question the page is built to ask, in one line: this summer Europe
 * paid for heat, fire and empty rivers at the same time — is the EU
 * actually ready for the climate it already has? The evidence assembled
 * here — the EEA's own "Europe is not prepared", the Court of Auditors'
 * "action not keeping up with ambition", a 4–8× adaptation finance gap, a
 * flagship adaptation plan still unpublished in August 2026 — points to
 * no; per the workspace's steel-man rule, the genuine counter-evidence
 * (heat plans that save lives, dyke economics, a real rescEU fleet) is
 * recorded alongside, and the framing itself is flagged as editorial.
 *
 * Surfaces:
 *   1. WHY THIS SUMMER — the helicopter view: the build-up chain from the
 *      centre-north winter precipitation deficit through the record-dry
 *      spring, early snowpack loss and record-warm seas to the repeated
 *      heat domes, each link separately sourced, unverifiable links shown
 *      as open questions.
 *   2. OVER THE YEARS — the escalation series 2003 → 2026: heat mortality
 *      per summer with the three methodologies kept visually distinct.
 *   3. THE LEDGER — the season's damage events across five strands (heat,
 *      wildfire, water, agriculture, energy), each with sources, physical
 *      metrics, euro figures where they exist and confidence flags.
 *   4. WHY THERE IS NO HONEST TOTAL — the euro figures side by side with
 *      their scopes; the refusal to sum is a designed feature.
 *   5. IS THE EU READY? — the preparedness ledger, gap and steel-man in
 *      the same row, plus the backdrop (recorded losses, priced future).
 *
 * All records live in data.generated.ts (AI-compiled 2026-08-11, pending
 * Secretariat verification); model.ts holds types and tallies only.
 * Charts are hand-rolled inline SVG per the estimator-module convention.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { FilterPill } from '@/components/ui/FilterPill';
import {
  CONFIDENCE_META,
  Confidence,
  DamageEvent,
  STRANDS,
  STRAND_META,
  Strand,
  allEuroFigures,
  confidenceTally,
  eventsByStrand,
  fmt,
  fmtEuro,
  noHonestTotal,
} from './model';
import {
  BACKDROP,
  BUILDUP,
  COMPILED,
  EFFIS_2026_HA,
  EFFIS_AVG_HA,
  ESCALATION,
  EVENTS,
  EU_WARMING_C,
  KAUB_CM_TODAY,
  PREPAREDNESS,
} from './data.generated';

/* ------------------------------------------------------------- palette */
// Strand series (validated 5-set, CVD-checked on white; same family as the
// committed-damages module): fire red-brown, heat orange, water blue,
// agriculture green, energy violet.
const STRAND_C: Record<Strand, string> = {
  wildfire: '#B83230',
  heat: '#E0701A',
  water: '#0065A4',
  agriculture: '#1F8F63',
  energy: '#A530B8',
};

const fmtK = (n: number) => (n >= 1000 ? `${fmt(n / 1000, n >= 10000 ? 0 : 1)}k` : fmt(n));

/* ------------------------------------------------------------ UI bits */

function ConfBadge({ level }: { level: Confidence }) {
  const meta = CONFIDENCE_META[level];
  const cls =
    level === 'verified'
      ? 'bg-surface-teal text-tertiary-dark'
      : level === 'secondary'
        ? 'bg-surface-blue text-tertiary-dark'
        : 'bg-surface-orange text-tertiary-dark';
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
      title={`${meta.title} Compile-time flag, not a verification verdict.`}
    >
      {meta.label}
    </span>
  );
}

function StatTile(props: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-tertiary-light">{props.label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{props.value}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-tertiary">{props.sub}</p>
    </div>
  );
}

function SectionHeading(props: { kicker: string; title: string; lede: string }) {
  return (
    <header className="mb-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">{props.kicker}</p>
      <h2 className="mt-1 text-xl font-bold text-tertiary-dark">{props.title}</h2>
      <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-tertiary">{props.lede}</p>
    </header>
  );
}

function SourceLinks({ sources }: { sources: { label: string; url: string; locator?: string }[] }) {
  return (
    <details className="mt-2">
      <summary className="mh-focus cursor-pointer select-none text-[11.5px] font-semibold text-primary">
        Sources &amp; locators ({sources.length})
      </summary>
      <ul className="mt-1.5 space-y-1.5">
        {sources.map((s) => (
          <li key={s.url + s.label} className="text-[11.5px] leading-snug text-tertiary">
            <a href={s.url} target="_blank" rel="noreferrer" className="mh-focus font-medium text-primary underline decoration-grey-300 underline-offset-2 hover:decoration-primary">
              {s.label} ↗
            </a>
            {s.locator ? <span className="text-tertiary-light"> — {s.locator}</span> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

/* ----------------------------------------------------- escalation chart */

function EscalationChart() {
  const W = 780;
  const H = 320;
  const m = { l: 64, r: 16, t: 28, b: 56 };
  const innerW = W - m.l - m.r;
  const innerH = H - m.t - m.b;
  const yMax = 90000;
  const y = (v: number) => m.t + innerH - (v / yMax) * innerH;
  const slot = innerW / ESCALATION.length;
  const barW = Math.min(46, slot * 0.5);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Estimated heat-related deaths per European summer, 2003 to 2026, with the three study methodologies kept visually distinct">
        <defs>
          <pattern id="m54-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#FCE4D0" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#E0701A" strokeWidth="1.5" />
          </pattern>
        </defs>
        {/* grid + axis */}
        {[0, 20000, 40000, 60000, 80000].map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 8} y={y(v) + 3.5} textAnchor="end" fontSize={10} className="fill-grey-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {v === 0 ? '0' : fmtK(v)}
            </text>
          </g>
        ))}
        <text x={m.l - 46} y={m.t - 12} fontSize={10} fontWeight={700} className="fill-tertiary-light">
          Heat deaths / summer
        </text>
        {ESCALATION.map((b, i) => {
          const cx = m.l + slot * i + slot / 2;
          const d = b.heatDeaths;
          return (
            <g key={b.year}>
              {d ? (
                <>
                  <rect
                    x={cx - barW / 2}
                    y={y(d.value)}
                    width={barW}
                    height={y(0) - y(d.value) - 1}
                    rx={4}
                    fill={d.basis === 'europe' ? '#E0701A' : d.basis === 'cities' ? 'url(#m54-hatch)' : '#FFFFFF'}
                    stroke={d.basis === 'europe' ? 'none' : '#E0701A'}
                    strokeWidth={d.basis === 'europe' ? 0 : 1.5}
                    strokeDasharray={d.basis === 'running' ? '4 3' : undefined}
                  />
                  {d.lo !== d.hi ? (
                    <>
                      <line x1={cx} x2={cx} y1={y(d.lo)} y2={y(d.hi)} stroke="#2E3E4C" strokeWidth={1.5} />
                      <line x1={cx - 5} x2={cx + 5} y1={y(d.hi)} y2={y(d.hi)} stroke="#2E3E4C" strokeWidth={1.5} />
                      <line x1={cx - 5} x2={cx + 5} y1={y(d.lo)} y2={y(d.lo)} stroke="#2E3E4C" strokeWidth={1.5} />
                    </>
                  ) : null}
                  <text x={cx} y={y(Math.max(d.value, d.hi)) - 6} textAnchor="middle" fontSize={10.5} fontWeight={700} className="fill-tertiary-dark" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmtK(d.value)}
                    {d.basis === 'running' ? '+' : ''}
                  </text>
                </>
              ) : (
                <text x={cx} y={y(0) - 8} textAnchor="middle" fontSize={9.5} className="fill-grey-500">
                  records yr
                </text>
              )}
              <text x={cx} y={y(0) + 16} textAnchor="middle" fontSize={11} fontWeight={700} className="fill-tertiary">
                {b.year}
              </text>
              <text x={cx} y={y(0) + 29} textAnchor="middle" fontSize={8.5} className="fill-grey-500">
                {b.heatDeaths ? (b.heatDeaths.basis === 'europe' ? 'full-Europe' : b.heatDeaths.basis === 'cities' ? 'cities only' : 'provisional') : ''}
              </text>
            </g>
          );
        })}
        <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke="#BCBEC0" strokeWidth={1} />
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-tertiary">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: '#E0701A' }} /> full-Europe epidemiological estimate</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm border" style={{ background: '#FCE4D0', borderColor: '#E0701A' }} /> cities-only study (≈30 % of population — undercount)</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm border border-dashed" style={{ borderColor: '#E0701A' }} /> 2026 running tally, season unfinished</span>
        <span>Whiskers: published range (2022: 95 % CI; 2026: tally spread).</span>
      </figcaption>
    </figure>
  );
}

/* --------------------------------------------------------- event card */

function EventCard({ e }: { e: DamageEvent }) {
  return (
    <article className="rounded-lg border border-grey-200 bg-white p-4" style={{ borderLeft: `4px solid ${STRAND_C[e.strand]}` }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.08em]" style={{ color: STRAND_C[e.strand] }}>
            {STRAND_META[e.strand].label}
          </p>
          <h3 className="mt-0.5 text-[15px] font-bold leading-snug text-tertiary-dark">{e.title}</h3>
          <p className="mt-0.5 text-[11.5px] text-tertiary-light">
            {e.window} · {e.region}
          </p>
        </div>
        <ConfBadge level={e.confidence} />
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-tertiary">{e.what}</p>
      {e.physical.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {e.physical.map((p) => (
            <div key={p.label} className="rounded border border-grey-200 bg-grey-50 px-2 py-1.5">
              <p className="text-[9.5px] font-semibold uppercase leading-tight tracking-wide text-tertiary-light">{p.label}</p>
              <p className="mt-0.5 font-mono text-[12.5px] font-bold tabular-nums text-tertiary-dark">{p.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {e.euro.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {e.euro.map((f) => (
            <div key={f.scope} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded border border-grey-200 bg-surface-blue px-2.5 py-1.5">
              <span className="font-mono text-[14px] font-bold tabular-nums text-primary">{fmtEuro(f)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-tertiary-light">{f.kind}</span>
              <ConfBadge level={f.confidence} />
              <span className="w-full text-[11px] leading-snug text-tertiary">{f.scope}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[11px] italic text-tertiary-light">
          No euro estimate exists for this event yet — the gap is recorded rather than filled.
        </p>
      )}
      <SourceLinks sources={e.sources} />
    </article>
  );
}

/* ---------------------------------------------------------------- page */

export default function Summer2026DamagesPage() {
  const [strand, setStrand] = useState<Strand | 'all'>('all');

  const byStrand = useMemo(() => eventsByStrand(EVENTS), []);
  const tally = useMemo(() => confidenceTally(EVENTS), []);
  const euroFigs = useMemo(() => allEuroFigures(EVENTS), []);
  const refusal = useMemo(() => noHonestTotal(EVENTS), []);
  const shown = strand === 'all' ? EVENTS : byStrand[strand];

  const sourceIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of EVENTS) for (const s of e.sources) map.set(s.url, s.label);
    for (const c of BUILDUP) for (const s of c.sources) map.set(s.url, s.label);
    for (const b of ESCALATION) for (const s of b.sources) map.set(s.url, s.label);
    for (const r of BACKDROP) for (const s of r.sources) map.set(s.url, s.label);
    for (const p of PREPAREDNESS) {
      for (const s of p.gap.sources) map.set(s.url, s.label);
      if (p.steelman) for (const s of p.steelman.sources) map.set(s.url, s.label);
    }
    return Array.from(map, ([url, label]) => ({ url, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-6">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Beta module · M · 54 · Economic damage ledger · Summer 2026 · AI-compiled
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Summer 2026 — the bill for an unprepared Europe
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            Record heat, a record fire season, and the Rhine at its lowest level since 1880 — at the same time, in
            the same economy. This ledger assembles what the summer of 2026 has demonstrably cost so far, why this
            year got so bad (the build-up started last winter), how the summers have escalated since 2003, and what
            it says about the question underneath: <strong>is the EU ready for the climate it already has?</strong>{' '}
            The assembled evidence — the EEA&rsquo;s own &ldquo;Europe is not prepared&rdquo;, the auditors&rsquo;
            &ldquo;action not keeping up with ambition&rdquo;, an adaptation plan still unpublished as the bills
            arrive — points to no; the genuine counter-evidence is recorded alongside, per this workspace&rsquo;s
            steel-man rule.
          </p>
        </section>

        {/* caveat box */}
        <section className="mb-8 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ AI-compiled — pending Secretariat verification · read this first
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            Compiled {COMPILED} by research agents from live sources, <strong>mid-season</strong> — the August heat
            episode was still running when this page was built, so every 2026 figure is partial by construction.
            Three disciplines apply. <strong>Every figure carries its source and a compile-time confidence flag</strong>{' '}
            ({tally.verified} of {EVENTS.length} ledger events rest on fetched primary sources; anything marked
            &ldquo;pending verification&rdquo; was seen only in search snippets and must be checked before quoting).{' '}
            <strong>The euro figures are never summed</strong> — they measure different things, and the page explains
            why a &ldquo;summer 2026 cost €X&rdquo; headline would be an invented number. And{' '}
            <strong>the &ldquo;not ready&rdquo; framing is an editorial thesis</strong> of this module, argued from
            sourced evidence with the counter-evidence shown — it is not an ESABCC position and nothing here is
            citable outside the hub.
          </p>
        </section>

        {/* stat strip */}
        <section className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="EU burnt area, year to date"
            value={`${fmt(EFFIS_2026_HA)} ha`}
            sub={`${fmt(EFFIS_2026_HA / EFFIS_AVG_HA, 1)}× the 2006+ average for the date; second only to 2022. Live EFFIS pull, week 31.`}
          />
          <StatTile
            label="Heat deaths so far (provisional)"
            value=">25,000"
            sub="Reuters tally, 10 Aug; running national aggregations reach ~31k. No peer-reviewed total until autumn."
          />
          <StatTile
            label="Rhine at Kaub, compile date"
            value={`${KAUB_CM_TODAY} cm`}
            sub="Lowest since records began in 1880; shipping association warns of a first-ever split of the river."
          />
          <StatTile
            label="Adaptation finance gap"
            value="€15–16bn vs €53–137bn"
            sub={`Committed per year vs needs by 2050 (EEA). Europe is already +${EU_WARMING_C.toLocaleString('en-GB', { minimumFractionDigits: 1 })} °C — fastest-warming continent.`}
          />
        </section>

        {/* 1 — why this summer */}
        <section className="mb-12">
          <SectionHeading
            kicker="1 · The helicopter view"
            title="Why this summer got so bad — the build-up started last winter"
            lede="A heatwave is weather; this summer was a system state. Each link in the chain below is separately sourced — and the links that could not be verified are shown as open questions rather than filled in by analogy with 2018 or 2022."
          />
          <ol className="space-y-3">
            {BUILDUP.map((link, i) => (
              <li key={link.id} className={`relative rounded-lg border p-4 ${link.status === 'open' ? 'border-dashed border-grey-300 bg-grey-50' : 'border-grey-200 bg-white'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-white">
                    {link.status === 'open' ? '?' : i + 1}
                  </span>
                  <h3 className="text-[13.5px] font-bold text-tertiary-dark">{link.stage}</h3>
                  {link.status !== 'open' ? <ConfBadge level={link.status} /> : (
                    <span className="inline-block rounded bg-grey-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tertiary" title="This link in the causal story could not be sourced and is deliberately left open.">
                      open question
                    </span>
                  )}
                </div>
                <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary">{link.finding}</p>
                {link.sources.length > 0 ? <SourceLinks sources={link.sources} /> : null}
              </li>
            ))}
          </ol>
        </section>

        {/* 2 — over the years */}
        <section className="mb-12">
          <SectionHeading
            kicker="2 · Over the years"
            title="The escalation, 2003 → 2026"
            lede="Heat mortality per European summer. Deliberately not one comparable line: the solid bars are full-Europe epidemiological estimates, the hatched bar is a cities-only study covering roughly 30 % of the population (an undercount against the series), and 2026 is a provisional running tally with the season unfinished."
          />
          <div className="rounded-lg border border-grey-200 bg-white p-4">
            <EscalationChart />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ESCALATION.map((b) => (
              <div key={b.year} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                <p className="text-[11px] font-bold text-tertiary-dark">
                  <span className="font-mono tabular-nums">{b.year}</span> · {b.label}
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-tertiary">{b.note}</p>
                {b.heatDeaths ? <p className="mt-1 text-[10.5px] italic leading-snug text-tertiary-light">{b.heatDeaths.note}</p> : null}
                <SourceLinks sources={b.sources} />
              </div>
            ))}
          </div>
        </section>

        {/* 3 — the ledger */}
        <section className="mb-12">
          <SectionHeading
            kicker="3 · The ledger"
            title="What the summer has cost, event by event"
            lede="Five strands, every event sourced. Where a euro estimate exists it is shown with its scope and kind; where none exists, the absence is stated — a coverage gap is acceptable, an invented number is not."
          />
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterPill label="All strands" active={strand === 'all'} count={EVENTS.length} onClick={() => setStrand('all')} />
            {STRANDS.map((s) => (
              <FilterPill
                key={s}
                label={STRAND_META[s].label}
                active={strand === s}
                count={byStrand[s].length}
                onClick={() => setStrand(s)}
                icon={<span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STRAND_C[s] }} />}
              />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {shown.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        </section>

        {/* 4 — no honest total */}
        <section className="mb-12">
          <SectionHeading
            kicker="4 · The number this page refuses to print"
            title="Why there is no honest season total"
            lede={`The ledger holds ${refusal.figures} euro figures in ${refusal.scopes} different scopes — restoration-only, firefighting-only, one crop group's revenue, a whole-season bank estimate of GDP flow, a private forecast with health costs included. Adding them would double-count some losses, omit most others, and mix flows with stocks. The honest statement is the list itself.`}
          />
          <div className="overflow-x-auto rounded-lg border border-grey-200">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-grey-200 bg-grey-50 text-[10.5px] uppercase tracking-wide text-tertiary-light">
                  <th className="px-3 py-2 font-bold">Figure</th>
                  <th className="px-3 py-2 font-bold">Kind</th>
                  <th className="px-3 py-2 font-bold">What it covers (the reason not to sum)</th>
                  <th className="px-3 py-2 font-bold">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {euroFigs.map(({ event, fig }) => (
                  <tr key={event.id + fig.scope} className="border-b border-grey-100 align-top text-[12px]">
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="font-mono font-bold tabular-nums text-primary">{fmtEuro(fig)}</span>
                      <span className="mt-0.5 block text-[10.5px] text-tertiary-light">{STRAND_META[event.strand].short} · {fig.asOf}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase text-tertiary">{fig.kind}</td>
                    <td className="px-3 py-2 leading-snug text-tertiary">{fig.scope}</td>
                    <td className="whitespace-nowrap px-3 py-2"><ConfBadge level={fig.confidence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            Two further reasons the total cannot exist yet. The insurer half-year figures close on 30 June —
            Munich Re&rsquo;s Europe H1 tally (≈$22bn) is dominated by January&rsquo;s winter storms and explicitly
            notes heat losses are &ldquo;hard to quantify&rdquo; — so nearly everything on this page sits outside
            the insured record, in an EU where less than 20 % of climate losses are insured at all. And damages
            propagate: the reference study of the 2025 summer found €43bn of short-run losses growing to €126bn by
            2029. Whatever 2026&rsquo;s number turns out to be, the figure visible in August is a floor.
          </p>
        </section>

        {/* 5 — preparedness */}
        <section className="mb-12">
          <SectionHeading
            kicker="5 · The question underneath"
            title="Is the EU ready? The preparedness ledger"
            lede="Six dimensions. In each row, the gap evidence on the left is quoted from the institution that owns the finding — the EEA, the Court of Auditors, EIOPA, the Commission, the Board itself — and the genuine counter-evidence is recorded on the right. The imbalance between the columns is the finding."
          />
          <div className="space-y-3">
            {PREPAREDNESS.map((row) => (
              <div key={row.id} className="overflow-hidden rounded-lg border border-grey-200">
                <p className="border-b border-grey-200 bg-grey-50 px-4 py-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-tertiary-dark">
                  {row.dimension}
                </p>
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="border-b border-grey-200 p-4 md:border-b-0 md:border-r">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-accent-red">The gap</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-tertiary">{row.gap.claim}</p>
                    {row.gap.quote ? (
                      <blockquote className="mt-2 border-l-2 border-accent-red/50 pl-2.5 text-[12px] italic leading-snug text-tertiary-dark">
                        {row.gap.quote}
                      </blockquote>
                    ) : null}
                    <SourceLinks sources={row.gap.sources} />
                  </div>
                  <div className="p-4">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-secondary">Recorded alongside — where it works</p>
                    {row.steelman ? (
                      <>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-tertiary">{row.steelman.claim}</p>
                        {row.steelman.quote ? (
                          <blockquote className="mt-2 border-l-2 border-secondary/50 pl-2.5 text-[12px] italic leading-snug text-tertiary-dark">
                            {row.steelman.quote}
                          </blockquote>
                        ) : null}
                        <SourceLinks sources={row.steelman.sources} />
                      </>
                    ) : (
                      <p className="mt-1 text-[12px] italic text-tertiary-light">No confident counter-evidence found for this dimension.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* backdrop */}
        <section className="mb-12">
          <SectionHeading
            kicker="6 · The backdrop"
            title="What this summer sits on top of"
            lede="The recorded past and the priced future — the context rows that turn one bad season into a trajectory."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BACKDROP.map((r) => (
              <div key={r.id} className="rounded-lg border border-grey-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-tertiary-light">{r.label}</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-primary">{r.value}</p>
                <p className="mt-1 text-[11.5px] leading-snug text-tertiary">{r.detail}</p>
                <div className="mt-1.5"><ConfBadge level={r.confidence} /></div>
                <SourceLinks sources={r.sources} />
              </div>
            ))}
          </div>
        </section>

        {/* caveats & sources */}
        <section className="rounded-lg border border-grey-200 bg-grey-50 p-5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</h2>
          <p className="mt-2 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            AI-compiled {COMPILED} — pending Secretariat verification; nothing on this page is citable outside the
            hub. The season was unfinished at compile time and every 2026 figure is partial. Deliberately omitted
            for lack of confident sourcing: an EU-wide fire-fatality count, a consolidated 2026 drought-damage
            total, official euro figures for the French nuclear curtailments, any 2026 agricultural-reserve
            mobilisation, and an &ldquo;Eastern Europe &gt;$30bn&rdquo; claim with no traceable primary source.
            Known source conflicts are kept visible in the records (France&rsquo;s June peak 43.8 °C per WMO vs
            44.3 °C per secondary compilations; three disagreeing burnt-area products for Spain). The full research
            digests behind this page, including everything that failed verification, live in the session archive
            and regenerating means re-running the seven research passes against the same source list.
          </p>
          <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {sourceIndex.map((s) => (
              <li key={s.url} className="text-[11px] leading-snug text-tertiary">
                <a href={s.url} target="_blank" rel="noreferrer" className="mh-focus text-primary underline decoration-grey-300 underline-offset-2 hover:decoration-primary">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
