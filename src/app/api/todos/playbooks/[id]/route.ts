import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import {
  getPlaybookById,
  updatePlaybook,
  archivePlaybook,
  duplicatePlaybook,
} from "@/lib/dal/playbooks";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const playbook = await getPlaybookById(userId, id);
    if (!playbook) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }
    return NextResponse.json({ playbook });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

    const updated = await updatePlaybook(userId, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }
    return NextResponse.json({ playbook: updated });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    const ok = await archivePlaybook(userId, id);
    if (!ok) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.action === "duplicate") {
      const duplicated = await duplicatePlaybook(userId, id);
      if (!duplicated) {
        return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
      }
      return NextResponse.json({ playbook: duplicated }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
