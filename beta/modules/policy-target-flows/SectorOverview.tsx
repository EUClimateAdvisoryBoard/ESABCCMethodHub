'use client';
/**
 * The one-figure overview of M·53 — all nine sector columns of the ledger on a
 * single figure that fits a screen, from which any one sector expands into its
 * full flow chart below.
 *
 * The detailed charts are large by construction: a sector carries up to ~126
 * targets across a dozen acts, so a reader who lands on one chart sees a
 * fragment of one column and has no way to tell whether it is the big column or
 * a small one. This figure is the map that was missing. Every column is drawn to
 * the same rows as the chart it opens — first-order targets, second-order
 * targets, procedural obligations — so the reader moves from map to chart
 * without re-learning the layout.
 *
 * Bars are shares within a row, never across rows: the widest bar on the
 * "first-order targets" row is the sector with the most first-order targets, and
 * says nothing about the row below it. Every bar carries its number, so colour
 * never carries the meaning alone.
 */
import {
  ROUTE_META,
  RUNG_META,
  type FlowColumnKey,
  type Rung,
} from '@/data/target-indicators';
import { ROUTE_ORDER, type ColumnOverview } from './model';

const RUNGS: Rung[] = ['outcome', 'lever', 'enabling'];

/** Fixed row heights, so the label column and the nine sector columns line up
 *  as one figure without a grid — each column stays a single click target. */
const H = {
  head: 'h-[62px]',
  rung: 'h-[28px]',
  route: 'h-[42px]',
  foot: 'h-[20px]',
};

const fmt = (n: number) => n.toLocaleString('en-GB');

interface Props {
  overview: ColumnOverview[];
  selected: FlowColumnKey;
  onSelect: (key: FlowColumnKey) => void;
  /** True when a filter is narrowing the figure, so it can say so. */
  filtered: boolean;
}

function LabelColumn({ overview }: { overview: ColumnOverview[] }) {
  const totalRung = (rung: Rung) => overview.reduce((n, o) => n + o.byRung[rung], 0);
  return (
    <div className="w-[176px] shrink-0">
      <div className={`${H.head} flex flex-col justify-end pb-1.5`}>
        <p className="text-[10.5px] uppercase tracking-wide text-tertiary-light">Sector column</p>
        <p className="text-[11px] leading-snug text-tertiary">Click one to open its chart</p>
      </div>
      {RUNGS.map((rung) => (
        <div key={rung} className={`${H.rung} flex items-center gap-1.5`}>
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: RUNG_META[rung].color }} />
          <span className="truncate text-[11px] font-medium text-tertiary-dark" title={RUNG_META[rung].description}>
            {RUNG_META[rung].label}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-tertiary-light">
            {fmt(totalRung(rung))}
          </span>
        </div>
      ))}
      <div className={`${H.route} flex flex-col justify-center`}>
        <span className="text-[11px] font-medium text-tertiary-dark">How it is measured</span>
        <span className="text-[10px] leading-snug text-tertiary-light">series · specified · milestone</span>
      </div>
      <div className={`${H.foot} flex items-center`}>
        <span className="text-[10px] text-tertiary-light">Weak matches</span>
      </div>
    </div>
  );
}

function SectorColumn({
  ov, rungMax, active, onSelect,
}: {
  ov: ColumnOverview;
  rungMax: Record<Rung, number>;
  active: boolean;
  onSelect: () => void;
}) {
  const dim = ov.total === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title={`${ov.column.label} — ${fmt(ov.total)} targets, ${ov.acts} acts. ${
        ov.topActs.map((a) => `${a.short} (${a.count})`).join(', ')
      }`}
      className={`mh-focus mh-motion-fast flex min-w-[104px] flex-1 flex-col rounded-lg border px-2 pb-1.5 text-left hover:shadow-sm ${
        active ? 'border-primary bg-surface-blue ring-1 ring-primary' : 'border-grey-200 bg-white hover:border-grey-300'
      } ${dim ? 'opacity-55' : ''}`}
    >
      <span className={`${H.head} flex flex-col justify-end pb-1.5`}>
        <span className="mb-1 block h-1 w-8 rounded-full" style={{ background: ov.column.color }} />
        <span className="block truncate text-[11.5px] font-semibold text-tertiary-dark">{ov.column.short}</span>
        <span className="flex items-baseline gap-1">
          <span className="font-mono text-[15px] leading-none tabular-nums text-tertiary-dark">{fmt(ov.total)}</span>
          <span className="text-[9.5px] uppercase tracking-wide text-tertiary-light">
            {ov.total === ov.unfilteredTotal ? `${ov.acts} acts` : `of ${fmt(ov.unfilteredTotal)}`}
          </span>
        </span>
      </span>

      {RUNGS.map((rung) => {
        const n = ov.byRung[rung];
        const max = rungMax[rung] || 1;
        return (
          <span key={rung} className={`${H.rung} flex items-center gap-1.5`}>
            <span className="relative h-2 flex-1 overflow-hidden rounded-sm bg-grey-100">
              <span
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ width: `${(n / max) * 100}%`, background: RUNG_META[rung].color }}
              />
            </span>
            <span className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-tertiary">{n}</span>
          </span>
        );
      })}

      <span className={`${H.route} flex flex-col justify-center gap-1`}>
        <span className="flex h-2.5 overflow-hidden rounded-sm bg-grey-100">
          {ROUTE_ORDER.map((r) => {
            const n = ov.routes[r];
            if (!n || !ov.total) return null;
            return (
              <span key={r} style={{ width: `${(n / ov.total) * 100}%`, background: ROUTE_META[r].color }} />
            );
          })}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-tertiary">
          {ov.total ? `${ov.seriesShare.toFixed(0)} %` : '—'}{' '}
          <span className="font-sans text-tertiary-light">measured</span>
        </span>
      </span>

      <span className={`${H.foot} flex items-center`}>
        {ov.weak > 0 ? (
          <span className="rounded bg-surface-orange px-1 text-[9.5px] font-semibold text-tertiary-dark">
            {ov.weak} to check
          </span>
        ) : (
          <span className="text-[9.5px] text-tertiary-light">—</span>
        )}
      </span>
    </button>
  );
}

export default function SectorOverview({ overview, selected, onSelect, filtered }: Props) {
  const rungMax: Record<Rung, number> = {
    outcome: Math.max(...overview.map((o) => o.byRung.outcome), 1),
    lever: Math.max(...overview.map((o) => o.byRung.lever), 1),
    enabling: Math.max(...overview.map((o) => o.byRung.enabling), 1),
  };
  const shown = overview.reduce((n, o) => n + o.total, 0);
  const all = overview.reduce((n, o) => n + o.unfilteredTotal, 0);

  return (
    <div className="rounded-xl border border-grey-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[13.5px] font-semibold text-tertiary-dark">
            The whole ledger, one figure
          </h2>
          <p className="mt-0.5 max-w-3xl text-[11.5px] leading-snug text-tertiary">
            All nine sector columns on the rows their charts use. Pick a column to expand it into the
            full flow chart below; bars compare sectors within a row, not across rows.
          </p>
        </div>
        <p className="font-mono text-[11px] tabular-nums text-tertiary-light">
          {filtered ? `${fmt(shown)} of ${fmt(all)} column entries in view` : `${fmt(all)} column entries`}
        </p>
      </div>

      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex min-w-[980px] gap-1.5">
          <LabelColumn overview={overview} />
          {overview.map((ov) => (
            <SectorColumn
              key={ov.column.key}
              ov={ov}
              rungMax={rungMax}
              active={ov.column.key === selected}
              onSelect={() => onSelect(ov.column.key)}
            />
          ))}
        </div>
      </div>

      <p className="mt-2 text-[10.5px] leading-snug text-tertiary-light">
        A target bearing on several sectors appears in each of their columns, so the column entries
        sum to more than the number of targets. Percentages are the share of a column&apos;s targets a
        curated series already measures.
      </p>
    </div>
  );
}
