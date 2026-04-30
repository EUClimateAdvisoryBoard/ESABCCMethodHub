# Design system — Phase 1 foundations

The pro-UX brainstorm
([Brainstorm — professional UX for the five modules](../vision/brainstorm-pro-ux-five-modules.md))
ranked twelve cross-cutting items above the per-module work. Phase 1
ships those foundations as design tokens and shared primitives. Every
later module-specific change should consume these — no module is
allowed to invent its own toast, focus ring, or empty-state.

## Tokens

All tokens live as CSS custom properties on `:root` (and `html.dark`)
in `src/app/globals.css`. Reference them via `var(--mh-*)` in components
or via the utility classes below.

| Family    | Tokens |
| --------- | ------ |
| Type      | `--mh-text-{2xs..3xl}`, `--mh-leading-{tight,snug,base,loose}`, `--mh-tracking-{tight,normal,wide}` |
| Spacing   | `--mh-space-{0..8}` (8 px grid + 4 px micro-grid) |
| Radii     | `--mh-radius-{xs,sm,md,lg,xl,pill}` |
| Elevation | `--mh-shadow-{xs,sm,md,lg}` |
| Motion    | `--mh-ease-{standard,emphasized,decelerated,accelerated}`, `--mh-duration-{instant,fast,base,slow,deliberate}` |
| Focus     | `--mh-focus-ring-{width,offset,color}` (WCAG 2.2 SC 2.4.7 + 2.4.13) |
| Status    | `--mh-status-{primary,info,success,warning,danger}` and matching `*-bg` |

## Utility classes

Defined in `src/app/globals.css`. Composable with Tailwind; no plugin
required.

| Class              | Purpose |
| ------------------ | ------- |
| `mh-focus`         | Apply WCAG 2.2 focus ring on `:focus-visible`. |
| `mh-skip-link`     | Top-of-page skip-to-main affordance. |
| `mh-badge`         | Base chip; pair with `mh-badge-{primary,info,success,warning,danger,neutral}`. |
| `mh-tnum`          | Tabular numerals on data surfaces. |
| `mh-motion-base`   | 240 ms M3 standard easing — default enter. |
| `mh-motion-fast`   | 160 ms — exit / hover. |
| `mh-ring-pulse`    | One-shot 600 ms ring pulse for deep-link landings. |
| `mh-skeleton`      | Shimmer placeholder background. |

All animations are auto-disabled under `prefers-reduced-motion: reduce`.

## Shared primitives

Living under `src/components/ui/`. Import from there in module code.

### `Skeleton` — perceived performance
```tsx
import Skeleton from '@/components/ui/Skeleton';

<Skeleton.Stack count={5} />              // list-page first paint
<Skeleton.Card />                         // single card placeholder
<Skeleton.Block height={240} rounded="lg" /> // arbitrary rectangle
```
Replaces spinners everywhere except `<400 ms` actions where layout is
unknown.

### `EmptyState` / `ErrorState` / `LoadingState` / `PartialState`
```tsx
import { EmptyState, ErrorState, PartialState, LoadingState } from '@/components/ui/StateView';

<EmptyState
  title="No references yet"
  body="Drop a PDF, paste a DOI, or import from Zotero."
  primaryAction={{ label: 'Drop a PDF', onClick: openDropzone }}
  secondaryActions={[{ label: 'Try a sample', onClick: importSample }]}
/>
```
Every list, chart, and panel ships all four states. Same shape, same
focus order, same a11y roles.

### `ToastHost` — typed toasts
```tsx
import { showToast } from '@/components/ui/ToastHost';

showToast({ tone: 'success', message: 'Exported FF55-baseline.png' });
showToast({
  tone: 'primary',
  message: 'Moved Just Transition under Carbon Pricing',
  actionLabel: 'Undo',
  onAction: () => moveBack(),
  timeoutMs: 15000,
});
```
Five tones map to the system-status taxonomy. ARIA: `role="alert"` for
`danger`, `role="status"` elsewhere. Listens to legacy `mh:undo` events
for back-compat with the old `showUndoToast` helper.

### `ConfidenceDot` — at-a-glance epistemic UI
```tsx
import ConfidenceDot from '@/components/ui/ConfidenceDot';

<ConfidenceDot score={0.87} />               // ●●● success
<ConfidenceDot score={0.72} showLabel />     // ●●○ warning · 72%
<ConfidenceDot score={0.34} />               // ●○○ danger
```
Use on news cards, graph edges, and AI-suggested code segments. Pair
with `ExplainabilityBadge` when a "why?" popover is also wanted.

### `FilterPill` / `SavedViewChip` / `FilterPillRow`
```tsx
import { FilterPill, SavedViewChip, FilterPillRow } from '@/components/ui/FilterPill';

<FilterPillRow sticky>
  <FilterPill label="Sector" count={3} active onClick={openSector} onClear={clearSector} />
  <FilterPill label="Last 7 days" active onClick={openDate} onClear={clearDate} />
  <SavedViewChip label="FF55 baseline" pinned active onClick={loadFF55} />
</FilterPillRow>
```
Replaces tall checkbox columns. Sticky variant keeps active filters
visible during scroll.

### `useOptimisticAction` — paint-now save
```ts
import { useOptimisticAction } from '@/lib/useOptimistic';

const tags = useOptimisticAction({
  initial: reference.tags,
  commit: (next) => api.updateTags(reference.id, next),
  onError: (err) => showToast({ tone: 'danger', message: 'Could not save', description: err.message }),
});
await tags.run([...tags.value, 'just-transition']);
```
Centralises the optimistic-UI pattern (success silent, failure rolls
back). Stops every component from inventing its own try/catch.

### `useUrlState` — URL-as-state
```ts
import { useUrlState, codecs } from '@/lib/useUrlState';

const [view, update, reset] = useUrlState({
  lib:      codecs.string(''),                                  // ?lib=…
  q:        codecs.string(''),                                  // ?q=…
  selected: codecs.string(''),                                  // ?selected=…
  mode:     codecs.enum(['feed', 'briefing', 'clock'], 'feed'), // ?mode=…
  tags:     codecs.csv([]),                                     // ?tags=a,b,c
});

update({ selected: ref.id });   // debounced replace by default
update({ mode: 'briefing' });   // values matching defaults are dropped
```
Every meaningful piece of view state lives in the URL — refresh,
back-button, and shared links all restore the exact view. Foundation
for items 1.1 / 3.1 / 4.1 / 5.1 in the
[major UI/UX review re-ranked](../vision/brainstorm-modules-uxui-feasibility-rank.md).
Pass `{ push: true }` to opt into history entries (e.g. for navigation
between policies).

### `ModeSwitcher` — task-verb tabs
```tsx
import ModeSwitcher, { ModePanel } from '@/components/ui/ModeSwitcher';

<ModeSwitcher
  ariaLabel="View mode"
  modes={[
    { id: 'read',     label: 'Read',     subtitle: 'Article view' },
    { id: 'code',     label: 'Code',     subtitle: 'Tag segments' },
    { id: 'compare',  label: 'Compare',  subtitle: 'Side-by-side' },
    { id: 'export',   label: 'Export',   subtitle: 'Word table' },
  ]}
  value={mode}
  onChange={(id) => update({ mode: id })}
/>
```
Names *jobs* (verbs) instead of nouns. Pairs with `useUrlState`'s
`enum` codec. Keyboard: ← → to move focus, Home / End to jump.
Foundation for items 2.1 / 3.1 / 4.2 / 5.2.

### `ProvenanceChip` — where-from / who-owns
```tsx
import ProvenanceChip from '@/components/ui/ProvenanceChip';

<ProvenanceChip kind="source"   label="IIASA AR6" />
<ProvenanceChip kind="lineage"  label="NGFS Net-Zero" uploader="sf@" uploadedAt={uploadedAt} />
<ProvenanceChip kind="lock"     label="locked" holder="Maria F." heartbeatAt={hb} />
<ProvenanceChip kind="citation" label="cited" count={12} href="/references/abc/backlinks" />
<ProvenanceChip kind="trust"    tier="primary" label="EUR-Lex" />
```
Five kinds covering source, lineage, lock, citation backlinks and
credibility tier. Tooltip surfaces the full chain on hover; `aria-label`
exposes it to screen readers. Foundation for items 1.6 / 2.4 / 3.3 /
4.6 / 5.3.

## What Phase 1 does *not* yet ship

These are the next items on the foundations list, sized for the next
sprint:

- Inter Variable via `next/font/google` with system fallback.
- Skip-link wired into the root layout.
- Top-level `<a href="#main">` + `<main id="main">` landmark hookup.
- WCAG-2.2 audit of every interactive element for ≥ 24×24 CSS px hit.
- Reduced-motion audit of every D3 / canvas animation.

These will land alongside the per-module work in Phase 2+ — but the
tokens and primitives above are the contract that work writes against.
