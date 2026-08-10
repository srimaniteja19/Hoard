import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserTimezone, getOnThisDayEntry } from "@/lib/dal/til";
import { db } from "@/db";
import { tilEntryTags, tags as tagsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const userId = await requireUserId();
    const timezone = await getUserTimezone(userId);

    const result = await getOnThisDayEntry(userId, timezone);

    if (!result) {
      return NextResponse.json(null);
    }

    // Fetch tags for this entry
    const tagRows = await db
      .select({ name: tagsTable.name })
      .from(tilEntryTags)
      .innerJoin(tagsTable, eq(tilEntryTags.tagId, tagsTable.id))
      .where(eq(tilEntryTags.tilId, result.entry.id));

    const item = {
      ...result.entry,
      tags: tagRows.map((r) => r.name),
      createdAt: result.entry.createdAt.toISOString(),
      updatedAt: result.entry.updatedAt.toISOString(),
    };

    return NextResponse.json({
      entry: item,
      daysAgo: result.daysAgo,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til/on-this-day]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
