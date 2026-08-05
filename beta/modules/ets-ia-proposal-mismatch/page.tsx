'use client';

/**
 * IA ↔ Proposal Mismatch (beta module M·44).
 *
 * Where the ETS Directive proposal COM(2026) 616 (17 July 2026) departs from
 * its own impact assessment SWD(2026) 616 — every divergence documented with
 * the verbatim passage from BOTH documents, a rendered screenshot of each
 * passage, and a ranked summary of where they most don't match. Genuine
 * alignments are recorded alongside so the read stays even-handed.
 *
 * A closing section cross-checks the Öko-Institut policy brief "Getting the
 * balance right" (19 May 2026) — the nearest published stress test of the
 * proposal's supply-side combination — and questions its calculation.
 *
 * Register AI-compiled 2026-08-05, pending human verification; the passage
 * screenshots exist so every claim can be checked against the source.
 */

import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  MISMATCHES, ALIGNMENTS, OEKO_BRIEF, DOCS, VERDICT_META,
  type MismatchEntry, type Passage, type Verdict,
} from './data';

const SHOTS_BASE = '/data/ets-ia-proposal-mismatch/shots';

const C_IA = '#004B7F';   // impact assessment side
const C_COM = '#B83230';  // proposal side
const C_OK = '#007B6C';   // alignments
const C_OEKO = '#6667AB'; // Öko-Institut section

function VerdictBadge({ v }: { v: Verdict }) {
  const m = VERDICT_META[v];
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
      style={{ background: m.color }}
      title={m.blurb}
    >
      {m.label}
    </span>
  );
}

function ShotThumbs({ shots, onOpen, label }: { shots: string[]; onOpen: (s: string) => void; label: string }) {
  if (shots.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {shots.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onOpen(s)}
          className="group relative overflow-hidden rounded border border-grey-200 transition hover:border-primary"
          title="Open passage screenshot"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${SHOTS_BASE}/${s}`}
            alt={`${label} — passage screenshot`}
            loading="lazy"
            className="h-20 w-[120px] object-cover object-top transition group-hover:opacity-90"
          />
          <span className="absolute inset-x-0 bottom-0 bg-tertiary-dark/70 px-1 py-0.5 text-center text-[9px] font-semibold text-white">
            view passage
          </span>
        </button>
      ))}
    </div>
  );
}

function PassageBlock({ p, color, onOpen }: { p: Passage; color: string; onOpen: (s: string) => void }) {
  return (
    <div className="mt-2.5 first:mt-0">
      <blockquote className="border-l-2 pl-2.5 text-[12px] italic leading-relaxed text-tertiary" style={{ borderColor: color }}>
        &ldquo;{p.quote}&rdquo;
      </blockquote>
      <p className="mt-1 text-[10.5px] text-tertiary-light">{p.cite}</p>
      <ShotThumbs shots={p.shots} onOpen={onOpen} label={p.cite} />
    </div>
  );
}

function MismatchCard({ m, onOpen }: { m: MismatchEntry; onOpen: (s: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article id={m.id} className="rounded-xl border border-grey-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold text-white"
            style={{ background: VERDICT_META[m.verdict].color }}
            title={`Mismatch rank ${m.rank}`}
          >
            {m.rank}
          </span>
          <h3 className="text-[15.5px] font-bold leading-snug text-tertiary-dark">{m.title}</h3>
        </div>
        <VerdictBadge v={m.verdict} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: C_IA }}>
            Impact assessment · SWD(2026) 616
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-tertiary-dark">{m.iaSays}</p>
        </div>
        <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: C_COM }}>
            Proposal · COM(2026) 616
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-tertiary-dark">{m.proposalDoes}</p>
        </div>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-tertiary">{m.why}</p>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-2.5 text-[12px] font-semibold text-primary underline-offset-2 hover:underline"
      >
        {expanded ? 'Hide the passages ▲' : 'Show the passages from both documents ▼'}
      </button>

      {expanded && (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-3" style={{ borderColor: `${C_IA}55` }}>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: C_IA }}>
              What the IA says
            </p>
            {m.ia.map((p) => <PassageBlock key={p.cite + p.quote.slice(0, 24)} p={p} color={C_IA} onOpen={onOpen} />)}
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: `${C_COM}55` }}>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: C_COM }}>
              What the proposal does
            </p>
            {m.com.map((p) => <PassageBlock key={p.cite + p.quote.slice(0, 24)} p={p} color={C_COM} onOpen={onOpen} />)}
          </div>
        </div>
      )}
    </article>
  );
}

export default function IaProposalMismatchModule() {
  const [openShot, setOpenShot] = useState<string | null>(null);

  const nDeviation = MISMATCHES.filter((m) => m.verdict === 'deviation').length;
  const nUnassessed = MISMATCHES.filter((m) => m.verdict === 'unassessed').length;
  const shotCount = new Set([
    ...MISMATCHES.flatMap((m) => [...m.ia, ...m.com].flatMap((p) => p.shots)),
    ...ALIGNMENTS.flatMap((a) => a.shots),
    ...OEKO_BRIEF.shots,
  ]).size;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        {/* ── Header ──────────────────────────────────────────────── */}
        <section className="mb-6">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · M · 44 · ETS review package · 17 July 2026
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            ETS Review: Impact Assessment ↔ Proposal Mismatch
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-tertiary sm:text-[15px]">
            The Commission&rsquo;s ETS Directive proposal{' '}
            <a href={DOCS[0].url} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-primary">COM(2026) 616</a>{' '}
            was tabled together with its impact assessment{' '}
            <a href={DOCS[2].url} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-primary">SWD(2026) 616</a>{' '}
            — but the two do not everywhere say the same thing. This module documents every place the
            proposal departs from what the impact assessment assessed or preferred, with the{' '}
            <strong>verbatim passage from both documents</strong>, a{' '}
            <strong>screenshot of each passage</strong> in the original layout, and a ranked summary of
            where they most don&rsquo;t match. Alignments are recorded alongside so the read stays
            even-handed.
          </p>
          <div className="mt-3 max-w-4xl rounded-md border border-accent-orange/40 bg-surface-orange px-3.5 py-2.5 text-[12px] leading-relaxed text-tertiary-dark">
            <strong>AI-compiled — pending verification.</strong> The register was compiled by AI from
            the two documents (proposal pages cite the Council transmission copy ST 12073/26, whose
            text is identical). The passage screenshots exist precisely so each claim can be verified
            against the source in one click before reuse in Board outputs.
          </div>
        </section>

        {/* ── Stats ───────────────────────────────────────────────── */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Mismatches documented', value: String(MISMATCHES.length) },
            { label: 'Outside assessed options', value: String(nDeviation) },
            { label: 'Unassessed mechanisms', value: String(nUnassessed) },
            { label: 'Alignments recorded', value: String(ALIGNMENTS.length) },
            { label: 'Passage screenshots', value: String(shotCount) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-grey-200 bg-grey-50 px-3 py-2.5">
              <div className="text-xl font-bold text-primary">{s.value}</div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-tertiary">{s.label}</div>
            </div>
          ))}
        </section>

        {/* ── Summary: where they most don't match ────────────────── */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-tertiary-dark">Where they most don&rsquo;t match</h2>
          <p className="mt-1.5 max-w-4xl text-[13px] leading-relaxed text-tertiary">
            Ranked by how far the proposal moves from what the impact assessment actually analysed —
            an admitted deviation first, then mechanisms the IA explicitly did not model, then designs
            it assessed only in direction.
          </p>
          <ol className="mt-3 space-y-1.5">
            {MISMATCHES.map((m) => (
              <li key={m.id}>
                <a
                  href={`#${m.id}`}
                  className="group flex items-start gap-2.5 rounded-lg border border-grey-200 bg-white px-3 py-2 transition hover:border-primary"
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold text-white"
                    style={{ background: VERDICT_META[m.verdict].color }}
                  >
                    {m.rank}
                  </span>
                  <span className="text-[13px] leading-snug text-tertiary-dark">
                    <strong className="group-hover:text-primary">{m.title}.</strong>{' '}
                    <span className="text-tertiary">{m.proposalDoes}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
          <p className="mt-3 max-w-4xl rounded-md bg-surface-blue px-3.5 py-2.5 text-[12.5px] leading-relaxed text-tertiary">
            <strong className="text-tertiary-dark">The one-paragraph version.</strong> The proposal
            itself concedes the biggest divergence: &ldquo;the final policy proposal deviates from the
            options assessed in the impact assessment&rdquo; on the cap. Its LRF pair (3.7% → 1.7%)
            lies outside every assessed option on both halves of the decade, and the second-half easing
            is financed by two mechanisms the IA explicitly did not cost — 260 Mt of international
            credits and a 250 M-allowance removals pre-increase — while aviation coverage shrinks from
            &ldquo;all departing flights, inside the target&rdquo; to a 5,000 km neighbourhood booked
            outside the target, free allocation for CBAM sectors runs four years longer than current
            law, and 400 M allowances of IDB Booster support arrive in 2028–2031 without any
            supply-side modelling. The MSR, conditional free allocation, maritime, waste and the EUR
            100 bn IDB envelope, by contrast, follow the preferred option closely.
          </p>
        </section>

        {/* ── Mismatch cards ──────────────────────────────────────── */}
        <section className="space-y-4">
          {MISMATCHES.map((m) => (
            <MismatchCard key={m.id} m={m} onOpen={setOpenShot} />
          ))}
        </section>

        {/* ── Alignments ──────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-tertiary-dark">Where the proposal follows the IA</h2>
          <p className="mt-1.5 max-w-4xl text-[13px] leading-relaxed text-tertiary">
            Recorded so the mismatch list reads in proportion: most of the package implements the
            preferred option PO2 as assessed.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ALIGNMENTS.map((a) => (
              <div key={a.id} className="rounded-lg border border-l-[3px] border-grey-200 bg-white p-3.5" style={{ borderLeftColor: C_OK }}>
                <p className="text-[13px] font-bold text-tertiary-dark">{a.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{a.detail}</p>
                <ShotThumbs shots={a.shots} onOpen={setOpenShot} label={a.title} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Öko-Institut cross-check ────────────────────────────── */}
        <section className="mt-10" id="oeko">
          <div className="rounded-xl border p-4 sm:p-5" style={{ borderColor: `${C_OEKO}55` }}>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: C_OEKO }}>
              Cross-check · external analysis, critically read
            </p>
            <h2 className="mt-1 text-xl font-bold text-tertiary-dark">
              Öko-Institut: &ldquo;Getting the balance right&rdquo; — and the questions to ask of it
            </h2>
            <p className="mt-1 text-[11.5px] text-tertiary-light">{OEKO_BRIEF.authors}</p>
            <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-tertiary">{OEKO_BRIEF.summary}</p>
            <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-tertiary">{OEKO_BRIEF.relevance}</p>

            <ShotThumbs shots={OEKO_BRIEF.shots} onOpen={setOpenShot} label="Öko-Institut brief" />

            <h3 className="mt-4 text-[14px] font-bold text-tertiary-dark">
              Is the calculation right? Six questions
            </h3>
            <div className="mt-2 space-y-2.5">
              {OEKO_BRIEF.points.map((p, i) => (
                <div key={i} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                  <p className="text-[12.5px] leading-relaxed text-tertiary-dark">
                    <strong>The brief:</strong> {p.claim}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: C_OEKO }}>
                    <strong>The question:</strong> <span className="text-tertiary">{p.question}</span>
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 max-w-4xl text-[12px] leading-relaxed text-tertiary-light">
              Bottom line: the brief&rsquo;s <em>directional</em> warning — assess all supply changes
              jointly, or risk recreating a surplus — is sound and mirrors the IA&rsquo;s own logic.
              Its <em>headline arithmetic</em> (gross supply vs a fixed scenario pathway, in a model
              the authors themselves call static) overstates the case: on the brief&rsquo;s own net
              figures the current-rules market runs <em>short</em>, and its pre-proposal scenario
              parameters differ from the proposal on every number. Treat it as a stress test of the
              supply combination, not as a forecast of the proposal.
            </p>
          </div>
        </section>

        {/* ── Sources ─────────────────────────────────────────────── */}
        <section className="mt-8">
          <div className="rounded-md bg-surface-blue px-4 py-3 text-[12px] leading-relaxed text-tertiary">
            <strong className="text-tertiary-dark">Sources.</strong>{' '}
            {DOCS.map((d, i) => (
              <span key={d.url + d.label}>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                  {d.label}
                </a>
                {i < DOCS.length - 1 ? ' · ' : ''}
              </span>
            ))}
            <span className="mt-1 block">
              Related modules:{' '}
              <a href="/beta/ets-review" className="underline hover:text-primary">M·37 ETS Review &amp; Electrification</a> (what the package proposes) ·{' '}
              <a href="/beta/ets-review/conflicts" className="underline hover:text-primary">M·37c Advice conflicts</a> (package vs ESABCC advice) ·{' '}
              <a href="/beta/impact-assessment" className="underline hover:text-primary">M·38 Impact Assessment — Modelling Results</a> (the IA&rsquo;s numbers as a reference library).
            </span>
          </div>
        </section>
      </main>

      {/* ── Screenshot lightbox ───────────────────────────────────── */}
      {openShot && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tertiary-dark/80 p-4 sm:p-8"
          onClick={() => setOpenShot(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-[980px]">
            <button
              type="button"
              onClick={() => setOpenShot(null)}
              className="absolute -top-3 right-0 -translate-y-full rounded bg-white px-3 py-1 text-[13px] font-semibold text-tertiary-dark shadow"
            >
              Close ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${SHOTS_BASE}/${openShot}`}
              alt="Source passage"
              className="w-full rounded bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      <SiteFooter />
    </>
  );
}
