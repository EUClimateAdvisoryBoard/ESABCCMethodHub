# AI layer — three paths

The app exposes a single `LLM_PROVIDER` switch that selects which backend
serves the "summarise", "pre-tag" and "classify" calls used across the
five production modules. **Three paths** are on the table, listed in the
order we expect EEA IT to consider them.

<figure class="mh-figure mh-figure--wide" markdown>
<img src="../../assets/fig-ai-paths.svg" alt="Three AI paths side by side — Azure OpenAI EU, Microsoft 365 Copilot via Graph, and No-AI — with billing, auth, scheduled-job coverage, EU Data Boundary behaviour and status compared column by column.">
<figcaption><span class="mh-figure__num">Figure 6.</span> Three AI paths behind one <code>LLM_PROVIDER</code> switch. Path A is today's default; Path B reuses each user's own M365 Copilot entitlement via Graph; Path C is the escape hatch. The recommended landing mixes A (for cron) and B (for user-initiated calls).</figcaption>
</figure>

## Path A — Azure OpenAI EU (service subscription)

| Aspect              | Value                                                     |
|---------------------|-----------------------------------------------------------|
| Billing             | Per-token, single EEA subscription.                       |
| Auth                | Service API key in IT's secret store.                     |
| Data boundary       | EU region by provisioning.                                |
| Scheduled jobs      | ✅ works — no user context needed.                        |
| Implementation      | **Already supported today.** Set `LLM_PROVIDER=azure-openai`. |

## Path B — M365 Copilot (per-user licence, new)

| Aspect              | Value                                                                                   |
|---------------------|-----------------------------------------------------------------------------------------|
| Billing             | **Absorbed in each user's existing M365 Copilot seat.** No service subscription.        |
| Auth                | Delegated OAuth via Microsoft Graph. No service API key.                                 |
| Data boundary       | EU Data Boundary by default for EU tenants.                                             |
| Scheduled jobs      | ⚠️ **not supported** — no signed-in user; falls back to Path A.                         |
| Implementation      | Vision option · see [Copilot technical deep-dive](copilot.md).                          |

!!! warning "Maturity note"
    Some Graph-based Copilot endpoints moved from preview to GA through
    2025/2026. Before flipping the switch in production, CCE5 re-verifies
    the current endpoint names, scopes and licence gates against
    Microsoft's documentation.

## Path C — Mixed (recommended EEA landing — target)

Both paths could coexist behind the same switch. **Path B and Path C
are target states, not the current implementation.** Today,
`LLM_PROVIDER` accepts `azure-openai | anthropic | openai | gemini`;
`copilot-graph` is not yet a recognised value and `LLM_PROVIDER_BATCH`
/ `LLM_FALLBACK_PROVIDER` are not yet read by the dispatcher.

The target config, once the Copilot/Graph branch is implemented:

```bash
LLM_PROVIDER=copilot-graph       # default: use the user's Copilot seat
LLM_PROVIDER_BATCH=azure-openai  # fallback: for cron / scheduled jobs
LLM_FALLBACK_PROVIDER=azure-openai  # fallback: for users without a licence
```

This is the most likely EEA landing point because it would let EEA
amortise the per-user Copilot spend it already pays for while keeping
a tiny service-side budget for background work (daily news summaries,
batch content-analysis pre-tagging).

## Decision matrix

| Question                                            | Path A | Path B | Path C (mixed) |
|-----------------------------------------------------|:------:|:------:|:--------------:|
| Do we pay per token on a CCE5/EEA subscription?     | Yes    | No     | Partially      |
| Does it work for scheduled jobs without a user?      | Yes    | No     | Yes (via A)    |
| Does it require an Entra ID app registration?       | No     | Yes    | Yes            |
| Does EEA Purview / DLP apply automatically?         | No     | Yes    | Yes            |
| Does it require each user to have a Copilot licence? | No     | Yes    | Preferred      |
| Does it need to wait for any Microsoft GA?          | No     | Yes    | Partially      |

## Code shape

The existing dispatcher in
[`src/lib/ai-summary.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/lib/ai-summary.ts)
looks up the provider at request time and calls one of
`callAzureOpenAI()`, `callAnthropic()`, `callGemini()`, or
`callOpenAI()`. The four providers currently live inline in that
file rather than in per-provider modules under `src/lib/ai/`;
splitting them out and adding a `copilot-graph` sibling is one of
the target refactors required to land Path B.

Full design (target state): [Copilot — technical deep-dive →](copilot.md).
