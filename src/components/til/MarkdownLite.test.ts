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
});
