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

  it("parses markdown tables, including smashed one-liners", () => {
    const neat = parseAskMarkdown(`| Coin | Price |
| --- | --- |
| Bitcoin | $77,700 |
| Solana | $92 |`);
    expect(neat).toEqual([
      {
        type: "table",
        headers: ["Coin", "Price"],
        rows: [
          ["Bitcoin", "$77,700"],
          ["Solana", "$92"],
        ],
      },
    ]);

    const smashed = parseAskMarkdown(
      "| Coin | Price | 24h Change | Source | |-------------|-----------|------------|--------------------| | Bitcoin | ~$77,700 | +5–7% | CoinGecko, Yahoo | | Solana | ~$92 | +5% | CoinGecko, Yahoo | | Dogecoin| ~$0.088 | +9% | CoinGecko, Yahoo |"
    );
    expect(smashed[0]).toMatchObject({
      type: "table",
      headers: ["Coin", "Price", "24h Change", "Source"],
    });
    expect(smashed[0].type === "table" && smashed[0].rows).toHaveLength(3);
  });

  it("parses fenced code blocks with language and preserves formatting", () => {
    const codeMd = `Here is the SQL:

\`\`\`sql
WITH arpu_and_churn AS (
  SELECT SUM(mrr) / COUNT(DISTINCT user_id) AS arpu
  FROM current_subscriptions
)
SELECT * FROM arpu_and_churn;
\`\`\`

Done.`;

    const blocks = parseAskMarkdown(codeMd);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: "paragraph", text: "Here is the SQL:" });
    expect(blocks[1]).toEqual({
      type: "code",
      language: "sql",
      code: `WITH arpu_and_churn AS (\n  SELECT SUM(mrr) / COUNT(DISTINCT user_id) AS arpu\n  FROM current_subscriptions\n)\nSELECT * FROM arpu_and_churn;`,
    });
    expect(blocks[2]).toEqual({ type: "paragraph", text: "Done." });
  });

  it("handles streaming/unclosed code blocks without crashing", () => {
    const streamMd = `\`\`\`typescript\nconst a = 1;\nconst b = 2;`;
    const blocks = parseAskMarkdown(streamMd);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "code",
      language: "typescript",
      code: "const a = 1;\nconst b = 2;",
    });
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
