# User Space

Everything in MethodHub that belongs to *the analyst*, not to a module. These
surfaces unify the eight production modules into a single product.

| Surface | Path | What it does |
| ------- | ---- | ------------ |
| **Workbench** | `/profile/workbench` | Monday-morning landing dashboard. Aggregates inbox unread, saved searches with new-since counters, workspaces, collections, and recent activity into one view. |
| **Inbox**     | `/profile/inbox`     | @-mentions, comment replies, system notices. Same source as the bell icon in the header. Filter unread / mark all read. |
| **Preferences** | `/profile/preferences` | Theme (system / light / dark), density, notification frequency, email digest, default citation style, AI summary language, keyboard-shortcut toggle, public-profile opt-in. |
| **Workspaces** | `/profile/workspaces`, `/profile/workspaces/[id]` | Shared research projects. Curated set of references, policies, news items, scenario views, segments. Editor / viewer roles per member. |
| **Collections** | `/profile/collections`, `/profile/collections/[id]` | Personal cross-module folders. Drag any artefact card onto the drop-zone; export bundles later. |
| **Contributors** | `/contributors` | Public leaderboard of users who opted into a public profile. Hover any byline to discover subject experts. |

## Cross-module utilities

These run on every page (mounted in `src/app/layout.tsx`) and need no
per-module wiring beyond an opt-in `setContext` call:

- **⌘K Command Palette** — global search over References / Scenarios /
  News / Policies / Code segments. Module prefixes (`p:`, `r:`, `n:`,
  `s:`, `c:`) restrict to one module.
- **Context Drawer** — slide-in panel showing artefacts related to the
  current page, fanned out from `/api/context-drawer`.
- **Assistant** — floating chat button. Grounds replies in the loaded
  policy / reference text via `/api/assistant`. Refuses to speculate
  outside the GROUND TRUTH excerpts.
- **Keyboard Shortcuts** — `?` opens a cheat sheet; `g r/d/n/p/c/w/i/s`
  jumps between modules and user-space pages; `j k s r a c` hooks the
  current list page when the focused element isn't typing.
- **Undo Toasts** — every destructive action that fires
  `window.dispatchEvent(new CustomEvent('mh:undo', { detail: {...}}))`
  shows a 15-second undo affordance.
- **Onboarding Tour** — replayable per module via `?help=1`.

## How modules opt in

A module page tells the cross-module utilities about its current state
with two patterns.

```tsx
// Set the page-level artefact for the drawer + assistant.
useEffect(() => {
  if (!policy) return;
  setContext({ kind: 'policy', id: policy.id, title: policy.short_title });
  return () => setContext(null);
}, [policy]);
```

```tsx
// Make a list-card draggable into a Collection.
import { makeDraggable } from '@/components/AddToCollectionMenu';
<li {...makeDraggable('reference', ref.id)}>…</li>
```

## Schema

Per-user state spans a small set of tables. Every one is RLS-locked to
`auth.uid()` (or workspace membership for shared rows).

| Table | Migration | Used by |
| ----- | --------- | ------- |
| `user_preferences` | `023_user_preferences.sql` | Preferences, dark mode, density, shortcut toggle, public-profile opt-in, onboarding-seen flags |
| `workspaces` / `workspace_members` / `workspace_items` | `024_…` | Team workspaces |
| `collections` / `collection_items` | `024_…` | Personal cross-module folders |
| `artefact_history` | `024_…` | Change-history timeline |
| `text_annotations` | `024_…` | Inline annotations on news / policy article / reference abstract |
| `notifications` (existing) | `001_notifications.sql` (legacy) | Inbox, bell |
| `activity_log` (existing) | legacy | Profile gamification, recent activity, contributor totals |
| `news_saved_searches` (existing) | `022_…` | Workbench saved-search counter |

## Privacy / GDPR

- **Public profile is opt-in.** Default `public_profile = false`. Until a
  user toggles it on in Preferences, their display name does not appear
  on `/contributors`.
- **Workspaces are private to their members.** Non-members can't read
  items, members, or annotations attached to a workspace.
- **Annotations are private by default.** They become visible to a
  workspace only when the user explicitly attaches them.
- **Change-history entries store `user_id`.** They are visible to any
  authenticated user (audit data) but cannot be deleted by non-admins.
- **`SUPABASE_SERVICE_ROLE_KEY` never reaches the browser.**
  `supabase-server.ts` enforces this at module load.
