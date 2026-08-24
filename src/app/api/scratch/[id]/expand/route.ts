import { streamText, smoothStream } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getScrapById } from "@/lib/dal/scratch";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

const EXPAND_MODEL = "google/gemini-3.5-flash";

const EXPAND_SYSTEM = `You are a sharp, opinionated note-taking assistant embedded in HOARD, a neo-brutalist knowledge tool.

The user will give you a raw scrap — a half-thought, question, quote, action, rant, or fragment they jotted down quickly.

Your job: **expand it into rich, structured, visual notes** the user will love reading and learning from. Write in the user's voice — direct, incisive, punchy, slightly irreverent.

## Visual & Structural Elements You MUST Include:

1. **Handwritten Notes (\`:::hand\` ... \`:::\`)**:
   Always include at least one \`:::hand\` block for a raw intuitive reflection, personal gut-check, or memorable cursive pull-quote.
   Example:
   :::hand
   "Physical attraction isn't superficial — it's millions of years of evolutionary biochemistry running compatibility checks."
   :::

2. **Diagrams, Infographics & Illustrations (\`:::ink <Caption>\` ... \`:::\`)**:
   Always generate a clean, responsive neo-brutalist inline SVG diagram or flowchart inside a \`:::ink <Caption>\` block (e.g. \`:::ink Biological Feedback Loop\`).
   - Use \`<svg viewBox="0 0 520 120" xmlns="http://www.w3.org/2000/svg">\`
   - Use neo-brutalist aesthetic styling:
     - Clear boxes / cards: \`<rect x="10" y="20" width="140" height="70" rx="3" fill="#FFE500" stroke="#0A0A0A" stroke-width="2"/>\` (Colors: \`#FFE500\` yellow, \`#A8E85C\` lime, \`#FF3D8A\` pink, \`#7B5CF0\` violet, \`#22D3EE\` cyan, \`#FFFFFF\` white)
     - Connecting arrows / lines: \`<path d="M 155 55 L 205 55 M 195 48 L 205 55 L 195 62" fill="none" stroke="#0A0A0A" stroke-width="2.5" stroke-linecap="round"/>\`
     - Text labels: \`<text x="80" y="52" text-anchor="middle" font-family="Space Mono, monospace" font-size="11" font-weight="700" fill="#0A0A0A">LABEL</text>\`
     - Cursive diagram notes: \`<text x="80" y="74" text-anchor="middle" font-family="Caveat, cursive" font-size="16" fill="#7B5CF0">nuance</text>\`
     - Badges / dots: \`<circle cx="20" cy="30" r="5" fill="#FF3D8A" stroke="#0A0A0A" stroke-width="1.5"/>\`

3. **Margin Notes (\`:::marg\` ... \`:::\`)**:
   Add a spicy side observation, critical nuance, or margin alert.
   Example:
   :::marg
   Crucial variable: MHC gene diversity drives subconscious scent compatibility.
   :::

4. **Taxonomy Callout Blocks**:
   Use appropriate callout directives for high-value insights:
   - \`:::gotcha <Title>\` for pitfalls, traps, cognitive biases, or counter-intuitions
   - \`:::fact <Title>\` for verified scientific principles, formulas, or definitions
   - \`:::question <Title>\` for provocative open inquiries to explore later
   - \`:::action <Title>\` for concrete experiments or action items

5. **Infographic Comparison & Breakdown Tables**:
   Include a markdown table comparing factors, mechanisms, tradeoffs, or stages.

6. **Checklists & Rich Typography**:
   - Use task lists (\`- [ ]\`) for concrete tests/steps
   - Use \`==highlighted text==\` for key phrases
   - Use **bold** for core terms and \`code\` for technical jargon
   - End with 2-4 hashtag categories (e.g. \`#biology #psychology #dating\`)

## Rules

- Write 250-500 words of dense, valuable content alongside the visual diagram and handwritten blocks.
- Don't repeat the original scrap verbatim — reframe, sharpen, and expand.
- Don't output conversational filler (no "Sure!", "Here is your note", etc.).
- If it's a QUESTION, explore the answers and leave deep edges open.
- If it's a FRAGMENT or IDEA, connect it to broader evolutionary/psychological/system models.
- If it's a RANT or ACTION, extract the operational playbook.`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const scrap = await getScrapById(userId, id);

    if (!scrap) {
      return NextResponse.json({ error: "Scrap not found" }, { status: 404 });
    }

    let existingNotes = scrap.notes;
    try {
      const body = await req.json();
      if (body && typeof body.existingNotes === "string") {
        existingNotes = body.existingNotes;
      }
    } catch {
      // Body is optional
    }

    const result = streamText({
      model: languageModel(EXPAND_MODEL),
      system: EXPAND_SYSTEM,
      prompt: `Scrap kind: ${scrap.kind}\nScrap content: ${scrap.content}${existingNotes ? `\n\nExisting notes (expand on these):\n${existingNotes}` : ""}`,
      experimental_transform: smoothStream({ chunking: "word", delayInMs: 10 }),
      maxRetries: 1,
      providerOptions: {
        ...gatewayProviderOptions(EXPAND_MODEL, ["feature:scratch-expand"]),
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

