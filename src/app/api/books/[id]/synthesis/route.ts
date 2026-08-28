import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireUserId, AuthError } from "@/lib/session";
import { getBookById, getBookMarginalia } from "@/lib/dal/marginalia";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";

const SYNTHESIS_MODEL = "google/gemini-3.5-flash";

const SynthesisSchema = z.object({
  zineTitle: z.string().describe("An incisive, editorial title for this reading synthesis (e.g. 'Mastery & Multipliers: A Synthesis of Genius Makers')"),
  subtitle: z.string().describe("A 1-line subtitle summarizing the core revelation of the read"),
  thesisReframe: z.string().describe("A 2-3 paragraph sharp reframe of the book's core premise, filtered through the reader's personal notes"),
  keyTakeaways: z.array(
    z.object({
      concept: z.string(),
      synthesis: z.string(),
      anchorQuote: z.string().optional(),
    })
  ).describe("3-5 core conceptual breakthroughs discovered across the marginalia"),
  evolutionOfThought: z.string().describe("Narrative analysis of how the reader's notes shifted from initial impressions to deeper reflection and application"),
  actionBlueprint: z.array(
    z.object({
      title: z.string(),
      type: z.enum(["HABIT", "PLAYBOOK", "ACTION_ITEM"]),
      description: z.string(),
      frequency: z.string().optional(),
    })
  ).describe("Concrete behavioral playbooks, recurring rituals, and immediate todos derived from the reading"),
  markdownZine: z.string().describe("Complete, publication-ready Markdown zine formatted with headers, pull quotes, bullet points, and actionable checklists"),
});

const SYNTHESIS_SYSTEM = `You are an elite intellectual editor and reading synthesizer embedded in HOARD.
Your job: Transform a reader's raw, fragmented marginalia notes into a **magnificent, publication-ready Reading Synthesis Zine & Action Blueprint**.

## Principles:
1. **Honor the Reader's Voice**: Synthesize what the reader actually highlighted, reflected on, contested, and applied—not just a generic summary of the book.
2. **Highlight Intellectual Battles**: Give special weight to COUNTER notes and REFLECTIONS where the reader grappled with the author.
3. **Operationalize into Habits**: Extract concrete, non-obvious behavioral playbooks from APPLICATION notes.
4. **Neo-Brutalist Markdown Polish**: Structure the \`markdownZine\` with bold headings, quote blocks, comparison tables, and actionable checkboxes.`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await params;
    const book = await getBookById(userId, id);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const notes = await getBookMarginalia(userId, id);
    if (notes.length === 0) {
      return NextResponse.json(
        { error: "No marginalia notes found for this volume. Add at least 1 note to generate a synthesis." },
        { status: 400 }
      );
    }

    // Format marginalia notes payload
    const formattedNotes = notes.map((n, idx) => {
      const parts = [`[Note #${idx + 1}] Kind: ${n.kind}`];
      if (n.chapter) parts.push(`Chapter: ${n.chapter}`);
      if (n.page) parts.push(`Page: ${n.page}`);
      if (n.quote) parts.push(`Quote: "${n.quote}"`);
      if (n.note) parts.push(`Reader's Reflection / Note: "${n.note}"`);
      return parts.join(" · ");
    }).join("\n\n");

    const prompt = [
      `Volume: "${book.title}" by ${book.author}`,
      `Format: ${book.format} · Reading Status: ${book.status}`,
      book.totalPages ? `Total Pages: ${book.totalPages}` : null,
      book.totalChapters ? `Total Chapters: ${book.totalChapters}` : null,
      `Total Marginalia Notes: ${notes.length}`,
      "\n--- READER'S MARGINALIA NOTES ---\n",
      formattedNotes,
      "\nSynthesize these notes into a comprehensive, deeply insightful Reading Zine and Action Blueprint now.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await generateObject({
      model: languageModel(SYNTHESIS_MODEL),
      system: SYNTHESIS_SYSTEM,
      prompt,
      schema: SynthesisSchema,
      providerOptions: {
        ...gatewayProviderOptions(SYNTHESIS_MODEL, ["feature:marginalia-reading-synthesis"]),
      },
    });

    return NextResponse.json({ synthesis: result.object });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = gatewayErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
