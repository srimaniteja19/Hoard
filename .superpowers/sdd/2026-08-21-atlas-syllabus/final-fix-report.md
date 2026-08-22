# Atlas streaming final-fix report

## Status

DONE

## Changes

- C1: Weeks are emitted only after `id`, `label`, and numeric `estimatedMinutes` are complete.
- C3: Cover emits once, after the first complete week or at stream end; cover events no longer trigger partial persistence.
- I4: Stations are emitted only after `required` is boolean, preserving `required: false`.
- C2: Live data overlays server records only during filing, and successful completion removes the live entry while stream errors retain it for retry.
- I5: Reloaded incomplete drafts with stations show **Retry rest** when weeks are short or the syllabus is thin, using `Filing stopped short.` when no stream error exists.

## TDD evidence

### RED

Command:

`npx vitest run src/lib/atlas/partial.test.ts`

Result: exit 1. Two expected failures:

- Week without `estimatedMinutes` was incorrectly included (`w2`).
- Stations with missing/non-boolean `required` were incorrectly included and defaulted to `true`.

### GREEN

Command:

`npx vitest run src/lib/atlas/partial.test.ts`

Result: exit 0, 1 test file passed, 5 tests passed.

## Final verification

- `npx vitest run src/lib/atlas` — exit 0, 8 files passed, 44 tests passed.
- `npx tsc --noEmit` — exit 0.
- `npx eslint src/lib/atlas/generate.ts src/lib/atlas/partial.ts src/lib/atlas/partial.test.ts src/hooks/useAtlas.ts src/components/atlas/AtlasDrawer.tsx` — exit 0.

## Files

- `src/lib/atlas/partial.ts`
- `src/lib/atlas/partial.test.ts`
- `src/lib/atlas/generate.ts`
- `src/hooks/useAtlas.ts`
- `src/components/atlas/AtlasDrawer.tsx`
- `.superpowers/sdd/2026-08-21-atlas-syllabus/final-fix-report.md`

## Self-review

- Confirmed cover persistence occurs only on week/station events plus the final save.
- Confirmed `done` notifies active listeners before removing the live entry, allowing the hook to reload the persisted server record.
- Confirmed `error` retains the live entry and streamed stations for in-session retry.
- Confirmed no schema, migration, regenerate wipe, Home chip, or parser-nit changes.

## Concerns

No functional concerns. Vitest reports the repository's existing Vite native-config compatibility warning; tests still pass.
