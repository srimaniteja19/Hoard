import { describe, it, expect } from "vitest";
import { parseClipImport, clipLinksToTilDrafts } from "./clipImport";

const VIDEO = {
  title: "Deepseek Harness explained in simple words",
  url: "https://www.youtube.com/watch?v=R2HVlXweJbw",
};

const ARTICLE = {
  title: "HTTP Methods Are Not CRUD",
  url: "https://example.com/http-methods",
};

describe("parseClipImport", () => {
  it("returns null for ordinary sentences so paste stays normal", () => {
    expect(parseClipImport("What did you learn today?")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseClipImport("[{title: missing quotes}]")).toBeNull();
  });

  it("parses pretty-printed extension dumps", () => {
    const dumped = `[
  {
    "title": "Deepseek Harness explained in simple words",
    "url": "https://www.youtube.com/watch?v=R2HVlXweJbw"
  },
  {
    "title": "HTTP Methods Are Not CRUD",
    "url": "https://www.youtube.com/watch?v=4DKnSdwgmg8"
  }
]`;
    expect(parseClipImport(dumped)?.items).toHaveLength(2);
  });

  it("parses an array of title/url objects", () => {
    const result = parseClipImport(JSON.stringify([VIDEO, ARTICLE]));
    expect(result).toEqual({
      items: [VIDEO, ARTICLE],
      dropped: 0,
    });
  });

  it("parses a single title/url object", () => {
    const result = parseClipImport(JSON.stringify(VIDEO));
    expect(result).toEqual({ items: [VIDEO], dropped: 0 });
  });

  it("ignores extra fields on each item", () => {
    const result = parseClipImport(
      JSON.stringify([{ ...VIDEO, source: "extension", watched: false }])
    );
    expect(result).toEqual({ items: [VIDEO], dropped: 0 });
  });

  it("drops items missing title or url and reports how many", () => {
    const result = parseClipImport(
      JSON.stringify([
        VIDEO,
        { title: "No url" },
        { url: "https://example.com/no-title" },
        { title: "  ", url: "https://example.com/blank" },
        { title: "Bad url", url: "not-a-url" },
      ])
    );
    expect(result).toEqual({ items: [VIDEO], dropped: 4 });
  });

  it("trims whitespace around title and url", () => {
    const result = parseClipImport(
      JSON.stringify([{ title: "  Hello  ", url: "  https://example.com/a  " }])
    );
    expect(result).toEqual({
      items: [{ title: "Hello", url: "https://example.com/a" }],
      dropped: 0,
    });
  });

  it("returns null when a JSON array has no valid items", () => {
    expect(parseClipImport("[]")).toBeNull();
    expect(parseClipImport(JSON.stringify([{ foo: "bar" }]))).toBeNull();
  });
});

describe("clipLinksToTilDrafts", () => {
  it("maps each link to a LINK TIL with youtube/vimeo full and articles card", () => {
    expect(
      clipLinksToTilDrafts([
        VIDEO,
        ARTICLE,
        { title: "Vimeo clip", url: "https://vimeo.com/123" },
        { title: "Short link", url: "https://youtu.be/R2HVlXweJbw" },
      ])
    ).toEqual([
      {
        type: "LINK",
        body: VIDEO.title,
        linkUrl: VIDEO.url,
        linkDensity: "full",
        tags: [],
        saveToHoardQueue: false,
      },
      {
        type: "LINK",
        body: ARTICLE.title,
        linkUrl: ARTICLE.url,
        linkDensity: "card",
        tags: [],
        saveToHoardQueue: false,
      },
      {
        type: "LINK",
        body: "Vimeo clip",
        linkUrl: "https://vimeo.com/123",
        linkDensity: "full",
        tags: [],
        saveToHoardQueue: false,
      },
      {
        type: "LINK",
        body: "Short link",
        linkUrl: "https://youtu.be/R2HVlXweJbw",
        linkDensity: "full",
        tags: [],
        saveToHoardQueue: false,
      },
    ]);
  });
});
