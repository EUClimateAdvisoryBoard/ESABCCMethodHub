# Rollout TODO — brainstorm-give-modules-JaeRW

This branch ships all 20 brainstorm ideas (#1–#20) as small, dependency-ordered
chunks. Before deploying it, you (the operator) need to do a small amount of
ops work outside Git: run new Supabase migrations, set environment variables,
and verify a couple of integrations.

---

## 1. Supabase migrations to run

Run **in order** against your Supabase project (Dashboard → SQL editor, or
`supabase db push` / `psql`). Both are idempotent — safe to re-run.

| Order | File | What it adds |
| ----- | ---- | ----- |
| 1 | `supabase/migrations/023_user_preferences.sql` | `user_preferences` (theme, density, notification frequency, default citation style, AI language, keyboard-shortcut toggle, public-profile opt-in, onboarding-seen flags). Backs **#5**, **#7**, **#16**, **#18**. |
| 2 | `supabase/migrations/024_workspaces_collections_history.sql` | `workspaces`, `workspace_members`, `workspace_items`; `collections`, `collection_items`; `artefact_history`; `text_annotations`. RLS-locked. Backs **#3**, **#13**, **#17**, **#20**. |

After running them, smoke-check from `psql`:

```sql
select count(*) from public.user_preferences;
select count(*) from public.workspaces;
select count(*) from public.collections;
select count(*) from public.artefact_history;
select count(*) from public.text_annotations;
```

All five should return `0` immediately after migration (table exists, empty).

---

## 2. Environment variables

### Required for new features

| Variable | Used by | If missing |
| -------- | ------- | ---------- |
| `NEXT_PUBLIC_SUPABASE_URL` | every feature | unchanged from before — already required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | every feature | unchanged from before — already required |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/contributors`, `/api/global-search`, `/api/context-drawer`, server-side aggregation | reads degrade to anon-RLS where possible; contributor leaderboard returns empty |

### Newly used (already documented elsewhere; no new keys for this branch)

The AI assistant (**#11**) reuses the existing multi-provider setup in
`src/lib/ai-summary.ts`. **Any one** of these is enough:

| Variable | Provider |
| -------- | -------- |
| `ANTHROPIC_API_KEY` | Anthropic Claude (auto-selects Haiku 4.5 / Sonnet 4.6) |
| `GEMINI_API_KEY`   | Google Gemini 2.5 Flash |
| `OPENAI_API_KEY`   | OpenAI gpt-4o-mini |
| `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` | Azure-hosted OpenAI |
| `LLM_PROVIDER` *(optional)* | force one of `anthropic`, `gemini`, `openai`, `azure-openai` |

If **none** of the four are configured, `/api/assistant` returns
`{ error: 'AI assistant unavailable', detail: '...' }` and the floating
chat panel surfaces that message instead of a chat reply. Everything else
continues to work — the feature gracefully no-ops.

### Nothing new required for the rest

Workspaces, collections, inbox, workbench, command palette, dark mode,
keyboard shortcuts, change history, onboarding tours, mobile navigator,
scenario alignment, citation graph, contributors, inline annotations:
none of them need a new env var.

---

## 3. Verification checklist (5–10 min)

After deploy, walk through these to confirm nothing regressed:

1. **Sign in**, then **⌘K** — palette opens; type "ESR" — see policies.
2. Press **?** — keyboard cheat sheet appears.
3. Open `/profile/preferences` — toggle theme to **dark** — UI inverts immediately.
4. Open `/profile/workbench` — see Inbox / Saved searches / Workspaces / Collections cards.
5. Open `/profile/inbox` — empty list (no notifications yet) is fine.
6. Open `/profile/workspaces` — create one, then `/profile/collections` — create one.
7. Open `/policy-navigator` on a phone-sized viewport — graph swaps for list mode.
8. Open any policy detail page — the ↶ Related drawer handle appears mid-right.
9. Open the floating chat (bottom-right) on a policy detail — ask a question; if no LLM key, see the "unavailable" message.
10. Run any policy connection edit — the change-history popover gets a new row with the diff and your `display_name`.

---

## 4. Known limitations / follow-ups

- **#19 citation graph** is heuristic-based (Jaccard token overlap). Real
  citation edges need a Crossref `references[]` ingestion job — not part
  of this branch.
- **#11 assistant** grounds on the *currently registered context* only
  (the policy/news/reference the user is viewing). It does NOT search the
  full library. To extend, add more `setContext` call sites or build a
  retrieval step before the prompt.
- **#10 mobile list** is a complementary view, not a feature-parity
  replacement. The graph remains canonical for tablet+.
- **#8 bulk actions** are wired into M·01 References list; the same
  `useBulkSelection` + `BulkActionBar` can be dropped into the news
  feed and the policy navigator with ~30 lines each — left as
  follow-up.
- **#4 @-mentions** notify on `display_name`-prefix matches. If your team
  has duplicate first names, prompt users to set unique handles in their
  profile — there's no separate handle column today.
- **#18 public profile** is opt-in (default off in `user_preferences`).
  Until users opt in, `/contributors` is empty.

---

## 5. Rollback

To roll back this branch, revert the merge commit. The Supabase tables it
adds will still exist but will be unused — you can drop them when convenient:

```sql
drop table if exists public.text_annotations;
drop table if exists public.artefact_history;
drop table if exists public.collection_items;
drop table if exists public.collections;
drop table if exists public.workspace_items;
drop table if exists public.workspace_members;
drop table if exists public.workspaces;
drop table if exists public.user_preferences;
drop function if exists public.user_has_public_profile(uuid);
```
