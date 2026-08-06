'use client';

/**
 * Competitiveness Claims Register — steel-manned (beta module M · 47).
 *
 * A register of recurring claims from the 2024–26 competitiveness debate
 * (Draghi report, Antwerp and Budapest Declarations, Clean Industrial
 * Deal, omnibus packages and the reactions to them), from BOTH
 * directions, decomposed into checkable propositions and given the
 * docs-internal verdict bands — SUPPORTED / REVISION / UNSUPPORTED /
 * NOT CHECKABLE — each with a "what this check proves and cannot prove"
 * line. Every claim rated UNSUPPORTED carries a mandatory steel-man: the
 * strongest defensible version of it, with its own source.
 *
 * Epistemic status: AI-compiled, August 2026, pending Secretariat
 * verification. Politically the most sensitive module on the policy-gap
 * list — verdicts on named actors' claims require Secretariat sign-off
 * before anything here is shown beyond the team. No verbatim quotes are
 * asserted in this compile: every claim text is an explicit paraphrase
 * (see data.generated.ts for the provenance block, the claim-selection
 * rule and the quote policy).
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { FilterPill } from '@/components/ui/FilterPill';
import { CLAIMS, Claim, Direction, Topic, Verdict } from './data.generated';
import {
  ClaimFilters,
  DIRECTION_META,
  TOPIC_META,
  VERDICT_META,
  VERDICT_ORDER,
  filterClaims,
  missingSteelmen,
  propositionCount,
  steelmanCount,
  tallyByDirection,
} from './model';

const TOPIC_ORDER: Topic[] = ['energy-prices', 'regulatory-burden', 'ets-leakage', 'omnibus', 'growth-and-jobs'];
const DIRECTIONS: Direction[] = ['against-ambition', 'for-ambition'];

/* ------------------------------------------------------------ UI bits */

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];
  return (
    <span
      title={m.definition}
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${m.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden />
      {m.label}
    </span>
  );
}

function StatTile(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">{props.label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{props.value}</p>
      {props.sub && <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{props.sub}</p>}
    </div>
  );
}

function ClaimCard({ claim }: { claim: Claim }) {
  return (
    <article className="rounded-lg border border-grey-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded bg-surface-blue px-1.5 py-0.5 text-[10px] font-semibold text-primary">
          {TOPIC_META[claim.topic]}
        </span>
        <span className="rounded border border-grey-300 bg-grey-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-tertiary">
          paraphrase
        </span>
        <span className="ml-auto text-[10.5px] text-tertiary">{claim.date}</span>
      </div>

      <p className="mt-2 text-[13px] font-semibold leading-relaxed text-tertiary-dark">“{claim.claim}”</p>
      <p className="mt-1.5 text-[11px] leading-snug text-tertiary">
        <span className="font-semibold text-tertiary-dark">{claim.speaker}</span> · {claim.forum} ·{' '}
        <a href={claim.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          {claim.sourceLabel} ↗
        </a>
      </p>

      <div className="mt-3 space-y-2.5 border-t border-grey-200 pt-3">
        {claim.propositions.map((p, i) => (
          <div key={p.id}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] leading-snug text-tertiary-dark">
                <span className="mr-1 font-mono text-[10.5px] text-tertiary">P{i + 1}</span>
                {p.text}
              </p>
              <VerdictBadge verdict={p.verdict} />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-tertiary">{p.basis}</p>
            <p className="mt-0.5 text-[10.5px] italic leading-snug text-tertiary">
              <span className="font-semibold not-italic text-tertiary-dark">Proves / cannot prove: </span>
              {p.proves}
            </p>
          </div>
        ))}
      </div>

      {claim.steelman && (
        <div className="mt-3 rounded-md border border-secondary/40 bg-surface-teal p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-secondary-dark">
            Steel-man — strongest defensible version
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-tertiary-dark">{claim.steelman.text}</p>
          <a
            href={claim.steelman.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-[10.5px] text-primary hover:underline"
          >
            {claim.steelman.sourceLabel} ↗
          </a>
        </div>
      )}

      {claim.crossLinks && claim.crossLinks.length > 0 && (
        <p className="mt-2.5 text-[10.5px] text-tertiary">
          Resolve against:{' '}
          {claim.crossLinks.map((l, i) => (
            <span key={l.href}>
              {i > 0 && ' · '}
              <a href={l.href} className="text-primary hover:underline">
                {l.code} {l.title}
              </a>
            </span>
          ))}
        </p>
      )}
    </article>
  );
}

/* --------------------------------------------------------- static copy */

const SOURCES: { label: string; url: string }[] = [
  { label: 'Draghi report — The future of European competitiveness (Sept 2024)', url: 'https://commission.europa.eu/topics/eu-competitiveness/draghi-report_en' },
  { label: 'Antwerp Declaration for a European Industrial Deal (Feb 2024)', url: 'https://antwerp-declaration.eu/' },
  { label: 'European Council, Budapest, 7–8 Nov 2024 (Budapest Declaration)', url: 'https://www.consilium.europa.eu/en/meetings/european-council/2024/11/07-08/' },
  { label: 'Competitiveness Compass, COM(2025) 30', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025DC0030' },
  { label: 'Clean Industrial Deal, COM(2025) 85', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025DC0085' },
  { label: 'Omnibus I — CSRD/CSDDD amendments, COM(2025) 81', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025PC0081' },
  { label: '2040 climate target communication, COM(2024) 63', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52024DC0063' },
  { label: 'CBAM Regulation (EU) 2023/956', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023R0956' },
  { label: 'ACER — wholesale electricity market monitoring and 2022 market-design assessment', url: 'https://www.acer.europa.eu/' },
  { label: 'IEA — Energy Technology Perspectives 2024 (clean-tech market projection)', url: 'https://www.iea.org/reports/energy-technology-perspectives-2024' },
  { label: 'IRENA — Renewable power generation costs series', url: 'https://www.irena.org/' },
  { label: 'EEA — EU greenhouse-gas inventory and trends', url: 'https://www.eea.europa.eu/' },
  { label: 'Dechezleprêtre & Sato — The impacts of environmental regulations on competitiveness (REEP, 2017)', url: 'https://doi.org/10.1093/reep/rex013' },
  { label: 'IPCC AR6 Synthesis Report (costs of action vs inaction)', url: 'https://www.ipcc.ch/report/ar6/syr/' },
];

/* ------------------------------------------------------------------ page */

export default function CompetitivenessClaimsPage() {
  const [direction, setDirection] = useState<Direction | 'all'>('all');
  const [verdict, setVerdict] = useState<Verdict | 'all'>('all');
  const [topic, setTopic] = useState<Topic | 'all'>('all');

  const filters: ClaimFilters = { direction, verdict, topic };
  const filtered = useMemo(() => filterClaims(CLAIMS, filters), [direction, verdict, topic]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDirection = useMemo(() => tallyByDirection(CLAIMS), []);
  const filteredByDirection = useMemo(() => tallyByDirection(filtered), [filtered]);
  const broken = useMemo(() => missingSteelmen(CLAIMS), []);

  const nProps = propositionCount(CLAIMS);
  const nSteel = steelmanCount(CLAIMS);
  const nAgainst = CLAIMS.filter((c) => c.direction === 'against-ambition').length;
  const nFor = CLAIMS.length - nAgainst;

  const anyFilter = direction !== 'all' || verdict !== 'all' || topic !== 'all';

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module M · 47 · competitiveness claims register · 2024–26 debate · steel-manned both ways
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Competitiveness Claims Register — steel-manned
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            The omnibus and Clean Industrial Deal debates run on a small set of recurring claims — “EU energy prices
            are 2–3× the US”, “the ETS is deindustrialising Europe”, “simplification is deregulation by another name”
            — from both directions. This register records the claims side by side, decomposes each into checkable
            propositions, applies the fact-check verdict bands, and — wherever a proposition is rated UNSUPPORTED —
            adds a mandatory steel-man: the strongest defensible version of the claim, with its own source.
          </p>
        </section>

        {/* caveat box */}
        <section className="mb-8 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ AI-compiled — pending Secretariat verification · politically sensitive
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            Every verdict on this page is <strong>AI-drafted</strong> (August 2026 compile) and passes judgement on
            claims by named institutions — the most politically sensitive material in this workspace.{' '}
            <strong>Nothing here may be shown or cited beyond the team before Secretariat sign-off</strong>, on both
            the verdicts and the claim selection (the selection rule is recorded below so its balance can be audited).
            No verbatim quotes are asserted: every claim text is an explicit <em>paraphrase</em>, because the source
            texts could not be machine-checked at compile time — re-extracting ≤60-word verbatim substrings with
            locators is the first task of the human pass.
          </p>
        </section>

        {/* stat strip */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Claims registered"
            value={String(CLAIMS.length)}
            sub={`${nAgainst} against ambition · ${nFor} for ambition — balanced by construction.`}
          />
          <StatTile
            label="Checkable propositions"
            value={String(nProps)}
            sub="One quantity or one causal statement each."
          />
          <StatTile
            label="Steel-mans recorded"
            value={String(nSteel)}
            sub="Mandatory for every claim with an UNSUPPORTED proposition — on both sides."
          />
          <StatTile
            label="Verdicts confirmed by humans"
            value="0"
            sub="All verdicts are AI-drafted; the Secretariat pass has not yet run."
          />
        </section>

        {broken.length > 0 && (
          <section className="mb-8 rounded-lg border-2 border-accent-red/60 bg-accent-red/10 p-4">
            <p className="text-[12px] font-bold text-accent-red">
              Register integrity failure: {broken.length} claim(s) rated UNSUPPORTED without a steel-man —{' '}
              {broken.join(', ')}. Fix the data before using this page.
            </p>
          </section>
        )}

        {/* method + selection rule */}
        <section className="mb-8 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-grey-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Verdict bands</p>
            <ul className="mt-2 space-y-1.5">
              {VERDICT_ORDER.map((v) => (
                <li key={v} className="flex items-start gap-2 text-[11.5px] leading-snug text-tertiary">
                  <VerdictBadge verdict={v} />
                  <span>{VERDICT_META[v].definition}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10.5px] leading-snug text-tertiary">
              Every proposition carries a “proves / cannot prove” line — a price comparison cannot prove a causation
              claim, an ex-ante estimate cannot be confirmed by quoting its author, and a worst case is not an outcome.
            </p>
          </div>
          <div className="rounded-lg border border-grey-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
              Claim-selection rule (auditable)
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11.5px] leading-snug text-tertiary">
              <li>A claim qualifies if restated in at least three independent institutional venues in 2024–26.</li>
              <li>Named institutional sources only — no individual back-benchers, no social media.</li>
              <li>
                Balance is structural: equal claim counts per direction, the same bands and the same evidential bar on
                both sides.
              </li>
              <li>Steel-manning is mandatory wherever any proposition is UNSUPPORTED — in both directions.</li>
            </ol>
            <p className="mt-2 text-[10.5px] leading-snug text-tertiary">
              The rule, not just the selections, is recorded so the register’s balance can itself be audited (ground
              rule 9). Full provenance in <code className="text-[10px]">data.generated.ts</code>.
            </p>
          </div>
        </section>

        {/* balance strip */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">Verdict balance by direction</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Proposition-level verdict counts, split by the direction of the claim they belong to — the even-handedness
            check at a glance. {anyFilter ? 'Counts in brackets: currently filtered view.' : ''}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {DIRECTIONS.map((d) => (
              <div key={d} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">
                  {DIRECTION_META[d].label}
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {VERDICT_ORDER.map((v) => (
                    <div key={v} className="rounded border border-grey-200 bg-white p-2 text-center">
                      <p className="font-mono text-lg font-bold tabular-nums text-tertiary-dark">
                        {byDirection[d][v]}
                        {anyFilter && (
                          <span className="text-[11px] font-normal text-tertiary"> ({filteredByDirection[d][v]})</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-tertiary">
                        {VERDICT_META[v].short}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* filters */}
        <section className="mb-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">
              Direction
            </span>
            <FilterPill label="Both" active={direction === 'all'} onClick={() => setDirection('all')} />
            {DIRECTIONS.map((d) => (
              <FilterPill
                key={d}
                label={DIRECTION_META[d].label}
                active={direction === d}
                onClick={() => setDirection(direction === d ? 'all' : d)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">
              Verdict
            </span>
            <FilterPill label="All" active={verdict === 'all'} onClick={() => setVerdict('all')} />
            {VERDICT_ORDER.map((v) => (
              <FilterPill
                key={v}
                label={VERDICT_META[v].label}
                active={verdict === v}
                onClick={() => setVerdict(verdict === v ? 'all' : v)}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">Topic</span>
            <FilterPill label="All" active={topic === 'all'} onClick={() => setTopic('all')} />
            {TOPIC_ORDER.map((t) => (
              <FilterPill
                key={t}
                label={TOPIC_META[t]}
                active={topic === t}
                onClick={() => setTopic(topic === t ? 'all' : t)}
              />
            ))}
          </div>
        </section>

        {/* the register, side by side */}
        <section className="mb-8">
          <div className="grid gap-4 lg:grid-cols-2">
            {DIRECTIONS.map((d) => {
              const col = filtered.filter((c) => c.direction === d);
              return (
                <div key={d}>
                  <div className="mb-2 rounded-lg border border-grey-200 bg-grey-50 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
                      {DIRECTION_META[d].label}{' '}
                      <span className="ml-1 font-mono tabular-nums text-tertiary">({col.length})</span>
                    </p>
                    <p className="text-[10.5px] text-tertiary">{DIRECTION_META[d].sub}</p>
                  </div>
                  {col.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-grey-300 bg-grey-50 p-6 text-center text-[12px] text-tertiary">
                      No claims in this column match the current filters.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {col.map((c) => (
                        <ClaimCard key={c.id} claim={c} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            All verdicts are AI-drafted against the compiler’s reading of the sources listed below and are pending
            Secretariat verification; none of the claim texts is a verified verbatim quote (all are labelled
            paraphrases). Several locators are flagged as weak in the provenance block — the automotive-action-plan
            COM number, the Budapest Declaration URL and the exact ESRS data-point inventory — and must be verified
            before any use. Verdicts on ex-ante estimates and counterfactuals are deliberately NOT CHECKABLE rather
            than asserted; a fact-check pass over this register changes no stored values and produces decisions for
            the Secretariat via the overrides mechanism. Claims about the ETS should be resolved against M · 37 /
            M · 29, price claims against M · 34, omnibus rows against M · 39.
          </p>
          <ul className="mt-3 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
