# Component library

All reusable React components live under `src/components/`. UI
primitives sit in `src/components/ui/`; domain components at the
top level or in domain folders.

## UI primitives (`components/ui/`)

Headless or lightly-styled building blocks. Import from
`@/components/ui/<Name>`.

| Component | Purpose |
|-----------|---------|
| `Button` | Standard button with variants (primary, secondary, ghost, danger) |
| `Dialog` | Modal dialog built on Radix UI Dialog |
| `DropdownMenu` | Dropdown menu built on Radix UI DropdownMenu |
| `Tooltip` | Tooltip built on Radix UI Tooltip |
| `Skeleton` | Shimmer placeholder for loading states (Stack, Card, Block) |
| `EmptyState` | Consistent empty-state with primary/secondary actions |
| `ErrorState` | Error display with retry action |
| `LoadingState` | Full-page or inline loading indicator |
| `PartialState` | Partial data loaded, more available |
| `ToastHost` | Typed toast notifications (5 tones, undo support) |
| `ConfidenceDot` | At-a-glance confidence indicator (3 tiers) |
| `FilterPill` | Compact active-filter chip with clear action |
| `SavedViewChip` | Pinnable saved-view toggle |
| `FilterPillRow` | Sticky row of filter pills |
| `ModeSwitcher` | Task-verb tab switcher (Read / Code / Compare / Export) |
| `ProvenanceChip` | Source / lineage / lock / citation / trust chip |

See [Design system](design-system.md) for tokens, utility classes,
and usage examples.

## Navigation & layout

| Component | Path | Purpose |
|-----------|------|---------|
| `Navigation` | `components/Navigation.tsx` | Main site navigation header with module links |
| `SiteHeader` | `components/SiteHeader.tsx` | Header bar with logo, auth state, and settings |
| `SiteFooter` | `components/SiteFooter.tsx` | Footer with links and metadata |
| `MethodHubChrome` | `components/MethodHubChrome.tsx` | Chrome wrapper (nav, shortcuts); hidden on public ballot |
| `MobileBottomNav` | `components/MobileBottomNav.tsx` | Mobile bottom navigation bar |
| `PageHero` | `components/PageHero.tsx` | Reusable page header / hero section |
| `CommandPalette` | `components/CommandPalette.tsx` | Cmd+K global search and navigation |
| `KeyboardShortcuts` | `components/KeyboardShortcuts.tsx` | Keyboard shortcut cheat-sheet modal |
| `OnboardingTour` | `components/OnboardingTour.tsx` | First-time user guided tour |
| `ConsentBanner` | `components/ConsentBanner.tsx` | GDPR / cookie consent banner |

## Data visualisation

| Component | Path | Purpose |
|-----------|------|---------|
| `ConnectionGraph` | `components/ConnectionGraph.tsx` | D3 force-directed policy network graph |
| `PolicyNetworkGraph` | `components/PolicyNetworkGraph.tsx` | Interactive policy network with zoom, filter, selection |
| `ScenarioChart` | `components/ScenarioChart.tsx` | Climate scenario line chart (Chart.js) |
| `AnalyticsCharts` | `components/AnalyticsCharts.tsx` | Dashboard analytics with multiple chart types |
| `PolicyClock` | `components/PolicyClock.tsx` | Brussels calendar / legislative timeline |
| `LegislativeCalendar` | `components/LegislativeCalendar.tsx` | EU legislative calendar grid view |
| `PolicyGapExplorer` | `components/PolicyGapExplorer.tsx` | Compare policy ambition vs. scenario needs |
| `ClimadaExplorer` | `components/ClimadaExplorer.tsx` | Climate hazard data (CLIMADA) visualisation |
| `EurostatExplorer` | `components/EurostatExplorer.tsx` | Eurostat statistics browser with charts |
| `PypsaLeafletMap` | `components/PypsaLeafletMap.tsx` | Energy system Leaflet map (PyPSA results) |
| `MediaMonitoringMap` | `components/MediaMonitoringMap.tsx` | Media outlet geographic coverage map |
| `ScenarioExplorer` | `components/ScenarioExplorer.tsx` | Browse and filter climate scenarios |

## Policy components

| Component | Path | Purpose |
|-----------|------|---------|
| `PolicyCard` | `components/PolicyCard.tsx` | Policy summary card with domain badge and status |
| `MobilePolicyList` | `components/MobilePolicyList.tsx` | Mobile-optimised policy list view |
| `FullTextViewer` | `components/FullTextViewer.tsx` | Full policy text with inline annotations |
| `InlineAnnotator` | `components/InlineAnnotator.tsx` | Text selection to annotation flow |
| `AnnotationPanel` | `components/AnnotationPanel.tsx` | Sticky note annotation management panel |
| `ConnectionDetailPanel` | `components/ConnectionDetailPanel.tsx` | Side panel for viewing policy relationships |
| `ConnectionTypesLegend` | `components/ConnectionTypesLegend.tsx` | Legend for connection types (amends, cites, repeals) |
| `ConnectionsReviewTable` | `components/ConnectionsReviewTable.tsx` | Admin review table for policy connections |
| `EditConnectionModal` | `components/EditConnectionModal.tsx` | Edit policy relationship metadata |
| `CreateNetworkModal` | `components/CreateNetworkModal.tsx` | Create a custom policy network |
| `NetworkManager` | `components/NetworkManager.tsx` | Manage custom policy networks |
| `ConnectionArticleReveal` | `components/ConnectionArticleReveal.tsx` | Reveal policy connections from news articles |
| `ScenarioPolicyAlignment` | `components/ScenarioPolicyAlignment.tsx` | Compare policies to scenario pathways |
| `SuggestPolicyButton` | `components/SuggestPolicyButton.tsx` | Suggest a missing policy |
| `PolicyNewsFeed` | `components/PolicyNewsFeed.tsx` | News feed filtered to a specific policy |

## News & activity

| Component | Path | Purpose |
|-----------|------|---------|
| `SearchBar` | `components/SearchBar.tsx` | Text search input with debounce |
| `LinkPreview` | `components/LinkPreview.tsx` | OpenGraph link preview card |
| `ActivityFeed` | `components/ActivityFeed.tsx` | User activity log |
| `NewsLastVisitBanner` | `components/NewsLastVisitBanner.tsx` | "New since your last visit" time indicator |
| `NewsSavedSearchesPanel` | `components/NewsSavedSearchesPanel.tsx` | Manage saved news searches |
| `NotificationBell` | `components/NotificationBell.tsx` | Notification bell icon with dropdown |

## Cross-module

| Component | Path | Purpose |
|-----------|------|---------|
| `ContextDrawer` | `components/ContextDrawer.tsx` | Right-side panel showing cross-module related items |
| `ExplainabilityBadge` | `components/ExplainabilityBadge.tsx` | AI confidence / explainability "why?" popover |
| `AddToCollectionMenu` | `components/AddToCollectionMenu.tsx` | Add any artefact to a personal collection |
| `ApprovalProgress` | `components/ApprovalProgress.tsx` | Content approval workflow progress indicator |
| `BulkActionBar` | `components/BulkActionBar.tsx` | Multi-select bulk action toolbar |
| `ChangeHistory` | `components/ChangeHistory.tsx` | Document version / change history popover |
| `CommentSection` | `components/CommentSection.tsx` | Threaded discussion on any artefact |
| `UndoToastHost` | `components/UndoToastHost.tsx` | Legacy undo notification host (migrating to ToastHost) |
| `ScenarioViewChips` | `components/ScenarioViewChips.tsx` | Scenario view selector chips |
| `ScenarioViewsMenu` | `components/ScenarioViewsMenu.tsx` | Scenario grouping / filtering menu |

## Content Analysis (`components/content-analysis/`)

Specialised components for the MAXQDA-style qualitative coding
workbench (M·05). Includes `CodeSystemTree`, `SegmentList`,
`DocumentViewer`, `ProjectSidebar`, and approximately 20 additional
components for the coding workflow.

## Recommendations (`components/recommendations/`)

Components for the ESABCC policy recommendation tracker, including
recommendation cards, status filters, and implementation timelines.

## References (`components/references/`)

Components for the reference library UI, including reference cards,
PDF viewer overlays, and citation formatting previews.

## Charts (`components/charts/`)

Specialised chart components: `BarChart`, `BoxPlot`, `FanChart`,
`DiffChart`, `PolicyGapChart`, `WorldMap`, and Excel chart injection
utilities.
