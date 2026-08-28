import { hashString } from "./houseMotifs";

export type PosterMotif =
  | "cyber_grid"
  | "botanical_lush"
  | "cosmic_nebula"
  | "swiss_bauhaus"
  | "optical_prism"
  | "topographic_sunset"
  | "oceanic_abyss"
  | "terrazzo_memphis"
  | "risograph_dune"
  | "golden_monograph"
  | "kinetic_ripples"
  | "aurora_fjord"
  | "architectural_monument"
  | "fluid_chroma"
  | "solitary_wanderer"
  | "comic_pop";

export interface PosterTheme {
  motif: PosterMotif;
  bgGradient: string;
  fg: string;
  accent: string;
  subColor: string;
  foilColor: string;
  editionCode: string;
}

export const POSTER_PALETTES: Record<PosterMotif, PosterTheme> = {
  cyber_grid: {
    motif: "cyber_grid",
    bgGradient: "linear-gradient(180deg, #1E1B4B 0%, #312E81 35%, #4C1D95 70%, #0F172A 100%)",
    fg: "#FFFFFF",
    accent: "#38BDF8",
    subColor: "#F472B6",
    foilColor: "#38BDF8",
    editionCode: "CYBER·01",
  },
  botanical_lush: {
    motif: "botanical_lush",
    bgGradient: "linear-gradient(180deg, #064E3B 0%, #047857 40%, #065F46 75%, #022C22 100%)",
    fg: "#FFFFFF",
    accent: "#A7F3D0",
    subColor: "#FDE047",
    foilColor: "#34D399",
    editionCode: "FLORA·02",
  },
  cosmic_nebula: {
    motif: "cosmic_nebula",
    bgGradient: "linear-gradient(180deg, #0A0A1F 0%, #2E1065 40%, #581C87 70%, #1E1B4B 100%)",
    fg: "#FFFFFF",
    accent: "#FDE047",
    subColor: "#C084FC",
    foilColor: "#FDE047",
    editionCode: "ASTRA·03",
  },
  swiss_bauhaus: {
    motif: "swiss_bauhaus",
    bgGradient: "linear-gradient(180deg, #FACC15 0%, #EAB308 40%, #CA8A04 100%)",
    fg: "#0A0A0A",
    accent: "#DC2626",
    subColor: "#1D4ED8",
    foilColor: "#0A0A0A",
    editionCode: "BAUHAUS·04",
  },
  optical_prism: {
    motif: "optical_prism",
    bgGradient: "linear-gradient(180deg, #0A0A0A 0%, #171717 50%, #0A0A0A 100%)",
    fg: "#FFFFFF",
    accent: "#38BDF8",
    subColor: "#F43F5E",
    foilColor: "#FEF08A",
    editionCode: "PRISM·05",
  },
  topographic_sunset: {
    motif: "topographic_sunset",
    bgGradient: "linear-gradient(180deg, #BE123C 0%, #E11D48 30%, #FB7185 65%, #F43F5E 100%)",
    fg: "#FFFFFF",
    accent: "#FEF08A",
    subColor: "#FFE4E6",
    foilColor: "#FEF08A",
    editionCode: "STRATA·06",
  },
  oceanic_abyss: {
    motif: "oceanic_abyss",
    bgGradient: "linear-gradient(180deg, #0C4A6E 0%, #0369A1 35%, #0284C7 65%, #082F49 100%)",
    fg: "#FFFFFF",
    accent: "#67E8F9",
    subColor: "#A5F3FC",
    foilColor: "#67E8F9",
    editionCode: "ABYSS·07",
  },
  terrazzo_memphis: {
    motif: "terrazzo_memphis",
    bgGradient: "linear-gradient(180deg, #F472B6 0%, #EC4899 45%, #BE185D 100%)",
    fg: "#FFFFFF",
    accent: "#FEF08A",
    subColor: "#93C5FD",
    foilColor: "#FEF08A",
    editionCode: "MEMPHIS·08",
  },
  risograph_dune: {
    motif: "risograph_dune",
    bgGradient: "linear-gradient(180deg, #EA580C 0%, #C2410C 40%, #9A3412 80%, #431407 100%)",
    fg: "#FFFFFF",
    accent: "#FDE047",
    subColor: "#FED7AA",
    foilColor: "#FDE047",
    editionCode: "DUNE·09",
  },
  golden_monograph: {
    motif: "golden_monograph",
    bgGradient: "linear-gradient(180deg, #1E1B4B 0%, #172554 45%, #0F172A 100%)",
    fg: "#FFFFFF",
    accent: "#FBBF24",
    subColor: "#FEF3C7",
    foilColor: "#FBBF24",
    editionCode: "FOLIO·10",
  },
  kinetic_ripples: {
    motif: "kinetic_ripples",
    bgGradient: "linear-gradient(180deg, #18181B 0%, #27272A 50%, #09090B 100%)",
    fg: "#FFFFFF",
    accent: "#A3E635",
    subColor: "#C084FC",
    foilColor: "#A3E635",
    editionCode: "KINETIC·11",
  },
  aurora_fjord: {
    motif: "aurora_fjord",
    bgGradient: "linear-gradient(180deg, #022C22 0%, #064E3B 35%, #0F172A 70%, #020617 100%)",
    fg: "#FFFFFF",
    accent: "#34D399",
    subColor: "#E879F9",
    foilColor: "#6EE7B7",
    editionCode: "AURORA·12",
  },
  architectural_monument: {
    motif: "architectural_monument",
    bgGradient: "linear-gradient(180deg, #7F1D1D 0%, #991B1B 45%, #450A0A 100%)",
    fg: "#FFFFFF",
    accent: "#FCD34D",
    subColor: "#FCA5A5",
    foilColor: "#FCD34D",
    editionCode: "MONUMENT·13",
  },
  fluid_chroma: {
    motif: "fluid_chroma",
    bgGradient: "linear-gradient(180deg, #4338CA 0%, #6366F1 35%, #818CF8 70%, #312E81 100%)",
    fg: "#FFFFFF",
    accent: "#F472B6",
    subColor: "#38BDF8",
    foilColor: "#F472B6",
    editionCode: "CHROMA·14",
  },
  solitary_wanderer: {
    motif: "solitary_wanderer",
    bgGradient: "linear-gradient(180deg, #991B1B 0%, #B91C1C 40%, #7F1D1D 75%, #450A0A 100%)",
    fg: "#FFFFFF",
    accent: "#FBBF24",
    subColor: "#FED7AA",
    foilColor: "#FBBF24",
    editionCode: "SOLO·15",
  },
  comic_pop: {
    motif: "comic_pop",
    bgGradient: "linear-gradient(180deg, #0284C7 0%, #0369A1 45%, #075985 100%)",
    fg: "#FFFFFF",
    accent: "#FDE047",
    subColor: "#F43F5E",
    foilColor: "#FDE047",
    editionCode: "POPART·16",
  },
};

const MOTIF_LIST: PosterMotif[] = [
  "cyber_grid",
  "botanical_lush",
  "cosmic_nebula",
  "swiss_bauhaus",
  "optical_prism",
  "topographic_sunset",
  "oceanic_abyss",
  "terrazzo_memphis",
  "risograph_dune",
  "golden_monograph",
  "kinetic_ripples",
  "aurora_fjord",
  "architectural_monument",
  "fluid_chroma",
  "solitary_wanderer",
  "comic_pop",
];

export function seedPosterStyle(title: string, author?: string): PosterTheme {
  const hash = hashString(`${title} ${author || ""}`.trim().toLowerCase());
  const motif = MOTIF_LIST[hash % MOTIF_LIST.length];
  return POSTER_PALETTES[motif];
}

/** Render vibrant full-bleed SVG vector illustration with rich gradients, geometry, and keyframe animations */
export function renderPosterIllustration(motif: PosterMotif, theme: PosterTheme): string {
  switch (motif) {
    case "cyber_grid":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="cg-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F43F5E" />
            <stop offset="50%" stop-color="#EC4899" />
            <stop offset="100%" stop-color="#8B5CF6" />
          </linearGradient>
          <radialGradient id="cg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#EC4899" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#312E81" stop-opacity="0" />
          </radialGradient>
        </defs>
        
        <!-- Horizon Ambient Glow -->
        <circle cx="100" cy="140" r="80" fill="url(#cg-glow)" />

        <!-- Neon Sun with horizontal scanline slats -->
        <g>
          <circle cx="100" cy="135" r="42" fill="url(#cg-sun)" />
          <rect x="50" y="128" width="100" height="2.5" fill="#312E81" />
          <rect x="50" y="136" width="100" height="3.5" fill="#312E81" />
          <rect x="50" y="145" width="100" height="5" fill="#312E81" />
          <rect x="50" y="156" width="100" height="7" fill="#312E81" />
        </g>
        
        <!-- Laser Horizon Line -->
        <line x1="0" y1="165" x2="200" y2="165" stroke="#38BDF8" stroke-width="3" />
        <line x1="0" y1="165" x2="200" y2="165" stroke="#FFFFFF" stroke-width="1" />

        <!-- Synthwave Perspective Grid -->
        <g stroke="#38BDF8" stroke-width="1.8" opacity="0.85">
          <line x1="100" y1="165" x2="-20" y2="300" stroke-width="2" />
          <line x1="100" y1="165" x2="20" y2="300" />
          <line x1="100" y1="165" x2="60" y2="300" />
          <line x1="100" y1="165" x2="100" y2="300" stroke-width="2.5" stroke="#FFFFFF" />
          <line x1="100" y1="165" x2="140" y2="300" />
          <line x1="100" y1="165" x2="180" y2="300" />
          <line x1="100" y1="165" x2="220" y2="300" stroke-width="2" />
          
          <!-- Distance stepped horizontals -->
          <line x1="0" y1="172" x2="200" y2="172" opacity="0.4" />
          <line x1="0" y1="184" x2="200" y2="184" opacity="0.55" />
          <line x1="0" y1="202" x2="200" y2="202" opacity="0.7" />
          <line x1="0" y1="228" x2="200" y2="228" opacity="0.85" />
          <line x1="0" y1="262" x2="200" y2="262" stroke-width="2.5" />
        </g>

        <!-- Ascending Cyber Nodes -->
        <circle class="anim-target-pulse" cx="45" cy="90" r="3.5" fill="#38BDF8" />
        <circle class="anim-target-pulse" cx="160" cy="75" r="4" fill="#F472B6" />
        <circle class="anim-target-pulse" cx="130" cy="105" r="2.5" fill="#FEF08A" />
      </svg>`;

    case "botanical_lush":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="bl-sun" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
        </defs>
        
        <!-- Radiant Tropical Sun -->
        <circle cx="140" cy="110" r="55" fill="url(#bl-sun)" opacity="0.85" class="anim-sun-halo" />
        <circle cx="140" cy="110" r="38" fill="#FDE047" />

        <!-- Layered Tropical Monstera Leaves -->
        <g fill="#065F46" opacity="0.95">
          <path d="M0,300 C20,240 60,200 120,190 C110,210 90,240 70,300 Z" />
          <path d="M200,300 C170,230 130,180 60,170 C80,200 110,240 130,300 Z" />
        </g>

        <g fill="#10B981">
          <path d="M10,300 C40,220 90,160 160,150 C145,180 120,230 90,300 Z" opacity="0.9" />
          <circle cx="95" cy="165" r="5" fill="#047857" />
          <circle cx="120" cy="180" r="6" fill="#047857" />
        </g>

        <!-- Golden Fern Fronds -->
        <g fill="#A7F3D0">
          <path d="M180,300 C150,200 110,130 30,120 C50,155 80,215 110,300 Z" opacity="0.8" />
        </g>

        <!-- Floating Pollen Particles -->
        <circle class="anim-firefly" cx="50" cy="110" r="2.5" fill="#FEF08A" />
        <circle class="anim-firefly-alt" cx="120" cy="80" r="3" fill="#FEF08A" />
        <circle class="anim-firefly" cx="170" cy="140" r="2" fill="#FEF08A" />
      </svg>`;

    case "cosmic_nebula":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <radialGradient id="cn-planet" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#F472B6" />
            <stop offset="50%" stop-color="#C084FC" />
            <stop offset="100%" stop-color="#4C1D95" />
          </radialGradient>
        </defs>

        <!-- Twinkling Starlight Field -->
        <g class="anim-stars">
          <circle cx="30" cy="40" r="2" fill="#FEF08A" />
          <circle cx="170" cy="45" r="2.5" fill="#FFFFFF" />
          <circle cx="75" cy="85" r="1.5" fill="#FEF08A" />
          <circle cx="140" cy="90" r="3" fill="#FFFFFF" />
          <circle cx="45" cy="130" r="2" fill="#F472B6" />
          <circle cx="180" cy="140" r="1.8" fill="#FEF08A" />
        </g>

        <!-- Master Ringed Planet -->
        <g style="transform-origin: 100px 170px;">
          <!-- Behind ring half -->
          <ellipse cx="100" cy="170" rx="72" ry="22" fill="none" stroke="#FDE047" stroke-width="4" opacity="0.75" transform="rotate(-20 100 170)" />
          
          <!-- Planet Sphere -->
          <circle cx="100" cy="170" r="42" fill="url(#cn-planet)" />
          
          <!-- Front ring half -->
          <path d="M32,194 C32,194 70,205 140,175" fill="none" stroke="#FDE047" stroke-width="4" opacity="0.95" />
        </g>

        <!-- Crescent Gold Moon -->
        <path d="M165,65 A18,18 0 0 0 142,42 A14,14 0 1 1 165,65 Z" fill="#FDE047" />

        <!-- Celestial Orbit Lines -->
        <circle cx="100" cy="170" r="88" fill="none" stroke="rgba(253, 224, 71, 0.25)" stroke-width="1.5" stroke-dasharray="6,6" />
      </svg>`;

    case "swiss_bauhaus":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <!-- High-Impact Geometric Shapes -->
        <circle cx="135" cy="120" r="58" fill="#DC2626" />
        <rect x="25" y="130" width="75" height="110" fill="#1D4ED8" />
        <polygon points="100,200 180,290 20,290" fill="#0A0A0A" />
        
        <!-- Diagonal Accent Band -->
        <polygon points="0,95 200,45 200,75 0,125" fill="#0A0A0A" />

        <!-- Swiss Metric Crosshairs -->
        <g stroke="#0A0A0A" stroke-width="2.5">
          <line x1="25" y1="50" x2="45" y2="50" />
          <line x1="35" y1="40" x2="35" y2="60" />
          
          <line x1="160" y1="240" x2="180" y2="240" stroke="#FFFFFF" />
          <line x1="170" y1="230" x2="170" y2="250" stroke="#FFFFFF" />
        </g>

        <!-- Bold Bauhaus Numeral -->
        <text x="142" y="275" font-family="'Space Mono', monospace" font-size="34" font-weight="900" fill="#0A0A0A">01</text>
      </svg>`;

    case "optical_prism":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="op-spec" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#EF4444" />
            <stop offset="20%" stop-color="#F97316" />
            <stop offset="40%" stop-color="#FACC15" />
            <stop offset="60%" stop-color="#10B981" />
            <stop offset="80%" stop-color="#3B82F6" />
            <stop offset="100%" stop-color="#8B5CF6" />
          </linearGradient>
        </defs>

        <!-- Incident Light Beam -->
        <polygon points="0,85 100,150 0,95" fill="#FFFFFF" opacity="0.9" />

        <!-- Glass Equilateral Prism -->
        <polygon points="100,90 160,200 40,200" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <polygon points="100,90 160,200 40,200" fill="rgba(255,255,255,0.06)" />

        <!-- Dispersed Rainbow Spectrum Fan -->
        <polygon points="100,150 200,120 200,240" fill="url(#op-spec)" opacity="0.95" />

        <!-- Refractive Internal Ray -->
        <line x1="80" y1="140" x2="125" y2="160" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
      </svg>`;

    case "topographic_sunset":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <!-- Giant Horizon Sun -->
        <circle cx="100" cy="115" r="48" fill="#FEF08A" />

        <!-- Topographic Contour Wave Strata -->
        <path d="M0,130 Q50,110 100,125 T200,115 L200,300 L0,300 Z" fill="#FB7185" opacity="0.5" />
        <path d="M0,160 Q60,135 120,155 T200,145 L200,300 L0,300 Z" fill="#F43F5E" opacity="0.75" />
        <path d="M0,195 Q40,170 90,190 T200,175 L200,300 L0,300 Z" fill="#E11D48" />
        <path d="M0,235 Q70,210 140,230 T200,215 L200,300 L0,300 Z" fill="#BE123C" />
        <path d="M0,270 Q50,250 110,265 T200,255 L200,300 L0,300 Z" fill="#881337" />

        <!-- Elevation Marker Dots -->
        <circle cx="70" cy="180" r="3" fill="#FEF08A" />
        <circle cx="140" cy="220" r="3" fill="#FEF08A" />
      </svg>`;

    case "oceanic_abyss":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <radialGradient id="oa-jelly" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#67E8F9" />
            <stop offset="70%" stop-color="#0284C7" />
            <stop offset="100%" stop-color="#082F49" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Bioluminescent Floating Jellyfish -->
        <g class="anim-swimmer">
          <!-- Bell Dome -->
          <path d="M60,140 C60,95 140,95 140,140 C125,148 110,142 100,146 C90,142 75,148 60,140 Z" fill="url(#oa-jelly)" />
          <!-- Tentacle Streamers -->
          <path d="M72,145 Q65,190 78,240" stroke="#67E8F9" stroke-width="2.5" fill="none" opacity="0.85" />
          <path d="M86,146 Q95,195 84,255" stroke="#A5F3FC" stroke-width="3" fill="none" opacity="0.95" />
          <path d="M100,147 Q105,200 100,265" stroke="#E0F2FE" stroke-width="3.5" fill="none" />
          <path d="M114,146 Q105,195 116,255" stroke="#A5F3FC" stroke-width="3" fill="none" opacity="0.95" />
          <path d="M128,145 Q135,190 122,240" stroke="#67E8F9" stroke-width="2.5" fill="none" opacity="0.85" />
        </g>

        <!-- Glowing Plankton Bubbles -->
        <circle class="anim-bubble" cx="45" cy="110" r="3.5" fill="#67E8F9" opacity="0.8" />
        <circle class="anim-bubble" cx="160" cy="130" r="2.5" fill="#67E8F9" opacity="0.7" />
        <circle class="anim-bubble" cx="135" cy="75" r="4" fill="#A5F3FC" opacity="0.9" />
      </svg>`;

    case "terrazzo_memphis":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <!-- Floating Memphis Geometric Solids -->
        <rect x="25" y="110" width="60" height="90" rx="30" fill="#FEF08A" />
        <circle cx="145" cy="130" r="38" fill="#93C5FD" />
        <polygon points="90,170 170,270 30,260" fill="#3B82F6" opacity="0.8" />
        
        <!-- Wavy Memphis Squiggle -->
        <path d="M40,240 Q60,225 80,240 T120,240 T160,240" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" />

        <!-- Confetti Dot Matrix -->
        <circle cx="40" cy="90" r="4" fill="#FFFFFF" />
        <circle cx="165" cy="85" r="5" fill="#FEF08A" />
        <circle cx="110" cy="110" r="3" fill="#FFFFFF" />
        <circle cx="170" cy="200" r="4" fill="#FEF08A" />
      </svg>`;

    case "risograph_dune":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <!-- Giant Blazing Sun -->
        <circle cx="100" cy="120" r="45" fill="#FDE047" />

        <!-- Warm Desert Dunes with Halftone Offset -->
        <path d="M0,165 Q60,135 120,160 T200,145 L200,300 L0,300 Z" fill="#F97316" />
        <path d="M0,205 Q80,180 160,205 T200,195 L200,300 L0,300 Z" fill="#C2410C" />
        <path d="M0,250 Q70,225 140,250 T200,235 L200,300 L0,300 Z" fill="#7C2D12" />

        <!-- Solitary Dune Wanderer Silhouette -->
        <g fill="#18181B">
          <circle cx="130" cy="188" r="4" />
          <path d="M127,192 L133,192 L135,206 L125,206 Z" />
          <line x1="126" y1="192" x2="124" y2="208" stroke="#18181B" stroke-width="1.5" />
        </g>
      </svg>`;

    case "golden_monograph":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <!-- Concentric Radiant Gold Sun -->
        <circle cx="100" cy="125" r="52" fill="#FBBF24" opacity="0.2" />
        <circle cx="100" cy="125" r="38" fill="#FBBF24" opacity="0.45" />
        <circle cx="100" cy="125" r="26" fill="#FBBF24" />

        <!-- Pagoda Arches and Sacred Geometry -->
        <g stroke="#FBBF24" stroke-width="2" fill="none">
          <circle cx="100" cy="125" r="68" stroke-dasharray="4,4" />
          <circle cx="100" cy="125" r="82" stroke-width="1.2" />
          
          <!-- Horizon Mountain Lines -->
          <polygon points="0,220 55,165 110,220" fill="#172554" stroke="#FBBF24" stroke-width="1.8" />
          <polygon points="80,230 145,155 200,230" fill="#1E1B4B" stroke="#FBBF24" stroke-width="1.8" />
        </g>

        <!-- Base Foundation Block -->
        <rect x="0" y="225" width="200" height="75" fill="#0F172A" />
        <line x1="0" y1="225" x2="200" y2="225" stroke="#FBBF24" stroke-width="3" />
      </svg>`;

    case "kinetic_ripples":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <!-- Hypnotic Kinetic Op-Art Waves -->
        <g fill="none" stroke="#A3E635" stroke-width="3" opacity="0.9">
          <circle cx="100" cy="150" r="15" />
          <circle cx="100" cy="150" r="30" stroke="#C084FC" />
          <circle cx="100" cy="150" r="48" />
          <circle cx="100" cy="150" r="68" stroke="#C084FC" stroke-width="3.5" />
          <circle cx="100" cy="150" r="90" stroke-width="4" />
          <circle cx="100" cy="150" r="115" stroke="#C084FC" stroke-width="4.5" />
        </g>
        
        <!-- Glowing Center Singularity -->
        <circle cx="100" cy="150" r="8" fill="#FFFFFF" />
      </svg>`;

    case "aurora_fjord":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="af-aurora" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#34D399" stop-opacity="0.8" />
            <stop offset="50%" stop-color="#A7F3D0" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#E879F9" stop-opacity="0.85" />
          </linearGradient>
        </defs>

        <!-- Northern Lights Curtains -->
        <path d="M0,60 Q50,30 100,55 T200,40 L200,160 Q150,180 100,150 T0,170 Z" fill="url(#af-aurora)" class="anim-cloud" />
        <path d="M0,90 Q60,65 120,85 T200,75 L200,180 Q140,200 80,175 T0,195 Z" fill="#6EE7B7" opacity="0.45" class="anim-cloud-alt" />

        <!-- Sharp Mountain Silhouettes -->
        <polygon points="0,210 60,140 120,210" fill="#064E3B" />
        <polygon points="90,215 155,130 200,215" fill="#022C22" />

        <!-- Mirror Glacial Fjord Water -->
        <rect x="0" y="210" width="200" height="90" fill="#020617" />
        <line x1="0" y1="210" x2="200" y2="210" stroke="#34D399" stroke-width="2" />
        <ellipse cx="100" cy="245" rx="60" ry="12" fill="#34D399" opacity="0.25" />
      </svg>`;

    case "architectural_monument":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <!-- Monumental Classical Bauhaus Arches -->
        <g fill="#FCD34D" opacity="0.9">
          <!-- Arch Colonnade -->
          <path d="M40,220 L40,130 C40,105 75,105 75,130 L75,220 Z" />
          <path d="M85,220 L85,115 C85,85 125,85 125,115 L125,220 Z" />
          <path d="M135,220 L135,130 C135,105 170,105 170,130 L170,220 Z" />
        </g>

        <!-- Shadow Cavity -->
        <g fill="#450A0A">
          <path d="M48,220 L48,135 C48,115 67,115 67,135 L67,220 Z" />
          <path d="M93,220 L93,120 C93,95 117,95 117,120 L117,220 Z" />
          <path d="M143,220 L143,135 C143,115 162,115 162,135 L162,220 Z" />
        </g>

        <!-- Stepped Monument Base -->
        <rect x="15" y="220" width="170" height="15" fill="#FCA5A5" />
        <rect x="5" y="235" width="190" height="20" fill="#EF4444" />
        <rect x="0" y="255" width="200" height="45" fill="#991B1B" />
      </svg>`;

    case "fluid_chroma":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <radialGradient id="fc-g1" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#F472B6" />
            <stop offset="100%" stop-color="#3B82F6" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="fc-g2" cx="70%" cy="70%" r="70%">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- Floating Chromatic Fluid Blobs -->
        <circle cx="70" cy="130" r="58" fill="url(#fc-g1)" class="anim-swimmer" />
        <circle cx="130" cy="170" r="65" fill="url(#fc-g2)" class="anim-breathing" />
        <circle cx="100" cy="150" r="42" fill="#FEF08A" opacity="0.65" />

        <!-- Crisp Outer Contour Rings -->
        <circle cx="100" cy="150" r="75" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity="0.75" />
      </svg>`;

    case "solitary_wanderer":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="sw-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#EA580C" />
            <stop offset="50%" stop-color="#991B1B" />
            <stop offset="100%" stop-color="#450A0A" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#sw-sky)" />

        <!-- Redwood Forest Silhouettes -->
        <g fill="#450A0A" opacity="0.95">
          <rect x="15" y="30" width="14" height="270" />
          <rect x="42" y="15" width="18" height="285" />
          <rect x="75" y="40" width="16" height="260" />
          <rect x="135" y="20" width="20" height="280" />
          <rect x="170" y="35" width="18" height="265" />
        </g>

        <!-- Winding Golden River Path -->
        <path class="anim-glow-path" d="M100,105 C115,145 155,160 135,195 C110,230 145,260 160,300 L195,300 C170,250 135,225 155,190 C175,150 125,135 112,105 Z" fill="#FBBF24" />

        <!-- Glowing Forest Fireflies -->
        <circle class="anim-firefly" cx="45" cy="130" r="2.5" fill="#FEF08A" />
        <circle class="anim-firefly-alt" cx="150" cy="115" r="3" fill="#FEF08A" />
        <circle class="anim-firefly" cx="115" cy="75" r="2" fill="#FEF08A" />
      </svg>`;

    case "comic_pop":
    default:
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <!-- Vibrant Comic Starburst Explosion -->
        <g class="anim-starburst" style="transform-origin: 100px 170px;">
          <polygon points="100,80 125,40 145,95 190,75 160,125 200,155 160,180 175,230 135,205 115,255 100,215 70,240 85,195 45,175 85,150 60,110" fill="#FDE047" />
        </g>

        <!-- Pop Comic Action Bubble -->
        <circle cx="100" cy="170" r="42" fill="#F43F5E" stroke="#FFFFFF" stroke-width="4" />
        <text x="100" y="178" font-family="'Bricolage Grotesque', sans-serif" font-weight="900" font-size="20" fill="#FFFFFF" text-anchor="middle">★ POP</text>
      </svg>`;
  }
}
