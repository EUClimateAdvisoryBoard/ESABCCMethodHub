# WP1 — ESABCC advice corpus (two parallel agents: WP1a core, WP1b wider)

*Read WP0 first. Output: `advice-core.ts` (WP1a) and `advice-wider.ts` (WP1b),
each exporting an `AdvicePosition[]` conforming to `../types.ts`.*

## Goal

Extract, with report + page + near-verbatim quote, every ESABCC position that
the 17 July 2026 package could conflict with. This is *not* a summary of the
reports — it is a targeted sweep for positions on the package's decision
surface.

## Split

- **WP1a → `advice-core.ts`, export `ADVICE_CORE`** — reports:
  `2040-target-advice-2023`, `towards-eu-climate-neutrality-2024` (use the
  tracker-source.md as an index, but cite pages of the PDF),
  `climate-targets-2023`, `climate-law-amendment-2025`.
- **WP1b → `advice-wider.ts`, export `ADVICE_WIDER`** — reports:
  `carbon-removals-2025`, `energy-crisis-2023`,
  `acer-energy-infrastructure-2022`, `scenario-guidelines-2022`,
  `decarbonised-energy-infrastructure-2023`, `ten-e-draft-scenarios-2024`,
  `adaptation-2026`, `agri-food-2026`.

## Method

1. Work from the pre-extracted text at
   `/tmp/claude-0/-home-user-ESABCCMethodHub/30ae822b-238f-5e81-821c-e3bbd57cdf28/scratchpad/esabcc-text/`
   (`===== PAGE n =====` markers give you `pages`). Grep, then read context
   around hits — do not read whole reports linearly.
2. Search themes (non-exhaustive): ETS / cap / linear reduction factor /
   allowance; carbon budget / cumulative emissions / early action; removals /
   CDR / BECCS / DACCS / permanence / liability / separate targets; Article 6 /
   international credits / offsets / domestic; carbon price / price signal /
   ETS2; free allocation / carbon leakage / CBAM / polluter pays; aviation /
   maritime; electrification / electricity share / heat pumps; energy demand /
   sufficiency / efficiency first; fossil fuel subsidies; auction revenue /
   Innovation Fund / Social Climate Fund / investment; governance / review /
   ratchet / scientific advice; fairness / distributional.
3. For each solid hit, write an `AdvicePosition`: `id` (`ap-<slug>`),
   `reportId`, `theme` (from `ConflictTheme`), `title`, `position` (one
   paragraph, plain language), `quote` (near-verbatim from the text, ≤ ~60
   words), `pages`, `recIds` (grep `src/data/esabcc-recommendations.ts` for the
   matching recommendation ids; empty array if none exists).
4. Prioritise positions with numbers or explicit "should/should not" language.
   The known headline anchors that MUST be captured (with their real quotes):
   - 2040 target: 90–95% domestic reduction vs 1990; 11–14 Gt CO₂e budget
     2030–2050 (WP1a).
   - Delivery "through domestic action" / criticism of international credits in
     the climate-law advice, incl. the 3% flexibility (WP1a).
   - Fairness/feasibility framing of the budget; risks of overshoot and
     late action (WP1a).
   - E5 electrification indicator and scenario ranges (~50%+ by 2040), demand
     reduction (KR12), efficiency first, fossil-subsidy phase-out, ETS
     strengthening / extension advice from the 2024 report (WP1a).
   - CDR report: separate targets for reductions vs removals, permanence and
     liability standards, fungibility/mitigation-deterrence risk, cautious ETS
     integration conditions (WP1b).
   - Energy-crisis recommendations on price signals and revenue use (WP1b).
5. Target **18–28 positions for WP1a**, **14–24 for WP1b** — quality and
   citation fidelity over volume. Skip themes a report genuinely does not
   address; adaptation/agri-food/TEN-E reports may yield only a handful each
   (governance, infrastructure consistency with targets, agriculture pricing) —
   that is fine.

## File shape

```ts
import type { AdvicePosition } from './types';

/** …header per WP0 convention 6… */
export const ADVICE_CORE: AdvicePosition[] = [ /* … */ ];
```

## Definition of done

- File typechecks against `types.ts` (no local type redefinitions).
- Every `pages` entry corresponds to the `===== PAGE n =====` block containing
  the quote; every `recIds` entry exists in `esabcc-recommendations.ts`.
- Header comment says AI-extracted, pending verification, and names the source
  PDFs.
