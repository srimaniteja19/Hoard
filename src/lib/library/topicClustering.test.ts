import { describe, it, expect } from "vitest";
import {
  buildLivingTopicClusters,
  calculateKnowledgeDensity,
} from "./topicClustering";
import { Bookmark } from "@/types";

describe("topicClustering", () => {
  const sampleBookmarks: Bookmark[] = [
    {
      id: 1,
      t: "Transformers from Scratch",
      ty: "ART",
      src: "arxiv.org",
      url: "https://arxiv.org/1",
      mins: 15,
      tag: "ai",
      coll: "all",
      when: "Aug 20",
      unread: true,
      ex: {},
      note: "Deep dive into self attention mechanisms and multi-head projection layers.",
    },
    {
      id: 2,
      t: "Building RAG with Local Vector DBs",
      ty: "GIT",
      src: "github.com",
      url: "https://github.com/rag",
      mins: 0,
      tag: "llm",
      coll: "all",
      when: "Aug 21",
      unread: false,
      useCount: 4,
      ex: {},
      note: "Useful reference repo for langchain & chroma integration.",
    },
    {
      id: 3,
      t: "PostgreSQL WAL and B-Tree internals",
      ty: "DOC",
      src: "postgresql.org",
      url: "https://postgresql.org/docs",
      mins: 0,
      tag: "postgres",
      coll: "all",
      when: "Aug 15",
      unread: true,
      ex: {},
      note: "",
    },
    {
      id: 4,
      t: "Design Systems in React & Tailwind",
      ty: "ART",
      src: "design.com",
      url: "https://design.com/tokens",
      mins: 8,
      tag: "design",
      coll: "all",
      when: "Aug 10",
      unread: false,
      ex: {},
      note: "Great guide on design tokens.",
    },
  ];

  it("clusters bookmarks into living topics with correct metrics", () => {
    const clusters = buildLivingTopicClusters(sampleBookmarks);
    expect(clusters.length).toBeGreaterThanOrEqual(3);

    const aiCluster = clusters.find((c) => c.title.includes("Artificial Intelligence"));
    expect(aiCluster).toBeDefined();
    expect(aiCluster?.totalCount).toBe(2);
    expect(aiCluster?.unreadCount).toBe(1);
    expect(aiCluster?.readCount).toBe(1);
    expect(aiCluster?.exploredPercentage).toBe(50);
  });

  it("calculates knowledge density score and levels", () => {
    const density = calculateKnowledgeDensity(sampleBookmarks);
    expect(density.score).toBeGreaterThan(0);
    expect(["Deep Dive", "High Density", "Growing", "Emerging"]).toContain(density.level);
  });
});
