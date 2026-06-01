/**
 * Project Workspace — seed projects and their module catalogues.
 * ----------------------------------------------------------------
 * The workspace lets Secretariat users group analytical work into
 * "projects" (e.g. Policy Gap 2.0, Industry Project). Each project has
 * its own set of modules; today these are stubs that point at the
 * built-in seed data, but they are designed to be user-extensible
 * through the workspace UI.
 *
 * Persistence: the in-page state (new projects, new modules, indicator
 * overrides, recommendation status, sectoral-overview annotations) is
 * stored in localStorage under the keys exported from
 * `src/lib/workspace-storage.ts`. A future migration to Supabase can
 * import the same shapes.
 */

export type WorkspaceModuleKind =
  | 'indicators'
  | 'recommendations'
  | 'member-states'
  | 'policy-analysis'
  | 'custom';

export interface WorkspaceModule {
  id: string;
  kind: WorkspaceModuleKind;
  name: string;
  description: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  shortDescription: string;
  modules: WorkspaceModule[];
  isSeed: boolean;
}

export const SEED_PROJECTS: WorkspaceProject[] = [
  {
    id: 'policy-gap-2-0',
    name: 'Policy Gap 2.0',
    shortDescription:
      'Successor analysis to the 2024 ESABCC progress report — indicators, ' +
      'recommendation tracking, member-state space and sectoral policy analysis.',
    isSeed: true,
    modules: [
      {
        id: 'indicators',
        kind: 'indicators',
        name: 'Indicator database',
        description:
          'EU-level progress indicators (ECNO framework + custom). ' +
          'Table + chart view, editable in the UI.',
      },
      {
        id: 'recommendations',
        kind: 'recommendations',
        name: 'Past recommendations tracker',
        description:
          'Recommendations from the 2024 ESABCC progress report, with ' +
          'status and dated uptake events.',
      },
      {
        id: 'member-states',
        kind: 'member-states',
        name: 'Member state space',
        description:
          'EEA-style profile for each EU-27 member state: choropleth ' +
          'map, indicator heatmap and full per-country detail page ' +
          'with editor and external-contributor workflow.',
      },
      {
        id: 'policy-analysis',
        kind: 'policy-analysis',
        name: 'Policy analysis',
        description:
          'Sectoral policy review. Mirrors the Sectoral overview in the ' +
          'EU Policy Navigator; edits made here propagate to the navigator.',
      },
    ],
  },
  {
    id: 'industry-project',
    name: 'Industry Project',
    shortDescription:
      'Analytical workspace dedicated to industrial decarbonisation. ' +
      'Modules to be added as the project scope is defined.',
    isSeed: true,
    modules: [],
  },
];
