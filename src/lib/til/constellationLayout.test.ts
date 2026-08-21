import { describe, expect, it } from "vitest";
import {
  buildConstellationGraph,
  collapseToHubs,
  extractHubNeighborhood,
  ConstellationEntryInput,
  ConstellationHubNode,
} from "./constellationLayout";

function entry(overrides: Partial<ConstellationEntryInput> & { id: string }): ConstellationEntryInput {
  return {
    type: "FACT",
    body: "Some body text",
    shortHash: "aaaa",
    confidence: 80,
    supersededById: null,
    tags: [],
    ...overrides,
  };
}

describe("buildConstellationGraph", () => {
  it("creates one hub per distinct tag, sized by entry count", () => {
    const graph = buildConstellationGraph([
      entry({ id: "1", tags: ["postgres"] }),
      entry({ id: "2", tags: ["postgres"] }),
      entry({ id: "3", tags: ["css"] }),
    ]);

    const hubs = graph.nodes.filter((n): n is ConstellationHubNode => n.kind === "hub");
    expect(hubs).toHaveLength(2);

    const postgresHub = hubs.find((h) => h.tag === "postgres")!;
    const cssHub = hubs.find((h) => h.tag === "css")!;
    expect(postgresHub.entryCount).toBe(2);
    expect(cssHub.entryCount).toBe(1);
    expect(postgresHub.radius).toBeGreaterThan(cssHub.radius);
  });

  it("creates one satellite per entry, regardless of tag count", () => {
    const graph = buildConstellationGraph([
      entry({ id: "1", tags: ["a", "b"] }),
      entry({ id: "2", tags: [] }),
    ]);
    const satellites = graph.nodes.filter((n) => n.kind === "satellite");
    expect(satellites).toHaveLength(2);
  });

  it("creates an entry-tag edge for every (entry, tag) pair", () => {
    const graph = buildConstellationGraph([entry({ id: "1", tags: ["a", "b", "c"] })]);
    const entryTagEdges = graph.edges.filter((e) => e.kind === "entry-tag");
    expect(entryTagEdges).toHaveLength(3);
  });

  it("creates tag-tag adjacency edges for co-occurring tags, deduplicated", () => {
    const graph = buildConstellationGraph([
      entry({ id: "1", tags: ["a", "b"] }),
      entry({ id: "2", tags: ["a", "b"] }), // same pair again — should not duplicate
      entry({ id: "3", tags: ["b", "c"] }),
    ]);
    const adjacency = graph.edges.filter((e) => e.kind === "tag-tag");
    expect(adjacency).toHaveLength(2); // a-b, b-c
  });

  it("does not create a tag-tag edge for a single-tag entry", () => {
    const graph = buildConstellationGraph([entry({ id: "1", tags: ["solo"] })]);
    expect(graph.edges.filter((e) => e.kind === "tag-tag")).toHaveLength(0);
  });

  it("creates a supersession edge from the older entry to its replacement", () => {
    const graph = buildConstellationGraph([
      entry({ id: "old", supersededById: "new" }),
      entry({ id: "new" }),
    ]);
    const supersessionEdges = graph.edges.filter((e) => e.kind === "supersession");
    expect(supersessionEdges).toHaveLength(1);
    expect(supersessionEdges[0]).toEqual({ source: "entry:old", target: "entry:new", kind: "supersession" });
  });

  it("marks superseded satellites so the renderer can style them distinctly", () => {
    const graph = buildConstellationGraph([entry({ id: "old", supersededById: "new" }), entry({ id: "new" })]);
    const satellites = graph.nodes.filter((n) => n.kind === "satellite") as Array<
      Extract<(typeof graph.nodes)[number], { kind: "satellite" }>
    >;
    const old = satellites.find((s) => s.entryId === "old")!;
    const replacement = satellites.find((s) => s.entryId === "new")!;
    expect(old.superseded).toBe(true);
    expect(replacement.superseded).toBe(false);
  });

  it("truncates the body preview", () => {
    const longBody = "x".repeat(500);
    const graph = buildConstellationGraph([entry({ id: "1", body: longBody })]);
    const satellite = graph.nodes.find((n) => n.kind === "satellite")!;
    expect((satellite as { bodyPreview: string }).bodyPreview.length).toBeLessThanOrEqual(140);
  });

  it("handles an empty entry list", () => {
    const graph = buildConstellationGraph([]);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it("is deterministic — same input produces the same graph shape", () => {
    const input = [entry({ id: "1", tags: ["a", "b"] }), entry({ id: "2", tags: ["b", "c"] })];
    const a = buildConstellationGraph(input);
    const b = buildConstellationGraph(input);
    expect(a).toEqual(b);
  });
});

describe("collapseToHubs", () => {
  it("returns only hub nodes, dropping satellites and edges", () => {
    const graph = buildConstellationGraph([
      entry({ id: "1", tags: ["a"] }),
      entry({ id: "2", tags: ["b"] }),
    ]);
    const hubs = collapseToHubs(graph);
    expect(hubs).toHaveLength(2);
    expect(hubs.every((h) => h.kind === "hub")).toBe(true);
  });

  it("returns an empty array for a graph with no entries", () => {
    expect(collapseToHubs(buildConstellationGraph([]))).toEqual([]);
  });
});

describe("extractHubNeighborhood", () => {
  it("includes the hub, its own satellites, and adjacent hubs — not adjacent hubs' satellites", () => {
    const graph = buildConstellationGraph([
      entry({ id: "1", tags: ["a", "b"] }), // links hub a <-> hub b
      entry({ id: "2", tags: ["a"] }),
      entry({ id: "3", tags: ["b"] }), // only on hub b, should be excluded from a's neighborhood
    ]);

    const neighborhood = extractHubNeighborhood(graph, "a");
    const nodeIds = neighborhood.nodes.map((n) => n.id);

    expect(nodeIds).toContain("hub:a");
    expect(nodeIds).toContain("entry:1"); // satellite of a
    expect(nodeIds).toContain("entry:2"); // satellite of a
    expect(nodeIds).toContain("hub:b"); // adjacent hub, for context
    expect(nodeIds).not.toContain("entry:3"); // b's satellite, not a's — excluded
  });

  it("returns an empty graph for a tag that does not exist", () => {
    const graph = buildConstellationGraph([entry({ id: "1", tags: ["a"] })]);
    expect(extractHubNeighborhood(graph, "nonexistent")).toEqual({ nodes: [], edges: [] });
  });

  it("only includes edges relevant to the requested hub's neighborhood", () => {
    const graph = buildConstellationGraph([
      entry({ id: "1", tags: ["a", "b"] }),
      entry({ id: "2", tags: ["c", "d"] }), // unrelated cluster
    ]);
    const neighborhood = extractHubNeighborhood(graph, "a");
    // no edge should reference the unrelated c/d cluster
    const nodeIds = new Set(neighborhood.nodes.map((n) => n.id));
    for (const e of neighborhood.edges) {
      expect(nodeIds.has(e.source)).toBe(true);
      expect(nodeIds.has(e.target)).toBe(true);
    }
    expect(nodeIds.has("hub:c")).toBe(false);
    expect(nodeIds.has("hub:d")).toBe(false);
  });

  it("keeps a suggested edge when both satellites sit in the neighborhood", () => {
    const graph = buildConstellationGraph([
      entry({ id: "1", tags: ["a"] }),
      entry({ id: "2", tags: ["a"] }),
    ]);
    graph.edges.push({ source: "entry:1", target: "entry:2", kind: "suggested" });
    const neighborhood = extractHubNeighborhood(graph, "a");
    expect(neighborhood.edges.some((e) => e.kind === "suggested")).toBe(true);
  });
});
