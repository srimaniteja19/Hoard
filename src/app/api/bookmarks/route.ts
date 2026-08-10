import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, collections } from "@/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { Bookmark, KindType } from "@/types";
import { parseCoverData, enrichCoverData } from "@/lib/cover-data";
import { cleanTitle } from "@/lib/cleanTitle";

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
    unread: row.unread,
    ex:     (() => {
      const raw = (row.extra as Record<string, unknown>) || {};
      // Omit 'coverData' — it's a nested object, not a display string
      return Object.fromEntries(
        Object.entries(raw).filter(([k, v]) => k !== "coverData" && typeof v === "string")
      ) as Record<string, string>;
    })(),
    note:   row.note,
    coverData: parseCoverData((row.extra as Record<string, unknown>)?.coverData),
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

export async function GET() {
  try {
    const userId = await requireUserId();
    const rows = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)))
      .orderBy(desc(bookmarks.createdAt));

    const titleMap = new Map<number, string>();
    rows.forEach((r) => titleMap.set(r.id, cleanTitle(r.title, r.url)));

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

    const collectionId = await ensureCollection(
      userId,
      body.coll || "unsorted"
    );

    const coverData = await enrichCoverData(body.url, body.ty || "ART");

    const [row] = await db
      .insert(bookmarks)
      .values({
        userId,
        title:        cleanTitle(body.t, body.url),
        type:         body.ty     || "ART",
        source:       body.src    || "",
        url:          body.url,
        mins:         body.mins   ?? 5,
        tag:          body.tag    || "general",
        collectionId,
        unread:       body.unread ?? true,
        note:         body.note   || "",
        extra:        { ...(body.ex || {}), ...(coverData ? { coverData } : {}) },
        parentId:     body.parentId ?? null,
        startTimeSec: body.startTimeSec ?? null,
        chapterIndex: body.chapterIndex ?? null,
        archivedText: body.archivedText ?? null,
        driftStatus:  body.driftStatus ?? null,
        driftPercent: body.driftPercent ?? null,
        clusterId:    body.clusterId ?? null,
        clusterTitle: body.clusterTitle ?? null,
      })
      .returning();

    return NextResponse.json(dbToUi(row), { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[POST /api/bookmarks]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
