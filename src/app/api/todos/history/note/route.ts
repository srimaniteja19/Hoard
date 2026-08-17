import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, AuthError } from "@/lib/session";
import { upsertDayNote } from "@/lib/dal/todos";

const putNoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(280), // one optional line, per §8 — not a journal entry
});

// ─── PUT /api/todos/history/note ─────────────────────────────────────────────

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId(req);
    const rawBody = await req.json();

    const parseResult = putNoteSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    await upsertDayNote(userId, parseResult.data.date, parseResult.data.note);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PUT /api/todos/history/note]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
