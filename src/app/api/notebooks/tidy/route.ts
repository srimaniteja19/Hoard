import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { BlocksSchema } from "@/lib/notebooks/blocks";
import { requireUserId, AuthError } from "@/lib/session";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash-lite";

const TIDY_SYSTEM = `
You restructure someone's live lecture notes into clean, well-organized blocks. Return a Block[] array and nothing else.

WHAT YOU MAY DO:
- Group loose lines under concise headings (level 2 or 3).
- Turn a warning, trap, or pitfall into a callout with kind "gotcha".
- Turn an open question the writer asked themselves into kind "question".
- Turn a discovered connection or link into kind "connects" or "fact".
- Turn an action item into a "todo" block with items: [{ text: string, done: boolean }].
- Preserve existing "anchors" blocks with items: [{ timestamp: string, label: string, sectionTag: string }].
- Preserve existing "scale" blocks with items: [{ name: string, pct: number, color?: string }].
- Fix typos, capitalization, and broken formatting.
- Preserve every block id and block type you did not change.

WHAT YOU MAY NOT DO:
- DO NOT ADD information that is not in the notes. You are reorganizing, not teaching.
- DO NOT hallucinate extra explanations or paragraphs.
- DO NOT expand shorthand into long essays.
- Keep the writer's terse voice.
`;

const OutputSchema = z.object({
  blocks: BlocksSchema,
  summaryOfChanges: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const { blocks, courseTitle, lessonTitle } = await req.json();

    if (!Array.isArray(blocks) || blocks.length === 0) {
      return NextResponse.json({ error: "No blocks provided to tidy." }, { status: 400 });
    }

    const userPrompt = `Course: ${courseTitle || "Course"}
Lesson: ${lessonTitle || "Lesson"}

Current blocks as JSON:
${JSON.stringify(blocks, null, 2)}`;

    const { object } = await generateObject({
      model: languageModel(NOTEBOOK_MODEL),
      schema: OutputSchema,
      system: TIDY_SYSTEM,
      prompt: userPrompt,
      providerOptions: {
        google: {
          thinking: { budgetTokens: 0 },
        },
      },
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-tidy"]),
    });

    return NextResponse.json({
      blocks: object.blocks,
      summaryOfChanges: object.summaryOfChanges,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Notebook tidy failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to tidy notes." },
      { status: 500 }
    );
  }
}
