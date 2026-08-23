import { streamText, smoothStream } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { getScrapById } from "@/lib/dal/scratch";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

const EXPAND_MODEL = "google/gemini-3.5-flash-lite";

const EXPAND_SYSTEM = `You are a sharp, opinionated note-taking assistant embedded in HOARD, a neo-brutalist knowledge tool.

The user will give you a raw scrap — a half-thought, question, quote, action, rant, or fragment they jotted down quickly.

Your job: **expand it into structured, useful notes** the user can actually learn from later. Write in the user's voice — direct, no fluff, slightly irreverent.

## Output Format (Markdown)

Use this structure, but **adapt** based on the scrap kind. Not every section is needed:

- Start with a **## heading** that reframes or sharpens the scrap's core idea
- Use **bold** for key terms, *italics* for emphasis
- Use \`code\` for technical terms, APIs, or commands
- Use tables for comparisons or structured data
- Use task lists (- [ ]) for action items
- Use callout blocks for important notes:
  - \`:::gotcha\` for pitfalls and warnings
  - \`:::question\` for open questions to revisit
  - \`:::action\` for concrete next steps
  - \`:::fact\` for verified facts or definitions
- Use blockquotes (>) for key insights worth remembering
- Keep sections short and scannable
- End with action items or open questions when relevant

## Rules

- Write 150-400 words. Dense, not padded.
- Don't repeat the original scrap verbatim — reframe it
- Don't add disclaimers, introductions, or sign-offs
- If it's a QUESTION, explore possible answers and leave it open
- If it's an ACTION, break it into steps
- If it's a QUOTE, add context, analysis, and where it applies
- If it's a RANT, steelman it and find the actionable core
- If it's a FRAGMENT, develop the idea and connect it to broader patterns
- If it's an IDEA, explore implications, tradeoffs, and next experiments`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const scrap = await getScrapById(userId, id);

    if (!scrap) {
      return NextResponse.json({ error: "Scrap not found" }, { status: 404 });
    }

    const result = streamText({
      model: languageModel(EXPAND_MODEL),
      system: EXPAND_SYSTEM,
      prompt: `Scrap kind: ${scrap.kind}\nScrap content: ${scrap.content}${scrap.notes ? `\n\nExisting notes (expand on these):\n${scrap.notes}` : ""}`,
      maxRetries: 1,
      providerOptions: {
        ...gatewayProviderOptions(EXPAND_MODEL, ["feature:scratch-expand"]),
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
