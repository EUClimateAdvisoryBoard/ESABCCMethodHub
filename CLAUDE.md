# Working in this repository

MethodHub — the ESABCC Secretariat's internal research workspace (Next.js 14).
Production modules live in `src/`, experimental ones in `beta/` (unrouted until
the science team signs off). `README.md` is the orientation; the docs site under
`docs/` is the source of truth for the app itself.

## Standing rules — read the linked file before touching that area

These are decisions a reviewer has already made. They are easy to undo by
accident, so read the rulebook before changing anything in its area.

### Policy Targets Register (M·36)

Anything under `scripts/policy-targets-*`, `scripts/policy-targets-input/`,
`src/data/policy-targets*`, `beta/modules/policy-targets/`, or the exported
workbook `public/data/eu-policy-targets-corrected.xlsx`:

**→ Read [`docs-internal/policy-targets-what-counts-as-a-target.md`](docs-internal/policy-targets-what-counts-as-a-target.md) first.**

It carries an ESABCC reviewer's rules for what is and is not a target —
generalised from their written mark-up of the register — plus the limits on
where those rules must not be applied, and how to record a correction so it
stays reversible. In short:

- `src/data/policy-targets.generated.ts` is **generated** — never hand-edit it.
  Corrections go in `scripts/policy-targets-overrides.json` (drops and field
  changes, each with a `reason` naming its rule) or as new verbatim quotes in
  `scripts/policy-targets-input/`. Rebuild with `npm run build:policy-targets`.
- Every quote must be a **verbatim contiguous substring** of
  `public/data/policy-texts/<policy_id>.txt`, and **≤ 900 characters** — the
  build rejects anything else, which can silently lose a row if you also dropped
  the one it supersedes. Check after rebuilding that every candidate landed.
- **When in doubt, keep the row.** A false removal is worse than a missed one.

## Conventions worth knowing

- Generated data files say so in their header. Regenerate them with the script
  named there rather than editing the output.
- Beta module pages live in `beta/modules/<module>/page.tsx` with a one-line
  re-export at `src/app/beta/<module>/page.tsx`; subpages follow the same shape.
- `npm run check:policies` validates the policy registries; run it after touching
  policy data.
