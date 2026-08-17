import { NextResponse } from "next/server";
import { db } from "@/db";
import { busyBlocks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { updateBusyBlockSchema } from "@/lib/validations/busyBlocks";

// ─── PATCH /api/busy-blocks/:id ─────────────────────────────────────────────

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const rawBody = await req.json();

    const parseResult = updateBusyBlockSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: busyBlocks.id })
      .from(busyBlocks)
      .where(and(eq(busyBlocks.id, id), eq(busyBlocks.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Busy block not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(busyBlocks)
      .set({ ...parseResult.data, updatedAt: new Date() })
      .where(and(eq(busyBlocks.id, id), eq(busyBlocks.userId, userId)))
      .returning();

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/busy-blocks/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/busy-blocks/:id ────────────────────────────────────────────

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existing = await db
      .select({ id: busyBlocks.id })
      .from(busyBlocks)
      .where(and(eq(busyBlocks.id, id), eq(busyBlocks.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Busy block not found" }, { status: 404 });
    }

    await db.delete(busyBlocks).where(and(eq(busyBlocks.id, id), eq(busyBlocks.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/busy-blocks/[id]]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
