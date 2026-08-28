import { describe, it, expect } from "vitest";
import { exportSummaryToMarkdown, BookSummarySchema } from "./summaryGenerator";
import { BookSummaryData } from "./types";

describe("BookSummarySchema", () => {
  it("validates structured summary with categorized points", () => {
    const validData: BookSummaryData = {
      bookTitle: "Genius Makers",
      author: "Cade Metz",
      oneLiner: "The definitive insider narrative of the deep learning revolution.",
      executiveSummary: "A chronicle of the rivalries, breakthroughs, and corporate bids that created modern AI.",
      readingTimeMinutes: 12,
      coreThemes: ["Neural Networks", "Corporate Bids", "AI Safety"],
      overallTakeaway: "Deep learning succeeded because of stubborn outsiders who refused to give up.",
      generatedAt: "2026-08-28T12:00:00Z",
      chapters: [
        {
          chapterNumber: 1,
          chapterTitle: "Genesis",
          thesis: "Geoff Hinton and a handful of fringe researchers kept neural nets alive during the AI winter.",
          points: [
            {
              category: "CORE_IDEA",
              point: "Neural networks mimic biological brains rather than symbolic logic.",
              detail: "Symbolic AI required hand-written rules, whereas connectionism learns from raw data.",
            },
            {
              category: "MENTAL_MODEL",
              point: "The Backpropagation flywheel.",
              detail: "Error signals propagate backwards through layers, tuning synapse weights incrementally.",
            },
            {
              category: "PROVOCATION",
              point: "The AI establishment considered deep learning a mathematical dead-end for 30 years.",
            },
            {
              category: "TACTIC",
              point: "Secure long-term unconstrained research funding.",
              detail: "Canadian CIFAR funding sustained Hinton's lab when US agencies cut grants.",
            },
          ],
          keyQuote: "If you want to understand the brain, build one.",
          takeaway: "True breakthroughs begin as widely ridiculed heresies.",
        },
      ],
    };

    const parsed = BookSummarySchema.parse(validData);
    expect(parsed.bookTitle).toBe("Genius Makers");
    expect(parsed.chapters).toHaveLength(1);
    expect(parsed.chapters[0].points[0].category).toBe("CORE_IDEA");
  });
});

describe("exportSummaryToMarkdown", () => {
  it("generates structured markdown with category badges and thesis quotes", () => {
    const sampleData: BookSummaryData = {
      bookTitle: "Life After Cars",
      author: "Sarah Goodyear",
      oneLiner: "Reclaiming public space and human vitality from automotive dominance.",
      executiveSummary: "A comprehensive critique of car culture and a blueprint for walkable cities.",
      readingTimeMinutes: 8,
      coreThemes: ["Urban Design", "Mobility", "Public Health"],
      overallTakeaway: "Cities thrive when built for people, not multi-ton vehicles.",
      generatedAt: "2026-08-28T12:00:00Z",
      chapters: [
        {
          chapterNumber: 1,
          chapterTitle: "The Tyranny of the Automobile",
          thesis: "Cars have monopolized urban geometry and isolated communities.",
          points: [
            {
              category: "CORE_IDEA",
              point: "Geometric inefficiency of personal vehicles.",
              detail: "A car requires 200 square feet to move a single person.",
            },
            {
              category: "TACTIC",
              point: "Congestion pricing and pedestrianization.",
            },
          ],
          keyQuote: "Streets are for people.",
          takeaway: "Reallocate lane space to active transit.",
        },
      ],
    };

    const md = exportSummaryToMarkdown(sampleData);
    expect(md).toContain("# Executive Intelligence Briefing: Life After Cars");
    expect(md).toContain("`#Urban Design`");
    expect(md).toContain("### Chapter 1: The Tyranny of the Automobile");
    expect(md).toContain("**[💡 CORE IDEA]** **Geometric inefficiency of personal vehicles.**");
    expect(md).toContain("A car requires 200 square feet to move a single person.");
    expect(md).toContain("**[🛠 TACTIC]** **Congestion pricing and pedestrianization.**");
    expect(md).toContain('> "Streets are for people."');
    expect(md).toContain("`Reallocate lane space to active transit.`");
  });

  it("exports Mermaid diagrams and comparison matrices in markdown", () => {
    const dataWithVisuals: BookSummaryData = {
      bookTitle: "Genius Makers",
      author: "Cade Metz",
      oneLiner: "The story of modern AI.",
      executiveSummary: "How deep learning won.",
      readingTimeMinutes: 10,
      coreThemes: ["AI", "Tech"],
      overallTakeaway: "Breakthroughs take persistence.",
      generatedAt: "2026-08-28T12:00:00Z",
      macroInfographic: {
        type: "TIMELINE",
        title: "Deep Learning Milestones",
        mermaidCode: "timeline\n  title History\n  1986 : Backpropagation\n  2012 : AlexNet",
        caption: "Chronology of the deep learning revival.",
      },
      chapters: [
        {
          chapterNumber: 1,
          chapterTitle: "Genesis",
          thesis: "Hinton and the pioneers.",
          points: [
            {
              category: "CORE_IDEA",
              point: "Connectionism vs Symbolic AI.",
            },
          ],
          visualArtifact: {
            type: "COMPARISON",
            title: "Symbolic vs Connectionist AI",
            comparison: {
              leftHeader: "Symbolic AI",
              rightHeader: "Connectionism",
              rows: [
                {
                  dimension: "Learning Method",
                  left: "Hand-coded rules",
                  right: "Learns from data",
                },
              ],
            },
          },
          takeaway: "Neural nets win.",
        },
      ],
    };

    const md = exportSummaryToMarkdown(dataWithVisuals);
    expect(md).toContain("```mermaid");
    expect(md).toContain("1986 : Backpropagation");
    expect(md).toContain("| Dimension | Symbolic AI | Connectionism |");
    expect(md).toContain("| **Learning Method** | Hand-coded rules | Learns from data |");
  });
});
