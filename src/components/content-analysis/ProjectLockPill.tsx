'use client';

import { useEffect, useState } from 'react';
import {
  readHolderName,
  setHolderName,
  type ProjectLock,
  type LockMode,
} from '@/lib/content-analysis/useProjectLock';

interface Props {
  mode: LockMode;
  lock: ProjectLock | null;
  onRequestEdit: () => void | Promise<void>;
  onHandOff: () => void | Promise<void>;
}

/** Inline lock-state pill for the workbench project header. Renders a
 *  short badge for editors and a longer "Alice is editing" banner with a
 *  request-access button for watchers. Hidden when there's no project to
 *  lock (idle / master library). */
export default function ProjectLockPill({ mode, lock, onRequestEdit, onHandOff }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => { setDraft(readHolderName()); }, []);

  if (mode === 'idle') return null;

  const heldFor = lock ? formatRelative(lock.acquiredAt) : '';

  if (mode === 'editor') {
    return (
      <div
        className="inline-flex items-center gap-2 px-2 py-0.5 rounded-sm border border-[#A6DDB7] bg-[#E6F4EA] text-[11px] text-[#1F7A3A]"
        title={`Lock acquired ${heldFor}. Auto-releases after 10 minutes idle.`}
      >
        <span aria-hidden>🔒</span>
        <span className="font-medium">You're editing</span>
        <span className="text-[10.5px] text-[#1F7A3A]/70">— {heldFor}</span>
        {editingName ? (
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { setHolderName(draft); setEditingName(false); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { setHolderName(draft); setEditingName(false); }
              if (e.key === 'Escape') setEditingName(false);
            }}
            className="ml-1 px-1 py-0.5 text-[10.5px] border border-[#1F7A3A]/40 rounded-sm bg-white"
            placeholder="Your name"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="text-[10.5px] underline decoration-dotted"
            title="Edit your display name"
          >
            as {readHolderName()}
          </button>
        )}
        <button
          type="button"
          onClick={() => onHandOff()}
          className="ml-1 text-[10.5px] font-medium text-[#1F7A3A] hover:text-[#0F4D24] hover:underline"
          title="Release the lock so another colleague can edit"
        >
          Hand off
        </button>
      </div>
    );
  }

  // mode === 'watcher'
  const holderLabel = lock?.holderName?.trim() || 'Another editor';
  return (
    <div
      className="inline-flex items-center gap-2 px-2 py-0.5 rounded-sm border border-[#FCD34D] bg-[#FEF3C7] text-[11px] text-[#92400E]"
      title="The project is locked by another editor. You can still browse — read-only."
    >
      <span aria-hidden>🔒</span>
      <span className="font-medium">{holderLabel} is editing</span>
      {heldFor && <span className="text-[10.5px] text-[#92400E]/80">— since {heldFor}</span>}
      <button
        type="button"
        onClick={() => onRequestEdit()}
        className="ml-1 text-[10.5px] font-semibold text-[#92400E] hover:text-[#7C2D12] underline"
      >
        Request edit access
      </button>
    </div>
  );
}

/** Compact "5 m ago" / "1 h ago" — used in the pill so the timestamp
 *  doesn't dominate the chrome. */
function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const ageMs = Date.now() - t;
  const sec = Math.max(1, Math.floor(ageMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  return `${hr} h ago`;
}
