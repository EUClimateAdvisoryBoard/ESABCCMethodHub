# `beta/` — experimental modules (not shipped in v1.0)

This folder is a **deliberate parking lot**. It contains the Next.js page
folders for the modules that are *not* part of the v1.0 handoff to EEA IT.

The production deployment ships the **five stable modules** under
[`src/app/`](../src/app). Nothing in this folder is routed by the live app:
the files live outside the Next.js `app/` tree, so the build simply ignores
them. Dropping a folder back into `src/app/` re-activates its route — that is
the whole migration path for promoting a beta module.

## Why this separation exists

When EEA IT, or any reviewer from outside CCE5, opens the repository they
should see the **working scope** without having to guess which surfaces are
production and which are still prototypes. The file system itself communicates
that:

```
src/app/           ← production routes (the six modules + utilities)
beta/modules/      ← experimental prototypes, unrouted
```

The six production modules have been hardened: schema migrations, RLS
policies, GDPR retention, data-pipeline tests, IT handoff scripts. The beta
modules are useful demos of *where this platform can go* — energy-system
optimisation, climate-risk chains, media monitoring — but they are not yet at
the quality bar we ship to the Secretariat.

## What is in here

| Folder                        | Module               | Why it is beta                                                     |
|-------------------------------|----------------------|--------------------------------------------------------------------|
| `climate-adaptation/`         | Climate Adaptation   | CLIMADA + CMIP6 hotspots; needs full impact-chain validation.      |
| `climate-finance/`            | Climate Finance      | NGFS v5 scenarios; EIB green-bond dataset not yet licensed.        |
| `energy-system/`              | Energy System        | PyPSA-style optimisation; requires PyPSA backend service.          |
| `fact-sheets/`                | Fact Sheet Builder   | Drag-and-drop widgets; LaTeX export path not yet validated.        |
| `faq/`                        | FAQ & Prebunking     | Content pipeline; awaiting editorial sign-off.                     |
| `funding-sources/`            | Funding Sources      | Horizon Dashboard + DG DIGIT QlikSense snapshot; scraper pending.  |
| `maritime-aviation/`          | Maritime & Aviation  | SEAMAPS / OAG data requires procurement.                           |
| `media-monitoring/`           | Media Monitoring     | GDELT pipeline works; dashboard UX and consent flow WIP.           |
| `strategy-docs/`              | Strategy & Framework | Documentation overlay for internal strategy and PIRs; files pending upload. |

## Promoting a beta module to production

The operation is deliberately mechanical — nothing in `beta/` is structurally
different from `src/app/`:

```bash
# promote the module back into the Next.js app tree
git mv beta/modules/energy-system src/app/energy-system

# re-add the link in the top navigation (SiteHeader.tsx and the home page)
# re-enable the relevant API routes under src/app/api if they were disabled
```

After that, `next build` picks the route back up automatically. No Next.js
config change, no manifest edit, no rewrite. That is the whole point of using
a filesystem-level parking lot instead of feature flags.

## What stays wired up

- **Shared components** (`src/components/ClimadaExplorer.tsx`, `PypsaLeafletMap.tsx`,
  `MediaMonitoringMap.tsx`, …) remain under `src/components/` because they are
  shared with other pages or are imported by beta pages when those pages are
  promoted.
- **API routes** that the beta pages relied on (`src/app/api/climada`,
  `src/app/api/media-monitoring/**`) remain under `src/app/api/` so that they
  can be exercised directly or reactivated without an extra move.
- **Data pipelines** under `scripts/` keep running for every module, beta or
  not; if EEA IT turns a pipeline off, it is a one-line change in the
  scheduler.

This keeps the beta graveyard cheap — promoting a module is a `git mv`, not a
refactor.
