import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks, collections } from "@/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { Bookmark, KindType } from "@/types";

type Params = { params: Promise<{ id: string }> };

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
    ex:     (() => {
      const raw = (row.extra as Record<string, unknown>) || {};
      return Object.fromEntries(
        Object.entries(raw).filter(([k, v]) => k !== "coverData" && typeof v === "string")
      ) as Record<string, string>;
    })(),
    note:   row.note,
  };
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;

    // Fetch collection info
    const [coll] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, id));

    if (!coll) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Fetch collection bookmarks
    const rows = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.collectionId, id), isNull(bookmarks.deletedAt)))
      .orderBy(desc(bookmarks.createdAt));

    return NextResponse.json({
      collection: {
        id: coll.id,
        name: coll.name,
        icon: coll.icon,
        color: coll.color,
      },
      bookmarks: rows.map(dbToUi),
    });
  } catch (e) {
    console.error("[GET /api/share/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
