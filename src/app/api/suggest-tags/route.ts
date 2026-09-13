import { NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { suggestTagsFromContent } from "@/lib/gist/service";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function POST(req: Request) {
  try {
    // Optional authentication check - allows guest/extension requests without breaking
    try {
      await requireUserId(req);
    } catch {
      // Allow unauthenticated calls
    }

    const body = await req.json().catch(() => ({}));

    const result = await suggestTagsFromContent({
      title: typeof body.title === "string" ? body.title : null,
      content: typeof body.content === "string" ? body.content : null,
      text: typeof body.text === "string" ? body.text : null,
      url: typeof body.url === "string" ? body.url : null,
      topK: typeof body.topK === "number" ? body.topK : 4,
      threshold: typeof body.threshold === "number" ? body.threshold : undefined,
    });

    return NextResponse.json(result, { headers: CORS });
  } catch (e) {
    console.error("[POST /api/suggest-tags]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: CORS });
  }
}
