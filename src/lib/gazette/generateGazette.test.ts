import { describe, it, expect } from "vitest";
import { generateWeeklyGazette, exportGazetteMarkdown } from "./generateGazette";
import { Bookmark } from "@/types";

describe("generateGazette", () => {
  const mockBookmarks: Bookmark[] = [
    {
      id: 1,
      t: "Architecture of Modern Vector Search Engines",
      ty: "ART",
      src: "pinecone.io",
      url: "https://pinecone.io/learn/vector-search",
      mins: 14,
      tag: "vector-db",
      coll: "all",
      when: "Aug 22",
      unread: false,
      note: "Explains HNSW graphs, PQ quantization, and disk-backed indexes.",
      ex: {},
    },
    {
      id: 2,
      t: "PostgreSQL 17 Release Notes",
      ty: "DOC",
      src: "postgresql.org",
      url: "https://postgresql.org/17",
      mins: 0,
      tag: "postgres",
      coll: "all",
      when: "Aug 20",
      unread: true,
      note: "",
      ex: {},
    },
    {
      id: 3,
      t: "Old Forgotten Classic Paper",
      ty: "PPR",
      src: "acm.org",
      url: "https://acm.org/classic",
      mins: 0,
      tag: "systems",
      coll: "all",
      when: "Jan 10, 2025",
      createdAt: "2025-01-10T12:00:00Z",
      unread: true,
      note: "",
      ex: {},
    },
  ];

  it("generates gazette issue with ledger, lead story and topic breakdown", () => {
    const issue = generateWeeklyGazette(mockBookmarks, new Date("2026-08-23T12:00:00Z"));
    expect(issue.volumeNumber).toBeGreaterThanOrEqual(1);
    expect(issue.issueNumber).toBeGreaterThanOrEqual(1);
    expect(issue.leadStory).toBeDefined();
    expect(issue.leadStory?.t).toBe("Architecture of Modern Vector Search Engines");
    expect(issue.ledger.totalCaptured).toBeGreaterThanOrEqual(1);
    expect(issue.dateRange).toContain("2026");
  });

  it("exports clean markdown formatted digest", () => {
    const issue = generateWeeklyGazette(mockBookmarks, new Date("2026-08-23T12:00:00Z"));
    const md = exportGazetteMarkdown(issue);

    expect(md).toContain("# 📰 THE HOARD GAZETTE");
    expect(md).toContain("## 📊 The Weekly Ledger");
    expect(md).toContain("## ⚡ Lead Story");
    expect(md).toContain("Architecture of Modern Vector Search Engines");
  });
});
