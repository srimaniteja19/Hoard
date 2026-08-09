import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, collections } from "@/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { Bookmark, KindType } from "@/types";

// ─── Shape mapper ────────────────────────────────────────────────────────────

function dbToUi(row: typeof bookmarks.$inferSelect): Bookmark {
  const d = new Date(row.createdAt);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return {
    id:     row.id,
    t:      row.title,
    ty:     row.type as KindType,
    src:    row.source,
    url:    row.url,
    mins:   row.mins,
    tag:    row.tag,
    coll:   row.collectionId,
    when:   `${months[d.getMonth()]} ${d.getDate()}`,
    unread: row.unread,
    ex:     (row.extra as Record<string, string>) || {},
    note:   row.note,
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

    return NextResponse.json(rows.map(dbToUi));
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

    const [row] = await db
      .insert(bookmarks)
      .values({
        userId,
        title:        body.t      || "Untitled",
        type:         body.ty     || "ART",
        source:       body.src    || "",
        url:          body.url,
        mins:         body.mins   ?? 5,
        tag:          body.tag    || "general",
        collectionId,
        unread:       body.unread ?? true,
        note:         body.note   || "",
        extra:        body.ex     || {},
      })
      .returning();

    return NextResponse.json(dbToUi(row), { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[POST /api/bookmarks]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
