import { NextRequest, NextResponse } from "next/server";
import { categoriseIssue } from "@/lib/reader/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sender = "", subject = "", dek = "" } = body;

    const result = await categoriseIssue(sender, subject, dek);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/reader/categorise error:", error);
    return NextResponse.json(
      { error: "Failed to categorise issue" },
      { status: 500 }
    );
  }
}
