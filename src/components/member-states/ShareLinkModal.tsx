'use client';

/**
 * ShareLinkModal — issues a one-off share-link to an external contributor.
 *
 * The main user picks which sections the contributor is allowed to edit,
 * optionally pre-fills the recipient name/email and an invitation message,
 * then hits "Generate link". The token is shown alongside a copy-to-clipboard
 * button.
 */

import { useState } from 'react';
import { cpApi } from '@/lib/country-profiles/client';

const SECTIONS = [
  { key: 'hero',         label: 'Summary' },
  { key: 'ghg',          label: 'GHG emissions' },
  { key: 'renewables',   label: 'Renewables' },
  { key: 'efficiency',   label: 'Energy efficiency' },
  { key: 'air',          label: 'Air quality' },
  { key: 'water',        label: 'Water' },
  { key: 'biodiversity', label: 'Biodiversity' },
  { key: 'circular',     label: 'Circular economy' },
  { key: 'adaptation',   label: 'Adaptation' },
  { key: 'necp',         label: 'NECP delivery' },
];

interface Props {
  countryCode: string;
  countryName: string;
  onClose: () => void;
}

export default function ShareLinkModal({ countryCode, countryName, onClose }: Props) {
  const [contributorName, setContributorName] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [invitationMessage, setInvitationMessage] = useState('');
  const [sections, setSections] = useState<string[]>([]);
  const [allSections, setAllSections] = useState(true);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ token: string; url: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function toggle(k: string) {
    setSections(s => s.includes(k) ? s.filter(x => x !== k) : [...s, k]);
  }

  async function submit() {
    setErr(null); setBusy(true);
    try {
      const res = await cpApi.createShareLink({
        countryCode,
        sections: allSections ? undefined : sections,
        contributorName: contributorName || undefined,
        contributorEmail: contributorEmail || undefined,
        invitationMessage: invitationMessage || undefined,
      });
      setCreated({ token: res.link.token, url: res.url });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-xl w-full p-5 max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-tertiary-dark">
            Invite external contributor — {countryName}
          </h2>
          <button onClick={onClose} className="text-tertiary text-sm" aria-label="Close">✕</button>
        </div>

        {!created ? (
          <>
            <p className="text-[12px] text-tertiary mb-4">
              Generate a one-off URL someone outside the Secretariat can use to fill in
              this country's profile. Their submission lands in your approval queue —
              nothing is applied to the live profile until you approve it.
            </p>

            <div className="space-y-3">
              <label className="block text-[11px] text-tertiary">
                <span className="block mb-1 font-medium text-tertiary-dark">Recipient name</span>
                <input value={contributorName} onChange={e => setContributorName(e.target.value)} className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm" placeholder="e.g. Dr Anna Müller" />
              </label>

              <label className="block text-[11px] text-tertiary">
                <span className="block mb-1 font-medium text-tertiary-dark">Recipient email</span>
                <input value={contributorEmail} onChange={e => setContributorEmail(e.target.value)} className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm" placeholder="anna.mueller@example.eu" />
              </label>

              <label className="block text-[11px] text-tertiary">
                <span className="block mb-1 font-medium text-tertiary-dark">Invitation message</span>
                <textarea value={invitationMessage} onChange={e => setInvitationMessage(e.target.value)} rows={3} className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm" placeholder="What you'd like the contributor to update or check." />
              </label>

              <div className="text-[11px] text-tertiary">
                <span className="block mb-1 font-medium text-tertiary-dark">Sections the contributor can edit</span>
                <label className="flex items-center gap-2 text-tertiary-dark mb-2">
                  <input type="checkbox" checked={allSections} onChange={e => setAllSections(e.target.checked)} />
                  All sections
                </label>
                {!allSections && (
                  <div className="grid grid-cols-2 gap-1 pl-1">
                    {SECTIONS.map(s => (
                      <label key={s.key} className="flex items-center gap-2 text-tertiary-dark">
                        <input
                          type="checkbox"
                          checked={sections.includes(s.key)}
                          onChange={() => toggle(s.key)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {err && <div className="text-red-700 text-[12px] mt-3">{err}</div>}

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50">
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={submit}
                className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50"
              >
                {busy ? 'Generating…' : 'Generate link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[12px] text-tertiary mb-2">Share this URL with the recipient.</p>
            <div className="bg-grey-50 border border-grey-200 rounded p-2 break-all text-[11px] font-mono text-tertiary-dark">
              {created.url}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => navigator.clipboard.writeText(created.url)}
                className="px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50"
              >
                Copy URL
              </button>
              <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark">
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
