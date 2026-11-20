import { FavoriteItem, FavoritesVault } from "./types";
import { filterFavoritesByScope, ShareFilterScope } from "./favorites";

export type PosterAspect = "poster" | "square" | "story";
export type PosterTheme = "paper" | "midnight" | "gold";

interface ThemePalette {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  border: string;
  filmEdge: string;
  cardBg: string;
}

const PALETTES: Record<PosterTheme, ThemePalette> = {
  paper: {
    bg: "#F4F1EA",
    surface: "#FFFFFF",
    ink: "#161412",
    muted: "#5C5852",
    accent: "#F5C518",
    accentInk: "#111111",
    border: "#161412",
    filmEdge: "#161412",
    cardBg: "#FAF7F0",
  },
  midnight: {
    bg: "#121115",
    surface: "#1B1921",
    ink: "#F4F0E8",
    muted: "#A6A097",
    accent: "#F5C518",
    accentInk: "#111111",
    border: "rgba(244, 240, 232, 0.28)",
    filmEdge: "#070609",
    cardBg: "#221F2A",
  },
  gold: {
    bg: "#17140E",
    surface: "#221D14",
    ink: "#FBF3DC",
    muted: "#C8B88E",
    accent: "#E5B94C",
    accentInk: "#14110B",
    border: "rgba(229, 185, 76, 0.4)",
    filmEdge: "#0E0C08",
    cardBg: "#292318",
  },
};

const SMPTE = [
  "#F5C518",
  "#3CC4DE",
  "#3DBE6A",
  "#E4509E",
  "#EF4A3A",
  "#3F6BF0",
  "#FFFFFF",
];

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 3) {
      last = last.slice(0, -1);
    }
    if (words.join(" ").length > lines.join(" ").length) {
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderFavoritesPosterCanvas(
  canvas: HTMLCanvasElement,
  vault: FavoritesVault,
  options: {
    aspect: PosterAspect;
    theme: PosterTheme;
    scope: ShareFilterScope;
  }
): void {
  const { aspect, theme, scope } = options;
  const dims =
    aspect === "square"
      ? { w: 1200, h: 1200 }
      : aspect === "story"
        ? { w: 1080, h: 1920 }
        : { w: 1200, h: 1500 };

  canvas.width = dims.w;
  canvas.height = dims.h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pal = PALETTES[theme];
  const items: FavoriteItem[] = filterFavoritesByScope(vault.items, scope);
  const moviesCount = items.filter((i) => i.mediaType === "movie").length;
  const showsCount = items.filter((i) => i.mediaType === "show").length;

  // Base background
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, dims.w, dims.h);

  // Subtle paper grain / dot matrix
  ctx.fillStyle =
    theme === "paper" ? "rgba(22, 20, 18, 0.045)" : "rgba(255, 255, 255, 0.035)";
  for (let gx = 28; gx < dims.w; gx += 28) {
    for (let gy = 28; gy < dims.h; gy += 28) {
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }

  // Top SMPTE broadcast ribbon
  const barH = 14;
  const segW = dims.w / SMPTE.length;
  SMPTE.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(i * segW, 0, Math.ceil(segW), barH);
  });

  // Sprocket filmstrip side accents (35mm cinema frame feel)
  const sprocketW = 28;
  ctx.fillStyle =
    theme === "paper" ? "rgba(22, 20, 18, 0.08)" : "rgba(255, 255, 255, 0.06)";
  for (let sy = 56; sy < dims.h - 40; sy += 46) {
    drawRoundedRect(ctx, 14, sy, 12, 22, 3);
    ctx.fill();
    drawRoundedRect(ctx, dims.w - 26, sy, 12, 22, 3);
    ctx.fill();
  }

  const padX = 72 + sprocketW * 0.25;
  const contentW = dims.w - padX * 2;
  let y = 74;

  // Top Header Row: CH·100 badge + Edition stamp
  drawRoundedRect(ctx, padX, y, 124, 38, 6);
  ctx.fillStyle = pal.accent;
  ctx.fill();
  ctx.strokeStyle = pal.accentInk;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = pal.accentInk;
  ctx.font = '800 18px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.textBaseline = "middle";
  ctx.fillText("CH · 100", padX + 20, y + 20);

  const scopeBadge =
    scope === "movie"
      ? "ALL-TIME MOVIES"
      : scope === "show"
        ? "ALL-TIME SHOWS"
        : "ALL-TIME CANON";
  ctx.fillStyle = pal.muted;
  ctx.font = '700 16px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "right";
  ctx.fillText(
    `${scopeBadge}  ·  ${items.length} ${items.length === 1 ? "TITLE" : "TITLES"}`,
    dims.w - padX,
    y + 20
  );
  ctx.textAlign = "left";

  y += 68;

  // Main Display Title
  ctx.fillStyle = pal.ink;
  const titleSize = aspect === "story" ? 64 : 60;
  ctx.font = `800 ${titleSize}px "Bricolage Grotesque", system-ui, sans-serif`;
  ctx.textBaseline = "top";
  const titleLines = wrapText(
    ctx,
    vault.profile.displayName || "All-Time Canon",
    contentW,
    2
  );
  titleLines.forEach((line) => {
    ctx.fillText(line, padX, y);
    y += titleSize * 1.08;
  });

  // Tagline
  if (vault.profile.tagline) {
    y += 10;
    ctx.fillStyle = pal.muted;
    ctx.font = '500 22px "Figtree", system-ui, sans-serif';
    const tagLines = wrapText(ctx, vault.profile.tagline, contentW, 2);
    tagLines.forEach((line) => {
      ctx.fillText(line, padX, y);
      y += 30;
    });
  }

  // Divider rule
  y += 22;
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(dims.w - padX, y);
  ctx.stroke();
  y += 28;

  // Featured #1 Crown Card (if at least 1 item)
  const footerReserve = 96;
  const availableH = dims.h - y - footerReserve;

  if (items.length === 0) {
    ctx.fillStyle = pal.muted;
    ctx.font = '600 26px "Figtree", system-ui, sans-serif';
    ctx.fillText("Induct your first favorite movie or show to build this poster.", padX, y + 40);
  } else {
    const heroItem = items[0];
    const heroH = aspect === "square" ? 170 : 210;

    // Hard shadow in paper mode, subtle lift in dark modes
    if (theme === "paper") {
      drawRoundedRect(ctx, padX + 6, y + 6, contentW, heroH, 12);
      ctx.fillStyle = "#161412";
      ctx.fill();
    }

    drawRoundedRect(ctx, padX, y, contentW, heroH, 12);
    ctx.fillStyle = pal.surface;
    ctx.fill();
    ctx.strokeStyle = pal.border;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rank #01 badge block on left
    const badgeW = 92;
    drawRoundedRect(ctx, padX + 18, y + 18, badgeW, heroH - 36, 8);
    ctx.fillStyle = pal.accent;
    ctx.fill();
    ctx.fillStyle = pal.accentInk;
    ctx.font = '800 13px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = "center";
    ctx.fillText("NO.", padX + 18 + badgeW / 2, y + 46);
    ctx.font = '800 42px "Bricolage Grotesque", system-ui, sans-serif';
    ctx.fillText("01", padX + 18 + badgeW / 2, y + 72);
    ctx.textAlign = "left";

    const hx = padX + 18 + badgeW + 24;
    const hw = contentW - (badgeW + 64);

    // Kind + Year meta
    ctx.fillStyle = pal.muted;
    ctx.font = '700 15px "IBM Plex Mono", ui-monospace, monospace';
    const metaStr = [
      heroItem.mediaType === "movie" ? "FILM" : "SERIES",
      heroItem.year ? String(heroItem.year) : "",
      heroItem.creator || "",
      heroItem.vibe ? `· ${heroItem.vibe}` : "",
    ]
      .filter(Boolean)
      .join("  ");
    ctx.fillText(metaStr.slice(0, 68), hx, y + 26);

    // #1 Title
    ctx.fillStyle = pal.ink;
    ctx.font = '800 34px "Bricolage Grotesque", system-ui, sans-serif';
    const hTitle = wrapText(ctx, heroItem.title, hw, 1)[0] || heroItem.title;
    ctx.fillText(hTitle, hx, y + 54);

    // #1 Pitch
    if (heroItem.pitch) {
      ctx.fillStyle = pal.muted;
      ctx.font = 'italic 500 20px "Figtree", system-ui, sans-serif';
      const pLines = wrapText(ctx, `“${heroItem.pitch}”`, hw, 2);
      pLines.forEach((pl, idx) => {
        ctx.fillText(pl, hx, y + 106 + idx * 27);
      });
    } else if (heroItem.genre) {
      ctx.fillStyle = pal.muted;
      ctx.font = '500 19px "Figtree", system-ui, sans-serif';
      ctx.fillText(`${heroItem.genre}${heroItem.where ? ` · Watch on ${heroItem.where}` : ""}`, hx, y + 112);
    }

    y += heroH + 26;

    // Remaining items in a crisp 2-column (or 1-column on story) editorial grid
    const rest = items.slice(1);
    const cols = aspect === "story" ? 1 : 2;
    const gapX = 20;
    const gapY = 14;
    const rowH = aspect === "story" ? 96 : 86;
    const maxRows = Math.max(
      1,
      Math.floor((dims.h - y - footerReserve) / (rowH + gapY))
    );
    const maxCells = maxRows * cols;
    const visibleRest = rest.slice(0, maxCells);
    const colW = (contentW - gapX * (cols - 1)) / cols;

    visibleRest.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = padX + col * (colW + gapX);
      const cy = y + row * (rowH + gapY);
      const rankNum = String(idx + 2).padStart(2, "0");

      drawRoundedRect(ctx, cx, cy, colW, rowH, 8);
      ctx.fillStyle = pal.cardBg;
      ctx.fill();
      ctx.strokeStyle = pal.border;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Rank pill
      const pillCol =
        item.mediaType === "movie"
          ? "#3CC4DE"
          : "#F5C518";
      drawRoundedRect(ctx, cx + 12, cy + 16, 46, rowH - 32, 6);
      ctx.fillStyle = pillCol;
      ctx.fill();

      ctx.fillStyle = "#111111";
      ctx.font = '800 18px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(rankNum, cx + 35, cy + rowH / 2 + 1);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const tx = cx + 72;
      const tw = colW - 86;

      ctx.fillStyle = pal.ink;
      ctx.font = '700 21px "Bricolage Grotesque", system-ui, sans-serif';
      const lineTitle = wrapText(ctx, item.title, tw, 1)[0] || item.title;
      ctx.fillText(lineTitle, tx, cy + 16);

      ctx.fillStyle = pal.muted;
      ctx.font = '600 14px "IBM Plex Mono", ui-monospace, monospace';
      const subStr = [
        item.mediaType === "movie" ? "FILM" : "TV",
        item.year ? String(item.year) : "",
        item.vibe || item.genre || "",
      ]
        .filter(Boolean)
        .join(" · ");
      const lineSub = wrapText(ctx, subStr, tw, 1)[0] || subStr;
      ctx.fillText(lineSub, tx, cy + 48);
    });

    const hiddenCount = rest.length - visibleRest.length;
    if (hiddenCount > 0) {
      ctx.fillStyle = pal.muted;
      ctx.font = '700 15px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = "center";
      ctx.fillText(
        `+ ${hiddenCount} MORE IN THE FULL COLLECTION`,
        dims.w / 2,
        dims.h - footerReserve + 8
      );
      ctx.textAlign = "left";
    }
  }

  // Footer colophon
  const footY = dims.h - 54;
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padX, footY - 14);
  ctx.lineTo(dims.w - padX, footY - 14);
  ctx.stroke();

  ctx.fillStyle = pal.muted;
  ctx.font = '600 14px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${moviesCount} FILMS  ·  ${showsCount} SHOWS  ·  CURATED ON CHANNEL 100`,
    padX,
    footY + 8
  );

  ctx.textAlign = "right";
  ctx.fillText(new Date().getFullYear().toString(), dims.w - padX, footY + 8);
  ctx.textAlign = "left";
}
