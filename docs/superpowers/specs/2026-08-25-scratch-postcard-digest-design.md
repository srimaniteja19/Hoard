# Weekly Postcard Digest — Design

## Summary

A "THIS WEEK'S POSTCARD" feature for Scratch: a deterministically-computed,
one-page weekly summary (kind tallies, a picked highlight quote, streak
info) that's saved once per calendar week and exportable as a shareable
PNG image via a URL.

## Motivation

Scratch already computes rich stats (`getScratchStats`, `tallies.ts`) but
nothing gives a shareable, point-in-time artifact of a week's activity.
The YouTube digest pipeline already proved the "raw capture → structured,
saved artifact" pattern for this app; this reuses that shape without its
LLM dependency, and reuses `next/og`'s `ImageResponse` (already used for
collection Open Graph images) for the export step instead of adding a new
image-rendering library.

## Scope decisions (confirmed with user)

- **Generation**: fully deterministic aggregation over the week's scraps —
  no LLM call anywhere in this feature. Distinguishes this from the
  YouTube digest pipeline, which is LLM-only.
- **Persistence**: saved, one row per `(userId, weekStart)`. Once
  generated, a postcard is an immutable snapshot — regenerating a past
  week is not supported; editing/burying a scrap after its week's
  postcard was generated does not change the postcard.
- **Trigger**: on-demand, generate-or-fetch. No cron, no scheduled job —
  matches the YouTube digest's on-demand button pattern. This app has no
  existing cron infrastructure to build on.
- **Week boundary**: fixed calendar week, Monday–Sunday. Bucketed by the
  scrap's existing `loggedFor` field (the same field the Shelf, Sheet,
  Calendar, and Year Wall already group by) — not raw `createdAt`.
- **Content**: kind-breakdown tallies, a picked highlight quote, and
  streak/activity stats (days logged this week, comparison to last week's
  total, current streak). Explicitly out of scope: promotions-this-week
  breakdown (not requested).

## Data model

New table `scratch_postcards` (Drizzle, `src/db/schema.ts`), following the
`savedDigests` table's conventions:

```ts
export const scratchPostcards = pgTable(
  "scratch_postcards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(), // Monday, ISO yyyy-mm-dd
    weekEnd: date("week_end").notNull(), // Sunday
    kindTallies: jsonb("kind_tallies").$type<Record<string, number>>().notNull(),
    totalCount: integer("total_count").notNull(),
    daysLogged: integer("days_logged").notNull(), // 0-7
    previousWeekTotal: integer("previous_week_total").notNull(),
    currentStreak: integer("current_streak").notNull(),
    highlightScrapId: text("highlight_scrap_id").references(() => scraps.id, {
      onDelete: "set null",
    }),
    highlightContent: text("highlight_content"), // snapshot, survives scrap edits/burial
    highlightKind: varchar("highlight_kind", { length: 32 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("scratch_postcards_user_week_idx").on(table.userId, table.weekStart),
  ]
);

export type ScratchPostcardRow = typeof scratchPostcards.$inferSelect;
export type NewScratchPostcardRow = typeof scratchPostcards.$inferInsert;
```

`highlightContent`/`highlightKind` are snapshotted text, not re-derived
from `highlightScrapId` at view/render time — this is what makes a
generated postcard a true immutable artifact of that week, consistent
with the persistence decision above. `highlightScrapId` is kept only as
an optional "jump to it" link and is nullable (`onDelete: "set null"`) so
a later deletion of the source scrap doesn't break the postcard row.

**Migration**: standard Drizzle workflow already used throughout this
repo (`drizzle-kit generate` → commit the generated SQL under `./drizzle`
→ `npm run db:migrate`) — not the `ensureTable()` runtime-self-migration
pattern `dal/digests.ts` uses (that appears to be a one-off for that
file; `dal/scratch.ts`, this feature's direct precedent, uses normal
migrations).

## Components

### `src/lib/scratch/postcard.ts` (new, pure logic)

```ts
export interface WeekBounds {
  weekStart: string; // yyyy-mm-dd, Monday
  weekEnd: string; // yyyy-mm-dd, Sunday
}

export function getWeekBounds(date: Date): WeekBounds;

export interface PostcardHighlight {
  scrapId: string;
  content: string;
  kind: ScrapKind;
}

export interface PostcardData {
  kindTallies: Record<string, number>;
  totalCount: number;
  daysLogged: number;
  highlight: PostcardHighlight | null;
}

/** weekScraps: already loaded, filtered to this week's loggedFor range, not buried. */
export function computePostcardData(weekScraps: ScrapRow[]): PostcardData;
```

`computePostcardData` does NOT compute `previousWeekTotal` or
`currentStreak` — those require querying outside the week's own data
(a separate week's count; up to 60 days of history) and are computed by
the DAL/route layer, then passed alongside `computePostcardData`'s
output when building the row to insert. Keeping them out of this pure
function matches this codebase's convention of pure `lib/scratch/*.ts`
helpers operating only on the data they're handed.

**Highlight pick** (`computePostcardData` internal, deterministic, in
priority order — first non-empty match wins):

1. Longest `content` among this week's `kind === "QUOTE"` scraps (tie:
   earliest `createdAt`).
2. Most recently pinned scrap this week (`entities.pinnedAt`), any kind.
3. Highest-`threadN` (most-welded) scrap this week.
4. None — the postcard's highlight section is simply omitted. An empty
   or quiet week is shown honestly, not padded with a weak pick.

### `src/lib/dal/postcards.ts` (new)

- `getSavedPostcard(userId, weekStart): Promise<ScratchPostcardRow | null>`
- `savePostcard(userId, data: NewScratchPostcardRow): Promise<ScratchPostcardRow>`
- `getWeekScraps(userId, weekStart, weekEnd): Promise<ScrapRow[]>` — query
  `scraps` where `loggedFor` between bounds, `isBuried = false`.
- `getWeekTotal(userId, weekStart, weekEnd): Promise<number>` — lightweight
  count-only query, used only for the *previous* week's total (the
  current week's total is simply `weekScraps.length` from
  `computePostcardData`'s output, so no separate query is needed for it;
  the previous week's individual scraps aren't otherwise needed, hence a
  count-only query rather than reusing `getWeekScraps`).
- `getCurrentStreak(userId, asOfDate, lookbackDays = 60): Promise<number>` —
  queries distinct `loggedFor` days going back up to 60 days from
  `asOfDate`, walks backward day-by-day counting the consecutive run
  ending at (or before) `asOfDate`. The 60-day cap reuses the same
  horizon `getScratchStats`'s compost logic already treats as
  meaningful, rather than introducing a new arbitrary number.

### `POST /api/scratch/postcard` (new route)

Body: `{ weekStart?: string }` (defaults to the current week's Monday via
`getWeekBounds(new Date())`). Generate-or-fetch:

1. `requireUserId`
2. Compute `{weekStart, weekEnd}` via `getWeekBounds`
3. `getSavedPostcard(userId, weekStart)` — if found, return it directly
   (200), no recomputation.
4. Else: `getWeekScraps`, `computePostcardData`, `getWeekTotal` for the
   previous week, `getCurrentStreak`, assemble a `NewScratchPostcardRow`,
   `savePostcard`, return it (200).

No `PATCH`/`DELETE` — postcards are generate-once, immutable, per the
persistence decision.

### `GET /api/scratch/postcard/[weekStart]/image` (new route)

`runtime = "nodejs"`, follows `src/app/share/[id]/opengraph-image.tsx`'s
exact pattern: `requireUserId`, `getSavedPostcard(userId, weekStart)` —
**404 if not yet generated** (this route never generates; generation only
happens via the POST route, keeping "view" and "create" cleanly
separate). Renders via `ImageResponse` from `next/og` at a portrait
postcard aspect ratio, `size = { width: 1080, height: 1350 }`.

`next/og`'s Satori renderer does not support CSS custom properties, so
(matching `opengraph-image.tsx`'s existing use of literal hex instead of
`var(--...)`) the image uses the app's default-theme palette as literal
hex: background `#FFFDF7` (`--card`), ink `#0A0A0A` (`--ink`), accent
band `#FFE94A` (`--yellow`), highlight block `#7C4DFF` (`--violet`).
`fontFamily: "sans-serif"` (Satori's built-in default) — no custom font
loading, matching the existing precedent exactly.

### `src/components/scratch/ScratchPostcardModal.tsx` (new)

A small modal (not the full `ScratchNoteModal` machinery — this has no
editing surface). On open: `POST /api/scratch/postcard` (generate-or-fetch
for the current week), render the returned row's tallies/highlight/streak
as plain sections, a "Download Image" link to
`/api/scratch/postcard/{weekStart}/image` (opens/downloads the PNG), and
a "Copy as Markdown" button building a template string client-side (no
new server code needed for this — same spirit as
`formatDigestJsonToMarkdown` but simple enough to inline).

### Entry point

A "📮 THIS WEEK'S POSTCARD" button in the Logbook view (`page.tsx`,
alongside the existing `ScratchYearWall`/`ScratchSidePanels`, where
week/year-scoped stats already live) opens `ScratchPostcardModal`.

## Error handling

- `POST /api/scratch/postcard`: a week with zero scraps still generates a
  valid postcard (all-zero tallies, `daysLogged: 0`, `highlight: null`) —
  not an error state, matches the app's "nothing is ever filed" ethos.
- `GET .../image`: 404 (not auto-generate) if the week hasn't been
  generated yet — the modal always generates before offering the
  download link, so this should only be hit by a stale/shared URL.
- No new client-side error UI beyond the existing toast pattern already
  used elsewhere on the Scratch page.

## Testing

`src/lib/scratch/postcard.test.ts`: `getWeekBounds` (Monday/Sunday
computation across a few reference dates, including a week that spans a
month boundary) and `computePostcardData` (tally counts, `daysLogged`,
and each of the four highlight-priority branches), following the
existing `mockScrap()` convention from `filters.test.ts`/`aging.test.ts`/
`corkboard.test.ts`. No tests for the DAL, the two new routes, or the
image route — matches this codebase's existing coverage (`dal/scratch.ts`
and `opengraph-image.tsx` aren't tested either).

## Out of scope

- Promotions-this-week breakdown.
- Regenerating/editing a past week's postcard.
- Automatic/scheduled generation (cron).
- "Copy as Markdown" as a server-side route (kept as inline client logic
  since it's simple enough not to need one).
