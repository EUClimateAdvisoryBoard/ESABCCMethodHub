'use client';

/**
 * Report Audit — /references/audit-report
 * ---------------------------------------
 * Two ways to count the EU-funded share of references in our reports:
 *
 *   1. "Upload a finished report" — drop a .docx or .pdf, extract DOIs
 *      client-side, match against the shared library, compute the share.
 *      Useful for legacy reports and reports authored outside the add-in.
 *
 *   2. "Live (Word add-in)" — read the citations_used event log written by
 *      the add-in every time someone inserts a citation. Filterable by the
 *      Report Plan id (set per-document in Office.context.document.settings)
 *      so you can pin the view to a specific report.
 *
 * Both share the same headline tiles and funder leaderboard so the numbers
 * are comparable across the two modes.
 */

import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import { FundingEntry, isEuFunder } from '@/lib/references/types';

const DOI_RE = /\b10\.\d{4,9}\/[^\s,;()<>"'\]\[]+/gi;
const STRIP_TRAILING = /[.,;:)\]\}>"']+$/;

function normalizeDoi(raw: string): string {
  return raw.replace(STRIP_TRAILING, '').toLowerCase();
}

interface LibraryRef {
  id: string;
  doi: string;
  title: string;
  authors: string;
  year: string;
  funding?: FundingEntry[] | null;
}

interface Match {
  doi: string;
  matched: LibraryRef | null;
  isEuFunded: boolean;
  funders: FundingEntry[];
}

async function extractTextFromDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const doc = zip.file('word/document.xml');
  if (!doc) throw new Error('No word/document.xml inside the .docx — is this a valid Word file?');
  const xml = await doc.async('string');
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

async function extractTextFromPdf(file: File): Promise<string> {
  // Lazy-import react-pdf so its DOMMatrix-touching module code never runs in
  // Next's Node-side prerender pass.
  const { pdfjs } = await import('react-pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  let combined = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    combined += '\n' + content.items
      .map((it: unknown) =>
        it && typeof it === 'object' && 'str' in it
          ? String((it as { str: string }).str)
          : ''
      )
      .join(' ');
  }
  return combined;
}

function extractDois(text: string): string[] {
  const seen = new Set<string>();
  const matches = text.match(DOI_RE) || [];
  for (const m of matches) seen.add(normalizeDoi(m));
  return [...seen];
}

async function fetchLibrary(): Promise<LibraryRef[]> {
  const resp = await fetch('/api/references/library', { cache: 'no-store' });
  if (!resp.ok) throw new Error(`Could not load library (HTTP ${resp.status})`);
  const data = await resp.json();
  return Array.isArray(data?.references) ? data.references : [];
}

type Mode = 'upload' | 'live';

export default function ReportAuditPage() {
  const [mode, setMode] = useState<Mode>('upload');

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <PageHero
        title="Report audit — EU-funded share"
        subtitle={
          <>
            Count how many of the references cited in our reports come from
            EU-funded research. Pick a mode below: upload a finished{' '}
            <code>.docx</code>/<code>.pdf</code>, or read the live log of
            citations inserted via the Word add-in.
          </>
        }
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex gap-1 border-b border-grey-200" role="tablist">
          <TabButton active={mode === 'upload'} onClick={() => setMode('upload')}>
            Upload a finished report
          </TabButton>
          <TabButton active={mode === 'live'} onClick={() => setMode('live')}>
            Live (Word add-in)
          </TabButton>
        </div>

        {mode === 'upload' ? <UploadAuditView /> : <LiveAuditView />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
        active
          ? 'border-primary text-tertiary-dark'
          : 'border-transparent text-tertiary hover:text-tertiary-dark'
      }`}
    >
      {children}
    </button>
  );
}

// ── Upload mode ─────────────────────────────────────────────────────────────

function UploadAuditView() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setMatches(null);
    setFileName(file.name);
    try {
      const lower = file.name.toLowerCase();
      let text: string;
      if (lower.endsWith('.docx')) {
        text = await extractTextFromDocx(file);
      } else if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else {
        throw new Error('Unsupported file type — drop a .docx or .pdf.');
      }
      const dois = extractDois(text);
      if (dois.length === 0) {
        setMatches([]);
        return;
      }
      const library = await fetchLibrary();
      const byDoi = new Map<string, LibraryRef>();
      for (const r of library) {
        const d = (r.doi || '').toLowerCase();
        if (d) byDoi.set(d, r);
      }
      const results: Match[] = dois.map(doi => {
        const matched = byDoi.get(doi) || null;
        const funders = (matched?.funding || []) as FundingEntry[];
        return {
          doi,
          matched,
          funders,
          isEuFunded: funders.some(isEuFunder),
        };
      });
      setMatches(results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const total = matches?.length ?? 0;
  const matchedCount = matches?.filter(m => m.matched).length ?? 0;
  const withFunding = matches?.filter(m => m.funders.length > 0).length ?? 0;
  const euFundedCount = matches?.filter(m => m.isEuFunded).length ?? 0;
  const euShare = matchedCount > 0 ? euFundedCount / matchedCount : 0;
  const funderBreakdown = buildFunderBreakdown(matches?.flatMap(m => m.funders) || []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-tertiary">
        Drop a finished <code>.docx</code> or <code>.pdf</code> below. The file is read
        in your browser; nothing is uploaded.
      </p>

      <label
        className={`flex flex-col items-center justify-center gap-2 px-4 py-10 border-2 border-dashed rounded-lg text-sm cursor-pointer ${
          busy ? 'border-grey-200 text-tertiary' : 'border-grey-200 hover:border-primary text-tertiary-dark'
        }`}
      >
        <span className="font-medium">
          {busy ? 'Reading…' : 'Drop a .docx or .pdf, or click to choose'}
        </span>
        <span className="text-xs text-tertiary">
          We extract DOIs, match them to the shared library, and compute the EU-funded share.
        </span>
        <input
          type="file"
          accept=".docx,.pdf,application/pdf"
          className="hidden"
          disabled={busy}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
      </label>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-accent-red">
          {error}
        </div>
      )}

      {fileName && !busy && matches !== null && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Tile label="DOIs found" value={String(total)} hint={fileName} />
            <Tile label="Matched in library" value={String(matchedCount)} hint={`${total - matchedCount} unmatched`} />
            <Tile label="With funding metadata" value={String(withFunding)} hint="Of matched references" />
            <Tile
              label="EU-funded share"
              value={`${(euShare * 100).toFixed(0)}%`}
              hint={`${euFundedCount} / ${matchedCount} matched`}
              accent="#003399"
            />
          </section>

          <FunderLeaderboard breakdown={funderBreakdown} />

          <section>
            <h2 className="text-lg font-bold text-tertiary-dark mb-2">References ({total})</h2>
            <div className="overflow-x-auto bg-white border border-grey-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-grey-50 text-tertiary-dark">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">DOI</th>
                    <th className="text-left px-3 py-2 font-semibold">Matched reference</th>
                    <th className="text-left px-3 py-2 font-semibold">Funders</th>
                    <th className="text-left px-3 py-2 font-semibold">EU?</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <tr key={m.doi} className="border-t border-grey-100">
                      <td className="px-3 py-2 font-mono">{m.doi}</td>
                      <td className="px-3 py-2">
                        {m.matched ? (
                          <>
                            <div className="font-medium text-tertiary-dark">{m.matched.title}</div>
                            <div className="text-[10px] text-tertiary">
                              {m.matched.authors} · {m.matched.year}
                            </div>
                          </>
                        ) : (
                          <span className="text-tertiary italic">not in library</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {m.funders.length === 0 ? (
                          <span className="text-tertiary">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {m.funders.map((f, i) => (
                              <li key={i}>
                                {f.name}
                                {f.awards && f.awards.length > 0 && (
                                  <span className="text-tertiary"> · {f.awards.join(', ')}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-3 py-2">{m.isEuFunded && <EuBadge />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-tertiary mt-2">
              The EU-funded share is computed over <em>matched</em> references only. Unmatched
              DOIs are listed for transparency but excluded from the percentage — we don't have
              funding metadata for them.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

// ── Live mode ───────────────────────────────────────────────────────────────

interface UsageRow {
  id: string;
  reference_id: string;
  document_key: string;
  plan_id: string | null;
  doi: string | null;
  funding: FundingEntry[] | null;
  inserted_at: string;
}

interface UsageResponse {
  count: number;
  eu_funded: number;
  with_funding_metadata: number;
  eu_funded_share: number;
  citations: UsageRow[];
}

function LiveAuditView() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState<string>('');
  const [documentFilter, setDocumentFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (planFilter) params.set('plan_id', planFilter);
    if (documentFilter) params.set('document_key', documentFilter);
    const qs = params.toString();
    fetch(`/api/citations/used${qs ? `?${qs}` : ''}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()) || 'request failed'}`);
        return r.json() as Promise<UsageResponse>;
      })
      .then(d => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled && e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [planFilter, documentFilter]);

  const rows = data?.citations || [];
  const planOptions = [...new Set(rows.map(r => r.plan_id).filter(Boolean) as string[])].sort();
  const documentOptions = [...new Set(rows.map(r => r.document_key).filter(Boolean))].sort();
  const funderBreakdown = buildFunderBreakdown(
    rows.flatMap(r => (r.funding || []) as FundingEntry[]),
  );
  const total = data?.count ?? 0;
  const euCount = data?.eu_funded ?? 0;
  const withFunding = data?.with_funding_metadata ?? 0;
  // Match the "matched only" denominator used by the upload view: rows
  // without funding metadata can't be classified, so we exclude them.
  const denom = withFunding;
  const euShare = denom > 0 ? euCount / denom : 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-tertiary">
        Every time someone inserts a citation via the Word add-in, a row is recorded in{' '}
        <code>citations_used</code>. This view aggregates that log so you can see the EU-funded
        share for a specific Report Plan or document, without re-extracting DOIs.
      </p>

      <section className="bg-white border border-grey-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[11px] uppercase tracking-wide text-tertiary mb-1">Report plan</label>
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-sm text-tertiary-dark"
          >
            <option value="">All plans</option>
            {planOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[11px] uppercase tracking-wide text-tertiary mb-1">Document</label>
          <select
            value={documentFilter}
            onChange={e => setDocumentFilter(e.target.value)}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-sm text-tertiary-dark"
          >
            <option value="">All documents</option>
            {documentOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </section>

      {loading && <p className="text-sm text-tertiary">Loading citation log…</p>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-accent-red">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Tile label="Citations inserted" value={String(total)} hint="In selected scope" />
            <Tile label="With funding metadata" value={String(withFunding)} hint={`${total - withFunding} unknown`} />
            <Tile label="EU-funded" value={String(euCount)} hint="With known EU funder" />
            <Tile
              label="EU-funded share"
              value={denom > 0 ? `${(euShare * 100).toFixed(0)}%` : '—'}
              hint={denom > 0 ? `${euCount} / ${withFunding} classified` : 'No classifiable rows'}
              accent="#003399"
            />
          </section>

          <FunderLeaderboard breakdown={funderBreakdown} />

          <section>
            <h2 className="text-lg font-bold text-tertiary-dark mb-2">Citations ({total})</h2>
            <div className="overflow-x-auto bg-white border border-grey-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-grey-50 text-tertiary-dark">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Inserted</th>
                    <th className="text-left px-3 py-2 font-semibold">Reference</th>
                    <th className="text-left px-3 py-2 font-semibold">Document</th>
                    <th className="text-left px-3 py-2 font-semibold">Plan</th>
                    <th className="text-left px-3 py-2 font-semibold">Funders</th>
                    <th className="text-left px-3 py-2 font-semibold">EU?</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-tertiary">
                        No citations recorded yet for this scope.
                      </td>
                    </tr>
                  )}
                  {rows.map(r => {
                    const funders = (r.funding || []) as FundingEntry[];
                    const isEu = funders.some(isEuFunder);
                    return (
                      <tr key={r.id} className="border-t border-grey-100">
                        <td className="px-3 py-2 whitespace-nowrap text-tertiary">
                          {new Date(r.inserted_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-mono text-[10px] text-tertiary-dark">{r.reference_id}</div>
                          {r.doi && <div className="text-[10px] text-tertiary">{r.doi}</div>}
                        </td>
                        <td className="px-3 py-2 truncate max-w-[180px]" title={r.document_key}>
                          {r.document_key}
                        </td>
                        <td className="px-3 py-2">{r.plan_id || <span className="text-tertiary">—</span>}</td>
                        <td className="px-3 py-2">
                          {funders.length === 0 ? (
                            <span className="text-tertiary">—</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {funders.map((f, i) => (
                                <li key={i}>{f.name}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-3 py-2">{isEu && <EuBadge />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-tertiary mt-2">
              Share is computed over rows with known funding metadata. Citations without a
              recorded funder are listed but not counted toward the EU-funded share.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────

function buildFunderBreakdown(
  funders: FundingEntry[],
): { name: string; count: number; isEu: boolean }[] {
  const counts = new Map<string, { count: number; isEu: boolean }>();
  for (const f of funders) {
    const key = f.name || f.doi || 'Unknown';
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { count: 1, isEu: isEuFunder(f) });
  }
  return [...counts.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count);
}

function FunderLeaderboard({
  breakdown,
}: {
  breakdown: { name: string; count: number; isEu: boolean }[];
}) {
  if (breakdown.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-bold text-tertiary-dark mb-2">Funders cited</h2>
      <div className="bg-white border border-grey-200 rounded-lg p-4 space-y-2">
        {breakdown.map(f => (
          <div key={f.name} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-tertiary-dark">
              {f.name}
              {f.isEu && (
                <span className="ml-2 text-[10px] text-[#003399] font-semibold uppercase tracking-wide">
                  EU
                </span>
              )}
            </span>
            <span className="text-xs text-tertiary">
              {f.count} citation{f.count === 1 ? '' : 's'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EuBadge() {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#003399] text-white">
      EU
    </span>
  );
}

function Tile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white border border-grey-200 rounded-lg p-4">
      <p className="text-2xl font-bold" style={accent ? { color: accent } : { color: '#007B6C' }}>
        {value}
      </p>
      <p className="text-xs text-tertiary-dark font-semibold">{label}</p>
      {hint && <p className="text-[10px] text-tertiary truncate">{hint}</p>}
    </div>
  );
}
