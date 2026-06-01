/**
 * Browser-side helpers that talk to /api/member-states/* routes.
 */
import type {
  CountryProfile,
  CountryProfileSubmission,
  ShareLink,
} from '@/data/country-profiles/_types';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} — ${t}`);
  }
  return res.json() as Promise<T>;
}

export const cpApi = {
  listProfiles: () =>
    jsonFetch<{ profiles: CountryProfile[] }>('/api/member-states/profiles'),

  getProfile: (code: string) =>
    jsonFetch<{ profile: CountryProfile }>(`/api/member-states/profiles/${code}`),

  saveProfile: (
    code: string,
    patch: Partial<CountryProfile>,
    opts?: { message?: string; contributorName?: string },
  ) =>
    jsonFetch<{ profile: CountryProfile; submission: CountryProfileSubmission }>(
      `/api/member-states/profiles/${code}`,
      { method: 'PUT', body: JSON.stringify({ patch, ...opts }) },
    ),

  createShareLink: (input: {
    countryCode: string;
    sections?: string[];
    contributorName?: string;
    contributorEmail?: string;
    invitationMessage?: string;
    expiresAt?: string;
  }) =>
    jsonFetch<{ link: ShareLink; url: string }>(
      '/api/member-states/share-links',
      { method: 'POST', body: JSON.stringify(input) },
    ),

  listShareLinks: (countryCode?: string) =>
    jsonFetch<{ links: ShareLink[] }>(
      `/api/member-states/share-links${countryCode ? `?country=${countryCode}` : ''}`,
    ),

  revokeShareLink: (token: string) =>
    jsonFetch<{ ok: boolean }>(
      `/api/member-states/share-links/${token}`,
      { method: 'DELETE' },
    ),

  resolveShareLink: (token: string) =>
    jsonFetch<{ link: ShareLink; profile: CountryProfile }>(
      `/api/member-states/share-links/${token}`,
    ),

  submitExternal: (input: {
    token: string;
    contributorName: string;
    contributorEmail?: string;
    message?: string;
    patch: Partial<CountryProfile>;
  }) =>
    jsonFetch<{ submission: CountryProfileSubmission }>(
      `/api/member-states/share-links/${input.token}/submit`,
      { method: 'POST', body: JSON.stringify(input) },
    ),

  listSubmissions: (opts?: {
    countryCode?: string;
    state?: CountryProfileSubmission['state'];
  }) => {
    const qs = new URLSearchParams();
    if (opts?.countryCode) qs.set('country', opts.countryCode);
    if (opts?.state) qs.set('state', opts.state);
    return jsonFetch<{ submissions: CountryProfileSubmission[] }>(
      `/api/member-states/submissions${qs.toString() ? `?${qs}` : ''}`,
    );
  },

  approveSubmission: (id: string) =>
    jsonFetch<{ profile: CountryProfile }>(
      `/api/member-states/submissions/${id}/approve`,
      { method: 'POST' },
    ),

  rejectSubmission: (id: string, reason?: string) =>
    jsonFetch<{ ok: boolean }>(
      `/api/member-states/submissions/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) },
    ),
};
