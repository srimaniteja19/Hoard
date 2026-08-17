# HOARD — Home: The Daily Edition

Save as `HOME.md` in the repo root. Keep `design/hoard-home-edition.html` in the repo as the visual
reference — Claude Code can read it directly.

This replaces whatever `/` currently renders. Scope is bookmarks, todos, and TIL. Roadmaps are out.

---

## 0. Kickoff message

> Read `HOME.md` and `design/hoard-home-edition.html` in full before writing anything.
>
> We're rebuilding the home page as a "daily edition" — a newspaper front page composed from the
> user's own bookmarks, todos and TIL entries. It is not a dashboard; the structural rules in §1
> are what make it work, so read them before the component list.
>
> **Start in plan mode.** Explore and tell me: what `/` currently renders, whether there's an
> existing aggregate/stats query layer I should extend rather than duplicate, how the theme tokens
> are structured, whether Archivo is already loaded or needs adding, and where the time/context
> filter state currently lives for the bookmark library (I want to reuse that, not fork it).
>
> Then do **Phase 1 only**, run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, show me the
> output, and stop.
>
> The one thing that will make or break this: **the whole page must render from a single round trip.**
> See §3. If you find yourself writing a second `await` in a component, stop and tell me.

---

## 1. The rules that make it a newspaper and not a dashboard

Hold these when any detail is ambiguous:

1. **One lead story.** Exactly one item gets headline treatment. Not a carousel, not a list of
   three. The whole point is that the app makes a choice.
2. **Hierarchy is enforced by size, not by cards.** The lead headline is ~5× the body size. The
   column numerals are ~4×. Nothing on this page is "medium".
3. **Every number appears next to a name.** Never "18 unread" alone — always the oldest unread item
   beneath it. A count states a problem; a name states which one.
4. **The Ledger is the only inverted section.** It's the only one making an argument rather than
   reporting a fact. Do not invert anything else.
5. **No charts except the 14-bar TIL sparkline.** Analytics live on `/stats`.
6. **The page recomposes on the dial.** Changing time or context re-picks the lead story and the
   up-next list. That's the interaction that proves it isn't a static dashboard.

---

## 2. Layout

Fixed masthead → ticker → wire → lead → columns → ledger → foot → colophon. In order, full width,
no sidebar, hard rules between everything.

| Section | Contents |
|---|---|
| **Masthead** | `HOARD` at `clamp(56px, 15.5vw, 190px)`, Archivo 900, `letter-spacing: -.07em`. Vertical strapline. Date/edition line above, six stat pills below. 9px bottom rule. |
| **Ticker** | Scrolling metrics on inverted ground. CSS animation, duplicated content for seamless loop. |
| **Wire** | Universal capture on yellow. Routing preview beneath. |
| **Lead** | 2-col: story (Archivo 900 headline, standfirst, meta, CTA) + dial rail (time, context, up-next). |
| **Columns** | 3 equal cols: THE QUEUE / THE AGENDA / THE RECORD. Giant numeral, sub, 3 entries, closing line. |
| **Ledger** | Full-bleed inverted. Proportional beam, 4 stats, one-sentence verdict. |
| **Foot** | 2-col: day strip + one recall card on violet. |

**The masthead deliberately costs the fold.** That is the trade — ceremony over density. Do not
"fix" it by shrinking it. If the user later asks, add a `compactMasthead` preference; don't
pre-empt it.

**Theming.** The mockup hardcodes hex. Every colour comes from existing tokens. Newspaper ink
(`--ink`) and paper (`--paper`) map to each theme's ink/surface — verify all five, and check the
inverted Ledger and violet recall panel specifically, since those are where dark themes break.

**Fonts.** Archivo 800/900 is new — add it to the font loader with `display: swap` and subset to
latin. The giant masthead will cause visible layout shift otherwise.

---

## 3. Data — one round trip, non-negotiable

A single `getHomeEdition(userId, { minutes, context })` in `lib/home/edition.ts` returns everything.
One DB call sequence, executed on the server, no per-section fetching.

```ts
type HomeEdition = {
  masthead: { savedTotal: number; unread: number; openTodos: number;
              tilStreak: number; netDebtHours: number; freeMinutesToday: number };
  ticker:   { label: string; value: string; delta?: string; dir: "up"|"down"|"flat" }[];
  candidates: LeadCandidate[];      // pool for lead + up-next, already filtered by ctx
  queue:    { unread: number; owedMinutes: number; addedThisWeek: number;
              burndownMonths: number|null; entries: ColumnEntry[] };
  agenda:   { open: number; workMinutes: number; doneToday: number;
              staleCount: number; entries: ColumnEntry[] };
  record:   { streak: number; monthCount: number; dischargeRate: number;
              last14: number[]; entries: ColumnEntry[] };
  ledger:   { tookOnHours: number; clearedHours: number; learnedCount: number;
              netHours: number; ratio: number; dischargeRate: number;
              estimateError: number|null };
  day:      { blocks: DayBlock[]; nowPercent: number; freeMinutes: number;
              unfittedCount: number; unfittedMinutes: number };
  recall:   { id: string; hash: string; text: string; ageDays: number; confidence: number } | null;
};
```

**Cost control:**

- Everything except `candidates` is cacheable for the day — cache under
  `home:{userId}:{yyyy-mm-dd}` and invalidate on any write to bookmarks, todos, or TIL.
- `candidates` depends on `{minutes, context}`; recompute on change but fetch the pool **once**
  (a superset for all contexts at max time) and filter client-side. Dragging the dial must not hit
  the network.
- The `burndownMonths` and `estimateError` figures need 30-day rolling aggregates — compute in one
  grouped query, not three.

**Every field must degrade.** A new user has no streak, no burn-down rate, no estimate error. Each
of those renders as `—` or an honest `UNKNOWN`, never as `0` or a fabricated figure. `estimateError`
returns `null` below 30 completed tasks — a multiplier from ten samples is noise dressed as insight.

---

## 4. The lead story

**Selection** — score every candidate, take the highest:

```
score = fitScore × urgencyScore × varietyPenalty

fitScore     = 1 - |minutes - item.estimatedMinutes| / minutes   (floor 0.1; must fit)
urgencyScore = overdue todo 3.0 · due-today todo 2.2 · rollover≥3 todo 2.0
             · unread >30d bookmark 1.8 · in-progress bookmark 1.5 · else 1.0
varietyPenalty = 0.6 if this item led the last edition, else 1.0
```

Ties break toward **todos over bookmarks** (a todo has a real deadline; a bookmark rarely does) and
then toward the older item.

**Standfirst — the editorial line.** One or two sentences in a journalistic register, not a UI
string. Generate from a **template library, not an LLM**: 20+ variants per situation class
(overdue-errand, oldest-unread, chapter-fits, deadline-today, ambient, moved-repeatedly), selected
by a hash of the item id so it's stable per item and doesn't reshuffle on re-render. Put them in
`lib/home/standfirst.ts` with a unit test asserting every situation class has ≥20 variants.

Template slots: `{minutes}`, `{rolloverCount}`, `{ageDays}`, `{sourceName}`, `{remainingMinutes}`.
Example: *"{minutes} minutes. You have moved this {rolloverCount} times, which means you have now
spent longer avoiding it than doing it would take."*

**Do not use an LLM here.** It's a per-page-load call for a sentence, and templates keyed on real
numbers read better than a model's guess at tone. If the library ever feels repetitive, add
variants.

**Interactions:** `Enter` starts the lead item (route to session/detail). "not this" cycles to the
next candidate — client-side, no refetch. Dial changes re-pick instantly.

---

## 5. Capture routing

The wire input routes by content, previewed live before submit:

| Input | Destination | Preview chips |
|---|---|---|
| `https?://` or `www.` | THE QUEUE | detected kind, host, time estimate, INBOX |
| starts `til`/`learned`, or contains "I learned"/"turns out" | THE RECORD | type, truncated body, TODAY, streak preview |
| anything else | THE AGENDA | task text, time estimate, due, reminder, tag |

Reuse the existing parsers — `detectKind` from the bookmark enricher and the todo natural-language
parser. **Do not write a third parser.** The preview is a pure function over the input string;
unit-test it against a fixture of ~30 inputs covering all three destinations and the ambiguous
edges.

Submit uses the existing Server Action for each destination. Optimistic: clear the input immediately,
toast on failure.

---

## 6. Accessibility and motion

- **The ticker must pause on `prefers-reduced-motion`** and on hover/focus. Give it
  `aria-hidden="true"` and expose the same figures in the masthead pill row, which is static.
- The lead headline is an `<h1>`. Column headings are `<h2>`. One `<h1>` per page.
- The day strip needs a text alternative — an `aria-label` naming free blocks and their durations.
- Recall card: `Space` reveals, but only when focus is not in an input. Rating buttons appear only
  after reveal.
- Every interactive element keyboard-reachable with a visible focus ring in the house style
  (`outline: 3px solid var(--accent); outline-offset: 3px`).
- The masthead is decorative at that size — ensure a screen reader gets "HOARD" once, not the
  strapline letter by letter.

---

## 7. Phases

Stop after each; run typecheck, lint, test, build.

| Phase | Scope | Verify |
|---|---|---|
| **1** | `lib/home/edition.ts` + all aggregate queries + types + caching + degradation for a brand-new user | One round trip in query logs; seeded empty account renders sensible nulls |
| **2** | `lib/home/standfirst.ts` + template library + tests | ≥20 variants per class; same item always gets the same line |
| **3** | Masthead, ticker, colophon + Archivo loading | No layout shift; ticker pauses under reduced-motion |
| **4** | Wire capture + routing preview + parser reuse + tests | 30-input fixture routes correctly; no third parser added |
| **5** | Lead story: scoring, dial, context, up-next, skip | Dragging the dial makes no network request |
| **6** | Three columns | Every numeral has a named entry beneath it |
| **7** | Ledger (inverted) + verdict sentence | Verdict is computed, never hardcoded |
| **8** | Day strip + recall card | Day strip has a text alternative; `Space` doesn't fire from the input |
| **9** | All five themes + a11y pass + Lighthouse | Screenshots per theme; a11y ≥ 95 |

---

## 8. Do not do

- Do not render more than one lead story.
- Do not fetch per section. One round trip.
- Do not call an LLM for the standfirst.
- Do not add charts beyond the 14-bar sparkline.
- Do not shrink the masthead to "fix" the fold.
- Do not show a fabricated figure where data is insufficient — `—` or `UNKNOWN`.
- Do not write a third capture parser.
- Do not add roadmaps to this page.
- Do not touch the bookmark library views, TIL views, the extension, or the search grammar.

---

## 9. If something here is wrong

Say so rather than working around it. Most likely wrong given code you can see and I can't: whether
the existing stats layer already computes half of §3, whether the theme tokens can express the
inverted Ledger cleanly on the dark themes, and whether the todo parser is exportable as a pure
function or currently entangled with its component. If a refactor is needed, propose it as its own
phase.

---

## 10. Phase 1 build notes (what actually happened)

Recorded here so later phases don't re-derive it.

- **`/` currently renders the entire bookmark library app shell** (`src/app/page.tsx`, a client
  component: `Sidebar`, `HeaderBar`, `TimeContextBar`, all view modes, capture modal — everything),
  not a separate landing page. There's no other route serving that UI. **§0/§2 as written ("this
  replaces whatever `/` currently renders") would delete the primary library interface** unless it
  moves to its own route first. Not a Phase 1 problem (this phase touched no routing/UI), but it
  needs a decision before Phase 3 actually edits `page.tsx`.
- **The existing stats/aggregate layer is a mix.** TIL has real server-side grouped-query DAL
  functions (`getTilStreak`, `getTilHeatmap`, `getTilWallAggregate` in `lib/dal/til.ts`) — reused
  directly (`getTilStreak` for `masthead.tilStreak`/`record.streak`). Bookmarks have **no
  server-side aggregate layer at all** — `/stats` fetches the full bookmark list client-side and
  computes everything in a `useMemo`. All of `queue`'s and `ledger`'s bookmark-derived figures are
  new server-side queries in `lib/home/queries.ts`, not extensions of anything that existed.
- **Theme tokens were already correct.** `--ink`/`--paper`/`--surface` exist and already invert
  correctly across all 5 themes (default/cyberpunk/nordic/tokyo/matcha) — no new tokens needed.
  Archivo is not loaded yet; deferred to Phase 3 (font loading is out of scope for a data-only
  phase). The existing font-loading convention is a plain `@import` in `globals.css`, not
  `next/font` — Phase 3 should extend that same import rather than introduce a new pattern.
- **The time/context filter already exists** — `TimeContextBar` (5–180 min slider, 4 context
  buckets) plus `ContextType`/`CTX` in `src/types/index.ts` and `src/data/initialBookmarks.ts`.
  State lives as plain `useState` in `useBookmarks.ts`, not URL/nuqs. `getCandidates` in
  `lib/home/queries.ts` reuses `ContextType` and the same `CTX` kind-allowlist to filter the
  bookmark candidate pool by context, exactly as the type comment in §3 specifies ("already
  filtered by ctx"). Time-based scoring (`fitScore`) is correctly deferred to Phase 5.
- **No cache layer exists** (no Redis, no `unstable_cache`). Implemented a new `home_edition_cache`
  table instead of the literal `home:{userId}:{yyyy-mm-dd}` + invalidate-on-every-write the spec
  describes — the latter would mean hooking a cache bust into every bookmark/todo/TIL mutation call
  site, which is invasive and arguably conflicts with "do not touch the bookmark library views."
  Instead the cache is keyed by a content fingerprint (row count + max `updatedAt` across the three
  source tables), mirroring the existing `constellation_layouts` precedent: it's naturally stale,
  and recomputed, the moment the fingerprint changes, with no write-path hooks needed. Only the six
  cacheable sections are stored; `candidates` is always computed fresh per call, since HOME.md §3
  already treats it as the one field that shouldn't be cached daily.
- **`design/hoard-home-edition.html` is not in the repo** — same gap as the todos design files.
  Doesn't block this data-only phase; Phase 3+ (masthead/ticker/columns layout) has no visual
  reference yet.
- **`day` (day-plan) is implemented in a degraded-but-honest form.** `busy_blocks` doesn't exist
  yet — that's TODOS.md's own Phase 8, not built. `getDayPlan` computes `freeMinutes` as minutes
  remaining in the user's local day (no busy-block subtraction), `blocks: []`, and
  `unfittedCount`/`unfittedMinutes` from a real greedy-descending pack of today's due-open todos
  against that remaining-minutes figure — real numbers, just without busy blocks factored in until
  that table exists.
- **`ledger`'s 30-day window and the "cleared" bookmark figure are both judgment calls**, not
  spec'd exactly: HOME.md doesn't state a window length, so 30 days was chosen to match the
  existing 30-day rolling pattern used elsewhere (`getTilWallAggregate`, `burndownMonths`). And
  since bookmarks have no dedicated read-event log, "read in the last 30 days" is approximated as
  `unread = false AND updatedAt >= 30 days ago` — this can overcount slightly (any edit to an
  already-read bookmark bumps `updatedAt` too) but is the best signal the current schema has
  without adding a read-event table. Documented inline in `queries.ts`.
- **`estimateError` is computed inline in `getLedger`**, independently of TODOS.md's own
  `lib/todos/calibration.ts` (that's TODOS.md Phase 7, not built yet), using the identical
  ≥30-sample floor so the two can be reconciled once that module exists.
- **Reused the RECALL/SRS system almost verbatim** for the `recall` card — `lib/til/confidence.ts`
  plus a `nextReviewAt`/`supersededById`-aware query, same shape as `/api/til/recall`, rather than
  building new resurfacing logic.
- Added `GET /api/home?minutes=&context=` as the single round trip the client will call, following
  the existing `requireUserId()` auth pattern used by every other API route. `/` itself is
  untouched in this phase — wiring the home page to fetch this once is Phase 3+ work.
