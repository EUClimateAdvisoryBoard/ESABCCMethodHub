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
  // `policy-analysis` is the legacy id, retained for backward-compatibility
  // with module rows seeded before the Content Analysis rework. It now
  // renders the same MAXQDA-style Content Analysis workbench.
  | 'policy-analysis'
  | 'content-analysis'
  | 'meetings'
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
          'Two clusters: existing indicators rebuilt from the 2024 ESABCC ' +
          'progress report (Towards EU climate neutrality), and additional ' +
          'indicators covering the ECNO building blocks. Table + chart view, ' +
          'editable in the UI; "Refresh from source" pulls updates from ' +
          'Eurostat / EEA / EAFO / IRENA / EHPA.',
      },
      {
        id: 'recommendations',
        kind: 'recommendations',
        name: 'Past recommendations tracker',
        description:
          'Recommendations from every ESABCC report, with status and dated ' +
          'uptake events.',
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
        id: 'content-analysis',
        kind: 'content-analysis',
        name: 'Content analysis',
        description:
          'MAXQDA-style qualitative coding for this project. Choose a source — ' +
          'the EU policy corpus, scientific literature or grey literature & ' +
          'reports — then mark passages and attach tags & codes. Tags save ' +
          'live and build on the shared master library, with lenses to compare ' +
          'what each project is coding.',
      },
    ],
  },
  {
    id: 'industry-project',
    name: 'Industry Project',
    shortDescription:
      'Analytical workspace dedicated to industrial decarbonisation — taken in ' +
      'the wider sense of industry (energy-intensive sectors, carbon pricing & ' +
      'leakage, hydrogen and CCU/CCS, clean-tech and circularity). Scoped to ' +
      'industry-tagged policies via the content analysis tool.',
    isSeed: true,
    modules: [
      {
        id: 'content-analysis',
        kind: 'content-analysis',
        name: 'Content analysis',
        description:
          'MAXQDA-style qualitative coding scoped to industry. Choose a source — ' +
          'the EU policy corpus (pre-filtered to industry-tagged policies: ETS, ' +
          'ETS2, CBAM, IED, Net-Zero Industry Act, CRMA …), scientific literature ' +
          'or grey literature & reports — then mark passages and attach tags & ' +
          'codes. Tags save live and build on the shared master library.',
      },
    ],
  },
];
