import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import {
  getBookById,
  updateBook,
  deleteBook,
  getBookMarginalia,
  getBookPendingMarks,
} from "@/lib/dal/marginalia";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const book = await getBookById(userId, id);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const [notes, pendingMarks] = await Promise.all([
      getBookMarginalia(userId, id),
      getBookPendingMarks(userId, id),
    ]);

    return NextResponse.json({ book, marginalia: notes, pendingMarks });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/books/:id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const body = await req.json();

    const updated = await updateBook(userId, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/books/:id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const success = await deleteBook(userId, id);
    if (!success) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/books/:id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
