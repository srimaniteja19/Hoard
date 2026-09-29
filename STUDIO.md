# STUDIO

A simple workspace for OddlyInteresting content: ideas, series, and pieces (Reels, carousels, YouTube), from script to a caption ready for Buffer. Scheduling stays in Buffer.

## What it does

- **Pieces** (`/studio`): every piece grouped by status: Writing, Recording, Making, Ready for Buffer, Posted. Each series shows as a strip of parts at the top, with the next part highlighted.
- **Piece editor**: title, status, format, topic, series and part, optional cover image link.
  - Script: one box per scene, with checks for length (Reels 45 to 60s, YouTube 3 to 5 min), em dashes and the follow and share line.
  - Caption and hashtags: checks the 2,200 character limit, Instagram's 5 hashtags and the follow and share line. "Copy for Buffer" copies the caption plus the first 5 hashtags.
  - "Copy voice script" for ElevenLabs (Jeff), with a spoken pause after "Pause and guess".
  - "Copy brief" builds a production brief (script, title cards, series theme, house rules, sources, notes) to paste into Claude.
  - Sources and notes.
- **Series**: create a series with a visual theme, add, rename, reorder and remove parts, set which part is next, and start or open the piece for each part. A progress bar shows posted, ready, in progress and planned parts.
- **Ideas**: quick capture with a topic; "Start" turns an idea into a piece.
- **Paste everything** (header button, or "Paste into piece" in the editor): paste Claude's whole reply, a Studio block, or JSON, and Studio sorts it into place.
  - Reads title, series and part, status, format, topic, script scenes with title cards, caption, Instagram hashtags, TikTok / YouTube hashtags, sources (markdown links, `Title: url`, bare links) and notes.
  - Picks the destination: the piece already in that series part, else a piece with the same title, else a new piece. You can switch to "Create a new piece".
  - Every detected field has a checkbox, and fields that would overwrite existing content are marked "replaces".
  - Puts the piece in its series part (creating the series if you want), and moves "next" along when the piece is ready or posted.
  - "Copy as block" exports a piece in the same format, and "Copy brief" now asks Claude to finish with a Studio block.
- **Captions per platform**: "Copy for Instagram" (caption plus up to 5 hashtags) and "Copy for TikTok / YouTube" (caption plus the longer set).

## Data

Migration `drizzle/0032_add_studio.sql` adds three tables, all scoped by `user_id`, and `drizzle/0033_add_studio_extra_hashtags.sql` adds `studio_pieces.extra_hashtags` for the TikTok / YouTube set:

- `studio_series`: title, theme, pillar, `parts` (jsonb: `{ n, title, summary, pieceId }[]`), `next_part`.
- `studio_pieces`: title, status, format, pillar, `series_id` (set null when the series is deleted), `part`, `script` (jsonb scenes), caption, hashtags, `sources` (jsonb), notes, `cover_url`.
- `studio_ideas`: title, hook, pillar, format, status (`new` | `started`).

## Code

- API: `GET/POST /api/studio`, `PATCH/DELETE /api/studio/[kind]/[id]` where kind is `pieces`, `series` or `ideas` (zod-validated in `src/lib/studio/validate.ts`).
- Data access: `src/lib/dal/studio.ts`. Deleting a piece unlinks it from its series part; deleting a series keeps its pieces.
- Client: `src/hooks/useStudio.ts` (optimistic updates, typing saves after a 600 ms pause, pending saves flushed on page hide), `src/components/studio/*`.
- Pure logic with tests: `src/lib/studio/checks.ts`, `src/lib/studio/series.ts` and `src/lib/studio/paste.ts` (the paste parser, routing and Studio block format).
- Styles: `src/styles/studio.css`, built on the theme tokens so every HOARD theme applies.

## Setup

```bash
npm run db:migrate
SEED_TARGET_USER_EMAIL=you@example.com npm run seed:studio   # optional: loads the Prediction Markets series, pieces and ideas
```

## The Studio block

```
=== STUDIO ===
Title: <piece title>
Series: <series name>
Part: <number>
Format: reel | carousel | youtube | short
Topic: finance | sports | tech | world | concepts | psych | sites | tools | repos
Status: writing | recording | making | ready | posted

## Script
<scene text>
[cards: TITLE CARD / TITLE CARD]

## Caption
## Instagram hashtags
## TikTok / YouTube hashtags
## Sources
## Notes
=== END ===
```

Headings are forgiving (`**Caption**`, `Caption:`, `**Instagram (5):** #a #b` all work), and quoted (`>`) lines are used for the script and caption when present, so a normal Claude reply pastes cleanly too.
