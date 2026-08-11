import { describe, expect, it } from "vitest";
import { buildQuadtree, QuadPoint } from "./quadtree";

const BOUNDS = { x0: 0, y0: 0, x1: 900, y1: 520 };

describe("Quadtree", () => {
  it("finds a point exactly at its center", () => {
    const points: QuadPoint[] = [{ id: "a", x: 100, y: 100, radius: 10 }];
    const tree = buildQuadtree(points, BOUNDS);
    expect(tree.findAt(100, 100)?.id).toBe("a");
  });

  it("finds a point when the query is within its radius but off-center", () => {
    const points: QuadPoint[] = [{ id: "a", x: 100, y: 100, radius: 10 }];
    const tree = buildQuadtree(points, BOUNDS);
    expect(tree.findAt(105, 103)?.id).toBe("a");
  });

  it("returns null when the query is outside every point's radius", () => {
    const points: QuadPoint[] = [{ id: "a", x: 100, y: 100, radius: 10 }];
    const tree = buildQuadtree(points, BOUNDS);
    expect(tree.findAt(200, 200)).toBeNull();
  });

  it("returns the nearest point when circles overlap", () => {
    const points: QuadPoint[] = [
      { id: "near", x: 100, y: 100, radius: 20 },
      { id: "far", x: 130, y: 100, radius: 20 },
    ];
    const tree = buildQuadtree(points, BOUNDS);
    // 105 is closer to "near" (100) than "far" (130)
    expect(tree.findAt(105, 100)?.id).toBe("near");
  });

  it("handles many points correctly, forcing subdivisions", () => {
    const points: QuadPoint[] = [];
    for (let i = 0; i < 500; i++) {
      points.push({ id: `p${i}`, x: (i * 37) % 900, y: (i * 53) % 520, radius: 4 });
    }
    const tree = buildQuadtree(points, BOUNDS);

    // every inserted point should be findable at its own exact position
    for (const p of points) {
      const found = tree.findAt(p.x, p.y);
      expect(found).not.toBeNull();
    }
  });

  it("returns null for an empty tree", () => {
    const tree = buildQuadtree([], BOUNDS);
    expect(tree.findAt(50, 50)).toBeNull();
  });

  it("does not find points outside the tree bounds", () => {
    const points: QuadPoint[] = [{ id: "a", x: 100, y: 100, radius: 10 }];
    const tree = buildQuadtree(points, BOUNDS);
    // way outside bounds — insert should have been a no-op
    const outside: QuadPoint = { id: "b", x: -500, y: -500, radius: 10 };
    tree.insert(outside);
    expect(tree.findAt(-500, -500)).toBeNull();
  });
});
