'use client';

/**
 * Sector Background (beta) — a structured background brief for the two sectors
 * Sebastian leads in the ESABCC sector-responsibility allocation: Industry and
 * Transport.
 *
 * For each sector it reuses the *project-workspace flow chart* (the report
 * assessment framework, `SectorFlow`) so the methodology is shown exactly as
 * the Board draws it, with a toggle to the Enhanced + Adaptation board so you
 * can see how it can be improved. Around the flow chart it lays out, in one
 * structured page:
 *   • mitigation options   — derived from the framework levers,
 *   • adaptation options    — derived from the beta adaptation layer,
 *   • EU policies to look into — live from `src/data/sectoral-policies.ts`, and
 *   • a curated reading list of influential papers/reports.
 *
 * It closes with a "how the methodology can be improved" section that points at
 * the alternative boards the MethodHub already prototypes (enhanced indicators,
 * adaptation layer, policy tags, scenario binding).
 */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SectorFlow, { type OpenIndicatorPayload } from '@/components/frameworks/SectorFlow';
import IndicatorDetail from '@/components/frameworks/IndicatorDetail';
import {
  defaultFrameworkBoardReport,
  defaultFrameworkBoardBeta,
  resolveIndicators,
  type SectorFramework,
  type FrameworkNode,
} from '@/data/sector-frameworks';
import {
  SECTOR_POLICIES,
  getEurLexUrl,
  type SectorId,
  type SectorPolicy,
} from '@/data/sectoral-policies';
import {
  SECTOR_OWNERSHIP,
  INDUSTRY_REFERENCES,
  TRANSPORT_REFERENCES,
  ADAPTATION_REFERENCES,
  METHOD_NOTES,
  type Reference,
} from './content';

/* --------------------------------------------------------------- helpers */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wide text-tertiary-light font-semibold mb-2">{children}</div>
  );
}

const LENS_STYLE: Record<Reference['lens'], { label: string; cls: string }> = {
  mitigation: { label: 'Mitigation', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  adaptation: { label: 'Adaptation', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  policy: { label: 'Policy', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  method: { label: 'Method', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

/* ----------------------------------------------------------- sector config */

type SectorKey = 'industry' | 'transport';

interface SectorConfig {
  key: SectorKey;
  /** id in the framework board. */
  frameworkId: string;
  name: string;
  color: string;
  /** which `SectorId`s in sectoral-policies.ts roll up to this sector. */
  policySectors: SectorId[];
  references: Reference[];
  blurb: string;
}

const SECTORS: SectorConfig[] = [
  {
    key: 'industry',
    frameworkId: 'industry',
    name: 'Industry',
    color: '#9C3B3B',
    policySectors: ['industry'],
    references: INDUSTRY_REFERENCES,
    blurb:
      'Energy-intensive manufacturing — steel, cement, chemicals, aluminium, refining. The report framework splits abatement into lower demand for GHG-intensive materials and low-carbon production processes.',
  },
  {
    key: 'transport',
    frameworkId: 'transport',
    name: 'Transport',
    color: '#3D6E8C',
    policySectors: ['transport-road', 'transport-maritime', 'transport-aviation'],
    references: TRANSPORT_REFERENCES,
    blurb:
      'Road, maritime and aviation mobility. The framework splits abatement into reducing demand for energy-intensive transport and a low-emission, energy- and resource-efficient vehicle fleet.',
  },
];

/* ------------------------------------------------------------ board lookup */

// Pre-compute the two boards once (pure data, safe at module scope).
const REPORT_BOARD = defaultFrameworkBoardReport();
const BETA_BOARD = defaultFrameworkBoardBeta();

function sectorFrom(board: { sectors: SectorFramework[] }, id: string): SectorFramework {
  return board.sectors.find((s) => s.id === id)!;
}

function isAdaptation(node: FrameworkNode): boolean {
  return node.track === 'adaptation';
}

/* --------------------------------------------------------------- the page */

export default function SectorBackgroundPage() {
  const [active, setActive] = useState<SectorKey>('industry');
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [drawer, setDrawer] = useState<OpenIndicatorPayload | null>(null);

  const cfg = SECTORS.find((s) => s.key === active)!;

  // The flow chart shown: report-faithful by default, beta (enhanced mitigation
  // + adaptation layer) when "Show how it can be improved" is on.
  const flowSector = useMemo(
    () => sectorFrom(showEnhanced ? BETA_BOARD : REPORT_BOARD, cfg.frameworkId),
    [showEnhanced, cfg.frameworkId],
  );

  // The beta board always carries both mitigation + adaptation cards — use it to
  // derive the option lists regardless of the flow-chart toggle.
  const betaSector = useMemo(() => sectorFrom(BETA_BOARD, cfg.frameworkId), [cfg.frameworkId]);
  const mitigationLevers = betaSector.levers.filter((l) => !isAdaptation(l));
  const adaptationOutcomes = betaSector.outcomes.filter(isAdaptation);
  const adaptationLevers = betaSector.levers.filter(isAdaptation);

  // Policies relevant to the active sector, de-duplicated and ordered.
  const policies = useMemo<SectorPolicy[]>(() => {
    const want = new Set<SectorId>(cfg.policySectors);
    return SECTOR_POLICIES.filter((p) => p.sectors.some((s) => want.has(s)));
  }, [cfg.policySectors]);

  const drawerIndicators = useMemo(
    () => (drawer ? resolveIndicators(drawer.indicatorIds) : []),
    [drawer],
  );

  return (
    <>
      <SiteHeader />
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* ---- intro ---- */}
        <section className="mb-6">
          <SectionLabel>Beta module · Sector background</SectionLabel>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">Sector Background</h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            A structured background brief for the two sectors I lead in the Board&apos;s
            sector-responsibility allocation — <strong>Industry</strong> and <strong>Transport</strong>. For
            each it shows the report <strong>assessment-framework flow chart</strong> (the same board used in
            the Project Workspace), then lays out the <strong>mitigation</strong> and{' '}
            <strong>adaptation</strong> options, the <strong>EU policies to look into</strong>, and a curated
            list of <strong>influential papers</strong> — and notes how the methodology can be improved.
          </p>
        </section>

        {/* ---- responsibility allocation ---- */}
        <section className="mb-8">
          <SectionLabel>Sector responsibility allocation</SectionLabel>
          <div className="overflow-x-auto rounded-xl border border-grey-200">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="bg-grey-50 text-left text-tertiary-dark">
                  <th className="px-3 py-2 font-semibold">Sector / system</th>
                  <th className="px-3 py-2 font-semibold">Lead</th>
                  <th className="px-3 py-2 font-semibold">Back-up / helper</th>
                </tr>
              </thead>
              <tbody>
                {SECTOR_OWNERSHIP.map((o) => (
                  <tr
                    key={o.sector}
                    className={`border-t border-grey-100 ${o.mine ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-3 py-2 text-tertiary-dark">
                      {o.sector}
                      {o.mine && (
                        <span className="ml-2 align-middle inline-flex items-center rounded bg-primary text-white px-1.5 py-0.5 text-[10px] font-semibold">
                          this brief
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-2 ${o.mine ? 'font-semibold text-tertiary-dark' : 'text-tertiary'}`}>
                      {o.lead}
                    </td>
                    <td className="px-3 py-2 text-tertiary">{o.backup}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-tertiary-light">
            I additionally back up Agriculture; cross-cutting dimensions (governance, ETS/pricing) sit with
            other leads. This brief covers only my two lead sectors.
          </p>
        </section>

        {/* ---- sector tabs ---- */}
        <div className="flex flex-wrap items-center gap-2 mb-5 border-b border-grey-200">
          {SECTORS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors ${
                active === s.key
                  ? 'border-current text-tertiary-dark'
                  : 'border-transparent text-tertiary hover:text-tertiary-dark'
              }`}
              style={active === s.key ? { color: s.color, borderColor: s.color } : undefined}
            >
              {s.name}
            </button>
          ))}
        </div>

        <p className="text-sm text-tertiary max-w-3xl mb-5">{cfg.blurb}</p>

        {/* ---- flow chart (methodology) ---- */}
        <section className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <SectionLabel>Methodology · assessment-framework flow chart</SectionLabel>
              <h2 className="text-lg font-bold text-tertiary-dark">
                {flowSector.name} — {flowSector.figure}
              </h2>
            </div>
            <label className="flex items-center gap-2 text-[12px] font-medium text-tertiary-dark cursor-pointer select-none rounded-lg border border-grey-200 bg-grey-50 px-3 py-1.5">
              <input
                type="checkbox"
                checked={showEnhanced}
                onChange={(e) => setShowEnhanced(e.target.checked)}
                className="accent-primary"
              />
              Show how it can be improved (enhanced indicators + adaptation layer)
            </label>
          </div>
          <div className="rounded-xl border border-grey-200 bg-white p-3 sm:p-4 overflow-x-auto">
            <SectorFlow
              sector={flowSector}
              editing={false}
              allIndicators={[]}
              onChange={() => {}}
              onOpenIndicator={setDrawer}
              variant={showEnhanced ? 'beta' : 'report'}
            />
          </div>
          <p className="mt-2 text-[12px] text-tertiary-light max-w-3xl">
            {showEnhanced ? (
              <>
                <span className="font-semibold text-teal-700">Enhanced + adaptation view.</span> Levers the
                report drew without a progress indicator are filled with provisional β-series, and an
                adaptation &amp; resilience track (⛨) is grafted on, anchored in EUCRA 2024. Toggle off to see
                the published report figure 1:1.
              </>
            ) : (
              <>
                <span className="font-semibold">Published report view.</span> Reads top-to-bottom: GHG goal →
                outcomes → mitigation levers → enabling conditions. White boxes are progress indicators —
                click any to open the data behind it. Toggle on to see how it can be improved.
              </>
            )}
          </p>
        </section>

        {/* ---- mitigation options ---- */}
        <section className="mb-10">
          <SectionLabel>Mitigation options · {flowSector.name}</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-3">How emissions come down</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mitigationLevers.map((l) => (
              <div key={l.id} className="rounded-xl border border-grey-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: '#9E4A46' }} />
                  <div className="font-semibold text-sm text-tertiary-dark leading-snug">{l.label}</div>
                </div>
                {l.indicators.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {l.indicators.map((r) => (
                      <button
                        key={r.refId}
                        onClick={() => setDrawer({ title: r.label, code: r.code, indicatorIds: r.indicatorIds })}
                        className="inline-flex items-center gap-1 rounded border border-grey-200 bg-grey-50 px-1.5 py-0.5 text-[11px] text-tertiary-dark hover:border-primary hover:text-primary"
                        title={r.label}
                      >
                        <span className="font-semibold">{r.code}</span>
                        <span className="hidden sm:inline text-tertiary-light">{r.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ---- adaptation options ---- */}
        <section className="mb-10">
          <SectionLabel>Adaptation &amp; resilience options · {flowSector.name}</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">Reducing climate risk to the sector</h2>
          <p className="text-[12px] text-tertiary-light max-w-3xl mb-3">
            Not in the published mitigation framework — derived from the beta adaptation layer (EUCRA 2024
            risk clusters). Shown here so the lead can decide whether to make resilience a first-class branch
            of the sector goal.
          </p>
          <div className="space-y-3">
            {adaptationOutcomes.map((o) => {
              const levers = adaptationLevers.filter((l) => l.parents.includes(o.id));
              return (
                <div key={o.id} className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
                  <div className="font-semibold text-sm text-teal-800">{o.label}</div>
                  {o.note && <div className="text-[12px] text-teal-700/80 mt-0.5">{o.note}</div>}
                  {levers.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {levers.map((l) => (
                        <li key={l.id} className="flex items-start gap-2 text-sm text-tertiary-dark">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-teal-500" />
                          <span>{l.label}</span>
                          {l.indicators.map((r) => (
                            <button
                              key={r.refId}
                              onClick={() =>
                                setDrawer({ title: r.label, code: r.code, indicatorIds: r.indicatorIds })
                              }
                              className="inline-flex items-center rounded border border-teal-200 bg-white px-1.5 py-0.5 text-[11px] text-teal-700 hover:border-teal-400"
                              title={r.label}
                            >
                              {r.code}
                            </button>
                          ))}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- policies to look into ---- */}
        <section className="mb-10">
          <SectionLabel>EU policies to look into · {flowSector.name}</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">
            The instruments acting on this sector{' '}
            <span className="text-tertiary-light font-normal">({policies.length})</span>
          </h2>
          <p className="text-[12px] text-tertiary-light max-w-3xl mb-3">
            Live from the Policy Navigator dataset. These are the laws to map onto the framework nodes for a
            coherence analysis — each links to the authoritative EUR-Lex record.
          </p>
          <div className="space-y-2">
            {policies.map((p) => {
              const url = getEurLexUrl(p);
              return (
                <div key={p.id} className="rounded-xl border border-grey-200 bg-white p-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-sm text-tertiary-dark">{p.name}</span>
                    {p.acronym && (
                      <span className="text-[11px] font-semibold text-tertiary-light">{p.acronym}</span>
                    )}
                    <span className="inline-flex items-center rounded bg-grey-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-tertiary">
                      {p.instrumentType}
                    </span>
                    {p.inForce && (
                      <span className="text-[11px] text-tertiary-light">in force {p.inForce}</span>
                    )}
                    <div className="flex-1" />
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-primary hover:underline shrink-0"
                      >
                        EUR-Lex ↗
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-tertiary leading-snug">{p.meaning}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- influential papers ---- */}
        <section className="mb-12">
          <SectionLabel>Influential papers &amp; reports · {flowSector.name}</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">A curated reading list</h2>
          <p className="text-[12px] text-tertiary-light max-w-3xl mb-3">
            An AI-curated starting point pending source re-verification by the lead — not report content.
            Each entry links to the canonical source. These readings are also seeded into the{' '}
            <strong>Reference Manager</strong> (with DOI) and the <strong>Policy Gap</strong> project
            workspace, each tagged with its sector chapter (Industry / Transport).
          </p>
          <div className="space-y-2">
            {cfg.references.map((r) => (
              <ReferenceCard key={r.id} r={r} />
            ))}
          </div>

          <h3 className="text-sm font-bold text-tertiary-dark mt-5 mb-2">
            Cross-cutting — climate risk &amp; adaptation (both sectors)
          </h3>
          <div className="space-y-2">
            {ADAPTATION_REFERENCES.map((r) => (
              <ReferenceCard key={r.id} r={r} />
            ))}
          </div>
        </section>

        {/* ---- how the methodology can be improved ---- */}
        <section className="mb-10">
          <SectionLabel>How the methodology can be improved</SectionLabel>
          <h2 className="text-lg font-bold text-tertiary-dark mb-3">
            From a static figure to an analysis surface
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {METHOD_NOTES.filter((m) => m.scope === 'both' || m.scope === active).map((m) => (
              <div key={m.id} className="rounded-xl border border-grey-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <div className="font-semibold text-sm text-tertiary-dark leading-snug flex-1">{m.title}</div>
                  {m.prototyped && (
                    <span className="shrink-0 inline-flex items-center rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold">
                      prototyped
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] text-tertiary leading-snug">{m.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-tertiary-light max-w-3xl">
            The boards marked <span className="font-semibold text-emerald-700">prototyped</span> already exist
            in the Project Workspace flow-chart versions (Enhanced, Beta + adaptation, Policy Gap Report 2.0,
            Scenario call). This brief reuses the published and beta boards directly; promoting the others is
            a version switch, not a rebuild.
          </p>
        </section>
      </main>

      {drawer && (
        <IndicatorDetail
          title={drawer.title}
          code={drawer.code}
          indicators={drawerIndicators}
          onClose={() => setDrawer(null)}
        />
      )}

      <SiteFooter />
    </>
  );
}

/* --------------------------------------------------------- reference card */

function ReferenceCard({ r }: { r: Reference }) {
  const lens = LENS_STYLE[r.lens];
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-grey-200 bg-white p-3 hover:border-primary transition-colors"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${lens.cls}`}>
          {lens.label}
        </span>
        <span className="font-semibold text-sm text-tertiary-dark">{r.title}</span>
      </div>
      <div className="mt-0.5 text-[12px] text-tertiary-light">
        {r.authors} · {r.year} · <span className="italic">{r.venue}</span>
      </div>
      <p className="mt-1 text-[13px] text-tertiary leading-snug">{r.why}</p>
    </a>
  );
}
