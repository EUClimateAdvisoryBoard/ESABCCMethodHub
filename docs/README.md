# Documentation index

The `docs/` folder is the MkDocs source for the MethodHub documentation
site (served at <https://methodhub.vercel.app/docs/>). Start at the
[root README](../README.md) for a high-level tour, then come here for the
deep dives. When browsing on GitHub you can read the Markdown directly;
the rendered site is built by `scripts/build-docs.sh`.

| File                                                           | What it covers                                                    |
|----------------------------------------------------------------|-------------------------------------------------------------------|
| [vision/index.md](vision/index.md)                             | The consolidated vision — EEA hosting target, CCE5 stewardship, the per-user **M365 Copilot** option, and the blueprint for other EEA units. Start here. |
| [infrastructure/index.md](infrastructure/index.md)             | Stewardship model (CCE5 keeps the code, EEA IT runs the service), why the EEA-ready target is an EEA-managed container (not Vercel) even though the current pilot still runs on Vercel Frankfurt, and the Copilot technical deep-dive. |
| [infrastructure/deployment.md](infrastructure/deployment.md)   | One-page IT handoff for self-hosted EEA deployment.               |
| [infrastructure/tech-stack.md](infrastructure/tech-stack.md)   | How the eight modules and their supporting services connect.     |
| [infrastructure/data-gdpr.md](infrastructure/data-gdpr.md)     | What's built into the code, what still needs DPO sign-off, and the operational schedule for retention / erasure jobs. |
| [../beta/README.md](../beta/README.md)                         | Parking lot for the eleven experimental modules — what's there, why, and how to promote one to production. |

## Per-subsystem READMEs

The documentation is split so each piece of the stack is documented next to
its code:

| Component                                      | README                                               |
|------------------------------------------------|------------------------------------------------------|
| Next.js web app                                | [../src/README.md](../src/README.md)                 |
| Local Word bridge                              | [../bridge-service/README.md](../bridge-service/README.md) |
| Word add-in (Office.js)                        | [../word-addin/README.md](../word-addin/README.md)   |
| Word add-in companion Electron app             | [../word-addin-app/README.md](../word-addin-app/README.md) |
| Word VBA macro (legacy)                        | [../word-vba/README.md](../word-vba/README.md)       |
| Scripts & pipelines                            | [../scripts/README.md](../scripts/README.md)         |

## Conventions for contributing docs

- When you change a feature, update the README(s) **in the same pull request**.
- Diagrams use **Mermaid** (GitHub renders them natively). Keep them small
  enough to read without scrolling.
- One page per topic — prefer linking to re-introducing context.
- File paths in docs should be clickable (relative links).
- If you add a new subsystem, give it its own README and link it from the
  root README, this index, and
  [infrastructure/tech-stack.md](infrastructure/tech-stack.md) if it
  participates in a data flow.
