/**
 * Workspace module metadata — the friendly face of each module kind.
 * ------------------------------------------------------------------
 * One place that maps every `WorkspaceModuleKind` to a plain-language
 * label, a one-line "what you do here" blurb, an icon and an accent
 * colour. Shared by the landing-page project cards, the project tab
 * bar and the Add-module picker so non-technical team members see the
 * same vocabulary and the same icons everywhere.
 *
 * Icons are inline stroke SVGs (24×24, `currentColor`) to match the
 * rest of the app, which ships no icon library.
 */
import type { WorkspaceModuleKind } from '@/data/project-workspace';

export interface ModuleMeta {
  /** Short, friendly label shown on tabs and chips. */
  label: string;
  /** One sentence in plain language: what a team member does here. */
  blurb: string;
  /** Accent colour (hex) used for the icon tint on cards. */
  accent: string;
  /** Soft background tint behind the icon on cards. */
  accentBg: string;
  Icon: (props: { className?: string }) => JSX.Element;
}

const IconBase = (
  { className, children }: { className?: string; children: React.ReactNode },
) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {children}
  </svg>
);

const IndicatorsIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M4 19V5M4 19h16" />
    <path d="M8 19v-5M12 19v-9M16 19v-3M20 19V9" />
  </IconBase>
);

const ContentAnalysisIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </IconBase>
);

const MemberStatesIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
  </IconBase>
);

const RecommendationsIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <rect x="6" y="4" width="12" height="16" rx="2" />
    <path d="M9 4V3h6v1" />
    <path d="M9 12l2 2 4-4" />
  </IconBase>
);

const MeetingsIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M4 9h16M8 3v4M16 3v4" />
  </IconBase>
);

const LiteratureWatchIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M12 6c-1.5-1.3-3.5-2-6-2H4v14h2c2.5 0 4.5.7 6 2 1.5-1.3 3.5-2 6-2h2V4h-2c-2.5 0-4.5.7-6 2Z" />
    <path d="M12 6v14" />
  </IconBase>
);

const ReportPageIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M4 4h9l7 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="M13 4v7h7" />
    <path d="M7 15h7" />
  </IconBase>
);

const NotesIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </IconBase>
);

const FALLBACK: ModuleMeta = {
  label: 'Module',
  blurb: 'A tool inside this project.',
  accent: '#3D5265',
  accentBg: '#EDF1F2',
  Icon: NotesIcon,
};

export const MODULE_META: Record<WorkspaceModuleKind, ModuleMeta> = {
  indicators: {
    label: 'Indicators',
    blurb: 'Track the numbers and charts behind your analysis — view them as a table or a chart, and refresh from the source.',
    accent: '#004B7F',
    accentBg: '#F2F6F8',
    Icon: IndicatorsIcon,
  },
  'content-analysis': {
    label: 'Content analysis',
    blurb: 'Read documents and highlight key passages, then tag them so the team can compare findings.',
    accent: '#007B6C',
    accentBg: '#EDF1F2',
    Icon: ContentAnalysisIcon,
  },
  // Legacy id — renders the same Content Analysis workbench.
  'policy-analysis': {
    label: 'Content analysis',
    blurb: 'Read documents and highlight key passages, then tag them so the team can compare findings.',
    accent: '#007B6C',
    accentBg: '#EDF1F2',
    Icon: ContentAnalysisIcon,
  },
  'member-states': {
    label: 'Member states',
    blurb: 'Compare the 27 EU countries side by side — on a map, a heatmap, and one detail page per country.',
    accent: '#00928F',
    accentBg: '#EDF1F2',
    Icon: MemberStatesIcon,
  },
  recommendations: {
    label: 'Recommendations',
    blurb: 'Follow each Advisory-Board recommendation and whether it has been taken up over time.',
    accent: '#6667AB',
    accentBg: '#F2F6F8',
    Icon: RecommendationsIcon,
  },
  meetings: {
    label: 'Meetings & progress',
    blurb: 'Plan meetings and milestones, and see at a glance how far the project has come.',
    accent: '#B86A00',
    accentBg: '#FFF4DB',
    Icon: MeetingsIcon,
  },
  'literature-watch': {
    label: 'Literature watch',
    blurb: 'New journal articles matched to this project every morning — browse the suggestions and read the daily screening report.',
    accent: '#7A3E9D',
    accentBg: '#F4EFF8',
    Icon: LiteratureWatchIcon,
  },
  'report-page': {
    label: 'Report page',
    blurb: 'A page of this project’s report — what is on it, and a link that opens it.',
    accent: '#B83230',
    accentBg: '#FBEFEF',
    Icon: ReportPageIcon,
  },
  custom: {
    label: 'Notes',
    blurb: 'A free-form space for notes, write-ups and anything that does not fit the other tools.',
    accent: '#3D5265',
    accentBg: '#EDF1F2',
    Icon: NotesIcon,
  },
};

export function moduleMeta(kind: WorkspaceModuleKind): ModuleMeta {
  return MODULE_META[kind] ?? FALLBACK;
}
