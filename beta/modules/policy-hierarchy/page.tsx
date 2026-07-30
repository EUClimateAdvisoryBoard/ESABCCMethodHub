'use client';

/**
 * EU Policy Hierarchy (beta module M·42).
 *
 * One collapsible figure of the EU legal order, across ALL policy fields —
 * not only climate: primary law (the Treaties) at the top, then per-domain
 * branches of secondary law (regulations, directives, decisions), tertiary
 * law (delegated / implementing acts), soft law (communications,
 * recommendations) and the supporting layer (impact assessments, SWDs).
 * Every instrument links to its EUR-Lex entry.
 *
 * Four cross-cutting lenses — climate, competitiveness, security, health —
 * re-colour the whole tree so the same hierarchy can be read as "the climate
 * acquis", "the competitiveness acquis", etc. A legend explains what each
 * instrument type is and what it binds.
 *
 * Deliberately more structure and less movement than the Policy Navigator's
 * force graph: a static, top-down tree you expand and collapse.
 *
 * Nothing in this file hard-codes counts or names — everything is computed
 * from DOMAIN_BRANCHES so the page keeps working when the dataset is
 * regenerated or corrected.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import {
  DOMAIN_BRANCHES,
  LENS_META,
  LENS_ORDER,
  TIER_META,
  TIER_ORDER,
  TYPE_META,
  type DomainBranch,
  type Instrument,
  type LensId,
  type Tier,
} from './data';

/* ============================================================ helpers */

const PRIMARY_BRANCH_ID = 'primary-law';

/** Tier of an instrument, via its type. */
function tierOf(i: Instrument): Tier {
  return TYPE_META[i.type].tier;
}

/** Sort: binding first (by tier order), then year descending inside a tier. */
function sortInstruments(a: Instrument, b: Instrument): number {
  const ta = TIER_ORDER.indexOf(tierOf(a));
  const tb = TIER_ORDER.indexOf(tierOf(b));
  if (ta !== tb) return ta - tb;
  return b.year - a.year;
}

function matchesQuery(i: Instrument, q: string): boolean {
  if (!q) return true;
  const hay = `${i.title} ${i.officialRef} ${i.summary}`.toLowerCase();
  return hay.includes(q);
}

function matchesLenses(i: Instrument, active: Set<LensId>): boolean {
  if (active.size === 0) return true;
  return i.lenses.some(l => active.has(l));
}

/* ============================================================ atoms */

function TypeBadge({ type, small }: { type: Instrument['type']; small?: boolean }) {
  const meta = TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center rounded border font-semibold tracking-wide shrink-0 ${
        small ? 'px-1 py-[1px] text-[9px]' : 'px-1.5 py-[2px] text-[10px]'
      }`}
      style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}0D` }}
      title={`${meta.label} — ${meta.legend}`}
    >
      {meta.abbr}
    </span>
  );
}

function LensDots({ lenses, active }: { lenses: LensId[]; active: Set<LensId> }) {
  if (lenses.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 shrink-0" aria-label={`Lenses: ${lenses.join(', ')}`}>
      {LENS_ORDER.filter(l => lenses.includes(l)).map(l => (
        <span
          key={l}
          title={LENS_META[l].label}
          className="inline-block w-2 h-2 rounded-full"
          style={{
            background: LENS_META[l].color,
            opacity: active.size === 0 || active.has(l) ? 1 : 0.25,
          }}
        />
      ))}
    </span>
  );
}

function EurLexLink({ i }: { i: Instrument }) {
  return (
    <a
      href={i.eurlexUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] text-[#00928F] hover:text-[#007B6C] hover:underline whitespace-nowrap shrink-0"
      title={i.celex ? `EUR-Lex · CELEX ${i.celex}` : 'EUR-Lex search (exact reference unverified)'}
    >
      EUR-Lex ↗
    </a>
  );
}

/* ============================================================ instrument row */

function InstrumentRow({
  i,
  childrenOf,
  activeLenses,
  depth = 0,
}: {
  i: Instrument;
  childrenOf: Map<string, Instrument[]>;
  activeLenses: Set<LensId>;
  depth?: number;
}) {
  const kids = childrenOf.get(i.id) ?? [];
  const lit = matchesLenses(i, activeLenses);
  const firstActive = LENS_ORDER.find(l => activeLenses.has(l) && i.lenses.includes(l));
  return (
    <div className={depth > 0 ? 'ml-4 sm:ml-6 border-l-2 border-[#E6E7E8] dark:border-[var(--mh-border)] pl-3' : ''}>
      <div
        className={`rounded-md px-2.5 py-2 transition-colors ${lit ? '' : 'opacity-40'}`}
        style={{
          background: firstActive ? LENS_META[firstActive].bg : undefined,
          boxShadow: firstActive ? `inset 3px 0 0 ${LENS_META[firstActive].color}` : undefined,
        }}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <TypeBadge type={i.type} small={depth > 0} />
          <span className={`font-semibold text-[#3D5265] dark:text-[var(--mh-fg)] ${depth > 0 ? 'text-[12px]' : 'text-[13px]'}`}>
            {i.title}
          </span>
          <span className="text-[11px] text-[#808285] dark:text-[var(--mh-muted)] whitespace-nowrap">
            {i.officialRef} · {i.year}
          </span>
          <EurLexLink i={i} />
          {!i.confident && (
            <span
              className="text-[9px] uppercase tracking-wide px-1 py-[1px] rounded border border-[#FF9933]/60 text-[#D97706]"
              title="The compiling agent was not certain of the exact reference — link points to a EUR-Lex search, verify before citing."
            >
              unverified
            </span>
          )}
          <span className="ml-auto">
            <LensDots lenses={i.lenses} active={activeLenses} />
          </span>
        </div>
        <p className={`mt-0.5 text-[#54728C] dark:text-[var(--mh-muted)] leading-snug ${depth > 0 ? 'text-[11px]' : 'text-[12px]'}`}>
          {i.summary}
        </p>
      </div>
      {kids.length > 0 && (
        <div className="mt-1 space-y-1">
          {kids.sort(sortInstruments).map(k => (
            <InstrumentRow key={k.id} i={k} childrenOf={childrenOf} activeLenses={activeLenses} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================ domain branch */

function branchStats(b: DomainBranch, activeLenses: Set<LensId>) {
  const binding = b.instruments.filter(i => ['secondary', 'international'].includes(tierOf(i))).length;
  const tertiary = b.instruments.filter(i => tierOf(i) === 'tertiary').length;
  const soft = b.instruments.filter(i => tierOf(i) === 'soft').length;
  const supporting = b.instruments.filter(i => tierOf(i) === 'supporting').length;
  const lensHits = activeLenses.size === 0 ? null : b.instruments.filter(i => matchesLenses(i, activeLenses)).length;
  return { binding, tertiary, soft, supporting, lensHits };
}

function DomainPanel({
  branch,
  open,
  onToggle,
  activeLenses,
  query,
}: {
  branch: DomainBranch;
  open: boolean;
  onToggle: () => void;
  activeLenses: Set<LensId>;
  query: string;
}) {
  const { topLevel, childrenOf, visibleCount } = useMemo(() => {
    const byId = new Map(branch.instruments.map(i => [i.id, i]));
    const childrenOf = new Map<string, Instrument[]>();
    const topLevel: Instrument[] = [];
    for (const i of branch.instruments) {
      const parentOk = i.parentId && byId.has(i.parentId);
      if (parentOk) {
        const arr = childrenOf.get(i.parentId!) ?? [];
        arr.push(i);
        childrenOf.set(i.parentId!, arr);
      } else {
        topLevel.push(i);
      }
    }
    // Text filter: keep a top-level act if it or any of its children match.
    const visible = topLevel.filter(
      t => matchesQuery(t, query) || (childrenOf.get(t.id) ?? []).some(k => matchesQuery(k, query)),
    );
    return { topLevel: visible.sort(sortInstruments), childrenOf, visibleCount: visible.length };
  }, [branch, query]);

  const stats = branchStats(branch, activeLenses);
  if (query && visibleCount === 0) return null;

  return (
    <div className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-3 sm:px-4 py-2.5 text-left hover:bg-[#F9FAFB] dark:hover:bg-white/5 transition-colors"
      >
        <span className="text-[#00928F] text-[12px] w-3 shrink-0" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="font-bold text-[13px] sm:text-[14px] text-[#3D5265] dark:text-[var(--mh-fg)]">{branch.name}</span>
        <span className="text-[11px] text-[#808285] dark:text-[var(--mh-muted)]">
          {stats.binding} binding · {stats.tertiary + stats.supporting} underlying · {stats.soft} soft law
        </span>
        {stats.lensHits !== null && (
          <span className="text-[11px] font-semibold text-[#007B6C]">{stats.lensHits} in lens</span>
        )}
        <span className="ml-auto hidden sm:inline-flex items-center gap-2">
          {LENS_ORDER.map(l => {
            const n = branch.instruments.filter(i => i.lenses.includes(l)).length;
            if (n === 0) return null;
            return (
              <span key={l} className="inline-flex items-center gap-1 text-[10px] text-[#808285] dark:text-[var(--mh-muted)]"
                    title={`${n} instruments touch ${LENS_META[l].label.toLowerCase()}`}>
                <span className="inline-block w-2 h-2 rounded-full"
                      style={{ background: LENS_META[l].color, opacity: activeLenses.size === 0 || activeLenses.has(l) ? 1 : 0.25 }} />
                {n}
              </span>
            );
          })}
        </span>
      </button>

      {open && (
        <div className="px-3 sm:px-4 pb-3 border-t border-[#F3F4F5] dark:border-[var(--mh-border)]">
          {branch.legalBases.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2.5 pb-1">
              <span className="text-[10px] uppercase tracking-wide text-[#808285] dark:text-[var(--mh-muted)]">Treaty legal bases:</span>
              {branch.legalBases.map(lb => (
                <span key={lb.article}
                      className="text-[10px] px-1.5 py-[2px] rounded-full bg-[#EDF1F2] dark:bg-white/10 text-[#3D5265] dark:text-[var(--mh-fg)]"
                      title={lb.description}>
                  {lb.article}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1.5 space-y-1.5">
            {topLevel.map(i => (
              <InstrumentRow key={i.id} i={i} childrenOf={childrenOf} activeLenses={activeLenses} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================ legend */

function Legend({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)]">
      <button onClick={onToggle} aria-expanded={open}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[#F9FAFB] dark:hover:bg-white/5">
        <span className="text-[#00928F] text-[12px]" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="font-bold text-[13px] text-[#3D5265] dark:text-[var(--mh-fg)]">
          Legend — what each instrument type is
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#F3F4F5] dark:border-[var(--mh-border)]">
          {TIER_ORDER.map(tier => {
            const types = (Object.keys(TYPE_META) as Instrument['type'][]).filter(t => TYPE_META[t].tier === tier);
            if (types.length === 0) return null;
            return (
              <div key={tier} className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]">
                  {TIER_META[tier].label}
                  <span className="ml-2 font-normal normal-case tracking-normal text-[#808285] dark:text-[var(--mh-muted)]">
                    {TIER_META[tier].description}
                  </span>
                </p>
                <div className="mt-1.5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {types.map(t => (
                    <div key={t} className="flex items-start gap-2">
                      <TypeBadge type={t} />
                      <p className="text-[11px] leading-snug text-[#54728C] dark:text-[var(--mh-muted)]">
                        <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">{TYPE_META[t].label}.</span>{' '}
                        {TYPE_META[t].legend}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]">Lenses</p>
            <div className="mt-1.5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {LENS_ORDER.map(l => (
                <div key={l} className="flex items-start gap-2">
                  <span className="mt-[3px] inline-block w-3 h-3 rounded-full shrink-0" style={{ background: LENS_META[l].color }} />
                  <p className="text-[11px] leading-snug text-[#54728C] dark:text-[var(--mh-muted)]">
                    <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">{LENS_META[l].label}.</span>{' '}
                    {LENS_META[l].description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================ page */

export default function PolicyHierarchyPage() {
  const primaryBranch = DOMAIN_BRANCHES.find(b => b.id === PRIMARY_BRANCH_ID);
  const domainBranches = DOMAIN_BRANCHES.filter(b => b.id !== PRIMARY_BRANCH_ID);

  const [activeLenses, setActiveLenses] = useState<Set<LensId>>(new Set());
  const [openDomains, setOpenDomains] = useState<Set<string>>(new Set());
  const [machineryOpen, setMachineryOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [rawQuery, setRawQuery] = useState('');
  const query = rawQuery.trim().toLowerCase();

  const totals = useMemo(() => {
    const all = DOMAIN_BRANCHES.flatMap(b => b.instruments);
    return {
      instruments: all.length,
      branches: domainBranches.length,
      unverified: all.filter(i => !i.confident).length,
      perLens: Object.fromEntries(LENS_ORDER.map(l => [l, all.filter(i => i.lenses.includes(l)).length])) as Record<LensId, number>,
    };
  }, [domainBranches.length]);

  // Treaties + primary-rank instruments form the top tier; the rest of the
  // primary-law branch (comitology, Better Regulation…) is the "machinery" strip.
  const treaties = (primaryBranch?.instruments ?? [])
    .filter(i => tierOf(i) === 'primary' && !i.parentId)
    .sort(sortInstruments);
  const machinery = (primaryBranch?.instruments ?? []).filter(i => tierOf(i) !== 'primary' && !i.parentId).sort(sortInstruments);
  const machineryChildren = useMemo(() => {
    const m = new Map<string, Instrument[]>();
    for (const i of primaryBranch?.instruments ?? []) {
      if (i.parentId) m.set(i.parentId, [...(m.get(i.parentId) ?? []), i]);
    }
    return m;
  }, [primaryBranch]);

  function toggleLens(l: LensId) {
    setActiveLenses(prev => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }

  const allOpen = openDomains.size === domainBranches.length;
  const searching = query.length > 0;

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[var(--mh-bg)] text-[#3D5265] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <PageHero
        title="EU Policy Hierarchy"
        subtitle={
          <>
            The EU legal order as one collapsible figure — from the Treaties at the top, through regulations,
            directives and decisions, down to delegated acts, communications and impact assessments — across{' '}
            {totals.branches} policy domains, every instrument linked to EUR-Lex. Switch a lens on to re-colour
            the whole hierarchy by cross-cutting theme.
          </>
        }
      />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* AI-compilation disclaimer */}
        <div className="rounded-lg border border-[#FF9933]/40 bg-[#FFEDDE]/60 dark:bg-[#FF9933]/10 px-4 py-2.5 text-[12px] leading-relaxed">
          <span className="font-bold">AI-compiled register.</span> The instrument list ({totals.instruments} entries)
          was compiled by one AI agent per policy domain from model knowledge, without live EUR-Lex verification.
          Entries the agent was unsure about are flagged <span className="uppercase text-[10px] font-semibold border border-[#FF9933]/60 text-[#D97706] rounded px-1">unverified</span>{' '}
          ({totals.unverified} of {totals.instruments}) and link to a EUR-Lex search instead of a CELEX record.
          Treat this as a structural map pending Secretariat verification, not a citable register.
        </div>

        {/* Controls */}
        <div className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-[#808285] dark:text-[var(--mh-muted)]">Lenses</span>
            {LENS_ORDER.map(l => {
              const on = activeLenses.has(l);
              return (
                <button
                  key={l}
                  onClick={() => toggleLens(l)}
                  aria-pressed={on}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors"
                  style={{
                    borderColor: LENS_META[l].color,
                    background: on ? LENS_META[l].color : 'transparent',
                    color: on ? '#fff' : LENS_META[l].color,
                  }}
                >
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: on ? '#fff' : LENS_META[l].color }} />
                  {LENS_META[l].label}
                  <span className="opacity-75 font-normal">{totals.perLens[l]}</span>
                </button>
              );
            })}
            {activeLenses.size > 0 && (
              <button onClick={() => setActiveLenses(new Set())}
                      className="text-[11px] text-[#808285] hover:text-[#3D5265] dark:hover:text-[var(--mh-fg)] underline">
                clear
              </button>
            )}
            <span className="ml-auto flex items-center gap-2">
              <input
                value={rawQuery}
                onChange={e => setRawQuery(e.target.value)}
                placeholder="Filter instruments…"
                className="w-40 sm:w-52 rounded border border-[#E6E7E8] dark:border-[var(--mh-border)] bg-transparent px-2 py-1 text-[12px] focus:outline-none focus:border-[#00928F]"
                aria-label="Filter instruments by name"
              />
              <button
                onClick={() => setOpenDomains(allOpen ? new Set() : new Set(domainBranches.map(b => b.id)))}
                className="rounded border border-[#E6E7E8] dark:border-[var(--mh-border)] px-2.5 py-1 text-[12px] hover:border-[#00928F] hover:text-[#007B6C]"
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            </span>
          </div>
          {activeLenses.size === 0 && (
            <p className="mt-1.5 text-[11px] text-[#808285] dark:text-[var(--mh-muted)]">
              No lens active — the hierarchy is shown neutrally. Toggle a lens to highlight every instrument that carries
              that theme (an act can carry several: CBAM is climate <em>and</em> competitiveness).
            </p>
          )}
        </div>

        {/* ============ THE FIGURE ============ */}
        <section aria-label="EU legal-order hierarchy figure" className="space-y-0">
          {/* Tier 1 — primary law */}
          <div className="rounded-lg border-2 border-[#3D5265]/50 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-3 sm:p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]">
              {TIER_META.primary.label} — the Treaties
              <span className="ml-2 font-normal normal-case tracking-normal text-[#808285] dark:text-[var(--mh-muted)]">
                {TIER_META.primary.description}
              </span>
            </p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {treaties.map(t => {
                const lit = matchesLenses(t, activeLenses);
                return (
                  <div key={t.id}
                       className={`rounded-md border border-[#E6E7E8] dark:border-[var(--mh-border)] px-2.5 py-2 ${lit ? '' : 'opacity-40'}`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <TypeBadge type={t.type} small />
                      <span className="text-[12px] font-bold">{t.title}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#808285] dark:text-[var(--mh-muted)]">{t.officialRef}</p>
                    <p className="mt-1 text-[11px] leading-snug text-[#54728C] dark:text-[var(--mh-muted)]">{t.summary}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <EurLexLink i={t} />
                      <LensDots lenses={t.lenses} active={activeLenses} />
                    </div>
                  </div>
                );
              })}
            </div>

            {machinery.length > 0 && (
              <div className="mt-3">
                <button onClick={() => setMachineryOpen(o => !o)} aria-expanded={machineryOpen}
                        className="text-[11px] font-semibold text-[#00928F] hover:text-[#007B6C]">
                  {machineryOpen ? '▾' : '▸'} The law-making machinery ({machinery.length}) — how the levels below get made
                </button>
                {machineryOpen && (
                  <div className="mt-2 space-y-1.5">
                    {machinery.map(i => (
                      <InstrumentRow key={i.id} i={i} childrenOf={machineryChildren} activeLenses={activeLenses} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Connector */}
          <div className="flex flex-col items-center py-1" aria-hidden>
            <div className="w-px h-4 bg-[#BCBEC0]" />
            <p className="text-[10px] text-[#808285] dark:text-[var(--mh-muted)] px-3 py-0.5 border border-[#E6E7E8] dark:border-[var(--mh-border)] rounded-full bg-white dark:bg-[var(--mh-card)]">
              treaty articles confer the competence — Art. 288 TFEU defines the instruments adopted under it
            </p>
            <div className="w-px h-4 bg-[#BCBEC0]" />
            <div className="text-[#BCBEC0] text-[10px] -mt-1">▼</div>
          </div>

          {/* Tier 2+ — domain branches */}
          <div className="space-y-2">
            {domainBranches.map(b => (
              <DomainPanel
                key={b.id}
                branch={b}
                open={searching || openDomains.has(b.id)}
                onToggle={() =>
                  setOpenDomains(prev => {
                    const next = new Set(prev);
                    if (next.has(b.id)) next.delete(b.id);
                    else next.add(b.id);
                    return next;
                  })
                }
                activeLenses={activeLenses}
                query={query}
              />
            ))}
          </div>
        </section>

        {/* Legend */}
        <Legend open={legendOpen} onToggle={() => setLegendOpen(o => !o)} />

        <p className="text-[11px] text-[#808285] dark:text-[var(--mh-muted)] text-center pb-2">
          Beta module · M · 42 · AI-compiled structural map of the EU acquis · every entry pending human verification against EUR-Lex
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
