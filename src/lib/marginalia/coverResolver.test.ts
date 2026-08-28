import { describe, it, expect, vi } from "vitest";
import { cleanIsbn, resolveBookCover } from "./coverResolver";
import { seedHouseStyle, renderMotifSvg, hashString } from "./houseMotifs";

describe("cleanIsbn", () => {
  it("strips hyphens and spaces", () => {
    expect(cleanIsbn("978-1-4493-7332-0")).toBe("9781449373320");
    expect(cleanIsbn(" 978 0 374 15735 7 ")).toBe("9780374157357");
  });

  it("returns null for null, empty or invalid short strings", () => {
    expect(cleanIsbn(null)).toBeNull();
    expect(cleanIsbn("")).toBeNull();
    expect(cleanIsbn("123")).toBeNull();
  });
});

describe("seedHouseStyle", () => {
  it("deterministically returns valid color and motif", () => {
    const style1 = seedHouseStyle("Designing Data-Intensive Applications", "Martin Kleppmann");
    const style2 = seedHouseStyle("Designing Data-Intensive Applications", "Martin Kleppmann");
    expect(style1).toEqual(style2);
    expect(style1.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(style1.fgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(["arcs", "grid", "strata", "rules", "blocks", "diag"]).toContain(style1.motif);
    expect(style1.initial).toBe("D");
  });
});

describe("renderMotifSvg", () => {
  it("generates valid SVG strings for all motifs", () => {
    const motifs = ["arcs", "grid", "strata", "rules", "blocks", "diag"] as const;
    for (const m of motifs) {
      const svg = renderMotifSvg(m, "#FFFFFF");
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("#FFFFFF");
    }
  });
});

describe("resolveBookCover", () => {
  it("prioritizes custom uploaded covers", async () => {
    const res = await resolveBookCover({
      title: "Shape Up",
      author: "Ryan Singer",
      customCoverUrl: "https://example.com/shape-up.jpg",
    });

    expect(res.coverUrl).toBe("https://example.com/shape-up.jpg");
    expect(res.coverSource).toBe("UPLOAD");
    expect(res.provenanceLabel).toBe("YOUR UPLOAD");
  });

  it("returns house edition fallback when no cover found", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
      headers: new Headers(),
    } as unknown as Response);

    const res = await resolveBookCover({
      title: "Unknown Ultra Rare Manuscript 998877",
      author: "Anonymous Writer 123",
      isbn: null,
    });

    expect(res.coverUrl).toBeNull();
    expect(res.coverSource).toBe("HOUSE");
    expect(res.provenanceLabel).toBe("HOUSE EDITION");
    expect(res.accentColor).toBeDefined();
    expect(res.motif).toBeDefined();

    fetchSpy.mockRestore();
  });

  it("extracts pageCount and estimates chapters when available", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("googleapis.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                volumeInfo: {
                  title: "Genius Makers",
                  authors: ["Cade Metz"],
                  pageCount: 384,
                  industryIdentifiers: [{ type: "ISBN_13", identifier: "9781524742676" }],
                  imageLinks: { thumbnail: "https://books.google.com/genius.jpg" },
                },
              },
            ],
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    const res = await resolveBookCover({
      title: "Genius Makers",
      author: "Cade Metz",
    });

    expect(res.metadata?.pageCount).toBe(384);
    expect(res.metadata?.chapterCount).toBe(15); // 384 / 26 = ~15 chapters
    expect(res.metadata?.suggestedAuthor).toBe("Cade Metz");
    expect(res.metadata?.suggestedIsbn).toBe("9781524742676");

    fetchSpy.mockRestore();
  });

  it("extracts and parses structured Table of Contents from Open Library", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("openlibrary.org/isbn/9781449373320.json")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            number_of_pages: 560,
            table_of_contents: [
              { title: "Chapter 1: Reliable, Scalable, and Maintainable Applications", pagenum: "3" },
              { title: "Chapter 2: Data Models and Query Languages", pagenum: "27" },
              { title: "Chapter 3: Storage and Retrieval", pagenum: "69" },
            ],
          }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });

    const res = await resolveBookCover({
      title: "Designing Data-Intensive Applications",
      isbn: "978-1-4493-7332-0",
    });

    expect(res.metadata?.pageCount).toBe(560);
    expect(res.metadata?.chapterCount).toBe(3);
    expect(res.metadata?.chapters).toHaveLength(3);
    expect(res.metadata?.chapters?.[0].title).toBe("Reliable, Scalable, and Maintainable Applications");
    expect(res.metadata?.chapters?.[0].number).toBe(1);
    expect(res.metadata?.chapters?.[0].page).toBe(3);

    fetchSpy.mockRestore();
  });
});
