'use client';

// ---------------------------------------------------------------------------
// ScenarioViewChips — one-tap saved-view recall row.
//
// Brief item M·02 #7: "Saved-view chips at the top — one tap loads, no
// modal, no list." Sits above the chart area; complements the existing
// ScenarioViewsMenu (which still owns save / delete / share). The chips
// surface the most-recently-updated views first; clicking applies the
// snapshot via the same applyState hook the menu uses, so behaviour is
// identical between the two surfaces.
//
// Empty state is silent — no view to load means no chip row at all,
// which keeps the chart-area chrome quiet for new users.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { useScenarioViews } from '@/lib/useScenarioViews';
import { SavedViewChip } from '@/components/ui/FilterPill';

type Props = {
  applyState: (state: unknown) => void;
  /** id of the view that's currently loaded (if any) — gives the chip an `active` outline. */
  activeViewId?: string | null;
  /** Cap on how many chips to render before the row scrolls. */
  max?: number;
  className?: string;
};

export default function ScenarioViewChips({
  applyState,
  activeViewId = null,
  max = 6,
  className = '',
}: Props) {
  const { views } = useScenarioViews();

  const visible = useMemo(() => {
    // Most recently updated first; cap at `max`. Anything past the cap is
    // still reachable through the existing ScenarioViewsMenu dropdown.
    return [...views]
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      .slice(0, max);
  }, [views, max]);

  if (visible.length === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Saved scenario views"
      className={`flex items-center gap-2 overflow-x-auto h-scroll ${className}`}
    >
      <span
        className="text-[var(--mh-muted)] uppercase tracking-wide font-semibold whitespace-nowrap pr-1"
        style={{ fontSize: 'var(--mh-text-2xs)', letterSpacing: 'var(--mh-tracking-wide)' }}
      >
        Quick load
      </span>
      {visible.map(v => (
        <SavedViewChip
          key={v.id}
          label={v.name}
          active={v.id === activeViewId}
          pinned={false}
          onClick={() => applyState(v.state)}
        />
      ))}
    </div>
  );
}
