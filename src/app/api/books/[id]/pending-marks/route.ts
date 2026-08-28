import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import {
  getBookPendingMarks,
  createPendingMark,
  updatePendingMarkStatus,
  deletePendingMark,
  getBookById,
} from "@/lib/dal/marginalia";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id: bookId } = await params;

    const marks = await getBookPendingMarks(userId, bookId);
    return NextResponse.json({ marks });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/books/:id/pending-marks]", e);
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

    const timestamp = (body.timestamp || "").trim() || "00:00";
    const chapter = body.chapter ? Number(body.chapter) : (book.currentChapter || 1);
    const note = body.note ? String(body.note).trim() : null;

    const created = await createPendingMark({
      userId,
      bookId,
      timestamp,
      chapter,
      note,
      status: "PENDING",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/books/:id/pending-marks]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();
    const { markId, status } = body;

    if (!markId || !status) {
      return NextResponse.json({ error: "markId and status required" }, { status: 400 });
    }

    const success = await updatePendingMarkStatus(userId, markId, status);
    return NextResponse.json({ success });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/books/:id/pending-marks]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const markId = searchParams.get("markId");

    if (!markId) {
      return NextResponse.json({ error: "markId required" }, { status: 400 });
    }

    const success = await deletePendingMark(userId, markId);
    return NextResponse.json({ success });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/books/:id/pending-marks]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
