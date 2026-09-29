import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { studioIdeas, studioPieces, studioSeries } from "@/db/schema";
import type { StudioIdeaRow, StudioPieceRow, StudioSeriesRow } from "@/db/schema";
import type { StudioData, StudioIdea, StudioPiece, StudioSeries } from "@/lib/studio/types";
import type { StudioKind } from "@/lib/studio/validate";

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : "");

export function serializePiece(row: StudioPieceRow): StudioPiece {
  return {
    id: row.id,
    title: row.title,
    status: row.status as StudioPiece["status"],
    format: row.format as StudioPiece["format"],
    pillar: row.pillar as StudioPiece["pillar"],
    seriesId: row.seriesId,
    part: row.part,
    script: row.script ?? [],
    caption: row.caption,
    hashtags: row.hashtags,
    sources: row.sources ?? [],
    notes: row.notes,
    coverUrl: row.coverUrl,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeSeries(row: StudioSeriesRow): StudioSeries {
  return {
    id: row.id,
    title: row.title,
    theme: row.theme,
    pillar: row.pillar as StudioSeries["pillar"],
    parts: row.parts ?? [],
    nextPart: row.nextPart,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeIdea(row: StudioIdeaRow): StudioIdea {
  return {
    id: row.id,
    title: row.title,
    hook: row.hook,
    pillar: row.pillar as StudioIdea["pillar"],
    format: row.format as StudioIdea["format"],
    status: row.status as StudioIdea["status"],
    createdAt: iso(row.createdAt),
  };
}

export async function getStudioData(userId: string): Promise<StudioData> {
  const [pieces, series, ideas] = await Promise.all([
    db.select().from(studioPieces).where(eq(studioPieces.userId, userId)).orderBy(desc(studioPieces.updatedAt)),
    db.select().from(studioSeries).where(eq(studioSeries.userId, userId)).orderBy(asc(studioSeries.createdAt)),
    db.select().from(studioIdeas).where(eq(studioIdeas.userId, userId)).orderBy(desc(studioIdeas.createdAt)),
  ]);
  return {
    pieces: pieces.map(serializePiece),
    series: series.map(serializeSeries),
    ideas: ideas.map(serializeIdea),
  };
}

type Values = Record<string, unknown>;

/** A series or piece reference must belong to the same user. */
async function ownsSeries(userId: string, seriesId: unknown): Promise<boolean> {
  if (seriesId == null) return true;
  const [row] = await db
    .select({ id: studioSeries.id })
    .from(studioSeries)
    .where(and(eq(studioSeries.id, String(seriesId)), eq(studioSeries.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export class StudioRefError extends Error {}

export async function createStudioItem(userId: string, kind: StudioKind, values: Values) {
  if (kind === "pieces") {
    if (!(await ownsSeries(userId, values.seriesId))) throw new StudioRefError("Unknown series");
    const [row] = await db.insert(studioPieces).values({ ...values, userId } as typeof studioPieces.$inferInsert).returning();
    return serializePiece(row);
  }
  if (kind === "series") {
    const [row] = await db.insert(studioSeries).values({ ...values, userId } as typeof studioSeries.$inferInsert).returning();
    return serializeSeries(row);
  }
  const [row] = await db.insert(studioIdeas).values({ ...values, userId } as typeof studioIdeas.$inferInsert).returning();
  return serializeIdea(row);
}

export async function updateStudioItem(userId: string, kind: StudioKind, id: string, values: Values) {
  const now = new Date();
  if (kind === "pieces") {
    if ("seriesId" in values && !(await ownsSeries(userId, values.seriesId))) throw new StudioRefError("Unknown series");
    const [row] = await db
      .update(studioPieces)
      .set({ ...values, updatedAt: now })
      .where(and(eq(studioPieces.id, id), eq(studioPieces.userId, userId)))
      .returning();
    return row ? serializePiece(row) : null;
  }
  if (kind === "series") {
    const [row] = await db
      .update(studioSeries)
      .set({ ...values, updatedAt: now })
      .where(and(eq(studioSeries.id, id), eq(studioSeries.userId, userId)))
      .returning();
    return row ? serializeSeries(row) : null;
  }
  const [row] = await db
    .update(studioIdeas)
    .set(values)
    .where(and(eq(studioIdeas.id, id), eq(studioIdeas.userId, userId)))
    .returning();
  return row ? serializeIdea(row) : null;
}

export async function deleteStudioItem(userId: string, kind: StudioKind, id: string): Promise<boolean> {
  if (kind === "pieces") {
    const [row] = await db
      .delete(studioPieces)
      .where(and(eq(studioPieces.id, id), eq(studioPieces.userId, userId)))
      .returning({ id: studioPieces.id, seriesId: studioPieces.seriesId });
    if (!row) return false;
    if (row.seriesId) {
      // Keep the planned part, just unlink the deleted piece.
      const [series] = await db
        .select()
        .from(studioSeries)
        .where(and(eq(studioSeries.id, row.seriesId), eq(studioSeries.userId, userId)))
        .limit(1);
      if (series) {
        await db
          .update(studioSeries)
          .set({ parts: series.parts.map((p) => (p.pieceId === id ? { ...p, pieceId: null } : p)), updatedAt: new Date() })
          .where(eq(studioSeries.id, series.id));
      }
    }
    return true;
  }
  if (kind === "series") {
    // Pieces keep existing; the FK sets series_id to null, and we clear the part number.
    await db
      .update(studioPieces)
      .set({ part: null, updatedAt: new Date() })
      .where(and(eq(studioPieces.seriesId, id), eq(studioPieces.userId, userId)));
    const rows = await db
      .delete(studioSeries)
      .where(and(eq(studioSeries.id, id), eq(studioSeries.userId, userId)))
      .returning({ id: studioSeries.id });
    return rows.length > 0;
  }
  const rows = await db
    .delete(studioIdeas)
    .where(and(eq(studioIdeas.id, id), eq(studioIdeas.userId, userId)))
    .returning({ id: studioIdeas.id });
  return rows.length > 0;
}
