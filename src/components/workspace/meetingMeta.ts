/**
 * Shared presentation metadata for the Meetings module.
 * -----------------------------------------------------
 * Labels, colours and icons for meeting types, milestone types and milestone
 * statuses. Kept in one pure module so both the editor (MeetingsModule) and
 * the timeline chart (MeetingsTimeline) render them identically.
 */

export interface Meta {
  label: string;
  /** Hex used for timeline markers / chart fills. */
  color: string;
  /** Tailwind classes for inline badges. */
  badge: string;
  icon: string;
}

export const MEETING_TYPES: Record<string, Meta> = {
  team: { label: 'Team meeting', color: '#004B7F', badge: 'bg-primary/10 text-primary', icon: '👥' },
  subgroup: { label: 'Subgroup meeting', color: '#007B6C', badge: 'bg-secondary/10 text-secondary', icon: '🔬' },
  champion: { label: 'Champion meeting', color: '#6667AB', badge: 'bg-[#6667AB]/10 text-[#6667AB]', icon: '⭐' },
  publication: { label: 'Publication meeting', color: '#A530B8', badge: 'bg-[#A530B8]/10 text-[#A530B8]', icon: '📄' },
  external: { label: 'External meeting', color: '#FF9933', badge: 'bg-accent-orange/15 text-[#B5651D]', icon: '🌍' },
  plenary: { label: 'Plenary', color: '#00928F', badge: 'bg-[#00928F]/10 text-[#00928F]', icon: '🏛️' },
  other: { label: 'Other', color: '#54728C', badge: 'bg-grey-100 text-tertiary', icon: '📌' },
};

export const MILESTONE_TYPES: Record<string, Meta> = {
  publication: { label: 'Publication', color: '#A530B8', badge: 'bg-[#A530B8]/10 text-[#A530B8]', icon: '📄' },
  subgroup: { label: 'Subgroup', color: '#007B6C', badge: 'bg-secondary/10 text-secondary', icon: '🔬' },
  champion: { label: 'Champion', color: '#6667AB', badge: 'bg-[#6667AB]/10 text-[#6667AB]', icon: '⭐' },
  review: { label: 'Review', color: '#004B7F', badge: 'bg-primary/10 text-primary', icon: '✓' },
  deadline: { label: 'Deadline', color: '#B83230', badge: 'bg-accent-red/10 text-accent-red', icon: '⏰' },
  other: { label: 'Other', color: '#54728C', badge: 'bg-grey-100 text-tertiary', icon: '📌' },
};

export const MILESTONE_STATUS: Record<string, Meta> = {
  planned: { label: 'Planned', color: '#808285', badge: 'bg-grey-100 text-tertiary', icon: '○' },
  'in-progress': { label: 'In progress', color: '#0065A4', badge: 'bg-primary/10 text-primary', icon: '◐' },
  done: { label: 'Done', color: '#007B6C', badge: 'bg-secondary/10 text-secondary', icon: '●' },
  'at-risk': { label: 'At risk', color: '#B83230', badge: 'bg-accent-red/10 text-accent-red', icon: '!' },
};

export const MEETING_TYPE_OPTIONS = Object.entries(MEETING_TYPES).map(([id, m]) => ({ id, label: m.label }));
export const MILESTONE_TYPE_OPTIONS = Object.entries(MILESTONE_TYPES).map(([id, m]) => ({ id, label: m.label }));
export const MILESTONE_STATUS_OPTIONS = Object.entries(MILESTONE_STATUS).map(([id, m]) => ({ id, label: m.label }));

export function metaOf(map: Record<string, Meta>, key: string): Meta {
  return map[key] ?? map.other ?? Object.values(map)[0];
}

/** Format an ISO date / timestamp as e.g. "14 Jun 2026". */
export function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
