import { describe, it, expect } from "vitest";
import { TilType } from "@/db/schema";

interface MockTilItem {
  id: string;
  shortHash: string;
  type: TilType;
  body: string;
  code?: string | null;
  linkUrl?: string | null;
  tags: string[];
}

function filterTilEntries(
  items: MockTilItem[],
  filters: {
    q?: string | null;
    type?: TilType | null;
    tag?: string | null;
    hash?: string | null;
  }
): MockTilItem[] {
  return items.filter((item) => {
    if (filters.type && item.type !== filters.type) {
      return false;
    }

    if (filters.hash && item.shortHash.toLowerCase() !== filters.hash.toLowerCase()) {
      return false;
    }

    if (filters.tag) {
      const hasTag = item.tags.some((t) => t.toLowerCase() === filters.tag!.toLowerCase());
      if (!hasTag) return false;
    }

    if (filters.q && filters.q.trim()) {
      const cleanQ = filters.q.startsWith("#") ? filters.q.slice(1).trim().toLowerCase() : filters.q.trim().toLowerCase();
      if (cleanQ) {
        const matchBody = item.body.toLowerCase().includes(cleanQ);
        const matchCode = item.code ? item.code.toLowerCase().includes(cleanQ) : false;
        const matchHash = item.shortHash.toLowerCase().includes(cleanQ);
        const matchUrl = item.linkUrl ? item.linkUrl.toLowerCase().includes(cleanQ) : false;
        const matchTag = item.tags.some((t) => t.toLowerCase().includes(cleanQ));
        if (!matchBody && !matchCode && !matchHash && !matchUrl && !matchTag) {
          return false;
        }
      }
    }

    return true;
  });
}

function calculateCategoryCounts(items: MockTilItem[]): Record<string, number> {
  const counts: Record<string, number> = { ALL: items.length };
  for (const item of items) {
    counts[item.type] = (counts[item.type] || 0) + 1;
  }
  return counts;
}

describe("TIL Search and Category Filter Engine", () => {
  const mockItems: MockTilItem[] = [
    {
      id: "1",
      shortHash: "a1b2",
      type: "FACT",
      body: "Postgres index scan vs sequential scan performance threshold",
      code: "EXPLAIN ANALYZE SELECT * FROM users;",
      tags: ["postgres", "database", "performance"],
    },
    {
      id: "2",
      shortHash: "c3d4",
      type: "GOTCHA",
      body: "React useEffect closure staleness when omitting dependency",
      code: "useEffect(() => { console.log(count); }, []);",
      tags: ["react", "javascript", "hooks"],
    },
    {
      id: "3",
      shortHash: "e5f6",
      type: "SNIPPET",
      body: "Tailwind arbitrary variants and CSS container query syntax",
      code: "@container (min-width: 400px) { ... }",
      tags: ["css", "tailwind", "responsive"],
    },
    {
      id: "4",
      shortHash: "g7h8",
      type: "PATTERN",
      body: "Unit of Work pattern in repository DAL layer",
      tags: ["architecture", "patterns"],
    },
    {
      id: "5",
      shortHash: "i9j0",
      type: "QUOTE",
      body: "Simplicity is prerequisite for reliability. — Edsger W. Dijkstra",
      tags: ["philosophy", "quotes"],
    },
  ];

  it("filters accurately by Category / Archetype", () => {
    const gotchas = filterTilEntries(mockItems, { type: "GOTCHA" });
    expect(gotchas).toHaveLength(1);
    expect(gotchas[0].shortHash).toBe("c3d4");

    const facts = filterTilEntries(mockItems, { type: "FACT" });
    expect(facts).toHaveLength(1);
    expect(facts[0].shortHash).toBe("a1b2");

    const snippets = filterTilEntries(mockItems, { type: "SNIPPET" });
    expect(snippets).toHaveLength(1);
    expect(snippets[0].shortHash).toBe("e5f6");
  });

  it("searches body content case-insensitively", () => {
    const results = filterTilEntries(mockItems, { q: "POSTGRES" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("searches code snippets", () => {
    const results = filterTilEntries(mockItems, { q: "EXPLAIN ANALYZE" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("searches tags even with # prefix", () => {
    const results = filterTilEntries(mockItems, { q: "#react" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2");
  });

  it("searches shortHash directly", () => {
    const results = filterTilEntries(mockItems, { q: "e5f6" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("3");
  });

  it("combines category filtering with search query", () => {
    // Both query 'closure' and type 'GOTCHA'
    const results = filterTilEntries(mockItems, { q: "closure", type: "GOTCHA" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2");

    // Query 'closure' but type 'FACT' -> 0 matches
    const noResults = filterTilEntries(mockItems, { q: "closure", type: "FACT" });
    expect(noResults).toHaveLength(0);
  });

  it("calculates accurate category counts including ALL", () => {
    const counts = calculateCategoryCounts(mockItems);
    expect(counts["ALL"]).toBe(5);
    expect(counts["FACT"]).toBe(1);
    expect(counts["GOTCHA"]).toBe(1);
    expect(counts["SNIPPET"]).toBe(1);
    expect(counts["PATTERN"]).toBe(1);
    expect(counts["QUOTE"]).toBe(1);
    expect(counts["OPINION"]).toBeUndefined();
  });
});
