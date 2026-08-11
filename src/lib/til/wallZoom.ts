/**
 * Pure zoom/layout math for the Year Wall (SPECTACLE.md §2). No DOM, no React —
 * just the thresholds and grid arithmetic, so it's cheap to unit test and safe
 * to call from a hot drag-event path.
 */

export const WALL_ZOOM_MIN = 9;
export const WALL_ZOOM_MAX = 150;
export const WALL_ZOOM_DEFAULT = 16;
export const WALL_ROLLING_DAYS = 365;

export type WallMode = "rhythm" | "composition" | "content";

const RHYTHM_UPPER_BOUND = 15; // < 15px
const COMPOSITION_UPPER_BOUND = 62; // 15–62px
export const WALL_VIRTUALIZE_THRESHOLD = 40; // above ~40px, virtualize

/** Zoom changes what a tile *is*, not just its size (SPECTACLE.md §2). */
export function getWallMode(zoom: number): WallMode {
  if (zoom < RHYTHM_UPPER_BOUND) return "rhythm";
  if (zoom <= COMPOSITION_UPPER_BOUND) return "composition";
  return "content";
}

export function shouldVirtualizeWall(zoom: number): boolean {
  return zoom > WALL_VIRTUALIZE_THRESHOLD;
}

export function clampWallZoom(zoom: number): number {
  if (Number.isNaN(zoom)) return WALL_ZOOM_DEFAULT;
  return Math.min(WALL_ZOOM_MAX, Math.max(WALL_ZOOM_MIN, Math.round(zoom)));
}

const MODE_JUMP_ZOOM: Record<WallMode, number> = {
  rhythm: 12,
  composition: 32,
  content: 90,
};

/** Target zoom for the `1`/`2`/`3` keyboard shortcuts. */
export function zoomForMode(mode: WallMode): number {
  return MODE_JUMP_ZOOM[mode];
}

/** Content-mode tiles are taller than they are wide, to fit a type badge + text. */
export function tileHeightForZoom(zoom: number, mode: WallMode): number {
  return mode === "content" ? Math.round(zoom * 1.15) : zoom;
}

export interface WallGridMetrics {
  columnsPerRow: number;
  rowHeight: number;
  totalRows: number;
  totalHeight: number;
}

export function computeWallGridMetrics(
  totalDays: number,
  containerWidth: number,
  zoom: number,
  mode: WallMode,
  gap = 4
): WallGridMetrics {
  const rowHeight = tileHeightForZoom(zoom, mode) + gap;
  const columnsPerRow = Math.max(1, Math.floor((containerWidth + gap) / (zoom + gap)));
  const totalRows = Math.max(1, Math.ceil(totalDays / columnsPerRow));
  return { columnsPerRow, rowHeight, totalRows, totalHeight: totalRows * rowHeight };
}

export interface WallVisibleRange {
  startIndex: number;
  endIndex: number; // exclusive
}

/**
 * Row range currently in view, plus one screen of buffer on each side
 * (SPECTACLE.md §2), converted to a flat day-index range.
 */
export function computeVisibleDayRange(
  metrics: WallGridMetrics,
  scrollTop: number,
  viewportHeight: number,
  totalDays: number
): WallVisibleRange {
  const firstRow = Math.max(0, Math.floor(scrollTop / metrics.rowHeight));
  const visibleRowCount = Math.max(1, Math.ceil(viewportHeight / metrics.rowHeight));
  const bufferRows = visibleRowCount;

  const startRow = Math.max(0, firstRow - bufferRows);
  const endRow = Math.min(metrics.totalRows, firstRow + visibleRowCount + bufferRows);

  const startIndex = startRow * metrics.columnsPerRow;
  const endIndex = Math.min(totalDays, endRow * metrics.columnsPerRow);

  return { startIndex, endIndex: Math.max(startIndex, endIndex) };
}
