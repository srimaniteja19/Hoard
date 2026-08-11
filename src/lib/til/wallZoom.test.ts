import { describe, expect, it } from "vitest";
import {
  getWallMode,
  shouldVirtualizeWall,
  clampWallZoom,
  zoomForMode,
  tileHeightForZoom,
  computeWallGridMetrics,
  computeVisibleDayRange,
  WALL_ZOOM_MIN,
  WALL_ZOOM_MAX,
} from "./wallZoom";

describe("getWallMode", () => {
  it("returns rhythm below 15px", () => {
    expect(getWallMode(9)).toBe("rhythm");
    expect(getWallMode(14)).toBe("rhythm");
  });

  it("returns composition between 15 and 62px inclusive", () => {
    expect(getWallMode(15)).toBe("composition");
    expect(getWallMode(32)).toBe("composition");
    expect(getWallMode(62)).toBe("composition");
  });

  it("returns content above 62px", () => {
    expect(getWallMode(63)).toBe("content");
    expect(getWallMode(150)).toBe("content");
  });
});

describe("shouldVirtualizeWall", () => {
  it("does not virtualize at or below 40px", () => {
    expect(shouldVirtualizeWall(40)).toBe(false);
    expect(shouldVirtualizeWall(9)).toBe(false);
  });

  it("virtualizes above 40px", () => {
    expect(shouldVirtualizeWall(41)).toBe(true);
    expect(shouldVirtualizeWall(150)).toBe(true);
  });
});

describe("clampWallZoom", () => {
  it("clamps to the min/max bounds", () => {
    expect(clampWallZoom(0)).toBe(WALL_ZOOM_MIN);
    expect(clampWallZoom(9999)).toBe(WALL_ZOOM_MAX);
  });

  it("rounds fractional values", () => {
    expect(clampWallZoom(32.6)).toBe(33);
  });

  it("falls back to the default for NaN", () => {
    expect(clampWallZoom(NaN)).toBe(16);
  });
});

describe("zoomForMode", () => {
  it("returns a value that maps back to the same mode", () => {
    expect(getWallMode(zoomForMode("rhythm"))).toBe("rhythm");
    expect(getWallMode(zoomForMode("composition"))).toBe("composition");
    expect(getWallMode(zoomForMode("content"))).toBe("content");
  });
});

describe("tileHeightForZoom", () => {
  it("is square outside content mode", () => {
    expect(tileHeightForZoom(30, "rhythm")).toBe(30);
    expect(tileHeightForZoom(30, "composition")).toBe(30);
  });

  it("is taller than wide in content mode", () => {
    expect(tileHeightForZoom(100, "content")).toBe(115);
  });
});

describe("computeWallGridMetrics", () => {
  it("fits as many columns as the container allows", () => {
    const metrics = computeWallGridMetrics(365, 1000, 20, "rhythm", 4);
    expect(metrics.columnsPerRow).toBe(Math.floor(1004 / 24));
    expect(metrics.totalRows).toBe(Math.ceil(365 / metrics.columnsPerRow));
  });

  it("never returns zero columns even in a tiny container", () => {
    const metrics = computeWallGridMetrics(365, 5, 150, "content", 4);
    expect(metrics.columnsPerRow).toBeGreaterThanOrEqual(1);
  });
});

describe("computeVisibleDayRange", () => {
  it("covers the visible rows plus one screen of buffer on each side", () => {
    const metrics = computeWallGridMetrics(365, 700, 100, "content", 4);
    // scrolled to the middle of the grid
    const scrollTop = metrics.totalHeight / 2;
    const range = computeVisibleDayRange(metrics, scrollTop, 600, 365);

    expect(range.startIndex).toBeGreaterThanOrEqual(0);
    expect(range.endIndex).toBeLessThanOrEqual(365);
    expect(range.endIndex).toBeGreaterThan(range.startIndex);
  });

  it("clamps to the start of the grid when scrolled to the top", () => {
    const metrics = computeWallGridMetrics(365, 700, 100, "content", 4);
    const range = computeVisibleDayRange(metrics, 0, 600, 365);
    expect(range.startIndex).toBe(0);
  });

  it("clamps to the end of the grid when scrolled to the bottom", () => {
    const metrics = computeWallGridMetrics(365, 700, 20, "rhythm", 4);
    const range = computeVisibleDayRange(metrics, metrics.totalHeight, 600, 365);
    expect(range.endIndex).toBe(365);
  });

  it("never returns a negative-width range", () => {
    const metrics = computeWallGridMetrics(365, 700, 20, "rhythm", 4);
    const range = computeVisibleDayRange(metrics, -500, 600, 365);
    expect(range.endIndex).toBeGreaterThanOrEqual(range.startIndex);
  });
});
