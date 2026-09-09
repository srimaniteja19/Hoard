import { NextRequest, NextResponse } from "next/server";
import { getReaderUserId } from "@/lib/reader/sessionUser";
import { getReaderIssues, getReaderSenders } from "@/lib/dal/reader";
import { db } from "@/db";
import { readerIssues } from "@/db/schema";
import { parseHtmlToBlocks, estimateReadMinutes, countWords } from "@/lib/reader/parser";
import { categoriseIssue } from "@/lib/reader/ai";
import { ReaderCategoryKey } from "@/types/reader";

export async function GET(req: NextRequest) {
  try {
    const userId = await getReaderUserId(req);
    const [issues, senders] = await Promise.all([
      getReaderIssues(userId),
      getReaderSenders(userId),
    ]);

    return NextResponse.json({ issues, senders });
  } catch (error) {
    console.error("GET /api/reader/issues error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve reader issues" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getReaderUserId(req);
    const body = await req.json();

    const {
      sender,
      subject,
      dek = "",
      html,
      bodyBlocks: inputBlocks,
      links = [],
    } = body;

    if (!sender || !subject) {
      return NextResponse.json(
        { error: "Sender and subject are required" },
        { status: 400 }
      );
    }

    // Ingest body: parse HTML to Block[] or use provided blocks
    let bodyBlocks = inputBlocks || null;
    let wordCount = 0;

    if (html && !bodyBlocks) {
      bodyBlocks = parseHtmlToBlocks(html);
      wordCount = countWords(html);
    } else if (bodyBlocks) {
      wordCount = countWords(JSON.stringify(bodyBlocks));
    }

    const readMinutes = estimateReadMinutes(wordCount);

    // AI Categorisation
    let category: ReaderCategoryKey = body.category || "unsorted";
    let categoryConfidence = body.categoryConfidence ?? 1.0;

    if (!body.category) {
      const catResult = await categoriseIssue(sender, subject, dek);
      category = catResult.category;
      categoryConfidence = catResult.confidence;
    }

    const [created] = await db
      .insert(readerIssues)
      .values({
        id: crypto.randomUUID(),
        userId,
        sender,
        subject,
        dek,
        category,
        categoryConfidence,
        wordCount,
        readMinutes,
        bodyBlocks,
        links,
        status: "unread",
        keptCount: 0,
      })
      .returning();

    return NextResponse.json({ issue: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reader/issues error:", error);
    return NextResponse.json(
      { error: "Failed to create reader issue" },
      { status: 500 }
    );
  }
}
