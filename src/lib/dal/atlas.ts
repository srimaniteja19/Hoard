import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { atlases } from "@/db/schema";
import { atlasSerial } from "@/lib/atlas/serial";
import { serializeAtlas } from "@/lib/atlas/serialize";
import type { AtlasRecord, AtlasSyllabus, ParsedAtlas } from "@/lib/atlas/types";

export { serializeAtlas };

export async function listAtlases(userId: string, archived: boolean): Promise<AtlasRecord[]> {
  const rows = await db
    .select()
    .from(atlases)
    .where(
      and(
        eq(atlases.userId, userId),
        archived ? eq(atlases.status, "archived") : ne(atlases.status, "archived"),
      ),
    )
    .orderBy(desc(atlases.updatedAt));

  return rows.map(serializeAtlas);
}

export async function getAtlas(userId: string, id: string): Promise<AtlasRecord | null> {
  const [row] = await db
    .select()
    .from(atlases)
    .where(and(eq(atlases.id, id), eq(atlases.userId, userId)))
    .limit(1);

  return row ? serializeAtlas(row) : null;
}

export async function insertDraft(input: {
  userId: string;
  parsed: ParsedAtlas;
  prompt: string;
  syllabus: AtlasSyllabus;
  model: string;
  title?: string;
  brief?: string;
}): Promise<AtlasRecord> {
  const id = crypto.randomUUID();
  const [row] = await db
    .insert(atlases)
    .values({
      id,
      userId: input.userId,
      serial: atlasSerial(id),
      title: input.title ?? "Filing…",
      brief: input.brief ?? "",
      prompt: input.prompt,
      depth: input.parsed.depth,
      cadence: input.parsed.cadence,
      minutesPerSession: input.parsed.minutesPerSession,
      weeksPlanned: input.parsed.weeksPlanned,
      antiScope: input.parsed.antiScope,
      status: "draft",
      currentWeekId: null,
      syllabus: input.syllabus,
      model: input.model,
    })
    .returning();

  return serializeAtlas(row);
}

export async function saveAtlas(
  userId: string,
  id: string,
  patch: Partial<Pick<AtlasRecord, "title" | "brief" | "status" | "currentWeekId" | "syllabus" | "model">>,
): Promise<AtlasRecord | null> {
  const [row] = await db
    .update(atlases)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(atlases.id, id), eq(atlases.userId, userId)))
    .returning();

  return row ? serializeAtlas(row) : null;
}

export async function deleteAtlas(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(atlases)
    .where(and(eq(atlases.id, id), eq(atlases.userId, userId)))
    .returning({ id: atlases.id });

  return deleted.length > 0;
}
