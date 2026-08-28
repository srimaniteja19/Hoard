import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

const CHAPTERS_MODEL = "google/gemini-3.5-flash";

const ChaptersSchema = z.object({
  bookTitle: z.string(),
  author: z.string().optional(),
  totalChapters: z.number(),
  chapters: z.array(
    z.object({
      number: z.number().describe("Chapter sequence number (1, 2, 3...)"),
      title: z.string().describe("The authentic, accurate chapter title (e.g. 'The Neural Net Heretics', 'The Auction', etc.)"),
      page: z.number().optional().describe("Estimated starting page number if known"),
      duration: z.string().optional().describe("Estimated audio timestamp if audiobook"),
    })
  ).describe("The authentic Table of Contents list with real chapter names"),
});

const CHAPTERS_SYSTEM = `You are a bibliographical reference librarian and Table of Contents curator.
Given a published book's title and author, return its **accurate, authentic Table of Contents (TOC)** with real chapter names and numbers.
If the exact printed chapter titles are known for this published volume, return them verbatim.
If the book is divided into parts or named chapters, return each named chapter in sequential order.
Do not return generic placeholder names like "Chapter 1", "Chapter 2" if the actual book has named chapters.`;

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const body = await req.json();
    const { title, author } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const prompt = `Provide the authentic Table of Contents and chapter titles for the book "${title.trim()}"${
      author ? ` by ${author.trim()}` : ""
    }. Return all sequential chapters with their real titles.`;

    const result = await generateObject({
      model: languageModel(CHAPTERS_MODEL),
      system: CHAPTERS_SYSTEM,
      prompt,
      schema: ChaptersSchema,
      providerOptions: {
        ...gatewayProviderOptions(CHAPTERS_MODEL, ["feature:marginalia-chapter-lookup"]),
      },
    });

    return NextResponse.json({
      chapters: result.object.chapters,
      totalChapters: result.object.chapters.length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
