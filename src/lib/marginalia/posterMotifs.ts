import { hashString } from "./houseMotifs";

export type PosterMotif =
  | "path"
  | "ocean"
  | "growth"
  | "night"
  | "statue"
  | "summit"
  | "horizon"
  | "grid";

export interface PosterTheme {
  motif: PosterMotif;
  bgGradient: string;
  fg: string;
  accent: string;
  subColor: string;
}

export const POSTER_PALETTES: Record<PosterMotif, PosterTheme> = {
  path: {
    motif: "path",
    bgGradient: "linear-gradient(180deg, #A83232 0%, #7E2222 45%, #4A1212 100%)",
    fg: "#FFFFFF",
    accent: "#FBBF24",
    subColor: "rgba(255, 255, 255, 0.88)",
  },
  ocean: {
    motif: "ocean",
    bgGradient: "linear-gradient(180deg, #93C5FD 0%, #3B82F6 30%, #1D4ED8 65%, #0F2B75 100%)",
    fg: "#FFFFFF",
    accent: "#FDE047",
    subColor: "rgba(255, 255, 255, 0.9)",
  },
  growth: {
    motif: "growth",
    bgGradient: "linear-gradient(180deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)",
    fg: "#111827",
    accent: "#EF4444",
    subColor: "#27272A",
  },
  night: {
    motif: "night",
    bgGradient: "linear-gradient(180deg, #0F172A 0%, #1E1B4B 45%, #311347 70%, #064E3B 100%)",
    fg: "#FFFDF7",
    accent: "#34D399",
    subColor: "rgba(255, 255, 255, 0.85)",
  },
  statue: {
    motif: "statue",
    bgGradient: "linear-gradient(180deg, #E05A3E 0%, #C2410C 55%, #7C2D12 100%)",
    fg: "#FFFFFF",
    accent: "#F472B6",
    subColor: "rgba(255, 255, 255, 0.9)",
  },
  summit: {
    motif: "summit",
    bgGradient: "linear-gradient(180deg, #1E293B 0%, #0F172A 50%, #020617 100%)",
    fg: "#FFFFFF",
    accent: "#60A5FA",
    subColor: "rgba(255, 255, 255, 0.85)",
  },
  horizon: {
    motif: "horizon",
    bgGradient: "linear-gradient(180deg, #047857 0%, #065F46 45%, #022C22 100%)",
    fg: "#FFFFFF",
    accent: "#FDE047",
    subColor: "rgba(255, 255, 255, 0.9)",
  },
  grid: {
    motif: "grid",
    bgGradient: "linear-gradient(180deg, #312E81 0%, #4338CA 40%, #1E1B4B 100%)",
    fg: "#FFFFFF",
    accent: "#38BDF8",
    subColor: "rgba(255, 255, 255, 0.88)",
  },
};

const MOTIF_LIST: PosterMotif[] = [
  "path",
  "ocean",
  "growth",
  "night",
  "statue",
  "summit",
  "horizon",
  "grid",
];

export function seedPosterStyle(title: string, author?: string): PosterTheme {
  const hash = hashString(`${title} ${author || ""}`.trim().toLowerCase());
  const motif = MOTIF_LIST[hash % MOTIF_LIST.length];
  return POSTER_PALETTES[motif];
}

/** Render full-bleed SVG vector illustration with embedded CSS keyframe animations */
export function renderPosterIllustration(motif: PosterMotif, theme: PosterTheme): string {
  switch (motif) {
    case "path":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="p-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#C2410C" />
            <stop offset="50%" stop-color="#991B1B" />
            <stop offset="100%" stop-color="#450A0A" />
          </linearGradient>
          <linearGradient id="p-lake" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#0284C7" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#p-sky)" />
        
        <!-- Redwood forest silhouettes -->
        <g fill="#450A0A" opacity="0.95">
          <rect x="12" y="40" width="14" height="260" />
          <rect x="38" y="20" width="20" height="280" />
          <rect x="70" y="35" width="16" height="265" />
          <rect x="130" y="25" width="18" height="275" />
          <rect x="160" y="45" width="22" height="255" />
        </g>
        
        <!-- Distant tranquil lake -->
        <path d="M0,180 Q100,165 200,175 L200,300 L0,300 Z" fill="url(#p-lake)" opacity="0.85" />
        
        <!-- Winding Golden Path with animated shimmer -->
        <path class="anim-glow-path" d="M100,110 C115,145 155,160 135,195 C110,230 145,260 160,300 L195,300 C170,250 135,225 155,190 C175,150 125,135 112,110 Z" fill="${theme.accent}" />
        
        <!-- Floating fireflies -->
        <circle class="anim-firefly" cx="45" cy="140" r="2.5" fill="#FEF08A" opacity="0.9" />
        <circle class="anim-firefly-alt" cx="150" cy="120" r="2" fill="#FEF08A" opacity="0.8" />
        <circle class="anim-firefly" cx="120" cy="80" r="1.8" fill="#FEF08A" opacity="0.85" />
      </svg>`;

    case "ocean":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="o-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#E0F2FE" />
            <stop offset="35%" stop-color="#BAE6FD" />
            <stop offset="60%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#0369A1" />
          </linearGradient>
          <linearGradient id="o-deep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284C7" />
            <stop offset="50%" stop-color="#0369A1" />
            <stop offset="100%" stop-color="#082F49" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#o-sky)" />
        
        <!-- Fluffy summer clouds -->
        <g fill="#FFFFFF" opacity="0.85" class="anim-cloud">
          <ellipse cx="60" cy="70" rx="42" ry="18" />
          <ellipse cx="150" cy="55" rx="50" ry="20" />
        </g>
        
        <!-- Floating Swimmer -->
        <g class="anim-swimmer">
          <circle cx="85" cy="115" r="13" fill="#FB923C" />
          <rect x="74" y="122" width="22" height="14" rx="5" fill="#FB923C" />
          <!-- Goggles -->
          <circle cx="81" cy="113" r="3.5" fill="#1E293B" />
          <circle cx="89" cy="113" r="3.5" fill="#1E293B" />
        </g>
        
        <!-- Chat bubbles in water -->
        <g class="anim-bubble">
          <rect x="115" cy="85" y="85" width="30" height="18" rx="6" fill="#FFFFFF" />
          <text x="123" y="98" font-family="sans-serif" font-weight="bold" font-size="10" fill="#0284C7">&gt;&lt;</text>
          <polygon points="120,103 126,103 120,108" fill="#FFFFFF" />
        </g>
        
        <!-- Animated Deep Waves -->
        <path class="anim-wave-1" d="M0,135 Q50,122 100,135 T200,130 L200,300 L0,300 Z" fill="url(#o-deep)" />
        <path class="anim-wave-2" d="M0,150 Q60,165 120,148 T200,155 L200,300 L0,300 Z" fill="#075985" opacity="0.75" />
        
        <!-- Shark Fin -->
        <path class="anim-shark" d="M152,136 C158,112 178,105 192,118 C182,128 178,134 176,138 Z" fill="#0F172A" />
      </svg>`;

    case "growth":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="g-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FCD34D" />
            <stop offset="50%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#D97706" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#g-bg)" />
        
        <!-- Subtle metric chart grid lines -->
        <g stroke="rgba(0,0,0,0.12)" stroke-width="1.5" stroke-dasharray="6,4">
          <line x1="20" y1="90" x2="180" y2="90" />
          <line x1="20" y1="140" x2="180" y2="140" />
          <line x1="20" y1="190" x2="180" y2="190" />
          <line x1="20" y1="240" x2="180" y2="240" />
        </g>
        
        <!-- Upward Breakthrough Arrow -->
        <polyline class="anim-chart-line" points="24,245 75,190 115,225 174,105" fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
        <polygon points="174,105 148,110 162,130" fill="#FFFFFF" />
        
        <!-- Pulsing Summit Target Orb -->
        <circle class="anim-target-pulse" cx="180" cy="95" r="10" fill="${theme.accent}" />
        <circle class="anim-target-ring" cx="180" cy="95" r="18" fill="none" stroke="${theme.accent}" stroke-width="2.5" opacity="0.6" />
      </svg>`;

    case "night":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="n-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0F172A" />
            <stop offset="40%" stop-color="#1E1B4B" />
            <stop offset="70%" stop-color="#311347" />
            <stop offset="100%" stop-color="#064E3B" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#n-sky)" />
        
        <!-- Twinkling stars -->
        <g class="anim-stars">
          <circle cx="35" cy="40" r="2.5" fill="#FDE047" />
          <circle cx="165" cy="35" r="2" fill="#FDE047" />
          <circle cx="110" cy="60" r="3" fill="#FFFFFF" />
          <circle cx="145" cy="85" r="1.5" fill="#FDE047" />
          <circle cx="55" cy="95" r="2" fill="#FFFFFF" />
        </g>
        
        <!-- Crescent Moon -->
        <path d="M165,55 A16,16 0 0 0 145,35 A13,13 0 1 1 165,55 Z" fill="#FEF08A" />
        
        <!-- Drifting Soft Clouds -->
        <ellipse cx="40" cy="75" rx="45" ry="16" fill="#FFFFFF" opacity="0.3" class="anim-cloud" />
        <ellipse cx="160" cy="100" rx="55" ry="20" fill="#FFFFFF" opacity="0.35" class="anim-cloud-alt" />
        
        <!-- Sitting Figure in peaceful reflection -->
        <g fill="#F97316" class="anim-breathing">
          <circle cx="95" cy="180" r="13" fill="#FDBA74" />
          <!-- Body -->
          <path d="M78,198 C78,190 92,188 110,194 C122,198 128,216 122,238 L82,242 Z" />
          <rect x="94" y="206" width="34" height="18" rx="9" fill="#FFFFFF" />
        </g>
        
        <!-- Rolling Meadow with Daisies -->
        <path d="M0,220 Q100,195 200,225 L200,300 L0,300 Z" fill="#059669" />
        <circle cx="35" cy="255" r="4" fill="#FFFFFF" />
        <circle cx="150" cy="248" r="3.5" fill="#FFFFFF" />
        <circle cx="178" cy="265" r="3" fill="#FFFFFF" />
      </svg>`;

    case "statue":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="s-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#EA580C" />
            <stop offset="60%" stop-color="#C2410C" />
            <stop offset="100%" stop-color="#7C2D12" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#s-bg)" />
        
        <!-- Animated Rotating Pop Comic Starburst -->
        <g class="anim-starburst" style="transform-origin: 100px 210px;">
          <polygon points="100,140 125,100 145,145 185,130 160,170 195,195 160,215 170,255 135,235 115,275 100,240 75,260 85,220 50,205 85,185 65,150" fill="#991B1B" opacity="0.65" />
        </g>
        
        <!-- Classical Sculpture Bust Drawing -->
        <g fill="#F3F4F6" stroke="#18181B" stroke-width="2.2" stroke-linecap="round">
          <path d="M142,300 C138,245 172,215 168,165 C164,135 142,120 118,120 C90,120 78,140 82,170 C88,200 105,240 100,300 Z" />
          <circle cx="102" cy="132" r="10" fill="#E4E4E7" />
          <circle cx="122" cy="128" r="9" fill="#E4E4E7" />
          <circle cx="142" cy="136" r="11" fill="#E4E4E7" />
          <circle cx="155" cy="154" r="10" fill="#E4E4E7" />
          <circle cx="152" cy="176" r="10" fill="#E4E4E7" />
        </g>
        
        <!-- Animated Popping Pink Bubblegum Bubble -->
        <circle class="anim-bubblegum" cx="95" cy="188" r="24" fill="${theme.accent}" stroke="#FFFFFF" stroke-width="3" />
        <ellipse cx="88" cy="178" rx="6" ry="3" fill="#FFFFFF" opacity="0.8" />
      </svg>`;

    case "summit":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="sum-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38BDF8" />
            <stop offset="40%" stop-color="#0284C7" />
            <stop offset="100%" stop-color="#0F172A" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#sum-sky)" />
        
        <!-- Sharp Mountain Cliff Face -->
        <polygon points="0,0 90,0 200,165 140,300 0,300" fill="#0F172A" />
        <polygon points="90,0 135,75 180,120 140,300 200,165" fill="#334155" />
        
        <!-- Climber on sheer cliff face -->
        <g fill="#F8FAFC" stroke="#020617" stroke-width="1.8" class="anim-climber">
          <circle cx="152" cy="185" r="6" fill="#F97316" />
          <line x1="152" y1="191" x2="140" y2="204" stroke="#F8FAFC" stroke-width="4" />
          <line x1="140" y1="204" x2="124" y2="208" stroke="#F8FAFC" stroke-width="4" />
          <!-- Climbing rope -->
          <path d="M148,180 Q135,140 120,90" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-dasharray="4,3" />
        </g>
        
        <!-- Wind drift wisps -->
        <path class="anim-wind" d="M110,60 Q150,55 190,65" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" fill="none" />
        <path class="anim-wind-alt" d="M80,110 Q130,105 170,115" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round" fill="none" />
      </svg>`;

    case "horizon":
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="h-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#059669" />
            <stop offset="50%" stop-color="#047857" />
            <stop offset="100%" stop-color="#022C22" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#h-sky)" />
        
        <!-- Concentric Radiant Solar Pulse -->
        <circle class="anim-sun-halo" cx="100" cy="110" r="65" fill="${theme.accent}" opacity="0.25" />
        <circle class="anim-sun-halo" cx="100" cy="110" r="45" fill="${theme.accent}" opacity="0.45" />
        <circle class="anim-sun-core" cx="100" cy="110" r="26" fill="${theme.accent}" />
        
        <!-- Solar Rays -->
        <g stroke="${theme.accent}" stroke-width="3" stroke-linecap="round" opacity="0.75" class="anim-sun-rays">
          <line x1="100" y1="35" x2="100" y2="48" />
          <line x1="155" y1="58" x2="145" y2="68" />
          <line x1="45" y1="58" x2="55" y2="68" />
          <line x1="175" y1="110" x2="160" y2="110" />
          <line x1="25" y1="110" x2="40" y2="110" />
        </g>
        
        <!-- Curved Dunes -->
        <path d="M0,170 Q70,140 140,175 T200,165 L200,300 L0,300 Z" fill="#065F46" />
        <path d="M0,210 Q80,185 160,215 T200,200 L200,300 L0,300 Z" fill="#022C22" />
      </svg>`;

    case "grid":
    default:
      return `<svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="grid-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#312E81" />
            <stop offset="50%" stop-color="#4338CA" />
            <stop offset="100%" stop-color="#0F172A" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#grid-sky)" />
        
        <!-- Glowing Horizon Sun -->
        <circle class="anim-sun-core" cx="100" cy="120" r="32" fill="#F43F5E" />
        
        <!-- Neon Perspective Grid Plane -->
        <g stroke="${theme.accent}" stroke-width="1.8" opacity="0.8">
          <!-- Horizon line -->
          <line x1="0" y1="140" x2="200" y2="140" stroke="#F43F5E" stroke-width="3" />
          
          <!-- Perspective converging lines -->
          <line x1="100" y1="140" x2="0" y2="300" />
          <line x1="100" y1="140" x2="45" y2="300" />
          <line x1="100" y1="140" x2="85" y2="300" />
          <line x1="100" y1="140" x2="115" y2="300" />
          <line x1="100" y1="140" x2="155" y2="300" />
          <line x1="100" y1="140" x2="200" y2="300" />
          
          <!-- Horizontal depth steps -->
          <line x1="20" y1="155" x2="180" y2="155" opacity="0.4" />
          <line x1="15" y1="180" x2="185" y2="180" opacity="0.6" />
          <line x1="10" y1="215" x2="190" y2="215" opacity="0.8" />
          <line x1="0" y1="260" x2="200" y2="260" />
        </g>
        
        <!-- Ascending Data Nodes -->
        <circle class="anim-target-pulse" cx="80" cy="80" r="4" fill="#38BDF8" />
        <circle class="anim-target-pulse" cx="140" cy="65" r="3" fill="#38BDF8" />
      </svg>`;
  }
}
