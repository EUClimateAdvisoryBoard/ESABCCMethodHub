/**
 * Verify / dispute control for any Project Workspace target.
 * ----------------------------------------------------------
 * Lets a signed-in colleague mark a target (an indicator, recommendation,
 * member-state cell, policy, …) as verified or disputed, with the rollup
 * visible to everyone. State persists in `pw_verifications` — one row per
 * (target, user) — so a colleague's check is never lost on reload.
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { pwApi, type WorkspaceVerification } from '@/lib/project-workspace/client';

interface Props {
  projectId: string;
  target: { kind: string; id: string };
  size?: 'sm' | 'md';
}

export default function VerifyControl({ projectId, target, size = 'md' }: Props) {
  const { user, requireAuth } = useAuth();
  const [rows, setRows] = useState<WorkspaceVerification[]>([]);
  const [busy, setBusy] = useState(false);
  const [showWho, setShowWho] = useState(false);

  const load = useCallback(async () => {
    setRows(await pwApi.listVerifications(projectId, target));
  }, [projectId, target.kind, target.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const verified = useMemo(() => rows.filter(r => r.status === 'verified'), [rows]);
  const disputed = useMemo(() => rows.filter(r => r.status === 'disputed'), [rows]);
  const mine = user ? rows.find(r => r.userId === user.id) : undefined;

  async function vote(status: 'verified' | 'disputed') {
    const authed = await requireAuth('Sign in to verify or dispute this item.');
    if (!authed) return;
    setBusy(true);
    try {
      if (mine?.status === status) {
        await pwApi.clearVerification(projectId, target);
      } else {
        await pwApi.setVerification({
          projectId,
          targetKind: target.kind,
          targetId: target.id,
          status,
        });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';

  return (
    <div className="inline-flex items-center gap-1.5 relative">
      <button
        type="button"
        onClick={() => vote('verified')}
        disabled={busy}
        className={`${pad} rounded-md border font-semibold inline-flex items-center gap-1 disabled:opacity-50 ${
          mine?.status === 'verified'
            ? 'bg-green-600 border-green-600 text-white'
            : 'border-grey-200 text-tertiary-dark hover:bg-green-50 hover:border-green-300'
        }`}
        title="Mark as verified"
      >
        ✓ Verify{verified.length > 0 && <span className="opacity-80">· {verified.length}</span>}
      </button>
      <button
        type="button"
        onClick={() => vote('disputed')}
        disabled={busy}
        className={`${pad} rounded-md border font-semibold inline-flex items-center gap-1 disabled:opacity-50 ${
          mine?.status === 'disputed'
            ? 'bg-red-600 border-red-600 text-white'
            : 'border-grey-200 text-tertiary-dark hover:bg-red-50 hover:border-red-300'
        }`}
        title="Flag as disputed"
      >
        ⚑ Dispute{disputed.length > 0 && <span className="opacity-80">· {disputed.length}</span>}
      </button>
      {rows.length > 0 && (
        <button
          type="button"
          onClick={() => setShowWho(s => !s)}
          className="text-[10px] text-tertiary-light hover:text-tertiary underline"
        >
          who?
        </button>
      )}
      {showWho && rows.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-lg border border-grey-200 bg-white shadow-xl p-2 text-[11px]">
          {verified.length > 0 && (
            <div className="mb-1">
              <p className="font-bold text-green-700 mb-0.5">Verified by</p>
              <p className="text-tertiary-dark">{verified.map(r => r.userName || 'Anonymous').join(', ')}</p>
            </div>
          )}
          {disputed.length > 0 && (
            <div>
              <p className="font-bold text-red-700 mb-0.5">Disputed by</p>
              <p className="text-tertiary-dark">{disputed.map(r => r.userName || 'Anonymous').join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
