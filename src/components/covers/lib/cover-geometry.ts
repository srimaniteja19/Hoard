/**
 * Pure geometry and math utilities for HOARD SVG Covers.
 */

/**
 * Clamps a number between a minimum and maximum bound.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Calculates card width in pixels based on estimated minutes (sub-linear scaling).
 * Equation: 92 + (estimatedMinutes ^ 0.52) * 46
 */
export function calculateCardWidth(estimatedMinutes: number): number {
  const safeMins = Math.max(1, estimatedMinutes);
  return Math.round(92 + Math.pow(safeMins, 0.52) * 46);
}

/**
 * Calculates cover height in pixels based on estimated minutes (sub-linear scaling).
 * Equation: clamp(74 + (estimatedMinutes ^ 0.45) * 9, 74, 185)
 */
export function calculateCoverHeight(estimatedMinutes: number): number {
  const safeMins = Math.max(1, estimatedMinutes);
  const rawHeight = 74 + Math.pow(safeMins, 0.45) * 9;
  return clamp(Math.round(rawHeight), 74, 185);
}

/**
 * Normalizes an array of numbers to 0-100 scale based on max value in array.
 */
export function normalizeValues(values: number[], maxCap = 100): number[] {
  if (!values || values.length === 0) return [];
  const max = Math.max(...values, 1);
  return values.map((v) => Math.min(maxCap, Math.round((v / max) * maxCap)));
}

/**
 * Calculates sun-fade opacity for bookmarks older than 90 days.
 * Equation: sunFadeOpacity = max(0.45, 1 - (ageInDays - 90) / 365 * 0.4)
 */
export function calculateSunFadeOpacity(createdAtOrWhen?: string | number | Date): number {
  if (!createdAtOrWhen) return 1.0;
  const date = new Date(createdAtOrWhen);
  if (isNaN(date.getTime())) return 1.0;
  const ageInDays = Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (ageInDays <= 90) return 1.0;
  const fade = 1 - ((ageInDays - 90) / 365) * 0.4;
  return Math.max(0.45, Math.round(fade * 100) / 100);
}
