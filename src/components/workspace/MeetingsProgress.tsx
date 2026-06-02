/**
 * Progress dashboard for the Meetings & Progress module.
 * ------------------------------------------------------
 * Standard progress matrix aimed at the project lead, plus a Gantt chart
 * of project phases (time blocks with a title) with the key milestones
 * overlaid on top.
 *
 * Phases are a separate entity from meetings/milestones — stored in
 * pw_project_phases (migration 046) and edited inline here.
 *
 * Sections:
 *   • KPI strip — overall %, done/total milestones, meetings logged,
 *     overdue, at-risk.
 *   • Overall progress bar.
 *   • Gantt — horizontal time blocks per phase with milestone flags.
 *   • Doughnut: milestone status mix.
 *   • Bar: milestones by type.
 *   • Line: meetings logged per month.
 *   • Bar: milestones completed per month.
 *   • Lists: upcoming (next 90 days) + overdue milestones.
 */
'use client';

import { useMemo, useRef, useState } from 'react';
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
import { pwApi, type Meeting, type Milestone, type Phase } from '@/lib/project-workspace/client';
import {
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
const PHASE_COLORS = [
  '#004B7F',
  '#007B6C',
  '#6667AB',
  '#A530B8',
  '#FF9933',
  '#00928F',
  '#B83230',
  '#54728C',
];

interface Props {
  projectId: string;
  meetings: Meeting[];
  milestones: Milestone[];
  phases: Phase[];
  onUpsertPhase: (p: Phase) => void;
  onRemovePhase: (id: string) => void;
  requireAuth: (reason?: string) => Promise<unknown>;
}

export default function MeetingsProgress({
  projectId,
  meetings,
  milestones,
  phases,
  onUpsertPhase,
  onRemovePhase,
  requireAuth,
}: Props) {
  const now = Date.now();

  // ── Headline KPIs ─────────────────────────────────────────────────────
  const doneCount = milestones.filter(m => m.status === 'done').length;
  const atRiskCount = milestones.filter(m => m.status === 'at-risk').length;
  const inProgressCount = milestones.filter(m => m.status === 'in-progress').length;
  const overdue = useMemo(
    () =>
      milestones
        .filter(m => m.status !== 'done' && new Date(m.targetDate).getTime() < now - DAY)
        .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()),
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
        .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()),
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

  // ── Meeting cadence + velocity ────────────────────────────────────────
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

  const isEmpty = meetings.length === 0 && milestones.length === 0 && phases.length === 0;

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

      {/* Gantt chart of phases + key milestones */}
      <Gantt
        projectId={projectId}
        phases={phases}
        milestones={milestones}
        onUpsertPhase={onUpsertPhase}
        onRemovePhase={onRemovePhase}
        requireAuth={requireAuth}
      />

      {isEmpty ? (
        <div className="bg-white border border-dashed border-grey-200 rounded-xl py-12 text-center text-sm text-tertiary-light">
          Log a meeting, add a milestone or create a phase to start tracking progress.
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

// ─────────────────────────────────────────────────────────────────────────
// Gantt chart
// ─────────────────────────────────────────────────────────────────────────

function Gantt({
  projectId,
  phases,
  milestones,
  onUpsertPhase,
  onRemovePhase,
  requireAuth,
}: {
  projectId: string;
  phases: Phase[];
  milestones: Milestone[];
  onUpsertPhase: (p: Phase) => void;
  onRemovePhase: (id: string) => void;
  requireAuth: (reason?: string) => Promise<unknown>;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...phases].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      ),
    [phases],
  );

  // Date scale: span of phases + milestones + today, padded.
  const { min, max } = useMemo(() => {
    const times = [
      ...phases.flatMap(p => [
        new Date(p.startDate).getTime(),
        new Date(p.endDate).getTime(),
      ]),
      ...milestones.map(m => new Date(m.targetDate).getTime()),
      Date.now(),
    ].filter(t => !isNaN(t));
    if (times.length === 0) {
      const now = Date.now();
      return { min: now - 30 * DAY, max: now + 90 * DAY };
    }
    let lo = Math.min(...times);
    let hi = Math.max(...times);
    if (hi - lo < 14 * DAY) {
      const mid = (lo + hi) / 2;
      lo = mid - 30 * DAY;
      hi = mid + 30 * DAY;
    }
    const pad = (hi - lo) * 0.05;
    return { min: lo - pad, max: hi + pad };
  }, [phases, milestones]);

  const pctOf = (t: number) => ((t - min) / (max - min)) * 100;

  const monthTicks = useMemo(() => {
    const ticks: { t: number; label: string }[] = [];
    const start = new Date(min);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const cur = new Date(start);
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

  const todayPct = pctOf(Date.now());

  async function deletePhase(id: string) {
    if (!confirm('Delete this phase?')) return;
    await pwApi.deletePhase(id);
    onRemovePhase(id);
  }

  return (
    <div className="bg-white border border-grey-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-tertiary-dark">Project Gantt</h3>
          <p className="text-[11px] text-tertiary-light">
            Time blocks for each project phase, with key milestones overlaid as flags.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 rounded-md bg-secondary text-white text-xs font-semibold hover:bg-secondary-dark"
        >
          + Add phase
        </button>
      </div>

      {adding && (
        <div className="mb-3">
          <PhaseComposer
            projectId={projectId}
            existingCount={phases.length}
            onClose={() => setAdding(false)}
            onCreated={p => {
              onUpsertPhase(p);
              setAdding(false);
            }}
            requireAuth={requireAuth}
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-xs text-tertiary-light italic py-6 text-center border border-dashed border-grey-200 rounded-lg">
          No phases yet. Add a phase (e.g. "Drafting", "Subgroup review",
          "Publication push") to start the Gantt.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header axis */}
            <div className="grid grid-cols-[180px_1fr] gap-2 mb-1">
              <div />
              <div className="relative h-5">
                {monthTicks.map(tick => {
                  const left = pctOf(tick.t);
                  if (left < 0 || left > 100) return null;
                  return (
                    <span
                      key={tick.t}
                      className="absolute -translate-x-1/2 text-[9px] text-tertiary-light whitespace-nowrap"
                      style={{ left: `${left}%` }}
                    >
                      {tick.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-1.5">
              {sorted.map(phase => (
                <PhaseRow
                  key={phase.id}
                  phase={phase}
                  milestones={milestones.filter(ms => milestoneInPhase(ms, phase))}
                  min={min}
                  max={max}
                  isEditing={editing === phase.id}
                  onEdit={() => setEditing(phase.id)}
                  onCancelEdit={() => setEditing(null)}
                  onSave={async patch => {
                    if (!(await requireAuth('Sign in to edit a phase.'))) return;
                    const { phase: updated } = await pwApi.patchPhase(phase.id, patch);
                    onUpsertPhase(updated);
                    setEditing(null);
                  }}
                  onDelete={() => deletePhase(phase.id)}
                />
              ))}
            </div>

            {/* Today line + milestone flag row */}
            <div className="grid grid-cols-[180px_1fr] gap-2 mt-2">
              <div className="text-[11px] font-semibold text-tertiary-dark">
                Key milestones
              </div>
              <div className="relative h-10 border-t border-grey-200">
                {todayPct >= 0 && todayPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-accent-red/60"
                    style={{ left: `${todayPct}%` }}
                  >
                    <span className="absolute top-0 -translate-x-1/2 text-[9px] font-semibold text-accent-red bg-white px-1">
                      today
                    </span>
                  </div>
                )}
                {milestones.map(ms => {
                  const t = new Date(ms.targetDate).getTime();
                  const left = pctOf(t);
                  if (left < 0 || left > 100) return null;
                  const meta = metaOf(MILESTONE_TYPES, ms.type);
                  const status = metaOf(MILESTONE_STATUS, ms.status);
                  return (
                    <div
                      key={ms.id}
                      className="absolute -translate-x-1/2 group"
                      style={{ left: `${left}%`, top: 8 }}
                      title={`${ms.title} · ${formatDate(ms.targetDate)}`}
                    >
                      <div
                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow whitespace-nowrap"
                        style={{ background: meta.color }}
                      >
                        <span>{meta.icon}</span>
                        <span className="max-w-[100px] truncate">{ms.title}</span>
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: status.color }}
                        />
                      </div>
                    </div>
                  );
                })}
                {milestones.length === 0 && (
                  <p className="text-[10px] text-tertiary-light italic absolute inset-0 flex items-center justify-center">
                    Add milestones in the Meetings or Timeline tab to overlay them here.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function milestoneInPhase(m: Milestone, p: Phase): boolean {
  const t = new Date(m.targetDate).getTime();
  return t >= new Date(p.startDate).getTime() && t <= new Date(p.endDate).getTime() + DAY;
}

function PhaseRow({
  phase,
  milestones,
  min,
  max,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  phase: Phase;
  milestones: Milestone[];
  min: number;
  max: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<void> | void;
  onDelete: () => void;
}) {
  const start = new Date(phase.startDate).getTime();
  const end = Math.max(new Date(phase.endDate).getTime(), start);
  const leftPct = ((start - min) / (max - min)) * 100;
  const widthPct = Math.max(0.5, ((end - start) / (max - min)) * 100);
  const done = milestones.filter(m => m.status === 'done').length;
  const phaseProgress = milestones.length ? Math.round((done / milestones.length) * 100) : 0;

  if (isEditing) {
    return (
      <PhaseEditor
        phase={phase}
        onCancel={onCancelEdit}
        onSave={onSave}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 items-center group">
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ background: phase.color }}
        />
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-tertiary-dark truncate hover:text-primary text-left"
          title={phase.title}
        >
          {phase.title}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-[11px] text-tertiary hover:text-red-600 ml-auto shrink-0"
          aria-label="Delete phase"
        >
          ✕
        </button>
      </div>
      <div className="relative h-7 bg-grey-50 rounded">
        <div
          className="absolute inset-y-1 rounded shadow-sm flex items-center justify-between px-2 overflow-hidden"
          style={{
            left: `${Math.max(0, leftPct)}%`,
            width: `${Math.min(100 - Math.max(0, leftPct), widthPct)}%`,
            background: phase.color,
          }}
        >
          <span className="text-[10px] font-semibold text-white truncate">
            {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
          </span>
          {milestones.length > 0 && (
            <span className="text-[10px] text-white/90 shrink-0 ml-2">
              {done}/{milestones.length} · {phaseProgress}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseEditor({
  phase,
  onCancel,
  onSave,
  onDelete,
}: {
  phase: Phase;
  onCancel: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<void> | void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(phase.title);
  const [startDate, setStartDate] = useState(phase.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(phase.endDate.slice(0, 10));
  const [color, setColor] = useState(phase.color);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await onSave({ title: title.trim(), startDate, endDate, color });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_120px_auto] gap-2 items-end border border-grey-200 rounded-lg p-2.5 bg-grey-50">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Phase title"
        className="px-2 py-1.5 border border-grey-200 rounded text-sm"
      />
      <input
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
        className="px-2 py-1.5 border border-grey-200 rounded text-sm"
      />
      <input
        type="date"
        value={endDate}
        onChange={e => setEndDate(e.target.value)}
        className="px-2 py-1.5 border border-grey-200 rounded text-sm"
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2 justify-end">
        <button onClick={onDelete} className="px-2 py-1 rounded border border-grey-200 text-xs text-red-700">
          Delete
        </button>
        <button onClick={onCancel} className="px-2 py-1 rounded border border-grey-200 text-xs">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy || !title.trim()}
          className="px-3 py-1 rounded bg-secondary text-white text-xs font-semibold disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function PhaseComposer({
  projectId,
  existingCount,
  onClose,
  onCreated,
  requireAuth,
}: {
  projectId: string;
  existingCount: number;
  onClose: () => void;
  onCreated: (p: Phase) => void;
  requireAuth: (reason?: string) => Promise<unknown>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10),
  );
  const [color, setColor] = useState(PHASE_COLORS[existingCount % PHASE_COLORS.length]);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!title.trim()) return;
    if (!(await requireAuth('Sign in to add a phase.'))) return;
    setBusy(true);
    try {
      const { phase } = await pwApi.createPhase({
        projectId,
        title: title.trim(),
        startDate,
        endDate,
        color,
        sortOrder: existingCount,
      });
      onCreated(phase);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_120px_auto] gap-2 items-end border border-grey-200 rounded-lg p-2.5 bg-grey-50">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder='Phase title (e.g. "Drafting", "Subgroup review")'
        className="px-2 py-1.5 border border-grey-200 rounded text-sm"
      />
      <input
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
        className="px-2 py-1.5 border border-grey-200 rounded text-sm"
      />
      <input
        type="date"
        value={endDate}
        onChange={e => setEndDate(e.target.value)}
        className="px-2 py-1.5 border border-grey-200 rounded text-sm"
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-2 py-1 rounded border border-grey-200 text-xs">
          Cancel
        </button>
        <button
          onClick={create}
          disabled={busy || !title.trim()}
          className="px-3 py-1 rounded bg-secondary text-white text-xs font-semibold disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 border border-grey-200 rounded text-xs bg-white"
      >
        <span className="w-4 h-4 rounded" style={{ background: value }} />
        <span className="text-tertiary">Colour</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 p-1.5 bg-white border border-grey-200 rounded shadow-lg flex flex-wrap gap-1 w-40">
          {PHASE_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={`w-5 h-5 rounded ${value === c ? 'ring-2 ring-tertiary-dark' : ''}`}
              style={{ background: c }}
              aria-label={`Colour ${c}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────

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
