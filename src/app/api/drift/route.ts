import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";

function extractCleanText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeTokenDrift(oldText: string, newText: string): number {
  const tokenize = (s: string) => s.toLowerCase().match(/\w+/g) || [];
  const t1 = tokenize(oldText);
  const t2 = tokenize(newText);
  if (!t1.length) return t2.length ? 100 : 0;
  const set1 = new Set(t1);
  const set2 = new Set(t2);
  let common = 0;
  set2.forEach((w) => {
    if (set1.has(w)) common++;
  });
  const unionSize = new Set([...t1, ...t2]).size;
  if (unionSize === 0) return 0;
  const jaccardSim = common / unionSize;
  return Math.round((1 - jaccardSim) * 100);
}

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

    let driftStatus: "clean" | "changed" | "404_preserved" = "clean";
    let driftPercent = 0;
    let newArchivedText = bm.archivedText || "";

    try {
      const res = await fetchWithSsrfGuard(bm.url);
      if (res.status === 404 || res.status >= 400 || !res.ok) {
        driftStatus = "404_preserved";
      } else {
        const freshText = extractCleanText(res.text);
        if (!bm.archivedText) {
          newArchivedText = freshText;
          driftStatus = "clean";
          driftPercent = 0;
        } else {
          driftPercent = computeTokenDrift(bm.archivedText, freshText);
          if (driftPercent >= 15) {
            driftStatus = "changed";
          } else {
            driftStatus = "clean";
          }
        }
      }
    } catch (err) {
      console.warn("[DriftCheck] fetch error, setting 404_preserved", err);
      driftStatus = "404_preserved";
    }

    await db
      .update(bookmarks)
      .set({
        archivedText: newArchivedText,
        driftStatus,
        driftPercent,
        lastFetchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(bookmarks.id, bm.id), eq(bookmarks.userId, userId)));

    return NextResponse.json({
      success: true,
      bookmarkId: bm.id,
      driftStatus,
      driftPercent,
      archivedText: newArchivedText,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/drift]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
