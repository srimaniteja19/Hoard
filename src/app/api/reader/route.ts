import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { fetchWithSsrfGuard } from "@/lib/security/ssrfGuard";
import { extractArticleText } from "@/lib/library/readerExtractor";
import { scheduleBookmarkEmbedding } from "@/lib/embeddings/upsertBookmarkEmbedding";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { bookmarkId, forceRefresh } = await req.json();

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

    // Return cached text if available and refresh not forced
    if (bm.archivedText && !forceRefresh) {
      const words = bm.archivedText.split(/\s+/).filter(Boolean);
      return NextResponse.json({
        success: true,
        title: bm.title,
        content: bm.archivedText,
        source: bm.source,
        url: bm.url,
        byline: (bm.extra as Record<string, string>)?.byline || undefined,
        wordCount: words.length,
        readMins: Math.max(1, Math.round(words.length / 200)),
        cached: true,
      });
    }

    // Fetch and extract fresh readable text
    let parsedContent = bm.note || "";
    let byline: string | undefined;
    let wordCount = 0;
    let readMins = 1;

    try {
      const res = await fetchWithSsrfGuard(bm.url);
      if (res.ok && res.text) {
        const parsed = extractArticleText(res.text, bm.title, bm.url);
        parsedContent = parsed.content;
        byline = parsed.byline;
        wordCount = parsed.wordCount;
        readMins = parsed.readMins;
      }
    } catch (fetchErr) {
      console.warn("[Reader] Fetch error, falling back to note:", fetchErr);
      if (!parsedContent) {
        parsedContent = `# ${bm.title}\n\nUnable to fetch remote text content for ${bm.url}.`;
      }
    }

    // Update database row with extracted text
    const updatedExtra = {
      ...(bm.extra as Record<string, unknown> || {}),
      ...(byline ? { byline } : {}),
    };

    await db
      .update(bookmarks)
      .set({
        archivedText: parsedContent,
        extra: updatedExtra,
        updatedAt: new Date(),
      })
      .where(and(eq(bookmarks.id, bm.id), eq(bookmarks.userId, userId)));

    scheduleBookmarkEmbedding({
      ...bm,
      archivedText: parsedContent,
    });

    return NextResponse.json({
      success: true,
      title: bm.title,
      content: parsedContent,
      source: bm.source,
      url: bm.url,
      byline,
      wordCount,
      readMins,
      cached: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Reader Route Error]", err);
    return NextResponse.json({ error: "Failed to extract reader content" }, { status: 500 });
  }
}
