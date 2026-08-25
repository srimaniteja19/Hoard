# Scratch Corkboard Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth Scratch view mode ("CORKBOARD") that renders pinned scraps as draggable cards on a canvas, with red string connecting welded pairs, and drag positions persisted per-scrap.

**Architecture:** A new pure-logic module (`src/lib/scratch/corkboard.ts`) computes fallback positions and weld-derived connection pairs. A new lightweight card component and a new board component consume it and `getPinnedScraps`. The board is wired into `page.tsx` as a fourth `viewMode`, reusing the existing `PATCH /api/scratch/:id` endpoint (via its existing entities-merge logic) for position persistence — no new API routes, no schema migration.

**Tech Stack:** Next.js (App Router), React, TypeScript, Drizzle (jsonb `entities` column), Vitest, hand-rolled pointer events (no drag library), plain CSS (`src/styles/scratch.css`).

**Spec:** `docs/superpowers/specs/2026-08-25-scratch-corkboard-design.md`

## Global Constraints

- No schema migration — new position fields live on the existing `ScrapEntities` jsonb shape (`boardX?: number; boardY?: number`).
- No new API routes — position persistence reuses `PATCH /api/scratch/:id` with `{ entities: { boardX, boardY } }`, which `updateScrap` (`src/lib/dal/scratch.ts`) already merges non-destructively into existing `entities`.
- Corkboard shows pinned scraps only (`getPinnedScraps` from `src/lib/scratch/filters.ts`).
- Red string is derived automatically from existing weld data (`scrap.weldedToId`) — no manual connection UI in this plan.
- Follow existing project conventions: pure logic in `src/lib/scratch/*.ts` with sibling `*.test.ts` files using the `mockScrap()` pattern already established in `src/lib/scratch/filters.test.ts` and `src/lib/scratch/aging.test.ts`; components use `"use client"`, `playSound` from `@/lib/sound` on interactions, and the app's existing CSS custom properties (`--ink`, `--card`, `--shelf`, `--violet`, `--b`, `--mono`, `--display`) rather than hardcoded values.

---

### Task 1: Add board position fields to `ScrapEntities`

**Files:**
- Modify: `src/db/schema.ts:603-625` (the `ScrapEntities` interface)

**Interfaces:**
- Produces: `ScrapEntities.boardX?: number`, `ScrapEntities.boardY?: number` — consumed by Task 2 and the board component in Task 4.

- [ ] **Step 1: Add the two optional fields to the interface**

In `src/db/schema.ts`, find the `ScrapEntities` interface (currently ends with `pinnedAt?: string;` before the closing brace around line 624-625) and add:

```ts
export interface ScrapEntities {
  // ...existing fields above unchanged...
  isPinned?: boolean;
  pinnedAt?: string;
  boardX?: number;
  boardY?: number;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add boardX/boardY to ScrapEntities for corkboard positioning"
```

---

### Task 2: Pure corkboard logic — position resolution and weld connections

**Files:**
- Create: `src/lib/scratch/corkboard.ts`
- Test: `src/lib/scratch/corkboard.test.ts`

**Interfaces:**
- Consumes: `ScrapRow`, `ScrapEntities` from `@/db/schema` (Task 1's `boardX`/`boardY`).
- Produces:
  - `getBoardPosition(scrap: ScrapRow, index: number): { x: number; y: number }`
  - `getWeldConnections(scraps: ScrapRow[]): Array<{ from: string; to: string }>`
  - Both consumed by `ScratchCorkboard.tsx` in Task 4.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scratch/corkboard.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getBoardPosition, getWeldConnections } from "./corkboard";
import { ScrapRow } from "@/db/schema";

function mockScrap(partial: Partial<ScrapRow>): ScrapRow {
  return {
    id: "s1",
    userId: "u1",
    content: "Sample content",
    kind: "FRAGMENT",
    color: "cyan",
    tilt: "0deg",
    notes: "",
    status: "raw",
    statusLabel: "RAW",
    promotedTo: null,
    promotedId: null,
    threadN: 0,
    threadSummary: null,
    weldedToId: null,
    loggedFor: "2026-08-23",
    occurredOn: "2026-08-23",
    entities: {},
    tags: [],
    isBuried: false,
    buriedAt: null,
    createdAt: new Date("2026-08-23T10:00:00Z"),
    updatedAt: new Date("2026-08-23T10:00:00Z"),
    ...partial,
  };
}

describe("getBoardPosition", () => {
  it("uses stored boardX/boardY when present", () => {
    const scrap = mockScrap({ entities: { boardX: 240, boardY: 80 } });
    expect(getBoardPosition(scrap, 0)).toEqual({ x: 240, y: 80 });
  });

  it("falls back to a deterministic scattered position when unset", () => {
    const scrap = mockScrap({ id: "abc-123", entities: {} });
    const a = getBoardPosition(scrap, 0);
    const b = getBoardPosition(scrap, 0);
    expect(a).toEqual(b);
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.y).toBeGreaterThanOrEqual(0);
  });

  it("gives different fallback positions to different scraps at the same index", () => {
    const a = getBoardPosition(mockScrap({ id: "aaa" }), 0);
    const b = getBoardPosition(mockScrap({ id: "zzz" }), 0);
    expect(a).not.toEqual(b);
  });

  it("only uses boardX/boardY when both are set", () => {
    const scrap = mockScrap({ entities: { boardX: 240 } });
    const fallback = getBoardPosition(mockScrap({ id: scrap.id, entities: {} }), 0);
    expect(getBoardPosition(scrap, 0)).toEqual(fallback);
  });
});

describe("getWeldConnections", () => {
  it("connects a pinned scrap to the pinned scrap it was welded onto", () => {
    const target = mockScrap({ id: "target", entities: { isPinned: true } });
    const source = mockScrap({
      id: "source",
      entities: { isPinned: true },
      weldedToId: "target",
    });
    const connections = getWeldConnections([target, source]);
    expect(connections).toEqual([{ from: "source", to: "target" }]);
  });

  it("excludes connections where the welded-to scrap is not pinned", () => {
    const target = mockScrap({ id: "target", entities: { isPinned: false } });
    const source = mockScrap({
      id: "source",
      entities: { isPinned: true },
      weldedToId: "target",
    });
    expect(getWeldConnections([target, source])).toEqual([]);
  });

  it("excludes connections where the welded-to scrap doesn't exist in the list", () => {
    const source = mockScrap({
      id: "source",
      entities: { isPinned: true },
      weldedToId: "missing",
    });
    expect(getWeldConnections([source])).toEqual([]);
  });

  it("returns no connections when weldedToId is null", () => {
    const a = mockScrap({ id: "a", entities: { isPinned: true } });
    const b = mockScrap({ id: "b", entities: { isPinned: true } });
    expect(getWeldConnections([a, b])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/scratch/corkboard.test.ts`
Expected: FAIL — `Cannot find module './corkboard'`.

- [ ] **Step 3: Implement `src/lib/scratch/corkboard.ts`**

```ts
import { ScrapRow } from "@/db/schema";

const BOARD_WIDTH = 2000;
const BOARD_HEIGHT = 1200;
const CARD_MARGIN = 40;

/**
 * Resolves a pinned scrap's position on the corkboard canvas: its stored
 * boardX/boardY if both are set, otherwise a deterministic scattered
 * fallback derived from a hash of its id so repeat visits don't jitter
 * and first-time pins aren't all stacked at the origin.
 */
export function getBoardPosition(scrap: ScrapRow, index: number): { x: number; y: number } {
  const { boardX, boardY } = scrap.entities || {};
  if (typeof boardX === "number" && typeof boardY === "number") {
    return { x: boardX, y: boardY };
  }

  const seed = `${scrap.id}:${index}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  const usableWidth = BOARD_WIDTH - CARD_MARGIN * 2;
  const usableHeight = BOARD_HEIGHT - CARD_MARGIN * 2;

  return {
    x: CARD_MARGIN + (hash % usableWidth),
    y: CARD_MARGIN + ((hash >> 8) % usableHeight),
  };
}

/**
 * Derives red-string pairs from existing weld data: a scrap's weldedToId
 * points at the scrap it was welded onto. Only pairs where BOTH scraps
 * are currently pinned (and therefore both on the board) are returned.
 */
export function getWeldConnections(scraps: ScrapRow[]): Array<{ from: string; to: string }> {
  const pinnedIds = new Set(
    scraps.filter((s) => Boolean(s.entities?.isPinned)).map((s) => s.id)
  );

  const connections: Array<{ from: string; to: string }> = [];
  for (const scrap of scraps) {
    if (!scrap.weldedToId) continue;
    if (!pinnedIds.has(scrap.id)) continue;
    if (!pinnedIds.has(scrap.weldedToId)) continue;
    connections.push({ from: scrap.id, to: scrap.weldedToId });
  }
  return connections;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/scratch/corkboard.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scratch/corkboard.ts src/lib/scratch/corkboard.test.ts
git commit -m "feat: add corkboard position and weld-connection helpers"
```

---

### Task 3: `ScratchCorkboardCard` component

**Files:**
- Create: `src/components/scratch/ScratchCorkboardCard.tsx`

**Interfaces:**
- Consumes: `ScrapRow` from `@/db/schema`; `playSound` from `@/lib/sound`.
- Produces: `ScratchCorkboardCard` React component with props:
  ```ts
  interface ScratchCorkboardCardProps {
    scrap: ScrapRow;
    x: number;
    y: number;
    onPointerDownDrag: (id: string, e: React.PointerEvent) => void;
    onOpen: (scrap: ScrapRow) => void;
  }
  ```
  Consumed by `ScratchCorkboard.tsx` in Task 4. `onPointerDownDrag` and `onOpen` are owned/implemented by the parent (drag-move/up handling lives in `ScratchCorkboard`, not the card, so one set of listeners handles all cards).

- [ ] **Step 1: Implement the component**

```tsx
"use client";

import React from "react";
import { ScrapRow } from "@/db/schema";
import { playSound } from "@/lib/sound";

interface ScratchCorkboardCardProps {
  scrap: ScrapRow;
  x: number;
  y: number;
  onPointerDownDrag: (id: string, e: React.PointerEvent) => void;
  onOpen: (scrap: ScrapRow) => void;
}

export const ScratchCorkboardCard: React.FC<ScratchCorkboardCardProps> = ({
  scrap,
  x,
  y,
  onPointerDownDrag,
  onOpen,
}) => {
  const preview = scrap.content.length > 120 ? `${scrap.content.slice(0, 117)}...` : scrap.content;

  return (
    <div
      className="corkboard-card"
      style={
        {
          left: `${x}px`,
          top: `${y}px`,
          "--c": `var(--${scrap.color || "cyan"})`,
          "--tilt": scrap.tilt || "0deg",
        } as React.CSSProperties
      }
      onPointerDown={(e) => onPointerDownDrag(scrap.id, e)}
      onClick={() => {
        playSound.click();
        onOpen(scrap);
      }}
    >
      <span className="corkboard-card__pin" aria-hidden="true" />
      <span className="corkboard-card__kind">{scrap.kind}</span>
      <div className="corkboard-card__body">{preview}</div>
    </div>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (component isn't used yet, so no unused-import warnings from consumers).

- [ ] **Step 3: Commit**

```bash
git add src/components/scratch/ScratchCorkboardCard.tsx
git commit -m "feat: add ScratchCorkboardCard component"
```

---

### Task 4: `ScratchCorkboard` board component

**Files:**
- Create: `src/components/scratch/ScratchCorkboard.tsx`

**Interfaces:**
- Consumes:
  - `getPinnedScraps` from `@/lib/scratch/filters` (signature: `(scraps: ScrapRow[]) => ScrapRow[]`, confirmed in `src/lib/scratch/filters.ts:18-20`).
  - `getBoardPosition`, `getWeldConnections` from `@/lib/scratch/corkboard` (Task 2).
  - `ScratchCorkboardCard` from `./ScratchCorkboardCard` (Task 3).
  - `ScratchNoteModal` from `./ScratchNoteModal` (existing component; props confirmed via its usage in `ScratchCard.tsx:969-979`: `isOpen`, `scrap`, `notes`, `initialMode`, `isPinned`, `onTogglePin`, `onUpdateNotes`, `onClose`, `onPromoteTil`).
  - `playSound` from `@/lib/sound`.
- Produces: `ScratchCorkboard` React component with props:
  ```ts
  interface ScratchCorkboardProps {
    scraps: ScrapRow[];
    onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
    onPromoteTil: (id: string) => Promise<void> | void;
    onTogglePin: (id: string) => Promise<void> | void;
    onUpdatePosition: (id: string, x: number, y: number) => Promise<void> | void;
  }
  ```
  Consumed by `page.tsx` in Task 5. (`onPromoteTodo`, `onWeld`, `onBury` are intentionally omitted from this component's props — the corkboard's only editing surface is the note modal, which doesn't expose those actions either; see `ScratchNoteModal`'s prop list above.)

- [ ] **Step 1: Implement the component**

```tsx
"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { ScrapRow } from "@/db/schema";
import { getPinnedScraps } from "@/lib/scratch/filters";
import { getBoardPosition, getWeldConnections } from "@/lib/scratch/corkboard";
import { ScratchCorkboardCard } from "./ScratchCorkboardCard";
import { ScratchNoteModal } from "./ScratchNoteModal";
import { playSound } from "@/lib/sound";

interface ScratchCorkboardProps {
  scraps: ScrapRow[];
  onUpdateNotes: (id: string, notes: string) => Promise<void> | void;
  onPromoteTil: (id: string) => Promise<void> | void;
  onTogglePin: (id: string) => Promise<void> | void;
  onUpdatePosition: (id: string, x: number, y: number) => Promise<void> | void;
}

const POSITION_SAVE_DEBOUNCE_MS = 400;

export const ScratchCorkboard: React.FC<ScratchCorkboardProps> = ({
  scraps,
  onUpdateNotes,
  onPromoteTil,
  onTogglePin,
  onUpdatePosition,
}) => {
  const pinnedScraps = useMemo(() => getPinnedScraps(scraps), [scraps]);
  const connections = useMemo(() => getWeldConnections(pinnedScraps), [pinnedScraps]);

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [modalScrap, setModalScrap] = useState<ScrapRow | null>(null);

  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const canvasRef = useRef<HTMLDivElement>(null);

  const resolvePosition = useCallback(
    (scrap: ScrapRow, index: number) => positions[scrap.id] || getBoardPosition(scrap, index),
    [positions]
  );

  const handlePointerDownDrag = useCallback(
    (id: string, e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      const scrap = pinnedScraps.find((s) => s.id === id);
      const index = pinnedScraps.findIndex((s) => s.id === id);
      if (!scrap) return;
      const current = resolvePosition(scrap, index);

      dragRef.current = {
        id,
        offsetX: e.clientX - canvasRect.left - current.x,
        offsetY: e.clientY - canvasRect.top - current.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pinnedScraps, resolvePosition]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const x = Math.max(0, e.clientX - canvasRect.left - drag.offsetX);
    const y = Math.max(0, e.clientY - canvasRect.top - drag.offsetY);
    setPositions((prev) => ({ ...prev, [drag.id]: { x, y } }));
  }, []);

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    const finalPos = positions[drag.id];
    if (!finalPos) return;

    if (saveTimersRef.current[drag.id]) {
      clearTimeout(saveTimersRef.current[drag.id]);
    }
    saveTimersRef.current[drag.id] = setTimeout(() => {
      void onUpdatePosition(drag.id, finalPos.x, finalPos.y);
    }, POSITION_SAVE_DEBOUNCE_MS);
  }, [positions, onUpdatePosition]);

  if (pinnedScraps.length === 0) {
    return (
      <div className="scratch-empty-state">
        <div className="scratch-empty-icon">📌</div>
        <div className="scratch-empty-title">NOTHING PINNED TO THE BOARD YET</div>
        <div className="scratch-empty-desc">
          Click the paperclip 📎 icon on any card in The Shelf to pin it here.
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="corkboard-canvas"
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg className="corkboard-strings" aria-hidden="true">
          {connections.map((conn) => {
            const fromScrap = pinnedScraps.find((s) => s.id === conn.from);
            const toScrap = pinnedScraps.find((s) => s.id === conn.to);
            if (!fromScrap || !toScrap) return null;
            const fromIdx = pinnedScraps.indexOf(fromScrap);
            const toIdx = pinnedScraps.indexOf(toScrap);
            const fromPos = resolvePosition(fromScrap, fromIdx);
            const toPos = resolvePosition(toScrap, toIdx);
            return (
              <line
                key={`${conn.from}-${conn.to}`}
                x1={fromPos.x + 90}
                y1={fromPos.y + 40}
                x2={toPos.x + 90}
                y2={toPos.y + 40}
              />
            );
          })}
        </svg>

        {pinnedScraps.map((scrap, index) => {
          const pos = resolvePosition(scrap, index);
          return (
            <ScratchCorkboardCard
              key={scrap.id}
              scrap={scrap}
              x={pos.x}
              y={pos.y}
              onPointerDownDrag={handlePointerDownDrag}
              onOpen={(s) => {
                playSound.click();
                setModalScrap(s);
              }}
            />
          );
        })}
      </div>

      {modalScrap && (
        <ScratchNoteModal
          isOpen={Boolean(modalScrap)}
          scrap={modalScrap}
          notes={modalScrap.notes || ""}
          isPinned={true}
          onTogglePin={onTogglePin}
          onUpdateNotes={onUpdateNotes}
          onClose={() => setModalScrap(null)}
          onPromoteTil={onPromoteTil}
        />
      )}
    </>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/scratch/ScratchCorkboard.tsx
git commit -m "feat: add ScratchCorkboard board component with drag and red string"
```

---

### Task 5: Corkboard CSS

**Files:**
- Modify: `src/styles/scratch.css` (append near the end, after the séance block added in the previous commit — search for `/* ══ THE SHEET ══ */` and insert before it, matching where the séance CSS was placed)

**Interfaces:**
- Consumes: existing custom properties `--ink`, `--card`, `--shelf`, `--b`, `--mono`, `--display`, `--violet`, `--yellow` already defined at the top of `scratch.css`.
- Produces: `.corkboard-canvas`, `.corkboard-strings`, `.corkboard-card` and its children — consumed by the JSX in Task 3 and Task 4.

- [ ] **Step 1: Add the CSS block**

Insert into `src/styles/scratch.css`, before the `/* ══ THE SHEET ══ */` comment:

```css
/* ── CORKBOARD ── */
.corkboard-canvas {
  position: relative;
  width: 2000px;
  height: 1200px;
  overflow: auto;
  border: var(--b) solid var(--ink);
  background-color: var(--shelf);
  background-image: radial-gradient(rgba(10, 10, 10, 0.12) 1.5px, transparent 1.5px);
  background-size: 18px 18px;
  touch-action: none;
}

.corkboard-strings {
  position: absolute;
  top: 0;
  left: 0;
  width: 2000px;
  height: 1200px;
  pointer-events: none;
}
.corkboard-strings line {
  stroke: var(--violet);
  stroke-width: 2.5;
  opacity: 0.7;
}

.corkboard-card {
  position: absolute;
  width: 180px;
  border: var(--b) solid var(--ink);
  background: var(--card);
  box-shadow: 4px 4px 0 var(--ink);
  padding: 10px 12px;
  cursor: grab;
  transform: rotate(var(--tilt, 0deg));
  transition: box-shadow 0.1s;
  user-select: none;
}
.corkboard-card:active {
  cursor: grabbing;
  box-shadow: 6px 6px 0 var(--violet);
}
.corkboard-card__pin {
  position: absolute;
  top: -9px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--c);
  border: 2px solid var(--ink);
}
.corkboard-card__kind {
  display: block;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  opacity: 0.6;
  margin-bottom: 4px;
  color: var(--ink);
}
.corkboard-card__body {
  font-family: var(--display);
  font-size: 13px;
  line-height: 1.35;
  color: var(--ink);
}
```

- [ ] **Step 2: Visually sanity-check the class names match the components**

Run: `grep -n "corkboard-canvas\|corkboard-strings\|corkboard-card" src/components/scratch/ScratchCorkboard.tsx src/components/scratch/ScratchCorkboardCard.tsx src/styles/scratch.css`
Expected: every class used in the two TSX files appears in `scratch.css`.

- [ ] **Step 3: Commit**

```bash
git add src/styles/scratch.css
git commit -m "style: add corkboard canvas and card styles"
```

---

### Task 6: Wire Corkboard into the Scratch page

**Files:**
- Modify: `src/app/(app)/scratch/page.tsx:14` (imports)
- Modify: `src/app/(app)/scratch/page.tsx:28` (`viewMode` state type)
- Modify: `src/app/(app)/scratch/page.tsx:439-475` (view switcher buttons)
- Modify: `src/app/(app)/scratch/page.tsx:594-604` (view rendering — insert corkboard branch)

**Interfaces:**
- Consumes: `ScratchCorkboard` from `@/components/scratch/ScratchCorkboard` (Task 4); existing handlers already defined in `page.tsx`: `handleUpdateNotes`, `handlePromoteTil`, `handleTogglePin` (all already passed to `ScratchPinnedView` at line 596-604, same signatures reused here).
- Produces: a new `handleUpdatePosition(id: string, x: number, y: number)` handler, passed to `ScratchCorkboard` as `onUpdatePosition`.

- [ ] **Step 1: Add the import**

In `src/app/(app)/scratch/page.tsx`, after the existing `ScratchSeance` import (line 14):

```ts
import { ScratchSeance } from "@/components/scratch/ScratchSeance";
import { ScratchCorkboard } from "@/components/scratch/ScratchCorkboard";
```

- [ ] **Step 2: Widen the `viewMode` type**

Change line 28 from:

```ts
const [viewMode, setViewMode] = useState<"stream" | "pinned" | "logbook">("stream");
```

to:

```ts
const [viewMode, setViewMode] = useState<"stream" | "pinned" | "logbook" | "corkboard">("stream");
```

- [ ] **Step 3: Add the `handleUpdatePosition` handler**

Add this near the other handlers — directly after `handleTogglePin` (which ends around line 348 with its closing `};`, right before `const pinnedCount = useMemo(...)`):

```ts
  // 13. Persist a scrap's dragged corkboard position
  const handleUpdatePosition = async (id: string, x: number, y: number) => {
    // Optimistic — the corkboard component already updates its own local
    // position state on drag, so this just needs to persist silently.
    try {
      const res = await fetch(`/api/scratch/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entities: { boardX: x, boardY: y } }),
      });

      if (res.ok) {
        const updated: ScrapRow = await res.json();
        setScraps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      }
    } catch (err) {
      console.error("Failed to save corkboard position", err);
    }
  };
```

- [ ] **Step 4: Add the fourth view-switcher button**

In the `.views` div (lines 439-475), after the LOGBOOK button (before the closing `</div>` of `.views`):

```tsx
              <button
                type="button"
                data-v="corkboard"
                aria-pressed={viewMode === "corkboard"}
                onClick={() => {
                  playSound.click();
                  setViewMode("corkboard");
                }}
              >
                📌 CORKBOARD
              </button>
```

- [ ] **Step 5: Render the corkboard view**

Change the ternary chain around lines 594-605 from:

```tsx
          ) : viewMode === "pinned" ? (
            /* ═══ PINNED VIEW: DEDICATED PINBOARD & DOCKET ═══ */
            <ScratchPinnedView
              scraps={scraps}
              onUpdateNotes={handleUpdateNotes}
              onPromoteTil={handlePromoteTil}
              onPromoteTodo={handlePromoteTodo}
              onWeld={handleOpenWeldModal}
              onBury={handleBury}
              onTogglePin={handleTogglePin}
            />
          ) : (
```

to:

```tsx
          ) : viewMode === "pinned" ? (
            /* ═══ PINNED VIEW: DEDICATED PINBOARD & DOCKET ═══ */
            <ScratchPinnedView
              scraps={scraps}
              onUpdateNotes={handleUpdateNotes}
              onPromoteTil={handlePromoteTil}
              onPromoteTodo={handlePromoteTodo}
              onWeld={handleOpenWeldModal}
              onBury={handleBury}
              onTogglePin={handleTogglePin}
            />
          ) : viewMode === "corkboard" ? (
            /* ═══ CORKBOARD VIEW: PINNED SCRAPS ON A DRAGGABLE CANVAS ═══ */
            <ScratchCorkboard
              scraps={scraps}
              onUpdateNotes={handleUpdateNotes}
              onPromoteTil={handlePromoteTil}
              onTogglePin={handleTogglePin}
              onUpdatePosition={handleUpdatePosition}
            />
          ) : (
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (no test touches `page.tsx` directly, so this just guards against accidental breakage elsewhere).

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/scratch/page.tsx"
git commit -m "feat: wire Corkboard as a fourth Scratch view mode"
```

---

### Task 7: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Sign in and navigate to `/scratch`**

- [ ] **Step 3: Pin at least two scraps** via the paperclip icon on any Shelf card, then click the new **📌 CORKBOARD** tab.

Expected: the two pinned scraps render as cards scattered on a dotted cork-textured canvas; clicking CORKBOARD toggles `aria-pressed` correctly (same as the other three tabs).

- [ ] **Step 4: Drag a card**

Expected: the card follows the pointer smoothly; after releasing, reload the page and re-open CORKBOARD — the card should be back where you dropped it (confirms the debounced `PATCH` persisted `boardX`/`boardY`).

- [ ] **Step 5: Weld two pinned scraps, then check for red string**

Use the WELD action from the Stream view on two scraps that are both pinned, confirm the weld via the modal (this now hits the fixed `/api/scratch/:id/weld` endpoint), then return to CORKBOARD.

Expected: a violet line connects the two cards.

- [ ] **Step 6: Click a card**

Expected: the existing `ScratchNoteModal` opens for that scrap, same as clicking a card elsewhere in the app.

- [ ] **Step 7: Check the browser console**

Expected: no errors during any of the above steps.
