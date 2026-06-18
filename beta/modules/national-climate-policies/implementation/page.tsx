'use client';

/**
 * EU policy → national implementation tracker — subpage of the National Level
 * Climate Policies beta module. An update to the Policy Gap report.
 *
 * Answers the Member-State-implementation question head on: for each EU
 * climate policy that requires national implementation (Effort Sharing,
 * Renewable Energy Directive, EPBD, AFIR, LULUCF, CAP, …), how far has each
 * member state built a corresponding national response — and who is lagging
 * behind? For every policy it then surfaces best-practice national
 * instruments from the leaders, offered as models for the laggards.
 *
 * Everything is computed live and reproducibly in
 * `src/lib/eu-implementation.ts`; this page is presentation + the same
 * catalogue loader the parent module uses. Method & caveats:
 * `analysis/POLICY-MONITORING.md`.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import type { ClimatePolicy, PolicyDataset } from '@/lib/climate-laws-types';
import {
  assessImplementation,
  EU_IMPLEMENTATION_POLICIES,
  LEVEL_COLORS,
  LEVEL_LABELS,
  LEVEL_STATUS,
  isImplemented,
  type CountryImplementation,
  type ImplementationLevel,
  type ImplementationResult,
  type PolicyImplementation,
} from '@/lib/eu-implementation';

async function loadCatalogue(): Promise<ClimatePolicy[]> {
  try {
    const res = await fetch('/api/national-climate-policies', { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as { dataset: PolicyDataset | null };
      if (json.dataset?.policies?.length) return json.dataset.policies;
    }
  } catch {
    // API unavailable (static preview) — fall back to the committed snapshot.
  }
  const res = await fetch('/data/national-climate-policies.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as PolicyDataset).policies;
}

export default function EuImplementationPage() {
  const [policies, setPolicies] = useState<ClimatePolicy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('esr'); // ESR is the headline case

  useEffect(() => {
    loadCatalogue()
      .then(setPolicies)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const result: ImplementationResult | null = useMemo(
    () => (policies ? assessImplementation(policies) : null),
    [policies],
  );

  const current = result?.policies.find((p) => p.policy.id === selected) ?? null;

  return (
    <>
      <SiteHeader />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero */}
        <section className="mb-6">
          <Link
            href="/beta/national-climate-policies"
            className="text-[11px] text-primary hover:underline"
          >
            ← National Level Climate Policies
          </Link>
          <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mt-2 mb-1">
            Beta module · Policy Gap report update
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">
            EU policy → national implementation
          </h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            Much of EU climate law only bites once member states act on it. This
            tracker goes through the EU instruments that require national
            implementation and, for each, reads the national policy catalogue to
            gauge how far every member state has built a corresponding response
            — flagging <strong>who is lagging behind</strong> and pulling out{' '}
            <strong>best-practice national instruments</strong> from the leaders
            that the laggards could copy.
          </p>
        </section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded mb-4">
            Could not load the catalogue: {error}
          </div>
        )}
        {!result && !error && (
          <p className="text-sm text-tertiary">Loading catalogue…</p>
        )}

        {result && (
          <>
            <LaggardHeadline result={result} onSelect={setSelected} />

            {/* Implementation matrix */}
            <section className="mb-8">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-lg font-semibold text-tertiary-dark">
                  Implementation matrix
                </h2>
                <Legend />
              </div>
              <p className="text-[12px] text-tertiary mb-3 max-w-3xl">
                One row per member state (sorted by overall implementation), one
                column per EU policy. Click a cell or a column header to inspect
                that policy below.
              </p>
              <Matrix
                result={result}
                selected={selected}
                onSelectPolicy={setSelected}
              />
            </section>

            {/* Policy detail */}
            {current && (
              <PolicyDetail
                pi={current}
                allPolicies={result.policies}
                selected={selected}
                onSelectPolicy={setSelected}
              />
            )}

            {/* Method & caveats */}
            <section className="mt-8 border-t border-grey-100 pt-4">
              <h2 className="text-sm font-semibold text-tertiary-dark mb-2">
                Method &amp; caveats
              </h2>
              <p className="text-[12px] text-tertiary max-w-3xl mb-2">
                For each EU policy, a published matcher (sector + keyword
                signals) selects the national instruments that respond to it; a
                member state is rated 0–3 from the count of matches and whether
                any is a law. Levels ≤ 1 count as lagging. Best practices are the
                strongest implementers&rsquo; actual instruments, linked for
                verification. Full method:{' '}
                <code className="bg-grey-100 px-1 rounded">
                  src/lib/eu-implementation.ts
                </code>{' '}
                and{' '}
                <code className="bg-grey-100 px-1 rounded">
                  analysis/POLICY-MONITORING.md
                </code>
                .
              </p>
              <ul className="text-[11px] text-tertiary list-disc pl-4 space-y-1 max-w-3xl">
                {result.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-tertiary">
      {([3, 2, 1, 0] as ImplementationLevel[]).map((l) => (
        <span key={l} className="inline-flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: LEVEL_COLORS[l] }}
          />
          {LEVEL_LABELS[l]}
        </span>
      ))}
    </div>
  );
}

function LaggardHeadline({
  result,
  onSelect,
}: {
  result: ImplementationResult;
  onSelect: (id: string) => void;
}) {
  // Lead with ESR — the binding-target case the Commission watches most — plus
  // the member states lagging on the most EU policies overall.
  const esr = result.policies.find((p) => p.policy.id === 'esr');
  const mostLagging = [...result.scoreboard]
    .sort((a, b) => b.laggingCount - a.laggingCount || a.score - b.score)
    .slice(0, 5);

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
      {esr && (
        <div className="bg-white border border-grey-200 border-l-4 border-l-[#EF6C00] rounded p-3">
          <div className="text-[11px] uppercase tracking-wide text-tertiary">
            Headline · Effort Sharing Regulation
          </div>
          <div className="text-2xl font-bold text-tertiary-dark mt-0.5">
            {esr.laggards.length} / 27 lagging
          </div>
          <p className="text-[12px] text-tertiary leading-snug mt-1">
            Member states with no or only emerging national measures matching
            the ESR non-ETS effort in the catalogue:{' '}
            <span className="text-tertiary-dark font-medium">
              {esr.laggards.map((l) => l.name).join(', ') || 'none'}
            </span>
            .
          </p>
          <button
            onClick={() => onSelect('esr')}
            className="text-[11px] text-primary hover:underline mt-1.5 font-medium"
          >
            Inspect ESR implementation →
          </button>
        </div>
      )}
      <div className="bg-white border border-grey-200 border-l-4 border-l-primary rounded p-3">
        <div className="text-[11px] uppercase tracking-wide text-tertiary">
          Lagging on the most EU policies
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {mostLagging.map((c) => (
            <span
              key={c.code}
              className="text-[11px] px-2 py-1 rounded-full bg-grey-100 text-tertiary-dark"
              title={`${c.name}: lagging on ${c.laggingCount} of ${EU_IMPLEMENTATION_POLICIES.length} policies · overall ${c.score}/100`}
            >
              {c.name}
              <span className="ml-1 text-[#EF6C00] font-semibold">{c.laggingCount}</span>
            </span>
          ))}
        </div>
        <p className="text-[12px] text-tertiary leading-snug mt-2">
          Count = EU policies (of {EU_IMPLEMENTATION_POLICIES.length}) where the
          catalogue shows no or only emerging national implementation. Read with
          the snapshot caveat below.
        </p>
      </div>
    </section>
  );
}

function Matrix({
  result,
  selected,
  onSelectPolicy,
}: {
  result: ImplementationResult;
  selected: string;
  onSelectPolicy: (id: string) => void;
}) {
  const cols = result.policies;
  return (
    <div className="overflow-x-auto border border-grey-200 rounded">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-grey-50 z-10 text-left px-2 py-2 font-semibold text-tertiary-dark border-b border-grey-200">
              Member state
            </th>
            {cols.map((pp) => (
              <th
                key={pp.policy.id}
                onClick={() => onSelectPolicy(pp.policy.id)}
                className={`px-1.5 py-2 border-b border-grey-200 cursor-pointer align-bottom whitespace-nowrap ${
                  selected === pp.policy.id ? 'bg-primary/10' : 'hover:bg-grey-50'
                }`}
                title={`${pp.policy.fullName} — click to inspect`}
              >
                <span className="font-semibold text-tertiary-dark">
                  {pp.policy.acronym ?? pp.policy.shortName}
                </span>
              </th>
            ))}
            <th className="px-2 py-2 border-b border-grey-200 text-right font-semibold text-tertiary-dark">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {result.scoreboard.map((row) => (
            <tr key={row.code} className="hover:bg-grey-50/60">
              <td className="sticky left-0 bg-white z-10 px-2 py-1 font-medium text-tertiary-dark border-b border-grey-100 whitespace-nowrap">
                {row.name}
              </td>
              {cols.map((pp) => {
                const level = row.levels[pp.policy.id] as ImplementationLevel;
                return (
                  <td
                    key={pp.policy.id}
                    onClick={() => onSelectPolicy(pp.policy.id)}
                    className={`text-center border-b border-grey-100 cursor-pointer ${
                      selected === pp.policy.id ? 'ring-1 ring-inset ring-primary/30' : ''
                    }`}
                    title={`${row.name} · ${pp.policy.fullName}: ${LEVEL_LABELS[level]}`}
                  >
                    <span
                      className="inline-block w-full h-5 align-middle"
                      style={{ backgroundColor: LEVEL_COLORS[level] }}
                    />
                  </td>
                );
              })}
              <td className="px-2 py-1 text-right font-bold border-b border-grey-100 tabular-nums">
                {row.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PolicyDetail({
  pi,
  allPolicies,
  selected,
  onSelectPolicy,
}: {
  pi: PolicyImplementation;
  allPolicies: PolicyImplementation[];
  selected: string;
  onSelectPolicy: (id: string) => void;
}) {
  const total = pi.byCountry.length;
  return (
    <section className="mb-4">
      {/* Policy selector chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {allPolicies.map((p) => (
          <button
            key={p.policy.id}
            onClick={() => onSelectPolicy(p.policy.id)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
              selected === p.policy.id
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-tertiary border-grey-200 hover:border-primary'
            }`}
          >
            {p.policy.acronym ?? p.policy.shortName}
          </button>
        ))}
      </div>

      <div className="bg-white border border-grey-200 rounded p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-tertiary-dark">
            {pi.policy.fullName}
            {pi.policy.acronym && (
              <span className="ml-2 text-sm font-normal text-tertiary">
                {pi.policy.acronym}
              </span>
            )}
          </h2>
          <a
            href={pi.policy.eurlexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline"
          >
            EUR-Lex ↗
          </a>
        </div>
        <p className="text-[12px] text-tertiary mt-1 max-w-3xl">
          <span className="font-medium text-tertiary-dark">
            National implementation requires:
          </span>{' '}
          {pi.policy.requires}{' '}
          <span className="text-tertiary/70">(adopted {pi.policy.adopted})</span>
        </p>

        {/* Level distribution */}
        <div className="mt-3 flex h-6 rounded overflow-hidden border border-grey-200">
          {([3, 2, 1, 0] as ImplementationLevel[]).map((l) => {
            const n = pi.levelCounts[l];
            if (!n) return null;
            return (
              <div
                key={l}
                className="flex items-center justify-center text-[10px] font-semibold text-white"
                style={{ backgroundColor: LEVEL_COLORS[l], width: `${(n / total) * 100}%` }}
                title={`${LEVEL_LABELS[l]}: ${n}`}
              >
                {n}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Laggards */}
          <div>
            <h3 className="text-sm font-semibold text-tertiary-dark mb-1.5">
              Lagging behind{' '}
              <span className="text-[11px] font-normal text-tertiary">
                ({pi.laggards.length} member states)
              </span>
            </h3>
            {pi.laggards.length === 0 ? (
              <p className="text-[12px] text-tertiary">
                No member state is rated as lagging on this policy in the
                catalogue.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {pi.laggards.map((l) => (
                  <span
                    key={l.code}
                    className="text-[11px] px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `${LEVEL_COLORS[l.level]}22`,
                      color: '#5a3a00',
                    }}
                    title={LEVEL_LABELS[l.level]}
                  >
                    {l.name}
                    <span className="ml-1 opacity-70">{LEVEL_LABELS[l.level]}</span>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-tertiary mt-2">
              &ldquo;Lagging&rdquo; = no national instrument matching this policy
              area in the catalogue, or only a single soft (non-legislative)
              one.
            </p>
          </div>

          {/* Best practices */}
          <div>
            <h3 className="text-sm font-semibold text-tertiary-dark mb-1.5">
              Best practices to learn from
            </h3>
            {pi.bestPractices.length === 0 ? (
              <p className="text-[12px] text-tertiary">
                No member state reaches a &ldquo;Strong&rdquo; rating on this
                policy in the catalogue.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {pi.bestPractices.map((bp) => (
                  <li
                    key={bp.code}
                    className="border border-grey-200 rounded p-2 bg-grey-50/40"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] font-semibold text-tertiary-dark">
                        {bp.country}
                      </span>
                      <span className="text-[10px] text-tertiary">{bp.note}</span>
                    </div>
                    <a
                      href={bp.instrument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline"
                      title={bp.instrument.title}
                    >
                      {bp.instrument.category === 'Law' ? '§ ' : ''}
                      {bp.instrument.title}
                      {bp.instrument.year ? ` (${bp.instrument.year})` : ''} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-tertiary mt-2">
              Concrete national instruments from the strongest implementers —
              models the lagging member states could adapt.
            </p>
          </div>
        </div>

        {/* Who did what — full member-state breakdown */}
        <div className="mt-5 border-t border-grey-100 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-tertiary-dark">
              Who did what — all 27 member states
            </h3>
            <span className="text-[11px] text-tertiary">
              {pi.byCountry.filter((c) => isImplemented(c.level)).length} implemented ·{' '}
              {pi.byCountry.filter((c) => c.level === 1).length} partial ·{' '}
              {pi.byCountry.filter((c) => c.level === 0).length} not implemented
            </span>
          </div>
          <div className="space-y-1.5">
            {[...pi.byCountry]
              .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))
              .map((c) => (
                <CountryRow key={c.code} c={c} />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CountryRow({ c }: { c: CountryImplementation }) {
  const more = c.count - c.examples.length;
  return (
    <div className="grid grid-cols-[150px_110px_1fr] gap-2 items-start border border-grey-100 rounded px-2 py-1.5 bg-white">
      <span className="text-[12px] font-medium text-tertiary-dark truncate" title={c.name}>
        {c.name}
      </span>
      <span className="flex items-center gap-1.5 text-[11px]" title={LEVEL_LABELS[c.level]}>
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: LEVEL_COLORS[c.level] }}
        />
        <span
          className="font-medium"
          style={{ color: c.level === 0 ? '#9E9E9E' : c.level === 1 ? '#EF6C00' : '#1B5E20' }}
        >
          {LEVEL_STATUS[c.level]}
        </span>
      </span>
      <div className="min-w-0 text-[11px]">
        {c.examples.length === 0 ? (
          <span className="text-tertiary/70 italic">
            No matching national instrument in the catalogue.
          </span>
        ) : (
          <ul className="space-y-0.5">
            {c.examples.map((e) => (
              <li key={e.id} className="leading-snug">
                <a
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  title={e.title}
                >
                  {e.category === 'Law' ? '§ ' : ''}
                  {e.title}
                  {e.year ? ` (${e.year})` : ''} ↗
                </a>
              </li>
            ))}
            {more > 0 && (
              <li className="text-tertiary/70">+{more} more in the catalogue</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
