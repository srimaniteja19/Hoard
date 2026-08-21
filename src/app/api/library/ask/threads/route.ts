import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { askThreads } from "@/db/schema";
import { AuthError, requireUserId } from "@/lib/session";
import { previewFromMessages } from "@/lib/library/askThread";

function serializeList(row: typeof askThreads.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    preview: previewFromMessages(row.messages ?? []),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const rows = await db
      .select()
      .from(askThreads)
      .where(eq(askThreads.userId, userId))
      .orderBy(desc(askThreads.updatedAt))
      .limit(80);

    return NextResponse.json({ items: rows.map(serializeList) });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/library/ask/threads]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
