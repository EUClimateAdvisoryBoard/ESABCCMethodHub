# Policy Gap 2.0 — proposed beta modules on competitiveness, security and geopolitics

> Produced 2026-08-05 · AI-compiled brainstorm — pending Secretariat verification.
> Purpose: candidate beta modules that would let the updated policy gap report
> speak to the competitiveness, security and geopolitical situation of the EU,
> each with a worked analysis method. Ranking criteria: **Relevance** (R) =
> value for the Policy Gap 2.0 report · **Feasibility** (F) = effort, data
> access, political risk. Score = R + F (max 10 each, 20 total).
> Next free module number at time of writing: **M · 45** (registry:
> [`beta/README.md`](beta/README.md)).

---

## Why this axis, and why now

The January-2024 report *Towards EU climate neutrality* was written into a
policy environment organised around the Green Deal. The environment the
updated report lands in is organised around three other frames:

- **Competitiveness.** The Draghi report (September 2024), the Clean
  Industrial Deal (COM(2025) 85) and the 2025–26 omnibus simplification
  agenda have made "does climate policy cost us industry?" the default
  question in the Council and much of the Parliament. The EPP ETS wishlist
  modelled in M · 29 is one symptom; the reopened acts tracked in M · 39 are
  another.
- **Security.** Rearmament (ReArm Europe / Readiness 2030, the SAFE
  instrument, the NATO 5 % spending commitment) competes for the same
  fiscal space as climate investment, while the energy-security case *for*
  climate policy — the crisis of 2022, the Russian gas phase-out — is the
  strongest political tailwind the transition has.
- **Geopolitics.** CBAM's definitive regime started January 2026, the ETS
  Phase-5 proposal leans on ≈260 Mt of international credits, US federal
  climate policy has rolled back, and China dominates most clean-tech
  supply chains. Whether EU climate targets are *deliverable* now depends
  materially on trade partners.

The 2024 gap register (`src/data/policy-gaps.ts`) contains no gap framed in
these terms — a search for competitiveness/security/geopolitical vocabulary
returns nothing. If Policy Gap 2.0 is to be read by the 2026-27 institutions,
it needs surfaces that engage these frames on the evidence, steel-manning
both directions per the ground rules: where the frames genuinely conflict
with climate delivery, and where they genuinely reinforce it.

## What the hub already covers (do not duplicate)

| Existing surface | What it already does |
|---|---|
| M · 34 `electricity-prices/` | EU–US–China electricity price gap, merit-order model, retail stack. The *price* leg of competitiveness is done. |
| `overview-industry/` `/trade-flows` | EU-27 trade balances, FIGARO input–output, curated dependency register (CRMA materials, SWD(2021) 352 families, energy dependency). The *static dependency inventory* exists. |
| M · 42 `policy-hierarchy/` | Competitiveness and security **lenses** over the acquis, mandate rings, "moving now" layer. The *legal map* exists. |
| M · 29 `ets-wishlist-impact/` | GHG cost of softening the ETS — the quantified answer to one competitiveness demand set. |
| M · 30 `short-formats/` | Political-reality overlay (live window / open gap / moved on), including the international-credits file. |
| M · 31 `digital-energy-roadmap/` | Coherence check of one Commission strategy against ESABCC advice — the *method template* for claim-by-claim checking. |

The proposals below fill what is missing: the security *value* of climate
policy quantified, the manufacturing (not price) leg of competitiveness, the
leakage evidence, the materials stress test, the fiscal squeeze, and the
claims themselves.

---

## Ranked proposals

| # | Proposal | R | F | Total |
|---|----------|---|---|-------|
| P1 | Climate Security Ledger — avoided fossil imports | 10 | 8 | **18** |
| P2 | Clean-Tech Manufacturing Scoreboard — NZIA distance-to-benchmark | 9 | 8 | **17** |
| P6 | Competitiveness Claims Register — steel-manned | 9 | 7 | **16** |
| P4 | Critical Raw Materials × 2040 pathway stress test | 8 | 7 | **15** |
| P3 | CBAM & Leakage Watch | 8 | 6 | **14** |
| P8 | Grid & Interconnection Security Ledger | 7 | 7 | **14** |
| P5 | Climate Investment vs Rearmament — the fiscal squeeze | 8 | 5 | **13** |
| P7 | Trade-Partner Climate Policy & Article 6 Tracker | 7 | 6 | **13** |

---

### P1 · Climate Security Ledger — what climate policy buys in avoided fossil imports

**Report question served.** "What has EU climate policy already done for
energy security, and what is the security cost of each remaining policy
gap?" This re-reads the gap register in the language the Council currently
speaks — every gap becomes not only tonnes of CO₂ but bcm of gas and euros
sent abroad.

**Method (deterministic, slider-driven, in the M · 29 / M · 41 style).**

1. *Backward-looking leg — what was already avoided.* For each fossil fuel
   f (gas, oil, hard coal) and year t since 2015, compute a counterfactual
   demand under a frozen-structure baseline: 2015 fuel intensity per unit
   of activity (heating degree-day-corrected household demand, industrial
   value added, km travelled), scaled by actual activity in t. Avoided
   imports(f, t) = (counterfactual demand − actual demand) × import
   share(f, t). The frozen-2015 baseline is crude and says so — it is a
   slider (frozen-2015 / frozen-2019 / PRIMES 2016 reference), because the
   choice of counterfactual is the whole result and hiding it would violate
   ground rule 5.
2. *Valuation.* Avoided import bill = avoided volume × border price under
   three switchable price scenarios: 2019 average, 2022 crisis peak,
   latest forward curve. Report € and € per EU citizen. Numbers in
   `font-mono tabular-nums`, every price with a source locator.
3. *Supplier decomposition.* Split the avoided volume by pre-2022 supplier
   shares so the "avoided Russian imports" line is explicit, alongside the
   post-2022 reality (US LNG share ↑ — a *new* dependency, recorded for
   even-handedness: diversification is not independence).
4. *Forward-looking leg — the security cost of each gap.* For each 2024
   gap that has a quantifiable delivery shortfall (via the indicator-check
   page and EEA WEM/WAM), translate the shortfall into extra fossil demand
   using the same intensity coefficients, then into import volume and bill
   under the three price scenarios. Output: a per-gap "security cost"
   column that can be joined onto the Policy Gap Tracker
   (`beta/modules/policy-gaps/`) by gap id.
5. *Stress test.* One slider replays a 2022-style price shock on the 2030
   WEM vs WAM vs ESABCC-advised demand levels — the difference in exposure
   is the security value of closing the gaps.

**Data.** Eurostat energy balances (`nrg_bal_c`), imports by partner
(`nrg_ti_gas`, `nrg_ti_oil`, `nrg_ti_sff`), COMEXT values for prices; EEA
WEM/WAM projections already used by M · 02. Eurostat/EEA hosts are blocked
from this sandbox — pulls run via the GitHub-runner workflows per
[`docs/how-to-access-eurostat-eea-data.md`](docs/how-to-access-eurostat-eea-data.md),
snapshots committed under `public/data/climate-security/`.

**Why beta.** The counterfactual is an order-of-magnitude reconstruction,
not an attribution study (it cannot separate climate policy from the price
shock itself — say so in the caveat box, prominently). Not citable as a
quantitative finding without Secretariat review of the intensity
coefficients.

---

### P2 · Clean-Tech Manufacturing Scoreboard — NZIA distance-to-benchmark

**Report question served.** The competitiveness debate is mostly argued on
*prices* (covered by M · 34); the other half is *who manufactures the
transition*. Is the EU on track for the Net-Zero Industry Act's 40 %
domestic-manufacturing benchmark, and does closing each climate gap deepen
or reduce import dependence?

**Method.**

1. *Targets as verbatim law.* Extract the NZIA (Reg. (EU) 2024/1735)
   benchmarks — 40 % of deployment needs manufactured domestically by
   2030, ≈15 % of world production by 2040 — as Policy-Targets-Register
   entries (verbatim provision text, CELEX, consolidated version), and
   register them in M · 36 in the same pass.
2. *Denominator.* Deployment need per technology (solar PV, wind,
   batteries, heat pumps, electrolysers, grid equipment) from the scenario
   sets already in the hub (M · 02 / the 2040 advice scenarios), expressed
   in the technology's native unit (GW/yr, GWh/yr).
3. *Numerator.* EU manufacturing capacity per technology from published
   industry/JRC sources (JRC Clean Energy Technology Observatory annual
   reports, SolarPower Europe, WindEurope, battery-capacity trackers),
   every figure with source + year; where sources disagree, show the range
   rather than picking silently.
4. *Distance and pace.* EEA-style distance-to-target and pace ratio
   (required annual capacity growth vs observed 3-year trend), the same
   arithmetic as the `policy-coherence/` pace ratios, defined once and
   reused.
5. *Import penetration.* COMEXT monthly imports for a committed,
   deterministic CN-code list per technology (the code list is data with a
   provenance block, like `trade-flows/trade-data.ts`), with supplier
   concentration (HHI and top-supplier share). This reuses the
   trade-flows fetch pattern rather than inventing a new pipeline.
6. *The join that makes it a policy-gap surface.* Each technology maps to
   the mitigation levers in `cleantech-catalogue.ts` and to the gaps whose
   closure drives its deployment — so the module can answer, per gap:
   "closing this gap at current manufacturing shares means importing X %
   of the kit, mostly from China" vs "with NZIA benchmarks met, Y %".

**Why beta.** Capacity numbers are industry-reported and lumpy;
announcement-to-FID attrition means the pipeline column is soft. AI-compiled
pending human verification.

---

### P6 · Competitiveness Claims Register — steel-manned

**Report question served.** The omnibus and Clean Industrial Deal debates
run on a small set of recurring claims ("EU energy prices are 2–3× the US",
"reporting burden costs €X bn", "the ETS is deindustrialising Europe",
"simplification is deregulation by another name" — from both directions).
The report needs to know which claims survive contact with evidence.

**Method** (the M · 44 / fact-check machinery applied to political claims):

1. *Register.* Each claim recorded verbatim (≤60 words, quote as a
   substring of the source), with speaker, forum, date, link. Sources:
   Council conclusions, EP resolutions, Commission communications, Draghi
   report, member-state non-papers, major industry-association position
   papers. Both pro- and anti-ambition claims — the even-handedness rule
   is structural here, not decorative: the register schema has a
   `direction` field and the UI shows the two columns side by side.
2. *Decomposition.* Each claim split into checkable propositions
   (deterministic: a proposition = one quantity or one causal statement).
3. *Verdicts.* Per proposition, the docs-internal verdict bands —
   SUPPORTED / REVISION (right order, wrong number) / UNSUPPORTED / NOT
   CHECKABLE — each verdict recording *what the check proves* (a price
   comparison cannot prove a causation claim).
4. *Steel-man column.* For every claim rated UNSUPPORTED, the strongest
   defensible version of it, with its own source. This is ground rule 9
   made into a schema field, and it is what would distinguish the module
   from advocacy.
5. *Cross-links.* Claims about the ETS resolve to M · 29's modelled
   numbers; price claims to M · 34; burden claims to the omnibus rows in
   M · 39.

**Why beta.** Politically the most sensitive proposal on this list —
verdicts on named actors' claims need Secretariat sign-off before anything
is shown beyond the team, and the claim selection itself must be audited
for balance (record the selection rule, not just the selections).

---

### P4 · Critical Raw Materials × 2040 pathway stress test

**Report question served.** Does the decarbonisation pathway break on
materials? The CRMA benchmarks exist precisely because the transition is
import-constrained; the report should say whether the climate pathway and
the CRMA pathway are mutually consistent.

**Method.**

1. *Demand side.* Deployment volumes per technology from the 2040
   scenarios × published material-intensity coefficients (kg/MW, kg/GWh)
   from JRC SCRREEN / RMIS — coefficients are data with locators, and the
   intensity trend (thrifting) is a slider, not an assumption baked in.
2. *Supply side.* CRMA (Reg. (EU) 2024/1252) 2030 benchmarks — 10 %
   extraction, 40 % processing, 25 % recycling, ≤65 % single-third-country
   share per strategic raw material — as verbatim Policy-Targets entries;
   current values per material from JRC RMIS.
3. *Stress metric.* Per material: 2030/2040 EU demand under the advised
   pathway vs (EU supply under benchmarks met) vs (supply at current
   shares). The gap, expressed in each material's units and as
   "months of deployment at risk if the top supplier restricts exports"
   — a deterministic exposure figure, not a probability.
4. *Both directions.* Record where *more* climate ambition reduces
   dependency (recycling loops, demand-side measures, wind vs gas turbines
   fuel trade-off) alongside where it increases it (rare earths,
   graphite). The net sign per pathway is the headline.
5. *Reuse.* The dependency register in `trade-flows/trade-data.ts` is the
   starting inventory; this module adds the forward-looking demand join.

**Why beta.** Material-intensity coefficients vary by a factor of 2–3
across sources; the module must show ranges and is not citable until the
coefficient set is human-reviewed.

---

### P3 · CBAM & Leakage Watch

**Report question served.** Carbon leakage is *the* competitiveness
objection to the ETS, and CBAM is the answer on trial: the definitive
regime started 1 January 2026, free allocation phases down from this year.
Is there observable leakage, and does CBAM's design hold?

**Method.**

1. *Import series.* Monthly COMEXT imports (volume and value) for the
   CBAM Annex I CN codes (cement, iron/steel, aluminium, fertilisers,
   electricity, hydrogen), 2019 → present, indexed to a pre-2026 trend.
   The trend-splice logic and its limits are stated exactly as the
   fact-check convention requires: a splice can flag a break, it cannot
   prove causation.
2. *Three deterministic indicators, each with a stated failure mode:*
   - **Volume break** — post-2026 imports vs the 2019–25 trend band;
   - **Resource shuffling proxy** — supplier-mix shift toward
     low-reported-intensity exporters without a fall in those exporters'
     national production intensity (flags clean-plant-for-export
     allocation);
   - **Downstream displacement** — import growth in *unprotected*
     downstream codes (the "screws and cars" gap): fabricated steel
     products, aluminium structures, downstream chemicals. This is the
     structurally interesting one, because it is a *design* gap the report
     can address, not a market outcome.
3. *Event ledger.* Dated register of third-country responses (WTO
   filings, retaliation threats, carbon-pricing adoption citing CBAM),
   each entry sourced — the geopolitical feedback loop in one table.
4. *Verdict discipline.* Every indicator renders with an explicit "what
   this can and cannot show" panel; no causal language in headlines.

**Why beta.** Few months of definitive-regime data exist; early series are
noisy and revision-prone. The module's honesty depends on refusing to call
leakage before the data can.

---

### P8 · Grid & Interconnection Security Ledger

**Report question served.** Electrification (M · 37's 46 %-by-2040 leg) is
the delivery mechanism for most gap closures, and it runs on
infrastructure that is now both an investment gap and a security target
(Baltic Sea cable incidents, substation sabotage).

**Method.** Three panels, all deterministic:

1. *Interconnection target.* The 15 %-by-2030 electricity interconnection
   target as a verbatim policy-target entry; per-member-state current
   ratios (ENTSO-E / Commission monitoring reports) with distance-to-target
   — the NECPR-style "what actually compares" caveats apply and are
   stated.
2. *Investment gap.* Grid investment need (Commission Grid Action Plan,
   ENTSO-E TYNDP figures, each with locator) vs realised investment;
   pace ratio.
3. *Incident ledger.* Dated, sourced register of physical/cyber incidents
   on EU energy infrastructure since 2022 (Nord Stream, Balticconnector,
   Estlink 2, LV/EE/LT desynchronisation milestones as the positive
   counterpart). Classification by deterministic vocabulary (asset type,
   confirmed/suspected attribution — attribution always quoted from the
   investigating authority, never asserted).

**Why beta.** The incident ledger is compiled from press and official
statements of varying reliability; attribution claims are exactly the kind
of content that must be quoted, not asserted.

---

### P5 · Climate Investment vs Rearmament — the fiscal squeeze

**Report question served.** The report's recommendations land in the MFF
2028-34 negotiation, where climate investment, rearmament and debt rules
compete for the same euros. What does the squeeze actually look like?

**Method.** An M · 29-style transparent accounting board:

1. *Need side.* Published climate-investment-need estimates (Commission
   SWDs, I4CE European Climate Investment Deficit, Draghi report), each a
   labelled row with locator and scope notes — they measure different
   things, and the module's first job is to make them non-comparable
   *visibly* rather than average them.
2. *Committed side.* MFF climate-mainstreaming share, RRF expiry 2026,
   ETS revenues (with the Phase-5 IDB €100bn), Social Climate Fund;
   national capex from NECPs where stated.
3. *Defence trajectory.* NATO commitment arithmetic (3.5 % + 1.5 % of
   GDP), SAFE €150bn, national escape-clause activations — sourced rows,
   not projections.
4. *The squeeze.* Conservative/Central/Maximalist scenarios for how much
   of the defence increment displaces public climate investment (0 % /
   partial / full crowd-out), with the honest statement that the
   displacement share is a *political* variable — so it is the headline
   slider, not a hidden assumption. Output: the climate investment gap
   with and without the squeeze, in € and as years of delay at current
   pace.
5. *Alignment recorded alongside* (ground rule 9): dual-use overlaps
   where security spending *is* climate-adjacent (grid hardening,
   fuel-independence of forces), sourced.

**Why beta.** Highest fabrication risk on this list — the need-side
estimates are heterogeneous and the crowd-out share is unknowable. Ships
only with the range-not-average discipline enforced in the UI.

---

### P7 · Trade-Partner Climate Policy & Article 6 Tracker

**Report question served.** The ETS Phase-5 proposal leans on ≈260 Mt of
international credits and CBAM assumes partners respond; both are bets on
other jurisdictions. What is the actual state of play?

**Method.**

1. *Partner register.* US, UK, China, India, Türkiye, Japan, Brazil, Gulf
   states: carbon-price coverage and level (World Bank State & Trends,
   ICAP), 2035 NDC status, CBAM stance, ETS-linkage prospects — one
   sourced row per partner, deterministic status vocabulary
   (in-force / adopted / proposed / rolled-back).
2. *Article 6 supply pipeline.* Authorised and issued volumes by host
   country and method from the UNFCCC registry snapshots; a
   credibility band (echoing the integrity-haircut logic in M · 26) for
   how much of the 260 Mt could plausibly be supplied at quality — shown
   as a range against the demand bar.
3. *Rollback watch.* Dated ledger of partner-policy reversals (US federal
   rollbacks and their state-level counterweights), because the report's
   international-context chapter needs the trajectory, not a snapshot.

**Why beta.** Partner-policy status changes weekly; the register is a
snapshot with a compile date, refresh via a scripted pull where a stable
API exists (World Bank), manual otherwise.

---

## Recommendation

Build **P1 (Climate Security Ledger)** first: it is the highest-relevance
item, it is buildable from data pipelines the hub already exercises
(Eurostat balances + EEA WEM/WAM), it directly annotates the existing gap
register rather than standing beside it, and it gives the report the
security framing in *quantities* rather than rhetoric. **P2** is the
natural second build (manufacturing leg of competitiveness, reusing the
trade-flows fetch pattern and the Policy Targets register). **P6** is the
highest-value *method* contribution but should start only once the
Secretariat has agreed the claim-selection rule.

Each build follows the canonical minimal set in
[`beta/README.md`](beta/README.md) (page + model/data + `src/app/beta/`
stub + registry row + `experimentalModules` entry + docs mirrors), takes
the next free number at build time (M · 45 onwards), and lands with its own
fact-check pass in `docs-internal/` before anything is shown as more than
AI-compiled.

## Deferred backlog — good ideas deliberately not proposed this round

- **Military emissions inventory** — reporting exemptions make the data
  layer too thin to meet ground rule 1; revisit if UNFCCC reporting changes.
- **Hydrogen import-corridor geopolitics** (Morocco, Gulf, Norway) —
  premature: too few FIDs to analyse rather than speculate.
- **Sanctions-evasion / shadow-fleet tracking** — outside the Board's
  mandate rings (context, not core) and better served by specialised
  outfits.
- **Climate-driven migration as a security frame** — EUCRA covers the
  risk side; a securitised framing needs a Board position first.
- **Defence-industry decarbonisation options** — worthwhile, but it is an
  industry-project item, not a policy-gap-report item.
