/**
 * Report pages carried inside a Project Workspace project.
 * ---------------------------------------------------------------------------
 * The two report modules built in Summer Prep (M · 35) — the Policy Gap 2.0
 * Report and the Industry Report — are each a landing page plus a handful of
 * sub-pages ("submodules"). Those sub-pages were only reachable from the beta
 * landing pages, which meant the Project Workspace, where the team actually
 * works, showed the underlying *tools* (indicators, content analysis, …) but
 * none of the report surfaces built on top of them.
 *
 * This catalogue closes that gap. Each entry is one sub-page, keyed by the
 * workspace module id that carries it, and the `report-page` module kind
 * renders it as a project tab: what the page is, what is inside it, and a link
 * that opens it. The pages themselves are unchanged — the workspace links to
 * them rather than duplicating them, so there is exactly one copy of each.
 *
 * Keep the module ids here in step with `SEED_PROJECTS` in
 * `src/data/project-workspace.ts` and with migration
 * `084_pw_report_page_modules.sql`, which seeds the same rows server-side.
 */

export interface WorkspaceReportPage {
  /** Route of the page this module opens. */
  href: string;
  /** Short positioning line, e.g. "Note 1 · all sectors". */
  tag?: string;
  /** One sentence: what the page is for. */
  summary: string;
  /** The three-to-five things a reader will find on the page. */
  highlights: string[];
  /** Where the page's numbers come from, when that needs saying. */
  provenance?: string;
  /** Accent colour, matching the card the page has on its beta landing page. */
  accent: string;
  /** The page's own glyph, again matching the beta landing page. */
  icon: string;
}

export const WORKSPACE_REPORT_PAGES: Record<string, WorkspaceReportPage> = {
  // ── Policy Gap 2.0 Report ────────────────────────────────────────────────
  'gap-tracker': {
    href: '/beta/policy-gaps',
    tag: 'The report itself',
    summary:
      'Every policy, ambition and implementation gap and inconsistency the Board identified across all 12 chapters of the 2024 progress report, with a live record of whether each one still exists.',
    highlights: [
      'Seeded from the report’s own findings, with the verbatim quote and page behind each row',
      'Filter by sector, gap type and live status; free-text search across the whole table',
      'Edit the live status and note inline, add rows for gaps found since, delete rows',
      'One-click export of the current table to a styled Excel workbook',
    ],
    accent: '#B83230',
    icon: '▤',
  },
  'indicator-check': {
    href: '/beta/summer-prep/indicator-check',
    tag: 'Note 1 · all sectors',
    summary:
      'What has moved, data-wise, since the last report — the report’s 97 progress indicators read for movement against their own baseline.',
    highlights: [
      'Report baseline, the newest points added since publication, and the change between them',
      'Every series without new data carries the tested reason it has none, and what would unblock it',
      'Filter by sector and by whether an indicator has moved; sort by size of move',
      'Each row deep-links to the same indicator in this project’s Indicator database',
    ],
    provenance:
      'Reads the indicator series live from this project’s own indicator database — it can only ever show what the Indicator database tab also shows.',
    accent: '#007B6C',
    icon: '📈',
  },
  'synergies-tradeoffs': {
    href: '/beta/summer-prep/synergies-tradeoffs',
    tag: 'Note 2 · industry & transport',
    summary:
      'Where cutting emissions also builds climate resilience, and where it works against it — mapped subsector by subsector.',
    highlights: [
      'One row per mitigation measure, scored for its adaptation direction',
      'Industry and transport subsectors covered separately',
      'Literature-grounded, with the citation behind each mapping',
    ],
    provenance:
      'A working draft, not a Board position. Citations were source-verified against Crossref/publisher records in July 2026; AI-compiled framing is flagged as pending verification inside the note.',
    accent: '#6667AB',
    icon: '⇄',
  },
  'policy-gaps-sectors': {
    href: '/beta/summer-prep/policy-gaps-sectors',
    tag: 'Note 3 · extends the gap tracker',
    summary:
      'Do the transport- and industry-tagged gaps still exist after the legislation adopted since the report, and where are the candidates for additional ones?',
    highlights: [
      'Each transport/industry gap re-read against the legislation adopted since January 2024',
      'Candidate new gaps, with what would have to be true for each to hold',
      'A per-sector, per-subsector map of the gap landscape',
    ],
    provenance:
      'A working draft, not a Board position. AI-compiled framing is flagged as pending verification inside the note.',
    accent: '#FF9933',
    icon: '◍',
  },

  // ── Industry Report ──────────────────────────────────────────────────────
  cleantech: {
    href: '/beta/overview-industry/cleantech',
    tag: 'Evidence catalogue',
    summary:
      'EU manufacturing as a collapsible emissions wheel — and the clean-tech industries’ role in decarbonising everything else.',
    highlights: [
      'NACE Section C total decomposing into divisions, subsectors and their decarbonisation levers',
      'Sourced abatement cost, readiness, barriers and real investment decisions (incl. FIDs) per lever',
      'The external side: solar PV, wind, batteries, EVs, electrolysers and heat pumps against the sectors they serve',
      'The Commission’s 2040 impact-assessment pathways, with a priority & competitiveness read',
    ],
    accent: '#004B7F',
    icon: '⚙',
  },
  'trade-flows': {
    href: '/beta/overview-industry/trade-flows',
    tag: 'Trade dependencies',
    summary:
      'The input–output map of EU-27 manufacturing trade, with the critical-dependencies dashboard on top of it.',
    highlights: [
      'A deep dive per NACE Section C division: trade balance and imported-input mix',
      'Imported inputs from the EU input–output use table and FIGARO, incl. foreign value added in exports',
      'Dependencies where imports are large and one supplier dominates, against the Critical Raw Materials Act',
      'The full FIGARO inter-country table imported into the MethodHub, with viewer and analysis dashboard',
    ],
    provenance: 'Statistical layers regenerate from the Eurostat API; a full Methodology view sits in the page.',
    accent: '#00928F',
    icon: '⇄',
  },
  downstream: {
    href: '/beta/overview-industry/downstream',
    tag: 'Demand-side policy review',
    summary:
      'The EU’s lead-market policies — procurement, quotas and the CBAM border signal — documented along the five Better Regulation criteria.',
    highlights: [
      'Voluntary GPP, NZIA non-price criteria, the Industrial Accelerator Act, the Public Procurement Act revision, ESPR mandatory GPP',
      'Quotas (ELV recycled content, clean-fuel mandates) and the CBAM border signal',
      'Each documented on effectiveness, efficiency, relevance, coherence and EU added value — facts and sources only, no rating scale',
      'The downstream standards underneath: low-carbon definitions, labels, product rules',
    ],
    provenance: 'Exports the whole review as an Excel handover workbook with criteria notes, data, sources and a what-to-watch timeline.',
    accent: '#6667AB',
    icon: '⬇',
  },
  'report-objectives': {
    href: '/beta/overview-industry/report-objectives',
    tag: 'Objectives & evidence base',
    summary:
      'The objectives for the next report’s industry chapter, and the syntheses they rest on.',
    highlights: [
      'A synthesis of industrial decarbonisation pathways and roadmaps, incl. their investment timelines',
      'A synthesis of the clean-tech industry’s role in economy-wide decarbonisation',
      'Overview figures aggregating pathway, scenario (incl. IIASA AR6 ensemble) and investment data',
      'The report objectives themselves',
    ],
    provenance:
      'One Excel download carries every data point, the objectives, the scenarios and the exact link to the paper behind each number.',
    accent: '#B87400',
    icon: '◎',
  },
  optimization: {
    href: '/beta/summer-prep/optimization',
    tag: 'Sector least-cost model',
    summary:
      'A SEAMAPS-style least-cost optimization model of the EU energy-intensive subsectors, with its inputs, its code and its runs all open.',
    highlights: [
      'Sourced cost & technology inputs, downloadable as an Excel workbook',
      'The fully commented Julia/JuMP solver code',
      'Built-in sensitivity runs across CAPEX, carbon price, demand, fuel prices and build rates',
      'The key findings, with every scenario’s results viewable and downloadable',
    ],
    accent: '#007B6C',
    icon: '∑',
  },
};

export function reportPage(moduleId: string): WorkspaceReportPage | undefined {
  return WORKSPACE_REPORT_PAGES[moduleId];
}
