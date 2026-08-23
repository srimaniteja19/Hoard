import { describe, it, expect } from "vitest";
import { exportOmniGazetteMarkdown, OmniGazetteIssue } from "./omniGazette";

describe("omniGazette", () => {
  it("exports omni gazette to clean Markdown format", () => {
    const mockIssue: OmniGazetteIssue = {
      volumeNumber: 3,
      issueNumber: 34,
      dateRange: "Aug 17 – Aug 23, 2026",
      publishedDate: "Sunday, August 23, 2026",
      ledger: {
        totalHoards: 12,
        totalReads: 5,
        readingMinutes: 45,
        totalTodosCompleted: 8,
        totalTilMinted: 4,
        curatorScore: 92,
        topTopic: "postgres",
      },
      leadStory: {
        id: 1,
        title: "PostgreSQL 17 Vector Index Optimization",
        url: "https://postgres.org/17",
        kind: "ART",
        tag: "postgres",
        source: "postgres.org",
        mins: 15,
        note: "HNSW builds are 3x faster with parallel indexing.",
        unread: false,
      },
      weeklyHoards: [
        {
          id: 2,
          title: "Vite 6 Architecture",
          url: "https://vitejs.dev",
          kind: "DOC",
          tag: "frontend",
          source: "vitejs.dev",
          mins: 0,
          unread: true,
        },
      ],
      completedTodos: [
        {
          id: "todo-101",
          title: "Refactor embedding pipeline",
          completedAt: "Aug 21, 2026",
        },
      ],
      mintedTils: [
        {
          id: "til-1",
          body: "Postgres 17 parallel vacuum reduces I/O spikes by 40%.",
          type: "FACT",
          tags: ["postgres"],
          createdAt: "Aug 22, 2026",
        },
      ],
      vaultResurfaced: [],
      topicBreakdown: [{ name: "postgres", count: 8, percentage: 67 }],
    };

    const markdown = exportOmniGazetteMarkdown(mockIssue);
    expect(markdown).toContain("# 📰 THE HOARD GAZETTE — SUNDAY OMNI-EDITION");
    expect(markdown).toContain("Vol. 3 · Issue 34");
    expect(markdown).toContain("PostgreSQL 17 Vector Index Optimization");
    expect(markdown).toContain("Refactor embedding pipeline");
    expect(markdown).toContain("Postgres 17 parallel vacuum reduces I/O spikes");
    expect(markdown).toContain("Curator Velocity Score**: 92/100");
  });
});
