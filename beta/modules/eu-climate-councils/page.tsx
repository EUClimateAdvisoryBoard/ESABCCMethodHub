'use client';

/**
 * EU Climate Councils — overview module.
 *
 * Built from the May 2026 "Mapping of climate advisory councils in Europe"
 * (67 bodies). The page provides:
 *
 *   - A Leaflet map with one colour-coded pin per body (status palette
 *     matches the source PDF heatmap).
 *   - A filterable, searchable list of all bodies grouped by country.
 *   - Status / coverage summary cards highlighting where Europe has dense
 *     advisory coverage and where there are gaps (none / dormant / abolished).
 *   - An edit panel: signed-in users can adjust any field — body name, URL,
 *     status, notes, lat/lon — and changes persist to Supabase.
 *
 * The data lives in `public.climate_councils` (migration 033). On first
 * load the table is seeded from `src/data/climate-councils.ts` so the
 * page is functional immediately on a fresh database.
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useAuth } from '@/lib/auth-context';
import {
  ClimateCouncil,
  CouncilLevel,
  CouncilStatus,
  COUNCIL_LEVEL_LABELS,
  COUNCIL_STATUS_COLORS,
  COUNCIL_STATUS_LABELS,
  SEED_COUNCILS,
} from '@/data/climate-councils';

const ClimateCouncilsMap = dynamic(() => import('@/components/ClimateCouncilsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[560px] rounded-lg border border-grey-200 bg-grey-50 flex items-center justify-center text-tertiary text-sm">
      Loading map…
    </div>
  ),
});

const STATUS_OPTIONS: CouncilStatus[] = [
  'active_statutory',
  'active_no_statute',
  'inter_ministerial',
  'partial_proxy',
  'legislated_not_operational',
  'dormant',
  'abolished',
  'none',
];

const LEVEL_OPTIONS: CouncilLevel[] = ['eu', 'national', 'subnational'];

// Virtual filter values group several statuses together so the summary
// stat cards (Active / At-risk / Gaps) can act as one-click filters.
type StatusFilter = CouncilStatus | 'all' | 'active' | 'at_risk' | 'gaps';

const STATUS_GROUPS: Record<'active' | 'at_risk' | 'gaps', CouncilStatus[]> = {
  active:  ['active_statutory', 'active_no_statute', 'inter_ministerial'],
  at_risk: ['legislated_not_operational', 'dormant'],
  gaps:    ['none', 'abolished'],
};

const STATUS_GROUP_LABELS: Record<'active' | 'at_risk' | 'gaps', string> = {
  active:  'Active (any form)',
  at_risk: 'At-risk / pending',
  gaps:    'Gaps (no body or abolished)',
};

function matchesStatusFilter(status: CouncilStatus, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active' || filter === 'at_risk' || filter === 'gaps') {
    return STATUS_GROUPS[filter].includes(status);
  }
  return status === filter;
}

function emptyCouncil(): ClimateCouncil {
  return {
    id: '',
    countryCode: '',
    countryName: '',
    bodyName: '',
    bodyOriginal: '',
    level: 'national',
    region: '',
    status: 'active_statutory',
    established: '',
    statutory: '',
    url: '',
    legalBasisUrl: '',
    notes: '',
    lat: 0,
    lon: 0,
  };
}

export default function EuClimateCouncilsPage() {
  const { user, requireAuth } = useAuth();
  const [councils, setCouncils] = useState<ClimateCouncil[]>(SEED_COUNCILS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [levelFilter, setLevelFilter] = useState<CouncilLevel | 'all'>('all');
  const [editing, setEditing] = useState<ClimateCouncil | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/climate-councils', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { councils: ClimateCouncil[] };
      if (Array.isArray(json.councils) && json.councils.length > 0) {
        setCouncils(json.councils);
      }
    } catch {
      // Network/Supabase down: keep the seed in place so the page still works.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return councils.filter(c => {
      if (!matchesStatusFilter(c.status, statusFilter)) return false;
      if (levelFilter !== 'all' && c.level !== levelFilter) return false;
      if (!q) return true;
      return (
        c.bodyName.toLowerCase().includes(q) ||
        c.bodyOriginal.toLowerCase().includes(q) ||
        c.countryName.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q)
      );
    });
  }, [councils, search, statusFilter, levelFilter]);

  // ── Coverage stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = councils.length;
    const byStatus: Record<CouncilStatus, number> = {
      active_statutory: 0, active_no_statute: 0, inter_ministerial: 0,
      partial_proxy: 0, legislated_not_operational: 0, dormant: 0,
      abolished: 0, none: 0,
    };
    const byLevel: Record<CouncilLevel, number> = { eu: 0, national: 0, subnational: 0 };
    const countriesWithActive = new Set<string>();
    const countriesWithGap = new Set<string>();

    councils.forEach(c => {
      byStatus[c.status]++;
      byLevel[c.level]++;
      const isActive =
        c.status === 'active_statutory' ||
        c.status === 'active_no_statute' ||
        c.status === 'inter_ministerial';
      if (c.level === 'national' && isActive) countriesWithActive.add(c.countryCode);
      if (c.status === 'none' || c.status === 'abolished' || c.status === 'dormant') {
        countriesWithGap.add(c.countryCode);
      }
    });

    return { total, byStatus, byLevel, countriesWithActive, countriesWithGap };
  }, [councils]);

  // ── Custom field keys: union across the entire catalogue ────────────────
  // Once a curator adds a field on one body, every other body's edit form
  // surfaces it as an "available field" so they can fill it in too.
  const allCustomFieldKeys = useMemo(() => {
    const set = new Set<string>();
    councils.forEach(c => {
      if (c.customFields) Object.keys(c.customFields).forEach(k => set.add(k));
    });
    return Array.from(set).sort();
  }, [councils]);

  // ── Refs for scroll-to-list / scroll-to-body ─────────────────────────────
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const scrollToList = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const setStatusFilterAndScroll = useCallback(
    (filter: StatusFilter) => {
      setStatusFilter(filter);
      scrollToList();
    },
    [scrollToList],
  );

  // Map popup → "Expand" jumps to the body's full card. Clears any filter
  // that would otherwise hide it, then scrolls and pulses a highlight.
  const handleExpand = useCallback(
    (c: ClimateCouncil) => {
      setStatusFilter('all');
      setLevelFilter('all');
      setSearch('');
      setHighlightId(c.id);
      requestAnimationFrame(() => {
        const node = cardRefs.current[c.id];
        if (node) {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      window.setTimeout(() => setHighlightId(null), 2400);
    },
    [],
  );

  // ── Edit handlers ────────────────────────────────────────────────────────
  const handleEdit = useCallback(
    (c: ClimateCouncil) => {
      if (!user) {
        requireAuth('Sign in to edit the climate councils catalogue.');
        return;
      }
      setEditing({ ...c });
      setIsNew(false);
      setSaveError(null);
    },
    [user, requireAuth],
  );

  const handleAdd = useCallback(() => {
    if (!user) {
      requireAuth('Sign in to add a new climate council.');
      return;
    }
    setEditing(emptyCouncil());
    setIsNew(true);
    setSaveError(null);
  }, [user, requireAuth]);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/climate-councils', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      await reload();
      setEditing(null);
      setIsNew(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [editing, reload]);

  const handleDelete = useCallback(async () => {
    if (!editing || !editing.id) return;
    if (!confirm(`Delete "${editing.bodyName}"? This cannot be undone.`)) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/climate-councils?id=${encodeURIComponent(editing.id)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await reload();
      setEditing(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  }, [editing, reload]);

  // ── Group filtered list by country ──────────────────────────────────────
  const byCountry = useMemo(() => {
    const groups = new Map<string, ClimateCouncil[]>();
    filtered.forEach(c => {
      const key = c.countryName;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });
    return Array.from(groups.entries()).sort(([a], [b]) =>
      a === 'European Union' ? -1 : b === 'European Union' ? 1 : a.localeCompare(b),
    );
  }, [filtered]);

  return (
    <>
      <SiteHeader />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero */}
        <section className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">
            Beta module · sourced from May 2026 mapping
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">
            EU Climate Councils
          </h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            Where Europe has — and has not — set up a climate advisory council.
            Covers the EU27, candidate / accession countries, the ESABCC at EU
            level, and selected sub-national bodies. Status and links are
            curatable: sign in to edit, add a body, or fill in a gap.
          </p>
        </section>

        {/* Coverage cards — clicking a card filters the list to that group
            and scrolls down to it. The Bodies-tracked card resets filters. */}
        {!editing && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Bodies tracked"
            value={stats.total.toString()}
            sub={`EU ${stats.byLevel.eu} · National ${stats.byLevel.national} · Sub-national ${stats.byLevel.subnational}`}
            active={statusFilter === 'all'}
            onClick={() => setStatusFilterAndScroll('all')}
          />
          <StatCard
            label="Active (any form)"
            value={(
              stats.byStatus.active_statutory +
              stats.byStatus.active_no_statute +
              stats.byStatus.inter_ministerial
            ).toString()}
            sub={`Statutory: ${stats.byStatus.active_statutory}`}
            active={statusFilter === 'active'}
            onClick={() => setStatusFilterAndScroll('active')}
          />
          <StatCard
            label="At-risk / pending"
            value={(
              stats.byStatus.legislated_not_operational +
              stats.byStatus.dormant
            ).toString()}
            sub="Legislated-not-operational + dormant"
            tone="amber"
            active={statusFilter === 'at_risk'}
            onClick={() => setStatusFilterAndScroll('at_risk')}
          />
          <StatCard
            label="Gaps"
            value={(stats.byStatus.none + stats.byStatus.abolished).toString()}
            sub={`No body: ${stats.byStatus.none} · Abolished: ${stats.byStatus.abolished}`}
            tone="red"
            active={statusFilter === 'gaps'}
            onClick={() => setStatusFilterAndScroll('gaps')}
          />
        </section>
        )}

        {/* Map — hidden while the edit drawer is open so curators can focus
            on the form without the heavy Leaflet canvas competing for layout */}
        {!editing && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-tertiary-dark">Map</h2>
            <Legend />
          </div>
          <ClimateCouncilsMap
            councils={filtered}
            onEdit={handleEdit}
            onExpand={handleExpand}
          />
        </section>
        )}

        {/* Filters + add */}
        <section className="mb-4 flex flex-wrap gap-2 items-center">
          <input
            type="search"
            placeholder="Search body, country, region, notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-grey-300 rounded focus:outline-none focus:border-primary"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 text-sm border border-grey-300 rounded bg-white"
          >
            <option value="all">All statuses</option>
            <optgroup label="Groups">
              <option value="active">{STATUS_GROUP_LABELS.active}</option>
              <option value="at_risk">{STATUS_GROUP_LABELS.at_risk}</option>
              <option value="gaps">{STATUS_GROUP_LABELS.gaps}</option>
            </optgroup>
            <optgroup label="Individual statuses">
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{COUNCIL_STATUS_LABELS[s]}</option>
              ))}
            </optgroup>
          </select>
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as CouncilLevel | 'all')}
            className="px-3 py-2 text-sm border border-grey-300 rounded bg-white"
          >
            <option value="all">All levels</option>
            {LEVEL_OPTIONS.map(l => (
              <option key={l} value={l}>{COUNCIL_LEVEL_LABELS[l]}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="px-3 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary-dark"
          >
            + Add body
          </button>
        </section>

        {loading && (
          <p className="text-xs text-tertiary mb-3">Loading from database…</p>
        )}

        {/* List grouped by country */}
        <section ref={listRef} className="space-y-5 scroll-mt-20">
          {byCountry.length === 0 && (
            <div className="text-sm text-tertiary p-6 text-center bg-grey-50 rounded">
              No bodies match the current filters.
            </div>
          )}
          {byCountry.map(([country, items]) => (
            <div key={country}>
              <h3 className="text-sm font-semibold text-tertiary-dark mb-2 sticky top-[60px] sm:top-[72px] bg-white/95 backdrop-blur py-1 border-b border-grey-100">
                {country}
                <span className="ml-2 text-xs font-normal text-tertiary">
                  {items.length} {items.length === 1 ? 'body' : 'bodies'}
                </span>
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(c => (
                  <CouncilCard
                    key={c.id}
                    council={c}
                    onEdit={handleEdit}
                    highlight={highlightId === c.id}
                    refCallback={el => { cardRefs.current[c.id] = el; }}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      </main>

      {/* Edit drawer */}
      {editing && (
        <EditDrawer
          council={editing}
          isNew={isNew}
          saving={saving}
          error={saveError}
          allCustomFieldKeys={allCustomFieldKeys}
          onChange={setEditing}
          onSave={handleSave}
          onDelete={isNew ? undefined : handleDelete}
          onClose={() => {
            setEditing(null);
            setSaveError(null);
          }}
        />
      )}

      <SiteFooter />
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, tone, active, onClick,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'amber' | 'red';
  active?: boolean;
  onClick?: () => void;
}) {
  const accent =
    tone === 'red'
      ? 'border-l-[#C62828]'
      : tone === 'amber'
      ? 'border-l-[#F9A825]'
      : 'border-l-primary';
  const ring = active ? 'ring-2 ring-primary/40' : '';
  const cursor = onClick ? 'cursor-pointer hover:shadow-md hover:border-grey-300' : '';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left w-full bg-white border border-grey-200 border-l-4 ${accent} ${ring} ${cursor} rounded p-3 transition disabled:cursor-default`}
    >
      <div className="text-[11px] uppercase tracking-wide text-tertiary">{label}</div>
      <div className="text-2xl font-bold text-tertiary-dark mt-0.5">{value}</div>
      <div className="text-[11px] text-tertiary mt-1 leading-tight">{sub}</div>
    </button>
  );
}

function Legend() {
  return (
    <div className="hidden sm:flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-tertiary">
      {STATUS_OPTIONS.map(s => (
        <span key={s} className="inline-flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: COUNCIL_STATUS_COLORS[s] }}
          />
          {COUNCIL_STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  );
}

function CouncilCard({
  council: c,
  onEdit,
  highlight,
  refCallback,
}: {
  council: ClimateCouncil;
  onEdit: (c: ClimateCouncil) => void;
  highlight?: boolean;
  refCallback?: (el: HTMLLIElement | null) => void;
}) {
  const customEntries = c.customFields
    ? Object.entries(c.customFields).filter(([, v]) => v && v.trim() !== '')
    : [];
  return (
    <li
      ref={refCallback}
      className={`bg-white border rounded p-3 transition scroll-mt-24 ${
        highlight
          ? 'border-primary ring-2 ring-primary/40 shadow-md'
          : 'border-grey-200 hover:border-grey-300'
      }`}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <span
          className="mt-1 inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: COUNCIL_STATUS_COLORS[c.status] }}
          title={COUNCIL_STATUS_LABELS[c.status]}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-tertiary">
            {COUNCIL_LEVEL_LABELS[c.level]}
            {c.region && ` · ${c.region}`}
          </div>
          <div className="text-sm font-semibold text-tertiary-dark leading-snug">
            {c.bodyName}
          </div>
          {c.bodyOriginal && c.bodyOriginal !== c.bodyName && (
            <div className="text-[11px] text-tertiary italic leading-snug mt-0.5">
              {c.bodyOriginal}
            </div>
          )}
        </div>
      </div>

      <div className="text-[11px] text-tertiary flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
        <span>
          <span className="font-medium">Status:</span>{' '}
          <span style={{ color: COUNCIL_STATUS_COLORS[c.status] }}>
            {COUNCIL_STATUS_LABELS[c.status]}
          </span>
        </span>
        {c.established && (
          <span>
            <span className="font-medium">Est.:</span> {c.established}
          </span>
        )}
        {c.statutory && (
          <span>
            <span className="font-medium">Statutory:</span> {c.statutory}
          </span>
        )}
      </div>

      {c.notes && (
        <p className="text-[12px] text-tertiary leading-snug line-clamp-3 mb-2">{c.notes}</p>
      )}

      {customEntries.length > 0 && (
        <dl className="text-[11px] text-tertiary mb-2 grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5">
          {customEntries.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-medium text-tertiary-dark">{k}:</dt>
              <dd className="text-tertiary truncate">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap gap-3 items-center text-[11px]">
        {c.url && (
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Website ↗
          </a>
        )}
        {c.legalBasisUrl && (
          <a
            href={c.legalBasisUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Legal basis ↗
          </a>
        )}
        <button
          onClick={() => onEdit(c)}
          className="ml-auto text-tertiary hover:text-primary"
        >
          Edit
        </button>
      </div>
    </li>
  );
}

function EditDrawer({
  council, isNew, saving, error, allCustomFieldKeys,
  onChange, onSave, onDelete, onClose,
}: {
  council: ClimateCouncil;
  isNew: boolean;
  saving: boolean;
  error: string | null;
  allCustomFieldKeys: string[];
  onChange: (c: ClimateCouncil) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const set = <K extends keyof ClimateCouncil>(key: K, value: ClimateCouncil[K]) =>
    onChange({ ...council, [key]: value });

  const customFields = council.customFields || {};
  const setCustomField = (key: string, value: string) => {
    const next = { ...customFields, [key]: value };
    onChange({ ...council, customFields: next });
  };
  const removeCustomField = (key: string) => {
    const next = { ...customFields };
    delete next[key];
    onChange({ ...council, customFields: next });
  };
  const addCustomField = (rawKey: string) => {
    const key = rawKey.trim().slice(0, 80);
    if (!key) return;
    if (key in customFields) return;
    onChange({ ...council, customFields: { ...customFields, [key]: '' } });
  };
  // Field keys defined elsewhere in the catalogue but not yet on this body —
  // surfaced as one-click "add" suggestions.
  const suggestedKeys = allCustomFieldKeys.filter(k => !(k in customFields));

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative ml-auto w-full max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 h-14 border-b border-grey-200 shrink-0">
          <h2 className="font-semibold text-tertiary-dark">
            {isNew ? 'Add climate council' : 'Edit climate council'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded text-tertiary hover:bg-grey-100"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
          {isNew && (
            <Field label="ID (slug, lowercase, e.g. fr-hcc)">
              <input
                value={council.id}
                onChange={e => set('id', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                className="input"
                placeholder="cc-body-slug"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Country code (ISO-2 / EU)">
              <input
                value={council.countryCode}
                onChange={e => set('countryCode', e.target.value.toUpperCase())}
                className="input"
                maxLength={3}
              />
            </Field>
            <Field label="Country name">
              <input
                value={council.countryName}
                onChange={e => set('countryName', e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Body name (English)">
            <input
              value={council.bodyName}
              onChange={e => set('bodyName', e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Body name (original)">
            <input
              value={council.bodyOriginal}
              onChange={e => set('bodyOriginal', e.target.value)}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Level">
              <select
                value={council.level}
                onChange={e => set('level', e.target.value as CouncilLevel)}
                className="input"
              >
                {LEVEL_OPTIONS.map(l => (
                  <option key={l} value={l}>{COUNCIL_LEVEL_LABELS[l]}</option>
                ))}
              </select>
            </Field>
            <Field label="Sub-national region">
              <input
                value={council.region}
                onChange={e => set('region', e.target.value)}
                className="input"
                placeholder="e.g. Catalonia"
              />
            </Field>
          </div>

          <Field label="Status">
            <select
              value={council.status}
              onChange={e => set('status', e.target.value as CouncilStatus)}
              className="input"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{COUNCIL_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Established">
              <input
                value={council.established}
                onChange={e => set('established', e.target.value)}
                className="input"
                placeholder="2018"
              />
            </Field>
            <Field label="Statutory anchoring">
              <input
                value={council.statutory}
                onChange={e => set('statutory', e.target.value)}
                className="input"
                placeholder="Yes / Secondary / No"
              />
            </Field>
          </div>

          <Field label="Website URL">
            <input
              value={council.url}
              onChange={e => set('url', e.target.value)}
              className="input"
              placeholder="https://…"
            />
          </Field>

          <Field label="Legal basis URL">
            <input
              value={council.legalBasisUrl}
              onChange={e => set('legalBasisUrl', e.target.value)}
              className="input"
              placeholder="https://…"
            />
          </Field>

          <Field label="Notes / mandate">
            <textarea
              value={council.notes}
              onChange={e => set('notes', e.target.value)}
              className="input min-h-[100px]"
              rows={5}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input
                type="number"
                step="0.0001"
                value={council.lat}
                onChange={e => set('lat', parseFloat(e.target.value) || 0)}
                className="input"
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                step="0.0001"
                value={council.lon}
                onChange={e => set('lon', parseFloat(e.target.value) || 0)}
                className="input"
              />
            </Field>
          </div>

          {/* Custom fields — open-ended key/value pairs. Adding a key on
              one body makes it offered as a suggestion on every other body. */}
          <div className="border-t border-grey-100 pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-wide text-tertiary">
                Custom fields
              </h3>
              <span className="text-[10px] text-tertiary">
                {Object.keys(customFields).length} on this body · {allCustomFieldKeys.length} catalogue-wide
              </span>
            </div>

            {Object.keys(customFields).length === 0 && (
              <p className="text-[11px] text-tertiary mb-2">
                No custom fields yet. Add one to capture extra information
                (e.g. <em>chair</em>, <em>budget</em>, <em>secretariat size</em>) — every
                other body in the catalogue will then be able to fill it in too.
              </p>
            )}

            {Object.entries(customFields).map(([key, value]) => (
              <div key={key} className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-tertiary-dark">{key}</label>
                  <button
                    type="button"
                    onClick={() => removeCustomField(key)}
                    className="text-[10px] text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={value}
                  onChange={e => setCustomField(key, e.target.value)}
                  className="input"
                />
              </div>
            ))}

            <AddCustomField onAdd={addCustomField} />

            {suggestedKeys.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] uppercase tracking-wide text-tertiary mb-1">
                  Used elsewhere in the catalogue
                </div>
                <div className="flex flex-wrap gap-1">
                  {suggestedKeys.map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => addCustomField(k)}
                      className="text-[11px] px-2 py-0.5 border border-grey-300 rounded-full hover:bg-grey-50"
                    >
                      + {k}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <footer className="border-t border-grey-200 px-5 py-3 flex items-center gap-2 shrink-0">
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={saving}
              className="text-xs text-red-700 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-2 text-sm border border-grey-300 rounded hover:bg-grey-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving || !council.id || !council.bodyName || !council.countryCode}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </footer>

        <style jsx>{`
          :global(.input) {
            width: 100%;
            padding: 0.5rem 0.625rem;
            font-size: 0.85rem;
            border: 1px solid #d1d5db;
            border-radius: 0.25rem;
            background: white;
            color: #1f2937;
          }
          :global(.input:focus) {
            outline: none;
            border-color: #00928f;
          }
        `}</style>
      </aside>
    </div>
  );
}

function AddCustomField({ onAdd }: { onAdd: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const submit = () => {
    if (!name.trim()) return;
    onAdd(name);
    setName('');
    setOpen(false);
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-primary hover:underline"
      >
        + Add field
      </button>
    );
  }
  return (
    <div className="flex gap-1.5 items-center">
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          if (e.key === 'Escape') { setOpen(false); setName(''); }
        }}
        placeholder="Field name (e.g. Chair, Budget)"
        className="input flex-1"
      />
      <button
        type="button"
        onClick={submit}
        className="px-2 py-1 text-[11px] font-medium text-white bg-primary rounded"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setName(''); }}
        className="px-2 py-1 text-[11px] text-tertiary"
      >
        Cancel
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-tertiary mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
