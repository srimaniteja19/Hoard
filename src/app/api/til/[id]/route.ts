import { NextResponse } from "next/server";
import { db } from "@/db";
import { tilEntries, tilEntryTags, tags as tagsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { updateTilSchema } from "@/lib/validations/til";

// ─── PATCH /api/til/:id ──────────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const rawBody = await req.json();

    const parseResult = updateTilSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Verify ownership
    const existing = await db
      .select({ id: tilEntries.id })
      .from(tilEntries)
      .where(and(eq(tilEntries.id, id), eq(tilEntries.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const updatePayload: Partial<typeof tilEntries.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.body !== undefined) updatePayload.body = data.body || null;
    if (data.code !== undefined) updatePayload.code = data.code || null;
    if (data.codeLang !== undefined) updatePayload.codeLang = data.codeLang || null;
    if (data.linkUrl !== undefined) updatePayload.linkUrl = data.linkUrl || null;
    if (data.linkDensity !== undefined) updatePayload.linkDensity = data.linkDensity || "card";
    if (data.dischargesBookmarkId !== undefined) updatePayload.dischargesBookmarkId = data.dischargesBookmarkId || null;

    const [updated] = await db
      .update(tilEntries)
      .set(updatePayload)
      .where(and(eq(tilEntries.id, id), eq(tilEntries.userId, userId)))
      .returning();

    // Handle tag updates if provided
    let updatedTagNames: string[] = [];
    if (data.tags !== undefined) {
      // Remove old tag associations
      await db.delete(tilEntryTags).where(eq(tilEntryTags.tilId, id));

      for (const rawTag of data.tags) {
        const tagName = rawTag.trim().toLowerCase();
        if (!tagName) continue;

        let tagId: number;
        const existingTags = await db
          .select({ id: tagsTable.id })
          .from(tagsTable)
          .where(and(eq(tagsTable.userId, userId), eq(tagsTable.name, tagName)));

        if (existingTags.length > 0) {
          tagId = existingTags[0].id;
        } else {
          const [newTag] = await db
            .insert(tagsTable)
            .values({
              userId,
              name: tagName,
              color: "#00F0FF",
            })
            .returning({ id: tagsTable.id });
          tagId = newTag.id;
        }

        await db
          .insert(tilEntryTags)
          .values({
            tilId: id,
            tagId,
          })
          .onConflictDoNothing();

        updatedTagNames.push(tagName);
      }
    } else {
      // Fetch existing tags
      const tagRows = await db
        .select({ name: tagsTable.name })
        .from(tilEntryTags)
        .innerJoin(tagsTable, eq(tilEntryTags.tagId, tagsTable.id))
        .where(eq(tilEntryTags.tilId, id));

      updatedTagNames = tagRows.map((r) => r.name);
    }

    return NextResponse.json({
      ...updated,
      tags: updatedTagNames,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/til/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/til/:id ─────────────────────────────────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existing = await db
      .select({ id: tilEntries.id })
      .from(tilEntries)
      .where(and(eq(tilEntries.id, id), eq(tilEntries.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await db
      .delete(tilEntries)
      .where(and(eq(tilEntries.id, id), eq(tilEntries.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/til/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
