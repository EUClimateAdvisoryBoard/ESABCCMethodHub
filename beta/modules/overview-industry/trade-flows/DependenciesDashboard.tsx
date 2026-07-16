'use client';

/**
 * Overview Industry — Trade flows — the critical-dependencies dashboard.
 * ----------------------------------------------------------------------
 * One surface that pulls every curated critical trade dependency of EU
 * manufacturing into one place, as objective facts:
 *
 *   • headline counts computed from the curated datasets (no thresholds,
 *     no ratings — plain arithmetic over the sourced figures);
 *   • the import-dependency map (reliance × supplier concentration);
 *   • the critical & strategic raw-materials register (CRMA legal
 *     designations, EC/JRC reliance and supplier shares) — sortable;
 *   • the import-dependent MANUFACTURED-product register (solar panels,
 *     batteries, chips, medicines, apparel…) spanning Section C — sortable;
 *   • the strategic product families of SWD(2021) 352;
 *   • live Eurostat energy & feedstock import dependency;
 *   • the same dependencies aggregated by supplier country and by NACE
 *     division (each division links into its deep-dive profile).
 *
 * Every figure carries its source link; designations (Strategic/Critical)
 * are the legal CRMA annex classifications, not editorial ratings.
 */

import { useMemo, useState } from 'react';
import {
  CRITICAL_MATERIALS,
  STRATEGIC_DEPENDENCIES,
  PRODUCT_DEPENDENCIES,
  ENERGY_FEEDSTOCK_DEPENDENCY,
  RISK_HOTSPOTS,
  SECTOR_IO_INPUTS,
  DIVISION_TRADE,
  REFERENCE_YEAR,
  inputMixFor,
  fvaFor,
  type Source,
} from './trade-data';
import DependencyMap from './DependencyMap';

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
const isChina = (s: string) => /china/i.test(s);

/** Does a free-text NACE reference ('C27/C29', '… (C20, C23)') mention this division? */
const mentionsDivision = (text: string, code: string) => new RegExp(`\\b${code}\\b`).test(text);

function SourceLink({ src }: { src: Source }) {
  return (
    <a
      href={src.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
      title={`${src.org} — ${src.title}${src.year ? ` (${src.year})` : ''}`}
    >
      {src.org}
      {src.year ? ` ${src.year}` : ''} ↗
    </a>
  );
}

/** Division codes referenced in a free-text field, as clickable chips. */
function DivisionChips({ text, onOpen }: { text: string; onOpen: (code: string) => void }) {
  const codes = Array.from(new Set(text.match(/C\d{2}/g) ?? []));
  if (codes.length === 0) return <span className="text-grey-500 dark:text-[var(--mh-muted)]">{text}</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {codes.map((c) => (
        <button
          key={c}
          onClick={() => onOpen(c)}
          className="rounded border border-grey-200 dark:border-[var(--mh-border)] px-1 py-px text-[10px] font-semibold text-primary transition hover:border-primary"
          title={`Open the ${c} division deep-dive`}
        >
          {c}
        </button>
      ))}
    </span>
  );
}

type MaterialSort = 'reliance' | 'share' | 'name';
type ProductSort = 'share' | 'division' | 'name';
type DivisionSort = 'inputShare' | 'imports' | 'entries' | 'code';

export default function DependenciesDashboard({
  onOpenDivision,
}: {
  onOpenDivision: (code: string) => void;
}) {
  const [materialSort, setMaterialSort] = useState<MaterialSort>('share');
  const [productSort, setProductSort] = useState<ProductSort>('share');
  const [divisionSort, setDivisionSort] = useState<DivisionSort>('inputShare');

  const totalEnergy = ENERGY_FEEDSTOCK_DEPENDENCY[0];

  // Plain counts over the curated datasets — arithmetic, not assessment.
  const kpis = useMemo(() => {
    const materialsAndProducts = CRITICAL_MATERIALS.length + PRODUCT_DEPENDENCIES.length;
    const chinaMaterials = CRITICAL_MATERIALS.filter((m) => isChina(m.topSupplier)).length;
    const chinaProducts = PRODUCT_DEPENDENCIES.filter((p) => isChina(p.topSupplier)).length;
    const chinaTop = chinaMaterials + chinaProducts;
    return [
      {
        value: `${materialsAndProducts}`,
        label: 'curated import dependencies tracked',
        detail: `${CRITICAL_MATERIALS.length} critical raw materials and ${PRODUCT_DEPENDENCIES.length} manufactured-product families across Section C — reliance × supplier concentration, every figure sourced.`,
      },
      {
        value: `${PRODUCT_DEPENDENCIES.length}`,
        label: 'manufactured-product dependencies',
        detail: 'Finished / intermediate products (solar panels, batteries, chips, APIs, apparel…) the EU imports at scale — the "not just raw materials" layer.',
      },
      {
        value: `${chinaTop} of ${materialsAndProducts}`,
        label: 'dependencies with China as largest supplier',
        detail: 'Register rows (materials + products) whose largest single supplier is China, as reported by the source.',
      },
      {
        value: totalEnergy.dependencyPct != null ? `${totalEnergy.dependencyPct}%` : '—',
        label: `EU energy import dependency (${totalEnergy.year})`,
        detail: 'Net imports / gross available energy, live Eurostat nrg_ind_id.',
      },
    ];
  }, [totalEnergy]);

  const materials = useMemo(() => {
    const rows = [...CRITICAL_MATERIALS];
    if (materialSort === 'reliance') {
      rows.sort((a, b) => (b.euImportReliance ?? -1) - (a.euImportReliance ?? -1));
    } else if (materialSort === 'share') {
      rows.sort((a, b) => (b.supplierShare ?? -1) - (a.supplierShare ?? -1));
    } else {
      rows.sort((a, b) => a.material.localeCompare(b.material));
    }
    return rows;
  }, [materialSort]);

  const products = useMemo(() => {
    const rows = [...PRODUCT_DEPENDENCIES];
    if (productSort === 'share') {
      rows.sort((a, b) => (b.supplierShare ?? -1) - (a.supplierShare ?? -1));
    } else if (productSort === 'division') {
      rows.sort((a, b) => a.naceDivision.localeCompare(b.naceDivision, undefined, { numeric: true }));
    } else {
      rows.sort((a, b) => a.product.localeCompare(b.product));
    }
    return rows;
  }, [productSort]);

  // Aggregate the mapped dependencies (materials + products) by their largest supplier country.
  const bySupplier = useMemo(() => {
    const norm = (s: string) => s.split(/[/(]/)[0].trim();
    const acc = new Map<string, string[]>();
    RISK_HOTSPOTS.forEach((h) => {
      const key = norm(h.supplier);
      acc.set(key, [...(acc.get(key) ?? []), h.label]);
    });
    PRODUCT_DEPENDENCIES.forEach((p) => {
      const key = norm(p.topSupplier);
      acc.set(key, [...(acc.get(key) ?? []), p.product]);
    });
    return Array.from(acc.entries())
      .map(([country, items]) => ({ country, items }))
      .sort((a, b) => b.items.length - a.items.length || a.country.localeCompare(b.country));
  }, []);

  // Per-division exposure: statistical shares + how many curated entries touch it.
  const divisions = useMemo(() => {
    const rows = DIVISION_TRADE.map((d) => {
      const mix = inputMixFor(d.code);
      const fva = fvaFor(d.code);
      const entries =
        CRITICAL_MATERIALS.filter((m) => mentionsDivision(m.usedIn, d.code)).length +
        PRODUCT_DEPENDENCIES.filter((p) => mentionsDivision(p.naceDivision, d.code)).length +
        RISK_HOTSPOTS.filter((h) => mentionsDivision(h.naceDivision, d.code)).length +
        ENERGY_FEEDSTOCK_DEPENDENCY.filter((e) => mentionsDivision(e.naceRelevance, d.code)).length +
        (SECTOR_IO_INPUTS.find((s) => s.code === d.code)?.inputs.length ?? 0);
      return {
        code: d.code,
        label: d.label,
        impExt: d.flows[REFERENCE_YEAR].impExt,
        inputShare: mix?.importedShare ?? null,
        fvaPct: fva?.fvaPct ?? null,
        entries,
      };
    });
    rows.sort((a, b) => {
      if (divisionSort === 'inputShare') return (b.inputShare ?? -1) - (a.inputShare ?? -1);
      if (divisionSort === 'imports') return b.impExt - a.impExt;
      if (divisionSort === 'entries') return b.entries - a.entries;
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });
    return rows;
  }, [divisionSort]);

  const maxSupplierCount = bySupplier[0]?.items.length ?? 1;

  const sortButton = <T extends string>(
    current: T,
    set: (v: T) => void,
    id: T,
    label: string,
  ) => (
    <button
      key={id}
      onClick={() => set(id)}
      className={`rounded border px-2 py-0.5 text-[11px] font-semibold transition ${
        current === id
          ? 'border-primary bg-surface-blue dark:bg-primary/15 text-primary'
          : 'border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] text-grey-600 dark:text-[var(--mh-muted)] hover:border-grey-400 dark:hover:border-[var(--mh-muted)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* headline counts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-3">
            <div className="text-2xl font-bold text-grey-900 dark:text-[var(--mh-fg)]">{k.value}</div>
            <div className="mt-0.5 text-xs font-semibold text-grey-700 dark:text-[var(--mh-muted)]">{k.label}</div>
            <div className="mt-1 text-[11px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">{k.detail}</div>
          </div>
        ))}
      </div>

      {/* the dependency map */}
      <DependencyMap />

      {/* critical & strategic raw materials register */}
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">
            Critical &amp; strategic raw materials — the register
          </h4>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">Sort:</span>
            {sortButton(materialSort, setMaterialSort, 'share', 'supplier share')}
            {sortButton(materialSort, setMaterialSort, 'reliance', 'import reliance')}
            {sortButton(materialSort, setMaterialSort, 'name', 'material')}
          </div>
        </div>
        <p className="mb-2 mt-1 text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">
          Materials the EU manufactures with but barely produces. Designation = the legal CRMA annex
          the material sits in (Reg. (EU) 2024/1252): Strategic (Annex I) or Critical (Annex II).
          Reliance and supplier shares as reported by the EC/JRC; click a division code to open its
          deep-dive.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-grey-100 dark:bg-[var(--mh-bg)] text-left text-[10.5px] uppercase tracking-wide text-grey-600 dark:text-[var(--mh-muted)]">
                <th className="px-2 py-1.5 font-semibold">Material</th>
                <th className="px-2 py-1.5 font-semibold">CRMA designation</th>
                <th className="px-2 py-1.5 text-right font-semibold">EU import reliance</th>
                <th className="px-2 py-1.5 font-semibold">Largest supplier</th>
                <th className="px-2 py-1.5 font-semibold">Supplier share of EU supply</th>
                <th className="px-2 py-1.5 font-semibold">Used in</th>
                <th className="px-2 py-1.5 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => {
                const share = m.supplierShare ?? 0;
                return (
                  <tr key={m.material} className="border-t border-grey-100 dark:border-[var(--mh-border)] align-top">
                    <td className="px-2 py-1.5 font-semibold text-grey-800 dark:text-[var(--mh-fg)]" title={m.note}>
                      {m.material}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
                          m.strategic
                            ? 'bg-surface-orange text-[#7A4400] dark:bg-[#3A2415] dark:text-[#FFB366]'
                            : 'bg-grey-100 dark:bg-[var(--mh-bg)] text-grey-600 dark:text-[var(--mh-muted)]'
                        }`}
                      >
                        {m.strategic ? 'Strategic · Annex I' : 'Critical · Annex II'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-grey-800 dark:text-[var(--mh-fg)]">
                      {m.euImportReliance != null ? `${m.euImportReliance}%` : 'n/a'}
                    </td>
                    <td className="px-2 py-1.5 text-grey-700 dark:text-[var(--mh-muted)]">{m.topSupplier}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-28 shrink-0 overflow-hidden rounded-sm bg-grey-100 dark:bg-[var(--mh-bg)]">
                          <div
                            className="h-full"
                            style={{
                              width: `${share}%`,
                              background: isChina(m.topSupplier) ? '#B83230' : '#004B7F',
                            }}
                          />
                        </div>
                        <span className="tabular-nums text-grey-600 dark:text-[var(--mh-muted)]">
                          {m.supplierShare != null ? `${m.supplierShare}%` : 'n/a'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="text-grey-600 dark:text-[var(--mh-muted)]">{m.usedIn.replace(/\s*\(C[^)]*\)/g, '')}</span>{' '}
                      <DivisionChips text={m.usedIn} onOpen={onOpenDivision} />
                    </td>
                    <td className="px-2 py-1.5 text-[10px]">
                      <SourceLink src={m.src} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* import-dependent manufactured products register */}
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">
            Import-dependent manufactured products — the register
          </h4>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">Sort:</span>
            {sortButton(productSort, setProductSort, 'share', 'supplier share')}
            {sortButton(productSort, setProductSort, 'division', 'division')}
            {sortButton(productSort, setProductSort, 'name', 'product')}
          </div>
        </div>
        <p className="mb-2 mt-1 text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">
          The other side of the dependency story: finished and intermediate <em>products</em> the EU imports
          at scale — solar panels, batteries, chips, medicines, apparel — not just the raw materials above.
          Supplier share is the largest supplier&apos;s share of extra-EU imports unless the source states
          otherwise (hover the share for the basis); reliance is left blank where no clean demand-based
          figure is published. Click a division code to open its deep-dive.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-grey-100 dark:bg-[var(--mh-bg)] text-left text-[10.5px] uppercase tracking-wide text-grey-600 dark:text-[var(--mh-muted)]">
                <th className="px-2 py-1.5 font-semibold">Product</th>
                <th className="px-2 py-1.5 font-semibold">Category</th>
                <th className="px-2 py-1.5 font-semibold">NACE division(s)</th>
                <th className="px-2 py-1.5 text-right font-semibold">EU import reliance</th>
                <th className="px-2 py-1.5 font-semibold">Largest supplier</th>
                <th className="px-2 py-1.5 font-semibold">Supplier share</th>
                <th className="px-2 py-1.5 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const share = p.supplierShare ?? 0;
                return (
                  <tr key={p.product} className="border-t border-grey-100 dark:border-[var(--mh-border)] align-top">
                    <td className="px-2 py-1.5 font-semibold text-grey-800 dark:text-[var(--mh-fg)]" title={p.note}>
                      {p.product}
                    </td>
                    <td className="px-2 py-1.5 text-grey-600 dark:text-[var(--mh-muted)]">{p.category}</td>
                    <td className="px-2 py-1.5">
                      <DivisionChips text={p.naceDivision} onOpen={onOpenDivision} />
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-grey-800 dark:text-[var(--mh-fg)]">
                      {p.euImportReliance != null ? `${p.euImportReliance}%` : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-grey-700 dark:text-[var(--mh-muted)]">{p.topSupplier}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5" title={`${p.supplierShare != null ? `${p.supplierShare}% ` : ''}${p.shareBasis}`}>
                        <div className="h-3 w-28 shrink-0 overflow-hidden rounded-sm bg-grey-100 dark:bg-[var(--mh-bg)]">
                          <div
                            className="h-full"
                            style={{
                              width: `${share}%`,
                              background: isChina(p.topSupplier) ? '#B83230' : '#004B7F',
                            }}
                          />
                        </div>
                        <span className="tabular-nums text-grey-600 dark:text-[var(--mh-muted)]">
                          {p.supplierShare != null ? `${p.supplierShare}%` : 'n/a'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-[10px]">
                      <SourceLink src={p.src} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-grey-400 dark:text-[var(--mh-muted)]">
          Product supplier shares are customs-based (share of extra-EU imports), a different concept from the
          EC/JRC &quot;share of EU supply&quot; used for raw materials — the exact basis is on each share.
          Where a product also sits on the import-dependency map above (solar, batteries, laptops, chips,
          APIs), its map position uses a demand-based reliance estimate documented in the source.
        </p>
      </div>

      {/* strategic product families + energy */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
          <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">
            Strategic product families — SWD(2021) 352
          </h4>
          <p className="mb-2 mt-1 text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">
            Product-level dependencies from the Commission&apos;s strategic-dependency review (137
            import-dependent products in sensitive ecosystems). The note column quotes the finding
            as reported by the source.
          </p>
          <ul className="space-y-2">
            {STRATEGIC_DEPENDENCIES.map((s) => (
              <li key={s.family} className="rounded bg-grey-50 dark:bg-[var(--mh-bg)] p-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[12px] font-semibold text-grey-800 dark:text-[var(--mh-fg)]">{s.family}</span>
                  <span className="text-[10px] uppercase tracking-wide text-grey-500 dark:text-[var(--mh-muted)]">
                    {s.ecosystem}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-grey-600 dark:text-[var(--mh-muted)]">
                  <DivisionChips text={s.naceDivision} onOpen={onOpenDivision} />
                  <span>
                    import reliance{' '}
                    <span className="font-semibold tabular-nums">
                      {s.euImportReliance != null ? `${s.euImportReliance}%` : 'n/a'}
                    </span>
                  </span>
                  <span>
                    largest supplier <span className="font-semibold">{s.topSupplier}</span>
                    {s.supplierShare != null && (
                      <span className="tabular-nums"> ({s.supplierShare}%)</span>
                    )}
                  </span>
                </div>
                <div className="mt-1 text-[10.5px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">
                  {s.vulnerability} · <SourceLink src={s.src} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
            <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">Energy &amp; feedstock dependency</h4>
            <p className="mt-1 text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">
              Live Eurostat <code className="rounded bg-grey-100 dark:bg-[var(--mh-bg)] px-1 text-[10px]">nrg_ind_id</code>{' '}
              (net imports / gross available energy), plus the Commission&apos;s Russia-share figure.
            </p>
            <ul className="mt-2.5 space-y-2.5">
              {ENERGY_FEEDSTOCK_DEPENDENCY.map((e) => (
                <li key={e.item}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-semibold text-grey-800 dark:text-[var(--mh-fg)]">
                      {e.item} <span className="font-normal text-grey-400 dark:text-[var(--mh-muted)]">({e.year})</span>
                    </span>
                    {e.dependencyPct != null && (
                      <span className="text-sm font-bold tabular-nums text-grey-800 dark:text-[var(--mh-fg)]">
                        {e.dependencyPct}%
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">
                    {e.note} · relevant to {e.naceRelevance} · <SourceLink src={e.src} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
            <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">Dependencies by supplier country</h4>
            <p className="mt-1 text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">
              The mapped dependencies grouped by their largest single supplier — a count of register
              entries, not a weighting.
            </p>
            <div className="mt-2.5 space-y-1.5">
              {bySupplier.map((s) => (
                <div key={s.country}>
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-[11px] font-semibold text-grey-800 dark:text-[var(--mh-fg)]">
                      {s.country}
                    </span>
                    <div className="h-3.5 flex-1 overflow-hidden rounded-sm bg-grey-100 dark:bg-[var(--mh-bg)]">
                      <div
                        className="h-full"
                        style={{
                          width: `${(s.items.length / maxSupplierCount) * 100}%`,
                          background: isChina(s.country) ? '#B83230' : '#004B7F',
                        }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-grey-700 dark:text-[var(--mh-muted)]">
                      {s.items.length}
                    </span>
                  </div>
                  <div className="ml-[104px] text-[10px] leading-snug text-grey-500 dark:text-[var(--mh-muted)]">
                    {s.items.join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* per-division exposure */}
      <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-grey-900 dark:text-[var(--mh-fg)]">Exposure by NACE division</h4>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">Sort:</span>
            {sortButton(divisionSort, setDivisionSort, 'inputShare', 'inputs imported')}
            {sortButton(divisionSort, setDivisionSort, 'imports', 'extra-EU imports')}
            {sortButton(divisionSort, setDivisionSort, 'entries', 'curated entries')}
            {sortButton(divisionSort, setDivisionSort, 'code', 'code')}
          </div>
        </div>
        <p className="mb-2 mt-1 text-[11px] text-grey-500 dark:text-[var(--mh-muted)]">
          All 24 Section C divisions: the statistical import shares next to the number of curated
          dependency entries (raw materials, manufactured products, named inputs, mapped dependencies,
          energy rows) that touch the division. Click a row to open the division deep-dive.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-grey-100 dark:bg-[var(--mh-bg)] text-left text-[10.5px] uppercase tracking-wide text-grey-600 dark:text-[var(--mh-muted)]">
                <th className="px-2 py-1.5 font-semibold">Division</th>
                <th className="px-2 py-1.5 text-right font-semibold">
                  Extra-EU imports {REFERENCE_YEAR} (€ bn)
                </th>
                <th className="px-2 py-1.5 text-right font-semibold">
                  Intermediate inputs imported (IO)
                </th>
                <th className="px-2 py-1.5 text-right font-semibold">Foreign value added in exports</th>
                <th className="px-2 py-1.5 text-right font-semibold">Curated dependency entries</th>
              </tr>
            </thead>
            <tbody>
              {divisions.map((d) => (
                <tr
                  key={d.code}
                  onClick={() => onOpenDivision(d.code)}
                  className="cursor-pointer border-t border-grey-100 dark:border-[var(--mh-border)] transition hover:bg-surface-blue dark:hover:bg-primary/15"
                  title={`Open the ${d.code} deep-dive`}
                >
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-[10.5px] font-bold text-primary">{d.code}</span>{' '}
                    <span className="text-grey-800 dark:text-[var(--mh-fg)]">{d.label}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-grey-700 dark:text-[var(--mh-muted)]">
                    {fmt(d.impExt)}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <div className="h-3 w-24 overflow-hidden rounded-sm bg-grey-100 dark:bg-[var(--mh-bg)]">
                        <div
                          className="h-full bg-primary/70"
                          style={{ width: `${d.inputShare ?? 0}%` }}
                        />
                      </div>
                      <span className="w-10 text-right tabular-nums text-grey-700 dark:text-[var(--mh-muted)]">
                        {d.inputShare != null ? `${d.inputShare.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-grey-700 dark:text-[var(--mh-muted)]">
                    {d.fvaPct != null ? `${d.fvaPct}%` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-grey-800 dark:text-[var(--mh-fg)]">
                    {d.entries}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-grey-400 dark:text-[var(--mh-muted)]">
          Extra-EU imports: Eurostat ext_tec01 (enterprise-based). Inputs imported: EU-27 use table
          at basic prices, {REFERENCE_YEAR} (product-based — the two attribution concepts differ by
          design, see Methodology). Foreign value added: FIGARO {REFERENCE_YEAR}. Curated entries
          are a coverage count of this page&apos;s curated layers, not a measure of severity.
        </p>
      </div>
    </div>
  );
}
