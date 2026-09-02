import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions, gatewayErrorMessage } from "@/lib/ai/models";
import { Block, generateBlockId } from "@/lib/notebooks/blocks";
import { requireUserId, AuthError } from "@/lib/session";

export const runtime = "nodejs";
const NOTEBOOK_MODEL = "google/gemini-3.5-flash-lite";

const AUTONOMOUS_TOPIC_SYNTHESIZER_SYSTEM = `
You are an elite Principal Systems Architect and Computer Science Educator. You transform any user topic, prompt, or architectural question into a master-grade, beautifully illustrated, and comprehensive study playbook.

When answering a question (e.g. "How JVM works", "Raft Consensus Algorithm", "Transformer Attention Mechanism"):
1. AUTHORITATIVE & CONCRETE: Explain the exact underlying mechanics, data structures, runtime pipelines, memory layouts, and execution flow. Never settle for vague summaries or hand-waving.
2. SYSTEM ARCHITECTURE ILLUSTRATION: ALWAYS include at least ONE valid, detailed Mermaid diagram (using 'graph TD' or 'flowchart LR') mapping the end-to-end component topology, memory spaces, and lifecycle stages with node styling.
3. CODE & RUNTIME MECHANICS: Include concrete, idiomatic code snippets (Java, C++, Python, Go, or SQL depending on the domain) demonstrating the real execution.
4. CONTRASTIVE WORKED EXAMPLE: Contrast an initial/naive mental model or execution pattern against the optimal/compiled/hardened production reality (e.g. Bytecode Interpretation vs JIT Tiering).
5. MEMORY / ARCHITECTURAL BREAKDOWN: Include a quantitative or component distribution scale (e.g. Heap Generations, Memory Pool ratios, or Performance Trade-offs).
6. TRAPS & GOTCHAS: Highlight common production traps, concurrency hazards, or debugging surprises in a 'gotcha' callout.
7. SOCRATIC MASTERY: Include probing inquiry questions in 'question' callouts to test understanding.
8. LAB EXERCISES: Provide practical terminal commands (e.g. 'javap -c', profiling flags, verification steps) in action items.

CRITICAL RULES:
1. MERMAID SYNTAX VALIDITY: All Mermaid code MUST be 100% syntactically valid Mermaid.js (e.g., 'graph TD', 'flowchart LR', 'subgraph'). Do NOT include markdown backticks inside the diagram code string itself.
2. NO SHALLOW LISTS: Write rich, dense, insightful prose with at most ONE **bold** load-bearing clause per paragraph.
3. RELEVANT EMOJI & GRADIENTS: Select a single fitting emoji icon and a vibrant CSS gradient matching the subject.
`;

const TopicStudyNotesSchema = z.object({
  title: z.string().describe("Crisp, authoritative title for the study notes (e.g. 'How the Java Virtual Machine (JVM) Works')"),
  icon: z.string().describe("Single emoji icon representing the subject (e.g. '☕', '⚡', '🧠', '🗄️', '🛡️')"),
  coverGradient: z.string().describe("CSS linear gradient for the cover banner (e.g. 'linear-gradient(135deg, #1E293B 0%, #3B82F6 50%, #10B981 100%)')"),
  summary: z.string().describe("1-2 sentence high-level architectural overview"),
  diagram: z.object({
    title: z.string().default("SYSTEM ARCHITECTURE & EXECUTION FLOW"),
    code: z.string().describe("Valid Mermaid.js syntax (e.g. 'graph TD\\n  A[Source] --> B[Engine]')"),
    caption: z.string().optional().describe("Clear architectural notes explaining the diagram components"),
  }).describe("Master architectural illustration for the topic"),
  sections: z.array(
    z.object({
      heading: z.string().describe("Evocative, content-specific section heading"),
      paragraphs: z.array(z.string()).describe("Detailed technical explanation paragraphs with selective **bolding**"),
      codeSnippet: z.object({
        code: z.string(),
        lang: z.string().default("JAVA"),
        note: z.string().default("IMPLEMENTATION DETAIL"),
      }).nullable().optional(),
      callout: z.object({
        kind: z.enum(["gotcha", "question", "fact", "connects"]),
        text: z.string(),
      }).nullable().optional(),
      example: z.object({
        title: z.string().default("WORKED CONTRAST"),
        v1Title: z.string().default("NAIVE / INITIAL APPROACH"),
        v1Text: z.string(),
        v1BadWords: z.array(z.string()).optional(),
        v2Title: z.string().default("HARDENED / PRODUCTION SYSTEM"),
        v2Text: z.string(),
        v2FixWords: z.array(z.string()).optional(),
        caughtLegend: z.string().optional(),
        fixedLegend: z.string().optional(),
        summaryPill: z.string().optional(),
      }).nullable().optional(),
      scale: z.object({
        title: z.string().default("COMPONENT DISTRIBUTION"),
        items: z.array(z.object({
          name: z.string(),
          pct: z.number(),
          color: z.string().optional(),
        })),
        footer: z.string().optional(),
      }).nullable().optional(),
      toggle: z.object({
        summary: z.string(),
        body: z.string(),
      }).nullable().optional(),
    })
  ).min(2),
  actionItems: z.array(z.string()).optional().describe("3-4 practical hands-on terminal commands, debugging experiments, or verification drills"),
});

export async function POST(req: NextRequest) {
  try {
    await requireUserId(req);
    const { topic, courseTitle, depth = "comprehensive" } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return NextResponse.json(
        { error: "Please provide a valid question or topic to research and generate." },
        { status: 400 }
      );
    }

    const userPrompt = `Context Course: ${courseTitle || "General Computer Science"}
User Prompt / Question: "${topic.trim()}"
Depth: ${depth}

Generate an exhaustive, beautifully rendered, multi-dimensional set of study notes answering this prompt from first principles. Include the complete architecture, memory anatomy, execution lifecycle, Mermaid illustration diagram, code snippets, worked contrasts, scale metrics, pitfalls, and lab exercises.`;

    const { object } = await generateObject({
      model: languageModel(NOTEBOOK_MODEL),
      schema: TopicStudyNotesSchema,
      system: AUTONOMOUS_TOPIC_SYNTHESIZER_SYSTEM,
      prompt: userPrompt,
      providerOptions: {
        google: {
          thinking: { budgetTokens: 0 },
        },
      },
      ...gatewayProviderOptions(NOTEBOOK_MODEL, ["feature:notebook-generate-topic"]),
    });

    const blocks: Block[] = [];

    // 1. Overview Callout Block
    if (object.summary) {
      blocks.push({
        id: generateBlockId(),
        type: "callout",
        kind: "fact",
        text: object.summary,
      });
    }

    // 2. Master Architectural Diagram Block
    if (object.diagram && object.diagram.code) {
      blocks.push({
        id: generateBlockId(),
        type: "heading",
        level: 2,
        text: "System Architecture & Execution Topology",
      });
      blocks.push({
        id: generateBlockId(),
        type: "diagram",
        diagramType: "mermaid",
        title: object.diagram.title || "ARCHITECTURE BLUEPRINT",
        code: object.diagram.code.trim(),
        caption: object.diagram.caption || "Component relationships, data flow, and runtime boundaries.",
      });
    }

    // 3. Sections & In-depth Technical Explanations
    for (const section of object.sections) {
      // Heading
      blocks.push({
        id: generateBlockId(),
        type: "heading",
        level: 2,
        text: section.heading.trim(),
      });

      // Paragraphs
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

      // Code Snippet
      if (section.codeSnippet && section.codeSnippet.code) {
        blocks.push({
          id: generateBlockId(),
          type: "code",
          lang: section.codeSnippet.lang || "JAVA",
          note: section.codeSnippet.note || "CODE MECHANICS",
          code: section.codeSnippet.code.trim(),
        });
      }

      // Worked Comparison Example
      if (section.example && section.example.v1Text && section.example.v2Text) {
        blocks.push({
          id: generateBlockId(),
          type: "example",
          title: section.example.title || "WORKED COMPARISON",
          v1Title: section.example.v1Title || "INITIAL / NAIVE FLOW",
          v1Text: section.example.v1Text,
          v1BadWords: section.example.v1BadWords || [],
          v2Title: section.example.v2Title || "OPTIMIZED / PRODUCTION FLOW",
          v2Text: section.example.v2Text,
          v2FixWords: section.example.v2FixWords || [],
          caughtLegend: section.example.caughtLegend || "THE BOTTLENECK",
          fixedLegend: section.example.fixedLegend || "THE OPTIMIZATION",
          summaryPill: section.example.summaryPill,
        });
      }

      // Scale / Metric Distribution
      if (section.scale && Array.isArray(section.scale.items) && section.scale.items.length > 0) {
        blocks.push({
          id: generateBlockId(),
          type: "scale",
          title: section.scale.title || "SYSTEM DISTRIBUTION",
          items: section.scale.items.map((item) => ({
            name: item.name,
            pct: item.pct,
            color: item.color || "shade",
          })),
          footer: section.scale.footer,
        });
      }

      // Callout
      if (section.callout && section.callout.text) {
        blocks.push({
          id: generateBlockId(),
          type: "callout",
          kind: section.callout.kind,
          text: section.callout.text.trim(),
        });
      }

      // Collapsible Deep-Dive Toggle
      if (section.toggle && section.toggle.summary && section.toggle.body) {
        blocks.push({
          id: generateBlockId(),
          type: "toggle",
          summary: section.toggle.summary.trim(),
          body: section.toggle.body.trim(),
        });
      }
    }

    // 4. Action Items & Verification Exercises
    if (Array.isArray(object.actionItems) && object.actionItems.length > 0) {
      blocks.push({
        id: generateBlockId(),
        type: "heading",
        level: 3,
        text: "Hands-on Verification & Lab Drills",
      });
      blocks.push({
        id: generateBlockId(),
        type: "todo",
        items: object.actionItems.map((item) => ({ text: item, done: false })),
      });
    }

    return NextResponse.json({
      title: object.title,
      icon: object.icon || "💡",
      coverUrl: object.coverGradient || "linear-gradient(135deg, #1E293B 0%, #3B82F6 100%)",
      summary: object.summary,
      blocks,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[generate-topic] Note synthesis failed:", err);
    return NextResponse.json(
      { error: gatewayErrorMessage(err) || "Failed to synthesize notes for the given topic." },
      { status: 500 }
    );
  }
}
