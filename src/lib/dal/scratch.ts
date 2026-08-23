import { db } from "@/db";
import { scraps, ScrapRow, NewScrapRow, ScrapKind, ScrapStatus, todos, tilEntries } from "@/db/schema";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import { parseSlabText, getDeterministicTilt } from "@/lib/scratch/parse";
import { generateShortHash, getLoggedForDate, getUserTimezone } from "@/lib/dal/til";
import { parseTodo } from "@/lib/todos/parse";
import crypto from "crypto";

export const SAMPLE_NOTE_MARKDOWN = `# The invisible-state pattern

Three bugs this month, three different stacks, **one shape**. Writing it out to see whether it's really one thing or three coincidences wearing a hat.

## What actually happened

| Where | Symptom | Real cause |
| --- | --- | --- |
| CSS | blend mode went muddy | ancestor made a stacking context |
| Postgres | duplicates past a unique index | NULL isn't equal to NULL |
| NestJS | provider "not found" | imported but never exported |

:::gotcha The tell is always the same
None of the three errors *named* the thing that was wrong. Each described a symptom at the layer where it surfaced, not the layer where the state lived.
:::

## Why it keeps happening

The common factor is a container that is ==implicit==. You never wrote \`isolation: isolate\`; an ancestor's \`opacity: 0.98\` created one. You never declared NULL semantics; the standard did. You never wrote the export list; the module did, by omission.

> The bug isn't in the code you're reading. It's in the code you didn't have to write.

### Would have caught it

- [x] Reading the spec rather than the tutorial
- [x] Reproducing in isolation first
- [ ] A lint rule for stacking-context creators
- [ ] Finishing the Postgres atlas
  - week 1 is still at 0/5
  - the EXPLAIN station is the one that matters here

## The fix, in one place

\`\`\`css
/* stop fighting the ancestor — own the context */
.card {
  isolation: isolate;   /* the blend now has a known backdrop */
}
.ghost {
  mix-blend-mode: multiply;
}
\`\`\`

:::action Next
Write the lint rule as a 45-minute make station. Anything setting opacity, transform, filter, or will-change on a container gets flagged. #css #atlas
:::

---

:::question Still open
Is "invisible state" a real category, or am I pattern-matching three unrelated things because I want a tidy story? Ask again in a month — if a fourth lands, it's real.
:::`;

export const STARTER_SCRAPS = [
  {
    content: "Why does every hard bug this month come down to something invisible holding state?",
    kind: "QUESTION" as ScrapKind,
    color: "violet",
    tilt: "-.5deg",
    notes: SAMPLE_NOTE_MARKDOWN,
    status: "pages" as ScrapStatus,
    statusLabel: "NOTES · 412 WORDS",
    threadN: 3,
    threadSummary: "stacking contexts · transaction boundaries · the module graph",
    daysAgo: 0,
    time: "09:14",
  },
  {
    content: 'The library is a #reference library, not a queue — so "unread" is the wrong word for most of it. Rename it? "Unreached"?',
    kind: "FRAGMENT" as ScrapKind,
    color: "cyan",
    tilt: ".4deg",
    notes: "",
    status: "raw" as ScrapStatus,
    statusLabel: "RAW",
    threadN: 0,
    threadSummary: null,
    daysAgo: 0,
    time: "08:52",
  },
  {
    content: "→ Try rendering the ghost layer with isolation: isolate on the card instead of fighting the ancestor.",
    kind: "ACTION" as ScrapKind,
    color: "lime",
    tilt: "-.3deg",
    notes: "",
    status: "done" as ScrapStatus,
    statusLabel: "→ FILED TO TODOS",
    promotedTo: "TODO",
    threadN: 0,
    threadSummary: null,
    daysAgo: 0,
    time: "08:30",
  },
  {
    content: '> "A distributed system is one where a machine you\'ve never heard of can stop yours from working."',
    kind: "QUOTE" as ScrapKind,
    color: "yellow",
    tilt: ".55deg",
    notes: "",
    status: "done" as ScrapStatus,
    statusLabel: "→ MINTED AS TIL 0291",
    promotedTo: "TIL",
    threadN: 0,
    threadSummary: null,
    daysAgo: 0,
    time: "07:41",
  },
  {
    content: "!! Every weekly gazette I've generated congratulates me. A review that can only go up isn't a review.",
    kind: "RANT" as ScrapKind,
    color: "pink",
    tilt: "-.4deg",
    notes: "",
    status: "done" as ScrapStatus,
    statusLabel: "→ SHIPPED",
    promotedTo: "SHIPPED",
    threadN: 0,
    threadSummary: null,
    daysAgo: 1,
    time: "21:08",
  },
  {
    content: "Wear as a data encoding — a thing you've opened forty times should look handled. Dog-ear, edge grime. Where else does this apply? #design",
    kind: "IDEA" as ScrapKind,
    color: "cyan",
    tilt: ".35deg",
    notes: `## Where wear could apply

- **Library cards** — dog-ear scales with reach count *(shipped)*
- **Atlas stations** — a station you've revisited looks worn, one you skimmed doesn't
- **TIL claims** — already doing this as decay, but decay is the *inverse*

:::question Worth testing
Is wear better than a number? A count is precise; wear is glanceable. Probably both, with wear as the primary and the count on hover.
:::`,
    status: "raw" as ScrapStatus,
    statusLabel: "RAW · 1 DAY",
    threadN: 0,
    threadSummary: null,
    daysAgo: 1,
    time: "19:22",
  },
  {
    content: "Anti-scope should accumulate from what you skip, not be guessed once at generation time.",
    kind: "FRAGMENT" as ScrapKind,
    color: "violet",
    tilt: "-.25deg",
    notes: "",
    status: "raw" as ScrapStatus,
    statusLabel: "RAW · 1 DAY",
    threadN: 0,
    threadSummary: null,
    daysAgo: 1,
    time: "14:07",
  },
  // Stale compost items for demonstrations
  {
    content: "maybe collections should have covers?",
    kind: "FRAGMENT" as ScrapKind,
    color: "orange",
    tilt: ".2deg",
    notes: "",
    status: "raw" as ScrapStatus,
    statusLabel: "RAW · 65 DAYS",
    threadN: 0,
    threadSummary: null,
    daysAgo: 70,
    time: "11:20",
  },
  {
    content: "ask claude to write the anti-scope for me",
    kind: "FRAGMENT" as ScrapKind,
    color: "orange",
    tilt: "-.3deg",
    notes: "",
    status: "raw" as ScrapStatus,
    statusLabel: "RAW · 82 DAYS",
    threadN: 0,
    threadSummary: null,
    daysAgo: 82,
    time: "16:45",
  },
  {
    content: 'the word "hoard" is doing a lot of work here',
    kind: "FRAGMENT" as ScrapKind,
    color: "orange",
    tilt: ".45deg",
    notes: "",
    status: "raw" as ScrapStatus,
    statusLabel: "RAW · 87 DAYS",
    threadN: 0,
    threadSummary: null,
    daysAgo: 87,
    time: "10:12",
  },
];

export async function seedDefaultScrapsIfEmpty(userId: string, timezone: string = "UTC"): Promise<void> {
  const existing = await db
    .select({ id: scraps.id })
    .from(scraps)
    .where(eq(scraps.userId, userId))
    .limit(1);

  if (existing.length > 0) return;

  const now = new Date();

  for (const s of STARTER_SCRAPS) {
    const itemDate = new Date(now.getTime() - s.daysAgo * 24 * 60 * 60 * 1000);
    const loggedFor = itemDate.toISOString().slice(0, 10);

    await db.insert(scraps).values({
      userId,
      content: s.content,
      kind: s.kind,
      color: s.color,
      tilt: s.tilt,
      notes: s.notes || "",
      status: s.status,
      statusLabel: s.statusLabel,
      promotedTo: s.promotedTo || null,
      threadN: s.threadN,
      threadSummary: s.threadSummary,
      loggedFor,
      createdAt: itemDate,
      updatedAt: itemDate,
    });
  }
}

export async function getScraps(
  userId: string,
  options?: {
    includeBuried?: boolean;
    kind?: ScrapKind;
    limit?: number;
  }
): Promise<ScrapRow[]> {
  const timezone = await getUserTimezone(userId);
  await seedDefaultScrapsIfEmpty(userId, timezone);

  const conditions = [eq(scraps.userId, userId)];

  if (!options?.includeBuried) {
    conditions.push(eq(scraps.isBuried, false));
  }

  if (options?.kind) {
    conditions.push(eq(scraps.kind, options.kind));
  }

  const query = db
    .select()
    .from(scraps)
    .where(and(...conditions))
    .orderBy(desc(scraps.loggedFor), desc(scraps.createdAt));

  if (options?.limit) {
    query.limit(options.limit);
  }

  return await query;
}

export async function getScrapById(userId: string, id: string): Promise<ScrapRow | null> {
  const [row] = await db
    .select()
    .from(scraps)
    .where(and(eq(scraps.userId, userId), eq(scraps.id, id)))
    .limit(1);
  return row || null;
}

export async function createScrap(
  userId: string,
  data: {
    content: string;
    notes?: string;
    kind?: ScrapKind;
    loggedFor?: string;
  }
): Promise<ScrapRow> {
  const timezone = await getUserTimezone(userId);
  const parsed = parseSlabText(data.content);
  const loggedFor = data.loggedFor || getLoggedForDate(timezone);
  const wordCount = (data.notes || "").trim().split(/\s+/).filter(Boolean).length;

  let status: ScrapStatus = "raw";
  let statusLabel = "RAW";

  if (data.notes && data.notes.trim()) {
    status = "pages";
    statusLabel = `NOTES · ${wordCount} WORDS`;
  }

  const [created] = await db
    .insert(scraps)
    .values({
      userId,
      content: data.content.trim(),
      kind: data.kind || parsed.kind,
      color: parsed.color,
      tilt: parsed.tilt,
      notes: data.notes || "",
      status,
      statusLabel,
      loggedFor,
    })
    .returning();

  return created;
}

export async function updateScrap(
  userId: string,
  id: string,
  patch: Partial<NewScrapRow>
): Promise<ScrapRow | null> {
  const existing = await getScrapById(userId, id);
  if (!existing) return null;

  const updates: Partial<NewScrapRow> = { ...patch, updatedAt: new Date() };

  if (patch.notes !== undefined) {
    const wordCount = (patch.notes || "").trim().split(/\s+/).filter(Boolean).length;
    if (existing.status !== "done") {
      if (patch.notes && patch.notes.trim()) {
        updates.status = "pages";
        updates.statusLabel = `NOTES · ${wordCount} WORDS`;
      } else {
        updates.status = "raw";
        updates.statusLabel = "RAW";
      }
    }
  }

  const [updated] = await db
    .update(scraps)
    .set(updates)
    .where(and(eq(scraps.userId, userId), eq(scraps.id, id)))
    .returning();

  return updated || null;
}

export async function deleteScrap(userId: string, id: string): Promise<boolean> {
  const res = await db
    .delete(scraps)
    .where(and(eq(scraps.userId, userId), eq(scraps.id, id)))
    .returning({ id: scraps.id });
  return res.length > 0;
}

export async function weldScraps(
  userId: string,
  targetId: string,
  sourceIdOrSummary: string
): Promise<ScrapRow | null> {
  const target = await getScrapById(userId, targetId);
  if (!target) return null;

  let summary = sourceIdOrSummary;
  let sourceId: string | null = null;

  // If sourceId is a UUID / existing scrap, fetch its summary
  const source = await getScrapById(userId, sourceIdOrSummary);
  if (source) {
    sourceId = source.id;
    summary = source.content.slice(0, 40);
  }

  const newThreadN = (target.threadN || 0) + 1;
  const newSummary = target.threadSummary
    ? `${target.threadSummary} · ${summary}`
    : summary;

  const [updated] = await db
    .update(scraps)
    .set({
      threadN: newThreadN,
      threadSummary: newSummary,
      weldedToId: sourceId,
      updatedAt: new Date(),
    })
    .where(and(eq(scraps.userId, userId), eq(scraps.id, targetId)))
    .returning();

  return updated || null;
}

export async function promoteScrapToTil(
  userId: string,
  scrapId: string
): Promise<{ scrap: ScrapRow; tilId: string; shortHash: string }> {
  const scrap = await getScrapById(userId, scrapId);
  if (!scrap) throw new Error("Scrap not found");

  const timezone = await getUserTimezone(userId);
  const shortHash = await generateShortHash(userId);
  const loggedFor = getLoggedForDate(timezone);

  const [insertedTil] = await db
    .insert(tilEntries)
    .values({
      userId,
      shortHash,
      type: "FACT",
      body: scrap.notes ? `${scrap.content}\n\n${scrap.notes}` : scrap.content,
      loggedFor,
    })
    .returning();

  const statusLabel = `→ MINTED AS TIL #${shortHash}`;

  const [updatedScrap] = await db
    .update(scraps)
    .set({
      status: "done",
      statusLabel,
      promotedTo: "TIL",
      promotedId: insertedTil.id,
      updatedAt: new Date(),
    })
    .where(and(eq(scraps.userId, userId), eq(scraps.id, scrapId)))
    .returning();

  return { scrap: updatedScrap, tilId: insertedTil.id, shortHash };
}

export async function promoteScrapToTodo(
  userId: string,
  scrapId: string
): Promise<{ scrap: ScrapRow; todoId: string }> {
  const scrap = await getScrapById(userId, scrapId);
  if (!scrap) throw new Error("Scrap not found");

  const timezone = await getUserTimezone(userId);
  const now = new Date();
  const parsed = parseTodo(scrap.content, now, timezone);

  const [insertedTodo] = await db
    .insert(todos)
    .values({
      userId,
      title: parsed.title || scrap.content,
      note: scrap.notes || null,
      energy: parsed.energy,
      estimatedMinutes: parsed.estimatedMinutes,
      dueDate: getLoggedForDate(timezone, now),
      state: "OPEN",
    })
    .returning();

  const [updatedScrap] = await db
    .update(scraps)
    .set({
      status: "done",
      statusLabel: "→ FILED TO TODOS",
      promotedTo: "TODO",
      promotedId: insertedTodo.id,
      updatedAt: new Date(),
    })
    .where(and(eq(scraps.userId, userId), eq(scraps.id, scrapId)))
    .returning();

  return { scrap: updatedScrap, todoId: insertedTodo.id };
}

export async function buryScraps(userId: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const res = await db
    .update(scraps)
    .set({
      isBuried: true,
      buriedAt: new Date(),
      status: "compost",
      statusLabel: "BURIED",
      updatedAt: new Date(),
    })
    .where(and(eq(scraps.userId, userId), inArray(scraps.id, ids)))
    .returning({ id: scraps.id });
  return res.length;
}

export async function keepScraps(userId: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const res = await db
    .update(scraps)
    .set({
      isBuried: false,
      buriedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(scraps.userId, userId), inArray(scraps.id, ids)))
    .returning({ id: scraps.id });
  return res.length;
}

export interface ScratchStats {
  thisWeek: number;
  promoted: number;
  openQuestions: number;
  goingCold: number;
  whereScrapsGo: {
    til: number;
    todo: number;
    atlas: number;
    raw: number;
    total: number;
    conversionRate: number;
  };
  openQuestionItems: Array<{
    id: string;
    content: string;
    statusLabel: string;
    meta: string;
  }>;
  compostItems: Array<{
    id: string;
    content: string;
    dateLabel: string;
    daysAgo: number;
  }>;
}

export async function getScratchStats(userId: string): Promise<ScratchStats> {
  const timezone = await getUserTimezone(userId);
  await seedDefaultScrapsIfEmpty(userId, timezone);

  const allScraps = await db
    .select()
    .from(scraps)
    .where(eq(scraps.userId, userId))
    .orderBy(desc(scraps.createdAt));

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let thisWeek = 0;
  let promoted = 0;
  let openQuestions = 0;
  let goingCold = 0;

  let tilCount = 0;
  let todoCount = 0;
  let atlasCount = 0;
  let rawCount = 0;

  const openQuestionItems: ScratchStats["openQuestionItems"] = [];
  const compostItems: ScratchStats["compostItems"] = [];

  for (const s of allScraps) {
    const created = new Date(s.createdAt);
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    if (created >= weekAgo && !s.isBuried) {
      thisWeek++;
    }

    if (s.status === "done" || s.promotedTo) {
      promoted++;
    }

    if (s.kind === "QUESTION" && s.status !== "done" && !s.isBuried) {
      openQuestions++;
      let meta = diffDays === 0 ? "ASKED TODAY" : `ASKED ${diffDays} DAYS AGO`;
      if (s.threadN && s.threadN > 0) meta += ` · COLLIDES ×${s.threadN}`;
      if (s.notes && s.notes.trim()) meta += " · HAS NOTES";

      openQuestionItems.push({
        id: s.id,
        content: s.content,
        statusLabel: s.statusLabel,
        meta,
      });
    }

    if (s.status === "raw" && created < fourteenDaysAgo && !s.isBuried) {
      goingCold++;
    }

    // 30 day conversion metrics
    if (created >= thirtyDaysAgo) {
      if (s.promotedTo === "TIL" || (s.status === "done" && s.statusLabel?.includes("TIL"))) {
        tilCount++;
      } else if (s.promotedTo === "TODO" || (s.status === "done" && s.statusLabel?.includes("TODO"))) {
        todoCount++;
      } else if (s.promotedTo === "ATLAS") {
        atlasCount++;
      } else {
        rawCount++;
      }
    }

    // Compost items (> 60 days)
    if (created < sixtyDaysAgo && !s.isBuried && s.status !== "done") {
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const dateLabel = `${monthNames[created.getMonth()]} ${String(created.getDate()).padStart(2, "0")}`;
      compostItems.push({
        id: s.id,
        content: s.content,
        dateLabel,
        daysAgo: diffDays,
      });
    }
  }

  const thirtyDayTotal = tilCount + todoCount + atlasCount + rawCount;
  const convertedTotal = tilCount + todoCount + atlasCount;
  const conversionRate = thirtyDayTotal > 0 ? Math.round((convertedTotal / thirtyDayTotal) * 100) : 0;

  return {
    thisWeek,
    promoted,
    openQuestions,
    goingCold,
    whereScrapsGo: {
      til: tilCount,
      todo: todoCount,
      atlas: atlasCount,
      raw: rawCount,
      total: thirtyDayTotal,
      conversionRate,
    },
    openQuestionItems,
    compostItems,
  };
}
