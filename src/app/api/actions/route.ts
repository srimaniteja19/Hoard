import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, collections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { KindType } from "@/types";
import { enrichBookmarkValues } from "@/lib/enrichBookmark";
import { detectKind } from "@/lib/detectKind";
import { scheduleBookmarkEmbedding } from "@/lib/embeddings/upsertBookmarkEmbedding";

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

    const bm = bookmark || (action === "add_bookmark" ? body : null);

    if (bm?.url) {
      const kind: KindType = bm.ty || bm.type || detectKind(bm.url);
      const collSlug = (bm.coll || "unsorted").split("-").pop() || "unsorted";
      const collectionId = await ensureCollection(userId, collSlug);

      const enriched = await enrichBookmarkValues(
        bm.url,
        kind,
        bm.t || bm.title,
        bm.note,
        bm.coverImage || bm.ex?.coverImage
      );

      const values = {
        userId,
        title:        enriched.title,
        type:         kind,
        source:       bm.source || bm.src || "Saved via HOARD Extension",
        url:          bm.url,
        mins:         bm.mins ?? (kind === "VID" ? 45 : kind === "PPR" ? 40 : 12),
        tag:          bm.tag  || "general",
        collectionId,
        unread:       bm.unread ?? true,
        note:         enriched.note,
        excerptSource: enriched.excerptSource,
        extra:        {
          ...(bm.ex || {}),
          ...(enriched.coverData ? { coverData: enriched.coverData } : {}),
          ...(enriched.coverImage ? { coverImage: enriched.coverImage } : {}),
        },
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
