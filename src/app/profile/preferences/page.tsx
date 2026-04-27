'use client';
/**
 * /profile/preferences — per-user UI/UX preferences (#5).
 *
 * Backed by the `user_preferences` Supabase table. Anonymous users
 * see the panel but their changes only persist in localStorage.
 */
import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/lib/auth-context';
import { usePreferences, Theme, Density, NotifyFrequency, CitationStyle } from '@/lib/preferences-context';

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-grey-100 dark:border-[var(--mh-border)] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-xs text-grey-500 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-md border transition ${
        active
          ? 'bg-secondary text-white border-secondary'
          : 'bg-white dark:bg-transparent text-tertiary dark:text-[var(--mh-fg)] border-grey-300 dark:border-[var(--mh-border)] hover:bg-grey-50 dark:hover:bg-[#1D2734]'
      }`}
    >
      {children}
    </button>
  );
}

export default function PreferencesPage() {
  const { user } = useAuth();
  const { prefs, update } = usePreferences();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function save<K extends keyof typeof prefs>(key: K, value: typeof prefs[K]) {
    await update({ [key]: value } as Record<K, typeof prefs[K]>);
    setSavedAt(Date.now());
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Preferences</h1>
        <p className="text-sm text-grey-500 mb-6">
          Personalise how MethodHub looks and notifies you.
          {!user && ' Sign in to sync these settings across devices.'}
        </p>

        <section className="bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] px-6 py-2">
          <Row label="Theme" hint="Light, dark, or follow your system setting.">
            <div className="flex gap-1.5">
              {(['system', 'light', 'dark'] as Theme[]).map(t => (
                <Pill key={t} active={prefs.theme === t} onClick={() => save('theme', t)}>{t}</Pill>
              ))}
            </div>
          </Row>
          <Row label="Density" hint="Compact fits more content on screen; comfortable adds breathing room.">
            <div className="flex gap-1.5">
              {(['comfortable', 'compact'] as Density[]).map(d => (
                <Pill key={d} active={prefs.density === d} onClick={() => save('density', d)}>{d}</Pill>
              ))}
            </div>
          </Row>
          <Row label="Notification frequency" hint="How often the inbox bell + email digest fire.">
            <div className="flex gap-1.5 flex-wrap justify-end">
              {(['immediate', 'daily', 'weekly', 'off'] as NotifyFrequency[]).map(f => (
                <Pill key={f} active={prefs.notify_frequency === f} onClick={() => save('notify_frequency', f)}>{f}</Pill>
              ))}
            </div>
          </Row>
          <Row label="Email digest" hint="Master switch for the (future) email digest cron.">
            <Pill active={prefs.email_digest} onClick={() => save('email_digest', !prefs.email_digest)}>
              {prefs.email_digest ? 'On' : 'Off'}
            </Pill>
          </Row>
          <Row label="Default citation style" hint="Used for one-click M·01 reference exports.">
            <div className="flex gap-1.5 flex-wrap justify-end">
              {(['apa', 'chicago', 'harvard', 'bibtex'] as CitationStyle[]).map(c => (
                <Pill key={c} active={prefs.default_citation === c} onClick={() => save('default_citation', c)}>{c.toUpperCase()}</Pill>
              ))}
            </div>
          </Row>
          <Row label="AI summary language" hint="Language used for AI-generated summaries / drafts.">
            <select
              value={prefs.ai_summary_language}
              onChange={e => save('ai_summary_language', e.target.value)}
              className="border border-grey-300 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] rounded-md px-2 py-1.5 text-sm"
            >
              {['en', 'de', 'fr', 'es', 'it', 'nl'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </Row>
          <Row label="Keyboard shortcuts" hint="Press ? anywhere to see the cheat sheet.">
            <Pill active={prefs.shortcuts_enabled} onClick={() => save('shortcuts_enabled', !prefs.shortcuts_enabled)}>
              {prefs.shortcuts_enabled ? 'Enabled' : 'Disabled'}
            </Pill>
          </Row>
          <Row label="Public contributor profile" hint="If on, other Secretariat staff can see your contribution stats and badge level.">
            <Pill active={prefs.public_profile} onClick={() => save('public_profile', !prefs.public_profile)}>
              {prefs.public_profile ? 'Public' : 'Private'}
            </Pill>
          </Row>
          <Row label="Colour-blind-safe charts" hint="Switches scenario-explorer charts to the Wong (2011) deuteranope-safe 8-colour palette. Pair every series with a marker shape downstream so colour is never the only channel.">
            <Pill active={prefs.colorblind_safe} onClick={() => save('colorblind_safe', !prefs.colorblind_safe)}>
              {prefs.colorblind_safe ? 'On' : 'Off'}
            </Pill>
          </Row>
        </section>

        {savedAt && (
          <p className="text-xs text-secondary mt-4">Saved.</p>
        )}
      </main>
    </>
  );
}
