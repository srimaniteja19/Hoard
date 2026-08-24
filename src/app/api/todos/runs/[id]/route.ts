import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import {
  togglePlaybookRunStep,
  advancePlaybookRun,
  closePlaybookRun,
  abandonPlaybookRun,
} from "@/lib/dal/playbooks";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const body = await req.json();

    if (body.action === "toggleStep") {
      if (typeof body.stepIndex !== "number") {
        return NextResponse.json({ error: "stepIndex must be a number" }, { status: 400 });
      }
      const updated = await togglePlaybookRunStep(userId, id, body.stepIndex);
      if (!updated) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }
      return NextResponse.json({ run: updated });
    }

    if (body.action === "advance") {
      const updated = await advancePlaybookRun(userId, id);
      if (!updated) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }
      return NextResponse.json({ run: updated });
    }

    if (body.action === "close") {
      const updated = await closePlaybookRun(userId, id);
      if (!updated) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }
      return NextResponse.json({ run: updated });
    }

    if (body.action === "abandon") {
      const updated = await abandonPlaybookRun(userId, id);
      if (!updated) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }
      return NextResponse.json({ run: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/todos/runs/[id] error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
