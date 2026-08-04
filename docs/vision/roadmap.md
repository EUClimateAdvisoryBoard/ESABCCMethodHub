# Roadmap

Intent, not commitment. The next ~6 months.

<figure class="mh-figure mh-figure--wide" markdown>
<img src="../../assets/fig-roadmap.svg" alt="Six-month roadmap timeline with five milestones — Path A readiness (low risk, M1), Path B Copilot spike (medium, M2), EEA handoff dry run (low, M3), graduate first beta module (low, M4), blueprint kit (high leverage, M6).">
<figcaption><span class="mh-figure__num">Figure 9.</span> Six-month roadmap. Milestones alternate above and below the timeline; colour-coded by risk level. Intent, not commitment.</figcaption>
</figure>

## 1. Path A readiness

Land the **Azure OpenAI EU** production profile, including parity tests
for `LLM_PROVIDER=azure-openai` vs. whichever provider is active in
the current pilot (auto-detected from the configured API key: Azure
OpenAI > Gemini > Anthropic > OpenAI).

- Risk: low.
- Mostly configuration work. CCE5 already verifies the adapter on
  staging.

## 2. Path B spike — M365 Copilot

Implement `LLM_PROVIDER=copilot-graph` behind a flag, wired against
[Content Analysis](../modules/content-analysis.md) first — short
prompts, user-initiated, clear value. Validate EU Data Boundary
behaviour on the EEA tenant.

- Risk: medium. Contingent on Microsoft Graph Copilot GA status at the
  time of implementation. See the maturity note on the
  [Copilot deep-dive](../infrastructure/copilot.md).

## 3. EEA handoff dry run

Stand up a staging clone on EEA infrastructure with Path A + EU Login +
MinIO, run the full parity test suite
(`scripts/migrate-to-postgres/`), and time the cutover.

- Risk: low.
- Success criteria: the cutover fits in an afternoon and the parity
  suite is green.

## 4. Graduate the first beta module

Likely **Media Monitoring** — the GDELT pipeline is already stable; the
UX is the blocker. Promote via `git mv` and ship as M·06.

- Risk: low.
- Sequencing note: only one module graduates per release cycle, to
  keep the scope-lock discipline.

## 5. Blueprint kit

Split the fork documentation into a short stand-alone checklist
(`docs/BLUEPRINT.md`), plus a reference fork targeting a plausible
second EEA unit, so other units can see the pattern working on **two**
codebases instead of one.

- Risk: low, and high leverage.
- Dependencies: needs an interested second unit.

---

## What is **not** on the roadmap

- Rewriting the scope — the eight production modules are the locked core.
- Adding new beta modules to the locked core — the parking lot already
  holds thirty-five; promoting more without hardening would dilute the
  production signal.
- Migrating off Next.js, Postgres or Docker — the stack is the value.
