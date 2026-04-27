'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  counts: { total: number; live: number; curated: number; by_category: Record<string, number> };
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
const LANE_H = 54;       // px height per swim lane
const DAY_W = 4.5;       // px per day on the timeline
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
            {visibleLanes.map(lane => (
              <div key={lane} className="flex items-center gap-1.5 px-3 border-b border-grey-100"
                style={{ height: LANE_H }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CAT[lane].color }} />
                <span className="text-[10px] font-semibold text-tertiary-dark whitespace-nowrap" style={{ color: CAT[lane].color }}>
                  {CAT[lane].label}
                </span>
              </div>
            ))}
          </div>

          {/* Scrollable timeline area */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
            <div style={{ width: totalWidth, minHeight: 28 + visibleLanes.length * LANE_H }} className="relative">
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
              {visibleLanes.map((lane, laneIdx) => {
                const events = eventsByLane.get(lane) || [];
                const yBase = 28 + laneIdx * LANE_H;
                return (
                  <div key={lane}>
                    {/* Lane background stripe */}
                    <div className="absolute left-0 right-0 border-b border-grey-100"
                      style={{ top: yBase, height: LANE_H, backgroundColor: laneIdx % 2 === 0 ? 'transparent' : '#f9fafb' }} />

                    {/* Events */}
                    {events.map(ev => {
                      const startDay = Math.max(0, daysBetween(timelineStart, ev.date));
                      const endDay = ev.endDate
                        ? Math.min(totalDays, daysBetween(timelineStart, ev.endDate))
                        : startDay;
                      const barW = Math.max((endDay - startDay + 1) * DAY_W, ev.importance === 'high' ? 120 : 100);
                      const left = startDay * DAY_W;
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
                            top: yBase + 6,
                            width: barW,
                            height: LANE_H - 12,
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
                );
              })}
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
