/**
 * Body for the "meetings" project-workspace module kind.
 * ------------------------------------------------------
 * A meeting tracker for a report project. Everything persists to the
 * `pw_meetings` / `pw_meeting_milestones` tables (migration 044) so every
 * contributor sees the same state.
 *
 * What it does:
 *   • Log meetings with a type (team / subgroup / champion / publication / …)
 *     and a date.
 *   • Capture notes, a summary and formal minutes — each a collaborative,
 *     autosaving field that everyone edits in place.
 *   • "✨ Find the 3 key points" runs an LLM over the notes/minutes to pull out
 *     the main three takeaways (also "✨ Draft summary").
 *   • Record the meeting on your phone/laptop → transcribe straight into notes.
 *   • Threaded discussion + @mentions per meeting (CollaborationPanel).
 *   • A project timeline plotting meetings + draggable milestones (publication,
 *     subgroup, champion, …) with a progress bar.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { pwApi, type Meeting, type Milestone } from '@/lib/project-workspace/client';
import CollaborationPanel from './CollaborationPanel';
import MeetingsTimeline from './MeetingsTimeline';
import MeetingsProgress from './MeetingsProgress';
import {
  MEETING_TYPES,
  MILESTONE_TYPES,
  MILESTONE_STATUS,
  MEETING_TYPE_OPTIONS,
  MILESTONE_TYPE_OPTIONS,
  MILESTONE_STATUS_OPTIONS,
  metaOf,
  formatDate,
} from './meetingMeta';

interface Props {
  projectId: string;
  initialMeetings: Meeting[];
  initialMilestones: Milestone[];
}

type View = 'meetings' | 'timeline' | 'progress';

export default function MeetingsModule({ projectId, initialMeetings, initialMilestones }: Props) {
  const { requireAuth } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [view, setView] = useState<View>('meetings');
  const [selectedId, setSelectedId] = useState<string | null>(initialMeetings[0]?.id ?? null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [composing, setComposing] = useState(false);

  const selected = meetings.find(m => m.id === selectedId) ?? null;

  const filtered = useMemo(
    () => meetings.filter(m => typeFilter === 'all' || m.type === typeFilter),
    [meetings, typeFilter]
  );

  function upsertMeeting(m: Meeting) {
    setMeetings(prev => {
      const i = prev.findIndex(x => x.id === m.id);
      if (i === -1) return [...prev, m].sort(byDate);
      const next = [...prev];
      next[i] = m;
      return next.sort(byDate);
    });
  }

  async function createMeeting(input: {
    title: string;
    type: string;
    occurredAt: string;
    location: string;
    attendees: string;
  }) {
    if (!(await requireAuth('Sign in to add a meeting.'))) return;
    const { meeting } = await pwApi.createMeeting({ projectId, ...input });
    upsertMeeting(meeting);
    setSelectedId(meeting.id);
    setComposing(false);
    setView('meetings');
  }

  async function removeMeeting(id: string) {
    if (!confirm('Delete this meeting and its notes? This cannot be undone.')) return;
    await pwApi.deleteMeeting(id);
    setMeetings(prev => prev.filter(m => m.id !== id));
    setMilestones(prev => prev.map(ms => (ms.meetingId === id ? { ...ms, meetingId: null } : ms)));
    if (selectedId === id) setSelectedId(null);
  }

  // ── Milestones ─────────────────────────────────────────────────────────
  function upsertMilestone(m: Milestone) {
    setMilestones(prev => {
      const i = prev.findIndex(x => x.id === m.id);
      if (i === -1) return [...prev, m];
      const next = [...prev];
      next[i] = m;
      return next;
    });
  }
  async function moveMilestone(id: string, targetDate: string) {
    upsertMilestone({ ...milestones.find(m => m.id === id)!, targetDate });
    try {
      const { milestone } = await pwApi.patchMilestone(id, { targetDate });
      upsertMilestone(milestone);
    } catch {
      /* best-effort; local state already moved */
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-tertiary-dark">Meetings &amp; Progress</h2>
          <p className="text-xs text-tertiary mt-1 max-w-2xl">
            Track every meeting for this report — notes, summaries and minutes, the
            AI-extracted three key takeaways, milestones, a project timeline and a
            progress dashboard for the project lead.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-grey-200 overflow-hidden">
            <TabBtn active={view === 'meetings'} onClick={() => setView('meetings')}>
              Meetings
            </TabBtn>
            <TabBtn active={view === 'timeline'} onClick={() => setView('timeline')}>
              Timeline &amp; milestones
            </TabBtn>
            <TabBtn active={view === 'progress'} onClick={() => setView('progress')}>
              Progress
            </TabBtn>
          </div>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark"
          >
            + New meeting
          </button>
        </div>
      </header>

      {view === 'progress' ? (
        <MeetingsProgress meetings={meetings} milestones={milestones} />
      ) : view === 'timeline' ? (
        <TimelineView
          projectId={projectId}
          meetings={meetings}
          milestones={milestones}
          selectedMeetingId={selectedId}
          onSelectMeeting={id => {
            setSelectedId(id);
            setView('meetings');
          }}
          onMoveMilestone={moveMilestone}
          onUpsertMilestone={upsertMilestone}
          onRemoveMilestone={id => setMilestones(prev => prev.filter(m => m.id !== id))}
          requireAuth={requireAuth}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* List pane */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-grey-200 rounded text-xs"
              >
                <option value="all">All meeting types</option>
                {MEETING_TYPE_OPTIONS.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-tertiary-light whitespace-nowrap">
                {filtered.length} of {meetings.length}
              </span>
            </div>
            {filtered.length === 0 ? (
              <p className="text-xs text-tertiary-light italic py-6 text-center border border-dashed border-grey-200 rounded-lg">
                No meetings yet. Click <em>+ New meeting</em> to log the first one.
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
                {filtered.map(m => (
                  <li key={m.id}>
                    <MeetingRow
                      meeting={m}
                      active={m.id === selectedId}
                      onClick={() => setSelectedId(m.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Detail pane */}
          <div>
            {selected ? (
              <MeetingDetail
                key={selected.id}
                projectId={projectId}
                meeting={selected}
                milestones={milestones.filter(ms => ms.meetingId === selected.id)}
                onChange={upsertMeeting}
                onDelete={() => removeMeeting(selected.id)}
                onUpsertMilestone={upsertMilestone}
                onRemoveMilestone={id => setMilestones(prev => prev.filter(m => m.id !== id))}
                requireAuth={requireAuth}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-tertiary-light border border-dashed border-grey-200 rounded-xl py-20">
                Select a meeting to view and edit it.
              </div>
            )}
          </div>
        </div>
      )}

      {composing && (
        <NewMeetingDialog onClose={() => setComposing(false)} onCreate={createMeeting} />
      )}
    </div>
  );
}

function byDate(a: Meeting, b: Meeting) {
  return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium ${
        active ? 'bg-primary text-white' : 'bg-white text-tertiary hover:bg-grey-50'
      }`}
    >
      {children}
    </button>
  );
}

function MeetingRow({
  meeting,
  active,
  onClick,
}: {
  meeting: Meeting;
  active: boolean;
  onClick: () => void;
}) {
  const meta = metaOf(MEETING_TYPES, meeting.type);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-2.5 transition ${
        active ? 'border-primary bg-primary/5' : 'border-grey-200 bg-white hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${meta.badge}`}>
          {meta.icon} {meta.label.replace(' meeting', '')}
        </span>
        <span className="ml-auto text-[10px] text-tertiary-light">{formatDate(meeting.occurredAt)}</span>
      </div>
      <p className="text-sm font-semibold text-tertiary-dark truncate">
        {meeting.title || 'Untitled meeting'}
      </p>
      {meeting.keyPoints.length > 0 && (
        <p className="text-[10px] text-secondary mt-0.5">✨ {meeting.keyPoints.length} key points</p>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Meeting detail
// ─────────────────────────────────────────────────────────────────────────

function MeetingDetail({
  projectId,
  meeting,
  milestones,
  onChange,
  onDelete,
  onUpsertMilestone,
  onRemoveMilestone,
  requireAuth,
}: {
  projectId: string;
  meeting: Meeting;
  milestones: Milestone[];
  onChange: (m: Meeting) => void;
  onDelete: () => void;
  onUpsertMilestone: (m: Milestone) => void;
  onRemoveMilestone: (id: string) => void;
  requireAuth: (reason?: string) => Promise<unknown>;
}) {
  const meta = metaOf(MEETING_TYPES, meeting.type);
  const [editingHeader, setEditingHeader] = useState(false);

  async function patchHeader(patch: Record<string, unknown>) {
    const { meeting: updated } = await pwApi.patchMeeting(meeting.id, patch);
    onChange(updated);
  }

  return (
    <div className="bg-white border border-grey-200 rounded-xl p-4 space-y-5">
      {/* Header */}
      {editingHeader ? (
        <HeaderEditor
          meeting={meeting}
          onSave={async patch => {
            await patchHeader(patch);
            setEditingHeader(false);
          }}
          onCancel={() => setEditingHeader(false)}
        />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${meta.badge}`}>
                {meta.icon} {meta.label}
              </span>
              <span className="text-xs text-tertiary">{formatDate(meeting.occurredAt)}</span>
            </div>
            <h3 className="text-lg font-bold text-tertiary-dark">
              {meeting.title || 'Untitled meeting'}
            </h3>
            {(meeting.location || meeting.attendees) && (
              <p className="text-xs text-tertiary mt-0.5">
                {meeting.location && <span>📍 {meeting.location}</span>}
                {meeting.location && meeting.attendees && <span className="mx-1">·</span>}
                {meeting.attendees && <span>👤 {meeting.attendees}</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditingHeader(true)}
              className="text-[11px] text-tertiary hover:text-primary"
            >
              Edit
            </button>
            <button onClick={onDelete} className="text-[11px] text-tertiary hover:text-red-600">
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Key points — the "main three things" */}
      <KeyPointsPanel meeting={meeting} onChange={onChange} requireAuth={requireAuth} />

      {/* Recorder */}
      <Recorder meeting={meeting} onChange={onChange} requireAuth={requireAuth} />

      {/* Notes / Summary / Minutes */}
      <div className="space-y-4">
        <AutosaveField
          meetingId={meeting.id}
          field="notes"
          label="Notes"
          hint="Free-form notes — everyone can edit. Recordings are transcribed in here."
          value={meeting.notes}
          rows={6}
          onSaved={updated => onChange(updated)}
        />
        <div className="flex items-center justify-between">
          <AutosaveField
            meetingId={meeting.id}
            field="summary"
            label="Summary"
            hint="A short prose summary of the meeting."
            value={meeting.summary}
            rows={3}
            onSaved={updated => onChange(updated)}
            action={
              <AiButton
                label="✨ Draft summary"
                run={() => pwApi.analyzeMeeting(meeting.id, 'summary')}
                onResult={r => {
                  if (r.summary !== undefined) onChange({ ...meeting, summary: r.summary });
                }}
              />
            }
          />
        </div>
        <AutosaveField
          meetingId={meeting.id}
          field="minutes"
          label="Minutes"
          hint="Formal minutes — decisions, actions, owners."
          value={meeting.minutes}
          rows={6}
          onSaved={updated => onChange(updated)}
        />
      </div>

      {/* Milestones tied to this meeting */}
      <MeetingMilestones
        projectId={projectId}
        meetingId={meeting.id}
        milestones={milestones}
        onUpsert={onUpsertMilestone}
        onRemove={onRemoveMilestone}
        requireAuth={requireAuth}
      />

      {/* Collaboration */}
      <div className="border-t border-grey-100 pt-4">
        <CollaborationPanel
          projectId={projectId}
          target={{ kind: 'meeting', id: meeting.id }}
          heading="Discussion & review"
        />
      </div>
    </div>
  );
}

function HeaderEditor({
  meeting,
  onSave,
  onCancel,
}: {
  meeting: Meeting;
  onSave: (patch: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(meeting.title);
  const [type, setType] = useState(meeting.type);
  const [date, setDate] = useState(toLocalInput(meeting.occurredAt));
  const [location, setLocation] = useState(meeting.location);
  const [attendees, setAttendees] = useState(meeting.attendees);
  return (
    <div className="space-y-2 border border-grey-200 rounded-lg p-3 bg-grey-50">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Meeting title"
        className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm font-semibold"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-2 py-1.5 border border-grey-200 rounded text-sm"
        >
          {MEETING_TYPE_OPTIONS.map(o => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="px-2 py-1.5 border border-grey-200 rounded text-sm"
        />
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Location / call link"
          className="px-2 py-1.5 border border-grey-200 rounded text-sm"
        />
        <input
          value={attendees}
          onChange={e => setAttendees(e.target.value)}
          placeholder="Attendees"
          className="px-2 py-1.5 border border-grey-200 rounded text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1 rounded border border-grey-200 text-xs">
          Cancel
        </button>
        <button
          onClick={() =>
            onSave({
              title,
              type,
              occurredAt: new Date(date).toISOString(),
              location,
              attendees,
            })
          }
          className="px-3 py-1 rounded bg-primary text-white text-xs font-semibold"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Key points ────────────────────────────────────────────────────────────

function KeyPointsPanel({
  meeting,
  onChange,
  requireAuth,
}: {
  meeting: Meeting;
  onChange: (m: Meeting) => void;
  requireAuth: (reason?: string) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function extract() {
    if (!(await requireAuth('Sign in to use the AI assistant.'))) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await pwApi.analyzeMeeting(meeting.id, 'key-points');
      if (r.ok && r.keyPoints) {
        onChange({ ...meeting, keyPoints: r.keyPoints });
      } else {
        setNote(reasonMessage(r.reason));
      }
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function editPoint(i: number, value: string) {
    const next = [...meeting.keyPoints];
    next[i] = value;
    onChange({ ...meeting, keyPoints: next });
    await pwApi.patchMeeting(meeting.id, { keyPoints: next });
  }
  async function removePoint(i: number) {
    const next = meeting.keyPoints.filter((_, j) => j !== i);
    onChange({ ...meeting, keyPoints: next });
    await pwApi.patchMeeting(meeting.id, { keyPoints: next });
  }

  return (
    <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-xs font-bold text-secondary uppercase tracking-wide">
          ✨ The three key things
        </h4>
        <button
          onClick={extract}
          disabled={busy}
          className="text-[11px] px-2 py-1 rounded-md bg-secondary text-white font-semibold hover:bg-secondary-dark disabled:opacity-50"
        >
          {busy ? 'Analysing…' : meeting.keyPoints.length ? 'Re-analyse' : 'Find the 3 key points'}
        </button>
      </div>
      {meeting.keyPoints.length === 0 ? (
        <p className="text-[11px] text-tertiary">
          {note ?? 'Write notes or minutes below, then let the AI surface the three most important takeaways.'}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {meeting.keyPoints.map((p, i) => (
            <li key={i} className="flex items-start gap-2 group">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-secondary text-white text-[11px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <input
                defaultValue={p}
                onBlur={e => {
                  if (e.target.value !== p) editPoint(i, e.target.value);
                }}
                className="flex-1 bg-transparent text-sm text-tertiary-dark border-b border-transparent focus:border-secondary focus:outline-none"
              />
              <button
                onClick={() => removePoint(i)}
                className="opacity-0 group-hover:opacity-100 text-[11px] text-tertiary hover:text-red-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
      )}
      {note && meeting.keyPoints.length > 0 && (
        <p className="text-[10px] text-tertiary-light mt-2">{note}</p>
      )}
    </div>
  );
}

// ── Recorder ────────────────────────────────────────────────────────────

function Recorder({
  meeting,
  onChange,
  requireAuth,
}: {
  meeting: Meeting;
  onChange: (m: Meeting) => void;
  requireAuth: (reason?: string) => Promise<unknown>;
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Browser Web Speech API runs in parallel to MediaRecorder so we can fall
  // back to it when the server has no Whisper provider configured.
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const speechTextRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recRef.current?.stream.getTracks().forEach(t => t.stop());
      try { speechRef.current?.stop(); } catch { /* noop */ }
    };
  }, []);

  async function start() {
    if (!(await requireAuth('Sign in to record a meeting.'))) return;
    setNote(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setNote('Recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        try { speechRef.current?.stop(); } catch { /* noop */ }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        transcribe(blob);
      };
      rec.start();
      recRef.current = rec;
      speechTextRef.current = '';
      speechRef.current = startWebSpeech(t => {
        speechTextRef.current = (speechTextRef.current + ' ' + t).trim();
      });
      setElapsed(0);
      setState('recording');
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch {
      setNote('Microphone access was blocked. Allow it in your browser to record.');
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recRef.current?.stop();
    setState('transcribing');
  }

  async function appendTranscript(text: string, provider: 'whisper' | 'browser') {
    const stamp = new Date().toLocaleString('en-GB');
    const label = provider === 'browser' ? 'Transcript · browser' : 'Transcript';
    const addition = `\n\n— ${label} (${stamp}) —\n${text}`;
    const nextNotes = (meeting.notes + addition).trim();
    const { meeting: updated } = await pwApi.patchMeeting(meeting.id, { notes: nextNotes });
    onChange(updated);
  }

  async function transcribe(blob: Blob) {
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([blob], `meeting-${Date.now()}.${ext}`, { type: blob.type });
    const browserText = speechTextRef.current.trim();
    try {
      const r = await pwApi.transcribeMeeting(meeting.id, file);
      if (r.ok && r.text) {
        await appendTranscript(r.text, 'whisper');
        setNote('Transcript added to the notes below.');
      } else if (r.reason === 'no-api-key' && browserText) {
        await appendTranscript(browserText, 'browser');
        setNote('Server transcription is not configured — used the browser’s on-device speech recognition instead (lower accuracy).');
      } else if (r.reason === 'no-api-key') {
        setNote('Transcription isn’t configured on the server, and your browser doesn’t support on-device speech recognition. Try Chrome or Edge, or configure Whisper.');
      } else {
        setNote(reasonMessage(r.reason) || r.error || 'Transcription failed.');
      }
    } catch (e) {
      // Network error reaching the server — still salvage the browser transcript if we have one.
      if (browserText) {
        await appendTranscript(browserText, 'browser');
        setNote('Could not reach the server — used the browser’s on-device transcript instead.');
      } else {
        setNote((e as Error).message);
      }
    } finally {
      setState('idle');
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap rounded-lg border border-grey-200 bg-grey-50 px-3 py-2">
      {state === 'idle' && (
        <button
          onClick={start}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-red hover:opacity-80"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-accent-red" /> Record meeting
        </button>
      )}
      {state === 'recording' && (
        <button
          onClick={stop}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-tertiary-dark"
        >
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-red animate-pulse" />
          Stop &amp; transcribe · {fmtTime(elapsed)}
        </button>
      )}
      {state === 'transcribing' && (
        <span className="text-xs text-tertiary">Transcribing recording…</span>
      )}
      <span className="text-[10px] text-tertiary-light">
        Records audio and transcribes it straight into the notes.
      </span>
      {note && <span className="text-[10px] text-secondary basis-full">{note}</span>}
    </div>
  );
}

// ── Autosaving collaborative text field ─────────────────────────────────────

function AutosaveField({
  meetingId,
  field,
  label,
  hint,
  value,
  rows,
  onSaved,
  action,
}: {
  meetingId: string;
  field: 'notes' | 'summary' | 'minutes';
  label: string;
  hint: string;
  value: string;
  rows: number;
  onSaved: (m: Meeting) => void;
  action?: React.ReactNode;
}) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-sync when the upstream value changes (e.g. transcript appended, or a
  // colleague's edit arrives on refresh) and we have no pending local edits.
  useEffect(() => {
    if (value !== saved && draft === saved) {
      setDraft(value);
      setSaved(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (draft === saved) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus('saving');
      try {
        const { meeting } = await pwApi.patchMeeting(meetingId, { [field]: draft });
        setSaved(draft);
        setStatus('saved');
        onSaved(meeting);
      } catch {
        setStatus('error');
      }
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, saved, meetingId, field]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div>
          <span className="text-xs font-bold text-tertiary-dark uppercase tracking-wide">{label}</span>
          <span className="ml-2 text-[10px] text-tertiary-light">{hint}</span>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <span className="text-[10px] text-tertiary-light">
            {status === 'saving'
              ? 'Saving…'
              : status === 'error'
                ? <span className="text-red-700">Save failed</span>
                : status === 'saved'
                  ? 'Saved'
                  : ''}
          </span>
        </div>
      </div>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={rows}
        placeholder={`Add ${label.toLowerCase()}…`}
        className="w-full px-3 py-2 border border-grey-200 rounded text-sm leading-relaxed bg-white focus:outline-none focus:border-primary resize-y"
      />
    </div>
  );
}

function AiButton({
  label,
  run,
  onResult,
}: {
  label: string;
  run: () => Promise<{ ok: boolean; keyPoints?: string[]; summary?: string; reason?: string }>;
  onResult: (r: { keyPoints?: string[]; summary?: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={async () => {
          setBusy(true);
          setNote(null);
          try {
            const r = await run();
            if (r.ok) onResult(r);
            else setNote(reasonMessage(r.reason));
          } catch (e) {
            setNote((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="text-[11px] px-2 py-0.5 rounded bg-secondary/10 text-secondary font-semibold hover:bg-secondary/20 disabled:opacity-50"
      >
        {busy ? '…' : label}
      </button>
      {note && <span className="text-[10px] text-tertiary-light">{note}</span>}
    </span>
  );
}

// ── Milestones attached to a meeting ────────────────────────────────────────

function MeetingMilestones({
  projectId,
  meetingId,
  milestones,
  onUpsert,
  onRemove,
  requireAuth,
}: {
  projectId: string;
  meetingId: string;
  milestones: Milestone[];
  onUpsert: (m: Milestone) => void;
  onRemove: (id: string) => void;
  requireAuth: (reason?: string) => Promise<unknown>;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="border-t border-grey-100 pt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-tertiary-dark uppercase tracking-wide">Milestones</h4>
        <button onClick={() => setAdding(true)} className="text-[11px] text-secondary font-semibold hover:underline">
          + Add milestone
        </button>
      </div>
      {milestones.length === 0 && !adding ? (
        <p className="text-[11px] text-tertiary-light italic">
          No milestones linked to this meeting yet — e.g. a publication, subgroup or champion milestone.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {milestones.map(m => (
            <li key={m.id}>
              <MilestoneRow milestone={m} onUpsert={onUpsert} onRemove={onRemove} />
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <MilestoneComposer
          projectId={projectId}
          meetingId={meetingId}
          onClose={() => setAdding(false)}
          onCreated={m => {
            onUpsert(m);
            setAdding(false);
          }}
          requireAuth={requireAuth}
        />
      )}
    </div>
  );
}

function MilestoneRow({
  milestone,
  onUpsert,
  onRemove,
}: {
  milestone: Milestone;
  onUpsert: (m: Milestone) => void;
  onRemove: (id: string) => void;
}) {
  const meta = metaOf(MILESTONE_TYPES, milestone.type);
  const status = metaOf(MILESTONE_STATUS, milestone.status);

  async function cycleStatus() {
    const order = MILESTONE_STATUS_OPTIONS.map(o => o.id);
    const next = order[(order.indexOf(milestone.status) + 1) % order.length];
    onUpsert({ ...milestone, status: next });
    const { milestone: updated } = await pwApi.patchMilestone(milestone.id, { status: next });
    onUpsert(updated);
  }
  async function remove() {
    if (!confirm('Delete this milestone?')) return;
    await pwApi.deleteMilestone(milestone.id);
    onRemove(milestone.id);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-grey-200 bg-white px-2.5 py-1.5 group">
      <span className="text-sm">{meta.icon}</span>
      <span className="text-sm text-tertiary-dark flex-1 truncate">{milestone.title}</span>
      <span className="text-[10px] text-tertiary-light">{formatDate(milestone.targetDate)}</span>
      <button
        onClick={cycleStatus}
        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${status.badge}`}
        title="Click to advance status"
      >
        {status.label}
      </button>
      <button
        onClick={remove}
        className="opacity-0 group-hover:opacity-100 text-[11px] text-tertiary hover:text-red-600"
      >
        ✕
      </button>
    </div>
  );
}

function MilestoneComposer({
  projectId,
  meetingId,
  onClose,
  onCreated,
  requireAuth,
}: {
  projectId: string;
  meetingId: string | null;
  onClose: () => void;
  onCreated: (m: Milestone) => void;
  requireAuth: (reason?: string) => Promise<unknown>;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('publication');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!title.trim()) return;
    if (!(await requireAuth('Sign in to add a milestone.'))) return;
    setBusy(true);
    try {
      const { milestone } = await pwApi.createMilestone({
        projectId,
        meetingId,
        title: title.trim(),
        type,
        targetDate,
      });
      onCreated(milestone);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_140px_140px] gap-2 items-end border border-grey-200 rounded-lg p-2.5 bg-grey-50">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Milestone title (e.g. Publication, Subgroup, Champion)"
        className="px-2 py-1.5 border border-grey-200 rounded text-sm"
      />
      <select
        value={type}
        onChange={e => setType(e.target.value)}
        className="px-2 py-1.5 border border-grey-200 rounded text-sm"
      >
        {MILESTONE_TYPE_OPTIONS.map(o => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={targetDate}
        onChange={e => setTargetDate(e.target.value)}
        className="px-2 py-1.5 border border-grey-200 rounded text-sm"
      />
      <div className="sm:col-span-3 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1 rounded border border-grey-200 text-xs">
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

// ─────────────────────────────────────────────────────────────────────────
// Timeline view (chart + standalone milestone management)
// ─────────────────────────────────────────────────────────────────────────

function TimelineView({
  projectId,
  meetings,
  milestones,
  selectedMeetingId,
  onSelectMeeting,
  onMoveMilestone,
  onUpsertMilestone,
  onRemoveMilestone,
  requireAuth,
}: {
  projectId: string;
  meetings: Meeting[];
  milestones: Milestone[];
  selectedMeetingId: string | null;
  onSelectMeeting: (id: string) => void;
  onMoveMilestone: (id: string, date: string) => void;
  onUpsertMilestone: (m: Milestone) => void;
  onRemoveMilestone: (id: string) => void;
  requireAuth: (reason?: string) => Promise<unknown>;
}) {
  const [adding, setAdding] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...milestones].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()),
    [milestones]
  );

  return (
    <div className="space-y-4">
      <MeetingsTimeline
        meetings={meetings}
        milestones={milestones}
        selectedMeetingId={selectedMeetingId}
        onSelectMeeting={onSelectMeeting}
        onSelectMilestone={setHighlight}
        onMoveMilestone={onMoveMilestone}
      />

      <div className="bg-white border border-grey-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-tertiary-dark">All milestones</h3>
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-md bg-secondary text-white text-xs font-semibold hover:bg-secondary-dark"
          >
            + Add milestone
          </button>
        </div>
        {adding && (
          <div className="mb-3">
            <MilestoneComposer
              projectId={projectId}
              meetingId={null}
              onClose={() => setAdding(false)}
              onCreated={m => {
                onUpsertMilestone(m);
                setAdding(false);
              }}
              requireAuth={requireAuth}
            />
          </div>
        )}
        {sorted.length === 0 ? (
          <p className="text-xs text-tertiary-light italic">
            No milestones yet. Add publication, subgroup or champion milestones and drag them on the
            timeline above to plan the report.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map(m => (
              <li
                key={m.id}
                className={highlight === m.id ? 'ring-2 ring-secondary rounded-lg' : ''}
              >
                <MilestoneRow milestone={m} onUpsert={onUpsertMilestone} onRemove={onRemoveMilestone} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── New meeting dialog ──────────────────────────────────────────────────────

function NewMeetingDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: {
    title: string;
    type: string;
    occurredAt: string;
    location: string;
    attendees: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('team');
  const [date, setDate] = useState(toLocalInput(new Date().toISOString()));
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onCreate({
        title: title.trim(),
        type,
        occurredAt: new Date(date).toISOString(),
        location: location.trim(),
        attendees: attendees.trim(),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-md w-full p-5 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-tertiary-dark">New meeting</h3>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Meeting title"
          className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-tertiary">
            <span className="block mb-1 font-medium text-tertiary-dark">Type</span>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
            >
              {MEETING_TYPE_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-tertiary">
            <span className="block mb-1 font-medium text-tertiary-dark">When</span>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
            />
          </label>
        </div>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Location / call link (optional)"
          className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
        />
        <input
          value={attendees}
          onChange={e => setAttendees(e.target.value)}
          placeholder="Attendees (optional)"
          className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-grey-200 text-xs">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !title.trim()}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // datetime-local wants YYYY-MM-DDTHH:mm in local time.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Web Speech API fallback ──────────────────────────────────────────────────
// Chrome/Edge (and recent Safari) expose SpeechRecognition under the
// `webkitSpeechRecognition` global. We use it opportunistically: it streams
// final transcript chunks while the meeting is being recorded, and we keep
// them around in case the server has no Whisper provider configured.

interface SpeechRecognitionLike {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function startWebSpeech(onFinal: (text: string) => void): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
      .webkitSpeechRecognition;
  if (!Ctor) return null;
  try {
    const rec = new Ctor() as SpeechRecognitionLike & {
      continuous: boolean;
      interimResults: boolean;
      lang?: string;
      onresult: (e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void;
      onerror: (e: unknown) => void;
      onend: () => void;
    };
    rec.continuous = true;
    rec.interimResults = false;
    if (typeof navigator !== 'undefined' && navigator.language) rec.lang = navigator.language;
    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinal(r[0].transcript.trim());
      }
    };
    rec.onerror = () => { /* swallow — the blob is still uploaded to the server */ };
    // SpeechRecognition stops itself on some browsers after periods of silence;
    // restart so we keep collecting until MediaRecorder stops it explicitly.
    let stopped = false;
    rec.onend = () => { if (!stopped) { try { rec.start(); } catch { /* noop */ } } };
    rec.start();
    return {
      start: () => rec.start(),
      stop: () => { stopped = true; try { rec.stop(); } catch { /* noop */ } },
      abort: () => { stopped = true; try { rec.abort(); } catch { /* noop */ } },
    };
  } catch {
    return null;
  }
}

function reasonMessage(reason?: string): string {
  switch (reason) {
    case 'no-api-key':
      return 'AI is not configured on this server (no LLM API key). Add ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY or Azure OpenAI to enable it.';
    case 'body-too-short':
      return 'Add more notes or minutes first — there isn’t enough text to analyse yet.';
    case 'parse-failed':
      return 'The AI response could not be parsed. Try again.';
    default:
      return 'AI request failed. Please try again.';
  }
}
