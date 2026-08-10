# HOARD — Design Upgrade v2: Cursor build prompt

Save as `DESIGN-V2.md` in the repo root. Attach `hoard-cover-redesign.html` to the Cursor chat as visual reference. Paste §0 as your first message.

---

## 0. Kickoff message

> We're doing a design upgrade to HOARD, which is already built and deployed (Next.js, Drizzle, Neon, Better-Auth, 5 themes, 4 layout views, Chrome extension, PWA). Read `DESIGN-V2.md` fully before writing code. `hoard-cover-redesign.html` is the visual target for the new card covers — treat it as the design contract, not as code to copy; it hardcodes colours and has no theme support, which is the main thing you need to solve differently.
>
> This is a refactor of existing surfaces, not a new build. Before you change anything, read the current implementation of the bookmark card, the sidebar, the layout views, and the theme system, and tell me the file paths and how theming currently works. Then do **Phase 0 only** and stop.
>
> Never hardcode a hex value. Never add a per-card network request. If a spec conflicts with something already working, say so instead of silently rewriting it.

---

## 1. What we're changing and why

The current card spends ~40% of its height on a hatched colour block that encodes exactly one fact — the kind — which the badge already states. We're replacing decoration with information: each kind gets a cover drawn from metadata we already store.

Four changes, in priority order:

1. **Data-ink covers** — kind-specific SVG covers rendered from stored metadata.
2. **Sidebar occupancy** — bars showing queued *minutes*, not item counts; real glyphs; dimmed empties.
3. **Time-proportional sizing** — card width (Grid/List) and cover height (Masonry) scale with `estimatedMinutes`.
4. **Texture + state** — risograph misregistration, READ stamp, sun-fade on stale items.

Plus four smaller surfaces: full-screen Focus Session, a terminal status line, a print stylesheet, and a cold-start layout.

---

## 2. Hard constraints — violating any of these fails review

- **Five themes must all work.** Neo Brutalist Light, Cyberpunk Dark, Nordic Fog, Tokyo Night, Matcha Latte. No hex literals in any new component. See §4 for the colour strategy.
- **Zero new network calls at render time.** Covers render from columns already on the row. If a cover needs data we don't have, enrichment computes and stores it — the component never fetches.
- **Every cover must degrade.** Most existing rows have no commit history, no chapters, no archived text. Missing data renders the current hatch fallback, not a broken or empty box.
- **Server-rendered SVG, no client JS.** Covers are pure functions of props inside Server Components. No `useEffect`, no canvas, no animation loops.
- **Payload budget.** Cover data per row must stay under ~200 bytes serialised. A 500-card page should not gain more than ~100KB.
- **Don't break the four existing views or the extension.** The card component is shared; changes must be additive.

---

## 3. Data layer

Add a `coverData` key inside the existing `meta` JSON column. Do **not** add new top-level columns. Discriminated on `kind`, validated with Zod on write, narrowed on read.

```ts
type CoverData =
  | { kind: "REPO";     commits52: number[];        // 52 ints 0–100, normalised weekly commit counts
                        languages: [string, number][]; // top 3, percentages
                        pushedDaysAgo: number }
  | { kind: "VIDEO";    chapterOffsets: number[];   // 0–1 fractions of runtime
                        watchedFraction: number }
  | { kind: "ARTICLE";  paragraphWidths: number[];  // 9–12 ints 0–100, relative line lengths
                        scrollFraction: number }
  | { kind: "PAPER";    pages: number; pagesRead: number }
  | { kind: "PLAYLIST"; trackCount: number; trackLengths: number[] } // sample up to 44, normalised
  | { kind: "DOC";      siblings: string[]; activeIndex: number }
  | { kind: "APP";      platforms: string[]; pricing?: string; installed: boolean };
```

**Where each comes from — all from calls we already make:**

| Field | Source |
|---|---|
| `commits52` | GitHub `/repos/{o}/{r}/stats/commit_activity` (returns exactly 52 weeks). Returns 202 while computing — retry once after 3s, then fall back. |
| `languages` | GitHub `/repos/{o}/{r}/languages`, take top 3 by bytes |
| `chapterOffsets` | Parse the chapter timestamps out of the YouTube `snippet.description` we already fetch |
| `paragraphWidths` | Computed from the Readability output during article enrichment — take the first 12 paragraphs, `min(100, len/8)` |
| `pages` | arXiv/Crossref metadata |
| `trackLengths` | Spotify/YouTube playlist items response |
| `siblings` | Nav list scraped from the docs page, or just the URL path segments |

**Migration + backfill.** No schema migration needed (it's inside `meta`), but write `scripts/backfill-cover-data.ts` that walks existing rows in batches of 50 with rate-limit respect, recomputes `coverData`, and is safely re-runnable. Log a summary of successes and failures. Run it against a Neon branch first.

**Zod on the boundary.** Add `coverDataSchema` and parse in the enricher. Never trust `meta` shape at render — use `safeParse` and fall back to the hatch on failure.

---

## 4. Colour strategy for five themes

This is the part the mockup gets wrong and you must solve properly.

Each theme defines `--surface` and `--fg`. Each kind defines `--kind-repo`, `--kind-video`, etc. Covers derive both their fill and their ink from those tokens:

```css
.cover {
  --kc: var(--kind-color);
  background: color-mix(in oklab, var(--kc) 82%, var(--surface));
  color: var(--cover-ink);
}
```

Define `--cover-ink` per theme: near-black on the three light themes, near-white on Cyberpunk Dark and Tokyo Night. All SVG strokes and fills use `currentColor` and opacity — **never a literal colour**. That single rule makes every cover work in all five themes with no per-theme forks.

Verify contrast in each theme. On the dark themes the 82% mix will be too loud; tune the mix percentage per theme with a `--cover-mix` token rather than branching in the component.

---

## 5. Component architecture

```
components/covers/
  CoverCanvas.tsx      // switch on kind → the right cover, or HatchFallback
  RepoCover.tsx  VideoCover.tsx  ArticleCover.tsx
  PaperCover.tsx PlaylistCover.tsx  DocCover.tsx  AppCover.tsx
  HatchFallback.tsx
  lib/cover-geometry.ts  // pure math, unit-tested
```

`CoverCanvas` takes `{ kind, coverData, height }` and returns SVG with `viewBox="0 0 288 104" preserveAspectRatio="none"`. All geometry lives in `cover-geometry.ts` as pure functions with unit tests — the bar positions and normalisation are the only thing here worth testing.

**Accessibility:** each cover gets `role="img"` and an `aria-label` that states what it shows in words — *"Commit activity: active, last pushed 1 day ago. 78% C, 14% SQL."* The visual is supplementary; the label is the content for anyone who can't see it. Decorative texture layers get `aria-hidden="true"`.

---

## 6. Cover specs

Reference the mockup for exact geometry. Summary of what each must convey:

- **REPO** — 52 weekly commit bars across the top, a three-segment language bar below, footer with language percentages and `PUSHED {n}D`. If `pushedDaysAgo > 365`, render the whole cover at 40% opacity and add an `ARCHIVED` marker.
- **VIDEO** — full-width duration bar, filled to `watchedFraction`, with a tick per chapter. Header shows chapter count and percent watched. Footer names the **next unwatched chapter and its length** — this is the highest-value line on the card and must be present when chapters exist.
- **ARTICLE** — 9–12 horizontal rules of varying width forming a text-density thumbnail, with a scroll-progress bar along the bottom edge.
- **PAPER** — a grid of one rectangle per page (cap the visual at 24; above that, scale), filled for pages read. Footer `{read} / {total} PAGES`.
- **PLAYLIST** — vertical bars for tracks (sample to 44 max), footer `{n} TRACKS · {runtime}`.
- **DOC** — the sibling section list with the saved section emphasised and the rest at 50% opacity.
- **APP** — icon placeholder, platform list, pricing, and an `INSTALLED? YES/NOT YET` line.

---

## 7. Sidebar

Replace count badges with occupancy bars.

- Bar width = `18% + (queuedMinutes / maxQueuedMinutes) * 82%`, background the kind colour at ~35% opacity.
- Trailing label shows `{n}m` for non-empty, the word `empty` for zero.
- Rows with zero items render at 34% opacity — dimmed, not hidden (hiding breaks muscle memory).
- **Replace the letter-in-a-square icons with real SVG glyphs.** Currently `A` collides between Articles and Apps, `P` between Playlists and Papers. Use the glyph set from the mockup.
- Queued minutes come from a single grouped aggregate query, not N queries. Cache per request.

**Also fix:** the sidebar renders as an overlay drawer with a close button at desktop widths. It should be a persistent column above the `lg` breakpoint, and a drawer only below it.

---

## 8. Time-proportional sizing

```ts
// Grid + List: width in px
const cardWidth = 92 + Math.pow(estimatedMinutes, 0.52) * 46;
// Masonry: cover height in px, capped so nothing exceeds 2.5x the shortest
const coverHeight = clamp(74 + Math.pow(estimatedMinutes, 0.45) * 9, 74, 185);
```

Sub-linear on purpose — linear would make a 2-hour video twenty times the width of a 2-minute one. Put this in `cover-geometry.ts` and unit-test the bounds.

Add a `sizeByTime` user preference, default **on**, persisted with the existing theme preference. Off falls back to uniform cards. Some people will hate this; give them the switch.

---

## 9. Texture and state

- **Risograph** — an SVG `<defs>` halftone dot pattern plus two offset plate layers (+3px/-3px). Define once in a shared `<Defs />` mounted at layout level, reference by id in every cover. Do not duplicate the pattern per card.
- **READ stamp** — rotated `-11deg`, kind-neutral accent colour, absolutely positioned bottom-right of the cover, rendered only when `readState === "DONE"`.
- **Sun-fade** — items with `readState !== "DONE"` and `createdAt` older than 90 days render the cover at `filter: saturate(0.28)`. Add a title attribute explaining why so it doesn't read as a bug.
- **`prefers-reduced-motion`** — keep all of the above (they're static) but drop the hover transform, retaining only the shadow change.

---

## 10. Four smaller surfaces

**Focus Session — change the visual register.** Currently a button in the same language as everything else. Make it a full-screen route (`/session`) that takes over completely: one item centred, the timer as a full-bleed bar draining across the top, all chrome gone, `Esc` to exit with a confirm if a timer is running. A mode change should look like a mode change.

**Status line.** A fixed monospace strip pinned to the bottom of the app shell: `3 ITEMS · 42 MIN QUEUED · BURNS DOWN IN 11 DAYS AT CURRENT RATE · LAST SAVE 4M AGO`. Burn-down = `queuedMinutes / (minutesCompletedLast28Days / 28)`. Hide below `md`; hide on `/session`.

**Print stylesheet.** `@media print` renders the current collection as a two-column zine: covers drop out, titles set larger, user notes as marginalia, URLs printed after titles in mono, all chrome hidden. Add a Print action to the collection menu.

**Cold start.** Under 15 items: force a single centred column regardless of the selected view, hide empty collections behind a `show all` toggle, and show a real empty state pointing at the extension and the importer. Masonry with three items looks broken no matter how good the cards are.

---

## 11. Bugs visible in the current build — fix in Phase 0

1. `"Saved via HOARD Extension"` is rendering as the card excerpt. That's plumbing leaking into the UI as content. Move it to a `source` field shown only in the inspector; render nothing when there's no real excerpt.
2. Two entry points for the same action — `START FOCUS SESSION` in the sidebar and `START SESSION` in the top bar. Keep the top bar one.
3. Unexplained violet strip across the top of the viewport. Find and remove it.
4. Sidebar overlay drawer with a close button at desktop width (see §7).
5. Icon letter collisions: Articles/Apps, Playlists/Papers.

---

## 12. Phases — stop after each

| Phase | Scope | Done when |
|---|---|---|
| **0** | The five bugs in §11 | Screenshot at 1440px matches expectation; no placeholder text in cards |
| **1** | Theme token layer (§4) + `HatchFallback` + `CoverCanvas` skeleton | All five themes render the fallback correctly; no hex literals introduced |
| **2** | `coverData` types, Zod schema, enricher writes for REPO and ARTICLE | New saves of a GitHub URL and a blog post carry valid `coverData` |
| **3** | `RepoCover` + `ArticleCover` + geometry unit tests | Both render in all five themes; missing data falls back cleanly |
| **4** | Remaining five covers | All kinds covered; a11y labels present |
| **5** | Backfill script, run against a Neon branch first | >90% of existing rows have `coverData`; failures logged, none lost |
| **6** | Sidebar occupancy + glyphs + desktop persistence | One aggregate query; zero-count rows dimmed |
| **7** | Time-proportional sizing + `sizeByTime` preference | Bounds hold at 2 min and 300 min |
| **8** | Texture, READ stamp, sun-fade | Riso defs mounted once, not per card |
| **9** | `/session` full-screen, status line, print stylesheet, cold start | Print preview is legible; status line accurate |

---

## 13. Do not do

- Do not add a component library or a charting library. These are hand-written SVGs; Recharts for a 52-bar sparkline is 90KB for something that's twelve lines of math.
- Do not scrape OG images for covers. We chose flat data covers deliberately — OG images are generic hero art that turns a 200-item grid into mush.
- Do not animate the covers. They're read at a glance, in bulk, and motion at that density is noise.
- Do not fetch anything from a client component. If you find yourself writing `useEffect` in a cover, the data belongs in `coverData`.
- Do not touch the search grammar, the extension, auth, or the importers in this pass.
- Do not "improve" the existing themes' palettes while you're in there. Separate PR, separate argument.
