import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getUserBooks, createBook, getMarginaliaStats } from "@/lib/dal/marginalia";
import { resolveBookCover } from "@/lib/marginalia/coverResolver";
import { seedHouseStyle } from "@/lib/marginalia/houseMotifs";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const [booksList, stats] = await Promise.all([
      getUserBooks(userId),
      getMarginaliaStats(userId),
    ]);

    return NextResponse.json({ books: booksList, stats });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/books]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    const title = (body.title || "").trim();
    const author = (body.author || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const house = seedHouseStyle(title, author);

    let coverUrl = body.coverUrl || null;
    let coverSource = body.coverSource || "HOUSE";
    let totalChapters = body.totalChapters ? Number(body.totalChapters) : null;
    let totalPages = body.totalPages ? Number(body.totalPages) : null;
    let audioDuration = body.audioDuration || null;
    let resolvedIsbn = body.isbn || null;
    let resolvedAuthor = author || "Unknown Author";

    if (!body.skipLookup) {
      const resolved = await resolveBookCover({
        title,
        author: resolvedAuthor !== "Unknown Author" ? resolvedAuthor : undefined,
        isbn: resolvedIsbn,
        format: body.format,
        customCoverUrl: body.customCoverUrl,
        accentColor: body.accentColor,
        fgColor: body.fgColor,
        motif: body.motif,
      });

      if (!coverUrl) {
        coverUrl = resolved.coverUrl;
        coverSource = resolved.coverSource;
      }
      if (!totalPages && resolved.metadata?.pageCount) {
        totalPages = resolved.metadata.pageCount;
      }
      if (!totalChapters && resolved.metadata?.chapterCount) {
        totalChapters = resolved.metadata.chapterCount;
      }
      if (!audioDuration && resolved.metadata?.audioDuration) {
        audioDuration = resolved.metadata.audioDuration;
      }
      if (!resolvedIsbn && resolved.metadata?.suggestedIsbn) {
        resolvedIsbn = resolved.metadata.suggestedIsbn;
      }
      if (resolvedAuthor === "Unknown Author" && resolved.metadata?.suggestedAuthor) {
        resolvedAuthor = resolved.metadata.suggestedAuthor;
      }
    }

    const created = await createBook({
      userId,
      title,
      author: resolvedAuthor,
      isbn: resolvedIsbn,
      format: body.format || "AUDIO",
      accentColor: body.accentColor || house.accentColor,
      fgColor: body.fgColor || house.fgColor,
      motif: body.motif || house.motif,
      initial: body.initial || house.initial,
      totalChapters: totalChapters || 1,
      currentChapter: body.currentChapter ? Number(body.currentChapter) : 1,
      totalPages: totalPages,
      currentPage: body.currentPage ? Number(body.currentPage) : null,
      audioDuration,
      audioCurrentTime: body.audioCurrentTime || null,
      startedDate: body.startedDate || new Date().toISOString().slice(0, 10),
      status: body.status || "READING",
      coverUrl,
      coverSource,
      customCoverUrl: body.customCoverUrl || null,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/books]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
