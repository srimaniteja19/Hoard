import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getScrapById, updateScrap, deleteScrap } from "@/lib/dal/scratch";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;

    const scrap = await getScrapById(userId, id);
    if (!scrap) {
      return NextResponse.json({ error: "Scrap not found" }, { status: 404 });
    }

    return NextResponse.json(scrap);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/scratch/:id]", e);
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

    const updated = await updateScrap(userId, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Scrap not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PATCH /api/scratch/:id]", e);
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

    const ok = await deleteScrap(userId, id);
    if (!ok) {
      return NextResponse.json({ error: "Scrap not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/scratch/:id]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
