import { NextResponse } from "next/server";
import { db } from "@/db";
import { tilEntries, tilEntryTags, tags as tagsTable, bookmarks, TilType } from "@/db/schema";
import { eq, and, desc, lt, inArray } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { createTilSchema } from "@/lib/validations/til";
import { getLoggedForDate, generateShortHash, getUserTimezone } from "@/lib/dal/til";
import { fetchLinkPreview } from "@/lib/til/previewRegistry";
import { confidence, confidenceSql } from "@/lib/til/confidence";
import { checkSupersessionCycle } from "@/lib/til/supersession";
import crypto from "crypto";

// Helper to fetch tag names for a set of TIL entry IDs
async function getTagsForTilEntries(tilIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (tilIds.length === 0) return map;

  const rows = await db
    .select({
      tilId: tilEntryTags.tilId,
      tagName: tagsTable.name,
    })
    .from(tilEntryTags)
    .innerJoin(tagsTable, eq(tilEntryTags.tagId, tagsTable.id))
    .where(inArray(tilEntryTags.tilId, tilIds));

  for (const row of rows) {
    const list = map.get(row.tilId) || [];
    list.push(row.tagName);
    map.set(row.tilId, list);
  }

  return map;
}

// ─── GET /api/til ────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const tag = searchParams.get("tag");
    const type = searchParams.get("type");
    const day = searchParams.get("day");
    const sort = searchParams.get("sort");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const conditions = [eq(tilEntries.userId, userId)];

    if (day) {
      conditions.push(eq(tilEntries.loggedFor, day));
    }

    if (type) {
      conditions.push(eq(tilEntries.type, type as TilType));
    }

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        conditions.push(lt(tilEntries.createdAt, cursorDate));
      }
    }

    if (tag) {
      // Join tag filter
      const matchingTilRows = await db
        .select({ tilId: tilEntryTags.tilId })
        .from(tilEntryTags)
        .innerJoin(tagsTable, eq(tilEntryTags.tagId, tagsTable.id))
        .where(and(eq(tagsTable.userId, userId), eq(tagsTable.name, tag)));

      const matchingTilIds = matchingTilRows.map((r) => r.tilId);
      if (matchingTilIds.length === 0) {
        return NextResponse.json({ items: [], nextCursor: null });
      }
      conditions.push(inArray(tilEntries.id, matchingTilIds));
    }

    const orderByClause = sort === "confidence"
      ? [desc(confidenceSql), desc(tilEntries.createdAt)]
      : [desc(tilEntries.loggedFor), desc(tilEntries.createdAt)];

    const rows = await db
      .select()
      .from(tilEntries)
      .where(and(...conditions))
      .orderBy(...orderByClause)
      .limit(limit + 1);

    let nextCursor: string | null = null;
    let pageRows = rows;

    if (rows.length > limit) {
      pageRows = rows.slice(0, limit);
      const lastItem = pageRows[pageRows.length - 1];
      nextCursor = lastItem.createdAt.toISOString();
    }

    const tilIds = pageRows.map((r) => r.id);
    const tagMap = await getTagsForTilEntries(tilIds);

    const items = pageRows.map((r) => {
      const stability = r.stability ?? 1;
      const lastReviewedAtDate = r.lastReviewedAt ?? r.createdAt;
      const confVal = confidence(stability, lastReviewedAtDate);

      return {
        ...r,
        stability,
        ease: r.ease ?? 2.5,
        reviewCount: r.reviewCount ?? 0,
        lastReviewedAt: r.lastReviewedAt ? r.lastReviewedAt.toISOString() : null,
        nextReviewAt: r.nextReviewAt ? r.nextReviewAt.toISOString() : null,
        supersededById: r.supersededById || null,
        confidence: confVal,
        linkDensity: r.linkDensity || "card",
        tags: tagMap.get(r.id) || [],
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ items, nextCursor });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/til ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const rawBody = await req.json();

    const parseResult = createTilSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const userTimezone = await getUserTimezone(userId);

    const loggedFor = data.loggedFor || getLoggedForDate(userTimezone);
    const shortHash = await generateShortHash(userId);
    const newEntryId = crypto.randomUUID();

    // 0. Cycle guard check if replacesEntryId is specified
    if (data.replacesEntryId) {
      const cycleCheck = await checkSupersessionCycle(data.replacesEntryId, newEntryId, userId);
      if (cycleCheck.hasCycle) {
        return NextResponse.json(
          { error: cycleCheck.reason || "Supersession cycle detected" },
          { status: 400 }
        );
      }
    }

    // 1. Discharge bookmark if dischargesBookmarkId provided
    if (data.dischargesBookmarkId) {
      await db
        .update(bookmarks)
        .set({ unread: false, updatedAt: new Date() })
        .where(and(eq(bookmarks.id, data.dischargesBookmarkId), eq(bookmarks.userId, userId)));
    }

    // 2. Save to bookmark queue ONLY if explicitly requested by user (default off)
    if (rawBody.saveToHoardQueue && data.linkUrl) {
      let domain = "web";
      try {
        domain = new URL(data.linkUrl).hostname.replace(/^www\./, "");
      } catch {}

      await db.insert(bookmarks).values({
        userId,
        title: data.body ? data.body.slice(0, 80) : "TIL Link",
        type: "ART",
        source: domain,
        url: data.linkUrl,
        mins: 5,
        tag: data.tags[0] || "til",
        collectionId: `${userId.slice(-8)}-unsorted`,
        unread: true,
        note: `Derived from TIL #${shortHash}`,
      }).onConflictDoNothing();
    }

    // 3. Resolve Link Preview Snapshot if linkUrl provided
    let linkPreview = null;
    if (data.linkUrl) {
      try {
        linkPreview = await fetchLinkPreview(data.linkUrl);
      } catch {
        // Fallback preview
      }
    }

    // 4. Insert TIL Entry
    // Seed SRS state the same way the backfill does, so new entries enter the
    // RECALL rotation instead of sitting with a null nextReviewAt forever.
    const now = new Date();
    const [inserted] = await db
      .insert(tilEntries)
      .values({
        id: newEntryId,
        userId,
        shortHash,
        type: data.type,
        body: data.body || null,
        code: data.type === "SNIPPET" ? data.code || null : null,
        codeLang: data.type === "SNIPPET" ? data.codeLang || null : null,
        linkUrl: data.linkUrl || null,
        linkPreview,
        linkDensity: data.linkDensity || "card",
        dischargesBookmarkId: data.dischargesBookmarkId || null,
        loggedFor,
        lastReviewedAt: now,
        nextReviewAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      })
      .returning();

    // 5. If replacesEntryId provided, mark that older entry as superseded by new entry
    if (data.replacesEntryId) {
      await db
        .update(tilEntries)
        .set({ supersededById: inserted.id, updatedAt: new Date() })
        .where(and(eq(tilEntries.id, data.replacesEntryId), eq(tilEntries.userId, userId)));
    }

    // 4. Associate Tags
    const createdTagNames: string[] = [];
    if (data.tags && data.tags.length > 0) {
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
            tilId: inserted.id,
            tagId,
          })
          .onConflictDoNothing();

        createdTagNames.push(tagName);
      }
    }

    const item = {
      ...inserted,
      linkDensity: inserted.linkDensity || "card",
      tags: createdTagNames,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };

    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/til]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
