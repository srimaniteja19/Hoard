import { KindType } from "@/types";

export interface DuotonePalette {
  shadow: string;    // Shadow color hex
  highlight: string; // Highlight color hex
}

/**
 * HOARD Duotone Color Palettes by Bookmark Kind (§4.1)
 */
export const DUOTONE_PALETTES: Record<KindType, DuotonePalette> = {
  ART: { shadow: "#1A0A00", highlight: "#FF8A00" }, // Warm reading amber
  VID: { shadow: "#0A001A", highlight: "#00F0FF" }, // Electric cyan / night stage
  PLY: { shadow: "#1A0012", highlight: "#FF0088" }, // Magenta audio pulse
  GIT: { shadow: "#001A0A", highlight: "#00FF66" }, // Terminal phosphor green
  APP: { shadow: "#0D1117", highlight: "#8B949E" }, // Dimmed slate / tool utility
  PPR: { shadow: "#001A18", highlight: "#00E5FF" }, // Academic ice teal
  DOC: { shadow: "#1A1600", highlight: "#FFE600" }, // High-contrast reference yellow
};

/**
 * Converts hex color string (#RRGGBB) to normalized [r, g, b] floats in range 0..1
 */
export function hexToNormalizedRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return [0, 0, 0];
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [
    isNaN(r) ? 0 : Math.round(r * 1000) / 1000,
    isNaN(g) ? 0 : Math.round(g * 1000) / 1000,
    isNaN(b) ? 0 : Math.round(b * 1000) / 1000,
  ];
}

/**
 * Computes feFuncR/G/B tableValues string for feComponentTransfer given shadow and highlight hex colors.
 */
export function getDuotoneTableValues(palette: DuotonePalette): {
  rTable: string;
  gTable: string;
  bTable: string;
} {
  const [sR, sG, sB] = hexToNormalizedRgb(palette.shadow);
  const [hR, hG, hB] = hexToNormalizedRgb(palette.highlight);

  return {
    rTable: `${sR.toFixed(3)} ${hR.toFixed(3)}`,
    gTable: `${sG.toFixed(3)} ${hG.toFixed(3)}`,
    bTable: `${sB.toFixed(3)} ${hB.toFixed(3)}`,
  };
}
