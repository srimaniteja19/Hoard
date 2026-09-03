import { describe, it, expect } from "vitest";
import { parseMarkdownToBlocks } from "./blocks";

describe("parseMarkdownToBlocks (Markdown Paste Handling)", () => {
  it("accurately parses user's multi-line markdown notes with headings and URLs into distinct blocks", () => {
    const userMarkdown = `# Learn AI & Data Science Visually
29 hand-picked interactive resources — @aasifcodes

## Core Interactive Tools

## TensorFlow Playground
https://playground.tensorflow.org

## Interactive Machine Learning (MLU-Explain)
https://mlu-explain.github.io

## A Visual Intro to Machine Learning (R2D3)
http://www.r2d3.us/visual-intro-to-machine-learning-part-1

## Seeing Theory
https://seeing-theory.brown.edu

## ML Visualized
https://ml-visualized.com

## Neural Network Explainers

## CNN Explainer
https://poloclub.github.io/cnn-explainer`;

    const blocks = parseMarkdownToBlocks(userMarkdown);

    // Block 0: Main Title
    expect(blocks[0]).toMatchObject({
      type: "heading",
      level: 2,
      text: "Learn AI & Data Science Visually",
    });

    // Block 1: Subtitle paragraph
    expect(blocks[1]).toMatchObject({
      type: "paragraph",
      text: "29 hand-picked interactive resources — @aasifcodes",
    });

    // Block 2: Section heading
    expect(blocks[2]).toMatchObject({
      type: "heading",
      level: 3,
      text: "Core Interactive Tools",
    });

    // Block 3: Tool heading
    expect(blocks[3]).toMatchObject({
      type: "heading",
      level: 3,
      text: "TensorFlow Playground",
    });

    // Block 4: Link Card for TensorFlow Playground
    expect(blocks[4].type).toBe("link");
    expect((blocks[4] as any).url).toBe("https://playground.tensorflow.org");

    // Block 5: MLU-Explain Heading
    expect(blocks[5]).toMatchObject({
      type: "heading",
      level: 3,
      text: "Interactive Machine Learning (MLU-Explain)",
    });

    // Block 6: MLU-Explain Link Card
    expect(blocks[6].type).toBe("link");
    expect((blocks[6] as any).url).toBe("https://mlu-explain.github.io");

    // Verify NONE of the headings contain literal "#" or "##"
    for (const b of blocks) {
      if (b.type === "heading") {
        expect(b.text.startsWith("#")).toBe(false);
      }
    }
  });

  it("parses code fences, quotes, checklists, tables, and dividers", () => {
    const mixedMarkdown = `
> This is a notable quote

\`\`\`typescript
const answer = 42;
console.log(answer);
\`\`\`

- [ ] Buy groceries
- [x] Ship feature

| Name | Role | Level |
| :--- | :---: | ---: |
| Alice | Staff | L6 |
| Bob | Lead | L5 |

---

1. Step One
2. Step Two
`;

    const blocks = parseMarkdownToBlocks(mixedMarkdown);

    // Quote
    expect(blocks[0]).toMatchObject({
      type: "quote",
      text: "This is a notable quote",
    });

    // Code
    expect(blocks[1]).toMatchObject({
      type: "code",
      lang: "TYPESCRIPT",
      code: "const answer = 42;\nconsole.log(answer);",
    });

    // Todo checklist
    expect(blocks[2]).toMatchObject({
      type: "todo",
      items: [
        { text: "Buy groceries", done: false },
        { text: "Ship feature", done: true },
      ],
    });

    // Table
    expect(blocks[3]).toMatchObject({
      type: "table",
      hasHeaderRow: true,
    });
    expect((blocks[3] as any).columns.length).toBe(3);
    expect((blocks[3] as any).rows.length).toBe(2);

    // Divider
    expect(blocks[4]).toMatchObject({
      type: "divider",
    });

    // Numbered lists
    expect(blocks[5]).toMatchObject({
      type: "numbered",
      number: 1,
      text: "Step One",
    });
    expect(blocks[6]).toMatchObject({
      type: "numbered",
      number: 2,
      text: "Step Two",
    });
  });
});
