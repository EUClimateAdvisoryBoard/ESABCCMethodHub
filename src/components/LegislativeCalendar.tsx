/**
 * Monthly legislative calendar displaying upcoming policy deadlines, reviews, and transposition dates.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CalendarEvent {
  date: string;
  title: string;
  policy_id: string | null;
  type: 'deadline' | 'review' | 'implementation' | 'transposition';
  description: string;
}

const TYPE_STYLES: Record<CalendarEvent['type'], { dot: string; label: string; bg: string }> = {
  deadline:        { dot: 'bg-red-500',    label: 'Deadline',        bg: 'bg-red-50' },
  implementation:  { dot: 'bg-emerald-600', label: 'Implementation', bg: 'bg-emerald-50' },
  review:          { dot: 'bg-blue-500',   label: 'Review',          bg: 'bg-blue-50' },
  transposition:   { dot: 'bg-orange-500', label: 'Transposition',   bg: 'bg-orange-50' },
};

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function groupByMonth(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = ev.date.slice(0, 7); // YYYY-MM
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return map;
}

export default function LegislativeCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/eu-calendar')
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setLastUpdated(data.last_updated ?? '');
      })
      .catch(() => {
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter to only show upcoming events (from today onward)
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today);
  const grouped = groupByMonth(upcoming);

  if (loading) {
    return (
      <div className="bg-white rounded shadow-sm border border-grey-200 p-5 animate-pulse">
        <div className="h-4 bg-grey-100 rounded w-2/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-grey-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded shadow-sm border border-grey-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-grey-200">
        <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider">
          Legislative Calendar
        </h2>
        <p className="text-xs text-tertiary mt-1">Upcoming EU milestones</p>
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 border-b border-grey-200 flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(TYPE_STYLES).map(([type, style]) => (
          <span key={type} className="flex items-center gap-1 text-xs text-tertiary">
            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-3" style={{ maxHeight: 'calc(70vh - 140px)' }}>
        {upcoming.length === 0 ? (
          <p className="text-sm text-tertiary py-4 text-center">No upcoming events.</p>
        ) : (
          Array.from(grouped.entries()).map(([monthKey, monthEvents]) => (
            <div key={monthKey} className="mb-4 last:mb-0">
              {/* Month heading */}
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 sticky top-0 bg-white py-1">
                {formatMonth(monthEvents[0].date)}
              </h3>

              <div className="space-y-1.5">
                {monthEvents.map((ev) => {
                  const style = TYPE_STYLES[ev.type];
                  const eventKey = `${ev.date}-${ev.title}`;
                  const isExpanded = expandedId === eventKey;
                  const isClickable = !!ev.policy_id;

                  return (
                    <div key={eventKey}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : eventKey)}
                        className={`w-full text-left rounded px-3 py-2 transition-colors ${
                          isExpanded ? style.bg : 'hover:bg-grey-100'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-tertiary-dark leading-snug">
                              {ev.title}
                            </p>
                            <p className="text-xs text-tertiary mt-0.5">{formatDay(ev.date)}</p>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className={`rounded-b px-3 pb-3 pt-1 ml-5 ${style.bg}`}>
                          <p className="text-xs text-tertiary leading-relaxed">{ev.description}</p>
                          {isClickable && (
                            <button
                              onClick={() => router.push(`/policy/?id=${ev.policy_id}`)}
                              className="mt-2 text-xs font-medium text-primary hover:underline"
                            >
                              View policy details &rarr;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div className="px-5 py-2.5 border-t border-grey-200">
          <p className="text-xs text-grey-400">Updated: {lastUpdated}</p>
        </div>
      )}
    </div>
  );
}
