import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { fetchVector } from "@/lib/library/fetchVector";
import { computeTimeDistance, SynapseNode } from "@/lib/synapse/synapseTrail";
import { getBookmarkDate } from "@/lib/library/timeCapsule";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { bookmarkId } = await req.json();

    if (!bookmarkId) {
      return NextResponse.json({ error: "Missing bookmarkId" }, { status: 400 });
    }

    const [bm] = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.id, Number(bookmarkId)), eq(bookmarks.userId, userId)));

    if (!bm) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    const targetDate = bm.createdAt ? new Date(bm.createdAt) : new Date();
    const queryText = `${bm.title} ${bm.tag || ""} ${bm.note || ""}`.trim();

    let connections: SynapseNode[] = [];

    try {
      const vectorHits = await fetchVector(userId, queryText, 8);

      connections = vectorHits
        .filter((hit) => !(hit.ownerType === "bookmark" && Number(hit.ownerId) === bm.id))
        .map((hit) => {
          const sim = Math.min(99, Math.max(50, Math.round(100 - hit.rank * 5)));
          const connType =
            hit.ownerType === "til"
              ? "TIL Synthesis"
              : hit.note && hit.note.length > 20
              ? "Conceptual Echo"
              : "Topic Sibling";

          return {
            id: `${hit.ownerType}-${hit.ownerId}`,
            ownerType: hit.ownerType,
            title: hit.title,
            url: hit.url,
            kind: hit.kind,
            note: hit.note,
            similarity: sim,
            connectionType: connType,
            timeDistance: "Connected via Vector Embeddings",
          };
        });
    } catch (vectorErr) {
      console.warn("[Synapse Route] vector fetch warning:", vectorErr);
    }

    return NextResponse.json({
      success: true,
      targetId: bm.id,
      targetTitle: bm.title,
      connections,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Synapse Route Error]", err);
    return NextResponse.json({ error: "Failed to fetch synapse trail" }, { status: 500 });
  }
}
