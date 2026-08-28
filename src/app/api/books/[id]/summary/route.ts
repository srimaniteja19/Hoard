import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getBookById, updateBook, getBookMarginalia } from "@/lib/dal/marginalia";
import { gatewayErrorMessage } from "@/lib/ai/models";
import { generateBookSummary } from "@/lib/marginalia/summaryGenerator";
import { ChapterItem } from "@/lib/marginalia/types";

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
      summary: book.summary || null,
      bookId: book.id,
      bookTitle: book.title,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Generate or regenerate AI Chapter-by-Chapter Categorized Briefing */
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

    const notes = await getBookMarginalia(userId, id);
    const chapters = (book.chapters as ChapterItem[]) || [];

    const summaryData = await generateBookSummary({
      title: book.title,
      author: book.author,
      chapters,
      notes,
    });

    const updated = await updateBook(userId, id, {
      summary: summaryData,
    });

    return NextResponse.json({
      book: updated,
      summary: summaryData,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Delete / Clear the stored summary */
export async function DELETE(
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

    const updated = await updateBook(userId, id, {
      summary: null,
    });

    return NextResponse.json({
      book: updated,
      success: true,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
