import { describe, it, expect } from "vitest";
import {
  DAYLIGHT_PALETTES,
  NEON_PALETTES,
  seedPosterStyle,
  renderPosterIllustration,
  matchPosterMotif,
  PosterMotif,
} from "./posterMotifs";

describe("AI Poster & Cover Features", () => {
  it("seeds valid poster styles for arbitrary titles across Daylight and Neon series", () => {
    const daylight = seedPosterStyle("Genius Makers", "Cade Metz", "daylight");
    expect(daylight).toBeDefined();
    expect(daylight.series).toBe("daylight");
    expect(daylight.tokens.g).toBeDefined();
    expect(daylight.tokens.a).toBeDefined();
    expect(daylight.tokens.b).toBeDefined();
    expect(daylight.tokens.isNeon).toBe(false);

    const neon = seedPosterStyle("Designing Data-Intensive Applications", "Martin Kleppmann", "neon");
    expect(neon).toBeDefined();
    expect(neon.series).toBe("neon");
    expect(neon.tokens.isNeon).toBe(true);
  });

  it("semantically matches motifs based on book title keywords", () => {
    expect(matchPosterMotif("Make Time")).toBe("cyber_grid");
    expect(matchPosterMotif("Offshore")).toBe("cosmic_orbit");
    expect(matchPosterMotif("The Little Book of Indian Business")).toBe("monument_arch");
    expect(matchPosterMotif("Indian Superfoods")).toBe("botanical_lush");
    expect(matchPosterMotif("Life After Cars")).toBe("dune_wanderer");
    expect(matchPosterMotif("Tiny Experiments")).toBe("pop_starburst");
    expect(matchPosterMotif("The Man's Guide to Women")).toBe("optical_prism");
  });

  it("renders 3-token vector art for all motifs in Daylight and Neon", () => {
    const motifs = Object.keys(DAYLIGHT_PALETTES) as PosterMotif[];
    for (const motif of motifs) {
      const daylightTokens = DAYLIGHT_PALETTES[motif];
      const svgDaylight = renderPosterIllustration(motif, daylightTokens);
      expect(svgDaylight).toContain("<svg");
      expect(svgDaylight).toContain("viewBox=\"0 0 200 300\"");
      expect(svgDaylight).toContain(daylightTokens.g);

      const neonTokens = NEON_PALETTES[motif];
      const svgNeon = renderPosterIllustration(motif, neonTokens);
      expect(svgNeon).toContain("<svg");
      expect(svgNeon).toContain(neonTokens.g);
    }
  });
});
