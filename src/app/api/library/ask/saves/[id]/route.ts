import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { askSaves } from "@/db/schema";
import { AuthError, requireUserId } from "@/lib/session";
import { needsKeptTitle, snippetKeptTitle } from "@/lib/library/askSave";
import { nameAskStamp } from "@/lib/library/askFolioTitle";

function serialize(row: typeof askSaves.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    question: row.question,
    answer: row.answer,
    summary: row.summary,
    citations: row.citations ?? [],
    model: row.model,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const [row] = await db
      .select()
      .from(askSaves)
      .where(and(eq(askSaves.id, id), eq(askSaves.userId, userId)))
      .limit(1);

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!needsKeptTitle(row.title, row.question)) {
      return NextResponse.json({ item: serialize(row) });
    }

    const title = await nameAskStamp(row.question, row.answer, snippetKeptTitle(row.question));
    const [updated] = await db
      .update(askSaves)
      .set({ title })
      .where(and(eq(askSaves.id, id), eq(askSaves.userId, userId)))
      .returning();

    return NextResponse.json({ item: serialize(updated ?? { ...row, title }) });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/library/ask/saves/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const [deleted] = await db
      .delete(askSaves)
      .where(and(eq(askSaves.id, id), eq(askSaves.userId, userId)))
      .returning({ id: askSaves.id });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/library/ask/saves/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
