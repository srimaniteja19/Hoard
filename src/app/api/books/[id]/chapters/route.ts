import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getBookById, updateBook } from "@/lib/dal/marginalia";
import { gatewayErrorMessage } from "@/lib/ai/models";
import { ChapterItem } from "@/lib/marginalia/types";
import { resolveAuthenticChapters, cleanChapterTitle } from "@/lib/marginalia/chapterExtractor";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const book = await getBookById(userId, id);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({
      chapters: (book.chapters as ChapterItem[]) || [],
      totalChapters: book.totalChapters,
      currentChapter: book.currentChapter,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Resolve / Auto-detect Table of Contents via AI & update book */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const book = await getBookById(userId, id);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const { chapters: resolvedChapters, totalPages } = await resolveAuthenticChapters(
      book.title,
      book.author !== "Unknown Author" ? book.author : undefined
    );

    const updatePayload: Record<string, any> = {
      chapters: resolvedChapters,
      totalChapters: resolvedChapters.length,
    };
    if (totalPages && !book.totalPages) {
      updatePayload.totalPages = totalPages;
    }

    const updated = await updateBook(userId, id, updatePayload);

    return NextResponse.json({
      book: updated,
      chapters: resolvedChapters,
      totalPages: updated?.totalPages || totalPages || null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Update chapters manually */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const body = await req.json();
    const { chapters } = body;

    if (!Array.isArray(chapters)) {
      return NextResponse.json({ error: "Chapters must be an array" }, { status: 400 });
    }

    const cleaned = chapters.map((c: any, idx: number) => ({
      number: c.number || idx + 1,
      title: cleanChapterTitle(c.title || `Chapter ${idx + 1}`),
      page: c.page ? Number(c.page) : undefined,
      duration: c.duration || undefined,
    }));

    const updated = await updateBook(userId, id, {
      chapters: cleaned,
      totalChapters: cleaned.length,
    });

    return NextResponse.json({
      book: updated,
      chapters: cleaned,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
