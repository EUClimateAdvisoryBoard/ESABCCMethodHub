'use client';

/**
 * Wildfires & the Land Sink — the live "2026 season so far" section.
 *
 * A thin presentation layer over `live.ts`: all the fetching, projection and
 * carbon arithmetic lives there so the live section and the interactive
 * sliders can never drift apart. This file only lays the numbers out —
 * a status band, a hand-rolled SVG seasonal-trend chart, and four
 * year-end-projection cards.
 *
 * Determinism: initial state is the embedded `FALLBACK_SEASON` snapshot, so
 * the server-rendered and first client-rendered markup are identical. The
 * live fetch only happens in `useEffect`, after mount, and a `loaded` flag
 * keeps the status badge from claiming "unreachable" before it has even
 * tried. Dates are formatted by slicing the ISO string directly rather than
 * building a `Date` and calling locale methods, so there is no server/client
 * timezone drift to worry about.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  fetchLiveSeason,
  projectSeason,
  seasonSinkImpact,
  FALLBACK_SEASON,
  type LiveSeasonPayload,
  type LiveSeasonResult,
  type SeasonProjection,
  type SeasonImpact,
} from './live';
import { fmt, ha, mt, BURNT_AREA, type Params } from './model';

/* ───────────────────────────────────────────────────────────────── palette */

/**
 * Round SVG coordinates. Server and client can disagree on the last bit of a
 * float, which React reports as a hydration mismatch on the `y` attribute.
 * Rounding to a tenth of a user unit is invisible and makes the two agree.
 */
const R = (v: number) => Math.round(v * 10) / 10;

const C = {
  fire: '#B83230',
  fireLight: '#E0A09F',
  ember: '#FF9933',
  sink: '#007B6C',
  sinkLight: '#74CBC8',
  plan: '#004B7F',
  planLight: '#7495B2',
  grid: '#E6E7E8',
  axis: '#808285',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format an ISO date string (YYYY-MM-DD…) without ever building a `Date`. */
function fmtDate(iso: string): string {
  const [y, mo, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !mo || !d) return iso;
  return `${d} ${MONTHS[mo - 1]} ${y}`;
}

/** Compact axis label for a burnt-area value, 'k' below a million, 'M' above. */
function tickLabel(v: number): string {
  if (v === 0) return '0';
  if (v >= 1e6) return `${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1)}M`;
  return `${Math.round(v / 1000)}k`;
}

/** A "nice" gridline step for an axis running 0 → max. */
function niceStep(max: number): number {
  const raw = Math.max(max, 1) / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

/* ────────────────────────────────────────────────────────────── local Stat */

function Stat({ value, unit, label, sub, tone = 'default' }: {
  value: string; unit?: string; label: string; sub?: string; tone?: 'default' | 'fire';
}) {
  const tones = { default: 'border-grey-200 bg-white', fire: 'border-accent-red/30 bg-[#FDF3F3]' };
  const colors = { default: 'text-tertiary-dark', fire: 'text-accent-red' };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className={`font-mono text-[26px] font-bold leading-none tabular-nums ${colors[tone]}`}>
        {value}
        {unit ? <span className="ml-1 text-[13px] font-semibold text-tertiary">{unit}</span> : null}
      </div>
      <div className="mt-2 text-[12px] font-semibold text-tertiary-dark">{label}</div>
      {sub ? <div className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{sub}</div> : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── projection fan */

type Estimate = {
  key: 'low' | 'central' | 'high' | 'proportional';
  cardTitle: string;
  shortLabel: string;
  value: number;
  color: string;
};

function buildEstimates(proj: SeasonProjection): Estimate[] {
  return [
    { key: 'low', cardTitle: 'Quiet rest of season', shortLabel: 'quiet', value: proj.lowHa, color: C.sinkLight },
    { key: 'central', cardTitle: 'Average rest of season', shortLabel: 'average', value: proj.centralHa, color: C.planLight },
    { key: 'high', cardTitle: 'Worst rest-of-season on record', shortLabel: 'worst on record', value: proj.highHa, color: C.fire },
    {
      key: 'proportional',
      cardTitle: `Keeps tracking ×${proj.ratioToAvg.toFixed(1)}`,
      shortLabel: `×${proj.ratioToAvg.toFixed(1)} pace`,
      value: proj.proportionalHa,
      color: C.ember,
    },
  ];
}

/* ═══════════════════════════════════════════════════════════════  CHART   */

/** The seasonal-trend chart: 2006-25 envelope, 2026 to date, projection fan. */
function SeasonalTrendChart({ season, proj, estimates }: {
  season: LiveSeasonPayload; proj: SeasonProjection; estimates: Estimate[];
}) {
  const W = 860;
  const H = 340;
  const m = { l: 58, r: 172, t: 34, b: 36 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;

  const rows = season.cumulative;
  const lastRow = rows[rows.length - 1];
  const envelopeMax = lastRow ? lastRow.areaMaxHa : 0;
  const fanMax = Math.max(proj.lowHa, proj.centralHa, proj.highHa, proj.proportionalHa);
  const maxY = Math.max(season.baMaxAnnualHa ?? 0, envelopeMax, proj.toDateHa, fanMax, 1) * 1.05;

  const sx = (week: number) => R(m.l + ((week - 1) / 51) * iw);
  const sy = (v: number) => R(m.t + ih - (v / maxY) * ih);

  const step = niceStep(maxY);
  const ticks: number[] = [];
  for (let t = 0; t <= maxY; t += step) ticks.push(t);

  // One label per calendar month, at the first week whose date falls in it.
  const seenMonths = new Set<string>();
  const monthTicks: { week: number; label: string }[] = [];
  for (const row of rows) {
    const mo = row.date.slice(5, 7);
    if (!seenMonths.has(mo)) {
      seenMonths.add(mo);
      monthTicks.push({ week: row.week, label: MONTHS[Number(mo) - 1] });
    }
  }

  const envelopePts = [
    ...rows.map((r) => `${sx(r.week)},${sy(r.areaMaxHa)}`),
    ...[...rows].reverse().map((r) => `${sx(r.week)},${sy(r.areaMinHa)}`),
  ].join(' ');
  const avgPts = rows.map((r) => `${sx(r.week)},${sy(r.areaAvgHa)}`).join(' ');

  const observed = rows.filter((r) => r.areaHa !== null);
  const obsPts = observed.map((r) => `${sx(r.week)},${sy(r.areaHa as number)}`).join(' ');
  const last = observed[observed.length - 1] as (typeof observed)[number] | undefined;

  // Row used to place the "2006-25 average" in-line label, roughly 3/4 across.
  const avgLabelRow = rows.find((r) => r.week === 40) ?? rows[Math.min(rows.length - 1, Math.floor(rows.length * 0.72))];

  // Fan end labels, sorted by vertical position and nudged apart where the
  // estimates converge — same trick as the ExtremesFanChart on the main page.
  const labelRows = (() => {
    const list = estimates.map((e) => ({ ...e, y: sy(e.value) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < list.length; i++) {
      if (list[i].y - list[i - 1].y < 12) list[i].y = list[i - 1].y + 12;
    }
    return list;
  })();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="EU-27 cumulative burnt area in 2026 to date against the 2006-25 range, with a year-end projection fan">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke={C.grid} strokeWidth={1} />
          <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" fontSize={9} fill={C.axis} className="tabular-nums">
            {tickLabel(t)}
          </text>
        </g>
      ))}

      {/* 2006-25 min-max envelope */}
      <polygon points={envelopePts} fill={C.planLight} fillOpacity={0.18} />

      {/* 2006-25 average, dashed, labelled in-line */}
      <polyline points={avgPts} fill="none" stroke={C.plan} strokeWidth={1.5} strokeDasharray="6 3" />
      {avgLabelRow ? (
        <g>
          <rect x={sx(avgLabelRow.week) - 2} y={sy(avgLabelRow.areaAvgHa) - 15} width={106} height={13}
            fill="#FFFFFF" fillOpacity={0.85} rx={2} />
          <text x={sx(avgLabelRow.week) + 3} y={sy(avgLabelRow.areaAvgHa) - 5} fontSize={9} fontWeight={700} fill={C.plan}>
            2006-25 average
          </text>
        </g>
      ) : null}

      {/* 2026 observed, bold */}
      {observed.length > 0 ? <polyline points={obsPts} fill="none" stroke={C.fire} strokeWidth={2.6} /> : null}

      {/* projection fan, last observed point → week 52 */}
      {last
        ? estimates.map((e) => (
            <g key={e.key}>
              <line x1={sx(last.week)} x2={sx(52)} y1={sy(last.areaHa as number)} y2={sy(e.value)}
                stroke={e.color} strokeWidth={1.4} strokeDasharray="4 3" />
              <circle cx={sx(52)} cy={sy(e.value)} r={3} fill={e.color} />
            </g>
          ))
        : null}

      {/* fan end labels, nudged apart */}
      {last
        ? labelRows.map((L) => (
            <text key={L.key} x={m.l + iw + 8} y={R(L.y) + 3.5} fontSize={9.5} fontWeight={700} fill={L.color}>
              {ha(L.value)} — {L.shortLabel}
            </text>
          ))
        : null}

      {/* last-observed dot + callout */}
      {last ? (
        <g>
          <circle cx={sx(last.week)} cy={sy(last.areaHa as number)} r={3.5} fill={C.fire} />
          <text x={sx(last.week) + 6} y={sy(last.areaHa as number) - 9} fontSize={9.5} fontWeight={700} fill={C.fire}>
            {ha(last.areaHa as number)} by {fmtDate(last.date)}
          </text>
        </g>
      ) : null}

      {monthTicks.map((mkTick) => (
        <text key={mkTick.week} x={sx(mkTick.week)} y={H - 16} textAnchor="middle" fontSize={9} fill={C.axis}>
          {mkTick.label}
        </text>
      ))}

      <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke={C.axis} strokeWidth={1} />
      <text x={m.l} y={14} fontSize={9} fill={C.axis}>
        EU-27 cumulative burnt area, hectares — red = 2026 observed (EFFIS), band = 2006-25 range
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════   PAGE   */

export default function LiveSeason({ p }: { p: Params }) {
  const [state, setState] = useState<LiveSeasonResult>({ season: FALLBACK_SEASON, live: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLiveSeason().then((result) => {
      if (!cancelled) {
        setState(result);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { season, live } = state;

  const proj = useMemo<SeasonProjection | null>(() => projectSeason(season), [season]);

  const estimates = useMemo<Estimate[] | null>(() => (proj ? buildEstimates(proj) : null), [proj]);

  const impacts = useMemo<Record<Estimate['key'], SeasonImpact> | null>(() => {
    if (!proj) return null;
    return {
      low: seasonSinkImpact(proj.lowHa, p),
      central: seasonSinkImpact(proj.centralHa, p),
      high: seasonSinkImpact(proj.highHa, p),
      proportional: seasonSinkImpact(proj.proportionalHa, p),
    };
  }, [proj, p]);

  const record2025Ha = BURNT_AREA.find((d) => d.year === 2025)?.ha ?? 1_079_538;

  const card1Sub = (() => {
    const parts: string[] = [];
    if (proj) parts.push(`×${proj.ratioToAvg.toFixed(1)} the 2006-25 average for this date`);
    if (season.estimatedTotalHa != null) {
      parts.push(`EFFIS estimate incl. unmapped fires: ${ha(season.estimatedTotalHa)}`);
    }
    return parts.length ? parts.join(' · ') : undefined;
  })();

  return (
    <div>
      {/* ─────────────────────────────────────────────────────── STATUS ROW */}
      <div className="mb-4 flex items-center gap-2">
        {loaded && live ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-accent-red opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-red" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-accent-red">
              Live — Copernicus EFFIS, data to {season.lastDataDate ? fmtDate(season.lastDataDate) : '—'}
            </span>
          </>
        ) : loaded && !live ? (
          <>
            <span className="h-2 w-2 rounded-full bg-accent-orange" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-accent-orange">
              Live feed unreachable — showing snapshot from {fmtDate(season.fetchedAt)}
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-tertiary/40" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-tertiary">
              Showing snapshot from {fmtDate(season.fetchedAt)}
            </span>
          </>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────── STAT BAND */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          tone="fire"
          value={season.baToDateHa !== null ? ha(season.baToDateHa) : '—'}
          label="Burnt so far in 2026"
          sub={card1Sub}
        />
        <Stat
          value={season.firesToDate !== null ? fmt(season.firesToDate) : '—'}
          label="Fires mapped"
          sub={season.firesAvgToDate !== null ? `vs ${fmt(season.firesAvgToDate)} average (2006-25)` : undefined}
        />
        <Stat
          value={season.co2ToDateMt !== null ? fmt(season.co2ToDateMt, 1) : '—'}
          unit={season.co2ToDateMt !== null ? 'Mt' : undefined}
          label="CO₂ already emitted by fires"
          sub={season.co2AvgToDateMt !== null ? `vs ${fmt(season.co2AvgToDateMt, 1)} Mt average (CAMS)` : undefined}
        />
        <Stat
          tone="fire"
          value={season.baMaxToDateHa !== null ? ha(season.baMaxToDateHa) : '—'}
          label="Worst same-week year on record"
          sub="Highest cumulative burnt area ever recorded by this week, 2006-25"
        />
      </div>

      {/* ─────────────────────────────────────── CHART + PROJECTION CARDS */}
      {proj && estimates && impacts ? (
        <>
          <div className="mt-6 rounded-lg border border-grey-200 bg-white p-5">
            <SeasonalTrendChart season={season} proj={proj} estimates={estimates} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {estimates.map((e) => {
              const impact = impacts[e.key];
              const beatsRecord = e.value > record2025Ha;
              return (
                <div key={e.key} className="rounded-lg border border-grey-200 bg-white p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-tertiary-dark">{e.cardTitle}</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-[22px] font-bold leading-none tabular-nums text-tertiary-dark">
                      {ha(e.value)}
                    </span>
                    {beatsRecord ? (
                      <span className="rounded bg-accent-red px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        beats the 2025 record
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 border-t border-grey-100 pt-3">
                    <div className="text-[12px] font-semibold text-accent-red">
                      {mt(impact.totalCommittedMt)} sink loss committed by this one season
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-tertiary">
                      {mt(impact.inYearMt)} felt within 2026 itself; the rest lands over the recovery ramp
                    </div>
                    <div className="mt-2.5 space-y-1 text-[10.5px] text-tertiary">
                      <div className="flex justify-between gap-2">
                        <span>Combustion</span>
                        <strong className="tabular-nums text-tertiary-dark">{mt(impact.combustionMt)}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Decomposition ({p.decompYears} yr)</span>
                        <strong className="tabular-nums text-tertiary-dark">{mt(impact.decompCommittedMt)}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Removals foregone ({p.recoveryYears} yr)</span>
                        <strong className="tabular-nums text-tertiary-dark">{mt(impact.foregoneCommittedMt)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 max-w-text text-[11.5px] leading-relaxed text-tertiary">
            These use the reader&rsquo;s current slider settings — fuel load {fmt(p.fuelLoad)} tCO₂/ha,{' '}
            {(p.forestShare * 100).toFixed(0)}% forest share, a {p.recoveryYears}-year recovery — minus the{' '}
            {ha(p.embeddedHa)} baseline already assumed in the projections, so they move with the dials above. The
            low–high range is a spread of historical remainders stacked on this year&rsquo;s head start, not a
            statistical confidence interval.
          </p>
        </>
      ) : null}

      {/* ───────────────────────────────────────────────────── METHODOLOGY */}
      <p className="mt-6 text-[10.5px] leading-snug text-tertiary">
        EFFIS maps fires of roughly 30 ha or more; in-season figures are provisional and are revised as fires are
        mapped. CO₂ from the Copernicus Atmosphere Monitoring Service (CAMS) Global Fire Assimilation System. Source:{' '}
        <a href="https://forest-fire.emergency.copernicus.eu/" target="_blank" rel="noreferrer" className="text-primary underline">
          forest-fire.emergency.copernicus.eu
        </a>
        .
      </p>
    </div>
  );
}
