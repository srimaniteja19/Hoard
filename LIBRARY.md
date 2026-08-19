# HOARD — Reference Library: Usage, Retrieval & Ledger

Save as `LIBRARY.md` in the repo root. Keep `design/hoard-library-directions.html` in the repo —
tabs 01, 05, and 06 are the visual reference; ignore 02/03/04.

This is a **reframe**, not an addition: bookmarks stop being a read-later queue and become a
reference library you never delete from. Read this fully before touching the existing bookmark
schema or views — several existing fields change meaning.

---

## 0. Kickoff message

> Read `LIBRARY.md` and tabs 01/05/06 of `design/hoard-library-directions.html` before writing
> anything.
>
> HOARD's bookmark feature is being reframed from a read-later queue to a reference library. We're
> building three pieces together: usage tracking and usage-sorted views, ⌘K retrieval ranked by use,
> and a reworked home-page Ledger. We are **not** building rot detection, notes-forward cards, or
> situation shelves in this pass — see §6 for what's deliberately out.
>
> **Start in plan mode.** Explore first and tell me: how `readState` (or its equivalent) is currently
> modeled and everywhere it's read, where the time/context filter state lives on the library view,
> whether full-text search already exists over archived bodies, and how the home page Ledger
> currently queries bookmark data. This touches existing code more than it adds new code — I want
> to see the blast radius before we start.
>
> Then do **Phase 1 only**, run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, show me the
> output, and stop.
>
> The thing I most want you to get right: **`useCount` and `lastUsedAt` must update from every real
> surface an item can be opened from** — web app, extension, and a TIL discharge/citation — or the
> whole feature reports wrong numbers forever. See §2.

---

## 1. What's changing and why

A queue's success state is the item leaving. A library's success state is the item being **returned
to** — an item opened forty times is the best item, not the most overdue one. That inverts sevs:

| Was (queue) | Becomes (library) |
|---|---|
| `UNREAD` count | `NEVER OPENED` count — same shape, opposite meaning |
| Sort by `createdAt` | Sort by `useCount` / `lastUsedAt` |
| "Discharge" removes it from view | Opening it *raises* its rank |
| Debt-style Ledger (took on vs cleared) | Usage-style Ledger (saved vs used vs stale) |

**`itemType` decides which model an item follows.** Add it now even though rot detection (Health) is
out of scope this pass — retrofitting a type column after data exists is worse than shipping it
unused for a phase.

```ts
export const itemType = pgEnum("bookmark_item_type", ["REFERENCE", "QUEUED"]);
// added to bookmarks
itemType: itemType("item_type").notNull().default("REFERENCE"),
```

**Default is `REFERENCE`.** Migration heuristic for existing rows: `kind IN ('REPO','DOC','APP')` →
`REFERENCE`; `kind IN ('ARTICLE','VIDEO','PAPER')` → `QUEUED`; `PLAYLIST` → `REFERENCE`. Surface a
one-time bulk-fix screen after migration ("we guessed — correct any that are wrong") rather than
trusting the heuristic silently.

**Existing time/context filters and the queue-style unread count stay, scoped to `itemType = QUEUED`
only.** They're genuinely right for that subset and wrong for reference items. Don't delete them,
don't apply them to reference items.

---

## 2. Usage tracking — the foundation everything else depends on

```ts
// added to bookmarks
useCount:   integer("use_count").notNull().default(0),
lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

// index for the sort this whole feature exists to do
byUserUsage: index().on(t.userId, t.useCount.desc()),
byUserLastUsed: index().on(t.userId, t.lastUsedAt.desc()),
```

**A "use" is any of:**

1. Clicking through to the source URL from any HOARD surface (web, extension popup).
2. Copying a snippet's code (if the snippet item type exists in this schema already — if not,
   skip; that's from the notes-forward direction we're not building).
3. A TIL entry citing this bookmark via `dischargesBookmarkId` schema from
   `TIL-SPEC.md`).
4. Opening the item's inspector panel and dwelling >3s — **only if trivially available; do not
   build dwell tracking from scratch for this.** Skip if it needs new client instrumentation.

**Increment via a single server-side helper**, never inline in multiple places:

```ts
// lib/library/record-use.ts
export async function recordUse(bookmarkId: string, userId: string): Promise<void> {
  await db.update(bookmarks)
    .set({ useCount: sql`${bookmarks.useCount} + 1`, lastUsedAt: new Date() })
    .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
}
```

Call this from: the "open" action in every view, the extension's open handler, and the TIL discharge
Server Action. **Audit every existing "open a bookmark" code path in Phase 1** and list them in your
plan — a use path that doesn't call `recordUse` silently under-counts forever and nobody will notice
until the numbers look wrong months later.

**Debounce rapid re-opens.** If the same bookmark is opened twice within 60 seconds (tab restore,
double-click), count it once. Track a `lastRecordedUseAt` in memory/cache, not a DB round trip per
check.

---

## 3. Usage-sorted views

Reference tab 01.

- Add **sort: Most used / Recently used / Recently saved** to the existing view controls, alongside
  the current view switcher (Masonry/Grid/List/Headlines). Persist in the URL like every other
  filter.
- Add a **"Never opened"** system filter — `useCount = 0`, scoped to `itemType = REFERENCE`
  (queued items being unread is expected and not a problem; the whole point of the reframe is that
  reference items being unopened is the honest anomaly).
- **Never-opened items get a left-edge accent** (orange, 3-4px), not a scolding badge. Tab 01's
  `.u-never` class is the reference — it's informational, not a nag.
- The usage figure (`41×`) and recency (`2h ago`) render together on every row/card — one without
  the other is half the story.

**Query:** the list query needs `ORDER BY use_count DESC` or `ORDER B_at DESC NULLS
LAST` depending on sort mode, using the indexes from §2. Verify with `EXPLAIN ANALYZE` that it's
using the index, not sorting the full table.

---

## 4. ⌘K retrieval

Reference tab 05.

- Global command palette, reachable via `⌘K`/`Ctrl+K` from anywhere in the app (already likely
  exists for search — extend it, don't build a second one if so; check in the plan phase).
- **Full-text search over archived body text**, not just titles. If archived text isn't already
  indexed for search, add a Postgres `tsvector` generated column on the archived-text table with a
  GIN index. This is the single most valuable addition in this section — remembering a phrase from
  inside a doc is far more common than remembering its title.
- **Results rank by a blend of text-match relevance and `useCount`**, not relevance alone — your
  most-consulted references should win ties against something saved once and forgotten:

  ```sql
  ORDER BY ts_rank(search_vector, query) * (1 + ln(use_count + 1)) DESC
  ```

  The `ln` damping keeps a single obsessively-reused item from permanently burying good matches on
  a rare-but-relevant search.
- Every result row shows the **use count directly in the result**, in the accent colour, so ranking
  is visibly explained — tab 05's `k-uses` treatment. Don't hide the reasoning.
- Opening a result from the palette calls `recordUse` like any other open path.
- **Extension:** the same command palette, or at minimum a lightweight version, reachable from the
  popup. Reuse the same search endpoint — do not build a second search implementation for the
  extension.

---

## 5. Home Ledger rework

Reference tab 06. This replaces the existing "took on vs cleared" beam on the home page (from
`HOME.md`, if that's built — if not yet built, this is what the Ledger section should be when it is).

```ts
export async function getLibraryLedger(userId: string, days = 30): Promise<{
  savedCount: number;
  useEvents: number;          // sum of use events in the window, not total useCount
  staleCount: number;         // see below
  totalItems: number;
  neverOpenedCount: number;
  topSource: { title: string; useCount: number } | null;
}>
```

- **`staleCount`** for this pass is the cheap version only: `itemType = REFERENCE AND useCount = 0
  AND createdAt < now() - interval '60 days'`. This is a boolean heuristic, not the dead-link/
  archived-repo/content-drift detection from the Health direction — that's explicitly out of scope
  (§6). Name the field the same either way so Health can slot in later without a rename.
- **Beam segments:** `SAVED {n}` (cyan) · `USED {n}×` (lime) · `STALE {n}` (pink). Proportional
  widths from the three counts, same visual mechanic as the existing beam component if one exists
  from `HOME.md`.
- **Verdict sentence**, generated from real numbers, never hardcoded:
  `"{topSource.title} is your most-returned-to reference this month at {topSource.useCount} uses.
  {staleCount} items have gone stale since you saved them."`
  Handle the zero cases: no top source yet, zero stale. Don't render a verdict that references a
  count of zero as if it were noteworthy — skip that clause entirely rather than saying "0 items
  have gone stale," which reads as filler.
- This is a **single aggregate query**, cached daily per user, invalidated on any bookmark write or
  `recordUse` call — same caching pattern as the rest of the home page if `HOME.md` is already
  built.

---

## 6. Explicitly out of scope this pass

Named so they aren't silently expected and aren't accidentally half-built:

- **Rot detection** (dead links, archived-repo flags, content-drift diffing) — tab 02. The
  `staleCount` heuristic in §5 stands in for it. Do not build the diff engine or the dead-link
  checker now.
- **Notes-forward cards / snippet item type** — tab 03.
- **Situation shelves / saved-search collections** — tab 04.

If any of these come up mid-build because they'd be trivial given what's already there, flag it and
stop rather than building it — scope creep here is exactly how a three-part spec becomes a six-part
one silently.

---

## 7. Phases

Stop after each; run typecheck, lint, test, build.

| Phase | Scope | Verify |
|---|---|---|
| **1** | `itemType` + `useCount` + `lastUsedAt` columns, migration with heuristic backfill, bulk-fix screen, indexes | Migration is reversible; bulk-fix screen shows correct guesses on real data |
| **2** | `recordUse()` + audit and wire every existing open path (web, extension, TIL discharge) + debounce | Every open path listed in the phase-1 plan now calls it; double-open within 60s counts once |
| **3** | Usage sort modes + "Never opened" filter + left-edge accent + URL state | `EXPLAIN ANALYZE` confirms index usage on both sort modes |
| **4** | Search-vector column on archived text + GIN index + ranking query | A body-text phrase search returns the right item above a title-only match with lower use count |
| **5** | ⌘K palette wired to the ranked search, use-count shown per result, extension search reuse | No second search implementation created |
| **6** | `getLibraryLedger()` + beam + verdict sentence + zero-case handling + caching | Verdict never mentions a zero count as noteworthy |
| **7** | Time/context filters scoped to `itemType = QUEUED` only; confirm reference items are excluded | A reference-type item never appears when filtering "I have 15 minutes" |

---

## 8. Do not do

- Do not increment `useCount` from a client component — always through `recordUse()` server-side.
- Do not build rot detection, snippet cards, or situation shelves in this pass (§6).
- Do not apply time/context filters to `REFERENCE` items.
- Do not build a second search index or a second command palette if one already exists — extend it.
- Do not hardcode the verdict sentence or render a zero-count clause as if it were news.
- Do not silently drop the existing debt-style Ledger — it still applies to `QUEUED` items if you
  want to keep both framings visible; confirm with me before removing it outright rather than
  assuming.
- Do not touch TIL views, the roadmap generator, the extension's capture flow, or the search
  grammar's existing operators.

---

## 9. If something here is wrong

Say so. Likely candidates given code you can see and I can't: whether search already exists and
this is an extension rather than a build, whether the existing Ledger component can be re-themed
for the new beam or needs rebuilding, and whether `itemType` should live on `bookmarks` directly or
warrants its own lookup given how kind/type modeling already works in the schema. If a refactor is
needed, propose it as its own phase before starting.
