# HOARD — OG Images & Cover Coherence: Claude Code spec

Save as `COVERS.md` in the repo root. Keep `design/hoard-cover-coherence.html` in the repo as the
visual reference.

This covers: pulling real `og:image` artwork from source sites, mirroring it safely, unifying it with
the generated data-ink covers via duotone, the rule for which cover a bookmark gets, and six bugs
visible in the current build.

---

## 0. Kickoff message

> Read `COVERS.md` and `design/hoard-cover-coherence.html` in full before doing anything.
>
> We're building an OG-image ingestion pipeline and unifying it with the existing generated covers.
> Most of this spec is about not shipping a security hole or a slow page — fetching arbitrary images
> from arbitrary sites is the single most dangerous thing this app does.
>
> **Start in plan mode.** Explore first and tell me: where the existing SSRF guard lives and its exact
> API, whether there's already an HTML-metadata fetcher I should extend rather than duplicate, how
> blob storage is currently configured, what the enrichment job runner looks like, and where cover
> rendering happens today. Then give me a plan with file paths and flag anything here that conflicts
> with what exists.
>
> **Phase 0 is six bug fixes and is not optional** — do it first, separately, and show me before
> touching the pipeline.
>
> Then Phase 1 only, run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, and stop.

---

## 1. Phase 0 — bugs in the current build

Fix these first, as their own commit. All six are visible in a screenshot of production.

1. **Seed copy is rendering as bookmark excerpts.** Three different cards show *"Tools and apps skip
   the reading queue and land on a shelf you check when setting up a machine."* Others show
   *"Stars and last-commit refresh on a schedule…"* and *"Full text is archived at save time…"*.
   These are sentences from a design document that ended up in the seed file and then in production
   data. Purge them from the database, remove them from the seed, and **add a CI check** that fails
   the build if any known seed string appears in a production data export.
2. **Titles are being title-cased and it mangles acronyms** — `How I Use LIms To Learn` should be
   `How I Use LLMs To Learn`. Remove the transform entirely. Render the source title verbatim.
   `pgvector`, `iOS`, `LLM`, `npm` all break under title-case.
3. **Two duration formats for the same value** — the header shows `2H 21M QUEUED`, the status bar
   shows `141 MIN QUEUED`. One `formatDuration()` in `lib/format.ts`, used everywhere, unit-tested.
4. **`Web / Desktop` is rendering in the kind-badge slot** where `APP` belongs. The badge is always
   the three-letter kind code. Platform strings belong in the metadata line.
5. **A `>_` terminal glyph sits on every cover**, including articles, where it means nothing — and on
   at least one card it overlaps the image content. Replace with a corner `↗` open affordance that
   appears on hover only.
6. **Actions are visible at rest on every card.** Eleven lime DISCHARGE buttons compete for attention
   in a grid of eleven items. Reveal DISCHARGE and the open arrow on hover/focus. Keep them
   keyboard-reachable — `:focus-visible` must show them, not just `:hover`.

---

## 2. Schema

```ts
// added to bookmarks
coverSource:     varchar("cover_source", { length: 12 }),   // 'og' | 'generated' | null
ogImageKey:      text("og_image_key"),                      // blob storage key, never a remote URL
ogImageWidth:    integer("og_image_width"),
ogImageHeight:   integer("og_image_height"),
ogDominantColor: varchar("og_dominant_color", { length: 9 }),
ogLqip:          text("og_lqip"),                           // ~200 byte base64 placeholder
ogStatus:        varchar("og_status", { length: 12 }).notNull().default("PENDING"),
                                                            // PENDING|READY|REJECTED|FAILED
ogRejectReason:  varchar("og_reject_reason", { length: 40 }),
faviconKey:      text("favicon_key"),

excerptSource:   varchar("excerpt_source", { length: 16 }), // 'og'|'first-paragraph'|'user-note'|null
```

`ogRejectReason` matters — when a cover falls back to generated, you want to know whether it was a
tracking pixel, an auto-generated social card, or a timeout. Without it every failure looks the same
and you can't tune the heuristics.

---

## 3. The OG image pipeline

Runs in the **background enrichment job**, never in the request path. Never in a client component.

### 3.1 Discover

Parse the already-fetched HTML in this order, taking the first that resolves:

1. `og:image:secure_url` → 2. `og:image` → 3. `twitter:image` → 4. `link[rel=image_src]` →
5. first `<img>` in the article body with natural dimensions ≥ 400×200 → 6. nothing.

Resolve relative URLs against the canonical URL. Also grab `og:image:width` / `og:image:height` when
present — they let you reject a bad candidate before downloading it.

### 3.2 Fetch — this is the dangerous part

Route the image fetch through the **existing SSRF guard**, same as page enrichment. It is a
user-supplied URL fetched server-side and deserves identical treatment:

- scheme allowlist `https`, `http` only
- DNS resolve before connecting; reject private, loopback, and link-local ranges
- follow redirects manually, re-validating every hop
- 8s timeout, 2 retries with backoff
- **5MB hard cap, enforced by streaming and aborting** — not by trusting `Content-Length`

Then validate before processing:

- `Content-Type` must match `image/(jpeg|png|webp|avif|gif)`. **Reject SVG outright** — SVG is an
  XSS vector via embedded scripts and `foreignObject`, and there is no safe way to render an
  untrusted one.
- Sniff the magic bytes; do not trust the declared content type.
- Reject below 200×100 — that's a tracking pixel or a logo, not a cover.
- Reject aspect ratios beyond 5:1 or below 1:3 — banners and skyscrapers crop to garbage.

### 3.3 Process and store

Using `sharp`:

- Resize to max 640px wide (that's 2× the largest cover we render), `fit: cover`.
- Convert to WebP quality 75. Store one size — we're not building a responsive image set for a
  118px card.
- **Strip all metadata.** EXIF on a scraped photograph can carry GPS coordinates and camera serials.
  `.withMetadata(false)` is not optional.
- Extract the dominant colour (`sharp.stats()`) and generate a ~200-byte base64 LQIP by resizing to
  16px wide and inlining.
- Upload to blob storage; store the **key**, never a remote URL.

**Never hotlink.** A remote `og:image` URL in your DOM leaks every reader's IP to that host, breaks
when they rotate CDN paths, and defeats your CSP. Mirroring is the entire point.

### 3.4 Refetch policy

Never on a schedule. OG images don't meaningfully change, and re-fetching thousands of images weekly
is bandwidth you're paying for to achieve nothing. Refetch only on explicit user action ("refresh
metadata") or if `ogStatus = FAILED` and the bookmark is opened.

### 3.5 Favicons

Same pipeline, much simpler. `link[rel~=icon]`, fall back to `/favicon.ico`. Resize to 32×32 WebP,
mirror, store the key. One per **host**, not per bookmark — a `favicons` table keyed on host, shared
across every bookmark from that domain. Thousands of GitHub bookmarks should mean one stored favicon.

---

## 4. Which cover does a bookmark get

Evaluate in order. This rule is the difference between a coherent grid and a mess.

| Kind | Cover |
|---|---|
| REPO, DOC, PAPER | **Always generated data-ink.** Their OG images are auto-generated social cards that duplicate the title shown directly beneath. The commit sparkline carries information a title can't. |
| VIDEO, PLAYLIST | **Always OG.** The thumbnail genuinely is the content. |
| APP | OG if the page has a real product shot; generated otherwise. |
| ARTICLE | OG if present and not auto-generated; text-density data-ink otherwise. |

**Auto-generated social card detection** — if any of these match, reject the OG image with reason
`auto-generated` and fall back to generated:

- host matches `opengraph.githubassets.com`, `repository-images.githubusercontent.com`,
  `og-image.vercel.app`, `*.microlink.io`, `og.railway.app`
- dimensions are exactly 1200×600 or 1280×640 **and** `og:image:alt` shares more than 60% of its
  tokens with the page title
- the URL path contains `/api/og` or `/og-image`

Ship the host list in `lib/covers/auto-generated-hosts.ts` so it's one line to extend.

---

## 5. Duotone — unifying the two cover types

A photographic cover and a lime commit sparkline share no visual language, which is why the current
grid reads as two applications. Put the photograph through the palette:

```css
.cover-img { filter: grayscale(1) contrast(1.22); }
.cover-tint { position:absolute; inset:0; background: var(--kind-color); mix-blend-mode: multiply; }
```

**Per theme.** On the two dark themes `multiply` turns every cover to mud — use `screen` with a
darkened tint there. Drive it from a `--cover-blend` token per theme rather than branching in the
component. Verify all five and screenshot them.

**Progressive rendering:** background is `ogDominantColor`, then the LQIP, then the WebP. Never a
blank rectangle that pops.

Add a per-user setting **"duotone covers"**, default on. Some people will want the photographs raw,
and it's a one-class toggle.

---

## 6. Excerpts — the structural fix

The reason spec sentences masquerading as excerpts went unnoticed for weeks is that your own words
and a scraper's words render identically. Split them:

| `excerptSource` | Rendering |
|---|---|
| `user-note` | Yellow left rule, italic, not clamped. **This is the most valuable field in the database** and should look like it. |
| `og` / `first-paragraph` | Dimmed to ~75%, clamped to **2 lines** (currently 3 — two fits ~30% more per screen and loses nothing). |
| `null` | **Render nothing.** A missing field beats a field that says nothing. |

Never write an excerpt without setting its source. Make the column `notNull` on new rows if you can
backfill cleanly.

---

## 7. Security and privacy checklist

- SSRF guard on every image fetch, redirects re-validated per hop.
- SVG rejected; magic bytes sniffed, not trusted.
- EXIF stripped on every processed image.
- `next.config` `remotePatterns` allows **only your blob host**. If a remote host appears there, the
  mirroring pipeline has been bypassed somewhere.
- CSP `img-src 'self' data: <blob-host>`.
- Rate limit image fetches per user; global circuit breaker per remote host.
- **Public share pages render third-party imagery you didn't author.** Add a per-bookmark "hide
  cover" toggle and make sure share pages respect it.

---

## 8. Phases

Stop after each; run typecheck, lint, test, build.

| Phase | Scope | Verify |
|---|---|---|
| **0** | The six bugs in §1 | Screenshot at 1440px; CI seed-string check fails on a planted string |
| **1** | Schema migration + `lib/format.ts` + `excerptSource` backfill | No nulls after backfill; duration tests pass |
| **2** | Excerpt rendering split (§6) + 2-line clamp | User notes visually distinct; null renders nothing |
| **3** | OG discovery + SSRF-guarded fetch + validation (§3.1–3.2) | Feed it `http://169.254.169.254/`, an SVG, and a 1×1 GIF — all rejected with correct reasons |
| **4** | sharp processing, EXIF strip, LQIP, dominant colour, blob upload | Upload a photo with GPS EXIF; confirm it's stripped in the stored file |
| **5** | Cover-source rule + auto-generated detection (§4) | A github.com bookmark gets data-ink, not the social card |
| **6** | Duotone rendering + `--cover-blend` per theme + user setting | Screenshots of all five themes |
| **7** | Favicon pipeline, host-keyed table | 50 GitHub bookmarks → one stored favicon |
| **8** | Hover/focus actions, progressive image loading | Keyboard tab reveals actions; no blank-rect pop |
| **9** | Backfill job over existing bookmarks, batched and rate-limited | Re-runnable; failures logged, none lost |

---

## 9. Do not do

- Do not hotlink a remote `og:image`. Ever.
- Do not accept SVG.
- Do not fetch images in the request path, in a Server Component, or from the extension.
- Do not add a remote host to `next.config` `remotePatterns`.
- Do not refetch OG images on a schedule.
- Do not use the OG image for repos, docs, or papers.
- Do not build a responsive image set. One 640px WebP for a 118px card.
- Do not title-case, truncate, or otherwise transform scraped titles.
- Do not touch the TIL views, the extension, or the search grammar in this pass.
