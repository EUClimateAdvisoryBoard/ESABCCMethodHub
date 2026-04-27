'use client';

// ---------------------------------------------------------------------------
// StateView — first-class empty / loading / error / partial states.
//
// The brief: every list, chart and panel must ship all four states. Today
// many surfaces ship only happy-path + spinner. These components are the
// shared shape so the experience is consistent across modules.
//
//   <EmptyState
//     title="No references yet"
//     body="Drop a PDF, paste a DOI, or import from Zotero."
//     primaryAction={{ label: 'Drop a PDF', onClick: openDropzone }}
//     secondaryActions={[{ label: 'Try a sample', onClick: importSample }]}
//   />
//
//   <ErrorState
//     title="We couldn't reach Crossref"
//     body="The DOI lookup timed out after 8 s."
//     primaryAction={{ label: 'Retry', onClick: retry }}
//     hint="If this persists, the metadata service may be down."
//   />
//
//   <LoadingState label="Importing references…" />
//   <PartialState
//     summary="Showing 12 of 47 — some sources unavailable"
//     primaryAction={{ label: 'Retry missing', onClick: retry }}
//   />
//
// All four use the same visual language, the same alignment, and route
// through the same focus order. No surface is allowed to invent its own.
// ---------------------------------------------------------------------------

import { ReactNode } from 'react';

type ActionDescriptor = {
  label: string;
  onClick: () => void;
  href?: never;
} | {
  label: string;
  href: string;
  onClick?: never;
};

type BaseProps = {
  title?: string;
  body?: ReactNode;
  hint?: ReactNode;
  primaryAction?: ActionDescriptor;
  secondaryActions?: ActionDescriptor[];
  illustration?: ReactNode;
  className?: string;
};

function ActionButton({ action, variant = 'primary' }: { action: ActionDescriptor; variant?: 'primary' | 'secondary' }) {
  const className =
    variant === 'primary'
      ? 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white bg-[var(--mh-status-primary)] hover:opacity-90 mh-focus mh-motion-fast'
      : 'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-[var(--mh-fg)] bg-transparent border border-[var(--mh-border)] hover:border-[var(--mh-status-primary)] mh-focus mh-motion-fast';
  if ('href' in action && action.href) {
    return (
      <a href={action.href} className={className}>
        {action.label}
      </a>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

function StateShell({
  tone,
  title,
  body,
  hint,
  primaryAction,
  secondaryActions,
  illustration,
  className = '',
  role,
  ariaLive,
}: BaseProps & {
  tone: 'empty' | 'loading' | 'error' | 'partial';
  role?: 'status' | 'alert';
  ariaLive?: 'polite' | 'assertive' | 'off';
}) {
  // Tone → tint + (for partial/error) a small badge above the title.
  const toneBadge: Record<typeof tone, { label: string; cls: string } | null> = {
    empty:   null,
    loading: null,
    error:   { label: 'Error',   cls: 'mh-badge-danger'  },
    partial: { label: 'Partial', cls: 'mh-badge-warning' },
  };
  const badge = toneBadge[tone];
  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-busy={tone === 'loading' ? 'true' : undefined}
      className={`flex flex-col items-center text-center gap-3 px-6 py-10 rounded-lg border border-dashed border-[var(--mh-border)] bg-[var(--mh-card)] ${className}`}
    >
      {illustration ? <div className="mb-1">{illustration}</div> : null}
      {badge ? <span className={`mh-badge ${badge.cls}`}>{badge.label}</span> : null}
      {title ? (
        <h3
          className="text-[var(--mh-fg)] font-semibold"
          style={{ fontSize: 'var(--mh-text-lg)', lineHeight: 'var(--mh-leading-snug)' }}
        >
          {title}
        </h3>
      ) : null}
      {body ? (
        <p
          className="text-[var(--mh-muted)] max-w-md"
          style={{ fontSize: 'var(--mh-text-sm)', lineHeight: 'var(--mh-leading-base)' }}
        >
          {body}
        </p>
      ) : null}
      {(primaryAction || (secondaryActions && secondaryActions.length > 0)) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {primaryAction && <ActionButton action={primaryAction} variant="primary" />}
          {secondaryActions?.map((a, i) => <ActionButton key={i} action={a} variant="secondary" />)}
        </div>
      )}
      {hint ? (
        <p
          className="text-[var(--mh-muted)] mt-1 max-w-md"
          style={{ fontSize: 'var(--mh-text-xs)', lineHeight: 'var(--mh-leading-base)' }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyState(props: BaseProps) {
  return <StateShell tone="empty" role="status" ariaLive="polite" {...props} />;
}

export function ErrorState(props: BaseProps) {
  return <StateShell tone="error" role="alert" ariaLive="assertive" {...props} />;
}

export function PartialState(props: BaseProps & { summary?: string }) {
  const { summary, body, ...rest } = props;
  return <StateShell tone="partial" role="status" ariaLive="polite" body={summary ?? body} {...rest} />;
}

export function LoadingState({
  label = 'Loading…',
  className = '',
  inline = false,
}: { label?: string; className?: string; inline?: boolean }) {
  if (inline) {
    return (
      <span role="status" aria-live="polite" className={`inline-flex items-center gap-2 text-[var(--mh-muted)] ${className}`} style={{ fontSize: 'var(--mh-text-sm)' }}>
        <span aria-hidden="true" className="mh-skeleton inline-block" style={{ width: 14, height: 14, borderRadius: '50%' }} />
        {label}
      </span>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center gap-3 px-6 py-10 rounded-lg border border-dashed border-[var(--mh-border)] bg-[var(--mh-card)] ${className}`}
    >
      <span aria-hidden="true" className="mh-skeleton" style={{ width: 80, height: 8, borderRadius: 'var(--mh-radius-pill)' }} />
      <span className="text-[var(--mh-muted)]" style={{ fontSize: 'var(--mh-text-sm)' }}>{label}</span>
    </div>
  );
}
