import { NextRequest, NextResponse } from "next/server";
import { getReaderUserId } from "@/lib/reader/sessionUser";
import { fileAllSessionKeeps } from "@/lib/dal/reader";

export async function POST(req: NextRequest) {
  try {
    const userId = await getReaderUserId(req);
    const body = await req.json();
    const { sessionIssueIds = [] } = body;

    const result = await fileAllSessionKeeps(userId, sessionIssueIds);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/reader/file-all error:", error);
    return NextResponse.json(
      { error: "Failed to file session keeps" },
      { status: 500 }
    );
  }
}
