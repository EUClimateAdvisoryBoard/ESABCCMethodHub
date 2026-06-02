/**
 * Progress dashboard for the Meetings module.
 * -------------------------------------------
 * A standard progress matrix aimed at the project lead. Renders an
 * at-a-glance read of where the project stands using only data already
 * tracked by Meetings + Milestones (no new persistence):
 *
 *   • Headline KPIs — overall % done, meetings logged, milestones done /
 *     total, overdue count, at-risk count.
 *   • Milestone status breakdown (doughnut).
 *   • Milestones by type (bar).
 *   • Meeting cadence per month (line) — proxy for project activity.
 *   • Milestones completed per month (bar) — velocity.
 *   • Upcoming milestones in the next 90 days, and any overdue ones.
 */
'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { Meeting, Milestone } from '@/lib/project-workspace/client';
import {
  MEETING_TYPES,
  MILESTONE_TYPES,
  MILESTONE_STATUS,
  metaOf,
  formatDate,
} from './meetingMeta';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const DAY = 86_400_000;

interface Props {
  meetings: Meeting[];
  milestones: Milestone[];
}

export default function MeetingsProgress({ meetings, milestones }: Props) {
  const now = Date.now();

  // ── Headline KPIs ─────────────────────────────────────────────────────
  const doneCount = milestones.filter(m => m.status === 'done').length;
  const atRiskCount = milestones.filter(m => m.status === 'at-risk').length;
  const inProgressCount = milestones.filter(m => m.status === 'in-progress').length;
  const overdue = useMemo(
    () =>
      milestones
        .filter(
          m => m.status !== 'done' && new Date(m.targetDate).getTime() < now - DAY,
        )
        .sort(
          (a, b) =>
            new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
        ),
    [milestones, now],
  );
  const upcoming = useMemo(
    () =>
      milestones
        .filter(m => m.status !== 'done')
        .filter(m => {
          const t = new Date(m.targetDate).getTime();
          return t >= now - DAY && t <= now + 90 * DAY;
        })
        .sort(
          (a, b) =>
            new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
        ),
    [milestones, now],
  );
  const progressPct = milestones.length
    ? Math.round((doneCount / milestones.length) * 100)
    : 0;

  // ── Status doughnut ───────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const entries = Object.entries(MILESTONE_STATUS);
    const counts = entries.map(([id]) => milestones.filter(m => m.status === id).length);
    return {
      labels: entries.map(([, meta]) => meta.label),
      datasets: [
        {
          data: counts,
          backgroundColor: entries.map(([, meta]) => meta.color),
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    };
  }, [milestones]);

  // ── Milestones by type ────────────────────────────────────────────────
  const typeData = useMemo(() => {
    const entries = Object.entries(MILESTONE_TYPES);
    const counts = entries.map(([id]) => milestones.filter(m => m.type === id).length);
    return {
      labels: entries.map(([, meta]) => meta.label),
      datasets: [
        {
          label: 'Milestones',
          data: counts,
          backgroundColor: entries.map(([, meta]) => meta.color),
          borderRadius: 4,
        },
      ],
    };
  }, [milestones]);

  // ── Meeting cadence per month ─────────────────────────────────────────
  const { cadenceLabels, cadenceData, velocityData } = useMemo(() => {
    const months = monthRange(meetings, milestones);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    const labels = months.map(fmt);
    const meetingCounts = months.map(
      m =>
        meetings.filter(mt => {
          const d = new Date(mt.occurredAt);
          return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
        }).length,
    );
    const doneByMonth = months.map(
      m =>
        milestones.filter(ms => {
          if (ms.status !== 'done') return false;
          const d = new Date(ms.targetDate);
          return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
        }).length,
    );
    return {
      cadenceLabels: labels,
      cadenceData: {
        labels,
        datasets: [
          {
            label: 'Meetings',
            data: meetingCounts,
            borderColor: '#004B7F',
            backgroundColor: 'rgba(0,75,127,0.15)',
            tension: 0.3,
            fill: true,
            pointRadius: 3,
          },
        ],
      },
      velocityData: {
        labels,
        datasets: [
          {
            label: 'Milestones completed',
            data: doneByMonth,
            backgroundColor: '#007B6C',
            borderRadius: 4,
          },
        ],
      },
    };
  }, [meetings, milestones]);

  const isEmpty = meetings.length === 0 && milestones.length === 0;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Overall progress" value={`${progressPct}%`} accent="bg-secondary" />
        <Kpi
          label="Milestones done"
          value={`${doneCount}/${milestones.length}`}
          sub={`${inProgressCount} in progress`}
        />
        <Kpi label="Meetings logged" value={meetings.length.toString()} />
        <Kpi
          label="Overdue"
          value={overdue.length.toString()}
          tone={overdue.length ? 'danger' : 'neutral'}
        />
        <Kpi
          label="At risk"
          value={atRiskCount.toString()}
          tone={atRiskCount ? 'warn' : 'neutral'}
        />
      </div>

      {/* Overall progress bar */}
      <div className="bg-white border border-grey-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-tertiary-dark">Overall milestone progress</h3>
          <span className="text-xs text-tertiary">
            {doneCount} of {milestones.length} milestones complete
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-grey-100 overflow-hidden">
          <div
            className="h-full bg-secondary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {isEmpty ? (
        <div className="bg-white border border-dashed border-grey-200 rounded-xl py-12 text-center text-sm text-tertiary-light">
          Log a meeting or add a milestone to start tracking progress.
        </div>
      ) : (
        <>
          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Milestone status">
              {milestones.length === 0 ? (
                <EmptyHint>Add milestones to see the status mix.</EmptyHint>
              ) : (
                <div className="h-64">
                  <Doughnut
                    data={statusData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } },
                      },
                    }}
                  />
                </div>
              )}
            </Card>
            <Card title="Milestones by type">
              {milestones.length === 0 ? (
                <EmptyHint>No milestones yet.</EmptyHint>
              ) : (
                <div className="h-64">
                  <Bar
                    data={typeData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
                        x: { ticks: { font: { size: 10 } } },
                      },
                    }}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Meeting cadence" subtitle="Meetings logged per month">
              {cadenceLabels.length === 0 ? (
                <EmptyHint>No meetings yet.</EmptyHint>
              ) : (
                <div className="h-64">
                  <Line
                    data={cadenceData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
                        x: { ticks: { font: { size: 10 } } },
                      },
                    }}
                  />
                </div>
              )}
            </Card>
            <Card title="Velocity" subtitle="Milestones completed per month">
              {cadenceLabels.length === 0 ? (
                <EmptyHint>No milestones completed yet.</EmptyHint>
              ) : (
                <div className="h-64">
                  <Bar
                    data={velocityData}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } },
                        x: { ticks: { font: { size: 10 } } },
                      },
                    }}
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Upcoming + overdue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Upcoming milestones" subtitle="Next 90 days">
              <MilestoneList items={upcoming} emptyHint="Nothing due in the next 90 days." />
            </Card>
            <Card title="Overdue milestones" subtitle="Target date has passed and not yet done">
              <MilestoneList
                items={overdue}
                emptyHint="No overdue milestones — nice work."
                danger
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function Kpi({
  label,
  value,
  sub,
  tone = 'neutral',
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'warn' | 'danger';
  accent?: string;
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-accent-red'
      : tone === 'warn'
        ? 'text-[#B5651D]'
        : 'text-tertiary-dark';
  return (
    <div className="bg-white border border-grey-200 rounded-xl p-3 relative overflow-hidden">
      {accent && <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />}
      <p className="text-[10px] uppercase tracking-wide text-tertiary font-medium">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-0.5 ${toneClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-tertiary-light mt-0.5">{sub}</p>}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-grey-200 rounded-xl p-4">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-tertiary-dark">{title}</h3>
        {subtitle && <p className="text-[11px] text-tertiary-light">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-tertiary-light italic py-8 text-center">{children}</p>
  );
}

function MilestoneList({
  items,
  emptyHint,
  danger,
}: {
  items: Milestone[];
  emptyHint: string;
  danger?: boolean;
}) {
  if (items.length === 0) {
    return <EmptyHint>{emptyHint}</EmptyHint>;
  }
  const now = Date.now();
  return (
    <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
      {items.map(m => {
        const meta = metaOf(MILESTONE_TYPES, m.type);
        const status = metaOf(MILESTONE_STATUS, m.status);
        const t = new Date(m.targetDate).getTime();
        const days = Math.round((t - now) / DAY);
        const dayLabel =
          days === 0 ? 'today' : days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`;
        return (
          <li
            key={m.id}
            className="flex items-center gap-2 rounded-lg border border-grey-200 bg-white px-2.5 py-1.5"
          >
            <span className="text-sm">{meta.icon}</span>
            <span className="text-sm text-tertiary-dark flex-1 truncate">{m.title}</span>
            <span
              className={`text-[10px] ${
                danger ? 'text-accent-red font-semibold' : 'text-tertiary-light'
              }`}
            >
              {formatDate(m.targetDate)} · {dayLabel}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${status.badge}`}>
              {status.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function monthRange(meetings: Meeting[], milestones: Milestone[]): Date[] {
  const times = [
    ...meetings.map(m => new Date(m.occurredAt).getTime()),
    ...milestones.map(m => new Date(m.targetDate).getTime()),
  ].filter(t => !isNaN(t));
  if (times.length === 0) return [];
  const lo = new Date(Math.min(...times));
  const hi = new Date(Math.max(...times));
  lo.setDate(1);
  lo.setHours(0, 0, 0, 0);
  hi.setDate(1);
  hi.setHours(0, 0, 0, 0);
  const months: Date[] = [];
  const cur = new Date(lo);
  let guard = 0;
  while (cur.getTime() <= hi.getTime() && guard++ < 120) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}
