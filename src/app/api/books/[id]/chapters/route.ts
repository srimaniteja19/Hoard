import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getBookById, updateBook } from "@/lib/dal/marginalia";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { ChapterItem } from "@/lib/marginalia/types";

const CHAPTERS_MODEL = "google/gemini-3.5-flash";

const ChaptersSchema = z.object({
  chapters: z.array(
    z.object({
      number: z.number(),
      title: z.string(),
      page: z.number().optional(),
      duration: z.string().optional(),
    })
  ),
});

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

    const prompt = `Provide the authentic Table of Contents and chapter titles for the book "${book.title}" by ${book.author}. Return all sequential chapters with their real titles.`;

    const result = await generateObject({
      model: languageModel(CHAPTERS_MODEL),
      system: "You are a bibliographical reference librarian. Return the authentic Table of Contents chapter list for this published book.",
      prompt,
      schema: ChaptersSchema,
      providerOptions: {
        ...gatewayProviderOptions(CHAPTERS_MODEL, ["feature:marginalia-chapter-resolve"]),
      },
    });

    const resolvedChapters = result.object.chapters;

    const updated = await updateBook(userId, id, {
      chapters: resolvedChapters,
      totalChapters: resolvedChapters.length,
    });

    return NextResponse.json({
      book: updated,
      chapters: resolvedChapters,
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

    const updated = await updateBook(userId, id, {
      chapters,
      totalChapters: chapters.length,
    });

    return NextResponse.json({
      book: updated,
      chapters,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
