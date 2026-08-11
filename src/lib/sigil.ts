/**
 * Deterministic per-collection identity (SPECTACLE.md §5).
 *
 * Pure — no Math.random, no Date, no locale-dependent anything. Same name always
 * produces the same layout, on the server and in the browser, so there's never a
 * hydration mismatch and nothing needs to be stored.
 *
 * Shape generation lives in computeSigilLayout(), shared by two renderers:
 *  - sigil() turns it into an SVG string using `var(--token)` color references
 *    into the app's existing theme tokens, so a generated sigil reflows across
 *    all five themes for free with no regeneration and no hardcoded hex here.
 *  - resolveSigilToken() maps a token to literal hex for contexts that can't
 *    resolve CSS custom properties — namely the Satori-rendered OG route,
 *    which needs real color values baked into the image at generation time.
 */

const COLOR_TOKENS = ["--yel", "--pink", "--cyan", "--lime", "--orange", "--violet", "--mint"] as const;

export type SigilColorToken = (typeof COLOR_TOKENS)[number];
export type SigilInkToken = SigilColorToken | "--ink";

const GRID_SIZE = 5;
const REVEAL_THRESHOLD = 0.42;
const ACCENT_THRESHOLD = 0.82;

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function makeXorshift32(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type SigilShapeKind = 0 | 1 | 2 | 3;

export interface SigilShape {
  kind: SigilShapeKind;
  x: number;
  y: number;
  cell: number;
  useAccent: boolean;
}

export interface SigilLayout {
  size: number;
  bgToken: SigilColorToken;
  accentToken: SigilColorToken;
  shapes: SigilShape[];
}

export function normalizeSigilName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Pure shape-generation core, shared by every renderer. Only this function
 * touches the PRNG — everything downstream is deterministic layout data.
 */
export function computeSigilLayout(name: string, size = 140): SigilLayout {
  const normalized = normalizeSigilName(name);
  const seed = fnv1a(normalized);
  const next = makeXorshift32(seed);

  const bgToken = COLOR_TOKENS[Math.floor(next() * COLOR_TOKENS.length)];
  const accentToken = COLOR_TOKENS[Math.floor(next() * COLOR_TOKENS.length)];

  const cell = size / GRID_SIZE;
  const halfWidth = Math.ceil(GRID_SIZE / 2);
  const shapes: SigilShape[] = [];

  for (let gx = 0; gx < halfWidth; gx++) {
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      const r = next();
      if (r < REVEAL_THRESHOLD) continue;

      const kind = Math.floor(next() * 4) as SigilShapeKind;
      const useAccent = r > ACCENT_THRESHOLD;
      const mirroredX = GRID_SIZE - 1 - gx;

      shapes.push({ kind, x: round2(gx * cell), y: round2(gy * cell), cell: round2(cell), useAccent });
      if (mirroredX !== gx) {
        shapes.push({ kind, x: round2(mirroredX * cell), y: round2(gy * cell), cell: round2(cell), useAccent });
      }
    }
  }

  return { size, bgToken, accentToken, shapes };
}

function shapeMarkup(shape: SigilShape, colorExpr: string): string {
  const { kind, x, y, cell } = shape;
  switch (kind) {
    case 0:
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${colorExpr}"/>`;
    case 1: {
      const cx = round2(x + cell / 2);
      const cy = round2(y + cell / 2);
      const r = round2(cell / 2);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colorExpr}"/>`;
    }
    case 2:
      return `<path d="M${x} ${round2(y + cell)}L${round2(x + cell)} ${round2(y + cell)}L${round2(x + cell)} ${y}Z" fill="${colorExpr}"/>`;
    default: {
      const ix = round2(x + cell * 0.2);
      const iy = round2(y + cell * 0.2);
      const iw = round2(cell * 0.6);
      return `<rect x="${ix}" y="${iy}" width="${iw}" height="${iw}" fill="${colorExpr}"/>`;
    }
  }
}

export interface Sigil {
  svg: string;
  hash: string;
}

export function sigil(name: string, size = 140): Sigil {
  const layout = computeSigilLayout(name, size);
  const shapesMarkup = layout.shapes
    .map((s) => shapeMarkup(s, s.useAccent ? `var(${layout.accentToken})` : "var(--ink)"))
    .join("");

  const label = escapeXmlAttr(normalizeSigilName(name));
  const svg =
    `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" role="img" aria-label="${label} sigil" style="display:block">` +
    `<rect width="${size}" height="${size}" fill="var(${layout.bgToken})"/>` +
    shapesMarkup +
    `</svg>`;

  const seed = fnv1a(normalizeSigilName(name));
  return { svg, hash: seed.toString(16).padStart(8, "0").slice(0, 6) };
}

/**
 * Resolves the two token names a sigil for `name` would use, without building
 * the full SVG. Used by contexts that can't render CSS custom properties
 * and need to map tokens to literal hex themselves (see resolveSigilToken).
 */
export function sigilColorTokens(name: string): { bgToken: SigilColorToken; accentToken: SigilColorToken } {
  const layout = computeSigilLayout(name, 1);
  return { bgToken: layout.bgToken, accentToken: layout.accentToken };
}

// Mirrors the `:root` (Neo Brutalist / default) theme block in globals.css.
// OG images are generated once, statically, with no viewer theme context, so
// they always render in the default theme's palette.
const DEFAULT_THEME_HEX: Record<SigilInkToken, string> = {
  "--yel": "#FFE600",
  "--pink": "#FF007A",
  "--cyan": "#00F0FF",
  "--lime": "#B6FF3C",
  "--orange": "#FF6B00",
  "--violet": "#7C4DFF",
  "--mint": "#00E58A",
  "--ink": "#000000",
};

export function resolveSigilToken(token: SigilInkToken): string {
  return DEFAULT_THEME_HEX[token];
}
