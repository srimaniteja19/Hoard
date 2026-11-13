# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single primary owner using Hoard as a personal daily workbench for technical learning, reading, studying, and writing. Signin-only single-tenant deployment today (with `userId`-scoped schema prepared if multi-user access is ever opened later).

## Product Purpose

Hoard exists to turn captured links, courses, reading, and fleeting notes into lasting, retrievable personal knowledge and finished output—closing the loop from capture to comprehension to synthesis without read-later guilt or performative progress tracking.

## Positioning

A **closed-loop personal learning OS** rather than a passive bookmark bin or blank-page workspace:
- **Capture & Retrieve by Real Usage (Library / Reader / Home):** Bookmarks operate as a living reference library ranked and surfaced by real usage (`useCount`, `lastUsedAt`, `NEVER OPENED`), not an ever-growing queue of shame.
- **Active Study Without Illusion (Notebooks):** Courses and topics distinguish watched material from actually written notes (`WRITTEN` vs. `WATCHED, UNWRITTEN`), surface cross-course concept collisions, and ground AI study aids (diffs, quizzes, flashcards) in the learner's own material rather than fabricating progress.
- **Distill & Publish (TIL / Studio):** Atomic learnings (`fact` / `connects` insights, reading notes, daily captures) flow into a daily engineering chronicle (`/til`) and structured long-form pieces/series (`/studio`), alongside supporting personal workbench surfaces (Todos, Scratch, Marginalia, Atlas, Ledger, Channel 100).

## Operating Context

- **Surfaces & Clients:** Responsive Next.js web application (desktop and mobile PWA with Web Share Target and offline caching) paired with a Manifest V3 Chrome extension (`extension/`) for quick tab capture (`Alt+Shift+H` / `Cmd+Shift+H`), context-menu saving, and popup search.
- **Daily Rituals:** Fast capture via extension, Home Wire, or Reader; daily edition review on `/`; focused study sessions in `/notebooks`; atomic logging in `/til`; drafting and series planning in `/studio`.

## Capabilities and Constraints

- **Architecture & Data:** Next.js App Router + TypeScript, Drizzle ORM, Better Auth, PostgreSQL (Neon), plus offline/local resilience where supported (e.g., Notebooks local queue and sync).
- **Security & Portability:** Mandatory 5-layer SSRF guard for URL metadata enrichment, per-user save rate limiting, server-action session checks, and full JSON/CSV data export (`/api/export`).
- **Rendering & Performance:** Server-rendered data-ink covers in Library with zero per-card network calls at render time and graceful degradation when metadata is sparse.
- **Accessibility & Scope Boundaries:** Undecided whether formal WCAG AA compliance is binding across every surface; keyboard efficiency and responsive mobile usability are active priorities across the workbench.

## Brand Commitments

- **Name:** HOARD
- **Voice & Tone:** Direct, candid, anti-bloat, and practitioner-oriented—built for an owner who values signal over fluff (e.g., naming unwritten lessons plainly rather than hiding gaps).

## Evidence on Hand

- Implemented web application routes across `/`, `/library`, `/reader`, `/notebooks`, `/til`, `/studio`, `/todos`, `/scratch`, `/marginalia`, `/atlas`, `/ledger`, `/stats`, and `/channel100`.
- Product and feature specifications on disk: `README.md`, `SPEC.md`, `HOME.md`, `LIBRARY.md`, `STUDIO.md`, `TIL-SPEC.md`, `DESIGN-V2.md`, `COVERS.md`, `SPECTACLE.md`.
- Manifest V3 browser extension source under `extension/`.
- **Must not be fabricated:** No public customer testimonials, external user case studies, SaaS pricing tiers, or commercial launch claims exist for this personal workbench.

## Product Principles

1. **Close the loop from input to output:** Capture, reading, study, and publishing should feed each other—highlights and notebook takeaways naturally graduate into TILs and Studio drafts.
2. **Measure real engagement, not hoarding:** Rank and surface references by actual opens and written synthesis rather than raw save counts or overdue-queue guilt.
3. **Never hide knowledge gaps:** Distinguish passive consumption from written understanding, and refuse to generate fake mastery (e.g., quizzes without source notes).
4. **Keep the owner in control of edits and data:** AI assistance proposes reviewable diffs rather than silent overwrites, and all user data remains exportable.
5. **Respect speed and low-friction capture:** Minimize round trips, allow keyboard-first navigation and quick capture from browser/PWA share targets, and tolerate imperfect metadata or offline moments gracefully.

