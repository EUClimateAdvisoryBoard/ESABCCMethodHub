/**
 * Recommendations tracker — "by report" and "role matrix" views.
 * --------------------------------------------------------------
 * Both views list headline recommendations, newest report first. Reports the
 * tracker stores at sub-recommendation level are regrouped under their
 * headlines by `src/lib/recommendations/headlines.ts`.
 *
 *   • By report — one table per report: title, sub-recommendations (numbered),
 *     mitigation/adaptation focus, sector, EU policy role. Every column except
 *     the title can be hidden (`?hide=subs,role`).
 *   • Role matrix — one table across all reports: report, title, focus
 *     (colour-coded), sector (one 2024-report sector or "Cross-cutting") and
 *     one column per EU policy role, filled blue where the role is relevant
 *     (`?view=matrix`); hovering a blue cell shows the rule behind it.
 *
 * The January 2024 report is shown in parts (summary and key
 * recommendations, then one part per chapter) via `splitReport`.
 *
 * The Excel download has four sheets whichever view is open: the
 * recommendations list, the role matrix, the sub-role matrix (one column per
 * outline sub-role under a merged role header, filled blue where relevant),
 * and the role rationale (the matrix layout with a short reason, tied to a
 * sub-role, in each relevant cell).
 *
 * Focus, sector and role labels are AI-compiled by the deterministic rules in
 * `src/lib/recommendations/classify.ts` — pending Secretariat verification. A
 * headline's labels are the union of those for its own title and for each of
 * its sub-recommendations. A blank cell means no clear evidence was found.
 */
'use client';

import { useMemo } from 'react';
import DownloadMenu from '@/components/workspace/DownloadMenu';
import ModeSwitcher from '@/components/ui/ModeSwitcher';
import { EmptyState } from '@/components/ui/StateView';
import { codecs, useUrlState } from '@/lib/useUrlState';
import {
  ROLES,
  SUB_ROLES,
  classify,
  focusLabel,
  matrixSector,
  mergeClassifications,
  roleReason,
  type Classification,
  type Focus,
} from '@/lib/recommendations/classify';
import { splitReport, toHeadlineRows, type HeadlineRow } from '@/lib/recommendations/headlines';
import type { CellValue, SheetSpec, DocBlock } from '@/lib/exports';

export interface ByReportRec {
  id: string;
  title: string;
  summary: string;
  area: string;
  reportId: string;
  reportLabel: string;
  reportUrl: string;
}

interface Props {
  recs: ByReportRec[];
  /** Report ids, newest first. Reports not listed sort last. */
  reportOrder: string[];
}

/* -------------------------------------------------------------- palette */
// Focus colours. Teal / orange / purple stay distinguishable under the common
// colour-vision deficiencies, and every cell also carries its text label, so
// colour is never the only channel. Role cells use the brand primary blue.
const FOCUS_COLOURS: Record<Focus, { bg: string; fg: string }> = {
  mitigation: { bg: '#D6EFEA', fg: '#00594E' },
  adaptation: { bg: '#FCE3CC', fg: '#8A4300' },
  both: { bg: '#E6DDF4', fg: '#4B2A7B' },
};
const ROLE_FILL = '#004B7F'; // tailwind `primary`
const hex = (c: string) => c.replace('#', '').toUpperCase();

const COLUMNS = [
  { key: 'title', label: 'Recommendation title', locked: true },
  { key: 'subs', label: 'Sub-recommendations', locked: false },
  { key: 'focus', label: 'Mitigation / adaptation', locked: false },
  { key: 'sector', label: 'Sector', locked: false },
  { key: 'role', label: 'EU policy role', locked: false },
] as const;
type ColKey = (typeof COLUMNS)[number]['key'];
const HIDEABLE = COLUMNS.filter(c => !c.locked).map(c => c.key) as string[];

const VIEWS = ['table', 'matrix'] as const;
type View = (typeof VIEWS)[number];
const URL_SCHEMA = { view: codecs.enum(VIEWS, 'table'), hide: codecs.csv([]) };

type Row = HeadlineRow<ByReportRec> & Classification & { reportLabel: string };
interface Group {
  id: string;
  label: string;
  url: string;
  rows: Row[];
}

function classifyHeadline(h: HeadlineRow<ByReportRec>, reportId: string): Classification {
  const one = (r: ByReportRec) =>
    classify({ title: r.title, area: r.area, summary: r.summary, reportId });
  if (h.self) return one(h.self);
  return mergeClassifications(
    [classify({ title: h.title, reportId }), ...h.subs.map(one)],
    ['Headline', ...h.subs.map((_, i) => `Sub-rec ${i + 1}`)]
  );
}

/** Sub-role numbers in outline order ("1.1" … "9.4"), and grouped by role. */
const SUB_KEYS = Object.keys(SUB_ROLES);
const roleIndex = (sub: string) => Number(sub.split('.')[0]) - 1;
const SUBS_BY_ROLE = ROLES.map((_, i) => SUB_KEYS.filter(k => roleIndex(k) === i));

const subsText = (r: Row) => r.subs.map((s, i) => `${i + 1}. ${s.title}`).join('\n');

export default function RecommendationsByReport({ recs, reportOrder }: Props) {
  const [{ view, hide }, setUrl] = useUrlState(URL_SCHEMA);
  const hidden = new Set(hide.filter(k => HIDEABLE.includes(k)));
  const visible = COLUMNS.filter(c => !hidden.has(c.key));

  const groups = useMemo<Group[]>(() => {
    const byId = new Map<string, { id: string; label: string; url: string; recs: ByReportRec[] }>();
    for (const r of recs) {
      let g = byId.get(r.reportId);
      if (!g) {
        g = { id: r.reportId, label: r.reportLabel, url: r.reportUrl, recs: [] };
        byId.set(r.reportId, g);
      }
      g.recs.push(r);
    }
    const rank = (id: string) => {
      const i = reportOrder.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...byId.values()]
      .sort((a, b) => rank(a.id) - rank(b.id))
      .flatMap(g =>
        splitReport(g.id, g.recs).map(part => {
          const label = part.label ? `${g.label} — ${part.label}` : g.label;
          return {
            id: part.key,
            label,
            url: g.url,
            rows: toHeadlineRows(g.id, part.rows).map(h => ({
              ...h,
              ...classifyHeadline(h, g.id),
              reportLabel: label,
            })),
          };
        })
      );
  }, [recs, reportOrder]);

  const allRows = groups.flatMap(g => g.rows);

  function toggle(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setUrl({ hide: HIDEABLE.filter(k => next.has(k)) });
  }

  const cell = (r: Row, key: ColKey): string => {
    switch (key) {
      case 'title': return r.title;
      case 'subs': return subsText(r);
      case 'focus': return focusLabel(r.focus);
      case 'sector': return r.sectors.join('; ');
      case 'role': return r.roles.join('; ');
    }
  };

  const focusCell = (r: Row): CellValue =>
    r.focus
      ? { text: focusLabel(r.focus), fill: hex(FOCUS_COLOURS[r.focus].bg), color: hex(FOCUS_COLOURS[r.focus].fg) }
      : '';

  const CAVEAT =
    'AI-compiled — pending Secretariat verification. Focus, sector and role labels are assigned by fixed keyword rules; a headline carries the labels of its own title and of all its sub-recommendations; a blank cell means no clear evidence. Roles are numbered as in the policy assessment report outline.';

  const MATRIX_HEADERS = ['Report', 'Recommendation title', 'Mitigation / adaptation', 'Sector', ...ROLES];

  // Four sheets whichever view is open; CSV takes the first.
  const getSheets = (): SheetSpec[] => [
    {
      name: 'Recommendations',
      subtitle: CAVEAT,
      headers: ['Report', ...visible.map(c => c.label)],
      rows: allRows.map(r => [
        r.reportLabel,
        ...visible.map<CellValue>(c => (c.key === 'focus' ? focusCell(r) : cell(r, c.key))),
      ]),
    },
    {
      name: 'Role matrix',
      subtitle: CAVEAT,
      headers: MATRIX_HEADERS,
      rows: allRows.map(r => [
        r.reportLabel,
        r.title,
        focusCell(r),
        matrixSector(r.sectors),
        ...ROLES.map<CellValue>(role =>
          r.roles.includes(role) ? { text: 'Yes', fill: hex(ROLE_FILL), color: 'FFFFFF' } : ''
        ),
      ]),
    },
    {
      name: 'Sub-role matrix',
      subtitle: `${CAVEAT} Sub-roles as numbered in the policy assessment report outline.`,
      headerGroups: [
        { label: '', span: 4 },
        ...ROLES.map((role, i) => ({ label: `${i + 1} ${role}`, span: SUBS_BY_ROLE[i].length })),
      ],
      headers: [...MATRIX_HEADERS.slice(0, 4), ...SUB_KEYS.map(k => `${k} ${SUB_ROLES[k]}`)],
      columnWidths: [28, 60, 14, 16, ...SUB_KEYS.map(() => 12)],
      wrapHeaders: true,
      freezeColumns: 2,
      rows: allRows.map(r => [
        r.reportLabel,
        r.title,
        focusCell(r),
        matrixSector(r.sectors),
        ...SUB_KEYS.map<CellValue>(k =>
          r.roleHits[ROLES[roleIndex(k)]]?.some(h => h.sub === k)
            ? { text: 'Yes', fill: hex(ROLE_FILL), color: 'FFFFFF' }
            : ''
        ),
      ]),
    },
    {
      name: 'Role rationale',
      subtitle:
        'Why each role was assigned: the words that matched (or the report-wide rule) and the sub-role of the policy assessment report outline they map to. "Sub-rec N" points to the numbered sub-recommendation. AI-compiled — pending Secretariat verification.',
      headers: MATRIX_HEADERS,
      rows: allRows.map(r => [
        r.reportLabel,
        r.title,
        focusLabel(r.focus),
        matrixSector(r.sectors),
        ...ROLES.map(role => roleReason(r.roleHits[role])),
      ]),
    },
  ];

  const getBlocks = (): DocBlock[] => [
    { type: 'heading', level: 1, text: 'ESABCC recommendations by report' },
    { type: 'paragraph', text: CAVEAT, italic: true },
    ...(view === 'matrix'
      ? [
          {
            type: 'table',
            headers: MATRIX_HEADERS,
            rows: allRows.map(r => [
              r.reportLabel,
              r.title,
              focusLabel(r.focus),
              matrixSector(r.sectors),
              ...ROLES.map(role => (r.roles.includes(role) ? '●' : '')),
            ]),
          } satisfies DocBlock,
        ]
      : groups.flatMap<DocBlock>(g => [
          { type: 'heading', level: 2, text: g.label },
          {
            type: 'table',
            headers: visible.map(c => c.label),
            rows: g.rows.map(r => visible.map(c => cell(r, c.key))),
          },
        ])),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ModeSwitcher<View>
          ariaLabel="View"
          size="compact"
          value={view}
          onChange={v => setUrl({ view: v })}
          modes={[
            { id: 'table', label: 'Read by report' },
            { id: 'matrix', label: 'Compare roles' },
          ]}
        />
        <DownloadMenu
          filename={view === 'matrix' ? 'esabcc-recommendations-role-matrix' : 'esabcc-recommendations-by-report'}
          data={{ getSheets }}
          text={{ getBlocks }}
        />
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No recommendations to show" body="The tracker holds no recommendations." />
      ) : view === 'matrix' ? (
        <RoleMatrix groups={groups} />
      ) : (
        <>
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Columns to show</legend>
            <span className="text-xs font-semibold text-tertiary-dark" aria-hidden="true">
              Columns
            </span>
            {COLUMNS.map(c => (
              <label
                key={c.key}
                title={c.locked ? 'The title column is always shown' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  c.locked
                    ? 'border-grey-200 bg-grey-50 text-tertiary'
                    : 'cursor-pointer border-grey-300 bg-white text-tertiary-dark hover:border-primary'
                }`}
              >
                <input
                  type="checkbox"
                  className="mh-focus"
                  checked={!hidden.has(c.key)}
                  disabled={c.locked}
                  onChange={() => toggle(c.key)}
                />
                {c.label}
              </label>
            ))}
          </fieldset>
          {groups.map(g => (
            <section key={g.id} aria-labelledby={`rep-${g.id}`}>
              <h2 id={`rep-${g.id}`} className="mb-2 text-base font-bold text-tertiary-dark">
                <ReportLink label={g.label} url={g.url} />
              </h2>
              <div className="overflow-x-auto rounded-lg border border-grey-200 bg-white">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-grey-50 text-xs uppercase tracking-wide text-tertiary-dark">
                    <tr>
                      {visible.map(c => (
                        <th key={c.key} scope="col" className="border-b border-grey-200 px-3 py-2 font-semibold">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map(r => (
                      <tr key={r.key} className="align-top odd:bg-white even:bg-grey-50/40">
                        {visible.map(c => (
                          <td
                            key={c.key}
                            className={`border-b border-grey-100 px-3 py-2 text-tertiary ${
                              c.key === 'title' ? 'min-w-[16rem] font-medium text-tertiary-dark' : ''
                            } ${c.key === 'subs' ? 'min-w-[22rem]' : ''}`}
                          >
                            {c.key === 'title' ? (
                              <Title row={r} />
                            ) : c.key === 'subs' ? (
                              r.subs.length > 0 && (
                                <ol className="list-decimal space-y-1 pl-5">
                                  {r.subs.map(s => (
                                    <li key={s.id}>{s.title}</li>
                                  ))}
                                </ol>
                              )
                            ) : c.key === 'focus' ? (
                              <FocusChip focus={r.focus} />
                            ) : (
                              <ul className="flex flex-wrap gap-1">
                                {(c.key === 'sector' ? r.sectors : r.roles).map(v => (
                                  <li
                                    key={v}
                                    className="rounded border border-grey-200 bg-grey-50 px-1.5 py-0.5 text-xs text-tertiary-dark"
                                  >
                                    {v}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function ReportLink({ label, url }: { label: string; url: string }) {
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="mh-focus hover:text-primary hover:underline">
      {label} <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <>{label}</>
  );
}

function Title({ row }: { row: Row }) {
  return (
    <span title={row.quoted ? `Quoted from the report${row.locator ? `, PDF ${row.locator}` : ''}` : undefined}>
      {row.title}
    </span>
  );
}

function FocusChip({ focus }: { focus: Focus | null }) {
  if (!focus) return null;
  const c = FOCUS_COLOURS[focus];
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {focusLabel(focus)}
    </span>
  );
}

function RoleMatrix({ groups }: { groups: Group[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-grey-200 bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-grey-50 text-[11px] text-tertiary-dark">
          <tr>
            <th scope="col" className="w-32 border-b border-grey-200 px-3 py-2 font-semibold uppercase tracking-wide">
              Report
            </th>
            <th scope="col" className="min-w-[14rem] border-b border-grey-200 px-3 py-2 font-semibold uppercase tracking-wide">
              Recommendation title
            </th>
            <th scope="col" className="w-24 border-b border-grey-200 px-2 py-2 font-semibold uppercase tracking-wide">
              Mitigation / adaptation
            </th>
            <th scope="col" className="w-20 border-b border-grey-200 px-2 py-2 font-semibold uppercase tracking-wide">
              Sector
            </th>
            {ROLES.map((role, i) => (
              <th
                key={role}
                scope="col"
                className="w-[4.75rem] border-b border-l border-grey-200 px-1 py-2 text-center align-bottom text-[10.5px] font-semibold leading-tight"
              >
                <span className="block font-mono tabular-nums text-tertiary">{i + 1}</span>
                {role}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map(g => (
          <tbody key={g.id} className="border-t-2 border-grey-200">
            {g.rows.map((r, ri) => (
              <tr key={r.key} className="align-top">
                {ri === 0 && (
                  <th
                    scope="rowgroup"
                    rowSpan={g.rows.length}
                    className="border-b border-grey-200 bg-grey-50 px-3 py-2 text-[11px] font-semibold leading-snug text-tertiary-dark"
                  >
                    <ReportLink label={g.label} url={g.url} />
                  </th>
                )}
                <td className="border-b border-grey-100 px-3 py-1.5 text-xs leading-snug text-tertiary-dark">
                  <Title row={r} />
                </td>
                <td className="border-b border-grey-100 px-2 py-1.5">
                  <FocusChip focus={r.focus} />
                </td>
                <td className="border-b border-grey-100 px-2 py-1.5 text-xs text-tertiary-dark">
                  {matrixSector(r.sectors)}
                </td>
                {ROLES.map(role => {
                  const on = r.roles.includes(role);
                  return (
                    <td
                      key={role}
                      className="border-b border-l border-grey-100"
                      // The inset white ring keeps neighbouring filled cells visibly separate.
                      style={on ? { backgroundColor: ROLE_FILL, boxShadow: 'inset 0 0 0 2px #fff' } : undefined}
                      title={on ? `${role}: ${roleReason(r.roleHits[role])}` : undefined}
                    >
                      {on && <span className="sr-only">{role}: relevant ({roleReason(r.roleHits[role])})</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
