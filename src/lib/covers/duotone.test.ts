import { describe, it, expect } from "vitest";
import { DUOTONE_PALETTES, hexToNormalizedRgb, getDuotoneTableValues } from "./duotone";

describe("hexToNormalizedRgb", () => {
  it("converts hex string to normalized 0..1 RGB array", () => {
    expect(hexToNormalizedRgb("#1A0A00")).toEqual([0.102, 0.039, 0]);
    expect(hexToNormalizedRgb("#FF8A00")).toEqual([1, 0.541, 0]);
  });
});

describe("getDuotoneTableValues (§4.1 Palette Targets)", () => {
  it("computes tableValues for ART kind (amber)", () => {
    const vals = getDuotoneTableValues(DUOTONE_PALETTES.ART);
    expect(vals.rTable).toBe("0.102 1.000");
    expect(vals.gTable).toBe("0.039 0.541");
    expect(vals.bTable).toBe("0.000 0.000");
  });

  it("computes tableValues for VID kind (electric cyan)", () => {
    const vals = getDuotoneTableValues(DUOTONE_PALETTES.VID);
    expect(vals.rTable).toBe("0.039 0.000");
    expect(vals.gTable).toBe("0.000 0.941");
    expect(vals.bTable).toBe("0.102 1.000");
  });

  it("defines palettes for all 7 kinds", () => {
    const kinds = ["ART", "VID", "PLY", "GIT", "APP", "PPR", "DOC"] as const;
    kinds.forEach((kind) => {
      expect(DUOTONE_PALETTES[kind]).toBeDefined();
      expect(DUOTONE_PALETTES[kind].shadow).toMatch(/^#[0-9A-F]{6}$/i);
      expect(DUOTONE_PALETTES[kind].highlight).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});
