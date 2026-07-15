'use client';

/**
 * Clean Tech — Side 2: the EXTERNAL role of the clean-tech industries.
 * ---------------------------------------------------------------------------
 * The complement of the emissions wheel (Side 1). Where Side 1 asks "how do we
 * remove the emissions of the manufacturing subsectors we already have?", this
 * side asks "what do the NEW manufacturing industries — solar PV, wind
 * turbines, batteries, EVs, electrolysers, heat pumps — do for everyone ELSE'S
 * emissions?". Four connected blocks:
 *
 *   1. the support matrix — which clean-tech industry decarbonises which
 *      demand sector (power, transport, buildings, industry, agriculture);
 *   2. the industry detail — per clean-tech industry: sourced mitigation
 *      potential, modelled deployment in robust scenarios, and the EU's
 *      manufacturing/competitiveness position;
 *   3. the scenario evidence — sectoral emission cuts to 2040 from the
 *      European Commission's 2040-target impact assessment, each sector
 *      linked back to the clean technologies that deliver the modelled cut;
 *   4. the priority read — an editorial synthesis (clearly flagged, like the
 *      clean-vs-old overlay on Side 1) of where mitigation leverage and
 *      EU competitiveness meet.
 *
 * All data lives in `../cleantech-external-role.ts`; every data point carries
 * a source link — the priority read is the only editorial layer and is
 * flagged as such.
 */

import { useMemo, useState } from 'react';
import {
  CLEANTECH_INDUSTRIES,
  DEMAND_SECTORS,
  EXTERNAL_HEADLINES,
  EXTERNAL_PRIORITIES,
  EXTERNAL_PRIORITY_NOTE,
  PATHWAY_CAVEAT,
  SECTOR_PATHWAYS,
  type CleanTechIndustry,
  type DemandSector,
  type SectorPathway,
} from '../cleantech-external-role';
import type { Source, Sourced } from '../cleantech-catalogue';

/* ----------------------------------------------------------------- helpers */

function SourceLink({ source }: { source: Source }) {
  const label = [source.org, source.year].filter(Boolean).join(', ');
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${source.title}${source.year ? ` (${source.year})` : ''} — ${source.url}`}
      className="inline-flex items-center gap-0.5 align-baseline text-[10.5px] font-medium text-primary-light hover:text-primary hover:underline"
    >
      <span aria-hidden>↗</span>
      <span>{label || 'source'}</span>
    </a>
  );
}

function SourcedList({ items }: { items: Sourced[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((e, i) => (
        <li key={i} className="text-[12px] leading-snug text-grey-800 dark:text-[var(--mh-fg)]">
          <span className="font-semibold">{e.value}</span>
          {e.note ? <span className="text-grey-500 dark:text-[var(--mh-muted)]"> — {e.note}</span> : null}{' '}
          <SourceLink source={e.source} />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ 1 · matrix */

function SupportMatrix({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="pb-2 pr-3 text-left text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
              Clean-tech industry ↓ supports sector →
            </th>
            {DEMAND_SECTORS.map((s) => (
              <th key={s.id} className="pb-2 text-center">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ background: s.color }}
                >
                  <span aria-hidden>{s.icon}</span>
                  {s.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CLEANTECH_INDUSTRIES.map((t) => {
            const isSel = t.id === selected;
            return (
              <tr key={t.id}>
                {/* Finding #16: this row header was a <td>, losing the row/column relationship
                    for screen-reader users navigating cell-by-cell; <th scope="row"> keeps the
                    identical styling/button behaviour while fixing table semantics. */}
                <th scope="row" className="border-t border-grey-100 py-1 pr-3 text-left font-normal dark:border-[var(--mh-border)]">
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
                      isSel
                        ? 'border-primary bg-surface-blue dark:bg-[var(--mh-bg)]'
                        : 'border-transparent hover:border-grey-200 hover:bg-grey-50 dark:hover:border-[var(--mh-border)] dark:hover:bg-[var(--mh-bg)]'
                    }`}
                  >
                    <span
                      className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-[13px] text-white"
                      style={{ background: t.color }}
                      aria-hidden
                    >
                      {t.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-semibold text-grey-900 dark:text-[var(--mh-fg)]">{t.name}</span>
                      <span className="block truncate font-mono text-[9.5px] text-grey-500 dark:text-[var(--mh-muted)]">
                        NACE {t.nace.join(' · ')}
                      </span>
                    </span>
                  </button>
                </th>
                {DEMAND_SECTORS.map((s) => {
                  const cell = t.supports.find((c) => c.sectorId === s.id);
                  return (
                    <td key={s.id} className="border-t border-grey-100 py-1 text-center align-middle dark:border-[var(--mh-border)]">
                      {cell ? (
                        <button
                          type="button"
                          onClick={() => onSelect(t.id)}
                          title={`${t.name} → ${s.name} (${cell.role}): ${cell.note}`}
                          className="group inline-flex items-center justify-center"
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full border-2 transition group-hover:scale-125 ${
                              cell.role === 'primary' ? '' : 'bg-white dark:bg-[var(--mh-card)]'
                            }`}
                            style={{
                              borderColor: s.color,
                              background: cell.role === 'primary' ? s.color : undefined,
                            }}
                            // Finding #17: previously just "${cell.role} support", with no industry/sector
                            // name — the fuller context lived only in the (often-unreachable) title attribute.
                            aria-label={`${t.name} → ${s.name}: ${cell.role} support`}
                          />
                        </button>
                      ) : (
                        <span className="inline-block h-1 w-1 rounded-full bg-grey-200 dark:bg-[var(--mh-border)]" aria-hidden />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-grey-500 dark:text-[var(--mh-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-grey-500 bg-grey-500" /> primary lever for the
          sector&apos;s decarbonisation
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-grey-500 bg-white dark:bg-[var(--mh-card)]" /> supporting / enabling role
        </span>
        <span>— hover a dot for the mechanism; click for the industry detail.</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------- 2 · industry detail */

function IndustryDetail({ tech }: { tech: CleanTechIndustry }) {
  const sectorName = (id: string) => DEMAND_SECTORS.find((s) => s.id === id)?.name ?? id;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ background: tech.color }}
            >
              {tech.icon} {tech.name}
            </span>
            {tech.nace.map((c) => (
              <span
                key={c}
                className="rounded-full border border-grey-300 bg-grey-50 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-tertiary dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]"
              >
                {c}
              </span>
            ))}
          </div>
          <p className="text-[12px] leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">{tech.what}</p>
          {tech.naceNote ? <p className="mt-1 text-[10px] leading-snug text-grey-400 dark:text-[var(--mh-muted)]">{tech.naceNote}</p> : null}
        </div>
        <div className="rounded-lg bg-grey-50 p-2.5 dark:bg-[var(--mh-bg)]">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
            Sectors it decarbonises
          </div>
          <ul className="space-y-1">
            {tech.supports.map((c) => (
              <li key={c.sectorId} className="text-[11.5px] leading-snug text-grey-800 dark:text-[var(--mh-fg)]">
                <span
                  className="mr-1 inline-block h-2 w-2 rounded-full align-baseline"
                  style={{ background: DEMAND_SECTORS.find((s) => s.id === c.sectorId)?.color }}
                  aria-hidden
                />
                <span className="font-semibold">{sectorName(c.sectorId)}</span>
                <span className="text-grey-500 dark:text-[var(--mh-muted)]"> ({c.role})</span> — {c.note} <SourceLink source={c.source} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-grey-200 bg-white p-2.5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
            Mitigation potential — what the literature says
          </div>
          <SourcedList items={tech.mitigation} />
        </div>
        <div className="rounded-lg border border-grey-200 bg-white p-2.5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
            Deployment in robust 2040 modelling
          </div>
          <SourcedList items={tech.scenarioDeployment} />
        </div>
      </div>

      <div className="rounded-lg border border-grey-200 bg-white p-2.5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:text-[var(--mh-muted)]">
          Where the EU stands — manufacturing &amp; competitiveness
        </div>
        <SourcedList items={tech.euPosition} />
      </div>
    </div>
  );
}

/* ------------------------------------------------- 3 · scenario evidence */

const CHART = { w: 960, h: 300, padL: 46, padR: 8, padT: 18, padB: 66 };

function PathwayChart({
  onPickTech,
}: {
  onPickTech: (id: string) => void;
}) {
  const [hover, setHover] = useState<{ p: SectorPathway; label: string } | null>(null);

  const maxPct = 100;
  const innerW = CHART.w - CHART.padL - CHART.padR;
  const innerH = CHART.h - CHART.padT - CHART.padB;
  const groupW = innerW / SECTOR_PATHWAYS.length;

  const y = (pct: number) => CHART.padT + innerH - (Math.min(pct, maxPct) / maxPct) * innerH;

  const techById = useMemo(() => {
    const m = new Map<string, CleanTechIndustry>();
    CLEANTECH_INDUSTRIES.forEach((t) => m.set(t.id, t));
    return m;
  }, []);

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART.w} ${CHART.h}`}
          className="w-full min-w-[720px]"
          role="img"
          aria-label="Sectoral emission reductions to 2040 in the Commission impact assessment"
        >
          {/* gridlines */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <g key={pct}>
              <line
                x1={CHART.padL}
                x2={CHART.w - CHART.padR}
                y1={y(pct)}
                y2={y(pct)}
                stroke="var(--mh-border, #E2E8F0)"
                strokeWidth={1}
                strokeDasharray={pct === 0 ? undefined : '3 4'}
              />
              <text x={CHART.padL - 6} y={y(pct) + 3.5} textAnchor="end" fontSize={10} fill="var(--mh-muted, #94A3B8)">
                −{pct}%
              </text>
            </g>
          ))}

          {SECTOR_PATHWAYS.map((p, gi) => {
            const sector = DEMAND_SECTORS.find((s) => s.id === p.sectorId) as DemandSector;
            const gx = CHART.padL + gi * groupW;
            const barW = Math.min(38, (groupW - 28) / p.points.length);
            const totalBars = p.points.length * barW + (p.points.length - 1) * 6;
            const x0 = gx + (groupW - totalBars) / 2;
            return (
              <g key={p.sectorId}>
                {p.points.map((pt, i) => {
                  const bx = x0 + i * (barW + 6);
                  const by = y(pt.pct);
                  const isHover = hover?.p.sectorId === p.sectorId && hover.label === pt.label;
                  return (
                    <g
                      key={pt.label}
                      onMouseEnter={() => setHover({ p, label: pt.label })}
                      onMouseLeave={() => setHover(null)}
                      style={{ cursor: 'default' }}
                    >
                      <rect
                        x={bx}
                        y={by}
                        width={barW}
                        height={CHART.padT + innerH - by}
                        rx={3}
                        fill={sector.color}
                        opacity={i === p.points.length - 1 ? 0.95 : 0.45}
                        stroke={isHover ? 'var(--mh-fg, #0F172A)' : 'none'}
                        strokeWidth={isHover ? 1.5 : 0}
                      />
                      <text x={bx + barW / 2} y={by - 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--mh-fg, #334155)">
                        −{pt.pct}%
                      </text>
                      <text
                        x={bx + barW / 2}
                        y={CHART.padT + innerH + 12}
                        textAnchor="middle"
                        fontSize={9}
                        fill="var(--mh-muted, #64748B)"
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
                <text
                  x={gx + groupW / 2}
                  y={CHART.padT + innerH + 27}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={700}
                  fill={sector.color}
                >
                  {sector.icon} {sector.name}
                </text>
                {/* driven-by chips (foreignObject keeps them clickable) */}
                <foreignObject x={gx} y={CHART.padT + innerH + 33} width={groupW} height={30}>
                  <div className="flex flex-wrap items-start justify-center gap-1">
                    {p.drivenBy.map((tid) => {
                      const t = techById.get(tid);
                      if (!t) return null;
                      return (
                        <button
                          key={tid}
                          type="button"
                          onClick={() => onPickTech(tid)}
                          title={`${t.name} — a modelled driver of the ${sector.name.toLowerCase()} cut; click for detail`}
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[8.5px] text-white transition hover:scale-125"
                          style={{ background: t.color }}
                        >
                          {t.icon}
                        </button>
                      );
                    })}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      {/* hover / source strip */}
      <div className="mt-1 min-h-[34px] rounded-lg bg-grey-50 px-3 py-2 text-[11.5px] leading-snug text-grey-700 dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]">
        {hover ? (
          <>
            <span className="font-semibold">
              {DEMAND_SECTORS.find((s) => s.id === hover.p.sectorId)?.name}, 2040 · {hover.label}:
            </span>{' '}
            −{hover.p.points.find((pt) => pt.label === hover.label)?.pct}% vs {hover.p.baseYear} ({hover.p.scenario}).{' '}
            {hover.p.note ? <span className="text-grey-500 dark:text-[var(--mh-muted)]">{hover.p.note} </span> : null}
            <SourceLink source={hover.p.source} />
          </>
        ) : (
          <span className="text-grey-500 dark:text-[var(--mh-muted)]">
            Hover a bar for the exact figure, scenario and source; the coloured chips under each sector are the
            clean-tech industries that deliver the modelled cut — click one to open its detail above.
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- 4 · priority read */

function PriorityCards() {
  const techById = new Map(CLEANTECH_INDUSTRIES.map((t) => [t.id, t]));
  return (
    <div>
      <div className="mb-2 rounded-lg border border-accent-orange bg-surface-orange p-2.5 text-[11px] leading-snug text-grey-700 dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]">
        <span className="font-bold uppercase tracking-wide text-accent-orange">Editorial overlay</span> —{' '}
        {EXTERNAL_PRIORITY_NOTE}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {EXTERNAL_PRIORITIES.map((p) => {
          const t = techById.get(p.techId);
          if (!t) return null;
          return (
            <div key={p.techId} className="rounded-lg border border-grey-200 bg-white p-3 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-grey-900 text-[11px] font-bold text-white dark:bg-[var(--mh-border)]">
                  {p.rank}
                </span>
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-[13px] text-white"
                  style={{ background: t.color }}
                  aria-hidden
                >
                  {t.icon}
                </span>
                <span className="text-[13px] font-bold text-grey-900 dark:text-[var(--mh-fg)]">{t.name}</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-snug text-grey-700 dark:text-[var(--mh-muted)]">
                <span className="font-semibold text-grey-900 dark:text-[var(--mh-fg)]">Mitigation leverage: </span>
                {p.rationale}
              </p>
              <p className="mt-1.5 text-[11.5px] leading-snug text-grey-700 dark:text-[var(--mh-muted)]">
                <span className="font-semibold text-grey-900 dark:text-[var(--mh-fg)]">Competitiveness read: </span>
                {p.competitiveness}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

export default function ExternalRolePanel() {
  const [selectedTech, setSelectedTech] = useState<string>(CLEANTECH_INDUSTRIES[0]?.id ?? '');
  const tech = CLEANTECH_INDUSTRIES.find((t) => t.id === selectedTech) ?? CLEANTECH_INDUSTRIES[0];

  const pickTech = (id: string) => {
    setSelectedTech(id);
    document.getElementById('external-industry-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="space-y-6">
      {/* headline, sourced facts */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {EXTERNAL_HEADLINES.map((f, i) => (
          <div key={i} className="rounded-lg border border-grey-200 bg-white p-3 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
            <div className="text-[15px] font-bold leading-tight text-grey-900 dark:text-[var(--mh-fg)]">{f.value}</div>
            <p className="mt-1 text-[11px] leading-snug text-grey-600 dark:text-[var(--mh-muted)]">{f.note}</p>
            <div className="mt-1">
              <SourceLink source={f.source} />
            </div>
          </div>
        ))}
      </div>

      {/* 1 · who supports whom */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-grey-900 dark:text-[var(--mh-fg)]">
          1 · Who supports whom — the clean-tech industries and the sectors they decarbonise
        </h3>
        <p className="mb-3 mt-1 max-w-text text-[12px] leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">
          Six new manufacturing industries — themselves NACE Section&nbsp;C activities — whose products cut emissions
          almost entirely <em>outside</em> the factory gate: in power, transport, buildings, other industry and
          agriculture. The matrix maps each industry to the sectors its products decarbonise.
        </p>
        <SupportMatrix selected={tech?.id ?? ''} onSelect={pickTech} />
      </section>

      {/* 2 · industry detail */}
      <section id="external-industry-detail" className="rounded-xl border border-grey-200 bg-grey-50 p-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)]">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-grey-900 dark:text-[var(--mh-fg)]">
          2 · Industry detail — mitigation potential, modelled deployment, EU position
        </h3>
        {tech ? <IndustryDetail tech={tech} /> : null}
      </section>

      {/* 3 · scenario evidence */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-grey-900 dark:text-[var(--mh-fg)]">
          3 · The scenario evidence — sectoral cuts to 2040 in the Commission&apos;s impact assessment
        </h3>
        <p className="mb-3 mt-1 max-w-text text-[12px] leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">
          The European Commission&apos;s 2040-target impact assessment models emissions falling in{' '}
          <em>every</em> sector. The bars show the modelled reduction per sector; the chips underneath are the
          clean-tech industries whose products deliver that cut in the modelling — the external role made visible.
        </p>
        <PathwayChart onPickTech={pickTech} />
        <p className="mt-2 text-[10.5px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">{PATHWAY_CAVEAT}</p>
      </section>

      {/* 4 · priority read */}
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-grey-900 dark:text-[var(--mh-fg)]">
          4 · Priority &amp; competitiveness read — where leverage and EU strength meet
        </h3>
        <PriorityCards />
      </section>
    </div>
  );
}
