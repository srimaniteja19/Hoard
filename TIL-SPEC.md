# HOARD — TIL + Link Embeds + Extension: Cursor build spec

## 0. Kickoff message

> We're adding a **Today I Learned** feature to HOARD, plus rich link embeds, plus extension support
> for capturing TILs. HOARD is already built and deployed (Next.js, Drizzle, Neon, Better-Auth, MV3
> Chrome extension, PWA, 5 themes). Read `TIL-SPEC.md` fully before writing code.
>
> `hoard-til.html` and `hoard-til-embeds.html` are the visual contract for the web view. They
> hardcode colours and have no theme support — solve theming the way the existing app does, using
> its tokens.
>
> Before you write anything, read the current bookmark schema, the enrichment pipeline, the SSRF
> guard, the auth setup, and the entire extension source, then tell me: the file paths, how the
> extension currently authenticates against the API, and whether there's an existing URL-metadata
> fetcher I should reuse rather than duplicate. Then do **Phase 1 only** and stop.
>
> Two rules throughout: never fetch a link preview at render time, and never fetch a user-supplied
> URL without going through the existing SSRF guard.

---

## 1. The concept — don't lose this

HOARD is a **ledger of debt**: things you owe yourself. TIL is the **ledger of gains**: things you
extracted. They're inverses, and the link between them is the feature no bookmark manager has.

Three consequences that drive the design:

1. **A TIL entry can discharge a bookmark.** Writing what you learned marks the source `DONE`. The
   `/stats` page then reports a **discharge rate** — what share of your learning came from your own
   queue versus from the air.
2. **A link inside a TIL is evidence, not a to-do.** It must *not* enter the bookmark queue unless
   the user explicitly opts in. Get this wrong and TIL becomes a second inbox and you've doubled the
   debt instead of paying it down.
3. **Entries are authored, not saved.** The composer is the hero surface, not a URL field. Entry
   type shapes the composer, not just the colour.

---

## 2. Data model

```ts
export const tilType = pgEnum("til_type",
  ["FACT","GOTCHA","SNIPPET","PATTERN","QUOTE","OPINION","LINK"]);

export const tilEntries = pgTable("til_entries", {
  id:          text("id").primaryKey().$defaultFn(createId),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shortHash:   varchar("short_hash", { length: 4 }).notNull(),  // display id, e.g. "a3f9"
  type:        tilType("type").notNull().default("FACT"),

  body:        text("body"),        // markdown-lite: inline code, bold, italic, links. NOT full markdown.
  code:        text("code"),        // populated only when type = SNIPPET
  codeLang:    varchar("code_lang", { length: 24 }),

  linkUrl:     text("link_url"),
  linkPreview: jsonb("link_preview").$type<LinkPreview>(),  // snapshot, see §3
  linkDensity: varchar("link_density", { length: 8 }).default("card"), // inline|card|quote|full

  dischargesBookmarkId: text("discharges_bookmark_id").references(() => bookmarks.id, { onDelete: "set null" }),

  loggedFor:   date("logged_for").notNull(),   // the DAY it counts for — see the timezone note below
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
}, t => ({
  byUserDay:  index().on(t.userId, t.loggedFor.desc()),
  uniqueHash: unique().on(t.userId, t.shortHash),
}));

export const tilEntryTags = pgTable("til_entry_tags", { /* join to existing tags table */ });
```

**Decisions worth stating explicitly:**

- **`loggedFor` is a `date`, not derived from `createdAt`.** Streaks and heatmaps must run in the
  *user's* timezone, not UTC, or someone in California logging at 6pm breaks their streak. Store the
  user's IANA timezone on the user row and compute `loggedFor` server-side from it. This is the
  single most common bug in streak features.
- **`shortHash` is a display id**, unique per user, 4 hex chars. Used as `#a3f9` in the UI and as an
  anchor in permalinks. Collision-check on insert and retry — 65k space per user is fine, and a
  retry loop is simpler than a bigger id.
- **`body` is markdown-lite, not markdown.** Inline code, bold, italic, and links only. No headings,
  no images, no tables. TIL entries are atomic; giving them full markdown invites essays and the
  format dies. Sanitise on render — never `dangerouslySetInnerHTML` unsanitised content.
- **Backlinks come free.** `dischargesBookmarkId` means a bookmark's inspector can show
  *"3 TILs came out of this"* with one query. Build that — it's the outcome ledger.

---

## 3. Link previews

```ts
type LinkPreview = {
  provider: "YOUTUBE"|"VIMEO"|"SPOTIFY"|"GITHUB"|"ARXIV"|"X"|"GENERIC";
  kind: "video"|"audio"|"repo"|"paper"|"post"|"article";
  url: string; canonicalUrl?: string;
  title: string; description?: string; host: string;
  thumbnailKey?: string;          // blob storage key — NOT a hotlinked third-party URL
  durationSec?: number; author?: string;
  meta: Record<string, string|number>;  // provider-specific: stars, language, pages, trackCount…
  fetchedAt: string; failed?: boolean;
};
```

**Provider registry**, same shape as the existing enrichers — reuse that interface if it exists:

```ts
interface PreviewProvider {
  matches(url: URL): boolean;
  fetch(url: URL): Promise<LinkPreview>;
  defaultDensity: "inline"|"card"|"quote"|"full";
}
```

| Provider | Source | Auth | Notes |
|---|---|---|---|
| YouTube | oEmbed for title/author/thumb, **Data API v3 `contentDetails` for duration** | key for duration | oEmbed alone gives you no runtime, and runtime is what the time filter runs on |
| Spotify | Web API, client credentials | yes | Track/playlist count and total runtime |
| GitHub | REST `/repos/{o}/{r}` + `/stats/commit_activity` | PAT | Reuse whatever the bookmark enricher already does |
| arXiv | Atom API | none | Authors, pages, year |
| X | OG tags only | none | The public API is not worth it; snapshot title + text |
| Generic | `unfurl.js` for OG/Twitter cards, Readability for read time | none | |

**Non-negotiables:**

- **Snapshot at commit, never fetch at render.** The preview is frozen into `linkPreview` when the
  entry is saved. When the link dies in two years the entry still reads as a complete thought.
- **Mirror thumbnails to blob storage.** Hotlinking a third-party image leaks the reader's IP to
  that host and breaks when they rotate CDN paths. Store the key, serve from your own domain.
- **Route every fetch through the existing SSRF guard.** Same attack surface as bookmark
  enrichment: scheme allowlist, private/loopback/link-local IP blocking, manual redirect following
  with re-validation on each hop, 5MB cap, 8s timeout.
- **Failure is not fatal.** On any failure set `failed: true` with `title = url` and render a plain
  bordered link. Never lose the entry because the preview didn't resolve.
- **Sanitise scraped strings.** Titles and descriptions come from arbitrary pages and land in your
  DOM.

---

## 4. Embed rendering

`components/til/embeds/` — one component per provider plus a density router.

**Four densities.** `inline` (chip inside a sentence) · `card` (compact row) · `quote` (bordered
quote block, for X/posts) · `full` (16:9 stage, video/audio only). Default comes from the provider;
the user overrides per link. Disable `full` for non-media.

**Hard rule: at most one FULL embed per entry.** A second link is forced to `card`. Enforce in the
composer and in the renderer. Without this, three videos in one TIL turn a scannable log into a scroll.

**Video and audio use a facade, never a live iframe.** Render our own play button over a
kind-coloured stage; mount `https://www.youtube-nocookie.com/embed/{id}?autoplay=1&rel=0` only on
click. A YouTube iframe is roughly 500KB–1MB of JS and sets third-party cookies before the user has
asked for anything. This is the `lite-youtube-embed` pattern — the perf win and the design win are
the same decision.

**Render each provider in HOARD's own language, not theirs.** GitHub becomes a repo card with a
language dot, stars, and a commit sparkline. arXiv becomes a paper card. Third-party embed widgets
bring their own radii, fonts, and shadows, and three of them in a brutalist feed destroys the design.

**CSP:** add `frame-src https://www.youtube-nocookie.com https://open.spotify.com https://player.vimeo.com`
and your blob host to `img-src`. Do this when you add the feature, not after the first CSP report.

---

## 5. Web UI

Route `/til`. Reference `hoard-til.html` for composition.

- **Composer** — type chips, body textarea, tag input, link field with live preview and density
  selector, "also save to HOARD queue" checkbox (default **off**), COMMIT button, `⌘↵` to submit.
  The type changes the composer: SNIPPET switches the textarea to mono on a code ground and reveals
  a language selector; GOTCHA changes the placeholder to *"What broke, and what the actual cause
  turned out to be."* A prompt shaped to the thought gets better entries than a blank box.
- **Feed** — grouped by `loggedFor`, date stamp on a left spine with a continuous rule, entries as
  cards with a type-coloured rail. Cursor-paginated on `(loggedFor, id)`.
- **Heatmap** — 26 weeks × 7 days, clickable to filter to a day. Counts come from **one** grouped
  query, cached for the day.
- **Streak** — current, longest, and a "streak at risk" bar that appears only when today is empty.
  Include a **skip-day allowance: two per month that preserve the streak.** Without it, the streak
  drives filler entries on days you learned nothing and the archive degrades.
- **On this day** — resurface one entry from 30/90/365 days ago with "still true?".
- **Filters** — by tag, by type, by day. URL state via nuqs, same as the library view.

---

## 6. Extension (MV3) — the new surface

Current extension saves bookmarks via `Alt+Shift+H` and a context menu. We're adding TIL capture.

### 6.1 Popup: two modes, smart default

The popup opens in **SAVE** or **TIL** mode with a segmented toggle at the top.

**Default selection is the interesting part:** on open, call `GET /api/bookmarks/lookup?url=…`
(the existing duplicate-detection endpoint). If the page **is already in the hoard**, default to
**TIL mode** and pre-tick "discharge this bookmark" — you've already saved it, you're back, so you
probably read it. If it isn't, default to **SAVE**. This closes the debt loop with zero user effort
and is the single best thing in this spec.

### 6.2 TIL mode contents

- Body textarea, autofocused.
- Type chips. Preselect by heuristic:
  - Text was selected inside a `<pre>` or `<code>` ancestor → **SNIPPET**, body prefilled with the
    selection, `codeLang` guessed from the element's `language-*` class.
  - Text selected anywhere else → **QUOTE**, body prefilled with the selection in quotes.
  - Nothing selected → **FACT**.
- Link field prefilled with the current tab URL, preview fetched from the server (see 6.5).
- **YouTube special case:** a content script reads `document.querySelector('video').currentTime`;
  if the tab is a YouTube watch page, offer a **"cite at 14:22"** toggle that appends `?t=862` to
  the stored link. Capturing the moment you learned the thing is the whole point on a 2-hour video.
- Tag input with autocomplete from the user's existing tags (cached in `chrome.storage.local`,
  refreshed daily).
- Discharge checkbox, pre-ticked per 6.1.
- `⌘↵` / `Ctrl+↵` commits and closes.

### 6.3 Commands and context menus

`manifest.json`:

```json
"commands": {
  "save-bookmark": { "suggested_key": { "default": "Alt+Shift+H" }, "description": "Save to HOARD" },
  "add-til":       { "suggested_key": { "default": "Alt+Shift+T" }, "description": "Add a TIL" }
}
```

Chrome allows four suggested-key commands; you have room. Context menu entries:

- `contexts: ["selection"]` → **"Add selection as TIL"** (skips the popup entirely, commits a QUOTE
  or SNIPPET directly with the page as the link, shows a toast)
- `contexts: ["page"]` → **"Add TIL from this page"** (opens the popup in TIL mode)
- `contexts: ["video"]` → **"TIL from this video at current time"**

### 6.4 Auth — read this before writing any of it

Do **not** rely on cookies from the web session. MV3 service workers, `SameSite`, and cross-origin
`credentials: "include"` make this fragile and it will break silently on a Chrome update.

Instead: add an **extension token** flow. A settings page in the web app issues a long-lived,
revocable token (Better-Auth's bearer/API-key plugin, or a `extension_tokens` table with a hashed
secret). The user pastes it once into the extension, it's stored in `chrome.storage.local`, and
every request sends `Authorization: Bearer <token>`. Scope the token to
`til:write bookmark:write bookmark:read` and show issued tokens with last-used timestamps in
settings so they can be revoked.

### 6.5 Offline queue — required, not optional

The service worker is not persistent, so hold nothing in memory.

1. On commit, write the entry to a `pendingTils` array in `chrome.storage.local` and close the popup
   immediately. The user never waits on the network.
2. `chrome.alarms` every 60s (plus a flush on `onStartup`) drains the queue.
3. Each item carries a client-generated `idempotencyKey`; the API upserts on it so a retry after a
   timeout can't double-post.
4. Failures after 5 attempts move to a `failedTils` list surfaced in the popup with a retry button.
   Never silently drop an entry the user wrote.
5. Link previews are resolved **server-side** — the extension posts the raw URL only. Do not fetch
   OG tags from the extension: it has no SSRF guard, it leaks the user's IP to arbitrary hosts, and
   it needs broad `host_permissions` you don't otherwise want.

### 6.6 Permissions

Add only: `alarms`, `contextMenus` (likely present), `scripting`, `activeTab`. Do **not** add
`<all_urls>` host permissions — `activeTab` plus `scripting` covers reading the selection and the
video timestamp on user gesture, and a broad host permission will slow your Web Store review and
scare users on the permission prompt.

---

## 7. API surface

| Route | Purpose |
|---|---|
| `POST /api/til` | Create. Body: `{ type, body?, code?, codeLang?, linkUrl?, linkDensity?, tags[], dischargesBookmarkId?, idempotencyKey, clientLoggedAt }` |
| `GET /api/til?cursor=&tag=&type=&day=` | Paginated feed |
| `PATCH /api/til/:id` / `DELETE /api/til/:id` | Edit / delete |
| `GET /api/til/heatmap` | Grouped day counts, cached |
| `POST /api/preview` | URL → `LinkPreview`. Rate-limited per user. Cached by canonical URL for 7 days |
| `GET /api/bookmarks/lookup?url=` | Existing duplicate-detection endpoint, reused by the popup |
| `POST /api/extension/tokens` | Issue / list / revoke extension tokens |

Web app writes go through Server Actions; the extension needs real route handlers. Share the
validation layer — one Zod schema, two callers.

---

## 8. Phases — stop after each

| Phase | Scope | Done when |
|---|---|---|
| **1** | Schema, migration, Zod schemas, timezone-correct `loggedFor`, short-hash generation | Seed 20 entries across 14 days; streak and heatmap queries return correct values for a non-UTC user |
| **2** | `/til` route: composer + feed, text-only entries, no links | Can write, edit, delete, filter by tag and type |
| **3** | Heatmap, streak with skip-days, on-this-day, stats | Streak survives a timezone change; skip-day allowance works |
| **4** | Preview provider registry + `POST /api/preview` + SSRF guard reuse + caching | GitHub, YouTube, arXiv, generic all resolve; failures degrade to a plain link |
| **5** | Embed components, four densities, video facade, one-FULL-per-entry rule | Facade mounts the iframe only on click; all five themes correct |
| **6** | Discharge flow + bookmark backlinks + discharge rate on `/stats` | Bookmark inspector shows its TILs |
| **7** | Extension token issue/revoke + settings page | Token auth works; revocation is immediate |
| **8** | Extension TIL mode, smart default, selection/code/quote heuristics, YouTube timestamp | Selecting code in a `<pre>` opens SNIPPET prefilled |
| **9** | Extension offline queue, idempotency, failed-item recovery | Commit with the network off, come back online, entry appears exactly once |
| **10** | Context menus, `Alt+Shift+T`, toasts | All three context entries work |

---

## 9. Do not do

- Do not fetch link previews from the extension or from any client component.
- Do not hotlink third-party thumbnails.
- Do not give `body` full markdown support. Atomic entries are the format; essays kill it.
- Do not derive the streak from `createdAt` in UTC.
- Do not auto-save TIL links into the bookmark queue. It must be an explicit opt-in.
- Do not add `<all_urls>` to the manifest.
- Do not add a rich-text editor. A textarea with markdown-lite is correct here.
- Do not touch the bookmark views, the importers, or the search grammar in this pass.
