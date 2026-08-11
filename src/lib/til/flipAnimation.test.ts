import { describe, expect, it } from "vitest";
import { computeFlipDelta, flipArrivalTransform, formatReceiptLine } from "./flipAnimation";

describe("computeFlipDelta", () => {
  it("computes zero delta for identical rects", () => {
    const rect = { x: 100, y: 100, width: 50, height: 50 };
    const delta = computeFlipDelta(rect, rect);
    expect(delta.dx).toBe(0);
    expect(delta.dy).toBe(0);
    expect(delta.scaleX).toBe(1);
    expect(delta.scaleY).toBe(1);
  });

  it("computes center-to-center delta for offset rects", () => {
    const source = { x: 0, y: 0, width: 100, height: 100 };
    const destination = { x: 200, y: 50, width: 20, height: 20 };
    const delta = computeFlipDelta(source, destination);
    // dest center (210, 60) - source center (50, 50) = (160, 10)
    expect(delta.dx).toBe(160);
    expect(delta.dy).toBe(10);
    expect(delta.scaleX).toBeCloseTo(0.2, 5);
    expect(delta.scaleY).toBeCloseTo(0.2, 5);
  });

  it("does not divide by zero for a zero-size source", () => {
    const source = { x: 0, y: 0, width: 0, height: 0 };
    const destination = { x: 10, y: 10, width: 10, height: 10 };
    const delta = computeFlipDelta(source, destination);
    expect(Number.isFinite(delta.scaleX)).toBe(true);
    expect(Number.isFinite(delta.scaleY)).toBe(true);
  });
});

describe("flipArrivalTransform", () => {
  it("includes translate, scale, and rotate", () => {
    const css = flipArrivalTransform({ dx: 100, dy: -50, scaleX: 0.5, scaleY: 0.5 });
    expect(css).toContain("translate(100px, -50px)");
    expect(css).toContain("scale(0.86)");
    expect(css).toContain("rotate(-2deg)");
  });

  it("respects custom settle scale and rotation", () => {
    const css = flipArrivalTransform({ dx: 0, dy: 0, scaleX: 1, scaleY: 1 }, 0.5, 10);
    expect(css).toContain("scale(0.5)");
    expect(css).toContain("rotate(10deg)");
  });
});

describe("formatReceiptLine", () => {
  it("formats a short title with the real balance", () => {
    expect(formatReceiptLine("DynamoDB design", 3)).toBe("DISCHARGED  DYNAMODB DESIGN  ·  BALANCE 3 ITEMS");
  });

  it("uses singular ITEM for a balance of exactly 1", () => {
    expect(formatReceiptLine("Foo", 1)).toBe("DISCHARGED  FOO  ·  BALANCE 1 ITEM");
  });

  it("truncates long titles", () => {
    const line = formatReceiptLine("A very long bookmark title that goes on and on", 0);
    expect(line).toContain("...");
    expect(line.length).toBeLessThan(80);
  });

  it("never hardcodes the balance — reflects whatever is passed", () => {
    expect(formatReceiptLine("X", 0)).toContain("BALANCE 0 ITEMS");
    expect(formatReceiptLine("X", 42)).toContain("BALANCE 42 ITEMS");
  });
});
