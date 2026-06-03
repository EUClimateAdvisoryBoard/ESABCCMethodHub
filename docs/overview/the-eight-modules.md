# The eight modules

The production ship surface. Every module listed here is **stable**, covered
by migrations, RLS policies, retention jobs and IT handoff scripts. v1.0
launched with six; the workspace layer (M·07) and the recommendations tracker
(M·08) were promoted from beta once the science team signed off, bringing the
core to **eight**.

| #     | Module               | Route                  | What it does                                                      | Deep-dive                                        |
|-------|----------------------|------------------------|-------------------------------------------------------------------|--------------------------------------------------|
| M·01  | Reference Manager    | `/references`          | Literature library with DOI lookup, PDF annotation, Word add-in.  | [open](../modules/references.md)                 |
| M·02  | Data & Scenarios     | `/scenarios`           | Eurostat, IPCC AR6 and IIASA scenarios in one queryable explorer. | [open](../modules/scenarios.md)                  |
| M·03  | Secretariat News     | `/news-feed`           | Curated climate-policy news and the daily 24 h EU briefing.       | [open](../modules/news-feed.md)                  |
| M·04  | EU Policy Navigator  | `/policy-navigator`    | Network map of EU climate laws with article-level annotation.     | [open](../modules/policy-navigator.md)           |
| M·05  | Content Analysis     | `/content-analysis`    | Hierarchical qualitative coding of policy texts and references.   | [open](../modules/content-analysis.md)           |
| M·06  | Voting Tool          | `/voting`              | Anonymous Advisory-Board ballots: single-use or universal links, seven voting systems, live analysis. | [open](../modules/voting-tool.md)                |
| M·07  | Project Workspace    | `/project-workspace`   | A workspace per analytical project, bundling indicator databases, the recommendation tracker, the member-state matrix and policy analysis. | [open](../modules/project-workspace.md)          |
| M·08  | Recommendations      | `/recommendations`     | Tracker for Advisory-Board recommendations — implementation status and dated uptake events against EU legislation. | [open](../modules/recommendations.md)            |

<figure class="mh-figure mh-figure--wide" markdown>
<img src="../../assets/fig-five-modules.svg" alt="Corpus-backed modules (References, Data & Scenarios, News, Policy Navigator, Content Analysis) plus the project-scoped Workspace and Recommendations modules, arranged around a shared Postgres corpus, with the isolated Voting Tool kept separate.">
<figcaption><span class="mh-figure__num">Figure 2.</span> Seven of the eight modules read and write a single Postgres corpus; the Voting Tool keeps an isolated ballot store. Solid edges are reads/writes against the shared schema; dotted edges are explicit peer cross-links (foreign keys, not semantic search).</figcaption>
</figure>

## How they fit together

The eight modules fall into three bands:

- **Corpus modules (M·01–M·05).** Five peers wired against the same Postgres
  schema. A reference inserted in M·01 shows up in M·05; a policy annotated in
  M·04 is reachable from M·05. There is no "master" module.
- **Project layer (M·07, M·08).** The Project Workspace bundles per-project
  modules — indicator databases, the member-state matrix, policy analysis —
  and the Recommendations tracker is the same data surfaced standalone. Both
  read and write the `pw_*` workspace tables, which reference the corpus by id.
- **Isolated module (M·06).** The Voting Tool runs alongside the rest with its
  own ballot store, deliberately walled off so external single-use ballots
  never touch the corpus.

```mermaid
flowchart LR
  classDef core fill:#E6F4F3,stroke:#00928F,color:#2C3E4D
  classDef proj fill:#FFF3E0,stroke:#EF6C00,color:#2C3E4D
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
  M07[M·07 Project Workspace]:::proj
  M08[M·08 Recommendations]:::proj

  Bal[(Ballots<br/>isolated)]:::data
  M06[M·06 Voting Tool]:::core
  Bal  --> M06

  PW[(pw_* workspace<br/>projects · indicators ·<br/>recommendations · member states)]:::data

  Pol  --> M04 & M05
  Refs --> M01 & M05
  Sc   --> M02 & M04
  News --> M03 & M04
  PW   --> M07 & M08
  M04 -.cross-links.-> M01 & M03 & M05
  M07 -.policy_id / reference_id.-> Pol & Refs
  M08 -.uptake vs. legislation.-> Pol
```

- Every corpus module reads from the **same tables**, so cross-references are
  explicit (`policy_id`, `reference_id`, `code_id`) — not semantic search —
  to keep the audit trail clean.
- The Project Workspace and Recommendations modules share the `pw_*` tables.
  The standalone `/recommendations` page and the *Recommendations* tab inside
  the **Policy Gap 2.0** project read and write the same `pw_recommendations`
  rows, so an edit in either place stays in sync.
- The Voting Tool (M·06) runs with its own isolated ballot store and never
  joins the corpus.

## Why this scope?

Earlier prototypes had thirteen modules competing for attention. In practice
the Secretariat used a handful daily and the rest weekly at best. Forcing the
scope down makes the value proposition legible and keeps the IT handoff
surface reviewable in an afternoon. The eight core modules are the ones that
earned daily use; the rest are not deleted — they live under
[`beta/modules/`](beta.md) (eleven of them) and are promoted one at a time as
demand justifies. M·07 and M·08 are the two most recent promotions.
