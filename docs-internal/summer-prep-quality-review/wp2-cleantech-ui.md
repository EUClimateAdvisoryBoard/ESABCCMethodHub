# WP2 — Clean Tech UI: dark mode, accessibility, surfacing the enablers

Read first: `audits/audit-cleantech.md` (finding numbers refer to it) and the shared protocol +
dark-mode mapping table in `README.md`.

**Mission:** bring the Clean Tech components in line with the rest of the beta surface — dark
mode, keyboard access, WCAG contrast — and surface the `CROSS_CUTTING_ENABLERS` dataset that is
currently exported to Excel but invisible on the page.

**Write-set (edit nothing else):**
- `beta/modules/overview-industry/cleantech/page.tsx`
- `beta/modules/overview-industry/cleantech/EmissionsSunburst.tsx`
- `beta/modules/overview-industry/cleantech/ExternalRolePanel.tsx`

You may IMPORT from `../cleantech-catalogue.ts` (e.g. `CROSS_CUTTING_ENABLERS`) but must not
edit it — WP1 owns it and is editing it in parallel (only prose/values change; exported names
and shapes stay stable).

## P0 — must do

1. **(Finding #13, CRITICAL)** Dark mode across all three components. Currently
   `grep -c "dark:"` = 0 in each. Apply the mapping table from `README.md` to every surface:
   page background, cards, detail panels, `ProjectRow`/`DataLeaf` rows, tables, badges,
   borders, muted text. Reference implementation: `beta/modules/summer-prep/page.tsx`.
   For SVG elements inside `EmissionsSunburst.tsx` that hardcode light-tuned strokes/fills for
   *chrome* (e.g. white ring separators, near-black center text), use CSS-var-driven values
   (`var(--mh-*)`) or `dark:` classes on wrapping elements; the data-driven arc palette itself
   can stay.
2. **(Finding #19, CRITICAL)** Surface `CROSS_CUTTING_ENABLERS`. Add a clearly-titled section
   below the wheel (e.g. "Cross-cutting enablers — electrification, CO₂ transport & storage,
   hydrogen, circularity") rendering the 4 enabler subsectors with their levers and project
   rows, reusing the existing detail-panel row/leaf presentation so the styling is identical to
   the in-wheel subsectors. It must show the same fields (status pill, MAC/TRL where present via
   `TECH_METRICS`, project fid/source rows). A collapsible section (default collapsed with a
   one-line teaser, like the wheel's own collapse pattern) is ideal. Update the module intro
   copy if it implies the wheel is the entire catalogue.
3. **(Finding #14, MAJOR)** Keyboard access for the wheel: every arc `<path>` and the centre
   circle get `tabIndex={0}`, `role="button"`, a descriptive `aria-label` (node name, level,
   expanded/collapsed state), and `onKeyDown` handling Enter/Space mirroring `clickArc`; show
   the tooltip content on focus as well as pointer-hover (`onFocus`/`onBlur`).
4. **(Finding #15, MAJOR)** Contrast fixes in `EmissionsSunburst.tsx`:
   - line ~109 `announced` status pill (`bg-surface-orange text-accent-orange`, ≈1.87:1): use a
     dark-orange text (e.g. `#7A4400`-class token) on the same surface, ≥4.5:1.
   - line ~150 inactive TRL pips (`text-grey-400 bg-grey-100`, ≈1.69:1): darken to at least
     `text-grey-500` on `bg-grey-200`, and give them a dark-mode pair.

## P1 — should do

5. **(Finding #16)** `ExternalRolePanel.tsx:111` — industry-name cell `<td>` → `<th scope="row">`
   keeping styling/button behavior.
6. **(Finding #17)** `ExternalRolePanel.tsx:155` — dot `aria-label` →
   `` `${t.name} → ${s.name}: ${cell.role} support` ``.
7. **(Finding #23)** Add one caption sentence near the wheel's centre total (≈588 Mt) stating
   the total blends EU ETS 2023 activity data with sector-association estimates on different
   boundaries/years.

## P2 — cheap

8. **(Finding #24)** `EmissionsSunburst.tsx:728-732` — join `EMISSIONS_MAP_UNSIZED` entries with
   a separator so a future second entry doesn't concatenate.

## Do not touch

The three data files (`cleantech-catalogue.ts`, `cleantech-external-role.ts`,
`nace-emissions-layer.ts`) — WP1 owns them. Don't restyle the brand accent palette used for
arc coloring; only fix the failing pairs listed above.

## Acceptance criteria

- `npx tsc --noEmit` passes.
- `grep -c "dark:" beta/modules/overview-industry/cleantech/*.tsx` — every file > 0.
- `grep -c "CROSS_CUTTING_ENABLERS" beta/modules/overview-industry/cleantech/EmissionsSunburst.tsx`
  (or `page.tsx`) ≥ 1 — the dataset renders.
- Arcs are focusable: `grep -n "tabIndex" beta/modules/overview-industry/cleantech/EmissionsSunburst.tsx`
  hits the arc path and centre circle.
- No edits outside the three write-set files.
