import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash-lite";

const GapSchema = z.object({
  gaps: z
    .array(
      z.object({
        timestamp: z.string(), // "06:12"
        topic: z.string(), // one line
        weight: z.enum(["core", "aside"]),
      })
    )
    .max(8),
  coverageSummary: z.string().optional(),
});

const GAP_SYSTEM = `
Compare a lecture transcript against the notes someone took on it.
List things the transcript covers that the notes never mention.

Rules:
- Only substantive content. Not greetings, admin, sponsor reads, or repetition.
- A topic mentioned in the notes in ANY form is covered, even in different words and even in one line. Do NOT report paraphrases as gaps.
- weight: "core" if the lecture spent real time on it, "aside" if it was a passing remark. Be honest — most gaps are asides, and saying so is the useful part.
- Return at most 8, ordered by transcript position.
- If the notes cover the lecture well, return an empty array. That is a good result, not a failure to find something.
`;

export async function POST(req: NextRequest) {
  try {
    const { transcript, blocks, courseTitle, lessonTitle } = await req.json();

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 20) {
      return NextResponse.json(
        { error: "No transcript provided for gap analysis." },
        { status: 400 }
      );
    }

    const notesSummary = Array.isArray(blocks)
      ? JSON.stringify(blocks, null, 2)
      : "No notes taken yet.";

    const userPrompt = `Course: ${courseTitle || "Course"}
Lesson: ${lessonTitle || "Lesson"}

LECTURE TRANSCRIPT:
${transcript.slice(0, 14000)}

USER'S CURRENT NOTES:
${notesSummary.slice(0, 10000)}`;

    const { object } = await generateObject({
      model: languageModel(NOTEBOOK_MODEL),
      schema: GapSchema,
      system: GAP_SYSTEM,
      prompt: userPrompt,
      providerOptions: {
        google: {
          thinking: { budgetTokens: 0 },
        },
      },
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-gaps"]),
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error("Notebook gap check failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to find gaps in transcript." },
      { status: 500 }
    );
  }
}
