/**
 * Bundled collaboration surface for one workspace target.
 * -------------------------------------------------------
 * Combines the verify/dispute control with the threaded comment box so a
 * module can expose full review + discussion for an item (indicator,
 * recommendation, member-state cell, policy) with a single component.
 * Both halves are independently DB-backed.
 */
'use client';

import VerifyControl from './VerifyControl';
import WorkspaceComments from './WorkspaceComments';

interface Props {
  projectId: string;
  target: { kind: string; id: string };
  /** Optional label describing what is being reviewed (e.g. the item name). */
  heading?: string;
  compact?: boolean;
}

export default function CollaborationPanel({ projectId, target, heading, compact }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs font-bold text-tertiary-dark uppercase tracking-wide">
          {heading ?? 'Review & discussion'}
        </p>
        <VerifyControl projectId={projectId} target={target} size={compact ? 'sm' : 'md'} />
      </div>
      <WorkspaceComments projectId={projectId} target={target} compact={compact} />
    </div>
  );
}
