'use client';

/**
 * Report Audit — /references/audit-report
 * ---------------------------------------
 * Drop a finished `.docx` or `.pdf`, get back the EU-funded share of the
 * references it cites. Counterpart to the live `citations_used` log fed by
 * the Word add-in: this is the "look at a document we never wrote with the
 * add-in" path.
 *
 * Pipeline (entirely client-side):
 *   1. Read the file as ArrayBuffer.
 *   2. Extract every DOI string with a permissive regex.
 *      - .docx → JSZip → word/document.xml → strip tags.
 *      - .pdf  → pdfjs-dist → concat all pages' text content.
 *   3. Fetch the shared library (`GET /api/references/library`) and match
 *      DOIs against it.
 *   4. Run `isEuFunder()` over each matched reference's funding[] array and
 *      report counts + a per-funder breakdown.
 *
 * The page intentionally does no server-side work and does not mutate state
 * — it's a read-only audit so it's safe to drop a draft report here without
 * leaking it.
 */

import { useState } from 'react';
import JSZip from 'jszip';
import { pdfjs } from 'react-pdf';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import { FundingEntry, isEuFunder } from '@/lib/references/types';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// CrossRef DOIs follow `10.<registrant>/<suffix>`. The character class is
// deliberately permissive on the suffix side and trimmed afterwards so we
// don't drop trailing punctuation found in PDF/Word text runs.
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
  // Cheap XML-to-text: drop tags, normalise whitespace. We only need text
  // for DOI detection, not faithful rendering.
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

async function extractTextFromPdf(file: File): Promise<string> {
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

export default function ReportAuditPage() {
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

  // Aggregate counters: only references the audit could resolve count toward
  // the EU-funded share — DOIs we can't find in the library tell us nothing
  // about funding, and lumping them in would understate the percentage.
  const total = matches?.length ?? 0;
  const matchedCount = matches?.filter(m => m.matched).length ?? 0;
  const withFunding = matches?.filter(m => m.funders.length > 0).length ?? 0;
  const euFundedCount = matches?.filter(m => m.isEuFunded).length ?? 0;
  const euShare = matchedCount > 0 ? euFundedCount / matchedCount : 0;

  // Funder leaderboard for the "where is the EU money coming from" view.
  const funderBreakdown = (() => {
    const counts = new Map<string, { count: number; isEu: boolean }>();
    for (const m of matches || []) {
      for (const f of m.funders) {
        const key = f.name || f.doi || 'Unknown';
        const prev = counts.get(key);
        if (prev) prev.count += 1;
        else counts.set(key, { count: 1, isEu: isEuFunder(f) });
      }
    }
    return [...counts.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count);
  })();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <PageHero
        title="Report audit — EU-funded share"
        subtitle={
          <>
            Drop a finished <code>.docx</code> or <code>.pdf</code> to count how
            many of its cited references come from EU-funded research, based on
            the funder metadata in the shared library. Runs entirely in your
            browser; the file never leaves the page.
          </>
        }
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
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
            {/* Headline tiles */}
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

            {/* Funder leaderboard */}
            {funderBreakdown.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-tertiary-dark mb-2">Funders cited</h2>
                <div className="bg-white border border-grey-200 rounded-lg p-4 space-y-2">
                  {funderBreakdown.map(f => (
                    <div key={f.name} className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-tertiary-dark">
                        {f.name}
                        {f.isEu && (
                          <span className="ml-2 text-[10px] text-[#003399] font-semibold uppercase tracking-wide">
                            EU
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-tertiary">{f.count} citation{f.count === 1 ? '' : 's'}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Per-DOI table */}
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
                        <td className="px-3 py-2">
                          {m.isEuFunded && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#003399] text-white">
                              EU
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-tertiary mt-2">
                The EU-funded share is computed over <em>matched</em> references only. Unmatched DOIs
                are listed for transparency but excluded from the percentage — we don't have funding
                metadata for them.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
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
