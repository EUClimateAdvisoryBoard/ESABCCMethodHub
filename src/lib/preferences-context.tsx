'use client';
/**
 * Global PreferencesProvider — wraps the app under AuthProvider and exposes
 * read/write access to the per-user UI preferences (theme, density,
 * notification frequency, default citation style, AI language, shortcut
 * enablement, public profile opt-in, onboarding-seen flags).
 *
 * Anonymous users get the defaults. Theme / density / shortcuts / onboarding
 * also persist to localStorage so the choice survives sign-out.
 */
import {
  createContext, useContext, useEffect, useState, useCallback, ReactNode,
} from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';

export type Theme = 'system' | 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
export type NotifyFrequency = 'immediate' | 'daily' | 'weekly' | 'off';
export type CitationStyle = 'apa' | 'chicago' | 'harvard' | 'bibtex';

export interface Preferences {
  theme: Theme;
  density: Density;
  notify_frequency: NotifyFrequency;
  email_digest: boolean;
  default_citation: CitationStyle;
  ai_summary_language: string;
  onboarding_seen: Record<string, boolean>;
  shortcuts_enabled: boolean;
  public_profile: boolean;
  /** When true, charts use the Wong-2011 deuteranope-safe palette
      instead of the ESABCC house palette. */
  colorblind_safe: boolean;
}

const DEFAULT_PREFS: Preferences = {
  theme: 'system',
  density: 'comfortable',
  notify_frequency: 'immediate',
  email_digest: false,
  default_citation: 'apa',
  ai_summary_language: 'en',
  onboarding_seen: {},
  shortcuts_enabled: true,
  public_profile: false,
  colorblind_safe: false,
};

const LS_KEY = 'methodhub:prefs';

interface PreferencesState {
  prefs: Preferences;
  loading: boolean;
  update: (patch: Partial<Preferences>) => Promise<void>;
  resolvedTheme: 'light' | 'dark';
  markOnboardingSeen: (moduleKey: string) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesState>({
  prefs: DEFAULT_PREFS,
  loading: false,
  update: async () => {},
  resolvedTheme: 'light',
  markOnboardingSeen: async () => {},
});

export function usePreferences() { return useContext(PreferencesContext); }

function readLocal(): Partial<Preferences> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeLocal(p: Partial<Preferences>) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(() => ({ ...DEFAULT_PREFS, ...readLocal() }));
  const [loading, setLoading] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(DEFAULT_PREFS.theme));

  // Apply theme class on <html> whenever resolvedTheme changes.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    if (resolvedTheme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
    html.dataset.density = prefs.density;
  }, [resolvedTheme, prefs.density]);

  // Recompute resolvedTheme when theme pref changes or system preference changes.
  useEffect(() => {
    setResolvedTheme(resolveTheme(prefs.theme));
    if (prefs.theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedTheme(resolveTheme(prefs.theme));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [prefs.theme]);

  // Pull from Supabase when authed.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !session?.access_token) return;
      setLoading(true);
      try {
        const res = await fetch('/api/user/preferences', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setPrefs(p => ({ ...p, ...data }));
        writeLocal(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, session?.access_token]);

  const update = useCallback(async (patch: Partial<Preferences>) => {
    setPrefs(p => {
      const next = { ...p, ...patch };
      writeLocal(next);
      return next;
    });
    if (user && session?.access_token) {
      try {
        await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(patch),
        });
      } catch {
        // localStorage already updated as fallback
      }
    }
  }, [user, session?.access_token]);

  const markOnboardingSeen = useCallback(async (moduleKey: string) => {
    const next = { ...prefs.onboarding_seen, [moduleKey]: true };
    await update({ onboarding_seen: next });
  }, [prefs.onboarding_seen, update]);

  return (
    <PreferencesContext.Provider value={{ prefs, loading, update, resolvedTheme, markOnboardingSeen }}>
      {children}
    </PreferencesContext.Provider>
  );
}
