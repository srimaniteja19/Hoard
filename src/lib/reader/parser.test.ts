import { describe, it, expect } from "vitest";
import {
  splitLedeAndRest,
  estimateReadMinutes,
  countWords,
  deriveIssueStatus,
  parseHtmlToBlocks,
} from "./parser";

describe("splitLedeAndRest", () => {
  it("splits a multi-sentence paragraph into lede and rest", () => {
    const text =
      "Most production LLM systems send every request to the same model, and that model is chosen for the hardest request the system will ever see. Which means the other ninety per cent of traffic is answered by something far more capable than it needs.";
    const { lede, rest } = splitLedeAndRest(text);
    expect(lede).toBe(
      "Most production LLM systems send every request to the same model, and that model is chosen for the hardest request the system will ever see."
    );
    expect(rest.trim()).toBe(
      "Which means the other ninety per cent of traffic is answered by something far more capable than it needs."
    );
  });

  it("handles a single-sentence paragraph", () => {
    const text = "The router is the whole problem.";
    const { lede, rest } = splitLedeAndRest(text);
    expect(lede).toBe("The router is the whole problem.");
    expect(rest).toBe("");
  });

  it("preserves HTML markup in lede", () => {
    const text =
      "<strong>Routing is the idea that the model should be chosen per request.</strong> A small classifier looks at the incoming request.";
    const { lede, rest } = splitLedeAndRest(text);
    expect(lede).toContain("<strong>Routing is the idea that the model should be chosen per request.</strong>");
    expect(rest.trim()).toBe("A small classifier looks at the incoming request.");
  });
});

describe("estimateReadMinutes", () => {
  it("computes estimated read minutes at ~220 wpm", () => {
    expect(estimateReadMinutes(1100)).toBe(5);
    expect(estimateReadMinutes(1840)).toBe(8);
    expect(estimateReadMinutes(3100)).toBe(14);
    expect(estimateReadMinutes(100)).toBe(1);
    expect(estimateReadMinutes(0)).toBe(1);
  });
});

describe("deriveIssueStatus", () => {
  it("derives kept whenever keptCount > 0", () => {
    expect(deriveIssueStatus({ keptCount: 2, wasClosed: true })).toBe("kept");
    expect(deriveIssueStatus({ keptCount: 1, wasClosed: false })).toBe("kept");
  });

  it("derives unread when not closed and keptCount === 0", () => {
    expect(deriveIssueStatus({ keptCount: 0, wasClosed: false })).toBe("unread");
  });

  it("derives skimmed when closed at density skim with 0 keeps", () => {
    expect(
      deriveIssueStatus({ keptCount: 0, density: "skim", wasClosed: true })
    ).toBe("skimmed");
  });

  it("derives nothing when closed at normal density with 0 keeps", () => {
    expect(
      deriveIssueStatus({ keptCount: 0, density: "read", wasClosed: true })
    ).toBe("nothing");
    expect(
      deriveIssueStatus({ keptCount: 0, density: "study", wasClosed: true })
    ).toBe("nothing");
  });
});

describe("parseHtmlToBlocks", () => {
  it("parses headings, paragraphs, and lists into structured blocks", () => {
    const html = `
      <h2>The router is the whole problem</h2>
      <p>The difficulty isn't running two models. It is deciding which one before you have the answer.</p>
      <ul>
        <li>Heuristics — prompt length, code presence</li>
        <li>Trained classifier — small fine-tuned model</li>
      </ul>
    `;
    const blocks = parseHtmlToBlocks(html);
    expect(blocks.length).toBe(3);
    expect(blocks[0]).toEqual({
      type: "h",
      text: "The router is the whole problem",
    });
    expect(blocks[1].type).toBe("p");
    if (blocks[1].type === "p") {
      expect(blocks[1].lede).toBe("The difficulty isn't running two models.");
      expect(blocks[1].rest.trim()).toBe(
        "It is deciding which one before you have the answer."
      );
    }
    expect(blocks[2]).toEqual({
      type: "ul",
      items: [
        "Heuristics — prompt length, code presence",
        "Trained classifier — small fine-tuned model",
      ],
    });
  });
});
