'use client';

/**
 * CountryProfileView — read-only profile page renderer.
 *
 * Walks through the EEA-style sections (hero, GHG, renewables, efficiency,
 * air, water, biodiversity, circular economy, adaptation, NECP, policies)
 * and renders each one with key figures, sectoral splits, time-series
 * charts and narratives. Sections that have no data are still rendered as
 * "Not assessed" placeholders, which makes the "fill me in" affordance
 * obvious to editors.
 */

import Link from 'next/link';
import type { CountryProfile, SectorSplit, Status } from '@/data/country-profiles/_types';
import { STATUS_COLORS, STATUS_LABELS } from '@/data/country-profiles/_types';
import CountryTrendChart from './CountryTrendChart';

interface Props {
  profile: CountryProfile;
}

function StatusPill({ status }: { status: Status | undefined }) {
  const s = status ?? 'unknown';
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-medium text-white"
      style={{ backgroundColor: STATUS_COLORS[s] }}
    >
      {STATUS_LABELS[s]}
    </span>
  );
}

function Section({
  id, title, status, children,
}: {
  id: string; title: string; status?: Status; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3 bg-white rounded-xl border border-grey-200 p-5">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-base font-bold text-tertiary-dark">{title}</h2>
        <StatusPill status={status} />
      </header>
      {children}
    </section>
  );
}

function KeyFigure({
  label, value, unit, year, source,
}: { label: string; value?: number | string; unit?: string; year?: number; source?: string }) {
  if (value == null) {
    return (
      <div className="rounded-md border border-dashed border-grey-200 p-3 text-tertiary text-[11px] italic">
        {label}: not assessed
      </div>
    );
  }
  return (
    <div className="rounded-md border border-grey-200 p-3">
      <div className="text-[10px] uppercase tracking-wide text-tertiary mb-0.5">{label}</div>
      <div className="text-lg font-bold text-tertiary-dark leading-tight">
        {value}
        {unit && <span className="text-xs font-normal text-tertiary ml-1">{unit}</span>}
      </div>
      {(year || source) && (
        <div className="text-[10px] text-tertiary-light mt-1">
          {year && <span>{year}</span>}{year && source && ' · '}{source}
        </div>
      )}
    </div>
  );
}

function SectorBars({ sectors }: { sectors?: SectorSplit[] }) {
  if (!sectors || sectors.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {sectors.map(s => (
        <div key={s.id} className="flex items-center gap-2 text-[11px]">
          <span className="w-40 truncate text-tertiary-dark">{s.label}</span>
          <div className="flex-1 h-3 bg-grey-50 rounded overflow-hidden">
            <div
              className="h-full bg-primary/80"
              style={{ width: `${Math.min(100, s.share)}%` }}
            />
          </div>
          <span className="w-14 text-right text-tertiary-dark font-medium">{s.share.toFixed(1)}%</span>
          {s.absolute != null && (
            <span className="w-20 text-right text-tertiary text-[10px]">
              {s.absolute.toFixed(1)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const SECTIONS = [
  ['ghg',          'GHG emissions'],
  ['renewables',   'Renewable energy'],
  ['efficiency',   'Energy efficiency'],
  ['air',          'Air quality'],
  ['water',        'Water'],
  ['biodiversity', 'Biodiversity & nature'],
  ['circular',     'Circular economy'],
  ['adaptation',   'Climate adaptation'],
  ['necp',         'NECP delivery'],
] as const;

export default function CountryProfileView({ profile: p }: Props) {
  return (
    <div className="space-y-6">
      {/* hero */}
      <section className="bg-white rounded-xl border border-grey-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="text-[11px] uppercase tracking-wide text-tertiary">
              EU Member State · {p.code}
            </div>
            <h1 className="text-3xl font-bold text-tertiary-dark leading-tight">{p.name}</h1>
            <div className="text-sm text-tertiary">
              {p.hero.capital && <>Capital <span className="font-medium text-tertiary-dark">{p.hero.capital}</span> · </>}
              {p.hero.populationM != null && <>Population <span className="font-medium text-tertiary-dark">{p.hero.populationM.toFixed(2)} M</span> · </>}
              {p.hero.areaKkm2 != null && <>Area <span className="font-medium text-tertiary-dark">{(p.hero.areaKkm2 * 1000).toLocaleString()} km²</span> · </>}
              {p.hero.gdpPerCapitaEur != null && <>GDP/capita <span className="font-medium text-tertiary-dark">€{p.hero.gdpPerCapitaEur.toLocaleString()}</span></>}
            </div>
            <p className="text-[13px] text-tertiary-dark leading-relaxed whitespace-pre-line">
              {p.hero.summary}
            </p>
            {p.hero.highlights && p.hero.highlights.length > 0 && (
              <ul className="text-[12px] text-tertiary-dark list-disc pl-5 space-y-0.5">
                {p.hero.highlights.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <KeyFigure
              label="GHG (latest)"
              value={p.ghg.totalLatest?.value}
              unit={p.ghg.totalLatest?.unit}
              year={p.ghg.totalLatest?.year}
              source={p.ghg.totalLatest?.source}
            />
            <KeyFigure
              label="Renewables share"
              value={p.renewables.shareLatest?.value}
              unit={p.renewables.shareLatest?.unit ?? '%'}
              year={p.renewables.shareLatest?.year}
              source={p.renewables.shareLatest?.source}
            />
            <KeyFigure
              label="Energy intensity"
              value={p.efficiency.intensity?.value}
              unit={p.efficiency.intensity?.unit}
              year={p.efficiency.intensity?.year}
            />
            <KeyFigure
              label="PM2.5"
              value={p.air.pm25?.value}
              unit={p.air.pm25?.unit ?? 'µg/m³'}
              year={p.air.pm25?.year}
            />
          </div>
        </div>

        <nav className="mt-5 flex flex-wrap gap-1 border-t border-grey-100 pt-4">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-[11px] px-2 py-1 rounded border border-grey-200 text-tertiary-dark hover:border-primary hover:text-primary"
            >
              {label}
            </a>
          ))}
        </nav>
      </section>

      {/* GHG */}
      <Section id="ghg" title="GHG emissions" status={p.ghg.status}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KeyFigure label="Total (latest)" value={p.ghg.totalLatest?.value} unit={p.ghg.totalLatest?.unit} year={p.ghg.totalLatest?.year} source={p.ghg.totalLatest?.source} />
          <KeyFigure label="1990 baseline" value={p.ghg.total1990} unit="Mt CO2e" />
          <KeyFigure label="Per capita" value={p.ghg.perCapita?.value} unit={p.ghg.perCapita?.unit} year={p.ghg.perCapita?.year} />
          <KeyFigure label="Per GDP" value={p.ghg.perGdp?.value} unit={p.ghg.perGdp?.unit} year={p.ghg.perGdp?.year} />
        </div>
        {(p.ghg.target2030 || p.ghg.target2050) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {p.ghg.target2030 && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-[12px]">
                <div className="text-[10px] uppercase tracking-wide text-primary mb-0.5">2030 target</div>
                <div className="font-bold text-tertiary-dark">{p.ghg.target2030.value}{p.ghg.target2030.unit}</div>
                {p.ghg.target2030.baseline && <div className="text-tertiary">vs. {p.ghg.target2030.baseline}</div>}
                {p.ghg.target2030.notes && <div className="text-tertiary mt-1">{p.ghg.target2030.notes}</div>}
              </div>
            )}
            {p.ghg.target2050 && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-[12px]">
                <div className="text-[10px] uppercase tracking-wide text-primary mb-0.5">
                  {p.ghg.target2050.year ? `${p.ghg.target2050.year} target` : 'Climate-neutrality target'}
                </div>
                <div className="font-bold text-tertiary-dark">{p.ghg.target2050.value}{p.ghg.target2050.unit}</div>
                {p.ghg.target2050.notes && <div className="text-tertiary mt-1">{p.ghg.target2050.notes}</div>}
              </div>
            )}
          </div>
        )}
        {p.ghg.trend && p.ghg.trend.length > 0 && (
          <CountryTrendChart
            title="Total GHG emissions (Mt CO2e)"
            unit="Mt CO2e"
            series={p.ghg.trend}
            target={
              p.ghg.target2030 && p.ghg.total1990
                ? {
                    value:
                      p.ghg.total1990 *
                      (1 + parseFloat(String(p.ghg.target2030.value).replace('%', '')) / 100),
                    label: `2030 target ${p.ghg.target2030.value}${p.ghg.target2030.unit} vs ${p.ghg.target2030.baseline ?? '1990'}`,
                  }
                : undefined
            }
          />
        )}
        {p.ghg.sectors && p.ghg.sectors.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-tertiary-dark mb-1">Sectoral split (% of national total)</div>
            <SectorBars sectors={p.ghg.sectors} />
          </div>
        )}
        {p.ghg.narrative && (
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.ghg.narrative}</p>
        )}
      </Section>

      {/* Renewables */}
      <Section id="renewables" title="Renewable energy" status={p.renewables.status}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KeyFigure label="Share (latest)" value={p.renewables.shareLatest?.value} unit="%" year={p.renewables.shareLatest?.year} />
          <KeyFigure label="2005" value={p.renewables.share2005} unit="%" />
          <KeyFigure label="2020" value={p.renewables.share2020} unit="%" />
          <KeyFigure label="2030 target" value={p.renewables.target2030} unit="%" />
        </div>
        {p.renewables.bySubsector && (
          <div>
            <div className="text-[11px] font-semibold text-tertiary-dark mb-1">By sub-sector (RES share within sub-sector)</div>
            <SectorBars sectors={p.renewables.bySubsector} />
          </div>
        )}
        {p.renewables.trend && p.renewables.trend.length > 0 && (
          <CountryTrendChart
            title="Renewable energy share (% of gross final consumption)"
            unit="%"
            series={p.renewables.trend}
            target={p.renewables.target2030 ? { value: p.renewables.target2030, label: `2030 target ${p.renewables.target2030}%` } : undefined}
            color="#007B6C"
          />
        )}
        {p.renewables.narrative && (
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.renewables.narrative}</p>
        )}
      </Section>

      {/* Efficiency */}
      <Section id="efficiency" title="Energy efficiency" status={p.efficiency.status}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KeyFigure label="Primary energy" value={p.efficiency.primary?.value} unit={p.efficiency.primary?.unit} year={p.efficiency.primary?.year} />
          <KeyFigure label="Final energy" value={p.efficiency.final?.value} unit={p.efficiency.final?.unit} year={p.efficiency.final?.year} />
          <KeyFigure label="Energy intensity" value={p.efficiency.intensity?.value} unit={p.efficiency.intensity?.unit} year={p.efficiency.intensity?.year} />
          <KeyFigure label="2030 saving target" value={p.efficiency.target2030} unit="%" />
        </div>
        {p.efficiency.narrative && (
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.efficiency.narrative}</p>
        )}
      </Section>

      {/* Air */}
      <Section id="air" title="Air quality" status={p.air.status}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KeyFigure label="PM2.5" value={p.air.pm25?.value} unit={p.air.pm25?.unit ?? 'µg/m³'} year={p.air.pm25?.year} />
          <KeyFigure label="NO₂" value={p.air.no2?.value} unit={p.air.no2?.unit ?? 'µg/m³'} year={p.air.no2?.year} />
          <KeyFigure label="O₃" value={p.air.ozone?.value} unit={p.air.ozone?.unit ?? 'µg/m³'} year={p.air.ozone?.year} />
          <KeyFigure label="Premature deaths (PM2.5)" value={p.air.prematureDeaths?.value} unit={p.air.prematureDeaths?.unit ?? '/yr'} year={p.air.prematureDeaths?.year} />
        </div>
        {p.air.narrative && (
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.air.narrative}</p>
        )}
      </Section>

      {/* Water */}
      <Section id="water" title="Water" status={p.water.status}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KeyFigure label="Surface water — good status" value={p.water.surfaceWaterGood?.value} unit="%" year={p.water.surfaceWaterGood?.year} />
          <KeyFigure label="Groundwater — good status" value={p.water.groundwaterGood?.value} unit="%" year={p.water.groundwaterGood?.year} />
          <KeyFigure label="Bathing water — excellent" value={p.water.bathingWaterExcellent?.value} unit="%" year={p.water.bathingWaterExcellent?.year} />
          <KeyFigure label="Drinking water — compliance" value={p.water.drinkingWaterCompliance?.value} unit="%" year={p.water.drinkingWaterCompliance?.year} />
        </div>
        {p.water.narrative && (
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.water.narrative}</p>
        )}
      </Section>

      {/* Biodiversity */}
      <Section id="biodiversity" title="Biodiversity & nature" status={p.biodiversity.status}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KeyFigure label="Natura 2000 land" value={p.biodiversity.natura2000Land?.value} unit="% land" year={p.biodiversity.natura2000Land?.year} />
          <KeyFigure label="Natura 2000 marine" value={p.biodiversity.natura2000Marine?.value} unit="% EEZ" year={p.biodiversity.natura2000Marine?.year} />
          <KeyFigure label="Threatened species" value={p.biodiversity.threatenedSpecies?.value} unit="count" year={p.biodiversity.threatenedSpecies?.year} />
          <KeyFigure label="Habitats — favourable" value={p.biodiversity.habitatsFavourable?.value} unit="%" year={p.biodiversity.habitatsFavourable?.year} />
        </div>
        {p.biodiversity.narrative && (
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.biodiversity.narrative}</p>
        )}
      </Section>

      {/* Circular */}
      <Section id="circular" title="Circular economy" status={p.circular.status}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <KeyFigure label="Municipal recycling" value={p.circular.municipalRecycling?.value} unit="%" year={p.circular.municipalRecycling?.year} />
          <KeyFigure label="Circular material use rate" value={p.circular.circularMaterialUseRate?.value} unit="%" year={p.circular.circularMaterialUseRate?.year} />
          <KeyFigure label="Resource productivity" value={p.circular.resourceProductivity?.value} unit={p.circular.resourceProductivity?.unit ?? '€/kg'} year={p.circular.resourceProductivity?.year} />
        </div>
        {p.circular.narrative && (
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.circular.narrative}</p>
        )}
      </Section>

      {/* Adaptation */}
      <Section id="adaptation" title="Climate adaptation" status={p.adaptation.status}>
        {p.adaptation.strategy && (
          <div className="text-[12px] text-tertiary-dark">
            <strong>National adaptation strategy:</strong>{' '}
            {p.adaptation.strategy.title ?? 'NAS'}
            {p.adaptation.strategy.adoptedYear && ` (adopted ${p.adaptation.strategy.adoptedYear}`}
            {p.adaptation.strategy.lastUpdate && `, last updated ${p.adaptation.strategy.lastUpdate}`}
            {p.adaptation.strategy.adoptedYear && ')'}
            {p.adaptation.strategy.url && (
              <a href={p.adaptation.strategy.url} className="text-primary hover:underline ml-2" target="_blank" rel="noreferrer">link ↗</a>
            )}
          </div>
        )}
        {p.adaptation.keyRisks && p.adaptation.keyRisks.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-tertiary-dark mb-1">Key climate risks</div>
            <ul className="text-[12px] text-tertiary-dark list-disc pl-5 space-y-0.5">
              {p.adaptation.keyRisks.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        {p.adaptation.sectoralPlans && p.adaptation.sectoralPlans.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-tertiary-dark mb-1">Sectoral plans in place</div>
            <div className="flex flex-wrap gap-1">
              {p.adaptation.sectoralPlans.map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-grey-100 text-tertiary-dark">{s}</span>
              ))}
            </div>
          </div>
        )}
        {p.adaptation.narrative && (
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.adaptation.narrative}</p>
        )}
      </Section>

      {/* NECP */}
      <Section id="necp" title="NECP delivery" status={p.necp.status}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px] text-tertiary-dark">
          {p.necp.draftSubmitted && (
            <div><strong>Draft NECP:</strong> {p.necp.draftSubmitted}</div>
          )}
          {p.necp.finalSubmitted && (
            <div><strong>Final NECP:</strong> {p.necp.finalSubmitted}</div>
          )}
        </div>
        {p.necp.commissionAssessment && (
          <p className="text-[12px] text-tertiary-dark"><strong>Commission assessment.</strong> {p.necp.commissionAssessment}</p>
        )}
        {p.necp.esabccCommentary && (
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line"><strong>ESABCC commentary.</strong> {p.necp.esabccCommentary}</p>
        )}
        {p.necp.gaps && p.necp.gaps.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-tertiary-dark mb-1">Identified gaps</div>
            <ul className="text-[12px] text-tertiary-dark list-disc pl-5 space-y-0.5">
              {p.necp.gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        )}
      </Section>

      {/* Just transition */}
      {p.justTransition && (
        <Section id="just-transition" title="Just transition">
          {p.justTransition.jtfAllocationEurM != null && (
            <div className="text-[12px] text-tertiary-dark">
              <strong>JTF allocation 2021-27:</strong> €{p.justTransition.jtfAllocationEurM.toLocaleString()} million
            </div>
          )}
          {p.justTransition.regions && p.justTransition.regions.length > 0 && (
            <div className="text-[12px] text-tertiary-dark">
              <strong>Regions:</strong> {p.justTransition.regions.join(', ')}
            </div>
          )}
          {p.justTransition.narrative && (
            <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.justTransition.narrative}</p>
          )}
        </Section>
      )}

      {/* Policies */}
      {p.policies && p.policies.length > 0 && (
        <Section id="policies" title="Notable national policies & strategies">
          <ul className="space-y-2">
            {p.policies.map((pol, i) => (
              <li key={i} className="border border-grey-100 rounded-md p-3">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-tertiary-dark text-[13px]">{pol.name}</span>
                  {pol.year && <span className="text-[10px] text-tertiary">{pol.year}</span>}
                  {pol.url && (
                    <a href={pol.url} className="text-[11px] text-primary hover:underline" target="_blank" rel="noreferrer">
                      source ↗
                    </a>
                  )}
                </div>
                <p className="text-[12px] text-tertiary-dark mt-1">{pol.summary}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {p.watchNotes && (
        <Section id="watch" title="What to watch">
          <p className="text-[12px] text-tertiary-dark whitespace-pre-line leading-relaxed">{p.watchNotes}</p>
        </Section>
      )}

      <footer className="text-[11px] text-tertiary text-center pt-2">
        {p.lastReviewed && <>Last reviewed: {p.lastReviewed} · </>}
        Baseline data is shipped in repo; user edits and approved submissions are applied on top.{' '}
        <Link href={`/member-states/${p.code}/edit`} className="text-primary hover:underline">
          Edit this profile →
        </Link>
      </footer>
    </div>
  );
}
