import { NextResponse } from "next/server";
import { db } from "@/db";
import { collections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUserId, AuthError } from "@/lib/session";
import { detectKindFromUrl } from "@/lib/detectKind";
import { triageCapture, type NamedCollection } from "@/lib/library/triageCapture";
import type { KindType } from "@/types";

const KINDS = new Set(["ART", "VID", "PLY", "GIT", "APP", "PPR", "DOC"]);

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const kind: KindType =
      KINDS.has(body.kind) || KINDS.has(body.ty)
        ? (body.kind || body.ty)
        : detectKindFromUrl(url) ?? "ART";

    const rows = await db
      .select({ id: collections.id, name: collections.name })
      .from(collections)
      .where(eq(collections.userId, userId));

    const named: NamedCollection[] = rows.length > 0 ? rows : [{ id: "unsorted", name: "Unsorted" }];
    const triage = await triageCapture({
      url,
      title: body.title ?? body.t ?? null,
      description: body.description ?? body.note ?? null,
      kind,
      collections: named,
    });

    const collection = named.find((c) => c.id === triage.suggestedCollection);

    return NextResponse.json({
      ...triage,
      collectionName: collection?.name ?? null,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[POST /api/bookmarks/triage]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
