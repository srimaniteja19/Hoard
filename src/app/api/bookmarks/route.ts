import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, collections } from "@/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { Bookmark, ItemType, KindType } from "@/types";
import { parseCoverData } from "@/lib/cover-data";
import { cleanTitle } from "@/lib/cleanTitle";
import { enrichBookmarkValues } from "@/lib/enrichBookmark";
import { inferItemType } from "@/lib/library/inferItemType";
import { applyQuoteCapture } from "@/lib/library/textFragment";
import { scheduleBookmarkEmbedding } from "@/lib/embeddings/upsertBookmarkEmbedding";
import { primaryTag, triageCapture } from "@/lib/library/triageCapture";

// ─── Shape mapper ────────────────────────────────────────────────────────────

function dbToUi(row: typeof bookmarks.$inferSelect, titleMap?: Map<number, string>): Bookmark {
  const d = new Date(row.createdAt);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const uiTitle = cleanTitle(row.title, row.url);
  return {
    id:     row.id,
    t:      uiTitle,
    ty:     row.type as KindType,
    src:    row.source,
    url:    row.url,
    mins:   row.mins,
    tag:    row.tag,
    coll:   row.collectionId,
    when:   `${months[d.getMonth()]} ${d.getDate()}`,
    createdAt: d.toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    deletedAt: row.deletedAt ? new Date(row.deletedAt).toISOString() : null,
    isDeleted: Boolean(row.deletedAt),
    unread: row.unread,
    itemType: row.itemType as ItemType,
    itemTypeGuessed: row.itemTypeGuessed,
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : null,
    ex:     (() => {
      const raw = (row.extra as Record<string, unknown>) || {};
      // Omit 'coverData'/'coverImage' — structured fields, not display strings
      return Object.fromEntries(
        Object.entries(raw).filter(([k, v]) => k !== "coverData" && k !== "coverImage" && typeof v === "string")
      ) as Record<string, string>;
    })(),
    note:   row.note,
    coverData: parseCoverData((row.extra as Record<string, unknown>)?.coverData),
    coverImage: ((row.extra as Record<string, unknown>)?.coverImage as string) || null,
    parentId: row.parentId,
    parentTitle: row.parentId && titleMap ? titleMap.get(row.parentId) || null : null,
    startTimeSec: row.startTimeSec,
    chapterIndex: row.chapterIndex,
    archivedText: row.archivedText,
    lastFetchedAt: row.lastFetchedAt ? new Date(row.lastFetchedAt).toISOString() : null,
    driftStatus: (row.driftStatus as unknown as Bookmark["driftStatus"]) || null,
    driftPercent: row.driftPercent,
    clusterId: row.clusterId,
    clusterTitle: row.clusterTitle,
    coverSource: (row.coverSource as Bookmark["coverSource"]) || null,
    ogImageKey: row.ogImageKey,
    ogImageWidth: row.ogImageWidth,
    ogImageHeight: row.ogImageHeight,
    ogDominantColor: row.ogDominantColor,
    ogLqip: row.ogLqip,
    ogStatus: (row.ogStatus as Bookmark["ogStatus"]) || "PENDING",
    ogRejectReason: row.ogRejectReason,
    faviconKey: row.faviconKey,
    excerptSource: (row.excerptSource as Bookmark["excerptSource"]) || (row.note ? "user-note" : null),
    isQuote: ((row.extra as Record<string, unknown>) || {}).quote === true,
  };
}

// ─── Ensure the user has an "unsorted" fallback collection ───────────────────

async function ensureCollection(userId: string, collId: string): Promise<string> {
  // Accept a proper user-scoped ID or well-known slugs like "unsorted"
  const existing = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collId), eq(collections.userId, userId)));

  if (existing.length > 0) return collId;

  // Resolve simple slugs → user-scoped ID
  const slug = collId.includes("-") ? collId.split("-").pop()! : collId;
  const scopedId = `${userId.slice(-8)}-${slug}`;

  const existing2 = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, scopedId), eq(collections.userId, userId)));

  if (existing2.length > 0) return scopedId;

  // Create it on-the-fly
  const nameMap: Record<string, string> = {
    unsorted: "Unsorted", read: "Read queue", listen: "Listen shelf",
    build: "Build shelf", ai: "AI & retrieval", systems: "Data & storage",
  };
  await db.insert(collections).values({
    id: scopedId,
    userId,
    name: nameMap[slug] || slug,
    icon: "📁",
    color: "#00F0FF",
  }).onConflictDoNothing();

  return scopedId;
}

// ─── GET /api/bookmarks ──────────────────────────────────────────────────────

export async function GET(req?: Request) {
  try {
    const userId = await requireUserId(req);
    let includeDeleted = false;
    let onlyGuessed = false;
    if (req) {
      const { searchParams } = new URL(req.url);
      includeDeleted = searchParams.get("includeDeleted") === "true";
      onlyGuessed = searchParams.get("itemTypeGuessed") === "true";
    }

    const whereClause = and(
      eq(bookmarks.userId, userId),
      includeDeleted ? undefined : isNull(bookmarks.deletedAt),
      onlyGuessed ? eq(bookmarks.itemTypeGuessed, true) : undefined
    );

    const rows = await db
      .select()
      .from(bookmarks)
      .where(whereClause)
      .orderBy(desc(bookmarks.createdAt));

    const titleMap = new Map<number, string>();
    rows.forEach((r) => titleMap.set(r.id, cleanTitle(r.title, r.url)));

    // Non-blocking auto-heal: enrich any rows missing coverImage in the background
    const unenrichedRows = rows.filter((r) => {
      const extra = (r.extra as Record<string, unknown>) || {};
      const hasImage = typeof extra.coverImage === "string" && extra.coverImage.length > 0;
      return !hasImage;
    }).slice(0, 5);

    if (unenrichedRows.length > 0) {
      Promise.allSettled(
        unenrichedRows.map(async (r) => {
          try {
            const extra = (r.extra as Record<string, unknown>) || {};
            const enriched = await enrichBookmarkValues(
              r.url,
              r.type as KindType,
              r.title,
              r.note,
              extra.coverImage as string | null
            );

            if (enriched.coverImage || enriched.note || enriched.title) {
              await db
                .update(bookmarks)
                .set({
                  title: enriched.title,
                  note: enriched.note,
                  excerptSource: enriched.excerptSource,
                  extra: {
                    ...extra,
                    ...(enriched.coverData ? { coverData: enriched.coverData } : {}),
                    ...(enriched.coverImage ? { coverImage: enriched.coverImage } : {}),
                  },
                  updatedAt: new Date(),
                })
                .where(eq(bookmarks.id, r.id));
            }
          } catch {
            // Ignore
          }
        })
      );
    }

    return NextResponse.json(rows.map((r) => dbToUi(r, titleMap)));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[GET /api/bookmarks]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/bookmarks ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    const kind: KindType = body.ty || "ART";
    const capture = applyQuoteCapture({ url: body.url, quote: body.quote, note: body.note });
    const pageUrl = capture.url.split("#")[0];
    const enriched = await enrichBookmarkValues(
      pageUrl,
      kind,
      body.t || body.title,
      capture.isQuote ? capture.note : body.note,
      body.coverImage || body.ex?.coverImage
    );

    const guessedItemType = inferItemType(kind);
    let tag = typeof body.tag === "string" && body.tag.trim() ? body.tag.trim() : "";
    let collectionHint = body.coll || "unsorted";
    let itemType = body.itemType === "REFERENCE" || body.itemType === "QUEUED" ? body.itemType : null;
    const itemTypeGuessed = typeof body.itemTypeGuessed === "boolean" ? body.itemTypeGuessed : itemType == null;
    let note = capture.isQuote ? capture.note : enriched.note;

    if (!body.triaged && !capture.isQuote && itemType == null) {
      const collRows = await db
        .select({ id: collections.id, name: collections.name })
        .from(collections)
        .where(eq(collections.userId, userId));
      const triage = await triageCapture({
        url: pageUrl,
        title: enriched.title,
        description: note || body.note || null,
        kind,
        collections: collRows.length > 0 ? collRows : [{ id: "unsorted", name: "Unsorted" }],
      });
      if (!tag || tag === "general" || tag === "saved") tag = primaryTag(triage.tags);
      if (!body.coll || body.coll === "unsorted") collectionHint = triage.suggestedCollection;
      itemType = triage.itemType;
      if (!note) note = triage.summary;
    }

    const collectionId = await ensureCollection(userId, collectionHint);

    const values = {
      userId,
      title:        enriched.title,
      type:         kind,
      source:       body.src    || "",
      url:          capture.url,
      mins:         capture.isQuote ? 1 : (body.mins ?? (kind === "VID" ? 45 : kind === "PPR" ? 40 : 12)),
      tag:          tag || "general",
      collectionId,
      unread:       body.unread ?? true,
      itemType:     capture.isQuote ? "REFERENCE" : itemType ?? guessedItemType,
      itemTypeGuessed: capture.isQuote ? false : itemTypeGuessed,
      note:         note || "",
      excerptSource: capture.isQuote ? "user-note" : enriched.excerptSource,
      extra:        {
        ...(body.ex || {}),
        ...(enriched.coverData ? { coverData: enriched.coverData } : {}),
        ...(enriched.coverImage ? { coverImage: enriched.coverImage } : {}),
        ...(capture.isQuote ? { quote: true } : {}),
      },
      parentId:     body.parentId ?? null,
      startTimeSec: body.startTimeSec ?? null,
      chapterIndex: body.chapterIndex ?? null,
      archivedText: body.archivedText ?? null,
      driftStatus:  body.driftStatus ?? null,
      driftPercent: body.driftPercent ?? null,
      clusterId:    body.clusterId ?? null,
      clusterTitle: body.clusterTitle ?? null,
    };

    const [row] = await db
      .insert(bookmarks)
      .values(values)
      .onConflictDoUpdate({
        target: [bookmarks.userId, bookmarks.url],
        set: { ...values, deletedAt: null, updatedAt: new Date() },
      })
      .returning();

    scheduleBookmarkEmbedding(row);

    return NextResponse.json(dbToUi(row), { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[POST /api/bookmarks]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
