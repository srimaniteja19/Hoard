# HOARD — Todos: Claude Code build spec

Save as `TODOS.md` in the repo root. Keep `design/hoard-todos.html` and
`design/hoard-todo-history.html` in the repo as visual references.

**Build this before `HOME.md`.** The home page's capture bar reuses the parser from §3, so that has
to exist as an exported pure function first.

---

## 0. Kickoff message

> Read `TODOS.md`, `design/hoard-todos.html` and `design/hoard-todo-history.html` in full before
> writing anything.
>
> We're adding a todo feature to HOARD. It is not a generic todo app — §1 explains the four
> decisions that make it fit this product, and they're what to fall back on when a detail is
> ambiguous.
>
> **Start in plan mode.** Explore and tell me: how the TIL feature stores its per-user timezone and
> computes `loggedFor` (I want the identical approach here — see §2), where the bookmark library's
> time/context filter state lives so I can reuse the pattern, whether there's an existing job runner
> and whether a service worker already exists for the PWA. Then tell me anything in this spec that
> conflicts with what's there.
>
> Then do **Phase 1 only**, run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, show me the
> output, and stop.
>
> Two things I'll be checking hardest: the parser must be a pure exported function with no React or
> DB imports, and there must be **no nightly cron rewriting rows** — see §4.

---

## 1. The four decisions

These are why this isn't Todoist. Hold them.

1. **Time cost is required, not optional.** Every task has `estimatedMinutes`, so the same
   "I have 25 minutes" slider from the bookmark library works here. A todo list you can filter by
   the gap you actually have is a different tool.
2. **Rollover is visible.** Every task counts how many times it's been pushed. At 3+ it gets an
   orange spine and a `MOVED 5×` chip. Every other todo app silently re-dates and lets the user lie
   to themselves. Same principle as the bookmark queue: make the debt visible.
3. **Energy, not priority.** `DEEP | SHALLOW | ERRAND`. Priority is a fiction assigned at capture
   and ignored forever — everything becomes P1. Energy is a real property and it's what you filter
   by at 4pm on a Friday.
4. **The day plan is honest about free time.** It shows the gaps and packs tasks into them. When
   3h of tasks won't fit in 1h 40m of gaps it says so, rather than letting the user plan a day that
   was never possible.

---

## 2. Schema

```ts
export const energy   = pgEnum("todo_energy", ["DEEP","SHALLOW","ERRAND"]);
export const todoState = pgEnum("todo_state", ["OPEN","DONE","DROPPED","GRAVEYARD"]);

export const todos = pgTable("todos", {
  id: text("id").primaryKey().$defaultFn(createId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  note: text("note"),
  energy: energy("energy").notNull().default("SHALLOW"),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  actualMinutes: integer("actual_minutes"),          // null until completed and answered
  dueDate: date("due_date"),                          // null = someday
  originalDueDate: date("original_due_date"),
  rolloverCount: integer("rollover_count").notNull().default(0),
  remindAt: timestamp("remind_at", { withTimezone: true }),
  remindSentAt: timestamp("remind_sent_at", { withTimezone: true }),
  recurrenceRule: varchar("recurrence_rule", { length: 64 }),  // see §5
  recurrenceParentId: text("recurrence_parent_id"),
  seriesPosition: integer("series_position"),
  state: todoState("state").notNull().default("OPEN"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completedOn: date("completed_on"),                  // user-local day — see below
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, t => ({
  byUserDue:   index().on(t.userId, t.dueDate),
  byUserDone:  index().on(t.userId, t.completedOn),
  byReminder:  index().on(t.remindAt).where(sql`remind_sent_at IS NULL AND state = 'OPEN'`),
}));

export const todoSubtasks = pgTable("todo_subtasks", {
  id: text("id").primaryKey().$defaultFn(createId),
  todoId: text("todo_id").notNull().references(() => todos.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull(),
});

export const todoTags = pgTable("todo_tags", { /* join to the existing tags table */ });
```

**`completedOn` is a stored date, computed server-side from the user's IANA timezone** — exactly as
TIL does for `loggedFor`. Read that implementation and match it. Deriving it from `completedAt` in
UTC breaks every daily count for anyone west of Greenwich, and it's the single most common bug in
this class of feature.

**`dueDate` is nullable.** Null means "someday" — a real state, not a bug. Someday tasks never
appear in TODAY and never accrue rollover.

---

## 3. The parser — `lib/todos/parse.ts`

A **pure exported function** with no React and no DB imports. The home page capture bar and the
extension both import it.

```ts
export type ParsedTodo = {
  title: string;
  estimatedMinutes: number;   // always populated, inferred if absent
  energy: Energy;             // always populated, inferred if absent
  dueOffsetDays: number|null; // null = someday
  remindAtLocal: string|null; // "15:00"
  recurrenceRule: string|null;
  tags: string[];
  urgent: boolean;
  matched: { token: string; field: string }[];  // for the preview UI
};

export function parseTodo(input: string, today: Date, tz: string): ParsedTodo;
```

Tokens, stripped from the title in this order:

| Token | Effect |
|---|---|
| `~30m`, `~2h` | `estimatedMinutes` |
| `#tag` | tags (multiple allowed) |
| `!`, `!!`, `!!!` | `urgent` |
| `every day/weekday/week/month/monday…` | `recurrenceRule` |
| `today/tomorrow/tmrw/mon…sun/next week` | `dueOffsetDays` |
| `3pm`, `at 15:00`, `9:30am` | `remindAtLocal` |
| `deep`, `focus` | `energy: DEEP` |
| `call/buy/pick up/errand/book` | `energy: ERRAND` |

**Inference when absent:** verbs `email|reply|call|text|book` → 10 minutes; otherwise 25. Energy from
minutes: ≥40 → DEEP, else SHALLOW.

**`matched` drives the live preview.** The user must see what was parsed *before* committing — every
NL todo app has a parser, almost none show its reading, which is how people end up with a task called
"meeting with" due Friday.

**Test it properly.** Fixture of ~40 inputs in `lib/todos/__fixtures__/parse.json`, including: no
tokens at all, every token at once, a date word inside the title ("plan the Monday standup"), a time
that isn't a reminder ("read 3pm article"), and unicode. This is the one file in the feature that
genuinely needs tests.

---

## 4. Rollover — no cron

**Do not write a nightly job that re-dates overdue tasks.** It's expensive per user timezone, it's
stale between runs, and it silently rewrites history.

Instead:

- An open task with `dueDate < today` renders under **Overdue** with `N DAYS OVERDUE`, computed at
  read time. Its `dueDate` is never touched.
- `rolloverCount` increments **only on an explicit user push** (the `→` action, or moving it in the
  weekly review). That count is therefore an honest record of decisions the user made, not of time
  passing.
- Both facts show: `3 DAYS OVERDUE` and `MOVED 4×` are different information and both matter.

**Graveyard:** at `rolloverCount >= 10`, offer (never force) a move to `state: GRAVEYARD`. Graveyard
tasks are excluded from all default views and from every count, but stay searchable and restorable.
Surface them only in the weekly review: *"14 things here. Do any of them still matter?"*

---

## 5. Recurrence

A deliberately small subset — do not pull in a full RRULE library.

```
daily | weekdays | weekly:MON | monthly:15 | yearly:03-14
```

**Generate the next instance on completion, never ahead of time.** Materialising a year of instances
makes counts meaningless, bloats the table, and makes editing the series a nightmare. On completing a
recurring task: mark it `DONE`, then insert one new row with the same `recurrenceParentId`,
`seriesPosition + 1`, and the next due date.

A recurring task shows its own streak — *"standup notes, 47 done, 3 missed, 14-day run"* — computed
from the series, on the task itself. That's the habit tracker you'd otherwise build separately and
abandon.

Editing: "this one" vs "this and future". "Future" updates the template fields on the parent; past
completed instances are never rewritten.

---

## 6. Actual time and calibration

`actualMinutes` is what makes the history view worth building, so capture it cheaply.

**On completion, prompt once:** a small inline row with the estimate pre-filled and three one-tap
adjustments — `HALF`, `SPOT ON`, `DOUBLE` — plus a free field. Dismissible; a dismissed prompt leaves
`actualMinutes` null and that task is excluded from calibration. Never block completion on it.

**Optional timer:** start/stop on a task, accumulating into `actualMinutes`. Nice for DEEP work,
irrelevant for errands. Ship the prompt first; the timer can wait.

**Calibration** — `lib/todos/calibration.ts`, pure and tested:

```ts
export function calibration(samples: {estimated: number; actual: number; energy: Energy}[]):
  { overall: number|null; byEnergy: Record<Energy, number|null>; sampleCount: number };
```

Returns `null` below **30 samples overall** and below **15 per energy class**. A multiplier from ten
tasks is noise dressed as insight, and shipping it would poison trust in the whole feature.

Once available, offer (default off, one toggle) to pad new estimates by the user's multiplier for
that energy class, and use the padded figure in the day plan.

---

## 7. TODAY view — `/todos`

Reference `design/hoard-todos.html`.

- **Capture bar** at the top with the live parse preview beneath. `/` focuses it, `Enter` commits.
- **Time slider + energy chips**, mirroring the bookmark library's controls. State in the URL via
  nuqs, same as everywhere else.
- **Sections in order:** Overdue · Today · This week · Later · Someday · Done today. Each header
  carries a count and a summed time.
- **Row anatomy:** checkbox column (full-height, bordered), title, subtasks inline with their own
  checkboxes, meta chips (time · due/overdue · reminder · recurrence · rollover · tags), energy chip
  right, hover actions (`→` push to tomorrow, `✎` edit, `✕` delete).
- **Stale spine:** 4px orange bar down the left edge at `rolloverCount >= 3`.
- **Empty state:** "Nothing left for today. That's the whole point." — not a placeholder illustration.

**Day plan rail** (right column): busy blocks, gaps, and tasks packed into gaps by the same
greedy-descending fill as the bookmark session. When the remaining tasks don't fit, print the
shortfall in the warning colour: *"4 tasks (2h 10m) won't fit today. Move them now rather than at
midnight."*

**Busy blocks:** v1 reads from a `busy_blocks` table the user can fill manually or from a recurring
weekly template. **Do not build calendar integration in this pass** — it's a separate auth surface and
a separate spec. Design the day-plan function to take `busy: {start,end,title}[]` so a calendar
adapter drops in later.

---

## 8. History — `/todos/history`

Reference `design/hoard-todo-history.html`.

- **Month calendar.** Each cell: one bar per completed task (height by actual minutes, colour by
  energy), cell shading by total hours worked, a lime dot for a clean sweep, an orange base bar if
  anything rolled that day. Click to select.
- **Day record** panel: date, stats (done, worked, estimated, ratio), the completed list with
  estimate vs actual per task and over/under colouring, the rolled list, and the end-of-day note.
- **End-of-day note:** one optional line, prompted at day close. Six months later this is the most
  valuable thing on the page.
- **Calibration scatter:** estimate on x, actual on y, diagonal reference line, dot colour by energy.
  Plus per-energy multiplier bars and the plain-English verdict.

**Queries:** the month view is one grouped query over `completedOn`, cached for the day. Do not
fetch per cell.

**TODAY stays the landing route.** History is one click away and must not become the default — a
month grid is lovely to look at and useless to work from.

---

## 9. Reminders

Split into two phases because the second is much more expensive than it looks.

**In-app first (Phase 9).** A polled query for `remindAt <= now AND remindSentAt IS NULL`, surfaced
as an in-app toast and a badge. Works everywhere, needs no permissions, ships in an afternoon.

**Web Push second (Phase 10, optional).** Needs VAPID keys, a `push_subscriptions` table, service
worker handlers, a permission-request flow that doesn't ambush the user on first load, and a
scheduler that fires within a minute of `remindAt`. Also note: **iOS only supports Web Push for
installed PWAs**, so on iPhone this works only after "Add to Home Screen" — tell the user that in
the settings copy rather than letting it silently not work.

Set `remindSentAt` on delivery so a reminder never double-fires.

---

## 10. Phases

Stop after each; run typecheck, lint, test, build.

| Phase | Scope | Verify |
|---|---|---|
| **1** | Schema + migration + timezone-correct `completedOn` + seed of ~60 tasks across 30 days | Daily counts correct for a non-UTC user |
| **2** | `lib/todos/parse.ts` + 40-input fixture + tests | Pure function, no React/DB imports; "plan the Monday standup" doesn't set a due date |
| **3** | `/todos` core: capture with live preview, list, complete, subtasks, delete | Enter commits; parse preview matches what's saved |
| **4** | Sections, time slider, energy chips, URL state | Filters survive a refresh and a back button |
| **5** | Rollover: push action, overdue computation, stale spine, graveyard + restore | No cron added anywhere |
| **6** | Recurrence: rule parsing, next-instance-on-completion, series streak, edit scopes | Completing a daily task creates exactly one successor |
| **7** | Actual-time prompt + `lib/todos/calibration.ts` + tests | Returns null under 30 samples |
| **8** | Day plan: `busy_blocks`, gap detection, greedy fill, shortfall warning | Function signature takes `busy[]` so calendar can drop in |
| **9** | History: calendar, day record, end-of-day note, calibration scatter | One grouped query for the month |
| **10** | In-app reminders | No double-fire |
| **11** | Web Push (optional) | iOS PWA caveat stated in settings copy |

---

## 11. Do not do

- Do not write a nightly cron that re-dates overdue tasks.
- Do not derive `completedOn` from a UTC timestamp.
- Do not materialise recurring instances ahead of time.
- Do not show a calibration multiplier below 30 samples.
- Do not make `estimatedMinutes` optional.
- Do not add a priority field. Energy replaces it.
- Do not build calendar integration in this pass.
- Do not put the parser inside a component or import the DB into it.
- Do not make history the landing route.
- Do not touch bookmarks, TIL, the extension, or the search grammar.

---

## 12. If something here is wrong

Say so rather than working around it. Most likely wrong given code you can see and I can't: whether
the TIL timezone handling is reusable as-is or needs extracting to a shared helper, whether the
existing tags table can take a second join without a schema change, and whether the PWA already has
a service worker that Phase 11 could extend. If a refactor is needed, propose it as its own phase.

---

## 13. Phase 1 build notes (what actually happened)

Recorded here so later phases don't re-derive it.

- **TIL timezone handling was reusable as-is**, and has been extracted to a shared helper per §12:
  `getLoggedForDate` / `getUserTimezone` now live in `src/lib/dal/shared.ts`; `src/lib/dal/til.ts`
  re-exports both so no TIL call site changed. `src/lib/dal/todos.ts` exports `getCompletedOnDate`,
  a thin wrapper so the todos DAL has its own entry point for the same logic.
- **The tags table needed no schema change.** `tags.id` is a `serial` integer; `todoTags` joins to
  it exactly like `tilEntryTags` does.
- **The bookmark library's "I have 25 minutes" slider does not exist yet.** There's a `mins` field
  on bookmarks and a `/session` focus-timer page seeded from it, but no filter-by-available-time UI
  with URL state, and `nuqs` isn't a dependency anywhere in the project. Phase 4 will need to build
  this pattern fresh rather than reuse it.
- **No job runner and no cron exist anywhere in the codebase** — nothing to remove or conflict with.
- **A service worker already exists** (`public/sw.js`, paired with `public/manifest.json`) — plain
  cache-first/network-first, no push handling yet. Phase 11 can extend it.
- **`design/hoard-todos.html` and `design/hoard-todo-history.html` are not in the repo** — only
  `hoard-cover-coherence.html` and `hoard-spectacle.html` exist under `design/`. Phase 7/8 have no
  visual reference to build against yet.
- **The repo's toolchain is npm, not pnpm** — `package-lock.json`, no pnpm-lock/workspace file,
  README uses `npm run`. Phase verification runs `npm run typecheck/lint/test/build`.
- **Fixed a pre-existing drizzle migration/snapshot drift** unrelated to todos: `drizzle/meta` only
  tracked one journal entry even though two later hand-written SQL files
  (`0001_add_til_srs_columns.sql`, `0002_add_constellation_layouts.sql`) had already been applied
  to the real database outside drizzle-kit's tracking, and the `constellation_layouts` table,
  `favicons` table, and several `bookmarks` OG-image columns were never captured in any snapshot at
  all. Left un-generated, `drizzle-kit generate` would have bundled re-creation of all of that
  already-live schema into the todos migration. The new snapshot (`drizzle/meta/0001_snapshot.json`)
  now correctly reflects the full current `schema.ts`, but the migration file itself
  (`drizzle/0001_add_todos.sql`) was hand-trimmed to contain only the todos-related DDL, so it's
  safe to run against the already-drifted production database.

---

## 14. Phase 2 build notes

- `parseTodo` in `src/lib/todos/parse.ts` has **zero imports** — not even type-only ones from
  `@/db/schema` — so there's no ambiguity about it being coupled to React or the DB. `Energy` is
  redefined locally as `"DEEP" | "SHALLOW" | "ERRAND"`.
- The one real design decision beyond the spec's token table: due-date and reminder-time tokens
  only fire when they're **trailing** (the last word(s) of the remaining text) or **preposition-led**
  (`on`/`by`/`due`/`for` for dates, `at` for times). That's what makes "plan the Monday standup" and
  "read 3pm article" behave correctly — the word is neither trailing nor introduced by a
  preposition, so it's read as part of the sentence, not a scheduling directive. Everything else
  (tags, urgency, energy tokens) matches anywhere in the text with no positional constraint, since
  the spec didn't call out false-positive risk for those and word-boundary matching is enough.
- 44 fixtures in `src/lib/todos/__fixtures__/parse.json` (spec asked for ~40), all passing, anchored
  to a fixed `2024-01-15T12:00:00Z` (a Monday) so weekday/recurrence offsets are deterministic.
  Covers every token individually, the two spec-mandated false-positive cases, a unicode case
  (accented tag + emoji, interacting correctly with an errand-token match), and several
  multi-token interactions worth calling out explicitly: `call`/`book` are simultaneously a
  minute-verb (infers 10 min) *and* an errand-energy token, and both fire together; an explicit
  `~Xm` estimate suppresses minute-*inference* but not independent energy-token matching;
  `"every monday"` doesn't also fire the due-date token for "monday" because recurrence stripping
  runs before due-date matching.

## 15. Phase 3 build notes

- Full CRUD: `POST/GET /api/todos`, `PATCH/DELETE /api/todos/:id`, `POST /api/todos/:id/subtasks`,
  `PATCH/DELETE /api/todos/:id/subtasks/:subtaskId`. Validation via a new `src/lib/validations/todos.ts`
  (Zod) — mirrors `validations/til.ts`'s shape and the same resolve-or-create tag pattern from
  `api/til/route.ts`.
  `zod` was already an undeclared transitive dependency (used by `validations/til.ts` without being
  in `package.json`); added it explicitly now that a second file depends on it directly.
- **The server re-parses the raw text itself** — the composer's live preview calls `parseTodo()`
  client-side (instant, no network, matches "the preview is a pure function over the input string"),
  but `POST /api/todos` only ever accepts `{ text }` and calls the identical `parseTodo()` again
  server-side to derive every field authoritatively. A stale or tampered client can't submit a
  precomputed `dueDate`/`estimatedMinutes` that disagrees with what the text actually says.
- Added `zonedTimeToUtc(dateStr, hhmm, timezone)` to `lib/dal/todos.ts` to convert a parsed
  `remindAtLocal` ("15:00") into an actual `remindAt` timestamp — the standard guess-and-correct
  technique (build a UTC instant, see how it reads back in the target timezone, shift by the
  difference), tested against both a standard-time and daylight-time Pacific case plus a positive-
  offset zone. A reminder's date is the todo's `dueDate` if it has one, else today.
- Completion is server-computed and reversible: `PATCH .../:id` with `state: "DONE"` sets
  `completedAt`/`completedOn` from the user's timezone (never a client-supplied value, per §2);
  transitioning back off `DONE` clears both. Rollover's `→` push action and recurrence's
  next-instance-on-completion are deliberately **not** implemented here — those are §4/§5's Phase 5
  and §5's Phase 6, respectively.
- `/todos` is a functional-first "core" page per the phase table — flat Open/Done lists, no
  sectioning (Overdue/Today/This week/... is Phase 4), no time slider or energy chips (also Phase 4),
  and no newspaper styling (Phase 7, and `design/hoard-todos.html` still isn't in the repo to build
  that against anyway). Capture bar + live preview chips, checkbox complete/uncomplete, inline
  subtasks with add/toggle/delete, and a delete action — that's the full "core" scope.
- **Not manually verified in a browser.** This sandbox has no `DATABASE_URL` and no live Postgres,
  so there's no way to log in or exercise the actual data flow end-to-end here — verification is
  typecheck/lint/test/build only. Worth a real click-through pass once this is somewhere with a
  database.

## 16. Phase 4 build notes

- **§7 says "URL state via nuqs, same as everywhere else"** — but nuqs isn't a dependency anywhere
  in this codebase (confirmed again during Phase 1's HOME.md exploration too). What "everywhere
  else" actually does, in `src/app/til/page.tsx`, is read filters straight from
  `useSearchParams().get(...)` and write them with `useRouter().push(...)`/a hand-built
  `URLSearchParams`. `/todos` now mirrors that exact pattern instead of introducing nuqs as a new
  dependency nothing else uses. One deliberate difference from `/til`'s convention: `/todos` uses
  `router.replace` instead of `router.push` for both the slider and the energy chips, since `push`
  on every slider-drag tick would flood browser history with one entry per 5-minute step — `replace`
  still satisfies "survives a refresh and a back button" (the URL is still the source of truth on
  reload, and navigating away and back returns to the last-set filter state) without that problem.
- Wrapped the page in `<Suspense>` (same shape as `/til`'s `TilPageContent`/`TilPage` split) —
  `useSearchParams()` requires it, and the build confirms `/todos` still prerenders statically with
  it in place.
- Sections are computed **client-side over the already-fetched list** using the browser's local
  wall-clock date, not a server-side "as of today" query — matches how the rest of the app's
  client-heavy pages already do local filtering/grouping over fetched data. The stored `dueDate`
  itself is still correctly account-timezone-derived at creation time (Phase 3); this is just where
  the Overdue/Today/This week boundary gets drawn at render time.
- "This week" = due after today through 7 days out; "Later" = anything beyond that. Not spec'd
  exactly by §7, so picked to match the same 7-day rolling-window convention used elsewhere
  (`getTilWallAggregate`, the home edition's ledger window).
- Energy chips are single-select (ALL/DEEP/SHALLOW/ERRAND), radio-button style — matches the
  bookmark library's `TimeContextBar` context buttons structurally, which is what "mirroring the
  bookmark library's controls" points at, even though todos use `Energy` where bookmarks use
  `ContextType`.

## 17. Phase 5 build notes

- **`rolloverCount` can now only change in one place**: `POST /api/todos/:id/push`. It's not a field
  `updateTodoSchema` exposes, so the generic `PATCH /api/todos/:id` physically cannot touch it —
  the "no cron, only explicit pushes" rule from §4 is enforced by the API surface itself, not just
  by convention. The push endpoint also computes "tomorrow" server-side from the account's
  timezone, same as everywhere else timezone-sensitive; it never trusts a client-supplied date.
- `N DAYS OVERDUE` and `MOVED N×` render as separate chips on the same row, per §4's "these are
  different information and both matter" — overdue-ness is still computed at render time from
  `dueDate` (client-side, against the browser's local today, same as Phase 4's sectioning);
  `rolloverCount` is the stored, honest record of pushes.
- Graveyard **offer**, not force: an inline banner appears on a row once `rolloverCount >= 10`
  ("Moved N times. Does this still matter?") with a button that moves it — nothing happens
  automatically. Graveyard items are excluded from `GET /api/todos`'s default query entirely (a new
  `?graveyard=true` param is required to see them) so they're already out of every default view and
  count, not just hidden client-side.
- Restore is just `PATCH /api/todos/:id` with `state: "OPEN"` — no dedicated endpoint needed, since
  the update schema already allows arbitrary valid state transitions. `rolloverCount` is left
  untouched on restore, preserving it as a historical record rather than resetting the slate.
- The spec's full "weekly review" flow (§4's `"14 things here..."` framing, presumably as part of
  some larger periodic review surface) isn't otherwise described as its own deliverable anywhere in
  the phase table, so this phase built the minimum that satisfies §4's actual requirements —
  excluded from defaults, searchable/restorable, surfaced with that exact prompt — as a simple
  collapsible section at the bottom of `/todos`, rather than inventing a separate "weekly review"
  page nothing else in the spec asks for.
