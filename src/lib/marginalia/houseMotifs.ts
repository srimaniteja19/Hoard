import { BookMotif } from "@/db/schema";

export const EDITORIAL_PALETTE: Array<{ accent: string; fg: string; name: string }> = [
  { accent: "#7B5CF0", fg: "#FFFFFF", name: "Violet" },
  { accent: "#1B8FA8", fg: "#FFFFFF", name: "Teal" },
  { accent: "#C4562A", fg: "#FFF6EC", name: "Terracotta" },
  { accent: "#2E6B3E", fg: "#F4F1E6", name: "Forest" },
  { accent: "#C2185B", fg: "#FFF0F5", name: "Crimson" },
  { accent: "#7A5230", fg: "#F6EEE2", name: "Cognac" },
  { accent: "#D8A200", fg: "#141005", name: "Ochre" },
  { accent: "#4A4A46", fg: "#F2EFE8", name: "Graphite" },
  { accent: "#0F3D3E", fg: "#E2F0D9", name: "Pine" },
  { accent: "#8B2500", fg: "#FFF5EE", name: "Rust" },
];

export const MOTIFS: BookMotif[] = ["arcs", "grid", "strata", "rules", "blocks", "diag"];

/** Simple string hash function to deterministically choose color and motif */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Seed editorial color and motif from book title and author */
export function seedHouseStyle(title: string, author?: string): {
  accentColor: string;
  fgColor: string;
  motif: BookMotif;
  initial: string;
} {
  const seedStr = `${title} ${author || ""}`.trim().toLowerCase();
  const hash = hashString(seedStr);
  const colorChoice = EDITORIAL_PALETTE[hash % EDITORIAL_PALETTE.length];
  const motifChoice = MOTIFS[(hash >> 3) % MOTIFS.length];
  const initial = (title.trim()[0] || "B").toUpperCase();

  return {
    accentColor: colorChoice.accent,
    fgColor: colorChoice.fg,
    motif: motifChoice,
    initial,
  };
}

/** Render pure SVG string for a given motif and foreground color */
export function renderMotifSvg(motif: BookMotif, fgColor: string, opacity = "0.14"): string {
  switch (motif) {
    case "arcs":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%">
        <g fill="none" stroke="${fgColor}" stroke-opacity="${opacity}" stroke-width="9">
          <circle cx="180" cy="52" r="34" />
          <circle cx="180" cy="52" r="58" />
          <circle cx="180" cy="52" r="82" />
          <circle cx="180" cy="52" r="106" />
        </g>
      </svg>`;

    case "grid": {
      const rects = Array.from({ length: 88 }, (_, i) => {
        const c = i % 8;
        const r = Math.floor(i / 8);
        return `<rect x="${24 + c * 20}" y="${18 + r * 20}" width="8" height="8" />`;
      }).join("");
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%">
        <g fill="${fgColor}" fill-opacity="${opacity}">
          ${rects}
        </g>
      </svg>`;
    }

    case "strata":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%">
        <g fill="${fgColor}" fill-opacity="${opacity}">
          <rect x="0" y="26" width="200" height="14" />
          <rect x="0" y="52" width="200" height="7" />
          <rect x="0" y="70" width="200" height="20" />
          <rect x="0" y="104" width="200" height="5" />
          <rect x="0" y="120" width="200" height="11" />
        </g>
      </svg>`;

    case "rules": {
      const lines = Array.from({ length: 14 }, (_, i) => {
        const y = 22 + i * 11;
        return `<line x1="26" y1="${y}" x2="${174 - (i % 4) * 30}" y2="${y}" />`;
      }).join("");
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%">
        <g stroke="${fgColor}" stroke-opacity="${opacity}" stroke-width="2.5">
          ${lines}
        </g>
      </svg>`;
    }

    case "blocks":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%">
        <g fill="${fgColor}" fill-opacity="${opacity}">
          <rect x="28" y="22" width="62" height="62" />
          <rect x="104" y="42" width="62" height="34" />
          <rect x="28" y="98" width="138" height="16" />
        </g>
      </svg>`;

    case "diag":
    default: {
      const diags = Array.from({ length: 12 }, (_, i) => {
        const x = -40 + i * 26;
        return `<line x1="${x}" y1="0" x2="${x + 120}" y2="150" />`;
      }).join("");
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%">
        <g stroke="${fgColor}" stroke-opacity="${opacity}" stroke-width="10">
          ${diags}
        </g>
      </svg>`;
    }
  }
}
