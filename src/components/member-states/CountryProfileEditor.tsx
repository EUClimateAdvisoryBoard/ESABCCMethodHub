'use client';

/**
 * CountryProfileEditor — form-based editor for a country profile.
 *
 * Renders every section as a collapsible block with structured form fields
 * matching the schema. The editor builds a sparse patch (only changed
 * fields) and submits it via:
 *   - `onSubmit` callback (parent decides whether to save as a draft, send
 *     for review, or post as an external submission).
 *
 * Used by:
 *   - /member-states/[code]/edit → main user, auto-applies on save.
 *   - /contribute/[token]        → external user, queues a submission.
 */

import { useState } from 'react';
import type {
  CountryProfile, Status,
} from '@/data/country-profiles/_types';
import { STATUS_LABELS } from '@/data/country-profiles/_types';

const STATUS_OPTIONS: Status[] = ['on-track', 'partial', 'concern', 'off-track', 'unknown'];

interface Props {
  profile: CountryProfile;
  /** When true, allow only the listed sections (used by share-links). */
  allowedSections?: string[];
  contributorName?: string;
  /** Submit handler. Receives sparse patch plus contributor metadata. */
  onSubmit: (input: {
    patch: Partial<CountryProfile>;
    contributorName: string;
    contributorEmail?: string;
    message?: string;
  }) => Promise<void>;
  submitLabel?: string;
  showContributorFields?: boolean;
}

type Draft = {
  // Top-level summary
  summary: string;
  highlights: string;
  watchNotes: string;
  // GHG
  ghgStatus: Status;
  ghgLatestValue: string;
  ghgLatestYear: string;
  ghgTotal1990: string;
  ghgTarget2030Value: string;
  ghgTarget2030Baseline: string;
  ghgTarget2030Notes: string;
  ghgTarget2050Value: string;
  ghgTarget2050Year: string;
  ghgTarget2050Notes: string;
  ghgNarrative: string;
  // Renewables
  resStatus: Status;
  resLatestValue: string;
  resLatestYear: string;
  resTarget2030: string;
  resNarrative: string;
  // Efficiency
  effStatus: Status;
  effIntensityValue: string;
  effIntensityYear: string;
  effTarget2030: string;
  effNarrative: string;
  // Air
  airStatus: Status;
  airPm25: string;
  airPm25Year: string;
  airNo2: string;
  airNarrative: string;
  // Water
  waterStatus: Status;
  waterSurfaceGood: string;
  waterGroundGood: string;
  waterNarrative: string;
  // Biodiversity
  bioStatus: Status;
  bioNatura2000Land: string;
  bioNarrative: string;
  // Circular
  circStatus: Status;
  circRecycling: string;
  circCmu: string;
  circNarrative: string;
  // Adaptation
  adaptStatus: Status;
  adaptStrategyTitle: string;
  adaptStrategyYear: string;
  adaptRisks: string;
  adaptNarrative: string;
  // NECP
  necpStatus: Status;
  necpCommissionAssessment: string;
  necpEsabccCommentary: string;
  necpGaps: string;
};

function strNum(v: number | undefined): string {
  return v == null || Number.isNaN(v) ? '' : String(v);
}

function fromProfile(p: CountryProfile): Draft {
  return {
    summary: p.hero.summary ?? '',
    highlights: (p.hero.highlights ?? []).join('\n'),
    watchNotes: p.watchNotes ?? '',
    ghgStatus: p.ghg.status ?? 'unknown',
    ghgLatestValue: strNum(p.ghg.totalLatest?.value),
    ghgLatestYear: strNum(p.ghg.totalLatest?.year),
    ghgTotal1990: strNum(p.ghg.total1990),
    ghgTarget2030Value: strNum(p.ghg.target2030?.value),
    ghgTarget2030Baseline: p.ghg.target2030?.baseline ?? '',
    ghgTarget2030Notes: p.ghg.target2030?.notes ?? '',
    ghgTarget2050Value: strNum(p.ghg.target2050?.value),
    ghgTarget2050Year: strNum(p.ghg.target2050?.year),
    ghgTarget2050Notes: p.ghg.target2050?.notes ?? '',
    ghgNarrative: p.ghg.narrative ?? '',
    resStatus: p.renewables.status ?? 'unknown',
    resLatestValue: strNum(p.renewables.shareLatest?.value),
    resLatestYear: strNum(p.renewables.shareLatest?.year),
    resTarget2030: strNum(p.renewables.target2030),
    resNarrative: p.renewables.narrative ?? '',
    effStatus: p.efficiency.status ?? 'unknown',
    effIntensityValue: strNum(p.efficiency.intensity?.value),
    effIntensityYear: strNum(p.efficiency.intensity?.year),
    effTarget2030: strNum(p.efficiency.target2030),
    effNarrative: p.efficiency.narrative ?? '',
    airStatus: p.air.status ?? 'unknown',
    airPm25: strNum(p.air.pm25?.value),
    airPm25Year: strNum(p.air.pm25?.year),
    airNo2: strNum(p.air.no2?.value),
    airNarrative: p.air.narrative ?? '',
    waterStatus: p.water.status ?? 'unknown',
    waterSurfaceGood: strNum(p.water.surfaceWaterGood?.value),
    waterGroundGood: strNum(p.water.groundwaterGood?.value),
    waterNarrative: p.water.narrative ?? '',
    bioStatus: p.biodiversity.status ?? 'unknown',
    bioNatura2000Land: strNum(p.biodiversity.natura2000Land?.value),
    bioNarrative: p.biodiversity.narrative ?? '',
    circStatus: p.circular.status ?? 'unknown',
    circRecycling: strNum(p.circular.municipalRecycling?.value),
    circCmu: strNum(p.circular.circularMaterialUseRate?.value),
    circNarrative: p.circular.narrative ?? '',
    adaptStatus: p.adaptation.status ?? 'unknown',
    adaptStrategyTitle: p.adaptation.strategy?.title ?? '',
    adaptStrategyYear: strNum(p.adaptation.strategy?.adoptedYear),
    adaptRisks: (p.adaptation.keyRisks ?? []).join('\n'),
    adaptNarrative: p.adaptation.narrative ?? '',
    necpStatus: p.necp.status ?? 'unknown',
    necpCommissionAssessment: p.necp.commissionAssessment ?? '',
    necpEsabccCommentary: p.necp.esabccCommentary ?? '',
    necpGaps: (p.necp.gaps ?? []).join('\n'),
  };
}

function num(v: string): number | undefined {
  if (v.trim() === '') return undefined;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function buildPatch(d: Draft, base: CountryProfile): Partial<CountryProfile> {
  const heroPatch: Partial<CountryProfile['hero']> = {};
  if (d.summary !== (base.hero.summary ?? '')) heroPatch.summary = d.summary;
  const highlights = d.highlights.split('\n').map(s => s.trim()).filter(Boolean);
  if (JSON.stringify(highlights) !== JSON.stringify(base.hero.highlights ?? [])) {
    heroPatch.highlights = highlights;
  }

  return {
    hero: Object.keys(heroPatch).length ? { ...base.hero, ...heroPatch } : undefined,
    watchNotes: d.watchNotes !== (base.watchNotes ?? '') ? d.watchNotes : undefined,
    ghg: {
      status: d.ghgStatus,
      totalLatest: num(d.ghgLatestValue) != null
        ? { value: num(d.ghgLatestValue)!, unit: 'Mt CO2e', year: num(d.ghgLatestYear) ?? new Date().getFullYear() - 2, source: base.ghg.totalLatest?.source }
        : base.ghg.totalLatest,
      total1990: num(d.ghgTotal1990),
      target2030: num(d.ghgTarget2030Value) != null
        ? { value: num(d.ghgTarget2030Value)!, unit: '%', baseline: d.ghgTarget2030Baseline || undefined, notes: d.ghgTarget2030Notes || undefined }
        : base.ghg.target2030,
      target2050: num(d.ghgTarget2050Value) != null
        ? { value: num(d.ghgTarget2050Value)!, unit: '%', year: num(d.ghgTarget2050Year), notes: d.ghgTarget2050Notes || undefined }
        : base.ghg.target2050,
      narrative: d.ghgNarrative || undefined,
    },
    renewables: {
      status: d.resStatus,
      shareLatest: num(d.resLatestValue) != null
        ? { value: num(d.resLatestValue)!, unit: '%', year: num(d.resLatestYear) ?? new Date().getFullYear() - 2 }
        : base.renewables.shareLatest,
      target2030: num(d.resTarget2030),
      narrative: d.resNarrative || undefined,
    },
    efficiency: {
      status: d.effStatus,
      intensity: num(d.effIntensityValue) != null
        ? { value: num(d.effIntensityValue)!, unit: 'kgoe/1000 EUR', year: num(d.effIntensityYear) ?? new Date().getFullYear() - 2 }
        : base.efficiency.intensity,
      target2030: num(d.effTarget2030),
      narrative: d.effNarrative || undefined,
    },
    air: {
      status: d.airStatus,
      pm25: num(d.airPm25) != null
        ? { value: num(d.airPm25)!, unit: 'µg/m³', year: num(d.airPm25Year) ?? new Date().getFullYear() - 2 }
        : base.air.pm25,
      no2: num(d.airNo2) != null
        ? { value: num(d.airNo2)!, unit: 'µg/m³', year: num(d.airPm25Year) ?? new Date().getFullYear() - 2 }
        : base.air.no2,
      narrative: d.airNarrative || undefined,
    },
    water: {
      status: d.waterStatus,
      surfaceWaterGood: num(d.waterSurfaceGood) != null
        ? { value: num(d.waterSurfaceGood)!, unit: '%', year: base.water.surfaceWaterGood?.year ?? 2021 }
        : base.water.surfaceWaterGood,
      groundwaterGood: num(d.waterGroundGood) != null
        ? { value: num(d.waterGroundGood)!, unit: '%', year: base.water.groundwaterGood?.year ?? 2021 }
        : base.water.groundwaterGood,
      narrative: d.waterNarrative || undefined,
    },
    biodiversity: {
      status: d.bioStatus,
      natura2000Land: num(d.bioNatura2000Land) != null
        ? { value: num(d.bioNatura2000Land)!, unit: '%', year: base.biodiversity.natura2000Land?.year ?? 2022 }
        : base.biodiversity.natura2000Land,
      narrative: d.bioNarrative || undefined,
    },
    circular: {
      status: d.circStatus,
      municipalRecycling: num(d.circRecycling) != null
        ? { value: num(d.circRecycling)!, unit: '%', year: base.circular.municipalRecycling?.year ?? 2022 }
        : base.circular.municipalRecycling,
      circularMaterialUseRate: num(d.circCmu) != null
        ? { value: num(d.circCmu)!, unit: '%', year: base.circular.circularMaterialUseRate?.year ?? 2022 }
        : base.circular.circularMaterialUseRate,
      narrative: d.circNarrative || undefined,
    },
    adaptation: {
      status: d.adaptStatus,
      strategy: (d.adaptStrategyTitle || d.adaptStrategyYear)
        ? { title: d.adaptStrategyTitle || undefined, adoptedYear: num(d.adaptStrategyYear) }
        : base.adaptation.strategy,
      keyRisks: d.adaptRisks.split('\n').map(s => s.trim()).filter(Boolean),
      narrative: d.adaptNarrative || undefined,
    },
    necp: {
      status: d.necpStatus,
      commissionAssessment: d.necpCommissionAssessment || undefined,
      esabccCommentary: d.necpEsabccCommentary || undefined,
      gaps: d.necpGaps.split('\n').map(s => s.trim()).filter(Boolean),
    },
  };
}

const SECTION_GROUPS: { id: string; label: string; key: keyof CountryProfile }[] = [
  { id: 'hero',         label: 'Summary / hero',  key: 'hero' },
  { id: 'ghg',          label: 'GHG emissions',   key: 'ghg' },
  { id: 'renewables',   label: 'Renewables',      key: 'renewables' },
  { id: 'efficiency',   label: 'Energy efficiency', key: 'efficiency' },
  { id: 'air',          label: 'Air quality',     key: 'air' },
  { id: 'water',        label: 'Water',           key: 'water' },
  { id: 'biodiversity', label: 'Biodiversity',    key: 'biodiversity' },
  { id: 'circular',     label: 'Circular economy', key: 'circular' },
  { id: 'adaptation',   label: 'Adaptation',      key: 'adaptation' },
  { id: 'necp',         label: 'NECP delivery',   key: 'necp' },
];

export default function CountryProfileEditor({
  profile, allowedSections, contributorName: initialName,
  onSubmit, submitLabel = 'Save', showContributorFields = false,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() => fromProfile(profile));
  const [contributorName, setContributorName] = useState(initialName ?? '');
  const [contributorEmail, setContributorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function isAllowed(key: string): boolean {
    if (!allowedSections || allowedSections.length === 0) return true;
    return allowedSections.includes(key);
  }

  function f<K extends keyof Draft>(k: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setDraft(d => ({ ...d, [k]: e.target.value as Draft[K] }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (showContributorFields && !contributorName.trim()) {
      setErr('Please enter your name.');
      return;
    }
    setBusy(true);
    try {
      const patch = buildPatch(draft, profile);
      // Drop sections that aren't in the allowed-sections list.
      if (allowedSections && allowedSections.length > 0) {
        for (const k of Object.keys(patch) as (keyof CountryProfile)[]) {
          if (!allowedSections.includes(k)) delete patch[k];
        }
      }
      await onSubmit({
        patch,
        contributorName: contributorName || 'Signed-in user',
        contributorEmail: contributorEmail || undefined,
        message: message || undefined,
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  }

  const SectionWrap = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    if (!isAllowed(id)) return null;
    return (
      <section className="border border-grey-200 rounded-lg p-4 space-y-3 bg-white">
        <h3 className="text-sm font-bold text-tertiary-dark">{label}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
      </section>
    );
  };

  const Field = (props: {
    label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string; placeholder?: string; full?: boolean;
  }) => (
    <label className={`text-[11px] text-tertiary block ${props.full ? 'md:col-span-2' : ''}`}>
      <span className="block mb-0.5 font-medium text-tertiary-dark">{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
      />
    </label>
  );

  const Area = (props: {
    label: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string; rows?: number; full?: boolean;
  }) => (
    <label className={`text-[11px] text-tertiary block ${props.full ? 'md:col-span-2' : ''}`}>
      <span className="block mb-0.5 font-medium text-tertiary-dark">{props.label}</span>
      <textarea
        value={props.value}
        onChange={props.onChange}
        rows={props.rows ?? 3}
        placeholder={props.placeholder}
        className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm font-mono"
      />
    </label>
  );

  const StatusField = ({ label, value, onChange }: { label: string; value: Status; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <label className="text-[11px] text-tertiary block">
      <span className="block mb-0.5 font-medium text-tertiary-dark">{label}</span>
      <select value={value} onChange={onChange} className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm">
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
    </label>
  );

  return (
    <form className="space-y-4" onSubmit={submit}>
      {allowedSections && allowedSections.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-[12px] text-amber-900">
          This share link is restricted to the following sections:{' '}
          <strong>{SECTION_GROUPS.filter(s => allowedSections!.includes(s.key as string)).map(s => s.label).join(', ')}</strong>.
        </div>
      )}

      <SectionWrap id="hero" label="Summary / hero">
        <Area full label="Executive summary" value={draft.summary} onChange={f('summary')} rows={5} />
        <Area full label="Highlights (one per line)" value={draft.highlights} onChange={f('highlights')} rows={4} />
        <Area full label="What to watch" value={draft.watchNotes} onChange={f('watchNotes')} rows={3} />
      </SectionWrap>

      <SectionWrap id="ghg" label="GHG emissions">
        <StatusField label="Status" value={draft.ghgStatus} onChange={f('ghgStatus')} />
        <Field label="Total (latest) Mt CO2e" value={draft.ghgLatestValue} onChange={f('ghgLatestValue')} type="number" />
        <Field label="Latest year" value={draft.ghgLatestYear} onChange={f('ghgLatestYear')} type="number" />
        <Field label="1990 baseline Mt CO2e" value={draft.ghgTotal1990} onChange={f('ghgTotal1990')} type="number" />
        <Field label="2030 target value (signed %)" value={draft.ghgTarget2030Value} onChange={f('ghgTarget2030Value')} type="number" placeholder="-55" />
        <Field label="2030 target baseline" value={draft.ghgTarget2030Baseline} onChange={f('ghgTarget2030Baseline')} placeholder="1990" />
        <Field full label="2030 target notes" value={draft.ghgTarget2030Notes} onChange={f('ghgTarget2030Notes')} />
        <Field label="Long-term target value (signed %)" value={draft.ghgTarget2050Value} onChange={f('ghgTarget2050Value')} type="number" />
        <Field label="Long-term target year" value={draft.ghgTarget2050Year} onChange={f('ghgTarget2050Year')} type="number" placeholder="2050" />
        <Field full label="Long-term target notes" value={draft.ghgTarget2050Notes} onChange={f('ghgTarget2050Notes')} />
        <Area full label="Narrative" value={draft.ghgNarrative} onChange={f('ghgNarrative')} rows={4} />
      </SectionWrap>

      <SectionWrap id="renewables" label="Renewable energy">
        <StatusField label="Status" value={draft.resStatus} onChange={f('resStatus')} />
        <Field label="Latest share %" value={draft.resLatestValue} onChange={f('resLatestValue')} type="number" />
        <Field label="Year" value={draft.resLatestYear} onChange={f('resLatestYear')} type="number" />
        <Field label="2030 target %" value={draft.resTarget2030} onChange={f('resTarget2030')} type="number" />
        <Area full label="Narrative" value={draft.resNarrative} onChange={f('resNarrative')} rows={4} />
      </SectionWrap>

      <SectionWrap id="efficiency" label="Energy efficiency">
        <StatusField label="Status" value={draft.effStatus} onChange={f('effStatus')} />
        <Field label="Energy intensity (kgoe/1000 EUR)" value={draft.effIntensityValue} onChange={f('effIntensityValue')} type="number" />
        <Field label="Year" value={draft.effIntensityYear} onChange={f('effIntensityYear')} type="number" />
        <Field label="2030 saving target %" value={draft.effTarget2030} onChange={f('effTarget2030')} type="number" />
        <Area full label="Narrative" value={draft.effNarrative} onChange={f('effNarrative')} rows={4} />
      </SectionWrap>

      <SectionWrap id="air" label="Air quality">
        <StatusField label="Status" value={draft.airStatus} onChange={f('airStatus')} />
        <Field label="PM2.5 µg/m³" value={draft.airPm25} onChange={f('airPm25')} type="number" />
        <Field label="Year" value={draft.airPm25Year} onChange={f('airPm25Year')} type="number" />
        <Field label="NO₂ µg/m³" value={draft.airNo2} onChange={f('airNo2')} type="number" />
        <Area full label="Narrative" value={draft.airNarrative} onChange={f('airNarrative')} rows={3} />
      </SectionWrap>

      <SectionWrap id="water" label="Water">
        <StatusField label="Status" value={draft.waterStatus} onChange={f('waterStatus')} />
        <Field label="Surface water good %" value={draft.waterSurfaceGood} onChange={f('waterSurfaceGood')} type="number" />
        <Field label="Groundwater good %" value={draft.waterGroundGood} onChange={f('waterGroundGood')} type="number" />
        <Area full label="Narrative" value={draft.waterNarrative} onChange={f('waterNarrative')} rows={3} />
      </SectionWrap>

      <SectionWrap id="biodiversity" label="Biodiversity">
        <StatusField label="Status" value={draft.bioStatus} onChange={f('bioStatus')} />
        <Field label="Natura 2000 land %" value={draft.bioNatura2000Land} onChange={f('bioNatura2000Land')} type="number" />
        <Area full label="Narrative" value={draft.bioNarrative} onChange={f('bioNarrative')} rows={3} />
      </SectionWrap>

      <SectionWrap id="circular" label="Circular economy">
        <StatusField label="Status" value={draft.circStatus} onChange={f('circStatus')} />
        <Field label="Municipal recycling %" value={draft.circRecycling} onChange={f('circRecycling')} type="number" />
        <Field label="Circular material use rate %" value={draft.circCmu} onChange={f('circCmu')} type="number" />
        <Area full label="Narrative" value={draft.circNarrative} onChange={f('circNarrative')} rows={3} />
      </SectionWrap>

      <SectionWrap id="adaptation" label="Climate adaptation">
        <StatusField label="Status" value={draft.adaptStatus} onChange={f('adaptStatus')} />
        <Field label="Strategy title" value={draft.adaptStrategyTitle} onChange={f('adaptStrategyTitle')} />
        <Field label="Adopted year" value={draft.adaptStrategyYear} onChange={f('adaptStrategyYear')} type="number" />
        <Area full label="Key risks (one per line)" value={draft.adaptRisks} onChange={f('adaptRisks')} rows={3} />
        <Area full label="Narrative" value={draft.adaptNarrative} onChange={f('adaptNarrative')} rows={3} />
      </SectionWrap>

      <SectionWrap id="necp" label="NECP delivery">
        <StatusField label="Status" value={draft.necpStatus} onChange={f('necpStatus')} />
        <Area full label="Commission assessment" value={draft.necpCommissionAssessment} onChange={f('necpCommissionAssessment')} rows={3} />
        <Area full label="ESABCC commentary" value={draft.necpEsabccCommentary} onChange={f('necpEsabccCommentary')} rows={3} />
        <Area full label="Identified gaps (one per line)" value={draft.necpGaps} onChange={f('necpGaps')} rows={3} />
      </SectionWrap>

      {showContributorFields && (
        <section className="border border-grey-200 rounded-lg p-4 bg-grey-50 space-y-3">
          <h3 className="text-sm font-bold text-tertiary-dark">Your details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-[11px] text-tertiary block">
              <span className="block mb-0.5 font-medium text-tertiary-dark">Name *</span>
              <input
                value={contributorName}
                onChange={e => setContributorName(e.target.value)}
                className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
              />
            </label>
            <label className="text-[11px] text-tertiary block">
              <span className="block mb-0.5 font-medium text-tertiary-dark">Email</span>
              <input
                value={contributorEmail}
                onChange={e => setContributorEmail(e.target.value)}
                className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
              />
            </label>
            <label className="text-[11px] text-tertiary block md:col-span-2">
              <span className="block mb-0.5 font-medium text-tertiary-dark">Note to reviewer</span>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
              />
            </label>
          </div>
        </section>
      )}

      {err && <div className="text-red-700 text-[12px]">{err}</div>}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-50"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
