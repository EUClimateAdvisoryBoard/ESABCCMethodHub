# Summer Prep — quality review, July 2026

Branch: `claude/summer-prep-quality-review-e9iou9` · Compiled 2026-07-15.

A full fact-check / UI check / quality check of every submodule in the Summer Prep module
(M · 35), covering both halves:

- **Industry Report** — Clean Tech, Trade flows (incl. FIGARO), Downstream, Report objectives, landing pages
- **Policy Gap 2.0 Report** — Policy Gap Tracker, Indicator Check, Synergies & Trade-offs, Policy Gaps — Transport & Industry

Five parallel audit agents produced the raw findings in `audits/` (each finding has severity,
`file:line`, exact current text, exact proposed fix, and a source URL for fact findings, plus a
"verified correct — do not re-touch" list). This README plus the `wp*.md` briefs are the
execution plan distilled from those audits.

## Headline results

| Area | Fact-check | Biggest issues |
|---|---|---|
| Clean Tech | 1 critical + ~9 stale claims | 2040 target shows pre-legislation range (Reg. (EU) 2026/667 sets flat 90%); `CROSS_CUTTING_ENABLERS` dataset never rendered; `TECH_METRICS` key bug orphans circular-economy chart data; no dark mode |
| Trade flows | clean (0 errors) | No dark mode across 10 files; orange badges fail WCAG (≈1.9–2.1:1); export sheet-list off by one |
| Downstream / Objectives | clean (15+ claims verified) | No dark mode on 4 files; light-only Chart.js palettes; duplicated AR6 citation already drifted once |
| Policy Gap Tracker + Note 3 | 3 major errors | "Jan 2025" report date (real: 18 Jan 2024) ×3 incl. Excel export; Combined Transport Directive status understated; Industrial Accelerator Act rename/draft missed; empty Maritime matrix row; filtered-export summary mismatch |
| Indicator Check + Synergies | 1 critical + citations all genuine | 7 `%`-unit indicators stored as 0–1 fractions (render "0.34 %" instead of "34%"); Supabase errors indistinguishable from empty DB; dark-mode contrast failures |

## Work packages

Each brief is self-contained: mission, owned write-set (disjoint — safe to run in parallel),
prioritised tasks (P0 must / P1 should / P2 cheap-nice), constraints, acceptance criteria.
Executors must also read the matching audit file(s) in `audits/` — briefs reference audit
finding numbers rather than restating every detail.

| WP | Brief | Write-set (no other WP touches these files) | Audit |
|---|---|---|---|
| 1 | `wp1-cleantech-data-factcheck.md` | `beta/modules/overview-industry/cleantech-catalogue.ts`, `cleantech-external-role.ts`, `nace-emissions-layer.ts` | `audit-cleantech.md` |
| 2 | `wp2-cleantech-ui.md` | `beta/modules/overview-industry/cleantech/{page,EmissionsSunburst,ExternalRolePanel}.tsx` | `audit-cleantech.md` |
| 3 | `wp3-tradeflows-ui-quality.md` | `beta/modules/overview-industry/trade-flows/**` (except `eurostat-io.generated.ts`) | `audit-tradeflows.md` |
| 4 | `wp4-downstream-objectives.md` | `beta/modules/overview-industry/{page.tsx,downstream/**,report-objectives/**}`, `src/data/{downstream-lead-markets,industry-report-objectives,industry-scenario-db}.ts` | `audit-downstream-objectives.md` |
| 5 | `wp5-policy-gaps.md` | `beta/modules/policy-gaps/page.tsx`, `beta/modules/summer-prep/policy-gaps-sectors/page.tsx`, `src/data/{policy-gaps,summer-prep-sector-gaps}.ts` | `audit-policygaps.md` |
| 6 | `wp6-indicator-synergies.md` | `beta/modules/summer-prep/{indicator-check,synergies-tradeoffs}/page.tsx`, `src/data/{esabcc-indicators,summer-prep-synergies}.ts`, `src/lib/project-workspace/db.ts`, `src/app/beta/summer-prep/indicator-check/*` | `audit-notes.md` |

## Execution protocol

1. Agents run in parallel, one per WP; each edits ONLY its write-set (read anything).
2. Every fact edit must keep/add its source citation in the data file, consistent with how the
   file already cites sources.
3. Never touch anything on an audit's "Verified correct" list.
4. Self-verify with `npx tsc --noEmit` before finishing. Do NOT commit — the orchestrator
   reviews, verifies, and commits centrally.
5. Shared dark-mode conventions (the app is `darkMode: 'class'`; tokens in
   `src/app/globals.css:118-132`; reference implementations:
   `beta/modules/summer-prep/page.tsx`, `beta/modules/policy-gaps/page.tsx`):
   - `bg-white` → `bg-white dark:bg-[var(--mh-card)]`
   - `bg-grey-50` (page/section bg) → add `dark:bg-[var(--mh-bg)]`
   - `bg-grey-100` (chips/wells) → add `dark:bg-[var(--mh-bg)]`
   - `border-grey-100/200` → add `dark:border-[var(--mh-border)]`
   - `text-grey-800/900` and heading colors → add `dark:text-[var(--mh-fg)]`
   - `text-grey-500/600/700`, muted `#54728C`-style text → add `dark:text-[var(--mh-muted)]`
   - page root: `bg-white`/`bg-grey-50` → add `dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]`
   - Brand accent colors (primary/teal/red) may stay; fix only where contrast fails (audits list the failing pairs).

## Deferred backlog (good ideas, out of scope this pass)

From the audits' improvement sections, not executed now:

- Wire the `colorblind_safe` preference (Wong 2011 palette) into the custom SVG figures (trade flows, cleantech wheel).
- Column sorting for the Policy Gap Tracker table; responsive card fallback for wide tables (<640px).
- Wire `nace-emissions-layer.ts` (whole-economy GHG layer) into the sunburst detail panel.
- Shareable URL state for the emissions wheel (fold/color/selection query params).
- `lastChecked` / `lastCheckedAgainst` provenance fields per project row / gap reassessment, and a "data vintage" export sheet.
- Consolidate repeated card patterns into shared `Card`/`StatusPill` components across the industry submodules.
- Cross-link Side 1 ↔ Side 2 of the Clean Tech module; split the Combined-Transport/TEN-T bundled verdict into two scored assessments.
- Build-time invariant in `scripts/esabcc-indicators/build.py` rejecting `%`-unit indicators whose values sit entirely below 1.5.
