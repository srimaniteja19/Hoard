import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getUserChannel100Store,
  syncChannel100Store,
  upsertChannel100Entry,
  deleteChannel100Entry,
} from "@/lib/dal/channel100";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ authenticated: false, store: null });
    }

    const store = await getUserChannel100Store(session.user.id);
    return NextResponse.json({ authenticated: true, store });
  } catch (error) {
    console.error("[GET /api/channel100]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (body.action === "update" && body.id) {
      await upsertChannel100Entry(
        session.user.id,
        body.id,
        body.record || {},
        body.customMeta
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === "delete" && body.id) {
      await deleteChannel100Entry(session.user.id, body.id);
      return NextResponse.json({ success: true });
    }

    if (body.action === "sync" && body.shows) {
      const syncedStore = await syncChannel100Store(
        session.user.id,
        body.shows,
        body.custom
      );
      return NextResponse.json({ success: true, store: syncedStore });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/channel100]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
