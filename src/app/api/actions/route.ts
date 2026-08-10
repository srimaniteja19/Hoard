import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, collections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { enrichCoverData } from "@/lib/cover-data";

// CORS headers for extension requests (same-origin fetch from injected scripts)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

async function ensureCollection(userId: string, collSlug: string): Promise<string> {
  const scopedId = `${userId.slice(-8)}-${collSlug}`;

  const existing = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, scopedId), eq(collections.userId, userId)));

  if (existing.length > 0) return scopedId;

  const nameMap: Record<string, string> = {
    unsorted: "Unsorted", read: "Read queue", listen: "Listen shelf",
    build: "Build shelf", ai: "AI & retrieval", systems: "Data & storage",
  };

  await db.insert(collections).values({
    id: scopedId,
    userId,
    name: nameMap[collSlug] || collSlug,
    icon: "📁",
    color: "#00F0FF",
  }).onConflictDoNothing();

  return scopedId;
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const { action, bookmark } = body;

    if ((action === "add_bookmark" || bookmark) && bookmark?.url) {
      const collSlug = (bookmark.coll || "unsorted").split("-").pop() || "unsorted";
      const collectionId = await ensureCollection(userId, collSlug);
      const coverData = await enrichCoverData(bookmark.url, bookmark.ty || "ART");

      const [row] = await db
        .insert(bookmarks)
        .values({
          userId,
          title:        bookmark.t    || "Untitled",
          type:         bookmark.ty   || "ART",
          source:       bookmark.source || bookmark.src || "Saved via HOARD Extension",
          url:          bookmark.url,
          mins:         bookmark.mins ?? 5,
          tag:          bookmark.tag  || "general",
          collectionId,
          unread:       bookmark.unread ?? true,
          note:         bookmark.note === "Saved via HOARD Extension" ? "" : (bookmark.note || ""),
          extra:        { ...(bookmark.ex || {}), ...(coverData ? { coverData } : {}) },
        })
        .returning();

      return NextResponse.json(
        { success: true, message: "Bookmark saved.", id: row.id },
        { status: 201, headers: CORS }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid payload" },
      { status: 400, headers: CORS }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please log in to Hoard" },
        { status: 401, headers: CORS }
      );
    }
    console.error("[POST /api/actions]", e);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500, headers: CORS }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { status: "ok", service: "HOARD Link API v2.0.0" },
    { headers: CORS }
  );
}
