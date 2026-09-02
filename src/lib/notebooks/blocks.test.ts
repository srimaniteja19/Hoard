import { describe, it, expect } from "vitest";
import {
  lessonState,
  computeWordCount,
  blocksToChunks,
  BlockSchema,
  Block,
} from "./blocks";

describe("Notebooks Block Contract & Logic", () => {
  it("derives correct lessonState from word count", () => {
    expect(lessonState(null)).toBe("empty");
    expect(lessonState({ wordCount: 0 })).toBe("empty");
    expect(lessonState({ wordCount: 45 })).toBe("stub");
    expect(lessonState({ wordCount: 119 })).toBe("stub");
    expect(lessonState({ wordCount: 120 })).toBe("written");
    expect(lessonState({ wordCount: 950 })).toBe("written");
  });

  it("validates all 11 block types with BlockSchema", () => {
    const testBlocks: Block[] = [
      { id: "1", type: "paragraph", text: "Hello **world**" },
      { id: "2", type: "heading", level: 2, text: "Heading text", ts: "0:07" },
      { id: "3", type: "callout", kind: "gotcha", text: "Watch out" },
      { id: "4", type: "code", lang: "PYTHON", code: "print(1)" },
      { id: "5", type: "toggle", summary: "Summary", body: "Hidden body" },
      { id: "6", type: "todo", items: [{ text: "Do this", done: false }] },
      { id: "7", type: "quote", text: "Smart quote", attribution: "Speaker" },
      { id: "8", type: "image", url: "/img.png", caption: "Diagram" },
      { id: "9", type: "link", url: "https://example.com", title: "Example" },
      { id: "10", type: "mark", timestamp: "05:12", text: "Mark text" },
      {
        id: "11",
        type: "example",
        title: "THE EXAMPLE HE USED",
        v1Title: "DRAFT 1",
        v1Text: "Draft text",
        v2Title: "DRAFT 2",
        v2Text: "Revised text",
      },
      {
        id: "12",
        type: "scale",
        title: "HIS WORDS, NOT MEASUREMENTS",
        items: [{ name: "DIRECT", pct: 42, color: "shade" }],
      },
      {
        id: "13",
        type: "anchors",
        title: "THE LECTURE, INDEXED",
        items: [{ timestamp: "0:07", label: "Intro", sectionTag: "§1" }],
      },
      {
        id: "14",
        type: "next",
        initial: "A",
        title: "Next Lecture Title",
        meta: "ANNOUNCED",
      },
      { id: "15", type: "divider" },
    ];

    for (const b of testBlocks) {
      const parsed = BlockSchema.safeParse(b);
      expect(parsed.success).toBe(true);
    }

    // Verify normalization when LLM produces array of raw strings for todo, anchors, scale
    const rawTodoBlock = {
      id: "raw-todo",
      type: "todo",
      items: [
        "Run the reflection lab with 1, 2 and 4 rounds",
        "Log token cost per round — is round 3 ever worth it?",
        "Try a critic with a linter attached vs a bare critic",
      ],
    };
    const parsedTodo = BlockSchema.safeParse(rawTodoBlock);
    expect(parsedTodo.success).toBe(true);
    if (parsedTodo.success && parsedTodo.data.type === "todo") {
      expect(parsedTodo.data.items[0]).toEqual({
        text: "Run the reflection lab with 1, 2 and 4 rounds",
        done: false,
      });
    }

    const rawAnchorsBlock = {
      id: "raw-anchors",
      type: "anchors",
      title: "THE LECTURE, INDEXED",
      items: [
        "Prompting LLMs in a single pass",
        "The agentic iterative workflow",
        "0:07 The human analogy — §1",
      ],
    };
    const parsedAnchors = BlockSchema.safeParse(rawAnchorsBlock);
    expect(parsedAnchors.success).toBe(true);
    if (parsedAnchors.success && parsedAnchors.data.type === "anchors") {
      expect(parsedAnchors.data.items[0]).toEqual({
        timestamp: "0:00",
        label: "Prompting LLMs in a single pass",
        sectionTag: "§",
      });
      expect(parsedAnchors.data.items[2]).toEqual({
        timestamp: "0:07",
        label: "The human analogy",
        sectionTag: "§1",
      });
    }

    const rawScaleBlock = {
      id: "raw-scale",
      type: "scale",
      title: "SCALE",
      items: ["DIRECT GENERATION", "+ SELF-REFLECTION"],
    };
    const parsedScale = BlockSchema.safeParse(rawScaleBlock);
    expect(parsedScale.success).toBe(true);
    if (parsedScale.success && parsedScale.data.type === "scale") {
      expect(parsedScale.data.items[0]).toEqual({
        name: "DIRECT GENERATION",
        pct: 50,
        color: "shade",
      });
    }
  });

  it("computes accurate word counts across different block types", () => {
    const blocks: Block[] = [
      { id: "1", type: "paragraph", text: "One two three four" },
      { id: "2", type: "heading", level: 2, text: "Five six" },
      { id: "3", type: "callout", kind: "fact", text: "Seven eight nine" },
      { id: "4", type: "todo", items: [{ text: "Ten eleven", done: false }] },
    ];

    expect(computeWordCount(blocks)).toBe(11);
  });

  it("chunks text-bearing blocks for embeddings and collisions", () => {
    const blocks: Block[] = [
      { id: "1", type: "paragraph", text: "This is a meaningful paragraph that has enough length to be indexed." },
      { id: "2", type: "heading", level: 2, text: "Short" }, // under 25 chars, ignored
      { id: "3", type: "callout", kind: "gotcha", text: "Another important insight that exceeds the minimum character threshold." },
    ];

    const chunks = blocksToChunks(blocks);
    expect(chunks.length).toBe(2);
    expect(chunks[0].blockId).toBe("1");
    expect(chunks[1].blockId).toBe("3");
  });

  it("extracts active recall flashcards from gotchas, facts, toggles, and headings", async () => {
    const { extractFlashcards } = await import("@/components/notebooks/FlashcardModal");

    const sampleBlocks: Block[] = [
      { id: "g1", type: "callout", kind: "gotcha", text: "Watch out for race conditions on blur events" },
      { id: "f1", type: "callout", kind: "fact", text: "PostgreSQL transactions ensure serializability" },
      { id: "t1", type: "toggle", summary: "What is an Agent?", body: "An LLM that can use tools iteratively" },
      { id: "h1", type: "heading", level: 2, text: "Vector Distance" },
      { id: "p1", type: "paragraph", text: "Cosine similarity measures the angle between two embedding vectors in multidimensional space." },
    ];

    const cards = extractFlashcards("Distributed Agents", sampleBlocks);
    expect(cards.length).toBe(4);
    expect(cards[0].category).toBe("gotcha");
    expect(cards[0].back).toContain("Watch out for race conditions");
    expect(cards[1].category).toBe("fact");
    expect(cards[1].back).toContain("PostgreSQL transactions");
    expect(cards[2].category).toBe("toggle");
    expect(cards[2].front).toBe("What is an Agent?");
    expect(cards[3].category).toBe("concept");
    expect(cards[3].front).toContain("Vector Distance");
  });
});
