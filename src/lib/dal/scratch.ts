import { db } from "@/db";
import { scraps, ScrapRow, NewScrapRow, ScrapKind, ScrapStatus, todos, tilEntries } from "@/db/schema";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import { parseSlabText, getDeterministicTilt, getLocalTodayIso } from "@/lib/scratch/parse";
import { generateShortHash, getLoggedForDate, getUserTimezone } from "@/lib/dal/til";
import { parseTodo } from "@/lib/todos/parse";
import crypto from "crypto";

export async function getScraps(
  userId: string,
  options?: {
    includeBuried?: boolean;
    kind?: ScrapKind;
    limit?: number;
  }
): Promise<ScrapRow[]> {
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
    .orderBy(
      desc(sql`COALESCE(${scraps.occurredOn}, ${scraps.loggedFor})`),
      desc(scraps.createdAt)
    );

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
    occurredOn?: string;
    clientDate?: string;
  }
): Promise<ScrapRow> {
  const timezone = await getUserTimezone(userId);
  const now = new Date();
  const refDate = data.clientDate ? new Date(data.clientDate + "T12:00:00") : now;
  const parsed = parseSlabText(data.content, refDate);
  const defaultLocal = getLocalTodayIso(now);
  const loggedFor =
    data.loggedFor ||
    data.clientDate ||
    (timezone && timezone !== "UTC" ? getLoggedForDate(timezone) : defaultLocal);
  const occurredOn = data.occurredOn || parsed.occurredOn || loggedFor;
  const wordCount = (data.notes || "").trim().split(/\s+/).filter(Boolean).length;

  let status: ScrapStatus = "raw";
  let statusLabel = "RAW";

  if (parsed.kind === "LOG") {
    status = "done";
    statusLabel = "LOGGED";
  } else if (data.notes && data.notes.trim()) {
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
      occurredOn,
      entities: parsed.entities,
      tags: parsed.tags,
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
