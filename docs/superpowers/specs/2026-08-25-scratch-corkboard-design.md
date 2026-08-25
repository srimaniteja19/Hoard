# Scratch Corkboard Mode — Design

## Summary

A fourth Scratch view mode, alongside Stream / Pinned / Logbook, that
renders pinned scraps as freely draggable cards on a corkboard canvas,
with red string connecting scraps that have been welded together. It
extends the app's existing physical-desk metaphor (torn paper, ink,
paperclips, compost) into a literal pinboard.

## Motivation

Pinned scraps today live in a flat list (`ScratchPinnedView`). A
corkboard gives spatial arrangement — clustering related pins, laying
out a thread visually — which the flat list can't offer, and reuses
data (`isPinned`, weld relationships) that already exists rather than
introducing new concepts.

## Scope decisions (confirmed with user)

- **Placement**: a 4th tab in the existing view switcher
  (`STREAM / PINNED / LOGBOOK / CORKBOARD`) on `/scratch`, not a
  separate route. Shares the page's existing `scraps` state and
  filters.
- **Population**: pinned scraps only (`isScrapPinned`, the same
  predicate `ScratchPinnedView` already uses). Corkboard is a curated
  space, not a dump of the whole Shelf.
- **Connections**: red string is drawn automatically from existing
  weld data (`scrap.weldedToId`) — no new manually-drawn connection
  type. If both ends of a weld are currently pinned, a line connects
  them.
- **Positioning persistence**: stored on the existing `entities` jsonb
  column as `boardX` / `boardY` (same field that already holds
  `isPinned`/`pinnedAt`) — no schema migration.

## Prerequisite bug fix (already applied, out of band)

`handleConfirmWeld` in `src/app/(app)/scratch/page.tsx` was calling
`POST /api/scratch/weld` with `{sourceId, targetId}` in the body, but
the only route that exists is `POST /api/scratch/[id]/weld` (id in the
URL, body is `{sourceId}`), and the response was destructured as
`{updatedTarget}` when the route returns the scrap directly. This has
been fixed so weld-confirm actually persists `weldedToId`/`threadN` —
required for the red-string feature to have any data to draw from.

**Known follow-on gap (not fixed, flagged for later):** `weldScraps`
(`src/lib/dal/scratch.ts`) never buries/hides the source scrap in the
database. The weld modal's local UI optimistically removes it from the
in-memory list, but a full reload will bring it back since it's never
marked `isBuried`. Out of scope for this spec — worth a decision later
on whether welding should auto-bury the source.

## Data model

No schema changes. New fields on the existing `ScrapEntities` jsonb
shape (`src/db/schema.ts`):

```ts
export interface ScrapEntities {
  // ...existing fields...
  boardX?: number;
  boardY?: number;
}
```

Positions are only meaningful for pinned scraps but are stored
unconditionally if set (harmless if a scrap is later unpinned and
re-pinned — its old position is remembered).

## Components

### `ScratchCorkboard.tsx` (new)

Props mirror the other view components already threaded through
`page.tsx`:

```ts
interface ScratchCorkboardProps {
  scraps: ScrapRow[]; // full list; component filters to pinned internally
  onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
  onPromoteTil: (id: string) => Promise<void> | void;
  onPromoteTodo: (id: string) => Promise<void> | void;
  onWeld: (id: string) => void;
  onBury: (id: string) => Promise<void> | void;
  onTogglePin: (id: string) => Promise<void> | void;
  onUpdatePosition: (id: string, x: number, y: number) => Promise<void> | void; // new
}
```

Renders:
- A large scrollable canvas (`min-width`/`min-height` bigger than the
  viewport, e.g. 2000×1200px) with a cork-texture background
  (repeating radial-gradient dots), matching the app's neo-brutalist
  desk styling.
- One `ScratchCorkboardCard` per pinned scrap, absolutely positioned
  via `left`/`top` from its resolved board position.
- An absolutely-positioned `<svg>` overlay (same size as the canvas,
  `pointer-events: none`) drawing a line between the center-points of
  any two currently-pinned, weld-connected cards. Recomputed whenever
  card positions change.
- Empty state (no pinned scraps) matching `ScratchFeed`'s existing
  empty-state pattern, pointing the user at the paperclip pin action.

### `ScratchCorkboardCard.tsx` (new)

A lighter card than `ScratchCard` — no ink studio, no AI-expand panel,
no note drawer. Shows: kind badge, content preview (~120 chars,
reusing the same `#tag` / `?question` / `>quote` inline formatting
`ScratchCard` already does), the existing `--c`/`--tilt` CSS vars for
visual consistency with the rest of the app. Click opens the existing
`ScratchNoteModal` for full editing — no new editor is built.

Drag handling is hand-rolled pointer events (`pointerdown` /
`pointermove` / `pointerup`) on the card, consistent with how
`ink.ts`'s canvas engine and `collision.ts` are already hand-rolled
rather than pulling in a drag library. On `pointerup`, the parent
calls `onUpdatePosition`.

## Data flow

1. `page.tsx` adds `"corkboard"` to the `viewMode` union and a fourth
   button in the view switcher.
2. `ScratchCorkboard` filters `scraps` to pinned internally (no new
   fetch — reuses the already-loaded `scraps` state, same as
   `ScratchPinnedView`).
3. Position resolution per card: use `entities.boardX/boardY` if
   present; otherwise a deterministic scattered fallback computed from
   a hash of the scrap id (same seeded-hash technique as
   `getRingSeed` in `aging.ts`), mapped into a loose grid so first
   visits aren't stacked at the origin.
4. On drag end: optimistic local state update immediately, then a
   debounced (~400ms) `PATCH /api/scratch/:id` with
   `{ entities: { boardX, boardY } }` — reuses `updateScrap`'s
   existing partial-entities-merge logic in `src/lib/dal/scratch.ts`,
   no new endpoint needed.
5. Red string pairs are derived by a pure helper,
   `getWeldConnections(scraps: ScrapRow[])`, returning
   `Array<{ from: string; to: string }>` for pairs where both ends are
   pinned and `weldedToId` links them. `ScratchCorkboard` maps this to
   line coordinates using each card's resolved position.

## Error handling

- Failed position `PATCH`: keep the optimistic position (no jarring
  snap-back), `console.error` — consistent with every other mutation
  handler already in `page.tsx`.
- No new loading states: corkboard reuses the page's existing
  `loading` flag from the initial `fetchScraps()`.

## Testing

New `src/lib/scratch/corkboard.ts` holding the two pure, testable
pieces of logic (kept out of the component files, matching the
project's existing pattern of pure helpers in `lib/scratch/*.ts` with
sibling `.test.ts` files):

- `getBoardPosition(scrap, index)` — resolves stored position or a
  deterministic scattered fallback.
- `getWeldConnections(scraps)` — derives red-string pairs.

Both get unit tests in `corkboard.test.ts` following the existing
`mockScrap()` convention from `filters.test.ts` / `aging.test.ts`.

Drag mechanics themselves are not unit tested, consistent with the
ink canvas in `ScratchCard.tsx` also being untested — verified via
manual browser check instead.

## Out of scope

- Manual (non-weld) connections drawn directly on the board.
- Multi-select / bulk drag.
- Zoom/pan controls beyond native scroll.
- Auto-bury of welded source scraps (see "Known follow-on gap" above).
