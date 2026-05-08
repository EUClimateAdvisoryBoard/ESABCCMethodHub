'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { policies as POLICY_CORPUS } from '@/data/policies';
import {
  linkToPolicyNavigator,
  linkToContentAnalysis,
  linkToReferenceCitation,
} from '@/lib/cross-module-links';

/**
 * Policy Clock — horizontal swim-lane timeline of the Brussels bubble.
 *
 * Visual layout:
 *   - Horizontal axis = time (months), scrollable
 *   - Vertical swim-lanes = category (ENVI, Council, Plenary, CWP …)
 *   - Events rendered as positioned colour-coded blocks
 *   - "Today" red marker line
 *   - Click any event to expand details
 *   - Filter chips toggle lanes on/off
 *   - AI weekly overview banner at the top
 */

export type PolicyClockCategory =
  | 'revision'
  | 'new_policy'
  | 'commission_workprogramme'
  | 'envi_committee'
  | 'council_meeting'
  | 'plenary'
  | 'consultation'
  | 'implementation';

export interface PolicyClockEvent {
  id: string;
  date: string;
  endDate?: string;
  time?: string;
  title: string;
  description: string;
  category: PolicyClockCategory;
  source: string;
  sourceUrl?: string;
  policyId?: string | null;
  location?: string;
  importance: 'high' | 'medium' | 'normal';
  tags: string[];
}

interface APIResponse {
  events: PolicyClockEvent[];
  overview: { text: string; generated: boolean; reason?: string };
  counts: { total: number; live: number; curated: number; reviews_due?: number; user?: number; by_category: Record<string, number> };
  sources: { key: string; label: string }[];
  last_updated: string;
}

const CAT: Record<PolicyClockCategory, { label: string; color: string; bg: string }> = {
  envi_committee:            { label: 'ENVI Committee',     color: '#007B6C', bg: '#e6f5f2' },
  council_meeting:           { label: 'Council',            color: '#1B3A5C', bg: '#e8edf2' },
  plenary:                   { label: 'EP Plenary',         color: '#6667AB', bg: '#eeeef8' },
  commission_workprogramme:  { label: 'Commission WP',      color: '#003399', bg: '#e6eaf5' },
  new_policy:                { label: 'New Policy',         color: '#0065A4', bg: '#e6f0f7' },
  revision:                  { label: 'Revision',           color: '#A530B8', bg: '#f5e6f7' },
  consultation:              { label: 'Consultation',       color: '#D97706', bg: '#fef3e2' },
  implementation:            { label: 'Implementation',     color: '#16A34A', bg: '#e6f5ea' },
};

const LANE_ORDER = Object.keys(CAT) as PolicyClockCategory[];
const LANE_H = 54;       // px height per swim lane (minimum)
const DAY_W = 4.5;       // px per day on the timeline
const ROW_SLOT = 26;     // px slot height per stacked event row
const EVENT_H_MULTI = 22;// px event pill height when rows are stacked
const LANE_PAD = 6;      // px top/bottom padding within each lane
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Helpers ──────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}

function fmtDay(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function relLabel(date: string): string {
  const d = daysBetween(new Date().toISOString().slice(0, 10), date);
  if (d < 0) return `${-d}d ago`;
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d < 7) return `in ${d} days`;
  if (d < 30) return `in ${Math.ceil(d / 7)}w`;
  return `in ${Math.round(d / 30)}mo`;
}

/** Generate month boundaries for the header ruler. */
function monthTicks(startDate: string, totalDays: number) {
  const start = new Date(startDate + 'T00:00:00');
  const ticks: { label: string; offsetDays: number; widthDays: number }[] = [];
  const d = new Date(start);
  d.setDate(1); // rewind to first of month
  while (true) {
    const mStart = new Date(d);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0); // last day of month
    const offsetDays = daysBetween(startDate, mStart.toISOString().slice(0, 10));
    const endDay = daysBetween(startDate, mEnd.toISOString().slice(0, 10));
    if (offsetDays > totalDays) break;
    ticks.push({
      label: `${MONTH_NAMES[mStart.getMonth()]} ${mStart.getFullYear()}`,
      offsetDays: Math.max(0, offsetDays),
      widthDays: Math.min(endDay, totalDays) - Math.max(0, offsetDays) + 1,
    });
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
  }
  return ticks;
}

/**
 * Assign each event to the lowest row index where it doesn't overlap any
 * already-placed event. Returns a map of event.id → row index (0-based).
 */
function assignRows(
  events: PolicyClockEvent[],
  timelineStart: string,
  totalDays: number,
): Map<string, number> {
  const rows = new Map<string, number>();
  const rowRightEdges: number[] = []; // rightmost pixel of each row's last event
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  for (const ev of sorted) {
    const startDay = Math.max(0, daysBetween(timelineStart, ev.date));
    const endDay = ev.endDate
      ? Math.min(totalDays, daysBetween(timelineStart, ev.endDate))
      : startDay;
    const barW = Math.max((endDay - startDay + 1) * DAY_W, ev.importance === 'high' ? 120 : 100);
    const left = startDay * DAY_W;
    const right = left + barW;

    let r = rowRightEdges.findIndex(edge => edge <= left);
    if (r === -1) r = rowRightEdges.length;
    rowRightEdges[r] = right;
    rows.set(ev.id, r);
  }
  return rows;
}

// ── Component ────────────────────────────────────────────────────────────

export default function PolicyClock({ onAddDate }: { onAddDate?: () => void } = {}) {
  const [data, setData] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<PolicyClockCategory>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'quarter' | 'half' | 'year'>('half');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchClock = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true); else setLoading(true);
      const res = await fetch(`/api/policy-clock?skip_ai=${force ? '0' : '0'}${force ? '&cache=' + Date.now() : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClock();
    const id = setInterval(() => fetchClock(true), 30 * 60_000);
    return () => clearInterval(id);
  }, [fetchClock]);

  // Compute timeline range
  const today = new Date().toISOString().slice(0, 10);
  const rangeDays = timeRange === 'quarter' ? 90 : timeRange === 'half' ? 180 : 365;
  // Start 14 days ago so recent events are visible
  const timelineStart = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const timelineEnd = new Date(Date.now() + rangeDays * 86400000).toISOString().slice(0, 10);
  const totalDays = daysBetween(timelineStart, timelineEnd);
  const totalWidth = totalDays * DAY_W;
  const todayOffset = daysBetween(timelineStart, today) * DAY_W;

  // Filter events
  const visibleLanes = useMemo(() => {
    if (activeCategories.size === 0) return LANE_ORDER;
    return LANE_ORDER.filter(c => activeCategories.has(c));
  }, [activeCategories]);

  const eventsByLane = useMemo(() => {
    const map = new Map<PolicyClockCategory, PolicyClockEvent[]>();
    if (!data) return map;
    for (const lane of visibleLanes) map.set(lane, []);
    for (const ev of data.events) {
      if (ev.date > timelineEnd || (ev.endDate || ev.date) < timelineStart) continue;
      if (!map.has(ev.category)) continue;
      map.get(ev.category)!.push(ev);
    }
    return map;
  }, [data, visibleLanes, timelineStart, timelineEnd]);

  const ticks = useMemo(() => monthTicks(timelineStart, totalDays), [timelineStart, totalDays]);

  // Per-lane layout: row assignments, effective height, and cumulative yBase.
  // Lanes with overlapping events expand vertically to stack them cleanly.
  const laneLayouts = useMemo((): {
    lane: PolicyClockCategory;
    events: PolicyClockEvent[];
    rowMap: Map<string, number>;
    numRows: number;
    rowSlot: number;
    eventH: number;
    height: number;
    yBase: number;
  }[] => {
    let yOffset = 28; // header ruler height
    return visibleLanes.map((lane: PolicyClockCategory) => {
      const events: PolicyClockEvent[] = eventsByLane.get(lane) || [];
      const rowMap = assignRows(events, timelineStart, totalDays);
      const numRows = events.length > 0
        ? Math.max(...events.map((ev: PolicyClockEvent) => (rowMap.get(ev.id) ?? 0) + 1))
        : 1;
      // Single row reuses the original tall pill; multi-row uses compact pills.
      const rowSlot = numRows === 1 ? LANE_H - 12 : ROW_SLOT;
      const eventH  = numRows === 1 ? LANE_H - 12 : EVENT_H_MULTI;
      const height  = Math.max(LANE_H, LANE_PAD * 2 + numRows * rowSlot);
      const yBase   = yOffset;
      yOffset += height;
      return { lane, events, rowMap, numRows, rowSlot, eventH, height, yBase };
    });
  }, [visibleLanes, eventsByLane, timelineStart, totalDays]);

  const totalLaneHeight = laneLayouts.reduce((sum: number, l: { height: number }) => sum + l.height, 0);

  // Scroll to "today" on first load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset - 200);
    }
  }, [loading, todayOffset]);

  const toggleCat = (c: PolicyClockCategory) => {
    setActiveCategories(prev => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c); else n.add(c);
      return n;
    });
  };

  const expandedEvent = data?.events.find(e => e.id === expandedId) || null;

  // Upcoming reviews strip — every `revision`-category event due in the next
  // 12 months, sorted by date. Clickable rows expand the event in place and
  // surface the cross-module nav (Policy Navigator / Content Analysis /
  // Reference Manager) inside the detail panel.
  const upcomingReviews = useMemo(() => {
    if (!data) return [] as PolicyClockEvent[];
    const horizon = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    return data.events
      .filter(e => e.category === 'revision' && e.date >= today && e.date <= horizon)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 12);
  }, [data, today]);

  return (
    <div className="bg-white rounded-lg border border-grey-200 shadow-sm overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-grey-200">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider">Policy Clock</h2>
              <span className="text-[10px] font-mono uppercase tracking-wider text-secondary bg-secondary/10 rounded px-1.5 py-0.5">Brussels</span>
            </div>
            <p className="text-xs text-tertiary mt-0.5">Interactive timeline of upcoming EU climate &amp; environment policy events</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onAddDate ? (
              <button type="button" onClick={onAddDate}
                className="text-[10px] px-2 py-1 rounded border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 transition flex items-center gap-1 font-semibold"
                title="Add a date to the Policy Clock">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add date
              </button>
            ) : (
              <Link href="/news-feed?view=post&mode=date"
                className="text-[10px] px-2 py-1 rounded border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 transition flex items-center gap-1 font-semibold"
                title="Add a date to the Policy Clock">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add date
              </Link>
            )}
            <div className="flex rounded border border-grey-200 overflow-hidden">
              {(['quarter', 'half', 'year'] as const).map(r => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={`text-[10px] px-2.5 py-1 transition ${timeRange === r ? 'bg-primary text-white' : 'bg-white text-tertiary hover:bg-grey-50'}`}>
                  {r === 'quarter' ? '3 mo' : r === 'half' ? '6 mo' : '12 mo'}
                </button>
              ))}
            </div>
            <button onClick={() => fetchClock(true)} disabled={refreshing}
              className="text-[10px] px-2 py-1 rounded border border-grey-200 bg-white text-tertiary hover:bg-grey-50 disabled:opacity-50 transition flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={refreshing ? 'animate-spin' : ''}>
                <path d="M21.5 2v6h-6M2.5 22v-6h6" />
                <path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2" />
              </svg>
              {refreshing ? '...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* AI overview */}
        {data?.overview?.text && (
          <div className="rounded-md bg-gradient-to-r from-secondary/5 to-primary/5 border border-grey-200 p-2.5 mb-2">
            <div className="flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-secondary shrink-0 mt-0.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <p className="text-xs text-tertiary-dark leading-relaxed">
                <span className="font-bold text-secondary mr-1">This week:</span>
                {data.overview.text}
                {data.overview.generated && <span className="text-[9px] text-tertiary ml-1">(AI)</span>}
              </p>
            </div>
          </div>
        )}

        {/* Reviews due — surfaces all upcoming review events and gives one-tap
            access to the linked policy's Navigator card, Content Analysis
            workbench, and official Reference Manager citation. */}
        {upcomingReviews.length > 0 && (
          <div className="rounded-md border border-grey-200 bg-white p-2.5 mb-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CAT.revision.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: CAT.revision.color }}>
                Reviews due ({upcomingReviews.length})
              </span>
              <span className="text-[10px] text-tertiary">— next 12 months</span>
            </div>
            <ul className="flex flex-col gap-1 max-h-[30vh] sm:max-h-48 overflow-y-auto">
              {upcomingReviews.map(ev => {
                const policy = ev.policyId ? POLICY_CORPUS.find(p => p.id === ev.policyId) : null;
                return (
                  <li key={ev.id} className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setExpandedId(ev.id)}
                      className="flex-1 text-left flex items-center gap-2 hover:bg-grey-50 rounded px-1.5 py-1 transition"
                      title="Open event detail"
                    >
                      <span className="text-tertiary tabular-nums shrink-0">{ev.date}</span>
                      <span className="text-tertiary-dark truncate flex-1">{ev.title}</span>
                      <span className="text-[9px] text-tertiary shrink-0">{relLabel(ev.date)}</span>
                    </button>
                    {ev.policyId && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Link
                          href={linkToPolicyNavigator(ev.policyId)}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition"
                          title={`Open ${policy?.short_title || ev.policyId} in Policy Navigator`}
                        >
                          Nav
                        </Link>
                        <Link
                          href={linkToContentAnalysis({ policyId: ev.policyId, context: ev.title })}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 transition"
                          title="Open in Content Analysis"
                        >
                          CA
                        </Link>
                        <Link
                          href={linkToReferenceCitation(ev.policyId)}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                          title="Open official citation in Reference Manager"
                        >
                          Cite
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-1">
          {LANE_ORDER.map(c => {
            const meta = CAT[c];
            const active = activeCategories.size === 0 || activeCategories.has(c);
            const count = eventsByLane.get(c)?.length || 0;
            return (
              <button key={c} onClick={() => toggleCat(c)}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition ${active ? 'opacity-100' : 'opacity-30'}`}
                style={{ borderColor: meta.color + '50', backgroundColor: meta.bg, color: meta.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="font-medium">{meta.label}</span>
                {count > 0 && <span className="font-bold">{count}</span>}
              </button>
            );
          })}
          {activeCategories.size > 0 && (
            <button onClick={() => setActiveCategories(new Set())}
              className="text-[10px] px-2 py-1 rounded-full bg-grey-100 text-tertiary hover:bg-grey-200 transition">
              Show all
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline body ─────────────────────────────────────────── */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-tertiary">Loading Brussels events...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-xs text-red-700">{error}</div>
      ) : (
        <div className="flex overflow-hidden">
          {/* Lane labels (fixed left column) */}
          <div className="shrink-0 border-r border-grey-200 bg-grey-50 z-10">
            {/* Header spacer for the month ruler */}
            <div className="h-[28px] border-b border-grey-200" />
            {laneLayouts.map(({ lane, height }: { lane: PolicyClockCategory; height: number }) => (
              <div key={lane} className="flex items-center gap-1.5 px-3 border-b border-grey-100"
                style={{ height }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CAT[lane].color }} />
                <span className="text-[10px] font-semibold text-tertiary-dark whitespace-nowrap" style={{ color: CAT[lane].color }}>
                  {CAT[lane].label}
                </span>
              </div>
            ))}
          </div>

          {/* Scrollable timeline area */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
            <div style={{ width: totalWidth, minHeight: 28 + totalLaneHeight }} className="relative">
              {/* Month ruler */}
              <div className="h-[28px] border-b border-grey-200 flex sticky top-0 bg-white z-10">
                {ticks.map((t, i) => (
                  <div key={i} className="border-r border-grey-200 flex items-center px-2 text-[10px] font-bold text-tertiary-dark uppercase tracking-wider shrink-0"
                    style={{ width: t.widthDays * DAY_W, marginLeft: i === 0 ? t.offsetDays * DAY_W : 0 }}>
                    {t.widthDays * DAY_W > 40 ? t.label : t.label.slice(0, 3)}
                  </div>
                ))}
              </div>

              {/* Vertical month grid lines */}
              {ticks.map((t, i) => (
                <div key={`g-${i}`} className="absolute top-[28px] bottom-0 border-l border-grey-100"
                  style={{ left: t.offsetDays * DAY_W }} />
              ))}

              {/* Today marker */}
              <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: todayOffset }}>
                <div className="w-0.5 h-full bg-red-500 opacity-70" />
                <div className="absolute -top-0 -left-[14px] text-[8px] font-bold text-white bg-red-500 rounded px-1 py-0.5">
                  TODAY
                </div>
              </div>

              {/* Swim lanes */}
              {laneLayouts.map(({ lane, events, rowMap, rowSlot, eventH, height, yBase }: {
                lane: PolicyClockCategory; events: PolicyClockEvent[];
                rowMap: Map<string, number>; rowSlot: number; eventH: number;
                height: number; yBase: number;
              }, laneIdx: number) => (
                <div key={lane}>
                  {/* Lane background stripe — height matches stacked rows */}
                  <div className="absolute left-0 right-0 border-b border-grey-100"
                    style={{ top: yBase, height, backgroundColor: laneIdx % 2 === 0 ? 'transparent' : '#f9fafb' }} />

                  {/* Events — placed in overlap-free rows */}
                  {events.map((ev: PolicyClockEvent) => {
                    const startDay = Math.max(0, daysBetween(timelineStart, ev.date));
                    const endDay = ev.endDate
                      ? Math.min(totalDays, daysBetween(timelineStart, ev.endDate))
                      : startDay;
                    const barW = Math.max((endDay - startDay + 1) * DAY_W, ev.importance === 'high' ? 120 : 100);
                    const left = startDay * DAY_W;
                    const rowIdx = rowMap.get(ev.id) ?? 0;
                    const topOffset = yBase + LANE_PAD + rowIdx * rowSlot + Math.floor((rowSlot - eventH) / 2);
                    const isExpanded = expandedId === ev.id;
                    const meta = CAT[ev.category];

                    return (
                      <button key={ev.id}
                        onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                        className={`absolute rounded-md border text-left px-1.5 py-0.5 transition-all hover:shadow-md hover:z-30 cursor-pointer group ${
                          isExpanded ? 'z-30 outline outline-2 outline-offset-1 shadow-lg' : 'z-10'
                        }`}
                        style={{
                          left,
                          top: topOffset,
                          width: barW,
                          height: eventH,
                          backgroundColor: meta.bg,
                          borderColor: meta.color + '60',
                          outlineColor: isExpanded ? meta.color : undefined,
                        }}
                        title={`${fmtDay(ev.date)} — ${ev.title}`}
                      >
                        <div className="flex items-center gap-1 overflow-hidden h-full">
                          {ev.importance === 'high' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                          )}
                          <span className="text-[10px] font-semibold leading-tight truncate" style={{ color: meta.color }}>
                            {ev.title}
                          </span>
                        </div>
                        {/* Tooltip on hover */}
                        <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-60 bg-white rounded-lg shadow-xl border border-grey-200 p-3 z-50 pointer-events-none">
                          <p className="text-[10px] font-bold" style={{ color: meta.color }}>{meta.label}</p>
                          <p className="text-xs font-semibold text-tertiary-dark mt-0.5">{ev.title}</p>
                          <p className="text-[10px] text-tertiary mt-1">{fmtDay(ev.date)} {ev.endDate && ev.endDate !== ev.date ? `→ ${fmtDay(ev.endDate)}` : ''}</p>
                          <p className="text-[10px] text-tertiary mt-0.5 leading-relaxed line-clamp-3">{ev.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Expanded event detail panel ────────────────────────────── */}
      {expandedEvent && (
        <div className="border-t border-grey-200 bg-grey-50 px-4 sm:px-5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT[expandedEvent.category].color }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: CAT[expandedEvent.category].color }}>
                  {CAT[expandedEvent.category].label}
                </span>
                {expandedEvent.importance === 'high' && (
                  <span className="text-[9px] font-bold text-red-600 bg-red-50 rounded px-1.5 py-0.5">KEY EVENT</span>
                )}
                <span className="text-[10px] text-tertiary">{relLabel(expandedEvent.date)}</span>
              </div>
              <h3 className="text-sm font-bold text-tertiary-dark">{expandedEvent.title}</h3>
              <p className="text-xs text-tertiary leading-relaxed mt-1">{expandedEvent.description}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] text-tertiary font-medium">
                  {fmtDay(expandedEvent.date)}
                  {expandedEvent.endDate && expandedEvent.endDate !== expandedEvent.date ? ` → ${fmtDay(expandedEvent.endDate)}` : ''}
                </span>
                {expandedEvent.location && (
                  <span className="text-[10px] text-tertiary">| {expandedEvent.location}</span>
                )}
                <span className="text-[10px] text-tertiary">| {expandedEvent.source}</span>
                {expandedEvent.sourceUrl && (
                  <a href={expandedEvent.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-medium text-secondary hover:underline">
                    Source ↗
                  </a>
                )}
              </div>
              {expandedEvent.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {expandedEvent.tags.map(t => (
                    <span key={t} className="text-[9px] text-tertiary bg-white border border-grey-200 rounded px-1.5 py-0.5">#{t}</span>
                  ))}
                </div>
              )}

              {/* Cross-module navigation — appears whenever the event carries
                  a universal policyId, stitching Policy Clock together with
                  Policy Navigator, Content Analysis, and the Reference
                  Manager (where the policy is rendered as an official
                  citation). */}
              {expandedEvent.policyId && (() => {
                const policy = POLICY_CORPUS.find(p => p.id === expandedEvent.policyId);
                return (
                  <div className="mt-3 pt-2.5 border-t border-grey-200">
                    <div className="flex items-center gap-2 mb-1.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-primary">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary-dark">
                        Linked policy
                      </span>
                      {policy && (
                        <span className="text-[10px] font-semibold text-primary">{policy.short_title}</span>
                      )}
                      <span className="text-[9px] font-mono text-tertiary">id: {expandedEvent.policyId}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={linkToPolicyNavigator(expandedEvent.policyId)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
                        </svg>
                        Policy Navigator
                      </Link>
                      <Link
                        href={linkToContentAnalysis({
                          policyId: expandedEvent.policyId,
                          context: expandedEvent.title,
                        })}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 transition"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="9" y1="13" x2="15" y2="13" />
                          <line x1="9" y1="17" x2="13" y2="17" />
                        </svg>
                        Content Analysis
                      </Link>
                      <Link
                        href={linkToReferenceCitation(expandedEvent.policyId)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                        title="Open the official policy citation in the Reference Manager"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
                          <path d="M3 7l9 6 9-6" />
                          <path d="M3 7l9-4 9 4" />
                        </svg>
                        Official Citation
                      </Link>
                    </div>
                  </div>
                );
              })()}
            </div>
            <button onClick={() => setExpandedId(null)}
              className="text-tertiary hover:text-tertiary-dark p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────────────── */}
      {data && (
        <div className="px-4 sm:px-5 py-2 border-t border-grey-200 bg-grey-50 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-tertiary">
          <span>{data.counts.curated} curated + {data.counts.live} live events</span>
          <span>|</span>
          <span>Updated {new Date(data.last_updated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="ml-auto">Scroll ← → to navigate timeline</span>
        </div>
      )}
    </div>
  );
}
