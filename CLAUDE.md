# CLAUDE.md — repository preferences for Claude Code

## Author identity (commits)

Always commit as **sebastianfra**, never as Claude. Configure once at
the start of every session before any commit:

```bash
git config user.name "sebastianfra"
git config user.email "60655953+SebastianFra@users.noreply.github.com"
```

If a commit lands as `Claude <noreply@anthropic.com>`, that is a bug —
fix the config and amend / re-commit before pushing.

## GitHub organisation — name change

The repository was migrated. The MCP scope advertised at session start
is `secesabcc/esabccmethodhub`, but GitHub redirects that to the new
canonical owner:

| Old (still works as redirect) | New (canonical) |
| --- | --- |
| `secesabcc/esabccmethodhub` | **`EUClimateAdvisoryBoard/ESABCCMethodHub`** |

Implications:

- API responses (commit URLs, refs URLs, etc.) all return the new
  `EUClimateAdvisoryBoard/ESABCCMethodHub` path.
- `mkdocs.yml` `repo_url`, `repo_name`, `pymdownx.magiclink`, the
  README, and any other in-repo URL must reference the new owner.
- The `.git/config` `origin` remote URL still uses the local proxy and
  is unaffected — pushes go through the redirect.
- Any new agent or workflow that constructs GitHub URLs from scratch
  should use `EUClimateAdvisoryBoard/ESABCCMethodHub`.

## Documentation hosting

The MkDocs documentation site no longer ships to GitHub Pages. It is
built into `public/docs/` during the Vercel build (see
`scripts/build-docs.sh` and the `vercel-build` script in
`package.json`) and served as the `/docs/` subpage of the MethodHub.
The previous workflow `.github/workflows/docs.yml` and the StaticCrypt
password gate were removed.
