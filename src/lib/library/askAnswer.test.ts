import { describe, expect, it } from "vitest";
import { isThinSnippet, parseAskAnswer, parseAskMarkdown } from "./askAnswer";

describe("parseAskAnswer", () => {
  it("pulls the Summary heading into a lede and leaves the rest as body", () => {
    const parsed = parseAskAnswer(
      `## Summary
On-package SSDs never beat a normal NVMe path.

## Why
- The GPU still talked to storage through the CPU
- Thermals and the controller tax killed the pitch`
    );
    expect(parsed.summary).toBe("On-package SSDs never beat a normal NVMe path.");
    expect(parsed.body).toContain("## Why");
  });

  it("treats a blank line after Summary as the split when there is no next heading", () => {
    const parsed = parseAskAnswer(`## Summary
Short answer here.

The longer explanation follows.`);
    expect(parsed.summary).toBe("Short answer here.");
    expect(parsed.body).toBe("The longer explanation follows.");
  });

  it("passes through answers that skip the Summary heading", () => {
    expect(parseAskAnswer("Just a paragraph.")).toEqual({
      summary: "",
      body: "Just a paragraph.",
    });
  });
});

describe("parseAskMarkdown", () => {
  it("splits headings, lists, and paragraphs", () => {
    const blocks = parseAskMarkdown(`## Why
The bus was the bottleneck.

- Thermals
- Controller tax

1. First
2. Second`);
    expect(blocks).toEqual([
      { type: "heading", level: 2, text: "Why" },
      { type: "paragraph", text: "The bus was the bottleneck." },
      { type: "list", ordered: false, items: ["Thermals", "Controller tax"] },
      { type: "list", ordered: true, items: ["First", "Second"] },
    ]);
  });
});

describe("isThinSnippet", () => {
  it("treats title-only and tiny notes as thin", () => {
    expect(isThinSnippet("Why didn't SSDs inside the GPU work", "Why didn't SSDs inside the GPU work")).toBe(true);
    expect(
      isThinSnippet(
        "Rate limiting",
        "Token bucket versus sliding window at the edge, with nginx examples, diagrams, and a short implementation note."
      )
    ).toBe(false);
  });
});
