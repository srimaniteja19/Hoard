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
  let date: Date;
  if (typeof createdAtOrWhen === "string") {
    if (createdAtOrWhen.match(/\d{4}/)) {
      date = new Date(createdAtOrWhen);
    } else {
      // String like "Aug 10" or "May 14" without year -> append current year
      const currentYear = new Date().getFullYear();
      date = new Date(`${createdAtOrWhen} ${currentYear}`);
    }
  } else {
    date = new Date(createdAtOrWhen);
  }

  if (isNaN(date.getTime())) return 1.0;
  const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (isNaN(ageInDays) || ageInDays <= 90 || ageInDays < 0) return 1.0;

  const fade = 1 - ((ageInDays - 90) / 365) * 0.05;
  return Math.max(0.92, Math.round(fade * 100) / 100);
}
