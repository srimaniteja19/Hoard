import { NextRequest, NextResponse } from "next/server";
import { suggestClaims } from "@/lib/reader/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bodyBlocks = [] } = body;

    const claims = await suggestClaims(bodyBlocks);
    return NextResponse.json({ claims });
  } catch (error) {
    console.error("POST /api/reader/suggest-claims error:", error);
    return NextResponse.json(
      { error: "Failed to suggest claims" },
      { status: 500 }
    );
  }
}
