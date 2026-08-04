'use client';
/**
 * M·36 — Policy Targets Register · summary statistics (beta).
 * -----------------------------------------------------------
 * The register in numbers, after the July-2026 correction passes: how many
 * targets survive, how they spread across the eight sectors/systems, how the
 * mitigation/adaptation split falls inside each of them, and which acts carry
 * each system.
 *
 * Everything on this page is computed from `policyTargets` at render time, so
 * it cannot drift from the dataset the register and the Excel export ship.
 *
 * Charts are plain HTML/CSS marks (no chart library): a magnitude chart in one
 * hue, a composition chart in the register's own climate colours, and a
 * single-hue heatmap. Palettes were validated for colour-vision deficiency and
 * contrast in both light and dark mode; the climate trio passes every check in
 * both, and "Not climate-specific" is deliberately the neutral grey — an
 * absence, not a fifth category. Every figure is followed (or accompanied) by
 * the numbers in text, so nothing is carried by colour alone.
 */
import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import {
  policyTargets,
  SECTOR_META,
  CLIMATE_META,
  type PolicyTarget,
  type SectorKey,
  type ClimateRelevance,
} from '@/data/policy-targets';

const CLIMATE_ORDER: ClimateRelevance[] = ['mitigation', 'adaptation', 'both', 'none'];

/** Chart palette. Light steps are the register's own climate colours; dark
 *  steps are the same hues re-stepped for the dark surface (not an automatic
 *  flip). Both sets were run through the palette validator. */
const VIZ_CSS = `
.pt-viz {
  --viz-magnitude: #00928F;
  --viz-mitigation: #0d9488;
  --viz-adaptation: #c2410c;
  --viz-both: #4f46e5;
  --viz-none: #64748b;
  --viz-track: #EEF1F3;
}
html.dark .pt-viz {
  --viz-magnitude: #17a398;
  --viz-mitigation: #0fa093;
  --viz-adaptation: #d95926;
  --viz-both: #7b73e8;
  --viz-none: #7a8699;
  --viz-track: #1F2B38;
}
`;

const CLIMATE_VAR: Record<ClimateRelevance, string> = {
  mitigation: 'var(--viz-mitigation)',
  adaptation: 'var(--viz-adaptation)',
  both: 'var(--viz-both)',
  none: 'var(--viz-none)',
};

interface SectorRow {
  key: SectorKey | 'none';
  label: string;
  lens: string;
  targets: number;
  policies: number;
  mandatory: number;
  quantitative: number;
  timebound: number;
  climate: Record<ClimateRelevance, number>;
  shared: number;
  topPolicies: { name: string; n: number }[];
}

function summarise(rows: PolicyTarget[], match: (t: PolicyTarget) => boolean): Omit<SectorRow, 'key' | 'label' | 'lens'> {
  const rs = rows.filter(match);
  const byPolicy = new Map<string, number>();
  for (const t of rs) byPolicy.set(t.policy_short, (byPolicy.get(t.policy_short) ?? 0) + 1);
  return {
    targets: rs.length,
    policies: byPolicy.size,
    mandatory: rs.filter((t) => t.obligation === 'mandatory').length,
    quantitative: rs.filter((t) => t.target_type === 'quantitative').length,
    timebound: rs.filter((t) => t.timeline).length,
    climate: {
      mitigation: rs.filter((t) => t.climate_relevance === 'mitigation').length,
      adaptation: rs.filter((t) => t.climate_relevance === 'adaptation').length,
      both: rs.filter((t) => t.climate_relevance === 'both').length,
      none: rs.filter((t) => t.climate_relevance === 'none').length,
    },
    shared: rs.filter((t) => t.sectors.length > 1).length,
    topPolicies: [...byPolicy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, n]) => ({ name, n })),
  };
}

export default function PolicyTargetsSummaryPage() {
  const [hover, setHover] = useState<string | null>(null);

  const { sectors, noSector, totals, heat } = useMemo(() => {
    const rows = policyTargets.filter((t) => t.relevant);
    const sectors: SectorRow[] = SECTOR_META.map((s) => ({
      key: s.key, label: s.label, lens: s.lens,
      ...summarise(rows, (t) => t.sectors.includes(s.key)),
    }));
    const noSector: SectorRow = {
      key: 'none', label: 'In none of the eight', lens: 'cross-cutting · kept for review',
      ...summarise(rows, (t) => t.sectors.length === 0),
    };
    const totals = {
      targets: rows.length,
      acts: new Set(rows.map((t) => t.policy_id)).size,
      mandatory: rows.filter((t) => t.obligation === 'mandatory').length,
      quantitative: rows.filter((t) => t.target_type === 'quantitative').length,
      timebound: rows.filter((t) => t.timeline).length,
      multi: rows.filter((t) => t.sectors.length > 1).length,
      duplicates: rows.filter((t) => t.duplicate_of).length,
      // August-2026 (v3) review dimensions.
      firstOrder: rows.filter((t) => t.target_order === 1).length,
      secondOrder: rows.filter((t) => t.target_order === 2).length,
      humanOrdered: rows.filter((t) => t.target_order && t.target_order_source === 'human').length,
      revise: rows.filter((t) => t.revise_flag).length,
      docUpdated: rows.filter((t) => t.doc_replaced).length,
      docUpdatedActs: new Set(rows.filter((t) => t.doc_replaced).map((t) => t.policy_id)).size,
    };
    // Heatmap: the acts carrying the most targets × the eight systems.
    const perAct = new Map<string, number>();
    for (const t of rows) perAct.set(t.policy_short, (perAct.get(t.policy_short) ?? 0) + 1);
    const topActs = [...perAct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([name]) => name);
    const heat = topActs.map((name) => ({
      act: name,
      total: perAct.get(name) ?? 0,
      cells: SECTOR_META.map((s) => rows.filter((t) => t.policy_short === name && t.sectors.includes(s.key)).length),
    }));
    return { sectors, noSector, totals, heat };
  }, []);

  const maxSector = Math.max(...sectors.map((s) => s.targets), noSector.targets);
  const maxCell = Math.max(...heat.flatMap((h) => h.cells));
  const pct = (n: number, d = totals.targets) => (d ? Math.round((n / d) * 1000) / 10 : 0);

  return (
    <div className="min-h-screen bg-grey-50 dark:bg-[var(--mh-bg)]">
      <style dangerouslySetInnerHTML={{ __html: VIZ_CSS }} />
      <SiteHeader />
      <PageHero
        title="Policy Targets — summary statistics"
        subtitle="The corrected register in numbers: how many targets survive per act, how they spread across the eight sectors and systems, and how the mitigation/adaptation split falls inside each of them."
      >
        <Link href="/beta/policy-targets" className="inline-block text-[12.5px] font-medium text-primary hover:underline">
          ← Back to the full register (table, filters, Excel export)
        </Link>
        <Link href="/beta/policy-targets/sectors" className="inline-block ml-4 text-[12.5px] font-medium text-primary hover:underline">
          Sector summaries &amp; timelines (v5 clean set) →
        </Link>
      </PageHero>

      <div className="pt-viz max-w-[1280px] mx-auto px-3 sm:px-5 py-6 space-y-7">
        {/* ── Key numbers ─────────────────────────────────────────────── */}
        <section>
          <H2>The register at a glance</H2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <Tile n={totals.targets} label="Targets" note="after corrections" />
            <Tile n={totals.acts} label="Acts covered" />
            <Tile n={totals.mandatory} label="Mandatory" note={`${pct(totals.mandatory)}% of targets`} />
            <Tile n={totals.quantitative} label="Quantitative" note={`${pct(totals.quantitative)}%`} />
            <Tile n={totals.timebound} label="Time-bound" note={`${pct(totals.timebound)}%`} />
            <Tile n={totals.multi} label="In 2+ systems" note={`${pct(totals.multi)}%`} />
          </div>
          <p className="mt-2.5 text-[12.5px] text-tertiary dark:text-[var(--mh-muted)] leading-relaxed">
            {totals.duplicates} targets have a duplicate or closely similar counterpart in another policy (column 22 of
            the export names it). The register is the corrected dataset — rows removed as non-targets, duplicates, or
            truncated extractions are listed with their reason in the Excel workbook and in{' '}
            <code className="text-[11.5px]">docs-internal/policy-targets-human-review-2026-08.md</code>.
          </p>
        </section>

        {/* ── The August-2026 review pass ─────────────────────────────── */}
        <section>
          <H2>After the August 2026 review pass</H2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <Tile n={totals.firstOrder} label="First order" note={`${pct(totals.firstOrder)}% — the act's headline change`} />
            <Tile n={totals.secondOrder} label="Second order" note={`${pct(totals.secondOrder)}% — dependent or niche`} />
            <Tile n={totals.humanOrdered} label="Ranked by a reviewer" note="the rest calibrated on those labels" />
            <Tile n={totals.revise} label="Flagged “revise target”" note="likely not targets — kept for review" />
            <Tile n={totals.docUpdated} label="From updated source docs" note={`${totals.docUpdatedActs} acts re-extracted`} />
          </div>
          <p className="mt-2.5 text-[12.5px] text-tertiary dark:text-[var(--mh-muted)] leading-relaxed">
            The reviewers sharpened the definition: a target must be time-bound, or imply a progression of effort that
            can be measured — a single intervention (a ban, a one-off duty, a threshold-triggered obligation, a
            derogation, a plan-content requirement, a calculation rule, a Commission review clause) is not one. Rows
            matching those patterns are <strong>flagged, not deleted</strong>, so the next round starts from a candidate
            list rather than a silent removal. Separately, every act was checked against EUR-Lex for a newer consolidated
            version: 17 were outdated and their targets re-extracted from the current text — including the RED III-amended
            Renewable Energy Directive and the Climate Law consolidation carrying the adopted 90 %-by-2040 target.
          </p>
        </section>

        {/* ── The eight systems ───────────────────────────────────────── */}
        <section>
          <H2>The eight sectors and systems</H2>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[12.5px]">
            {SECTOR_META.map((s, i) => (
              <li key={s.key} className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-3 py-2">
                <span className="text-tertiary dark:text-[var(--mh-muted)] tabular-nums">{i + 1}.</span>{' '}
                <span className="font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">{s.label}</span>
                <div className="text-[11.5px] text-tertiary dark:text-[var(--mh-muted)] mt-0.5">{s.lens}</div>
              </li>
            ))}
          </ol>
          <p className="mt-2.5 text-[12.5px] text-tertiary dark:text-[var(--mh-muted)] leading-relaxed">
            The first six matter for both mitigation and adaptation; <strong>Water</strong> and <strong>Health</strong>{' '}
            are the two that matter above all for adaptation. A target can belong to several systems — {totals.multi} do.
            Targets that fall in none of the eight stay in the register for review; there are {noSector.targets} of them,
            and they are the cross-cutting, financial and institutional targets.
          </p>
        </section>

        {/* ── Figure 1 — magnitude ────────────────────────────────────── */}
        <Figure
          n={1}
          title="Targets by sector and system"
          caption={`Each target is counted in every system it bears on, so the bars sum to more than ${totals.targets}. The last row is the cross-cutting remainder, kept in the register for review.`}
        >
          <div className="space-y-1.5">
            {[...sectors, noSector].map((s) => (
              <div
                key={s.key}
                className="grid grid-cols-[minmax(120px,190px)_1fr_auto] items-center gap-2.5"
                onMouseEnter={() => setHover(`bar:${s.key}`)}
                onMouseLeave={() => setHover(null)}
              >
                <div className={`text-[12.5px] truncate ${s.key === 'none' ? 'italic text-tertiary dark:text-[var(--mh-muted)]' : 'text-tertiary-dark dark:text-[var(--mh-fg)]'}`}>
                  {s.label}
                </div>
                <div className="h-[18px] rounded-[4px]" style={{ background: 'var(--viz-track)' }}>
                  <div
                    className="h-full rounded-r-[4px] transition-[width] duration-300"
                    style={{
                      width: `${Math.max(1.5, (s.targets / maxSector) * 100)}%`,
                      background: s.key === 'none' ? 'var(--viz-none)' : 'var(--viz-magnitude)',
                      opacity: hover && hover !== `bar:${s.key}` ? 0.55 : 1,
                    }}
                  />
                </div>
                <div className="text-[12.5px] tabular-nums text-tertiary-dark dark:text-[var(--mh-fg)] w-[92px] text-right">
                  <strong>{s.targets}</strong>
                  <span className="text-tertiary dark:text-[var(--mh-muted)]"> · {pct(s.targets)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Figure>

        {/* ── Figure 2 — composition ──────────────────────────────────── */}
        <Figure
          n={2}
          title="Mitigation and adaptation within each system"
          caption="Share of each system's targets by the mechanism they work through — cutting emissions or raising removals (mitigation), reducing vulnerability, exposure or raising adaptive capacity (adaptation), or both. The argument for each row's call is column 21 of the export."
          legend={CLIMATE_ORDER.map((c) => ({ label: CLIMATE_META[c].label, color: CLIMATE_VAR[c] }))}
        >
          <div className="space-y-1.5">
            {[...sectors, noSector].map((s) => (
              <div key={s.key} className="grid grid-cols-[minmax(120px,190px)_1fr] items-center gap-2.5">
                <div className={`text-[12.5px] truncate ${s.key === 'none' ? 'italic text-tertiary dark:text-[var(--mh-muted)]' : 'text-tertiary-dark dark:text-[var(--mh-fg)]'}`}>
                  {s.label}
                </div>
                <div className="flex h-[18px] gap-[2px]">
                  {CLIMATE_ORDER.map((c) => {
                    const n = s.climate[c];
                    if (!n) return null;
                    const share = (n / s.targets) * 100;
                    const id = `${s.key}:${c}`;
                    return (
                      <div
                        key={c}
                        title={`${s.label} — ${CLIMATE_META[c].label}: ${n} targets (${Math.round(share)}%)`}
                        onMouseEnter={() => setHover(id)}
                        onMouseLeave={() => setHover(null)}
                        className="h-full first:rounded-l-[4px] last:rounded-r-[4px] flex items-center justify-center overflow-hidden"
                        style={{ width: `${share}%`, background: CLIMATE_VAR[c], opacity: hover && hover !== id ? 0.6 : 1 }}
                      >
                        {share >= 12 && (
                          <span className="text-[10.5px] font-semibold text-white tabular-nums px-1">{n}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Figure>

        {/* ── Figure 3 — heatmap ──────────────────────────────────────── */}
        <Figure
          n={3}
          title="Which acts carry which system"
          caption={`The ${heat.length} acts with the most targets, by system. Darker means more targets; an empty cell means the act sets no target in that system.`}
        >
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-[2px] text-[11.5px]">
              <thead>
                <tr>
                  <th className="text-left font-medium text-tertiary dark:text-[var(--mh-muted)] pr-2" />
                  {SECTOR_META.map((s) => (
                    <th key={s.key} className="w-[64px] align-bottom pb-1 text-tertiary dark:text-[var(--mh-muted)] font-medium leading-tight">
                      {s.label.split(' ')[0]}
                    </th>
                  ))}
                  <th className="pl-2 text-tertiary dark:text-[var(--mh-muted)] font-medium">All</th>
                </tr>
              </thead>
              <tbody>
                {heat.map((h) => (
                  <tr key={h.act}>
                    <td className="pr-2 whitespace-nowrap text-tertiary-dark dark:text-[var(--mh-fg)] max-w-[260px] truncate" title={h.act}>
                      {h.act}
                    </td>
                    {h.cells.map((n, i) => (
                      <td key={i} className="text-center">
                        <div
                          title={`${h.act} — ${SECTOR_META[i].label}: ${n} target${n === 1 ? '' : 's'}`}
                          className="h-[26px] rounded-[4px] flex items-center justify-center tabular-nums"
                          style={{
                            background: n ? 'var(--viz-magnitude)' : 'var(--viz-track)',
                            opacity: n ? 0.25 + 0.75 * (n / maxCell) : 1,
                            color: n && n / maxCell > 0.45 ? '#fff' : 'inherit',
                          }}
                        >
                          {n || ''}
                        </div>
                      </td>
                    ))}
                    <td className="pl-2 text-right tabular-nums font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">{h.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Figure>

        {/* ── Table view ──────────────────────────────────────────────── */}
        <section>
          <H2>Per-system statistics</H2>
          <p className="mb-2 text-[12.5px] text-tertiary dark:text-[var(--mh-muted)]">
            The numbers behind the figures above, with the acts contributing most targets to each system.
          </p>
          <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr className="bg-grey-100 dark:bg-[var(--mh-bg)] text-left text-tertiary-dark dark:text-[var(--mh-fg)]">
                  <Th>Sector / system</Th>
                  <Th right>Targets</Th>
                  <Th right>Share</Th>
                  <Th right>Acts</Th>
                  <Th right>Mandatory</Th>
                  <Th right>Quantitative</Th>
                  <Th right>Time-bound</Th>
                  <Th right>Mit.</Th>
                  <Th right>Adapt.</Th>
                  <Th right>Both</Th>
                  <Th>Leading acts</Th>
                </tr>
              </thead>
              <tbody>
                {[...sectors, noSector].map((s) => (
                  <tr key={s.key} className="border-t border-grey-100 dark:border-[var(--mh-border)] align-top">
                    <td className="px-2.5 py-2">
                      <span className={s.key === 'none' ? 'italic text-tertiary dark:text-[var(--mh-muted)]' : 'font-medium text-tertiary-dark dark:text-[var(--mh-fg)]'}>
                        {s.label}
                      </span>
                      <div className="text-[11px] text-tertiary dark:text-[var(--mh-muted)]">{s.lens}</div>
                    </td>
                    <Td right strong>{s.targets}</Td>
                    <Td right>{pct(s.targets)}%</Td>
                    <Td right>{s.policies}</Td>
                    <Td right>{s.mandatory}</Td>
                    <Td right>{s.quantitative}</Td>
                    <Td right>{s.timebound}</Td>
                    <Td right>{s.climate.mitigation}</Td>
                    <Td right>{s.climate.adaptation}</Td>
                    <Td right>{s.climate.both}</Td>
                    <td className="px-2.5 py-2 text-tertiary dark:text-[var(--mh-muted)]">
                      {s.topPolicies.map((p) => `${p.name} (${p.n})`).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-[12.5px] text-tertiary dark:text-[var(--mh-muted)] leading-relaxed">
            Sector classification is lexical and deterministic (<code className="text-[11.5px]">scripts/policy-targets-classify.mjs</code>):
            it reads the target text and its provision heading, not the act around them, so a target whose subject matter
            is only implied by its parent provision can be under-tagged. Treat these figures as a screening view of the
            register, not a legal classification.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ── small presentational pieces ─────────────────────────────────────── */

function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-[15px] font-bold text-tertiary-dark dark:text-[var(--mh-fg)] mb-2.5">{children}</h2>;
}

function Tile({ n, label, note }: { n: number; label: string; note?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] px-3 py-2.5">
      <div className="text-[22px] font-bold tabular-nums leading-none" style={{ color: 'var(--viz-magnitude)' }}>{n}</div>
      <div className="mt-1 text-[12px] font-medium text-tertiary-dark dark:text-[var(--mh-fg)]">{label}</div>
      {note && <div className="text-[11px] text-tertiary dark:text-[var(--mh-muted)]">{note}</div>}
    </div>
  );
}

function Figure({
  n, title, caption, legend, children,
}: {
  n: number; title: string; caption: string;
  legend?: { label: string; color: string }[];
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4">
      <h2 className="text-[14px] font-bold text-tertiary-dark dark:text-[var(--mh-fg)]">
        <span className="text-tertiary dark:text-[var(--mh-muted)] font-semibold">Figure {n} · </span>{title}
      </h2>
      {legend && (
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-2 text-[11.5px] text-tertiary dark:text-[var(--mh-muted)]">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3">{children}</div>
      <p className="mt-3 text-[11.5px] text-tertiary dark:text-[var(--mh-muted)] leading-relaxed">{caption}</p>
    </section>
  );
}

function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return <th className={`px-2.5 py-2 font-semibold whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}

function Td({ children, right, strong }: { children: ReactNode; right?: boolean; strong?: boolean }) {
  return (
    <td className={`px-2.5 py-2 tabular-nums ${right ? 'text-right' : ''} ${strong ? 'font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]' : 'text-tertiary dark:text-[var(--mh-muted)]'}`}>
      {children}
    </td>
  );
}
