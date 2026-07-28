'use client';

/**
 * EU Green Deal Policy Tracker (beta module M·39).
 *
 * A register of the EGDSF (European Green Deal Sustainability Framework)
 * legislative initiatives tracked in ETC CE Report 2024/8, Annex 2 (April
 * 2024 snapshot), updated to July 2026 against the EP Legislative Train and
 * EUR-Lex — with a special focus on which ADOPTED acts have since been
 * REOPENED by the 2025-26 simplification / omnibus agenda.
 *
 * The centrepiece figure recreates the report's Figure 1.2 (grouped stacked
 * bars per policy area, double-counting initiatives that span more than one
 * area, exactly as the original does) and lets you toggle between the
 * April-2024 published view and the July-2026 updated view, where "adopted"
 * splits into stable vs reopened.
 *
 * Nothing in this file hard-codes counts, ids or names from the data — every
 * number is computed from INITIATIVES / OMNIBUS_PACKAGES so the page keeps
 * working unchanged when the data is regenerated from a fact-checked source.
 */

import { useMemo, useRef, useState, type MouseEvent } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  AREA_LABELS,
  AREA_ORDER,
  INITIATIVES,
  OMNIBUS_PACKAGES,
  type AmendmentStatus,
  type Group2024,
  type Initiative,
  type OmnibusPackage,
  type PolicyArea,
  type StatusNow,
  type Timing2024,
  type Verification,
} from './data';

/* ============================================================ constants */

const REPORT_PAGE_URL =
  'https://www.eionet.europa.eu/etcs/etc-ce/products/etc-ce-report-2024-8-investment-needs-and-gaps-for-the-sustainability-transition-in-europe-rethinking-the-european-green-deal-as-an-eu-industrial-strategy';
const REPORT_PDF_URL =
  'https://www.eionet.europa.eu/etcs/etc-ce/products/etc-ce-report-2024-8-investment-needs-and-gaps-for-the-sustainability-transition-in-europe-rethinking-the-european-green-deal-as-an-eu-industrial-strategy/@@download/file/Macroeconomics%20of%20sustainability%20transitions_for%20website.pdf';
const LEG_TRAIN_URL = 'https://www.europarl.europa.eu/legislative-train/';
const EURLEX_HOME_URL = 'https://eur-lex.europa.eu/';
const EC_SIMPLIFICATION_URL =
  'https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en';

/** Compact per-bar x-labels so five 3-4-bar groups fit without collisions. */
const BAR_LABEL_SHORT: Record<string, string> = {
  Adopted: 'Adopt.',
  Ongoing: 'Ongo.',
  Planned: 'Plan.',
  'Withdrawn/shelved': 'Withdr.',
};

const AREA_ABBR: Record<PolicyArea, string> = {
  'climate-energy': 'C&E',
  transport: 'TRA',
  'ce-industry': 'CE&I',
  'pollution-chemicals': 'P&C',
  biodiversity: 'BIO',
};

/** Validated colour palette — used verbatim, do not derive/blend. */
const COLOR = {
  adoptedStable: '#2a78d6',
  adoptedReopened: '#eb6834',
  delayed: '#e34948',
  onTime: '#008300',
  na: '#c3c2b7',
  ongoing2026: '#eda100',
  planned2026: '#c3c2b7',
  withdrawn: '#898781',
  gridline: '#e1e0d9',
  baseline: '#c3c2b7',
  textSecondary: '#52514e',
  textMuted: '#898781',
} as const;

const STATUS_NOW_META: Record<StatusNow, { label: string; color: string }> = {
  adopted: { label: 'Adopted', color: COLOR.adoptedStable },
  ongoing: { label: 'Ongoing', color: COLOR.ongoing2026 },
  planned: { label: 'Planned', color: COLOR.planned2026 },
  withdrawn: { label: 'Withdrawn', color: COLOR.withdrawn },
  shelved: { label: 'Shelved', color: COLOR.withdrawn },
};

const GROUP_2024_LABEL: Record<Group2024, string> = {
  adopted: 'Adopted',
  ongoing: 'Ongoing',
  planned: 'Planned',
};

const TIMING_2024_META: Record<Timing2024, { label: string; color: string }> = {
  delayed: { label: 'Delayed', color: COLOR.delayed },
  'on-time': { label: 'On time', color: COLOR.onTime },
  na: { label: 'n/a', color: COLOR.na },
};

const VERIFICATION_META: Record<Verification, { label: string; cls: string }> = {
  verified: { label: 'Verified', cls: 'border-secondary text-secondary-dark' },
  corrected: { label: 'Corrected', cls: 'border-accent-orange text-accent-orange' },
  unverified: { label: 'Unverified', cls: 'border-grey-400 text-tertiary-light' },
};

const AMENDMENT_STATUS_META: Record<AmendmentStatus, { label: string; cls: string }> = {
  proposed: { label: 'Proposed', cls: 'bg-grey-100 text-tertiary' },
  'provisional-agreement': { label: 'Provisional agreement', cls: 'bg-surface-yellow text-tertiary-dark' },
  adopted: { label: 'Adopted', cls: 'bg-surface-green text-secondary-dark' },
};

const OMNIBUS_STATUS_META: Record<OmnibusPackage['status'], { label: string; cls: string }> = {
  proposed: { label: 'Proposed', cls: 'bg-grey-100 text-tertiary' },
  'provisional-agreement': { label: 'Provisional agreement', cls: 'bg-surface-yellow text-tertiary-dark' },
  'partially-adopted': { label: 'Partially adopted', cls: 'bg-surface-orange text-accent-orange' },
  adopted: { label: 'Adopted', cls: 'bg-surface-green text-secondary-dark' },
};

/* ============================================================ small utils */

function fmtInt(n: number): string {
  return n.toLocaleString('en-GB');
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

function parseDate(d?: string): number {
  if (!d) return 0;
  // Accepts "2026-07", "2026-07-17", "2026" — pad to a sortable value.
  const parts = d.split('-');
  const y = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 1;
  const day = Number(parts[2]) || 1;
  return y * 10000 + m * 100 + day;
}

/* ============================================================ figure model */

type ViewYear = '2024' | '2026';

interface Segment {
  key: string;
  areaLabel: string;
  barLabel: string;
  segLabel: string;
  count: number;
  color: string;
  hatched?: boolean;
  items: string[];
}

interface Bar {
  key: string;
  barLabel: string;
  segments: Segment[]; // bottom to top
  total: number;
}

interface AreaGroup {
  area: PolicyArea;
  label: string;
  bars: Bar[];
}

function buildFigureData(view: ViewYear): AreaGroup[] {
  return AREA_ORDER.map((area) => {
    const areaLabel = AREA_LABELS[area];
    const inArea = (ini: Initiative) => ini.areas.includes(area);

    if (view === '2024') {
      const adopted = INITIATIVES.filter((i) => inArea(i) && i.group2024 === 'adopted');
      const buildTimingBar = (group: Group2024, label: string): Bar => {
        const inGroup = INITIATIVES.filter((i) => inArea(i) && i.group2024 === group);
        const byTiming = (t: Timing2024) => inGroup.filter((i) => (i.timing2024 ?? 'na') === t);
        const delayedItems = byTiming('delayed');
        const onTimeItems = byTiming('on-time');
        const naItems = byTiming('na');
        const segs: Segment[] = [
          {
            key: `${area}-${group}-delayed`, areaLabel, barLabel: label, segLabel: 'Delayed',
            count: delayedItems.length, color: COLOR.delayed, items: delayedItems.map((i) => i.name),
          },
          {
            key: `${area}-${group}-ontime`, areaLabel, barLabel: label, segLabel: 'On time',
            count: onTimeItems.length, color: COLOR.onTime, items: onTimeItems.map((i) => i.name),
          },
          {
            key: `${area}-${group}-na`, areaLabel, barLabel: label, segLabel: 'Timing n/a',
            count: naItems.length, color: COLOR.na, hatched: true, items: naItems.map((i) => i.name),
          },
        ].filter((s) => s.count > 0);
        return { key: `${area}-${group}`, barLabel: label, segments: segs, total: inGroup.length };
      };

      const adoptedBar: Bar = {
        key: `${area}-adopted`,
        barLabel: 'Adopted',
        segments: adopted.length
          ? [{
              key: `${area}-adopted-seg`, areaLabel, barLabel: 'Adopted', segLabel: '',
              count: adopted.length, color: COLOR.adoptedStable, items: adopted.map((i) => i.name),
            }]
          : [],
        total: adopted.length,
      };

      return {
        area, label: areaLabel,
        bars: [adoptedBar, buildTimingBar('ongoing', 'Ongoing'), buildTimingBar('planned', 'Planned')],
      };
    }

    // 2026 view
    const adoptedNow = INITIATIVES.filter((i) => inArea(i) && i.statusNow === 'adopted');
    const stable = adoptedNow.filter((i) => !i.reopened);
    const reopened = adoptedNow.filter((i) => i.reopened);
    const ongoingNow = INITIATIVES.filter((i) => inArea(i) && i.statusNow === 'ongoing');
    const plannedNow = INITIATIVES.filter((i) => inArea(i) && i.statusNow === 'planned');
    const withdrawnNow = INITIATIVES.filter(
      (i) => inArea(i) && (i.statusNow === 'withdrawn' || i.statusNow === 'shelved'),
    );

    const adoptedBar: Bar = {
      key: `${area}-adopted`,
      barLabel: 'Adopted',
      segments: [
        {
          key: `${area}-adopted-stable`, areaLabel, barLabel: 'Adopted', segLabel: 'Not reopened',
          count: stable.length, color: COLOR.adoptedStable, items: stable.map((i) => i.name),
        },
        {
          key: `${area}-adopted-reopened`, areaLabel, barLabel: 'Adopted', segLabel: 'Reopened',
          count: reopened.length, color: COLOR.adoptedReopened, items: reopened.map((i) => i.name),
        },
      ].filter((s) => s.count > 0),
      total: adoptedNow.length,
    };
    const ongoingBar: Bar = {
      key: `${area}-ongoing`,
      barLabel: 'Ongoing',
      segments: ongoingNow.length
        ? [{
            key: `${area}-ongoing-seg`, areaLabel, barLabel: 'Ongoing', segLabel: '',
            count: ongoingNow.length, color: COLOR.ongoing2026, items: ongoingNow.map((i) => i.name),
          }]
        : [],
      total: ongoingNow.length,
    };
    const plannedBar: Bar = {
      key: `${area}-planned`,
      barLabel: 'Planned',
      segments: plannedNow.length
        ? [{
            key: `${area}-planned-seg`, areaLabel, barLabel: 'Planned', segLabel: '',
            count: plannedNow.length, color: COLOR.planned2026, hatched: true, items: plannedNow.map((i) => i.name),
          }]
        : [],
      total: plannedNow.length,
    };
    const withdrawnBar: Bar = {
      key: `${area}-withdrawn`,
      barLabel: 'Withdrawn/shelved',
      segments: withdrawnNow.length
        ? [{
            key: `${area}-withdrawn-seg`, areaLabel, barLabel: 'Withdrawn/shelved', segLabel: '',
            count: withdrawnNow.length, color: COLOR.withdrawn, items: withdrawnNow.map((i) => i.name),
          }]
        : [],
      total: withdrawnNow.length,
    };

    return { area, label: areaLabel, bars: [adoptedBar, ongoingBar, plannedBar, withdrawnBar] };
  });
}

/* ============================================================ chart geometry helper */

function roundedTopPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  if (rr === 0) return `M${x},${y + h} L${x},${y} L${x + w},${y} L${x + w},${y + h} Z`;
  return [
    `M${x},${y + h}`,
    `L${x},${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    `L${x + w - rr},${y}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `L${x + w},${y + h}`,
    'Z',
  ].join(' ');
}

/* ============================================================ the figure component */

interface HoverInfo { x: number; y: number; cw: number; title: string; count: number; items: string[] }

function FigureChart({ view }: { view: ViewYear }) {
  const groups = useMemo(() => buildFigureData(view), [view]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const barsPerGroup = view === '2024' ? 3 : 4;
  const barW = 30;
  const barGap = 6;
  const groupInnerW = barsPerGroup * barW + (barsPerGroup - 1) * barGap;
  const groupGap = 34;
  const groupW = groupInnerW + groupGap;
  const margin = { l: 44, r: 16, t: 34, b: 56 };
  const chartH = 260;
  const W = margin.l + margin.r + groups.length * groupW - groupGap;
  const H = margin.t + margin.b + chartH;

  const maxTotal = Math.max(1, ...groups.flatMap((g) => g.bars.map((b) => b.total)));
  const yMax = Math.max(4, Math.ceil(maxTotal * 1.15));
  const yToPx = (v: number) => chartH - (v / yMax) * chartH;
  const ticks = 4;
  const tickStep = Math.max(1, Math.ceil(yMax / ticks));
  const tickValues: number[] = [];
  for (let v = 0; v <= yMax; v += tickStep) tickValues.push(v);

  const showHover = (e: MouseEvent, seg: Segment) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      cw: rect.width,
      title: `${seg.areaLabel} — ${seg.barLabel}${seg.segLabel ? ' · ' + seg.segLabel : ''}`,
      count: seg.count,
      items: seg.items,
    });
  };
  const clearHover = () => setHover(null);

  return (
    <div ref={wrapRef} className="relative">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block"
          style={{ minWidth: Math.max(560, W * 0.72) }}
          role="img"
          aria-label={`Grouped stacked bar chart of EU Green Deal initiatives by policy area, ${view === '2024' ? 'April 2024 snapshot' : 'July 2026 update'}`}
        >
          <defs>
            <pattern id="hatchNa" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill={COLOR.na} />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#a9a89d" strokeWidth="2" />
            </pattern>
          </defs>

          {/* gridlines + y ticks */}
          <g transform={`translate(${margin.l},${margin.t})`}>
            {tickValues.map((v) => (
              <g key={v}>
                <line x1={0} x2={W - margin.l - margin.r} y1={yToPx(v)} y2={yToPx(v)} stroke={COLOR.gridline} strokeWidth={1} />
                <text x={-8} y={yToPx(v) + 3} textAnchor="end" fontSize={9.5} fill={COLOR.textMuted}>
                  {v}
                </text>
              </g>
            ))}
            <line x1={0} x2={W - margin.l - margin.r} y1={chartH} y2={chartH} stroke={COLOR.baseline} strokeWidth={1.25} />

            {groups.map((g, gi) => {
              const gx = gi * groupW;
              return (
                <g key={g.area} transform={`translate(${gx},0)`}>
                  {g.bars.map((bar, bi) => {
                    const bx = bi * (barW + barGap);
                    let cursorY = chartH;
                    const rects = bar.segments.map((seg, si) => {
                      const segH = (seg.count / yMax) * chartH;
                      const y = cursorY - segH;
                      cursorY = y;
                      const isTop = si === bar.segments.length - 1;
                      const showLabel = segH >= 13 && seg.count > 0;
                      const labelDark = seg.hatched;
                      return (
                        <g key={seg.key}>
                          <path
                            d={isTop ? roundedTopPath(bx, y, barW, segH, 4) : `M${bx},${y} h${barW} v${segH} h${-barW} Z`}
                            fill={seg.hatched ? 'url(#hatchNa)' : seg.color}
                            stroke="#fff"
                            strokeWidth={1.5}
                            className="cursor-pointer transition-opacity hover:opacity-80"
                            role="img"
                            aria-label={`${seg.areaLabel}, ${seg.barLabel}${seg.segLabel ? ', ' + seg.segLabel : ''}: ${seg.count}`}
                            onMouseEnter={(e) => showHover(e, seg)}
                            onMouseMove={(e) => showHover(e, seg)}
                            onMouseLeave={clearHover}
                          />
                          {showLabel && (
                            <text
                              x={bx + barW / 2}
                              y={y + segH / 2 + 3.5}
                              textAnchor="middle"
                              fontSize={9.5}
                              fontWeight={700}
                              fill={labelDark ? COLOR.textSecondary : '#ffffff'}
                              className="pointer-events-none select-none"
                            >
                              {seg.count}
                            </text>
                          )}
                        </g>
                      );
                    });
                    const topY = bar.total > 0 ? chartH - (bar.total / yMax) * chartH : chartH;
                    return (
                      <g key={bar.key}>
                        {rects}
                        <text
                          x={bx + barW / 2}
                          y={topY - 5}
                          textAnchor="middle"
                          fontSize={9.5}
                          fontWeight={700}
                          fill={COLOR.textSecondary}
                        >
                          {bar.total > 0 ? bar.total : ''}
                        </text>
                        <text
                          x={bx + barW / 2}
                          y={chartH + 13}
                          textAnchor="middle"
                          fontSize={8.5}
                          fill={COLOR.textMuted}
                        >
                          {BAR_LABEL_SHORT[bar.barLabel] ?? bar.barLabel}
                        </text>
                      </g>
                    );
                  })}
                  <text
                    x={groupInnerW / 2}
                    y={chartH + 30}
                    textAnchor="middle"
                    fontSize={10.5}
                    fontWeight={700}
                    fill={COLOR.textSecondary}
                  >
                    {AREA_ABBR[g.area]}
                  </text>
                  <title>{g.label}</title>
                </g>
              );
            })}
          </g>

          <text x={4} y={16} fontSize={9.5} fill={COLOR.textMuted}>
            number of initiatives
          </text>
        </svg>
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute z-20 max-w-[260px] rounded-md border border-grey-300 bg-white p-2.5 text-[11px] shadow-lg"
          style={{
            left: Math.max(4, Math.min(hover.x + 12, hover.cw - 270)),
            top: hover.y + 14,
          }}
        >
          <p className="font-bold text-tertiary-dark">
            {hover.title} <span className="font-normal text-tertiary-light">· {hover.count}</span>
          </p>
          {hover.items.length > 0 && (
            <ul className="mt-1 max-h-56 space-y-0.5 overflow-y-auto">
              {hover.items.slice(0, 14).map((n) => (
                <li key={n} className="leading-snug text-tertiary">{n}</li>
              ))}
              {hover.items.length > 14 && (
                <li className="text-tertiary-light">+{hover.items.length - 14} more</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function LegendChip({ color, label, hatched }: { color: string; label: string; hatched?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {hatched ? (
        <svg width={14} height={14} className="shrink-0 rounded-sm">
          <defs>
            <pattern id={`legendHatch-${label.replace(/\s+/g, '')}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill={color} />
              <line x1="0" y1="0" x2="0" y2="5" stroke="#a9a89d" strokeWidth="1.6" />
            </pattern>
          </defs>
          <rect width={14} height={14} fill={`url(#legendHatch-${label.replace(/\s+/g, '')})`} />
        </svg>
      ) : (
        <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm" style={{ background: color }} />
      )}
      <span className="text-[11px] text-tertiary">{label}</span>
    </div>
  );
}

/* ============================================================ stat tile */

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 px-3 py-2.5">
      <div className="text-xl font-bold text-primary">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.08em] text-tertiary">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-tertiary-light">{sub}</div>}
    </div>
  );
}

/* ============================================================ verification badge */

function VerificationBadge({ v, notes }: { v: Verification; notes?: string }) {
  const m = VERIFICATION_META[v];
  return (
    <span
      title={notes ?? m.label}
      className={`inline-block rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.04em] ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

/* ============================================================ register row */

function RegisterRow({ ini }: { ini: Initiative }) {
  const [open, setOpen] = useState(false);
  const nowMeta = STATUS_NOW_META[ini.statusNow];
  const timingMeta = ini.timing2024 ? TIMING_2024_META[ini.timing2024] : null;

  return (
    <>
      <tr
        className="cursor-pointer border-t border-grey-200 align-top hover:bg-grey-50"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-3 py-2">
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 text-[10px] text-tertiary-light">{open ? '▾' : '▸'}</span>
            <div>
              <p className="text-[12.5px] font-semibold leading-snug text-tertiary-dark">{ini.name}</p>
              <p className="text-[10.5px] text-tertiary-light">{ini.ref2024}</p>
            </div>
          </div>
        </td>
        <td className="px-2 py-2">
          <div className="flex flex-wrap gap-1">
            {ini.areas.map((a) => (
              <span key={a} title={AREA_LABELS[a]} className="rounded bg-grey-100 px-1.5 py-0.5 text-[10px] font-semibold text-tertiary">
                {AREA_ABBR[a]}
              </span>
            ))}
          </div>
        </td>
        <td className="px-2 py-2">
          <span className="block text-[11px] font-medium text-tertiary-dark">{GROUP_2024_LABEL[ini.group2024]}</span>
          {timingMeta && (
            <span className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9.5px] font-semibold text-white" style={{ background: timingMeta.color }}>
              {timingMeta.label}
            </span>
          )}
        </td>
        <td className="px-2 py-2">
          <span className="inline-block rounded px-1.5 py-0.5 text-[9.5px] font-semibold text-white" style={{ background: nowMeta.color }}>
            {nowMeta.label}
          </span>
          {ini.actRef && (
            <p className="mt-1 text-[10.5px] leading-snug text-tertiary">
              {ini.eurlexUrl ? (
                <a
                  href={ini.eurlexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ini.actRef}
                </a>
              ) : (
                ini.actRef
              )}
              {ini.actDate ? ` · ${ini.actDate}` : ''}
            </p>
          )}
        </td>
        <td className="px-2 py-2">
          {ini.reopened && ini.reopenedBy && ini.reopenedBy.length > 0 ? (
            <div className="flex flex-col gap-1">
              {ini.reopenedBy.map((r, idx) => {
                const am = AMENDMENT_STATUS_META[r.status];
                return (
                  <a
                    key={`${r.pkg}-${idx}`}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={r.what}
                    onClick={(e) => e.stopPropagation()}
                    className={`inline-block max-w-[190px] truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${am.cls} hover:underline`}
                  >
                    {r.pkg}
                  </a>
                );
              })}
            </div>
          ) : (
            <span className="text-[10.5px] text-tertiary-light">—</span>
          )}
        </td>
        <td className="px-2 py-2">
          <div className="flex flex-col gap-1 text-[10.5px]">
            {ini.eurlexUrl && (
              <a href={ini.eurlexUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
                EUR-Lex ↗
              </a>
            )}
            {ini.legTrainUrl && (
              <a href={ini.legTrainUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
                Leg. Train ↗
              </a>
            )}
          </div>
        </td>
        <td className="px-3 py-2">
          <VerificationBadge v={ini.verification} notes={ini.checkNotes} />
        </td>
      </tr>
      {open && (
        <tr className="border-t border-grey-100 bg-grey-50">
          <td colSpan={7} className="px-4 py-3 text-[11.5px] leading-relaxed text-tertiary">
            <p><span className="font-semibold text-tertiary-dark">Status, July 2026 — </span>{ini.summaryNow}</p>
            {ini.checkNotes && (
              <p className="mt-1.5"><span className="font-semibold text-tertiary-dark">Verification notes — </span>{ini.checkNotes}</p>
            )}
            {ini.sources.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold text-tertiary-dark">Sources</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {ini.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* ============================================================ omnibus card */

function OmnibusCard({ pkg }: { pkg: OmnibusPackage }) {
  const meta = OMNIBUS_STATUS_META[pkg.status];
  return (
    <article className="flex flex-col rounded-lg border border-grey-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[13.5px] font-bold leading-snug text-tertiary-dark">{pkg.name}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>
      </div>
      <p className="mt-0.5 text-[10.5px] text-tertiary-light">{pkg.date}{pkg.ref ? ` · ${pkg.ref}` : ''}</p>
      {pkg.actsReopened && pkg.actsReopened.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {pkg.actsReopened.map((a) => (
            <span key={a} title={a} className="max-w-[220px] truncate rounded bg-surface-orange px-1.5 py-0.5 text-[10px] font-medium text-accent-orange">
              {a}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11.5px] leading-relaxed text-tertiary">{truncate(pkg.summary, 230)}</p>
      {pkg.sources.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-grey-100 pt-2">
          {pkg.sources.slice(0, 3).map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="text-[10.5px] text-primary hover:underline">
              {truncate(s.title, 42)} ↗
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

/* ============================================================ page */

export default function EuGreenDealPoliciesPage() {
  const [view, setView] = useState<ViewYear>('2026');

  const [areaFilter, setAreaFilter] = useState<Set<PolicyArea>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusNow | 'all'>('all');
  const [reopenedOnly, setReopenedOnly] = useState(false);
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const total = INITIATIVES.length;
    const adoptedNow = INITIATIVES.filter((i) => i.statusNow === 'adopted').length;
    const reopenedCount = INITIATIVES.filter((i) => i.reopened).length;
    const withdrawnOrShelved = INITIATIVES.filter((i) => i.statusNow === 'withdrawn' || i.statusNow === 'shelved').length;
    const verifiedOrCorrected = INITIATIVES.filter((i) => i.verification === 'verified' || i.verification === 'corrected').length;
    const verifiedShare = total > 0 ? Math.round((verifiedOrCorrected / total) * 100) : 0;
    return { total, adoptedNow, reopenedCount, withdrawnOrShelved, verifiedShare };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INITIATIVES.filter((i) => {
      if (areaFilter.size > 0 && !i.areas.some((a) => areaFilter.has(a))) return false;
      if (statusFilter !== 'all' && i.statusNow !== statusFilter) return false;
      if (reopenedOnly && !i.reopened) return false;
      if (q) {
        const hay = `${i.name} ${i.actRef ?? ''} ${i.ref2024}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [areaFilter, statusFilter, reopenedOnly, search]);

  const sortedOmnibus = useMemo(
    () => [...OMNIBUS_PACKAGES].sort((a, b) => parseDate(b.date) - parseDate(a.date)),
    [],
  );

  const toggleArea = (a: PolicyArea) => {
    setAreaFilter((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="mx-auto w-full max-w-content flex-1 px-4 py-10 sm:px-6">
        {/* ── Header ─────────────────────────────────────────────── */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary-light">
          M·39 — EU Green Deal Policy Tracker (beta)
        </p>
        <h1 className="mt-1 text-2xl font-bold text-tertiary-dark sm:text-3xl">
          EU Green Deal policy tracker — adopted, ongoing, planned, reopened
        </h1>
        <p className="mt-3 max-w-text text-sm leading-relaxed text-tertiary">
          Baseline is Annex 2 of{' '}
          <a href={REPORT_PAGE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-2 hover:underline">
            ETC CE Report 2024/8
          </a>{' '}
          (
          <a href={REPORT_PDF_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            PDF
          </a>
          ), &ldquo;Adopted, ongoing, and planned EGDSF legislative initiatives per environmental policy
          area&rdquo; — a snapshot taken in April 2024. This module carries that register forward to July
          2026 against the{' '}
          <a href={LEG_TRAIN_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            EP Legislative Train
          </a>{' '}
          and{' '}
          <a href={EURLEX_HOME_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            EUR-Lex
          </a>
          , and tracks which adopted acts have since been reopened by the 2025-26 simplification / omnibus agenda.
        </p>
        <div className="mt-3 max-w-text rounded-md border border-accent-orange/40 bg-surface-orange px-3.5 py-2.5 text-[12px] leading-relaxed text-tertiary-dark">
          <strong>AI-researched and AI-fact-checked — pending human sign-off.</strong> Each policy area was
          researched by one AI agent and fact-checked by a second, adversarial one; every act number was
          machine-verified against the EU Publications Office. Per-entry verification status is shown in the
          <em> Verification</em> column of the register below — treat &ldquo;unverified&rdquo; entries with
          care until a human reviewer signs off.
        </div>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Initiatives tracked" value={fmtInt(stats.total)} />
          <StatTile label="Adopted now" value={fmtInt(stats.adoptedNow)} sub="July 2026" />
          <StatTile label="Reopened" value={fmtInt(stats.reopenedCount)} sub="since April 2024" />
          <StatTile label="Withdrawn / shelved" value={fmtInt(stats.withdrawnOrShelved)} />
          <StatTile label="Verified / corrected" value={`${stats.verifiedShare}%`} sub="of all entries" />
        </section>

        {/* ── The figure ─────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-tertiary-dark">
            Figure — legislative initiatives by policy area, adopted vs reopened
          </h2>
          <p className="mt-1.5 max-w-text text-[13px] leading-relaxed text-tertiary">
            Each bar group is a policy area; an initiative that spans more than one area is counted in{' '}
            <em>every</em> area it belongs to, exactly as in the original figure. Toggle the snapshot below —
            the headline change to look for is the orange split inside the July-2026 &ldquo;Adopted&rdquo;
            bars: those are adopted acts that have since been reopened by an amending, postponing or
            simplifying measure.
          </p>

          <div className="mt-4 inline-flex rounded-full border border-grey-300 bg-grey-50 p-0.5">
            {(['2024', '2026'] as ViewYear[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  view === v ? 'bg-tertiary-dark text-white' : 'text-tertiary hover:text-tertiary-dark'
                }`}
              >
                {v === '2024' ? 'April 2024 — as published' : 'July 2026 — updated'}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-grey-200 bg-white p-4">
            <FigureChart view={view} />

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-grey-100 pt-3">
              {view === '2024' ? (
                <>
                  <LegendChip color={COLOR.adoptedStable} label="Adopted" />
                  <LegendChip color={COLOR.delayed} label="Ongoing / planned — delayed" />
                  <LegendChip color={COLOR.onTime} label="Ongoing / planned — on time" />
                  <LegendChip color={COLOR.na} hatched label="Ongoing / planned — timing n/a" />
                </>
              ) : (
                <>
                  <LegendChip color={COLOR.adoptedStable} label="Adopted — not reopened" />
                  <LegendChip color={COLOR.adoptedReopened} label="Adopted — reopened" />
                  <LegendChip color={COLOR.ongoing2026} label="Ongoing" />
                  <LegendChip color={COLOR.planned2026} hatched label="Planned" />
                  <LegendChip color={COLOR.withdrawn} label="Withdrawn / shelved" />
                </>
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px] italic text-tertiary-light">
            After Figure 1.2 in ETC CE Report 2024/8; double counting across areas as in the original.
            The April-2024 delayed / on-time split is reconstructed from the schedule remarks printed in
            Annex 2 (the original encoded it as table-cell colours, which text extraction cannot recover),
            so within-bar splits can differ slightly from the published figure; group totals match exactly.
          </p>
        </section>

        {/* ── Simplification watch ───────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-tertiary-dark">Simplification watch</h2>
          <p className="mt-1.5 max-w-text text-[13px] leading-relaxed text-tertiary">
            The Commission&rsquo;s 2025-26 simplification / &ldquo;omnibus&rdquo; agenda and the standalone
            packages that have reopened EU Green Deal legislation, most recent first ({fmtInt(sortedOmnibus.length)}
            {' '}tracked).
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedOmnibus.map((pkg) => (
              <OmnibusCard key={pkg.name} pkg={pkg} />
            ))}
          </div>
        </section>

        {/* ── The register ───────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-tertiary-dark">The register</h2>
          <p className="mt-1.5 max-w-text text-[13px] leading-relaxed text-tertiary">
            All {fmtInt(stats.total)} tracked initiatives — filter, search, and click a row to expand its
            full status note, verification notes and sources.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={areaFilter.size === 0}
              onClick={() => setAreaFilter(new Set())}
              className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                areaFilter.size === 0 ? 'border-tertiary-dark bg-tertiary-dark text-white' : 'border-grey-300 bg-white text-tertiary hover:border-tertiary'
              }`}
            >
              All areas
            </button>
            {AREA_ORDER.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={areaFilter.has(a)}
                onClick={() => toggleArea(a)}
                title={AREA_LABELS[a]}
                className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                  areaFilter.has(a) ? 'border-primary bg-primary text-white' : 'border-grey-300 bg-white text-tertiary hover:border-tertiary'
                }`}
              >
                {AREA_ABBR[a]}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] text-tertiary-dark">
              Status (July 2026):
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusNow | 'all')}
                className="rounded border border-grey-300 bg-white px-2 py-1 text-[12px] text-tertiary-dark"
              >
                <option value="all">All</option>
                <option value="adopted">Adopted</option>
                <option value="ongoing">Ongoing</option>
                <option value="planned">Planned</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="shelved">Shelved</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[12px] text-tertiary-dark">
              <input type="checkbox" checked={reopenedOnly} onChange={(e) => setReopenedOnly(e.target.checked)} className="accent-primary" />
              Reopened only
            </label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or act reference…"
              aria-label="Search initiatives by name or act reference"
              className="ml-auto w-full max-w-[260px] rounded border border-grey-300 bg-white px-2.5 py-1 text-[12px] text-tertiary-dark placeholder:text-tertiary-light"
            />
          </div>

          <p className="mt-2 text-[11px] text-tertiary-light">
            Showing {fmtInt(filtered.length)} of {fmtInt(stats.total)} initiatives.
          </p>

          <div className="mt-2 overflow-x-auto rounded-lg border border-grey-200">
            <table className="w-full min-w-[980px] border-collapse text-[12px]">
              <thead>
                <tr className="bg-grey-100 text-left text-[10.5px] uppercase tracking-[0.05em] text-tertiary">
                  <th className="px-3 py-2 font-semibold">Initiative</th>
                  <th className="px-2 py-2 font-semibold">Areas</th>
                  <th className="px-2 py-2 font-semibold">April 2024</th>
                  <th className="px-2 py-2 font-semibold">July 2026</th>
                  <th className="px-2 py-2 font-semibold">Reopened by</th>
                  <th className="px-2 py-2 font-semibold">Links</th>
                  <th className="px-3 py-2 font-semibold">Verification</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ini) => (
                  <RegisterRow key={ini.id} ini={ini} />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="bg-grey-50 px-4 py-6 text-center text-[12px] text-tertiary">
                No initiatives match this filter combination.
              </div>
            )}
          </div>
        </section>

        {/* ── Methodology ─────────────────────────────────────────── */}
        <section className="mt-12 rounded-lg border border-grey-200 bg-grey-50 p-5">
          <h2 className="text-[15px] font-bold text-tertiary-dark">Methodology</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-[12px] leading-relaxed text-tertiary">
            <li>
              <strong className="text-tertiary-dark">Baseline.</strong> The register starts from the EGDSF
              (European Green Deal Sustainability Framework) list of roughly 80 legislative initiatives across
              five environmental policy areas — climate and energy, transport, circular economy and industry,
              pollution and chemicals, and biodiversity/ecosystems/agriculture — as tabulated in Annex 2 of
              ETC CE Report 2024/8, the source behind the report&rsquo;s Figure 1.2.
            </li>
            <li>
              <strong className="text-tertiary-dark">April-2024 statuses.</strong> &ldquo;Adopted&rdquo; means
              the act had entered into force by the April 2024 snapshot; &ldquo;ongoing&rdquo; means it was
              still in the ordinary legislative procedure; &ldquo;planned&rdquo; means the Commission had
              flagged it but not yet tabled a proposal. Timing (&ldquo;on time&rdquo; / &ldquo;delayed&rdquo; /
              &ldquo;n/a&rdquo;) reflects the report&rsquo;s own assessment against the original EGDSF schedule.
            </li>
            <li>
              <strong className="text-tertiary-dark">July-2026 statuses.</strong> &ldquo;Withdrawn&rdquo; means
              the Commission formally withdrew the proposal; &ldquo;shelved&rdquo; means it remains tabled but
              stalled with no realistic path to adoption identified. All other initiatives keep the same
              adopted / ongoing / planned vocabulary, re-assessed as of July 2026.
            </li>
            <li>
              <strong className="text-tertiary-dark">&ldquo;Reopened&rdquo;.</strong> An adopted act is marked
              reopened if, between April 2024 and July 2026, a tabled or adopted amending, postponing or
              simplifying measure specifically targets it — including &ldquo;stop-the-clock&rdquo; delays,
              omnibus simplification packages, and targeted revisions such as the 2040 Climate Law amendment.
            </li>
            <li>
              <strong className="text-tertiary-dark">Double counting.</strong> An initiative that spans more
              than one policy area is counted once per area in the figure and in the per-area breakdowns above
              — matching how the original Figure 1.2 counts them. The register itself lists each initiative once.
            </li>
            <li>
              <strong className="text-tertiary-dark">AI generation.</strong> The July-2026 update, reopening
              analysis and per-entry sources were produced by one AI research agent per policy area, then
              fact-checked by a second, adversarial AI agent against EUR-Lex and the EP Legislative Train
              (generated July 2026). This is a beta module pending human sign-off — the per-entry Verification
              badge and its notes (visible on hover) record what the fact-check pass found.
            </li>
          </ol>
          <div className="mt-3 border-t border-grey-200 pt-3">
            <p className="text-[11.5px] font-semibold text-tertiary-dark">Sources</p>
            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
              <li><a href={REPORT_PAGE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ETC CE Report 2024/8 (product page) ↗</a></li>
              <li><a href={REPORT_PDF_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ETC CE Report 2024/8 (PDF) ↗</a></li>
              <li><a href={LEG_TRAIN_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">EP Legislative Train ↗</a></li>
              <li><a href={EURLEX_HOME_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">EUR-Lex ↗</a></li>
              <li><a href={EC_SIMPLIFICATION_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">EC simplification / omnibus tracker ↗</a></li>
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
