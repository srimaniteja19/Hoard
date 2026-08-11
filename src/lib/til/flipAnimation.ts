/**
 * Discharge FLIP animation math (SPECTACLE.md §4). Pure — no DOM, no React —
 * so the geometry is cheap to unit test independent of getBoundingClientRect.
 *
 * FLIP = First, Last, Invert, Play: capture the start and end rects, compute
 * the delta, render at the end position with a transform that puts it back
 * at the start, then animate the transform to identity.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlipDelta {
  dx: number;
  dy: number;
  scaleX: number;
  scaleY: number;
}

/** Delta from source center to destination center, plus the size ratio. */
export function computeFlipDelta(source: Rect, destination: Rect): FlipDelta {
  const dx = destination.x + destination.width / 2 - (source.x + source.width / 2);
  const dy = destination.y + destination.height / 2 - (source.y + source.height / 2);
  const scaleX = source.width > 0 ? destination.width / source.width : 1;
  const scaleY = source.height > 0 ? destination.height / source.height : 1;
  return { dx, dy, scaleX, scaleY };
}

/**
 * CSS transform for the flyer's *arrival* state — small, rotated, faded —
 * matching the mockup's discharge flight (SPECTACLE.md §4 mockup script).
 * The flyer starts at the source rect's position with no transform, then
 * this transform is applied to animate it toward the destination.
 */
export function flipArrivalTransform(delta: FlipDelta, settleScale = 0.86, rotateDeg = -2): string {
  return `translate(${round(delta.dx)}px, ${round(delta.dy)}px) scale(${settleScale}) rotate(${rotateDeg}deg)`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Truncates and formats a receipt line from real state, never a placeholder. */
export function formatReceiptLine(title: string, unreadBalance: number, maxTitleLength = 30): string {
  const normalized = title.trim().toUpperCase();
  const truncated =
    normalized.length > maxTitleLength ? `${normalized.slice(0, maxTitleLength)}...` : normalized;
  const itemWord = unreadBalance === 1 ? "ITEM" : "ITEMS";
  return `DISCHARGED  ${truncated}  ·  BALANCE ${unreadBalance} ${itemWord}`;
}
