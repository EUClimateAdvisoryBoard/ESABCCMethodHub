/**
 * Client hook: AI vs human status for a policy's master tags.
 * -----------------------------------------------------------
 * Every master tag in policy-master-tags.ts ships as an "AI tag". A signed-in
 * reviewer can CONFIRM a tag they agree with, promoting it to a "human tag".
 * Confirmations are persisted in the global content_analysis_master_tag_status
 * table (migration 050) via /api/content-analysis/master-tag-status and shared
 * across the navigator + every workspace.
 *
 * Pass a `policyId` to scope the fetch to one policy (navigator card,
 * per-policy panel); pass `null` to load every confirmation at once (the
 * project-wide workspace overlay).
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export interface MasterTagConfirmation {
  policyId: string;
  codeId: string;
  origin: 'ai' | 'human';
  confirmedByName: string | null;
  confirmedAt: string;
}

/** Composite key for a (policy, code) pair in the confirmed map. */
export function tagKey(policyId: string, codeId: string): string {
  return `${policyId}::${codeId}`;
}

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const tok = data.session?.access_token;
  return tok ? { authorization: `Bearer ${tok}` } : {};
}

export function useMasterTagStatus(policyId: string | null) {
  const { user, requireAuth } = useAuth();
  // Keyed by tagKey(policyId, codeId) so a single hook can hold confirmations
  // for one policy or for the whole corpus.
  const [confirmed, setConfirmed] = useState<Map<string, MasterTagConfirmation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = policyId ? `?policyId=${encodeURIComponent(policyId)}` : '';
      const res = await fetch(`/api/content-analysis/master-tag-status${qs}`);
      if (res.ok) {
        const { statuses } = (await res.json()) as { statuses: MasterTagConfirmation[] };
        const m = new Map<string, MasterTagConfirmation>();
        for (const s of statuses ?? []) m.set(tagKey(s.policyId, s.codeId), s);
        setConfirmed(m);
      }
    } catch {
      /* offline / not configured — fall back to all-AI baseline */
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Has this (policy, code) pair been confirmed by a human? */
  const isConfirmed = useCallback(
    (pid: string, codeId: string) => confirmed.has(tagKey(pid, codeId)),
    [confirmed]
  );

  /** Confirm an AI tag → promote it to a human tag. Prompts sign-in if needed. */
  const confirm = useCallback(
    async (pid: string, codeId: string) => {
      const u = user ?? (await requireAuth('Sign in to confirm AI tags.'));
      if (!u) return;
      const key = tagKey(pid, codeId);
      setBusyKey(key);
      setError(null);
      // Optimistic.
      setConfirmed(prev => {
        const next = new Map(prev);
        next.set(key, {
          policyId: pid,
          codeId,
          origin: 'human',
          confirmedByName: null,
          confirmedAt: new Date().toISOString(),
        });
        return next;
      });
      try {
        const res = await fetch('/api/content-analysis/master-tag-status', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify({ policyId: pid, codeId }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const { status } = (await res.json()) as { status: MasterTagConfirmation };
        setConfirmed(prev => {
          const next = new Map(prev);
          next.set(key, status);
          return next;
        });
      } catch (e) {
        // Roll back.
        setConfirmed(prev => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        setError((e as Error).message);
      } finally {
        setBusyKey(null);
      }
    },
    [user, requireAuth]
  );

  /** Revert a human confirmation → drop back to the AI baseline. */
  const revert = useCallback(
    async (pid: string, codeId: string) => {
      const u = user ?? (await requireAuth('Sign in to change tags.'));
      if (!u) return;
      const key = tagKey(pid, codeId);
      const prevValue = confirmed.get(key);
      setBusyKey(key);
      setError(null);
      setConfirmed(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      try {
        const res = await fetch(
          `/api/content-analysis/master-tag-status?policyId=${encodeURIComponent(pid)}&codeId=${encodeURIComponent(codeId)}`,
          { method: 'DELETE', headers: { ...(await authHeader()) } }
        );
        if (!res.ok) throw new Error(`${res.status}`);
      } catch (e) {
        if (prevValue) {
          setConfirmed(prev => {
            const next = new Map(prev);
            next.set(key, prevValue);
            return next;
          });
        }
        setError((e as Error).message);
      } finally {
        setBusyKey(null);
      }
    },
    [user, requireAuth, confirmed]
  );

  return {
    loading,
    error,
    busyKey,
    isSignedIn: !!user,
    isConfirmed,
    confirm,
    revert,
    confirmed,
  };
}
