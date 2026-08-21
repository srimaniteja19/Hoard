import { describe, expect, it } from "vitest";
import { applyQuoteCapture, buildTextFragmentUrl } from "./textFragment";

describe("buildTextFragmentUrl", () => {
  it("returns the page URL unchanged when the selection is empty", () => {
    expect(buildTextFragmentUrl("https://example.com/post", "   ")).toBe("https://example.com/post");
  });

  it("strips an existing hash and appends a text fragment", () => {
    expect(buildTextFragmentUrl("https://example.com/post#section", "hello world")).toBe(
      "https://example.com/post#:~:text=hello%20world"
    );
  });

  it("collapses whitespace in the selected text", () => {
    expect(buildTextFragmentUrl("https://example.com/a", "foo\n\t  bar")).toBe(
      "https://example.com/a#:~:text=foo%20bar"
    );
  });

  it("uses start,end for a long selection so the URL stays short", () => {
    const quote = `${"a".repeat(200)} middle ${"z".repeat(200)}`;
    const url = buildTextFragmentUrl("https://example.com/long", quote);
    expect(url.startsWith("https://example.com/long#:~:text=")).toBe(true);
    expect(url).toContain(",");
    expect(url.length).toBeLessThan(quote.length);
  });
});

describe("applyQuoteCapture", () => {
  it("leaves a page save unchanged when quote is missing", () => {
    expect(applyQuoteCapture({ url: "https://example.com/post", note: "mine" })).toEqual({
      url: "https://example.com/post",
      note: "mine",
      isQuote: false,
    });
  });

  it("turns a quote into a fragment URL, stores the quote as the note, and marks it", () => {
    expect(applyQuoteCapture({ url: "https://example.com/post", quote: "  the passage  " })).toEqual({
      url: "https://example.com/post#:~:text=the%20passage",
      note: "the passage",
      isQuote: true,
    });
  });
});
