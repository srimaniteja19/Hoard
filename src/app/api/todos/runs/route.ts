import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { listPlaybookRuns, issuePlaybookRun } from "@/lib/dal/playbooks";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const runs = await listPlaybookRuns(userId);
    return NextResponse.json({ runs });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/todos/runs error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    if (!body.playbookId) {
      return NextResponse.json({ error: "playbookId is required" }, { status: 400 });
    }

    const run = await issuePlaybookRun(userId, body.playbookId, body.vars || {});
    return NextResponse.json({ run }, { status: 201 });
  } catch (e: any) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/todos/runs error:", e);
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}
