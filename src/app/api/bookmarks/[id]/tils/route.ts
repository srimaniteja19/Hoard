import { NextResponse } from "next/server";
import { db } from "@/db";
import { tilEntries, tilEntryTags, tags as tagsTable } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const bookmarkIdNum = parseInt(id, 10);

    if (isNaN(bookmarkIdNum)) {
      return NextResponse.json({ items: [] });
    }

    const rows = await db
      .select({
        id: tilEntries.id,
        userId: tilEntries.userId,
        shortHash: tilEntries.shortHash,
        type: tilEntries.type,
        body: tilEntries.body,
        code: tilEntries.code,
        codeLang: tilEntries.codeLang,
        linkUrl: tilEntries.linkUrl,
        linkPreview: tilEntries.linkPreview,
        linkDensity: tilEntries.linkDensity,
        dischargesBookmarkId: tilEntries.dischargesBookmarkId,
        loggedFor: tilEntries.loggedFor,
        createdAt: tilEntries.createdAt,
        updatedAt: tilEntries.updatedAt,
      })
      .from(tilEntries)
      .where(and(eq(tilEntries.userId, userId), eq(tilEntries.dischargesBookmarkId, bookmarkIdNum)))
      .orderBy(desc(tilEntries.createdAt));

    const tilIds = rows.map((r) => r.id);
    const tagMap = new Map<string, string[]>();

    if (tilIds.length > 0) {
      const tagRows = await db
        .select({
          tilId: tilEntryTags.tilId,
          tagName: tagsTable.name,
        })
        .from(tilEntryTags)
        .innerJoin(tagsTable, eq(tilEntryTags.tagId, tagsTable.id))
        .where(inArray(tilEntryTags.tilId, tilIds));

      for (const tr of tagRows) {
        const list = tagMap.get(tr.tilId) || [];
        list.push(tr.tagName);
        tagMap.set(tr.tilId, list);
      }
    }

    const items = rows.map((r) => ({
      ...r,
      tags: tagMap.get(r.id) || [],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/bookmarks/[id]/tils]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
