'use client';

import { useEffect, useState } from 'react';
import {
  captureSnapshot,
  deleteSnapshot,
  listSnapshots,
  type CodeSystemSnapshot,
} from '@/lib/content-analysis/snapshots';
import type { CodeNode, CodedSegment } from '@/lib/content-analysis/types';

interface Props {
  codes: CodeNode[];
  segments: CodedSegment[];
  onRestore: (codes: CodeNode[], segments: CodedSegment[]) => void;
}

/** 5-minute auto-save cadence. Auto snapshots that match the previous one
 *  byte-for-byte (same length + last id) are skipped to avoid spam. */
const AUTO_SAVE_MS = 5 * 60 * 1000;

/**
 * Snapshot manager for the code system + tagged segments. Exposes:
 *
 *   • a "Capture" button (manual snapshot, optional label),
 *   • a list of every saved snapshot with restore + delete actions,
 *   • a 5-minute auto-save loop in the background.
 *
 * Snapshots live in localStorage under their own key so resetting the
 * main state doesn't wipe them.
 */
export default function SnapshotsPanel({ codes, segments, onRestore }: Props) {
  const [snapshots, setSnapshots] = useState<CodeSystemSnapshot[]>([]);
  const [labelDraft, setLabelDraft] = useState('');

  const refresh = () => setSnapshots(listSnapshots());

  useEffect(() => { refresh(); }, []);

  // Auto-save loop. Captures kind='auto' every AUTO_SAVE_MS minutes; the
  // store layer skips capture when nothing changed since the last auto.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = setInterval(() => {
      captureSnapshot({ codes, segments, kind: 'auto' });
      refresh();
    }, AUTO_SAVE_MS);
    return () => clearInterval(id);
  }, [codes, segments]);

  const onCapture = () => {
    const label = labelDraft.trim() || undefined;
    captureSnapshot({ codes, segments, kind: 'manual', label });
    setLabelDraft('');
    refresh();
  };

  const onDelete = (id: string) => {
    if (!window.confirm('Delete this snapshot? This cannot be undone.')) return;
    deleteSnapshot(id);
    refresh();
  };

  const onRestoreSnapshot = (s: CodeSystemSnapshot) => {
    const ok = window.confirm(
      `Restore snapshot from ${new Date(s.capturedAt).toLocaleString()}?\n\n` +
      `${s.stats.codes} tag(s) and ${s.stats.segments} segment(s) will replace your current state. ` +
      `(A safety snapshot is captured first.)`,
    );
    if (!ok) return;
    captureSnapshot({ codes, segments, kind: 'manual', label: 'Pre-restore safety snapshot' });
    onRestore(s.codes, s.segments);
    refresh();
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA]">
        <input
          type="text"
          value={labelDraft}
          onChange={e => setLabelDraft(e.target.value)}
          placeholder="Optional label…"
          className="flex-1 border border-[#E6E7E8] rounded-sm px-2 py-1 text-[11.5px] text-[#3D5265] focus:border-[#00928F] focus:outline-none"
        />
        <button
          type="button"
          onClick={onCapture}
          className="px-2 py-1 text-[11.5px] font-medium text-white bg-[#00928F] hover:bg-[#006F6C] rounded-sm"
          title="Save the current code system + segments as a snapshot"
        >
          Capture
        </button>
      </div>
      <p className="px-3 py-1.5 text-[10.5px] text-[#3D5265]/70 border-b border-[#E6E7E8] bg-white">
        Auto-saves every 5 min. Snapshots only cover your tags + segments —
        documents and projects are unaffected.
      </p>
      {snapshots.length === 0 ? (
        <div className="px-3 py-4 text-[12px] italic text-[#8A95A3]">
          No snapshots yet. Capture one before any major refactor.
        </div>
      ) : (
        <ul className="max-h-[42vh] overflow-y-auto divide-y divide-[#E6E7E8]">
          {snapshots.map(s => (
            <li key={s.id} className="px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[12px] font-medium text-[#3D5265] truncate">
                      {s.label ?? (s.kind === 'auto' ? 'Auto-save' : 'Manual snapshot')}
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                        s.kind === 'auto'
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#D1FAE5] text-[#065F46]'
                      }`}
                    >
                      {s.kind}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-[#8A95A3]">
                    {new Date(s.capturedAt).toLocaleString()} · {s.stats.codes} tags · {s.stats.segments} segments
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRestoreSnapshot(s)}
                    className="text-[10.5px] font-medium text-[#0065A4] hover:text-[#003366]"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(s.id)}
                    className="text-[10.5px] font-medium text-[#B83230] hover:text-[#7F2120]"
                    aria-label="Delete snapshot"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
