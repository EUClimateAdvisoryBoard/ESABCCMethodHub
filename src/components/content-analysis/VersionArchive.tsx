'use client';

import type { AnalysisDocument, DocumentVersion } from '@/lib/content-analysis/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

interface Props {
  document: AnalysisDocument;
  /** Currently previewed version id (null = viewing the live document). */
  viewingVersionId: string | null;
  onPreview: (versionId: string | null) => void;
  onDelete: (versionId: string) => void;
}

/**
 * Radix-backed archive dropdown for the document header. Replaces the
 * hand-rolled click-outside overlay with @radix-ui/react-dropdown-menu
 * (keyboard nav, focus return, proper ARIA).
 */
export default function VersionArchive({
  document: doc,
  viewingVersionId,
  onPreview,
  onDelete,
}: Props) {
  const versions = doc.versions ?? [];

  if (versions.length === 0) {
    return (
      <span
        className="font-mono text-[10px] text-[#8A95A3] uppercase tracking-[0.1em]"
        title="Re-ingest or upload a new PDF to start archiving versions"
      >
        No archive yet
      </span>
    );
  }

  const sorted = [...versions].sort(
    (a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`text-[11px] font-medium px-1.5 py-0.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#00928F]/40 ${
            viewingVersionId
              ? 'bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]'
              : 'text-[#0065A4] hover:text-[#004B7F]'
          }`}
          title={viewingVersionId ? 'Previewing an archived version' : 'Show captured versions'}
        >
          {viewingVersionId ? 'Viewing archive ▾' : `Versions · ${versions.length} ▾`}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-[340px]">
        <DropdownMenuLabel>Archive · {versions.length} captured</DropdownMenuLabel>

        <div className="max-h-[60vh] overflow-y-auto">
          <CurrentRow doc={doc} active={viewingVersionId === null} onPick={() => onPreview(null)} />
          <DropdownMenuSeparator />
          {sorted.map(v => (
            <VersionRow
              key={v.id}
              version={v}
              active={viewingVersionId === v.id}
              onPreview={() => onPreview(v.id)}
              onDelete={() => {
                if (window.confirm('Delete this archived version? Cannot be undone.')) {
                  onDelete(v.id);
                }
              }}
            />
          ))}
        </div>

        {viewingVersionId && (
          <div className="px-3 py-2 border-t border-[#E6E7E8] bg-[#FFF7ED] text-[11px] text-[#B45309]">
            Previewing archived version · tagging disabled
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CurrentRow({
  doc,
  active,
  onPick,
}: {
  doc: AnalysisDocument;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`w-full text-left px-3 py-2 text-[12px] transition outline-none focus-visible:bg-[#F3F4F6] ${
        active ? 'bg-[#00928F]/10' : 'hover:bg-[#F3F4F6]'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-[#3D5265]">Current</span>
        <span className="font-mono text-[10px] text-[#8A95A3]">
          {doc.blocks?.length ?? 0} blocks · {doc.pageCount ?? '—'}p
        </span>
      </div>
      <p className="font-mono text-[10px] text-[#8A95A3] mt-0.5">
        {doc.ingestedAt ? new Date(doc.ingestedAt).toLocaleString() : 'not yet ingested'}
      </p>
    </button>
  );
}

function VersionRow({
  version,
  active,
  onPreview,
  onDelete,
}: {
  version: DocumentVersion;
  active: boolean;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const labelDate = version.label ?? version.capturedAt;
  let label = '';
  try {
    label = new Date(labelDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    label = String(labelDate).slice(0, 10);
  }
  return (
    <div className={`group px-3 py-2 ${active ? 'bg-[#FEF3C7]' : 'hover:bg-[#F3F4F6]'}`}>
      <button type="button" onClick={onPreview} className="w-full text-left outline-none">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-[12px] text-[#3D5265]">{label}</span>
          <span className="font-mono text-[10px] text-[#8A95A3]">
            {version.blocks.length} blocks · {version.pageCount ?? '—'}p
          </span>
        </div>
        <p className="font-mono text-[10px] text-[#8A95A3] mt-0.5 truncate">
          {version.source ?? '—'} · captured {new Date(version.capturedAt).toLocaleString()}
        </p>
      </button>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition text-[10px] text-[#B83230] hover:underline mt-1"
      >
        Delete version
      </button>
    </div>
  );
}
