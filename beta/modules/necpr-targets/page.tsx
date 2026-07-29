'use client';

/**
 * NECPR 2025 — Comparable Targets (beta module M·40).
 *
 * What the 2025 National Energy and Climate Progress Reports actually let you
 * compare across Member States, and what they don't.
 *
 * The centrepiece is section 1: the workbooks give no cross-country key for the
 * "other objectives" tables — the same quantity arrives under seven different
 * names, in two languages, on three bases — so every reported objective was
 * read and assigned to a target family by hand. The matrix shows which
 * families have enough Member States behind them to be worth charting, and the
 * expandable rows show exactly what has to be corrected first, with the name
 * each Member State actually submitted.
 *
 * Sections 2–3 carry the two substantive findings (the aggregate LULUCF sink
 * peaks in 2030; five "commitments" are the country's own projection), section
 * 4 the headline-target coverage, section 5 the data-quality flags.
 *
 * Data: ./data.ts, extracted by scripts/extract-necpr-2025.py.
 * Review: docs-internal/necpr-2025-annex-i-ii-iv-review-2026-07-29.md
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  COUNTRY_NAMES, COVERAGE_FUNNEL, EU27, LULUCF_BY_COUNTRY, LULUCF_COMMITMENTS,
  LULUCF_EU27, LULUCF_EU_TARGET_2030, NEUTRALITY_ELSEWHERE, NEUTRALITY_YEAR,
  QUALITY_FLAGS, SERIES, TARGET_COVERAGE, TARGET_FAMILIES,
  type Annex, type Country, type FlagSeverity, type TargetFamily,
} from './data';

// ── shared bits ──────────────────────────────────────────────────────────────

const CARD =
  'rounded-xl border border-grey-200 bg-white dark:border-[#22303C] dark:bg-[#111A22]';
const INK = 'text-tertiary-dark dark:text-[#E4EBF1]';
const MUTED = 'text-tertiary-light dark:text-[#8FA3B3]';

/** Palette validated against both surfaces — see data.ts. */
function hue(key: keyof typeof SERIES, dark: boolean) {
  return dark ? SERIES[key].dark : SERIES[key].light;
}

function Section({
  n, title, lede, children,
}: { n: string; title: string; lede: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-14 scroll-mt-24" id={`s${n}`}>
      <div className="flex items-baseline gap-3">
        <span className={`font-mono text-[12px] ${MUTED}`}>{n}</span>
        <h2 className={`text-[22px] font-bold leading-tight ${INK}`}>{title}</h2>
      </div>
      <p className={`mt-2 max-w-text text-[14px] leading-relaxed ${MUTED}`}>{lede}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function StatTile({
  value, unit, label, note, accent,
}: { value: string; unit?: string; label: string; note: string; accent: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-baseline gap-1">
        <span className="text-[30px] font-bold leading-none" style={{ color: accent }}>{value}</span>
        {unit && <span className={`text-[13px] font-semibold ${MUTED}`}>{unit}</span>}
      </div>
      <div className={`mt-1.5 text-[13px] font-semibold ${INK}`}>{label}</div>
      <div className={`mt-1 text-[11.5px] leading-snug ${MUTED}`}>{note}</div>
    </div>
  );
}

function ToneChip({ tone, children }: { tone: 'good' | 'partial' | 'poor'; children: React.ReactNode }) {
  const map = {
    good: 'border-[#00928F] text-[#00665A] bg-[#E8F5F4] dark:bg-[#0B2422] dark:text-[#5FC9C4] dark:border-[#00A096]',
    partial: 'border-[#D97514] text-[#8A4A0C] bg-[#FDF2E4] dark:bg-[#2A1C0B] dark:text-[#E0A15E] dark:border-[#C97C20]',
    poor: 'border-grey-400 text-grey-600 bg-grey-100 dark:bg-[#1A242E] dark:text-[#8FA3B3] dark:border-[#3A4A58]',
  };
  return (
    <span className={`inline-block shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${map[tone]}`}>
      {children}
    </span>
  );
}

// ── 1. the mapping ───────────────────────────────────────────────────────────

const ANNEX_LABEL: Record<Annex, string> = {
  I: 'Annex I — GHG',
  II: 'Annex II — RES',
  IV: 'Annex IV — EE',
};

function FamilyRow({ f, dark }: { f: TargetFamily; dark: boolean }) {
  const [open, setOpen] = useState(false);
  const countries = useMemo(
    () => Array.from(new Set(f.members.map((m) => m.cc))).sort(),
    [f],
  );
  const quantified = f.members.filter((m) => m.basis !== 'qualitative').length;
  const tone = f.comparability;
  const barColor = tone === 'good' ? hue('wam', dark) : tone === 'partial' ? hue('wem', dark) : (dark ? '#3A4A58' : '#BCBEC0');

  return (
    <div className={`${CARD} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-grey-50 dark:hover:bg-[#16212B]"
      >
        <span
          className="mt-1 h-9 w-1.5 shrink-0 rounded-[3px]"
          style={{ background: barColor }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`text-[15px] font-bold ${INK}`}>{f.label}</span>
            <ToneChip tone={tone}>
              {tone === 'good' ? 'Comparable' : tone === 'partial' ? 'With care' : 'Not comparable'}
            </ToneChip>
            <span className={`font-mono text-[10.5px] ${MUTED}`}>
              {ANNEX_LABEL[f.annex]} · {f.table}
            </span>
          </span>
          <span className={`mt-1 block text-[12.5px] leading-snug ${MUTED}`}>{f.definition}</span>

          {/* Member-State strip: identity is the label, colour only reinforces it. */}
          <span className="mt-2.5 flex flex-wrap gap-1">
            {EU27.map((cc) => {
              const has = countries.includes(cc);
              return (
                <span
                  key={cc}
                  title={has ? `${COUNTRY_NAMES[cc]} — reported` : `${COUNTRY_NAMES[cc]} — not reported`}
                  className={
                    'inline-block rounded-[3px] px-1 py-0.5 font-mono text-[10px] font-semibold ' +
                    (has
                      ? 'text-white'
                      : 'text-grey-400 bg-grey-100 dark:bg-[#1A242E] dark:text-[#4C5D6B]')
                  }
                  style={has ? { background: barColor } : undefined}
                >
                  {cc}
                </span>
              );
            })}
          </span>
        </span>
        <span className={`shrink-0 text-right ${MUTED}`}>
          <span className={`block text-[19px] font-bold leading-none ${INK}`}>{countries.length}</span>
          <span className="block text-[10px] uppercase tracking-[0.06em]">states</span>
          <span className="mt-1 block text-[10.5px]">{quantified}/{f.members.length} with a number</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-grey-200 px-4 pb-4 pt-3 dark:border-[#22303C]">
          <p className={`mb-3 max-w-text text-[13px] leading-relaxed ${INK}`}>{f.comment}</p>
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className={`border-b border-grey-200 text-[10.5px] uppercase tracking-[0.06em] dark:border-[#22303C] ${MUTED}`}>
                  <th className="py-1.5 pr-3 font-semibold">MS</th>
                  <th className="py-1.5 pr-3 font-semibold">Name as submitted</th>
                  <th className="py-1.5 pr-3 font-semibold">Sector field</th>
                  <th className="py-1.5 pr-3 font-semibold">Unit</th>
                  <th className="py-1.5 pr-3 text-right font-semibold">2030</th>
                  <th className="py-1.5 font-semibold">Before it can be compared</th>
                </tr>
              </thead>
              <tbody>
                {f.members.map((m, i) => (
                  <tr key={`${m.cc}-${i}`} className="border-b border-grey-100 align-top last:border-0 dark:border-[#1A242E]">
                    <td className={`py-2 pr-3 font-mono text-[11.5px] font-semibold ${INK}`}>{m.cc}</td>
                    <td className={`py-2 pr-3 text-[12px] leading-snug ${INK}`}>
                      <span className="italic">“{m.nameAsSubmitted}”</span>
                      {m.nameEn && (
                        <span className={`mt-0.5 block not-italic ${MUTED}`}>→ {m.nameEn}</span>
                      )}
                    </td>
                    <td className={`py-2 pr-3 text-[11.5px] leading-snug ${MUTED}`}>{m.sectorAsSubmitted}</td>
                    <td className={`py-2 pr-3 font-mono text-[11px] leading-snug ${MUTED}`}>{m.unitAsSubmitted}</td>
                    <td className={`py-2 pr-3 text-right font-mono text-[11.5px] ${INK}`}>
                      {m.target2030 !== undefined ? m.target2030.toLocaleString('en-GB') : '—'}
                    </td>
                    <td className={`py-2 text-[11.5px] leading-snug ${m.normalisation ? MUTED : 'text-[#00665A] dark:text-[#5FC9C4]'}`}>
                      {m.normalisation ?? 'nothing — reported on the common basis'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. the sink chart ────────────────────────────────────────────────────────

function SinkChart({ dark }: { dark: boolean }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 760, H = 320;
  const M = { t: 18, r: 108, b: 34, l: 52 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;

  const years = [2022, 2030, 2040];
  const xMin = 2022, xMax = 2040;
  const yMin = -320, yMax = 0;
  const x = (yr: number) => M.l + ((yr - xMin) / (xMax - xMin)) * iw;
  const y = (v: number) => M.t + ((v - yMax) / (yMin - yMax)) * ih;

  const line = (key: 'actual' | 'wem' | 'wam') =>
    LULUCF_EU27.filter((p) => p[key] !== undefined)
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.year)},${y(p[key] as number)}`)
      .join(' ');

  const hoverPoint = hover === null ? null : LULUCF_EU27.find((p) => p.year === hover) ?? null;

  return (
    <figure className={`${CARD} p-4`}>
      <figcaption className={`mb-1 text-[14px] font-bold ${INK}`}>
        EU-27 net LULUCF, sum of the 27 national series
      </figcaption>
      <p className={`mb-3 text-[12px] ${MUTED}`}>
        Mt CO₂e. More negative is a larger sink. The 2030 line is the EU-wide target under
        Regulation (EU) 2018/841.
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[620px]" role="img"
             aria-label="EU-27 net LULUCF: the with-additional-measures sink peaks at -233 Mt in 2030 and falls back to -199 Mt by 2040, against a -310 Mt 2030 target.">
          {/* grid */}
          {[0, -100, -200, -300].map((v) => (
            <g key={v}>
              <line x1={M.l} x2={M.l + iw} y1={y(v)} y2={y(v)}
                    stroke={dark ? '#22303C' : '#E6E7E8'} strokeWidth={1} />
              <text x={M.l - 8} y={y(v) + 4} textAnchor="end"
                    className="text-[10px]" fill={dark ? '#8FA3B3' : '#808285'}>{v}</text>
            </g>
          ))}
          {years.map((yr) => (
            <text key={yr} x={x(yr)} y={H - 12} textAnchor="middle"
                  className="text-[10px]" fill={dark ? '#8FA3B3' : '#808285'}>{yr}</text>
          ))}

          {/* target reference */}
          <line x1={M.l} x2={M.l + iw} y1={y(LULUCF_EU_TARGET_2030)} y2={y(LULUCF_EU_TARGET_2030)}
                stroke={hue('alert', dark)} strokeWidth={2} strokeDasharray="6 4" />
          <text x={M.l + iw + 8} y={y(LULUCF_EU_TARGET_2030) + 4}
                className="text-[10.5px] font-semibold" fill={hue('alert', dark)}>
            −310 target
          </text>

          {/* series */}
          <path d={line('wem')} fill="none" stroke={hue('wem', dark)} strokeWidth={2} strokeLinejoin="round" />
          <path d={line('wam')} fill="none" stroke={hue('wam', dark)} strokeWidth={2} strokeLinejoin="round" />
          <path d={line('actual')} fill="none" stroke={hue('actual', dark)} strokeWidth={2} strokeLinejoin="round" />

          {LULUCF_EU27.map((p) => (
            <g key={p.year}>
              {(['actual', 'wem', 'wam'] as const).map((k) =>
                p[k] === undefined ? null : (
                  <circle key={k} cx={x(p.year)} cy={y(p[k] as number)} r={4.5}
                          fill={hue(k, dark)} stroke={dark ? '#111A22' : '#FFFFFF'} strokeWidth={2} />
                ),
              )}
            </g>
          ))}

          {/* direct labels at the right edge */}
          <text x={M.l + iw + 8} y={y(-148) + 4} className="text-[10.5px] font-semibold" fill={hue('wem', dark)}>WEM −148</text>
          <text x={M.l + iw + 8} y={y(-199) + 4} className="text-[10.5px] font-semibold" fill={hue('wam', dark)}>WAM −199</text>
          <text x={x(2023) + 8} y={y(-198) + 18} className="text-[10.5px] font-semibold" fill={hue('actual', dark)}>2023 inventory −198</text>

          {/* hover bands */}
          {LULUCF_EU27.map((p, i) => {
            const prev = LULUCF_EU27[i - 1], next = LULUCF_EU27[i + 1];
            const x0 = prev ? (x(p.year) + x(prev.year)) / 2 : M.l;
            const x1 = next ? (x(p.year) + x(next.year)) / 2 : M.l + iw;
            return (
              <rect key={p.year} x={x0} y={M.t} width={Math.max(1, x1 - x0)} height={ih}
                    fill="transparent" onMouseEnter={() => setHover(p.year)} onMouseLeave={() => setHover(null)} />
            );
          })}
          {hoverPoint && (
            <line x1={x(hoverPoint.year)} x2={x(hoverPoint.year)} y1={M.t} y2={M.t + ih}
                  stroke={dark ? '#3A4A58' : '#BCBEC0'} strokeWidth={1} />
          )}
        </svg>
      </div>

      {/* legend — always present for ≥2 series */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {(['actual', 'wem', 'wam'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-5 rounded-full" style={{ background: hue(k, dark) }} />
            <span className={`text-[11.5px] ${MUTED}`}>{SERIES[k].label}</span>
          </span>
        ))}
      </div>

      <div className={`mt-3 min-h-[38px] rounded-lg border border-grey-200 bg-grey-50 px-3 py-2 text-[12px] dark:border-[#22303C] dark:bg-[#16212B] ${MUTED}`}>
        {hoverPoint ? (
          <span>
            <strong className={INK}>{hoverPoint.year}</strong>
            {hoverPoint.actual !== undefined && <> · inventory <strong className={INK}>{hoverPoint.actual}</strong></>}
            {hoverPoint.wem !== undefined && <> · WEM <strong className={INK}>{hoverPoint.wem}</strong></>}
            {hoverPoint.wam !== undefined && <> · WAM <strong className={INK}>{hoverPoint.wam}</strong></>} Mt CO₂e
          </span>
        ) : (
          <span>
            Hover the chart for values. Note the 2023 step: the projections start ~30 Mt below the
            inventory they are meant to continue.
          </span>
        )}
      </div>
    </figure>
  );
}

function SinkByCountry({ dark }: { dark: boolean }) {
  const [metric, setMetric] = useState<'actual2023' | 'wam2040'>('actual2023');
  const rows = useMemo(
    () => [...LULUCF_BY_COUNTRY].sort((a, b) => a[metric] - b[metric]),
    [metric],
  );
  const max = Math.max(...rows.map((r) => Math.abs(r[metric])));

  return (
    <figure className={`${CARD} p-4`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <figcaption className={`text-[14px] font-bold ${INK}`}>Net LULUCF by Member State</figcaption>
        <div className="flex gap-1" role="group" aria-label="Choose year">
          {([['actual2023', '2023 inventory'], ['wam2040', '2040 WAM']] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMetric(k)}
                    className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                      metric === k
                        ? 'border-primary bg-primary text-white dark:border-[#2A86C2] dark:bg-[#2A86C2]'
                        : `border-grey-300 bg-white dark:border-[#22303C] dark:bg-[#111A22] ${MUTED}`
                    }`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className={`mb-3 text-[12px] ${MUTED}`}>
        Mt CO₂e. Bars left of the axis are sinks; bars right of it are net sources.
      </p>

      <div className="grid grid-cols-1 gap-y-[3px] sm:grid-cols-2 sm:gap-x-6">
        {rows.map((r) => {
          const v = r[metric];
          const source = v > 0;
          const pct = (Math.abs(v) / max) * 50;
          return (
            <div key={r.cc} className="flex items-center gap-2" title={`${COUNTRY_NAMES[r.cc]}: ${v} Mt CO₂e`}>
              <span className={`w-7 shrink-0 font-mono text-[10.5px] font-semibold ${MUTED}`}>{r.cc}</span>
              <span className="relative h-[13px] flex-1">
                <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: dark ? '#22303C' : '#E6E7E8' }} />
                <span
                  className="absolute inset-y-[2px] rounded-[3px]"
                  style={{
                    background: source ? hue('alert', dark) : hue('wam', dark),
                    left: source ? '50%' : `${50 - pct}%`,
                    width: `${Math.max(pct, 0.4)}%`,
                  }}
                />
              </span>
              <span className={`w-11 shrink-0 text-right font-mono text-[10.5px] ${source ? 'font-bold' : ''} ${INK}`}>
                {v > 0 ? `+${v.toFixed(0)}` : v.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-[2px]" style={{ background: hue('wam', dark) }} />
          <span className={`text-[11.5px] ${MUTED}`}>Net sink</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-[2px]" style={{ background: hue('alert', dark) }} />
          <span className={`text-[11.5px] ${MUTED}`}>Net source</span>
        </span>
      </div>
    </figure>
  );
}

// ── 4. coverage ──────────────────────────────────────────────────────────────

function CoverageFunnel({ which, dark }: { which: 'ghg' | 'res' | 'ee'; dark: boolean }) {
  const steps = COVERAGE_FUNNEL[which];
  const title = { ghg: 'Annex I, Table 4 — other GHG objectives', res: 'Annex II, Table 7 — other RES objectives', ee: 'Annex IV, Table 6 — other EE objectives' }[which];
  const color = { ghg: hue('actual', dark), res: hue('wam', dark), ee: hue('extra', dark) }[which];

  return (
    <div className={`${CARD} p-4`}>
      <h3 className={`text-[13.5px] font-bold ${INK}`}>{title}</h3>
      {/* Each bar is a share of its own denominator — the steps do not share a
          unit (Member States, then objectives), so a common axis would lie. */}
      <div className="mt-3 space-y-2.5">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-[12px] ${INK}`}>{s.label}</span>
              <span className="shrink-0 font-mono text-[12px] font-bold" style={{ color }}>
                {s.value}<span className={`font-normal ${MUTED}`}> of {s.of}</span>
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-[3px] bg-grey-100 dark:bg-[#1A242E]">
              <div className="h-full rounded-[3px]" style={{ width: `${(s.value / s.of) * 100}%`, background: color }} />
            </div>
            <div className={`mt-0.5 text-[10.5px] leading-snug ${MUTED}`}>{s.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScopeCoverageGrid({ dark }: { dark: boolean }) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className={`border-b border-grey-200 text-[10.5px] uppercase tracking-[0.06em] dark:border-[#22303C] ${MUTED}`}>
              <th className="px-4 py-2 font-semibold">Scope</th>
              {(['2030', '2040', '2050'] as const).map((y) => (
                <th key={y} className="px-4 py-2 font-semibold">{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TARGET_COVERAGE.map((sc) => (
              <tr key={sc.short} className="border-b border-grey-100 align-top last:border-0 dark:border-[#1A242E]">
                <td className={`px-4 py-3 text-[12.5px] font-semibold ${INK}`}>
                  {sc.short}
                  <span className={`mt-0.5 block text-[10.5px] font-normal leading-snug ${MUTED}`}>{sc.scope}</span>
                </td>
                {([sc.y2030, sc.y2040, sc.y2050] as Country[][]).map((list, i) => (
                  <td key={i} className="px-4 py-3">
                    <span className={`block text-[17px] font-bold leading-none ${INK}`}>{list.length}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {list.map((cc) => (
                        <span key={cc} title={COUNTRY_NAMES[cc]}
                              className="rounded-[3px] px-1 py-0.5 font-mono text-[9.5px] font-semibold text-white"
                              style={{ background: hue('actual', dark) }}>
                          {cc}
                        </span>
                      ))}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NeutralityStrip({ dark }: { dark: boolean }) {
  const groups: { year: number | null; label: string }[] = [
    { year: 2035, label: '2035' }, { year: 2040, label: '2040' },
    { year: 2045, label: '2045' }, { year: 2050, label: '2050' }, { year: null, label: 'blank' },
  ];
  return (
    <div className={`${CARD} p-4`}>
      <h3 className={`text-[13.5px] font-bold ${INK}`}>Climate-neutrality year, Annex I Table 1</h3>
      <div className="mt-3 space-y-2">
        {groups.map((g) => {
          const list = EU27.filter((cc) => NEUTRALITY_YEAR[cc] === g.year);
          if (!list.length) return null;
          const blank = g.year === null;
          return (
            <div key={g.label} className="flex items-baseline gap-3">
              <span className={`w-12 shrink-0 font-mono text-[12px] font-bold ${blank ? MUTED : INK}`}>{g.label}</span>
              <span className="flex flex-wrap gap-1">
                {list.map((cc) => (
                  <span key={cc} title={COUNTRY_NAMES[cc]}
                        className={'rounded-[3px] px-1 py-0.5 font-mono text-[10px] font-semibold ' +
                          (blank ? 'bg-grey-100 text-grey-600 dark:bg-[#1A242E] dark:text-[#8FA3B3]' : 'text-white')}
                        style={blank ? undefined : { background: hue('actual', dark) }}>
                    {cc}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <p className={`mt-3 text-[11.5px] leading-snug ${MUTED}`}>
        {NEUTRALITY_ELSEWHERE.SE} Treat a blank as “not captured here”, not “no target”.
      </p>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

const SEVERITY_META: Record<FlagSeverity, { label: string; tone: 'good' | 'partial' | 'poor' }> = {
  error: { label: 'Error in the data', tone: 'poor' },
  structural: { label: 'Template defect', tone: 'partial' },
  comparability: { label: 'Blocks comparison', tone: 'partial' },
};

export default function NecprTargetsPage() {
  const [dark, setDark] = useState(false);
  const [annexFilter, setAnnexFilter] = useState<Annex | 'all'>('all');
  const [minStates, setMinStates] = useState(1);

  const families = useMemo(() => {
    const n = (f: TargetFamily) => new Set(f.members.map((m) => m.cc)).size;
    return TARGET_FAMILIES
      .filter((f) => (annexFilter === 'all' || f.annex === annexFilter) && n(f) >= minStates)
      .sort((a, b) => n(b) - n(a));
  }, [annexFilter, minStates]);

  const echoes = LULUCF_COMMITMENTS.filter((c) => c.verdict === 'echo');
  const unitErrors = LULUCF_COMMITMENTS.filter((c) => c.verdict === 'unit-error');
  const notReported = LULUCF_COMMITMENTS.filter((c) => c.verdict === 'not-reported');

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-grey-50 dark:bg-[#0B1219]">
        <SiteHeader />

        <main className="mx-auto max-w-content px-4 pb-20 pt-8 sm:px-6">
          {/* hero */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-text">
              <div className={`font-mono text-[11.5px] uppercase tracking-[0.1em] ${MUTED}`}>
                Beta · M · 40 · Reporting year 2025
              </div>
              <h1 className={`mt-2 text-[30px] font-bold leading-tight ${INK}`}>
                NECPR 2025 — what actually compares
              </h1>
              <p className={`mt-3 text-[15px] leading-relaxed ${MUTED}`}>
                The 2025 National Energy and Climate Progress Reports ask every Member State for its
                “other national objectives” in three places — greenhouse gases, renewables and energy
                efficiency. The result is 209 submitted rows from 22 Member States with no shared key: the
                same quantity arrives under seven different names, in two languages, on three bases.
                This module maps them into target families, shows how many Member States sit behind
                each one, and states exactly what has to be corrected before the numbers can be put on
                the same axis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDark((v) => !v)}
              className={`shrink-0 rounded-lg border border-grey-300 bg-white px-3 py-1.5 text-[12px] font-semibold dark:border-[#22303C] dark:bg-[#111A22] ${INK}`}
            >
              {dark ? '☀ Light' : '☾ Dark'}
            </button>
          </div>

          {/* headline tiles */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile value="26" label="target families" note="mapped by hand across the three annexes; 19 have three or more Member States behind them" accent={hue('actual', dark)} />
            <StatTile value="7" label="names, one quantity" note="what “sectoral transport GHG target” is called across the seven Member States that report it" accent={hue('wem', dark)} />
            <StatTile value="9" unit="of 66" label="comparable RES pairs" note="country–objective pairs in Annex II Table 7 with both a numeric target and a numeric value" accent={hue('wam', dark)} />
            <StatTile value="0" label="value columns in Annex IV Table 6" note="no unit, year or value field exists — the whole table is free text" accent={hue('alert', dark)} />
          </div>

          {/* 1 — the mapping */}
          <Section
            n="01"
            title="The mapping: which targets are actually the same target"
            lede={
              <>
                Nothing in the workbooks links one Member State’s objective to another’s. Names do not
                work as a key — the transport family alone arrives as “Transport emissionS target”,
                “Transport sector target in non-ETS”, “Sectoral greenhouse gas (GHG) emission reduction
                target”, “ESD emissions from transport sector”, “Sectoral objectives under the Climate
                Law”, “national indicative target according to the Federal Climate Change Act” and
                “Milestone target: Emissions from domestic transport by 2030”. What does work is the
                combination of <strong>sector field + unit + description</strong>. Each objective below
                was read and assigned on that basis; open a row to see every submission verbatim.
              </>
            }
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`text-[11.5px] font-semibold uppercase tracking-[0.06em] ${MUTED}`}>Annex</span>
              {(['all', 'I', 'II', 'IV'] as const).map((a) => (
                <button key={a} type="button" onClick={() => setAnnexFilter(a)}
                        className={`rounded border px-2.5 py-1 text-[11.5px] font-semibold ${
                          annexFilter === a
                            ? 'border-primary bg-primary text-white dark:border-[#2A86C2] dark:bg-[#2A86C2]'
                            : `border-grey-300 bg-white dark:border-[#22303C] dark:bg-[#111A22] ${MUTED}`
                        }`}>
                  {a === 'all' ? 'All three' : ANNEX_LABEL[a]}
                </button>
              ))}
              <span className={`ml-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] ${MUTED}`}>Min. states</span>
              {[1, 3, 5].map((n) => (
                <button key={n} type="button" onClick={() => setMinStates(n)}
                        className={`rounded border px-2.5 py-1 text-[11.5px] font-semibold ${
                          minStates === n
                            ? 'border-primary bg-primary text-white dark:border-[#2A86C2] dark:bg-[#2A86C2]'
                            : `border-grey-300 bg-white dark:border-[#22303C] dark:bg-[#111A22] ${MUTED}`
                        }`}>
                  {n}+
                </button>
              ))}
              <span className={`ml-auto text-[12px] ${MUTED}`}>{families.length} families shown</span>
            </div>

            <div className="space-y-2.5">
              {families.map((f) => <FamilyRow key={f.id} f={f} dark={dark} />)}
            </div>

            <div className={`${CARD} mt-4 p-4`}>
              <h3 className={`text-[13.5px] font-bold ${INK}`}>What this leaves you with</h3>
              <ul className={`mt-2 space-y-1.5 text-[13px] leading-relaxed ${MUTED}`}>
                <li>
                  <strong className={INK}>The sectoral ESR block is the prize.</strong> Eight Member
                  States report sectoral GHG targets — transport (7), agriculture (7), buildings (6),
                  waste (6), industry (5), energy supply (3). Five give levels in kt or Mt; PT and SI
                  give percentage cuts against 2005 written as fractions. Fix those two and the block
                  compares directly.
                </li>
                <li>
                  <strong className={INK}>Half the families are duplicates of better data.</strong>{' '}
                  Economy-wide targets, LULUCF removals, RES shares and final energy consumption are
                  all carried for all 27 Member States in the structured tables (Annex I Tables 1–3,
                  Annex II Table 1, Annex IV Table 1). Use those; treat the “other objectives” copy as
                  a cross-check, not a source.
                </li>
                <li>
                  <strong className={INK}>Two Member States submit untranslated.</strong> Poland’s 23
                  GHG entries are in Polish and France’s six energy-efficiency entries in French. Both
                  are mechanically translatable — but neither is matchable by name, which is why the
                  mapping keys on the sector and unit fields instead.
                </li>
                <li>
                  <strong className={INK}>Filter Poland before counting.</strong> Sixteen of its
                  twenty-three GHG entries are air-quality, water, waste or nature objectives. Left in,
                  Poland looks like the most prolific reporter in the table.
                </li>
              </ul>
            </div>
          </Section>

          {/* 2 — the sink */}
          <Section
            n="02"
            title="The aggregate land sink peaks in 2030, then shrinks"
            lede={
              <>
                Summing the 27 national LULUCF series gives a figure nobody reports directly. Under
                with-additional-measures projections the EU-27 sink reaches −233 Mt in 2030 — about
                77 Mt short of the −310 Mt target — and then <em>declines</em> to −199 Mt by 2040. The
                direction of travel in Member States’ own projections is the opposite of the growing
                sink a 2040 net target leans on. Annex I Tables 1 and 3 reproduce these figures
                exactly, which is a useful check that the two are internally consistent.
              </>
            }
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
              <SinkChart dark={dark} />
              <SinkByCountry dark={dark} />
            </div>
            <p className={`mt-3 max-w-text text-[13px] leading-relaxed ${MUTED}`}>
              The decline is concentrated. Germany’s land sector stays a net <strong>source</strong> of
              roughly +32 Mt through 2040 (it was +69 Mt in 2023); Finland, Latvia, Ireland, the
              Netherlands and Estonia are also net sources. Sweden’s sink falls from −31 to −18 Mt and
              France’s from −37 to −21 Mt, while Poland’s recovers to −42 Mt in 2030 before falling
              back to −30 Mt in 2040.
            </p>
          </Section>

          {/* 3 — echoes */}
          <Section
            n="03"
            title="Five “commitments” are the Member State’s own projection"
            lede={
              <>
                Annex I Table 3 asks for the LULUCF commitment stated in the current NECP. Five Member
                States entered a number that is, to within a rounding error, their own WEM or WAM
                projection for the same year — Greece says so outright in the description field:
                “Projected values in the WEM scenario.” Eight report nothing at all, and four submit in
                megatonnes into a kilotonne column. That leaves ten usable commitments out of 27.
              </>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {([
                ['Commitment = own projection', echoes, hue('alert', dark)],
                ['Submitted in Mt into a kt column', unitErrors, hue('wem', dark)],
                ['No commitment reported', notReported, dark ? '#3A4A58' : '#BCBEC0'],
              ] as const).map(([title, list, color]) => (
                <div key={title} className={`${CARD} p-4`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[26px] font-bold leading-none" style={{ color }}>{list.length}</span>
                    <span className={`text-[13px] font-semibold ${INK}`}>{title}</span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {list.map((c) => (
                      <li key={c.cc} className="flex items-start gap-2">
                        <span className="mt-[3px] shrink-0 rounded-[3px] px-1 py-0.5 font-mono text-[10px] font-semibold text-white"
                              style={{ background: color }}>
                          {c.cc}
                        </span>
                        <span className={`text-[11.5px] leading-snug ${MUTED}`}>
                          {c.note ?? `projection ${c.wam?.toLocaleString('en-GB')} kt`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className={`mt-3 max-w-text text-[13px] leading-relaxed ${MUTED}`}>
              Read together with section 2, the consequence is that this column cannot be used as a
              measure of ambition: for a large minority of Member States it is a restatement of the
              projection it would be compared against.
            </p>
          </Section>

          {/* 4 — coverage */}
          <Section
            n="04"
            title="Coverage: how much survives to a number"
            lede={
              <>
                Before any of the above, the arithmetic of who reported what. Ten Member States sent
                nothing to the GHG “other objectives” table, fourteen nothing to the RES one and
                nineteen nothing to the energy-efficiency one — and Denmark and Czechia between them
                submitted 26 rows of NA.
              </>
            }
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <CoverageFunnel which="ghg" dark={dark} />
              <CoverageFunnel which="res" dark={dark} />
              <CoverageFunnel which="ee" dark={dark} />
            </div>

            <h3 className={`mt-8 text-[15px] font-bold ${INK}`}>Headline targets, Annex I Table 1</h3>
            <p className={`mt-1.5 max-w-text text-[13px] leading-relaxed ${MUTED}`}>
              The structured part of the workbook is better, but not complete. Only ten Member States
              give a quantified 2040 target in any scope — and they do not all pick the same scope, so
              a cross-country table has to be built scope by scope and has gaps in every one.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
              <ScopeCoverageGrid dark={dark} />
              <NeutralityStrip dark={dark} />
            </div>
          </Section>

          {/* 5 — flags */}
          <Section
            n="05"
            title="Corrections to make first"
            lede={
              <>
                Ten flags worth carrying into any use of these files. The three marked{' '}
                <em>error in the data</em> are wrong as published and change conclusions; the rest are
                template and comparability problems. None of them is silently fixed in the extract —
                the published value is what the Member State submitted.
              </>
            }
          >
            <div className="space-y-2.5">
              {QUALITY_FLAGS.map((fl) => (
                <div key={fl.headline} className={`${CARD} p-4`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneChip tone={SEVERITY_META[fl.severity].tone}>{SEVERITY_META[fl.severity].label}</ToneChip>
                    <span className={`font-mono text-[10.5px] ${MUTED}`}>{fl.where}</span>
                    <span className={`font-mono text-[10.5px] font-semibold ${INK}`}>{fl.countries}</span>
                  </div>
                  <h3 className={`mt-1.5 text-[14px] font-bold leading-snug ${INK}`}>{fl.headline}</h3>
                  <p className={`mt-1 max-w-text text-[12.5px] leading-relaxed ${MUTED}`}>{fl.detail}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* provenance */}
          <div className={`${CARD} mt-12 p-5`}>
            <h2 className={`text-[15px] font-bold ${INK}`}>Where this comes from</h2>
            <p className={`mt-2 max-w-text text-[13px] leading-relaxed ${MUTED}`}>
              Three workbooks published through the EEA’s Reportnet 3 dataflow under Implementing
              Regulation (EU) 2022/2299: <em>NECPR Annex I — GHG Progress 2025</em>,{' '}
              <em>Annex II — RES 2025</em> and <em>Annex IV — EE Progress 2025</em>. Tidy CSVs and a
              machine-generated flag list are produced by{' '}
              <code className="rounded-sm border border-grey-200 bg-grey-50 px-1 py-0.5 font-mono text-[11.5px] dark:border-[#22303C] dark:bg-[#16212B]">
                scripts/extract-necpr-2025.py
              </code>{' '}
              into{' '}
              <code className="rounded-sm border border-grey-200 bg-grey-50 px-1 py-0.5 font-mono text-[11.5px] dark:border-[#22303C] dark:bg-[#16212B]">
                public/data/necpr-2025/
              </code>
              . The written review is at{' '}
              <code className="rounded-sm border border-grey-200 bg-grey-50 px-1 py-0.5 font-mono text-[11.5px] dark:border-[#22303C] dark:bg-[#16212B]">
                docs-internal/necpr-2025-annex-i-ii-iv-review-2026-07-29.md
              </code>
              .
            </p>
            <p className={`mt-3 max-w-text text-[13px] leading-relaxed ${MUTED}`}>
              <strong className={INK}>What is mechanical and what is judgement.</strong> The
              extraction, the sums and the flag detection are mechanical and reproducible. The
              assignment of objectives to target families in section 1 is a manual reading — every
              member carries the name exactly as submitted so the call can be checked. The EU-27
              LULUCF aggregate in section 2 is our sum of the 27 national series, not a figure any
              Member State reports.
            </p>
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
