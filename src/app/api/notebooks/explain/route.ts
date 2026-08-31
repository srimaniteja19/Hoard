import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash-lite";

const EXPLAIN_SYSTEM = `
Explain the selected passage from someone's course notes at the level of a competent programmer who is new to this specific topic. Two to four short paragraphs.

Use the surrounding notes for context but do not repeat them back. Never say "as your notes mention". If the passage is ambiguous, say which reading you took and why.
End with one sentence naming what this is commonly confused with.
`;

export async function POST(req: NextRequest) {
  try {
    const { selection, context, courseTitle, lessonTitle } = await req.json();

    if (!selection || typeof selection !== "string" || selection.trim().length === 0) {
      return NextResponse.json({ error: "No text selection provided." }, { status: 400 });
    }

    const userPrompt = `Course: ${courseTitle || "Course"}
Lesson: ${lessonTitle || "Lesson"}

Selection to explain:
${selection.trim()}

Surrounding notes for context:
${context ? context.slice(0, 3000) : "None"}`;

    const { text } = await generateText({
      model: languageModel(NOTEBOOK_MODEL),
      system: EXPLAIN_SYSTEM,
      prompt: userPrompt,
      providerOptions: {
        google: {
          thinking: { budgetTokens: 0 },
        },
      },
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-explain"]),
    });

    return NextResponse.json({
      explanation: text,
      selection: selection.trim(),
    });
  } catch (err) {
    console.error("Notebook explain failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to explain passage." },
      { status: 500 }
    );
  }
}
