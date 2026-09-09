import { NextRequest, NextResponse } from "next/server";
import { getReaderUserId } from "@/lib/reader/sessionUser";
import { createReaderKeep } from "@/lib/dal/reader";
import { validateKeepReason } from "@/lib/reader/validation";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: issueId } = await context.params;
    const userId = await getReaderUserId(req);
    const body = await req.json();

    const { kind = "CLAIM", quote = "", reason = "", color, linkUrl } = body;

    // Rule 1: A Keep REQUIRES a reason of 3+ words.
    const validation = validateKeepReason(reason);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.status, details: validation },
        { status: 400 }
      );
    }

    const keep = await createReaderKeep(userId, {
      issueId,
      kind,
      quote,
      reason: reason.trim(),
      color,
      linkUrl,
    });

    return NextResponse.json({ keep }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reader/issues/[id]/keeps error:", error);
    return NextResponse.json(
      { error: "Failed to create keep" },
      { status: 500 }
    );
  }
}
