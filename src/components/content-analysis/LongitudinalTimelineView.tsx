'use client';
/**
 * Timeline lens (M·05 "longitudinal" tab).
 * ----------------------------------------
 * Tracks how the *same* legal act changes across its successive consolidated
 * versions. The store freezes a `DocumentVersion` archive (blocks + text +
 * capturedAt) every time a document is re-ingested / re-uploaded, and
 * documents can be linked with `supersedes`. This view lays those out:
 *
 *   • Version history — per document with ≥1 archived version: a left-to-right
 *     timeline of every frozen snapshot plus the current live body, with the
 *     size delta (characters / blocks / pages) between consecutive versions so
 *     you can see where an act grew or shrank. Click a point to preview that
 *     frozen version in the reader.
 *
 *   • Supersession chains — separate documents linked by `supersedes` stitched
 *     into one oldest→newest sequence.
 *
 * Tags/segments anchor to the current body only, so this is a structural
 * timeline (what changed, when, by how much) — not a per-version tag count.
 */
import type { AnalysisDocument, DocumentVersion } from '@/lib/content-analysis/types';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function sourceLabel(source?: string): string {
  switch (source) {
    case 'eurlex-pdf':    return 'EUR-Lex PDF';
    case 'eurlex-html':   return 'EUR-Lex HTML';
    case 'manual-upload': return 'Uploaded';
    case 'fallback-text': return 'Shipped text';
    default:              return source ?? '—';
  }
}

interface TimelinePoint {
  key: string;
  /** null = the current live body. */
  versionId: string | null;
  label: string;
  capturedAt: string | null;
  source?: string;
  chars: number;
  blocks: number;
  pages?: number;
}

function pointsForDoc(doc: AnalysisDocument): TimelinePoint[] {
  const archived = [...(doc.versions ?? [])].sort((a, b) =>
    (a.capturedAt ?? '').localeCompare(b.capturedAt ?? ''),
  );
  const pts: TimelinePoint[] = archived.map((v: DocumentVersion) => ({
    key: v.id,
    versionId: v.id,
    label: v.label || (v.capturedAt ? fmtDate(v.capturedAt) : 'Version'),
    capturedAt: v.capturedAt ?? null,
    source: v.source,
    chars: (v.text ?? '').length,
    blocks: v.blocks?.length ?? 0,
    pages: v.pageCount,
  }));
  pts.push({
    key: 'current',
    versionId: null,
    label: 'Current',
    capturedAt: doc.ingestedAt ?? doc.adoptionDate ?? null,
    source: doc.ingestSource,
    chars: (doc.text ?? '').length,
    blocks: doc.blocks?.length ?? 0,
    pages: doc.pageCount,
  });
  return pts;
}

/** +N / -N / no change, coloured. */
function Delta({ value, unit }: { value: number; unit: string }) {
  if (value === 0) return <span className="text-[#8A95A3]">±0 {unit}</span>;
  const up = value > 0;
  return (
    <span className={up ? 'text-[#65A30D]' : 'text-[#B83230]'}>
      {up ? '+' : '−'}{Math.abs(value).toLocaleString()} {unit}
    </span>
  );
}

export default function LongitudinalTimelineView({
  documents,
  onOpenVersion,
}: {
  /** Documents in the current project scope. */
  documents: AnalysisDocument[];
  /** Jump to the coding view with this document (and optional frozen version)
   *  selected. `versionId === null` opens the current body. */
  onOpenVersion: (documentId: string, versionId: string | null) => void;
}) {
  const versioned = documents
    .filter(d => (d.versions?.length ?? 0) >= 1)
    .sort((a, b) => (a.shortTitle || a.title).localeCompare(b.shortTitle || b.title));

  // ── Supersession chains (cross-document) ───────────────────────────────────
  const byId = new Map(documents.map(d => [d.id, d]));
  const supersededIds = new Set(
    documents.map(d => d.supersedes).filter((x): x is string => !!x && byId.has(x)),
  );
  // A chain head is the newest doc: it replaces something in scope but nothing
  // in scope replaces it.
  const chains: AnalysisDocument[][] = [];
  for (const d of documents) {
    if (!d.supersedes || !byId.has(d.supersedes)) continue; // not a "newer" doc
    if (supersededIds.has(d.id)) continue;                  // not the head
    const chain: AnalysisDocument[] = [];
    let cur: AnalysisDocument | undefined = d;
    const guard = new Set<string>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      chain.unshift(cur); // build oldest → newest
      cur = cur.supersedes ? byId.get(cur.supersedes) : undefined;
    }
    if (chain.length >= 2) chains.push(chain);
  }

  if (versioned.length === 0 && chains.length === 0) {
    return (
      <div className="border border-dashed border-[#B8BCC2] rounded-sm bg-[#FBFBFA] p-5 sm:p-6 max-w-3xl">
        <h3 className="text-[18px] font-bold text-[#3D5265]">No version history yet</h3>
        <p className="mt-2 text-[13px] text-[#3D5265]/80 leading-relaxed">
          The workbench freezes a snapshot of a document each time it is re-ingested or re-uploaded —
          re-ingest an act&apos;s consolidated versions (from the <strong>Code</strong> tab) and they line up
          here as a timeline, with the size change between versions. Linking documents with{' '}
          <code className="text-[12px]">supersedes</code> stitches separate acts into one sequence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-bold text-[#3D5265]">Timeline — versions over time</h2>
        <p className="mt-1 text-[12.5px] text-[#3D5265]/75 max-w-3xl leading-relaxed">
          How each act has changed across its consolidated versions. Each point is a frozen snapshot;
          the delta shows how much text, structure and pages changed since the previous version. Click a
          point to preview that version in the reader.
        </p>
      </div>

      {versioned.length > 0 && (
        <div className="space-y-4">
          {versioned.map(doc => {
            const pts = pointsForDoc(doc);
            return (
              <div key={doc.id} className="border border-[#E6E7E8] rounded-sm bg-white overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA]">
                  <h3 className="text-[12.5px] font-bold text-[#3D5265] truncate">
                    {doc.shortTitle || doc.title}
                    {doc.celexNumber && (
                      <span className="ml-2 font-mono text-[10px] text-[#8A95A3]">CELEX {doc.celexNumber}</span>
                    )}
                  </h3>
                  <span className="shrink-0 font-mono text-[10px] tracking-[0.1em] uppercase text-[#8A95A3]">
                    {pts.length} version{pts.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="p-3 overflow-x-auto">
                  <ol className="flex items-stretch gap-0 min-w-max">
                    {pts.map((p, i) => {
                      const prev = i > 0 ? pts[i - 1] : null;
                      const isCurrent = p.versionId === null;
                      return (
                        <li key={p.key} className="flex items-stretch">
                          {prev && (
                            <div className="flex flex-col items-center justify-center px-2 min-w-[88px]">
                              <span className="text-[9px] text-[#8A95A3] uppercase tracking-wide">change</span>
                              <span className="text-[10px] leading-tight"><Delta value={p.chars - prev.chars} unit="ch" /></span>
                              <span className="text-[10px] leading-tight"><Delta value={p.blocks - prev.blocks} unit="blk" /></span>
                              <span aria-hidden className="text-[#D3D6DA] text-[14px] leading-none mt-0.5">→</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenVersion(doc.id, p.versionId)}
                            className={`text-left w-[150px] rounded-sm border px-2.5 py-2 transition hover:border-[#00928F] ${
                              isCurrent ? 'border-[#00928F] bg-[#00928F]/5' : 'border-[#E6E7E8] bg-white'
                            }`}
                            title="Preview this version in the reader"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                aria-hidden
                                className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-[#00928F]' : 'bg-[#B8BCC2]'}`}
                              />
                              <span className="text-[11.5px] font-semibold text-[#3D5265] truncate">{p.label}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-[#8A95A3]">{fmtDate(p.capturedAt)}</div>
                            <div className="mt-1 text-[10px] text-[#3D5265]/70 font-mono">
                              {p.chars.toLocaleString()} ch · {p.blocks} blk{p.pages ? ` · ${p.pages}p` : ''}
                            </div>
                            <div className="mt-0.5 text-[9px] text-[#8A95A3]">{sourceLabel(p.source)}</div>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {chains.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[13px] font-bold text-[#3D5265]">Supersession chains</h3>
          <p className="text-[11.5px] text-[#3D5265]/70 max-w-3xl">
            Separate documents linked by <code className="text-[11px]">supersedes</code>, oldest → newest.
          </p>
          {chains.map((chain, ci) => (
            <div key={ci} className="border border-[#E6E7E8] rounded-sm bg-white p-3 overflow-x-auto">
              <ol className="flex items-center gap-0 min-w-max">
                {chain.map((doc, i) => (
                  <li key={doc.id} className="flex items-center">
                    {i > 0 && <span aria-hidden className="text-[#D3D6DA] text-[16px] px-2">→</span>}
                    <button
                      type="button"
                      onClick={() => onOpenVersion(doc.id, null)}
                      className="text-left w-[180px] rounded-sm border border-[#E6E7E8] bg-white px-2.5 py-2 hover:border-[#00928F] transition"
                      title="Open this document"
                    >
                      <span className="text-[11.5px] font-semibold text-[#3D5265] block truncate">{doc.shortTitle || doc.title}</span>
                      <span className="text-[10px] text-[#8A95A3] block">{fmtDate(doc.adoptionDate)}</span>
                      {doc.celexNumber && (
                        <span className="font-mono text-[9px] text-[#8A95A3] block truncate">CELEX {doc.celexNumber}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
