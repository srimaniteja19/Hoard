import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { suggestTagsFromContent } from "@/lib/gist/service";

export async function POST(req: Request) {
  try {
    await requireUserId(req);
    const body = await req.json().catch(() => ({}));

    const result = await suggestTagsFromContent({
      title: typeof body.title === "string" ? body.title : null,
      content: typeof body.content === "string" ? body.content : null,
      text: typeof body.text === "string" ? body.text : null,
      url: typeof body.url === "string" ? body.url : null,
      topK: typeof body.topK === "number" ? body.topK : 4,
      threshold: typeof body.threshold === "number" ? body.threshold : undefined,
    });

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/suggest-tags]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
