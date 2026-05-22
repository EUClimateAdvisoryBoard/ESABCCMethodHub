'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type RecommendationStatus =
  | 'not-implemented'
  | 'partially-implemented'
  | 'implemented'
  | 'ongoing';

export interface Recommendation {
  id: string;
  report_title: string;
  recommendation_number: string;
  year: number;
  short_text: string;
  full_text: string | null;
  justification: string | null;
  assessment: string | null;
  category: string | null;
  status: RecommendationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  policy_ids: string[];
  indicator_ids: string[];
}

export interface RecommendationDraft {
  report_title: string;
  recommendation_number: string;
  year: number;
  short_text: string;
  full_text: string;
  justification: string;
  assessment: string;
  category: string;
  status: RecommendationStatus;
  policy_ids: string[];
  indicator_ids: string[];
}

export const EMPTY_DRAFT: RecommendationDraft = {
  report_title: '',
  recommendation_number: '',
  year: new Date().getFullYear(),
  short_text: '',
  full_text: '',
  justification: '',
  assessment: '',
  category: '',
  status: 'not-implemented',
  policy_ids: [],
  indicator_ids: [],
};

// ---------------------------------------------------------------------------
// Row shape returned by Supabase (before flattening)
// ---------------------------------------------------------------------------

interface RawRow {
  id: string;
  report_title: string;
  recommendation_number: string;
  year: number;
  short_text: string;
  full_text: string | null;
  justification: string | null;
  assessment: string | null;
  category: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  recommendation_policy_links: { policy_id: string }[];
  recommendation_indicator_links: { indicator_id: string }[];
}

function flatten(row: RawRow): Recommendation {
  return {
    ...row,
    status: row.status as RecommendationStatus,
    policy_ids: row.recommendation_policy_links.map(l => l.policy_id),
    indicator_ids: row.recommendation_indicator_links.map(l => l.indicator_id),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    const sb = supabase;
    if (!sb) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await sb
      .from('recommendations')
      .select(`
        *,
        recommendation_policy_links(policy_id),
        recommendation_indicator_links(indicator_id)
      `)
      .order('year', { ascending: false })
      .order('recommendation_number', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setRecommendations((data as RawRow[]).map(flatten));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Save links (used by both add and update) ───────────────────────────

  async function saveLinks(sb: NonNullable<typeof supabase>, recId: string, policyIds: string[], indicatorIds: string[]) {
    // Delete existing links then re-insert — simplest approach for a small dataset.
    await sb.from('recommendation_policy_links').delete().eq('recommendation_id', recId);
    await sb.from('recommendation_indicator_links').delete().eq('recommendation_id', recId);

    if (policyIds.length > 0) {
      await sb.from('recommendation_policy_links').insert(
        policyIds.map(pid => ({ recommendation_id: recId, policy_id: pid }))
      );
    }
    if (indicatorIds.length > 0) {
      await sb.from('recommendation_indicator_links').insert(
        indicatorIds.map(iid => ({ recommendation_id: recId, indicator_id: iid }))
      );
    }
  }

  // ── Add ────────────────────────────────────────────────────────────────

  async function addRecommendation(draft: RecommendationDraft): Promise<string | null> {
    const sb = supabase;
    if (!sb) return 'Database not available';
    const { policy_ids, indicator_ids, ...row } = draft;
    const { data, error: err } = await sb
      .from('recommendations')
      .insert([{
        ...row,
        full_text: row.full_text || null,
        justification: row.justification || null,
        assessment: row.assessment || null,
        category: row.category || null,
      }])
      .select('id')
      .single();

    if (err || !data) return err?.message ?? 'Insert failed';
    await saveLinks(sb, data.id, policy_ids, indicator_ids);
    await fetch();
    return null;
  }

  // ── Update ─────────────────────────────────────────────────────────────

  async function updateRecommendation(id: string, draft: RecommendationDraft): Promise<string | null> {
    const sb = supabase;
    if (!sb) return 'Database not available';
    const { policy_ids, indicator_ids, ...row } = draft;
    const { error: err } = await sb
      .from('recommendations')
      .update({
        ...row,
        full_text: row.full_text || null,
        justification: row.justification || null,
        assessment: row.assessment || null,
        category: row.category || null,
      })
      .eq('id', id);

    if (err) return err.message;
    await saveLinks(sb, id, policy_ids, indicator_ids);
    await fetch();
    return null;
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async function deleteRecommendation(id: string): Promise<string | null> {
    const sb = supabase;
    if (!sb) return 'Database not available';
    const { error: err } = await sb.from('recommendations').delete().eq('id', id);
    if (err) return err.message;
    await fetch();
    return null;
  }

  return {
    recommendations,
    loading,
    error,
    refresh: fetch,
    addRecommendation,
    updateRecommendation,
    deleteRecommendation,
  };
}
