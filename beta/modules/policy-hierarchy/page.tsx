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
 * Two colouring modes:
 *   - Lenses: climate / competitiveness / security / health re-colour the
 *     tree by cross-cutting theme.
 *   - Mandate rings: core / adjacent / context — the Secretariat's working
 *     interpretation of the Board's mandate under Art. 3(2)(b) of the
 *     Climate Law ("Union measures", not "climate measures"), argued in the
 *     MandatePanel and annotated per instrument (WP-1).
 *
 * A status layer (WP-2) marks where the 2025-26 legislative agenda is
 * moving instruments (proposals, revisions, omnibus reopenings, announced
 * reviews) — filterable via "moving now".
 *
 * Deliberately more structure and less movement than the Policy Navigator's
 * force graph: a static, top-down tree you expand and collapse. State
 * (lenses, mode, moving filter) is mirrored into the URL for sharing, and
 * the full register exports to CSV.
 *
 * Nothing in this file hard-codes counts or names — everything is computed
 * from DOMAIN_BRANCHES / MANDATE / STATUS so the page keeps working when
 * the dataset is regenerated or corrected.
 */

import { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import MandatePanel from './MandatePanel';
import {
  DG_META,
  DOMAIN_BRANCHES,
  LEAD_DGS,
  LENS_META,
  LENS_ORDER,
  MANDATE,
  NAVIGATOR_BRIDGE,
  RECOMMENDATIONS,
  RELEVANCE_META,
  RELEVANCE_ORDER,
  SECTOR_BRIDGE,
  STATUS,
  STATUS_META,
  TIER_META,
  TIER_ORDER,
  TYPE_META,
  type DomainBranch,
  type Instrument,
  type InstrumentStatus,
  type LensId,
  type MandateRelevance,
  type Tier,
} from './data';

/* ============================================================ helpers */

const PRIMARY_BRANCH_ID = 'primary-law';

type ColourMode = 'lens' | 'mandate';

/** Tier of an instrument, via its type. */
function tierOf(i: Instrument): Tier {
  return TYPE_META[i.type].tier;
}

/**
 * Mandate ring of an instrument. Falls back conservatively when the
 * annotation layer misses an id: climate-lens acts to 'adjacent' (never
 * silently 'core'), everything else to 'context'.
 */
function relevanceOf(i: Instrument): MandateRelevance {
  const m = MANDATE[i.id];
  if (m) return m.relevance;
  return i.lenses.includes('climate') ? 'adjacent' : 'context';
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

/** Ring and tier chips FILTER (hide), unlike lenses which only dim. */
function matchesRingTier(i: Instrument, rings: Set<MandateRelevance>, tiers: Set<Tier>): boolean {
  if (rings.size > 0 && !rings.has(relevanceOf(i))) return false;
  if (tiers.size > 0 && !tiers.has(tierOf(i))) return false;
  return true;
}

function matchesDg(i: Instrument, dg: string | null): boolean {
  if (!dg) return true;
  return (LEAD_DGS[i.id] ?? []).includes(dg);
}

function exportCsv() {
  const rows: string[][] = [[
    'branch', 'id', 'title', 'officialRef', 'type', 'year', 'celex', 'eurlexUrl', 'summary',
    'lenses', 'mandateRing', 'boardHook', 'leadDGs', 'status', 'statusNote', 'referenceVerified',
  ]];
  for (const b of DOMAIN_BRANCHES) {
    for (const i of b.instruments) {
      const m = MANDATE[i.id];
      const st = STATUS[i.id];
      rows.push([
        b.name, i.id, i.title, i.officialRef, i.type, String(i.year), i.celex ?? '', i.eurlexUrl,
        i.summary, i.lenses.join('|'), m?.relevance ?? relevanceOf(i), m?.hook ?? '',
        (LEAD_DGS[i.id] ?? []).join('|'), st?.status ?? '', st?.note ?? '', i.confident ? 'yes' : 'no',
      ]);
    }
  }
  const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'eu-policy-hierarchy.csv';
  a.click();
  URL.revokeObjectURL(a.href);
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

function StatusChip({ id }: { id: string }) {
  const st = STATUS[id];
  if (!st) return null;
  const meta = STATUS_META[st.status];
  return (
    <span
      className="text-[9px] uppercase tracking-wide px-1 py-[1px] rounded border font-semibold shrink-0"
      style={{ color: meta.color, borderColor: `${meta.color}66`, background: `${meta.color}10` }}
      title={`${meta.label}${st.confident ? '' : ' (unconfirmed)'} — ${st.note}${st.sourceRef ? ` · ${st.sourceRef}` : ''}`}
    >
      {meta.label}
      {st.confident ? '' : ' ?'}
    </span>
  );
}

function DgChips({
  id,
  activeDg,
  onDgClick,
  small,
}: {
  id: string;
  activeDg: string | null;
  onDgClick: (dg: string) => void;
  small?: boolean;
}) {
  const dgs = LEAD_DGS[id] ?? [];
  if (dgs.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {dgs.map((dg, idx) => (
        <button
          key={dg}
          onClick={() => dg !== 'NONE' && onDgClick(dg)}
          className={`rounded px-1 py-[1px] border tracking-wide transition-colors ${small ? 'text-[8px]' : 'text-[9px]'} ${
            activeDg === dg
              ? 'bg-[#3D5265] border-[#3D5265] text-white'
              : 'border-[#BCBEC0]/60 text-[#54728C] dark:text-[var(--mh-muted)] hover:border-[#3D5265]'
          } ${idx === 0 ? 'font-bold' : 'font-normal'} ${dg === 'NONE' ? 'cursor-default opacity-60' : ''}`}
          title={`${DG_META[dg] ?? dg}${idx === 0 ? ' (lead service)' : ''}${dg === 'NONE' ? '' : ' — click to filter the tree to this DG'}`}
        >
          {dg === 'NONE' ? '—' : dg}
        </button>
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
  colourMode,
  activeDg,
  onDgClick,
  depth = 0,
}: {
  i: Instrument;
  childrenOf: Map<string, Instrument[]>;
  activeLenses: Set<LensId>;
  colourMode: ColourMode;
  activeDg: string | null;
  onDgClick: (dg: string) => void;
  depth?: number;
}) {
  const kids = childrenOf.get(i.id) ?? [];
  // Act-heavy branches: collapse children by default when there are many,
  // reusing the "▸ N …" affordance from the primary-law machinery strip.
  // Permalink targets start expanded so a shared #id link is never hidden.
  const [kidsOpen, setKidsOpen] = useState(
    () => kids.length <= 3 || (typeof window !== 'undefined' && kids.some(k => window.location.hash === `#${k.id}`)),
  );
  const [copied, setCopied] = useState(false);
  const lit = matchesLenses(i, activeLenses);
  const rel = relevanceOf(i);
  const mandate = colourMode === 'mandate';
  const firstActive = LENS_ORDER.find(l => activeLenses.has(l) && i.lenses.includes(l));
  const dim = !lit || (mandate && rel === 'context');
  const rowStyle = mandate
    ? { background: RELEVANCE_META[rel].bg, boxShadow: `inset 3px 0 0 ${RELEVANCE_META[rel].color}` }
    : {
        background: firstActive ? LENS_META[firstActive].bg : undefined,
        boxShadow: firstActive ? `inset 3px 0 0 ${LENS_META[firstActive].color}` : undefined,
      };
  const hook = MANDATE[i.id]?.hook;
  const nav = NAVIGATOR_BRIDGE[i.id];
  const recs = RECOMMENDATIONS[i.id] ?? [];
  const sectors = SECTOR_BRIDGE[i.id];
  const TitleTag = depth > 0 ? 'span' : 'h3';

  function copyPermalink() {
    const url = `${window.location.origin}${window.location.pathname}#${i.id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div id={i.id} className={depth > 0 ? 'ml-4 sm:ml-6 border-l-2 border-[#E6E7E8] dark:border-[var(--mh-border)] pl-3' : 'scroll-mt-20'}>
      <div className={`group rounded-md px-2.5 py-2 transition-colors ${dim ? 'opacity-40' : ''}`} style={rowStyle}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <TypeBadge type={i.type} small={depth > 0} />
          <TitleTag
            className={`font-semibold text-[#3D5265] dark:text-[var(--mh-fg)] inline m-0 ${depth > 0 ? 'text-[12px]' : 'text-[13px]'}`}
            title={sectors ? `Sectors: ${sectors.join(', ')}` : undefined}
          >
            {i.title}
          </TitleTag>
          <span className="text-[11px] text-[#808285] dark:text-[var(--mh-muted)] whitespace-nowrap">
            {i.officialRef} · {i.year}
          </span>
          <DgChips id={i.id} activeDg={activeDg} onDgClick={onDgClick} small={depth > 0} />
          <EurLexLink i={i} />
          {nav && (
            <a
              href={`/policy-navigator?policy=${encodeURIComponent(nav.policyId)}`}
              className="text-[11px] text-[#00928F] hover:text-[#007B6C] hover:underline whitespace-nowrap shrink-0"
              title={`Open in the Policy Navigator (full text, annotations) — domain: ${nav.domain}`}
            >
              Navigator ↗
            </a>
          )}
          <button
            onClick={copyPermalink}
            className="text-[11px] text-[#808285] hover:text-[#007B6C] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
            title="Copy a direct link to this instrument"
            aria-label={`Copy link to ${i.title}`}
          >
            {copied ? 'copied ✓' : '⧉ link'}
          </button>
          <StatusChip id={i.id} />
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
        {mandate && hook && (
          <p className="mt-0.5 text-[11px] italic leading-snug" style={{ color: RELEVANCE_META[rel].color }}>
            Board angle: {hook}
          </p>
        )}
        {recs.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-[#808285] dark:text-[var(--mh-muted)]">Board advice:</span>
            {recs.map(r => (
              <a
                key={r}
                href="/recommendations"
                className="text-[10px] px-1.5 py-[1px] rounded-full border border-[#007B6C]/40 text-[#007B6C] hover:bg-[#E5F9E7]"
                title={`The Board has already spoken on this file — recommendation ${r} (opens the Recommendations module)`}
              >
                {r}
              </a>
            ))}
          </p>
        )}
      </div>
      {kids.length > 0 && (
        kidsOpen ? (
          <div className="mt-1 space-y-1">
            {kids.length > 3 && (
              <button onClick={() => setKidsOpen(false)} className="ml-4 sm:ml-6 text-[11px] font-semibold text-[#00928F] hover:text-[#007B6C]">
                ▾ hide {kids.length} underlying acts
              </button>
            )}
            {kids.sort(sortInstruments).map(k => (
              <InstrumentRow key={k.id} i={k} childrenOf={childrenOf} activeLenses={activeLenses} colourMode={colourMode} activeDg={activeDg} onDgClick={onDgClick} depth={depth + 1} />
            ))}
          </div>
        ) : (
          <button onClick={() => setKidsOpen(true)} className="mt-1 ml-4 sm:ml-6 text-[11px] font-semibold text-[#00928F] hover:text-[#007B6C]">
            ▸ {kids.length} underlying acts (delegated / implementing / assessments)
          </button>
        )
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
  const core = b.instruments.filter(i => relevanceOf(i) === 'core').length;
  const adjacent = b.instruments.filter(i => relevanceOf(i) === 'adjacent').length;
  const moving = b.instruments.filter(i => STATUS[i.id]).length;
  return { binding, tertiary, soft, supporting, lensHits, core, adjacent, moving };
}

function DomainPanel({
  branch,
  open,
  onToggle,
  activeLenses,
  activeRings,
  activeTiers,
  colourMode,
  movingOnly,
  activeDg,
  onDgClick,
  query,
}: {
  branch: DomainBranch;
  open: boolean;
  onToggle: () => void;
  activeLenses: Set<LensId>;
  activeRings: Set<MandateRelevance>;
  activeTiers: Set<Tier>;
  colourMode: ColourMode;
  movingOnly: boolean;
  activeDg: string | null;
  onDgClick: (dg: string) => void;
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
    // "Moving now": keep it if it or any child carries a status entry.
    // Ring/tier chips filter likewise on the act or its children.
    const visible = topLevel.filter(t => {
      const kids = childrenOf.get(t.id) ?? [];
      const textOk = matchesQuery(t, query) || kids.some(k => matchesQuery(k, query));
      const movingOk = !movingOnly || STATUS[t.id] || kids.some(k => STATUS[k.id]);
      const ringTierOk =
        matchesRingTier(t, activeRings, activeTiers) || kids.some(k => matchesRingTier(k, activeRings, activeTiers));
      const dgOk = matchesDg(t, activeDg) || kids.some(k => matchesDg(k, activeDg));
      return textOk && movingOk && ringTierOk && dgOk;
    });
    return { topLevel: visible.sort(sortInstruments), childrenOf, visibleCount: visible.length };
  }, [branch, query, movingOnly, activeRings, activeTiers, activeDg]);

  const stats = useMemo(() => branchStats(branch, activeLenses), [branch, activeLenses]);
  const filtering = Boolean(query) || movingOnly || activeRings.size > 0 || activeTiers.size > 0 || Boolean(activeDg);
  if (filtering && visibleCount === 0) return null;

  return (
    <div className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-3 sm:px-4 py-2.5 text-left hover:bg-[#F9FAFB] dark:hover:bg-white/5 transition-colors"
      >
        <span className="text-[#00928F] text-[12px] w-3 shrink-0" aria-hidden>{open ? '▾' : '▸'}</span>
        <h2 className="font-bold text-[13px] sm:text-[14px] text-[#3D5265] dark:text-[var(--mh-fg)] inline m-0">{branch.name}</h2>
        <span className="text-[11px] text-[#808285] dark:text-[var(--mh-muted)]">
          {stats.binding} binding · {stats.tertiary + stats.supporting} underlying · {stats.soft} soft law
        </span>
        {colourMode === 'mandate' && (
          <span className="text-[11px] whitespace-nowrap">
            <span className="font-semibold" style={{ color: RELEVANCE_META.core.color }}>{stats.core} core</span>
            {' · '}
            <span className="font-semibold" style={{ color: RELEVANCE_META.adjacent.color }}>{stats.adjacent} adjacent</span>
          </span>
        )}
        {stats.moving > 0 && (
          <span className="text-[11px] font-semibold text-[#B83230]" title="Instruments the 2025-26 legislative agenda is moving">
            {stats.moving} moving
          </span>
        )}
        {stats.lensHits !== null && (
          <span className="text-[11px] font-semibold text-[#007B6C]">{stats.lensHits} in lens</span>
        )}
        <span className="ml-auto inline-flex flex-wrap items-center gap-2">
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
              <InstrumentRow key={i.id} i={i} childrenOf={childrenOf} activeLenses={activeLenses} colourMode={colourMode} activeDg={activeDg} onDgClick={onDgClick} />
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
          Legend — instrument types, lenses, mandate rings, status
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
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]">
              Mandate rings
              <span className="ml-2 font-normal normal-case tracking-normal text-[#808285] dark:text-[var(--mh-muted)]">
                Secretariat working interpretation of Art. 3(2)(b) of the Climate Law — AI-drafted per instrument, pending review.
              </span>
            </p>
            <div className="mt-1.5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {RELEVANCE_ORDER.map(r => (
                <div key={r} className="flex items-start gap-2">
                  <span className="mt-[3px] inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: RELEVANCE_META[r].color }} />
                  <p className="text-[11px] leading-snug text-[#54728C] dark:text-[var(--mh-muted)]">
                    <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">{RELEVANCE_META[r].label}.</span>{' '}
                    {RELEVANCE_META[r].description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]">
              Lead Commission service
              <span className="ml-2 font-normal normal-case tracking-normal text-[#808285] dark:text-[var(--mh-muted)]">
                Each act carries the DG(s) that lead the file (bold = chef de file, up to two co-leads; &ldquo;—&rdquo; = primary
                law, owned by the Member States). Click a DG chip to filter the tree to that service&rsquo;s files — useful for
                targeting advice at the right part of the Commission. AI-drafted attribution, pending review.
              </span>
            </p>
          </div>
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]">
              Legislative status
              <span className="ml-2 font-normal normal-case tracking-normal text-[#808285] dark:text-[var(--mh-muted)]">
                Where the 2025-26 agenda is moving an instrument; “?” marks unconfirmed entries.
              </span>
            </p>
            <div className="mt-1.5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {(Object.keys(STATUS_META) as InstrumentStatus[]).map(s => (
                <div key={s} className="flex items-start gap-2">
                  <span className="mt-[2px] text-[9px] uppercase tracking-wide px-1 py-[1px] rounded border font-semibold shrink-0"
                        style={{ color: STATUS_META[s].color, borderColor: `${STATUS_META[s].color}66`, background: `${STATUS_META[s].color}10` }}>
                    {STATUS_META[s].label}
                  </span>
                  <p className="text-[11px] leading-snug text-[#54728C] dark:text-[var(--mh-muted)]">{STATUS_META[s].description}</p>
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
  const [activeRings, setActiveRings] = useState<Set<MandateRelevance>>(new Set());
  const [activeTiers, setActiveTiers] = useState<Set<Tier>>(new Set());
  const [colourMode, setColourMode] = useState<ColourMode>('lens');
  const [movingOnly, setMovingOnly] = useState(false);
  const [activeDg, setActiveDg] = useState<string | null>(null);
  const [openDomains, setOpenDomains] = useState<Set<string>>(new Set());
  const [machineryOpen, setMachineryOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [rawQuery, setRawQuery] = useState('');
  // Debounced: filtering re-runs per branch over 200+ instruments per keystroke.
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQuery(rawQuery.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // ---- shareable URL state (read once on mount, mirror on change) ----
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const lens = (p.get('lens') ?? '').split(',').filter((l): l is LensId => LENS_ORDER.includes(l as LensId));
    if (lens.length) setActiveLenses(new Set(lens));
    const rings = (p.get('rings') ?? '').split(',').filter((r): r is MandateRelevance => RELEVANCE_ORDER.includes(r as MandateRelevance));
    if (rings.length) setActiveRings(new Set(rings));
    const tiers = (p.get('tiers') ?? '').split(',').filter((t): t is Tier => TIER_ORDER.includes(t as Tier));
    if (tiers.length) setActiveTiers(new Set(tiers));
    if (p.get('view') === 'mandate') setColourMode('mandate');
    if (p.get('moving') === '1') setMovingOnly(true);
    const dg = p.get('dg');
    if (dg && DG_META[dg]) setActiveDg(dg);
    const q = p.get('q');
    if (q) setRawQuery(q);
    const open = (p.get('open') ?? '').split(',').filter(id => DOMAIN_BRANCHES.some(b => b.id === id));
    if (open.length) setOpenDomains(new Set(open));
    // Per-instrument permalink: expand the owning branch and scroll to the row.
    const hash = window.location.hash.slice(1);
    if (hash) {
      const owner = DOMAIN_BRANCHES.find(b => b.instruments.some(i => i.id === hash));
      if (owner) {
        setOpenDomains(prev => new Set([...prev, owner.id]));
        setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: 'center' }), 150);
      }
    }
  }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const set = (key: string, val: string) => (val ? p.set(key, val) : p.delete(key));
    set('lens', LENS_ORDER.filter(l => activeLenses.has(l)).join(','));
    set('rings', RELEVANCE_ORDER.filter(r => activeRings.has(r)).join(','));
    set('tiers', TIER_ORDER.filter(t => activeTiers.has(t)).join(','));
    set('view', colourMode === 'mandate' ? 'mandate' : '');
    set('moving', movingOnly ? '1' : '');
    set('dg', activeDg ?? '');
    set('q', query);
    set('open', DOMAIN_BRANCHES.filter(b => openDomains.has(b.id)).map(b => b.id).join(','));
    const qs = p.toString();
    window.history.replaceState(null, '', `${qs ? `?${qs}` : window.location.pathname}${window.location.hash}`);
  }, [activeLenses, activeRings, activeTiers, colourMode, movingOnly, activeDg, query, openDomains]);

  const totals = useMemo(() => {
    const all = DOMAIN_BRANCHES.flatMap(b => b.instruments);
    return {
      instruments: all.length,
      branches: domainBranches.length,
      unverified: all.filter(i => !i.confident).length,
      moving: all.filter(i => STATUS[i.id]).length,
      perLens: Object.fromEntries(LENS_ORDER.map(l => [l, all.filter(i => i.lenses.includes(l)).length])) as Record<LensId, number>,
      perRing: {
        core: all.filter(i => relevanceOf(i) === 'core').length,
        adjacent: all.filter(i => relevanceOf(i) === 'adjacent').length,
        context: all.filter(i => relevanceOf(i) === 'context').length,
      },
    };
  }, [domainBranches.length]);

  // Treaties + primary-rank instruments form the top tier; the rest of the
  // primary-law branch (comitology, Better Regulation…) is the "machinery" strip.
  const treaties = (primaryBranch?.instruments ?? [])
    .filter(i => ['treaty', 'protocol', 'charter'].includes(i.type) && !i.parentId)
    .sort(sortInstruments);
  const machinery = (primaryBranch?.instruments ?? [])
    .filter(i => !['treaty', 'protocol', 'charter'].includes(i.type) && !i.parentId)
    .sort(sortInstruments);
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

  const toggleDg = (dg: string) => setActiveDg(prev => (prev === dg ? null : dg));

  /** One-click Board view: mandate colouring, no lens filter, all branches open. */
  function applyBoardView() {
    setColourMode('mandate');
    setActiveLenses(new Set());
    setOpenDomains(new Set(domainBranches.map(b => b.id)));
  }

  /**
   * "Export brief": a markdown one-pager of the CURRENT selection (lenses,
   * rings, tiers, moving filter, search) for pasting into advice drafts —
   * unlike the CSV export, which always dumps the full register.
   */
  function exportBrief() {
    const parts: string[] = ['# EU Policy Hierarchy — selection brief', ''];
    const filters: string[] = [];
    if (activeLenses.size) filters.push(`lenses: ${[...activeLenses].join(', ')}`);
    if (activeRings.size) filters.push(`mandate rings: ${[...activeRings].join(', ')}`);
    if (activeTiers.size) filters.push(`tiers: ${[...activeTiers].join(', ')}`);
    if (movingOnly) filters.push('moving now only');
    if (activeDg) filters.push(`DG: ${activeDg}`);
    if (query) filters.push(`search: "${query}"`);
    parts.push(`_Filters: ${filters.length ? filters.join(' · ') : 'none (full register)'}. AI-compiled working data — verify before citing._`, '');
    for (const b of DOMAIN_BRANCHES) {
      const rows = b.instruments.filter(
        i =>
          matchesQuery(i, query) &&
          matchesLenses(i, activeLenses) &&
          matchesRingTier(i, activeRings, activeTiers) &&
          matchesDg(i, activeDg) &&
          (!movingOnly || STATUS[i.id]),
      );
      if (rows.length === 0) continue;
      parts.push(`## ${b.name}`, '');
      for (const i of rows.sort(sortInstruments)) {
        const st = STATUS[i.id];
        const m = MANDATE[i.id];
        const recs = RECOMMENDATIONS[i.id] ?? [];
        const dgs = LEAD_DGS[i.id] ?? [];
        parts.push(
          `- **${i.title}** (${i.officialRef}, ${i.year})${dgs.length && dgs[0] !== 'NONE' ? ` · ${dgs.join('/')}` : ''} — [EUR-Lex](${i.eurlexUrl})${i.confident ? '' : ' ⚠ unverified'}`,
        );
        parts.push(`  ${i.summary}`);
        if (m) parts.push(`  _Ring: ${m.relevance} — ${m.hook}_`);
        if (st) parts.push(`  _Status: ${STATUS_META[st.status].label}${st.confident ? '' : ' (unconfirmed)'} — ${st.note}${st.sourceRef ? ` (${st.sourceRef})` : ''}_`);
        if (recs.length) parts.push(`  _Board advice: ${recs.join(', ')}_`);
      }
      parts.push('');
    }
    const blob = new Blob([parts.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'policy-hierarchy-brief.md';
    a.click();
    URL.revokeObjectURL(a.href);
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
            {totals.branches} policy domains, every instrument linked to EUR-Lex. Colour it by cross-cutting lens,
            or by the Board&rsquo;s mandate rings to see how far &ldquo;Union measures&rdquo; reaches beyond the climate files.
          </>
        }
      />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* AI-compilation disclaimer */}
        <div className="rounded-lg border border-[#FF9933]/40 bg-[#FFEDDE]/60 dark:bg-[#FF9933]/10 px-4 py-2.5 text-[12px] leading-relaxed">
          <span className="font-bold">AI-compiled register.</span> The instrument list ({totals.instruments} entries),
          the mandate-ring assignments and the status layer were compiled by AI agents from model knowledge, without
          live EUR-Lex verification. Entries the agents were unsure about are flagged{' '}
          <span className="uppercase text-[10px] font-semibold border border-[#FF9933]/60 text-[#D97706] rounded px-1">unverified</span>{' '}
          ({totals.unverified} of {totals.instruments}) and link to a EUR-Lex search instead of a CELEX record.
          Treat this as a structural map pending Secretariat verification, not a citable register.
        </div>

        {/* The mandate argument */}
        <MandatePanel counts={totals.perRing} />

        {/* Controls */}
        <div className="rounded-lg border border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-[#808285] dark:text-[var(--mh-muted)]">Colour by</span>
            <div className="inline-flex rounded-md border border-[#E6E7E8] dark:border-[var(--mh-border)] overflow-hidden" role="group" aria-label="Colouring mode">
              <button
                onClick={() => setColourMode('lens')}
                aria-pressed={colourMode === 'lens'}
                className={`px-2.5 py-1 text-[12px] font-semibold ${colourMode === 'lens' ? 'bg-[#00928F] text-white' : 'text-[#54728C] hover:bg-[#F3F4F5] dark:hover:bg-white/5'}`}
              >
                Lenses
              </button>
              <button
                onClick={() => setColourMode('mandate')}
                aria-pressed={colourMode === 'mandate'}
                className={`px-2.5 py-1 text-[12px] font-semibold ${colourMode === 'mandate' ? 'bg-[#00928F] text-white' : 'text-[#54728C] hover:bg-[#F3F4F5] dark:hover:bg-white/5'}`}
              >
                Mandate rings
              </button>
            </div>
            <button
              onClick={applyBoardView}
              className="rounded border border-[#007B6C] text-[#007B6C] px-2.5 py-1 text-[12px] font-semibold hover:bg-[#007B6C] hover:text-white transition-colors"
              title="Mandate colouring on, all branches expanded — the hierarchy as the Board reads it"
            >
              Board view
            </button>
            <button
              onClick={() => setMovingOnly(m => !m)}
              aria-pressed={movingOnly}
              className={`rounded border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                movingOnly ? 'bg-[#B83230] border-[#B83230] text-white' : 'border-[#B83230]/60 text-[#B83230] hover:bg-[#FBEAEA]'
              }`}
              title="Only instruments the 2025-26 legislative agenda is moving (proposals, revisions, omnibus reopenings, announced reviews)"
            >
              Moving now · {totals.moving}
            </button>
            {activeDg && (
              <button
                onClick={() => setActiveDg(null)}
                className="rounded-full border border-[#3D5265] bg-[#3D5265] text-white px-2.5 py-1 text-[12px] font-semibold"
                title={`Filtered to files led or co-led by ${DG_META[activeDg]} — click to clear`}
              >
                {activeDg} ✕
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
              <button
                onClick={exportCsv}
                className="rounded border border-[#E6E7E8] dark:border-[var(--mh-border)] px-2.5 py-1 text-[12px] hover:border-[#00928F] hover:text-[#007B6C]"
                title="Download the full register (instruments, lenses, mandate rings, status) as CSV"
              >
                Export CSV
              </button>
              <button
                onClick={exportBrief}
                className="rounded border border-[#E6E7E8] dark:border-[var(--mh-border)] px-2.5 py-1 text-[12px] hover:border-[#00928F] hover:text-[#007B6C]"
                title="Download the current selection (filters applied) as a markdown brief for advice drafting"
              >
                Export brief
              </button>
            </span>
          </div>
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-[#808285] dark:text-[var(--mh-muted)]"
                  title="Unlike lenses (which highlight), these chips filter the tree down to matching instruments.">
              Show only
            </span>
            {RELEVANCE_ORDER.map(r => {
              const on = activeRings.has(r);
              return (
                <button
                  key={r}
                  onClick={() =>
                    setActiveRings(prev => {
                      const next = new Set(prev);
                      if (next.has(r)) next.delete(r);
                      else next.add(r);
                      return next;
                    })
                  }
                  aria-pressed={on}
                  className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold transition-colors"
                  style={{
                    borderColor: RELEVANCE_META[r].color,
                    background: on ? RELEVANCE_META[r].color : 'transparent',
                    color: on ? '#fff' : RELEVANCE_META[r].color,
                  }}
                  title={RELEVANCE_META[r].description}
                >
                  <span className="inline-block w-2 h-2 rounded-sm" style={{ background: on ? '#fff' : RELEVANCE_META[r].color }} />
                  {RELEVANCE_META[r].label.split(' ')[0]}
                </button>
              );
            })}
            <span className="text-[#DCDDDE]" aria-hidden>|</span>
            {TIER_ORDER.map(t => {
              const on = activeTiers.has(t);
              return (
                <button
                  key={t}
                  onClick={() =>
                    setActiveTiers(prev => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      return next;
                    })
                  }
                  aria-pressed={on}
                  className={`rounded border px-2 py-0.5 text-[11px] transition-colors ${
                    on
                      ? 'bg-[#3D5265] border-[#3D5265] text-white'
                      : 'border-[#DCDDDE] dark:border-[var(--mh-border)] text-[#54728C] dark:text-[var(--mh-muted)] hover:border-[#3D5265]'
                  }`}
                  title={TIER_META[t].description}
                >
                  {TIER_META[t].label}
                </button>
              );
            })}
            {(activeRings.size > 0 || activeTiers.size > 0) && (
              <button
                onClick={() => {
                  setActiveRings(new Set());
                  setActiveTiers(new Set());
                }}
                className="text-[11px] text-[#808285] hover:text-[#3D5265] dark:hover:text-[var(--mh-fg)] underline"
              >
                clear
              </button>
            )}
          </div>
          {colourMode === 'mandate' ? (
            <p className="text-[11px] text-[#808285] dark:text-[var(--mh-muted)]">
              Mandate view — {totals.perRing.core} core · {totals.perRing.adjacent} adjacent · {totals.perRing.context} context.
              Each row shows its &ldquo;Board angle&rdquo;; context instruments are dimmed. Lenses still filter on top.
            </p>
          ) : (
            activeLenses.size === 0 && (
              <p className="text-[11px] text-[#808285] dark:text-[var(--mh-muted)]">
                No lens active — the hierarchy is shown neutrally. Toggle a lens to highlight every instrument that carries
                that theme (an act can carry several: CBAM is climate <em>and</em> competitiveness).
              </p>
            )
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
                const rel = relevanceOf(t);
                return (
                  <div key={t.id}
                       className={`rounded-md border border-[#E6E7E8] dark:border-[var(--mh-border)] px-2.5 py-2 ${lit ? '' : 'opacity-40'}`}
                       style={colourMode === 'mandate' ? { boxShadow: `inset 3px 0 0 ${RELEVANCE_META[rel].color}` } : undefined}>
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
                      <InstrumentRow key={i.id} i={i} childrenOf={machineryChildren} activeLenses={activeLenses} colourMode={colourMode} activeDg={activeDg} onDgClick={toggleDg} />
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
                activeRings={activeRings}
                activeTiers={activeTiers}
                colourMode={colourMode}
                movingOnly={movingOnly}
                activeDg={activeDg}
                onDgClick={toggleDg}
                query={query}
              />
            ))}
          </div>
        </section>

        {/* Legend */}
        <Legend open={legendOpen} onToggle={() => setLegendOpen(o => !o)} />

        <p className="text-[11px] text-[#808285] dark:text-[var(--mh-muted)] text-center pb-2">
          Beta module · M · 42 · AI-compiled structural map of the EU acquis · mandate rings & status are a Secretariat
          working layer, pending verification against EUR-Lex
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
