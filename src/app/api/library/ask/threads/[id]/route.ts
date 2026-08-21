import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { askThreads } from "@/db/schema";
import { AuthError, requireUserId } from "@/lib/session";
import { nameAskFolio } from "@/lib/library/askFolioTitle";
import {
  needsFolioName,
  previewFromMessages,
  titleFromMessages,
  upsertAskThreadSchema,
} from "@/lib/library/askThread";

function serialize(row: typeof askThreads.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    preview: previewFromMessages(row.messages ?? []),
    model: row.model,
    web: row.web,
    messages: row.messages ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const [row] = await db
      .select()
      .from(askThreads)
      .where(and(eq(askThreads.id, id), eq(askThreads.userId, userId)))
      .limit(1);

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: serialize(row) });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/library/ask/threads/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    if (!id || id.length > 80) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const parsed = upsertAskThreadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    const [existing] = await db.select().from(askThreads).where(eq(askThreads.id, id)).limit(1);
    if (existing && existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let title = existing?.title?.trim() || parsed.data.title?.trim() || titleFromMessages(parsed.data.messages);
    if (needsFolioName(existing?.title ?? title, parsed.data.messages)) {
      title = await nameAskFolio(parsed.data.messages);
    }
    const now = new Date();
    const [row] = await db
      .insert(askThreads)
      .values({
        id,
        userId,
        title,
        model: parsed.data.model,
        web: parsed.data.web,
        messages: parsed.data.messages,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: askThreads.id,
        set: {
          title,
          model: parsed.data.model,
          web: parsed.data.web,
          messages: parsed.data.messages,
          updatedAt: now,
        },
      })
      .returning();

    return NextResponse.json({ item: serialize(row) });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PUT /api/library/ask/threads/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const [deleted] = await db
      .delete(askThreads)
      .where(and(eq(askThreads.id, id), eq(askThreads.userId, userId)))
      .returning({ id: askThreads.id });

    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/library/ask/threads/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
