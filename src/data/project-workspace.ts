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
      {
        id: 'meetings',
        kind: 'meetings',
        name: 'Meetings & Progress',
        description:
          'Track every meeting for this report — notes, summaries and ' +
          'minutes, the AI-extracted three key takeaways, milestones and a ' +
          'project timeline. Record on your phone to transcribe straight ' +
          'into notes; discuss collaboratively with @mentions. The Progress ' +
          'tab gives the project lead a standard progress dashboard.',
      },
    ],
  },
  {
    id: 'industry-project',
    name: 'Industry Project',
    shortDescription:
      'Analytical workspace dedicated to industrial decarbonisation — taken in ' +
      'the wider sense of industry (energy-intensive sectors, carbon pricing & ' +
      'leakage, hydrogen and CCU/CCS, clean-tech and circularity). The same ' +
      'four tools as Policy Gap 2.0, scoped to industry: industry indicators, ' +
      'the industry-tagged recommendations, industry-tagged policies and a ' +
      'member-state space framed around industrial transition.',
    isSeed: true,
    modules: [
      {
        id: 'indicators',
        kind: 'indicators',
        name: 'Indicator database',
        description:
          'Industry-focused indicators: industrial GHG emissions, energy ' +
          'intensity and electrification, electrolyser capacity, circular ' +
          'material use, the ETS carbon price and free allocation, and ' +
          'clean-tech investment. Table + chart view with the Excel-like ' +
          'spreadsheet editor; editable in the UI and round-trippable via Excel.',
      },
      {
        id: 'recommendations',
        kind: 'recommendations',
        name: 'Recommendations tracker',
        description:
          'ESABCC recommendations tagged "industry" — the Industry chapter ' +
          '(I1–I3) plus the cross-chapter advice that drives industrial ' +
          'decarbonisation (ETS/CBAM, hydrogen, CCU/CCS, clean-tech, ' +
          'circularity). Track status, log dated uptake events, retag, and ' +
          'use the fact-check / verify workflow.',
      },
      {
        id: 'member-states',
        kind: 'member-states',
        name: 'Member state space',
        description:
          'EEA-style member-state view framed around industrial transition — ' +
          'energy-intensive industry footprint, electrification and the ' +
          'clean-tech build-out, with the shared per-country profiles.',
      },
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
      {
        id: 'meetings',
        kind: 'meetings',
        name: 'Meetings & Progress',
        description:
          'Track every meeting for this report — notes, summaries and ' +
          'minutes, the AI-extracted three key takeaways, milestones and a ' +
          'project timeline. Record on your phone to transcribe straight ' +
          'into notes; discuss collaboratively with @mentions. The Progress ' +
          'tab gives the project lead a standard progress dashboard.',
      },
    ],
  },
];
