/**
 * Project timeline for the Meetings module.
 * -----------------------------------------
 * A horizontal time axis that plots every meeting (dots, above the line) and
 * every milestone (flags, below the line) by date. Milestones are draggable:
 * grab a flag and slide it left/right to reschedule it — the new date is
 * pushed up to the parent on drop (which persists it). A "today" marker and a
 * progress bar (share of milestones done) give an at-a-glance sense of where
 * the report stands.
 *
 * The scale is fit-to-width and computed from the data range (with padding),
 * so it stays readable whether the project spans a month or two years.
 */
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { Meeting, Milestone } from '@/lib/project-workspace/client';
import {
  MEETING_TYPES,
  MILESTONE_TYPES,
  MILESTONE_STATUS,
  metaOf,
  formatDate,
} from './meetingMeta';

const DAY = 86_400_000;

interface Props {
  meetings: Meeting[];
  milestones: Milestone[];
  selectedMeetingId: string | null;
  onSelectMeeting: (id: string) => void;
  onSelectMilestone: (id: string) => void;
  /** Persist a dragged milestone's new date (YYYY-MM-DD). */
  onMoveMilestone: (id: string, targetDate: string) => void;
}

export default function MeetingsTimeline({
  meetings,
  milestones,
  selectedMeetingId,
  onSelectMeeting,
  onSelectMilestone,
  onMoveMilestone,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; date: number } | null>(null);

  // ── Scale ──────────────────────────────────────────────────────────────
  const { min, max } = useMemo(() => {
    const times = [
      ...meetings.map(m => new Date(m.occurredAt).getTime()),
      ...milestones.map(m => new Date(m.targetDate).getTime()),
      Date.now(),
    ].filter(t => !isNaN(t));
    if (times.length === 0) {
      const now = Date.now();
      return { min: now - 30 * DAY, max: now + 30 * DAY };
    }
    let lo = Math.min(...times);
    let hi = Math.max(...times);
    if (hi - lo < 14 * DAY) {
      // Give a single-cluster project a sensible window.
      const mid = (lo + hi) / 2;
      lo = mid - 21 * DAY;
      hi = mid + 21 * DAY;
    }
    const pad = (hi - lo) * 0.08;
    return { min: lo - pad, max: hi + pad };
  }, [meetings, milestones]);

  const pctOf = useCallback(
    (t: number) => ((t - min) / (max - min)) * 100,
    [min, max]
  );

  const monthTicks = useMemo(() => {
    const ticks: { t: number; label: string }[] = [];
    const start = new Date(min);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const cur = new Date(start);
    // Avoid an unreadable wall of ticks on long projects.
    const span = (max - min) / DAY;
    const stepMonths = span > 540 ? 3 : span > 240 ? 2 : 1;
    let guard = 0;
    while (cur.getTime() <= max && guard++ < 60) {
      const t = cur.getTime();
      if (t >= min) {
        ticks.push({
          t,
          label: cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        });
      }
      cur.setMonth(cur.getMonth() + stepMonths);
    }
    return ticks;
  }, [min, max]);

  // ── Drag handling for milestones ─────────────────────────────────────────
  const xToDate = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return min + ratio * (max - min);
    },
    [min, max]
  );

  function startDrag(e: React.PointerEvent, m: Milestone) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ id: m.id, date: new Date(m.targetDate).getTime() });
  }
  function moveDrag(e: React.PointerEvent) {
    if (!drag) return;
    const d = xToDate(e.clientX);
    if (d != null) setDrag({ id: drag.id, date: d });
  }
  function endDrag() {
    if (!drag) return;
    const iso = new Date(drag.date).toISOString().slice(0, 10);
    const original = milestones.find(m => m.id === drag.id);
    if (original && original.targetDate.slice(0, 10) !== iso) {
      onMoveMilestone(drag.id, iso);
    }
    setDrag(null);
  }

  const todayPct = pctOf(Date.now());
  const doneCount = milestones.filter(m => m.status === 'done').length;
  const progress = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;

  return (
    <div className="bg-white border border-grey-200 rounded-xl p-4">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(MEETING_TYPES).slice(0, 4).map(([id, m]) => (
            <span key={id} className="inline-flex items-center gap-1 text-[10px] text-tertiary">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
              {m.label.replace(' meeting', '')}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 min-w-[180px]">
          <span className="text-[11px] text-tertiary whitespace-nowrap">
            Milestones {doneCount}/{milestones.length}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-grey-100 overflow-hidden">
            <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-secondary">{progress}%</span>
        </div>
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        className="relative select-none"
        style={{ height: 220, touchAction: 'pan-y' }}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
      >
        {/* Month gridlines + labels */}
        {monthTicks.map(tick => {
          const left = pctOf(tick.t);
          if (left < 0 || left > 100) return null;
          return (
            <div key={tick.t} className="absolute top-0 bottom-5" style={{ left: `${left}%` }}>
              <div className="w-px h-full bg-grey-100" />
              <span className="absolute bottom-0 -translate-x-1/2 text-[9px] text-tertiary-light whitespace-nowrap">
                {tick.label}
              </span>
            </div>
          );
        })}

        {/* Axis baseline */}
        <div className="absolute left-0 right-0 h-0.5 bg-grey-300" style={{ top: '50%' }} />

        {/* Today marker */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div className="absolute top-2 bottom-5" style={{ left: `${todayPct}%` }}>
            <div className="w-px h-full bg-accent-red/60" />
            <span className="absolute top-0 -translate-x-1/2 text-[9px] font-semibold text-accent-red bg-white px-1">
              today
            </span>
          </div>
        )}

        {/* Meeting dots (above the line) */}
        {meetings.map(mtg => {
          const t = new Date(mtg.occurredAt).getTime();
          const left = pctOf(t);
          if (left < 0 || left > 100) return null;
          const meta = metaOf(MEETING_TYPES, mtg.type);
          const selected = mtg.id === selectedMeetingId;
          return (
            <button
              key={mtg.id}
              type="button"
              onClick={() => onSelectMeeting(mtg.id)}
              className="absolute group -translate-x-1/2"
              style={{ left: `${left}%`, top: 'calc(50% - 10px)', transform: 'translate(-50%, -100%)' }}
              title={`${mtg.title} · ${formatDate(mtg.occurredAt)}`}
            >
              <span
                className={`block rounded-full border-2 border-white shadow transition-transform group-hover:scale-125 ${
                  selected ? 'ring-2 ring-offset-1 ring-tertiary-dark scale-125' : ''
                }`}
                style={{ width: 14, height: 14, background: meta.color }}
              />
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block z-20 w-44 text-left bg-tertiary-dark text-white text-[10px] rounded-md px-2 py-1 shadow-lg">
                <span className="font-semibold block truncate">{mtg.title || 'Untitled meeting'}</span>
                {meta.label} · {formatDate(mtg.occurredAt)}
                {mtg.keyPoints.length > 0 && (
                  <span className="block mt-1 text-grey-300">{mtg.keyPoints.length} key point(s)</span>
                )}
              </span>
            </button>
          );
        })}

        {/* Milestone flags (below the line, draggable) */}
        {milestones.map(ms => {
          const t = drag?.id === ms.id ? drag.date : new Date(ms.targetDate).getTime();
          const left = pctOf(t);
          if (left < 0 || left > 100) return null;
          const meta = metaOf(MILESTONE_TYPES, ms.type);
          const status = metaOf(MILESTONE_STATUS, ms.status);
          const dragging = drag?.id === ms.id;
          return (
            <div
              key={ms.id}
              className="absolute -translate-x-1/2"
              style={{ left: `${left}%`, top: '50%', zIndex: dragging ? 30 : 10 }}
            >
              {/* stem */}
              <div className="w-px h-4 mx-auto" style={{ background: meta.color }} />
              <button
                type="button"
                onPointerDown={e => startDrag(e, ms)}
                onClick={() => onSelectMilestone(ms.id)}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow cursor-grab active:cursor-grabbing whitespace-nowrap ${
                  dragging ? 'opacity-90 scale-105' : ''
                }`}
                style={{ background: meta.color }}
                title={`${ms.title} · ${formatDate(ms.targetDate)} — drag to reschedule`}
              >
                <span>{meta.icon}</span>
                <span className="max-w-[120px] truncate">{ms.title || 'Milestone'}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
              </button>
              {dragging && (
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-[10px] font-semibold text-tertiary-dark bg-yellow-100 border border-yellow-300 rounded px-1">
                  {formatDate(new Date(drag!.date).toISOString())}
                </span>
              )}
            </div>
          );
        })}

        {meetings.length === 0 && milestones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-tertiary-light">
            Add a meeting or milestone to populate the timeline.
          </div>
        )}
      </div>

      <p className="text-[10px] text-tertiary-light mt-2">
        Tip: drag a milestone flag left or right to reschedule it. Click a meeting dot to open it.
      </p>
    </div>
  );
}
