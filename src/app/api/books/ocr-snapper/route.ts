import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

const VISION_MODEL = "google/gemini-3.5-flash";

const OcrSchema = z.object({
  quote: z.string().describe("The primary highlighted sentence, paragraph, or key passage on the page. Clean all OCR artifacts, hyphens across linebreaks, and format with proper punctuation."),
  pageNumber: z.number().nullable().describe("The detected page number printed in the header/footer of the page, or null if unreadable"),
  chapterTitle: z.string().nullable().describe("The chapter heading or number if visible on the page (e.g. 'Chapter 4: The Habit Loop')"),
  suggestedReflection: z.string().describe("A sharp, thought-provoking 1-2 sentence reflection analyzing the deeper meaning of this quote"),
  suggestedAction: z.string().describe("A concrete, practical 1-sentence action item applying this insight to daily work or life"),
  pageSummary: z.string().describe("A concise 1-sentence summary of the surrounding context on this page"),
});

const OCR_SYSTEM = `You are a high-precision multimodal book scanner and reading analyst in HOARD.
The user has photographed or screenshotted a physical book page, Kindle screen, or reading document.

Your task:
1. Identify any **highlighted text** (yellow marker, pencil underline, or Kindle highlight). If multiple passages are highlighted, extract the most impactful one, or combine them cleanly. If no explicit highlight exists, extract the most profound pull-quote on the page.
2. Read the page header/footer to detect the **Page Number** and **Chapter Title**.
3. Fix all hyphenated linebreaks (e.g. "com- / patibility" -> "compatibility") and OCR artifacts.
4. Formulate an insightful personal reflection and an actionable habit/todo step based on the excerpt.`;

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg", bookTitle, bookAuthor } = body as {
      imageBase64?: string;
      mimeType?: string;
      bookTitle?: string;
      bookAuthor?: string;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // Strip data URL prefix if provided
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

    const contextPrompt = [
      bookTitle ? `Currently Reading Book: "${bookTitle}"` : null,
      bookAuthor ? `Author: "${bookAuthor}"` : null,
      "Please scan this page photo and extract the highlighted quote, page number, chapter, and reflections.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await generateObject({
      model: languageModel(VISION_MODEL),
      system: OCR_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: contextPrompt },
            {
              type: "image",
              image: Buffer.from(cleanBase64, "base64"),
            },
          ],
        },
      ],
      schema: OcrSchema,
      providerOptions: {
        ...gatewayProviderOptions(VISION_MODEL, ["feature:marginalia-ocr-snapper"]),
      },
    });

    return NextResponse.json({ result: result.object });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
