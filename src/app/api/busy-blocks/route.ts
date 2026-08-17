import { NextResponse } from "next/server";
import { db } from "@/db";
import { busyBlocks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { createBusyBlockSchema } from "@/lib/validations/busyBlocks";

// ─── GET /api/busy-blocks ────────────────────────────────────────────────────
// The user's weekly template — TODOS.md §7. Not calendar-synced; filled in
// manually, one recurring block at a time.

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const rows = await db
      .select()
      .from(busyBlocks)
      .where(eq(busyBlocks.userId, userId))
      .orderBy(asc(busyBlocks.dayOfWeek), asc(busyBlocks.startTime));

    return NextResponse.json({ items: rows });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/busy-blocks]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/busy-blocks ───────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const rawBody = await req.json();

    const parseResult = createBusyBlockSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(busyBlocks)
      .values({ userId, ...parseResult.data })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/busy-blocks]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
