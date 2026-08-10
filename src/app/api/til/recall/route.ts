import { NextResponse } from "next/server";
import { db } from "@/db";
import { tilEntries, tilEntryTags, tags as tagsTable } from "@/db/schema";
import { eq, and, isNull, lte, asc, inArray } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { confidence, confidenceSql, applyRating, Rating } from "@/lib/til/confidence";

// ─── GET /api/til/recall ─────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const now = new Date();

    // Query deck: entries where nextReviewAt <= now (or null), excluding superseded, capped at 7
    const rows = await db
      .select()
      .from(tilEntries)
      .where(
        and(
          eq(tilEntries.userId, userId),
          isNull(tilEntries.supersededById), // Excluded from RECALL deck!
          lte(tilEntries.nextReviewAt, now)
        )
      )
      .orderBy(asc(confidenceSql), asc(tilEntries.createdAt))
      .limit(7);

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

    const deck = rows.map((r) => {
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
        confidence: confVal,
        linkDensity: r.linkDensity || "card",
        tags: tagMap.get(r.id) || [],
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    let upcomingNextReviewAt: string | null = null;
    let upcomingDays: number | null = null;

    // If deck is empty, calculate when the next entry is due
    if (deck.length === 0) {
      const [nextRow] = await db
        .select({ nextReviewAt: tilEntries.nextReviewAt })
        .from(tilEntries)
        .where(and(eq(tilEntries.userId, userId), isNull(tilEntries.supersededById)))
        .orderBy(asc(tilEntries.nextReviewAt))
        .limit(1);

      if (nextRow && nextRow.nextReviewAt) {
        upcomingNextReviewAt = nextRow.nextReviewAt.toISOString();
        const diffMs = nextRow.nextReviewAt.getTime() - now.getTime();
        upcomingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    return NextResponse.json({
      deck,
      nextReviewAt: upcomingNextReviewAt,
      nextReviewInDays: upcomingDays,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/til/recall]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/til/recall/review ────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { id, rating } = (await req.json()) as { id: string; rating: Rating };

    if (!id || !["GOT_IT", "FUZZY", "FORGOT"].includes(rating)) {
      return NextResponse.json({ error: "Invalid review parameters" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(tilEntries)
      .where(and(eq(tilEntries.id, id), eq(tilEntries.userId, userId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const now = new Date();
    const currentEase = existing.ease ?? 2.5;
    const currentStability = existing.stability ?? 1;
    const currentReviewCount = existing.reviewCount ?? 0;

    const srsUpdate = applyRating(rating, currentEase, currentStability, currentReviewCount, now);

    const [updated] = await db
      .update(tilEntries)
      .set({
        ease: srsUpdate.ease,
        stability: srsUpdate.stability,
        nextReviewAt: srsUpdate.nextReviewAt,
        lastReviewedAt: srsUpdate.lastReviewedAt,
        reviewCount: srsUpdate.reviewCount,
        updatedAt: now,
      })
      .where(and(eq(tilEntries.id, id), eq(tilEntries.userId, userId)))
      .returning();

    return NextResponse.json({
      success: true,
      entry: {
        ...updated,
        lastReviewedAt: updated.lastReviewedAt?.toISOString(),
        nextReviewAt: updated.nextReviewAt?.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/til/recall/review]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
