# Beta parking lot

Eight experimental modules sit outside the Next.js route tree at
[`beta/modules/`](https://github.com/SebastianFra/MethodHub/tree/main/beta/modules)
in the repository. They are **intentionally unrouted** — the file-system
location is the feature flag.

<figure class="mh-figure mh-figure--wide" markdown>
<img src="../../assets/fig-scope-lock.svg" alt="Scope lock diagram — five production modules with solid borders in src/app/ vs. eight beta modules with dashed borders under beta/modules/. A curved arrow between them is labelled git mv to indicate the single-command promotion path.">
<figcaption><span class="mh-figure__num">Figure 3.</span> The v1.0 scope lock. Five production modules live under <code>src/app/</code> with all the production scaffolding; eight beta modules sit under <code>beta/modules/</code> outside the Next.js route tree. Promotion in either direction is one <code>git mv</code>.</figcaption>
</figure>

## What is parked

| Folder                 | Module                | Why it is beta                                                  |
|------------------------|-----------------------|-----------------------------------------------------------------|
| `brussels-bulletin/`   | Brussels Bulletin     | Weekly digest; pipeline stable, layout still iterating.         |
| `climate-adaptation/`  | Climate Adaptation    | CLIMADA + CMIP6 hotspots; needs full impact-chain validation.   |
| `climate-finance/`     | Climate Finance       | NGFS v5 scenarios; EIB green-bond dataset not yet licensed.     |
| `energy-system/`       | Energy System         | PyPSA-style optimisation; requires PyPSA backend service.       |
| `fact-sheets/`         | Fact Sheet Builder    | Drag-and-drop widgets; LaTeX export path not yet validated.     |
| `faq/`                 | FAQ & Prebunking      | Content pipeline; awaiting editorial sign-off.                  |
| `maritime-aviation/`   | Maritime & Aviation   | SEAMAPS / OAG data requires procurement.                        |
| `media-monitoring/`    | Media Monitoring      | GDELT pipeline works; dashboard UX and consent flow WIP.        |

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
