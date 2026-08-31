import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash-lite";

const QuizSchema = z.object({
  questions: z
    .array(
      z.object({
        prompt: z.string(),
        kind: z.enum(["recall", "apply", "connect"]),
        answer: z.string(),
        fromBlockId: z.string(), // must exist in the page
      })
    )
    .max(8),
  notEnough: z.boolean(), // true when the page is too thin to quiz
  explanation: z.string().optional(),
});

const QUIZ_SYSTEM = `
Generate questions answerable ONLY from the page blocks provided below.
Every question carries the id of the block it came from — if you cannot cite a block id, do NOT ask the question.

kind:
  recall  — a fact or definition stated directly on the page
  apply   — a small practical scenario applying a rule or code snippet stated on the page
  connect — relates two concepts on this page to each other

RULES:
- Never quiz on material the page does not contain, however central it is to the topic. The gap is the writer's to notice, not yours to paper over.
- If the page has fewer than three quizzable claims (e.g. an empty or stub page), return notEnough: true and an empty array. A thin page should say so, not produce filler.
`;

export async function POST(req: NextRequest) {
  try {
    const { blocks, courseTitle, lessonTitle } = await req.json();

    if (!Array.isArray(blocks) || blocks.length === 0) {
      return NextResponse.json({
        questions: [],
        notEnough: true,
        explanation: "No notes written on this page yet to generate quiz questions.",
      });
    }

    const userPrompt = `Course: ${courseTitle || "Course"}
Lesson: ${lessonTitle || "Lesson"}

Page blocks:
${JSON.stringify(blocks, null, 2)}`;

    const { object } = await generateObject({
      model: languageModel(NOTEBOOK_MODEL),
      schema: QuizSchema,
      system: QUIZ_SYSTEM,
      prompt: userPrompt,
      providerOptions: {
        google: {
          thinking: { budgetTokens: 0 },
        },
      },
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-quiz"]),
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error("Notebook quiz failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to generate quiz." },
      { status: 500 }
    );
  }
}
