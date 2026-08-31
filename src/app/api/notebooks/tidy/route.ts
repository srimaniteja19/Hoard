import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { BlocksSchema } from "@/lib/notebooks/blocks";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash";

const TIDY_SYSTEM = `
You restructure someone's live lecture notes. Return a Block[] array and nothing else.

WHAT YOU MAY DO
- Group loose lines under headings (level 2 or 3) that name what the section is about
- Turn a warning, trap, or pitfall into a callout with kind "gotcha"
- Turn an open question the writer asked themselves into kind "question"
- Turn a discovered connection or link to another course/concept into kind "connects" or "fact"
- Turn an action item or todo into a "todo" block with items: [{ text: string, done: boolean }]
- Fix typos, capitalisation, and broken markdown
- Merge two fragments that are obviously one thought
- Preserve every block id you did not change

WHAT YOU MAY NOT DO
- Add information that is not in the notes. You are reorganising, not teaching.
- Expand shorthand into full sentences that assert more than the writer wrote.
  "reflection needs outside evidence" stays that claim; it does not become a
  paragraph explaining why, unless the reason is already in the notes.
- Delete a block because it seems unfinished. A one-line fragment is a note.
- Touch mark blocks with text: null. Those are unfilled lecture marks and the
  writer is the only one who knows what they meant.
- Change code blocks except to fix indentation.
- Smooth the writer's voice into neutral prose. Terse is not a defect.

If the notes are already structured, return them unchanged. Doing nothing is a
correct output.
`;

const OutputSchema = z.object({
  blocks: BlocksSchema,
  summaryOfChanges: z.string(),
});

export async function POST(req: NextRequest) {
  try {
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
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-tidy"]),
    });

    return NextResponse.json({
      blocks: object.blocks,
      summaryOfChanges: object.summaryOfChanges,
    });
  } catch (err) {
    console.error("Notebook tidy failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to tidy notes." },
      { status: 500 }
    );
  }
}
