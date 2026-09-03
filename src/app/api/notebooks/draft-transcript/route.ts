import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { Block, generateBlockId } from "@/lib/notebooks/blocks";
import { requireUserId, AuthError } from "@/lib/session";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash-lite";

const AUTONOMOUS_NOTES_SYSTEM = `
You transform any pasted transcript, lecture, speech, article, or technical document into rich, high-signal, authentic study notes.

Adapt autonomously to the subject matter and structure of the provided content:
- If the content is technical/AI/engineering, capture the architectures, workflows, pipelines, concrete examples, and trade-offs.
- If the content is business, science, history, medicine, or general, capture the underlying mental models, real-world case studies, data points, and key conclusions.
- If code is discussed, include clean, readable code snippets.
- If a before/after transformation or comparison is explained (e.g. initial draft vs revised draft, zero-shot vs agentic), capture it as a concrete worked example.
- If a critical trap, gotcha, or common mistake is highlighted, include a "gotcha" callout.
- If an insightful open question is raised, include a "question" callout.
- If practical next steps, experiments, or exercises are relevant, include concise action items.

CRITICAL RULES:
1. ABSOLUTE GROUNDING: Base everything strictly on the provided content. Never hallucinate facts, numbers, or tools not in the source.
2. STUDY NOTES, NOT A SHALLOW SUMMARY: Keep the concrete mechanics, specific examples, numbers, names, and caveats. Do not compress vivid examples into abstract categories.
3. CONCISE EMPHASIS: Use **bold** formatting sparingly on only the single load-bearing clause per paragraph.
4. NATURAL SECTION HEADINGS: Create evocative, content-specific headings that reflect what was actually discussed (never generic labels like "Introduction", "Overview", or "Key Concepts").
5. NO TIMESTAMPS: Do NOT include timestamp prefixes (like "0:02", "1:15") or timestamp chips in headings or text.
6. NO META-NARRATION: Avoid "In this lecture", "The speaker explains", "We learn that". Write direct study notes.
`;

const AutonomousStudyNotesSchema = z.object({
  summary: z.string().describe("1-2 sentence overview of the synthesized study notes"),
  sections: z.array(
    z.object({
      heading: z.string().describe("Evocative, content-specific heading naming what was discussed (without any timestamps)"),
      paragraphs: z.array(z.string()).describe("Complete, dense paragraphs holding the mechanism and concrete details with at most ONE **bold** clause per paragraph"),
      example: z.object({
        title: z.string().default("WORKED EXAMPLE"),
        v1Title: z.string().default("INITIAL / STANDARD DRAFT"),
        v1Text: z.string(),
        v1BadWords: z.array(z.string()).optional(),
        v2Title: z.string().default("IMPROVED / REVISED DRAFT"),
        v2Text: z.string(),
        v2FixWords: z.array(z.string()).optional(),
        caughtLegend: z.string().optional(),
        fixedLegend: z.string().optional(),
        summaryPill: z.string().optional(),
      }).nullable().optional().describe("Populate if the speaker gave a concrete before/after or contrastive example"),
      codeSnippet: z.object({
        code: z.string(),
        lang: z.string().default("PYTHON"),
        note: z.string().default("CODE SNIPPET"),
      }).nullable().optional().describe("Populate if code or programmatic workflows were discussed"),
      diagram: z.object({
        title: z.string().default("SYSTEM ARCHITECTURE / WORKFLOW"),
        code: z.string().describe("Valid Mermaid.js syntax (e.g. 'graph TD\\n  A[Input] --> B[Processing]')"),
        caption: z.string().optional(),
      }).nullable().optional().describe("Populate if an architecture, pipeline, flow, or system topology was explained"),
      callout: z.object({
        kind: z.enum(["gotcha", "question", "fact", "connects"]),
        text: z.string(),
      }).nullable().optional().describe("Populate if a key pitfall, open inquiry, or foundational takeaway was highlighted"),
      scale: z.object({
        title: z.string().default("COMPARISON"),
        items: z.array(z.object({
          name: z.string(),
          pct: z.number(),
          color: z.string().optional(),
        })),
        footer: z.string().optional(),
      }).nullable().optional(),
    })
  ).min(1),
  actionItems: z.array(z.string()).optional().describe("2-3 practical next steps, experiments, or reflection tasks if relevant"),
});

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const { transcript, courseTitle, lessonTitle } = await req.json();

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 15) {
      return NextResponse.json(
        { error: "Please provide valid content or a transcript." },
        { status: 400 }
      );
    }

    const userPrompt = `Context: ${courseTitle || "Course"} · ${lessonTitle || "Lesson"}

SOURCE CONTENT / TRANSCRIPT:
${transcript.slice(0, 16000)}`;

    const { object } = await generateObject({
      model: languageModel(NOTEBOOK_MODEL),
      schema: AutonomousStudyNotesSchema,
      system: AUTONOMOUS_NOTES_SYSTEM,
      prompt: userPrompt,
      providerOptions: {
        google: {
          thinking: { budgetTokens: 0 },
        },
      },
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-draft-transcript"]),
    });

    const blocks: Block[] = [];

    // Transform extracted sections into rich Block[] without timestamps
    for (const section of object.sections) {
      // 1. Heading (Clean, no timestamps)
      blocks.push({
        id: generateBlockId(),
        type: "heading",
        level: 2,
        text: section.heading.replace(/^\s*\d+:\d+\s*[-—–]?\s*/, "").trim(),
      });

      // 2. Paragraphs
      if (Array.isArray(section.paragraphs)) {
        for (const p of section.paragraphs) {
          if (p && p.trim()) {
            blocks.push({
              id: generateBlockId(),
              type: "paragraph",
              text: p.trim(),
            });
          }
        }
      }

      // 3. Worked Example (Before/After)
      if (section.example && section.example.v1Text && section.example.v2Text) {
        blocks.push({
          id: generateBlockId(),
          type: "example",
          title: section.example.title || "WORKED EXAMPLE",
          v1Title: section.example.v1Title || "INITIAL / STANDARD DRAFT",
          v1Text: section.example.v1Text,
          v1BadWords: section.example.v1BadWords || [],
          v2Title: section.example.v2Title || "IMPROVED / REVISED DRAFT",
          v2Text: section.example.v2Text,
          v2FixWords: section.example.v2FixWords || [],
          caughtLegend: section.example.caughtLegend || "WHAT WAS CAUGHT",
          fixedLegend: section.example.fixedLegend || "WHAT WAS IMPROVED",
          summaryPill: section.example.summaryPill,
        });
      }

      // 4. Code Snippet
      if (section.codeSnippet && section.codeSnippet.code) {
        blocks.push({
          id: generateBlockId(),
          type: "code",
          lang: section.codeSnippet.lang || "PYTHON",
          note: section.codeSnippet.note || "CODE IMPLEMENTATION",
          code: section.codeSnippet.code.trim(),
        });
      }

      // 5. Architecture Diagram (if present)
      if (section.diagram && section.diagram.code && section.diagram.code.trim()) {
        blocks.push({
          id: generateBlockId(),
          type: "diagram",
          diagramType: "mermaid",
          title: section.diagram.title || "SYSTEM ARCHITECTURE / WORKFLOW",
          code: section.diagram.code.replace(/```mermaid/gi, "").replace(/```/g, "").trim(),
          caption: section.diagram.caption,
        });
      }

      // 6. Callout (Gotcha, Question, Fact)
      if (section.callout && section.callout.text) {
        blocks.push({
          id: generateBlockId(),
          type: "callout",
          kind: section.callout.kind,
          text: section.callout.text.trim(),
        });
      }

      // 6. Scale ranking / comparison
      if (section.scale && Array.isArray(section.scale.items) && section.scale.items.length > 0) {
        blocks.push({
          id: generateBlockId(),
          type: "scale",
          title: section.scale.title || "COMPARISON",
          items: section.scale.items.map((i) => ({
            name: i.name,
            pct: i.pct,
            color: i.color || "shade",
          })),
          footer: section.scale.footer,
        });
      }
    }

    // 7. Action Items / Todos (if present)
    if (Array.isArray(object.actionItems) && object.actionItems.length > 0) {
      blocks.push({
        id: generateBlockId(),
        type: "heading",
        level: 3,
        text: "Action items & Next steps",
      });
      blocks.push({
        id: generateBlockId(),
        type: "todo",
        items: object.actionItems.map((t) => ({ text: t, done: false })),
      });
    }

    return NextResponse.json({
      blocks,
      summary: object.summary || "Study notes generated from content.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Transcript conversion failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to convert content into notes." },
      { status: 500 }
    );
  }
}
