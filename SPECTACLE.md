# HOARD — Spectacle Features: Claude Code build spec

Save as `SPECTACLE.md` in the repo root. Keep `hoard-spectacle.html` in the repo too (e.g.
`design/hoard-spectacle.html`) so Claude Code can read it directly rather than being described it.

---

## 0. Kickoff message

> Read `SPECTACLE.md` and `design/hoard-spectacle.html` in full before doing anything else.
>
> We're adding four features to HOARD. Every one of them is a performance problem wearing a visual
> feature's clothes — the naive implementation of each will work beautifully on seed data and lock
> the main thread on a real library. The spec is mostly about that.
>
> **Start in plan mode.** Explore the codebase first: the `/til` route and its views, the theme token
> system, the Drizzle schema for `til_entries` and `bookmarks`, any existing motion or
> `prefers-reduced-motion` handling, and how Server Actions are currently structured. Then give me a
> plan covering all four features with the file paths you intend to touch and anything in the spec
> that conflicts with what's already there. Don't write code until I approve the plan.
>
> After that, build **Phase 1 only**, run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`,
> show me the output, and stop. Same pattern for every phase after.
>
> The HTML file hardcodes hex values and has no theme support — that's the main thing you need to
> solve differently. Use the app's existing tokens.

---

## 1. Add to `CLAUDE.md`

Append this to the repo's `CLAUDE.md` so it applies to every future session:

```md
## Motion and visual features
- Every animated or simulated feature ships with a `prefers-reduced-motion` path in the same PR.
- No hex literals in components. Colours come from theme tokens; all five themes must be verified.
- Anything O(n²) over user data goes in a Web Worker or is precomputed and cached. Never on the
  main thread in a render path.
- Pure visual logic (hashing, layout math, zoom thresholds) lives in `lib/` as tested pure
  functions, not inline in components.
- Performance budget: no interaction may block the main thread for more than 50ms at p95 with
  2,000 TIL entries and 5,000 bookmarks. Seed that volume before claiming a feature is done.
```

---

## 2. Feature 1 — The Year Wall (semantic zoom)

A fifth view on `/til`. One tile per day for a rolling year. **Zoom changes what a tile *is*, not
just its size.**

| Tile size | Mode | Tile renders |
|---|---|---|
| < 15px | `rhythm` | Kind colour only, opacity by entry count |
| 15–62px | `composition` | Colour + type initial + count |
| > 62px | `content` | Type badge + truncated entry body |

**Data — this is the part that matters.** Do not fetch entry bodies to render a year of tiles.

- `GET /api/til/wall` returns one row per active day: `{ loggedFor, count, dominantType }`, from a
  single `GROUP BY logged_for` query. Roughly 8 bytes a day; the whole year is a few KB.
- Entry bodies are fetched **only** in `content` mode, **only** for days in the viewport, via a
  second endpoint batched by date range. Debounce 150ms on scroll and zoom.
- Cache the aggregate for the day, invalidated on TIL write.

**Implementation notes**

- Zoom lives in the URL (`?zoom=32`) via nuqs, like every other filter.
- Above 40px tiles, virtualise — render viewport plus one screen of buffer. Below that, 365 divs is
  cheap enough to render whole.
- Keyboard: `+`/`-` step, `1`/`2`/`3` jump to the three modes. Touch: pinch to zoom.
- Reduced motion: snap between the three modes instead of interpolating tile size.
- Empty days render as a hairline outline, never as a filled tile — the gaps are the information.

**Acceptance:** with 2,000 entries seeded, first paint of the wall issues exactly one query and
transfers under 20KB. Dragging the zoom slider from min to max stays above 50fps.

---

## 3. Feature 2 — Constellation

A force-directed graph of topics and entries on `/til`.

- **Hubs** = tags, radius by entry count. **Satellites** = entries, **brightness = confidence**.
- **Edges**: entry→tag, tag→tag (adjacency), and supersession edges rendered dashed in the warning
  colour.
- Hover highlights a node's edges and shows a tooltip. Click a hub filters the Codex view to it.

**Do not hand-roll the simulation.** Use `d3-force` — its `forceManyBody` already does Barnes-Hut
quadtree approximation, which is the entire difference between 40 nodes and 500.

**Three-tier strategy by graph size — implement all three:**

1. **< 150 nodes** — simulate client-side in a Web Worker, stream positions back, render SVG.
2. **150–600 nodes** — same, but render to Canvas with a quadtree for hit-testing. SVG hover
   handlers on 600 nodes is where it dies.
3. **> 600 nodes** — collapse to hubs only; expanding a hub loads and simulates just that
   neighbourhood.

**Cache the settled layout.** Store final positions keyed by a hash of `(userId, entryCount,
maxUpdatedAt)`. On load, if the key matches, render the cached layout instantly and skip the
simulation entirely. Nobody wants their graph rearranging every time they open a tab. Re-simulate
only when the key changes.

**Reduced motion:** skip the settling animation, render the final frame directly.

**Theming:** the dark canvas background is a token, not `#0E1018`. On the three light themes the
graph needs an inverted treatment — dark nodes on light ground — with confidence mapping to opacity
rather than brightness. Verify all five.

**Acceptance:** 2,000 entries across 40 tags renders in under 1.5s on a cold cache and under 200ms
warm. Main thread never blocks over 50ms — verify in a Performance profile, not by eye.

---

## 4. Feature 3 — Discharge

Clicking DISCHARGE on a queued bookmark moves it into the TIL that consumed it.

**Server, in one transaction:** create the `til_entry` with `dischargesBookmarkId` set, and update
the bookmark to `readState = 'DONE'`. One Server Action, one transaction — a partial success here
means the bookmark is marked read with no entry to show for it, which is the worst possible outcome.

**Client:**

1. Capture `getBoundingClientRect()` of the source card and the destination list.
2. Optimistically remove from queue, prepend to TIL list, update both counters.
3. FLIP-animate a cloned element between the two rects. 400ms, `cubic-bezier(.4,0,.2,1)`.
4. Pulse both counters on arrival.
5. Print a receipt line with the running unread balance — read from real state, not a hardcoded string.
6. On server failure, roll back the optimistic update and toast the error. Do not leave the UI
   claiming a discharge that didn't happen.

**Reduced motion:** no flight. Cross-fade the counters and print the receipt line.

**Also wire the inverse:** a bookmark's inspector shows *"N TILs came out of this"* — one query on
`dischargesBookmarkId`. And add `dischargeRate` to `/stats`: the share of TIL entries that cite a
bookmark.

**Acceptance:** discharging with the network throttled to offline rolls back cleanly and the counts
are correct. Discharging 5 items in quick succession doesn't produce overlapping flyers or drift the
counters.

---

## 5. Feature 4 — Sigils

Deterministic generated identity per collection, from its name.

```ts
// lib/sigil.ts — pure, no side effects, no Math.random
export function sigil(name: string, size = 140): { svg: string; hash: string }
```

- FNV-1a hash of the lowercased, trimmed name → seeds an xorshift32 PRNG.
- 5×5 grid, left half generated and mirrored to the right. Four shape kinds (square, circle,
  triangle, inset square). Palette and accent chosen from the theme's kind-colour set.
- **Must produce byte-identical output on server and client.** No `Math.random`, no `Date`, no
  locale-dependent anything — a mismatch is a hydration error.

**Used in:** sidebar collection rows, collection page headers, share pages, and the `next/og` image
for public collections.

**`next/og` caveat — check this before building it.** Satori supports only a subset of SVG. Verify
whether inline `<rect>`/`<circle>`/`<path>` render correctly in the OG route; if not, either emit
the sigil as a data-URI `<img>` or rebuild the grid as absolutely-positioned divs for that surface
only. Do not assume it works — render one and look at it.

**Tests:** same name → identical output across 1,000 runs; 1,000 distinct names → no more than ~2%
palette+layout collisions; whitespace and case differences normalise to the same sigil.

---

## 6. Phases

Stop after each. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` and show output.

| Phase | Scope | Verify |
|---|---|---|
| **1** | Seed script: 2,000 TIL entries over 400 days across 40 tags, 5,000 bookmarks. Everything after this is measured against it. | `pnpm seed:heavy` completes; `/til` still loads |
| **2** | `lib/sigil.ts` + tests + sidebar and collection header integration | Unit tests pass; no hydration warnings in console |
| **3** | Sigil on share pages and the `next/og` route | Fetch the OG URL and confirm the image renders the sigil |
| **4** | Wall aggregate endpoint + caching | One query, <20KB, verified in the network tab |
| **5** | Wall view: three modes, zoom in URL, virtualisation, keyboard, pinch | 50fps+ dragging zoom min→max at 2,000 entries |
| **6** | Discharge: transaction, Server Action, backlinks, discharge rate on `/stats` | Offline rollback is clean |
| **7** | Discharge FLIP animation + receipt + reduced-motion path | 5 rapid discharges behave |
| **8** | Constellation tier 1: worker + d3-force + SVG, <150 nodes | Settles under 1.5s; main thread unblocked |
| **9** | Constellation tier 2 (canvas + quadtree picking) and tier 3 (hub collapse) | 2,000 entries renders and hover-picks correctly |
| **10** | Layout caching keyed on data version; all five themes verified across all four features | Warm load under 200ms; screenshots of each theme |

---

## 7. Do not do

- Do not hand-roll a force simulation. Use `d3-force`.
- Do not run any simulation on the main thread.
- Do not fetch TIL bodies to render the wall in `rhythm` or `composition` mode.
- Do not use `Math.random` anywhere in sigil generation.
- Do not ship any of these four without a `prefers-reduced-motion` path in the same PR.
- Do not add a charting or animation library. `d3-force` is the only new dependency approved here —
  and only the `d3-force` package, not all of `d3`.
- Do not touch the bookmark library views, the extension, the importers, or the search grammar.
- Do not commit until I've reviewed the phase. Then use conventional commits, one per phase.

---

## 8. If something in this spec is wrong

Say so. The parts most likely to be wrong given code you can see and I can't: whether the theme
system can express an inverted graph treatment cleanly, whether Satori renders the sigil SVG, and
whether the existing `/til` view architecture can take two more view modes without a refactor. If a
refactor is needed, propose it as its own phase before starting — don't fold it silently into
another one.
