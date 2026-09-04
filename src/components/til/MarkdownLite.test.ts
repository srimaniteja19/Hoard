import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { MarkdownLite } from "./MarkdownLite";

describe("MarkdownLite cross-references", () => {
  it("renders resolvable #hash as a link when hash is in validHashes", () => {
    const html = renderToString(
      React.createElement(MarkdownLite, {
        content: "Check entry #a3f9 for details.",
        validHashes: new Set(["a3f9"]),
      })
    );

    expect(html).toContain('href="#til-a3f9"');
    expect(html).toContain('class="til-crossref-link"');
    expect(html).toContain("#a3f9");
  });

  it("renders unresolvable #hash as plain text (no <a> tag)", () => {
    const html = renderToString(
      React.createElement(MarkdownLite, {
        content: "See #0c67 for context.",
        validHashes: new Set(["a3f9"]), // 0c67 is NOT in validHashes
      })
    );

    expect(html).not.toContain('<a');
    expect(html).toContain("#0c67");
  });

  it("renders unresolvable hash when validHashes is empty or omitted", () => {
    const html = renderToString(
      React.createElement(MarkdownLite, {
        content: "Entry #b2e4 was mentioned.",
      })
    );

    expect(html).not.toContain('<a');
    expect(html).toContain("#b2e4");
  });

  it("renders code blocks cleanly without parsing hashes inside code", () => {
    const html = renderToString(
      React.createElement(MarkdownLite, {
        content: "Run `#a3f9` in terminal.",
        validHashes: new Set(["a3f9"]),
      })
    );

    expect(html).toContain("<code");
    expect(html).toContain(">#a3f9</code>");
    expect(html).not.toContain('href="#til-a3f9"');
  });

  it("renders bullet lists cleanly with custom pips instead of broken italics", () => {
    const input = "* Point Alpha\n* Point Beta\n- Point Gamma";
    const html = renderToString(
      React.createElement(MarkdownLite, { content: input })
    );

    expect(html).toContain('class="til-bullet-list"');
    expect(html).toContain('class="til-bullet-item"');
    expect(html).toContain("Point Alpha");
    expect(html).toContain("Point Beta");
    expect(html).toContain("Point Gamma");
    // Ensure asterisks were NOT mangled into <em> tags spanning across lines
    expect(html).not.toContain("<em");
  });

  it("renders the user's intelligence briefing with bullet items properly", () => {
    const input =
      "* Leaked internal documents indicate low probability.\n* Ukrainian forces secure minor gains.\n* Russia escalates aerial attacks.";
    const html = renderToString(
      React.createElement(MarkdownLite, { content: input })
    );

    expect(html).toContain('class="til-bullet-list"');
    expect(html).toContain("Leaked internal documents");
    expect(html).toContain("Ukrainian forces");
    expect(html).toContain("Russia escalates");
  });
});
