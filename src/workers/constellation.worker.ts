/**
 * Constellation force simulation (SPECTACLE.md §3) — runs entirely off the
 * main thread. d3-force's forceManyBody already does Barnes-Hut quadtree
 * approximation, which is the whole difference between 40 nodes and 500; we
 * do not hand-roll this.
 *
 * Protocol:
 *   in:  { type: "simulate", nodes, edges }
 *   out: { type: "tick", positions }   — streamed periodically while settling
 *   out: { type: "done", positions }   — final, settled positions
 */

import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from "d3-force";
import type { ConstellationNode, ConstellationEdge } from "@/lib/til/constellationLayout";

const TOTAL_TICKS = 200;
const STREAM_EVERY_N_TICKS = 8;
const WIDTH = 900;
const HEIGHT = 520;

type SimNode = ConstellationNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  index?: number;
};

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  kind: ConstellationEdge["kind"];
}

type Positions = Record<string, { x: number; y: number }>;

function snapshotPositions(nodes: SimNode[]): Positions {
  const positions: Positions = {};
  for (const n of nodes) {
    positions[n.id] = { x: n.x ?? WIDTH / 2, y: n.y ?? HEIGHT / 2 };
  }
  return positions;
}

self.onmessage = (event: MessageEvent<{ type: "simulate"; nodes: ConstellationNode[]; edges: ConstellationEdge[] }>) => {
  if (event.data.type !== "simulate") return;

  const nodes: SimNode[] = event.data.nodes.map((n) => ({ ...n }));
  const links: SimLink[] = event.data.edges.map((e) => ({ source: e.source, target: e.target, kind: e.kind }));

  const linkDistance = (link: SimLink) =>
    link.kind === "entry-tag" ? 74 : link.kind === "tag-tag" ? 190 : link.kind === "suggested" ? 120 : 60;
  const chargeStrength = (node: SimNode) => (node.kind === "hub" ? -900 : -260);
  const collideRadius = (node: SimNode) => (node.kind === "hub" ? node.radius : 5);

  const simulation = forceSimulation<SimNode>(nodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance(linkDistance)
    )
    .force("charge", forceManyBody<SimNode>().strength(chargeStrength))
    .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
    .force("collide", forceCollide<SimNode>().radius(collideRadius))
    .stop();

  // d3-force's forces pull toward the center but never constrain to it —
  // without clamping, nodes can settle well outside the viewBox on graphs
  // with strong hub repulsion. Margin matches each node's own radius so a
  // hub never gets clipped by the edge.
  const MARGIN = 40;
  function clampPositions() {
    for (const n of nodes) {
      const r = n.kind === "hub" ? n.radius : 6;
      n.x = Math.max(MARGIN + r, Math.min(WIDTH - MARGIN - r, n.x ?? WIDTH / 2));
      n.y = Math.max(MARGIN + r, Math.min(HEIGHT - MARGIN - r, n.y ?? HEIGHT / 2));
    }
  }

  for (let tick = 1; tick <= TOTAL_TICKS; tick++) {
    simulation.tick();
    clampPositions();
    if (tick % STREAM_EVERY_N_TICKS === 0 && tick !== TOTAL_TICKS) {
      (self as unknown as Worker).postMessage({ type: "tick", positions: snapshotPositions(nodes) });
    }
  }

  (self as unknown as Worker).postMessage({ type: "done", positions: snapshotPositions(nodes) });
};
