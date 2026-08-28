import { generateObject } from "ai";
import { z } from "zod";
import { languageModel, gatewayProviderOptions } from "@/lib/ai/models";
import { BookSummaryData, ChapterItem } from "./types";
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
    `\n---\n`,
    `## Chapter-by-Chapter Breakdown\n`,
  ];

  for (const ch of summary.chapters) {
    lines.push(`### Chapter ${ch.chapterNumber}: ${ch.chapterTitle}`);
    lines.push(`**Thesis:** *${ch.thesis}*\n`);

    if (ch.keyQuote) {
      lines.push(`> "${ch.keyQuote}"\n`);
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

/** Generates a complete Chapter-by-Chapter Categorized Summary using Gemini */
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

  const system = `You are a world-class executive bibliographer, synthesizer, and intellectual curator.
Your task is to generate a comprehensive, museum-grade **Chapter-by-Chapter Executive Briefing** for the published book "${title}" by ${author}.

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
3. **PUNCHY, PROVOCATIVE WRITING**:
   - Avoid bland platitudes. Capture the author's sharpest insights, mental models, and strongest arguments.
   - Provide a bold \`point\` headline and an illuminating \`detail\` for each bullet.`;

  const prompt = `Book: "${title}" by ${author}${chaptersContext}${notesContext}\n\nProduce the complete Chapter-by-Chapter Categorized Intelligence Briefing now.`;

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
    chapters: cleanedChapters,
    overallTakeaway: generated.overallTakeaway,
    generatedAt: new Date().toISOString(),
  };
}
