import { describe, it, expect } from "vitest";
import {
  computeTimeDistance,
  layoutSynapseNodes,
  findLocalSynapseCandidates,
  SynapseNode,
} from "./synapseTrail";
import { Bookmark } from "@/types";

describe("synapseTrail", () => {
  it("computes accurate time distance between dates", () => {
    const d1 = new Date("2026-08-23T12:00:00Z");
    const d2 = new Date("2026-08-22T12:00:00Z");
    const d3 = new Date("2026-05-23T12:00:00Z");

    expect(computeTimeDistance(d1, d2)).toBe("Saved 1 day apart");
    expect(computeTimeDistance(d1, d3)).toBe("Saved ~3 months apart");
  });

  it("calculates 2D orbital layout for nodes", () => {
    const nodes: SynapseNode[] = [
      {
        id: "1",
        ownerType: "bookmark",
        title: "Node 1",
        url: "https://example.com/1",
        kind: "ART",
        similarity: 85,
        connectionType: "Conceptual Echo",
        timeDistance: "Saved 2 days apart",
      },
      {
        id: "2",
        ownerType: "bookmark",
        title: "Node 2",
        url: "https://example.com/2",
        kind: "GIT",
        similarity: 70,
        connectionType: "Topic Sibling",
        timeDistance: "Saved 1 month apart",
      },
    ];

    const laidOut = layoutSynapseNodes(nodes, 200);
    expect(laidOut.length).toBe(2);
    expect(laidOut[0].x).toBeDefined();
    expect(laidOut[0].y).toBeDefined();
    expect(laidOut[0].angleDeg).toBeDefined();
  });

  it("finds local synapse candidates based on keywords and tags", () => {
    const target: Bookmark = {
      id: 1,
      t: "Postgres HNSW Vector Indexes",
      ty: "ART",
      src: "pgvector.org",
      url: "https://pgvector.org",
      mins: 10,
      tag: "database",
      coll: "all",
      when: "Aug 20",
      unread: false,
      note: "HNSW graphs with cosine distance metrics.",
      ex: {},
    };

    const library: Bookmark[] = [
      target,
      {
        id: 2,
        t: "Vector Databases in Rust",
        ty: "GIT",
        src: "github.com",
        url: "https://github.com/vectordb",
        mins: 0,
        tag: "database",
        coll: "all",
        when: "Jan 15, 2026",
        unread: false,
        note: "Fast vector search with HNSW and SIMD.",
        ex: {},
      },
      {
        id: 3,
        t: "Unrelated French Cooking Recipe",
        ty: "ART",
        src: "cooking.com",
        url: "https://cooking.com",
        mins: 5,
        tag: "food",
        coll: "all",
        when: "Aug 10",
        unread: true,
        note: "Souffle preparation.",
        ex: {},
      },
    ];

    const candidates = findLocalSynapseCandidates(target, library);
    expect(candidates.length).toBe(1);
    expect(candidates[0].id).toBe("2");
    expect(candidates[0].similarity).toBeGreaterThan(50);
  });
});
