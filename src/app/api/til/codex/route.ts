import { NextResponse } from "next/server";
import { db } from "@/db";
import { tilEntries, tilEntryTags, tags as tagsTable } from "@/db/schema";
import { eq, and, asc, inArray, sql } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { confidence } from "@/lib/til/confidence";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const requestedTopic = searchParams.get("topic");

    // ── Query 1: Topic Index (Group by tag) ──────────────────────────────────
    const indexRows = await db
      .select({
        tagName: tagsTable.name,
        color: tagsTable.color,
        entryCount: sql<number>`count(${tilEntries.id})::int`,
        avgConfidence: sql<number>`coalesce(avg(case when ${tilEntries.supersededById} is null then round(100 * power(2, -extract(epoch from (now() - coalesce(${tilEntries.lastReviewedAt}, ${tilEntries.createdAt}))) / 86400 / greatest(${tilEntries.stability}, 0.5))) end), 100)::int`,
      })
      .from(tagsTable)
      .innerJoin(tilEntryTags, eq(tagsTable.id, tilEntryTags.tagId))
      .innerJoin(tilEntries, eq(tilEntryTags.tilId, tilEntries.id))
      .where(eq(tagsTable.userId, userId))
      .groupBy(tagsTable.name, tagsTable.color)
      .orderBy(sql`count(${tilEntries.id}) desc`);

    const topicIndex = indexRows.map((r) => ({
      tag: r.tagName,
      color: r.color,
      entryCount: r.entryCount,
      averageConfidence: Math.min(100, Math.max(0, Math.round(r.avgConfidence))),
    }));

    const activeTopicName = requestedTopic || topicIndex[0]?.tag || null;
    let activeTopicData = null;

    // ── Query 2: Active Topic Page (Oldest First) ─────────────────────────────
    if (activeTopicName) {
      // Fetch topic entries oldest-first, joined straight to the tag filter
      // (avoids a separate matching-IDs round-trip)
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
          supersededById: tilEntries.supersededById,
          stability: tilEntries.stability,
          ease: tilEntries.ease,
          reviewCount: tilEntries.reviewCount,
          lastReviewedAt: tilEntries.lastReviewedAt,
          nextReviewAt: tilEntries.nextReviewAt,
          loggedFor: tilEntries.loggedFor,
          createdAt: tilEntries.createdAt,
          updatedAt: tilEntries.updatedAt,
        })
        .from(tilEntries)
        .innerJoin(tilEntryTags, eq(tilEntries.id, tilEntryTags.tilId))
        .innerJoin(tagsTable, eq(tilEntryTags.tagId, tagsTable.id))
        .where(and(eq(tilEntries.userId, userId), eq(tagsTable.userId, userId), eq(tagsTable.name, activeTopicName)))
        .orderBy(asc(tilEntries.loggedFor), asc(tilEntries.createdAt));

      if (rows.length > 0) {
        const tilIds = rows.map((r) => r.id);

        // Fetch tags for all topic entries in ONE batch query (No N+1)
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

        let nonSupersededConfSum = 0;
        let nonSupersededCount = 0;

        const entries = rows.map((r) => {
          const stability = r.stability ?? 1;
          const lastReviewedAtDate = r.lastReviewedAt ?? r.createdAt;
          const confVal = confidence(stability, lastReviewedAtDate);

          if (!r.supersededById) {
            nonSupersededConfSum += confVal;
            nonSupersededCount++;
          }

          const allTags = tagMap.get(r.id) || [];
          const alsoSeeTags = allTags.filter((t) => t.toLowerCase() !== activeTopicName.toLowerCase());

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
            tags: allTags,
            alsoSeeTags,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          };
        });

        // Compute day span
        const firstLoggedFor = rows[0]?.loggedFor || "";
        const lastLoggedFor = rows[rows.length - 1]?.loggedFor || "";
        let spanDays = 1;
        if (firstLoggedFor && lastLoggedFor) {
          const d1 = new Date(firstLoggedFor);
          const d2 = new Date(lastLoggedFor);
          spanDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        }

        const topicAvgConfidence =
          nonSupersededCount > 0 ? Math.round(nonSupersededConfSum / nonSupersededCount) : 100;

        activeTopicData = {
          name: activeTopicName,
          entryCount: rows.length,
          firstLoggedFor,
          lastLoggedFor,
          spanDays,
          averageConfidence: topicAvgConfidence,
          entries,
        };
      }
    }

    return NextResponse.json({
      index: topicIndex,
      activeTopic: activeTopicData,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til/codex]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
