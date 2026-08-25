# Weekly Postcard Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "THIS WEEK'S POSTCARD" feature to Scratch — a deterministically-computed, saved-once-per-calendar-week summary (kind tallies, a picked highlight quote, streak stats) exportable as a shareable PNG.

**Architecture:** A new Drizzle table (`scratch_postcards`, one row per `(userId, weekStart)`) backs a pure-logic aggregation module and a DAL, exposed via a generate-or-fetch `POST` route and a render-only `GET .../image` route (using `next/og`'s `ImageResponse`, the same mechanism already used for collection Open Graph images). A small modal component is the UI entry point, opened from a new button in the Logbook view.

**Tech Stack:** Next.js (App Router), React, TypeScript, Drizzle (new table, hand-written SQL migration), Vitest, `next/og` for image rendering.

**Spec:** `docs/superpowers/specs/2026-08-25-scratch-postcard-digest-design.md`

## Global Constraints

- No LLM call anywhere in this feature — all content is deterministic aggregation.
- Postcards are generate-once and immutable — no update/regenerate endpoint.
- Week boundary is a fixed calendar week, Monday–Sunday, bucketed by the scrap's existing `loggedFor` field (not `createdAt`).
- Highlight pick priority, first non-empty match wins: (1) longest `content` among this week's `kind === "QUOTE"` scraps, tie broken by earliest `createdAt`; (2) most recently pinned scrap this week (`entities.pinnedAt`), any kind; (3) highest-`threadN` scrap this week; (4) none — omit the highlight section.
- The image route (`next/og`/Satori) does not support CSS custom properties — use literal hex matching the app's default theme: background `#FFFDF7`, ink `#0A0A0A`, accent `#FFE94A`, highlight block `#7C4DFF`. `fontFamily: "sans-serif"`, no custom font loading — matches `src/app/share/[id]/opengraph-image.tsx`'s existing precedent exactly.
- Follow existing project conventions: pure logic in `src/lib/scratch/*.ts` with a sibling `*.test.ts` using the `mockScrap()` pattern already established in `src/lib/scratch/filters.test.ts`/`aging.test.ts`/`corkboard.test.ts`; API routes use `requireUserId`/`AuthError` from `@/lib/session` exactly as every existing `src/app/api/scratch/**/route.ts` does.

---

### Task 1: `scratch_postcards` schema and migration

**Files:**
- Modify: `src/db/schema.ts` (add table definition; append near `savedDigests`, e.g. directly after it)
- Create: `drizzle/0017_add_scratch_postcards.sql`
- Modify: `drizzle/meta/_journal.json` (append one entry)

**Interfaces:**
- Produces: `scratchPostcards` Drizzle table, `ScratchPostcardRow` (`$inferSelect`), `NewScratchPostcardRow` (`$inferInsert`) — exported from `src/db/schema.ts`, consumed by Task 3 (DAL) and Task 4/5 (routes).

**Important — do not run `npx drizzle-kit generate` or `npm run db:migrate` for this task.** This repo's `drizzle/meta/_journal.json` is missing entries for three already-applied migration files (`0014_add_scraps.sql`, `0015_add_scrap_assets.sql`, `0016_add_log_and_occurred_on.sql` exist on disk but aren't in the journal). Because of that gap, `drizzle-kit generate` would misdiff against a stale "known schema" and likely try to regenerate unrelated tables. Hand-write the migration file and journal entry instead (matching the exact style of the already-applied `drizzle/0013_add_atlases.sql`/`0014_add_scraps.sql`), and leave actually applying it to `npm run db:migrate` as a manual step for a human with real `DATABASE_URL` access — do not run that command yourself.

- [ ] **Step 1: Add the table to `src/db/schema.ts`**

Add directly after the `savedDigests` table definition (which itself sits after `playbookRuns`, ending `export type NewPlaybookRunRow = typeof playbookRuns.$inferInsert;` around line 780, before `export const savedDigests = pgTable(...)`). Place this new block after `savedDigests`'s own type exports:

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
    weekStart: date("week_start").notNull(),
    weekEnd: date("week_end").notNull(),
    kindTallies: jsonb("kind_tallies").$type<Record<string, number>>().notNull(),
    totalCount: integer("total_count").notNull(),
    daysLogged: integer("days_logged").notNull(),
    previousWeekTotal: integer("previous_week_total").notNull(),
    currentStreak: integer("current_streak").notNull(),
    highlightScrapId: text("highlight_scrap_id").references(
      (): AnyPgColumn => scraps.id,
      { onDelete: "set null" }
    ),
    highlightContent: text("highlight_content"),
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

`scratchPostcards` must be defined AFTER the `scraps` table in the file (it references `scraps.id`) — since `savedDigests` (and therefore this new block) already sits after `scraps`, no reordering is needed; just add it in place.

- [ ] **Step 2: Hand-write the migration SQL**

Create `drizzle/0017_add_scratch_postcards.sql`:

```sql
CREATE TABLE "scratch_postcards" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "week_start" date NOT NULL,
  "week_end" date NOT NULL,
  "kind_tallies" jsonb NOT NULL,
  "total_count" integer NOT NULL,
  "days_logged" integer NOT NULL,
  "previous_week_total" integer NOT NULL,
  "current_streak" integer NOT NULL,
  "highlight_scrap_id" text REFERENCES "scraps"("id") ON DELETE SET NULL,
  "highlight_content" text,
  "highlight_kind" varchar(32),
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX "scratch_postcards_user_week_idx" ON "scratch_postcards" ("user_id", "week_start");
```

- [ ] **Step 3: Append the journal entry**

Open `drizzle/meta/_journal.json`. It currently ends with an entry with `"idx": 8, "tag": "0013_add_atlases"` as the last element of the `"entries"` array, immediately before the array's closing `]` and the object's closing `}`. Add a comma after that entry and insert:

```json
    {
      "idx": 9,
      "version": "7",
      "when": 1787400000000,
      "tag": "0017_add_scratch_postcards",
      "breakpoints": true
    }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/0017_add_scratch_postcards.sql drizzle/meta/_journal.json
git commit -m "feat: add scratch_postcards table for weekly postcard digest"
```

Note in your report: applying this migration (`npm run db:migrate`) still needs to happen manually against the real database before the feature works end-to-end — flag this clearly, don't attempt it yourself.

---

### Task 2: Pure postcard aggregation logic

**Files:**
- Create: `src/lib/scratch/postcard.ts`
- Test: `src/lib/scratch/postcard.test.ts`

**Interfaces:**
- Consumes: `ScrapRow`, `ScrapKind` from `@/db/schema` (no dependency on Task 1's new table — this module only reads `ScrapRow[]`).
- Produces:
  - `interface WeekBounds { weekStart: string; weekEnd: string }`
  - `getWeekBounds(date: Date): WeekBounds`
  - `interface PostcardHighlight { scrapId: string; content: string; kind: ScrapKind }`
  - `interface PostcardData { kindTallies: Record<string, number>; totalCount: number; daysLogged: number; highlight: PostcardHighlight | null }`
  - `computePostcardData(weekScraps: ScrapRow[]): PostcardData`
  - Both consumed by the route in Task 4.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scratch/postcard.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getWeekBounds, computePostcardData } from "./postcard";
import { ScrapRow } from "@/db/schema";

function mockScrap(partial: Partial<ScrapRow>): ScrapRow {
  return {
    id: "s1",
    userId: "u1",
    content: "Sample content",
    kind: "FRAGMENT",
    color: "cyan",
    tilt: "0deg",
    notes: "",
    status: "raw",
    statusLabel: "RAW",
    promotedTo: null,
    promotedId: null,
    threadN: 0,
    threadSummary: null,
    weldedToId: null,
    loggedFor: "2026-08-19",
    occurredOn: "2026-08-19",
    entities: {},
    tags: [],
    isBuried: false,
    buriedAt: null,
    createdAt: new Date("2026-08-19T10:00:00Z"),
    updatedAt: new Date("2026-08-19T10:00:00Z"),
    ...partial,
  };
}

describe("getWeekBounds", () => {
  it("computes Monday-Sunday for a mid-week date", () => {
    // Wednesday 2026-08-19
    const bounds = getWeekBounds(new Date("2026-08-19T12:00:00"));
    expect(bounds.weekStart).toBe("2026-08-17"); // Monday
    expect(bounds.weekEnd).toBe("2026-08-23"); // Sunday
  });

  it("treats a Monday as the start of its own week", () => {
    const bounds = getWeekBounds(new Date("2026-08-17T12:00:00"));
    expect(bounds.weekStart).toBe("2026-08-17");
    expect(bounds.weekEnd).toBe("2026-08-23");
  });

  it("treats a Sunday as the end of its own week", () => {
    const bounds = getWeekBounds(new Date("2026-08-23T12:00:00"));
    expect(bounds.weekStart).toBe("2026-08-17");
    expect(bounds.weekEnd).toBe("2026-08-23");
  });

  it("handles a week spanning a month boundary", () => {
    // Wednesday 2026-09-02
    const bounds = getWeekBounds(new Date("2026-09-02T12:00:00"));
    expect(bounds.weekStart).toBe("2026-08-31"); // Monday
    expect(bounds.weekEnd).toBe("2026-09-06"); // Sunday
  });
});

describe("computePostcardData", () => {
  it("tallies scraps by kind and counts total", () => {
    const scraps = [
      mockScrap({ id: "1", kind: "FRAGMENT" }),
      mockScrap({ id: "2", kind: "FRAGMENT" }),
      mockScrap({ id: "3", kind: "QUESTION" }),
    ];
    const data = computePostcardData(scraps);
    expect(data.kindTallies).toEqual({ FRAGMENT: 2, QUESTION: 1 });
    expect(data.totalCount).toBe(3);
  });

  it("counts distinct loggedFor days for daysLogged", () => {
    const scraps = [
      mockScrap({ id: "1", loggedFor: "2026-08-17" }),
      mockScrap({ id: "2", loggedFor: "2026-08-17" }),
      mockScrap({ id: "3", loggedFor: "2026-08-18" }),
    ];
    const data = computePostcardData(scraps);
    expect(data.daysLogged).toBe(2);
  });

  it("returns zeroed data for an empty week", () => {
    const data = computePostcardData([]);
    expect(data.kindTallies).toEqual({});
    expect(data.totalCount).toBe(0);
    expect(data.daysLogged).toBe(0);
    expect(data.highlight).toBeNull();
  });

  it("picks the longest QUOTE scrap as highlight (priority 1)", () => {
    const scraps = [
      mockScrap({ id: "short-quote", kind: "QUOTE", content: "Short." }),
      mockScrap({ id: "long-quote", kind: "QUOTE", content: "A much longer quote worth featuring." }),
      mockScrap({ id: "pinned-fragment", kind: "FRAGMENT", entities: { isPinned: true, pinnedAt: "2026-08-19T00:00:00Z" } }),
    ];
    const data = computePostcardData(scraps);
    expect(data.highlight).toEqual({
      scrapId: "long-quote",
      content: "A much longer quote worth featuring.",
      kind: "QUOTE",
    });
  });

  it("breaks a QUOTE length tie by earliest createdAt", () => {
    const scraps = [
      mockScrap({
        id: "later",
        kind: "QUOTE",
        content: "Same length!",
        createdAt: new Date("2026-08-19T12:00:00Z"),
      }),
      mockScrap({
        id: "earlier",
        kind: "QUOTE",
        content: "Same length!",
        createdAt: new Date("2026-08-18T08:00:00Z"),
      }),
    ];
    const data = computePostcardData(scraps);
    expect(data.highlight?.scrapId).toBe("earlier");
  });

  it("falls back to the most recently pinned scrap (priority 2) when no QUOTE exists", () => {
    const scraps = [
      mockScrap({
        id: "pinned-early",
        kind: "FRAGMENT",
        entities: { isPinned: true, pinnedAt: "2026-08-17T09:00:00Z" },
      }),
      mockScrap({
        id: "pinned-late",
        kind: "IDEA",
        entities: { isPinned: true, pinnedAt: "2026-08-20T09:00:00Z" },
      }),
    ];
    const data = computePostcardData(scraps);
    expect(data.highlight?.scrapId).toBe("pinned-late");
    expect(data.highlight?.kind).toBe("IDEA");
  });

  it("falls back to the highest-threadN scrap (priority 3) when no QUOTE or pinned scrap exists", () => {
    const scraps = [
      mockScrap({ id: "weld-1", kind: "FRAGMENT", threadN: 1 }),
      mockScrap({ id: "weld-3", kind: "IDEA", threadN: 3 }),
    ];
    const data = computePostcardData(scraps);
    expect(data.highlight?.scrapId).toBe("weld-3");
  });

  it("returns no highlight when nothing matches any priority", () => {
    const scraps = [mockScrap({ id: "plain", kind: "FRAGMENT", threadN: 0 })];
    const data = computePostcardData(scraps);
    expect(data.highlight).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/scratch/postcard.test.ts`
Expected: FAIL — `Cannot find module './postcard'`.

- [ ] **Step 3: Implement `src/lib/scratch/postcard.ts`**

```ts
import { ScrapRow, ScrapKind } from "@/db/schema";

export interface WeekBounds {
  weekStart: string;
  weekEnd: string;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday-Sunday bounds for the calendar week containing `date`. */
export function getWeekBounds(date: Date): WeekBounds {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { weekStart: toIso(monday), weekEnd: toIso(sunday) };
}

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

function pickHighlight(weekScraps: ScrapRow[]): PostcardHighlight | null {
  const quotes = weekScraps.filter((s) => s.kind === "QUOTE");
  if (quotes.length > 0) {
    const best = quotes.reduce((a, b) => {
      if (b.content.length !== a.content.length) {
        return b.content.length > a.content.length ? b : a;
      }
      return new Date(b.createdAt) < new Date(a.createdAt) ? b : a;
    });
    return { scrapId: best.id, content: best.content, kind: best.kind };
  }

  const pinned = weekScraps.filter((s) => s.entities?.isPinned && s.entities?.pinnedAt);
  if (pinned.length > 0) {
    const best = pinned.reduce((a, b) =>
      new Date(b.entities!.pinnedAt!) > new Date(a.entities!.pinnedAt!) ? b : a
    );
    return { scrapId: best.id, content: best.content, kind: best.kind };
  }

  const welded = weekScraps.filter((s) => (s.threadN || 0) > 0);
  if (welded.length > 0) {
    const best = welded.reduce((a, b) => ((b.threadN || 0) > (a.threadN || 0) ? b : a));
    return { scrapId: best.id, content: best.content, kind: best.kind };
  }

  return null;
}

/** weekScraps must already be filtered to the target week's loggedFor range and not buried. */
export function computePostcardData(weekScraps: ScrapRow[]): PostcardData {
  const kindTallies: Record<string, number> = {};
  const loggedDays = new Set<string>();

  for (const scrap of weekScraps) {
    kindTallies[scrap.kind] = (kindTallies[scrap.kind] || 0) + 1;
    loggedDays.add(scrap.loggedFor);
  }

  return {
    kindTallies,
    totalCount: weekScraps.length,
    daysLogged: loggedDays.size,
    highlight: pickHighlight(weekScraps),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/scratch/postcard.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scratch/postcard.ts src/lib/scratch/postcard.test.ts
git commit -m "feat: add postcard week-bounds and aggregation helpers"
```

---

### Task 3: Postcard DAL

**Files:**
- Create: `src/lib/dal/postcards.ts`

**Interfaces:**
- Consumes: `db` from `@/db`; `scratchPostcards`, `scraps`, `ScratchPostcardRow`, `NewScratchPostcardRow`, `ScrapRow` from `@/db/schema` (Task 1); `eq`, `and`, `gte`, `lte` from `drizzle-orm`.
- Produces:
  - `getSavedPostcard(userId: string, weekStart: string): Promise<ScratchPostcardRow | null>`
  - `savePostcard(data: NewScratchPostcardRow): Promise<ScratchPostcardRow>`
  - `getWeekScraps(userId: string, weekStart: string, weekEnd: string): Promise<ScrapRow[]>`
  - `getWeekTotal(userId: string, weekStart: string, weekEnd: string): Promise<number>`
  - `getCurrentStreak(userId: string, asOfDate: string, lookbackDays?: number): Promise<number>`
  - All five consumed by the route in Task 4.

- [ ] **Step 1: Implement `src/lib/dal/postcards.ts`**

```ts
import { db } from "@/db";
import { scratchPostcards, scraps, ScratchPostcardRow, NewScratchPostcardRow } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function getSavedPostcard(
  userId: string,
  weekStart: string
): Promise<ScratchPostcardRow | null> {
  const [row] = await db
    .select()
    .from(scratchPostcards)
    .where(and(eq(scratchPostcards.userId, userId), eq(scratchPostcards.weekStart, weekStart)))
    .limit(1);
  return row || null;
}

export async function savePostcard(data: NewScratchPostcardRow): Promise<ScratchPostcardRow> {
  const [created] = await db.insert(scratchPostcards).values(data).returning();
  return created;
}

export async function getWeekScraps(userId: string, weekStart: string, weekEnd: string) {
  return db
    .select()
    .from(scraps)
    .where(
      and(
        eq(scraps.userId, userId),
        eq(scraps.isBuried, false),
        gte(scraps.loggedFor, weekStart),
        lte(scraps.loggedFor, weekEnd)
      )
    );
}

export async function getWeekTotal(
  userId: string,
  weekStart: string,
  weekEnd: string
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scraps)
    .where(
      and(
        eq(scraps.userId, userId),
        eq(scraps.isBuried, false),
        gte(scraps.loggedFor, weekStart),
        lte(scraps.loggedFor, weekEnd)
      )
    );
  return row?.count || 0;
}

/**
 * Consecutive-day streak ending at (or before) asOfDate, capped to
 * lookbackDays of history — 60 matches the horizon getScratchStats's
 * compost logic already treats as meaningful.
 */
export async function getCurrentStreak(
  userId: string,
  asOfDate: string,
  lookbackDays = 60
): Promise<number> {
  const asOf = new Date(asOfDate + "T12:00:00");
  const start = new Date(asOf);
  start.setDate(start.getDate() - lookbackDays);
  const startIso = start.toISOString().slice(0, 10);

  const rows = await db
    .select({ loggedFor: scraps.loggedFor })
    .from(scraps)
    .where(
      and(
        eq(scraps.userId, userId),
        eq(scraps.isBuried, false),
        gte(scraps.loggedFor, startIso),
        lte(scraps.loggedFor, asOfDate)
      )
    )
    .groupBy(scraps.loggedFor);

  const loggedDays = new Set(rows.map((r) => r.loggedFor));

  let streak = 0;
  const cursor = new Date(asOf);
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!loggedDays.has(iso)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dal/postcards.ts
git commit -m "feat: add postcard DAL (saved postcards, week scraps, streak)"
```

No unit tests for this task — matches this codebase's existing convention of not testing `src/lib/dal/*.ts` files (e.g. `dal/scratch.ts` has no test file either).

---

### Task 4: `POST /api/scratch/postcard` — generate-or-fetch

**Files:**
- Create: `src/app/api/scratch/postcard/route.ts`

**Interfaces:**
- Consumes: `requireUserId`, `AuthError` from `@/lib/session`; `getWeekBounds`, `computePostcardData` from `@/lib/scratch/postcard` (Task 2); `getSavedPostcard`, `savePostcard`, `getWeekScraps`, `getWeekTotal`, `getCurrentStreak` from `@/lib/dal/postcards` (Task 3).
- Produces: `POST` handler returning a `ScratchPostcardRow` JSON body — consumed by `ScratchPostcardModal` in Task 6.

**Important — the "current week"'s streak must be computed as of *today*, not as of the (possibly-future) `weekEnd`.** When generating the postcard for the week that's still in progress, `weekEnd` (Sunday) can be a date later than today, and days between today and `weekEnd` have no data yet — computing the streak starting from a future date would immediately see "no activity" and return 0. Cap the streak's `asOfDate` at `min(weekEnd, today)`.

- [ ] **Step 1: Implement `src/app/api/scratch/postcard/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getWeekBounds, computePostcardData } from "@/lib/scratch/postcard";
import {
  getSavedPostcard,
  savePostcard,
  getWeekScraps,
  getWeekTotal,
  getCurrentStreak,
} from "@/lib/dal/postcards";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json().catch(() => ({}));

    const targetDate = body.weekStart ? new Date(body.weekStart + "T12:00:00") : new Date();
    const { weekStart, weekEnd } = getWeekBounds(targetDate);

    const existing = await getSavedPostcard(userId, weekStart);
    if (existing) {
      return NextResponse.json(existing);
    }

    const weekScraps = await getWeekScraps(userId, weekStart, weekEnd);
    const data = computePostcardData(weekScraps);

    const prevTargetDate = new Date(weekStart + "T12:00:00");
    prevTargetDate.setDate(prevTargetDate.getDate() - 7);
    const prevBounds = getWeekBounds(prevTargetDate);
    const previousWeekTotal = await getWeekTotal(userId, prevBounds.weekStart, prevBounds.weekEnd);

    const today = new Date().toISOString().slice(0, 10);
    const streakAsOf = weekEnd < today ? weekEnd : today;
    const currentStreak = await getCurrentStreak(userId, streakAsOf);

    const created = await savePostcard({
      userId,
      weekStart,
      weekEnd,
      kindTallies: data.kindTallies,
      totalCount: data.totalCount,
      daysLogged: data.daysLogged,
      previousWeekTotal,
      currentStreak,
      highlightScrapId: data.highlight?.scrapId || null,
      highlightContent: data.highlight?.content || null,
      highlightKind: data.highlight?.kind || null,
    });

    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/scratch/postcard]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/scratch/postcard/route.ts
git commit -m "feat: add generate-or-fetch route for weekly postcards"
```

No unit tests — matches this codebase's convention of not testing `route.ts` files directly (verified manually in Task 8).

---

### Task 5: `GET /api/scratch/postcard/[weekStart]/image` — PNG export

**Files:**
- Create: `src/app/api/scratch/postcard/[weekStart]/image/route.ts`

**Interfaces:**
- Consumes: `requireUserId`, `AuthError` from `@/lib/session`; `getSavedPostcard` from `@/lib/dal/postcards` (Task 3); `ImageResponse` from `next/og`.
- Produces: a PNG image response, or 404 if the week hasn't been generated yet. Linked to from `ScratchPostcardModal` in Task 6.

- [ ] **Step 1: Implement `src/app/api/scratch/postcard/[weekStart]/image/route.ts`**

```tsx
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getSavedPostcard } from "@/lib/dal/postcards";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ weekStart: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { weekStart } = await params;

    const postcard = await getSavedPostcard(userId, weekStart);
    if (!postcard) {
      return NextResponse.json({ error: "Postcard not generated yet" }, { status: 404 });
    }

    const tallyEntries = Object.entries(postcard.kindTallies as Record<string, number>);

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "#FFFDF7",
            padding: "60px",
            fontFamily: "sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "26px",
              fontWeight: 800,
              background: "#FFE94A",
              color: "#0A0A0A",
              border: "4px solid #0A0A0A",
              padding: "6px 18px",
              width: "fit-content",
              marginBottom: "24px",
            }}
          >
            SCRATCH POSTCARD
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "40px",
              fontWeight: 800,
              color: "#0A0A0A",
              marginBottom: "8px",
            }}
          >
            {postcard.weekStart} – {postcard.weekEnd}
          </div>

          <div style={{ display: "flex", fontSize: "22px", color: "#0A0A0A", marginBottom: "32px" }}>
            {postcard.totalCount} scraps · {postcard.daysLogged}/7 days logged · {postcard.currentStreak}-day streak
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginBottom: "32px" }}>
            {tallyEntries.map(([kind, count]) => (
              <div
                key={kind}
                style={{
                  display: "flex",
                  fontSize: "24px",
                  color: "#0A0A0A",
                  marginBottom: "6px",
                }}
              >
                {kind}: {count}
              </div>
            ))}
          </div>

          {postcard.highlightContent && (
            <div
              style={{
                display: "flex",
                background: "#7C4DFF",
                color: "#FFFFFF",
                padding: "24px",
                fontSize: "26px",
                border: "4px solid #0A0A0A",
              }}
            >
              {postcard.highlightContent}
            </div>
          )}
        </div>
      ),
      { width: 1080, height: 1350 }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/scratch/postcard/:weekStart/image]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/scratch/postcard/[weekStart]/image/route.ts"
git commit -m "feat: add PNG export route for weekly postcards"
```

---

### Task 6: `ScratchPostcardModal` component

**Files:**
- Create: `src/components/scratch/ScratchPostcardModal.tsx`

**Interfaces:**
- Consumes: `playSound` from `@/lib/sound`; `ScratchPostcardRow` from `@/db/schema` (Task 1).
- Produces: `ScratchPostcardModal` React component with props:
  ```ts
  interface ScratchPostcardModalProps {
    isOpen: boolean;
    onClose: () => void;
  }
  ```
  Self-contained: fetches its own data via `POST /api/scratch/postcard` when opened. Consumed by `page.tsx` in Task 7.

- [ ] **Step 1: Implement the component**

Follows the same lightweight-modal pattern as the existing `src/components/scratch/ScratchWeldModal.tsx` (inline-styled fixed overlay, no CSS classes needed):

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { ScratchPostcardRow } from "@/db/schema";
import { playSound } from "@/lib/sound";

interface ScratchPostcardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScratchPostcardModal: React.FC<ScratchPostcardModalProps> = ({ isOpen, onClose }) => {
  const [postcard, setPostcard] = useState<ScratchPostcardRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch("/api/scratch/postcard", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to generate postcard");
        const data: ScratchPostcardRow = await res.json();
        setPostcard(data);
      })
      .catch(() => setError("Failed to generate this week's postcard"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!postcard) return;
    playSound.copy();
    const tallies = Object.entries(postcard.kindTallies as Record<string, number>)
      .map(([kind, count]) => `- ${kind}: ${count}`)
      .join("\n");
    const md = `# Week of ${postcard.weekStart}\n\n${postcard.totalCount} scraps · ${postcard.daysLogged}/7 days logged · ${postcard.currentStreak}-day streak\n\n## This week\n${tallies}\n${
      postcard.highlightContent ? `\n## Highlight\n> ${postcard.highlightContent}\n` : ""
    }`;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(2px)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)",
          border: "var(--b) solid var(--ink)",
          boxShadow: "6px 6px 0 var(--violet)",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "clamp(16px, 4vw, 24px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.16em",
            color: "var(--violet)",
            marginBottom: "8px",
          }}
        >
          📮 THIS WEEK&apos;S POSTCARD
        </div>

        {loading && <div style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>GENERATING...</div>}
        {error && <div style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "var(--pink)" }}>{error}</div>}

        {postcard && (
          <>
            <h2
              style={{
                fontFamily: "var(--display)",
                fontWeight: 800,
                fontSize: "22px",
                margin: "0 0 12px",
                letterSpacing: "-0.02em",
              }}
            >
              {postcard.weekStart} – {postcard.weekEnd}
            </h2>

            <div style={{ fontFamily: "var(--mono)", fontSize: "13px", marginBottom: "16px" }}>
              {postcard.totalCount} scraps · {postcard.daysLogged}/7 days logged · {postcard.currentStreak}-day
              streak
              {postcard.previousWeekTotal > 0 &&
                ` · ${postcard.totalCount >= postcard.previousWeekTotal ? "+" : ""}${
                  postcard.totalCount - postcard.previousWeekTotal
                } vs last week`}
            </div>

            <div style={{ marginBottom: "16px" }}>
              {Object.entries(postcard.kindTallies as Record<string, number>).map(([kind, count]) => (
                <div key={kind} style={{ fontFamily: "var(--mono)", fontSize: "13px", marginBottom: "4px" }}>
                  {kind}: {count}
                </div>
              ))}
            </div>

            {postcard.highlightContent && (
              <div
                style={{
                  background: "var(--shelf)",
                  border: "2px solid var(--ink)",
                  padding: "12px",
                  fontSize: "14px",
                  marginBottom: "18px",
                }}
              >
                {postcard.highlightContent}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  fontSize: "11px",
                  padding: "10px 16px",
                  border: "2px solid var(--ink)",
                  background: "var(--card)",
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {copied ? "COPIED!" : "COPY MD"}
              </button>
              <a
                href={`/api/scratch/postcard/${postcard.weekStart}/image`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 800,
                  fontSize: "11px",
                  padding: "10px 18px",
                  border: "2px solid var(--ink)",
                  background: "var(--violet)",
                  color: "#fff",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                onClick={() => playSound.click()}
              >
                DOWNLOAD IMAGE
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/scratch/ScratchPostcardModal.tsx
git commit -m "feat: add ScratchPostcardModal component"
```

---

### Task 7: Wire the entry point into the Logbook view

**Files:**
- Modify: `src/app/(app)/scratch/page.tsx`

**Interfaces:**
- Consumes: `ScratchPostcardModal` from `@/components/scratch/ScratchPostcardModal` (Task 6).
- Produces: a `postcardModalOpen` state and its toggle, wired to a new button.

- [ ] **Step 1: Add the import**

After the existing `ScratchCorkboard` import (around line 15):

```ts
import { ScratchCorkboard } from "@/components/scratch/ScratchCorkboard";
import { ScratchPostcardModal } from "@/components/scratch/ScratchPostcardModal";
```

- [ ] **Step 2: Add modal-open state**

Near the other modal-state declarations (alongside `isWeldModalOpen`/`seanceScrap`, currently around lines 39-44):

```ts
  // Postcard modal state
  const [isPostcardModalOpen, setIsPostcardModalOpen] = useState(false);
```

- [ ] **Step 3: Add the button in the Logbook view**

In the `logbook on` block (currently starting around line 647 with `<div className="logbook on" id="logbookView">`), add the button right after the opening `<ScratchYearWall .../>` call and before the `<div className="lb">` wrapper:

```tsx
            <div className="logbook on" id="logbookView">
              <ScratchYearWall
                scraps={scraps}
                onSelectDate={(date) => handleFilterChange({ date })}
              />

              <button
                type="button"
                onClick={() => {
                  playSound.click();
                  setIsPostcardModalOpen(true);
                }}
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 800,
                  fontSize: "11px",
                  padding: "10px 18px",
                  border: "var(--b) solid var(--ink)",
                  background: "var(--yellow)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  marginBottom: "18px",
                }}
              >
                📮 THIS WEEK&apos;S POSTCARD
              </button>

              <div className="lb">
```

- [ ] **Step 4: Render the modal**

Near the end of the component, alongside the existing `<ScratchWeldModal .../>` render (find it — it's rendered once near the bottom of the JSX tree, outside the view-mode conditional), add:

```tsx
        <ScratchPostcardModal
          isOpen={isPostcardModalOpen}
          onClose={() => setIsPostcardModalOpen(false)}
        />
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/scratch/page.tsx"
git commit -m "feat: wire postcard modal into the Logbook view"
```

---

### Task 8: Manual browser verification

**Files:** none (verification only)

**Prerequisite:** Task 1's migration must be applied (`npm run db:migrate`, run manually by a human with real database access — flagged in Task 1, not automated by this plan) before any of the following will work end-to-end. If it hasn't been applied, `POST /api/scratch/postcard` will fail with a database error; note this clearly rather than treating it as a code defect.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Sign in and navigate to `/scratch`, switch to LOGBOOK**

- [ ] **Step 3: Click "📮 THIS WEEK'S POSTCARD"**

Expected: modal opens, shows "GENERATING...", then displays this week's tallies, streak, and (if applicable) a highlight quote.

- [ ] **Step 4: Reopen the modal**

Close and reopen it (or reload the page and reopen). Expected: the same data appears instantly (no "GENERATING..." flash) — confirms the generate-or-fetch route returned the saved row rather than recomputing.

- [ ] **Step 5: Click "DOWNLOAD IMAGE"**

Expected: a new tab opens showing a PNG postcard image matching the modal's data.

- [ ] **Step 6: Click "COPY MD"**

Expected: button flashes "COPIED!"; paste somewhere to confirm the clipboard contains a markdown summary matching the modal's data.

- [ ] **Step 7: Check the browser console**

Expected: no errors during any of the above steps.
