/**
 * Server-side helpers for reading/writing country profile drafts, share-links
 * and submissions.  Used by the `/api/member-states/*` routes.
 *
 * - `loadEffectiveProfile(code)` merges the in-repo seed data with the latest
 *   draft override stored in Supabase, so callers always get the live state.
 * - Falls back gracefully when Supabase isn't configured (e.g. running the
 *   app without env vars locally): drafts and submissions are kept in a
 *   process-local in-memory store. This keeps the prototype working.
 */
import crypto from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { COUNTRY_BY_CODE, COUNTRY_PROFILES } from '@/data/country-profiles';
import type {
  CountryProfile,
  CountryProfileSubmission,
  ShareLink,
} from '@/data/country-profiles/_types';

/* ------------------------------------------------------------- supabase --- */

function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/* ----------------------------------------- in-memory fallback ------------- */

type MemoryStore = {
  drafts: Map<string, Partial<CountryProfile>>;
  shareLinks: Map<string, ShareLink>;
  submissions: Map<string, CountryProfileSubmission>;
};

const globalAny = globalThis as unknown as { __cpMemoryStore?: MemoryStore };
const memory: MemoryStore =
  globalAny.__cpMemoryStore ?? (globalAny.__cpMemoryStore = {
    drafts: new Map(),
    shareLinks: new Map(),
    submissions: new Map(),
  });

/* ------------------------------------------------- profile merge helpers --- */

function mergePatch<T extends object>(base: T, patch: Partial<T> | undefined): T {
  if (!patch) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const k of Object.keys(patch)) {
    const bv = (base as Record<string, unknown>)[k];
    const pv = (patch as Record<string, unknown>)[k];
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
      out[k] = mergePatch(bv as object, pv as object);
    } else if (pv !== undefined) {
      out[k] = pv;
    }
  }
  return out as T;
}

async function readDraft(code: string): Promise<Partial<CountryProfile> | null> {
  const cc = code.toUpperCase();
  const sb = supabase();
  if (!sb) return memory.drafts.get(cc) ?? null;
  const { data, error } = await sb
    .from('country_profile_drafts')
    .select('patch')
    .eq('country_code', cc)
    .maybeSingle();
  if (error || !data) return null;
  return (data.patch as Partial<CountryProfile>) ?? null;
}

async function writeDraft(
  code: string,
  patch: Partial<CountryProfile>,
  userId?: string,
): Promise<void> {
  const cc = code.toUpperCase();
  const sb = supabase();
  if (!sb) {
    const existing = memory.drafts.get(cc) ?? {};
    memory.drafts.set(cc, mergePatch(existing as CountryProfile, patch));
    return;
  }
  const existing = (await readDraft(cc)) ?? {};
  const merged = mergePatch(existing as CountryProfile, patch);
  await sb
    .from('country_profile_drafts')
    .upsert(
      {
        country_code: cc,
        patch: merged,
        updated_at: new Date().toISOString(),
        updated_by: userId ?? null,
      },
      { onConflict: 'country_code' },
    );
}

/* ----------------------------------------------------- public profile API */

export async function loadEffectiveProfile(code: string): Promise<CountryProfile | null> {
  const seed = COUNTRY_BY_CODE[code.toUpperCase()];
  if (!seed) return null;
  const patch = await readDraft(code);
  return mergePatch(seed, patch ?? undefined);
}

export async function loadAllEffectiveProfiles(): Promise<CountryProfile[]> {
  const sb = supabase();
  let patches: Record<string, Partial<CountryProfile>> = {};
  if (sb) {
    const { data } = await sb
      .from('country_profile_drafts')
      .select('country_code, patch');
    if (data) {
      for (const row of data) {
        const cc = (row.country_code as string).toUpperCase();
        patches[cc] = row.patch as Partial<CountryProfile>;
      }
    }
  } else {
    patches = Object.fromEntries(memory.drafts);
  }
  return COUNTRY_PROFILES.map(p => mergePatch(p, patches[p.code]));
}

export async function saveProfilePatch(
  code: string,
  patch: Partial<CountryProfile>,
  userId?: string,
): Promise<CountryProfile> {
  await writeDraft(code, patch, userId);
  return (await loadEffectiveProfile(code))!;
}

/* ---------------------------------------------------------- share-links --- */

export async function createShareLink(input: {
  countryCode: string;
  sections?: string[];
  contributorName?: string;
  contributorEmail?: string;
  invitationMessage?: string;
  expiresAt?: string;
  createdBy?: string;
}): Promise<ShareLink> {
  const token = crypto.randomBytes(18).toString('base64url');
  const sl: ShareLink = {
    token,
    countryCode: input.countryCode.toUpperCase(),
    sections: (input.sections as ShareLink['sections']) ?? undefined,
    contributorName: input.contributorName,
    contributorEmail: input.contributorEmail,
    invitationMessage: input.invitationMessage,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    expiresAt:
      input.expiresAt ??
      new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    revoked: false,
    uses: 0,
  };
  const sb = supabase();
  if (!sb) {
    memory.shareLinks.set(token, sl);
    return sl;
  }
  await sb.from('country_profile_share_links').insert({
    token: sl.token,
    country_code: sl.countryCode,
    sections: sl.sections ?? null,
    contributor_name: sl.contributorName ?? null,
    contributor_email: sl.contributorEmail ?? null,
    invitation_message: sl.invitationMessage ?? null,
    expires_at: sl.expiresAt ?? null,
    created_by: input.createdBy ?? null,
  });
  return sl;
}

export async function resolveShareLink(token: string): Promise<ShareLink | null> {
  const sb = supabase();
  if (!sb) return memory.shareLinks.get(token) ?? null;
  const { data, error } = await sb
    .from('country_profile_share_links')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) return null;
  return {
    token: data.token,
    countryCode: data.country_code,
    sections: data.sections ?? undefined,
    contributorName: data.contributor_name ?? undefined,
    contributorEmail: data.contributor_email ?? undefined,
    invitationMessage: data.invitation_message ?? undefined,
    createdAt: data.created_at,
    expiresAt: data.expires_at ?? undefined,
    revoked: data.revoked,
    uses: data.uses ?? 0,
  };
}

export async function listShareLinks(countryCode?: string): Promise<ShareLink[]> {
  const sb = supabase();
  if (!sb) {
    const arr = [...memory.shareLinks.values()];
    return countryCode
      ? arr.filter(l => l.countryCode === countryCode.toUpperCase())
      : arr;
  }
  let q = sb
    .from('country_profile_share_links')
    .select('*')
    .order('created_at', { ascending: false });
  if (countryCode) q = q.eq('country_code', countryCode.toUpperCase());
  const { data } = await q;
  return (data ?? []).map(d => ({
    token: d.token,
    countryCode: d.country_code,
    sections: d.sections ?? undefined,
    contributorName: d.contributor_name ?? undefined,
    contributorEmail: d.contributor_email ?? undefined,
    invitationMessage: d.invitation_message ?? undefined,
    createdAt: d.created_at,
    expiresAt: d.expires_at ?? undefined,
    revoked: d.revoked,
    uses: d.uses ?? 0,
  }));
}

export async function revokeShareLink(token: string): Promise<void> {
  const sb = supabase();
  if (!sb) {
    const sl = memory.shareLinks.get(token);
    if (sl) memory.shareLinks.set(token, { ...sl, revoked: true });
    return;
  }
  await sb
    .from('country_profile_share_links')
    .update({ revoked: true })
    .eq('token', token);
}

async function bumpShareLinkUse(token: string) {
  const sb = supabase();
  if (!sb) {
    const sl = memory.shareLinks.get(token);
    if (sl) memory.shareLinks.set(token, { ...sl, uses: (sl.uses ?? 0) + 1 });
    return;
  }
  const { data } = await sb
    .from('country_profile_share_links')
    .select('uses')
    .eq('token', token)
    .maybeSingle();
  await sb
    .from('country_profile_share_links')
    .update({ uses: (data?.uses ?? 0) + 1 })
    .eq('token', token);
}

/* ---------------------------------------------------------- submissions --- */

export async function createSubmission(
  input: Omit<CountryProfileSubmission, 'id' | 'submittedAt' | 'state'>
    & { shareLinkToken?: string },
): Promise<CountryProfileSubmission> {
  const id = crypto.randomUUID();
  const sub: CountryProfileSubmission = {
    id,
    submittedAt: new Date().toISOString(),
    state: 'pending',
    ...input,
  };
  const sb = supabase();
  if (!sb) {
    memory.submissions.set(id, sub);
  } else {
    await sb.from('country_profile_submissions').insert({
      id,
      country_code: sub.countryCode.toUpperCase(),
      source: sub.source,
      contributor_name: sub.contributorName,
      contributor_email: sub.contributorEmail ?? null,
      message: sub.message ?? null,
      patch: sub.patch,
      share_link_token: input.shareLinkToken ?? null,
    });
  }
  if (input.shareLinkToken) await bumpShareLinkUse(input.shareLinkToken);
  return sub;
}

export async function listSubmissions(opts?: {
  countryCode?: string;
  state?: CountryProfileSubmission['state'];
}): Promise<CountryProfileSubmission[]> {
  const sb = supabase();
  if (!sb) {
    let arr = [...memory.submissions.values()];
    if (opts?.countryCode) arr = arr.filter(s => s.countryCode === opts.countryCode!.toUpperCase());
    if (opts?.state) arr = arr.filter(s => s.state === opts.state);
    return arr.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
  let q = sb
    .from('country_profile_submissions')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (opts?.countryCode) q = q.eq('country_code', opts.countryCode.toUpperCase());
  if (opts?.state) q = q.eq('state', opts.state);
  const { data } = await q;
  return (data ?? []).map(d => ({
    id: d.id,
    countryCode: d.country_code,
    source: d.source,
    contributorName: d.contributor_name,
    contributorEmail: d.contributor_email ?? undefined,
    message: d.message ?? undefined,
    patch: d.patch,
    submittedAt: d.submitted_at,
    state: d.state,
    reviewedAt: d.reviewed_at ?? undefined,
    reviewedBy: d.reviewed_by ?? undefined,
    rejectionReason: d.rejection_reason ?? undefined,
  }));
}

export async function getSubmission(id: string): Promise<CountryProfileSubmission | null> {
  const sb = supabase();
  if (!sb) return memory.submissions.get(id) ?? null;
  const { data } = await sb
    .from('country_profile_submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    countryCode: data.country_code,
    source: data.source,
    contributorName: data.contributor_name,
    contributorEmail: data.contributor_email ?? undefined,
    message: data.message ?? undefined,
    patch: data.patch,
    submittedAt: data.submitted_at,
    state: data.state,
    reviewedAt: data.reviewed_at ?? undefined,
    reviewedBy: data.reviewed_by ?? undefined,
    rejectionReason: data.rejection_reason ?? undefined,
  };
}

export async function approveSubmission(
  id: string,
  reviewerId?: string,
): Promise<CountryProfile | null> {
  const sub = await getSubmission(id);
  if (!sub || sub.state !== 'pending') return null;
  await saveProfilePatch(sub.countryCode, sub.patch, reviewerId);
  await markSubmission(id, 'approved', reviewerId);
  return loadEffectiveProfile(sub.countryCode);
}

export async function rejectSubmission(
  id: string,
  reviewerId?: string,
  reason?: string,
): Promise<void> {
  await markSubmission(id, 'rejected', reviewerId, reason);
}

async function markSubmission(
  id: string,
  state: 'approved' | 'rejected',
  reviewerId?: string,
  reason?: string,
) {
  const sb = supabase();
  const nowIso = new Date().toISOString();
  if (!sb) {
    const cur = memory.submissions.get(id);
    if (cur) {
      memory.submissions.set(id, {
        ...cur,
        state,
        reviewedAt: nowIso,
        reviewedBy: reviewerId,
        rejectionReason: reason,
      });
    }
    return;
  }
  await sb
    .from('country_profile_submissions')
    .update({
      state,
      reviewed_at: nowIso,
      reviewed_by: reviewerId ?? null,
      rejection_reason: reason ?? null,
    })
    .eq('id', id);
}
