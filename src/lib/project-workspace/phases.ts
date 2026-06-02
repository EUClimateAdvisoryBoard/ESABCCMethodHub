/**
 * Server-side data access for Project Workspace phases (Gantt blocks).
 * --------------------------------------------------------------------
 * Backed by the `pw_project_phases` table (migration 046). A phase is a
 * span of time with a title and colour — the building blocks of the
 * project-lead Gantt chart in the Progress tab. Separate entity from
 * meetings and milestones.
 */
import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase-server';

export interface Phase {
  id: string;
  projectId: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  description: string;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function mapPhase(r: Record<string, unknown>): Phase {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    title: (r.title as string) ?? '',
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    color: (r.color as string) ?? '#004B7F',
    description: (r.description as string) ?? '',
    sortOrder: (r.sort_order as number) ?? 0,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function listPhases(projectId: string): Promise<Phase[]> {
  noStore();
  const sb = getServerSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('pw_project_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('start_date', { ascending: true })
    .order('sort_order', { ascending: true });
  return (data ?? []).map(mapPhase);
}
