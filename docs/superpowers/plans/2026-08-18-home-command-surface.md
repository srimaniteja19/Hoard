# Home Command Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/` with a command surface (capture, one scored lead, three rails, day strip) and move the bookmark library to `/library`.

**Architecture:** Pure scoring/standfirst/capture modules first (no React). Then in one routing change, move `src/app/page.tsx` to `src/app/library/page.tsx` and mount an RSC `/` that calls `getHomeEdition` once and hydrates a client island. Capture submits to existing POST routes. No new tables or APIs.

**Tech Stack:** Next.js App Router (RSC + client island), TypeScript, Vitest, existing `getHomeEdition` / `parseTodo` / `detectKindFromUrl`.

**Spec:** `docs/superpowers/specs/2026-08-18-home-command-surface-design.md`

## Global Constraints

- One round trip on load: RSC calls `getHomeEdition(userId, { minutes: 180, context: "all" })`. Dial/context must not refetch.
- No third capture parser. Queue uses `detectKindFromUrl`; agenda uses `parseTodo`; record is a destination rule only.
- No newspaper masthead, ticker, or ledger. No in-place todo complete / recall rating.
- House tokens only: `--ink`, `--paper`, `--surface`, `--yel`, `--bd`, `--sh`, `--mono`, `--grot`.
- Every count on a rail has named entries or an empty sentence. Never fabricate `burndownMonths` / `estimateError` on this page.
- Unauthenticated: `redirect("/login")` via catching `AuthError` from `requireUserId()`.
- Do not commit unless the user explicitly asks. Skip all `git commit` steps.
- Repo uses `npm run typecheck`, `npm run lint`, `npm test` (vitest), not pnpm.

## File map

| File | Responsibility |
|---|---|
| `src/lib/home/score.ts` | Pure filter + score + rank of `LeadCandidate[]` |
| `src/lib/home/standfirst.ts` | Pure one-line standfirst from candidate + minutes |
| `src/lib/home/routeCapture.ts` | Pure destination + preview chips |
| `src/lib/home/score.test.ts` | Scoring tests |
| `src/lib/home/standfirst.test.ts` | Standfirst tests |
| `src/lib/home/routeCapture.test.ts` | Fixture-driven capture tests |
| `src/lib/home/__fixtures__/route-capture.json` | ~30 capture inputs |
| `src/app/library/page.tsx` | Current bookmark library (moved) |
| `src/app/page.tsx` | RSC home |
| `src/components/home/HomeCommand.tsx` | Client island |
| `src/components/Sidebar.tsx` | HOME link to `/` |
| `src/components/til/TilHeaderNav.tsx` | QUEUE → `/library` |
| `src/app/session/page.tsx` | Exit → `/library`; honour `?id=` |
| `src/lib/home/queries.ts` | Unchanged |

---

### Task 1: Lead scoring

**Files:**
- Create: `src/lib/home/score.ts`
- Test: `src/lib/home/score.test.ts`

**Interfaces:**
- Consumes: `LeadCandidate` from `src/lib/home/types.ts`; `ContextType` from `@/types`; `CTX` from `@/data/initialBookmarks`
- Produces:

```ts
export function filterCandidates(candidates: LeadCandidate[], ctx: ContextType): LeadCandidate[]
export function score(c: LeadCandidate, minutes: number, lastLedId: string | null): number
export function rankCandidates(
  candidates: LeadCandidate[],
  minutes: number,
  lastLedId: string | null
): LeadCandidate[]
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/home/score.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterCandidates, rankCandidates, score } from "./score";
import type { LeadCandidate } from "./types";

function todo(over: Partial<LeadCandidate> = {}): LeadCandidate {
  return {
    source: "todo",
    id: "t1",
    title: "File expenses",
    estimatedMinutes: 25,
    kind: null,
    energy: "ERRAND",
    overdueDays: 3,
    dueToday: false,
    rolloverCount: 0,
    ageDays: 10,
    unread: null,
    ...over,
  };
}

function bookmark(over: Partial<LeadCandidate> = {}): LeadCandidate {
  return {
    source: "bookmark",
    id: "99",
    title: "Some article",
    estimatedMinutes: 25,
    kind: "ART",
    energy: null,
    overdueDays: null,
    dueToday: false,
    rolloverCount: null,
    ageDays: 40,
    unread: true,
    ...over,
  };
}

describe("filterCandidates", () => {
  it("keeps every todo and only bookmarks whose kind is in CTX[ctx]", () => {
    const pool = [todo(), bookmark({ kind: "VID", id: "v" }), bookmark({ kind: "GIT", id: "g" })];
    const commute = filterCandidates(pool, "commute");
    expect(commute.map((c) => c.id).sort()).toEqual(["t1", "v"]);
  });

  it("returns the full pool for ctx=all", () => {
    const pool = [todo(), bookmark()];
    expect(filterCandidates(pool, "all")).toHaveLength(2);
  });
});

describe("rankCandidates", () => {
  it("ranks an overdue todo above a same-length bookmark", () => {
    const ranked = rankCandidates([bookmark(), todo()], 25, null);
    expect(ranked[0].source).toBe("todo");
  });

  it("ignores fit when minutes is 180", () => {
    const short = todo({ id: "s", estimatedMinutes: 10, overdueDays: null, dueToday: false });
    const long = todo({ id: "l", estimatedMinutes: 120, overdueDays: null, dueToday: false });
    const ranked = rankCandidates([long, short], 180, null);
    expect(score(short, 180, null)).toBe(score(long, 180, null));
    expect(ranked[0].id).toBe("l"); // older-or-equal tie-break: same age, todo=todo, stable by age then source; both age 10 — spec says older ageDays first, equal so original order after sort must be deterministic: higher ageDays first, then todo over bookmark. Same age: compare id? Spec: "todo over bookmark, then older ageDays". Same source and age: keep sort stability by id ascending.
  });

  it("applies a 0.6 variety penalty to the last-led id", () => {
    const a = todo({ id: "a", overdueDays: null, dueToday: true });
    const b = todo({ id: "b", overdueDays: null, dueToday: true, ageDays: 11 });
    expect(score(a, 25, "a")).toBeCloseTo(score(a, 25, null) * 0.6);
    const ranked = rankCandidates([a, b], 25, "a");
    expect(ranked[0].id).toBe("b");
  });

  it("returns [] for an empty pool", () => {
    expect(rankCandidates([], 25, null)).toEqual([]);
  });
});
```

Fix the `minutes === 180` test so it does not depend on an underspecified tie: use two todos with different `ageDays` and assert the older one wins when scores are equal:

```ts
  it("ignores fit when minutes is 180 and tie-breaks to the older item", () => {
    const young = todo({ id: "y", estimatedMinutes: 10, overdueDays: null, dueToday: false, ageDays: 2 });
    const old = todo({ id: "o", estimatedMinutes: 120, overdueDays: null, dueToday: false, ageDays: 40 });
    expect(score(young, 180, null)).toBe(score(old, 180, null));
    const ranked = rankCandidates([young, old], 180, null);
    expect(ranked[0].id).toBe("o");
  });
```

- [ ] **Step 2: Run tests — they must fail**

Run: `npx vitest run src/lib/home/score.test.ts`

Expected: fail resolving `./score`.

- [ ] **Step 3: Implement `src/lib/home/score.ts`**

```ts
import type { ContextType, KindType } from "@/types";
import { CTX } from "@/data/initialBookmarks";
import type { LeadCandidate } from "./types";

export function filterCandidates(candidates: LeadCandidate[], ctx: ContextType): LeadCandidate[] {
  if (ctx === "all") return candidates;
  const allowed = new Set<KindType>(CTX[ctx]);
  return candidates.filter((c) => c.source === "todo" || (c.kind !== null && allowed.has(c.kind)));
}

function fitScore(minutes: number, estimatedMinutes: number): number {
  if (minutes === 180) return 1;
  return Math.max(0.1, 1 - Math.abs(minutes - estimatedMinutes) / minutes);
}

function urgencyScore(c: LeadCandidate): number {
  if (c.source === "todo" && c.overdueDays !== null && c.overdueDays > 0) return 3.0;
  if (c.source === "todo" && c.dueToday) return 2.2;
  if (c.source === "todo" && (c.rolloverCount ?? 0) >= 3) return 2.0;
  if (c.source === "bookmark" && c.ageDays > 30) return 1.8;
  return 1.0;
}

function varietyPenalty(id: string, lastLedId: string | null): number {
  return lastLedId !== null && id === lastLedId ? 0.6 : 1.0;
}

export function score(c: LeadCandidate, minutes: number, lastLedId: string | null): number {
  return fitScore(minutes, c.estimatedMinutes) * urgencyScore(c) * varietyPenalty(c.id, lastLedId);
}

export function rankCandidates(
  candidates: LeadCandidate[],
  minutes: number,
  lastLedId: string | null
): LeadCandidate[] {
  return [...candidates].sort((a, b) => {
    const ds = score(b, minutes, lastLedId) - score(a, minutes, lastLedId);
    if (ds !== 0) return ds;
    if (a.source !== b.source) return a.source === "todo" ? -1 : 1;
    return b.ageDays - a.ageDays;
  });
}
```

Urgency is exclusive (first matching clause), matching the spec's stacked bullets as a priority list: overdue outranks due-today outranks rollover outranks old-unread.

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run src/lib/home/score.test.ts`

Expected: all pass.

---

### Task 2: Standfirst

**Files:**
- Create: `src/lib/home/standfirst.ts`
- Test: `src/lib/home/standfirst.test.ts`

**Interfaces:**
- Consumes: `LeadCandidate`
- Produces:

```ts
export type StandfirstClass =
  | "overdue-todo"
  | "due-today"
  | "moved-repeatedly"
  | "old-unread"
  | "fits";

export function classify(c: LeadCandidate): StandfirstClass
export function standfirst(c: LeadCandidate, minutes: number): string
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { classify, standfirst } from "./standfirst";
import type { LeadCandidate } from "./types";

const baseTodo: LeadCandidate = {
  source: "todo",
  id: "abc",
  title: "Standup notes",
  estimatedMinutes: 15,
  kind: null,
  energy: "SHALLOW",
  overdueDays: null,
  dueToday: false,
  rolloverCount: 0,
  ageDays: 4,
  unread: null,
};

describe("classify", () => {
  it("picks overdue-todo, then due-today, then moved-repeatedly, then old-unread, else fits", () => {
    expect(classify({ ...baseTodo, overdueDays: 2 })).toBe("overdue-todo");
    expect(classify({ ...baseTodo, dueToday: true })).toBe("due-today");
    expect(classify({ ...baseTodo, rolloverCount: 5 })).toBe("moved-repeatedly");
    expect(
      classify({
        ...baseTodo,
        source: "bookmark",
        kind: "ART",
        unread: true,
        ageDays: 40,
        energy: null,
        rolloverCount: null,
      })
    ).toBe("old-unread");
    expect(classify(baseTodo)).toBe("fits");
  });
});

describe("standfirst", () => {
  it("returns the same line for the same id", () => {
    const a = standfirst(baseTodo, 25);
    const b = standfirst(baseTodo, 25);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it("interpolates minutes and rolloverCount", () => {
    const line = standfirst({ ...baseTodo, rolloverCount: 5 }, 25);
    expect(line).toMatch(/5/);
    expect(line).toMatch(/25/);
  });
});
```

- [ ] **Step 2: Run tests — they must fail**

Run: `npx vitest run src/lib/home/standfirst.test.ts`

- [ ] **Step 3: Implement `src/lib/home/standfirst.ts`**

```ts
import type { LeadCandidate } from "./types";

export type StandfirstClass =
  | "overdue-todo"
  | "due-today"
  | "moved-repeatedly"
  | "old-unread"
  | "fits";

const TEMPLATES: Record<StandfirstClass, string> = {
  "overdue-todo":
    "{minutes} minutes. This has been overdue {ageDays} days. Do it now rather than moving it again.",
  "due-today": "{minutes} minutes. Due today. That is the whole window.",
  "moved-repeatedly":
    "{minutes} minutes. You have moved this {rolloverCount} times, which means you have now spent longer avoiding it than doing it would take.",
  "old-unread":
    "{minutes} minutes. This has sat unread for {ageDays} days. Open it or drop it.",
  fits: "{minutes} minutes. This is what fits.",
};

export function classify(c: LeadCandidate): StandfirstClass {
  if (c.source === "todo" && c.overdueDays !== null && c.overdueDays > 0) return "overdue-todo";
  if (c.source === "todo" && c.dueToday) return "due-today";
  if (c.source === "todo" && (c.rolloverCount ?? 0) >= 3) return "moved-repeatedly";
  if (c.source === "bookmark" && c.ageDays > 30) return "old-unread";
  return "fits";
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function standfirst(c: LeadCandidate, minutes: number): string {
  const cls = classify(c);
  const template = TEMPLATES[cls];
  void hashId(c.id);
  return template
    .replaceAll("{minutes}", String(minutes))
    .replaceAll("{rolloverCount}", String(c.rolloverCount ?? 0))
    .replaceAll("{ageDays}", String(c.overdueDays ?? c.ageDays));
}
```

Keep `hashId` even with one template so adding a second line later does not change the function shape. Use `c.overdueDays` for the overdue class's `{ageDays}` slot so "overdue 2 days" is true.

For `moved-repeatedly`, `{minutes}` and `{rolloverCount}` must both appear so the interpolation test passes: use a due-today=false overdueDays=null rolloverCount=5 candidate — classify is `moved-repeatedly`, line includes `5` and `25`.

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run src/lib/home/standfirst.test.ts`

Expected: pass.

---

### Task 3: Capture router

**Files:**
- Create: `src/lib/home/routeCapture.ts`
- Create: `src/lib/home/__fixtures__/route-capture.json`
- Test: `src/lib/home/routeCapture.test.ts`

**Interfaces:**
- Consumes: `detectKindFromUrl` from `@/lib/detectKind`; `parseTodo`, `ParsedTodo` from `@/lib/todos/parse`; `KindType` from `@/types`
- Produces:

```ts
export type CaptureDestination = "queue" | "record" | "agenda";

export type CaptureChip = { label: string };

export type CapturePreview = {
  destination: CaptureDestination | null;
  url: string | null;
  kind: KindType | null;
  host: string | null;
  body: string | null;
  text: string | null;
  chips: CaptureChip[];
  parsed: ParsedTodo | null;
};

export function routeCapture(input: string, today: Date, tz: string): CapturePreview
```

Rules (first match): trimmed empty → `destination: null`. Else URL (`https?://` or `www.`) → queue. Else record if `/^\s*(til|learned)\b/i` or `/\bI learned\b/i` or `/\bturns out\b/i`. Else agenda.

Queue: if input has no scheme, `url = "https://" + trimmed`. `kind = detectKindFromUrl(url) ?? "ART"`. Default mins: VID 45, PPR 40, else 12. Chips: kind, host, `{mins} min`.

Record: strip a leading `til`/`learned` token (and following punctuation/space) for `body`; if the match was mid-string (`I learned` / `turns out`), `body` is the full trimmed input. Chips: `RECORD`, body sliced to 40 chars.

Agenda: `parsed = parseTodo(trimmed, today, tz)`, `text = trimmed`, chips from parsed fields (minutes, energy, due, reminder, recurrence, tags) — skip inferred-only fields that are not in `parsed.matched`, **except** always show minutes and energy because those are always populated (same as `/todos` composer).

- [ ] **Step 1: Write the fixture and failing tests**

Create `src/lib/home/__fixtures__/route-capture.json` with at least these cases (add more until length ≥ 30, keeping the same shape):

```json
[
  { "name": "empty", "input": "", "expected": { "destination": null } },
  { "name": "whitespace", "input": "   ", "expected": { "destination": null } },
  { "name": "https article", "input": "https://example.com/post", "expected": { "destination": "queue" } },
  { "name": "www without scheme", "input": "www.example.com", "expected": { "destination": "queue", "url": "https://www.example.com" } },
  { "name": "github repo", "input": "https://github.com/pgvector/pgvector", "expected": { "destination": "queue", "kind": "GIT" } },
  { "name": "youtube", "input": "https://www.youtube.com/watch?v=abc", "expected": { "destination": "queue", "kind": "VID" } },
  { "name": "http scheme", "input": "http://example.com", "expected": { "destination": "queue" } },
  { "name": "URL wins over til prefix", "input": "https://example.com til leftover", "expected": { "destination": "queue" } },
  { "name": "leading til", "input": "til redis is single-threaded", "expected": { "destination": "record", "body": "redis is single-threaded" } },
  { "name": "leading learned", "input": "learned postgres uses MVCC", "expected": { "destination": "record" } },
  { "name": "I learned mid sentence", "input": "I learned the hard way about N+1", "expected": { "destination": "record" } },
  { "name": "turns out", "input": "turns out the cache was cold", "expected": { "destination": "record" } },
  { "name": "learnedness is agenda", "input": "learnedness is a word", "expected": { "destination": "agenda" } },
  { "name": "plain todo", "input": "Water the plants", "expected": { "destination": "agenda" } },
  { "name": "date in title is agenda not due", "input": "plan the Monday standup", "expected": { "destination": "agenda" } },
  { "name": "todo with estimate", "input": "Call the vet tomorrow ~10m", "expected": { "destination": "agenda" } },
  { "name": "unicode todo", "input": "Buy café pastries", "expected": { "destination": "agenda" } }
]
```

Pad to ≥30 with variations: uppercase `TIL`, `TIL:`, padded URL, arxiv URL (`PPR`), `www.youtube.com`, commute-style `spotify` URL, `deep focus on the migration ~90m`, `every weekday standup notes`, `read 3pm article`, `  https://x.com  `, `I LEARNED`, `Turns Out`, a sentence containing `www.` in the host position only at start, `learned:` with colon, empty chips destination null.

Create `src/lib/home/routeCapture.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { routeCapture } from "./routeCapture";
import fixtures from "./__fixtures__/route-capture.json";

const TODAY = new Date("2024-01-15T12:00:00Z");
const TZ = "UTC";

describe("routeCapture — fixture suite", () => {
  it("has at least 30 cases", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(30);
  });

  for (const fixture of fixtures as { name: string; input: string; expected: Record<string, unknown> }[]) {
    it(fixture.name, () => {
      const result = routeCapture(fixture.input, TODAY, TZ);
      for (const [k, v] of Object.entries(fixture.expected)) {
        expect(result[k as keyof typeof result]).toEqual(v);
      }
    });
  }
});

describe("routeCapture — Monday standup stays agenda", () => {
  it("does not treat Monday as a due date", () => {
    const result = routeCapture("plan the Monday standup", TODAY, TZ);
    expect(result.destination).toBe("agenda");
    expect(result.parsed?.dueOffsetDays).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — they must fail**

Run: `npx vitest run src/lib/home/routeCapture.test.ts`

- [ ] **Step 3: Implement `src/lib/home/routeCapture.ts`**

Follow the rules above. Host via `new URL(url).hostname.replace(/^www\./, "")` inside try/catch. Import `detectKindFromUrl` and `parseTodo` only — no DB/React.

- [ ] **Step 4: Re-run tests**

Run: `npx vitest run src/lib/home/routeCapture.test.ts`

Expected: pass, including ≥30 fixtures.

---

### Task 4: Move library and mount `/`

**Files:**
- Create: `src/app/library/page.tsx` (move contents of current `src/app/page.tsx` unchanged, including `"use client"`)
- Create: `src/components/home/HomeCommand.tsx`
- Modify: `src/app/page.tsx` (replace with RSC)
- Modify: `src/components/Sidebar.tsx` (HOME link)
- Modify: `src/components/til/TilHeaderNav.tsx` (`href="/library"`, keep label QUEUE)
- Modify: `src/app/session/page.tsx` (three `/` exits → `/library` only in this task; `?id=` is Task 6)
- Modify: `src/app/stats/page.tsx` — leave `href="/"` (spec)

**Interfaces:**
- Consumes: `getHomeEdition`, `HomeEdition`, `filterCandidates`, `rankCandidates`, `standfirst`, `CTX` not needed if filterCandidates used, `LeadCandidate`
- Produces: working `/` and `/library`

- [ ] **Step 1: Move the library**

Copy `src/app/page.tsx` to `src/app/library/page.tsx`. Keep `"use client"` and the default export.

In `Sidebar.tsx` logo block, wrap HOARD and add HOME:

```tsx
<div className="logo">
  <b>HOARD</b>
  <span>{unreadCount}</span>
  <Link
    href="/"
    style={{ marginLeft: "8px", fontSize: "10px", fontWeight: 800, color: "inherit", textDecoration: "none" }}
    onClick={() => onCloseMobile?.()}
  >
    HOME
  </Link>
  {/* existing close button */}
</div>
```

`Link` is already imported in Sidebar.

TilHeaderNav: `href="/library"`.

Session: change `router.push("/")` (Escape and EXIT button) and the empty-state `<Link href="/">` to `/library`. Stats stays on `/`.

- [ ] **Step 2: RSC `src/app/page.tsx`**

Replace the library page with:

```tsx
import { redirect } from "next/navigation";
import { requireUserId, AuthError } from "@/lib/session";
import { getHomeEdition } from "@/lib/home/edition";
import { HomeCommand } from "@/components/home/HomeCommand";

export default async function HomePage() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    if (e instanceof AuthError) redirect("/login");
    throw e;
  }
  const edition = await getHomeEdition(userId, { minutes: 180, context: "all" });
  return <HomeCommand edition={edition} />;
}
```

Do not add `"use client"`. Do not fetch `/api/home`.

- [ ] **Step 3: Client island `HomeCommand.tsx`**

`"use client"`. Props: `{ edition: HomeEdition }`.

URL: `useSearchParams` + `useRouter().replace`. Read `time` (Number, default 180, clamp 5–180) and `ctx` (`all|desk|commute|wind`, default `all`). Writing filters uses `router.replace` with `URLSearchParams` like `src/app/todos/page.tsx` (`updateFilters`). Wrap the export in `<Suspense>` the same way todos does.

`lastLedId` state, initialized from `localStorage.getItem("hoard:lastLeadId")` in an effect (null on the server). Persist on change.

Derived:

```ts
const filtered = filterCandidates(edition.candidates, ctx);
const ranked = rankCandidates(filtered, time, lastLedId);
const lead = ranked[0] ?? null;
const upNext = ranked.slice(1, 4);
```

Header: `HOARD` (not h1), local date, nav links Library `/library`, Todos `/todos`, TIL `/til`, Stats `/stats`.

Lead: if `lead` is null, `<h1>Nothing fits this window.</h1>` and no CTA. Else `<h1>{lead.title}</h1>`, standfirst line `standfirst(lead, time)`, CTA Link: todo → `/todos`, bookmark → `/session?id={lead.id}`. “not this” button sets `lastLedId` to `lead.id` (storage write in the same setter). Time range input 5–180 step 5; at 180 show `ANY TIME`. Context chips ALL/DESK/COMMUTE/WIND.

Rails: three columns. Queue numeral `edition.queue.unread`, sub `{owedMinutes} min owed`, entries or “Queue is clear.” Agenda: `open` / `{workMinutes} min open` / “Nothing open.” Record: `streak` (if 0 and no entries, still show 0 with “No entries yet.”), `monthCount` as sub, entries, 14 ticks from `last14` (height `4 + n * 6` px, min 4 max 28), recall text if `edition.recall` else omit. Each rail footer `see all →`.

Day strip: Link to `/todos`. `aria-label` like `Free ${freeMinutes} minutes. Busy: ...`. Shortfall: `{n} tasks ({formatMinutes(unfittedMinutes)}) won't fit today. Move them now rather than at midnight.` Copy `formatMinutes` from `src/app/todos/page.tsx`.

Styling: match todos page — `minHeight: 100vh`, `background: var(--cream, var(--paper))`, `color: var(--ink)`, `fontFamily: var(--sans, var(--grot))`, borders `2px solid var(--ink)`, capture yellow comes in Task 5. Max width ~1100px centered.

Do **not** implement capture submit in this task; a disabled-looking empty yellow input is OK as a placeholder **only if** Task 5 lands in the same session. Prefer leaving a labelled empty `<input>` that Task 5 wires.

- [ ] **Step 4: Verify boot**

Run: `npx tsc --noEmit` (ignore pre-existing `.next/dev/types/validator.ts` roadmap errors). Run `npx eslint src/app/page.tsx src/app/library/page.tsx src/components/home/HomeCommand.tsx src/components/Sidebar.tsx src/components/til/TilHeaderNav.tsx src/app/session/page.tsx`. Run `npx vitest run src/lib/home`.

Expected: no new lint/type errors in touched files; home unit tests pass.

---

### Task 5: Capture bar

**Files:**
- Modify: `src/components/home/HomeCommand.tsx`

**Interfaces:**
- Consumes: `routeCapture` from Task 3
- Produces: Enter submits to the three existing POST routes

- [ ] **Step 1: Wire preview**

State: `input`, `submitting`, `inputRef`. `preview = useMemo(() => routeCapture(input, new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone), [input])`.

Render chips from `preview.chips` under the field (same Chip pattern as `/todos`). Placeholder: `https://…  or  til …  or  call the vet tomorrow ~10m`.

`/` keydown focuses the field when `document.activeElement` is not INPUT/TEXTAREA, `preventDefault` — copy the effect from `src/app/todos/page.tsx`.

- [ ] **Step 2: Submit**

On Enter, if `!preview.destination` return. Optimistic: save `text = input`, set input to `""`, `submitting true`.

```ts
async function commit() {
  const previewNow = routeCapture(input, new Date(), tz);
  if (!previewNow.destination || submitting) return;
  const snapshot = input;
  setInput("");
  setSubmitting(true);
  try {
    let res: Response;
    if (previewNow.destination === "queue") {
      res = await fetch("/api/bookmarks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: previewNow.url, ty: previewNow.kind, src: "Home capture" }),
      });
    } else if (previewNow.destination === "record") {
      res = await fetch("/api/til", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "FACT", body: previewNow.body }),
      });
    } else {
      res = await fetch("/api/todos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: previewNow.text }),
      });
    }
    if (!res.ok) setInput(snapshot);
  } catch {
    setInput(snapshot);
  } finally {
    setSubmitting(false);
  }
}
```

Do not `router.refresh()` as a requirement (edition is stale until next navigation; acceptable for v1). Optional `router.refresh()` after ok is allowed if it does not add a second data-loading path.

- [ ] **Step 3: Lint the island**

Run: `npx eslint src/components/home/HomeCommand.tsx`

Expected: clean.

---

### Task 6: Session `?id=`

**Files:**
- Modify: `src/app/session/page.tsx`

**Interfaces:**
- Consumes: `useSearchParams().get("id")`, existing `unreadItems`
- Produces: session starts on that bookmark when it is unread

- [ ] **Step 1: Honour id**

`useSearchParams` is already available via `next/navigation`. After `unreadItems` is computed:

```ts
const searchParams = useSearchParams();
const requestedId = searchParams.get("id");
const requestedIndex = requestedId
  ? unreadItems.findIndex((b) => String(b.id) === requestedId)
  : -1;
const [currentIndex, setCurrentIndex] = useState(() => (requestedIndex >= 0 ? requestedIndex : 0));
```

If `requestedIndex < 0`, keep `0` (first unread) — spec: missing/read falls back.

If `unreadItems` loads async (`useBookmarks`), the initial state may run with `[]`. Add:

```ts
const [usedRequested, setUsedRequested] = useState(false);
if (!usedRequested && unreadItems.length > 0) {
  const idx = requestedId ? unreadItems.findIndex((b) => String(b.id) === requestedId) : -1;
  if (idx >= 0) setCurrentIndex(idx);
  setUsedRequested(true);
}
```

This is the “adjust state during render” pattern already used in this file for `initedItemId`.

Wrap the session page default export in `<Suspense>` if `useSearchParams` requires it (same split as todos: inner `SessionPageContent` + outer `SessionPage`).

- [ ] **Step 2: Lint**

Run: `npx eslint src/app/session/page.tsx`

- [ ] **Step 3: Full local check**

Run: `npx vitest run src/lib/home src/lib/todos/parse.test.ts src/lib/detectKind.test.ts`

Run: `npx eslint src/app/page.tsx src/app/library/page.tsx src/app/session/page.tsx src/components/home src/lib/home src/components/Sidebar.tsx src/components/til/TilHeaderNav.tsx`

Expected: all targeted tests pass; no new lint errors.

---

## Spec coverage

| Spec section | Task |
|---|---|
| Routes `/` and `/library` | 4 |
| Link rewrites | 4, 6 (session exit already `/library` in 4) |
| Layout header/lead/rails/day | 4 |
| No masthead/ticker/ledger | 4 (simply omitted) |
| RSC + getHomeEdition once | 4 |
| URL `time`/`ctx` | 4 |
| Scoring formula | 1 |
| Standfirst | 2 |
| Capture routing + POST | 3, 5 |
| `/` focuses capture | 5 |
| Session `?id=` | 6 |
| Unauth redirect | 4 |
| last14 sparkline | 4 |
| Empty lead copy | 4 |
