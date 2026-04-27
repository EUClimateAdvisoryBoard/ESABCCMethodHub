---
title: MethodHub — Documentation
hide:
  - toc
---

<div class="mh-hero" markdown>

<div class="mh-hero-ribbon" markdown>
<span class="mh-chip mh-chip--teal">v1.0 · pre-handoff pilot</span>
<span class="mh-chip mh-chip--neutral">CCE5 stewardship</span>
<span class="mh-chip mh-chip--neutral">EEA-ready target</span>
<span class="mh-chip mh-chip--orange">Internal use only</span>
</div>

# MethodHub documentation

<p class="mh-hero-lede">
The ESABCC Secretariat's internal research workspace — five integrated
modules for references, data, news, policy and content analysis, shipped
as one Next.js service stewarded by CCE5 and designed for handoff to
EEA-managed infrastructure.
</p>

[Start with the FAQ →](FAQ-NON-TECHNICAL.md){ .md-button .md-button--primary }
[What is MethodHub?](overview/what-is-methodhub.md){ .md-button }

<div class="mh-facts" markdown>
<div class="mh-fact" markdown>
<p class="mh-fact__k">Production modules</p>
<p class="mh-fact__v">5</p>
<p class="mh-fact__sub">refs · data · news · policy · coding</p>
</div>
<div class="mh-fact" markdown>
<p class="mh-fact__k">Beta parking lot</p>
<p class="mh-fact__v">8</p>
<p class="mh-fact__sub">intentionally unrouted</p>
</div>
<div class="mh-fact" markdown>
<p class="mh-fact__k">Runtime</p>
<p class="mh-fact__v">1</p>
<p class="mh-fact__sub">Next.js · Postgres 14+</p>
</div>
<div class="mh-fact" markdown>
<p class="mh-fact__k">Hosting region</p>
<p class="mh-fact__v">EU</p>
<p class="mh-fact__sub">today: Vercel (fra1) · target: EEA-managed container</p>
</div>
</div>

</div>

<div class="mh-esabcc-lockup" markdown>
![ESABCC](assets/esabcc-logo.svg)
<div markdown>
Built and maintained by **CCE5** for the Secretariat of the
**European Scientific Advisory Board on Climate Change**.
Packaged for self-hosted deployment on **EEA infrastructure**.
</div>
</div>

!!! tip "Not a developer? Start with the FAQ"
    The **[FAQ for non-technical staff](FAQ-NON-TECHNICAL.md)** is a
    plain-language guide to what MethodHub is, how it is built, and what
    is asked of the EEA — every term of jargon unpacked. A PDF copy is
    also [available at the repo root](https://github.com/SebastianFra/MethodHub/blob/main/ESABCC-MethodHub-FAQ-non-technical.pdf).

## The five modules

Each module reads and writes the same Postgres corpus — a reference
created in M·01 shows up in M·05, a policy annotated in M·04 is reachable
from M·05. No module is master; all five are peers.

<ul class="mh-modules" markdown>

<li markdown>
<a class="mh-module" href="modules/references/" markdown>
<div class="mh-module__header"><span>M · 01</span><span class="mh-module__num">01</span></div>
<div class="mh-module__title">Reference Manager</div>
<p class="mh-module__desc">Literature library with DOI lookup, PDF annotation and a Word add-in.</p>
<div class="mh-module__cta">Open module →</div>
</a>
</li>

<li markdown>
<a class="mh-module" href="modules/scenarios/" markdown>
<div class="mh-module__header"><span>M · 02</span><span class="mh-module__num">02</span></div>
<div class="mh-module__title">Data &amp; Scenario Explorer</div>
<p class="mh-module__desc">Eurostat, IPCC AR6 and IIASA scenarios in one queryable explorer.</p>
<div class="mh-module__cta">Open module →</div>
</a>
</li>

<li markdown>
<a class="mh-module" href="modules/news-feed/" markdown>
<div class="mh-module__header"><span>M · 03</span><span class="mh-module__num">03</span></div>
<div class="mh-module__title">Secretariat News</div>
<p class="mh-module__desc">Curated climate-policy news feed and the daily 24 h EU briefing.</p>
<div class="mh-module__cta">Open module →</div>
</a>
</li>

<li markdown>
<a class="mh-module" href="modules/policy-navigator/" markdown>
<div class="mh-module__header"><span>M · 04</span><span class="mh-module__num">04</span></div>
<div class="mh-module__title">EU Policy Navigator</div>
<p class="mh-module__desc">Network map of EU climate laws with article-level annotation.</p>
<div class="mh-module__cta">Open module →</div>
</a>
</li>

<li markdown>
<a class="mh-module" href="modules/content-analysis/" markdown>
<div class="mh-module__header"><span>M · 05</span><span class="mh-module__num">05</span></div>
<div class="mh-module__title">Content Analysis</div>
<p class="mh-module__desc">Hierarchical qualitative coding of policy texts and references.</p>
<div class="mh-module__cta">Open module →</div>
</a>
</li>

<li markdown>
<a class="mh-module mh-module--beta" href="overview/beta/" markdown>
<div class="mh-module__header"><span>BETA · ×8</span><span class="mh-module__num">β</span></div>
<div class="mh-module__title">Beta parking lot</div>
<p class="mh-module__desc">Eight experimental modules, intentionally unrouted. Promotion is a single <code>git mv</code>.</p>
<div class="mh-module__cta">Browse beta →</div>
</a>
</li>

</ul>

## Infrastructure &amp; vision

<div class="mh-callout" markdown>
<span class="mh-callout__kicker">Two non-negotiables</span>

1. **EU sovereignty.** Every runtime touches only EU regions. Today's
   pilot runs on Vercel Frankfurt (`fra1`) + Supabase (EU); the
   **EEA-ready target** moves state into EEA-operated Postgres,
   PDFs into EEA object storage, and AI calls into an EU Azure
   region *or* (once the Copilot path is built) the user's own
   M365 Copilot entitlement.
2. **CCE5 stewardship.** The code keeps evolving after handoff. EEA IT
   hosts; CCE5 ships — mirroring how `github.com/eea` already operates.
</div>

- [Deployment on EEA](infrastructure/deployment.md) — what EEA IT hosts,
  why not Vercel in production.
- [AI layer — three paths](infrastructure/ai-layer.md) — Azure OpenAI,
  M365 Copilot, or no AI at all.
- [Copilot technical deep-dive](infrastructure/copilot.md)
- [Tech stack](infrastructure/tech-stack.md)
- [Data &amp; GDPR](infrastructure/data-gdpr.md)

<div class="mh-callout mh-callout--vision" markdown>
<span class="mh-callout__kicker">Vision · blueprint</span>

The same stack becomes a template for any EEA unit's internal tooling.
One Next.js service, one Postgres schema, one handoff script.
</div>

- [Blueprint for EEA units](vision/blueprint.md)
- [Roadmap](vision/roadmap.md)

## Contact

- **CCE5 code stewardship — Sebastian Franz.**
  [sebastian.franz@esabcc.europa.eu](mailto:sebastian.franz@esabcc.europa.eu)
- **Issues and PRs.**
  [github.com/SebastianFra/MethodHub](https://github.com/SebastianFra/MethodHub)
- **About the Board.**
  [climate-advisory-board.europa.eu](https://climate-advisory-board.europa.eu)
