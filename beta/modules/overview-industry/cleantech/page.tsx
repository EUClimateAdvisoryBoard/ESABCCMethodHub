'use client';

/**
 * Overview Industry — Clean Tech (interactive tree explorer + charts).
 * -------------------------------------------------------------------
 * A two-pane, expandable TREE of EU industrial decarbonisation:
 *   left  — a taxonomy tree (EU industry → branch → subsector → technology),
 *           expandable per node, click to select;
 *   right — a detail panel for the selected node with a representative photo,
 *           marginal-abatement-cost (MAC) and technology-readiness (TRL) charts,
 *           the real project pipeline (incl. FID) and a sourced rationale.
 * Up top: an emissions-split doughnut and an all-sector MAC summary curve.
 *
 * Every data point carries a source link — nothing is invented. See
 * `../cleantech-catalogue.ts` for the data and its sourcing rule.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  CATALOGUE,
  OVERVIEW_FACTS,
  BRANCHES,
  BRANCH_COLORS,
  TECH_METRICS,
  SUBSECTOR_IMAGES,
  EMISSIONS_SPLIT,
  EMISSIONS_SPLIT_TOTAL_MT,
  EMISSIONS_SPLIT_SOURCE,
  SECTOR_MACC,
  type Source,
  type Sourced,
  type Project,
  type Technology,
  type Subsector,
} from '../cleantech-catalogue';
import { CLEAN_TECH_READING_LIST } from '@/data/clean-tech-reading-list';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

/* ---------------------------------------------------------------- helpers */

const commonsImg = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`;
const commonsPage = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;

type Selection = { type: 'subsector' | 'tech'; id: string };

/** Flat index: every technology with its parent subsector. */
interface FlatTech {
  tech: Technology;
  sub: Subsector;
}

function SourceLink({ source, className = '' }: { source: Source; className?: string }) {
  const label = [source.org, source.year].filter(Boolean).join(', ');
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${source.title}${source.year ? ` (${source.year})` : ''} — ${source.url}`}
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium text-primary-light hover:text-primary hover:underline align-baseline ${className}`}
    >
      <span aria-hidden>↗</span>
      <span>{label || 'source'}</span>
    </a>
  );
}

function DataLeaf({ label, datum, accent }: { label: string; datum?: Sourced; accent: string }) {
  if (!datum) return null;
  return (
    <div className="rounded-md border border-grey-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{label}</span>
      </div>
      <div className="mt-1 text-sm text-grey-900">
        {datum.value}
        {datum.note ? <span className="text-grey-500"> — {datum.note}</span> : null}
      </div>
      <div className="mt-1">
        <SourceLink source={datum.source} />
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<Project['status'], { label: string; cls: string }> = {
  operational: { label: 'Operational', cls: 'bg-surface-green text-secondary-dark border-secondary-lighter' },
  construction: { label: 'Under construction', cls: 'bg-surface-blue text-primary border-primary-lighter' },
  fid: { label: 'FID taken', cls: 'bg-surface-teal text-secondary-dark border-secondary-lighter' },
  announced: { label: 'Announced (pre-FID)', cls: 'bg-surface-orange text-accent-orange border-accent-orange' },
  pilot: { label: 'Pilot / demo', cls: 'bg-surface-yellow text-tertiary border-grey-300' },
  cancelled: { label: 'Cancelled', cls: 'bg-grey-100 text-accent-red border-grey-300' },
};

function ProjectRow({ project }: { project: Project }) {
  const s = STATUS_STYLE[project.status];
  return (
    <div className="rounded-md border border-grey-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>{s.label}</span>
        <span className="text-sm font-semibold text-grey-900">{project.name}</span>
      </div>
      <div className="mt-1 text-xs text-grey-600">
        {[project.company, project.location, project.capacity].filter(Boolean).join(' · ')}
      </div>
      {project.fid ? (
        <div className="mt-1 text-xs text-tertiary">
          <span className="font-semibold">FID / status: </span>
          {project.fid}
        </div>
      ) : null}
      <div className="mt-1">
        <SourceLink source={project.source} />
      </div>
    </div>
  );
}

/** 1–9 technology-readiness scale as pips. */
function TrlScale({ low, high }: { low: number; high: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 9 }, (_, i) => {
        const n = i + 1;
        const on = n >= low && n <= high;
        return (
          <span
            key={n}
            title={`TRL ${n}`}
            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
              on ? 'text-white' : 'text-grey-400 bg-grey-100'
            }`}
            style={on ? { background: n <= 5 ? '#B45309' : n <= 7 ? '#CA8A04' : '#15803D' } : undefined}
          >
            {n}
          </span>
        );
      })}
    </div>
  );
}

/** Inline MAC range bar (single technology), €/tCO₂ on a shared scale. */
function MacBar({ low, high, note }: { low: number; high: number; note?: string }) {
  const MIN = -70;
  const MAX = 400;
  const span = MAX - MIN;
  const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));
  const l = ((clamp(low) - MIN) / span) * 100;
  const w = ((clamp(high) - clamp(low)) / span) * 100;
  const zero = ((0 - MIN) / span) * 100;
  const neg = low < 0;
  return (
    <div>
      <div className="relative h-6 w-full rounded bg-grey-100">
        <div className="absolute top-0 bottom-0 border-l border-grey-300" style={{ left: `${zero}%` }} />
        <div
          className="absolute top-1 bottom-1 rounded"
          style={{ left: `${l}%`, width: `${Math.max(w, 1.5)}%`, background: neg ? '#15803D' : '#0065A4' }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-grey-400">
        <span>−70</span>
        <span>€0</span>
        <span>150</span>
        <span>300</span>
        <span>€400+/tCO₂</span>
      </div>
      <div className="mt-0.5 text-sm font-semibold text-grey-900">
        €{low}–{high}/tCO₂{note ? <span className="ml-1 text-xs font-normal text-grey-500">({note})</span> : null}
      </div>
    </div>
  );
}

/** Representative photo for a subsector, with Commons attribution. */
function SubImage({ subId, alt }: { subId: string; alt: string }) {
  const file = SUBSECTOR_IMAGES[subId];
  const [broken, setBroken] = useState(false);
  if (!file || broken) {
    return (
      <div className="flex h-44 w-full items-center justify-center rounded-lg bg-gradient-to-br from-grey-100 to-grey-200 text-xs text-grey-400">
        (no image)
      </div>
    );
  }
  return (
    <figure className="relative overflow-hidden rounded-lg border border-grey-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={commonsImg(file)}
        alt={alt}
        onError={() => setBroken(true)}
        className="h-44 w-full object-cover"
        loading="lazy"
      />
      <figcaption className="absolute bottom-0 right-0 bg-black/45 px-1.5 py-0.5 text-[9px] text-white">
        <a href={commonsPage(file)} target="_blank" rel="noopener noreferrer" className="hover:underline">
          © Wikimedia Commons ↗
        </a>
      </figcaption>
    </figure>
  );
}

/* --------------------------------------------------------- detail panels */

function SubsectorDetail({ sub, onSelectTech }: { sub: Subsector; onSelectTech: (id: string) => void }) {
  const accent = BRANCH_COLORS[sub.branch];
  const macTechs = sub.technologies
    .map(t => ({ t, m: TECH_METRICS[t.id] }))
    .filter(x => x.m?.macLowEur != null && x.m?.macHighEur != null);

  const macData = {
    labels: macTechs.map(x => x.t.name),
    datasets: [
      {
        label: '€/tCO₂',
        data: macTechs.map(x => [x.m!.macLowEur!, x.m!.macHighEur!]),
        backgroundColor: accent,
        borderRadius: 3,
        barThickness: 16,
      },
    ],
  };

  return (
    <div>
      <div className="mb-3 flex items-start gap-3">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: accent }}>
          {sub.branch}
        </span>
        <h3 className="text-xl font-bold text-grey-900">{sub.name}</h3>
      </div>

      <SubImage subId={sub.id} alt={sub.name} />

      <p className="mt-3 text-sm text-grey-700">{sub.summary}</p>

      <div className="mt-3 rounded-lg bg-grey-50 p-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">EU emission profile</div>
        <ul className="space-y-1">
          {sub.emissions.map((e, i) => (
            <li key={i} className="text-sm text-grey-800">
              <span className="font-semibold">{e.value}</span>
              {e.note ? <span className="text-grey-500"> — {e.note}</span> : null} <SourceLink source={e.source} />
            </li>
          ))}
        </ul>
      </div>

      {macTechs.length > 0 ? (
        <div className="mt-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
            Abatement cost by technology (€/tCO₂, sourced range)
          </div>
          <div style={{ height: Math.max(120, macTechs.length * 42) }}>
            <Bar
              data={macData as never}
              options={{
                indexAxis: 'y' as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { title: { display: true, text: '€/tCO₂' }, grid: { color: '#EEE' } }, y: { grid: { display: false } } },
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
          Mitigation technologies ({sub.technologies.length}) — click for detail
        </div>
        <div className="flex flex-wrap gap-2">
          {sub.technologies.map(t => {
            const m = TECH_METRICS[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTech(t.id)}
                className="rounded-lg border border-grey-200 bg-white px-3 py-2 text-left hover:border-primary hover:shadow-sm"
              >
                <div className="text-sm font-semibold text-grey-900">{t.name}</div>
                {m ? (
                  <div className="mt-0.5 text-[11px] text-grey-500">
                    TRL {m.trlLow}{m.trlHigh !== m.trlLow ? `–${m.trlHigh}` : ''}
                    {m.macLowEur != null ? ` · MAC €${m.macLowEur}–${m.macHighEur}/t` : ''}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TechDetail({ tech, sub, onBack }: { tech: Technology; sub: Subsector; onBack: () => void }) {
  const accent = BRANCH_COLORS[sub.branch];
  const m = TECH_METRICS[tech.id];
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-2 text-xs font-medium text-primary hover:underline">
        ← {sub.name}
      </button>
      <h3 className="text-xl font-bold text-grey-900">{tech.name}</h3>
      <p className="mt-2 text-sm text-grey-700">{tech.description}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-grey-200 bg-white p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
            Marginal abatement cost
          </div>
          {m?.macLowEur != null && m.macHighEur != null ? (
            <MacBar low={m.macLowEur} high={m.macHighEur} note={m.costNote} />
          ) : tech.mac ? (
            <div className="text-sm text-grey-900">{tech.mac.value}</div>
          ) : (
            <div className="text-sm text-grey-400">Not quantified — see rationale.</div>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3">
            {m?.macSource ? <SourceLink source={m.macSource} /> : null}
            {tech.mac && tech.mac.source.url !== m?.macSource?.url ? <SourceLink source={tech.mac.source} /> : null}
          </div>
        </div>

        <div className="rounded-lg border border-grey-200 bg-white p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
            Technology readiness (TRL 1–9)
          </div>
          {m ? <TrlScale low={m.trlLow} high={m.trlHigh} /> : null}
          <div className="mt-1 text-xs text-grey-600">{tech.trl?.value}</div>
          {tech.trl ? (
            <div className="mt-1">
              <SourceLink source={tech.trl.source} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <DataLeaf label="Availability" datum={tech.availability} accent={accent} />
      </div>

      {tech.projects.length ? (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
            Planned projects & Final Investment Decisions
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {tech.projects.map((p, i) => (
              <ProjectRow key={i} project={p} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
          Why costs are high · what hinders readiness · the scaling problem
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <DataLeaf label="Cost drivers" datum={tech.rationale.costDrivers} accent="#B83230" />
          <DataLeaf label="Readiness barriers" datum={tech.rationale.readinessBarriers} accent="#FF9933" />
          <DataLeaf label="Scaling problem" datum={tech.rationale.scaleProblems} accent="#6667AB" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ tree */

function TreeNode({
  sub,
  selection,
  expanded,
  onToggle,
  onSelectSub,
  onSelectTech,
}: {
  sub: Subsector;
  selection: Selection | null;
  expanded: boolean;
  onToggle: () => void;
  onSelectSub: () => void;
  onSelectTech: (id: string) => void;
}) {
  const accent = BRANCH_COLORS[sub.branch];
  const subActive = selection?.type === 'subsector' && selection.id === sub.id;
  return (
    <li className="relative">
      <div
        className={`flex items-center gap-1.5 rounded-md py-1 pl-1 pr-2 ${
          subActive ? 'bg-primary/10' : 'hover:bg-grey-100'
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="flex h-4 w-4 flex-none items-center justify-center rounded text-[11px] font-bold text-white"
          style={{ background: accent }}
        >
          {expanded ? '−' : '+'}
        </button>
        <button
          type="button"
          onClick={onSelectSub}
          className={`truncate text-left text-sm ${subActive ? 'font-bold text-primary' : 'text-grey-800'}`}
        >
          {sub.name}
          <span className="ml-1 text-[10px] text-grey-400">({sub.technologies.length})</span>
        </button>
      </div>
      {expanded ? (
        <ul className="ml-3 border-l border-grey-200 pl-3">
          {sub.technologies.map(t => {
            const active = selection?.type === 'tech' && selection.id === t.id;
            return (
              <li key={t.id} className="relative">
                <span className="absolute -left-3 top-3 h-px w-2.5 bg-grey-200" aria-hidden />
                <button
                  type="button"
                  onClick={() => onSelectTech(t.id)}
                  className={`block w-full truncate rounded py-1 pl-1 pr-2 text-left text-[13px] ${
                    active ? 'bg-primary/10 font-semibold text-primary' : 'text-grey-600 hover:bg-grey-100'
                  }`}
                >
                  {t.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

/** Branch colour legend. */
function BranchLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {BRANCHES.map(b => (
        <span key={b} className="flex items-center gap-1.5 text-[11px] text-grey-600">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BRANCH_COLORS[b] }} />
          {b}
        </span>
      ))}
    </div>
  );
}

/** Indicative sector marginal-abatement-cost curve (width = MtCO₂, height = €/tCO₂). */
function MaccChart({ onSelect }: { onSelect: (id: string) => void }) {
  const branchOf = (id: string) => CATALOGUE.find(s => s.id === id)?.branch;
  const blocks = [...SECTOR_MACC].sort((a, b) => (a.macLow + a.macHigh) / 2 - (b.macLow + b.macHigh) / 2);
  const totalMt = blocks.reduce((n, b) => n + b.potentialMt, 0);
  const W = 960, H = 320, mL = 52, mB = 64, mT = 16, mR = 14;
  const pw = W - mL - mR, ph = H - mT - mB;
  const maxCost = 380;
  const x = (mt: number) => mL + (mt / totalMt) * pw;
  const y = (c: number) => mT + ph - (Math.min(c, maxCost) / maxCost) * ph;
  let cum = 0;
  const rects = blocks.map(b => {
    const x0 = x(cum);
    cum += b.potentialMt;
    const x1 = x(cum);
    const mid = (b.macLow + b.macHigh) / 2;
    const branch = branchOf(b.subsectorId);
    return { b, x0, x1, mid, color: branch ? BRANCH_COLORS[branch] : '#64748b' };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Indicative sector marginal abatement cost curve">
      {[0, 100, 200, 300].map(c => (
        <g key={c}>
          <line x1={mL} x2={W - mR} y1={y(c)} y2={y(c)} stroke="#eef1f4" />
          <text x={mL - 6} y={y(c) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{c}</text>
        </g>
      ))}
      <text x={14} y={mT + ph / 2} fontSize="10" fill="#64748b" transform={`rotate(-90 14 ${mT + ph / 2})`} textAnchor="middle">
        €/tCO₂ (representative)
      </text>
      <line x1={mL} x2={W - mR} y1={y(0)} y2={y(0)} stroke="#cbd5e1" />
      {rects.map(({ b, x0, x1, mid, color }) => {
        const cx = (x0 + x1) / 2;
        const wide = x1 - x0 > 44;
        return (
          <g key={b.subsectorId} className="cursor-pointer" onClick={() => onSelect(b.subsectorId)}>
            <title>{`${b.label}: €${b.macLow}–${b.macHigh}/tCO₂ · ${b.potentialMt} Mt/yr · ${b.route}`}</title>
            <rect x={x0 + 1} y={y(mid)} width={Math.max(x1 - x0 - 2, 1)} height={y(0) - y(mid)} fill={color} fillOpacity={0.82} rx={2} />
            <line x1={cx} x2={cx} y1={y(b.macHigh)} y2={y(b.macLow)} stroke="#1e293b" strokeWidth={1} />
            <line x1={cx - 3} x2={cx + 3} y1={y(b.macHigh)} y2={y(b.macHigh)} stroke="#1e293b" strokeWidth={1} />
            <line x1={cx - 3} x2={cx + 3} y1={y(b.macLow)} y2={y(b.macLow)} stroke="#1e293b" strokeWidth={1} />
            {wide ? (
              <text x={cx} y={y(mid) - 4} textAnchor="middle" fontSize="9.5" fill="#334155" fontWeight="600">
                €{b.macLow}–{b.macHigh}
              </text>
            ) : null}
            <text x={cx} y={H - mB + 14} textAnchor="end" fontSize="9.5" fill="#475569" transform={`rotate(-35 ${cx} ${H - mB + 14})`}>
              {b.label}
            </text>
          </g>
        );
      })}
      <text x={mL + pw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#64748b">
        cumulative abatement potential (Mt CO₂/yr) →  ~{totalMt} Mt total
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------- page */

export default function CleanTechPage() {
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
  const [selection, setSelection] = useState<Selection>({ type: 'subsector', id: CATALOGUE[0].id });
  const [expanded, setExpanded] = useState<Set<string>>(new Set([CATALOGUE[0].id]));

  const flatTechs = useMemo<FlatTech[]>(
    () => CATALOGUE.flatMap(sub => sub.technologies.map(tech => ({ tech, sub }))),
    [],
  );

  const subsectors = useMemo(
    () => (branchFilter === 'all' ? CATALOGUE : CATALOGUE.filter(s => s.branch === branchFilter)),
    [branchFilter],
  );

  const counts = useMemo(() => {
    const techs = CATALOGUE.reduce((n, s) => n + s.technologies.length, 0);
    const projects = CATALOGUE.reduce((n, s) => n + s.technologies.reduce((m, t) => m + t.projects.length, 0), 0);
    return { subsectors: CATALOGUE.length, techs, projects };
  }, []);

  const selectTech = (id: string) => {
    const ft = flatTechs.find(x => x.tech.id === id);
    if (ft) {
      setSelection({ type: 'tech', id });
      setExpanded(prev => new Set(prev).add(ft.sub.id));
    }
  };
  const selectSub = (id: string) => setSelection({ type: 'subsector', id });
  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectedSub =
    selection.type === 'subsector'
      ? CATALOGUE.find(s => s.id === selection.id)!
      : flatTechs.find(x => x.tech.id === selection.id)!.sub;
  const selectedTech = selection.type === 'tech' ? flatTechs.find(x => x.tech.id === selection.id)!.tech : null;

  // ── all-sector MAC summary (sorted cost ladder) ──────────────────────────
  const macLadder = useMemo(() => {
    const rows = flatTechs
      .map(({ tech, sub }) => ({ tech, sub, m: TECH_METRICS[tech.id] }))
      .filter(r => r.m?.macLowEur != null && r.m?.macHighEur != null)
      .map(r => ({
        id: r.tech.id,
        name: r.tech.name,
        branch: r.sub.branch,
        low: r.m!.macLowEur!,
        high: r.m!.macHighEur!,
        mid: (r.m!.macLowEur! + r.m!.macHighEur!) / 2,
      }))
      .sort((a, b) => a.mid - b.mid);
    return rows;
  }, [flatTechs]);

  const macChart = {
    labels: macLadder.map(r => r.name),
    datasets: [
      {
        label: '€/tCO₂ (range)',
        data: macLadder.map(r => [r.low, r.high]),
        backgroundColor: macLadder.map(r => BRANCH_COLORS[r.branch]),
        borderRadius: 3,
      },
    ],
  };

  const emissionsChart = {
    labels: EMISSIONS_SPLIT.map(e => e.name),
    datasets: [
      {
        data: EMISSIONS_SPLIT.map(e => e.mt),
        backgroundColor: EMISSIONS_SPLIT.map(e => e.color),
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <SiteHeader />

      <main className="mx-auto max-w-wide px-4 py-8">
        <nav className="mb-4 text-sm text-grey-500">
          <Link href="/beta/overview-industry" className="hover:underline">
            Overview Industry
          </Link>
          <span className="mx-1">/</span>
          <span className="text-grey-700">Clean Tech</span>
        </nav>

        <header className="mb-6">
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Beta
            </span>
            <span className="rounded bg-grey-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
              Catalogue v0.2
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-grey-900">
            Clean Tech — the EU industrial decarbonisation explorer
          </h1>
          <p className="mt-2 max-w-text text-grey-700">
            An interactive tree of the EU-27 industry emission profile → each energy-intensive subsector → every
            mitigation technology → its marginal abatement cost, technology readiness, real project pipeline
            (including Final Investment Decisions) and the reasons costs are high, readiness lags and scale is hard.
            Every data point carries a source link — nothing is invented. MAC/TRL bands are shown as reported by the
            cited studies, not as settled single numbers. Emission, cost and project figures were independently
            fact-checked against their sources; where a source only partly supported a claim, the figure was corrected
            or flagged.
          </p>
        </header>

        {/* ── OVERVIEW CHARTS ─────────────────────────────────────────────── */}
        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-grey-900">EU industry emissions by activity</h2>
              <span className="text-xs text-grey-500">EU ETS 2023 · {EMISSIONS_SPLIT_TOTAL_MT} Mt CO₂</span>
            </div>
            <div className="flex items-center gap-4">
              <div style={{ width: 200, height: 200 }}>
                <Doughnut
                  data={emissionsChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: '58%',
                  }}
                />
              </div>
              <ul className="flex-1 space-y-1 text-xs">
                {EMISSIONS_SPLIT.map(e => (
                  <li key={e.name} className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ background: e.color }} />
                    <span className="flex-1 text-grey-700">{e.name}</span>
                    <span className="font-semibold text-grey-900">{e.mt} Mt</span>
                    <span className="w-10 text-right text-grey-400">
                      {Math.round((e.mt / EMISSIONS_SPLIT_TOTAL_MT) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-2">
              <SourceLink source={EMISSIONS_SPLIT_SOURCE} />
            </div>
          </div>

          <div className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-grey-900">Marginal abatement cost — all sectors</h2>
            <p className="mb-1 text-xs text-grey-500">
              Sourced €/tCO₂ ranges, sorted cheapest → costliest. Green = cost-negative (demand-side / circular). Click
              a bar to open the technology.
            </p>
            <div style={{ height: Math.max(180, macLadder.length * 24) }}>
              <Bar
                data={macChart as never}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  onClick: (_e, els) => {
                    if (els.length) selectTech(macLadder[els[0].index].id);
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: ctx => {
                          const r = macLadder[ctx.dataIndex];
                          return `€${r.low}–${r.high}/tCO₂ · ${r.branch}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: { title: { display: true, text: '€/tCO₂' }, grid: { color: '#EEE' } },
                    y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            </div>
          </div>
        </section>

        {/* ── SECTOR MACC ─────────────────────────────────────────────────── */}
        <section className="mb-6 rounded-xl border border-grey-200 bg-white p-4 shadow-sm">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-grey-900">
              Indicative marginal abatement cost curve — EU industry by sector
            </h2>
            <span className="text-xs text-grey-500">width = 2050 abatement potential · height = €/tCO₂ · click a block</span>
          </div>
          <MaccChart onSelect={selectSub} />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <BranchLegend />
            <p className="max-w-text text-[11px] text-grey-400">
              Indicative: each sector shown by a single primary route (cheaper partial levers like scrap-EAF or clinker
              substitution not drawn separately); cross-cutting levers omitted to avoid double-counting. Whiskers show the
              sourced €/tCO₂ range; hover a block for its route &amp; sources. Baselines mix ETS-activity and sector scopes.
            </p>
          </div>
        </section>

        {/* ── OVERVIEW FACTS ──────────────────────────────────────────────── */}
        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OVERVIEW_FACTS.map((f, i) => (
            <div key={i} className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm">
              <div className="text-2xl font-bold text-primary">{f.value}</div>
              <div className="text-sm font-semibold text-grey-900">{f.label}</div>
              <p className="mt-1 text-xs text-grey-600">{f.detail}</p>
              <div className="mt-2">
                <SourceLink source={f.source} />
              </div>
            </div>
          ))}
        </section>

        {/* ── BRANCH FILTER ───────────────────────────────────────────────── */}
        <section className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">Branch</span>
          <button
            type="button"
            onClick={() => setBranchFilter('all')}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              branchFilter === 'all' ? 'border-primary bg-primary text-white' : 'border-grey-300 bg-white text-tertiary hover:bg-grey-100'
            }`}
          >
            All ({counts.subsectors})
          </button>
          {BRANCHES.map(b => (
            <button
              key={b}
              type="button"
              onClick={() => setBranchFilter(b)}
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={
                branchFilter === b
                  ? { background: BRANCH_COLORS[b], borderColor: BRANCH_COLORS[b], color: 'white' }
                  : { borderColor: `${BRANCH_COLORS[b]}66`, color: BRANCH_COLORS[b], background: 'white' }
              }
            >
              {b}
            </button>
          ))}
          <span className="ml-auto text-xs text-grey-500">
            {counts.subsectors} subsectors · {counts.techs} technologies · {counts.projects} projects
          </span>
        </section>

        {/* ── TREE EXPLORER ───────────────────────────────────────────────── */}
        <section className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
          {/* Tree */}
          <div className="rounded-xl border border-grey-200 bg-white p-3 shadow-sm lg:sticky lg:top-4 lg:max-h-[80vh] lg:overflow-auto">
            <div className="mb-2 flex items-center gap-2 rounded-md bg-primary/5 px-2 py-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-xs font-bold text-white">▣</span>
              <span className="text-sm font-bold text-primary">EU industry</span>
            </div>
            {BRANCHES.filter(b => branchFilter === 'all' || branchFilter === b).map(branch => {
              const subs = subsectors.filter(s => s.branch === branch);
              if (!subs.length) return null;
              return (
                <div key={branch} className="mb-2">
                  <div className="mb-0.5 flex items-center gap-1.5 px-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BRANCH_COLORS[branch] }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">{branch}</span>
                  </div>
                  <ul className="ml-1 border-l border-grey-200 pl-2">
                    {subs.map(sub => (
                      <TreeNode
                        key={sub.id}
                        sub={sub}
                        selection={selection}
                        expanded={expanded.has(sub.id)}
                        onToggle={() => toggle(sub.id)}
                        onSelectSub={() => selectSub(sub.id)}
                        onSelectTech={selectTech}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Detail */}
          <div className="rounded-xl border border-grey-200 bg-white p-5 shadow-sm">
            {selectedTech ? (
              <TechDetail tech={selectedTech} sub={selectedSub} onBack={() => selectSub(selectedSub.id)} />
            ) : (
              <SubsectorDetail sub={selectedSub} onSelectTech={selectTech} />
            )}
          </div>
        </section>

        {/* ── BOTTLENECKS ─────────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-bold text-grey-900">Recurring bottlenecks (for policy)</h2>
          <p className="mb-3 max-w-text text-sm text-grey-600">
            Reading across the catalogue, the same barriers recur regardless of subsector — the candidate levers for
            policy, each grounded in the sourced rationale entries.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: 'Clean, cheap, firm power', d: 'Green steel, e-crackers, aluminium, heat pumps and hydrogen all hinge on abundant affordable clean electricity — the shared gate.' },
              { t: 'Green hydrogen cost & supply', d: 'Steel, ammonia, methanol and high-temperature heat need cheap hydrogen at scale; FID-stage projects lag announcements.' },
              { t: 'CO₂ transport & storage networks', d: 'Process CO₂ (cement, lime, steel, refining) can only be abated where shared CO₂ infrastructure exists — a chicken-and-egg everywhere.' },
              { t: 'First-of-a-kind cost premium', d: 'Demonstrated technologies carry a green premium (e.g. 5–24% on steel) and first-of-a-kind risk markets don’t yet reward.' },
              { t: 'Feedstock & circularity limits', d: 'Scrap, clean waste plastic, sustainable biomass and SCMs are finite — circularity is cheapest but capped by quality and supply.' },
              { t: 'Slow capital cycles', d: 'Furnaces, kilns and crackers are rebuilt every 10–20 years, so switchover is bounded by investment windows.' },
            ].map((b, i) => (
              <div key={i} className="rounded-xl border border-grey-200 bg-white p-4">
                <div className="text-sm font-bold text-grey-900">{b.t}</div>
                <p className="mt-1 text-xs text-grey-600">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── LITERATURE ──────────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-bold text-grey-900">Literature used ({CLEAN_TECH_READING_LIST.length})</h2>
          <p className="mb-3 max-w-text text-sm text-grey-600">
            The peer-reviewed papers and high-quality grey-literature reports behind this catalogue, seeded into the
            Reference Manager and the Industry Project Workspace under the <em>Clean Tech</em> chapter tag.
          </p>
          <ol className="space-y-1.5">
            {CLEAN_TECH_READING_LIST.map(r => (
              <li key={r.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    r.tier === 'scientific' ? 'bg-surface-blue text-primary' : 'bg-surface-orange text-accent-orange'
                  }`}
                >
                  {r.tier === 'scientific' ? 'peer-reviewed' : 'grey'}
                </span>
                <span className="text-grey-800">
                  <span className="font-semibold">{r.source}</span>
                  {r.year ? ` (${r.year})` : ''} — {r.title}{' '}
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary-light hover:text-primary hover:underline">
                    ↗ link
                  </a>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-10 text-xs text-grey-400">
          Catalogue v0.2 — interactive, fully-sourced. Photos via Wikimedia Commons (linked for licence/attribution).
          Trade flows is the sibling subpage (details to follow). Contributions extend{' '}
          <code>cleantech-catalogue.ts</code>; every new data point must carry a real source link.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
