import { hashString } from "./houseMotifs";
import { PosterSeries } from "./types";

export type PosterMotif =
  | "cyber_grid"
  | "cosmic_orbit"
  | "monument_arch"
  | "botanical_lush"
  | "dune_wanderer"
  | "pop_starburst"
  | "optical_prism"
  | "topographic_strata"
  | "oceanic_abyss"
  | "terrazzo_memphis"
  | "golden_monograph"
  | "kinetic_ripples"
  | "aurora_fjord"
  | "fluid_chroma"
  | "solitary_path"
  | "swiss_bauhaus";

export interface PosterPaletteTokens {
  g: string; // Ground (background tone)
  a: string; // Primary Ink / Accent
  b: string; // Secondary / Supporting Ink
  fg: string; // Text Foreground
  isNeon: boolean;
  editionCode: string;
}

export interface PosterTheme {
  motif: PosterMotif;
  tokens: PosterPaletteTokens;
  series: "daylight" | "neon";
}

/** 
 * DAYLIGHT PALETTES:
 * Pale grounds (blush, mint, sand, cream, warm ivory, lavender),
 * dark ink type, flat colour, zero glow. Reads at thumbnail size,
 * prints correctly, and harmonizes with cream pages.
 */
export const DAYLIGHT_PALETTES: Record<PosterMotif, PosterPaletteTokens> = {
  cyber_grid: {
    g: "#E0F2FE", // Pale Sky
    a: "#0369A1", // Deep Cobalt
    b: "#0284C7", // Cyan Ink
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "CYBER·01",
  },
  cosmic_orbit: {
    g: "#F5F3FF", // Soft Lavender
    a: "#581C87", // Deep Purple
    b: "#7E22CE", // Ultraviolet Ink
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "ASTRA·02",
  },
  monument_arch: {
    g: "#FEF2F2", // Blush Rose
    a: "#991B1B", // Deep Crimson
    b: "#DC2626", // Terracotta Red
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "MONUMENT·03",
  },
  botanical_lush: {
    g: "#ECFDF5", // Pale Mint
    a: "#065F46", // Forest Green
    b: "#059669", // Emerald Ink
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "FLORA·04",
  },
  dune_wanderer: {
    g: "#FFF7ED", // Warm Sand Peach
    a: "#9A3412", // Rich Ochre
    b: "#EA580C", // Rust Orange
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "DUNE·05",
  },
  pop_starburst: {
    g: "#FEF9C3", // Cream Canary
    a: "#CA8A04", // Mustard Gold
    b: "#E11D48", // Pop Rose
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "POPART·06",
  },
  optical_prism: {
    g: "#F8FAFC", // Pure Crisp Sand-White
    a: "#0F172A", // Obsidian Black Ink
    b: "#2563EB", // Spectral Blue
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "PRISM·07",
  },
  topographic_strata: {
    g: "#FFF1F2", // Pale Rose Quartz
    a: "#BE123C", // Deep Rose
    b: "#E11D48", // Crimson Ink
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "STRATA·08",
  },
  oceanic_abyss: {
    g: "#F0FDFA", // Pale Seafoam
    a: "#0F766E", // Deep Teal
    b: "#0D9488", // Ocean Turquoise
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "ABYSS·09",
  },
  terrazzo_memphis: {
    g: "#FDF4FF", // Soft Lilac
    a: "#86198F", // Deep Magenta
    b: "#C026D3", // Vivid Plum
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "MEMPHIS·10",
  },
  golden_monograph: {
    g: "#FFFBEB", // Imperial Cream
    a: "#78350F", // Umber Bronze
    b: "#B45309", // Gold Leaf Ink
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "FOLIO·11",
  },
  kinetic_ripples: {
    g: "#F1F5F9", // Crisp Slate White
    a: "#1E293B", // Deep Slate
    b: "#475569", // Medium Slate
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "KINETIC·12",
  },
  aurora_fjord: {
    g: "#F0FDF4", // Pale Mint Ice
    a: "#14532D", // Deep Pine
    b: "#15803D", // Glacial Emerald
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "AURORA·13",
  },
  fluid_chroma: {
    g: "#EEF2FF", // Lavender Sky
    a: "#3730A3", // Indigo Ink
    b: "#4F46E5", // Electric Iris
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "CHROMA·14",
  },
  solitary_path: {
    g: "#FEF3C7", // Warm Sunlight
    a: "#78350F", // Dark Mahogany
    b: "#D97706", // Amber River
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "SOLO·15",
  },
  swiss_bauhaus: {
    g: "#FEF08A", // Bauhaus Yellow
    a: "#0A0A0A", // Bold Jet Black
    b: "#DC2626", // Bauhaus Red
    fg: "#0A0A0A",
    isNeon: false,
    editionCode: "BAUHAUS·16",
  },
};

/**
 * NEON PALETTES:
 * Near-black grounds with saturated neon ink and real glow:
 * drop-shadow on SVG, text-shadow on the title, and slow sign flicker.
 */
export const NEON_PALETTES: Record<PosterMotif, PosterPaletteTokens> = {
  cyber_grid: {
    g: "#0A0B14", // Deep Cyber Void
    a: "#38BDF8", // Laser Cyan
    b: "#F472B6", // Neon Magenta
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "CYBER·01",
  },
  cosmic_orbit: {
    g: "#090714", // Deep Nebula
    a: "#C084FC", // Ultraviolet
    b: "#FDE047", // Starlight Gold
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "ASTRA·02",
  },
  monument_arch: {
    g: "#140707", // Dark Crimson Void
    a: "#F43F5E", // Radiant Crimson
    b: "#FBBF24", // Golden Flare
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "MONUMENT·03",
  },
  botanical_lush: {
    g: "#05130D", // Deep Bio-Jungle
    a: "#34D399", // Bioluminescent Mint
    b: "#A3E635", // Radioactive Lime
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "FLORA·04",
  },
  dune_wanderer: {
    g: "#140A05", // Obsidian Dune
    a: "#FB923C", // Neon Solar Flare
    b: "#FDE047", // Blazing Sun Gold
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "DUNE·05",
  },
  pop_starburst: {
    g: "#070E18", // Dark Pop Void
    a: "#FDE047", // Neon Yellow Starburst
    b: "#FF007A", // Hot Pink
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "POPART·06",
  },
  optical_prism: {
    g: "#0A0A0A", // Pure Obsidian Void
    a: "#38BDF8", // Spectral Cyan
    b: "#F43F5E", // Spectral Rose
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "PRISM·07",
  },
  topographic_strata: {
    g: "#16070B", // Deep Volcanic Void
    a: "#FB7185", // Neon Coral
    b: "#FDE047", // Magma Yellow
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "STRATA·08",
  },
  oceanic_abyss: {
    g: "#061018", // Oceanic Trench
    a: "#00F0FF", // Electric Cyan
    b: "#67E8F9", // Bioluminescent Aqua
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "ABYSS·09",
  },
  terrazzo_memphis: {
    g: "#110716", // Midnight Party
    a: "#E879F9", // Neon Fuchsia
    b: "#FEF08A", // Lemon Spark
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "MEMPHIS·10",
  },
  golden_monograph: {
    g: "#0F0E09", // Gilded Night
    a: "#FBBF24", // Radiant Gold Foil
    b: "#FEF08A", // Incandescent Yellow
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "FOLIO·11",
  },
  kinetic_ripples: {
    g: "#0A0A0A", // Pure Void
    a: "#A3E635", // Radioactive Chartreuse
    b: "#C084FC", // Electric Violet
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "KINETIC·12",
  },
  aurora_fjord: {
    g: "#04120D", // Arctic Polar Night
    a: "#34D399", // Aurora Green Ribbon
    b: "#E879F9", // Magnetosphere Magenta
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "AURORA·13",
  },
  fluid_chroma: {
    g: "#090A1A", // Chroma Liquid Void
    a: "#818CF8", // Electric Periwinkle
    b: "#F472B6", // Glowing Bubblegum
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "CHROMA·14",
  },
  solitary_path: {
    g: "#120808", // Twilight Woods
    a: "#FBBF24", // Golden Firefly Path
    b: "#F97316", // Sunset Amber
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "SOLO·15",
  },
  swiss_bauhaus: {
    g: "#0A0A0A", // Bold Dark Bauhaus
    a: "#FACC15", // Cyber Yellow
    b: "#EF4444", // Laser Red
    fg: "#FFFFFF",
    isNeon: true,
    editionCode: "BAUHAUS·16",
  },
};

const MOTIF_LIST: PosterMotif[] = [
  "cyber_grid",
  "cosmic_orbit",
  "monument_arch",
  "botanical_lush",
  "dune_wanderer",
  "pop_starburst",
  "optical_prism",
  "topographic_strata",
  "oceanic_abyss",
  "terrazzo_memphis",
  "golden_monograph",
  "kinetic_ripples",
  "aurora_fjord",
  "fluid_chroma",
  "solitary_path",
  "swiss_bauhaus",
];

/**
 * Intelligent semantic matcher that matches the book's title and keywords
 * to the most conceptually fitting motif, with deterministic hash fallback.
 */
export function matchPosterMotif(title: string, author?: string): PosterMotif {
  const t = `${title} ${author || ""}`.toLowerCase();

  // 1. Time, Habits, Systems & Computing
  if (/\b(time|make time|atomic|habits|system|code|software|deep learning|ai|machine|hacker|algorithm|digital|data|cyber|network|computer)\b/i.test(t)) {
    return "cyber_grid";
  }

  // 2. Space, Astronomy, Offshore, Orbits
  if (/\b(space|cosmos|orbit|planet|galaxy|astronomy|universe|stars|moon|alien|satellite|offshore|sky)\b/i.test(t)) {
    return "cosmic_orbit";
  }

  // 3. Business, Finance, Wealth, Monuments, Empires
  if (/\b(business|indian business|commonsense|capital|wealth|empire|power|money|wall street|banking|finance|firm|market|economy|monopoly|trade)\b/i.test(t)) {
    return "monument_arch";
  }

  // 4. Food, Biology, Diet, Superfoods, Ecology
  if (/\b(superfoods|food|diet|nutrition|eat|grow|growth|plant|forest|tree|biology|garden|wild|organic|seeds|ecology)\b/i.test(t)) {
    return "botanical_lush";
  }

  // 5. Cars, Cities, Urbanism, Walking, Transit
  if (/\b(cars|life after cars|road|walk|travel|desert|dune|transit|city|street|urban|journey|step|highway|drive)\b/i.test(t)) {
    return "dune_wanderer";
  }

  // 6. Experiments, Creativity, Pop, Play, Magic
  if (/\b(experiments|tiny experiments|creative|art|design|play|comic|pop|game|magic|fun|idea|spark|story)\b/i.test(t)) {
    return "pop_starburst";
  }

  // 7. Psychology, Mind, Gender, Relationships, Perception
  if (/\b(women|guide to women|man's guide|psychology|mind|brain|genius|thinking|behavior|logic|focus|light|vision|truth|love|human)\b/i.test(t)) {
    return "optical_prism";
  }

  // 8. Topography, Earth, Strata, Geology
  if (/\b(earth|rock|mountain|climb|strata|geology|summit|canyon|landscape|heights|peak)\b/i.test(t)) {
    return "topographic_strata";
  }

  // 9. Oceans, Deep Water, Marine, Abyss
  if (/\b(ocean|sea|water|abyss|deep|jellyfish|coral|trench|sub|wave|sail|tide)\b/i.test(t)) {
    return "oceanic_abyss";
  }

  // 10. Signals, Music, Frequencies, Kinetic, Pulse
  if (/\b(signal|noise|sound|music|wave|vibration|ripple|frequency|pulse|echo|rhythm|beat)\b/i.test(t)) {
    return "kinetic_ripples";
  }

  // 11. Northern, Winter, Cold, Glaciers, Aurora
  if (/\b(cold|winter|ice|aurora|fjord|north|polar|snow|night|nordic|glacier)\b/i.test(t)) {
    return "aurora_fjord";
  }

  // 12. Philosophy, Zen, Wisdom, Pagodas
  if (/\b(zen|philosophy|wisdom|stoic|dao|buddha|meditation|calm|peace|monk|japan|monograph)\b/i.test(t)) {
    return "golden_monograph";
  }

  // 13. Liquid, Colors, Synthesis, Flow, Energy
  if (/\b(liquid|color|fluid|chroma|flow|energy|glow|aura|prism|fusion)\b/i.test(t)) {
    return "fluid_chroma";
  }

  // 14. Woods, Rivers, Solitude, Nature Path
  if (/\b(river|forest|woods|solo|solitude|wanderer|path|trail|lake|cabin)\b/i.test(t)) {
    return "solitary_path";
  }

  // 15. Modernism, Structure, Architecture, Bauhaus
  if (/\b(bauhaus|swiss|modern|structure|architecture|grid|clean|geometry|craft)\b/i.test(t)) {
    return "swiss_bauhaus";
  }

  // 16. Memphis, Confetti, Abstract
  if (/\b(memphis|abstract|confetti|shape|pattern|mosaic|terrazzo)\b/i.test(t)) {
    return "terrazzo_memphis";
  }

  // Deterministic Hash Fallback
  const hash = hashString(`${title} ${author || ""}`.trim().toLowerCase());
  return MOTIF_LIST[hash % MOTIF_LIST.length];
}

/**
 * Resolves the active theme for a book given the global/selected series
 */
export function seedPosterStyle(
  title: string,
  author?: string,
  series: PosterSeries = "daylight"
): PosterTheme {
  const motif = matchPosterMotif(title, author);
  const hash = hashString(`${title} ${author || ""}`.trim().toLowerCase());

  let activeSeries: "daylight" | "neon";
  if (series === "mixed") {
    activeSeries = hash % 2 === 0 ? "daylight" : "neon";
  } else {
    activeSeries = series;
  }

  const tokens =
    activeSeries === "neon"
      ? NEON_PALETTES[motif]
      : DAYLIGHT_PALETTES[motif];

  return {
    motif,
    tokens,
    series: activeSeries,
  };
}

/**
 * Renders vector artwork using strictly the 3 tokens: { a, b, g }
 * Every motif is drawn purely against tokens — switching series is a clean palette swap.
 */
export function renderPosterIllustration(motif: PosterMotif, tokens: PosterPaletteTokens): string {
  const { a, b, g } = tokens;

  switch (motif) {
    case "cyber_grid":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <!-- Perspective Horizon Sun -->
        <circle cx="100" cy="130" r="38" fill="${b}" />
        <!-- Slatted Sun Horizontal Bands -->
        <rect x="50" y="122" width="100" height="2.5" fill="${g}" />
        <rect x="50" y="130" width="100" height="3.5" fill="${g}" />
        <rect x="50" y="140" width="100" height="5" fill="${g}" />
        <rect x="50" y="152" width="100" height="6.5" fill="${g}" />

        <!-- Horizon Laser Line -->
        <line x1="0" y1="165" x2="200" y2="165" stroke="${a}" stroke-width="2.5" />

        <!-- Perspective Grid Lines -->
        <g stroke="${a}" stroke-width="1.6" opacity="0.85">
          <line x1="100" y1="165" x2="-20" y2="300" stroke-width="2" />
          <line x1="100" y1="165" x2="25" y2="300" />
          <line x1="100" y1="165" x2="65" y2="300" />
          <line x1="100" y1="165" x2="100" y2="300" stroke-width="2.2" />
          <line x1="100" y1="165" x2="135" y2="300" />
          <line x1="100" y1="165" x2="175" y2="300" />
          <line x1="100" y1="165" x2="220" y2="300" stroke-width="2" />
          <!-- Horizontal depth rungs -->
          <line x1="0" y1="172" x2="200" y2="172" opacity="0.4" />
          <line x1="0" y1="184" x2="200" y2="184" opacity="0.55" />
          <line x1="0" y1="202" x2="200" y2="202" opacity="0.7" />
          <line x1="0" y1="228" x2="200" y2="228" opacity="0.85" />
          <line x1="0" y1="262" x2="200" y2="262" stroke-width="2.2" />
        </g>
        <circle cx="45" cy="85" r="3.5" fill="${a}" />
        <circle cx="160" cy="70" r="3.5" fill="${b}" />
      </svg>`;

    case "cosmic_orbit":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <!-- Starlight Field -->
        <circle cx="30" cy="40" r="2" fill="${b}" />
        <circle cx="170" cy="45" r="2.5" fill="${a}" />
        <circle cx="75" cy="85" r="1.5" fill="${b}" />
        <circle cx="145" cy="95" r="2.5" fill="${a}" />
        <circle cx="40" cy="140" r="2" fill="${b}" />
        
        <!-- Crescent Moon -->
        <path d="M165,65 A18,18 0 0 0 142,42 A14,14 0 1 1 165,65 Z" fill="${b}" />

        <!-- Master Orbit System -->
        <g style="transform-origin: 100px 170px;">
          <ellipse cx="100" cy="170" rx="72" ry="22" fill="none" stroke="${b}" stroke-width="3" opacity="0.75" transform="rotate(-20 100 170)" />
          <circle cx="100" cy="170" r="42" fill="${a}" />
          <path d="M32,194 C32,194 70,205 140,175" fill="none" stroke="${b}" stroke-width="3.5" opacity="0.95" />
        </g>
        <circle cx="100" cy="170" r="88" fill="none" stroke="${b}" stroke-width="1.5" stroke-dasharray="6,6" opacity="0.4" />
      </svg>`;

    case "monument_arch":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <!-- Colonnade Classical Arches -->
        <g fill="${a}">
          <path d="M38,220 L38,130 C38,105 74,105 74,130 L74,220 Z" />
          <path d="M82,220 L82,110 C82,80 124,80 124,110 L124,220 Z" />
          <path d="M132,220 L132,130 C132,105 168,105 168,130 L168,220 Z" />
        </g>
        <!-- Shadow Cavities -->
        <g fill="${g}">
          <path d="M46,220 L46,135 C46,115 66,115 66,135 L66,220 Z" />
          <path d="M90,220 L90,118 C90,92 116,92 116,118 L116,220 Z" />
          <path d="M140,220 L140,135 C140,115 160,115 160,135 L160,220 Z" />
        </g>
        <!-- Stepped Base Foundation -->
        <rect x="20" y="220" width="160" height="14" fill="${b}" />
        <rect x="10" y="234" width="180" height="18" fill="${a}" />
        <rect x="0" y="252" width="200" height="48" fill="${b}" />
      </svg>`;

    case "botanical_lush":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <!-- Radiant Sun Orb -->
        <circle cx="140" cy="110" r="42" fill="${b}" opacity="0.9" />

        <!-- Layered Tropical Foliage -->
        <g fill="${a}" opacity="0.95">
          <path d="M0,300 C20,240 60,200 120,190 C110,210 90,240 70,300 Z" />
          <path d="M200,300 C170,230 130,180 60,170 C80,200 110,240 130,300 Z" />
        </g>
        <g fill="${b}">
          <path d="M10,300 C40,220 90,160 160,150 C145,180 120,230 90,300 Z" opacity="0.85" />
        </g>
        <circle cx="50" cy="110" r="2.5" fill="${b}" />
        <circle cx="120" cy="80" r="3" fill="${b}" />
        <circle cx="170" cy="140" r="2" fill="${a}" />
      </svg>`;

    case "dune_wanderer":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <!-- Desert Sun -->
        <circle cx="100" cy="120" r="45" fill="${b}" />
        <!-- Flowing Dune Curves -->
        <path d="M0,165 Q60,135 120,160 T200,145 L200,300 L0,300 Z" fill="${a}" opacity="0.85" />
        <path d="M0,205 Q80,180 160,205 T200,195 L200,300 L0,300 Z" fill="${b}" />
        <path d="M0,250 Q70,225 140,250 T200,235 L200,300 L0,300 Z" fill="${a}" />
        <!-- Solitary Figure -->
        <g fill="${g}">
          <circle cx="130" cy="188" r="4" />
          <path d="M127,192 L133,192 L135,206 L125,206 Z" />
          <line x1="126" y1="192" x2="124" y2="208" stroke="${g}" stroke-width="1.5" />
        </g>
      </svg>`;

    case "pop_starburst":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <!-- Pop Starburst Flare -->
        <polygon points="100,75 125,35 145,90 190,70 160,120 200,150 160,175 175,225 135,200 115,250 100,210 70,235 85,190 45,170 85,145 60,105" fill="${a}" />
        <!-- Central Action Bubble -->
        <circle cx="100" cy="170" r="42" fill="${b}" stroke="${g}" stroke-width="4" />
        <text x="100" y="177" font-family="'Bricolage Grotesque', sans-serif" font-weight="900" font-size="18" fill="${g}" text-anchor="middle">★ POP</text>
      </svg>`;

    case "optical_prism":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <!-- Light Beam -->
        <polygon points="0,85 100,150 0,95" fill="${a}" opacity="0.85" />
        <!-- Equilateral Prism -->
        <polygon points="100,90 160,200 40,200" fill="none" stroke="${a}" stroke-width="3" />
        <polygon points="100,90 160,200 40,200" fill="${a}" opacity="0.1" />
        <!-- Refracted Spectral Ray -->
        <polygon points="100,150 200,120 200,240" fill="${b}" opacity="0.85" />
        <line x1="80" y1="140" x2="125" y2="160" stroke="${a}" stroke-width="3" stroke-linecap="round" />
      </svg>`;

    case "topographic_strata":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <circle cx="100" cy="115" r="48" fill="${b}" />
        <!-- Layered Strata -->
        <path d="M0,130 Q50,110 100,125 T200,115 L200,300 L0,300 Z" fill="${a}" opacity="0.45" />
        <path d="M0,160 Q60,135 120,155 T200,145 L200,300 L0,300 Z" fill="${b}" opacity="0.65" />
        <path d="M0,195 Q40,170 90,190 T200,175 L200,300 L0,300 Z" fill="${a}" />
        <path d="M0,235 Q70,210 140,230 T200,215 L200,300 L0,300 Z" fill="${b}" />
        <circle cx="70" cy="180" r="3" fill="${g}" />
        <circle cx="140" cy="220" r="3" fill="${g}" />
      </svg>`;

    case "oceanic_abyss":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <!-- Jellyfish Bell Dome -->
        <path d="M60,140 C60,95 140,95 140,140 C125,148 110,142 100,146 C90,142 75,148 60,140 Z" fill="${a}" />
        <!-- Streamers -->
        <path d="M72,145 Q65,190 78,240" stroke="${b}" stroke-width="2.5" fill="none" />
        <path d="M86,146 Q95,195 84,255" stroke="${a}" stroke-width="3" fill="none" />
        <path d="M100,147 Q105,200 100,265" stroke="${b}" stroke-width="3.5" fill="none" />
        <path d="M114,146 Q105,195 116,255" stroke="${a}" stroke-width="3" fill="none" />
        <path d="M128,145 Q135,190 122,240" stroke="${b}" stroke-width="2.5" fill="none" />
        <circle cx="45" cy="110" r="3.5" fill="${a}" opacity="0.8" />
        <circle cx="160" cy="130" r="2.5" fill="${b}" opacity="0.7" />
      </svg>`;

    case "terrazzo_memphis":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <rect x="25" y="110" width="60" height="90" rx="30" fill="${a}" />
        <circle cx="145" cy="130" r="38" fill="${b}" />
        <polygon points="90,170 170,270 30,260" fill="${a}" opacity="0.8" />
        <path d="M40,240 Q60,225 80,240 T120,240 T160,240" fill="none" stroke="${b}" stroke-width="5" stroke-linecap="round" />
        <circle cx="40" cy="90" r="4" fill="${a}" />
        <circle cx="165" cy="85" r="5" fill="${b}" />
      </svg>`;

    case "golden_monograph":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <circle cx="100" cy="125" r="52" fill="${b}" opacity="0.25" />
        <circle cx="100" cy="125" r="36" fill="${a}" />
        <g stroke="${a}" stroke-width="2" fill="none">
          <circle cx="100" cy="125" r="68" stroke-dasharray="4,4" />
          <polygon points="0,220 55,165 110,220" fill="${b}" stroke="${a}" stroke-width="1.8" />
          <polygon points="80,230 145,155 200,230" fill="${g}" stroke="${a}" stroke-width="1.8" />
        </g>
        <rect x="0" y="225" width="200" height="75" fill="${a}" />
      </svg>`;

    case "kinetic_ripples":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <g fill="none" stroke-width="3.5" opacity="0.9">
          <circle cx="100" cy="150" r="15" stroke="${a}" />
          <circle cx="100" cy="150" r="32" stroke="${b}" />
          <circle cx="100" cy="150" r="52" stroke="${a}" />
          <circle cx="100" cy="150" r="74" stroke="${b}" stroke-width="4" />
          <circle cx="100" cy="150" r="98" stroke="${a}" stroke-width="4.5" />
          <circle cx="100" cy="150" r="124" stroke="${b}" stroke-width="5" />
        </g>
        <circle cx="100" cy="150" r="8" fill="${a}" />
      </svg>`;

    case "aurora_fjord":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <path d="M0,60 Q50,30 100,55 T200,40 L200,160 Q150,180 100,150 T0,170 Z" fill="${b}" opacity="0.85" />
        <path d="M0,90 Q60,65 120,85 T200,75 L200,180 Q140,200 80,175 T0,195 Z" fill="${a}" opacity="0.45" />
        <polygon points="0,210 60,140 120,210" fill="${a}" />
        <polygon points="90,215 155,130 200,215" fill="${b}" />
        <rect x="0" y="210" width="200" height="90" fill="${g}" />
        <line x1="0" y1="210" x2="200" y2="210" stroke="${a}" stroke-width="2" />
        <ellipse cx="100" cy="245" rx="60" ry="12" fill="${a}" opacity="0.25" />
      </svg>`;

    case "fluid_chroma":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <circle cx="70" cy="130" r="55" fill="${a}" opacity="0.85" />
        <circle cx="130" cy="170" r="62" fill="${b}" opacity="0.85" />
        <circle cx="100" cy="150" r="38" fill="${g}" opacity="0.75" />
        <circle cx="100" cy="150" r="75" fill="none" stroke="${a}" stroke-width="2.5" opacity="0.85" />
      </svg>`;

    case "solitary_path":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <!-- Forest Pillars -->
        <g fill="${a}" opacity="0.9">
          <rect x="15" y="30" width="14" height="270" />
          <rect x="42" y="15" width="18" height="285" />
          <rect x="75" y="40" width="16" height="260" />
          <rect x="135" y="20" width="20" height="280" />
          <rect x="170" y="35" width="18" height="265" />
        </g>
        <!-- Winding Golden River Path -->
        <path d="M100,105 C115,145 155,160 135,195 C110,230 145,260 160,300 L195,300 C170,250 135,225 155,190 C175,150 125,135 112,105 Z" fill="${b}" />
        <circle cx="45" cy="130" r="2.5" fill="${b}" />
        <circle cx="150" cy="115" r="3" fill="${b}" />
      </svg>`;

    case "swiss_bauhaus":
    default:
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect width="200" height="300" fill="${g}" />
        <circle cx="135" cy="120" r="58" fill="${b}" />
        <rect x="25" y="130" width="75" height="110" fill="${a}" />
        <polygon points="100,200 180,290 20,290" fill="${g}" />
        <polygon points="0,95 200,45 200,75 0,125" fill="${a}" />
        <g stroke="${a}" stroke-width="2.5">
          <line x1="25" y1="50" x2="45" y2="50" />
          <line x1="35" y1="40" x2="35" y2="60" />
        </g>
      </svg>`;
  }
}
