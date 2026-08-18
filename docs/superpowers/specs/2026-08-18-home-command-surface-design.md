# Home command surface (option B)

Date: 2026-08-18  
Status: draft for review  
Supersedes, for `/` only: the unmounted newspaper UI in `HOME.md`. The `getHomeEdition` data contract in `HOME.md` §3 stays.

## Goal

`/` is a command surface: one capture field, one lead item the app chooses, three rails (queue / agenda / record), and a day strip. The user can see bookmarks, todos, and TILs at once and jump into any of them. It is not a chart dashboard and not the bookmark library.

## Routes

| Path | Renders |
|---|---|
| `/` | Command surface (this spec) |
| `/library` | Today’s bookmark library (`src/app/page.tsx` moved here, behavior unchanged) |
| `/todos`, `/til`, `/stats`, `/session`, `/settings` | Unchanged except inbound links listed below |

Login still lands on `/`.

### Link rewrites

| Location | Today | After |
|---|---|---|
| TIL header “QUEUE” (`TilHeaderNav`) | `/` | `/library` |
| Session exit (`session/page.tsx` `router.push("/")` and the back control) | `/` | `/library` |
| Stats “BACK TO BOARD” | `/` | `/` (now the command surface — keep) |
| Settings, share, login brand | `/` | `/` |
| Library sidebar HOARD wordmark | (stays on `/library`) | Add a link to `/` labelled HOME so the shelves can reach the command surface |

Do not add a redirect from `/library` back to `/`. Old bookmarks of `/` become the command surface, which is correct.

## Layout

Full width, no library sidebar, house tokens (`--ink`, `--paper`, `--surface`, `--yel`, `--bd`, `--sh`). Order is fixed:

1. **Header** — `HOARD`, local date, nav: Library · Todos · TIL · Stats. One `<h1>`: the lead headline (or the empty-lead sentence). Header wordmark is not an `<h1>`.
2. **Capture** — yellow field, live route preview chips beneath.
3. **Lead** — two columns on wide viewports, stacked on small: story (title, one standfirst line, primary CTA) and rail (time slider, context chips, up-next list, “not this”).
4. **Rails** — three equal columns: THE QUEUE / THE AGENDA / THE RECORD. Giant numeral, sub-line, up to three named entries, “see all →” to `/library`, `/todos`, `/til`.
5. **Day strip** — free minutes, busy block labels, shortfall copy when `unfittedCount > 0`. `aria-label` names free blocks and durations.

Explicitly **not** on this page: giant masthead, ticker, inverted ledger, calibration scatter, TIL heatmap, any chart except the existing 14-day `record.last14` sparkline in the Record rail (optional; omit if it clutters — default **include** as a 14-tick bar row, not a chart library).

## Data

`src/app/page.tsx` is an async Server Component. It calls `getHomeEdition(userId, { minutes: 180, context: "all" })` once and passes the payload into a client island for capture, dial, and skip.

- Unauthenticated: `redirect("/login")`.
- No second `await` in the client for page data. Capture submit and “not this” are the only later network/local writes.
- `GET /api/home` remains for any non-RSC caller; the page does not use it.
- Candidate pool is the **superset**: the RSC calls `getHomeEdition` with `context: "all"` (every kind). Leave `getCandidates`’s server filter as-is. The client then applies `CTX[ctx]` to **bookmarks only**; todos always stay eligible. Dragging the dial or changing context must not refetch.

URL state (source of truth, `router.replace`, same pattern as `/todos`):

- `time` — minutes, 5–180 step 5, default 180 (= “any time”).
- `ctx` — `all` \| `desk` \| `commute` \| `wind`, default `all`.

## Lead scoring

Pure function `src/lib/home/score.ts` — no React, no DB:

```
score = fitScore × urgencyScore × varietyPenalty

fitScore = max(0.1, 1 - |minutes - item.estimatedMinutes| / minutes)
  when time === 180, fitScore = 1 (any time)

urgencyScore =
  overdue todo 3.0
  · due-today todo 2.2
  · rollover ≥ 3 todo 2.0
  · unread bookmark ageDays > 30  1.8
  · else 1.0

varietyPenalty = 0.6 if item.id === lastLedId, else 1.0
```

Tie-break: todo over bookmark, then older `ageDays`.

`lastLedId` is `localStorage["hoard:lastLeadId"]`, written when a lead is shown or skipped. Missing/unreadable storage → penalty 1.0.

**Empty lead:** if the filtered pool is empty, render “Nothing fits this window.” No CTA except the dial. Never invent an item.

**Standfirst:** `src/lib/home/standfirst.ts`. One template per class, chosen by a hash of `item.id` so it is stable. Classes: `overdue-todo`, `due-today`, `moved-repeatedly` (rollover ≥ 3), `old-unread` (bookmark ageDays > 30), `fits` (default). Slots: `{minutes}`, `{rolloverCount}`, `{ageDays}`. No LLM. Do not build the 20-variant newspaper library in this pass.

**CTA**

- Todo lead → `/todos` (the list already contains the item).
- Bookmark lead → `/session?id={bookmarkId}`. `/session` must honour `id` by selecting that unread item when present; if missing/read, keep today’s first-unread behavior.
- “not this” → next-highest score, client-side, updates `lastLedId`.

## Capture

Pure `src/lib/home/routeCapture.ts`. No third parser. No React/DB imports.

Destination rules, first match wins:

1. Trimmed input matches `https?://` or `www.` → **queue**. Kind from `detectKindFromUrl`; chips: kind, host, default mins.
2. Starts with `til` or `learned` (word boundary), or contains `I learned` / `turns out` (case-insensitive) → **record**. Body is the input with a leading `til`/`learned` token stripped. Chips: RECORD, truncated body.
3. Else → **agenda**. Run `parseTodo(input, now, localTz)`. Chips: minutes, energy, due, reminder, tags — same fields the `/todos` composer already shows.

Submit (Enter), optimistic clear, restore input on failure:

| Dest | Request |
|---|---|
| queue | `POST /api/bookmarks` `{ url, ty, src: "Home capture" }` — prepend `https://` if the input was `www.` |
| record | `POST /api/til` `{ type: "FACT", body }` |
| agenda | `POST /api/todos` `{ text }` (server re-parses) |

Fixture `src/lib/home/__fixtures__/route-capture.json` (~30 inputs): all three destinations, `www.` vs `https://`, “plan the Monday standup” as agenda not a date, a URL that looks like a sentence, unicode, empty/whitespace (no destination, do not submit).

`/` focuses capture when focus is not in another field (same as `/todos`).

## Rails

Use payload fields as they already exist:

- Queue: `queue.unread` as numeral, `owedMinutes` as sub, `queue.entries` as names. Empty: “Queue is clear.”
- Agenda: `agenda.open` / `workMinutes`, `agenda.entries`. Empty: “Nothing open.”
- Record: `record.streak` / `monthCount`, `record.entries`, optional `last14` ticks, `recall` under the list if non-null (display only in this pass — rating stays on `/til`). Empty: “No entries yet.”

A numeral of `0` is allowed when the empty sentence is the name. Never show a fabricated rate: `burndownMonths` and `estimateError` are **not** on this page (they belong to `/stats` / ledger, which we are not mounting).

**Day strip:** `day.freeMinutes`, `day.blocks`, `day.unfittedCount` / `day.unfittedMinutes`. Shortfall copy matches todos: *“N tasks (Xh Ym) won’t fit today. Move them now rather than at midnight.”* Clicking the strip goes to `/todos`.

Degraded figures from `getHomeEdition` (`null` / missing streak) render `—` or `UNKNOWN`, never a fake `0` insight.

## Files

| File | Role |
|---|---|
| `src/app/page.tsx` | RSC: auth, `getHomeEdition`, render client island |
| `src/app/library/page.tsx` | Move of today’s library page |
| `src/components/home/HomeCommand.tsx` | Client island: URL filters, score, capture, skip |
| `src/lib/home/score.ts` | Pure scoring |
| `src/lib/home/standfirst.ts` | Pure one-liners |
| `src/lib/home/routeCapture.ts` | Pure destination + preview |
| `src/lib/home/__fixtures__/route-capture.json` | Capture tests |
| `src/lib/home/score.test.ts`, `standfirst.test.ts`, `routeCapture.test.ts` | Unit tests |
| `src/lib/home/queries.ts` | Unchanged. Page always requests `context: "all"`. |
| `src/app/session/page.tsx` | Honour `?id=` |
| `TilHeaderNav`, session back, library sidebar | Link rewrites above |

No new tables. No new API routes.

## Tests

- `score`: overdue todo beats a same-length bookmark; `time=180` ignores fit; variety penalty 0.6; empty pool.
- `standfirst`: same id → same line; every class has ≥1 template.
- `routeCapture`: fixture file, including the false-positive date-in-title case.
- Typecheck / lint / existing tests stay green. No browser e2e required in this pass.

## Out of scope

- Newspaper masthead, ticker, ledger, compactMasthead preference.
- In-place complete todo, push, or recall rating on home.
- Calendar sync, Web Push, roadmaps.
- Changing `/todos`, `/til`, or library view internals beyond the move and links.
- Committing HOME.md’s 20-variant standfirst library.
- Per-rail fetches, `nuqs`, new chart libraries.

## Implementation order

1. Pure `score`, `standfirst`, `routeCapture` + tests (no routing change yet).
2. In one change: move the library to `/library`, rewrite links, mount RSC `/` with header, scored lead, rails, and day strip. `/` must not 404.
3. Capture preview + submit.
4. Session `?id=`, `/` focuses capture, empty and unauthenticated states if not already done in step 2.

Each step must leave the app bootable. The library move and the new `/` always land together.
