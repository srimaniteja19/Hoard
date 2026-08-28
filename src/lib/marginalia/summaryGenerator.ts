import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions } from "@/lib/ai/models";
import { BookSummaryData, ChapterItem, VisualArtifact } from "./types";
import { cleanChapterTitle } from "./chapterExtractor";
import { MarginaliaRow } from "@/db/schema";

const SUMMARY_MODEL = "google/gemini-3.5-flash";

export const PointCategorySchema = z.enum([
  "CORE_IDEA",
  "MENTAL_MODEL",
  "TACTIC",
  "PROVOCATION",
  "HISTORICAL",
  "EVIDENCE",
]);

export const VisualArtifactSchema = z.object({
  type: z.enum([
    "FLOWCHART",
    "TIMELINE",
    "MINDMAP",
    "COMPARISON",
    "METRIC_GRID",
    "QUADRANT",
  ]),
  title: z.string().describe("Descriptive title of the diagram or infographic"),
  caption: z.string().optional().describe("Analytical caption explaining the visual artifact"),
  mermaidCode: z.string().optional().describe("Valid Mermaid.js diagram code (e.g., 'graph TD\n  A[Start] --> B[Outcome]', 'timeline\n  title Milestone', 'mindmap\n  root((Concept))\n    Branch')"),
  metrics: z.array(
    z.object({
      label: z.string().describe("Metric name (e.g. 'Street Space Occupied')"),
      value: z.string().describe("Headline number or stat (e.g. '75%', '384x', '$4.2B')"),
      subtext: z.string().describe("Contextual explanation of this metric"),
      trend: z.enum(["UP", "DOWN", "CRITICAL", "NEUTRAL"]).optional(),
    })
  ).optional().describe("Quantitative stats and metric infographic cards"),
  comparison: z.object({
    leftHeader: z.string().describe("Left column header (e.g. 'Automotive Paradigm')"),
    rightHeader: z.string().describe("Right column header (e.g. 'Human-Scale Transit')"),
    rows: z.array(
      z.object({
        dimension: z.string().describe("Evaluation metric or dimension (e.g. 'Spatial Efficiency')"),
        left: z.string().describe("Left column attribute"),
        right: z.string().describe("Right column attribute"),
      })
    ),
  }).optional().describe("Side-by-side comparison matrix"),
});

export const ChapterSummaryPointSchema = z.object({
  category: PointCategorySchema.describe(
    "Category of the insight: CORE_IDEA (main thesis), MENTAL_MODEL (framework/lens), TACTIC (actionable advice), PROVOCATION (counter-intuitive claim), HISTORICAL (context/precedent), or EVIDENCE (data/case study)"
  ),
  point: z.string().describe("Crisp, high-impact headline point (10-20 words)"),
  detail: z.string().optional().describe("Analytical explanation, mechanism, or proof point (1-3 sentences)"),
});

export const ChapterSummaryItemSchema = z.object({
  chapterNumber: z.number().describe("Chapter sequence number starting from 1"),
  chapterTitle: z.string().describe("Clean, authentic chapter title (e.g. 'Genesis', 'Promise')"),
  thesis: z.string().describe("The central core argument or foundational axiom of this chapter (1-2 sentences)"),
  points: z.array(ChapterSummaryPointSchema).describe("3-6 categorized key points breaking down the chapter"),
  visualArtifact: VisualArtifactSchema.optional().describe("An optional diagram, comparison matrix, timeline, or metric infographic illuminating this chapter"),
  keyQuote: z.string().optional().describe("A memorable, quote-worthy sentence or motto capturing the chapter's essence"),
  takeaway: z.string().describe("A one-line operational takeaway or actionable insight from this chapter"),
});

export const BookSummarySchema = z.object({
  bookTitle: z.string(),
  author: z.string(),
  oneLiner: z.string().describe("Punchy, executive one-sentence essence of the entire book"),
  executiveSummary: z.string().describe("2-3 paragraphs high-level thesis, historical significance, and intellectual contribution"),
  readingTimeMinutes: z.number().describe("Estimated reading time in minutes for this executive briefing (typically 8-15 min)"),
  coreThemes: z.array(z.string()).describe("4-6 top thematic tags (e.g. ['Urban Design', 'Automobile Hegemony', 'Public Health'])"),
  macroInfographic: VisualArtifactSchema.optional().describe("Overarching macro conceptual diagram, timeline, or systemic flowchart for the entire book"),
  chapters: z.array(ChapterSummaryItemSchema).describe("Chapter-by-chapter detailed breakdown for each chapter in the volume"),
  overallTakeaway: z.string().describe("Final overarching conclusion, synthesis, or paradigm shift"),
});

/** Formats a structured BookSummaryData into beautiful Markdown */
export function exportSummaryToMarkdown(summary: BookSummaryData): string {
  const categoryLabels: Record<string, string> = {
    CORE_IDEA: "💡 CORE IDEA",
    MENTAL_MODEL: "🧠 MENTAL MODEL",
    TACTIC: "🛠 TACTIC",
    PROVOCATION: "⚡ PROVOCATION",
    HISTORICAL: "📜 HISTORICAL",
    EVIDENCE: "📊 EVIDENCE",
  };

  const lines: string[] = [
    `# Executive Intelligence Briefing: ${summary.bookTitle}`,
    `**Author:** ${summary.author}  `,
    `**Reading Time:** ~${summary.readingTimeMinutes || 10} minutes  `,
    `**Themes:** ${summary.coreThemes.map((t) => `\`#${t}\``).join(" ")}  `,
    `**Generated:** ${new Date(summary.generatedAt).toLocaleDateString()}  \n`,
    `> **Core Axiom:** ${summary.oneLiner}\n`,
    `## Executive Synthesis`,
    summary.executiveSummary,
  ];

  if (summary.macroInfographic) {
    lines.push(`\n### 📐 Macro Architectural Model: ${summary.macroInfographic.title}`);
    if (summary.macroInfographic.mermaidCode) {
      lines.push("```mermaid");
      lines.push(summary.macroInfographic.mermaidCode);
      lines.push("```");
    }
    if (summary.macroInfographic.caption) {
      lines.push(`*${summary.macroInfographic.caption}*`);
    }
  }

  lines.push(`\n---\n`, `## Chapter-by-Chapter Breakdown\n`);

  for (const ch of summary.chapters) {
    lines.push(`### Chapter ${ch.chapterNumber}: ${ch.chapterTitle}`);
    lines.push(`**Thesis:** *${ch.thesis}*\n`);

    if (ch.keyQuote) {
      lines.push(`> "${ch.keyQuote}"\n`);
    }

    if (ch.visualArtifact) {
      lines.push(`#### [${ch.visualArtifact.type}] ${ch.visualArtifact.title}`);
      if (ch.visualArtifact.mermaidCode) {
        lines.push("```mermaid");
        lines.push(ch.visualArtifact.mermaidCode);
        lines.push("```");
      }
      if (ch.visualArtifact.comparison) {
        const comp = ch.visualArtifact.comparison;
        lines.push(`| Dimension | ${comp.leftHeader} | ${comp.rightHeader} |`);
        lines.push(`| :--- | :--- | :--- |`);
        for (const r of comp.rows) {
          lines.push(`| **${r.dimension}** | ${r.left} | ${r.right} |`);
        }
        lines.push("");
      }
      if (ch.visualArtifact.metrics) {
        lines.push(`**Key Metrics:**`);
        for (const m of ch.visualArtifact.metrics) {
          lines.push(`* **${m.label}:** \`${m.value}\` — ${m.subtext}`);
        }
        lines.push("");
      }
    }

    lines.push(`**Key Points:**`);
    for (const pt of ch.points) {
      const badge = categoryLabels[pt.category] || pt.category;
      lines.push(`* **[${badge}]** **${pt.point}**`);
      if (pt.detail) {
        lines.push(`  ${pt.detail}`);
      }
    }

    lines.push(`\n**Takeaway:** \`${ch.takeaway}\`\n`);
    lines.push(`---\n`);
  }

  lines.push(`## Final Synthesis`);
  lines.push(summary.overallTakeaway);

  return lines.join("\n");
}

/** Generates a complete Chapter-by-Chapter Categorized Summary with Visual Infographics using Gemini */
export async function generateBookSummary(params: {
  title: string;
  author: string;
  chapters?: ChapterItem[];
  notes?: MarginaliaRow[];
}): Promise<BookSummaryData> {
  const { title, author, chapters = [], notes = [] } = params;

  let chaptersContext = "";
  if (chapters.length > 0) {
    chaptersContext = `\n\nKNOWN CHAPTER OUTLINE:\n${chapters
      .map((c) => `CH ${c.number}: ${cleanChapterTitle(c.title)}${c.page ? ` (p. ${c.page})` : ""}`)
      .join("\n")}`;
  }

  let notesContext = "";
  if (notes.length > 0) {
    notesContext = `\n\nREADER'S CAPTURED MARGINALIA & QUOTES:\n${notes
      .slice(0, 30)
      .map((n) => `[CH ${n.chapter}${n.page ? `, p.${n.page}` : ""}] ${n.quote ? `"${n.quote}" ` : ""}${n.note || ""}`)
      .join("\n")}`;
  }

  const system = `You are a world-class executive bibliographer, information architect, and visual curator.
Your task is to generate a comprehensive, museum-grade **Chapter-by-Chapter Executive Briefing with Visual Infographics & Diagrams** for the published book "${title}" by ${author}.

### REQUIREMENTS:
1. **AUTHENTICITY & ACCURACY**:
   - Accurately summarize each authentic chapter of the book in chronological order.
   - If a chapter outline is provided, follow it strictly.
2. **DEEP CATEGORIZATION OF POINTS**:
   - For every chapter, provide 3 to 6 distinct, high-impact bullet points.
   - Categorize each bullet point using one of:
     * \`CORE_IDEA\` (Foundational argument / premise)
     * \`MENTAL_MODEL\` (Transferable framework / cognitive lens)
     * \`TACTIC\` (Actionable implementation / advice)
     * \`PROVOCATION\` (Counter-intuitive / controversial claim)
     * \`HISTORICAL\` (Precedent, case study, or backstory)
     * \`EVIDENCE\` (Empirical research, data, or technical proof)
3. **RICH VISUAL DIAGRAMS & INFOGRAPHICS**:
   - For the overall book (\`macroInfographic\`), provide a master systemic flowchart (\`graph TD\`), historical milestone timeline (\`timeline\`), or conceptual mindmap (\`mindmap\`) in valid Mermaid syntax.
   - For key chapters, provide a visual artifact (\`FLOWCHART\`, \`TIMELINE\`, \`MINDMAP\`, \`COMPARISON\`, \`METRIC_GRID\`, or \`QUADRANT\`).
   - When outputting Mermaid code, ensure it is completely valid, error-free Mermaid syntax without markdown backticks in the string itself.
   - For comparisons, provide sharp, multi-dimensional contrast rows.
   - For metric grids, supply memorable, high-impact quantitative stats.
4. **PUNCHY, PROVOCATIVE WRITING**:
   - Avoid bland platitudes. Capture the author's sharpest insights, mental models, and strongest arguments.`;

  const prompt = `Book: "${title}" by ${author}${chaptersContext}${notesContext}\n\nProduce the complete Chapter-by-Chapter Categorized Intelligence Briefing with Visual Infographics and Diagrams now.`;

  const result = await generateObject({
    model: languageModel(SUMMARY_MODEL),
    system,
    prompt,
    schema: BookSummarySchema,
    providerOptions: {
      ...gatewayProviderOptions(SUMMARY_MODEL, ["feature:marginalia-summary-generation"]),
    },
  });

  const generated = result.object;

  const cleanedChapters = (generated.chapters || []).map((ch, idx) => ({
    chapterNumber: ch.chapterNumber || idx + 1,
    chapterTitle: cleanChapterTitle(ch.chapterTitle) || `Chapter ${idx + 1}`,
    thesis: ch.thesis,
    points: ch.points.map((p) => ({
      category: p.category,
      point: p.point,
      detail: p.detail,
    })),
    visualArtifact: ch.visualArtifact,
    keyQuote: ch.keyQuote,
    takeaway: ch.takeaway,
  }));

  return {
    bookTitle: generated.bookTitle || title,
    author: generated.author || author,
    oneLiner: generated.oneLiner,
    executiveSummary: generated.executiveSummary,
    readingTimeMinutes: generated.readingTimeMinutes || Math.max(5, cleanedChapters.length * 2),
    coreThemes: generated.coreThemes || [],
    macroInfographic: generated.macroInfographic,
    chapters: cleanedChapters,
    overallTakeaway: generated.overallTakeaway,
    generatedAt: new Date().toISOString(),
  };
}
