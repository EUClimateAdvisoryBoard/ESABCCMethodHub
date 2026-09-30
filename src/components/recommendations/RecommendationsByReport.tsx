/**
 * Recommendations tracker — "by report" view.
 * -------------------------------------------
 * One table per ESABCC report, newest report first. Columns: title, full text,
 * mitigation/adaptation focus, sector, EU policy role. Every column except the
 * title can be hidden; the choice lives in the URL (`?hide=text,role`).
 *
 * The focus, sector and role labels are AI-compiled by the deterministic rules
 * in `src/lib/recommendations/classify.ts` — pending Secretariat verification.
 * A blank cell means the rules found no clear evidence, not "not relevant".
 */
'use client';

import { useMemo } from 'react';
import DownloadMenu from '@/components/workspace/DownloadMenu';
import { EmptyState } from '@/components/ui/StateView';
import { codecs, useUrlState } from '@/lib/useUrlState';
import { classify, focusLabel } from '@/lib/recommendations/classify';
import type { SheetSpec, DocBlock } from '@/lib/exports';

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

const COLUMNS = [
  { key: 'title', label: 'Recommendation title', locked: true },
  { key: 'text', label: 'Full text', locked: false },
  { key: 'focus', label: 'Mitigation / adaptation', locked: false },
  { key: 'sector', label: 'Sector', locked: false },
  { key: 'role', label: 'EU policy role', locked: false },
] as const;
type ColKey = (typeof COLUMNS)[number]['key'];
const HIDEABLE = COLUMNS.filter(c => !c.locked).map(c => c.key) as string[];

/** The stored summary up to its "Map:" instrument list (status commentary). */
const fullText = (summary: string) => (summary.split(/\bMap:/)[0] ?? summary).trim();

export default function RecommendationsByReport({ recs, reportOrder }: Props) {
  const [{ hide }, setUrl] = useUrlState({ hide: codecs.csv([]) });
  const hidden = new Set(hide.filter(k => HIDEABLE.includes(k)));
  const visible = COLUMNS.filter(c => !hidden.has(c.key));

  const groups = useMemo(() => {
    const byId = new Map<
      string,
      { id: string; label: string; url: string; rows: (ByReportRec & ReturnType<typeof classify>)[] }
    >();
    for (const r of recs) {
      let g = byId.get(r.reportId);
      if (!g) {
        g = { id: r.reportId, label: r.reportLabel, url: r.reportUrl, rows: [] };
        byId.set(r.reportId, g);
      }
      g.rows.push({
        ...r,
        ...classify({ title: r.title, area: r.area, summary: r.summary, reportId: r.reportId }),
      });
    }
    const rank = (id: string) => {
      const i = reportOrder.indexOf(id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return [...byId.values()].sort((a, b) => rank(a.id) - rank(b.id));
  }, [recs, reportOrder]);

  function toggle(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setUrl({ hide: HIDEABLE.filter(k => next.has(k)) });
  }

  const cell = (g: (typeof groups)[number]['rows'][number], key: ColKey): string => {
    switch (key) {
      case 'title': return g.title;
      case 'text': return fullText(g.summary);
      case 'focus': return focusLabel(g.focus);
      case 'sector': return g.sectors.join('; ');
      case 'role': return g.roles.join('; ');
    }
  };

  const getSheets = (): SheetSpec[] =>
    groups.map((g, i) => ({
      name: `${i + 1}. ${g.label}`.slice(0, 31).replace(/[\\/?*[\]:]/g, ''),
      headers: visible.map(c => c.label),
      rows: g.rows.map(r => visible.map(c => cell(r, c.key))),
    }));

  const getBlocks = (): DocBlock[] => [
    { type: 'heading', level: 1, text: 'ESABCC recommendations by report' },
    {
      type: 'paragraph',
      text: 'AI-compiled — pending Secretariat verification. Focus, sector and role labels are assigned by fixed keyword rules; a blank cell means no clear evidence.',
      italic: true,
    },
    ...groups.flatMap<DocBlock>(g => [
      { type: 'heading', level: 2, text: g.label },
      {
        type: 'table',
        headers: visible.map(c => c.label),
        rows: g.rows.map(r => visible.map(c => cell(r, c.key))),
      },
    ]),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <DownloadMenu
          filename="esabcc-recommendations-by-report"
          data={{ getSheets }}
          text={{ getBlocks }}
        />
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No recommendations to show" body="The tracker holds no recommendations." />
      ) : (
        groups.map(g => (
          <section key={g.id} aria-labelledby={`rep-${g.id}`}>
            <h2 id={`rep-${g.id}`} className="mb-2 text-base font-bold text-tertiary-dark">
              {g.url ? (
                <a href={g.url} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                  {g.label} <span aria-hidden="true">↗</span>
                </a>
              ) : (
                g.label
              )}
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
                    <tr key={r.id} className="align-top odd:bg-white even:bg-grey-50/40">
                      {visible.map(c => (
                        <td
                          key={c.key}
                          className={`border-b border-grey-100 px-3 py-2 text-tertiary ${
                            c.key === 'title' ? 'min-w-[16rem] font-medium text-tertiary-dark' : ''
                          } ${c.key === 'text' ? 'min-w-[22rem]' : ''}`}
                        >
                          {c.key === 'sector' || c.key === 'role' ? (
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
                          ) : (
                            cell(r, c.key)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
