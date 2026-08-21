import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { askSaves } from "@/db/schema";
import { AuthError, requireUserId } from "@/lib/session";
import { createAskSaveSchema } from "@/lib/library/askSave";

function serialize(row: typeof askSaves.$inferSelect) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    summary: row.summary,
    citations: row.citations ?? [],
    model: row.model,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const rows = await db
      .select()
      .from(askSaves)
      .where(eq(askSaves.userId, userId))
      .orderBy(desc(askSaves.createdAt))
      .limit(50);

    return NextResponse.json({ items: rows.map(serialize) });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/library/ask/saves]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const parsed = createAskSaveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    const [row] = await db
      .insert(askSaves)
      .values({
        userId,
        question: parsed.data.question,
        answer: parsed.data.answer,
        summary: parsed.data.summary,
        citations: parsed.data.citations,
        model: parsed.data.model,
      })
      .returning();

    return NextResponse.json({ item: serialize(row) }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/library/ask/saves]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
