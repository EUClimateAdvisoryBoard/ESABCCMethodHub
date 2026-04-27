# The five modules

The v1.0 ship surface. Every module listed here is **stable**, covered by
migrations, RLS policies, retention jobs and IT handoff scripts.

| #     | Module               | Route                  | What it does                                                      | Deep-dive                                        |
|-------|----------------------|------------------------|-------------------------------------------------------------------|--------------------------------------------------|
| M·01  | Reference Manager    | `/references`          | Literature library with DOI lookup, PDF annotation, Word add-in.  | [open](../modules/references.md)                 |
| M·02  | Data & Scenarios     | `/scenarios`           | Eurostat, IPCC AR6 and IIASA scenarios in one queryable explorer. | [open](../modules/scenarios.md)                  |
| M·03  | Secretariat News     | `/news-feed`           | Curated climate-policy news and the daily 24 h EU briefing.       | [open](../modules/news-feed.md)                  |
| M·04  | EU Policy Navigator  | `/policy-navigator`    | Network map of EU climate laws with article-level annotation.     | [open](../modules/policy-navigator.md)           |
| M·05  | Content Analysis     | `/content-analysis`    | Hierarchical qualitative coding of policy texts and references.   | [open](../modules/content-analysis.md)           |

<figure class="mh-figure mh-figure--wide" markdown>
<img src="../../assets/fig-five-modules.svg" alt="Five production modules (References, Data & Scenarios, News, Policy Navigator, Content Analysis) arranged around a shared Postgres corpus, with peer cross-links shown as dotted edges.">
<figcaption><span class="mh-figure__num">Figure 2.</span> The five modules are peers around a single Postgres corpus. Solid edges are reads/writes against the shared schema; dotted edges are explicit peer cross-links (foreign keys, not semantic search).</figcaption>
</figure>

## How they fit together

```mermaid
flowchart LR
  classDef core fill:#E6F4F3,stroke:#00928F,color:#2C3E4D
  classDef data fill:#FDFCFA,stroke:#3D5265,color:#2C3E4D

  subgraph Corpus["Shared corpus"]
    Pol[(Policies<br/>EUR-Lex)]:::data
    Refs[(References<br/>Crossref · PDFs)]:::data
    Sc[(Scenarios<br/>IIASA · Eurostat)]:::data
    News[(News articles<br/>RSS)]:::data
  end

  M01[M·01 References]:::core
  M02[M·02 Scenarios]:::core
  M03[M·03 News]:::core
  M04[M·04 Policy Navigator]:::core
  M05[M·05 Content Analysis]:::core

  Pol  --> M04 & M05
  Refs --> M01 & M05
  Sc   --> M02 & M04
  News --> M03 & M04

  M04 -.cross-links.-> M01 & M03 & M05
```

- Every module reads from the **same corpus** tables, so a reference
  inserted in M·01 shows up in M·05, a policy annotated in M·04 is
  reachable from M·05, etc.
- Cross-linking is explicit (`policy_id`, `reference_id`, `code_id`) —
  not semantic search — to keep the audit trail clean.
- There is **no** "master" module: all five are peers, wired against the
  same Postgres schema.

## Why exactly five?

Earlier prototypes had thirteen modules competing for attention. In
practice the Secretariat used these five daily and the rest weekly at
best. Forcing the scope down makes the value proposition legible and
reduces the IT handoff surface to something that can be reviewed in an
afternoon. The other eight are not deleted — they live under
[`beta/modules/`](beta.md) and can be promoted one at a time as demand
justifies.
