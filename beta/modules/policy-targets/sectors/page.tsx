'use client';
/**
 * M·36 — Policy Targets · Sector summaries (beta).
 * ------------------------------------------------
 * One section per sector/system (eight) plus one for the cross-cutting targets
 * that fall under none of them, built from the v5 Masterfile's "Clean targets"
 * tab: objectives and targets still in effect (beyond 2026), de-duplicated,
 * each with a human-authored layman short version.
 *
 * Each section combines the summary list and the timeline figure: the left
 * side of every row carries the short-form target with its badges (mandatory
 * vs indicative, mitigation/adaptation, first/second order) and linked
 * indicators; the right side is the target's temporal mark on a shared
 * 2020–2050 axis (deadline ◆, applies-onward →, bounded window ▬, stepped
 * window with interim dates, recurring ⟳). Second-order targets are collapsed
 * behind a per-sector toggle so each sector opens on its header targets.
 *
 * Colour follows climate-relevance using the register's validated trio
 * (mitigation teal / adaptation orange / both indigo; grey is reserved for
 * "not climate-specific" and never carries identity alone — every mark also
 * has its direct label and shape). Palette re-validated for CVD and contrast
 * on both surfaces (see the module's summary page).
 */
import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import {
  sectorTargets,
  effectiveTargets,
  targetsOfSector,
  SECTOR_META,
  CLIMATE_META,
  type SectorTarget,
  type SectorKey,
  type ClimateRelevance,
} from '@/data/sector-targets';

const VIZ_CSS = `
.st-viz {
  --viz-mitigation: #0d9488;
  --viz-adaptation: #c2410c;
  --viz-both: #4f46e5;
  --viz-none: #64748b;
  --viz-grid: #e2e8f0;
  --viz-now: #94a3b8;
}
html.dark .st-viz {
  --viz-mitigation: #0fa093;
  --viz-adaptation: #d95926;
  --viz-both: #7b73e8;
  --viz-none: #7a8699;
  --viz-grid: #24303d;
  --viz-now: #5b6672;
}
`;

const CLIMATE_VAR: Record<ClimateRelevance, string> = {
  mitigation: 'var(--viz-mitigation)',
  adaptation: 'var(--viz-adaptation)',
  both: 'var(--viz-both)',
  none: 'var(--viz-none)',
};

const Y0 = 2020, Y1 = 2050;
const NOW = 2026;
const pct = (y: number) => `${(((Math.min(Math.max(y, Y0), Y1)) - Y0) / (Y1 - Y0)) * 100}%`;

type SectionKey = SectorKey | 'crosscutting';

const SECTIONS: { key: SectionKey; label: string; blurb: string }[] = [
  ...SECTOR_META.map((s) => ({
    key: s.key as SectionKey,
    label: s.label,
    blurb: s.lens === 'adaptation-critical'
      ? 'One of the two systems that matter above all for adaptation.'
      : 'Relevant for both mitigation and adaptation.',
  })),
  {
    key: 'crosscutting',
    label: 'Cross-cutting',
    blurb: 'Economy-wide targets that fall under none of the eight sectors — the Climate Law objectives, effort sharing, adaptation visions and just-transition goals that frame all sectoral action.',
  },
];

function obligationLabel(t: SectorTarget): { label: string; color: string; bg: string } {
  return t.obligation === 'mandatory'
    ? { label: 'Mandatory', color: '#b91c1c', bg: '#fef2f2' }
    : { label: 'Indicative', color: '#6d28d9', bg: '#faf5ff' };
}

function Badge({ label, color, bg, title }: { label: string; color: string; bg?: string; title?: string }) {
  return (
    <span title={title} className="inline-block text-[10px] font-semibold px-1.5 py-px rounded whitespace-nowrap" style={{ color, background: bg ?? color + '18' }}>
      {label}
    </span>
  );
}

/** The temporal mark for one target on the shared 2020–2050 track. */
function TimelineMark({ t }: { t: SectorTarget }) {
  const c = CLIMATE_VAR[t.climate];
  const { kind, start, end, note } = t.temporal;
  const title = `${t.timeline}${note ? ` · ${note}` : ''}`;
  const hollow = t.obligation !== 'mandatory';
  const fill = hollow ? 'transparent' : c;
  const yearLabel = (y: number, left: string) => (
    <span className="absolute -top-[13px] text-[9.5px] tabular-nums text-tertiary dark:text-[var(--mh-muted)]" style={{ left, transform: 'translateX(-50%)' }}>{y}</span>
  );
  if (kind === 'by' && end != null) {
    return (
      <div className="relative h-full" title={title}>
        {yearLabel(end, pct(end))}
        <span className="absolute top-1/2 w-[9px] h-[9px] rotate-45 border-2" style={{ left: pct(end), background: fill, borderColor: c, transform: 'translate(-50%,-50%) rotate(45deg)' }} />
      </div>
    );
  }
  if (kind === 'from' && start != null) {
    return (
      <div className="relative h-full" title={title}>
        {yearLabel(start, pct(start))}
        <span className="absolute top-1/2 h-[5px] rounded-l-[4px] -translate-y-1/2" style={{ left: pct(start), right: 0, background: hollow ? 'transparent' : c, border: `1.5px solid ${c}`, maskImage: 'linear-gradient(90deg, #000 70%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, #000 70%, transparent)' }} />
      </div>
    );
  }
  if ((kind === 'range' || kind === 'stepped') && start != null && end != null) {
    return (
      <div className="relative h-full" title={title}>
        {yearLabel(start, pct(start))}
        {end !== start && yearLabel(end, pct(end))}
        <span className="absolute top-1/2 h-[5px] rounded-[4px] -translate-y-1/2" style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})`, minWidth: 6, background: hollow ? 'transparent' : c, border: `1.5px solid ${c}` }} />
        {kind === 'stepped' && (
          <span className="absolute top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ left: `calc(${pct(end)} + 5px)`, color: c }}>⋯</span>
        )}
      </div>
    );
  }
  if (kind === 'periodic' && start != null) {
    return (
      <div className="relative h-full" title={title}>
        {yearLabel(start, pct(start))}
        <span className="absolute top-1/2 w-[9px] h-[9px] rounded-full border-2 -translate-y-1/2" style={{ left: pct(start), background: fill, borderColor: c, transform: 'translate(-50%,-50%)' }} />
        <span className="absolute top-1/2 -translate-y-1/2 border-t-2 border-dotted" style={{ left: `calc(${pct(start)} + 6px)`, right: 0, borderColor: c, opacity: 0.55 }} />
        <span className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ right: 2, color: c }}>⟳</span>
      </div>
    );
  }
  return <div className="relative h-full" title={title} />;
}

/** Faint 5-year grid + the “now” line, layered behind every row of a section. */
function TrackGrid({ withYears }: { withYears?: boolean }) {
  const years = [2020, 2025, 2030, 2035, 2040, 2045, 2050];
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {years.map((y) => (
        <span key={y} className="absolute top-0 bottom-0 border-l" style={{ left: pct(y), borderColor: 'var(--viz-grid)' }} />
      ))}
      <span className="absolute top-0 bottom-0 border-l-2 border-dashed" style={{ left: pct(NOW), borderColor: 'var(--viz-now)' }} />
      {withYears && years.map((y) => (
        <span key={`l${y}`} className="absolute bottom-0 text-[9.5px] tabular-nums text-tertiary dark:text-[var(--mh-muted)]" style={{ left: pct(y), transform: 'translateX(-50%)' }}>{y}</span>
      ))}
    </div>
  );
}

function TargetRow({ t }: { t: SectorTarget }) {
  const [open, setOpen] = useState(false);
  const ob = obligationLabel(t);
  return (
    <div className={`grid grid-cols-1 md:grid-cols-[minmax(300px,380px)_1fr] gap-x-3 border-t border-grey-100 dark:border-[var(--mh-border)] ${t.crossRef ? 'opacity-50' : ''}`}>
      <div className="py-2 pl-3 pr-1">
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-left w-full group" title="Show verbatim text, provision and source">
          <span className={`text-[12.5px] leading-snug ${t.order === 1 ? 'font-semibold' : 'font-normal'} text-tertiary-dark dark:text-[var(--mh-fg)] group-hover:underline decoration-grey-300`}>
            {t.order === 2 && <span aria-hidden className="text-tertiary mr-1">└</span>}
            {t.short}
          </span>
        </button>
        <div className="mt-1 flex flex-wrap gap-1 items-center">
          <Badge label={ob.label} color={ob.color} bg={ob.bg} title="Obligation: mandatory (binding law) vs indicative (voluntary / soft law)" />
          <Badge label={CLIMATE_META[t.climate].label} color={CLIMATE_META[t.climate].color} title={t.climateArgument || undefined} />
          {t.label !== 'target' && <Badge label={t.label[0].toUpperCase() + t.label.slice(1)} color="#2563eb" />}
          {t.crossRef && <Badge label="Cross-reference" color="#64748b" bg="#f1f5f9" title={t.revisionNote} />}
          {!t.crossRef && t.revisionNote && <Badge label="Revised (Aug 2026)" color="#a16207" bg="#fef9c3" title={t.revisionNote} />}
        </div>
        {t.indicators.length > 0 && (
          <div className="mt-1 text-[10.5px] text-tertiary dark:text-[var(--mh-muted)]">
            <span className="font-semibold">Indicators:</span> {t.indicators.join('; ')}
          </div>
        )}
        {open && (
          <div className="mt-2 rounded border border-grey-200 dark:border-[var(--mh-border)] bg-grey-50 dark:bg-[var(--mh-bg)] p-2 text-[11px] text-tertiary dark:text-[var(--mh-muted)] leading-relaxed">
            <div className="font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">{t.policyShort} · {t.provision || `target #${t.num}`}</div>
            <div className="mt-1 whitespace-pre-wrap">{t.text}</div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              <span>Timeline: {t.timeline || 'unspecified'}</span>
              {t.source && <a href={t.source} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">EUR-Lex ↗</a>}
            </div>
            {t.revisionNote && <div className="mt-1.5 text-[#a16207] dark:text-[#d3a94b]">{t.revisionNote}</div>}
          </div>
        )}
      </div>
      <div className="relative hidden md:block min-h-[40px]">
        <TrackGrid />
        <TimelineMark t={t} />
      </div>
      <div className="relative md:hidden h-9 mx-3 mb-2">
        <TrackGrid />
        <TimelineMark t={t} />
      </div>
    </div>
  );
}

function SectorSection({ section }: { section: { key: SectionKey; label: string; blurb: string } }) {
  const [showSecond, setShowSecond] = useState(false);
  const all = useMemo(() => targetsOfSector(section.key), [section.key]);
  const effective = all.filter((t) => !t.crossRef);
  const firstOrder = all.filter((t) => t.order === 1);
  const secondOrder = all.filter((t) => t.order === 2);
  const shown = showSecond ? all : firstOrder;

  const policies = useMemo(() => {
    const by = new Map<string, SectorTarget[]>();
    for (const t of shown) {
      if (!by.has(t.policyShort)) by.set(t.policyShort, []);
      by.get(t.policyShort)!.push(t);
    }
    for (const ts of by.values()) ts.sort((a, b) => (a.order - b.order) || ((a.temporal.end ?? a.temporal.start ?? 9999) - (b.temporal.end ?? b.temporal.start ?? 9999)) || (a.num - b.num));
    return [...by.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [shown]);

  const nPolicies = new Set(effective.map((t) => t.policyShort)).size;
  const nMandatory = effective.filter((t) => t.obligation === 'mandatory').length;
  const byClimate = { mitigation: 0, adaptation: 0, both: 0, none: 0 } as Record<ClimateRelevance, number>;
  for (const t of effective) byClimate[t.climate]++;

  return (
    <section id={section.key} className="mb-8 scroll-mt-16">
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] overflow-hidden">
        <div className="px-3 py-3 border-b border-grey-200 dark:border-[var(--mh-border)] bg-grey-50 dark:bg-[var(--mh-bg)]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[16px] font-bold text-tertiary-dark dark:text-[var(--mh-fg)]">{section.label}</h2>
            <span className="text-[12px] text-tertiary dark:text-[var(--mh-muted)]">
              {effective.length} targets/objectives from {nPolicies} acts · {nMandatory} mandatory, {effective.length - nMandatory} indicative ·{' '}
              {byClimate.mitigation} mitigation, {byClimate.adaptation} adaptation, {byClimate.both} both{byClimate.none ? `, ${byClimate.none} not climate-specific` : ''}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-tertiary dark:text-[var(--mh-muted)]">{section.blurb}</p>
          {secondOrder.length > 0 && (
            <button type="button" onClick={() => setShowSecond((v) => !v)}
              className="mt-2 text-[11.5px] px-2.5 py-1 rounded border border-grey-300 dark:border-[var(--mh-border)] text-tertiary-dark dark:text-[var(--mh-fg)] font-medium hover:bg-grey-100 dark:hover:bg-[var(--mh-card)]">
              {showSecond ? `Hide ${secondOrder.length} second-order targets` : `Show ${secondOrder.length} second-order targets`} {showSecond ? '▴' : '▾'}
            </button>
          )}
        </div>

        {/* axis header (desktop) */}
        <div className="hidden md:grid grid-cols-[minmax(300px,380px)_1fr] gap-x-3">
          <div className="py-1 pl-3 text-[10.5px] font-semibold text-tertiary dark:text-[var(--mh-muted)]">
            Target (short form) — click for the verbatim text
          </div>
          <div className="relative h-6">
            <TrackGrid withYears />
          </div>
        </div>

        {policies.map(([policy, ts]) => (
          <div key={policy}>
            <div className="px-3 py-1.5 bg-grey-100/70 dark:bg-[var(--mh-bg)] border-t border-grey-200 dark:border-[var(--mh-border)] text-[11px] font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">
              {policy} <span className="font-normal text-tertiary dark:text-[var(--mh-muted)]">· {ts[0].docType} · {ts.length} shown</span>
            </div>
            {ts.map((t) => <TargetRow key={t.id} t={t} />)}
          </div>
        ))}
        {shown.length === 0 && (
          <div className="px-3 py-6 text-center text-[12px] text-tertiary">No first-order targets — expand the second-order list above.</div>
        )}
      </div>
    </section>
  );
}

export default function SectorSummariesPage() {
  const overall = useMemo(() => {
    const eff = effectiveTargets;
    const byClimate = { mitigation: 0, adaptation: 0, both: 0, none: 0 } as Record<ClimateRelevance, number>;
    for (const t of eff) byClimate[t.climate]++;
    return {
      total: eff.length,
      crossRefs: sectorTargets.length - eff.length,
      policies: new Set(eff.map((t) => t.policyShort)).size,
      mandatory: eff.filter((t) => t.obligation === 'mandatory').length,
      firstOrder: eff.filter((t) => t.order === 1).length,
      revised: sectorTargets.filter((t) => t.revisionNote).length,
      byClimate,
      bySector: SECTIONS.map((s) => {
        const ts = targetsOfSector(s.key).filter((t) => !t.crossRef);
        const cl = { mitigation: 0, adaptation: 0, both: 0, none: 0 } as Record<ClimateRelevance, number>;
        for (const t of ts) cl[t.climate]++;
        return { ...s, n: ts.length, mandatory: ts.filter((t) => t.obligation === 'mandatory').length, cl };
      }),
    };
  }, []);
  const maxN = Math.max(...overall.bySector.map((s) => s.n));

  return (
    <div className="min-h-screen bg-grey-50 dark:bg-[var(--mh-bg)] st-viz">
      <style dangerouslySetInnerHTML={{ __html: VIZ_CSS }} />
      <SiteHeader />
      <PageHero
        title="Policy Targets — Sector summaries"
        subtitle="The clean analysis set of the register — objectives and targets still in effect beyond 2026, de-duplicated — summarised for the eight sectors/systems plus the cross-cutting frame, each with a layman short form, its obligation and climate-relevance, linked indicators, and a timeline of when it starts and must be achieved."
      />

      <div className="max-w-[1200px] mx-auto px-3 sm:px-5 py-5">
        <div className="flex flex-wrap items-center gap-2 mb-4 text-[12px]">
          <Link href="/beta/policy-targets" className="px-2.5 py-1 rounded border border-grey-300 dark:border-[var(--mh-border)] text-tertiary-dark dark:text-[var(--mh-fg)] hover:bg-grey-100">← Full register</Link>
          <Link href="/beta/policy-targets/summary" className="px-2.5 py-1 rounded border border-grey-300 dark:border-[var(--mh-border)] text-tertiary-dark dark:text-[var(--mh-fg)] hover:bg-grey-100">▤ Register statistics</Link>
          <Link href="/beta/policy-targets/frameworks" className="px-2.5 py-1 rounded border border-grey-300 dark:border-[var(--mh-border)] text-tertiary-dark dark:text-[var(--mh-fg)] hover:bg-grey-100">▦ Progress-framework suggestions</Link>
          <a href="/data/eu-policy-targets-master.xlsx" download className="px-2.5 py-1 rounded border border-grey-300 dark:border-[var(--mh-border)] text-tertiary-dark dark:text-[var(--mh-fg)] hover:bg-grey-100">⬇ Masterfile (Excel)</a>
        </div>

        {/* ── Overall summary across sectors ── */}
        <section className="mb-8">
          <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
            <h2 className="text-[16px] font-bold text-tertiary-dark dark:text-[var(--mh-fg)]">Overall summary across sectors</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mt-3">
              <Stat n={overall.total} label="Live targets & objectives" color="#00928F" />
              <Stat n={overall.policies} label="Acts & strategies" color="#3D5265" />
              <Stat n={`${Math.round((overall.mandatory / overall.total) * 100)}%`} label={`Mandatory (${overall.mandatory})`} color="#b91c1c" />
              <Stat n={overall.firstOrder} label="First-order (header) targets" color="#7c2d12" />
              <Stat n={overall.byClimate.mitigation + overall.byClimate.both} label="Mitigation-relevant" color="var(--viz-mitigation)" />
              <Stat n={overall.byClimate.adaptation + overall.byClimate.both} label="Adaptation-relevant" color="var(--viz-adaptation)" />
            </div>

            {/* composition bars per sector */}
            <div className="mt-4 space-y-1.5">
              {overall.bySector.map((s) => (
                <a key={s.key} href={`#${s.key}`} className="grid grid-cols-[170px_1fr_44px] items-center gap-2 group" title={`${s.n} targets · ${s.mandatory} mandatory · mitigation ${s.cl.mitigation}, adaptation ${s.cl.adaptation}, both ${s.cl.both}${s.cl.none ? `, not climate-specific ${s.cl.none}` : ''}`}>
                  <span className="text-[11.5px] text-tertiary-dark dark:text-[var(--mh-fg)] group-hover:underline truncate">{s.label}</span>
                  <span className="flex h-[14px] rounded-[4px] overflow-hidden" style={{ width: `${(s.n / maxN) * 100}%`, minWidth: 20 }}>
                    {(['mitigation', 'both', 'adaptation', 'none'] as ClimateRelevance[]).map((c) => s.cl[c] > 0 && (
                      <span key={c} style={{ width: `${(s.cl[c] / s.n) * 100}%`, background: CLIMATE_VAR[c], marginRight: 2 }} />
                    ))}
                  </span>
                  <span className="text-[11px] tabular-nums text-tertiary dark:text-[var(--mh-muted)]">{s.n}</span>
                </a>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[10.5px] text-tertiary dark:text-[var(--mh-muted)]">
              {(['mitigation', 'both', 'adaptation', 'none'] as ClimateRelevance[]).map((c) => (
                <span key={c} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: CLIMATE_VAR[c] }} />{CLIMATE_META[c].label}</span>
              ))}
              <span className="ml-auto italic">A target can serve several sectors, so sector counts overlap.</span>
            </div>

            <div className="mt-4 text-[12.5px] leading-relaxed text-tertiary dark:text-[var(--mh-muted)] space-y-2">
              <p>
                The clean set carries <strong className="text-tertiary-dark dark:text-[var(--mh-fg)]">{overall.total} live targets and objectives from {overall.policies} acts and strategies</strong> ({overall.crossRefs} further proposal-stage rows are kept only as cross-references). Transport and mobility ({overall.bySector.find((s) => s.key === 'transport')?.n}) and energy ({overall.bySector.find((s) => s.key === 'energy')?.n}) carry the densest target coverage — dominated by the AFIR infrastructure milestones, the CO2 fleet standards, ReFuelEU/FuelEU fuel trajectories and the RED III sub-targets — followed by industry ({overall.bySector.find((s) => s.key === 'industry')?.n}), where the circular-economy acts (packaging, waste, batteries, single-use plastics) supply most of the dated goals. Land and marine ecosystems ({overall.bySector.find((s) => s.key === 'ecosystems')?.n}) is the sector where adaptation-relevant targets are most present, essentially through the Nature Restoration Regulation.
              </p>
              <p>
                Water ({overall.bySector.find((s) => s.key === 'water')?.n}) and health ({overall.bySector.find((s) => s.key === 'health')?.n}) — the two adaptation-critical systems — remain comparatively thin, and what exists there is mostly indicative: the Zero Pollution Action Plan plus the Water Resilience Strategy, whose Annex II intermediate targets for 2027–2033 (free-flowing rivers, water-body status, industrial water use, farmland soil-health practices, urban wastewater plans) compile the water-relevant goals of the biodiversity, industrial-emissions, CAP and wastewater instruments and reach into the nature, industry, agri-food and buildings sections above. Almost all quantified, binding milestones across sectors cluster on 2030; beyond it the register thins to the 2040 climate target, the 2035 zero-emission vehicle dates, the aviation/maritime fuel trajectories to 2050, and the restoration and building-stock endpoints in 2050 — visible in each sector's timeline below.
              </p>
            </div>
          </div>
        </section>

        {/* sector nav */}
        <nav className="sticky top-0 z-20 -mx-3 px-3 py-2 mb-4 bg-grey-50/95 dark:bg-[var(--mh-bg)]/95 backdrop-blur border-b border-grey-200 dark:border-[var(--mh-border)] flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => (
            <a key={s.key} href={`#${s.key}`} className="text-[11.5px] px-2 py-1 rounded-full border border-grey-300 dark:border-[var(--mh-border)] text-tertiary-dark dark:text-[var(--mh-fg)] hover:bg-white dark:hover:bg-[var(--mh-card)]">{s.label}</a>
          ))}
        </nav>

        {/* mark legend */}
        <div className="mb-4 rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">
          <span className="font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">Timeline marks:</span>
          <span>◆ deadline (“by”)</span>
          <span>▬→ applies onward from a start date</span>
          <span>▬ bounded window · ⋯ stepped interim dates</span>
          <span>●⟳ recurring / periodic obligation</span>
          <span>hollow = indicative, filled = mandatory</span>
          <span>┆ 2026 (today)</span>
        </div>

        {SECTIONS.map((s) => <SectorSection key={s.key} section={s} />)}

        <p className="text-[11px] text-tertiary dark:text-[var(--mh-muted)] mb-8">
          Source: Masterfile v5 (August 2026), tab “Clean targets” — <a href="/data/eu-policy-targets-master.xlsx" className="text-secondary hover:underline">download the workbook</a>. Rows added, corrected or reclassified in this iteration carry a “Revised (Aug 2026)” badge whose tooltip (and the Masterfile column “Revision note”) explains the change. Short versions are editorial simplifications — always check the verbatim text (click any target) and the EUR-Lex source before citing.
        </p>
      </div>
    </div>
  );
}

function Stat({ n, label, color }: { n: number | string; label: string; color: string }) {
  return (
    <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-3 py-2">
      <div className="text-[20px] font-bold leading-none" style={{ color }}>{n}</div>
      <div className="text-[10.5px] text-tertiary dark:text-[var(--mh-muted)] mt-1">{label}</div>
    </div>
  );
}
