/**
 * SVG Cover Card Generator for Studio
 * Generates 9:16 vertical video cover art (1080x1920) with neo-brutalist styling,
 * theme tokens, series tags, and pillar accents.
 */

export type CoverStyle = "soundstage" | "editorial" | "cyber" | "minimal";

export interface CoverOptions {
  title: string;
  seriesTitle?: string | null;
  part?: number | null;
  format?: string;
  pillar?: string;
  subtitle?: string;
  style?: CoverStyle;
}

const PILLAR_COLORS: Record<string, { bg: string; fg: string; accent: string }> = {
  finance: { bg: "#0D2818", fg: "#B6FF3C", accent: "#34D399" },
  sports: { bg: "#082F49", fg: "#00F0FF", accent: "#38BDF8" },
  tech: { bg: "#1E1145", fg: "#C084FC", accent: "#7C4DFF" },
  world: { bg: "#2E1005", fg: "#FB923C", accent: "#FF6B00" },
  concepts: { bg: "#241802", fg: "#FFE600", accent: "#FACC15" },
  psych: { bg: "#042F2E", fg: "#00E58A", accent: "#2DD4BF" },
  sites: { bg: "#310B22", fg: "#FF007A", accent: "#F43F5E" },
  tools: { bg: "#310B22", fg: "#FF007A", accent: "#FB7185" },
  repos: { bg: "#241802", fg: "#FFE600", accent: "#FACC15" },
};

function wrapText(text: string, maxCharsPerLine = 16): string[] {
  const words = (text || "").trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    if (!current) {
      current = w;
    } else if (`${current} ${w}`.length <= maxCharsPerLine) {
      current += ` ${w}`;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4); // Max 4 lines on cover
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateCoverSvg(opts: CoverOptions): string {
  const {
    title,
    seriesTitle,
    part,
    format = "reel",
    pillar = "finance",
    subtitle = "",
    style = "soundstage",
  } = opts;

  const colors = PILLAR_COLORS[pillar] || PILLAR_COLORS.finance;
  const lines = wrapText(title, style === "editorial" ? 14 : 17);
  const partText = part ? `PART ${String(part).padStart(2, "0")}` : "";
  const seriesText = seriesTitle ? seriesTitle.toUpperCase() : "ODDLY INTERESTING";
  const formatText = format.toUpperCase();

  if (style === "soundstage") {
    // Soundstage / Film Slate Look
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <pattern id="slate-stripes" width="80" height="80" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="40" height="80" fill="#FFE600"/>
      <rect x="40" width="40" height="80" fill="#0A0A0A"/>
    </pattern>
    <filter id="shadow">
      <feDropShadow dx="8" dy="8" stdDeviation="0" flood-color="#000000"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="#0A0A0A"/>
  
  <!-- Slate Header Stripe -->
  <rect x="60" y="80" width="960" height="90" fill="url(#slate-stripes)" stroke="#FFE600" stroke-width="8"/>

  <!-- Slate Metadata Header -->
  <g transform="translate(60, 210)">
    <rect width="960" height="120" fill="#141414" stroke="#FFFFFF" stroke-width="6"/>
    <text x="30" y="45" font-family="monospace" font-size="28" font-weight="900" fill="#888888" letter-spacing="4">PRODUCTION</text>
    <text x="30" y="85" font-family="sans-serif" font-size="34" font-weight="900" fill="#FFFFFF">${escapeXml(seriesText)}</text>
    
    <text x="700" y="45" font-family="monospace" font-size="28" font-weight="900" fill="#888888" letter-spacing="4">FORMAT</text>
    <text x="700" y="85" font-family="monospace" font-size="34" font-weight="900" fill="${colors.fg}">${formatText}</text>
  </g>

  <!-- Main Title Area -->
  <g transform="translate(60, 500)">
    ${part ? `
    <!-- Part Sticker Badge -->
    <g transform="translate(0, 0)" filter="url(#shadow)">
      <rect width="320" height="90" fill="${colors.fg}" stroke="#000000" stroke-width="6" rx="6"/>
      <text x="160" y="60" font-family="monospace" font-size="44" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="4">${partText}</text>
    </g>` : ""}

    <!-- Main Title -->
    <g transform="translate(0, ${part ? 160 : 60})">
      ${lines
        .map(
          (line, i) =>
            `<text x="0" y="${i * 140}" font-family="'Space Grotesk', system-ui, sans-serif" font-size="110" font-weight="900" fill="#FFFFFF" letter-spacing="-2">${escapeXml(
              line
            )}</text>`
        )
        .join("\n      ")}
    </g>

    ${subtitle ? `
    <!-- Subtitle Card -->
    <rect x="0" y="${(lines.length + 1) * 140}" width="960" height="100" fill="#1E1E1E" stroke="${colors.fg}" stroke-width="4" rx="4"/>
    <text x="30" y="${(lines.length + 1) * 140 + 62}" font-family="system-ui, sans-serif" font-size="36" font-weight="700" fill="#E2E8F0">${escapeXml(subtitle)}</text>` : ""}
  </g>

  <!-- Soundstage Slate Footer -->
  <g transform="translate(60, 1640)">
    <rect width="960" height="180" fill="#141414" stroke="#333333" stroke-width="4" rx="6"/>
    <circle cx="60" cy="90" r="22" fill="#EF4444"/>
    <text x="100" y="98" font-family="monospace" font-size="32" font-weight="900" fill="#FFFFFF" letter-spacing="3">REC ● 00:00:01:00</text>
    
    <rect x="680" y="50" width="240" height="80" fill="${colors.fg}" stroke="#000000" stroke-width="4" rx="4"/>
    <text x="800" y="102" font-family="monospace" font-size="30" font-weight="900" fill="#000000" text-anchor="middle">ODDLY</text>
  </g>
</svg>`;
  }

  if (style === "editorial") {
    // Bold Editorial / Magazine Poster
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <filter id="ed-sh">
      <feDropShadow dx="12" dy="12" stdDeviation="0" flood-color="#000000"/>
    </filter>
  </defs>

  <!-- Background with accent tone -->
  <rect width="1080" height="1920" fill="${colors.bg}"/>
  
  <!-- Outer Double Border -->
  <rect x="40" y="40" width="1000" height="1840" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <rect x="60" y="60" width="960" height="1800" fill="none" stroke="${colors.fg}" stroke-width="4"/>

  <!-- Massive Watermark Part Number -->
  ${part ? `
  <text x="540" y="1100" font-family="sans-serif" font-size="800" font-weight="900" fill="${colors.accent}" opacity="0.12" text-anchor="middle">${String(part).padStart(2, "0")}</text>` : ""}

  <!-- Top Ribbon -->
  <g transform="translate(100, 140)">
    <text x="0" y="40" font-family="monospace" font-size="36" font-weight="900" fill="${colors.fg}" letter-spacing="6">${escapeXml(seriesText)}</text>
    <line x1="0" y1="70" x2="880" y2="70" stroke="${colors.fg}" stroke-width="4"/>
  </g>

  <!-- Center Title Box -->
  <g transform="translate(100, 480)">
    ${part ? `
    <rect x="0" y="0" width="300" height="80" fill="#FFE600" stroke="#000000" stroke-width="6" rx="4" filter="url(#ed-sh)"/>
    <text x="150" y="54" font-family="monospace" font-size="38" font-weight="900" fill="#000000" text-anchor="middle">${partText}</text>` : ""}

    <g transform="translate(0, ${part ? 180 : 80})">
      ${lines
        .map(
          (line, i) =>
            `<text x="0" y="${i * 150}" font-family="'Bricolage Grotesque', sans-serif" font-size="124" font-weight="900" fill="#FFFFFF" letter-spacing="-3">${escapeXml(
              line
            )}</text>`
        )
        .join("\n      ")}
    </g>
  </g>

  <!-- Editorial Bottom Block -->
  <g transform="translate(100, 1600)" filter="url(#ed-sh)">
    <rect width="880" height="160" fill="#FFFFFF" stroke="#000000" stroke-width="8" rx="6"/>
    <text x="40" y="70" font-family="monospace" font-size="28" font-weight="900" fill="#000000" letter-spacing="3">ODDLY INTERESTING</text>
    <text x="40" y="120" font-family="sans-serif" font-size="36" font-weight="800" fill="#000000">${escapeXml(subtitle || "Curated Knowledge & Analysis")}</text>
    <rect x="700" y="40" width="140" height="80" fill="${colors.fg}" stroke="#000000" stroke-width="4"/>
    <text x="770" y="90" font-family="monospace" font-size="30" font-weight="900" fill="#000000" text-anchor="middle">${formatText}</text>
  </g>
</svg>`;
  }

  if (style === "cyber") {
    // Cyberpunk Neon Grid
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <pattern id="cyber-grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#222233" stroke-width="1.5"/>
    </pattern>
  </defs>

  <rect width="1080" height="1920" fill="#0D0E15"/>
  <rect width="1080" height="1920" fill="url(#cyber-grid)"/>

  <!-- Glowing Corner Brackets -->
  <path d="M 80 140 L 80 80 L 140 80" stroke="#00F0FF" stroke-width="6" fill="none"/>
  <path d="M 1000 140 L 1000 80 L 940 80" stroke="#00F0FF" stroke-width="6" fill="none"/>
  <path d="M 80 1780 L 80 1840 L 140 1840" stroke="#00F0FF" stroke-width="6" fill="none"/>
  <path d="M 1000 1780 L 1000 1840 L 940 1840" stroke="#00F0FF" stroke-width="6" fill="none"/>

  <!-- Cyber Header -->
  <g transform="translate(100, 140)">
    <rect width="360" height="50" fill="#00F0FF" rx="2"/>
    <text x="180" y="35" font-family="monospace" font-size="24" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="4">// SYS.BROADCAST</text>
    <text x="400" y="38" font-family="monospace" font-size="28" font-weight="700" fill="#00F0FF">${escapeXml(seriesText)}</text>
  </g>

  <!-- Main Cyber Title -->
  <g transform="translate(100, 520)">
    ${part ? `
    <rect x="0" y="0" width="260" height="70" fill="#FF007A" rx="4"/>
    <text x="130" y="47" font-family="monospace" font-size="34" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">${partText}</text>` : ""}

    <g transform="translate(0, ${part ? 170 : 70})">
      ${lines
        .map(
          (line, i) =>
            `<text x="0" y="${i * 140}" font-family="'Space Grotesk', monospace" font-size="114" font-weight="900" fill="#F0F4FC">${escapeXml(
              line
            )}</text>`
        )
        .join("\n      ")}
    </g>
  </g>

  <!-- Cyber Status Bar -->
  <g transform="translate(100, 1680)">
    <line x1="0" y1="0" x2="880" y2="0" stroke="#FF007A" stroke-width="4"/>
    <text x="0" y="60" font-family="monospace" font-size="28" font-weight="800" fill="#00F0FF">&gt; ARCHIVE NODE // ODDLY INTERESTING</text>
    <text x="880" y="60" font-family="monospace" font-size="28" font-weight="800" fill="#FF007A" text-anchor="end">${formatText}</text>
  </g>
</svg>`;
  }

  // Minimalist Swiss Poster Look
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <rect width="1080" height="1920" fill="#FFFDF8"/>

  <!-- Left Accent Bar -->
  <rect x="80" y="100" width="24" height="1720" fill="${colors.fg}"/>

  <!-- Top Metadata -->
  <g transform="translate(140, 160)">
    <text x="0" y="30" font-family="monospace" font-size="32" font-weight="900" fill="#000000" letter-spacing="4">${escapeXml(seriesText)}</text>
    <text x="800" y="30" font-family="monospace" font-size="32" font-weight="900" fill="#000000" text-anchor="end">${partText}</text>
  </g>

  <!-- Center Title -->
  <g transform="translate(140, 560)">
    ${lines
      .map(
        (line, i) =>
          `<text x="0" y="${i * 144}" font-family="'Space Grotesk', system-ui, sans-serif" font-size="118" font-weight="900" fill="#000000" letter-spacing="-3">${escapeXml(
            line
          )}</text>`
      )
      .join("\n    ")}

    ${subtitle ? `
    <text x="0" y="${(lines.length + 1) * 140}" font-family="system-ui, sans-serif" font-size="44" font-weight="600" fill="#555555">${escapeXml(subtitle)}</text>` : ""}
  </g>

  <!-- Footer -->
  <g transform="translate(140, 1720)">
    <line x1="0" y1="0" x2="800" y2="0" stroke="#000000" stroke-width="4"/>
    <text x="0" y="55" font-family="monospace" font-size="28" font-weight="700" fill="#000000">ODDLY INTERESTING</text>
    <text x="800" y="55" font-family="monospace" font-size="28" font-weight="700" fill="#000000" text-anchor="end">${formatText} · ${pillar.toUpperCase()}</text>
  </g>
</svg>`;
}

/** Converts raw SVG string into a data URL for <img> tags and coverUrl storage */
export function coverSvgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/** Initiates a client-side download of the SVG file */
export function downloadCoverSvg(svg: string, filename = "cover.svg") {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
