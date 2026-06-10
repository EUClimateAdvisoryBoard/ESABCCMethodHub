/**
 * Literature watch — daily scientific-publication suggestions (M·19).
 * --------------------------------------------------------------------
 * Renders the output of the daily publication screening (GitHub Action →
 * scripts/screen-publications.mjs → public/data/publication-screening/):
 *
 *   • "Suggestions" — the rolling archive of new journal articles whose
 *     keyword score matched THIS project, newest first, with the matched
 *     keywords shown so the team can see *why* a paper was suggested.
 *   • "Daily reports" — the committed markdown report for each screening
 *     day, rendered in-page. Reports you have opened are marked read
 *     (localStorage, per browser) so it's easy to keep up daily.
 *
 * All data is static JSON/markdown committed by the Action, so this module
 * works in preview mode (no Supabase) too.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';

interface ProjectMatch {
  projectId: string;
  score: number;
  matched: string[];
}

interface Suggestion {
  doi: string;
  title: string;
  journal: string;
  authors: string;
  published: string;
  url: string;
  abstract: string;
  suggestedOn: string;
  projects: ProjectMatch[];
}

interface SuggestionsFile {
  generatedAt: string | null;
  journals: string[];
  suggestions: Suggestion[];
}

const READ_REPORTS_KEY = 'pw-literature-watch-read-reports';

function loadReadReports(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_REPORTS_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export default function LiteratureWatchModule({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<'suggestions' | 'reports'>('suggestions');
  const [data, setData] = useState<SuggestionsFile | null>(null);
  const [reportDates, setReportDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [readReports, setReadReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadReports(loadReadReports());
    Promise.all([
      fetch('/data/publication-screening/suggestions.json').then(r => (r.ok ? r.json() : null)),
      fetch('/data/publication-screening/index.json').then(r => (r.ok ? r.json() : null)),
    ])
      .then(([suggestions, index]) => {
        setData(suggestions);
        setReportDates(index?.reports ?? []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const mine = useMemo(() => {
    const all = data?.suggestions ?? [];
    return all
      .map(s => ({ s, match: s.projects.find(p => p.projectId === projectId) }))
      .filter((x): x is { s: Suggestion; match: ProjectMatch } => !!x.match)
      .sort((a, b) =>
        a.s.suggestedOn === b.s.suggestedOn
          ? b.match.score - a.match.score
          : b.s.suggestedOn.localeCompare(a.s.suggestedOn),
      );
  }, [data, projectId]);

  const unreadCount = reportDates.filter(d => !readReports.has(d)).length;

  function markRead(date: string) {
    setReadReports(prev => {
      const next = new Set(prev);
      next.add(date);
      try {
        localStorage.setItem(READ_REPORTS_KEY, JSON.stringify([...next]));
      } catch {
        /* private browsing — read state just won't persist */
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-grey-200 bg-grey-50 px-6 py-12 text-center text-sm text-tertiary">
        Loading the latest screening…
      </div>
    );
  }

  return (
    <div>
      {/* Sub-tabs: suggestions for this project / the daily reports. */}
      <div className="flex items-center gap-2 mb-4">
        {(
          [
            { id: 'suggestions', label: `Suggestions (${mine.length})` },
            {
              id: 'reports',
              label: `Daily reports (${reportDates.length})${unreadCount > 0 ? ` · ${unreadCount} unread` : ''}`,
            },
          ] as const
        ).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              tab === t.id
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-tertiary-dark border-grey-200 hover:border-primary/40'
            }`}
          >
            {t.label}
          </button>
        ))}
        {data?.generatedAt && (
          <span className="ml-auto text-[11px] text-tertiary">
            Last screening: {data.generatedAt.slice(0, 10)} · {data.journals.length} journals
          </span>
        )}
      </div>

      {tab === 'suggestions' ? (
        <SuggestionList items={mine} screened={!!data?.generatedAt} />
      ) : (
        <ReportReader dates={reportDates} readReports={readReports} onRead={markRead} />
      )}
    </div>
  );
}

function SuggestionList({
  items,
  screened,
}: {
  items: { s: Suggestion; match: ProjectMatch }[];
  screened: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-tertiary-dark">
          No suggestions for this project yet
        </p>
        <p className="text-xs text-tertiary mt-1 max-w-md mx-auto leading-relaxed">
          {screened
            ? 'The daily screening has not found new publications matching this project recently. New journal articles are screened every morning.'
            : 'The first daily screening has not run yet. It runs every morning via GitHub Actions and its suggestions will appear here.'}
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map(({ s, match }) => (
        <li key={s.doi} className="rounded-xl border border-grey-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-tertiary-dark hover:text-primary leading-snug"
            >
              {s.title}
            </a>
            <span
              className="shrink-0 inline-flex items-center rounded-full bg-[#F4EFF8] text-[#7A3E9D] px-2 py-0.5 text-[10px] font-bold"
              title="Keyword relevance score for this project"
            >
              {match.score}
            </span>
          </div>
          <p className="text-xs text-tertiary mt-1">
            {s.authors && <span className="font-medium text-tertiary-dark">{s.authors}</span>}
            {s.authors && ' · '}
            <em>{s.journal}</em>
            {' · '}
            {s.published}
            {' · '}
            <a
              href={`https://doi.org/${s.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {s.doi}
            </a>
          </p>
          {s.abstract && (
            <p className="text-xs text-tertiary mt-2 leading-relaxed line-clamp-3">{s.abstract}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-tertiary-light mr-0.5">Matched:</span>
            {match.matched.map(kw => (
              <span
                key={kw}
                className="inline-flex items-center rounded-full border border-grey-200 bg-grey-50 px-2 py-0.5 text-[10px] text-tertiary-dark"
              >
                {kw}
              </span>
            ))}
            <span className="ml-auto text-[10px] text-tertiary-light">
              suggested {s.suggestedOn}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReportReader({
  dates,
  readReports,
  onRead,
}: {
  dates: string[];
  readReports: Set<string>;
  onRead: (date: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(dates[0] ?? null);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setContent(null);
    setError(false);
    fetch(`/data/publication-screening/reports/${selected}.md`)
      .then(r => (r.ok ? r.text() : Promise.reject()))
      .then(md => {
        setContent(md);
        onRead(selected);
      })
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (dates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-tertiary-dark">No daily reports yet</p>
        <p className="text-xs text-tertiary mt-1">
          A markdown report is committed every morning by the screening workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-start">
      <nav
        aria-label="Daily screening reports"
        className="rounded-xl border border-grey-200 bg-grey-50 p-2 max-h-[480px] overflow-y-auto"
      >
        <ul className="space-y-0.5">
          {dates.map(d => {
            const isRead = readReports.has(d);
            const isActive = selected === d;
            return (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => setSelected(d)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition ${
                    isActive
                      ? 'bg-primary text-white font-semibold'
                      : 'text-tertiary-dark hover:bg-white'
                  }`}
                >
                  <span
                    className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                      isRead ? 'bg-transparent' : isActive ? 'bg-white' : 'bg-secondary'
                    }`}
                    title={isRead ? 'Read' : 'Unread'}
                  />
                  {d}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <article className="rounded-xl border border-grey-200 bg-white p-5 min-h-[200px]">
        {error && (
          <p className="text-xs text-red-700">Could not load the report for {selected}.</p>
        )}
        {!error && content === null && (
          <p className="text-xs text-tertiary italic">Loading report…</p>
        )}
        {content !== null && (
          <div
            className="lit-watch-report text-sm text-tertiary-dark leading-relaxed
              [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3
              [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-primary
              [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1
              [&_p]:mb-2 [&_p]:text-xs [&_p]:text-tertiary [&_p]:leading-relaxed
              [&_a]:text-primary [&_a]:hover:underline
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_li]:text-xs [&_li]:text-tertiary
              [&_blockquote]:border-l-2 [&_blockquote]:border-grey-200 [&_blockquote]:pl-3 [&_blockquote]:text-xs [&_blockquote]:text-tertiary [&_blockquote]:italic [&_blockquote]:mb-2
              [&_code]:bg-grey-50 [&_code]:border [&_code]:border-grey-200 [&_code]:rounded [&_code]:px-1 [&_code]:text-[10px]
              [&_hr]:my-4 [&_hr]:border-grey-200"
            // The markdown is generated by our own committed script (not user
            // input) and renderReportMarkdown escapes all HTML before parsing.
            dangerouslySetInnerHTML={{ __html: renderReportMarkdown(content) }}
          />
        )}
      </article>
    </div>
  );
}

/**
 * Tiny Markdown→HTML for the daily report — same deliberately limited
 * approach as CustomNotesModule's preview: headings, lists, blockquotes,
 * hr, bold/italic/code and links, with all source HTML escaped first.
 */
function renderReportMarkdown(src: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) =>
    s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      )
      .replace(/\\([\\`*_[\]])/g, '$1');

  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const raw of src.split('\n')) {
    const line = raw.trimEnd();
    if (/^\s*$/.test(line)) {
      closeList();
      continue;
    }
    if (/^---+$/.test(line)) {
      closeList();
      out.push('<hr />');
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(escape(h[2]))}</h${lvl}>`);
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(escape(ul[1]))}</li>`);
      continue;
    }
    const bq = /^>\s?(.*)$/.exec(line);
    if (bq) {
      closeList();
      out.push(`<blockquote>${inline(escape(bq[1]))}</blockquote>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(escape(line))}</p>`);
  }
  closeList();
  return out.join('\n');
}
