# Beta parking lot

Eleven experimental modules sit outside the Next.js route tree at
[`beta/modules/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/beta/modules)
in the repository. They are **intentionally unrouted** — the file-system
location is the feature flag. (Two former beta modules — the Project Workspace
and the Recommendations tracker — were promoted to the core as
[M·07](../modules/project-workspace.md) and
[M·08](../modules/recommendations.md); the Brussels Bulletin pipeline moved
into [Secretariat News](../modules/news-feed.md).)

<figure class="mh-figure mh-figure--wide" markdown>
<img src="../../assets/fig-scope-lock.svg" alt="Scope lock diagram — eight production modules with solid borders in src/app/ vs. eleven beta modules with dashed borders under beta/modules/. A curved arrow between them is labelled git mv to indicate the single-command promotion path.">
<figcaption><span class="mh-figure__num">Figure 3.</span> The scope lock. Eight production modules live under <code>src/app/</code> with all the production scaffolding; eleven beta modules sit under <code>beta/modules/</code> outside the Next.js route tree. Promotion in either direction is one <code>git mv</code> — that is exactly how M·07 and M·08 graduated.</figcaption>
</figure>

## What is parked

Numbered M·09–M·19, continuing the sequence after the eight core modules.

| #     | Folder                 | Module                | Why it is beta                                                  |
|-------|------------------------|-----------------------|-----------------------------------------------------------------|
| M·09  | `energy-system/`       | Energy System Modelling | PyPSA-style optimisation; requires the `pypsa-service` backend. |
| M·10  | `climate-adaptation/`  | Climate Adaptation    | CLIMADA + CMIP6 hotspots; needs full impact-chain validation.   |
| M·11  | `maritime-aviation/`   | Maritime & Aviation   | SEAMAPS / OAG data requires procurement.                        |
| M·12  | `climate-finance/`     | Climate Finance       | NGFS v5 scenarios; EIB green-bond dataset not yet licensed.     |
| M·13  | `media-monitoring/`    | Media Monitoring      | GDELT pipeline works; dashboard UX and consent flow WIP.        |
| M·14  | `fact-sheets/`         | Fact Sheet Builder    | Drag-and-drop widgets; LaTeX export path not yet validated.     |
| M·15  | `faq/`                 | FAQ & Prebunking      | Content pipeline; awaiting editorial sign-off.                  |
| M·16  | `funding-sources/`     | [Funding Sources](../modules/funding-sources.md) | Horizon Dashboard + DG DIGIT QlikSense snapshot; scraper pending. |
| M·17  | `strategy-docs/`       | [Strategy & Framework Docs](../modules/strategy-docs.md) | Catalogue surface for internal strategy / project-framework PDFs; entries placeholdered until source files land in `public/strategy-docs/`. |
| M·18  | `eu-climate-councils/` | EU Climate Councils   | Leaflet map of ~67 national advisory bodies; mapping still being verified. |
| M·19  | `project-management/`  | Project Management    | Phase / Gantt board against the Project Manual; UX iterating.   |

## Promoting a beta module

The operation is deliberately mechanical — nothing in `beta/` is
structurally different from `src/app/`:

```bash
# 1. promote the module back into the Next.js app tree
git mv beta/modules/energy-system src/app/energy-system

# 2. re-add the link in navigation
$EDITOR src/components/SiteHeader.tsx      # add MODULES entry
$EDITOR src/app/page.tsx                   # add to productionModules

# 3. re-enable related API routes (if they were disabled)
ls src/app/api/               # all API routes are already shipped
```

After `next build` picks up the new route automatically, the module is
a fully-fledged production surface.

## Why parked, not deleted

- **Evidence preservation.** The code represents months of exploration
  and encoded domain knowledge. Throwing it away to satisfy a "clean
  trunk" instinct is false economy.
- **Roadmap visibility.** An EEA IT reviewer who sees `beta/modules/`
  immediately understands what is not production and what is on the
  horizon. Feature flags hidden in config would communicate neither.
- **Reversibility.** If Board priorities shift and one of these modules
  becomes the most important thing in the Secretariat's week, we can
  ship it within days — the data pipelines are already live.
