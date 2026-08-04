/**
 * Project Workspace — seed projects and their module catalogues.
 * ----------------------------------------------------------------
 * The workspace lets Secretariat users group analytical work into
 * "projects" (e.g. Policy Gap 2.0, Industry Project). Each project has
 * its own set of modules ("tools" in the UI).
 *
 * Persistence: Supabase-backed since migration 038
 * (`supabase/migrations/038_project_workspace.sql`), which defines the
 * `pw_projects` / `pw_modules` / … tables and reads/writes go through
 * `src/lib/project-workspace/db.ts`. The arrays exported below are the
 * seed catalogue for "Policy Gap 2.0" and "Industry Project" — mirrored
 * into the `pw_*` tables by that migration and lazily re-applied by
 * `ensureSeedDataFor` (in `db.ts`) so a fresh deploy is usable before a
 * manual seed step runs. When no Supabase project is configured
 * (`isWorkspaceDbEnabled()` is false — "preview mode"), the workspace
 * pages fall back to these arrays directly and hide every mutation
 * affordance, since there is no database to write to.
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
  | 'literature-watch'
  // One page of a report module (the Policy Gap 2.0 Report, the Industry
  // Report) surfaced as a project tab. The page lives in `beta/modules/…`;
  // the module carries the pointer and the description, from the catalogue in
  // `src/data/workspace-report-pages.ts`, keyed by module id. Modules of this
  // kind are defined here and never stored in `pw_modules` — the read path
  // merges them into every project, so they do not depend on a migration
  // having run (see `withReportPageModules` in lib/project-workspace/db.ts).
  | 'report-page'
  | 'custom';

export interface WorkspaceModule {
  id: string;
  kind: WorkspaceModuleKind;
  name: string;
  description: string;
  /**
   * Featured modules are the project's primary, production-ready tools.
   * They render with a bold tab label to set them apart from the more
   * experimental modules.
   */
  featured?: boolean;
  /**
   * Beta modules are still experimental. They render with a small "beta"
   * marker next to the tab label.
   */
  beta?: boolean;
  /**
   * Seed modules ship with the project (see the arrays below / migration
   * 038 and friends) and cannot be removed or renamed from the UI — the
   * delete API refuses them too. Defaults to `true` for every module
   * literal in `SEED_PROJECTS`, since all of them are exactly that.
   */
  isSeed?: boolean;
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
        featured: true,
        isSeed: true,
        description:
          'Two clusters: existing indicators rebuilt from the 2024 ESABCC ' +
          'progress report (Towards EU climate neutrality), and additional ' +
          'indicators covering the ECNO building blocks. Table + chart view, ' +
          'editable in the UI; "Refresh from source" pulls updates from ' +
          'Eurostat / EEA / EAFO / IRENA / EHPA.',
      },
      {
        id: 'content-analysis',
        kind: 'content-analysis',
        name: 'Content analysis',
        featured: true,
        isSeed: true,
        description:
          'MAXQDA-style qualitative coding for this project. Choose a source — ' +
          'the EU policy corpus, scientific literature or grey literature & ' +
          'reports — then mark passages and attach tags & codes. Tags save ' +
          'live and build on the shared master library, with lenses to compare ' +
          'what each project is coding.',
      },
      {
        id: 'member-states',
        kind: 'member-states',
        name: 'Member state space',
        isSeed: true,
        description:
          'EEA-style profile for each EU-27 member state: choropleth ' +
          'map, indicator heatmap and full per-country detail page ' +
          'with editor and external-contributor workflow.',
      },
      {
        id: 'recommendations',
        kind: 'recommendations',
        name: 'Past recommendations tracker',
        isSeed: true,
        description:
          'Recommendations from every ESABCC report, with status and dated ' +
          'uptake events.',
      },
      {
        id: 'literature-watch',
        kind: 'literature-watch',
        name: 'Literature watch',
        isSeed: true,
        description:
          'New peer-reviewed publications from the relevant journals, ' +
          'screened every morning and matched to this project. Read the ' +
          'daily screening report and pick the papers worth a closer look.',
      },
      // ── The Policy Gap 2.0 Report’s own pages ───────────────────────────
      // The tools above hold the data; these are the report surfaces built on
      // it. Descriptions and links come from WORKSPACE_REPORT_PAGES.
      {
        id: 'gap-tracker',
        kind: 'report-page',
        name: 'Policy Gap Tracker',
        featured: true,
        description:
          'Every policy, ambition and implementation gap and inconsistency the ' +
          'Board identified across all 12 report chapters — editable, filterable ' +
          'and exportable, with the verbatim report quote and page behind each finding.',
      },
      {
        id: 'indicator-check',
        kind: 'report-page',
        name: 'Indicator Check',
        description:
          'Note 1 · all sectors. What has moved, data-wise, since the last ' +
          'report: the report’s progress indicators read for movement against ' +
          'their own baseline, on this project’s indicator database.',
      },
      {
        id: 'synergies-tradeoffs',
        kind: 'report-page',
        name: 'Synergies & Trade-offs',
        description:
          'Note 2 · industry & transport. Where cutting emissions also builds ' +
          'climate resilience — and where it works against it — mapped ' +
          'subsector by subsector.',
      },
      {
        id: 'policy-gaps-sectors',
        kind: 'report-page',
        name: 'Policy Gaps — Transport & Industry',
        description:
          'Note 3 · extends the gap tracker. Do the transport- and ' +
          'industry-tagged gaps still exist after the legislation adopted since ' +
          'the report, and where are the candidates for additional ones?',
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
        isSeed: true,
        description:
          'MAXQDA-style qualitative coding scoped to industry. Choose a source — ' +
          'the EU policy corpus (pre-filtered to industry-tagged policies: ETS, ' +
          'ETS2, CBAM, IED, Net-Zero Industry Act, CRMA …), scientific literature ' +
          'or grey literature & reports — then mark passages and attach tags & ' +
          'codes. Tags save live and build on the shared master library. The ' +
          'Chapter and Reading-responsibility views turn the corpus into a ' +
          'literature list per chapter and an overview of who is reading what — ' +
          'add papers by DOI (auto-tagged “industry” in the reference manager) ' +
          'or pull reports in from the reference manager.',
      },
      {
        id: 'literature-watch',
        kind: 'literature-watch',
        name: 'Literature watch',
        isSeed: true,
        description:
          'New peer-reviewed publications on industrial decarbonisation — ' +
          'steel, cement, hydrogen, CBAM, CCS/CCU — screened every morning ' +
          'from the relevant journals and matched to this project.',
      },
      // ── The Industry Report’s own pages ─────────────────────────────────
      // The five sub-pages of the Industry Report module (M · 35 Summer Prep,
      // formerly M · 34 Overview Industry). Links and descriptions come from
      // WORKSPACE_REPORT_PAGES.
      {
        id: 'cleantech',
        kind: 'report-page',
        name: 'Clean Tech',
        featured: true,
        description:
          'The collapsible emissions wheel of EU manufacturing (NACE Section C ' +
          '→ subsectors → levers with cost, readiness and real investment ' +
          'decisions), plus the clean-tech industries’ role outside industry.',
      },
      {
        id: 'trade-flows',
        kind: 'report-page',
        name: 'Trade flows',
        description:
          'The input–output map of EU-27 manufacturing trade with its ' +
          'critical-dependencies dashboard, on live Eurostat data.',
      },
      {
        id: 'downstream',
        kind: 'report-page',
        name: 'Downstream',
        description:
          'The review of EU lead-market policies (procurement, quotas, CBAM) ' +
          'documented along the five Better Regulation criteria.',
      },
      {
        id: 'report-objectives',
        kind: 'report-page',
        name: 'Industry report — objectives',
        description:
          'Roadmap & clean-tech syntheses and the report objectives, with a ' +
          'fully sourced Excel download.',
      },
      {
        id: 'optimization',
        kind: 'report-page',
        name: 'Optimization',
        description:
          'A SEAMAPS-style least-cost optimization model (Julia/JuMP) of the EU ' +
          'energy-intensive subsectors — sourced inputs, the commented solver ' +
          'code, sensitivity runs and the key findings.',
      },
    ],
  },
];
