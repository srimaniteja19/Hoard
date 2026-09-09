import { describe, it, expect } from "vitest";
import {
  splitLedeAndRest,
  estimateReadMinutes,
  countWords,
  deriveIssueStatus,
  status,
  parseHtmlToBlocks,
  parseNewsletter,
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

describe("status (derived status helper)", () => {
  it("returns unread when not closed", () => {
    expect(status({ closedAt: null, keeps: [] })).toBe("unread");
    expect(status({ closedAt: undefined, keeps: [] })).toBe("unread");
  });

  it("returns kept when keeps exist on closed issue", () => {
    expect(status({ closedAt: new Date(), keeps: [{ id: "k1" }] })).toBe("kept");
  });

  it("returns skimmed when density is skim and closed with no keeps", () => {
    expect(status({ closedAt: new Date(), keeps: [], density: "skim" })).toBe("skimmed");
  });

  it("returns nothing when closed at regular density with no keeps", () => {
    expect(status({ closedAt: new Date(), keeps: [], density: "read" })).toBe("nothing");
    expect(status({ closedAt: new Date(), keeps: [], density: "study" })).toBe("nothing");
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

describe("parseNewsletter", () => {
  it("returns blocks: null when given empty or unparseable input", () => {
    expect(parseNewsletter("").blocks).toBeNull();
    expect(parseNewsletter("   ").blocks).toBeNull();
  });

  it("parses Substack format cleanly", () => {
    const substackHtml = `
      <!DOCTYPE html><html><head><title>The Pragmatic Engineer</title></head>
      <body>
        <table><tr><td>
          <h1>Big Tech Compensation in 2026</h1>
          <p>Compensation packages have shifted dramatically over the past two years. Equity refreshes are now standard across senior bands. Total comp is up 18% on average.</p>
          <h2>Key Data Points</h2>
          <ul>
            <li>Staff level median reached $620k</li>
            <li>Principal bands saw largest divergence</li>
          </ul>
          <p>Read the full benchmarking report on <a href="https://levels.fyi/2026-report">Levels.fyi</a>.</p>
        </td></tr></table>
      </body></html>
    `;
    const result = parseNewsletter(substackHtml);
    expect(result.blocks).not.toBeNull();
    expect(result.blocks?.length).toBeGreaterThanOrEqual(4);
    expect(result.links.length).toBeGreaterThanOrEqual(1);
    expect(result.wordCount).toBeGreaterThan(20);
    expect(result.readMinutes).toBeGreaterThanOrEqual(1);
  });

  it("parses Beehiiv format cleanly", () => {
    const beehiivHtml = `
      <!DOCTYPE html><html><head><title>Superhuman AI</title><meta name="description" content="AI models are becoming agentic faster than predicted."></head>
      <body>
        <table width="100%" class="beehiiv-wrapper">
          <tr><td>
            <h1>The Next Horizon of LLMs</h1>
            <p>Reasoning models use test-time compute to verify step-by-step logic before answering. This changes how we think about token generation speed.</p>
            <figure id="chart-compute">
              <figcaption>Inference compute scaling curve</figcaption>
            </figure>
            <p>Check out the technical paper on <a href="https://arxiv.org/abs/2401.0001">ArXiv</a> for empirical proofs.</p>
          </td></tr>
        </table>
      </body></html>
    `;
    const result = parseNewsletter(beehiivHtml);
    expect(result.blocks).not.toBeNull();
    expect(result.blocks?.some((b) => b.type === "fig")).toBe(true);
    expect(result.dek).toContain("AI models are becoming agentic");
  });

  it("parses Ghost format cleanly", () => {
    const ghostHtml = `
      <!DOCTYPE html><html><head><title>Stratechery</title></head>
      <body>
        <article class="post">
          <h1>Aggregation Theory and AI Agents</h1>
          <p>The original Aggregation Theory was built on zero distribution costs and zero marginal transaction costs. Now agents introduce zero coordination costs between distributed services.</p>
          <blockquote>The aggregator that commands consumer attention commands the entire value chain.</blockquote>
          <p>For earlier analysis see <a href="https://stratechery.com/aggregation-theory">The Original Essay</a>.</p>
        </article>
      </body></html>
    `;
    const result = parseNewsletter(ghostHtml);
    expect(result.blocks).not.toBeNull();
    expect(result.blocks?.length).toBeGreaterThanOrEqual(3);
  });

  it("parses plain text format cleanly", () => {
    const plainText = `
The Future of Distributed Systems in 2026.

Consensus algorithms have stabilized around Raft and Multi-Paxos variants. However, modern Byzantine fault tolerant algorithms are gaining ground in edge networks.

Key takeaways for engineering leaders:
- Always benchmark under packet drop conditions.
- Test partition recovery scenarios with chaos engineering.
- Hardware failovers happen more often than cloud providers admit.

Read more at https://dist-systems.io/2026
    `;
    const result = parseNewsletter(plainText);
    expect(result.blocks).not.toBeNull();
    expect(result.blocks?.length).toBeGreaterThanOrEqual(3);
  });
});

