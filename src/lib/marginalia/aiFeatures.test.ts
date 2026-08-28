import { describe, it, expect } from "vitest";
import { POSTER_PALETTES, seedPosterStyle, renderPosterIllustration } from "./posterMotifs";

describe("AI Poster & Cover Features", () => {
  it("seeds valid poster styles for arbitrary titles", () => {
    const theme1 = seedPosterStyle("Genius Makers", "Cade Metz");
    expect(theme1).toBeDefined();
    expect(theme1.bgGradient).toContain("linear-gradient");
    expect(theme1.accent).toBeDefined();

    const theme2 = seedPosterStyle("Designing Data-Intensive Applications", "Martin Kleppmann");
    expect(theme2).toBeDefined();
    expect(theme2.motif).toBeDefined();
  });

  it("renders rich animated SVG vector art for all motifs", () => {
    const motifs = Object.keys(POSTER_PALETTES) as Array<keyof typeof POSTER_PALETTES>;
    for (const motif of motifs) {
      const theme = POSTER_PALETTES[motif];
      const svg = renderPosterIllustration(motif, theme);
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).toContain("viewBox=\"0 0 200 300\"");
    }
  });
});
