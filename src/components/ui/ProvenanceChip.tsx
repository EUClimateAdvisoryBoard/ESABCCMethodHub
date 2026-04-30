'use client';

// ---------------------------------------------------------------------------
// ProvenanceChip — the universal "where did this come from / who owns it
// now" surface (foundation for items 1.6 / 2.4 / 3.3 / 4.6 / 5.3 in
// docs/vision/brainstorm-modules-uxui-feasibility-rank.md).
//
// Five kinds, each tied to the system-status taxonomy:
//
//   • source    — primary data source (IIASA, EUR-Lex, EEA, …)        info
//   • lineage   — who uploaded / when / which dataset                   primary
//   • lock      — who currently holds an editing lock                   warning
//   • citation  — backlink count ("cited in 12 places")                 success
//   • trust     — credibility tier (primary / secondary / tertiary / community)
//
// Compact form: an icon + a 1–2 word label + an optional count.
// Hover: a Radix tooltip with the full chain (label, owner, timestamp,
// link). The chip is keyboard-focusable and exposes the full chain to
// screen readers via aria-label.
// ---------------------------------------------------------------------------

import { ReactNode } from 'react';
import { Tooltip } from './Tooltip';

export type ProvenanceKind = 'source' | 'lineage' | 'lock' | 'citation' | 'trust';
export type TrustTier = 'primary' | 'secondary' | 'tertiary' | 'community';

type CommonProps = {
  /** Short visible label, e.g. "IIASA AR6" or "Maria F." */
  label: string;
  /** Optional count badge (e.g. citation count). */
  count?: number;
  /** Detail block rendered inside the tooltip. */
  detail?: ReactNode;
  /** If set, chip becomes a link. */
  href?: string;
  /** Click handler — alternative to href. */
  onClick?: () => void;
  className?: string;
};

type SourceChip   = CommonProps & { kind: 'source'; iconChar?: string };
type LineageChip  = CommonProps & { kind: 'lineage'; uploader?: string; uploadedAt?: string | Date };
type LockChip     = CommonProps & { kind: 'lock'; holder: string; heartbeatAt?: string | Date };
type CitationChip = CommonProps & { kind: 'citation' };
type TrustChip    = CommonProps & { kind: 'trust'; tier: TrustTier };

export type ProvenanceChipProps =
  | SourceChip
  | LineageChip
  | LockChip
  | CitationChip
  | TrustChip;

// ---- Tone tokens -----------------------------------------------------------

const KIND_TONE: Record<ProvenanceKind, { bg: string; fg: string; border: string }> = {
  source:   { bg: 'var(--mh-status-info-bg)',     fg: 'var(--mh-status-info)',     border: 'var(--mh-status-info)' },
  lineage:  { bg: 'var(--mh-status-primary-bg)',  fg: 'var(--mh-status-primary)',  border: 'var(--mh-status-primary)' },
  lock:     { bg: 'var(--mh-status-warning-bg)',  fg: 'var(--mh-status-warning)',  border: 'var(--mh-status-warning)' },
  citation: { bg: 'var(--mh-status-success-bg)',  fg: 'var(--mh-status-success)',  border: 'var(--mh-status-success)' },
  trust:    { bg: 'var(--mh-card)',               fg: 'var(--mh-fg)',              border: 'var(--mh-border)' },
};

// Trust tier overrides — colour band reflects credibility.
const TRUST_TIER_TONE: Record<TrustTier, { bg: string; fg: string; border: string; dotChar: string }> = {
  primary:   { bg: 'var(--mh-status-success-bg)', fg: 'var(--mh-status-success)', border: 'var(--mh-status-success)', dotChar: '●' },
  secondary: { bg: 'var(--mh-status-info-bg)',    fg: 'var(--mh-status-info)',    border: 'var(--mh-status-info)',    dotChar: '●' },
  tertiary:  { bg: 'var(--mh-status-warning-bg)', fg: 'var(--mh-status-warning)', border: 'var(--mh-status-warning)', dotChar: '◐' },
  community: { bg: 'var(--mh-bg)',                fg: 'var(--mh-muted)',          border: 'var(--mh-border)',         dotChar: '○' },
};

const KIND_ICON: Record<ProvenanceKind, string> = {
  source:   '◧',
  lineage:  '◇',
  lock:     '🔒',
  citation: '↗',
  trust:    '●',
};

// ---- Helpers ---------------------------------------------------------------

function formatRelative(value: string | Date | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  const seconds = (Date.now() - d.getTime()) / 1000;
  if (seconds < 60)        return 'just now';
  if (seconds < 60 * 60)   return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 60 * 60 * 24)   return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 60 * 60 * 24 * 7) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toISOString().slice(0, 10);
}

function buildAria(props: ProvenanceChipProps): string {
  switch (props.kind) {
    case 'source':   return `Source: ${props.label}`;
    case 'lineage':  return `Lineage: ${props.label}${props.uploader ? `, uploaded by ${props.uploader}` : ''}`;
    case 'lock':     return `Locked by ${props.holder}`;
    case 'citation': return `Cited in ${props.count ?? 0} place${props.count === 1 ? '' : 's'}`;
    case 'trust':    return `Source tier: ${props.tier} — ${props.label}`;
  }
}

function defaultDetail(props: ProvenanceChipProps): ReactNode {
  switch (props.kind) {
    case 'lineage': {
      const rel = formatRelative(props.uploadedAt);
      return (
        <div className="space-y-0.5">
          <div className="font-semibold">{props.label}</div>
          {props.uploader ? <div>Uploaded by {props.uploader}</div> : null}
          {rel ? <div className="opacity-80">{rel}</div> : null}
        </div>
      );
    }
    case 'lock': {
      const rel = formatRelative(props.heartbeatAt);
      return (
        <div className="space-y-0.5">
          <div className="font-semibold">Locked by {props.holder}</div>
          {rel ? <div className="opacity-80">Heartbeat {rel}</div> : null}
        </div>
      );
    }
    case 'citation':
      return <div className="font-semibold">Click to see backlinks</div>;
    case 'trust':
      return (
        <div className="space-y-0.5">
          <div className="font-semibold capitalize">{props.tier} source</div>
          <div className="opacity-80">{props.label}</div>
        </div>
      );
    case 'source':
      return <div className="font-semibold">{props.label}</div>;
  }
}

// ---- Component -------------------------------------------------------------

export default function ProvenanceChip(props: ProvenanceChipProps) {
  const { label, count, detail, href, onClick, className = '' } = props;
  const tone =
    props.kind === 'trust' ? TRUST_TIER_TONE[props.tier] : KIND_TONE[props.kind];
  const icon =
    props.kind === 'trust'
      ? TRUST_TIER_TONE[props.tier].dotChar
      : props.kind === 'source' && (props as SourceChip).iconChar
      ? (props as SourceChip).iconChar!
      : KIND_ICON[props.kind];

  const interactive = Boolean(href || onClick);
  const aria = buildAria(props);

  const inner = (
    <span
      role="img"
      aria-label={aria}
      className={[
        'mh-focus mh-motion-fast inline-flex items-center gap-1 rounded-full border whitespace-nowrap align-middle',
        interactive ? 'cursor-pointer hover:brightness-95' : '',
        className,
      ].join(' ')}
      style={{
        background: tone.bg,
        color: tone.fg,
        borderColor: tone.border,
        fontSize: 'var(--mh-text-2xs)',
        padding: '2px 8px',
        minHeight: 20,
        lineHeight: 1.2,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 11 }}>{icon}</span>
      <span className="truncate max-w-[180px]">{label}</span>
      {typeof count === 'number' && count > 0 ? (
        <span
          aria-hidden="true"
          className="mh-tnum"
          style={{
            marginLeft: 2,
            padding: '0 6px',
            borderRadius: 999,
            background: tone.fg,
            color: '#fff',
            fontSize: 10,
            minWidth: 16,
            textAlign: 'center',
          }}
        >
          {count}
        </span>
      ) : null}
    </span>
  );

  // Wrap in tooltip with full detail. Always show a tooltip — provenance is
  // most useful on hover.
  const tip = detail ?? defaultDetail(props);
  const wrapped = <Tooltip content={tip} side="top">{inner}</Tooltip>;

  if (href) {
    return (
      <a href={href} aria-label={aria} className="inline-flex">
        {wrapped}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={aria} className="inline-flex bg-transparent p-0 border-0">
        {wrapped}
      </button>
    );
  }
  return wrapped;
}
