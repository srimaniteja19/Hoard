import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { listPlaybooks, createPlaybook, listPlaybookRuns } from "@/lib/dal/playbooks";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const plays = await listPlaybooks(userId);
    const runs = await listPlaybookRuns(userId);

    return NextResponse.json({
      playbooks: plays,
      runs,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/todos/playbooks error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const playbook = await createPlaybook(userId, {
      name: body.name.trim(),
      color: body.color || "violet",
      mode: body.mode || "SEQUENCE",
      steps: body.steps || [],
      defaultVars: body.defaultVars || {},
    });

    return NextResponse.json({ playbook }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/todos/playbooks error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
