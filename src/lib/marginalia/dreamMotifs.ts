import { hashString } from "./houseMotifs";

export interface DreamStyle {
  id: string;
  themeName: string;
  bgGradient: string;
  accentColor: string;
  secondaryColor: string;
  textColor: string;
  epigraph: string;
  svgMarkup: string;
}

const DREAM_THEMES = [
  {
    name: "Cosmic Odyssey",
    bg: "linear-gradient(180deg, #090614 0%, #1E1035 45%, #0D0722 100%)",
    accent: "#A855F7",
    secondary: "#38BDF8",
    fg: "#FAF5FF",
    epigraph: "A journey across frontiers of thought and time.",
    renderSvg: (a: string, b: string) => `
      <svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <radialGradient id="cosmic-core" cx="50%" cy="55%" r="45%">
            <stop offset="0%" stop-color="${a}" stop-opacity="0.8"/>
            <stop offset="60%" stop-color="${b}" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="orbit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${a}"/>
            <stop offset="100%" stop-color="${b}"/>
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#cosmic-core)"/>
        <circle cx="100" cy="165" r="54" fill="none" stroke="url(#orbit-grad)" stroke-width="2" stroke-dasharray="4 3"/>
        <ellipse cx="100" cy="165" rx="76" ry="24" fill="none" stroke="${b}" stroke-width="1.8" transform="rotate(-28 100 165)"/>
        <ellipse cx="100" cy="165" rx="76" ry="24" fill="none" stroke="${a}" stroke-width="1.5" transform="rotate(38 100 165)"/>
        <circle cx="100" cy="165" r="28" fill="${a}" fill-opacity="0.2" stroke="${a}" stroke-width="2.5"/>
        <circle cx="100" cy="165" r="12" fill="${b}"/>
        <path d="M20 280 L100 195 L180 280" fill="none" stroke="${a}" stroke-width="1.5" stroke-opacity="0.4"/>
      </svg>
    `,
  },
  {
    name: "Architectural Synthesis",
    bg: "linear-gradient(180deg, #110B07 0%, #311508 50%, #180903 100%)",
    accent: "#F59E0B",
    secondary: "#EF4444",
    fg: "#FFFBEB",
    epigraph: "Foundations laid in structure, refined in execution.",
    renderSvg: (a: string, b: string) => `
      <svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <linearGradient id="arch-beam" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stop-color="${a}" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="${b}" stop-opacity="0.1"/>
          </linearGradient>
        </defs>
        <path d="M40 280 L40 160 Q100 110 160 160 L160 280 Z" fill="url(#arch-beam)" stroke="${a}" stroke-width="2"/>
        <path d="M60 280 L60 175 Q100 135 140 175 L140 280 Z" fill="none" stroke="${b}" stroke-width="1.8"/>
        <path d="M80 280 L80 195 Q100 165 120 195 L120 280 Z" fill="none" stroke="${a}" stroke-width="1.5"/>
        <circle cx="100" cy="100" r="22" fill="${a}" fill-opacity="0.8"/>
        <line x1="100" y1="30" x2="100" y2="78" stroke="${a}" stroke-width="2" stroke-dasharray="3 2"/>
        <line x1="20" y1="280" x2="180" y2="280" stroke="${a}" stroke-width="3"/>
      </svg>
    `,
  },
  {
    name: "Neural Constellation",
    bg: "linear-gradient(180deg, #041316 0%, #082F38 50%, #031418 100%)",
    accent: "#06B6D4",
    secondary: "#10B981",
    fg: "#ECFEFF",
    epigraph: "Complex thoughts interlinked in luminous networks.",
    renderSvg: (a: string, b: string) => `
      <svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <defs>
          <filter id="glow-synapse" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g stroke="${a}" stroke-width="1.4" stroke-opacity="0.6">
          <line x1="100" y1="130" x2="45" y2="180"/>
          <line x1="100" y1="130" x2="155" y2="175"/>
          <line x1="45" y1="180" x2="70" y2="245"/>
          <line x1="155" y1="175" x2="135" y2="245"/>
          <line x1="70" y1="245" x2="135" y2="245"/>
          <line x1="100" y1="130" x2="100" y2="215"/>
          <line x1="45" y1="180" x2="100" y2="215"/>
          <line x1="155" y1="175" x2="100" y2="215"/>
        </g>
        <circle cx="100" cy="130" r="9" fill="${b}" filter="url(#glow-synapse)"/>
        <circle cx="45" cy="180" r="7" fill="${a}"/>
        <circle cx="155" cy="175" r="7" fill="${a}"/>
        <circle cx="100" cy="215" r="6" fill="${b}"/>
        <circle cx="70" cy="245" r="8" fill="${a}"/>
        <circle cx="135" cy="245" r="8" fill="${b}"/>
      </svg>
    `,
  },
  {
    name: "Labyrinth & Solitude",
    bg: "linear-gradient(180deg, #180816 0%, #3B0D36 50%, #150514 100%)",
    accent: "#F43F5E",
    secondary: "#FBBF24",
    fg: "#FFF1F2",
    epigraph: "Navigating the intricate pathways of human nature.",
    renderSvg: (a: string, b: string) => `
      <svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <rect x="35" y="125" width="130" height="130" fill="none" stroke="${a}" stroke-width="2.5"/>
        <rect x="52" y="142" width="96" height="96" fill="none" stroke="${b}" stroke-width="2"/>
        <rect x="69" y="159" width="62" height="62" fill="none" stroke="${a}" stroke-width="1.8"/>
        <circle cx="100" cy="190" r="10" fill="${b}"/>
        <path d="M100 125 L100 142 M148 190 L165 190 M100 238 L100 255 M35 190 L52 190" stroke="#000" stroke-width="6"/>
      </svg>
    `,
  },
  {
    name: "Prism of Clarity",
    bg: "linear-gradient(180deg, #0A0F1D 0%, #1E293B 50%, #090D16 100%)",
    accent: "#38BDF8",
    secondary: "#FCD34D",
    fg: "#F8FAFC",
    epigraph: "Deconstructing complexity into essential truth.",
    renderSvg: (a: string, b: string) => `
      <svg viewBox="0 0 200 300" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
        <polygon points="100,120 165,240 35,240" fill="none" stroke="${a}" stroke-width="3"/>
        <polygon points="100,145 145,230 55,230" fill="${a}" fill-opacity="0.15" stroke="${b}" stroke-width="1.5"/>
        <line x1="20" y1="180" x2="100" y2="180" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.8"/>
        <path d="M100 180 L180 140 M100 180 L185 180 M100 180 L180 220" stroke="${b}" stroke-width="2" stroke-dasharray="5 3"/>
      </svg>
    `,
  },
];

export function seedDreamStyle(title: string, author: string): DreamStyle {
  const seedStr = `${title.toLowerCase().trim()}|${author.toLowerCase().trim()}`;
  const hash = Math.abs(hashString(seedStr));
  const themeIndex = hash % DREAM_THEMES.length;
  const t = DREAM_THEMES[themeIndex];

  return {
    id: `dream-${themeIndex}`,
    themeName: t.name,
    bgGradient: t.bg,
    accentColor: t.accent,
    secondaryColor: t.secondary,
    textColor: t.fg,
    epigraph: t.epigraph,
    svgMarkup: t.renderSvg(t.accent, t.secondary),
  };
}
