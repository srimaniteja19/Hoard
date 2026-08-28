import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getBookMarginalia, createMarginaliaNote, getBookById } from "@/lib/dal/marginalia";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id: bookId } = await params;

    const notes = await getBookMarginalia(userId, bookId);
    return NextResponse.json({ notes });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/books/:id/marginalia]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id: bookId } = await params;
    const body = await req.json();

    const book = await getBookById(userId, bookId);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const kind = body.kind || "VERBATIM";
    const quote = body.quote ? String(body.quote).trim() : null;
    const note = body.note ? String(body.note).trim() : null;
    const chapter = body.chapter ? Number(body.chapter) : (book.currentChapter || 1);
    const page = body.page ? Number(body.page) : null;
    const timestamp = body.timestamp ? String(body.timestamp).trim() : null;

    if (!quote && !note) {
      return NextResponse.json({ error: "Quote or note is required" }, { status: 400 });
    }

    const created = await createMarginaliaNote({
      userId,
      bookId,
      kind,
      quote,
      note,
      chapter,
      page,
      timestamp,
      promotedTo: null,
      promotedId: null,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/books/:id/marginalia]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
