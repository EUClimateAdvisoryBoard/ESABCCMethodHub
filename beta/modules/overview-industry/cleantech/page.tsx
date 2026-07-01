'use client';

/**
 * Overview Industry — Clean Tech.
 * ------------------------------------------------------------------
 * A big, collapsible catalogue that maps the EU-27 industry emission profile
 * to its energy-intensive subsectors, then to the mitigation ("clean tech")
 * options for each, and finally to the per-option evidence: marginal abatement
 * cost, technology readiness, availability, the real project pipeline (incl.
 * Final Investment Decisions), and a plain-language rationale for the high
 * costs, readiness gaps and scaling bottlenecks.
 *
 * Every data point carries a source link — nothing is invented. The catalogue
 * is meant to be mined for recurring themes and bottlenecks that can inform
 * policy (see the "bottleneck lenses" panel). See `../cleantech-catalogue.ts`
 * for the data and its sourcing rule.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  CATALOGUE,
  OVERVIEW_FACTS,
  BRANCHES,
  BRANCH_COLORS,
  type Source,
  type Sourced,
  type Project,
  type Technology,
  type Subsector,
} from '../cleantech-catalogue';
import { CLEAN_TECH_READING_LIST } from '@/data/clean-tech-reading-list';

/* ------------------------------------------------------------ primitives */

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

function DataLeaf({
  label,
  datum,
  accent,
}: {
  label: string;
  datum?: Sourced;
  accent: string;
}) {
  if (!datum) return null;
  return (
    <div className="rounded-md border border-grey-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">
          {label}
        </span>
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
        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
          {s.label}
        </span>
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

/* ------------------------------------------------------- technology node */

function TechnologyNode({ tech, accent }: { tech: Technology; accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span
          className="flex h-5 w-5 flex-none items-center justify-center rounded text-xs font-bold text-white"
          style={{ background: accent }}
          aria-hidden
        >
          {open ? '−' : '+'}
        </span>
        <span className="text-sm font-semibold text-grey-900">{tech.name}</span>
        <span className="ml-auto flex flex-none items-center gap-1">
          {tech.trl ? (
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-tertiary border border-grey-200">
              {tech.trl.value.split('(')[0].trim()}
            </span>
          ) : null}
          {tech.mac ? (
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-tertiary border border-grey-200">
              MAC {tech.mac.value.replace(/^≈\s*/, '')}
            </span>
          ) : null}
        </span>
      </button>

      {open ? (
        <div className="border-t border-grey-200 px-3 py-3">
          <p className="text-sm text-grey-700">{tech.description}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <DataLeaf label="Abatement cost (MAC)" datum={tech.mac} accent={accent} />
            <DataLeaf label="Technology readiness" datum={tech.trl} accent={accent} />
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
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------- subsector node */

function SubsectorNode({ sub, defaultOpen }: { sub: Subsector; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const accent = BRANCH_COLORS[sub.branch];
  return (
    <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: `${accent}33` }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span
          className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ background: accent }}
          aria-hidden
        >
          {open ? '−' : '+'}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-grey-900">{sub.name}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ background: accent }}
            >
              {sub.branch}
            </span>
            <span className="rounded-full border border-grey-200 bg-grey-50 px-2 py-0.5 text-[10px] font-medium text-tertiary">
              {sub.technologies.length} option{sub.technologies.length === 1 ? '' : 's'}
            </span>
          </span>
          <span className="mt-1 block text-sm text-grey-600">{sub.summary}</span>
        </span>
      </button>

      {open ? (
        <div className="border-t px-4 py-3" style={{ borderColor: `${accent}22` }}>
          {sub.emissions.length ? (
            <div className="mb-3 rounded-lg bg-grey-50 p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tertiary">
                EU emission profile
              </div>
              <ul className="space-y-1">
                {sub.emissions.map((e, i) => (
                  <li key={i} className="text-sm text-grey-800">
                    <span className="font-semibold">{e.value}</span>
                    {e.note ? <span className="text-grey-500"> — {e.note}</span> : null}{' '}
                    <SourceLink source={e.source} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            {sub.technologies.map(t => (
              <TechnologyNode key={t.id} tech={t} accent={accent} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- page */

export default function CleanTechPage() {
  const [branchFilter, setBranchFilter] = useState<string | 'all'>('all');
  const [expandAll, setExpandAll] = useState(false);

  const subsectors = useMemo(
    () => (branchFilter === 'all' ? CATALOGUE : CATALOGUE.filter(s => s.branch === branchFilter)),
    [branchFilter],
  );

  const counts = useMemo(() => {
    const techs = CATALOGUE.reduce((n, s) => n + s.technologies.length, 0);
    const projects = CATALOGUE.reduce(
      (n, s) => n + s.technologies.reduce((m, t) => m + t.projects.length, 0),
      0,
    );
    return { subsectors: CATALOGUE.length, techs, projects };
  }, []);

  return (
    <div className="min-h-screen bg-grey-50">
      <SiteHeader />

      <main className="mx-auto max-w-wide px-4 py-8">
        {/* breadcrumb */}
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
              Catalogue v0.1
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-grey-900">
            Clean Tech — the EU industrial decarbonisation catalogue
          </h1>
          <p className="mt-2 max-w-text text-grey-700">
            A collapsible map from the EU-27 industry emission profile → each energy-intensive
            subsector → every available mitigation technology → its abatement cost, technology
            readiness, availability, real project pipeline (including Final Investment Decisions),
            and the reasons costs are high, readiness lags and scale is hard. Built to be mined for
            recurring bottlenecks that can inform policy.
          </p>
          <p className="mt-3 max-w-text rounded-md border border-grey-200 bg-white p-3 text-sm text-grey-600">
            <span className="font-semibold text-grey-800">Sourcing rule.</span> Every data point
            carries a link to its source — nothing here is invented. Figures come from EU official
            data (EEA, EU ETS), the IPCC AR6 Industry chapter, IEA technology roadmaps/databases and
            peer-reviewed &amp; high-quality grey literature. MAC and TRL bands are study-dependent
            and are shown as reported by the cited source, not as settled single numbers. This is a
            curated first build — broad and extensible, with gaps marked rather than guessed.
          </p>
        </header>

        {/* Overview: EU emission profile */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-grey-900">EU industry emission profile</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        </section>

        {/* Controls */}
        <section className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
            Branch
          </span>
          <button
            type="button"
            onClick={() => setBranchFilter('all')}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              branchFilter === 'all'
                ? 'border-primary bg-primary text-white'
                : 'border-grey-300 bg-white text-tertiary hover:bg-grey-100'
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
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-grey-500">
              {counts.subsectors} subsectors · {counts.techs} technologies · {counts.projects} projects
            </span>
            <button
              type="button"
              onClick={() => setExpandAll(e => !e)}
              className="rounded-md border border-grey-300 bg-white px-3 py-1 text-xs font-medium text-tertiary hover:bg-grey-100"
            >
              {expandAll ? 'Collapse subsectors' : 'Expand subsectors'}
            </button>
          </div>
        </section>

        {/* The diagram */}
        <section className="space-y-3">
          {/* Root node */}
          <div className="rounded-xl border-2 border-primary bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
                ▣
              </span>
              <span className="text-base font-bold text-primary">EU industry</span>
              <span className="text-sm text-grey-600">
                — expand a subsector, then a technology, to drill into the evidence
              </span>
            </div>
          </div>

          {subsectors.map(sub => (
            <SubsectorNode key={`${sub.id}-${expandAll}`} sub={sub} defaultOpen={expandAll} />
          ))}
        </section>

        {/* Bottleneck lenses */}
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-bold text-grey-900">
            Recurring bottlenecks (for policy)
          </h2>
          <p className="mb-3 max-w-text text-sm text-grey-600">
            Reading across the catalogue, the same barriers recur regardless of subsector. These are
            the candidate levers for policy — each is grounded in the sourced rationale entries above.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                t: 'Clean, cheap, firm power',
                d: 'Green steel, e-crackers, aluminium, heat pumps and hydrogen all hinge on abundant affordable clean electricity. Power price and grid build-out are the shared gate.',
              },
              {
                t: 'Green hydrogen cost & supply',
                d: 'Steel, ammonia, methanol and some high-temperature heat need cheap hydrogen at scale. Electrolyser cost and FID-stage projects lagging announcements is the common brake.',
              },
              {
                t: 'CO₂ transport & storage networks',
                d: 'Process CO₂ (cement, lime, steel, refining) can only be abated where shared CO₂ infrastructure exists. Chicken-and-egg between capture and storage recurs everywhere.',
              },
              {
                t: 'First-of-a-kind cost premium',
                d: 'Demonstrated technologies carry a green premium (e.g. 5–24% on steel) and first-of-a-kind risk that markets do not yet reward without demand-side policy.',
              },
              {
                t: 'Feedstock & circularity limits',
                d: 'Scrap, clean waste plastic, sustainable biomass and SCMs are all finite. Circularity is the cheapest lever but capped by material quality and supply.',
              },
              {
                t: 'Slow capital cycles',
                d: 'Furnaces, kilns and crackers are rebuilt every 10–20 years. Switchover is bounded by investment windows, so timing policy to reinvestment points matters.',
              },
            ].map((b, i) => (
              <div key={i} className="rounded-xl border border-grey-200 bg-white p-4">
                <div className="text-sm font-bold text-grey-900">{b.t}</div>
                <p className="mt-1 text-xs text-grey-600">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Literature */}
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-bold text-grey-900">
            Literature used ({CLEAN_TECH_READING_LIST.length})
          </h2>
          <p className="mb-3 max-w-text text-sm text-grey-600">
            The scientific (peer-reviewed) papers and high-quality grey-literature reports behind
            this catalogue. These are seeded into the <strong>Reference Manager</strong> and the{' '}
            <strong>Industry Project Workspace</strong> under the <em>Clean Tech</em> chapter tag, so
            the team can pick them up in the reading-responsibility view.
          </p>
          <ol className="space-y-1.5">
            {CLEAN_TECH_READING_LIST.map(r => (
              <li key={r.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    r.tier === 'scientific'
                      ? 'bg-surface-blue text-primary'
                      : 'bg-surface-orange text-accent-orange'
                  }`}
                >
                  {r.tier === 'scientific' ? 'peer-reviewed' : 'grey'}
                </span>
                <span className="text-grey-800">
                  <span className="font-semibold">{r.source}</span>
                  {r.year ? ` (${r.year})` : ''} — {r.title}
                  {r.url ? (
                    <>
                      {' '}
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-light hover:text-primary hover:underline"
                      >
                        ↗ link
                      </a>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-10 text-xs text-grey-400">
          Catalogue v0.1 — a curated, fully-sourced first build. Trade flows is the sibling subpage
          (details to follow). Contributions extend <code>cleantech-catalogue.ts</code>; every new
          data point must carry a real source link.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
