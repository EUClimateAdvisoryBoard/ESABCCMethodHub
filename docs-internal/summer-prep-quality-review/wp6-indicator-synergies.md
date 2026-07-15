# WP6 — Indicator Check & Synergies notes: unit bug, error states, dark contrast

Read first: `audits/audit-notes.md` (finding sections refer to it) and the shared protocol +
dark-mode mapping table in `README.md`.

**Mission:** fix the fraction-vs-percent data bug, make backend failures visible, and fix the
dark-mode contrast failures in both notes.

**Write-set (edit nothing else):**
- `src/data/esabcc-indicators.ts`
- `src/data/summer-prep-synergies.ts`
- `beta/modules/summer-prep/indicator-check/page.tsx`
- `beta/modules/summer-prep/synergies-tradeoffs/page.tsx`
- `src/lib/project-workspace/db.ts` (only `listIndicators` and directly-related error plumbing)
- `src/app/beta/summer-prep/indicator-check/page.tsx` (server wrapper)
- NEW: `src/app/beta/summer-prep/indicator-check/loading.tsx`

## P0 — must do

1. **(CRITICAL, fact/data)** Rescale the 7 fraction-stored `%` indicators in
   `src/data/esabcc-indicators.ts` to the 0–100 scale used by every sibling `%` indicator —
   multiply every `data[].value` AND `targetValue` by 100 for exactly these ids (audit table
   has per-id line numbers and real-world cross-checks):
   - `esabcc-e2-res-noBio-power-share` (L131–143): e.g. 0.3376 → 33.76
   - `esabcc-i3-circular-mat-use` (L240–254): 0.108→10.8, 0.122→12.2
   - `esabcc-t6a-fossil-transport-share` (L460–472): 0.9322–0.9769 → 93.22–97.69
   - `esabcc-b5a-residential-fossil-share` (L521–533)
   - `esabcc-b5b-tertiary-fossil-share` (L536–548)
   - `esabcc-f-green-bonds-share` (L776–788): 0.0008–0.0808 → 0.08–8.08
   - `esabcc-b3-commercial-renovation-rate` (L1531–1546): 0.006→0.6, target 0.011→1.1
     (its own description says "0.6% … rising to 1.1%")
   Preserve the number of decimals meaningfully (no float noise like 33.760000000000005 — write
   literals). Do NOT touch `esabcc-t5a-zev-share-newcars` or
   `esabcc-b3-residential-renovation-rate` — they look similar but are verified correctly
   scaled. `pctChange` badges are ratio-based and unaffected.
2. **(MAJOR)** `src/lib/project-workspace/db.ts:688-694` (`listIndicators`): stop discarding the
   Supabase `error` — check it on both queries, `console.error` it, and surface it to callers
   (e.g. return `{ indicators, error }` or throw a typed error caught by the server wrapper —
   pick the least invasive shape given other call sites; check all callers with grep and keep
   them compiling). Thread an `error` flag through
   `src/app/beta/summer-prep/indicator-check/page.tsx` into the client page so it renders
   "Couldn't load the indicator database — try again later" distinctly from the genuine
   "No indicators match the current filter" empty state.

## P1 — should do

3. **(MAJOR)** Dark-mode contrast fixes (exact spots + measured ratios in the audit's UI
   table):
   - `indicator-check/page.tsx:208-211` — summary tile `style={{color: t.color}}` hexes
     (`#3D5265`, `#004B7F`, `#54728C`): pair with theme-aware values (e.g. render color via a
     class with a `dark:` variant, or pick per-theme hex via the tile config).
   - `indicator-check/page.tsx:112` — Sparkline `stroke '#004B7F'`: use a brighter dark-mode
     stroke (e.g. `#5B9BD5`-class) chosen ≥3:1 against `--mh-card`.
   - `synergies-tradeoffs/page.tsx:58-66` — "Mitigation" (`#004B7F`) and "Adaptation /
     resilience" (`#007B6C`) mini-labels: add `dark:` overrides with brighter variants ≥4.5:1
     against `--mh-bg`.
   - `synergies-tradeoffs/page.tsx:34-40` — `KindBadge`: for dark mode use brighter text
     variants of the synergy/trade-off colors (mixed `#FF9933` already passes) — keep the
     category color driving the chip tint.
4. **(MINOR)** Add `src/app/beta/summer-prep/indicator-check/loading.tsx` — a lightweight
   skeleton (header bar + 4 tile placeholders + a few card placeholders) matching the page
   layout, since the route is `force-dynamic` over a Supabase read.

## P2 — cheap

5. **(MINOR, fact precision)** `src/data/summer-prep-synergies.ts:167` — Tonelli et al. water
   figure: soften "roughly 24 litres once water treatment is counted" to "on the order of
   20–30 litres once water treatment is counted" (the exact 24 L figure could not be verified
   against the paywalled text; the range is the verifiable literature consensus). Keep the DOI.
6. **(Improvement 7)** `indicator-check/page.tsx` — cap the inline "new since report" list per
   card (e.g. show first 3 + "+N more") for consistency with the sparkline's `slice(-10)` cap.

## Do not touch

All verified-correct citations in `summer-prep-synergies.ts` (15 DOIs re-verified — no
hallucinations), the `pctChange` math, the deep-link `?indicator=` wiring, and the two
correctly-scaled lookalike indicators named above. Don't restructure `db.ts` beyond
`listIndicators` error plumbing.

## Acceptance criteria

- `npx tsc --noEmit` passes.
- Spot-check: `esabcc-i3-circular-mat-use` latest value reads `12.2`;
  `esabcc-b3-commercial-renovation-rate` values `0.6`/target `1.1`.
- `grep -n "error" src/lib/project-workspace/db.ts` shows `listIndicators` checking the
  Supabase error on both queries; all `listIndicators` call sites still compile.
- `src/app/beta/summer-prep/indicator-check/loading.tsx` exists.
- No edits outside the write-set.
