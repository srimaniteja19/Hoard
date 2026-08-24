import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getScraps, createScrap, getScratchStats } from "@/lib/dal/scratch";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const includeBuried = searchParams.get("includeBuried") === "true";

    const [items, stats] = await Promise.all([
      getScraps(userId, { includeBuried }),
      getScratchStats(userId),
    ]);

    return NextResponse.json({ items, stats });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/scratch]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const created = await createScrap(userId, {
      content: body.content,
      notes: body.notes,
      kind: body.kind,
      loggedFor: body.loggedFor,
      occurredOn: body.occurredOn,
      clientDate: body.clientDate,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/scratch]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
