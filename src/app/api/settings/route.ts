import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";

const updateSettingsSchema = z.object({
  todoCalibrationPaddingEnabled: z.boolean().optional(),
});

// ─── GET /api/settings ───────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const [row] = await db
      .select({ timezone: users.timezone, todoCalibrationPaddingEnabled: users.todoCalibrationPaddingEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/settings]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/settings ─────────────────────────────────────────────────────

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId(req);
    const rawBody = await req.json();

    const parseResult = updateSettingsSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const data = parseResult.data;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ timezone: users.timezone, todoCalibrationPaddingEnabled: users.todoCalibrationPaddingEnabled });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/settings]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
