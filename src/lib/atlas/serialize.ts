import type { atlases } from "@/db/schema";
import type { AtlasCadence, AtlasDepth, AtlasRecord, AtlasStatus } from "./types";

export function serializeAtlas(row: typeof atlases.$inferSelect): AtlasRecord {
  return {
    id: row.id,
    serial: row.serial,
    title: row.title,
    brief: row.brief,
    prompt: row.prompt,
    depth: row.depth as AtlasDepth,
    cadence: row.cadence as AtlasCadence,
    minutesPerSession: row.minutesPerSession,
    weeksPlanned: row.weeksPlanned,
    antiScope: row.antiScope,
    status: row.status as AtlasStatus,
    currentWeekId: row.currentWeekId,
    syllabus: row.syllabus,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
