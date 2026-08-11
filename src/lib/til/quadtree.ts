/**
 * Minimal quadtree for Constellation's Canvas hit-testing (SPECTACLE.md §3,
 * tier 2: "render to Canvas with a quadtree for hit-testing. SVG hover
 * handlers on 600 nodes is where it dies.").
 *
 * This is a spatial index for point lookups, not a physics engine — distinct
 * from "hand-rolling the simulation," which stays forbidden and stays
 * delegated to d3-force. No new dependency: this is small enough to own and
 * test directly, and the spec approves only d3-force as a new package.
 */

export interface QuadPoint {
  id: string;
  x: number;
  y: number;
  radius: number;
}

interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const MAX_POINTS_PER_NODE = 4;
const MAX_DEPTH = 12;

class QuadNode {
  bounds: Bounds;
  points: QuadPoint[] = [];
  children: QuadNode[] | null = null;
  depth: number;

  constructor(bounds: Bounds, depth: number) {
    this.bounds = bounds;
    this.depth = depth;
  }

  private subdivide() {
    const { x0, y0, x1, y1 } = this.bounds;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    this.children = [
      new QuadNode({ x0, y0, x1: mx, y1: my }, this.depth + 1),
      new QuadNode({ x0: mx, y0, x1, y1: my }, this.depth + 1),
      new QuadNode({ x0, y0: my, x1: mx, y1 }, this.depth + 1),
      new QuadNode({ x0: mx, y0: my, x1, y1 }, this.depth + 1),
    ];
    const existing = this.points;
    this.points = [];
    for (const p of existing) this.insert(p);
  }

  insert(point: QuadPoint) {
    if (point.x < this.bounds.x0 || point.x > this.bounds.x1 || point.y < this.bounds.y0 || point.y > this.bounds.y1) {
      return false;
    }

    if (this.children) {
      for (const child of this.children) {
        if (child.insert(point)) return true;
      }
      return false;
    }

    this.points.push(point);
    if (this.points.length > MAX_POINTS_PER_NODE && this.depth < MAX_DEPTH) {
      this.subdivide();
    }
    return true;
  }

  /** All points whose bounding circle could overlap the given query circle. */
  queryCandidates(qx: number, qy: number, qr: number, out: QuadPoint[]) {
    if (qx + qr < this.bounds.x0 || qx - qr > this.bounds.x1 || qy + qr < this.bounds.y0 || qy - qr > this.bounds.y1) {
      return;
    }
    if (this.children) {
      for (const child of this.children) child.queryCandidates(qx, qy, qr, out);
    } else {
      out.push(...this.points);
    }
  }
}

export class Quadtree {
  private root: QuadNode;

  constructor(bounds: Bounds) {
    this.root = new QuadNode(bounds, 0);
  }

  insert(point: QuadPoint) {
    this.root.insert(point);
  }

  /**
   * Nearest point whose circle actually contains (x, y), or null. Used to
   * resolve a mouse position to the node under the cursor on a canvas.
   */
  findAt(x: number, y: number, maxSearchRadius = 40): QuadPoint | null {
    const candidates: QuadPoint[] = [];
    this.root.queryCandidates(x, y, maxSearchRadius, candidates);

    let best: QuadPoint | null = null;
    let bestDist = Infinity;
    for (const p of candidates) {
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist <= p.radius && dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    return best;
  }
}

export function buildQuadtree(points: QuadPoint[], bounds: Bounds): Quadtree {
  const tree = new Quadtree(bounds);
  for (const p of points) tree.insert(p);
  return tree;
}
