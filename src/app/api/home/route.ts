import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getHomeEdition } from "@/lib/home/edition";
import type { ContextType } from "@/types";

const VALID_CONTEXTS: ContextType[] = ["all", "desk", "commute", "wind"];

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);

    const minutesParam = Number(searchParams.get("minutes"));
    const minutes = Number.isFinite(minutesParam) && minutesParam > 0 ? minutesParam : 180;

    const contextParam = searchParams.get("context") as ContextType | null;
    const context: ContextType = contextParam && VALID_CONTEXTS.includes(contextParam) ? contextParam : "all";

    const edition = await getHomeEdition(userId, { minutes, context });

    return NextResponse.json(edition, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/home]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
