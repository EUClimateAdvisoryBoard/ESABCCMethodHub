# WP1 — Clean Tech data files: fact corrections & data integrity

Read first: `audits/audit-cleantech.md` (finding numbers below refer to it) and the shared
protocol in `README.md`.

**Mission:** apply the fact-check corrections and data-integrity fixes to the Clean Tech data
files. Text edits must match the module's existing voice (tight, sourced, analyst-facing) and
keep/extend the existing source-citation fields.

**Write-set (edit nothing else):**
- `beta/modules/overview-industry/cleantech-catalogue.ts`
- `beta/modules/overview-industry/cleantech-external-role.ts`
- `beta/modules/overview-industry/nace-emissions-layer.ts`

## P0 — must do

1. **(Finding #1, CRITICAL)** `cleantech-external-role.ts:725-727` — replace the stale
   "−90 to −95% net GHG by 2040 … preferred option of the Commission's 2040-target impact
   assessment" framing. State first that the amended European Climate Law — Regulation (EU)
   2026/667, in force 7 April 2026 — sets a **legally binding flat 90%** net reduction for 2040
   (≥85% domestic, ≤5% international credits from 2036), then keep the 2024 IA 90–95%
   preferred-option range and the ESABCC 90–95% advice as clearly dated analytical context.
   Add the Council/EP source URLs from the audit alongside the existing source.
2. **(Finding #20, MAJOR)** `cleantech-catalogue.ts:1812` — rename the `TECH_METRICS` key
   `'x-circular'` → `'x-circular-levers'` so it matches the technology id (line 1678) and the
   `TECH_CLASSIFICATION` key (line 1922). Do NOT touch the `SUBSECTOR_IMAGES` key `'x-circular'`
   (line 1947) — that one correctly refers to the subsector id.
3. **(Finding #2, MAJOR)** `cleantech-catalogue.ts:800-813` — LEILAC-2: replace the
   "targeting operation ~2025" fid text with pre-FEED completed / FEED entered late 2025 /
   commissioning now targeted 2026, citing the current LEILAC sources in the audit.
4. **(Finding #3, MAJOR)** `cleantech-external-role.ts:439-441` — after the Draghi "~6.5% →
   ~15% planned" battery trajectory, add the caveat that the projection predates the Northvolt
   bankruptcy (March 2025; Skellefteå sold to Lyten Aug 2025) and point to 2025/26 capacity
   data (audit sources).
5. **(Finding #22, MAJOR)** `cleantech-catalogue.ts:2007-2016` — aluminium `EMISSIONS_MAP`
   block: the wheel currently draws aluminium as an exact ≈2.75 Mt arc while the subsector's own
   text says the full sector footprint is ≈24 Mt incl. indirect. Preferred fix (data-only, no
   component edits): set the block so it renders with the same `*` caveat mechanics as shared
   blocks (`shared: true`-style flagging as the file's structure allows) and extend its `note`
   to state explicitly "direct process/energy emissions only — full sector footprint incl.
   indirect electricity ≈24 Mt (≈9× larger)". Keep `mt: 2.75` (do not resize the arc without
   a basis change elsewhere).

## P1 — should do

6. **(Finding #6)** `cleantech-catalogue.ts:1497-1499` — industrial-heat pilot auction: mark
   IF25 Heat as concluded (€400m awarded to 65 projects, results May 2026, ~6.6 Mt CO₂ avoided
   over 10 years) and note IF26 Heat as the live round. Update `status` accordingly.
7. **(Finding #7)** `cleantech-external-role.ts:312-314` — solar imports: `€10.8 bn` → `€10.9 bn`
   (Eurostat Oct 2025 release; 98% share stays).
8. **(Finding #4)** `cleantech-catalogue.ts:596-608` — ELYSIS: cite the Nov 2025 startup of the
   full 450 kA commercial-size cell at Alma (multi-year performance testing; 10-cell Arvida
   demo plant planned ~2027); adjust the TRL note toward TRL 7.
9. **(Finding #5)** `cleantech-catalogue.ts:382-390` — thyssenkrupp tkH2Steel: plant completion
   targeted end-2026; first H₂ use planned 2028, full switch by 2029.
10. **(Finding #8)** `cleantech-external-role.ts:605-607` — REPowerEU heat pumps: add one
    sentence that 2024–25 sales (~2.1M, −23% in 2024; partial 2025 recovery ~2.3M) run well
    below the pace needed for 30 million by 2030.

## P2 — cheap improvements

11. **(Finding #10)** `cleantech-catalogue.ts:996` — ammonia scale-problems: add the concrete
    example that Yara shelved its next-stage green-H₂ expansions at Porsgrunn and Sluiskil in
    Oct 2024 on "low-value" economics.
12. **(Finding #9)** `cleantech-catalogue.ts:1645-1653` — Holland Hydrogen I: optionally add the
    March 2025 viability scare ("may never open" reporting after the Dutch corrective factor)
    before the recovery toward 2026 commissioning.
13. **(Finding #21)** `nace-emissions-layer.ts` — the file is currently dead code (nothing
    imports it). Do NOT delete it. Add a short header comment under the existing docstring:
    staged for a future sunburst integration (whole-economy context per NACE division), not yet
    wired into `EmissionsSunburst.tsx`; see `docs-internal/summer-prep-quality-review/README.md`
    deferred backlog.

## Do not touch

Everything in the audit's "Verified correct" list (EEA overview facts, Material Economics
levers, steel/cement/refining ETS figures, Brevik/Padeswood, Yara Herøya, BASF/Linde cracker,
Kassø, Northern Lights, Greensand, Stockholm Exergi, ELYgator, Esbjerg, Arla, all NACE codes,
NZIA benchmark framing, IEA ETP2024 figures). Items #11/#12 in the audit (aluminium −45%,
cement CCS MAC bands) are "unable to fully verify" — leave them unchanged.

## Acceptance criteria

- `npx tsc --noEmit` passes.
- `grep -n "x-circular'" beta/modules/overview-industry/cleantech-catalogue.ts` shows the
  `TECH_METRICS` key now as `x-circular-levers` and `SUBSECTOR_IMAGES` still `x-circular`.
- `grep -rn "90 to −95\|90–95\|90-95" beta/modules/overview-industry/cleantech-external-role.ts`
  only matches clearly-dated 2024 context, never the current-law framing.
- No edits outside the three write-set files.
