import { NextResponse } from "next/server";
import { db } from "@/db";
import { tilEntries, tilEntryTags, tags as tagsTable } from "@/db/schema";
import { eq, and, isNull, asc, inArray, gte, lte } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { confidence } from "@/lib/til/confidence";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const month = searchParams.get("month") || currentMonthStr; // "YYYY-MM"
    const includeSuperseded = searchParams.get("includeSuperseded") === "true";

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const conditions = [
      eq(tilEntries.userId, userId),
      gte(tilEntries.loggedFor, startDate),
      lte(tilEntries.loggedFor, endDate),
    ];

    if (!includeSuperseded) {
      conditions.push(isNull(tilEntries.supersededById));
    }

    const rows = await db
      .select()
      .from(tilEntries)
      .where(and(...conditions))
      .orderBy(asc(tilEntries.loggedFor), asc(tilEntries.createdAt));

    const tilIds = rows.map((r) => r.id);
    const tagMap = new Map<string, string[]>();
    const tagSet = new Set<string>();

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
        tagSet.add(tr.tagName.toLowerCase());
      }
    }

    const entries = rows.map((r) => {
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

    // Calculate issue number based on month distance from 2025-01 (Issue #1)
    const [yearNum, monthNum] = month.split("-").map(Number);
    const issueNumber = Math.max(1, (yearNum - 2025) * 12 + monthNum);

    return NextResponse.json({
      month,
      entries,
      entryCount: entries.length,
      topicCount: tagSet.size,
      issueNumber,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til/press]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
