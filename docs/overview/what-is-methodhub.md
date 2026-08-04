# What is MethodHub?

!!! abstract "One paragraph"
    MethodHub is the **ESABCC Secretariat's internal research workspace**.
    Eight integrated modules — references, data & scenarios, news, policy,
    content analysis, voting, the project workspace and the recommendations
    tracker — shipped as one Next.js application and one
    Postgres database. The codebase is stewarded by **CCE5**. Today, in
    the pre-handoff pilot phase, the app is hosted on Vercel pinned to
    the Frankfurt (EU) region with a Supabase Postgres; **the
    EEA-ready target is an EEA-managed container + EEA Postgres in the
    EU region**, which is the configuration the code is structured
    to support (see [Deployment on EEA](../infrastructure/deployment.md)).
    It is not a public product and not a publication surface.

## Audience

MethodHub has three audiences at once, and the documentation is written
for all three:

- **The Secretariat.** Policy analysts and scientific officers who use
  the tool daily to prepare Board advice. They care about the eight
  modules in [§ Modules](../modules/index.md).
- **EEA IT.** Reviewers and operators responsible for hosting the
  service. They care about [§ Infrastructure](../infrastructure/index.md)
  — what they have to provide, what GDPR obligations transfer, and the
  shape of the handoff.
- **Peer EEA units.** Teams that might fork this codebase for their own
  internal tooling. They care about [§ Vision — blueprint](../vision/blueprint.md).

## Two non-negotiables

Every design decision is downstream of two constraints:

1. **EU sovereignty.** Every runtime touches only EU regions. Today
   the pilot runs on Vercel pinned to Frankfurt (`fra1`) with
   Supabase (EU region); **the EEA-ready target moves this to
   EEA-operated infrastructure**: an EEA-managed container host, an
   EEA Postgres, EEA object storage for PDFs, and AI calls that
   terminate either in an EU Azure region **or** — once the Copilot
   path is implemented — against the user's own M365 Copilot
   entitlement. The codebase is deliberately structured so that
   handoff is a configuration change, not a rewrite.
2. **CCE5 stewardship.** The code keeps evolving after the handoff.
   EEA IT hosts; CCE5 ships. This mirrors how `github.com/eea` already
   operates — code in the open, services in the EU region.

## Scope lock

The core ships **eight modules** — the original six plus the Project
Workspace (M·07) and Recommendations (M·08), both promoted from beta once
the science team signed off. Everything else — thirty-five experimental
modules — lives under [`beta/modules/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/beta/modules)
and is **intentionally unrouted** by the Next.js app. Promoting a beta
module is a single `git mv` back into `src/app/`. The file system is
the feature flag.

[The eight modules →](the-eight-modules.md){ .md-button .md-button--primary }
[Beta parking lot →](beta.md){ .md-button }

## Where to go next

- Want the **big picture**? Stay in this section — [The eight modules](the-eight-modules.md) has the one-table answer.
- Want a **technical deep-dive** on a specific module? Jump to the [Modules](../modules/index.md) section.
- Want to **host** this? Start with [Deployment on EEA](../infrastructure/deployment.md).
- Want to **fork** this for another EEA unit? Read [Blueprint for EEA units](../vision/blueprint.md).
