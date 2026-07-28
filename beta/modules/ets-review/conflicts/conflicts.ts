/**
 * CONFLICTS — the crossing of ESABCC advice (ADVICE_CORE + ADVICE_WIDER)
 * against the Commission's 17 July 2026 package (PACKAGE_POSITIONS).
 *
 * Work package WP3 of the "Advice conflicts" submodule (beta module M·37,
 * ETS Review). AI-analysed (Sonnet agent, WP3) from the two advice-position
 * arrays and the package-position array, pending Secretariat verification —
 * do not treat any classification, score or reasoning chain here as final
 * until checked by a human reviewer against the underlying sources.
 *
 * Method: a theme-by-theme cross-map of ADVICE_CORE/ADVICE_WIDER against
 * PACKAGE_POSITIONS was built first; each finding below records only where
 * the quoted evidence on both sides supports a genuine conflict or
 * alignment (see work-packages/WP3-conflict-analysis.md for the fourteen
 * candidate hypotheses tested and the method that produced this set).
 */

import { severityScore, type ConflictFinding } from './types';
import { ADVICE_CORE } from './advice-core';
import { ADVICE_WIDER } from './advice-wider';
import { PACKAGE_POSITIONS } from './package-positions';

/* istanbul ignore next -- dev-time integrity check, not part of the public surface */
function assertIdsResolve(): void {
  const adviceIds = new Set([...ADVICE_CORE, ...ADVICE_WIDER].map((a) => a.id));
  const packageIds = new Set(PACKAGE_POSITIONS.map((p) => p.id));
  for (const f of CONFLICTS) {
    for (const id of f.packageIds) {
      if (!packageIds.has(id)) throw new Error(`${f.id}: unknown packageId ${id}`);
    }
    for (const id of f.adviceIds) {
      if (!adviceIds.has(id)) throw new Error(`${f.id}: unknown adviceId ${id}`);
    }
  }
}

export const CONFLICTS: ConflictFinding[] = [
  /* ============================================================ conflicts */
  {
    id: 'cf-cap-ambition-below-advised-range',
    kind: 'ambition-gap',
    theme: 'cap-ambition',
    title: '2040 ambition (85–87%, ~80% independently) falls short of the advised 90–95% domestic range',
    packageIds: ['pp-ambition-85-87-contested', 'pp-cap-trajectory-model-range'],
    adviceIds: ['ap-2040-headline-range', 'ap-cl2025-domestic-9095-budget', 'ap-2040-fairness-floor'],
    esabccAsk:
      'Keep the 2030–50 EU GHG budget within 11–14 Gt CO2e, requiring domestic emission reductions of 90–95% by 2040, with 90% as the fairness-driven floor.',
    packageDoes:
      'Presents the package as delivering an 85–87% reduction by 2040 on the Commission’s own figures, with an independent analysis (Climact) estimating the tabled text at only around 80%.',
    scores: { magnitude: 3, directness: 2, bindingness: 2, centrality: 3 },
    scoreRationale: {
      magnitude:
        '3 — the gap between an 85–87% (or ~80% per Climact) outcome and the Board’s 90–95% domestic range concerns the EU’s entire economy-wide emissions trajectory and the 11–14 Gt 2030–50 budget, the headline metric of the whole 2040-target advice.',
      directness:
        '2 — the package heads in the same direction (deep reduction) but stops short of the advised 90% floor, and the final percentage remains open because "the proposal is entering trialogue, so the architecture and figures may still shift", leaving interpretive room rather than a flat rejection of the range.',
      bindingness:
        '2 — COM(2026) 616 is a binding legislative proposal, but its own cap trajectory is explicitly modelled with a spread (PRIMES vs POTEnCIA giving a 2035 cap of 560–670 Mt for the same 85% target) and remains subject to trialogue negotiation, so the 85–87% figure is not yet locked in.',
      centrality:
        '3 — the 90–95% domestic range and its corresponding 11–14 Gt budget are the headline recommendation of the Board’s flagship 2040-target advice, reaffirmed in the 2025 Climate Law amendment advice.',
    },
    reasoning: [
      'The Board’s headline advice (ap-2040-headline-range, ap-cl2025-domestic-9095-budget) sets a domestic 90–95% reduction by 2040, with 90% as the fairness-driven floor (ap-2040-fairness-floor).',
      'The Commission’s own communications put the package’s delivered reduction at 85–87% by 2040, with the independent Climact analysis estimating only ~80% for the tabled text (pp-ambition-85-87-contested).',
      'Even on the Commission’s own higher figure, 85–87% falls below the Board’s 90% minimum; the modelled cap trajectory itself carries a wide model-dependent spread (pp-cap-trajectory-model-range), so no scenario in the current text reaches the advised range.',
      'Because the trajectory has not yet cleared trialogue, this is an ambition-gap rather than a contradiction: the package points in the advised direction but at a level below what the Board asked for, with the final figure still capable of moving in either direction.',
    ],
  },
  {
    id: 'cf-international-credits-domestic-only',
    kind: 'contradiction',
    theme: 'international-credits',
    title: 'Up to 2% international credits inside the cap contradicts the Board’s domestic-only delivery advice',
    packageIds: ['pp-credits-260mt-2036-40', 'pp-credits-2033-review-condition'],
    adviceIds: ['ap-cl2025-no-intl-credits-for-target', 'ap-cl2025-article6-domestic-only', 'ap-2040-domestic-plus-outside-eu'],
    esabccAsk:
      'Meet the 2040 target through domestic action only; international carbon credits, including Article 6 credits, must not substitute for domestic emission reductions.',
    packageDoes:
      'Re-admits up to 2% high-quality international credits inside the ETS cap from 2036, worth roughly 260 Mt cumulative over 2036–40.',
    scores: { magnitude: 2, directness: 3, bindingness: 2, centrality: 3 },
    scoreRationale: {
      magnitude:
        '2 — at ~260 Mt cumulative over 2036–40, the credits volume is an order-of-hundred-Mt addition that weakens a core instrument (domestic-only delivery), though it is around 2% of the Board’s 11–14 Gt 2030–50 budget, short of a "material share".',
      directness:
        '3 — the Board states explicitly it "does not recommend using international carbon credits to replace domestic emission reductions when meeting the 2040 target" and that Article 6 credits "cannot substitute for domestic emission reductions and carbon removals"; the package adopts exactly this design by admitting credits inside the cap.',
      bindingness:
        '2 — the credits pathway is written into the proposed legislation but is explicitly conditional: "a 2033 review must find high-integrity, cost-effective credits available", with a defined fallback if it fails, matching a binding-but-contingent design rather than an unconditional commitment.',
      centrality:
        '3 — domestic-only delivery is repeated headline advice across two flagship reports, the 2040-target advice and the 2025 Climate Law amendment advice.',
    },
    reasoning: [
      'The Board’s Climate Law advice is explicit and repeated: international credits "cannot substitute for domestic emission reductions and carbon removals" (ap-cl2025-article6-domestic-only) and should not "replace domestic emission reductions when meeting the 2040 target" (ap-cl2025-no-intl-credits-for-target).',
      'The package reintroduces up to 2% international credits inside the ETS cap from 2036, worth ~260 Mt cumulative 2036–40 (pp-credits-260mt-2036-40) — precisely the substitution mechanism the Board advises against.',
      'This is a contradiction, not merely a gap: the Board named this specific design (Article 6 credits inside a domestic target) and advised against it, and the package adopts it regardless.',
      'The package’s own conditionality — a 2033 availability review, with a fallback LRF tightening to 2.7% if it fails (pp-credits-2033-review-condition) — shows the Commission itself treats the credits pathway as uncertain, but does not remove the substitution from the binding proposal as tabled.',
    ],
  },
  {
    id: 'cf-removals-net-gross-ambiguity',
    kind: 'tension',
    theme: 'removals',
    title: 'Net/gross netting ambiguity undercuts the Board’s call for three separate, unambiguous removal targets',
    packageIds: ['pp-removals-net-gross-ambiguity', 'pp-removals-250mt-on-top-of-cap'],
    adviceIds: ['ap-cl2025-three-separate-targets', 'ap-cdr-separate-targets', 'ap-cdr-mitigation-deterrence'],
    esabccAsk:
      'Set separate, legally-binding 2040 targets for gross emission reductions, permanent removals and temporary removals, so removals cannot mask a shortfall in actual cuts.',
    packageDoes:
      'Integrates 250 Mt of permanent removals on top of the cap via Article 9c, using a netting design (CR2/CR3) that the impact assessment itself says can leave the net-of-removals figure equal to the gross figure.',
    scores: { magnitude: 2, directness: 1, bindingness: 2, centrality: 2 },
    scoreRationale: {
      magnitude:
        '2 — the 250 Mt removals pool (pp-removals-250mt-on-top-of-cap) is an order-of-hundred-Mt element of the ETS architecture, and if the net/gross figures silently converge as the impact assessment warns, the effective shortfall could reach that same order of magnitude.',
      directness:
        '1 — the Board does not forbid removals-integration outright — the wider carbon-removals report endorses "progressive integration… under strict conditions" — so this is a divergence by omission: the safeguard it asks for — separate, unambiguous gross/removals accounting — is what the CR2/CR3 netting design lacks, per the statement that "the net can silently equal the gross and miss the target" (pp-removals-net-gross-ambiguity).',
      bindingness:
        '2 — Article 9c is proposed binding law, but the specific netting choice between CR2 and CR3 is itself an open impact-assessment option rather than a fixed, adopted rule, so the ambiguity is still resolvable before adoption.',
      centrality:
        '2 — three separate targets is a key, repeated recommendation across both the 2025 Climate Law advice (ap-cl2025-three-separate-targets) and the 2025 carbon-removals report (ap-cdr-separate-targets), though not itself the single headline figure of a flagship report.',
    },
    reasoning: [
      'The Board recommends three separate, legally-binding 2040 targets — gross reductions, permanent removals, temporary removals — precisely "to ensure that… removals contribute effectively… without deterring emission reductions" (ap-cl2025-three-separate-targets, ap-cdr-separate-targets), and separately warns that optimistic removals assumptions risk "mitigation deterrence" if the assumed volume fails to materialise (ap-cdr-mitigation-deterrence).',
      'The package’s Article 9c integrates 250 Mt of removals on top of the cap (pp-removals-250mt-on-top-of-cap), but the underlying netting design leaves the gross/net split ambiguous: under CR2 the gross outcome is "uncertain and unlimited", and CR3 sets a maximum but no minimum, so "the net can silently equal the gross and miss the target" (pp-removals-net-gross-ambiguity).',
      'This is a tension rather than a contradiction: the Board does not oppose ETS integration of removals as such, but the specific safeguard it requires — a clear, separate accounting of gross reductions versus removals — is what the current netting options fail to guarantee.',
      'Severity turns on whether the eventual CR2/CR3 choice (and any minimum-removals floor) closes the ambiguity before adoption; as drafted, the risk is structural rather than merely presentational.',
    ],
  },
  {
    id: 'cf-removal-delivery-risk',
    kind: 'tension',
    theme: 'removals',
    title: 'Revenue-driven, cost-uncertain removal delivery lacks the guarantees the Board requires before relying on removals',
    packageIds: ['pp-removals-revenue-driven-delivery', 'pp-removals-target-may-not-be-met', 'pp-removals-daccs-cost-uncertainty'],
    adviceIds: ['ap-cdr-mitigation-deterrence', 'ap-cdr-liability-reversal', 'ap-cdr-mrv-quality'],
    esabccAsk:
      'Only rely on removals where delivery is robustly guaranteed — solid MRV, liability for reversal — because unmet removals assumptions directly jeopardise the EU’s climate objectives.',
    packageDoes:
      'Makes the 250 Mt removals pool revenue-driven rather than a firm commitment, with the impact assessment itself stating the net objective could be missed if removals are not cost-competitive, against a DACCS cost band its own analysis treats as not yet reliably estimated.',
    scores: { magnitude: 2, directness: 1, bindingness: 1, centrality: 2 },
    scoreRationale: {
      magnitude:
        '2 — the entire 250 Mt removals pool is at risk of under-delivery ("the modelled assumptions would simply not be met", pp-removals-target-may-not-be-met), an order-of-hundred-Mt exposure that weakens the ETS’s net-objective delivery, the exact mitigation-deterrence risk the Board describes (ap-cdr-mitigation-deterrence).',
      directness:
        '1 — the Board does not forbid removals-linked delivery risk; it asks for it to be managed through MRV and liability safeguards (ap-cdr-mrv-quality, ap-cdr-liability-reversal), which is a safeguard the package’s revenue-driven design (pp-removals-revenue-driven-delivery) does not itself supply — a divergence by omission.',
      bindingness:
        '1 — the delivered tonnage is explicitly not a hard commitment: "it is not a hard commitment to 250 Mt delivered" (pp-removals-revenue-driven-delivery), so the removals element functions closer to a declared intention than a locked-in obligation, even though it sits inside binding legislation.',
      centrality:
        '2 — MRV robustness and mitigation-deterrence are recurring, detailed recommendations across the whole 2025 carbon-removals report, though not the single headline figure of a flagship report.',
    },
    reasoning: [
      'The Board warns that treating removals as a ready substitute for cuts "risks… mitigation deterrence, which can jeopardise the achievement of the EU climate objectives if the expected volume of removals does not materialise" (ap-cdr-mitigation-deterrence), and requires robust MRV (ap-cdr-mrv-quality) and liability mechanisms for reversal (ap-cdr-liability-reversal) before removals are relied upon.',
      'The package’s own impact assessment states that under its preferred option, "as long as removals are not cost competitive… the EU ETS [misses] its net objective… the modelled assumptions would simply not be met" (pp-removals-target-may-not-be-met), and that delivered tonnage depends on "auction revenue vs removal cost" rather than a fixed target (pp-removals-revenue-driven-delivery).',
      'That delivery risk is compounded by cost uncertainty: DACCS is costed at €185–370/t in 2040 while "reliable cost estimates are only available for BECCS" (pp-removals-daccs-cost-uncertainty), meaning a material share of the removals pool rests on the least-certain technology cost in the impact assessment’s own modelling.',
      'This is a tension: the Board does not forbid the mechanism, but the safeguards it requires against exactly this failure mode — MRV, liability, caution about optimistic cost assumptions — are not built into a design the impact assessment itself admits may simply not deliver.',
    ],
  },
  {
    id: 'cf-lrf-backloading-cumulative-budget',
    kind: 'tension',
    theme: 'carbon-budget',
    title: 'The two-step LRF cut defers stringency and expands the cumulative 2031–40 budget against the Board’s early-action logic',
    packageIds: ['pp-lrf-backloading', 'pp-carbon-budget-2031-40'],
    adviceIds: ['ap-cl2025-speed-matters', 'ap-2040-early-action-cumulative'],
    esabccAsk:
      'Prioritise early domestic action: "speed matters" because it minimises cumulative emissions and avoids abrupt reductions later.',
    packageDoes:
      'Cuts the Linear Reduction Factor from the legal default to 3.7% for 2031–35, then further to 1.7% for 2036–40 — a two-step, more gradual trajectory that expands the cumulative 2031–40 ETS budget.',
    scores: { magnitude: 3, directness: 2, bindingness: 3, centrality: 2 },
    scoreRationale: {
      magnitude:
        '3 — the modelled cumulative 2031–40 ETS carbon budget under the new LRF path runs 5,605–6,295 Mt, "substantially larger than the 4,436 Mt implied by the unchanged legal-default LRF" (pp-carbon-budget-2031-40) — an addition of over a thousand Mt CO2e, several hundred Mt or more by the rubric’s top anchor.',
      directness:
        '2 — the Board’s "speed matters" advice asks for early action and warns against deferring stringency ("avoiding abrupt reductions later", ap-cl2025-speed-matters); the two-step LRF (3.7% then a further cut to 1.7%) delivers a gentler trajectory across both periods rather than the front-loaded pace advised — a clear divergence, though not a design the Board names and rejects outright.',
      bindingness:
        '3 — the LRF is written directly into the proposed Directive and, unlike the credits pathway, carries no stated review or reversion condition, so it is proposed as binding law, unconditional once adopted.',
      centrality:
        '2 — pace of action ("speed matters") and minimising cumulative emissions are repeated principles across the 2023 and 2025 core advice, though the single headline figure is the 11–14 Gt budget itself rather than this trajectory-shape point.',
    },
    reasoning: [
      'The Board holds that "speed matters": early domestic action "minimis[es] cumulative emissions, avoid[s] abrupt reductions later" (ap-cl2025-speed-matters), and that going beyond minimum ambition earlier "would considerably decrease the EU’s cumulative emissions until 2050" (ap-2040-early-action-cumulative).',
      'The package cuts the LRF to 3.7% for 2031–35 and further to 1.7% for 2036–40 — "a two-step… more back-loaded path" (pp-lrf-backloading) — which the impact assessment’s own modelling shows expands the cumulative 2031–40 ETS budget to 5,605–6,295 Mt against 4,436 Mt under the unchanged default LRF (pp-carbon-budget-2031-40).',
      'This is a tension: the Board does not name and reject this specific LRF profile, but the pacing safeguard it asks for — front-loaded ambition to hold down cumulative emissions — is exactly what a lower, further-reduced LRF profile does not provide.',
      'Severity turns on the scale of the cumulative-budget effect (over a thousand Mt against the counterfactual) landing on an unconditional, binding element of the proposal, which raises the stakes relative to conditional elements elsewhere in the package.',
    ],
  },
  {
    id: 'cf-free-allocation-continuation',
    kind: 'contradiction',
    theme: 'pricing-scope',
    title: 'Continuing free allocation beyond 2030 and slowing CBAM phase-out to 2038 reverses the Board’s call to end it',
    packageIds: ['pp-free-allocation-cbam-continuity'],
    adviceIds: ['ap-2024-c6-expand-climate-revenue', 'ap-2024-c2-free-allocation-cbam', 'ap-cl2025-polluter-pays-broadening'],
    esabccAsk:
      'End free allowance allocation in the ETS and require CBAM revenues to fund climate/energy purposes, consistently applying the polluter-pays principle.',
    packageDoes: 'Continues free allocation beyond 2030 and slows the CBAM-linked phase-out from 2034 to 2038.',
    scores: { magnitude: 2, directness: 3, bindingness: 3, centrality: 2 },
    scoreRationale: {
      magnitude:
        '2 — free allocation exempts a substantial share of allowances from auctioning and is central to the Board’s leakage-protection framing; continuing it (and extending the CBAM phase-out by four years, 2034→2038) weakens a core instrument of the polluter-pays system, though no cumulative Mt figure is given in the source.',
      directness:
        '3 — Board recommendation C6 explicitly asks for "ending the free allowance allocation in the EU ETS" (ap-2024-c6-expand-climate-revenue); the package does the opposite, stating free allocation "will continue beyond 2030" (pp-free-allocation-cbam-continuity) — explicit opposition to the specific design advised against.',
      bindingness:
        '3 — free allocation continuation and the CBAM phase-out extension to 2038 are proposed directly in binding legislation, with no review or reversion condition stated.',
      centrality:
        '2 — ending free allocation is a repeated recommendation (C2, C6) across the Board’s flagship 2024 report, though it is one of several revenue/pricing recommendations rather than the single headline figure.',
    },
    reasoning: [
      'The Board’s recommendation C6 asks that free allowance allocation in the ETS be ended, alongside directing CBAM revenues to climate/energy purposes (ap-2024-c6-expand-climate-revenue), building on C2’s call to "further develop alternatives to free allocation" as the cap declines (ap-2024-c2-free-allocation-cbam) and the general call to apply "the polluter pays principle consistently across sectors" (ap-cl2025-polluter-pays-broadening).',
      'The package instead keeps free allocation beyond 2030 and slows the CBAM-linked phase-out for CBAM sectors from 2034 to 2038, alongside a separate benchmarks proposal raising industry free allocation by €6bn for 2026–30 (pp-free-allocation-cbam-continuity).',
      'This is a contradiction: the Board named the specific design — ending free allocation — and the package adopts the opposite, extending rather than winding it down.',
      'The severity is tempered by the absence of a quantified emissions or revenue Mt figure for this specific measure in the sources reviewed, but the explicit reversal of a repeated, named recommendation keeps directness and bindingness high.',
    ],
  },
  {
    id: 'cf-aviation-scope-partial',
    kind: 'ambition-gap',
    theme: 'pricing-scope',
    title: 'Aviation pricing extends only to ≤5,000 km flights from 2029, narrower and later than the Board’s extra-EU advice, and reversible',
    packageIds: ['pp-aviation-scope-extension', 'pp-aviation-corsia-revert-2032'],
    adviceIds: ['ap-2040-aviation-extra-eu-ets'],
    esabccAsk:
      '2026 legislation should cover extra-EU aviation through EU ETS inclusion and/or CORSIA, with an EU ETS extension to extra-EU flights required from January 2027 if CORSIA proves too weak.',
    packageDoes:
      'Extends ETS aviation scope only to flights ≤5,000 km from 2029, excluding the US, China and the Far East, with the extension itself reversible after a 2032 CORSIA review.',
    scores: { magnitude: 1, directness: 2, bindingness: 2, centrality: 1 },
    scoreRationale: {
      magnitude:
        '1 — the quantified aviation cap addition (+148 Mt for incoming/outgoing international aviation, itself flagged by the impact assessment as an uncertain PRIMES estimate, pp-aviation-scope-extension) is a low-hundreds-Mt figure, and the shortfall specifically attributable to excluding flights beyond 5,000 km is not separately quantified in the sources, so the effect is scored as indirect/limited.',
      directness:
        '2 — the Board asked broadly for extra-EU aviation to be covered "through inclusion in EU ETS and/or… CORSIA" from 2027 at the latest; the package delivers a narrower ≤5,000 km scope only from 2029, a clear divergence in coverage and timing but with interpretive room since CORSIA remains part of the package’s own architecture.',
      bindingness:
        '2 — the extension is proposed in binding legislation but is explicitly provisional: "a 2032 review of CORSIA can revert the scope to intra-EEA… or widen it if not" (pp-aviation-corsia-revert-2032), matching a binding-but-contingent design.',
      centrality:
        '1 — extra-EU aviation coverage is a specific, detailed sectoral recommendation within the flagship 2040-target-advice report, not itself a headline figure.',
    },
    reasoning: [
      'The Board asks that 2026 legislation cover extra-EU aviation via EU ETS and/or CORSIA, with an EU ETS extension "required from January 2027 if CORSIA proves too weak" (ap-2040-aviation-extra-eu-ets).',
      'The package extends ETS aviation scope only to departing flights within 5,000 km, from 2029 — excluding the US, China and the Far East — and adds business/private jets via a 10,000 tCO2/yr threshold (pp-aviation-scope-extension).',
      'The extension is also reversible: a 2032 CORSIA review can revert the scope back to intra-EEA only if CORSIA performs well, or widen it if not (pp-aviation-corsia-revert-2032) — later and narrower than, but in the same direction as, the Board’s advice.',
      'This is an ambition-gap: the package moves toward the advised direction (broader-than-EEA aviation pricing) but at a narrower scope, two years later than the Board’s 2027 backstop, and on a conditional rather than settled basis.',
    ],
  },
  {
    id: 'cf-electrification-46-vs-50',
    kind: 'ambition-gap',
    theme: 'electrification',
    title: 'The 46% indicative electrification target sits below the Board’s 50%-by-2040 benchmark and is not yet law',
    packageIds: ['pp-electrification-46pct-target', 'pp-electrification-q4-2026-legislation'],
    adviceIds: ['ap-2024-e5-electrification-50pct-2040'],
    esabccAsk:
      'In the pathways underpinning the Board’s 90–95% 2040 advice, electricity reaches 50% of final energy demand by 2040 (60% by 2050); lower-electrification pathways lean more on bioenergy or removals.',
    packageDoes: 'Sets an indicative direct-electrification target of 46% of final energy consumption by 2040, not yet enshrined in binding law.',
    scores: { magnitude: 2, directness: 2, bindingness: 1, centrality: 1 },
    scoreRationale: {
      magnitude:
        '2 — a 4-percentage-point shortfall against the Board’s 50% benchmark (ap-2024-e5-electrification-50pct-2040) is systemically significant because the Board’s own pathways show "pathways with lower electrification instead lean more heavily on bioenergy or carbon removal", compounding the removals and biomass risks flagged elsewhere, even though it is not itself an Mt figure.',
      directness:
        '2 — 46% is a clear, direct numeric shortfall against the Board’s 50%-by-2040 benchmark, though the benchmark is drawn from the Board’s own modelled pathways rather than a standalone electrification target, leaving some interpretive room.',
      bindingness:
        '1 — the 46% figure is explicitly "indicative for now", with binding legislation only intended for Q4 2026 via the post-2030 Energy Union package (pp-electrification-q4-2026-legislation) — a declared intention, reversible before adoption.',
      centrality:
        '1 — the 50% figure is a supporting indicator (E5) within the 90–95% pathway modelling of a flagship report, not itself the headline number.',
    },
    reasoning: [
      'The Board’s E5 indicator shows that in the pathways underlying its 90–95% 2040 advice, "electricity reaches 50% of final energy demand by 2040 and 60% by 2050", while lower-electrification alternatives "lean more heavily on bioenergy or carbon removal" (ap-2024-e5-electrification-50pct-2040).',
      'The Electrification Action Plan sets an indicative direct-electrification target of 46% of final energy consumption by 2040 (pp-electrification-46pct-target), four points below the Board’s 50% benchmark.',
      'The target is not yet binding: enshrining legislation is intended only for Q4 2026, "replacing the existing KPI of 32% by 2030" (pp-electrification-q4-2026-legislation), so both the level and the bindingness fall short of what the Board’s pathways imply is needed.',
      'This is an ambition-gap: direction matches (electrification is being pursued as a target for the first time), but level and legal status both sit below the advice.',
    ],
  },
  {
    id: 'cf-msr-intake-carbon-budget-risk',
    kind: 'tension',
    theme: 'cap-ambition',
    title: 'Halving the MSR intake rate risks the same carbon-budget loosening the Board flagged for MSR allowance sales',
    packageIds: ['pp-msr-reform-design', 'pp-carbon-budget-2031-40'],
    adviceIds: ['ap-crisis-msr-carbon-price'],
    esabccAsk:
      'Be cautious about using Market Stability Reserve mechanics to add allowance supply: selling MSR allowances "could increase the total carbon budget under the system by approximately 25 Mt CO2eq", trading revenue/liquidity needs against price-signal and budget integrity.',
    packageDoes:
      'Halves the MSR intake rate from 24% to 12%, keeping more allowances in circulation for longer in the name of liquidity and reduced price volatility.',
    scores: { magnitude: 1, directness: 1, bindingness: 3, centrality: 1 },
    scoreRationale: {
      magnitude:
        '1 — the Board’s own reference case for this type of MSR mechanic (its 2023 estimate of ~25 Mt CO2eq from MSR allowance sales, ap-crisis-msr-carbon-price) is a low-tens-of-Mt effect; keeping more allowances in circulation via a halved intake rate is directionally the same kind of budget-loosening mechanic, at an unspecified but plausibly similar order of magnitude.',
      directness:
        '1 — the Board’s warning concerns a different specific action (selling MSR allowances for crisis revenue in 2022–23), not the ETS review’s own intake-rate reform, so this is a divergence by structural analogy/omission rather than the Board opposing this exact 2026 measure.',
      bindingness:
        '3 — the MSR intake-rate reform (24%→12%) is proposed directly in binding legislation, with no stated review or reversion condition.',
      centrality:
        '1 — the Board’s MSR carbon-budget point is a specific, one-off quantified caution in a single crisis-response report, not a repeated or headline recommendation.',
    },
    reasoning: [
      'The Board’s 2023 energy-crisis advice flags that selling MSR allowances "could increase the total carbon budget under the system by approximately 25 Mt CO2eq", a direct trade-off between using the MSR for liquidity/revenue purposes and the integrity of the ETS’s carbon budget (ap-crisis-msr-carbon-price).',
      'The package’s MSR reform halves the intake rate from 24% to 12%, explicitly "to maintain liquidity and reduce excessive price volatility" (pp-msr-reform-design) — structurally the same kind of choice to keep more allowances in circulation rather than withdrawing them, feeding into the wider cumulative 2031–40 budget increase already modelled at 5,605–6,295 Mt versus 4,436 Mt under the unchanged framework (pp-carbon-budget-2031-40).',
      'This is a tension rather than a contradiction: the Board did not address this specific 2026 intake-rate design, but its underlying caution — that loosening MSR mechanics trades budget integrity for liquidity — applies by direct analogy.',
      'Severity is limited because the specific quantified precedent (25 Mt) is small and the mechanisms are not identical, but the finding is included because the same structural risk the Board named is present, unaddressed, in a fully binding element of the reform.',
    ],
  },
  {
    id: 'cf-ets-revenue-adaptation-gap',
    kind: 'tension',
    theme: 'fairness',
    title: 'ETS revenue reform (IDB, 50% earmarking) proceeds without resolving the adaptation-funding gap the Board flagged',
    packageIds: ['pp-idb-100bn', 'pp-revenue-earmarking-50pct'],
    adviceIds: ['ap-adapt-revenue-fairness', 'ap-adapt-resilience-by-design'],
    esabccAsk:
      'As ETS revenue instruments are reviewed, clarify funding responsibilities for just resilience/adaptation, and apply climate resilience by design across all EU policies including this review.',
    packageDoes:
      'Reforms ETS revenue use — the €100bn Industrial Decarbonisation Bank and a 50% national earmarking requirement — exclusively for industrial and sectoral decarbonisation, without addressing adaptation/resilience funding.',
    scores: { magnitude: 1, directness: 1, bindingness: 3, centrality: 1 },
    scoreRationale: {
      magnitude:
        '1 — the amounts affected (the €100bn IDB, 50% of national ETS revenue) are large in absolute terms, but the specific gap — absence of any adaptation/resilience earmarking — has no quantified climate-consequence figure in the sources, so it is scored as a small/indirect effect.',
      directness:
        '1 — the Board does not say ETS revenue reform must include adaptation earmarking; it says funding responsibilities "are not yet clear" and flags this as unresolved (ap-adapt-revenue-fairness), so the package’s silence on adaptation in its revenue reform is a divergence by omission rather than an explicit rejection.',
      bindingness:
        '3 — the IDB and the 50% earmarking requirement are both proposed as binding law with no adaptation carve-out or review condition attached.',
      centrality:
        '1 — the adaptation-funding-responsibility gap is a single, specific finding in one report (the 2026 adaptation report), not a repeated or headline recommendation.',
    },
    reasoning: [
      'The Board’s 2026 adaptation report notes that ETS auctioning revenue already funds the Social Climate Fund and Modernisation Fund under the polluter-pays principle, "while these funds can finance adaptation, funding responsibilities for just resilience are not yet clear" (ap-adapt-revenue-fairness), and separately asks that climate resilience be built in "by design across all EU policies, programmes, and decisions" (ap-adapt-resilience-by-design).',
      'The package’s ETS revenue reforms — the €100bn Industrial Decarbonisation Bank and the requirement that Member States earmark 50% of national ETS revenue — are both scoped to "decarbonise ETS sectors" and industrial decarbonisation (pp-idb-100bn, pp-revenue-earmarking-50pct), with no reference to adaptation or resilience funding.',
      'This is a tension: the Board does not forbid a mitigation-only revenue reform, but it flags the funding-responsibility gap as an open question precisely as ETS revenue instruments are being reviewed — and this review proceeds without resolving it.',
      'Severity is modest because the Board’s own language treats this as an unresolved question rather than a violated requirement, but the scale of revenue involved (€100bn-plus) means the opportunity cost of leaving it unaddressed is non-trivial.',
    ],
  },
  {
    id: 'cf-ten-e-scenario-misalignment',
    kind: 'ambition-gap',
    theme: 'carbon-budget',
    title: 'The package’s budget and electrification figures do not correct the overshoot the Board found in TEN-E infrastructure scenarios',
    packageIds: ['pp-carbon-budget-2031-40', 'pp-electrification-46pct-target'],
    adviceIds: ['ap-tene24-ghg-budget', 'ap-tene24-electrification-gap'],
    esabccAsk:
      'Energy-infrastructure planning scenarios (TYNDP/TEN-E) should stay within the Board’s 11–14 Gt 2030–50 GHG budget and match its electrification benchmark, since infrastructure choices lock in the pace of decarbonisation for decades.',
    packageDoes:
      'Sets its own ETS carbon budget (5,605–6,295 Mt for 2031–40 alone) and 46% electrification target within an infrastructure-planning landscape the Board has already found to exceed the 11–14 Gt ceiling and under-deliver on electrification.',
    scores: { magnitude: 2, directness: 1, bindingness: 1, centrality: 2 },
    scoreRationale: {
      magnitude:
        '2 — the draft TYNDP 2024 scenarios were found to reach 15.9 Gt (Distributed Energy) against the Board’s 11–14 Gt ceiling (ap-tene24-ghg-budget), an overshoot of at least 1.9 Gt — a large, order-of-Gt misalignment in the planning basis the wider energy system, including electrification build-out, depends on.',
      directness:
        '1 — the Board’s TEN-E findings concern a separate planning process (TYNDP scenarios), not the ETS review or Electrification Action Plan directly, so this is a divergence by omission/inference: the package does not correct or reference the flagged overshoot, rather than actively repeating it in its own text.',
      bindingness:
        '1 — neither the underlying TYNDP scenarios nor the package’s own budget/electrification figures are shown as bindingly reconciled with each other in the sources reviewed; the electrification target itself is indicative (pp-electrification-46pct-target).',
      centrality:
        '2 — the 11–14 Gt budget is headline Board advice, and the electrification benchmark is a repeated cross-report metric (E5, and the TEN-E finding), even though the specific TYNDP/ETS-review linkage is inferential rather than a single named recommendation.',
    },
    reasoning: [
      'The Board found that the draft TYNDP 2024 scenarios underpinning EU energy-infrastructure planning exceed its 11–14 Gt 2030–50 GHG budget — 15.9 Gt for the Distributed Energy scenario (ap-tene24-ghg-budget) — and separately fall below its electrification benchmark range for 2040 and 2050 (ap-tene24-electrification-gap).',
      'The ETS review’s own cumulative 2031–40 carbon budget runs 5,605–6,295 Mt (pp-carbon-budget-2031-40), and the Electrification Action Plan sets a 46% by-2040 target (pp-electrification-46pct-target) — both sit within the same lower-ambition direction the Board had already flagged in the infrastructure-planning basis, rather than correcting it.',
      'This is an ambition-gap at the level of overall coherence: the package’s own budget and electrification figures move in the advised direction but do not close the gap the Board identified in the wider planning system the package depends on for delivery (e.g. grid build-out for electrification).',
      'Severity is moderated because the link between the TYNDP scenarios and the ETS review/EAP is inferential rather than a direct textual cross-reference in the package documents themselves.',
    ],
  },
  {
    id: 'cf-evaluation-attribution-gap',
    kind: 'tension',
    theme: 'governance',
    title: 'The package’s own evaluation admits it cannot cleanly attribute headline ETS delivery claims to the instruments being reformed',
    packageIds: ['pp-attribution-industrial-reductions', 'pp-msr-effect-not-isolable'],
    adviceIds: ['ap-ct2023-systematic-transparent', 'ap-ct2023-side-effects-feasibility'],
    esabccAsk: 'Prepare climate-policy proposals through a systematic, transparent, evidence-based process that weighs feasibility, not headline numbers alone.',
    packageDoes:
      'The package’s own evaluation annex admits that headline ETS delivery claims (the ~50% stationary-installation reduction, the price-stabilising role of the MSR) cannot be cleanly attributed to the instruments being reformed.',
    scores: { magnitude: 1, directness: 1, bindingness: 0, centrality: 1 },
    scoreRationale: {
      magnitude: '1 — the finding concerns the evidentiary basis for policy claims rather than a direct emissions effect, so any consequence is indirect.',
      directness:
        '1 — the Board asks generally for a systematic, transparent process (ap-ct2023-systematic-transparent); it does not address this specific evaluation admission, so this is a divergence by omission rather than explicit opposition.',
      bindingness: '0 — the evaluation annex (Annex 15) is narrative/analytical text, not a binding legislative provision.',
      centrality: '1 — the process-quality recommendation is a specific, detailed ask from one initial-recommendations report, not a headline advice item.',
    },
    reasoning: [
      'The Board’s initial recommendations ask the Commission to follow "an approach that is systematic, transparent and guided by EU values" (ap-ct2023-systematic-transparent) and to weigh "side effects, co-benefits, resilience and feasibility" rather than emissions numbers alone (ap-ct2023-side-effects-feasibility).',
      'The package’s own evaluation annex admits that industrial emissions cuts were "primarily driven by a decline in levels of activity… unrelated to the ETS" rather than the carbon price, and that "decoupling could not be shown" (pp-attribution-industrial-reductions), and separately that "the individual effect of the MSR on confidence cannot be assessed" because no clean pre-MSR baseline exists (pp-msr-effect-not-isolable).',
      'This is a tension: the reform narrative (a strengthened MSR delivering price certainty, an ETS with a strong reduction record) rests on evidence the package’s own evaluation says cannot support clean attribution, which cuts against the standard of systematic, transparent policymaking the Board asked for.',
      'Severity is low: this is a non-binding, evidentiary caveat rather than a design choice with direct emissions consequences, but it is worth recording because it qualifies the confidence that should attach to the package’s own delivery claims.',
    ],
  },

  /* ============================================================ alignments */
  {
    id: 'cf-align-pricing-scope-broadening',
    kind: 'alignment',
    theme: 'pricing-scope',
    title: 'Waste incineration, maritime and aviation extensions genuinely broaden priced coverage, as the Board has repeatedly asked',
    packageIds: ['pp-waste-incineration-inclusion', 'pp-maritime-scope-extension', 'pp-aviation-scope-extension'],
    adviceIds: ['ap-cl2025-polluter-pays-broadening', 'ap-2024-kr13-expand-ghg-pricing'],
    esabccAsk: 'Broaden emission pricing and apply the polluter-pays principle consistently across sectors, expanding GHG pricing to sectors currently outside it.',
    packageDoes:
      'Brings waste incineration into the ETS, extends maritime scope to smaller vessels, and widens aviation scope to ≤5,000 km flights — genuinely broadening the sectors and activities priced.',
    scores: { magnitude: 2, directness: 2, bindingness: 2, centrality: 2 },
    scoreRationale: {
      magnitude:
        '2 — combined cap additions from waste incineration alone (roughly +41.5 to +42.2 Mt municipal, plus hazardous and landfill, pp-waste-incineration-inclusion) plus the maritime extension’s modelled cut of −124.3 Mt (−28.3%) cumulative 2030–50 (pp-maritime-scope-extension) together represent an order-of-hundred-Mt genuine broadening of priced coverage.',
      directness:
        '2 — the Board’s ask to broaden pricing "across sectors" and to "all major sectors" is delivered for waste, maritime and (partially) aviation, though the Board’s list of priority sectors (agri-food, LULUCF, upstream fossil fuels, ap-2024-kr13-expand-ghg-pricing) is broader than what the package actually covers, so some interpretive gap remains even within a clear alignment.',
      bindingness:
        '2 — the sectoral extensions are proposed in binding legislation, though the aviation element specifically is conditional on the 2032 CORSIA review, so bindingness is scored at the lower end for the group as a whole.',
      centrality: '2 — broadening pricing and applying polluter-pays consistently is a repeated recommendation across the 2024 and 2025 core reports, though not the single headline figure.',
    },
    reasoning: [
      'The Board has "repeatedly highlighted" that "broadening emission pricing and consistently applying the polluter pays principle across sectors is necessary" (ap-cl2025-polluter-pays-broadening), and recommends expanding GHG pricing "to all major sectors" currently outside it (ap-2024-kr13-expand-ghg-pricing).',
      'The package brings municipal waste incineration into the ETS (pp-waste-incineration-inclusion), extends maritime scope toward smaller vessels with anti-evasion safeguards (pp-maritime-scope-extension), and widens aviation scope to ≤5,000 km departing flights (pp-aviation-scope-extension).',
      'This is a genuine alignment: each extension moves a previously unpriced or partially priced activity into the carbon-pricing system, in the direction the Board has repeatedly asked for.',
      'The strength of alignment is tempered by data-quality caveats the impact assessment itself flags for the waste figures (built with "a buffer for underestimation" given "limited availability of measurement-based data") and by the fact that the Board’s own priority list for expansion (agriculture, LULUCF, upstream fossil fuels) remains largely uncovered.',
    ],
  },
  {
    id: 'cf-align-demand-side-measures',
    kind: 'alignment',
    theme: 'demand-reduction',
    title: 'The Action Plan’s demand-side measure families avoid relying on carbon pricing alone, as the Board’s demand-reduction advice asks',
    packageIds: ['pp-electrification-demand-side-measures', 'pp-electrification-pillar1-price-reform'],
    adviceIds: ['ap-2024-kr12-demand-reduction', 'ap-crisis-root-causes'],
    esabccAsk:
      'Pursue more ambitious energy and material demand reduction through new and strengthened policies, and tackle high energy prices by rebalancing demand and low-carbon supply rather than relying on ad hoc price interventions.',
    packageDoes:
      'Pairs the carbon price with four demand-side measure families (electricity-price reform, buildings, transport, industry) on the explicit logic that a uniform carbon price alone is too blunt an instrument.',
    scores: { magnitude: 1, directness: 2, bindingness: 1, centrality: 1 },
    scoreRationale: {
      magnitude:
        '1 — the demand-side measures are described qualitatively (four measure families) without a quantified emissions or Mt figure in the sources, so the climate benefit at stake, while plausibly meaningful, is scored as small/indirect on the available evidence.',
      directness:
        '2 — the package’s own stated logic — "a modest price plus targeted measures beats a very high price alone" (pp-electrification-demand-side-measures) — squarely matches the Board’s call for demand reduction "through new and strengthened policies" (ap-2024-kr12-demand-reduction) and its preference for structural demand/supply rebalancing over price-only tools (ap-crisis-root-causes), though the specific measures are not a one-to-one match to the Board’s own list (mobility, housing, material use, diets).',
      bindingness: '1 — the measure families sit within the Electrification Action Plan, a policy programme rather than adopted binding law for most of its component measures (the 46% target itself is indicative, pp-electrification-q4-2026-legislation).',
      centrality: '1 — demand reduction is a specific key recommendation (KR12) within the flagship 2024 report, not the single headline figure.',
    },
    reasoning: [
      'The Board recommends "pursuing more ambitious reductions in energy and material demand through new and strengthened policies" (ap-2024-kr12-demand-reduction), and in its energy-crisis advice prefers "reducing energy demand and increasing… low-carbon energy sources" over "ad hoc market interventions" (ap-crisis-root-causes).',
      'The Electrification Action Plan pairs its 46% target with four demand-side measure families — price reform, buildings, transport, industry — on the explicit basis that "the carbon price is a blunt, universal signal" while demand-side measures "remove the specific non-price barrier in each sector" (pp-electrification-demand-side-measures), including direct electricity-price reform via Pillar 1 (pp-electrification-pillar1-price-reform).',
      'This is an alignment: the package does not rely on carbon pricing alone, which is the structural risk the Board’s demand-reduction and crisis-response advice both warn against.',
      'The strength of alignment is limited by the lack of quantified targets for the demand-side measures themselves and by their non-binding, programmatic status within the Action Plan.',
    ],
  },
  {
    id: 'cf-align-msr-price-signal',
    kind: 'alignment',
    theme: 'cap-ambition',
    title: 'The reformed MSR’s modelled steady price path aligns with the Board’s welcome for a strengthened ETS price signal',
    packageIds: ['pp-msr-reform-design', 'pp-price-path-tnac-liquidity'],
    adviceIds: ['ap-crisis-electrification-price-signal'],
    esabccAsk: 'Align carbon-price signals with electrification goals; the Board "welcomes" the strengthening of the EU ETS.',
    packageDoes: 'Reforms the MSR (intake rate halved to 12%) with the modelled effect of a monotonic, steadily rising EUA price path to 2040 under the preferred policy options.',
    scores: { magnitude: 1, directness: 1, bindingness: 2, centrality: 1 },
    scoreRationale: {
      magnitude:
        '1 — the claimed effect is qualitative (a "monotonic and steady increase" in price) rather than a quantified Mt or price-level figure tied specifically to this design choice, so the climate benefit at stake is scored as small/indirect on present evidence.',
      directness:
        '1 — the Board’s 2023 statement welcomes ETS strengthening in general terms (ap-crisis-electrification-price-signal) rather than endorsing this specific 2026 MSR intake-rate design, so the match is thematic rather than a direct, named endorsement.',
      bindingness: '2 — the MSR reform is proposed binding law, but the price-path claim itself depends on the modelled policy option (PO2/PO3) rather than being an unconditional guaranteed outcome.',
      centrality: '1 — the 2023 statement is one specific welcoming remark in a crisis-response report, not a repeated or headline recommendation.',
    },
    reasoning: [
      'The Board’s energy-crisis advice recommends "aligning price signals with electrification goals" and explicitly "welcomes… strengthening of the EU Emissions Trading System" (ap-crisis-electrification-price-signal).',
      'The package’s MSR reform halves the intake rate to 12% to "maintain liquidity and reduce excessive price volatility" (pp-msr-reform-design), and the impact assessment models this design (MSR3, under PO2/PO3) as producing "a monotonic and steady increase in the price throughout the period, indicative of a healthy supply-demand balance" (pp-price-path-tnac-liquidity).',
      'This is an alignment in direction: a steadier, more predictable rising price signal is consistent with what the Board has welcomed as supporting electrification and investment.',
      'The strength of alignment is limited because the liquidity metric underpinning it (the TNAC-to-emissions ratio) still spans a wide range across policy options (0.25–0.68), and the package’s own evaluation elsewhere admits the MSR’s individual effect on price and confidence "cannot be assessed" (see the related governance tension, pp-msr-effect-not-isolable), so the predictability claim carries some uncertainty.',
    ],
  },
  {
    id: 'cf-align-idb-revenue-investment',
    kind: 'alignment',
    theme: 'investment-revenue',
    title: 'The €100bn Industrial Decarbonisation Bank and 50% earmarking deliver substantial climate-aligned revenue recycling',
    packageIds: ['pp-idb-100bn', 'pp-revenue-earmarking-50pct'],
    adviceIds: ['ap-crisis-revenue-earmarking', 'ap-2024-c6-expand-climate-revenue'],
    esabccAsk:
      'Earmark carbon-pricing revenue for climate-aligned investment; the Board welcomed full (100%) earmarking of crisis-response revenues and wants climate/energy expenditure resources expanded.',
    packageDoes: 'Creates a €100bn Industrial Decarbonisation Bank and requires Member States to earmark 50% of national ETS revenue for decarbonisation investment.',
    scores: { magnitude: 2, directness: 2, bindingness: 3, centrality: 1 },
    scoreRationale: {
      magnitude:
        '2 — €100bn of IDB funding plus a 50% national earmarking requirement is a large-scale revenue-recycling commitment, modelled by the impact assessment at ~1,630 Mt of cumulative abatement over ten years (pp-idb-100bn), an order-of-hundred-Mt-per-year climate benefit at stake, albeit one the impact assessment itself calls "illustrative".',
      directness:
        '2 — the Board’s model is 100% earmarking of crisis revenues (ap-crisis-revenue-earmarking) and expanded climate/energy resources more broadly (ap-2024-c6-expand-climate-revenue); the package’s 50% national earmarking plus a separate €100bn IDB delivers the same underlying principle at a lower earmarking share, so the match is close but not exact.',
      bindingness: '3 — both the IDB and the 50% earmarking requirement are proposed as binding law with no review or reversion condition stated.',
      centrality: '1 — the 100% earmarking welcome is a specific point in one crisis-response report; C6 is one of several revenue recommendations in the 2024 report, neither being the single headline figure.',
    },
    reasoning: [
      'The Board "welcomes… full earmarking of" crisis-response revenues "to be spent on crisis response measures… aligned with the EU’s climate objectives" (ap-crisis-revenue-earmarking), and separately asks that "resources for climate and energy-related expenditure… be expanded" (ap-2024-c6-expand-climate-revenue).',
      'The package creates a €100bn Industrial Decarbonisation Bank funded from ETS revenue, modelled at ~1,630 Mt of cumulative abatement (pp-idb-100bn), and separately requires Member States to earmark 50% of national ETS revenue for decarbonisation investment (pp-revenue-earmarking-50pct).',
      'This is an alignment: substantial, binding revenue-recycling into climate investment is exactly the direction the Board’s earmarking and revenue-expansion advice calls for.',
      'The strength of alignment is moderated because the earmarking share (50%) is lower than the 100% the Board welcomed in the crisis context, and the impact assessment itself flags the abatement figure as "illustrative", depending on final IDB design and an assumed ETS price drawn from separate modelling.',
    ],
  },
];

assertIdsResolve();

/** Conflicts only (kind !== 'alignment'), sorted by severityScore desc, stable tie-break by id asc. */
export function rankedConflicts(): ConflictFinding[] {
  return CONFLICTS.filter((f) => f.kind !== 'alignment').sort((a, b) => {
    const diff = severityScore(b.scores) - severityScore(a.scores);
    if (diff !== 0) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Alignments, sorted by severityScore desc (interpreted as strength), stable tie-break by id asc. */
export function alignments(): ConflictFinding[] {
  return CONFLICTS.filter((f) => f.kind === 'alignment').sort((a, b) => {
    const diff = severityScore(b.scores) - severityScore(a.scores);
    if (diff !== 0) return diff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
